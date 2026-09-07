---
date: 2026-08-16
topic: backlog.md state model — status values, lifecycle, phase tracking, hook integration surface
status: resolved
sources:
  - https://github.com/MrLesk/Backlog.md (repo, README, v1.50.1)
  - https://github.com/MrLesk/Backlog.md/blob/main/CLI-INSTRUCTIONS.md
  - https://github.com/MrLesk/Backlog.md/blob/main/ADVANCED-CONFIG.md
  - https://github.com/MrLesk/Backlog.md/issues/456 (hook expansion proposal, open)
  - https://www.npmjs.com/package/backlog.md (v1.50.1, updated 2026-08-10)
  - file:///Users/shabibhossain/.agents/.worktrees/deterministic-harness/backlog/config.yml
  - file:///Users/shabibhossain/.agents/.worktrees/deterministic-harness/backlog/tasks/ (4 task files read)
  - MCP backlog_get_backlog_instructions (overview, task-creation, task-execution, task-finalization)
models_used_for_research:
  - z-ai/glm-5.2
supersedes: none
last_verified: 2026-08-16
---

# Backlog.md state model — implications for SDLC loop harness

## Summary

Backlog.md is a **flat-status, markdown-native task manager**. It has NO phase or step concept. Task state is a single `status` enum (configurable, default 3-5 values) plus a boolean acceptance-criteria checklist. The SDLC lifecycle (spec→plan→build→test→review→ship) is **convention encoded in instruction docs**, not in the task data model. The only hook integration surface is `onStatusChange` — a post-transition shell callback. A proposal for richer lifecycle hooks (issue #456) is open but unshipped. For a deterministic SDLC loop harness, phase state should live **outside** backlog in a separate state file; backlog is the source of truth for task commitment + AC completion, not for loop-phase position.

## 1. Status values and the state model

### Configurable status enum

Statuses are **fully configurable** in `config.yml` under the `statuses` key. Defaults and local config:

| Source | Statuses |
|---|---|
| Backlog.md default | `[To Do, In Progress, Done]` |
| Local config (deterministic-harness worktree) | `[To Do, In Progress, In Review, Done]` |
| MCP `task_create` tool enum | `Draft, To Do, In Progress, In Review, Done` |

`Draft` is a special pre-commitment state: excluded from normal lists unless explicitly filtered, promoted/demoted via status edit. It is not a board column by default but is a valid status value.

Source: ADVANCED-CONFIG.md `statuses` row; local `config.yml` line 3; MCP tool schema.

### No transition rules

There are **no enforced transitions**. You can set status to any configured value via `task_edit` / `backlog task edit <id> -s "..."`. Backlog does not prevent To Do → Done skips. Transition discipline is advisory, encoded in the workflow guides (task-execution says "mark In Progress before implementing"; task-finalization says "set Done after AC verification"), not in the data model.

### Status is the ONLY stateful progress field

The task frontmatter has exactly one progress-tracking field: `status`. Everything else is metadata (id, title, assignee, labels, dependencies, priority, type, ordinal, dates) or content sections (description, AC checklist, plan, notes, comments, final summary). There is no `phase`, `step`, `stage`, or `progress` field.

Verified by reading all 4 local task files — none contain a phase field. Verified by the MCP `task_edit` schema — no phase parameter exists.

## 2. How backlog models task lifecycle (convention, not data)

The workflow guides describe a lifecycle, but it lives in **instruction markdown**, not in task state:

| Guide phase | What the agent does | How it's recorded |
|---|---|---|
| Creation (task-creation guide) | Decompose work, write description + AC | `status: To Do` (or `Draft`) |
| Execution (task-execution guide) | Take into progress, research, write plan, implement | `status: In Progress` + `implementationPlan` + `implementationNotes` fields |
| Finalization (task-finalization guide) | Verify AC with evidence, check items, write final summary | `status: Done` + `acceptanceCriteria` checkboxes + `finalSummary` |

The "three review checkpoints" from the README (review spec, review plan, review code) map to:
1. After creation, before In Progress (spec review)
2. After plan is written, before implementation (plan review)
3. After implementation, before Done (code review)

But these checkpoints are **not queryable state** — there is no `current_checkpoint` field. A hook cannot ask backlog "is this task in the plan-review checkpoint?" It can only read `status` (In Progress) and infer that a plan exists by checking if `implementationPlan` is non-empty.

### Acceptance criteria as micro-state

The AC checklist (`- [ ] #N text` → `- [x] #N text`) is the only sub-status granularity. Each AC item has a boolean `checked` state. This is queryable via `task_view` and CLI `--json` output (`acceptanceCriteria[].checked`). But AC items are product-scope checks ("does the feature work"), not phase checks ("did the agent finish the plan step").

### Definition of Done (DoD)

DoD is a separate checklist from AC, with project-level defaults (configurable via `definition_of_done` in config). Same boolean-checked structure. DoD is completion hygiene ("tests pass", "docs updated"), not phase tracking.

## 3. Dependencies

Dependencies are **simple task-ID references** in a `dependencies` array. No DAG, no enforcement, no cycle detection documented.

- Add: `backlog task edit 7 --dep task-1 --dep task-2`
- Formats: `task-1`, `1`, or comma-separated `1,2,3`
- Validation: referenced tasks must exist (automatic)
- Querying: `backlog task list --ready` filters tasks whose dependencies are satisfied/completed
- `task_view` shows dependencies and which are blocking

There is no dependency-type (blocks, depends-on, related-to) — all deps are blocking prerequisites.

## 4. How hooks would query backlog state

Three integration paths, in order of robustness:

### Path A: CLI with `--json` (recommended for hooks)

```bash
backlog task <id> --json
```

Returns stable, versioned JSON (`schemaVersion: 1`). Envelope: `{ "kind": "task-view", "task": {...} }`. Fields include: `id`, `status`, `assignees`, `labels`, `milestone`, `acceptanceCriteria` (with `index`, `text`, `checked`), `implementationPlan`, `implementationNotes`, `definitionOfDone`, `dependencies`, `finalSummary`.

For listing: `backlog task list --status "In Progress" --json` → `{ "kind": "task-list", "tasks": [...] }` with compact fields.

**This is the contract a deterministic hook should call.** Versioned, non-interactive, exits 0 on success / nonzero on error with stderr message.

### Path B: MCP `task_view` / `task_list`

Same data as CLI `--json`, served through the MCP server (`backlog mcp start`). Useful if the hook runs inside an agent session that already has the MCP server connected. Not suitable for shell-level hooks that fire outside agent context.

### Path C: Direct file read (fragile, discouraged for writes)

Task files are plain markdown with YAML frontmatter at `backlog/tasks/task-N - Title.md`. The `status:` field is in frontmatter. Reading is safe; **writing is discouraged** — the project's own AGENTS.md says "Never edit Backlog task markdown files directly. Use the `backlog` CLI so metadata, relationships, and history stay consistent." A hook that only reads status could parse frontmatter, but the CLI `--json` path is more stable across versions.

## 5. The `onStatusChange` callback — the only hook surface

Backlog.md ships exactly one hook mechanism: `onStatusChange` in config.yml.

```yaml
onStatusChange: 'if [ "$NEW_STATUS" = "In Progress" ]; then echo "started" >> /tmp/log; fi'
```

- **Trigger**: fires after any task status changes
- **Variables**: `$TASK_ID`, `$OLD_STATUS`, `$NEW_STATUS`, `$TASK_TITLE`
- **Per-task override**: `onStatusChange` in task frontmatter
- **Execution**: shell command, async, fail-safe (hook failures never block task operations)
- **Limitation**: post-transition only, no pre-transition gating, status-only (does not fire on AC checks, plan edits, or label changes)

Source: ADVANCED-CONFIG.md "Status Change Callbacks" section.

### Issue #456 — proposed hook expansion (NOT shipped)

GitHub issue #456 (opened 2025-12-11 by jpoley) proposes expanding to a full lifecycle hook system: `post-task-create`, `post-task-update`, `post-task-archive`, with scripts discovered in `.backlog/hooks/` and richer env vars (`BACKLOG_HOOK_EVENT`, `BACKLOG_TASK_ASSIGNEE`, etc.). This is an **open feature request**, not implemented in v1.50.1. The current `executeStatusChangeCallback()` is the only emission point.

Source: https://github.com/MrLesk/Backlog.md/issues/456

**Implication**: a deterministic harness cannot rely on backlog.md hooks for phase gating. The harness must implement its own hook layer (e.g., opencode plugin hooks) that reads backlog state and enforces phase transitions externally.

## 6. Custom fields and labels

### Labels

Labels are a **free-form string array** in frontmatter. No predefined vocabulary, no enum enforcement. Could be repurposed for phase tracking (e.g., `label: phase:plan`), but this is a hack:
- No query support for "tasks in phase:plan" beyond `task list --labels phase:plan`
- Labels are user-visible and pollute the kanban board
- No transition validation on labels (any agent can set any label)

### Custom fields

**None.** Backlog.md has a fixed schema. There is no `customFields`, `metadata`, or arbitrary-key-value mechanism in the frontmatter. The only extensible fields are `labels` (string array) and `type` (enum: bug, feature, enhancement, task, chore, docs, spike).

## 7. Gap analysis — what backlog.md CANNOT do

| Need | Backlog.md capability | Gap |
|---|---|---|
| Track which SDLC phase (spec/plan/build/test/review/ship) a task is in | Only `status` (4-5 coarse values) | 6 phases ≠ 4 statuses. "In Progress" collapses plan+build+test+review into one bucket. No phase field. |
| Gate phase transitions (block build if no plan exists) | No pre-transition hooks; only post-status `onStatusChange` | Cannot prevent a bad transition, only react after it happens. |
| Query "what phase is this task in?" | `status` + check if `implementationPlan` is non-empty (inference) | No first-class phase query. Must infer from field presence. |
| Enforce phase ordering | No enforcement; advisory workflow guides only | An agent can set Done without a plan. Discipline is procedural. |
| React to AC check / plan edit / label change | `onStatusChange` fires only on status transitions | Issue #456 (open) would add `post-task-update` but is unshipped. |
| Store arbitrary phase metadata | Fixed schema; only `labels` hack | No custom fields. Labels pollute the board and lack query semantics. |
| Track loop iteration / attempt count | Not modeled | No retry or attempt concept. Comments could log attempts but it's free text. |

## 8. Recommendation: phase state lives OUTSIDE backlog

**Phase state should live in a separate state file in the worktree, not in backlog.md.**

### Why

1. **Orthogonal concern**: Backlog tracks *commitment* (what will be built) and *completion* (are the acceptance criteria met). SDLC phase is about the *agent's current position in the deterministic loop* — a process concern, not a product concern. Mixing them violates SRP.

2. **Granularity mismatch**: The 6-phase SDLC (spec→plan→build→test→review→ship) cannot map cleanly to backlog's 4-5 statuses without losing resolution. "In Progress" would need to carry 4 sub-phases, which backlog has no field for.

3. **No enforcement surface**: Backlog's `onStatusChange` is post-transition and fail-safe (cannot block). A deterministic harness needs *pre-transition gating* (block the agent from editing code if no plan exists). This must be implemented in the outer host's hook layer (opencode plugin hooks: `tool.execute.before`), not in backlog.

4. **Stability**: A separate state file is owned by the harness, versioned independently, and not coupled to backlog.md's schema evolution. Backlog's JSON contract (`schemaVersion: 1`) is the read interface; the phase file is the write surface.

### Proposed architecture

```
┌──────────────────────────────────────────────────────┐
│  Deterministic SDLC loop harness (this layer)         │
│                                                       │
│  phase-state.yml (per-worktree)                       │
│    task_id: TASK-2.2                                 │
│    phase: build                                      │
│    phase_entered_at: 2026-08-16T22:00:00Z             │
│    gate_status:                                      │
│      spec: passed                                    │
│      plan: passed                                    │
│      build: in_progress                              │
│      test: pending                                   │
│      review: pending                                 │
│      ship: pending                                   │
│                                                       │
│  Reads from backlog (CLI --json) ◄──────────┐        │
│    - task status (In Progress?)              │        │
│    - implementationPlan exists?              │        │
│    - acceptanceCriteria[].checked            │        │
│    - finalSummary exists?                    │        │
│                                              │        │
│  opencode hook: tool.execute.before ─────────┘        │
│    reads phase-state.yml + backlog --json             │
│    gates: block code edits if phase < build           │
│    gates: block commit if AC not all checked          │
│                                                       │
│  onStatusChange callback (backlog → harness)          │
│    In Progress → set phase: plan                      │
│    Done → verify all gates passed before ack          │
└──────────────────────────────────────────────────────┘
         │ reads (CLI --json)
         ▼
┌──────────────────────────────────────────────────────┐
│  Backlog.md (source of truth for)                     │
│    - task existence + metadata                         │
│    - acceptance criteria + checked state               │
│    - implementation plan + notes                       │
│    - status (To Do / In Progress / Done)               │
│    - dependencies                                      │
│    - final summary                                     │
└──────────────────────────────────────────────────────┘
```

### How the two state stores interact

| Event | Who writes | What happens |
|---|---|---|
| Task created | Backlog | Harness initializes `phase-state.yml` with `phase: spec, all gates pending` (triggered by `onStatusChange` if status is set, or by polling) |
| Agent starts work | Agent sets `status: In Progress` via backlog CLI | `onStatusChange` fires → harness sets `phase: plan` in phase-state.yml |
| Plan written | Agent sets `implementationPlan` via backlog CLI | Harness hook reads backlog, verifies plan non-empty, sets `gate.plan: passed`, advances `phase: build` |
| Code edits | Agent edits files | opencode `tool.execute.before` hook reads `phase-state.yml`, blocks if `phase < build` |
| Tests run | Agent runs tests | Harness script verifies exit code, sets `gate.test: passed` |
| AC checked | Agent checks AC via backlog CLI | Harness reads backlog `--json`, verifies all `checked: true` |
| Task done | Agent sets `status: Done` | `onStatusChange` fires → harness verifies all gates passed, then acknowledges |

### What backlog.md provides to the harness (verified)

- **Stable JSON read API**: `backlog task <id> --json` with `schemaVersion: 1` — status, AC checked states, plan existence, final summary. This is the contract.
- **Status transitions as triggers**: `onStatusChange` callback with `$TASK_ID`, `$OLD_STATUS`, `$NEW_STATUS`. This is the only push-based integration.
- **Dependency readiness**: `backlog task list --ready` — query which tasks can start.
- **Acceptance criteria as gate evidence**: `acceptanceCriteria[].checked` in `--json` output.

### What the harness must provide itself (the gaps)

- **Phase state file** (`phase-state.yml` or similar): per-worktree, owned by the harness, not by backlog.
- **Pre-transition gating hooks**: implemented in the outer host (opencode `tool.execute.before` plugin hooks), NOT in backlog. These read both `phase-state.yml` and backlog `--json` to enforce "no code edits before plan", "no Done before all AC checked".
- **Phase advancement logic**: a script that reads backlog state (plan exists? AC checked?) and updates `phase-state.yml`. This is the deterministic core.
- **Gate verification on Done**: when backlog `onStatusChange` fires with `$NEW_STATUS=Done`, the harness verifies all gates in `phase-state.yml` are `passed` before accepting the transition (or reverting + alerting if they are not).

### Why not use labels for phase tracking (rejected alternative)

- Labels are visible on the kanban board and pollute the UI with process state that humans should not manage
- No transition validation — any agent can set any label at any time, defeating determinism
- No query semantics beyond exact label match
- Labels are a product concern (frontend, backend, bug), not a process concern
- Mixing process state into product labels violates the separation between the two loops (WHAT = product, HOW = process)

## 9. What I did NOT check

- **Backlog.md source code** (`src/core/backlog.ts`): I did not read the TypeScript source to verify the `executeStatusChangeCallback()` implementation or check for undocumented hook emission points. The issue #456 reference to `executeStatusChangeCallback()` in `src/core/backlog.ts` is from the issue author, not my verification.
- **MCP resource URIs** (`backlog://workflow/...`): I used the MCP tool `get_backlog_instructions` which returns the same content, but did not test the URI-based resource path directly.
- **Web UI / TUI behavior**: I did not verify whether the kanban board or web UI expose any phase-like concept through views or filters. Based on docs, they surface `statuses` as columns only.
- **`backlog.config.yml` (root) vs `backlog/config.yml` (folder)**: the local worktree uses folder-local `backlog/config.yml`. I did not test whether root-level `backlog.config.yml` behaves differently for the `statuses` key. Docs say root config is preferred when using custom backlog directory.
- **Future roadmap**: I did not check whether backlog.md's maintainer (MrLesk) has committed to implementing issue #456's hook expansion. It remains an open proposal as of 2026-08-16.
