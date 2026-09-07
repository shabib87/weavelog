# Open-Weight Tier Evaluation — Full Pricing and Quality Matrix (TASK-61)

**Date:** 2026-09-07
**Task:** TASK-61 (Dynamic model routing research spike) — evidence base, Phase 1
**Status:** Pricing matrix complete for all seven candidates. Escalation decision tree (AC #2) is now carried by ADR-004 (L0-L4 ladder, risk-signal triggers); role-to-tier mappings (AC #3) are below. Remaining open: per-provider cache discounts, TTFT/TPS/tool-call accuracy (partial AC #1). Note-only spike; no model config changed.

## Human decisions recorded this session (AC #4)

- **GLM 5.2 is dropped** as default (human statement, 2026-09-07; it is already superseded in the roster's intent).
- **Kimi K3 is kept** in the pro/frontier tier (human decision answering the keep-vs-drop question). The $3/$15 seat survives on differentiation grounds (cross-family advisor, image input, 1M context), not on price.
- **Human's target shape:** pro tier = DeepSeek V4 Pro 0813, Qwen3.8-2.4T, GLM-5.3, Kimi K3; fast tier = DeepSeek V4 Flash 0731, GLM-5.3-Flash, Qwen3.8-Flash. Goal: best performance per dollar on open weights.
- **qwen3.8-max** (in the original TASK-61 flagship list, absent from the human's lean): evaluated on merit below; recommendation is to drop it (no niche the 2.4T variant does not cover at equal price).

## Verification (Tavily, 2026-09-07)

The two secondhand sources were re-verified by direct extraction of the
official vendor pages (docs.z.ai/guides/overview/pricing and
api-docs.deepseek.com/quick_start/pricing):

- **DeepSeek official card confirms all figures:** V4 Pro 0813 $0.66 / $0.022
  cached / $1.98 output off-peak; V4 Flash 0731 $0.22 / $0.007 / $0.66;
  peak = 2x on every rate; 1M context, 384K max output. Correction: peak
  hours are 01:00–04:00 and 06:00–10:00 UTC **Monday–Friday only** (weekends
  are always off-peak). Concurrency: Pro 500, Flash 2500.
- **GLM-5.3 official card confirms** $1.4 / $0.26 / $4.4.
- **GLM-5.3-Flash promo deadline confirmed:** 50% discount ($0.075 / $0.015 /
  $0.25) ends 24:00 on 2026-09-09 (UTC+8). List price thereafter:
  $0.15 / $0.03 / $0.50.
- **New fact:** GLM-5.2 and GLM-5.3 carry identical pricing ($1.4 / $0.26 /
  $4.4) on the official card. Dropping GLM 5.2 for GLM 5.3 is therefore a
  free upgrade at the same rates.
- **Cheaper legacy option surfaced:** GLM-4.7-FlashX ($0.07 / $0.01 / $0.4)
  and GLM-4.7-Flash (free) undercut GLM-5.3-Flash's post-promo list price for
  pure text docs/budget work. Quality delta unverified; candidate for the
  docs seat, not validated.

## OpenRouter verification (live API, 2026-09-07)

The routing target is OpenRouter, so its live per-model pricing
(openrouter.ai/api/v1/models) is authoritative for cost math. Per 1M tokens:

| Model (OpenRouter slug) | Input | Cache read | Output |
|---|---|---|---|
| deepseek/deepseek-v4-pro-0813 | $0.66 | $0.022 | $1.98 |
| deepseek/deepseek-v4-flash-0731 | **$0.14** | $0.028 | **$0.28** |
| deepseek/deepseek-v4-flash (non-0731 slug) | $0.089 | — | $0.177 |
| z-ai/glm-5.3 | $1.40 | $0.26 | $4.40 |
| z-ai/glm-5.3-flash | **$0.075** (promo, live) | — | **$0.25** |
| qwen/qwen3.8-2.4t-a95b | $2.00 | $0.25 | $6.00 |
| qwen/qwen3.8-flash | $0.15 | $0.016 | $0.47 |
| moonshotai/kimi-k3 | $3.00 | $0.30 | $15.00 |
| z-ai/glm-5.2 | $0.966 | $0.193 | $3.036 |

Findings that change the cost math:

1. **DeepSeek peak/off-peak does not pass through OpenRouter.** The listed
   deepseek-v4-flash-0731 route is $0.14/$0.28 flat — below DeepSeek's own
   off-peak ($0.22/$0.66), implying third-party serving with no peak
   multiplier on the listed route. The peak-hours caveat applies only if a
   routing config pins DeepSeek's first-party endpoint.
2. **GLM-5.2 is NOT a free upgrade on OpenRouter.** Z.ai first-party prices
   5.2 and 5.3 identically ($1.4/$4.4), but OpenRouter lists 5.2 at
   $0.966/$3.036 — 31% cheaper. The 5.2 → 5.3 default upgrade costs +45%
   input / +45% output on OpenRouter. Quality delta must justify it.
3. **GLM-5.3-Flash promo pricing is live on OpenRouter** ($0.075/$0.25), so
   the Sept 9 deadline applies to OpenRouter usage too; expect reversion to
   $0.15/$0.50 after.
4. **deepseek-v4-flash-0731 cache read is higher on OpenRouter** ($0.028 vs
   official $0.007). System-prompt-heavy roles should weigh that; uncached
   loop traffic still wins big.
5. Two OpenRouter oddities flagged unverified per AC #6: the
   deepseek-v4-pro-0813:batch variant lists $1.32/$3.96 (higher than
   non-batch, inverted from OpenRouter's usual batch discount), and a
   cheaper non-0731 deepseek-v4-flash slug ($0.089/$0.177) exists whose
   snapshot version is unclear.

## DeepSeek peak hours in ET (only for first-party DeepSeek endpoint)

Official peak windows are 01:00–04:00 and 06:00–10:00 UTC, Monday–Friday.
In Eastern Time (EDT, UTC-4 in September): **9:00 PM–midnight ET nightly
(Sunday through Thursday evenings) and 2:00–6:00 AM ET on weekday mornings.**
Everything else — including all weekend and Friday 6:00 AM ET onward — is
off-peak. On OpenRouter's listed route this schedule is irrelevant (flat
pricing, finding 1 above).

## Pro/frontier tier pricing (USD per 1M tokens)

| Model | Input | Cached input | Output | Context | Source | Verified? |
|---|---|---|---|---|---|---|
| DeepSeek V4 Pro 0813 | $0.66 | $0.022 | $1.98 | 1M in / 384K out | api-docs.deepseek.com official card (extracted) | Vendor-reported, **verified** |
| GLM-5.3 | $1.40 | $0.26 | $4.40 | — | docs.z.ai pricing (official, extracted) | Vendor-reported, **verified** |
| Qwen3.8-2.4T-A95B (Singapore) | $2.00 | $0.25 | $6.00 | 1M | alibabacloud.com model page | Vendor-reported |
| Qwen3.8-2.4T-A95B (Beijing) | $1.65 | $0.21 | $4.95 | 1M | same | Vendor-reported |
| Kimi K3 | $3.00 | $0.30 | $15.00 | 1M | platform.kimi.ai/docs/pricing/chat-k3 | Vendor-reported |
| Qwen3.8-Max | $2.00 | $0.25 | $6.00 (Alibaba); DeepInfra $1.65/$4.95 | 1M | openrouter.ai/qwen/qwen3.8-max | Vendor-reported |

**DeepSeek peak/off-peak warning:** peak/off-peak billing started 2026-08-16.
Peak windows 01:00–04:00 and 06:00–10:00 UTC, **Monday–Friday only**;
weekends are always off-peak. Peak doubles every rate: V4 Pro peak =
$1.32 in / $0.044 cached / $3.96 out. Off-peak = the table above. Also note
the Pro concurrency limit is 500 vs Flash's 2500 (official rate card).
Cost math must assume peak-hour ceilings for any role that runs around the
clock on weekdays.

## Fast/flash tier pricing (USD per 1M tokens)

| Model | Input | Cached input | Output | Context | Modalities | Source | Verified? |
|---|---|---|---|---|---|---|---|
| DeepSeek V4 Flash 0731 | $0.22 | $0.007 | $0.66 | 1M in / 384K out | text | api-docs.deepseek.com official card (extracted) | Vendor-reported, **verified** |
| GLM-5.3-Flash | $0.15 | $0.03 | $0.50 | — | text | docs.z.ai pricing (official, extracted) | Vendor-reported; 50% promo ($0.075/$0.015/$0.25) verified, ends 2026-09-09 24:00 UTC+8 |
| Qwen3.8-Flash (Singapore) | $0.15 | $0.016 | $0.47 | 1M | text + image + video | alibabacloud.com model page | Vendor-reported |
| Qwen3.8-Flash (other regions) | $0.113 | $0.014 | $0.382 | 1M | text + image + video | same | Vendor-reported |

DeepSeek Flash peak = $0.44 / $0.014 / $1.32 (2x off-peak, same windows).

Do not confuse **Qwen3.8-Flash** (the production multimodal fast model) with
**Qwen3.8-Flash-Next** (a 125B/6B-active open-weight preview, 262K context);
the latter is a different artifact and is out of scope for this roster.

## Quality evidence

### Pro tier

- **GLM-5.3 vs Kimi K3 (independent, FriendliAI 2026-08-24):** AA Intelligence
  Index tie at 60. SWE-bench Verified 94.2% vs 93.8%; Terminal-Bench 2.1 86.5%
  vs 80.9%. GLM-5.3 cheaper per task on SWE-bench in all categories. Kimi K3
  unique wins: 16 exclusive SWE tasks (vs GLM's 18), UI/visual refinement,
  image input, 1M context. Best-of-both selection: 97.4% SWE-bench.
- **DeepSeek V4 Pro 0813:** described as the best-documented production
  endpoint of the three (kingy.ai comparison), but benchmark numbers are
  **contradictory across sources** (Terminal-Bench version mismatches, DeepSWE
  62.7 in one source, absent in others). Per AC #6, no comparative figure is
  asserted as fact. Its price advantage ($0.66/$1.98, cheapest pro-tier model
  by 2x+) is the solid, verifiable part.
- **Qwen3.8-2.4T-A95B:** vendor-reported GPQA Diamond 92.6, PaperBench 93.0,
  OSWorld 86.1; 4th on CodeArena. No independent head-to-head found.
- **GLM-5.3 vendor launch claims:** Terminal-Bench 3.0 28.3 (from 4.6 on
  GLM-5.2), DeepSWE v1.1 66.9%, #1 CyberGym. Vendor-reported, marked unverified.

### Fast tier

- **DeepSeek V4 Flash 0731:** vendor-reported Terminal-Bench 2.1 82.7, NL2Repo
  54.2, Toolathlon Verified 70.3; explicitly adapted for Codex-style agent
  workflows and Responses API. Strongest documented tool-bench evidence in the
  fast tier, at $0.22/$0.66.
- **Qwen3.8-Flash:** 1M context, native image+video input, 1M chain-of-thought
  headroom; strongest modality coverage in the fast tier. Independent
  benchmarks thin; vendor positioning is speed/agentic.
- **GLM-5.3-Flash:** no independent quality data gathered this session;
  currently the cheapest listed rates in the tier once the 50% promo applies.

## Bang-for-buck read (per-dollar, quality caveats applied)

1. **DeepSeek V4 Pro 0813** is the cheapest pro-tier model by a wide margin
   (2.1x cheaper on output than GLM-5.3, 7.6x than Kimi K3) with the caveat of
   peak-hour doubling and unverifiable comparative quality. Natural default /
   worker seat.
2. **GLM-5.3** is the best-evidenced agentic coder among the four pro models
   at mid-tier price. Natural implementation/escalation seat.
3. **Kimi K3** is not price-competitive; it earns its seat on differentiation
   (cross-family advisor, image input, 1M context). Invoke on failure or
   multimodal need only.
4. **Qwen3.8-2.4T** is a second-family reviewer at roughly GLM-5.3 prices
   (Singapore) and cheapest via Beijing. Researcher/reviewer seat.
5. **Qwen3.8-Max** duplicates Qwen3.8-2.4T pricing with no identified edge.
   Recommend dropping from the roster.
6. **Fast tier:** all three are within noise of each other on price
   ($0.113–0.22 in, $0.382–0.66 out). Route by strength: DeepSeek Flash for
   tool/agent loops, Qwen Flash for anything needing image/video or 1M
   context cheaply, GLM Flash for text-only docs/budget work while the promo
   lasts.
7. **UI seat upgrade candidate:** the roster's current vision reviewer
   (kimi-k2-7-ui, $0.74/$3.50) is 5–7x pricier than Qwen3.8-Flash
   ($0.15/$0.47 Singapore) which also carries image+video input and a 1M
   window. Qwen3.8-Flash is the obvious replacement candidate for the UI seat
   in Phase 2, pending a visual-diff validation run.

## Humanity's Last Exam (HLE) cross-check

Approximate, with-tools, source-inconsistent (BenchLM / AI Release Tracker
snapshots, 2026-08). Marked unverified per AC #6; treat as secondary signal:

| Model | HLE (with tools, approx.) |
|---|---|
| GLM-5.3 | ~62.5% |
| DeepSeek V4 Pro 0813 | ~60.0% |
| Kimi K3 | ~56% |
| Qwen3.8-2.4T | tracked, figure not cleanly confirmed |

HLE is a knowledge/reasoning exam, not an agentic-coding benchmark. It frames
the deep-knowledge seats (researcher, escalated reviewer, security) and does
NOT frame implementer/worker/scout seats — those follow SWE-bench /
Terminal-Bench / tool-call evidence. GLM-5.3 leads the four on HLE, which is
consistent with giving GLM-5.3 (non-flash) the escalated-review seat.
**Protocol caveat (final review):** the table above is BenchLM-advisory;
under the governing AA protocol (ADR-004) Kimi K3 (46.9) leads GLM-5.3
(42.3). GLM-5.3's escalated-review seat rests on the agentic instruments
(TB 2.1 / SWE-bench Pro), not on these knowledge figures.

**AC #1 disposition (final review, 2026-09-07):** split. TTFT/TPS/tool-call
accuracy are runtime observables — deferred to Phase-2 config + TASK-47/
stack-check telemetry. Per-provider cache discounts (Baseten/DeepInfra/
NovitaAI/SiliconFlow published card rates) are STATIC provider-card facts
inside this spike's caching-audit scope — captured as a Phase-2 acceptance
line (static pull), not runtime telemetry.

## Role-to-tier distribution (AC #3 draft, human-decided inputs)

Decisions recorded 2026-09-07: GLM-5.3-Flash is the conductor/default seat
(matching payload; note: weavelog 0.1.0 targets the opencode host only — pi
host config changes are deferred to 0.2.0, so "default" here means the
payload/opencode conductor and the future pi seat). Plan review and diff review run flash-first and escalate
to pro on cost/quality need. Access removed for anything outside the
7-model roster (minimax-m3, deepseek-v4-flash-vision-exp; qwen3.8-max and
glm-5.2 already out).

Flash tier (always-on, bulk):
- conductor/default seat: glm-5.3-flash (opencode host at 0.1.0; pi deferred to 0.2.0)
- implementer / worker loops: deepseek-v4-flash-0731 (best tool-bench
  evidence, $0.14/$0.28 flat on OpenRouter)
- scout: deepseek-v4-flash-0731 (1M context reads)
- vision/UI/screenshots: qwen3.8-flash (replaces vision-exp and minimax)
- docs/budget text: glm-5.3-flash

Pro tier (escalation ladder, cheapest first):
1. deepseek-v4-pro-0813 — first escalation, same-family quality bump
2. glm-5.3 — escalated reviewer (HLE leader of the four; cross-family vs the
   deepseek implementer)
3. qwen3.8-2.4t-a95b — architecture-heavy plan review, second-family lens
4. kimi-k3 — frontier reasoning + multimodal, only when the first three fail
   or image input is required

Diff-review rule: reviewer family must differ from maker family for final
review rounds (implementer is deepseek → glm/qwen/kimi review; deepseek-pro
only for same-family quick rechecks). Finding: security.md currently runs on
glm-5.3-flash — flag for escalation to the pro ladder.

## Three-family review record (2026-09-07, maker/checker applied to policy)

The ADR and this note were reviewed by three independent model families:
DeepSeek V4 Pro 0813 (codex profile consult), GLM-5.3 and Qwen3.8-2.4T
(pi subagent reviewers, parallel). All three APPROVE the seat-weighted
composite and HLE elevation; all three rate the evidence base "needs work"
with converging P1 fixes, now applied:

1. **Cross-family rule made relational** (GLM + Qwen): "family" = vendor;
   final approval = lowest rung with a different vendor than the maker.
   Hard-coding "implementer is deepseek" made cheapest-first illusory and
   let GLM flagship reviewers bless their own family's flash output
   (L0 glm-5.3-flash and L2 glm-5.3 are the same vendor).
2. **HLE contradiction resolved** (GLM + Qwen): the Consequences section
   still said "demoted to tiebreakers" while the Decision made HLE primary.
   Fixed; closed-book HLE demoted, HLE-with-tools primary under protocol pin.
3. **HLE figure conflict governed** (Qwen + GLM): research note's ~62.5
   (BenchLM protocol) vs ADR's 42.3 (AA protocol) for GLM-5.3 was a 20-point
   swing on the escalation boundary. ADR now names Artificial Analysis as
   the governing HLE source; other figures are protocol-tagged advisory.
4. **Trigger determinism** (GLM): complexity/coupling triggers were
   unspecced and gameable by splitting into helpers. Now: deterministic AST
   check in weavelog check, computed on merged diff vs base; Phase-2
   acceptance test required.
5. **DoD additions adopted:** figure-reconciliation audit (every ADR number
   must match its tagged source) and a conflict-resolution rule (when
   sources disagree, the governing snapshot/protocol is named, not just
   provenance-tagged).

## Deterministic re-adjustment cadence (AC #5 supplement)

Already planned in the repo (do not rebuild): `src/tools/sync-model-pricing.ts`
(OpenRouter -> litellm, `--check` drift mode), `stack-check.ts` weekly
LaunchAgent (Sunday 09:00), and a quarterly tier refresh in model-routing.md.
**Superseded 2026-09-07 (session 5): quarterly is replaced by MONTHLY deep
refresh** — the governing cadence is ADR-004 Consequences; do not implement
the quarterly protocol. Remaining reviews add the missing deterministic input:

- Pinned OpenRouter `/api/v1/models` snapshot committed to the repo.
- Weekly gate fails on: >=10% price delta on any roster model, new slug in a
  monitored family (z-ai, deepseek, qwen, moonshotai), removed/renamed
  roster slug.
- Any hit auto-generates a human decision brief (backlog issue) and marks
  the roster config stale until acknowledged.

This extends TASK-61 Phase 2 (static adoption) and feeds Phase 3 (dynamic
routing). New-model detection is the piece that did not exist in prior plans.

## Open items (unchanged from TASK-61 scope)

- AC #1 gaps: per-provider cache discounts (Baseten, DeepInfra, NovitaAI,
  SiliconFlow), TTFT, TPS, tool-call accuracy for all seven.
- AC #2: escalation decision tree with concrete thresholds.
- AC #3: role-to-tier mappings for Low-Budget vs High-Precision modes and the
  OpenRouter routing config spec.
- Independent quality validation: every figure above except the FriendliAI
  GLM/Kimi eval is vendor-reported or secondhand (AC #6 flags apply).
- Phase 2 adoption task (roster + agent files + opencode.jsonc + manifest
  models) remains sequenced after TASK-56; human decisions recorded here are
  its inputs.
