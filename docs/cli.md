# CLI Specification

> **Authority:** Command-level behavior. Traces to the CLI surface table in
> `docs/prd/2026-09-05-v010-draft-brief.md` and the runbook verification
> battery (see `docs/ROADMAP.md` v0.1.0). Command surface for v0.1.0:
> opencode stranger test.

## Commands

| Command | Job |
|---|---|
| `weavelog init` | verifies required external-tool prerequisites against pinned instructions, then materializes `~/.agents/*` + `~/.config/opencode/*` (two-step user-modification flow); never silently overwrites managed files or installs external tools |
| `weavelog sync` | dev path: repo → live (dogfood loop; ported config-sync) |
| `weavelog update` | release-driven dep bump + re-materialize |
| `weavelog check` | deterministic gates: tests, lint, typecheck, semgrep (telemetry off, pinned rulesets), secrets, frontmatter, manifest completeness |
| `weavelog doctor` | installed? authenticated? config parses? proxy healthy? cache mode=cache? python3.13? :8788 launchd-owned? semgrep smoke? ledger tail? |
| `weavelog scaffold --project` | project scaffold: backlog init, AGENTS.md, docs/research, ADRs, .gitignore, .env.example (never touches .env/.env.local) |

Models are opinionated defaults. `init` asks; flags override. No personal
accounts or paths are baked into payloads.

---

## Zero-silent-failure rule

Every command obeys one rule: **refusal = log line + non-zero exit.** There
is no code path that changes state (or fails to) without a ledger record and
an honest exit code. If a step is skipped, the ledger says why and the exit
code is non-zero. Success without a ledger record is a bug.

Exit-code contract:

| Code | Meaning |
|---|---|
| `0` | success (ledger record written) |
| `1` | one or more checks/steps failed (each failure logged) |
| `2` | usage error (bad args, unknown command) |
| `3` | managed-file conflict — init/update refuse rather than overwrite |
| `4` | environment unsupported (non-arm64, non-macOS, missing runtime) |

---

## Ledger

Append-only JSONL at `~/.local/state/weavelog/`. Every command appends one
record per run: files touched, decisions, errors, exit code. The ledger is
the audit surface — gate receipts reference ledger positions, `doctor` tails
it, the public corpus is built from it.

### Format sketch

One JSON object per line:

```json
{
  "ts": "2026-09-05T14:32:01.512Z",
  "run": "8f14e45f",
  "command": "init",
  "args": { "host": "opencode", "dryRun": false },
  "events": [
    { "type": "install", "tool": "headroom", "channel": "pipx", "version": "pinned", "status": "ok" },
    { "type": "materialize", "path": "~/.config/opencode/opencode.jsonc", "status": "written", "step": "confirm" },
    { "type": "gate", "id": "opencode.config-parse", "status": "pass" },
    { "type": "refusal", "path": "~/.agents/AGENTS.md", "reason": "user-modified; two-step confirm declined" }
  ],
  "errors": [],
  "exit": 0
}
```

Field rules:

- `ts` — ISO-8601 UTC.
- `run` — short run id; all events of one invocation share it.
- `events[].type` — `install` | `materialize` | `gate` | `refusal` | `error` | `decision`.
- Every `refusal` and `error` names the file and the reason.
- The file is append-only. weavelog never rewrites or truncates it.

### Manifest

`weavelog.json` (JSON, CLI-managed). Per-tool: install channel
(brew/pipx/npm/uv), version, doctor check id. Completeness rule: every
external binary invoked in skills/src/payload must appear in the manifest —
`check` enforces this (manifest-completeness gate; drift is a `doctor`
check).

---

## Command detail

### `weavelog init`

| Aspect | Behavior |
|---|---|
| Args | `--host <opencode>` (default: opencode), `--dry-run`, `--yes` (non-interactive), per-tool skip flags |
| Asks | confirm each managed-file group before write (two-step user-modification flow) |
| Ledger events | `prerequisite` per required tool, `materialize` per file, `decision` per user confirmation, `refusal` per declined overwrite |
| Exit codes | `0` clean; `1` step failed; `3` managed-file conflict declined; `4` unsupported env |

Managed-file rule: if a managed file exists and differs from the payload and
was modified outside weavelog, init refuses and shows the diff; it never
silently overwrites. The two-step flow: propose → user confirms → write.

### `weavelog sync`

| Aspect | Behavior |
|---|---|
| Args | `--reverse` (live → repo, for capture), `--dry-run` |
| Job | dev path: repo → live (dogfood loop) |
| Ledger events | `materialize` per synced file; `decision` for post-sync diff summary |
| Exit codes | `0` clean (post-sync diff empty); `1` sync failed or diff non-empty after sync |

### `weavelog update`

| Aspect | Behavior |
|---|---|
| Args | `--tool <name>`, `--dry-run`, `--yes` |
| Job | release-driven dep bump + re-materialize (init rules apply; never silent) |
| Ledger events | `prerequisite` per checked tool, `materialize` per re-written file |
| Exit codes | `0` clean; `1` bump failed; `3` managed-file conflict |

### `weavelog check`

| Aspect | Behavior |
|---|---|
| Args | `--gate <id>` (run one gate), `--json` (gate receipts on stdout) |
| Gates | tests, lint, typecheck, semgrep (telemetry off, pinned rulesets), secrets, frontmatter, manifest completeness |
| Ledger events | `gate` per gate id with pass/fail; gate receipts reference run id |
| Exit codes | `0` all gates pass; `1` any gate fails |

Gate receipts: each gate emits a receipt (gate id, run id, timestamp, pass/
fail, counts) to the ledger; `--json` prints them for programmatic use.

### `weavelog doctor`

| Aspect | Behavior |
|---|---|
| Args | `--check <id>` (run one subcheck), `--json` |
| Ledger events | `gate` per subcheck id |
| Exit codes | `0` all subchecks pass; `1` any subcheck fails |

### Doctor subchecks (v0.1.0 battery)

| Subcheck id | Verifies |
|---|---|
| `proxy.health` | headroom proxy health endpoint responds |
| `proxy.dashboard` | headroom dashboard returns 200 |
| `proxy.cache-mode` | `/stats` reports mode=cache |
| `proxy.owner` | `:8788` is launchd-owned (single-owner rule) |
| `python.venv` | python3.13 venv present and active for the proxy |
| `semgrep.smoke` | semgrep runs a smoke ruleset successfully (telemetry off) |
| `auth.openrouter` | OpenRouter auth file present and parses |
| `opencode.config-parse` | emitted opencode config parses and loads |
| `manifest.drift` | managed files match manifest; no unexplained drift |
| `manifest.completeness` | every invoked external binary appears in `weavelog.json` |
| `versions.pinned` | manifest versions pinned for all tools |
| `platform.arm64` | arm64 macOS guard (hard exit `4` otherwise) |
| `ledger.tail` | ledger exists, is readable, and its tail parses as JSONL |

Each subcheck prints one line: id, pass/fail, and on failure a single
copy-paste fix.

### `weavelog scaffold --project`

| Aspect | Behavior |
|---|---|
| Args | `--project <path>` (required), `--force` (re-scaffold missing files only) |
| Writes | backlog init, AGENTS.md, `docs/research/`, ADRs dir, `.gitignore`, `.env.example` |
| Never touches | `.env`, `.env.local` — hardcoded exclusion, enforced by gate |
| Ledger events | `materialize` per scaffolded file; `decision` for skipped existing files |
| Exit codes | `0` clean; `1` scaffold failed; `2` missing required arg |

---

## Reference surfaces

Fixed environment facts the commands operate on (runbook "Quick reference card",
redistributed here by the TASK-45 runbook decomposition; `~` = the user's home,
absolute paths in launchd plists are substituted at install time by `init`).

### Paths

| What | Where |
|---|---|
| opencode config | `~/.config/opencode/opencode.jsonc` (materialized from `payload/config/opencode.jsonc`) |
| Global behavior rules | `~/.config/opencode/AGENTS.md` (materialized from `payload/AGENTS.md`) |
| Role agents | `~/.config/opencode/agents/{scout,diff-reviewer-*,plan-gate-*,qa,researcher,implementer,vision-*,security}.md` (from `payload/config/agents/` + `payload/config/prompts/`) |
| Skills hub | `~/.agents/skills/` (canonical copies from `payload/skills/`; pi/claude symlink chains, codex real copies) |
| Scripts | `src/` in this repo |
| Manifest | `weavelog.json`; live host `~/.agents/stack-versions.json` |
| headroom binary | `~/.local/bin/headroom` (pipx venv `~/.local/pipx/venvs/headroom-ai`, python3.13) |
| headroom proxy log | `~/.headroom/proxy-launchd.log` (dir must be 700) |
| proxy plist | `~/Library/LaunchAgents/com.headroom.proxy.plist` |
| stack-check plist | `~/Library/LaunchAgents/com.agents.stack-check.plist` |
| opencode auth | `~/.local/share/opencode/auth.json` (only place tooling reads the OpenRouter key) |
| MCP secrets | `~/.config/opencode/secrets/{context7-key,tavily-key}` (files 600, dir 700) |
| Backup set | `~/backups/headroom-setup-2026-08-15/` (700); consumed by `init` on a fresh machine |

### Ports and URLs

| What | Value |
|---|---|
| headroom proxy | `http://localhost:8788` — `/health`, `/stats`, OpenAI-compat `/v1` |
| headroom dashboard | `http://localhost:8788/dashboard` (never a bracketed IPv4 URL; brackets are IPv6-only, use `curl -g`) |
| opencode baseURL | `http://localhost:8788/v1` |
| upstream | `https://openrouter.ai/api/v1` (both openai and anthropic backends) |
| chrome-devtools CDP (disabled MCP) | port 9333 |
| stack-check schedule | Sunday 09:00 via `com.agents.stack-check` (report-only; `RunAtLoad` false) |

### Models

Opinionated defaults — `init` asks, flags override. Role → model table lives in
`docs/trd/model-routing.md`; the machine-readable default is the `models`
list in `weavelog.json` (glm-5.3-flash, glm-5.3, deepseek-v4-flash-0731,
deepseek-v4-pro-0813, qwen3.8-flash, qwen3.8-2.4t-a95b, kimi-k3). The opencode keys are `model`
(`openrouter/z-ai/glm-5.3-flash`, new-session workhorse) and `small_model`
(`openrouter/deepseek/deepseek-v4-flash-0731`, cheap bulk); subagents inherit them
unless their agent file sets its own `model`. Versions are manifest-pinned in
`weavelog.json`; the headroom rollback pin is `headroom-ai[proxy]==0.30.0`.

---

## Provenance

- CLI surface table: `docs/prd/2026-09-05-v010-draft-brief.md` ("CLI surface").
- Doctor subchecks: runbook verification battery decomposition (brief,
  "Runbook decomposition rule": "verification battery → doctor subchecks").
- Zero-silent-failure + ledger: brief ("Ledger" and "Zero silent failure").
- Reference surfaces (paths, ports/URLs, model defaults): runbook "Quick reference
  card", redistributed by the TASK-45 decomposition (see
  `docs/trd/runbook-decomposition.md`).
