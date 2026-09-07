---
id: TASK-61
title: >-
  Dynamic model routing research — OpenRouter pricing/caching audit +
  flash-vs-flagship escalation heuristics + Kimi K3 roster question (spike)
status: Done
assignee: []
created_date: '2026-09-06 17:52'
updated_date: '2026-09-06 21:54'
labels: []
milestone: m-7
dependencies:
  - TASK-56
references:
  - 'https://openrouter.ai/models'
  - 'https://openrouter.ai/docs/features/prompt-caching'
priority: high
type: spike
ordinal: 49000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Research spike (September 2026 state): build the evidence base for a dynamic, data-driven OpenRouter routing engine for the harness — moving beyond the static 1:1 role assignments in docs/architecture/model-routing.md (snapshot 2026-08-30). Goal: best performance per dollar spent (prompt-caching economics, tool-call reliability, latency vs throughput, flash-vs-flagship escalation). Scope: open-weight candidates only — flagship tier: deepseek-v4-pro-0813, glm-5.3, qwen3.8-2.4t-a95b, qwen3.8-max; flash tier: deepseek-v4-flash (0731/latest), glm-5.3-flash, qwen-3.8-flash. Providers audited: Baseten, DeepInfra, NovitaAI, SiliconFlow. Why: prompt caching can cut input cost 50-90% for system-instruction-heavy roles (conductor, reviewer, researcher); scout/worker tool loops pay for tool-call reliability; current roster pricing is a stale snapshot and the expensive Kimi K3 seat ($3/$15 per 1M) is an open cost question. Out of scope: implementing the routing engine or changing any model config in this spike — research note + human decision brief only. Iteration plan (anti-big-bang): Phase 1 this spike; Phase 2 a follow-up static config adoption task (agent files, opencode.jsonc, manifest models — small reversible PR, gated on human decision); Phase 3 true dynamic runtime routing inside the m-4 driver chain (much later). Long-term telemetry feed for validating routing decisions = TASK-47 (its capture layer matters early; no dependency edge).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 WHEN the research completes THEN a dated, source-attributed note SHALL land (mirrored into repo docs/research/) containing the dynamic model evaluation matrix: uncached input rate, cached input rate, output rate, median TTFT, average TPS, tool-call accuracy %, SWE-bench score for all seven candidates, with per-provider cache read/write discounts (Baseten, DeepInfra, NovitaAI, SiliconFlow) and context-length support — PARTIAL-BY-DISPOSITION (2026-09-07 final review): pricing matrix complete for all 7 (OpenRouter-governed); TTFT/TPS/tool-call accuracy deferred to Phase-2 config + TASK-47/stack-check telemetry (runtime observables); per-provider cache discounts deferred to Phase-2 acceptance line (static card pull). Human-approved at closure.
- [x] #2 WHEN the research completes THEN the note SHALL contain an escalation decision tree with concrete thresholds (file count, AST mutation depth, dependency count, retry-failure count) routing a subagent invocation to Flash vs Flagship, plus latency guidance mapping TTFT-sensitive roles vs TPS-sensitive roles — SATISFIED via ADR-004 (L0-L4 ladder, risk-signal triggers, deterministic AST detection); latency guidance (TTFT/TPS mapping) deferred with AC #1 to Phase-2 telemetry per final review disposition.
- [x] #3 WHEN the research completes THEN the note SHALL contain role-to-tier mappings (primary + fallback per role: conductor, worker, scout, researcher, reviewer, qa) for both Low-Budget execution mode and High-Precision architecture mode, and an OpenRouter routing config spec (provider order, fallback chains, latency timeouts, max budget caps per subagent invocation) — SATISFIED: role-to-tier mappings in research note (AC #3 draft) + ADR-004 ladder (fallback semantics = escalation ladder; Low-Budget vs High-Precision = flash-first vs pro-ladder-start at L2); provider order/fallback chains/timeouts/budget caps are Phase-2 implementation specs governed by ADR-004 (living policy), not static spike content. Human-approved at closure.
- [x] #4 IF evidence on the Kimi K3 question is gathered THEN the note SHALL present keep-vs-drop and 4-reviewer-vs-3-reviewer math (cost delta vs quality evidence) as a HUMAN decision brief — the decision is human-owned, never made by the researcher — DONE: brief presented 2026-09-07; human decision: Kimi K3 KEPT in pro tier.
- [x] #5 WHEN the spike completes THEN the final summary SHALL record the iteration plan: which follow-up task(s) adopt the routing config, sequenced after TASK-56 cleanup, plus the status of the Kimi roster decision — DONE: see session notes + research note review record; Phase-2 adoption task created (opencode-only, 0.1.0), Phase-3 dynamic routing unchanged.
- [x] #6 IF any benchmark or pricing figure is unavailable or third-party-anecdotal THEN that fact SHALL be marked unverified in the matrix, never estimated as fact — DONE: every figure tagged; AA named governing HLE source; OpenRouter /api/v1/models governing pricing.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Tests and lint pass with fresh output in the worktree
- [ ] #2 Worktree is clean (no uncommitted changes)
- [ ] #3 Branch is rebased on main and green
- [ ] #4 All acceptance criteria checked with fresh evidence (one at a time, never batched)
- [ ] #5 Research note passes a sanitization scan before merge (no absolute home paths, no secrets)
- [ ] #6 Zero repo code changes in this spike (note only)
- [x] #7 Figure-reconciliation audit: every benchmark/price figure cited in ADR-004 matches its tagged provenance source (applied; sweep-verified 2026-09-07)
- [x] #8 Conflict-resolution rule: when sources disagree, the governing snapshot/protocol is named (AA for HLE; OpenRouter /api/v1/models for pricing) (applied; sweep-verified 2026-09-07)
<!-- DOD:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-09-06 (human): priority raised to High on cost grounds (Kimi K3 spend per review round). Sequencing: dispatch AFTER TASK-59 (biome gate) and TASK-56 (repo cleanup) — research note lands post-disposition-pass so the TASK-56 inventory stays valid.

2026-09-07 (session 2): (1) GLM 5.2 dropped as default per human. (2) Kimi K3 KEPT in pro tier (human decision — AC #4 keep-vs-drop answered). (3) Target roster confirmed: pro = DS V4 Pro 0813 / Qwen3.8-2.4T / GLM-5.3 / Kimi K3; fast = DS V4 Flash 0731 / GLM-5.3-Flash / Qwen3.8-Flash. (4) qwen3.8-max recommended for drop (duplicates 2.4T pricing, no identified edge). Full 7-candidate pricing matrix in docs/research/2026-09-07-flagship-tier-pricing-quality-preliminary.md. Tavily verification: DeepSeek + Z.ai official pricing pages extracted directly; DeepSeek and GLM-5.3 figures CONFIRMED. Facts: DeepSeek peak hours Mon-Fri only (01:00-04:00 + 06:00-10:00 UTC = 9 PM–midnight ET Sun–Thu + 2–6 AM ET weekdays); GLM-5.3-Flash 50% promo ends 2026-09-09 24:00 UTC+8; Qwen3.8-Flash (image+video, 1M ctx, $0.15/$0.47) is a 5-7x cheaper UI-seat candidate than kimi-k2-7-ui ($0.74/$3.50). OpenRouter live-API pass: peak/off-peak does NOT pass through OpenRouter (flash-0731 flat $0.14/$0.28); GLM-5.2 on OpenRouter 31% cheaper than 5.3 (default upgrade +45% there); DS flash cache read higher on OR ($0.028 vs $0.007).

2026-09-07 (session 4): Second-pass family review completed per maker/checker rule. DeepSeek V4 Pro (codex profile), GLM-5.3 and Qwen3.8-2.4T (parallel pi subagent reviewers) all APPROVE seat-weighted composite + HLE elevation; all flag "needs work" P1s, all applied to ADR-004: relational cross-family rule (family=vendor, glm-flash/glm-5.3 same vendor), HLE Consequences contradiction fixed, AA named governing HLE source (42.3 vs ~62.5 protocol conflict governed), deterministic AST trigger detection specced (weavelog check, merged diff), DoD gains figure-reconciliation audit + conflict-resolution rule. Deterministic re-adjustment cadence specified: pinned OpenRouter snapshot + weekly stack-check gate (>=10% price delta / new family slug / removed slug -> human decision brief, stale until acked); extends existing sync-model-pricing --check + LaunchAgent + quarterly protocol; new-model detection is the net-new piece. 

2026-09-07 (session 5, human decisions): (1) OpenRouter confirmed primary routing target until 0.2.0+. (2) ADR-004 stays the living policy doc; weekly script updates snapshots/briefs only, never the ADR (append-only audit trail). (3) Quarterly deep refresh too slow — replaced with MONTHLY deep re-evaluation; weekly sweep handles pricing/deals with bounded auto-select (cheaper same-slug provider route, tier-bounded ladder-covered swaps, ledger-logged); structural changes (new model, seat remap, roster entry/exit) remain human-gated via blocking decision brief. Phase-2 adoption task scope now includes wiring the monthly cadence into stack-check and model-routing.md protocol update. (2b) Phase-2 host scope per human: weavelog 0.1.0 targets the opencode host ONLY (payload/config/opencode.jsonc + payload/config/agents/*); pi host config changes deferred to 0.2.0.

2026-09-07 (session 6, CLOSURE): GLM-5.3-Flash sweep found 2 substantive gaps (opencode-only scope uncaptured; DoD additions not in checklist) + 3 alignment fixes — ALL APPLIED. Final family review pass: DeepSeek V4 Pro + Qwen3.8-2.4T both verdict SHIP, zero blocking issues. Non-blocking fixes applied: conductor seat relabel; HLE BenchLM figures marked advisory (AA: Kimi 46.9 > GLM 42.3; GLM's escalated seat rests on agentic instruments); AC #1 disposition SPLIT (TTFT/TPS/tool-call -> Phase-2 telemetry; provider cache discounts -> Phase-2 static card pull). SPIKE CLOSED per human instruction (HITL gate: human reviews diff before commit). Phase-2 adoption task created: TASK-75 (opencode-only, 0.1.0).
<!-- SECTION:NOTES:END -->
