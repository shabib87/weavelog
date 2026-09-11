---
date: 2026-08-16
topic: "Worktree discipline — flow, lifecycle, HITL merge gate, crash contract"
status: approved
type: architecture
author: conductor
related_to:
  - ./runbook-decomposition.md
  - ../adr/0006-tiered-loop-commands.md
sources:
  - "TASK-23"
---

# Worktree discipline (v1 inner harness)

Single source: this document. The root AGENTS.md points here (one thin file, one sync — TASK-23 restructure 2026-08-31).

## Worktree discipline (v1 inner harness)

Every request flows through: backlog → spec → plan → worktree → validate → **[HUMAN GATE: merge approval]** → merge → done.
No work on main. No work without a backlog task.

### Task lifecycle

**New task** — the conductor needs a task that doesn't exist yet:
1. `bun src/worktree-create.ts --create "<title>"` — infers the next task ID, creates the worktree on `task/<task-id>`, then creates the backlog task from **within the worktree** (`cwd=worktree`) so the task file lands on the task branch — not on main. Stubs are exempt from creation-time checks by design (the gate is at claim time)
2. Refine the task (description, ACs, deps) via `backlog task edit` from within the worktree
3. **Present the spec to the user and wait for explicit approval** (HITL spec gate — see Review checkpoints). Record approval as the `spec-approved` label via `backlog task edit --label spec-approved`
4. Merge the task branch to main so the task is visible to other threads (metadata merge — exempt from HITL merge gate, no implementation changes)
5. Implementation happens in a new thread (or same thread if the task is small and the user agrees)

**Existing task pickup** — the user asks the conductor to work on TASK-N:
1. `bun src/worktree-create.ts TASK-N` — creates the worktree on `task/TASK-N` (skips if it already exists)
2. `backlog task edit TASK-N --status "In Progress" --assignee conductor` from within the worktree
3. Implement, test, diff review
4. Present diff review findings to the user → **wait for merge approval**
5. After approval: merge to main, mark task Done, clean up worktree

**--ready mode** — create worktrees for all deps-satisfied tasks at once:
- `bun src/worktree-create.ts --ready` — batch-creates worktrees for every task whose dependencies are all Done

### Rules

- **All work happens in `.worktrees/<task-id>`** on branch `task/<task-id>`.
- **No commits on main.** Enforced by a git pre-commit hook (installed by worktree-create.ts)
  and the enforce.ts write-block (blocks `edit`/`write` on main before they land).
- **HITL merge gate.** The conductor MUST present diff review findings to the user and wait
  for explicit merge approval before merging. Diff review is the machine gate;
  the user's "yes, merge" is the human gate. The conductor never merges without it.
- **HITL spec gate.** The conductor MUST present the task spec (description + EARS acceptance
  criteria) to the user and wait for explicit approval BEFORE the task moves In Progress.
  Approval is recorded as the `spec-approved` label. The claim gate (`task-flow.ts claim`)
  refuses To Do → In Progress on a task with empty/placeholder description, zero acceptance
  criteria, or a missing `spec-approved` label — the deterministic boundary backs the human gate.
  After `spec-approved` is set, the pre-commit hook blocks commits that remove or reduce the
  task's acceptance criteria (AC gutting) — spec changes post-approval require removing the
  label and re-running the gate.
- **difit auto-open (merge-gate presentation).** The conductor ALWAYS opens the
  diff viewer in the browser for the human (`npx difit@5.0.12 --background` for the server;
  difit is an exact-pinned devDependency, so this resolves locally — no global install),
  then `open http://localhost:<port>`) — the human never copies a URL. **Invocation
  direction:** `difit <branch> main` (branch FIRST, main second) so the human sees
  branch changes as ADDITIONS; the reverse order renders the changelog backwards
  (new files look deleted — incident 2026-09-04, recurred twice). Present the
  three-action question (merge / kick back / re-plan) in the same turn. difit is
  display-only: comments live in browser localStorage with no export API (verified
  2026-09-01 against the running server — no comments endpoint), so the DECISION
  itself arrives via chat until TASK-8 ships the decision CLI. Investigating a
  comments→batch-prompt export path is part of TASK-8.
- **Bypass:** `ENFORCE_DISABLED=true` disables both the hook and the write-block (mirrors the
  enforce.ts kill-switch); `git commit --no-verify` is the native git bypass for the hook alone.
  Both are permitted ONLY to merge an approved task branch onto main — never for direct edits
  or commits on main outside an approved merge. The hook's block message does not teach the
  bypass; it points here.
- **Crash contract:** a conductor crash leaves all in-flight tasks stuck. There is no
  auto-recovery in v1 — the human resets. Reset procedure:
  1. `git worktree list` — enumerate worktrees and their branches.
  2. `git branch --list 'task/*'` — enumerate task branches.
  3. Inspect each worktree's `git status` — **never delete a worktree with uncommitted work.**
  4. Reconcile against `backlog task list`; re-dispatch or abandon stuck tasks by hand.
- **Self-modifying merges:** after merging a task that touches `bin/src/` or `plugins/`, the
  conductor restarts the session so the running plugin/scripts pick up the new code.

## Spec-driven development (EARS acceptance criteria)

Acceptance criteria use **EARS-style** format — structured WHEN/THEN (or IF/THEN, WHILE/THEN)
statements in the backlog task's `acceptanceCriteria` array. Not Gherkin, not Cucumber — just
structured, testable statements.

Examples:
- `WHEN the pre-commit hook fires on main THEN the commit is blocked`
- `IF the verify-gate is active THEN code writes are blocked after >10 tool calls without a bash run`

The conductor flow maps to backlog.md lifecycle fields through the CLI flags — one field per
concern, no sidecar artifact files (routine plans do NOT go in `docs/plans/`):

| Conductor flow        | backlog.md field               | CLI                                             |
| --------------------- | ------------------------------ | ----------------------------------------------- |
| spec (what + why)     | `description`                  | `task create` / `--description`                 |
| acceptance            | `acceptanceCriteria` (EARS)    | `--ac`                                          |
| plan (how)            | implementation plan            | `--plan` / `--append-plan` (not `docs/plans/`)  |
| progress              | implementation notes           | `--notes` / `--append-notes`                    |
| discussion + review   | comments                       | `--comment` + `--comment-author`                |
| files touched         | modified files                 | `--modified-file <path>` (file→task traceability)|
| results               | final summary                  | `--final-summary`                               |
| acceptance proof      | per-AC check                   | `--check-ac <n>` — one AC at a time, only when proven (never batch) |

All flags above are on `backlog task edit`; spec and acceptance are set at `backlog task create`.

### Creation checklist (what a compliant task looks like)

`backlog instructions task-creation` is the base guide; these are the harness deltas. The
enforce.ts create gate and the claim gate enforce the mandatory set.

- **Mandatory:** title; description = outcome + why (self-contained, names files/interfaces,
  states out-of-scope); ≥1 EARS acceptance criterion (WHEN/IF/WHILE + THEN, testable, happy +
  unhappy paths); dependencies when order matters.
- **Optional:** `--ref` / `--doc` references, assignee, milestone, labels, task-specific `--dod`.
- **Forbidden at creation:** implementation plan (the worker records the plan at activation —
  `--plan` on create only for already-active work). Execution fields (notes, final summary)
  fill in later.
- **Housekeeping class** (type chore/docs/spike): EARS shape is warn-only; AC presence is
  still required.
- **Closed label vocabulary** (v5): reserved tier set only by owning machinery —
  `spec-approved`, `dispatched`, `stuck`, `merged`, `housekeeping`, `wayfinder:map`;
  general tier hand-settable — `harness`, `dogfood`, `deferred`. Unknown labels refuse
  claim and block create/pre-commit. `harness`/`dogfood` are harness-dev-only: outside the
  canonical repos (agents-harness, weavelog) they are validation failures; the future
  weavelog scaffold ships scaffolds the reserved set plus `deferred` only. Decision
  table (first match): `harness` when the task modifies bin/plugins/config/AGENTS.md/
  weavelog.json; `dogfood` when the deliverable is real work run
  through the harness as the verification subject; `deferred` when an explicit revive
  trigger is recorded; no match → no label. Matching is case-insensitive.
- **Milestones** (v5): agents never create milestones (human-owned; wayfinder skill owns
  map milestones at map setup). Assignment table on an EMPTY milestone only — human-assigned
  milestones always win: version milestone for v1/v2 scope (migration-time-only), the map's
  milestone for wayfinder map tasks, none otherwise. Missing target → warn, assign none.

Validation order: run tests/lint FIRST, then `--check-ac <n>` against the fresh output. Never
check an AC from code presence, grep, or intent alone.

`board` and `browser` are **human** tools — the conductor does not drive the interactive
board/browser UI. For a kanban view the conductor reads `backlog task list` or exports the
kanban via `backlog board export` and reads the file.

## Review checkpoints (three gates)

1. **Spec review (HITL)** — `description` + acceptance criteria presented to the user,
   explicit approval recorded as the `spec-approved` label, BEFORE the task moves In
   Progress. Backed by the claim gate: `task-flow.ts claim` refuses the transition without
   the label or with an empty/placeholder description or zero ACs.
2. **Plan review** — the recorded `--plan`, BEFORE implementation starts.
3. **Code review** — `diff-reviewer-*` verdict, BEFORE merge.

High-stakes work cross-checks gates 1–2 with `plan-gate-*` and gate 3 with `diff-reviewer-*`
(four model families each — see `~/.agents/AGENT-STACK-RUNBOOK.md` Phase 3).

## Deferred backlog.md capabilities (named deferrals + revive triggers)

- `onStatusChange` callback → defer to v2 push notifications (v1 re-verifies status by polling).
- `backlog decision` (CLI-only merge-gate records) → defer to the next architecture decision.
- `--due-date` → defer to time-boxed work (current tasks are effort-ordered, not time-boxed).

## Backlog MCP disabled

The `backlog` MCP server is disabled in `opencode.jsonc` (`"enabled": false`). The `backlog`
CLI via `bash` is the sole task-management interface. Re-enable path and rationale:
`docs/research/2026-08-29-backlog-mcp-enforcement-bypass.md`.
