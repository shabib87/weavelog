# CLI command reference

> **Authority:** Command-level behavior. The canonical distribution target
> contract lives in [`docs/trd/cli-vision.md`](trd/cli-vision.md). The
> corrected v0.1.0 brief and runbook verification battery define release
> scope. Target behavior below does not claim delivery until its named task
> passes verification.

## Commands

| Command | Job |
|---|---|
| `weavelog init` | verifies required external-tool prerequisites, preflights all declared targets, and materializes shared skills plus OpenCode-native configuration; it does not install external tools |
| `weavelog sync` | dev path: repo → live (dogfood loop; ported config-sync) |
| `weavelog update` | release-driven dep bump + re-materialize |
| `weavelog check` | deterministic gates: tests, lint, typecheck, semgrep (telemetry off, pinned rulesets), secrets, frontmatter, manifest completeness |
| `weavelog doctor` | installed? authenticated? config parses? proxy healthy? cache mode=cache? python3.13? :8788 launchd-owned? semgrep smoke? ledger tail? |
| `weavelog scaffold --project` | creates project-owned conductor-era `AGENTS.md`, Backlog, `.env.example`, and neutral docs README homes for research, ADR, PRD, and TRD |

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
| `3` | managed-file conflict — the command refused before writing; use confirmed `--force` replacement only when intentional |
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
  "args": { "host": "opencode", "dryRun": false, "force": false },
  "events": [
    { "type": "refusal", "path": "~/.config/opencode/AGENTS.md", "reason": "modified managed target; no files written; explicit --force replacement required" }
  ],
  "errors": [],
  "exit": 3
}
```

This conflict example has no materialization event. Preflight refuses before
any declared target is written, and the command exits nonzero.

Field rules:

- `ts` — ISO-8601 UTC.
- `run` — short run id; all events of one invocation share it.
- `events[].type` — `install` | `materialize` | `gate` | `refusal` | `error` | `decision`.
- Every `refusal` and `error` names the file and the reason.
- The file is append-only. weavelog never rewrites or truncates it.

### Manifest

`weavelog.json` (JSON, CLI-managed). This runtime inventory is separate from
the strict package control manifest at `payload/config/harnesses/<id>.json`.
Per-tool: install channel
(brew/pipx/npm/uv), version, doctor check id. Completeness rule: every
external binary invoked in skills/src/payload must appear in the manifest —
`check` enforces this (manifest-completeness gate; drift is a `doctor`
check).

---

## Command detail

### `weavelog init`

| Aspect | Behavior |
|---|---|
| Args | `--host <opencode>` (default: opencode), `--dry-run`, `--force`, `--yes` (non-interactive confirmation), per-tool skip flags |
| Asks | preflight all targets; normal conflicts refuse. `--force` confirms each exact eligible target before whole-file replacement |
| Ledger events | `prerequisite` per required tool, `materialize` per file, `decision` per confirmation, `refusal` per conflict, `backup` and `recovery` actions |
| Exit codes | `0` clean; `1` step failed; `3` managed-file conflict declined; `4` unsupported env |

Target contract: preflight every declared target before writing. Absent global
targets may be created. A proven Weavelog-owned, unchanged target may be
updated. Unowned, modified, ambiguous, or state-missing targets refuse by
default. `--force` allows confirmed replacement of exact declared leaf files
only; it never merges or adopts configuration. Interactive use requires a
confirmation. Noninteractive use requires both `--force --yes`. `--yes` alone
does not permit replacement.

Before replacement, stage the new content and journal intent. Move the old
file to a unique opaque `.bak` under
`~/.local/state/weavelog/backups/<run-id>/`; never overwrite a backup. Keep
the backup. Do not parse, hash, or log its contents. If replacement fails,
restore the old file when safe. If a later change makes restoration unsafe,
refuse recovery and report the journal and backup paths. A known conflicting
active OpenCode configuration source makes the profile unsupported; `--force`
does not bypass that check.

The state and backup directories use mode `0700`; backup files use mode
`0600`. The CLI refuses symlinks and non-regular targets, even with
`--force`.

This is the target contract for TASK-29. The current `init` implementation
does not yet provide the complete manifest-driven ownership, force backup,
journal recovery, and active-source behavior. TASK-29, TASK-66, and TASK-67
own delivery and proof.

For the OpenCode profile, `init` also writes the managed `plugins/enforce.ts`
and `plugins/verify-gate.ts` adapters. Each adapter imports only the compiled
hook inside the installed weavelog package. It writes bounded load and gate
receipts to `adapter-audit.jsonl` beside the normal ledger. `weavelog doctor`
checks both adapters without executing them. If it names an adapter as missing,
escaped, or invalid, run `weavelog init` to repair it; do not copy a plugin from
another machine or a personal directory.

Required adapter evidence consists of these enforced behaviors: dangerous
command refusal, main-branch write and Backlog-lifecycle refusal, live-config
write refusal, commit/frontmatter refusal, task-create quality refusal,
session-start sync refusal reporting, and the verification gate’s stale-test
write refusal. Report-only frontmatter and review reminders also produce a
receipt. Optional Headroom learning is not part of this adapter proof battery.

### `weavelog sync`

| Aspect | Behavior |
|---|---|
| Args | `--reverse` (live → repo, for capture), `--dry-run` |
| Job | tested developer-only dogfood path: Weavelog repository → developer live configuration |
| Ledger events | `materialize` per synced file; `decision` for post-sync diff summary |
| Exit codes | `0` clean (post-sync diff empty); `1` sync failed or diff non-empty after sync |

`sync` is not the end-user installer. User installation follows `init` and
`update` ownership rules.

### `weavelog update`

| Aspect | Behavior |
|---|---|
| Args | `--tool <name>`, `--dry-run`, `--force`, `--yes` |
| Job | release-driven dependency update and re-materialize using the same ownership, preflight, backup, and recovery rules as `init` |
| Ledger events | `prerequisite` per checked tool, `materialize` per file, plus any replacement backup or recovery action |
| Exit codes | `0` clean; `1` update failed; `3` managed-file conflict; `4` unsupported env |

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
| `opencode.adapters` | both managed adapters point to compiled hooks inside the installed package |

Each subcheck prints one line: id, pass/fail, and on failure a single
copy-paste fix.

### `weavelog scaffold --project`

| Aspect | Behavior |
|---|---|
| Args | `--project <path>` (required), `--force`, `--yes` |
| Writes | Backlog init, conductor-era `AGENTS.md`, `.env.example`, and neutral README files under `docs/{research,adr,prd,trd}/` |
| Never manages | `.gitignore`, `.env`, `.env.local`, `.git`, or existing project directories |
| Ledger events | `materialize` per created file, `backup` and `recovery` for confirmed replacement, `refusal` for conflicts |
| Exit codes | `0` clean; `1` scaffold failed; `2` missing required arg; `3` target conflict |

The project artifact flow follows ADR-005:
`idea → PRD → TRD → milestone ↔ PRD → TASK`. Research supplies dated
evidence when needed. ADRs record hard-to-reverse decisions at any stage and
are not a required pipeline stage. The project `AGENTS.md` names the Backlog
CLI prerequisite, TDD-first practice, local commands and constraints, review
gates, and the documentation map. It does not install the future weaver
persona or loop commands.

Scaffolding is independent of global host installation. It does not require
an initialized OpenCode profile or global OpenCode configuration. It checks
and changes only the requested project targets.

Existing scaffold targets refuse by default. `--force` can replace only
declared eligible leaf files after confirmation and a protected backup. The
scaffold does not drift-manage files after creation. TASK-30 owns this target
behavior; the current implementation does not yet create all four docs homes
or enforce the complete ownership and replacement contract.

---

## Reference surfaces

The [canonical CLI vision](trd/cli-vision.md) defines package fan-out,
ownership, force replacement, backups, recovery, and project scaffold
boundaries. This command reference summarizes behavior and delivery status.

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
| Manifest | `weavelog.json` tool/version inventory; separate package harness manifests live under `payload/config/harnesses/` |
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
