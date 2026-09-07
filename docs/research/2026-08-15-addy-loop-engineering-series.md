---
date: 2026-08-15
topic: Addy Osmani loop-engineering article series (Aug 2026) — synthesis
status: verified-live
sources:
  - https://addyo.substack.com/p/practical-loop-engineering
  - https://addyo.substack.com/p/agentic-code-quality
  - https://addyo.substack.com/p/own-the-outer-loop
  - https://addyo.substack.com/p/software-factories-light-and-dark
models_used_for_research: [moonshotai/kimi-k3, qwen/qwen3.8-2.4t-a95b]
supersedes: none
---

# Addy Osmani loop-engineering series (Aug 2026)

Four Substack posts, all dated August 2026 (comment timestamps visible: 2026-08-08 on code-quality, 2026-08-14 on loop-engineering, Jul 9-10 on outer-loop, Jul 22 on software-factories). Pangram-scored 100% human-written.

## Practical Loop Engineering

Loops are autonomous self-correcting cycles: an agent repeatedly acts, tests, adjusts until a goal is met. Two primitives + four rungs:
- **goal** — bounded task, measurable finish line. A per-turn evaluator checks the TRANSCRIPT (not content quality) against hard rules. Returns MET / NOT-YET-MET / IMPOSSIBLE. The evaluator does NOT run commands or read files — it only judges what the worker already surfaced.
- **loop / schedule** — rerun a prompt on a timer. /loop is session-scoped (7-day expiry); /schedule + Routines are cloud-persistent.
- **Four rungs**: manual/agentic (you direct each turn) -> goal-based -> time-based -> proactive (event/schedule triggered, no human in real time, smaller models for routine, capable only for judgment).
- **Composition**: schedule(check) -> goal(solve) -> workflows(parallel worktrees + adversarial judge) -> auto-mode.
- **Rules**: never let the agent that did the work decide it's done (separate drafter + verifier); don't delegate judgment (watch closely for auth/security/finance); spin detection (same command 3x with no change = stop).

## Agentic Code Quality

Quality = the constraints you set around agents. Move checks into harness/environment/OS, not end-of-pipeline human review. Gates: unit, property, acceptance, MUTATION testing, complexity/line metrics, architecture-rules via linters, late-stage security scanning. Goal environment: agent does real work, gets feedback it can trust, FAILS WITHOUT DOING MUCH DAMAGE (low-damage failure modes). Back-pressure THROUGHOUT the loop (compilers, tests, security policies, CI), not a single review at the end. Quality is a collection of signals (correctness, maintainability, performance, security, efficiency, comprehensibility). Human attention is scarce; pull humans only when automated guardrails break.

## Own the Outer Loop

Inner loop = investigate / implement / verify (the model does this). Outer loop = decide whether to address it / verify the diagnosis / approve the change / carry the consequences (the human owns this). The boundary between them is EVIDENCE: diffs, tests, logs, verdicts. Three terms: Quality (checks produce evidence), Verdict (the production decision: ship/block/redirect/narrow/reject), Answerability (the guarantee you can explain why). Three hidden costs: cognitive surrender (blindly accepting AI output), cognitive debt (erosion of your understanding), orchestration tax (your bandwidth doesn't parallelize). Humans belong in the constraints loop, the sampling loop, the audit loop, and the ownership loop — NOT the inner loop.

## Software Factories, Light and Dark

Loop -> harness -> factory. A loop is the smallest unit of agentic work (gather context, act, check, repeat). A harness is the walls around a loop (sandbox, tools, memory, gates). A factory is many harnessed loops at scale, fed by a queue, drained through a review gate, with humans owning the whole. Dark factory = code ships that no human read (verified only by machines). Light factory = same pipeline with humans reading where judgment lives, and human judgment moved UPSTREAM to product/design/architecture before the loop starts. Back-pressure = only grant as much autonomy as you can cheaply and reliably verify. Verification, not generation, is the real constraint. Comprehension debt = the widening gap between code that exists and code any human understands; a dark factory takes it on as fast as it can with tests green the whole way. Short loops (3-10 steps) are easier to verify; past 20 steps agents lose the thread. "Mostly deterministic code, with LLM steps sprinkled in at just the right points" — the graph/flowchart rediscovered.
