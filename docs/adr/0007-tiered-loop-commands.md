---
date: 2026-09-07
topic: Tiered loop commands with a weaver persona replace the always-on conductor protocol
status: in-review
type: adr
author: conductor
related_to:
  - ../trd/loop-factory.md
  - ./0003-three-phase-loop-model.md
  - ./0004-model-selection-benchmark-policy.md
  - ./0005-artifact-flow.md
  - ../research/2026-09-07-loop-taxonomy-research.md
sources:
  - "TASK-79"
  - "TASK-6"
  - "TASK-57"
  - "TASK-58"
  - "TASK-28"
  - "TASK-29"
  - "TASK-30"
---

# Tiered loop commands with a weaver persona replace the always-on conductor protocol

## Status

in-review — human ratification pending, presented via difit 2026-09-07. Fired at the
ADR-003 decision gate by the TASK-79 research note.

## Context

The conductor protocol lives in always-on user-level `payload/AGENTS.md` and forces full
orchestration on every session of every project — a one-rung ladder. The TASK-79 research
(`docs/research/2026-09-07-loop-taxonomy-research.md`, two research passes, four reviewer
rounds) established:

- The four-rung autonomy ladder (turn-based / goal-based / time-based / proactive —
  Anthropic 2026-06-30, one origin cluster per arXiv 2608.21884) is vocabulary, not settled
  consensus; the count of commands should follow the count of hand-offs actually delegated.
- Thin always-on context is evidence-backed (AGENTbench Feb 2026; 60–100-line budgets);
  loop behavior belongs in on-demand skills + deterministic triggers, not prose.
- The repo already specifies the budget machinery (TASK-6 three caps + no-progress via
  `session.diff`; `KEEL_MAX_*` named outcomes; `reviewer-loop.ts --budget-usd`).
- Nothing ships wrong-tier detection in any major harness — greenfield.
- Naming: `weave` is the ratified composition principle (TASK-58); the ecosystem shows
  persona+command duality works (Ralph) and collisions hurt (Puck ×3).

The planned-but-never-ratified **ADR-006** (conductor-dispatch) is absorbed here: its
subject — subagents return findings, the conductor writes state — is an explicit Decision
row below. No human ever ratified a standalone 0006 record; the index row is annotated
accordingly.

## Decision

| Decision | Choice | Why |
|---|---|---|
| Loop surface | Four user-invocable loop commands — **stitch** (turn-based small run), **weave** (goal-based full flow), **loom** (nested goal-based backlog queue), **pulse** (time-based, proactive-guarded) | Each maps to one primary hand-off; one loom-vocabulary metaphor; no shipped-harness collisions; rungs nest (loom = N weaves) |
| Orchestrator persona | **weaver** — the persona that runs weave/loom; the current conductor, personified | On-brand per the TASK-58 rationale ("weave is the composition principle"); zero in-repo collision; TASK-57-style availability check gates at PRD |
| HITL model | **Two gates preserved** — spec gate (claim-time, `spec-approved`) + merge gate; `pulse` never runs unattended past them | NORTH_STAR non-negotiable ("HITL is baked in"); `docs/trd/loop-factory.md:63` two-gates rule |
| Dispatch model | **Subagents return findings; the weaver alone writes shared state** (backlog, docs, commits) | Absorbs the planned-but-never-ratified ADR-006; matches ADR-005 artifact flow and one-writer discipline (TASK-79 practice: scout/researchers read-only) |
| Loop behavior location | **Skills + CLI triggers + hooks** — never always-on AGENTS.md; `payload/AGENTS.md` slims to the user-level contract + a routing line ("smallest loop that finishes the task") | Primitive-selection axes; thin-context evidence; project scaffold stays separate (TASK-28/29/30) |
| Budgets + tier-fit checker | **One deterministic module** — extends TASK-6 + the budget-caps design + `risk-signals.ts`; inform (80%) → alert → soft-stop (100%) at iteration boundaries; never auto-migrate tiers unattended | Extends in-repo machinery rather than re-specifying; wrong-tier detection is greenfield; ADR-004 philosophy: deterministic signals on the merged diff, never LLM judgment |

## Consequences

**Easier:**
- Small tasks take the smallest loop; orchestration cost scales with verified need.
- Loop definitions are committed files — a differentiator (arXiv 2608.21884: configs rarely committed).
- Verification cost bounds delegation explicitly via the budget tuple.
- One naming metaphor covers persona and commands.

**Harder:**
- Four command surfaces to document, scaffold, and teach.
- opencode plugin-SDK lifecycle-hook expressibility must be verified before `weave`'s evaluator-loop mechanics ship.
- The `weaver` name must pass a TASK-57-style availability check (npm/GitHub/domain/trademark) at PRD.
- User-level and project-level AGENTS.md diverge — config-sync must handle both layers.

## Alternatives considered

| Option | Verdict | Why rejected |
|---|---|---|
| Conductor-always-on (status quo) | rejected — forces orchestration cost on every task; contradicts thin-context evidence (AGENTbench Feb 2026) | |
| Adopt `/loop`/`/goal` names verbatim | rejected — semantics diverge per harness (session- vs thread-scoped); documented collision bugs (Claude #54633 et al.) | |
| Two-tier surface (`run`/`weave` only) | rejected — no queue loop (Ralph pattern) or trigger loop; commands must follow hand-offs, and we delegate three plus a trigger | |
| Five-plus tiers incl. unattended proactive | rejected — NORTH_STAR forbids fully unattended runs; `pulse` holds the proactive rung at the gates | |
| LLM-judged tier-fit checker | rejected — ADR-004 mandate: deterministic signals computed on the merged diff, never self-report or LLM judgment | |
| Persona-only or commands-only naming | rejected — ecosystem precedent (Ralph = technique AND persona) shows the duality works; the weaver carries the factory metaphor | |

## Alignment

| Decision | Anchor |
|---|---|
| Two HITL gates preserved | NORTH_STAR non-negotiable (HITL baked in); `docs/trd/loop-factory.md:63` |
| Deterministic budgets/checker | NORTH_STAR verification-woven principle; ADR-004 deterministic-trigger philosophy |
| Skills + CLI triggers, slim AGENTS.md | PRODUCT self-contained-workspace framing; TASK-28/29/30 two-level CLI scope |
| Budget tuple extends TASK-6 | ROADMAP v1 factory-loop chain (TASK-5..10) |

## References

- Research basis: [docs/research/2026-09-07-loop-taxonomy-research.md](../research/2026-09-07-loop-taxonomy-research.md) (TASK-79)
- Budget machinery: TASK-6; `docs/research/2026-09-03-budget-caps-checkpoint-resume.md`
- Format contract: [docs/adr/README.md](./README.md); ADR-004 is the reference implementation
- Authoring rules: [docs/AGENTS.md](../AGENTS.md)
