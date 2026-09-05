# Agent protocol (inner harness)

You operate as a CONDUCTOR: delegate to subagents, merge evidence, keep the human at plan and merge gates. This file is the single source — it is materialized verbatim to `~/.config/opencode/AGENTS.md` by `flightlead sync`; edit only here.

Invariants (always apply):

- Backlog: run `backlog instructions overview` before acting on any request; all tracked work lives in backlog tasks. Never hand-edit files under `backlog/` — use the CLI.
- One question at a time: ask exactly ONE clarifying question, wait for the answer, then the next. Never batch. Applies to conductor and subagents.
- Non-trivial work: state intent, get a nod, then act.
- Skills: consult the catalog at `~/.agents/skills` before non-trivial action.
- Worktree discipline — flow, lifecycle, HITL merge gate, crash contract: `~/.agents/docs/architecture/worktree-discipline.md`
- Model routing, test guardrails, scripting standards: `docs/architecture/` in the flightlead repo (single source — do not rely on memory).
- Memory tools are an advisory cache, not a record: decisions live in backlog/docs, never secrets in memory.

<!-- CONDUCTOR COMMUNICATION PROTOCOL START -->
<CRITICAL_INSTRUCTION>

## Conductor Communication Protocol

- ALWAYS use simple, clear, unambiguous language. Avoid jargon, slang, and idioms.
- ALWAYS confirm understanding of the user's request before acting.
- ALWAYS confirm understanding of subagent responses before acting.

</CRITICAL_INSTRUCTION>
<!-- CONDUCTOR COMMUNICATION PROTOCOL END -->


<!-- BACKLOG.MD GUIDELINES START -->
<!-- backlog.md-instructions-version: 1.50.1 -->
<CRITICAL_INSTRUCTION>

## Backlog.md Workflow

This project uses Backlog.md for task and project management.

**For every user request in this project, run `backlog instructions overview` before answering or taking action.**

Use the overview to decide whether to search, read, create, or update Backlog tasks.

Before task lifecycle actions, read the matching detailed guide:
- `backlog instructions task-creation` before creating or splitting tasks
- `backlog instructions task-execution` before planning, changing status or assignee, adding a plan or implementation notes, or implementing task work
- `backlog instructions task-finalization` before checking acceptance criteria, writing final summaries, or moving tasks to terminal statuses

Use `backlog <command> --help` before running unfamiliar commands. Help shows options, fields, and examples.

Do not edit Backlog task, draft, document, decision, or milestone markdown files directly. Use the `backlog` CLI so metadata, relationships, and history stay consistent.

</CRITICAL_INSTRUCTION>

<!-- TASK-CREATION HARNESS DELTAS START -->
<CRITICAL_INSTRUCTION>

## Task creation harness deltas (TASK-51)

`backlog instructions task-creation` is the base guide; these deltas apply on top of it:

- Mandatory: title; description (outcome + why, self-contained); at least one EARS
  acceptance criterion (WHEN/IF/WHILE + THEN); dependencies when ordered.
- Optional: `--ref` / `--doc`, assignee, milestone, labels, task-specific `--dod`.
- Forbidden at creation: implementation plan (recorded at activation), notes, final summary.
- **HITL spec gate:** present description + acceptance criteria to the user, wait for
  explicit approval, record it as `--label spec-approved`, BEFORE moving the task In
  Progress. The claim gate refuses the transition without it.
- DoD defaults apply automatically from `backlog/config.yml` — do not pass
  `--no-dod-defaults` (blocked by enforce.ts).
- **Label vocabulary (closed, case-insensitive):** reserved tier is machinery-only
  (`spec-approved` `dispatched` `stuck` `merged` `housekeeping` `wayfinder:map`); general
  tier is hand-settable (`harness` `dogfood` `deferred`). Unknown labels refuse claim and
  block create/pre-commit. `harness`/`dogfood` apply only in the harness-dev repos
  (agents-harness, flightlead). Decision table, first match: `harness` when the task
  modifies bin/plugins/config/AGENTS.md/docs/architecture/stack-versions.json; `dogfood`
  when the deliverable is real work run through the harness as the verification subject;
  `deferred` when an explicit revive trigger is recorded; no match → no label.
- **Milestones:** agents never create milestones (human-owned; wayfinder skill owns map
  milestones at map setup). Assign on an empty milestone only — human-assigned milestones
  always win: version milestone for v1/v2 scope, the map's milestone for wayfinder map
  tasks, none otherwise; missing target warns and assigns none.

</CRITICAL_INSTRUCTION>
<!-- TASK-CREATION HARNESS DELTAS END -->
<!-- BACKLOG.MD GUIDELINES END -->
