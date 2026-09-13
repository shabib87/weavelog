---
date: 2026-09-06
topic: Headroom compression proxy — what it is, cache mode, pricing sync, port 8788 ownership
status: draft
type: architecture
author: conductor
related_to:
  - ./model-routing.md
  - ./runbook-decomposition.md
  - ./test-guardrails.md
  - ./README.md
  - ../cli.md
sources:
  - "AGENT-STACK-RUNBOOK.md §Phase 1, §Pricing sync, §Prompt-cache policy, §Parked-but-wired (TASK-45 decomposition)"
---

# Headroom compression proxy

## What it is

Headroom is a local compression/telemetry proxy that sits between opencode and
OpenRouter. Every model request from the host routes through `http://localhost:8788/v1`;
the proxy compresses context, forwards byte-faithful prior turns, tracks usage, and
reports dollar savings. Its version is pinned in `weavelog.json` — the rollback pin is
`headroom-ai[proxy]==0.30.0`.

Install is pipx with an explicit interpreter: `pipx install --python /opt/homebrew/bin/python3.13 'headroom-ai[proxy]'`.
Three gotchas are load-bearing:

- **Quote the extras spec.** Unquoted `[proxy]` makes zsh glob and choke.
- **Python must be 3.13, not 3.14.** litellm (dollar pricing) is skipped on 3.14 and
  savings show `$0.00` forever.
- **`pipx reinstall` ignores extras.** Never use it to change headroom; always
  `pipx uninstall` + `pipx install` with the quoted spec.

After every headroom update, re-apply the include_usage patch
(`~/.agents/docs/plans/2026-08-25-headroom-include-usage-patch.md`); without it usage
tokens are zeroed. Drop the patch when upstream fixes it.

## Launchd ownership

The proxy runs as a launchd service: `~/Library/LaunchAgents/com.headroom.proxy.plist`,
label `com.headroom.proxy`. The plist is custom — the headroom installer does not create
it and cannot set the OpenRouter upstream URLs, so init writes it by hand from the
manifest.

Load-bearing plist facts:

- `ProgramArguments`: `--host [IP_ADDRESS] --port 8788 --backend openrouter
  --openai-api-url https://openrouter.ai/api/v1 --anthropic-api-url
  https://openrouter.ai/api/v1 --mode cache --memory --memory-storage project --learn`.
  The `[IP_ADDRESS]` literal is passed verbatim to the process; all HTTP probing uses
  `http://localhost:8788` instead — a bracketed IPv4 literal in a URL is malformed
  (brackets are IPv6-only), and zsh/curl treat unquoted brackets as glob characters.
  Always use `curl -g` and single quotes.
- `RunAtLoad` true, `KeepAlive` true (respawn on crash), `ProcessType` Interactive.
- stdout and stderr both go to `~/.headroom/proxy-launchd.log`; ensure
  `mkdir -p ~/.headroom` first.
- `EnvironmentVariables`: a PATH superset (includes `~/.local/bin` and the nvm node
  bin; the extras matter for local MCP processes only), `LITELLM_LOCAL_MODEL_COST_MAP=true`,
  and `HEADROOM_MODEL_ALIAS_MAP` mapping client model names to priced `openrouter/`
  keys. The two model-pricing env vars are required for dollar savings (see below).
- **`~/.headroom` must be 700.** A stray `chmod 600` removes the execute bit; the proxy
  then crashes with PermissionError/exit 78 at startup and launchd KeepAlive respawns it
  in a loop. Fix: `chmod 700 ~/.headroom`.

Load order: `plutil -lint` the plist, then
`launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.headroom.proxy.plist`.

Health gates for the running proxy:

- `curl -g -sS 'http://localhost:8788/health'` — JSON with a version and
  `status: healthy`.
- `curl -g -sS -o /dev/null -w '%{http_code}' 'http://localhost:8788/dashboard'` — 200.
- `headroom doctor` — 0 failures. Two warnings are expected and acceptable: `budget`
  (no spend cap set by default; cap with `--budget N` in the plist args or
  `HEADROOM_BUDGET` in the plist env) and `shell env` (`ANTHROPIC_BASE_URL` pointing at
  OpenRouter rather than the proxy — harmless because opencode reads `opencode.jsonc`,
  not shell env).

## Cache-mode rationale

The proxy plist runs `--mode cache` (headroom's default). This is a correctness
decision, not a tuning preference:

- `--mode token` rewrites prior turns on every request, which busts the provider KV
  cache for all models. That was the verified root cause of zero cache hits in real
  opencode sessions (research note `~/.agents/docs/research/2026-08-15-opencode-cache-root-cause.md`).
- Cache mode compresses only the newest delta and forwards prior turns byte-faithfully,
  so provider prefix caches stay stable. `compression_pct` drops by design — savings
  shift from compression to cache reads (priced at 0.1–0.25× input per provider).
  `/stats` reports the mode; doctor's `proxy.cache-mode` subcheck fails if it is not
  `cache`.

Caching is automatic for the stack's models (DeepSeek, Z.AI glm, Moonshot kimi,
MiniMax, and qwen via SiliconFlow KV) — no request annotations needed. Two routing
facts:

- OpenRouter applies provider sticky routing per conversation after the first cache
  hit. Headroom does not forward the client `session_id` (its internal id is a
  compression-cache key).
- A manual `provider.order` disables sticky routing. The qwen pin exists for
  1M-context correctness, not caching — some providers cap qwen at 262K. Pin `order:
  ["SiliconFlow", "Modal", "Alibaba"]` in `opencode.jsonc` for qwen; glm-5.3-flash stays
  deliberately unpinned so sticky routing can maximize hits. `setCacheKey` is enabled in
  the opencode config.

New-model onboarding gate: after adding a model to the manifest, run
`src/tools/cache-probe.ts --model <id>` (4 requests, shared ≥4K prefix, varied tails — probes
must vary the tail because identical repeats are served from headroom's own compression
cache and never reach upstream). Exit 1 means the model does not cache through the
proxy — document it as a provider limitation or escalate.

## Why pricing sync exists

Headroom computes dollar savings through `litellm.cost_per_token()`. litellm's pricing
database (bundled JSON + GitHub main) lacks newer OpenRouter models, so without a sync
the savings column reads `$0.00`. Two litellm behaviors drive the fix:

- litellm fetches its cost map from GitHub at import; the local backup JSON is only used
  when `LITELLM_LOCAL_MODEL_COST_MAP=true` (or the fetch fails).
- `cost_per_token` rejects unknown provider prefixes (`z-ai/`, `qwen/`,
  `moonshotai/`); the `openrouter/` prefix is accepted.

The fix has three coordinated parts:

1. `src/tools/sync-model-pricing.ts` fetches live per-token prices from OpenRouter
   `/api/v1/models` and injects them into litellm's backup JSON under
   `openrouter/<model-id>` keys (with a `headroom_synced` marker). Unit note: OpenRouter
   returns per-token prices (e.g. `0.000000462` = $0.462/M) — never divide by 1e6. The
   script guards a 1e-9..1e-3 sanity range and exits 3 on implausible values.
2. The LaunchAgent plist sets `LITELLM_LOCAL_MODEL_COST_MAP=true` and
   `HEADROOM_MODEL_ALIAS_MAP` so headroom resolves client model names to the priced
   `openrouter/` keys.
3. `src/tools/stack-check.ts` runs `sync-model-pricing.ts --check` on every sweep; drift is
   exit 1.

Modes: `--check` (read-only drift report) and `--apply` (idempotent inject; restart the
proxy after). **Any headroom or litellm upgrade wipes the injected entries** — re-run
`--apply` plus a proxy restart after every upgrade; stack-check detects the resulting
drift automatically.

## :8788 single-owner rule

launchd's `com.headroom.proxy` is the single owner of port 8788. The rule exists
because a parked host's extension
(`npm:@ryan_nookpi/pi-extension-headroom`) auto-spawns its own proxy on 8788 with
incompatible arguments (`--mode token --no-cache`, no `--backend openrouter`, no
upstream URLs, no memory/learn) and coordinates via `~/.headroom/.beacon_lock_8788`.
If that process wins the race, opencode traffic routes to the wrong upstream and
OpenRouter keys fail silently.

Resolution: the pi extension is set to `{"enabled": true, "autoStart": false}` in
`~/.pi/agent/headroom/settings.json` — pi uses the running launchd proxy instead of
spawning one. If pi is ever unparked, start the launchd service before it, and treat
`autoStart: true` as a configuration-mismatch risk.

Drift check: the launchctl pid for `com.headroom.proxy` must equal the `lsof` pid
listening on 8788 (`lsof -nP -iTCP:8788 -sTCP:LISTEN`). Doctor subcheck `proxy.owner`
verifies this.

## Doctor expectations

The battery below is the runbook's Phase 1.4 – verification-battery content, now
implemented as doctor subchecks (see `docs/cli.md`):

| Subcheck | Verified fact |
|---|---|
| `proxy.health` | `localhost:8788/health` responds healthy with a version |
| `proxy.dashboard` | `localhost:8788/dashboard` returns 200 |
| `proxy.cache-mode` | `/stats` reports mode `cache` |
| `proxy.owner` | `:8788` listening pid is the launchd-managed one |
| `python.venv` | python3.13 venv with litellm present (`~/.local/pipx/venvs/headroom-ai`) |
| pricing sync (via stack-check) | `sync-model-pricing.ts --check` exits 0 |

## Rollback

Destructive, by design: `launchctl bootout gui/$(id -u)/com.headroom.proxy`, uninstall
headroom, `pipx install --python /opt/homebrew/bin/python3.13 'headroom-ai[proxy]==0.30.0'`,
re-bootstrap, then re-run the health gates.
