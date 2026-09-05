# CLI Specification

> **Authority:** Command-level behavior. Traces to the CLI surface table in
> `docs/specs/2026-09-05-v010-draft-brief.md` and the runbook verification
> battery (see `docs/ROADMAP.md` v0.1.0). Command surface for v0.1.0:
> opencode stranger test.

## Commands

| Command | Job |
|---|---|
| `flightlead init` | install opinionated deps (headroom[proxy], opencode, markitdown, semgrep, backlog.md), materialize `~/.agents/*` + `~/.config/opencode/*` (two-step user-modification flow), never silently overwrite managed files |
| `flightlead sync` | dev path: repo → live (dogfood loop; ported config-sync) |
| `flightlead update` | release-driven dep bump + re-materialize |
| `flightlead check` | deterministic gates: tests, lint, typecheck, semgrep (telemetry off, pinned rulesets), secrets, frontmatter, manifest completeness |
| `flightlead doctor` | installed? authenticated? config parses? proxy healthy? cache mode=cache? python3.13? :8788 launchd-owned? semgrep smoke? ledger tail? |
| `flightlead scaffold --project` | project scaffold: backlog init, AGENTS.md, docs/research, ADRs, .gitignore, .env.example (never touches .env/.env.local) |

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

Append-only JSONL at `~/.local/state/flightlead/`. Every command appends one
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
- The file is append-only. flightlead never rewrites or truncates it.

### Manifest

`flightlead.json` (JSON, CLI-managed). Per-tool: install channel
(brew/pipx/npm/uv), version, doctor check id. Completeness rule: every
external binary invoked in skills/src/payload must appear in the manifest —
`check` enforces this (manifest-completeness gate; drift is a `doctor`
check).

---

## Command detail

### `flightlead init`

| Aspect | Behavior |
|---|---|
| Args | `--host <opencode>` (default: opencode), `--dry-run`, `--yes` (non-interactive), per-tool skip flags |
| Asks | confirm each managed-file group before write (two-step user-modification flow) |
| Ledger events | `install` per tool, `materialize` per file, `decision` per user confirmation, `refusal` per declined overwrite |
| Exit codes | `0` clean; `1` step failed; `3` managed-file conflict declined; `4` unsupported env |

Managed-file rule: if a managed file exists and differs from the payload and
was modified outside flightlead, init refuses and shows the diff; it never
silently overwrites. The two-step flow: propose → user confirms → write.

### `flightlead sync`

| Aspect | Behavior |
|---|---|
| Args | `--reverse` (live → repo, for capture), `--dry-run` |
| Job | dev path: repo → live (dogfood loop) |
| Ledger events | `materialize` per synced file; `decision` for post-sync diff summary |
| Exit codes | `0` clean (post-sync diff empty); `1` sync failed or diff non-empty after sync |

### `flightlead update`

| Aspect | Behavior |
|---|---|
| Args | `--tool <name>`, `--dry-run`, `--yes` |
| Job | release-driven dep bump + re-materialize (init rules apply; never silent) |
| Ledger events | `install` per bumped tool, `materialize` per re-written file |
| Exit codes | `0` clean; `1` bump failed; `3` managed-file conflict |

### `flightlead check`

| Aspect | Behavior |
|---|---|
| Args | `--gate <id>` (run one gate), `--json` (gate receipts on stdout) |
| Gates | tests, lint, typecheck, semgrep (telemetry off, pinned rulesets), secrets, frontmatter, manifest completeness |
| Ledger events | `gate` per gate id with pass/fail; gate receipts reference run id |
| Exit codes | `0` all gates pass; `1` any gate fails |

Gate receipts: each gate emits a receipt (gate id, run id, timestamp, pass/
fail, counts) to the ledger; `--json` prints them for programmatic use.

### `flightlead doctor`

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
| `manifest.completeness` | every invoked external binary appears in `flightlead.json` |
| `versions.pinned` | manifest versions pinned for all tools |
| `platform.arm64` | arm64 macOS guard (hard exit `4` otherwise) |
| `ledger.tail` | ledger exists, is readable, and its tail parses as JSONL |

Each subcheck prints one line: id, pass/fail, and on failure a single
copy-paste fix.

### `flightlead scaffold --project`

| Aspect | Behavior |
|---|---|
| Args | `--project <path>` (required), `--force` (re-scaffold missing files only) |
| Writes | backlog init, AGENTS.md, `docs/research/`, ADRs dir, `.gitignore`, `.env.example` |
| Never touches | `.env`, `.env.local` — hardcoded exclusion, enforced by gate |
| Ledger events | `materialize` per scaffolded file; `decision` for skipped existing files |
| Exit codes | `0` clean; `1` scaffold failed; `2` missing required arg |

---

## Provenance

- CLI surface table: `docs/specs/2026-09-05-v010-draft-brief.md` ("CLI surface").
- Doctor subchecks: runbook verification battery decomposition (brief,
  "Runbook decomposition rule": "verification battery → doctor subchecks").
- Zero-silent-failure + ledger: brief ("Ledger" and "Zero silent failure").
