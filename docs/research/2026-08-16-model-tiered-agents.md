---
date: 2026-08-16
topic: "Model-tiered agent usage — when & how"
status: adopted
sources:
  - https://www.digitalapplied.com/blog/llm-model-routing-2026-cost-quality-optimization-engineering-guide
  - https://www.augmentcode.com/guides/ai-model-routing-guide
  - https://arize.com/blog/how-cheap-models-changed-multi-agent-economics
  - https://heym.run/blog/ai-code-review
  - https://arxiv.org/html/2503.13657v1
  - https://dev.to/gabrielanhaia/the-5-failure-modes-of-multi-agent-systems-nobody-warns-you-about-2fml
  - https://www.elvex.com/blog/context-length-comparison-ai-models-2026
  - https://www.mindstudio.ai/blog/1m-token-context-window-vs-rag-claude
  - https://developer.nvidia.com/blog/train-small-orchestration-agents-to-solve-big-problems
  - https://arxiv.org/html/2606.13175v1
  - https://cleanlab.ai/blog/tau-bench
models_used_for_research: [z-ai/glm-5.2]
supersedes: none
---

# Model-tiered agent usage — when & how
- **Last verified**: 2026-08-16
- **Status**: current
- **Related**: [[2026-08-16-primitive-selection]], [[2026-08-16-agentsmd-hygiene]]

## Sources
- [LLM Model Routing in 2026: Cost-Quality Optimization](https://www.digitalapplied.com/blog/llm-model-routing-2026-cost-quality-optimization-engineering-guide) — RouteLLM peer-reviewed: 85% cost savings at 95% of GPT-4 quality; routing overhead <10% of inference latency.
- [Best AI Model for Coding Agents in 2026: A Routing Guide](https://www.augmentcode.com/guides/ai-model-routing-guide) — Three-tier Claude routing saves 51% vs uniform Opus; coordinator→Opus, implementor→Sonnet, file-ops→Haiku.
- [How cheap models changed multi-agent economics](https://arize.com/blog/how-cheap-models-changed-multi-agent-economics) (Aug 2026) — GLM-5.2 statistically tied with Opus 4.8 on task completion at lower cost; cheaper-per-token ≠ cheaper-per-task (Sonnet 5 cost MORE per task via 1.9× tokens).
- [Adversarial Code Review: What It Is and How to Run It](https://heym.run/blog/ai-code-review) — Reviewer and challenger must run on DIFFERENT model vendors to avoid shared blind spots; structured JSON, not prose.
- [Why Do Multi-Agent LLM Systems Fail?](https://arxiv.org/html/2503.13657v1) (Mar 2025) — MAST taxonomy: 14 failure modes; spec 41.8%, inter-agent misalignment 36.9%, verification 21.3%; step repetition is single largest mode (17.14%).
- [The 5 Failure Modes of Multi-Agent Systems Nobody Warns You About](https://dev.to/gabrielanhaia/the-5-failure-modes-of-multi-agent-systems-nobody-warns-you-about-2fml) — Loop-of-loops; one ceiling per run (steps, writes, handoffs, dollars) held at run level, not per-agent.
- [Advertised vs Effective Context Windows](https://www.elvex.com/blog/context-length-comparison-ai-models-2026) — Effective context ≈ 60–70% of advertised; degradation is threshold-shaped not gradual; RULER benchmark.
- [Does a 1M Token Context Window Replace RAG?](https://www.mindstudio.ai/blog/1m-token-context-window-vs-rag-claude) — Long-context wins for one-shot whole-document reasoning; RAG wins for dynamic/multi-tenant/high-volume; "use both."
- [Train Small Orchestration Agents to Solve Big Problems](https://developer.nvidia.com/blog/train-small-orchestration-agents-to-solve-big-problems) — ToolOrchestra: small RL-tuned orchestrator supervising larger models, rewarded for accuracy+cost+time jointly.
- [The End of Code Review: Coding Agents Supersede](https://arxiv.org/html/2606.13175v1) — Same model family generating + reviewing → correlated blind spots; mitigate with cyber-specialized frontier reviewers for security sign-off; calibrated abstain.
- [Automated Hallucination Correction for AI Agents (Tau²-Bench)](https://cleanlab.ai/blog/tau-bench) — LLMs are bad at knowing when to ask for help; trustworthiness scores outperform self-escalation.

## Findings

### 1. Routing pays, but "cheap model" means cheap-per-task, not cheap-per-token
- RouteLLM (ICLR 2025, peer-reviewed): 85% savings at 95% of GPT-4 quality. CoDyn dynamic coding router (NeurIPS 2025): 43% average savings while matching the strongest single model.
- Three-tier routing is now the documented default: coordinator on frontier, implementor on mid, file-ops/tool-ops on small. Augment's worked model: 51% bill reduction vs uniform Opus 4.6.
- **The trap**: Arize (Aug 2026) measured that Sonnet 5 is 1.7× cheaper per token than Opus 4.8 but cost *more per task* because it read and reasoned through 1.9× more tokens to finish. GLM-5.2 finished tied with Opus 4.8 at $1.28/task vs $1.94. **The executor tier is "models that finish tasks cheaply" — a measured property, not a price-sheet property.** You cannot pick the executor tier from the API pricing page; you must instrument cost-per-successful-task.

### 2. Orchestrator-executor is the dominant pattern; the orchestrator is NOT the cheapest seat
- NVIDIA ToolOrchestra: a small RL-tuned orchestrator supervising larger models, explicitly rewarded for joint accuracy + cost + time-to-solution. Untuned prompt-based orchestrators lost. The lesson: the orchestrator seat needs *judgment and evaluation quality*, not raw capability — but it is the one seat you cannot afford to be weak on, because its decisions cascade to every downstream agent.
- OpenAI Deep Research uses cheap small models for clarification/intent collection and reserves the large model for synthesis. The split is "cheap for setup, expensive for the irreversible synthesis step."
- **Implication**: the conductor/orchestrator tier should be the model that best *evaluates worker output*, which is not necessarily the model that best *writes code*. In practice this is a strong-judgment mid-tier (GLM-5.2 in this user's ladder), escalating to the frontier only for plan review on high-stakes work.

### 3. Effective context ≈ 60–70% of advertised; 1M windows degrade at a threshold, not gradually
- RULER / Chroma benchmarks: every tested model degrades as context grows; coherent text degrades *worse* than shuffled text (recency bias). A 1M-window model can start degrading meaningfully at ~50K tokens.
- Decision rule (BenchLM, MindStudio): **use the smallest window that fits the workload at the cheapest rate; reserve 1M for one-shot deep analysis.** Long-context beats RAG only when (a) corpus is static, (b) one-shot, (c) value is cross-document reasoning, (d) low query volume. RAG wins for dynamic, multi-tenant, high-volume.
- For a coding agent: a 1M-context *cheap* model (e.g. DeepSeek V4 Flash at $0.14/M) beats a smaller-context strong model ONLY for whole-repo one-shot reasoning. For scoped subtasks (<4k token budget per the prior primitive-selection findings), the strong model on a small context is both cheaper and higher quality.

### 4. Adversarial review requires model-family diversity, not just a "be critical" prompt
- heym.run, subaud.io, agent-review-panel all converge: a single model reviewing its own code rubber-stamps. The structural fix is **isolation + different model vendor**. Same base model across reviewer and challenger produces correlated blind spots the panel's "correlated-bias warning" cannot eliminate.
- The minimal adversarial shape: reviewer proposes findings (JSON: severity + confidence), challenger disputes (different model; accept/reject/modify), orchestrator arbitrates on a written policy. Human arbiter only on genuinely ambiguous calls.
- Calibration matters more than volume: the arxiv "End of Code Review" paper notes LLMs silently approve rather than say "I don't know." Train/evaluate reviewer agents to **abstain** and emit confidence that tracks empirical correctness, not always-binary approval.

### 5. Most multi-agent failures are coordination, not model-capability, problems
- MAST taxonomy: 41.8% specification, 36.9% inter-agent misalignment, 21.3% verification. Single largest mode is **step repetition (17.14%)** — the system cycles the same step because it never checks whether state changed meaningfully. This is exactly the user's "resend-storm (3× identical)" anti-pattern.
- The structural fix (dev.to 5 failure modes): **one ceiling per run held at run level, not per-agent.** Steps, writes, handoffs, dollars. Loop-of-loops happens because each agent has its own retry policy and a single flaky API blip becomes 27 LLM calls. One `StepBudget` instance, every agent increments through it.

## Role → tier mapping

Mapped to the user's ladder: **flash** = deepseek/deepseek-v4-flash · **glm** = z-ai/glm-5.2 · **qwen** = qwen/qwen3.8-2.4t-a95b · **kimi** = moonshotai/kimi-k3.

| Agent role / task type | Recommended tier | Why |
|---|---|---|
| **Scout / explorer** (grep, glob, fetch, file read) | flash | High-volume, tool-competent, sub-4k context budget. Exploration is breadth, not depth — the cheapest model that can call tools reliably wins. |
| **Implementer** (write/edit code, run tests) | glm | Workhorse; statistically tied with Opus on task completion at lower cost-per-task (Arize). This is the "finish tasks cheaply" tier. |
| **Conductor / orchestrator** (decompose, delegate, merge) | glm (routine) → kimi (high-stakes) | Judgment + evaluation quality, not raw capability. GLM for routine routing; escalate plan review to kimi only when the plan is high-stakes (per the user's cross-model review rule). |
| **Reviewer / gate** (code review, plan review) | qwen | MUST be a different model family from the implementer (correlated-bias mitigation). Qwen is the strong-reasoning gate tier. |
| **Red-team / challenger** (dispute reviewer findings) | qwen (different vendor than implementer) | Adversarial; opposing incentives. Same tier as reviewer is fine as long as both differ from the implementer's tier. |
| **Plan-reviewer** (cross-model review of high-stakes plans) | kimi | Escalation tier; the user's runbook already specifies parallel reviewers from different model families for high-stakes plans. |
| **Vision roles** (image/screenshot analysis) | minimax-m3 (cheap) / kimi-k3 (hard) | Per existing runbook. Do NOT default to kimi for routine vision — minimax-m3 is the cost-correct option. |
| **Synthesis** (merge fan-out results) | glm | Synthesis is judgment + format adherence; GLM's tied-with-Opus result holds here. Reserve kimi for synthesis that itself is the high-stakes artifact. |
| **Intent / clarification** (probe scope before fan-out) | flash | OpenAI Deep Research pattern: cheap model for disambiguation, expensive for synthesis. |

**Tier-selection heuristic**: pick the *cheapest tier that has demonstrated competence on this task class* (measured, not assumed). Escalate when (a) the task class is high-stakes, (b) the prior attempt failed for a capability reason, or (c) the role requires model-family diversity from another seat.

## Escalation rules

**Retry vs escalate — these are different actions and the user's "2 failed attempts" rule conflates them. Distinguish:**

- **Retry** = same tier, same prompt. Use ONLY for transient errors (rate-limit, network, 5xx). Cap: 1 retry, then treat as a real failure. Retries never fix a capability gap.
- **Escalate** = move up one tier (flash→glm→qwen→kimi). Use when the failure is a *capability* failure (wrong answer, hallucinated API, tool-misuse that isn't transient), not a transient one.

**The user's "2 failed attempts then escalate" rule, sharpened:**
- The 2 attempts must be **2 *different* attempts** (different prompt framing, different angle, or different subtask decomposition), NOT 2 identical resends. An identical resend is the resend-storm anti-pattern (step-repetition is the single largest MAST failure mode at 17.14%).
- After 2 *different* failed attempts at a tier, escalate one tier. Do not retry the same tier a third time.
- After escalation to kimi fails once, STOP and surface to the human. Kimi is the top of the ladder; there is nowhere to escalate.

**Run-level budget (structural fix for loop-of-loops / resend-storms):**
- One `StepBudget` and one `CostBudget` per run, passed to every agent. Every LLM call, tool call, and handoff calls `budget.spend()`. No sub-layer may add its own retry policy — the ceiling lives in the call frame.
- Per-conversation cost cap 1–2 orders of magnitude below the daily fleet cap. A runaway stops at $0.50, not at the daily ceiling.

**Escalation signals** (any one triggers tier move):
- 2 different failed attempts at current tier.
- Step repetition detected (state did not change meaningfully between steps) → escalate, do not retry.
- Reviewer confidence below threshold on a verification gate → escalate the *artifact* (not the reviewer) to the next tier for re-verification.
- Context window crossing ~60% of advertised (the effective-context cliff) → do NOT escalate to a bigger-context model; instead trim context or split the subtask.

## Failure-mode → tier action

| Failure mode | Tier action | Why |
|---|---|---|
| **Rubber-stamp reviewer** (approves everything) | Switch reviewer to a *different model family* from the implementer; add a challenger with opposing incentives. | Correlated blind spots are the root cause; same-family review is theater. Calibration (abstain + confidence) matters more than "do N passes." |
| **Hallucination** (invented API/function/symbol) | NOT a tier problem first. Fix with tool-use verification (run the code, grep the symbol). If hallucination persists *on a specific model* for a specific symbol class, escalate one tier — but verify the cheaper tier actually fails on it before assuming capability. | Hallucination in code is caught by execution, not by a smarter model. Switching models rarely fixes class hallucination; tool-use does. |
| **Tool-misuse** (wrong tool, wrong args, chained misuse) | Usually a spec/prompt-injection problem, not a tier problem (OWASP ASI02: misuse is downstream of injection amplified through chaining). If misuse is persistent and reproducible *on a model*, escalate one tier and add a tool-schema guard. | Misuse propagates through delegation chains; a stronger model still follows injected instructions. Fix the contract first. |
| **Context-overflow** (window filling, recall degrading) | Do NOT escalate to a bigger-context model. Trim context, use RAG, or split the subtask so each seat gets <4k tokens. Reserve 1M-context only for one-shot whole-document reasoning. | Effective context is ~60–70% of advertised and degrades at a threshold. A bigger window hides the problem; it doesn't fix the reasoning. |
| **Step repetition / resend-storm** (same step cycled) | Escalate one tier after the *first* repeat (not 2), because the repeat signals state didn't change — a capability/contract gap, not a transient blip. | 17.14% of all MAS failures; the user's documented 3× identical resend is the canonical case. |
| **Verification failure** (reviewer misses a real bug) | Escalate the *artifact* to the next tier for re-verification; do not re-run the same reviewer. Optionally ensemble (multiple reviewers, different families) for security sign-off. | Same reviewer re-run produces the same blind spot. Diversity > repetition. |
| **Plan-disagreement** (reviewers split) | Per runbook: cross-model review with parallel reviewers from different families; merge by evidence first, principles second, never by third opinion. Cap divergent review at 2 rounds and ≤$2. | Already in the user's protocol; the tier action is "add a different-family reviewer," not "escalate to kimi." |

## Recommendations for THIS user

The current ladder (flash → glm → qwen → kimi) is **mostly optimal** and aligns with 2026 evidence. Specific changes:

1. **Keep GLM as the workhorse.** Arize (Aug 2026) independently measured GLM-5.2 statistically tied with Opus 4.8 on task completion at $1.28 vs $1.94 per task. The user's workhorse assignment is evidence-backed. The risk to monitor: cost-per-*task*, not cost-per-token — instrument it, don't assume it from pricing.

2. **Keep Qwen as the reviewer — it's correctly a different family from GLM.** This is the single most important property of the ladder and it's already right. Do NOT move the reviewer to GLM even if GLM "seems smarter"; correlated blind spots are worse than a slightly weaker independent reviewer.

3. **Sharpen "2 failed attempts" → "2 *different* failed attempts."** Identical resends are the resend-storm anti-pattern and map to the largest MAS failure mode (step repetition, 17.14%). The runbook should state: retry once for transient errors; on a capability failure, attempt a *different* framing; only after 2 different failures, escalate one tier. After kimi fails, stop and surface to human.

4. **Add a run-level StepBudget and CostBudget.** The user's "fix loops cap at 5 rounds; research/discovery at 3; divergent review ≤$2 and ≤2 rounds" are good ceilings but they are stated as policy, not enforced as a passed object. Promote them to a single `StepBudget`/`CostBudget` instance every agent increments through — this is the structural fix for loop-of-loops and the resend-storm.

5. **Don't escalate context-overflow up the tier ladder.** The reflex ("context full → bigger model") is wrong in 2026: effective context is ~60–70% of advertised and degrades sharply. The fix is trim/split/RAG, not kimi. Reserve 1M-context (flash has it cheaply at $0.14/M) for one-shot whole-repo reasoning only.

6. **Don't default vision to kimi.** The runbook already says minimax-m3 (cheap) or kimi-k3 (hard) — keep that discipline. Kimi for routine vision is the most common cost leak in this ladder.

7. **For high-stakes plans, the cross-model review rule is correct and should not be relaxed.** Parallel reviewers from different families, merge by evidence — this is the documented mitigation for correlated blind spots in security/critical-path review. Cap at 2 rounds / $2 per the runbook.

8. **Open question to resolve**: should the conductor seat ever be GLM, or should high-stakes orchestration always be kimi? NVIDIA's ToolOrchestra evidence says a tuned orchestrator can be small — but that requires RL tuning the orchestrator, which the user is not doing. For *untuned* OpenRouter routing, GLM as conductor is defensible for routine work; the safe rule is "conductor = GLM, but the *plan* it produces gets cross-model review (kimi) when high-stakes." This is already the runbook's posture.

## Open questions / next steps
- Instrument cost-per-successful-task per tier (not per-token) to verify GLM is actually cheaper-per-task than flash+retry on implementer work. Arize's finding that cheaper-per-token can cost more-per-task is a direct risk to the flash tier's role.
- Measure effective-context cliff per model in this stack (flash's 1M is advertised; the real usable number is ~600–700K and degrades earlier on coherent code).
- Decide whether the reviewer/challenger should both be Qwen (same tier, different family than implementer) or whether the challenger should be a *third* family to break correlated bias further. Evidence (agent-review-panel) flags same-base-model panels even with divergent stances.
- Pilot a `StepBudget`/`CostBudget` object passed through every agent and measure whether resend-storms actually stop.
- Evaluate whether kimi is ever worth it for *implementation* (current policy reserves it for escalation) — or whether a second GLM pass with a different prompt is cheaper and equally effective. The runbook's "escalate only after 2 failed attempts" implicitly answers this; a measured comparison would confirm.
