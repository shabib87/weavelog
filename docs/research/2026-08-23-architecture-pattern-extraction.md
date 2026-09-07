---
date: 2026-08-23
topic: "Net-new extraction from two architecture-pattern docs vs existing harness"
status: resolved
sources:
  - https://openrouter.ai/docs/guides/features/zdr
  - https://openrouter.ai/docs/api_reference/parameters
  - https://openrouter.ai/docs/client-sdks/python/components/chatrequestreasoningeffort
  - https://openrouter.ai/deepseek/deepseek-v4-pro-0813
  - https://openrouter.ai/provider/deepseek
  - https://www.orcarouter.ai/models/deepseek/deepseek-v4-pro-0813
  - https://huggingface.co/unsloth/DeepSeek-V4-Pro-0813
  - https://github.com/can1357/oh-my-pi/issues/8517
  - https://github.com/BerriAI/litellm/pull/28881
  - https://github.com/openclaw/openclaw/issues/77350
  - "local: docs/research/2026-08-16-model-tiered-agents.md"
  - "local: docs/research/2026-08-15-openrouter-prompt-caching.md"
  - "local: docs/research/2026-08-23-agentic-architecture-pattern.md (subject doc 1)"
  - "local: docs/research/2026-08-23-agentic-deisgn-pattern.md (subject doc 2)"
  - "local: ~/.agents/AGENTS.md (global protocol)"
  - "local: ~/.agents/stack-versions.json"
models_used_for_research: [z-ai/glm-5.2]
supersedes: none
---

# Net-new extraction: architecture-pattern docs vs existing harness

- **Last verified**: 2026-08-23
- **Status**: open
- **Subject docs**: `2026-08-23-agentic-architecture-pattern.md` (245 lines) and `2026-08-23-agentic-deisgn-pattern.md` (163 lines)
- **Cross-reference**: existing harness facts from AGENTS.md, stack-versions.json, model-tiered-agents note, openrouter-prompt-caching note, reviewer-loop.ts, light-factory-plan

## Context mismatch (read first)

Both subject docs describe a **Python + httpx** implementation (`pip install harness-core`, `.harness/state.jsonl`, `class InnerHarnessCore`). The existing harness is **TypeScript + bun** (task-flow.ts, reviewer-loop.ts, IAgentProvider port, opencode-based). The implementation blueprints in both files are in the wrong language/stack and are **not directly applicable**. The extraction below filters for conceptual value only, ignoring the Python code.

Additionally, both files contain code bugs and wrong API details:
- `res["choices"]["message"]` should be `res["choices"][0]["message"]` (choices is an array) — both files.
- Model slugs are wrong: `"zhipuai/glm-5.2"` (real: `z-ai/glm-5.2`), `"alibaba/qwen-3.8-2t"` (real: `qwen/qwen3.8-2.4t-a95b`), `"moonshot/kimi-k3"` (real: `moonshotai/kimi-k3`). The files use plausible-but-incorrect OpenRouter slugs.

---

## A. Model tiering rationale

### What's the SAME
- **Qwen = reviewer/gate**: both files and existing routing agree. The model-tiered-agents note (2026-08-16) confirms this is the single most important property — Qwen must stay a different family from the GLM implementer.
- **GLM = code/workhorse**: both agree GLM is the code-generation tier. Arize (Aug 2026) independently measured GLM-5.2 tied with Opus 4.8 on task completion at $1.28 vs $1.94/task (per the existing note).
- **Flash = fast/small tier**: both agree Flash is the low-latency, low-cost tier.

### What's DIFFERENT (files vs existing routing)

| Role | Files say | Existing routing says | Who's better |
|---|---|---|---|
| Conductor | Flash (routing/JSON) | GLM (routine), Kimi (high-stakes) | **Existing.** The model-tiered-agents note cites NVIDIA ToolOrchestra: the conductor needs *judgment/evaluation quality*, not just speed. Flash as conductor contradicts the evidence — Flash is documented as the scout/explorer tier (breadth, not depth). |
| Researcher | Kimi (long-context) | GLM (researcher agent per AGENTS.md) | **Existing, mostly.** Kimi is genuinely strong at long-context extraction (factually accurate), but the existing note says flash's 1M context at $0.14/M is more cost-effective for whole-repo one-shot reasoning. Using Kimi for routine research is a cost regression. |
| Implementer | GLM (code gen only) | GLM (implementer + researcher + qa) | **Existing.** The files' narrower GLM-only-code assignment wastes demonstrated capability. The existing note says GLM is also cost-correct for synthesis. Narrowing GLM to code-gen-only would force more expensive models into roles GLM handles adequately. |
| Reviewer 1 (logic) | DeepSeek V4 Pro 0813 | NOT IN STACK | **Files (net-new).** See below. |

### DeepSeek V4 Pro 0813 — is it missing? Should it be added?

**VERDICT: NET-NEW (model), PARTIAL (role).**

DeepSeek V4 Pro 0813 (`deepseek/deepseek-v4-pro-0813`) is a **real model on OpenRouter** — confirmed via the OpenRouter model page (https://openrouter.ai/deepseek/deepseek-v4-pro-0813), the provider page (https://openrouter.ai/provider/deepseek), OrcaRouter, and HuggingFace. It is the GA release of DeepSeek V4 Pro: 1.6T total params, 49B activated, 1M context window, $0.3969/$0.7938 per M tokens. It is **NOT in stack-versions.json** (which lists flash, glm, qwen, kimi, minimax-m3 only).

The files assign it as "Reviewer 1 — deep algorithmic reasoning" (logic/edge-cases/anti-patterns), paired with Qwen as "Reviewer 2 — security/policy." This is a **two-reviewer sequential chain**, which the existing harness does NOT have. The existing reviewer-loop.ts uses `DEFAULT_MODELS = glm + kimi` with a $2 cap, stateless one-shot dispatch. The model-tiered-agents note explicitly lists an open question: "should the challenger be a *third* family to break correlated bias further?" DeepSeek Pro would be that third family.

**EXTRACT recommendation**: Add `deepseek/deepseek-v4-pro-0813` to stack-versions.json as a candidate for a **second reviewer seat** (logic/algorithmic reasoning), paired with the existing Qwen reviewer (security/policy). This gives the review chain model-family diversity (GLM implementer -> DeepSeek Pro logic-reviewer -> Qwen security-reviewer) which directly addresses the "correlated blind spots" risk documented in the model-tiered-agents note. Do NOT use it as a conductor or implementer — the existing routing is evidence-backed for those seats.

### `reasoning_effort: max` — is it real and useful?

**VERDICT: PARTIAL (real for specific SKU, wrong placement in files).**

- OpenRouter's general `reasoning_effort` enum is: `xhigh, high, medium, low, minimal, none` (https://openrouter.ai/docs/api_reference/parameters). **`max` is NOT in the general enum.**
- HOWEVER, the dated `deepseek/deepseek-v4-pro-0813` SKU is an exception: its `/models` metadata advertises `reasoning: [low, high, max]` and the route accepts them (confirmed via oh-my-pi issue #8517 and OrcaRouter). So `reasoning_effort: max` works **only for the -0813 SKU**, not for other DeepSeek V4 routes.
- The files also place it incorrectly: `options={"provider": {"reasoning_effort": "max"}}` nests it inside the `provider` object, but `reasoning_effort` is a **top-level** parameter (or equivalent to `reasoning.effort`). The `provider` object is for routing preferences (`order`, `only`, `allow_fallbacks`, `data_collection`, `zdr`). The files' placement would be silently ignored.
- DeepSeek's own docs (HuggingFace/DeepInfra) confirm the native API uses `low/high/max` while OpenRouter's normalized API uses `xhigh` as the highest for non-dated SKUs. This `max` vs `xhigh` mismatch has caused real 400 errors across multiple projects (litellm PR #28881, openclaw issue #77350, pi-mono issue #4055).

**EXTRACT recommendation**: If `deepseek-v4-pro-0813` is added as a reviewer, use `reasoning_effort: "max"` (or `"xhigh"` for safety) at the **top level** of the request body, NOT inside `provider`. Pin the dated `-0813` slug explicitly — the undated `deepseek-v4-pro` route is `high`-only on OpenRouter.

### Kimi as researcher instead of escalation-only — is it better?

**VERDICT: REDUNDANT (existing routing is better).**

The files' "Kimi = researcher (long-context extraction)" is factually accurate about Kimi's strengths but **worse** than the existing routing for two reasons:
1. The model-tiered-agents note says flash's 1M context at $0.14/M is the cost-correct option for whole-repo one-shot reasoning. Kimi is significantly more expensive per token. Routine research does not need Kimi's needle-in-a-haystack capability.
2. The existing "kimi = escalation only" discipline is a cost-control guardrail. Re-routing Kimi as the default researcher removes the ceiling. The note's open question ("is kimi ever worth it for implementation?") is answered negatively by the existing "escalate only after 2 failed attempts" policy.

Kimi for research is defensible **only** when the research task specifically requires needle-in-a-haystack extraction across >200K tokens that flash cannot handle — which is a narrow case, not a default routing.

### GLM narrowed to code-gen-only — is it better?

**VERDICT: REDUNDANT (existing broader assignment is better).**

The files assign GLM strictly to "Worker/Builder (code gen)." The existing harness uses GLM as workhorse (implementer + researcher + qa). The existing broader use is **evidence-backed**: Arize (Aug 2026) measured GLM-5.2 tied with Opus 4.8 on task completion at lower cost-per-task. The model-tiered-agents note recommends GLM for synthesis and routine orchestration too. Narrowing GLM to code-gen-only would waste demonstrated capability and force more expensive models (Kimi) into roles GLM handles adequately.

---

## B. OOP -> agentic pattern mapping

**VERDICT: PARTIAL (net-new vocabulary, partially accurate, marginally useful).**

### Accuracy check against existing harness

| Mapping | Files' claim | Existing harness reality | Accurate? |
|---|---|---|---|
| Conductor = Mediator + Command | Conductor mediates between workers, translates intent into JSON commands | AGENTS.md: conductor delegates to subagents, merges results, routes decisions. Backlog tasks with ACs are effectively commands. | **Yes.** |
| Agent loop = Factory Method + Strategy | Factory instantiates generic agent runner, Strategy injects prompts/model slugs at runtime | task-flow.ts dispatches agents; opencode subagent config injects system prompts per role. More dispatcher than classic factory, but the Strategy analogy (swapping behavior via config) holds. | **Partially.** |
| Reviewers = Chain of Responsibility | Sequential verification chain: logic (Pro) then security (Qwen) | reviewer-loop.ts is **stateless one-shot dispatch**, not a sequential chain. The plan describes a reviewer *gate*, not a chain. Parallel reviewers for high-stakes, not sequential. | **No.** The existing harness does NOT implement a sequential review chain. This is a design the files propose, not a description of what exists. |
| Asymmetric escalation = Proxy/Fallback | Wrapper switches model on validation failure | The existing harness has a ladder (flash->glm->qwen->kimi) but escalates the *executor* tier after 2 failed attempts, not the reviewer tier. The files' "reviewer failure -> reasoning_effort bump" is a different mechanism. | **Partially.** Different lever than what exists. |

### Usefulness

Naming these patterns does not change how the harness is built or maintained. The existing AGENTS.md already describes the behavior without OOP names, and the model-tiered-agents note describes the escalation ladder with evidence and failure-mode tables. The OOP vocabulary is a **naming layer**, not an engineering change.

### Net-new?

**Yes, as vocabulary.** The existing harness documentation (AGENTS.md, all research notes, plans) does NOT use OOP pattern names (Mediator, Command, Factory Method, Strategy, Chain of Responsibility, Proxy/Fallback). This is genuinely new terminology.

### Most valuable mapping to formalize

**Chain of Responsibility (sequential logic-then-security review)** — because the existing harness does NOT have this and it's a genuine design question. The existing harness uses a single reviewer gate (or parallel reviewers for high-stakes). The files propose a sequential chain: Reviewer 1 checks logic/algorithmic soundness, Reviewer 2 checks security/policy. This is worth considering as a design option, especially if DeepSeek Pro is added as the logic reviewer and Qwen remains the security reviewer. The order matters: logic failures are cheaper to catch early; security review on already-broken logic wastes tokens.

**EXTRACT recommendation**: Formalize "Chain of Responsibility" as a *design option* for the reviewer loop (not a description of current behavior). Specifically: if a second reviewer seat is added (DeepSeek Pro for logic), the review should be sequential (logic first, security second) rather than parallel, because catching logical errors before security review saves a full review pass. This is a concrete design decision for the plan, not just vocabulary.

---

## C. Asymmetric escalation

**VERDICT: PARTIAL (the "try deeper model before alerting human" concept is net-new; the specific mechanism needs rework).**

### What the files propose
Fast model (Flash) fails validation -> payload refactored -> passed to reasoning model (Pro with `reasoning_effort: max`) -> repaired without human interruption.

### What the existing harness has
- Plan: no-progress detector (same failing-test x2 or diff hash unchanged) -> `session.abort()` -> worktree KEPT -> `stuck` label -> human alerted.
- Model-tiered-agents note: 2 *different* failed attempts -> escalate one tier (flash->glm->qwen->kimi) -> after kimi fails, stop and surface to human.
- reviewer-loop.ts: $2 cap, stateless one-shot, no escalation within the review step.

### What's genuinely net-new
The files introduce a **different escalation lever**: instead of escalating to a *different model* (the existing ladder), escalate the *reasoning depth* at the same model family via `reasoning_effort`. This is a finer-grained lever than "switch to a more expensive model." The existing harness has no equivalent — it jumps from "same tier retry" to "escalate one tier" with nothing in between.

Additionally, the files propose **reviewer-triggered escalation** (reviewer flags failure -> worker re-run with deeper reasoning), while the existing harness only has **executor-triggered escalation** (no-progress detector on the worker). Reviewer-triggered escalation is a different trigger source.

### What it would look like concretely
- **Trigger**: reviewer returns `STATUS: FAILED` (the reviewer-loop.ts already produces free-text VERDICT/FINDINGS — parse for FAIL).
- **Action**: re-dispatch the *worker* (not the reviewer) with a higher `reasoning_effort` setting on a reasoning-capable model (e.g., GLM with `reasoning_effort: high`, or DeepSeek Pro at `max` if added).
- **Budget**: this consumes one additional worker dispatch within the existing $2 reviewer-loop cap. No new budget needed — it's a use of the existing cap.
- **Cap**: one reasoning-depth escalation per task, then fall through to the existing "abort + alert human" path.

### Whether it's worth adding
**Conditionally yes.** The existing "no-progress -> abort -> alert human" path is aggressive — it gives up after detecting no progress without trying a deeper reasoning pass. The intermediate step (try `reasoning_effort: high`/`max` before aborting) could recover tasks that fail due to insufficient reasoning depth, not fundamental impossibility. But it adds latency and cost. The right gate: only trigger reasoning-depth escalation when the failure is a *capability* failure (reviewer found a logic error), not a *transient* failure (rate limit, network). This distinction is already in the model-tiered-agents note (retry vs escalate).

**EXTRACT recommendation**: Add an intermediate escalation step between "2 different failed attempts" and "abort + alert human": one `reasoning_effort: high` re-dispatch of the worker on a reasoning-capable model, within the existing budget cap. Gate it on reviewer-reported capability failures only. If this also fails, fall through to the existing abort+alert path. This is a single concrete addition to the no-progress detector logic.

---

## D. Responsibility distribution matrix

**VERDICT: REDUNDANT.**

The files' matrix: routing (Conductor), state (Python core / JSONL), fallback (programmatic orchestrator), token efficiency (payload constructor).

The existing harness has an equivalent and arguably more complete split:
- Routing/intent: Conductor (AGENTS.md)
- State: task-flow.ts + state (the plan describes state management, the harness tracks task state)
- Fallback/escalation: the ladder + no-progress detector + reviewer-loop.ts
- Token efficiency: headroom compression + prompt-caching config (setCacheKey, sticky routing)

The files' version is neither clearer nor more complete. The one element the files name that the existing docs don't explicitly modularize is "Payload Constructor" as a *named module* — but the existing harness achieves the same via headroom's compression layer and opencode's prompt assembly. No extract.

---

## E. Prompt caching payload structure

**VERDICT: PARTIAL (principle already covered, 4-layer formalization is marginally net-new).**

### What the files propose
Layout: system (pinned) -> references (static) -> history (append-only) -> volatile query (appended last). Claims up to 50% token cost drop.

### What the existing harness already has
The openrouter-prompt-caching note (2026-08-15, status: verified-live) already states:
- "Keep the initial message array bytes IDENTICAL between requests; push dynamic content to the end."
- Has a per-provider caching table (which models cache, at what rate, which need explicit `cache_control`).
- Documents sticky routing, session_id, `setCacheKey`, and the headroom compression-cache pitfall.

The existing note is **more complete** than the files — it has provider-specific cache rates, the Qwen explicit-cache caveat (`qwen3.8-2.4t-a95b NOT listed -> treat as no-cache`), and the sticky-routing interaction. The files have none of this.

### What's marginally net-new
The files' explicit 4-layer naming (system -> references -> history -> volatile) is a slightly more formalized version of "push dynamic content to the end." It gives a name to the "references" layer (large static docs that sit between system and history) which the existing note doesn't explicitly separate. This is a minor formalization, not a new principle.

**EXTRACT recommendation**: If the plan formalizes a payload-construction contract, adopt the 4-layer naming (system -> references -> history -> volatile) as explicit layer names. But the existing note's "push dynamic to end" already encodes the principle. Low priority.

---

## F. ZDR headers

**VERDICT: HALLUCINATED.**

`X-Data-Retention: none` is **not a real OpenRouter header**. Verified against OpenRouter's official ZDR documentation (https://openrouter.ai/docs/guides/features/zdr):

- ZDR is enforced via the **JSON body** `provider.zdr: true` parameter, not an HTTP header.
- The `provider` object accepts: `order`, `only`, `allow_fallbacks`, `data_collection`, `zdr`, `ignore`, `require_parameters`, `quantizations`.
- Per-request: `provider: { zdr: true }` restricts routing to ZDR-compliant endpoints.
- Account-level and guardrail-level ZDR settings also exist, using OR logic with the per-request parameter.

The files' code (`headers = {"X-Data-Retention": "none"}`) would be **silently ignored** by OpenRouter — it's a custom header that OpenRouter does not recognize or act on. Both files repeat this error (File 1 line 126, File 2 line 113).

**EXTRACT recommendation**: None. Do NOT adopt the `X-Data-Retention` header. If ZDR enforcement is desired, use `provider: { zdr: true }` in the request body. Flag this as a hallucination in both source docs.

---

## G. What else?

### G1. Zero-dependency reusable package concept
**VERDICT: PARTIAL (concept exists in plans, Python packaging is wrong).**

The files describe `pip install harness-core` — a zero-dependency Python package abstracting model assignments, parameter tuning, context isolation, and error management from the outer harness. The existing harness already has this concept: the light-factory-plan (2026-08-16) describes an "inner harness bundle" that decouples from opencode. The plan uses TypeScript/bun, not Python. The *concept* of a decoupled inner harness is already in the plans; the *packaging* (Python pip) is mismatched. No extract beyond what the plan already has.

### G2. "Conductor never does work" — already in AGENTS.md
**VERDICT: REDUNDANT.** Both files emphasize "the Conductor never writes raw production code." AGENTS.md already states: "The conductor never grinds: subagents do the work." Identical principle, already documented.

### G3. Dual-reviewer consensus with asymmetric escalation interceptor
**VERDICT: NET-NEW (as a specific wiring).** The files describe a specific wiring: Reviewer 1 (logic) -> if FAIL -> escalate worker to reasoning_effort: max -> Reviewer 2 (security). This specific sequential chain with an inline escalation interceptor between the two reviewers is not in the existing harness. The existing reviewer-loop is parallel/stateless. This is a concrete design option (see section B + C extracts).

### G4. "Enforce Conductor Boundary" checklist item
**VERDICT: PARTIAL.** File 1's verification checklist item: "Guard against logic creep. If the Conductor begins handling actual raw file generation, strip that capability out." This is a useful operational guardrail that AGENTS.md states as a principle but doesn't frame as a *checkable* assertion. Could become a check in a harness health-check script.

**EXTRACT recommendation**: Add "conductor does not write production code" as a machine-checkable assertion in the harness health-check (verify the conductor agent's dispatch log shows zero file-write tool calls). Low priority but cheap to add.

---

## Prioritized EXTRACT list (ranked by value)

1. **Add `deepseek/deepseek-v4-pro-0813` as a second reviewer seat (logic/algorithmic reasoning)** — paired with existing Qwen (security/policy). Gives the review chain 3-family diversity (GLM implementer -> DeepSeek Pro logic -> Qwen security), directly addressing the correlated-blind-spots open question from the model-tiered-agents note. Pin the dated `-0813` slug; use `reasoning_effort: "max"` (or `"xhigh"` for safety) at the **top level** of the request body, not inside `provider`.

2. **Formalize sequential review as "Chain of Responsibility" (logic first, security second)** — if a second reviewer is added, make the chain sequential, not parallel. Logic review catches cheap errors before the more expensive security review runs. This is a concrete design decision for the reviewer-loop, not just vocabulary.

3. **Add reasoning-depth escalation as an intermediate step before abort+alert** — between "2 different failed attempts" and "abort + alert human", insert one `reasoning_effort: high` re-dispatch of the worker on a reasoning-capable model. Gate on reviewer-reported capability failures only. Stays within the existing $2 reviewer-loop cap. One escalation per task, then fall through to abort.

4. **Adopt 4-layer payload naming (system -> references -> history -> volatile)** — if the plan formalizes a payload-construction contract, use these as explicit layer names. The principle ("push dynamic to end") already exists in the prompt-caching note; this just names the layers. Low effort, low risk.

5. **Add "conductor does not write production code" as a machine-checkable health assertion** — verify the conductor dispatch log shows zero file-write tool calls. Cheap to add to the existing health-check script.

## REDUNDANT list (do not extract)

- **Flash as conductor** — contradicts evidence (NVIDIA ToolOrchestra: conductor needs judgment, not speed). Existing routing (GLM conductor, Flash scout) is better.
- **Kimi as default researcher** — cost regression vs flash for long-context one-shot reasoning. Keep Kimi as escalation-only.
- **GLM narrowed to code-gen-only** — wastes demonstrated capability. Existing broad workhorse assignment is evidence-backed.
- **Responsibility distribution matrix** — existing harness has an equivalent and more complete split.
- **"Conductor never does work" principle** — already in AGENTS.md, identical wording.
- **`X-Data-Retention: none` header** — HALLUCINATED. OpenRouter uses `provider: { zdr: true }` in the JSON body. Do not adopt.
- **Python implementation blueprint / `pip install harness-core`** — wrong language/stack. Existing harness is TypeScript/bun. The decoupled-inner-harness concept already exists in the light-factory-plan.
- **`reasoning_effort` inside `provider: {}`** — wrong placement. Must be top-level or inside `reasoning: { effort: ... }`.
- **Model slugs in the files** (`zhipuai/glm-5.2`, `alibaba/qwen-3.8-2t`, `moonshot/kimi-k3`) — all wrong. Use the real slugs from stack-versions.json.

## OPEN questions

- Does `deepseek/deepseek-v4-pro-0813` at $0.3969/$0.7938 per M tokens fit within the existing $2 reviewer-loop cap for typical review payloads? Need to measure cost-per-review-pass.
- Should the sequential review chain (logic -> security) replace the existing parallel reviewer model, or coexist (parallel for high-stakes, sequential for routine)?
- Is `reasoning_effort: "max"` or `"xhigh"` the correct wire value for the `-0813` SKU through the headroom proxy? The max-vs-xhigh mismatch has caused 400 errors across multiple projects — needs a live probe before adoption.
- The `-0813` SKU is a dated release. Does OpenRouter maintain dated SKUs long-term, or will it be deprecated in favor of an undated `deepseek-v4-pro` route (which is `high`-only)? Pinning a dated slug has a maintenance risk.
