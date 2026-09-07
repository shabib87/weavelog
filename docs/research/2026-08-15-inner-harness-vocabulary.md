---
date: 2026-08-15
topic: Inner-harness vocabulary — terms for the loop engineering helper
status: reviewer-corrected
sources:
  - ~/.agents/docs/research/2026-08-15-addy-loop-engineering-series.md
  - ~/.agents/docs/research/2026-08-15-loop-primitives-claude-codex-sdk.md
models_used_for_research: [moonshotai/kimi-k3, qwen/qwen3.8-2.4t-a95b]
supersedes: none
---

# Inner-harness vocabulary (reviewer-corrected)

These terms name the parts of the loop engineering helper. The blog and the tools share them. Reviewer corrections applied: "control plane" not "inner harness" for blog audiences; "model routing" not "mixture-of-agents" to avoid MoE confusion; author's working definitions flagged as working, not industry standard.

## Terms

- **Outer harness** — the coding agent that runs the LLM, tools, sessions, permission model. You configure/extend it; you don't own its internals. Examples: opencode (target), Claude Code, Codex, pi. Established usage (Addy: "checks have to happen in the harness, environment, and operating system around the agent").
- **Control plane** (blog term) / **inner harness** (internal term) — the deterministic layer built on top of the outer harness: agents, scripts, hooks, gates, caps, model routing, rollback. "Deterministic" is load-bearing: counters and state live in code, not LLM context.
- **Inner loop** — the agent's execution cycle: investigate -> implement -> verify -> repeat. The model does this. Bounded by caps, isolated by worktrees, checked by gates.
- **Outer loop** — the human's decisions: decide whether to address it -> verify the diagnosis -> approve the change -> carry the consequences. Boundary between inner and outer is EVIDENCE.
- **Human reviewer gate** — the merge gate. A human reads evidence and decides ship/block/redirect. Where judgment lives. (Distinct from the agent review loop.)
- **Agent review loop** — cross-model adversarial review, parallel, different families. Returns VERDICT (APPROVE / APPROVE-WITH-FIXES / REJECT). Deterministic budget cap. Already shipped as reviewer-loop.ts.
- **Conductor** — the primary session that delegates to subagents, merges by evidence, routes decisions. Never grinds (does not implement itself).
- **Circuit breaker** — a cap enforced in code (runtime counter, stop-hook), not prose. On breach: stop + escalate. Hard rule from 3 review rounds: prose caps are not circuit breakers.
- **Back-pressure** — a gate that rejects a proposal before it advances (test fails, lint dirty, security scan flags). Lives throughout the loop, not at the end.
- **Low-damage failure mode** — an environment where an agent can do real work, get feedback it can trust, and fail without doing much damage. Requires isolation (worktrees + clean env + secret denylist + caps) + bounded permissions.
- **Quality signal** — a single dimension of quality (correctness, maintainability, performance, security, efficiency, comprehensibility). Quality is a collection, not one metric.
- **Model routing** — routing different models to different roles/tasks by task type (cheap fast for scouting, cross-family for review, capable for judgment). NOT "mixture-of-experts" (MoE = model-internal architecture).

## The named flow (the stage graph)

research -> spec -> plan-review -> [HUMAN GATE: plan approval] -> breakdown -> spec(unit) -> prototype(maybe) -> tdd/bdd -> tests.md -> implement -> results.md -> verify -> qa -> review-loop -> [HUMAN GATE: merge approval] -> ship

Two human gates, clearly named: plan approval (after plan review) and merge approval (after review loop). Everything between runs autonomously with circuit breakers. This is Addy's "own the outer loop": the inner loop is the pipeline above; the outer loop is the two gates plus the decision to ship.

## Artifact format (the evidence that crosses the inner/outer boundary)

Each stage writes a structured file to disk (not chat). This is what makes the loop deterministic and resumable:
- spec.md — acceptance criteria (Given/When/Then or WHEN-THEN-AND)
- plan.md — the plan with testable acceptance criteria
- tests.md — test plan (what, why, red/green status)
- results.md — fresh test output + exit codes + evidence
- verdict.md — the reviewer agents' VERDICT + FINDINGS

## Deferred (YAGNI, with triggers)
- Runtime mode (driving the flow with subagents) — trigger: install proven on fresh Mac.
- flow.yaml (the stage graph as machine-readable) — trigger: hook-surface probe passes + runtime mode activates.
- YAML frontmatter refactor of the runbook — IN SCOPE now (the 2k-line file read suffers); see the plan.
