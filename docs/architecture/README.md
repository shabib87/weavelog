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
  - ./adr/README.md
  - ../AUTHORING.md
  - ../research/README.md
  - ../plans/2026-08-16-light-factory-plan.md
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
| [adr/README.md](./adr/README.md) | adr | ADR index + Nygard template (ADR-001..N, added incrementally) |
| [diagrams/](./diagrams/) | architecture | Generated diagrams (HTML) |

## Related indexes

- **Research** (why evidence): [docs/research/README.md](../research/README.md)
- **Plans** (how): [docs/plans/](../plans/)
- **Specs** (what): [docs/spec/](../spec/)
- **Runbook** (operations): [AGENT-STACK-RUNBOOK.md](../../AGENT-STACK-RUNBOOK.md)

## Authoring rules

Docs in this directory follow the architecture frontmatter schema (date, topic, status,
type, author, related_to, sources). See [AUTHORING.md](../../AUTHORING.md) for the
full rules and the ADR template.

## Skills

- **diagram-design** — generates architecture diagrams (HTML) as used for the
  loop-factory diagram in [diagrams/](./diagrams/). Skill hub: `~/.agents/skills/diagram-design`.
- **tldraw-offline** — operates the tldraw offline canvas app (`.tldraw`/`.tldr` files)
  for hand-editing or linting diagrams. Skill hub: `~/.agents/skills/tldraw-offline`.
