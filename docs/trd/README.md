---
date: 2026-08-30
topic: Architecture documentation navigation map
status: draft
type: architecture
author: conductor
related_to:
  - ./loop-factory.md
  - ./tool-boundaries.md
  - ./backlog-lifecycle.md
  - ./test-guardrails.md
  - ../adr/README.md
  - ../AGENTS.md
  - ../research/README.md
  - headroom-proxy.md
  - model-routing.md
  - runbook-decomposition.md
sources:
  - "TASK-15"
---

# Architecture — navigation map

The front door for both agents and humans. This directory holds **what the system is
and why it is structured this way** (architecture). Operational procedure lives in the
runbook (`~/.agents/AGENT-STACK-RUNBOOK.md`), not here.

## The one-page model

The harness runs **three phases × two loop roles** on a single queue with two human gates:

- **Phases (progress, do not repeat):** WHY (research → understanding), WHAT (spec), HOW (plan → build → verify)
- **Loop roles (repeat):** inner = agent execution cycle (investigate → implement → verify → repeat); outer = human decision ownership (decide → verify → approve → carry consequences). ONE boundary across all phases — the boundary is EVIDENCE.
- **Gates:** plan approval + merge approval, both in HOW. WHAT uses dialogue, not a gate.

See [loop-factory.md](./loop-factory.md) for the full model, diagram, and EARS acceptance criteria.

## Document index

| Doc | Type | What it covers |
|---|---|---|
| [loop-factory.md](./loop-factory.md) | architecture | The 3-phase × 2-role model, inner/outer boundary, gates, diagram |
| [tool-boundaries.md](./tool-boundaries.md) | architecture | What each tool owns (backlog.md, enforce.ts, worktree-create.ts, reviewer-loop.ts, headroom, opencode) and its SRP |
| [backlog-lifecycle.md](./backlog-lifecycle.md) | architecture | Conductor flow → backlog.md field mapping, three review checkpoints, deferrals |
| [test-guardrails.md](./test-guardrails.md) | architecture | TDD ordering, EARS ACs, RED/GREEN split, reviewer checklist, verify-gate |
| [model-routing.md](./model-routing.md) | architecture | Roster/roles, escalation ladder wiring (ADR-004 companion) |
| [worktree-discipline.md](./worktree-discipline.md) | architecture | Worktree flow, HITL merge gate, crash contract |
| [headroom-proxy.md](./headroom-proxy.md) | architecture | Proxy stack utilization |
| [runbook-decomposition.md](./runbook-decomposition.md) | architecture | Runbook section map (post-decomposition index) |
| [2026-06-28-weavelog-design.md](./2026-06-28-weavelog-design.md) | founding TRD | Full original architecture design (ETCSLV, isolation, budgets, rollback) |
| [adr/README.md](../adr/README.md) | adr | ADR index + Nygard template (ADR-001..N, added incrementally) |
| [diagrams/](./diagrams/) | architecture | Generated diagrams (HTML) |

## Related indexes

- **Research** (why evidence): [docs/research/README.md](../research/README.md)
- **Ratified briefs** (what): [docs/prd/](../prd/) — PRD index with backlog-milestone cross-references
- **Plans**: historical — `docs/archive/plans/`; task planning lives in backlog tasks
- **Runbook** (operations): `~/.agents/AGENT-STACK-RUNBOOK.md` (personal instance, outside the repo — see note above)

## Authoring rules

Docs in this directory follow the architecture frontmatter schema (date, topic, status,
type, author, related_to, sources). See [docs/AGENTS.md](../AGENTS.md) for the
full rules and the ADR template.

## Skills

- **diagram-design** — generates architecture diagrams (HTML) as used for the
  loop-factory diagram in [diagrams/](./diagrams/). Skill hub: `~/.agents/skills/diagram-design`.
- **tldraw-offline** — operates the tldraw offline canvas app (`.tldraw`/`.tldr` files)
  for hand-editing or linting diagrams. Skill hub: `~/.agents/skills/tldraw-offline`.
