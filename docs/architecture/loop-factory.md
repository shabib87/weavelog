---
date: 2026-08-30
topic: Loop factory model — three phases x two loop roles
status: draft
type: architecture
author: conductor
related_to:
  - ./README.md
  - ./tool-boundaries.md
  - ./backlog-lifecycle.md
  - ./test-guardrails.md
  - ./adr/README.md
sources:
  - "TASK-15"
  - "TASK-22 (consensus restoration)"
  - "git commit 6366cc0^ (3-reviewer consensus block)"
---

# Loop factory model — three phases × two loop roles

## Model (canonical, per 3-reviewer consensus)

The harness is a light factory: three **phases** work passes through, two **loop roles**
repeat, one queue feeds it, and two human gates hold the boundaries.

### Phases (progress — they do NOT repeat)

| Phase | Output | Control character | Human |
|---|---|---|---|
| WHY (research → understanding) | `docs/research/` (why) | divergent | INSIDE |
| WHAT (spec) | `docs/spec/` (what) | divergent, continuous dialogue | INSIDE |
| HOW (plan → build → verify) | `docs/plans/` (how) → code → evidence | convergent | at the two gates only |

WHY is the research half of WHAT (intake → research → dialogue → prototype → spec),
sharing its divergent, human-inside control character — **not a separate loop**. Phases
progress; nothing re-triggers research.

### Loop roles (repeat)

- **Inner loop** — agent execution cycle: investigate → implement → verify → repeat. The model does this, bounded by caps, isolated by worktrees, checked by gates.
- **Outer loop** — human decision ownership: decide → verify → approve → carry consequences. The human does this.

Inner/outer is **ONE boundary across all phases, not 3 separate inner/outer pairs**.
The boundary between inner and outer is **EVIDENCE**.

### Gates (two, both in HOW)

1. **Plan approval** — after plan review, before implementation.
2. **Merge approval** — after code review (diff-reviewer verdict), before merge.

WHAT uses continuous dialogue, not a gate.

## Diagram

See [diagrams/loop-factory.html](./diagrams/loop-factory.html) — generated via the
diagram-design skill (architecture type).

## EARS acceptance criteria

- WHEN the loop-factory model is documented THEN WHY/WHAT/HOW are named as phases (not loops) and inner/outer is named as ONE boundary across all phases.
- WHEN a phase is described THEN it is clear that phases progress and do not repeat.
- WHEN the gates are described THEN exactly two formal gates exist, both in HOW (plan approval, merge approval).
- WHEN WHY is described THEN it is the research half of WHAT, not a separate loop.
- WHEN the boundary is described THEN it is stated that inner/outer is ONE continuous boundary across all phases, with EVIDENCE as the separator.

## References

- Consensus source: `git commit 6366cc0^` (restored by TASK-22)
- Vocabulary: [docs/research/2026-08-15-inner-harness-vocabulary.md](../research/2026-08-15-inner-harness-vocabulary.md)
- Light-factory plan: [docs/plans/2026-08-16-light-factory-plan.md](../plans/2026-08-16-light-factory-plan.md)
- Addy Osmani loop engineering: [docs/research/2026-08-15-addy-loop-engineering-series.md](../research/2026-08-15-addy-loop-engineering-series.md)
