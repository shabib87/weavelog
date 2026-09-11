---
date: 2026-09-07
topic: Tiered loop commands with a weaver persona replace the always-on conductor protocol
status: in-review
type: adr
author: conductor
related_to:
  - ../trd/backlog-lifecycle.md
  - ../trd/loop-factory.md
  - ../trd/worktree-discipline.md
  - ./0003-three-phase-loop-model.md
  - ./0004-model-selection-benchmark-policy.md
  - ./0005-artifact-flow.md
  - ../research/2026-09-07-loop-taxonomy-research.md
  - ../research/2026-09-10-pre-build-deliberation-loop.md
  - ../research/2026-09-03-budget-caps-checkpoint-resume.md
sources:
  - "TASK-79"
  - "TASK-6"
  - "TASK-57"
  - "TASK-58"
  - "TASK-28"
  - "TASK-29"
  - "TASK-30"
  - "TASK-51"
---

# Tiered loop commands with a weaver persona replace the always-on conductor protocol

## Status

in-review — human ratification pending, presented via difit 2026-09-07. Fired at the
ADR-003 decision gate by the TASK-79 research note.

*(Revised 2026-09-10: added the pre-build deliberation sub-loop (warp) — the named
thinking half with the red-blue-white protocol and light/full tiers; research basis
`docs/research/2026-09-10-pre-build-deliberation-loop.md`. Human-approved design fork
recorded on TASK-79.)*

## Context

The conductor protocol lives in always-on user-level `payload/AGENTS.md` and forces full
orchestration on every session of every project — a one-rung ladder. The TASK-79 research
(`docs/research/2026-09-07-loop-taxonomy-research.md`, two research passes; seven
reviewer verdicts across four models) established:

- Agent jobs sort into four kinds, from least to most self-directed: turn-based
  (do one step now), goal-based (finish a whole job), time-based (run on a schedule),
  proactive (start by itself when something happens). That four-kind split comes from
  one Anthropic write-up (2026-06-30) — it is a shared naming tool, not a proven
  industry standard (research §2). So weavelog does not copy the labels blindly; it
  ships exactly one command per hand-off you actually delegate, and no more.
- Thin always-on context is evidence-backed — AGENTbench Feb 2026 (via an undated
  secondary report; practical 60–100-line budgets are undated practitioner guidance, not
  AGENTbench evidence); loop behavior belongs in on-demand skills + deterministic
  triggers, not prose (research §3, gap-mapped in §4).
- The repo already specifies the budget machinery — TASK-6 three caps + no-progress via
  `session.diff`; named-outcome budget caps; `reviewer-loop.ts --budget-usd` (research §5.1).
- Nothing ships wrong-tier detection in any major harness — greenfield (research §3; the checker design is §5.2).
- Naming: `weave` is the ratified composition principle (TASK-58); precedent supports
  persona+command coexistence (Ralph); collisions hurt (documented plugin-shadowing
  incidents, e.g. Claude #54633) (research §3).
- The pre-build thinking phase is named and tiered across peer harnesses as of Sept
  2026 — "plan mode" is the convergent name (~10 harnesses; maximal collision hazard),
  spec pipelines ship it as commands, and light-vs-full paths are established practice
  — but no first-party harness ships a named cross-family adversarial pre-build
  deliberation loop (2026 third-party niche only:
  `docs/research/2026-09-10-pre-build-deliberation-loop.md`).

The planned-but-never-written conductor-dispatch ADR — announced in research as
"ADR-006" — is absorbed here as the Dispatch-model row below. No standalone record was
ever ratified; this ADR takes the 006 number (index row annotated accordingly).

## Decision

| Decision | Choice | Why |
|---|---|---|
| Loop surface | Four commands — **stitch** (turn-based small run), **weave** (goal-based full flow), **loom** (nested goal-based queue), **pulse** (time-based, proactive-guarded trigger) | One hand-off each; loom metaphor; rungs nest (loom = N weaves); semantics per research §5 |
| Orchestrator persona | **weaver** — runs weave/loom; the current conductor, personified | TASK-58: "Weave is the composition principle"; availability check gates at PRD |
| HITL model | **Two gates preserved** — plan gate (before implementation, per ADR-003) + merge gate; `pulse` never runs unattended past them | NORTH_STAR :38/:63-64; ADR-003 Gates row — unchanged by this ADR; see Gate placement below |
| Dispatch model | **Subagents return findings; the weaver alone writes shared state** (backlog, docs, commits) | absorbs the never-written conductor-dispatch ADR; ADR-005 artifact flow; one-writer discipline |
| Loop behavior location | **Skills + CLI triggers + hooks** — never always-on AGENTS.md; `payload/AGENTS.md` slims to the user-level contract + a routing line | thin-context evidence (research §3); project scaffold stays separate (TASK-28/29/30) |
| Budgets + tier-fit checker | **One deterministic module** — the 80% → 100% budget ladder, evaluated only at iteration boundaries; never auto-migrate tiers unattended | see Budget mechanics below |
| Pre-build deliberation | **Named sub-loop (`warp`), not a command** — red-blue-white protocol (blue = maker drafts and defends, red = cross-family checker attacks, white = human referee); light tier = grilling only, full tier = adds the cross-family attack pass; human-selected at invocation; pulse defaults to light; no new gate | deliberation is human-inside, not a delegated hand-off; a command would create a de-facto third gate (ADR-003: WHAT uses continuous dialogue, not a gate); see The pre-build deliberation loop below |

### The four commands, in plain words

The **weaver** is the agent that does the work — the old "conductor," renamed.
It runs four kinds of jobs. The big ones do not start from nothing: before a weave,
loom, or pulse begins, you and the weaver work out what to build together — the PRD
(product requirements) and TRD (technical design) come from a real talking session
with you, not from the agent working alone. A stitch skips that talking; it is for
small things:

- **stitch** — one quick job. You ask for something small; the weaver does it right
  away and shows you the result. No big planning. (If the stitch touches a branch or
  a tracked task, it still stops for you at the merge check.)
- **weave** — one whole build job, start to finish. The weaver drafts the build plan
  and stops for you (you approve, send it back with fixes, or reject), then builds and
  stops again with the finished result (you approve, send it back, or reject). Two
  check-ins on the build, every time — plus all the talking that shaped the PRD and
  TRD before it started. A big weave can run across several sessions; the check-ins
  never disappear between them. (The formal gate vocabulary: approve, kickback, or
  reject — see Gate placement below.)
- **loom** — a to-do list that works itself. The weaver takes jobs one at a time and
  does a full weave for each. It never skips your check-ins, no matter how long the
  list is.
- **pulse** — an alarm clock for work. At a time you picked (or when something
  happens), it starts a weave by itself. But it always stops and waits for you at the
  same check-ins.

How they fit together: a **loom** is a list of weaves. A **pulse** starts weaves on a
schedule. A **stitch** stays small and never turns into a weave.

In developer words: after you and the agent shape the PRD and TRD together, the
build portion runs with two formal check-ins — the **plan approval** and the **merge
approval** described below; the to-do list is the backlog queue; the thinking work
that came before those check-ins was not free either.

### The pre-build deliberation loop (`warp`)

The thinking work before the build is a named loop, not an unnamed gap. Candidate
name **warp** — the thread preparation done before weaving; no new CLI verb, so no
collision surface (final name pending ratification). It covers two places with
different rules, and this record must not blur them:

- **WHAT side (with you, never solo):** the PRD/TRD shaping — options, research, and
  evidence from the agent; you steer; you decide. This is continuous dialogue
  (ADR-003), carried by the grilling practice: one question at a time, with a
  recommended answer.
- **HOW side (before the plan gate):** the agent drafts the plan autonomously, then a
  **cross-family attack pass** runs before the plan gate opens.

The **red-blue-white protocol** (full tier):

- **Blue (maker):** the drafting agent writes the plan and defends it.
- **Red (checker):** reviewer agents from a **different model family** attack the
  draft. Never the same family grading itself — same-family review is the
  false-consensus trap (arXiv 2608.18167, 2026-08).
- **White (referee):** **you**. The weaver settles mechanical disputes on written
  policy; anything ambiguous escalates to you. Your signature at the plan gate stays
  the only approval — models never sign (four-eyes: a person signs, not a model).
- Rounds are capped by the existing budget machinery (`reviewer-loop.ts
  --budget-usd`); dissents are preserved and travel with the plan as **receipts into
  the existing plan gate** (NORTH_STAR: every gate produces a receipt). No new gate
  is created; ADR-003 stands unamended.

Tiers, chosen by you at invocation, never auto-migrated:

| Tier | What runs | Who gets it |
|---|---|---|
| **Light** | Grilling only — you and the agent talking; no cross-family spend | stitch-class thinking; the default |
| **Full** | Light, plus the red-blue-white attack pass above | weave/loom with complex or high-stakes specs; human-selected |

- **stitch** skips the deliberation loop entirely (already true of stitch's no-big-
  planning rule).
- **pulse** defaults to light unless you pre-selected full when scheduling — an
  unattended pulse never burns cross-family spend before the gates.

Tier enforcement pre-build is review-based (maker/checker), never machine-enforced:
the deterministic tier-fit checker computes on the merged diff, which does not exist
yet in this phase; the budget ladder is the only machine surface here. Post-approval
re-deliberation routes through `replan`, never a silent phase repeat, and settled
choices are not re-litigated without a new WHY pass (ADR-003).

### Gate placement (unchanged by this ADR)

The two formal human gates are exactly as ADR-003 and NORTH_STAR define them: **plan
approval** (the human approves the implementation plan before build work starts) and
**merge approval** (the human approves the diff before it lands). This ADR adds no
gates and removes none. ADR-003 stands unamended.

But the gates are not the whole story, and this ADR must not make the work look
easier than it is. What actually happens around a `weave`:

- **Before the weave:** thinking work, done with you, never solo. The PRD (product
  requirements) and TRD (technical design) are not written by the agent on its own.
  They come out of a back-and-forth brainstorming session between you and the agent —
  the WHY and WHAT phases per ADR-003. The agent brings options, research, and
  evidence; you steer; you decide. This is the WHAT side of the pre-build deliberation
  loop (`warp`, above). The task also does not enter the backlog on its own: the
  claim-time spec check (when the task enters work; TASK-51, `spec-approved`) is a
  human checkpoint that approves the description and acceptance criteria before any
  build planning starts.

- **Inside the weave:** two gates, three possible answers each. At each formal gate
  you can **approve** (continue), **kickback** (send it back with what is wrong — the
  loop fixes it and re-presents; same word, same meaning as the TASK-8 decision CLI),
  or **reject** (hard stop — this attempt ends; a new attempt starts only if you ask
  for one). Everything between the gates is agent-run. The TASK-8 decision CLI also
  has `replan` (back to planning) and `stuck` (agent-reported) — those are lifecycle
  states the harness tracks, not extra gate answers; a `replan` restarts the build at
  the plan gate, and `reject` supersedes it with a hard stop.

- **One weave can span many runs.** A big job does not fit one thread. The loop
  continues across sessions and workflow runs, sized by the context window and the
  work's complexity, and the two gates hold at every boundary: work never passes a
  gate just because a new run started.

Worked example — the build half of one `weave` (the part the command automates). The
brainstorming that produced the PRD/TRD and the spec approval at claim already
happened before step 1:

1. Task sits in the backlog, spec approved at claim.
2. The agent autonomously drafts the step-by-step implementation plan. On the full
   tier, the cross-family attack pass (`warp`, above) runs here first — dissents are
   preserved and travel with the plan as evidence for step 3.
3. **Human gate 1 — plan approval.** You read the plan (and the preserved dissents):
   approve, kickback, or reject.
4. On approval, the agent builds autonomously; the reviewer loop runs; tests pass.
5. **Human gate 2 — merge approval.** You review the diff: approve, kickback, or
   reject.
6. On approval, the workflow ends.

The two stops in this example are the only two places you touch the build itself —
but they are not the only places you touch the work. The brainstorming session, the
PRD/TRD shaping, and the spec approval all happen earlier, with you driving. If a
future change ever wants to move, rename, or remove either formal gate, that is an
ADR-level decision amending this record and ADR-003 — not a skill or code change.

### Budget mechanics (detail)

The one deterministic module extends TASK-6 + the budget-caps design + `risk-signals.ts`.
All evaluations happen only at iteration boundaries; per cap:

- **inform at 80%** — a one-line note;
- **alert** — on stall or risk-trigger (`session.diff` no-progress tuple,
  `risk-signals.ts`). Stall = no `session.diff` progress between consecutive iteration
  boundaries, evaluated at boundaries;
- **soft-stop at 100%** — finish the current step, report, stop; never kill mid-edit.
  The wall-clock cap's soft-stop can fire between boundaries: a timer runs in the
  background, so a true hang cannot outlast the cap.

Iteration boundary = a completed agent step within the loop: weave → a completed
per-AC verification pass; loom → a completed task; stitch → turn end; pulse inherits
the boundary of the weave it fires. Never auto-migrate tiers unattended.

The budget config surface uses **weavelog-native names** (loom vocabulary) — third-party
prior-art patterns are cited in research docs, never adopted as names; zero dependency,
zero name adoption.

## Consequences

**Easier:**
- Small tasks take the smallest loop; orchestration cost scales with verified need.
- Loop definitions are committed files — a differentiator (arXiv 2608.21884: configs rarely committed).
- Verification cost bounds delegation explicitly via the budget tuple.
- One naming metaphor covers persona and commands.

**Harder:**
- Four command surfaces to document, scaffold, and teach.
- opencode plugin-SDK lifecycle-hook expressibility must be verified before `weave`'s
  evaluator-loop mechanics ship.
- The deterministic budget module extends the TASK-6 spec (currently To Do) —
  implementation sequencing must land TASK-6 before the budget module.
- The `weaver` name must pass a TASK-57-style availability check
  (npm/GitHub/domain/trademark) at PRD.
- User-level and project-level AGENTS.md diverge — config-sync must handle both layers.

## Alternatives considered

| Option | Verdict | Why rejected |
|---|---|---|
| Conductor-always-on (status quo) | rejected | forces orchestration cost on every task; contradicts thin-context evidence (AGENTbench Feb 2026) |
| Adopt `/loop`/`/goal` names verbatim | rejected | semantics diverge per harness (session- vs thread-scoped); documented collision bugs (Claude #54633 et al.) |
| Wrong tier surface (two-tier `stitch`/`weave` only, or five-plus incl. unattended proactive) | rejected | commands must follow the hand-offs actually delegated (three plus a trigger) — two tiers drop the queue loop (Ralph pattern) and trigger loop; unattended five-plus violates the two-gates model; `pulse` holds the proactive rung at the gates |
| LLM-judged tier-fit checker | rejected | ADR-004 mandate: deterministic signals computed on the merged diff, never self-report or LLM judgment |
| Persona-only or commands-only naming | rejected | ecosystem precedent (Ralph = technique AND persona) supports coexistence; the weaver carries the factory metaphor |
| Fifth top-level deliberation command | rejected | deliberation is human-inside, not a delegated hand-off; a spec-approval endpoint would create a de-facto third gate in WHAT (ADR-003: continuous dialogue, not a gate); the tier-fit checker cannot compute pre-diff — 2026-09-10 cross-family plan-gate consultation (TASK-79) |
| Tiered loop commands + weaver persona (this ADR) | chosen | — |

## Alignment

| Decision | Anchor |
|---|---|
| Two HITL gates preserved | NORTH_STAR out-of-scope, :63-64 — "HITL is baked in: human-gated at the plan and merge gates"; ADR-003 Gates row (plan approval + merge approval) — unchanged by this ADR; loop-factory.md :64 |
| Deterministic budgets/checker | NORTH_STAR verification-woven principle; ADR-004 deterministic-trigger philosophy |
| Skills + CLI triggers, slim AGENTS.md | PRODUCT self-contained-workspace framing; TASK-28/29/30 two-level CLI scope |
| Budget tuple extends TASK-6 | NORTH_STAR Core Idea (not a non-negotiable): "deterministic tool validation and human-in-the-loop verification"; ROADMAP v0.1.0: "`weavelog check` — deterministic gates: tests, lint, typecheck, semgrep, ..."; backlog driver chain TASK-3..10 (budget machinery lands in TASK-6, Step 3) |

## References

- Research basis: [docs/research/2026-09-07-loop-taxonomy-research.md](../research/2026-09-07-loop-taxonomy-research.md) (TASK-79)
- Deliberation-loop research basis: [docs/research/2026-09-10-pre-build-deliberation-loop.md](../research/2026-09-10-pre-build-deliberation-loop.md) (TASK-79, 2026-09-10 design fork)
- Budget machinery: TASK-6; `docs/research/2026-09-03-budget-caps-checkpoint-resume.md`
- Implementation tracking: TASK-80 (weaver sweep), TASK-81 (budget module, tier-fit
  checker, CLI surface — umbrella)
- Format contract: [docs/adr/README.md](./README.md); ADR-004 is the reference implementation
- Authoring rules: [docs/AGENTS.md](../AGENTS.md)
