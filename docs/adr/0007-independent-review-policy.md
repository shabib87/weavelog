---
date: 2026-09-10
topic: Independent reviewer policy across host families
status: approved
type: adr
author: conductor
related_to:
  - ./0004-model-selection-benchmark-policy.md
  - ./0006-tiered-loop-commands.md
  - ../trd/model-routing.md
sources:
  - "TASK-56"
  - "TASK-79"
---

# Independent reviewer policy across host families

## Status

approved (2026-09-11) — human ratification recorded with the TASK-79 correction.

## Context

Maker/checker independence is a NORTH_STAR quality requirement. Earlier text mixed
two separate properties: a fresh reviewer context and a different model family. That
made locked-in subscription hosts appear to have a weaker review process.

## Decision

| Decision | Choice | Why |
|---|---|---|
| Maker/checker independence | Every review uses a fresh-context checker that did not make the artifact | No agent grades its own work |
| Cross-family review | A separate capability, required when a requested full review can obtain another family | It adds blind-spot diversity but is not the definition of independence |
| Unavailable family | Report the limitation, keep the receipt, and require an explicit human-selected alternative | A silent same-family substitution hides lost coverage |
| Locked-in hosts | Use an independent fresh same-provider checker when that is the human-selected alternative | Process independence remains intact; only cross-family diversity is unavailable |
| Open-weight preference | Treat open weights as a dated cost/quality judgment, not a non-negotiable | Model choice can change with evidence without weakening the quality bar |
| ADR-001 roster language | Treat ADR-001 §2.4 roster wording as superseded by ADR-004 and this record | The current reviewer policy must have one interpretation |
| ADR-004 retained decisions | Keep ADR-004's benchmark selection, escalation triggers, and drift governance unchanged | This ADR changes only the unavailable-cross-family fallback and its receipt requirement |

## Consequences

**Easier:**

- **Audit records** capture maker, checker context, family availability, alternative, and dissent.
- **Host support** keeps independent review when cross-family choice is unavailable.
- **Model choice** can change with evidence without changing the quality bar.

**Harder:**

- **Full reviews** state whether cross-family diversity was requested.
- **Fallbacks** require a human-selected receipt before a same-provider checker continues.
- **Cleanup scope** stays in TASK-56 and does not reopen this policy.
- **Supersession scope** changes ADR-004's host-mode scope and `model-routing.md`
  only for an unavailable cross-family review with an explicit human fallback; the
  normal cross-family rule remains.

## Alternatives considered

| Option | Verdict | Why |
|---|---|---|
| Treat same-provider review as silent full-review equivalence | rejected | It conceals the missing cross-family capability |
| Require another family for every review | rejected | Some supported hosts cannot provide one; that would remove independent review entirely |
| Independent context plus explicit capability reporting (this ADR) | chosen | Preserves the invariant and makes the limitation auditable |
| ADR-004 host-mode family rule | superseded by ADR-007 on ratification | Its same-provider substitute did not require an explicit human fallback receipt |

## Alignment

| Decision | Anchor |
|---|---|
| Fresh maker/checker split | NORTH_STAR quality bar |
| Receipts and explicit limitation | NORTH_STAR evidence-over-claims principle |
| Host composition | ROADMAP host ladder |

## Ratification record

The human ratified this ADR on 2026-09-11. ADR-004's frontmatter, Status section,
and index entry changed together to `superseded`. This record is its reciprocal
successor for the host-mode unavailable-cross-family fallback; benchmark selection,
escalation triggers, and drift governance are carried forward by reference here.

## References

- TASK-56 reviewer-policy scope
- ADR-004 model-selection policy
- ADR-006 full deliberation review
