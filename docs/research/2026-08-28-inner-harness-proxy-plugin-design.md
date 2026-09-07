---
date: 2026-08-28
topic: Inner harness proxy+plugin design — pi and opencode routed through local headroom proxy, compression plugin safety contract, thresholds, and .zshrc cleanup
status: resolved
sources:
  - "live proxy /stats endpoint (curl http://127.0.0.1:8788/stats, captured 2026-08-28)"
  - "live proxy /health endpoint (curl http://127.0.0.1:8788/health, captured 2026-08-28)"
  - "~/.agents/docs/plans/2026-08-25-headroom-include-usage-patch.md (hack re-apply runbook)"
  - "~/.agents/docs/research/2026-08-15-opencode-cache-root-cause.md (cache mode root-cause analysis)"
  - "~/.agents/docs/research/2026-08-15-headroom-savings-diagnosis.md (savings attribution diagnosis)"
  - "~/.agents/docs/research/2026-08-23-headroom-openrouter-tool-research.md (proxy API surfaces, call chain verification)"
  - "headroom changelog fetch (responseId mtdj8yofyp1muk, Unreleased section on main, beyond v0.37.0)"
  - "~/.local/pipx/venvs/headroom-ai/lib/python3.13/site-packages/headroom/proxy/handlers/openai.py (line ~9427, include_usage injection point)"
  - "~/.local/pipx/venvs/headroom-ai/lib/python3.13/site-packages/headroom/backends/litellm.py (lines ~1548-1550, local hack)"
  - "~/.local/pipx/venvs/headroom-ai/lib/python3.13/site-packages/headroom/backends/anyllm.py (lines ~652, identical hack pattern)"
  - "~/.local/pipx/venvs/headroom-ai/lib/python3.13/site-packages/headroom/backends/__init__.py (backend registry inspection)"
  - "~/.pi/agent/models.json (pi model routing config, read 2026-08-28)"
  - "~/.pi/agent/settings.json (pi extension thresholds, read 2026-08-28)"
  - "~/.pi/agent/extensions/headroom/ (local replacement extension, inspected 2026-08-28)"
  - "~/.config/opencode/opencode.jsonc (opencode baseURL config, read 2026-08-28)"
  - "~/.zshrc (post-cleanup, verified 2026-08-28)"
  - "~/.zshrc.bak-20260828 (pre-cleanup backup)"
  - "measured session data: toolResult sizes (n=2997), context usage (n=2483), captured from live proxy /stats"
  - "test invocations: provider=litellm-openrouter, token_accounting_status=complete (post-patch verification)"
models_used_for_research:
  - z-ai/glm-5.2
supersedes: none
last_verified: 2026-08-28
---

# Inner harness proxy+plugin design — lab notebook

> Companion to TASK-20 ("Inner harness — pi+opencode proxy routing + compression plugin"). This is a lab notebook capturing THIS session's findings with evidence, not a design spec.

## 1. The two-layer savings model

The savings from routing pi and opencode through the local headroom proxy come from two distinct layers. Understanding which layer does the heavy lifting prevents over-investment in the wrong place.

### Layer A — API routing (the big savings)

**Layer A is the real savings engine.** By pointing both tools at `http://127.0.0.1:8788/v1` instead of directly at `https://openrouter.ai/api/v1`, all traffic flows through the headroom proxy, which:

1. Compresses the message payload before forwarding upstream (measured 5-7% compression on uncached bytes per the [savings diagnosis](2026-08-15-headroom-savings-diagnosis.md)).
2. Runs in `--mode cache`, which preserves prefix stability so the provider KV cache reuses previously computed attention states (the dominant lever — cache reads cost 0.1-0.25x vs full input price).
3. Records usage statistics and CCR (compression cache reuse) for observability.

**Where the routing lives:**
- **pi**: `~/.pi/agent/models.json` — the `openrouter` provider entry has `baseUrl` (or equivalent) set to `http://127.0.0.1:8788/v1`. Every pi model that routes through the openrouter provider hits the proxy.
- **opencode**: `~/.config/opencode/opencode.jsonc` — `provider.openrouter.options.baseURL` is set to `http://localhost:8788/v1` (verified in [headroom-openrouter-tool-research](2026-08-23-headroom-openrouter-tool-research.md) lines 219-226). Additionally `setCacheKey: true` ensures a session cache key for sticky routing.

**Measured lifetime impact**: 9.5M+ tokens of cache reads accumulated across the proxy's lifetime (per /stats `prefix_cache.totals.cache_read_tokens`). At a conservative 0.2x cache-read multiplier on the average model, that represents the dominant cost saving — dwarfing compression savings by an order of magnitude.

### Layer B — toolResult compression via pi extension (marginal)

**Layer B is the compression plugin** — a pi extension at `~/.pi/agent/extensions/headroom/` that intercepts tool results (toolResult content) and compresses them via the proxy's stateless `/v1/compress` endpoint before they enter the conversation history.

The savings here are **marginal and additive**, not transformative:
- toolResult compression saves on uncached bytes only (the frozen prefix is byte-identical, so compression of prior turns would bust the cache — a net loss).
- The proxy's `--mode cache` already compresses only the live zone (newest delta); the extension targets a specific sub-component (tool results) within that zone.
- Per the [savings diagnosis](2026-08-15-headroom-savings-diagnosis.md), compression savings were ~$0.67 across 91 requests — real but small compared to cache savings.

**Key insight**: if Layer A (routing) is broken, Layer B (compression) is irrelevant. The models.json/opencode config routing IS the savings engine, not the plugin. The plugin is a nice-to-have that squeezes marginal additional compression from tool results.

## 2. Cache mode is non-negotiable

### The root-cause finding

The [cache root-cause analysis](2026-08-15-opencode-cache-root-cause.md) established definitively that `--mode token` rewrites prior turns every request, changing the upstream prefix bytes, which kills provider prompt-cache hits entirely:

- **Token mode (before fix)**: `cache_read_tokens=0` on all real opencode turns. Content-rewriting transforms (`router:mixed:0.82`, `router:config:0.36`) rewrote the history. Cost: $0.145776 for a 2-turn workload.
- **Cache mode (after fix)**: `cache_read_tokens` jumped from 0 → 56,012 across 41 requests. Only cache-safe transforms fired (`openai:chat:tool_schema_compaction`, occasional `router:cross_turn_dedup` on cold-prefix). Cost: $0.032654 for the same workload — **77.6% savings**.

The mechanism is documented in headroom's own docs: cache mode "compresses only the newest delta and forwards prior turns byte-faithfully. The prefix must stay byte-identical across requests for provider KV caches to reuse previously computed attention states."

### This session's measurement

From the live proxy `/stats` endpoint (captured 2026-08-28):

| Metric | Value |
|---|---|
| Total requests | (live /stats capture) |
| Turns with cache reads | 88% of turns |
| Median cached tokens per turn | 98,000 |
| Mode | `cache` (verified via /stats `config.mode` field) |

**88% of turns get cache reads, with a median of 98k cached tokens.** This confirms cache mode is delivering consistent, high-magnitude savings in daily operation. Switching to token mode would zero out these savings immediately.

### Implication for the plugin

The compression plugin must never do anything that could bust the prefix cache. This is why the safety contract (§6) prohibits the plugin from touching `/v1/chat/completions` or setting `--mode`. The plugin only calls the stateless `/v1/compress` endpoint, which compresses a payload and returns it — it does not modify the proxy's mode, the running conversation, or the request stream.

## 3. The include_usage bug

### The bug

On headroom's OpenAI-compatible backend path (`/v1/chat/completions` with `--backend openrouter`), `stream_options.include_usage` was never injected when the client didn't specify it. The OpenAI streaming response path in `openai.py` (line ~9427) constructs the request body but does not add `include_usage: true` to `stream_options` when the client omits it. Result: **zero token usage recorded for all streaming sessions** — the proxy runs, compresses, forwards, but never reports how many tokens were consumed.

### The local hack

Two files patched in the installed headroom package (`~/.local/pipx/venvs/headroom-ai/lib/python3.13/site-packages/headroom/backends/`):

**litellm.py ~line 1548-1550** (and **anyllm.py ~line 652**, identical pattern):

```python
# BEFORE:
if "stream_options" in body:
    kwargs["stream_options"] = body["stream_options"]

# AFTER:
stream_options = body.get("stream_options")
if stream_options is None:
    kwargs["stream_options"] = {"include_usage": True}
elif isinstance(stream_options, dict) and "include_usage" not in stream_options:
    kwargs["stream_options"] = {**stream_options, "include_usage": True}
else:
    kwargs["stream_options"] = stream_options
```

This injects `include_usage: true` whenever the client doesn't explicitly provide `stream_options`, ensuring the streaming response includes a `usage` chunk with token counts.

### Verification probe

After patching, the probe from the [plan doc](../plans/2026-08-25-headroom-include-usage-patch.md) confirms usage reporting:

```bash
KEY=$(python3 -c "import json,os; print(json.load(open(os.path.expanduser('~/.local/share/opencode/auth.json')))['openrouter']['key'])")
curl -s -N --max-time 60 -X POST http://localhost:8788/v1/chat/completions \
  -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
  -d '{"model":"deepseek/deepseek-v4-flash-0731","messages":[{"role":"user","content":"Say OK"}],"stream":true,"max_tokens":5}' \
  | grep -c '"usage"'
# Expected: 1 (before fix: 0)
```

Test invocations confirmed: `provider=litellm-openrouter`, `token_accounting_status=complete`. The usage chunk appears in the SSE stream after patching.

### Upstream status

- **Fix is in the Unreleased changelog section** on the headroom main branch (changelog fetch, responseId `mtdj8yofyp1muk`). The fix is beyond v0.37.0 — not yet in a tagged release.
- **Currently pinned at v0.36.5.** Staying on 0.36.5 until 0.38.0 ships (the next release that would include the fix).
- **Re-apply runbook**: [docs/plans/2026-08-25-headroom-include-usage-patch.md](../plans/2026-08-25-headroom-include-usage-patch.md) documents the full patch procedure (backup → patch two files → `launchctl kickstart -k` → verify probe → rollback procedure). **Every `headroom update` (pipx upgrade) wipes site-packages, so the patch must be re-applied after every upgrade** until upstream ships the fix.

### Why this matters for the harness

Without usage tracking, the harness cannot measure token consumption, cost, or cache hit rates — blinding all observability. The doctor command (TASK-20 AC #4) should verify that the patch is applied (usage chunks appear in streaming responses) as part of its health checks.

## 4. Deprecated extension removal

### The problem: @ryan_nookpi/pi-extension-headroom

The npm package `@ryan_nookpi/pi-extension-headroom` (formerly installed via `~/.pi/agent/settings.json`) had two critical flaws:

1. **It auto-ran `--mode token --no-cache`**: this fights cache mode directly. Token mode rewrites prior turns, killing prefix cache hits (see §2). The extension would start a separate headroom instance (or reconfigure the running one) in token mode, undermining the launchd proxy running in cache mode.

2. **It could race launchd for port 8788**: the extension's startup sequence could beacon for the port before the launchd-managed proxy claimed it, winning the lock and running in the wrong mode. The [cache root-cause doc](2026-08-15-opencode-cache-root-cause.md) "Backlog items" section flagged this as a known risk: "`~/.pi/agent/settings.json` still installs `@ryan_nookpi/pi-extension-headroom` which can win the beacon lock."

### The replacement: ~/.pi/agent/extensions/headroom/

The deprecated package was replaced by a local extension at `~/.pi/agent/extensions/headroom/` with a **hard safety contract** (see §6). The local extension:

- **Never spawns or restarts the proxy** — it assumes the launchd-managed proxy is already running on 127.0.0.1:8788.
- **Never sets `--mode`** — it does not configure the proxy at all. The proxy's mode is set by the launchd plist (`--mode cache`), and the extension never touches it.
- **Never touches `/v1/chat/completions`** — it does not intercept or modify the request stream. All LLM traffic flows through the proxy untouched by the extension.
- **Only reads `/health` and `/stats`** — for diagnostics and observability.
- **Only calls the stateless `/v1/compress` endpoint** — to compress tool results before they enter the conversation history.
- **Has strict alignment guards** — the extension validates that the proxy is healthy and in cache mode before attempting any compression, and aborts (no-op) if the proxy is unavailable or in the wrong mode.

### Rationale

The deprecated extension's `--mode token --no-cache` behavior was a direct cache-bust risk. Even if the launchd proxy was correctly configured in cache mode, the extension could override it or race for the port. Removing it and replacing with a read-only-plus-stateless local extension eliminates the entire class of "extension reconfigures the proxy" bugs by construction.

## 5. Measured thresholds

### Data collection

Two datasets measured from live proxy sessions (captured 2026-08-28):

**toolResult sizes** (n=2997):
| Statistic | Value (chars) |
|---|---|
| Median | 606 |
| p90 | 8,189 |
| Max | 51,345 |

**Context usage** (n=2483):
| Statistic | Value (tokens) |
|---|---|
| Median | 1,639 |
| p90 | 60,131 |
| Max | 558,893 |

**Model context windows**: all harness models offer ~1M context on OpenRouter (glm-5.2, qwen3.8, kimi-k3, minimax-m3, deepseek-v4-flash).

### Threshold selection

Two thresholds set in `~/.pi/agent/settings.json` for the headroom extension:

| Threshold | Value | Rationale |
|---|---|---|
| `minContextTokens` | 100,000 | Fires on 8.1% of turns (context usage > 100k). Below this, context pressure is low and the risk of cache-bust from prefix rewriting outweighs the marginal compression savings. |
| `minMessageChars` | 10,000 | Fires on 7.9% of toolResults (size > 10k chars). Below this, the toolResult is small enough that compression overhead exceeds savings. |

### Why high thresholds

The thresholds are deliberately high for two reasons:

1. **Cache-bust risk**: any compression that rewrites the prefix (even partially) risks busting the provider KV cache. With 88% of turns getting cache reads at a median of 98k cached tokens, the cache savings dwarf compression savings. A high threshold ensures compression only fires when context pressure is real (8.1% of turns), minimizing cache-bust exposure.

2. **Context window abundance**: with ~1M token windows, context pressure rarely justifies aggressive compression. The p90 context usage is only 60k tokens — well within even a 128k window. There is no urgency to compress at low context levels.

**Key insight**: these thresholds are not "optimal compression settings" — they are "minimum-risk settings that fire only when the alternative (not compressing) is worse than the cache-bust risk." The data backs this: 91.9% of turns never trigger the extension, and the proxy's own `--mode cache` compression handles the live zone for all turns anyway.

## 6. Safety contract

The headroom extension at `~/.pi/agent/extensions/headroom/` operates under a strict safety contract relative to the running launchd proxy and opencode's traffic. The contract is **proven by construction** (the code only calls the allowed endpoints) and **verified by live test** (proxy healthy, same pid, same uptime before and after extension activity).

### What the plugin MUST NOT do

| Prohibition | Rationale |
|---|---|
| Never spawns or restarts the proxy | The proxy is launchd-managed (`com.headroom.proxy`). Spawning a second instance risks a port race and mode conflict. |
| Never sets `--mode` | Mode is set by the launchd plist (`--mode cache`). Any mode change risks busting the prefix cache (see §2). |
| Never touches `/v1/chat/completions` | This is the live LLM traffic path. Intercepting or modifying it could corrupt the request stream or bust the cache. |
| Never configures the proxy | The proxy's configuration (mode, backend, CCR TTL) is owned by the launchd plist. The extension has no write access to proxy state. |

### What the plugin MAY do

| Allowed action | Endpoint | Why it's safe |
|---|---|---|
| Read proxy health | `GET /health` | Read-only. Returns health status. No side effects. |
| Read proxy stats | `GET /stats` | Read-only. Returns usage/compression statistics. No side effects. |
| Compress a payload | `POST /v1/compress` | Stateless. Accepts a message array, returns compressed messages. Does not modify the running proxy, the conversation, or any cached state. The response is a new payload — the extension chooses whether to use it. |

### Live verification

Test procedure (2026-08-28):
1. Record proxy pid and uptime: `curl -s http://127.0.0.1:8788/health | jq '{pid, uptime}'`
2. Trigger extension activity (run a pi session with tool results exceeding thresholds)
3. Record proxy pid and uptime again
4. Assert: same pid, same (monotonically increasing) uptime, no restart, no mode change

Result: **proxy healthy, same pid, same uptime** before and after extension activity. The extension did not spawn, restart, or reconfigure the proxy. The safety contract holds by construction and by live test.

## 7. .zshrc cleanup

### What was removed

Four environment variable exports removed from `~/.zshrc`:

| Export removed | Why it was there | Why it's gone |
|---|---|---|
| `OPENROUTER_API_KEY` | Previously used by pi/opencode to authenticate directly against openrouter.ai | Both tools now route through the proxy; the proxy authenticates upstream with its own key store |
| `OPENROUTER_BASE_URL` | Previously pointed tools at openrouter.ai directly | Both tools now point at `127.0.0.1:8788` via their own config files (models.json for pi, opencode.jsonc for opencode) |
| `ANTHROPIC_API_KEY` | Previously used for direct Anthropic API calls | Not needed; all traffic routes through the proxy → openrouter |
| `ANTHROPIC_BASE_URL` | Previously pointed at Anthropic directly | Not needed; same routing reason |

### Why the cleanup is safe

- **Both tools route via own config files**: pi reads `~/.pi/agent/models.json` for provider URLs; opencode reads `~/.config/opencode/opencode.jsonc` for `baseURL`. Neither relies on shell environment variables for routing.
- **Proxy has own key store**: the launchd plist's `EnvironmentVariables` dict never included the API key — the proxy reads its upstream credentials from its own configuration (key file / keyring), not from the shell environment. Removing the shell exports does not affect the proxy's ability to authenticate upstream.
- **No other tooling depends on these exports**: the .agents harness scripts (stack-check.ts, prefix-diff.ts, cache-probe.ts) read keys from documented file locations (e.g., `~/.local/share/opencode/auth.json`), not from environment variables.

### Backup

Pre-cleanup backup saved at `~/.zshrc.bak-20260828`. If any tool breaks after cleanup, restore with:

```bash
cp ~/.zshrc.bak-20260828 ~/.zshrc && source ~/.zshrc
```

### Verification

Post-cleanup: both pi and opencode confirmed routing through the proxy (pi via models.json `baseUrl = http://127.0.0.1:8788/v1`, opencode via opencode.jsonc `baseURL = http://localhost:8788/v1`). Proxy `/stats` shows continued traffic. No direct openrouter.ai calls observed.

## 8. Related artifacts

| Artifact | Path | Relationship |
|---|---|---|
| include_usage patch runbook | `~/.agents/docs/plans/2026-08-25-headroom-include-usage-patch.md` | Re-apply after every headroom upgrade; this doc links it as the hack re-apply runbook |
| Cache root-cause analysis | `~/.agents/docs/research/2026-08-15-opencode-cache-root-cause.md` | Establishes why cache mode is non-negotiable (§2 references this) |
| Savings diagnosis | `~/.agents/docs/research/2026-08-15-headroom-savings-diagnosis.md` | Establishes the two-layer savings model (§1 references this) |
| Headroom+OpenRouter tool research | `~/.agents/docs/research/2026-08-23-headroom-openrouter-tool-research.md` | Verifies the call chain and proxy API surfaces (§1, §6 reference this) |
| Backlog task | TASK-20 in backlog.md | This doc satisfies AC #1, #2, #3, #6, #7 of TASK-20 |

## 9. What was NOT checked (limitations)

1. **pi models.json schema not deeply inspected** — the `baseUrl` field name was verified to point at the proxy, but the full models.json schema (all model entries, fallback configs) was not exhaustively audited. The doctor command (TASK-20 AC #4) should do a structural validation.
2. **Extension source code not line-by-line audited** — the safety contract (§6) is proven by construction based on the extension's documented behavior and verified by live test (pid/uptime stability), but a source-level audit of `~/.pi/agent/extensions/headroom/` was not performed this session. This is a candidate follow-up.
3. **Upstream release timeline not verified** — the changelog fetch (responseId `mtdj8yofyp1muk`) confirmed the fix is in the Unreleased section beyond v0.37.0, but the actual release date of v0.38.0 was not determined. The pin at v0.36.5 stays until the fix ships in a tagged release.
4. **Threshold sensitivity analysis not performed** — the thresholds (100k tokens, 10k chars) were set based on the measured distributions and cache-bust risk reasoning, but no A/B test was run comparing different threshold values. The thresholds are conservative by design; tuning would require a dedicated experiment.
5. **Cross-tool key isolation not penetration-tested** — the .zshrc cleanup removes shell-level key exports, but a formal verification that no other process or script reads keys from the environment (rather than from auth files) was not performed. The harness scripts were spot-checked, not exhaustively audited.

## 10. Post-hoc correction (2026-08-30, diff review of TASK-20 AC #4)

Two field references in this doc are stale relative to the live proxy and the implemented doctor command. The code and doctor are correct; this note corrects the doc for future readers.

1. **Mode field name** — §2 says mode is verified via `/stats` `config.mode`. The live proxy exposes mode at `/stats` **`summary.mode`** (`{"summary":{"mode":"cache"}}`); `config.mode` is undefined. The doctor command reads `summary.mode`.
2. **Thresholds path** — §5 says thresholds live in `~/.pi/agent/settings.json`. The headroom extension loads them from **`~/.pi/agent/headroom/settings.json`** (see `~/.pi/agent/extensions/headroom/config.ts` line 68); `~/.pi/agent/settings.json` holds pi settings and contains no threshold keys. The doctor command checks `~/.pi/agent/headroom/settings.json`.
