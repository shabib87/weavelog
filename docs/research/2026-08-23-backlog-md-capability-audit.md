---
date: 2026-08-23
topic: backlog.md capability audit vs harness usage
status: resolved
sources:
  - https://raw.githubusercontent.com/MrLesk/Backlog.md/main/README.md
  - https://raw.githubusercontent.com/MrLesk/Backlog.md/main/CLI-INSTRUCTIONS.md
  - https://raw.githubusercontent.com/MrLesk/Backlog.md/main/ADVANCED-CONFIG.md
  - https://github.com/MrLesk/Backlog.md/releases
  - "MCP resource listing: backlog://workflow/overview, task-creation, task-execution, task-finalization"
  - "MCP tool surface: backlog_task_*, backlog_milestone_*, backlog_document_*, backlog_definition_of_done_defaults_*, backlog_get_backlog_instructions"
models_used_for_research:
  - z-ai/glm-5.2
supersedes: none
last_verified: 2026-08-23
---

# backlog.md v1.50.1 — Full Capability Audit vs Harness Usage

## Context

The harness (AGENTS.md + opencode config) uses backlog.md as its task tracker. This note
audits backlog.md's full surface area (CLI + MCP + config) and compares it against the
harness's current usage to identify underutilized or missing capabilities.

**Pinned version:** 1.50.1 (stack-versions.json, updated 2026-08-16)
[Source: local stack-versions.json]

---

## A. MCP Server — VERDICT: partially utilized

### What the MCP server exposes

**Tools (20 total, verified from opencode MCP tool registration):**
- Tasks: task_create, task_edit, task_list, task_view, task_search, task_complete, task_archive
- Milestones: milestone_add, milestone_list, milestone_archive, milestone_remove, milestone_rename
- Documents: document_create, document_list, document_search, document_update, document_view
- Definition of Done: definition_of_done_defaults_get, definition_of_done_defaults_upsert
- Workflow: get_backlog_instructions (overview, task-creation, task-execution, task-finalization)

**Resources (4, verified via list_mcp_resources):**
- backlog://workflow/overview — "When to create tasks and the basic workflow"
- backlog://workflow/task-creation — "How to search, scope, and create tasks"
- backlog://workflow/task-execution — "How to plan, update, and work through tasks"
- backlog://workflow/task-finalization — "How to verify, summarize, and finish work"

**Resource templates:** none (empty list)

### CLI-only features NOT in MCP

The following CLI commands have no MCP tool equivalent:
[Source: CLI-INSTRUCTIONS.md vs MCP tool surface]

| CLI command | In MCP? | Notes |
|-------------|----------|-------|
| backlog decision create / decision list | NO | Decisions are CLI-only |
| backlog board (TUI) | NO | Interactive terminal UI |
| backlog browser (web UI) | NO | Launches local web server |
| backlog board export | NO | Markdown board export |
| backlog overview | NO | Project statistics TUI |
| backlog cleanup | NO | Archive old completed tasks |
| backlog draft create / draft promote | NO | Draft workflow |
| backlog task demote | NO | Demote task to draft |
| backlog config / config get / config set / config list | NO | Configuration management |
| backlog init | NO | Project initialization |
| backlog agents --update-instructions | NO | Updates CLAUDE.md/AGENTS.md/GEMINI.md/copilot-instructions.md |
| backlog completion install | NO | Shell tab completion |
| backlog search (unified) | NO | MCP has task_search and document_search but not unified search across tasks+docs+decisions |

### CLI vs MCP capability differences

The MCP server is a **subset** of the CLI. It covers the core task/milestone/document lifecycle
but omits: decisions, board/browser UIs, drafts, cleanup, config, init, completion, and the
unified search. The README confirms CLI is the recommended integration path; MCP is optional
("CLI instructions are the default AI setup. MCP remains supported for AI coding assistants
when you explicitly prefer an MCP connector.")
[Source: README.md MCP Integration section]

### Harness usage

The harness uses **both** MCP (opencode registered backlog server tools) and CLI
(referenced in AGENTS.md). This dual approach is valid — the README says "both operate on the
same Markdown task files."
[Source: README.md Working without AI agents section]

**Gap:** The harness does not use backlog search (unified fuzzy search), backlog decision,
backlog board export, backlog cleanup, or backlog overview — all CLI-only.

---

## B. Agent / AI Instructions — VERDICT: fully utilized

### What CLI-INSTRUCTIONS.md covers

The CLI-INSTRUCTIONS.md file is the full CLI reference covering:
- Project setup (init, config)
- Task management (create, edit, list, view, archive, dependencies, drafts)
- Milestone management (add, rename, remove, archive, due dates)
- Search (fuzzy, filters, modified-file lookup, JSON/plain output)
- Board operations (board, board export)
- Web interface (browser)
- Documentation (doc create, update, list, search, view)
- Decisions (decision create, decision list per v1.50.0)
- Agent instructions (instructions, agents --update-instructions)
- Maintenance (cleanup)
- Shell tab completion
- Stable JSON output contract (schemaVersion, kind, envelope shapes)
- Multi-line input patterns for AI agent sandboxes
[Source: CLI-INSTRUCTIONS.md — full document]

### Built-in agent interaction

backlog.md does NOT ship a built-in autonomous agent. It ships **instructions** — short
nudges embedded in AGENTS.md/CLAUDE.md that tell an external AI agent to run
backlog instructions overview and follow the spec-driven workflow:
1. Decompose idea into tasks (review checkpoint #1)
2. Work one task per session, one PR per task
3. Plan before coding (review checkpoint #2)
4. Implement and verify (review checkpoint #3)
[Source: README.md Working with AI agents section]

The agent interacts via CLI or MCP — both read/write the same markdown files.
The README explicitly says "Prefer Backlog.md commands (CLI/MCP/Web) over hand-editing
task files, so field types and metadata stay consistent."
[Source: README.md Working without AI agents section]

### Harness usage

The harness AGENTS.md embeds the backlog.md guidelines (version 1.50.1) and instructs
agents to run backlog instructions overview before every request, plus the detailed
guides before lifecycle actions. This matches the recommended pattern exactly.
[Source: local AGENTS.md lines 2-24]

---

## C. CLI Full Command Set — VERDICT: partially utilized

### Full command inventory

[Source: CLI-INSTRUCTIONS.md — all sections]

| Command | Exists? | Harness uses? |
|---------|----------|---------------|
| backlog init | Yes | N/A (already initialized) |
| backlog config / config get / config set / config list | Yes | No |
| backlog instructions (overview, task-creation, task-execution, task-finalization) | Yes | Yes |
| backlog task create | Yes | Yes |
| backlog task edit | Yes | Yes |
| backlog task list (-s, -a, --labels, --search, --limit, --json, --plain, --parent, --exclude-status) | Yes | Yes (task list, --json, --ready) |
| backlog task view / backlog task <id> (--json, --plain) | Yes | Yes |
| backlog task archive | Yes | No |
| backlog task complete | Yes | No (uses task edit --status Done) |
| backlog task demote | Yes | No |
| backlog task edit --dep (dependencies) | Yes | Yes (via MCP dependencies array) |
| backlog task edit --check-ac / --uncheck-ac / --remove-ac | Yes | Yes (via MCP acceptanceCriteriaCheck/Uncheck/Remove) |
| backlog task edit --check-dod / --uncheck-dod / --remove-dod | Yes | No |
| backlog task edit --comment / --comment-author | Yes | No |
| backlog task edit --notes / --append-notes | Yes | No |
| backlog task edit --plan / --append-plan | Yes | No |
| backlog task edit --final-summary / --append-final-summary / --clear-final-summary | Yes | No |
| backlog task edit --due-date / --clear-due-date | Yes | No |
| backlog task edit --ref / --doc / --modified-files | Yes | No |
| backlog task list --ready | Yes | Yes (via MCP ready: true) |
| backlog milestone add / rename / remove / archive / list | Yes | Yes (via MCP) |
| backlog decision create / list | Yes | No |
| backlog document create / update / list / search / view | Yes | No (MCP available, not used by harness) |
| backlog draft create / promote | Yes | No |
| backlog search (unified fuzzy) | Yes | No |
| backlog board / board export | Yes | Mentioned advisory only |
| backlog browser | Yes | Mentioned advisory only |
| backlog overview | Yes | No |
| backlog cleanup | Yes | No |
| backlog agents --update-instructions | Yes | No |
| backlog completion install | Yes | No |

### Dependency graph operations

Dependencies are managed via --dep flag on task create and task edit:
    backlog task edit 7 --dep task-1 --dep task-2
    backlog task create "Feature" --dep task-1,task-2

There is NO standalone backlog task dependency subcommand. Dependencies are an array
on the task. Readiness is checked via task list --ready (CLI) or ready: true
(MCP), which filters tasks whose dependencies are all satisfied/completed.
[Source: CLI-INSTRUCTIONS.md Dependency Management section]

**Automatic validation:** verifies that referenced dependency tasks exist. Completion
tracking shows which dependencies are blocking progress.
[Source: CLI-INSTRUCTIONS.md Dependency Features section]

### Harness usage

The harness uses --dep (via MCP dependencies array) and --ready filter. This covers
the core dependency lifecycle. However, it does not use --modified-files for traceability
(which files a task touched) or --due-date for time-boxed work.

---

## D. Custom Fields / Frontmatter — VERDICT: not utilized (no mechanism exists)

### Can custom frontmatter be added?

There is **no documented mechanism** for adding custom frontmatter fields to tasks. The
task schema is fixed by the CLI/MCP tool definitions. The JSON output contract exposes
specific fields only: id, title, status, type, priority, assignees, reporter, labels,
milestone, parentTaskId, acceptanceCriteriaCompleted, acceptanceCriteriaCount, ordinal,
createdAt, updatedAt, dueDate, path, description, dependencies, references,
documentation, modifiedFiles, subtasks, acceptanceCriteria, definitionOfDone,
implementationPlan, implementationNotes, comments, finalSummary.
[Source: CLI-INSTRUCTIONS.md Stable JSON output section]

### What happens to unknown fields?

The CLI-INSTRUCTIONS.md and ADVANCED-CONFIG.md do not document behavior for unknown
frontmatter fields. The README warns: "Prefer Backlog.md commands (CLI/MCP/Web) over
hand-editing task files, so field types and metadata stay consistent."
[Source: README.md Working without AI agents section]

Based on the schema validation mentioned in the AGENTS.md guidelines ("Never hand-edit
files under backlog/ — use the CLI so field types stay consistent"), unknown fields
would likely be ignored or dropped on the next CLI write, as the CLI serializes a
fixed schema. This was not verified by direct testing — it is inference from the
documented schema contract.

### Is there a way to extend the task schema?

**No.** The schema is fixed by the backlog.md tool. There is no plugin or extension
mechanism documented. The labels field is the closest thing to a freeform extension
point (arbitrary strings), and the harness already uses this for state tracking
(dispatched/stuck/merged).

**Harness implication:** if the harness needs custom metadata beyond what labels,
comments, and the fixed schema provide, it must use a sidecar mechanism (separate files,
or the references/documentation fields for URLs/paths). The task file itself cannot
carry arbitrary custom fields reliably.

---

## E. Statuses + Labels — VERDICT: fully utilized (labels) / partially utilized (statuses)

### Labels

Labels are **freeform strings** on tasks. They are set via:
    backlog task create "Feature" -l auth,backend
    backlog task edit 7 -l auth,backend

There is **NO backlog label command** — labels are not first-class entities with their
own management commands. They exist only as values on tasks. You can filter by labels:
    backlog task list --labels frontend,bug
[Source: CLI-INSTRUCTIONS.md Task Management section]

The harness uses labels for state tracking (dispatched/stuck/merged). This is the correct
use of labels as the freeform extension point.
[Source: local AGENTS.md, MCP tool labels param]

### Statuses

Statuses are **configurable** via the statuses config key:
    statuses: [To Do, In Progress, Done]  # default

Custom statuses can be configured:
    backlog config set statuses "Draft,To Do,In Progress,In Review,Done"

The MCP tool allows: Draft, To Do, In Progress, In Review, Done (enum).
The harness AGENTS.md mentions these statuses, suggesting they are configured.
[Source: ADVANCED-CONFIG.md Available Configuration Options; MCP tool status enum]

### Priorities

Priorities are also configurable:
    priorities: [High, Medium, Low]  # default
    # Custom:
    priorities: ["Very High", "High", "Medium", "Low", "Very Low"]
[Source: ADVANCED-CONFIG.md Priority Values section]

### onStatusChange callback

    onStatusChange: 'if [ "$NEW_STATUS" = "In Progress" ]; then claude "Task $TASK_ID ..." & fi'

Variables: $TASK_ID, $OLD_STATUS, $NEW_STATUS, $TASK_TITLE. Per-task override via
onStatusChange in task frontmatter.
[Source: ADVANCED-CONFIG.md Status Change Callbacks section]

**Harness gap:** onStatusChange is not used. It could trigger harness actions on
status transitions (e.g., dispatch a subagent when a task enters "In Progress").

---

## F. Decisions + Documents + Milestones — VERDICT: underutilized

### Decisions (backlog decision)

    backlog decision create "Use PostgreSQL for primary database"
    backlog decision create "Migrate to TypeScript" -s proposed
    backlog decision list  # added in v1.50.0

Decisions are markdown files in backlog/decisions/ with a title and status
(proposed or other). They are searchable via backlog search (type: decision).
[Source: CLI-INSTRUCTIONS.md Decisions section; v1.50.0 release notes — "backlog decision list
joins the CLI" (#871)]

**Decision data in JSON search results:** id, title, status, date.
[Source: CLI-INSTRUCTIONS.md Stable JSON output section]

**Could the harness use decisions for merge-gate decisions?** Yes — decisions are
first-class markdown artifacts that record architectural/design choices with a status.
A harness could create a "proposed" decision, review it, and mark it accepted/rejected.
However, the MCP server does NOT expose decision tools, so this would be CLI-only.

**Harness usage:** None. Decisions are not referenced in the harness plan.

### Documents (backlog doc)

    backlog doc create "API Guidelines"
    backlog doc create "Setup Guide" -p guides/setup
    backlog doc update doc-1 --content "Updated markdown" --title "New Title" -t guide --tags setup,runbook
    backlog doc list
    backlog doc search "architecture" --limit 5
    backlog doc view doc-1

Documents are markdown files in backlog/docs/ with a title, type
(readme, guide, specification, other), tags, and optional subdirectory path.
Document IDs are global across all subdirectories.
[Source: CLI-INSTRUCTIONS.md Documentation section]

**The MCP server DOES expose document tools:** document_create, document_list,
document_search, document_update, document_view. The harness MCP server has
these available but the harness does not use them.
[Source: MCP tool surface — verified from opencode tool registration]

**Could the harness use documents for task specs or review reports?** Yes — documents
support type: specification and arbitrary tags. A harness could write task specs as
backlog doc create "TASK-7 spec" -t specification -p specs and review reports as
backlog doc create "TASK-7 review" -t other -p reviews. These would be searchable
via backlog doc search and visible in the web UI.

**Harness usage:** None. The harness writes specs and plans to docs/spec/ and
docs/plans/ — a separate directory structure, not backlog/docs/.

### Milestones (backlog milestone)

    backlog milestone add "Release 1.0"
    backlog milestone rename "Release 1.0" "Release 2.0"
    backlog milestone remove "Release 1.0" --task-handling reassign --reassign-to "Release 2.0"
    backlog milestone archive m-1
    backlog milestone list --show-completed --plain

Milestones are managed through milestone files in backlog/milestones/. Tasks reference
a milestone via the milestone field. Milestones support due dates, descriptions, and
archiving.
[Source: CLI-INSTRUCTIONS.md Milestone Management section]

**The MCP server exposes milestone tools:** milestone_add, milestone_list,
milestone_archive, milestone_remove, milestone_rename.

**Could the harness use milestones for DAG phases?** Yes — milestones are the native
grouping mechanism. A multi-phase effort (research -> spec -> plan -> build -> verify)
could use milestones. Tasks assigned to each milestone would be visible in the board
grouped by milestone.

**Harness usage:** Partially. The harness mentions milestones for "multi-session efforts"
(wayfinder skill) but does not actively create or manage them in the current flow.

---

## G. Outer Harness Integration — VERDICT: fully utilized (integration pattern)

### How backlog.md expects to be used by an outer harness

backlog.md design philosophy is **spec-driven AI development** with three review
checkpoints:
1. Review the spec (task descriptions + acceptance criteria)
2. Review the plan (implementation plan in the task)
3. Review the code (one task = one PR)
[Source: README.md Why Backlog.md in the AI era; Working with AI agents section]

### Recommended integration pattern

**CLI instructions (recommended):** backlog.md writes a short nudge to AGENTS.md telling
agents to run backlog instructions overview. This is the default.
**MCP connector (optional):** auto-configures Claude Code, Codex, Gemini CLI, Kiro, or
Cursor. The server finds the active project from MCP roots.
[Source: README.md MCP Integration section; init wizard description]

### Does backlog.md own agent handle the task lifecycle?

**No.** backlog.md does NOT ship an autonomous agent. It ships instructions that tell
an external AI agent (Claude Code, Codex, Gemini CLI, Kiro, etc.) how to use the CLI/MCP
tools. The external agent is the driver; backlog.md is the data store and workflow guide.
[Source: README.md Working with AI agents — "AI agents write the code. You review the
tasks"]

### Harness integration

The harness follows the recommended pattern:
1. AGENTS.md embeds backlog.md guidelines (v1.50.1) — instructs agents to run
   backlog instructions overview before every request
2. MCP server is registered in opencode config (provides tools)
3. CLI is available for board/browser/decisions/cleanup
4. Task lifecycle is driven by the conductor (human + agent) using CLI/MCP tools
[Source: local AGENTS.md; opencode MCP tool registration]

**This is the correct integration pattern.** The harness is NOT underutilizing the
integration model — it uses both CLI and MCP as designed.

---

## H. Version 1.50.1 Specifics — VERDICT: current, no action needed

### v1.50.1 (released 2026-08-10) — hotfix

Hotfix for v1.50.0 performance regression. Key changes:
- CLI task commands (task view, task edit, task list) resolve from local working
  copy without loading cross-branch corpus or fetching remotes. Measured: task view
  4.4s->0.4s, task list 4.2s->0.2s, no-op task edit 12.2s->0.4s
- Cross-branch loading is now incremental and cached for web UI, board, MCP
- Remote fetches are coalesced, capped at 10 seconds, degrade gracefully offline
- CLI task reads are local-only by design (cross-branch tasks visible only in
  backlog browser)
- Parent/dependency validation is local and consistent
[Source: https://github.com/MrLesk/Backlog.md/releases/tag/v1.50.1]

### v1.50.0 (released 2026-08-09) — major

Key additions:
- Reworked TUI task composer
- **Dependency readiness in TUI and browser** — see at a glance whether a task is
  blocked or ready
- defaultAssignee honored on task creation across CLI, TUI, web, and MCP
- Concurrent edits fail fast instead of losing data
- backlog decision list added to CLI (#871)
- Empty value clearing: --dep "", --ref "", --doc "" clear the list
- --exclude-status filtering for task list and search
- User-defined priority values beyond high/medium/low
- Task types (bug, feature, enhancement, task, chore, docs, spike) supported end-to-end
[Source: https://github.com/MrLesk/Backlog.md/releases/tag/v1.50.0]

### Harness alignment

The harness is pinned to v1.50.1 (stack-versions.json, updated 2026-08-16). The
AGENTS.md guidelines match the v1.50.1 instruction version. No version drift.

---

## Summary: Underutilized Capabilities

Ranked by potential value to the harness:

### 1. backlog decision — CLI-only, not used
Decisions record architectural/design choices with a status (proposed/accepted/rejected).
The harness could use them for merge-gate decisions, architecture choices, or
cross-task design decisions. **Not exposed via MCP** — would require CLI calls.

### 2. backlog document — MCP available, not used
Documents are markdown files in backlog/docs/ with type, tags, and subdirectories.
The harness currently writes specs to docs/spec/ and plans to docs/plans/ — a
parallel structure. Could consolidate into backlog/docs/ for unified search and
web UI visibility. **Exposed via MCP** — no CLI required.

### 3. --modified-files — not used
Tasks can record project-root-relative modified file paths. backlog search
--modified-file src/path.ts finds which task touched a file. This would give the
harness file-to-task traceability without a sidecar manifest. Available via MCP
(modifiedFiles param on task_create/task_edit).

### 4. onStatusChange callback — not used
Shell command runs on status transitions. Could trigger harness automation: dispatch
a subagent when a task enters "In Progress", notify on "In Review", etc. Config-only,
not exposed via MCP.

### 5. --implementation-notes / --comments / --final-summary — not used
These are task fields for execution progress (implementationNotes), review
collaboration (comments with commentAuthor), and PR-ready completion notes
(finalSummary). The harness writes progress to chat output and plans to docs/plans/
instead of into the task itself. Available via MCP.

### 6. backlog board export — not used
Exports the kanban board to shareable markdown. Could be used for status snapshots
in PRs or release notes. CLI-only.

### 7. backlog cleanup — not used
Archives old completed tasks to clean the board. Not automated in the harness.

### 8. --due-date — not used
Tasks support UTC datetime due dates at minute precision. Could be used for
time-boxed spikes or SLA tracking. Available via MCP (dueDate not in current MCP
tool params — **unverified**, may require CLI).

### 9. --ordinal — not used
Manual task ordering for the board. Could be used to enforce DAG execution order
beyond dependencies alone. Available via MCP (ordinal param).

### 10. backlog search (unified) — not used
Fuzzy search across tasks, docs, AND decisions in one query. The harness uses
task_search (MCP) which only searches tasks, not the unified index.

---

## What the Harness Does NOT Need (correctly not used)

- backlog init — already initialized
- backlog config — config is set; no need for interactive wizard at runtime
- backlog completion install — developer convenience, not harness-relevant
- backlog agents --update-instructions — AGENTS.md is hand-maintained by the harness
- backlog draft workflow — the harness uses status transitions, not a separate draft
  lifecycle (Draft status is part of the standard status flow)

---

## Open Questions

1. **Does --due-date work via MCP?** The MCP task_create/task_edit tool schemas
   do not list dueDate as a parameter. It may be CLI-only. Not verified by direct test.
2. **What happens to unknown frontmatter on task edit?** Not documented. Inference:
   dropped on next CLI write, but not verified by round-trip test.
3. **Can onStatusChange be set per-task via MCP?** The MCP tool schemas do not expose
   onStatusChange. It may be config-only + frontmatter-only (hand-edit).
4. **Does backlog decision have an MCP equivalent in newer versions?** The v1.50.0
   release added decision list to the CLI but not to MCP. Not checked against v1.50.1
   source code.
