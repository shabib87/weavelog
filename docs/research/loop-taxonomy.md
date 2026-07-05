# Loop Taxonomy for loopeng

> **Date:** 2026-07-04
> **Source:** Laurie Voss, "What the hell is a loop, anyway?" (2026-07-03)
> **Cross-referenced against:** `docs/NORTH_STAR.md`, `docs/research/RESEARCH.md`, `docs/research/model-selection.md`

## Summary

Laurie Voss identifies four distinct architectures that all get called "loops"
in AI engineering. This document maps each one to loopeng's architecture and
defines where v1 ends and v2 begins.

---

## The Four Loops

### 1. Execution Loop (innermost)

> *"Call a tool, read the result, decide the next action, repeat until there
> are no more tool calls to make."*

The agent's own act-observe cycle. It iterates on steps within one task and
ends on environment feedback: test output, API response, file contents.
Humans are absent mid-loop and appear only at boundaries.

**Where it lives in loopeng:** This is Pi itself. The model calls `bash`,
`edit`, `read` — Pi handles the tool execution loop. loopeng does not
engineer this layer.

### 2. Task Loop (Ralph Loop)

> *"Restart the agent against the same specification over and over,
> allocating a completely fresh context window every iteration and doing
> exactly one task per loop. The apparent waste is the point: re-feeding the
> full spec each time prevents the context rot and compaction events that
> quietly degrade long-running sessions."*

Named after Geoffrey Huntley. Iterates on a single artifact. Ends on spec
compliance and passing tests. The human writes the spec, judges done-ness,
and — critically — watches the loop, spots failure patterns, and fixes them
so they never recur. Huntley compares the human's role to "a locomotive
engineer, someone whose whole job is keeping the train on the rails."

**Where it lives in loopeng:** **This is loopeng v1.** Spec → implement →
verify → document, with the human reviewing diffs at verification gates.
The Ralph Loop's key insight — fresh context per iteration — maps directly
to Pi's `/fork` per agent role.

| Ralph Loop Principle | loopeng v1 Implementation |
|---|---|
| Fresh context per iteration | Pi `/fork` per agent role (Analyst, Implementer, Verifier) |
| Human writes spec, judges done | Human authors AGENTS.md, verifies at handoff gates |
| Human spots failure patterns | Eval system: convergence count, failure clusters |
| One task per loop | One feature/story per spec cycle |
| Cross-model maker/checker | Analyst (GLM 5.2) → Analysis Reviewer (DeepSeek V4 Pro) |

### 3. Product Loop (Software Factory)

> *"The whole loop, the whole lifecycle of developing software with autonomy:
> triage, specification, implementation, review, verification, shipping, and
> monitoring."*

The product loop iterates on a codebase and its backlog continuously. Exit
signals come from outside the codebase: new issues, production logs, user
feedback, review outcomes. The human role becomes configurable — you pick
which checkpoints to automate and which to keep human. Zach Lloyd at Warp:
20% → 60% auto-merge rate as trust accumulates. Anthropic: 65% of product
team code now created by internal Claude Tag, with agents taking
responsibility for parts of the codebase, not just individual bugs.

**Where it lives in loopeng:** **loopeng v2.** v1 is human-gated at every
verification point. v2 would add automated merge, continuous backlog
processing, and ratcheting autonomy as eval scores improve.

### 4. System Loop (Autoresearch)

> *"The inner loop is your primary system doing user-facing work, and the
> outer loop studies and maintains the primary system. It iterates on
> prompts, harnesses, model choices, and the evals themselves. The loop is
> the product."*

The system loop improves the factory itself. Minimal case: Karpathy's
630-line Python autoresearch (50 hypothesis-edit-evaluate experiments
overnight on one GPU). Shipped case: Meta's Brain2Qwerty v2, where agents
iteratively modified the codebase to invent better decoding architectures.

Exit signals: evals, judges, filtered product feedback, and an explicit
ask-a-human tool for tacit knowledge. This is the loop that rewrites the
prompts, swaps the models, and tunes the eval thresholds.

**Where it lives in loopeng:** **v2/v3.** The eval system is the first
step: collecting traces, clustering failures, identifying which model/role
combinations degrade. The system loop will eventually auto-tune these.

---

## The Oversight Loop (Top Ring)

Swyx's diagram labeled the outermost ring "???? loop." Laurie names it the
**oversight loop**: where goals get set, budgets get allocated, and work
gets culled. Addy on the AIEWF stage: *"That inner loop is capability. The
outer loop is agency."*

This loop belongs entirely to the human. No agent sets goals or allocates
budget. The oversight loop provides the constraints within which all other
loops operate.

---

## Where loopeng Sits in the Stack

```
OVERSIGHT LOOP (Human)
    ↓ sets goals, allocates budget
SYSTEM LOOP (v2/v3)
    ↓ studies, improves
PRODUCT LOOP (v2)
    ↓ orchestrates lifecycle
TASK LOOP (v1 — LOOPENG)        ← YOU ARE HERE
    ↓ runs spec→implement→verify→document
EXECUTION LOOP (Pi)
    ↓ runs tool calls per agent
```

---

## What Is NOT a Loop

Laurie explicitly excludes Cognition's Devin Security Swarm ("Agentic
MapReduce") from the taxonomy: *"Dispatch, gather, validate is a pipeline:
nothing feeds back into a next cycle, and a loop without feedback is just
a for statement. Fan-out is a topology you can deploy inside any of the
four loops, not a loop of its own."*

This matters for loopeng: parallel sub-agents (like running Analyst and
Implementer concurrently) is fan-out, not a loop. The loop is the feedback
cycle, not the dispatch pattern.

---

## What This Means for loopeng v1

### Scope Boundaries

| Concern | loopeng v1 | loopeng v2+ |
|---|---|---|
| Task loop (spec→code→verify→doc) | ✅ Built | ✅ Improved |
| Analysis pre-loop (research→review→spec) | ✅ Added 2026-07-04 | ✅ Improved |
| Product loop (continuous, auto-merge) | ❌ Out of scope | v2 |
| System loop (auto-improve evals) | ❌ Out of scope | v2/v3 |
| Oversight loop (goal setting) | ❌ Always human | Always human |

### The Eval System: Wired Signals

Laurie's closing is the design brief for loopeng's eval system:

> *"Naming a signal is not the same as wiring it in. A loop without its
> signal doesn't converge, it just runs until something external stops it.
> Knowing whether your loops are actually closing, at production scale, means
> sweeping traces and clustering failures continuously instead of
> spot-checking transcripts."*

For v1, the eval system must wire these signals:

| Signal | What It Measures | Why It Matters |
|---|---|---|
| **Convergence count** | Iterations before spec compliance per gate | Is the loop converging or spinning? |
| **First-pass success rate** | % of verifier reviews that pass on first attempt | Are makers getting better? |
| **Human rejection rate** | % of human reviews that reject agent output | Is trust calibrated correctly? |
| **Disagreement rate** | Verifier findings that maker disputes | If 0%, checker is rubber-stamping. Must be >0%. |
| **Failure clusters** | What types of tasks/errors repeat? | Huntley's locomotive engineer: "fix them so they never recur" |
| **Cost per converged task** | Total token spend / completed feature | Efficiency baseline + trend |
| **Human bottleneck time** | Time waiting for human review vs agent work time | Are you the constraint? (Anthropic is.) |

### The Human Constraint Problem

From the AIEWF closing debate: *"Even inside Anthropic, the team running Tag
reports being bottlenecked on reviews and on the human ability to
conceptualize what the system is doing. The checkpoint humans kept for
themselves is now the constraint."*

Your eval system must measure this. When `human_bottleneck_time` exceeds
`agent_work_time`, the system is telling you to ratchet autonomy at that
gate. This is the data that justifies moving from v1 task-loop to v2
product-loop on specific checkpoints.

---

## Key Quotes (Preserved for Future Reference)

- Peter Steinberger: "You shouldn't be prompting coding agents anymore, you
  should be designing loops that prompt your agents."
- Boris Cherny (Anthropic): "I write loops, the loops do the work."
- Addy Osmani: "That inner loop is capability. The outer loop is agency."
- Geoffrey Huntley (on Ralph Loop): Human's job is "a locomotive engineer,
  someone whose whole job is keeping the train on the rails."
- Roland Gavrilescu: "The loop is the product."
- Zach Lloyd (Warp): "Software engineering becomes factory engineering.
  You'll be building the thing that builds the product."
- Paul Bakaus: "There is no auto, and there will be no auto."
- Mike (Anthropic, on Tag): Team is "bottlenecked on reviews and on the
  human ability to conceptualize what the system is doing."
- Laurie Voss: "Autonomy is a dial that exists separately on every one of
  the four loops."
