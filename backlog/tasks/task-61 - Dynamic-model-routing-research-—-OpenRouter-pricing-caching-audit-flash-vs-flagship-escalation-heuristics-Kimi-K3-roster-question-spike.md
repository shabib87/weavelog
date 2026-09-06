---
id: TASK-61
title: >-
  Dynamic model routing research — OpenRouter pricing/caching audit +
  flash-vs-flagship escalation heuristics + Kimi K3 roster question (spike)
status: To Do
assignee: []
created_date: '2026-09-06 17:52'
updated_date: '2026-09-06 18:00'
labels: []
dependencies: []
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
- [ ] #1 WHEN the research completes THEN a dated, source-attributed note SHALL land (mirrored into repo docs/research/) containing the dynamic model evaluation matrix: uncached input rate, cached input rate, output rate, median TTFT, average TPS, tool-call accuracy %, SWE-bench score for all seven candidates, with per-provider cache read/write discounts (Baseten, DeepInfra, NovitaAI, SiliconFlow) and context-length support
- [ ] #2 WHEN the research completes THEN the note SHALL contain an escalation decision tree with concrete thresholds (file count, AST mutation depth, dependency count, retry-failure count) routing a subagent invocation to Flash vs Flagship, plus latency guidance mapping TTFT-sensitive roles vs TPS-sensitive roles
- [ ] #3 WHEN the research completes THEN the note SHALL contain role-to-tier mappings (primary + fallback per role: conductor, worker, scout, researcher, reviewer, qa) for both Low-Budget execution mode and High-Precision architecture mode, and an OpenRouter routing config spec (provider order, fallback chains, latency timeouts, max budget caps per subagent invocation)
- [ ] #4 IF evidence on the Kimi K3 question is gathered THEN the note SHALL present keep-vs-drop and 4-reviewer-vs-3-reviewer math (cost delta vs quality evidence) as a HUMAN decision brief — the decision is human-owned, never made by the researcher
- [ ] #5 WHEN the spike completes THEN the final summary SHALL record the iteration plan: which follow-up task(s) adopt the routing config, sequenced after TASK-56 cleanup, plus the status of the Kimi roster decision
- [ ] #6 IF any benchmark or pricing figure is unavailable or third-party-anecdotal THEN that fact SHALL be marked unverified in the matrix, never estimated as fact
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Tests and lint pass with fresh output in the worktree
- [ ] #2 Worktree is clean (no uncommitted changes)
- [ ] #3 Branch is rebased on main and green
- [ ] #4 All acceptance criteria checked with fresh evidence (one at a time, never batched)
- [ ] #5 Research note passes a sanitization scan before merge (no absolute home paths, no secrets)
- [ ] #6 Zero repo code changes in this spike (note only)
<!-- DOD:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-09-06 (human): priority raised to High on cost grounds (Kimi K3 spend per review round). Sequencing: dispatch AFTER TASK-59 (biome gate) and TASK-56 (repo cleanup) — research note lands post-disposition-pass so the TASK-56 inventory stays valid.
<!-- SECTION:NOTES:END -->
