---
date: 2026-09-07
topic: Artifact flow — PRD, TRD, ADR, TASK (doc classes and traceability)
status: in-review
type: adr
author: conductor
related_to:
  - ./README.md
  - ./0003-three-phase-loop-model.md
  - ./0004-model-selection-benchmark-policy.md
  - ./0001-weavelog-architecture-decisions.md
  - ../AGENTS.md
  - ../trd/backlog-lifecycle.md
  - ../trd/backlog-lifecycle.md
sources:
  - "TASK-76"
---

# Artifact Flow: idea → PRD → TRD → milestone ↔ PRD → TASK (ADR cross-cutting)

## Status

in-review (2026-09-07) — human-directed governance decision; **partially
supersedes** the doc-chain collapse recorded in
`docs/research/2026-07-04-harness-setup-and-pmf-synthesis.md` §7.
Amended 2026-09-07 (plan review, DeepSeek + Qwen APPROVE-WITH-CHANGES): the
class homes are now **physical** — `docs/prd/`, `docs/trd/`, `docs/adr/` —
and the founding TRD clause is rewritten below (it no longer "remains in
specs/").

Amended 2026-09-07 (second directive, requirements-engineering discipline):
- **The flow** (human-directed, reviewer-corrected): idea → PRD
  (requirements are a section INSIDE the PRD — a separate requirements class
  re-creates the BRD ceremony rejected in research §7) → TRD → milestone ↔
  PRD (bidirectional, see below) → TASK. ADR is NOT a pipeline stage: it
  fires cross-cutting whenever a hard-to-reverse choice appears (the
  ADR-003 decision gate), at any stage.
- **Every milestone links a PRD and every PRD links milestones** — a
  milestone or PRD cannot exist without the other. Machine-checked:
  `frontmatter-check` requires `type: prd` frontmatter to carry a
  non-empty `milestones:` list resolving to real milestone files;
  `task-validate --milestones` requires every milestone file to carry a
  `PRD anchor:` line resolving to a brief that lists it back.
- **Pre-brief-era milestones are backfilled, honestly**: briefs for m-0..m-4
  carry `status: backfilled` and cite the research notes that recorded the
  in-thread decisions — they are records of ratifications that happened,
  not retroactive ratifications. Open milestones (m-5, m-6) got real draft
  briefs pending human ratification.
- **The v0.1.0 brief's byte-identity protection is re-ratified away** by the
  human (2026-09-07): it now carries frontmatter and its internal paths are
  repaired. TASK-56's byte-identity constraint is updated accordingly.
- **0-drift scoping** (per the no-false-enforcement rule): LINKAGE is
  machine-enforced (existence + bidirectional resolution); flow order and
  content quality are review-enforced.

## Context

The 2026-07-04 doc-chain decision collapsed BRD/PRD/TRD into existing docs
(BRD = NORTH_STAR, PRD = ROADMAP, TRD = adr + specs) — correct at the time:
no milestone brief existed and ROADMAP was pending. Since then the situation
changed on the ground:

- A **ratified v0.1.0 draft brief** now lives in `docs/prd/` and is
  load-bearing — the ROADMAP drift rule requires it as the ratified scope
  anchor for every 0.1.0 decision.
- The ADR corpus came alive (003, 004) and needs a defined relationship to
  the docs it governs.
- Backlog tasks carry acceptance criteria, but nothing required those ACs to
  trace to a design or decision — tasks could not be audited upward.
- The three-phase model (ADR-003) gave WHY an explicit decision outcome, but
  did not say where the decision's *artifact* lands.

A July-style blanket collapse no longer matches reality; reintroducing
PRD/TRD classes without a record would violate this repo's own ADR-003 gate
(flagged by DeepSeek V4 Pro and Qwen3.8-2.4T reviews, 2026-09-07).

## Decision

| Decision | Choice | Why |
|---|---|---|
| **PRD** (product requirements) | Ratified **milestone briefs** in `docs/prd/` (e.g. the v0.1.0 draft brief) — goal, in/out of scope, success criteria, milestone mapping | The release scope of record; created and ratified by the human at milestone kickoff; **archives when the milestone ships** |
| **TRD** (technical design) | `docs/trd/` — the 2026-06-28 founding spec plus loop-factory, headroom-proxy, model-routing, tool-boundaries, test-guardrails, worktree-discipline, backlog-lifecycle, runbook-decomposition; diagrams in `docs/trd/diagrams/` | TRDs are living and **changed only via ADRs** — never edited around a decision |
| **ADR** | `docs/adr/` (top level, out of the TRD corpus) — one hard-to-reverse decision per record, per the format contract | Immutable once approved; superseded, never rewritten |
| **TASK** | Backlog item whose **acceptance criteria must cite the TRD section or ADR constraint they implement** | Upward traceability: a task that traces to nothing is a YAGNI violation and is rejected at the plan gate |
| **BRD** | **Stays collapsed** into `NORTH_STAR.md` + PRODUCT.md | Still no separate business-requirements artifact — YAGNI holds |

Authority direction: PRD > TRD > TASK on *what*; ADRs amend any level but
only through a human gate; a research note never changes the TRD directly —
it ends at the ADR-003 decision gate.

Full flow rules live in `docs/AGENTS.md` ("Artifact flow" section).


## Consequences

**Easier:**

- Every artifact class has one home, one schema, one lifecycle.
- Task ACs become auditable upward: TRD section or ADR constraint, or the
  task is rejected.
- Milestone briefs get a defined death (archive on ship) instead of
  accumulating.

**Harder:**

- Milestone briefs are a new writing obligation at kickoff (human-owned).
- TRD edits now require an ADR first — no quick architectural edits.
- Traceability must be checked at the plan gate (review-enforced).

## Alternatives considered (provenance)

| Option | Verdict | Why rejected |
|---|---|---|
| BRD/PRD/TRD collapsed (2026-07-04 §7) | superseded by this ADR | correct when no milestone brief existed; the ratified v0.1.0 brief and the live ADR corpus made the collapse the source of the "research without decisions" gap. BRD stays collapsed |
| Full enterprise chain (BRD + PRD + TRD + spec + task as separate files) | rejected | enterprise ceremony violating YAGNI — the original §7 objection still stands; we adopt only the two classes with live consumers |
| Keep PRD/TRD implicit in prose | rejected | the exact gap this ADR closes: decisions and traceability rules existed nowhere an agent reads |
| Split ADR-001 instead of introducing doc classes | rejected | ADR-001's bundled decisions needed routing, not new classes; resolved separately by its traceability table |

## Alignment (NORTH_STAR / PRODUCT / ROADMAP traceability)

| Decision | Anchor |
|---|---|
| PRD ratified by human at kickoff | NORTH_STAR: the human directs and verifies |
| TRD changed only via ADR | NORTH_STAR: plan gate before implementation, merge gate before code lands |
| TASK AC traceability rule | NORTH_STAR: evidence over claims — an untraceable task claims without evidence |
| No BRD artifact | NORTH_STAR: minimal required tooling; YAGNI |
| Brief archives on ship | ROADMAP: v0.1.0 draft brief is the ratified scope anchor |
