---
date: 2026-09-07
topic: Three-phase loop model (WHY/WHAT/HOW) with a decision-recording gate
status: in-review
type: adr
author: conductor
related_to:
  - ./README.md
  - ./0005-artifact-flow.md
  - ./0004-model-selection-benchmark-policy.md
  - ../trd/loop-factory.md
  - ../trd/backlog-lifecycle.md
  - ../trd/backlog-lifecycle.md
sources:
  - "TASK-15"
  - "TASK-76"
---

# Three-Phase Loop Model with a Decision-Recording Gate

## Status

in-review (2026-09-07) — content restored from the 3-reviewer consensus
(`loop-factory.md`, TASK-15); the decision-recording gate is new, added on
human direction this session.

## Context

- The harness is a loop factory: work passes through phases, roles repeat,
  and two human gates hold the boundaries. The canonical model was restored
  by a 3-reviewer consensus (loop-factory.md, TASK-15) but was never
  formalized as an ADR.
- The phase flow produced **research without decisions**: 52 research notes
  existed in `docs/research/` while the ADR index held zero live records
  until 2026-09-07. Real choices (implementation language, model roster,
  routing surface) lived in task notes and prose.
- Root cause: the WHY phase ended with a research note and no explicit
  answer to "did this research conclude a hard-to-reverse choice?"

## Decision

| Decision | Choice | Why |
|---|---|---|
| Phase model | **Three phases — WHY (research), WHAT (spec), HOW (plan → build → verify)** — that progress and never repeat | WHY is the research half of WHAT (divergent, human-inside), not a separate loop (3-reviewer consensus) |
| Loop roles | **Inner loop** (agent: investigate → implement → verify) and **outer loop** (human: decide → verify → approve) — **ONE boundary across all phases**, separator = **evidence** | Not three separate inner/outer pairs; the boundary is evidence, per consensus |
| Gates | **Exactly two, both in HOW**: plan approval, merge approval. WHAT uses continuous dialogue, not a gate | Gates sit where consequences become irreversible |
| Decision-recording gate (new) | **WHY ends with an explicit decision outcome**: a hard-to-reverse choice → write a small ADR before WHAT proceeds; no choice → record "research only, no decision" in the note | Closes the research-without-decision gap; research is the backbone, the ADR is the decision |

### The decision-recording gate (rule)

At the end of every WHY phase (and at any research pause inside WHAT), the
conductor answers exactly one question:

> **Did this work produce a hard-to-reverse choice?**

- **Yes** → write a small ADR (format contract applies; incremental on
  trigger — this gate IS the trigger) before the next phase starts.
- **No** → the research note ends with the line `Decision: none — research
  only`, so the absence of a decision is explicit, never silent.

Consequences: WHAT and HOW never re-litigate a settled choice without a new
WHY pass; and no settled choice hides inside prose.

## Consequences

**Easier:**

- Decisions become findable: one ADR per hard-to-reverse choice, indexed.
- Research stays divergent and cheap — it never has to double as a decision
  record.
- New sessions inherit decisions instead of re-deriving them from prose.
- Phase progress is auditable: every WHY ends in ADR or an explicit
  "no decision".

**Harder:**

- Every WHY phase carries one extra output obligation (ADR or the explicit
  none-line).
- ADR discipline requires judgment: choosing "hard-to-reverse" correctly is
  a human-checked call at the gate.
- The ADR index becomes a maintenance surface (statuses must move from
  in-review to approved).

## Alternatives considered (provenance)

| Option | Verdict | Why rejected |
|---|---|---|
| Separate inner/outer loop pair per phase | rejected | consensus restored ONE boundary across all phases; three pairs re-fragment human ownership |
| Formal gates in every phase (including WHAT) | rejected | WHAT is divergent dialogue; gating it kills the spec conversation. Two gates, both in HOW |
| No decision gate (status quo ante) | rejected | evidence: 52 research notes, zero ADRs — decisions evaporated into prose |
| One ADR per research note | rejected | manufactures records without triggers; violates incremental-on-trigger. ADRs only on hard-to-reverse choices |
| Three-phase model with decision gate (this ADR) | chosen | matches the consensus model and closes the decision-recording gap |

## Alignment (NORTH_STAR / PRODUCT / ROADMAP traceability)

| Decision | Anchor |
|---|---|
| Human owns decisions; agent executes | NORTH_STAR: the human directs AND verifies; outer loop = human |
| Evidence as the inner/outer separator | NORTH_STAR: evidence over claims; every gate produces a receipt |
| Two gates in HOW | NORTH_STAR: plan gate before implementation, merge gate before code lands |
| Decision-recording gate | NORTH_STAR: zero silent failure — an unrecorded decision is silent failure; ROADMAP: every rung traces to a non-negotiable |
| Phases progress, never repeat | PRODUCT: spec → implement → verify → document workflow |
