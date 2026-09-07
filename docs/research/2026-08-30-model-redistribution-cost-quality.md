---
date: 2026-08-30
topic: Model redistribution — cost-vs-quality rebalancing across the 6-model roster
status: decided
sources:
  - ~/.local/share/opencode/opencode.db (usage, Aug 15-30 2026, mined live)
  - https://openrouter.ai/api/v1/models (live catalog, fetched 2026-08-30)
  - https://openrouter.ai/api/v1/models/<id>/endpoints (per-provider pricing)
  - DeepSeek V4 Flash 0731 model card (vendor, Jul 31 2026)
  - binaryverseai.com deepseek-v4-flash-review (2026-08-01, independent)
  - dev.to brooks_wilson V4 Flash review (2026-08-04, independent)
  - DataLLM Lab V4-Flash review (2026-07-29 pricing capture, executed 9/9 test)
  - aicybr.com V4 Flash complete guide (2026-08-05, independent)
  - avinashsangle.com V4 Flash agentic guide (2026-08-04, independent)
  - stg.bito.ai/benchmarks/ai-coding-model-cost/ (executed coding, 22 models × 60 tasks, token-costed, verified direct 2026-08-30)
  - benchlm.ai best-value-agentic / best-value-coding (cost-adjusted, Aug 2026)
  - buildfastwithai.com / datacamp.com / sandbase.ai GLM-5.3-Flash coverage (2026-08-26/27, vendor + AA Index 57)
  - capitalandcompute.net coding-agent-cost-per-task (2026)
models_used_for_research: [deepseek/deepseek-v4-flash-0731]
supersedes: 2026-08-15-openweight-model-tiers.md
related: TASK-25
---
> Partially supersedes the 2026-08-15 tier doc: this note updates routing; the tier criteria
> (≥1M ctx, open-weights only) carry over unchanged.

# Model redistribution: cost-vs-quality rebalancing (Aug 2026)

## 0. FINAL DECISION (v3, supersedes §5) — 6-model roster (1 definite shed, strict role-scoping)

**Decision: shed glm-5.2 (the value trap). Re-scope qwen3.8 to high-stakes review only (kills $48/period of mis-routed spend without dropping the cheapest review voice). Keep kimi-k3 (escalation ceiling) + minimax-m3 (vision). Captured here as the baseline for weekly re-baselining.**

| Tier | Model | $/M in/out/cache (confirmed 2026-08-30) | Role | Basis |
|---|---|---|---|---|
| Bulk | `deepseek/deepseek-v4-flash-0731` | 0.065 / 0.18 / 0.016 | build, scout, implementer, executor (~70-80%) | 45/60 @ $1.58 — value frontier |
| Conductor | `z-ai/glm-5.3-flash` | 0.075 / 0.25 / 0.015 | conductor, researcher, planning (native multimodal — vision pending dogfood) | replaces glm-5.2 |
| Review/qa | `deepseek/deepseek-v4-pro-0813` | 1.32 / 3.96 / 0.044 | routine diff-review, plan-gate, qa | user pick |
| Review diversity | `qwen/qwen3.8-2.4t-a95b` | 2.00 / 6.00 / 0.25 | **high-stakes reviews only** (merges touching bin/src/, plugins/, opencode config, high-risk plan-gates) | Kimi review fix: cheapest 4th-family reviewer/verdict $0.027 (~half kimi), cache-optimal |
| Escalation | `moonshotai/kimi-k3` | 3.00 / 15.00 / 0.30 | hard escalation only (<5% vol) | SWE-V 93.4 — nothing above it in roster |
| Vision | `minimax/minimax-m3` | 0.30 / 1.20 / 0.06 | vision only (near-free) | $0.02/16d |

**Shed (1, definite):** glm-5.2 ($72/period — the value trap, 34.5/60 @ $12.08 vs flash 45/60 @ $1.58 on Bito, 4% vague-request handling, 48% wasted spend).

**Re-scoped (1):** qwen3.8 — NOT shed. Its $60 total was ~77% mis-routing (explore $28.98 + build $12.78 + plan $4.45 = $46.21 of $60.27). Role-normalized, its legitimate review spend is ~$12/period — cheapest cross-family reviewer per-verdict after glm-5.2 sheds ($0.027 vs kimi's $0.053, ~half). Correct move: strip the mis-routed roles (routing discipline), keep it as the scoped 4th review voice. Correcting the prior draft's error of comparing unnormalized totals.

**Kept (2, escalation + vision):** kimi-k3 (escalation: $20/16d, strongest open, SWE-V 93.4 — the ladder needs a top rung; nothing in roster sits above it) and minimax-m3 (vision: $0.02/16d, only dedicated vision model).

**NOT glm-5.3 (full):** $1.40/$4.40 — the flash tier is the pick at $0.075/$0.25.

### Baseline (measured, committed 2026-08-30)
- Usage window: Aug 15-30 2026. Total spend **$165.16** / ~9k msgs / 16 days.
- Per-model: glm-5.2 $72.34 (44%) · qwen3.8 $60.27 (37%) · kimi-k3 $20.72 (13%) · v4-pro $7.99 (5%) · flash-0731 $3.80 (2%) · minimax <$0.02.
- Per-msg: flash $0.0037 · v4-pro $0.008 · glm $0.026 · qwen $0.033 · kimi $0.018.
- Errors: flash 0.2% < v4-pro 0.5% < glm 0.8% < qwen 1.0% < kimi 1.3%.
- Recent burn (Aug 29-30): glm $63.5, kimi $13.3, qwen $11.5, v4-pro $6.3, flash $3.8 (~$98/2d).

### Prediction (to be verified against actual after TASK-26 rollout)
- **Target: ~$55-75 / 16d (~55-67% cut)** from $165. [Revised again after Kimi review: qwen is re-scoped (kept ~$12 review) not shed, so less removed than the $50-70 draft assumed.]
- Basis: shed glm-5.2 (~$72) removes the cost center. qwen's mis-routed ~$46 (explore/build/plan) is eliminated by routing discipline while ~$12 legitimate review stays. kimi scoped to escalation-only (~$5-8, down from $20.72 — the $13 routine diff-review moves to v4-pro) + minimax (~$0.02) kept. Residual flash/glm-5.3-flash/v4-pro at 9x cheaper per-msg. Directionally grounded, exact mix must be measured.
- Quality: conductor tier *improves on vendor DeepSWE* (glm-5.3-flash 63.4 vs glm-5.2's 46.2, both vendor-reported) — a cost cut AND quality upgrade in one change. [Bito executed 34.5/60 (glm-5.2) is a different suite; like-for-like vendor delta is 63.4 vs 46.2. Independent Bito verification of glm-5.3-flash pending — treat as directional.]
- Guardrails that must hold for the prediction to land: (1) flash/glm-5.3-flash run reasoning high/max; (2) escalation (kimi) ≤ ~15% of spend — consistent with kimi scoped to escalation-only (~$8-11 of $55-75); (3) glm-5.3-flash passes a 1-day dogfood eval, else fallback conductor = v4-pro; (4) qwen strictly scoped to high-stakes reviews — any return of qwen to build/explore/plan counts as a routing regression.

### Vision fallback (resolved: KEEP minimax-m3)
- minimax-m3 costs **$0.02/16d — near-zero**. Resolved KEEP: it de-risks glm-5.3-flash's only multimodal claim (v4-pro-0813 is text-only, verified). The only way minimax leaves the roster is if glm-5.3-flash's vision proves reliable in dogfood AND a cost case emerges — neither is true today.

### Escalation tier (resolved: KEEP kimi-k3)
- The note's §4 ranks kimi-k3 (SWE-bench Verified 93.4) as the strongest open model. Resolved KEEP: escalation is where paying for the ceiling is justified (<5% volume, ~$20/16d), and nothing in the roster sits above it. Revisit only if v4-pro benches at or above kimi on executed coding (inversion trigger, carried to TASK-26).

### Re-baseline cadence (finding: glm-5.2 moved 2.5x in 15 days)
- Monthly re-derivation is too slow given observed drift. Move to **weekly** pricing + usage recompute (stack-check.ts already runs weekly); trigger a re-decision on >25% tier price movement. "$/task" = total tier spend ÷ completed tasks, recorded per window.

## 1. What this project actually does (from usage)

Work profile mined from opencode.db, Aug 15-30 2026: agentic tool loops —
backlog CLI, git/worktree lifecycle, bun/TS harness scripts, opencode config,
markdown docs, subagent fan-out (scout/researcher/reviewers/plan-gate), spec-driven
tasks. ~9k messages, $165.16 total spend over 16 days.

### Per-model spend (assistant messages only)

| Model | msgs | cost $ | % of spend | err rate | cache_read tok | input tok |
|---|---|---|---|---|---|---|
| z-ai/glm-5.2 | 2767 | 72.34 | 44% | 0.8% | 206M | 18.8M |
| qwen/qwen3.8-2.4t-a95b | 1835 | 60.27 | 37% | 1.0% | 117M | 11.5M |
| moonshotai/kimi-k3 | 1150 | 20.72 | 13% | 1.3% | 14M | 3.4M |
| deepseek/deepseek-v4-pro-0813 | 986 | 7.99 | 5% | 0.5% | 42M | 8.5M |
| deepseek/deepseek-v4-flash-0731 | 1243 | 3.80 | 2% | 0.2% | 162M | 17M |
| minimax/minimax-m3 | 6 | 0.02 | <1% | — | — | — |

Per-message cost (rough efficiency measure): flash $0.003, v4-pro $0.008,
kimi $0.018, glm $0.026, qwen $0.033.

### Where the money goes (agent role x model, top lines)

| role | model | msgs | cost $ |
|---|---|---|---|
| build | glm-5.2 | 1457 | 48.59 |
| explore | qwen3.8 | 693 (one-day spike, Aug 15) | 28.98 |
| diff-reviewer-kimi | kimi-k3 | 245 | 12.79 |
| build | qwen3.8 | 279 | 12.78 |
| diff-reviewer-qwen | qwen3.8 | 459 | 12.33 |
| plan | glm-5.2 | 190 | 10.71 |
| build | v4-pro-0813 | 661 | 5.34 |
| plan | qwen3.8 | 67 | 4.45 |
| implementer | glm-5.2 | 265 | 4.39 |
| build | flash-0731 | 961 | 3.56 |
| build | kimi-k3 | 601 | 3.24 |
| diff-reviewer-glm | glm-5.2 | 151 | 2.71 |
| diff-reviewer-deepseek | v4-pro-0813 | 244 | 2.52 |

### Recent burn rate (last 2 days, Aug 29-30: ~$98)

glm $63.5, kimi $13.3, qwen $11.5, v4-pro $6.3, flash $3.8. glm is 65% of
recent daily spend — it is the cost center.

## 2. Live pricing (verified 2026-08-30, OpenRouter catalog + endpoints)

| Model | catalog $/M in/out | cache $/M | cheapest provider in/out | drift vs stack doc |
|---|---|---|---|---|
| z-ai/glm-5.2 | 1.19 / 3.74 | 0.221 | StreamLake 0.33/1.03 | **UP 2.5x** (doc: 0.462/1.452) |
| deepseek/deepseek-v4-flash-0731 | 0.065 / 0.18 | 0.016 | OpenInference 0.03/0.16 | output UP +40% (doc: 0.129) |
| deepseek/deepseek-v4-pro-0813 | 1.32 / 3.96 | 0.044 | — | UP ~3x (doc: 0.435/0.87) — cheapest endpoint StreamLake 1.12/3.36 |
| qwen/qwen3.8-2.4t-a95b | 2.00 / 6.00 | 0.25 | SiliconFlow/Modal/Alibaba | flat |
| moonshotai/kimi-k3 | 3.00 / 15.00 | 0.30 | — | flat (no drop) |
| minimax/minimax-m3 | 0.30 / 1.20 | 0.06 | — | flat |

Key pricing finding: **glm-5.2 catalog price rose ~2.5x since the Aug 15 tier
doc**. Its historical cost advantage over qwen/kimi is eroded: on output it is
now 1.6x cheaper than qwen (6.00/3.74) and 4.0x cheaper than kimi (15.00/3.74),
down from the ~3x/5x the Aug 15 doc implied. flash-0731 is ~10-20x cheaper than
glm and now beats it on tool-shaped benchmarks (see §4).

## 3. Usage-driven findings

1. **glm-5.2 is the cost center** (44% of spend, 65% of recent burn) because it
   is the `build`/workhorse default AND the conductor default. 1,457 `build`
   msgs at $48.59 — the single biggest line.
2. **flash-0731 is the hidden hero**: 1,243 msgs / 17M input tok / 162M cache
   read for $3.80, err 0.2% (lowest in roster). Its 961 `build` msgs cost
   $0.0037/msg vs glm's $0.026/msg — **7x cheaper per message** in the same role
   ($3.80 vs $48.59 build lines).
3. **qwen3.8 is doing work it shouldn't at premium rates — but its legitimate review is the cheapest CROSS-FAMILY voice**: $60 total, but ~77% was mis-routing (explore $28.98 at $2/$6 — recon belongs on flash at 1/30th; build $12.78; plan $4.45). Role-normalized: only **$12.33 (20%)** went to its designated diff-review role, at **$0.027/verdict — roughly half kimi's $0.053**, with cache economics (117M reads at $0.25/M) structurally suited to high-context review. [Note: not literally cheapest in stack — diff-reviewer-deepseek is $0.010 and diff-reviewer-glm $0.018/verdict, but both are being kept as deepseek/z-ai voices; qwen is the cheapest 4th-family voice.] **Correct action: strip the mis-routed roles via routing discipline (saves ~$46/period), keep qwen as the scoped 4th-family high-stakes review voice.** Dropping it would reduce cross-family diversity from 4 families to 3, with 2 of 3 remaining being DeepSeek-family (flash + v4-pro) — the redundancy is INSIDE deepseek, not qwen.
4. **kimi-k3 as regular diff-reviewer is expensive**: $12.79 on 245 diff-review
   msgs at $3.00/$15.00. Note: kimi is NOT cheaper than qwen on price (3.00/15.00 vs 2.00/6.00 = +50% input, +150% output) — it only looks cheaper *in total* because routing restricts it to escalation. Kimi is the escalation model (roster intent); using it as a routine reviewer conflicts with that.
5. **Error rates**: flash 0.2% < v4-pro 0.5% < glm 0.8% < qwen 1.0% < kimi 1.3%.
   flash is the most reliable in this stack's actual usage.

## 4. Aug-2026 open-weight benchmark evidence (for THIS profile)

DeepSeek V4 Flash 0731 (Jul 31 re-post-train, same 284B/13B arch) is the
defining event. Vendor-reported (DeepSeek Harness, max reasoning effort — treat
as upper bound):

| Benchmark | Flash 0731 | GLM-5.2 | V4-Pro-Prev | Opus 4.8 |
|---|---|---|---|---|
| Terminal Bench 2.1 | 82.7 | 81.0 | 72.1 | 85.0 |
| NL2Repo | 54.2 | 48.9 | 38.5 | 69.7 |
| DeepSWE | 54.4 | 46.2 | 12.8 | 58.0 |
| Toolathlon (verified) | 70.3 | 59.9 | 55.9 | 76.2 |

Independent (DataLLM Lab, executed code, Jul 2026): Flash 9/9, cost $0.20/1k
tasks vs GLM-5.2 $1.99/1k and Opus 4.8 $4.05/1k. Dev.to hands-on: Flash matches
1.6T Pro on reasoning at top end, clears Pro preview on agentic coding; strongest
on TS/JS/frontend (this project = bun/TS), falls off on Rust/Swift.

Flash's known limits (independent, multiple sources): long-horizon planning
coherence (Agents' Last Exam 25.2 vs GPT-5.6 Terra 50.4 — both per
avinashsangle.com comparison table), text-only (no vision), reasoning effort must
be high/max or the gains collapse (LiveCodeBench 55 non-think → 88 high → 92 max,
per DeepSeek model card comparison-across-modes).

Roster ranking for THIS project (agentic TS tool loops) — SUPERSEDED for
glm-5.2 (shed in §0); the active roster is §0's 6-model table:
1. flash-0731 — tool execution, terminal, subagent fan-out (cheapest + now
   benchmark-leading on tool work)
2. glm-5.3-flash — conductor/planning (replaces glm-5.2: DeepSWE 63.4 vs 46.2,
   same family; glm-5.2 shed in §0)
3. v4-pro-0813 — qa/E2E + routine review ($1.32/$3.96, text-only, low err; ~glm-5.2 price but glm is shed — v4-pro stays cheaper than qwen/kimi, the retained review-tier alternatives)
4. qwen3.8 — high-stakes cross-family reviews only (cheapest 4th-family voice)
5. kimi-k3 — escalation only, high-stakes reviews (SWE-bench Verified 93.4,
   strongest open-weight, per aicybr comparison table)
6. minimax-m3 — vision only

## 5. Proposed redistribution (SUPERSEDED by §0 final decision — kept for audit trail)

| Role | Was | Should be | Why | Est. effect |
|---|---|---|---|---|
| build/executor (tool-shaped steps) | glm default | **flash-0731** | beats glm on every tool bench at 1/10 cost, 0.2% err | biggest win |
| conductor/architecture | glm | glm | planning + long-horizon; flash "executes, doesn't plan" | keep |
| multi-file feature / UI shipping | glm | glm | reliability tax worth it on the hard 15-20% | keep |
| implementer (TDD plan steps) | glm | **flash for routine, glm for hard** | flash 9x cheaper/msg, err lower | — |
| scout / explore / internal recon | mixed (qwen/glm) | **flash** | recon = cheap + 1M ctx | close the $29/mo spike risk |
| researcher (WHAT/WHY, external) | glm | glm | knowledge gap is flash's weak spot | keep |
| plan-gate + diff-review cross-family | qwen/glm/kimi/deepseek | **qwen/glm/deepseek (routine) + kimi (high-stakes only)** | one per family preserved: qwen, glm, deepseek(v4-pro) + kimi on high-stakes; drop kimi from ROUTINE rotation | save ~$10/period (kimi routine $12.79 line → stakes-only) |
| qa / E2E | v4-pro-0813 | v4-pro-0813 | low err, cheap-ish, text loops | keep |
| escalation (2 failed) | kimi-k3 | kimi-k3 | strongest open model | keep |
| vision | minimax-m3 | minimax-m3 | only vision | keep |

Target split: ~60-70% flash / ~20% glm / ~10% review+gate models. The target
split is a directional target, not a measured projection — the one grounded
saving is the kimi demotion (removes the $12.79 routine-review line). The
build/glm shrinkage is conditional: 1,457 build msgs at $48.59, and flash build
msgs already run 9x cheaper ($0.0037 vs $0.033/msg). If ~half of glm's build msgs
are tool-shaped enough to move, the order-of-magnitude is ~$20/period saved —
but the exact fraction must be measured, not assumed. qwen explore mis-routes
eliminated; kimi demoted from routine review.

### Guardrails (binding, from evidence)

1. flash must run with reasoning effort high/max — non-think mode is a different,
   much weaker model. This is the #1 way the 70-80%-flash claim dies.
2. Give flash the step, not the goal — conductor holds the plan, flash executes
   tool steps with tests verifying each. DeepSeek's own Claude-Code mapping puts
   Flash in the subagent slot, not the main loop.
3. Escalate to v4-pro after 1 failed re-attempt on tool-shaped work. Rationale:
   flash's token overhead (~24% more tokens/turn, more turns on gnarly tasks,
   per dev.to review) means the real flash-vs-v4-pro advantage on hard tasks is
   roughly 3x, not the ~10x sticker gap — a failed re-attempt is cheaper to hand
   to v4-pro than to burn twice on flash.
4. glm-5.3-flash is 4 days old (vendor/AA numbers only) — dogfood it as conductor
   for 1 day before trusting it; fallback = v4-pro on any tool-call schema failure
   or quality drop. It natively handles vision, folding minimax-m3's role.

## 6. Open items / verification gaps

- The Aug-15 explore/qwen spike needs a routing-config guardrail (scout agent
  pinned to flash-0731) — carried into TASK-26.
- glm-5.2 price drift (2.5x) documented; glm-5.2 is retired so the drift is moot
  but the lesson stands: re-verify prices weekly via stack-check.ts.
- Benchmark numbers are vendor-reported at max reasoning; expect divergence on
  independent runs. The only independent executed+tokencosted evidence is Bito
  (verified direct 2026-08-30) — treat its ordering as the quality floor.

## 7. Closed-weight decision (consulted GLM + Kimi, independently)

**No closed model earns a tier.** Verified on Bito (executed, token-costed):
gpt-5.6-luna 42/60 @ $3.17 is dominated by flash-0731 (45/60 @ $1.58) on both
axes; gemini-3.1-flash-lite 31.5/60 too weak; gpt-5.6-terra 44/60 @ $27.12 and
claude-sonnet-5 43.5/60 @ $17.63 both dominated by kimi-k3 (47/60 @ $12.75);
claude-haiku-4.5 200K ctx + 78% wasted spend. grok-4.5 (53/60 @ $14.70) is the
only non-dominated closed model and is CHEAPER than kimi-k3 on price
($2.00/$6.00 vs kimi $3.00/$15.00) — a genuine escalation challenger (+6 pts
over kimi at ~15% higher Bito task cost), insurance for the ~1% case. Since kimi
is KEPT for escalation (see §0), the grok-vs-kimi escalation slot should be
decided by head-to-head in TASK-26, not by this table alone. Open-weight wins
the value math at every tier of THIS workload.

## 8. Next step (implementation task, NOT this task)

TASK-26: apply the 6-model roster with strict role-scoping — opencode.jsonc
model/small_model routing, stack-versions.json, AGENT-STACK-RUNBOOK §3 agent
definitions, AGENTS.md model-routing table + escalation ladder, and a full
stale-doc sweep (repoint or retire every reference to glm-5.2 as ACTIVE routing;
qwen3.8 re-scoped to high-stakes review; kimi-k3 + minimax-m3 scoped to
escalation/vision-only). Guardrail: config-only PR, verified by stack-check.ts
drift report + a 1-week usage comparison against THIS baseline ($165/16d →
target $55-75/16d). Open items to settle at TASK-26 spec review: (a) grok-vs-kimi
escalation head-to-head, (b) v4-pro-vs-kimi executed benchmark (inverts the
kimi-keep if v4-pro wins), (c) glm-5.3-flash 1-day dogfood (fallback = v4-pro).