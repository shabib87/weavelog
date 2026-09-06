---
date: 2026-08-30
topic: Conductor flow to backlog.md lifecycle fields
status: draft
type: architecture
author: conductor
related_to:
  - ./README.md
  - ./loop-factory.md
  - ./tool-boundaries.md
sources:
  - "TASK-15"
  - "TASK-13 (backlog.md wiring)"
  - "TASK-16 (operational reference moved from runbook Phase 9)"
---

# Backlog lifecycle — conductor flow → backlog.md fields

The conductor maps its flow to backlog.md native fields through the CLI flags — one field
per concern, no sidecar artifact files. Routine plans do NOT go in `docs/plans/`.

See [diagrams/backlog-lifecycle.html](./diagrams/backlog-lifecycle.html) — the task state
machine with the two human gates and the field mapping (generated via the diagram-design skill).

## Field mapping

| Conductor flow | backlog.md field | CLI |
|---|---|---|
| spec (what + why) | `description` | `task create` / `--description` |
| acceptance | `acceptanceCriteria` (EARS) | `--ac` |
| plan (how) | implementation plan | `--plan` / `--append-plan` |
| progress | implementation notes | `--notes` / `--append-notes` |
| discussion + review | comments | `--comment` + `--comment-author` |
| files touched | modified files | `--modified-file <path>` |
| results | final summary | `--final-summary` |
| acceptance proof | per-AC check | `--check-ac <n>` — one AC at a time, only when proven |

All flags are on `backlog task edit`; spec and acceptance are set at `backlog task create`.

## Validation order

Run tests/lint FIRST, then `--check-ac <n>` against the fresh output. Never check an AC
from code presence, grep, or intent alone.

## Board and browser are human tools

The conductor does NOT drive the interactive board/browser UI. For a kanban view the
conductor reads `backlog task list` or exports via `backlog board export` and reads the file.

## Label vocabulary and milestones (v5)

Closed label vocabulary, case-insensitive, enforced at claim + create + pre-commit:
reserved tier (machinery-only) `spec-approved` `dispatched` `stuck` `merged` `housekeeping`
`wayfinder:map`; general tier (hand-settable) `harness` `dogfood` `deferred`. Unknown
labels refuse the claim. `harness`/`dogfood` are harness-dev-only (agents-harness and
weavelog repos); in any other repo they are validation failures. Decision table for
general labels, first match: `harness` (task modifies bin/plugins/config/AGENTS.md/
docs/architecture/stack-versions.json), `dogfood` (deliverable is real work run through
the harness as the verification subject), `deferred` (explicit revive trigger), otherwise
no label.

Milestones: agents never create them (human-owned; the wayfinder skill owns map milestones
at map setup). Assign on an EMPTY milestone only — human-assigned milestones always win:
version milestone for v1/v2 scope (migration-time-only), the map's milestone for wayfinder
map tasks, none otherwise; missing target warns and assigns none.

## Three review checkpoints

1. **Spec review (HITL)** — `description` + acceptance criteria presented to the user,
   explicit approval recorded as the `spec-approved` label, BEFORE the task moves In
   Progress. The claim gate (`task-flow.ts claim`) refuses To Do → In Progress on a task
   with an empty/placeholder description, zero acceptance criteria, or a missing
   `spec-approved` label. After approval, the pre-commit hook blocks commits that remove
   or reduce the task's ACs (spec changes re-run the gate).
2. **Plan review** — the recorded `--plan`, BEFORE implementation starts.
3. **Code review** — `diff-reviewer-*` verdict, BEFORE merge.

## Deferred capabilities (named + triggers)

- `onStatusChange` callback → defer to v2 push notifications (v1 re-verifies status by polling).
- `backlog decision` (CLI-only merge-gate records) → defer to the next architecture decision.
- `--due-date` → defer to time-boxed work (current tasks are effort-ordered, not time-boxed).

## Operational reference (moved from runbook Phase 9, TASK-16)

Adopted 2026-08-16 as the work queue + kanban (decision record:
`docs/research/2026-08-16-work-management-layer-selection.md`). Scope boundary:
tracking/visualization ONLY — brainstorm/plan/execute/verify stay with the three-phase
model + conductor + qa (see `~/.config/opencode/AGENTS.md` "Task tracking").

- **Install**: `arch -arm64 /opt/homebrew/bin/bun add -g backlog.md@1.50.1` (bun-global,
  pinned; binary at `~/.bun/bin/backlog`). Never ad-hoc upgrade — bump via manifest.
- **Manifest**: `stack-versions.json` key `backlogMd`; weekly drift via stack-check.ts (6.2).
- **MCP**: DISABLED 2026-08-29 — see
  `docs/research/2026-08-29-backlog-mcp-enforcement-bypass.md`. The MCP pilot was
  never measured; 20 tool schemas tax the frozen prefix every request and the MCP
  writes files directly (bypasses enforce.ts write-block). CLI via `bash` is the
  sole interface. Re-enable: flip `enabled: true` in opencode.jsonc + restart.
- **Per-repo adoption**: `backlog init "<name>"` in the repo; then
  `backlog config set autoCommit false`, `remoteOperations false`,
  `checkActiveBranches false`. Commit the whole `backlog/` tree. Statuses extended via
  `backlog/config.yml`: `["To Do", "In Progress", "In Review", "Done"]` (config set
  refuses statuses; edit the file).
- **Conductor ops**: `bun ~/.agents/bin/src/task-flow.ts` (claim/note/close,
  set-then-verify) — queue mechanics stay out of LLM context.
- **Pilot**: repo = ~/.agents (worktree light-factory), 1-week human gate: board + web
  UI actually used → keep; else rollback (P9 row) and keep `backlog/` as ledger.
- **Safe update**: `bun add -g backlog.md@<new>` → smoke `backlog --version` → update
  manifest `backlogMd` → stack-check clean.

## References

- Capability audit: [docs/research/2026-08-23-backlog-md-capability-audit.md](../research/2026-08-23-backlog-md-capability-audit.md)
- State model: [docs/research/2026-08-16-backlog-md-state-model.md](../research/2026-08-16-backlog-md-state-model.md)
