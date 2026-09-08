---
date: 2026-08-30
topic: Tool boundaries — what each tool owns and where it sits in the loop model
status: draft
type: architecture
author: conductor
related_to:
  - ./README.md
  - ./loop-factory.md
  - ./backlog-lifecycle.md
  - ./test-guardrails.md
sources:
  - "TASK-15"
---

# Tool boundaries

Each tool owns exactly one responsibility (SRP). This table is the contract: a tool's
job is what its row says, and nothing else. Violations are architecture drift.

## The tools

| Tool | Owns | Does NOT own | Loop position |
|---|---|---|---|
| **backlog.md** | Work tracking + kanban only: task lifecycle (spec/plan/notes/ACs/final-summary), dependencies, milestones, board | The flow itself (brainstorm/plan/execute/verify stay with the three-phase model); no phase state machine | Queue feeding all phases |
| **enforce.ts** (plugin) | Enforcement hooks: write-block (no file writes on main), commit gate (frontmatter on research docs), dangerous-command denylist, backlog-lifecycle gate on main | State files (state-agnostic); never breaks a session (fail-open); never owns policy, only mechanical enforcement | HOW (inner loop guardrails) |
| **worktree-create.ts** | Create `.worktrees/<task-id>` on branch `task/<task-id>` + install the pre-commit hook; `--create` mode for new tasks | Implementation; merge decisions; the HITL gate | HOW (inner loop isolation) |
| **reviewer-loop.ts** | Cross-model adversarial plan/diff review dispatch (budget-capped, `--exclude` drops author's model) | The verdict itself (returns reviews); writes nothing to tasks | HOW (gate 3 pre-merge machine check) |
| **headroom** | Compression proxy on `127.0.0.1:8788` (cache mode), `/health`, `/stats`, stateless `/v1/compress` | Never spawns/restarts/configures itself via plugins; never touches `/v1/chat/completions` | Infrastructure (all traffic) |
| **opencode** | The session runtime: conductor + subagents execute the loops; plugins load; config routes through headroom | Task state (backlog owns it); architecture policy | The runtime all phases run inside |

## Where each tool sits in the loop model

See [diagrams/tool-boundaries.html](./diagrams/tool-boundaries.html) — the tools placed
on the WHY/WHAT/HOW phase flow (generated via the diagram-design skill).

- **backlog.md** — the queue: intake (WHAT) + state/evidence ledger (HOW). Conductor is the only writer.
- **enforce.ts** — HOW inner-loop guardrails: physical write-blocks and commit gates that cannot be talked out of.
- **worktree-create.ts** — HOW inner-loop isolation: one worktree per task, branch `task/<id>`, no commits on main.
- **reviewer-loop.ts** — HOW gate: machine review before the human merge gate.
- **headroom** — infrastructure layer: cost/compression, invisible to the loop model.
- **opencode** — the harness runtime: hosts the conductor, subagents, skills, plugins.

## SRP rule

Each tool has ONE responsibility. If a tool grows a second concern, that concern is
either deferred with a name (backlog entry + trigger) or moved to a new tool. See
`docs/research/2026-08-16-primitive-selection.md` for the selection decision tree.

## References

- Primitive selection: [docs/research/2026-08-16-primitive-selection.md](../research/2026-08-16-primitive-selection.md)
- Backlog boundary: [docs/research/2026-08-23-backlog-md-capability-audit.md](../research/2026-08-23-backlog-md-capability-audit.md)
