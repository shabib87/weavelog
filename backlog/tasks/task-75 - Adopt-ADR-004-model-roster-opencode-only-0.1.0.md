---
id: TASK-75
title: >-
  Adopt ADR-004 model roster — opencode host only (0.1.0): payload
  opencode.jsonc + agents, escalation ladder wiring, monthly cadence, static
  cache-discount pull
status: Done
assignee: []
created_date: '2026-09-07 20:30'
updated_date: '2026-09-07 22:34'
labels:
  - spec-approved
milestone: m-7
dependencies:
  - TASK-61
references:
  - docs/architecture/adr/0004-model-selection-benchmark-policy.md
  - docs/research/2026-09-07-flagship-tier-pricing-quality-preliminary.md
priority: high
type: task
ordinal: 50000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Phase-2 static adoption of the TASK-61 evidence base (ADR-004, living
policy). HOST SCOPE: weavelog 0.1.0 targets the opencode host ONLY —
`payload/config/opencode.jsonc` + `payload/config/agents/*`. Pi host config
changes (models.md, settings.json) are explicitly deferred to 0.2.0 and out
of scope here. Provider pin: OpenRouter primary until 0.2.0+.

Roster (7 models): pro tier = deepseek-v4-pro-0813, glm-5.3,
qwen3.8-2.4t-a95b, kimi-k3; fast tier = deepseek-v4-flash-0731,
glm-5.3-flash, qwen3.8-flash. Conductor/default = glm-5.3-flash; bulk
worker = deepseek-v4-flash-0731; vision/UI = qwen3.8-flash (replaces
vision-deepseek vision-exp and vision-minimax). Access removed: minimax-m3,
deepseek-v4-flash-vision-exp (already out: qwen3.8-max, glm-5.2).

Escalation ladder (ADR-004): L0 glm-5.3-flash -> L1 deepseek-v4-pro
(risk-signal triggers, no line count) -> L2 glm-5.3 -> L3 qwen3.8-2.4t ->
L4 kimi-k3; relational family rule (family = vendor; final approval from a
different vendor than the maker).

Cadence wiring: pinned OpenRouter `/api/v1/models` snapshot in repo; weekly
stack-check gate (>=10% price delta on roster models, new slug in monitored
families z-ai/deepseek/qwen/moonshotai, removed/renamed slug) with bounded
auto-select (ledger-logged, reversible only) and blocking human decision
brief for structural changes; MONTHLY deep refresh replaces the quarterly
protocol in model-routing.md. ADR-004 is never edited by the script.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 WHEN payload config is adopted THEN opencode.jsonc and agent files SHALL reflect the 7-model roster with access removed for minimax-m3 and deepseek-v4-flash-vision-exp, and no reference to retired qwen3.8-max/glm-5.2 as active seats
- [x] #2 WHEN the escalation ladder is wired THEN reviewer/plan-gate agents SHALL carry L0-L4 trigger semantics with risk-signal detection computed on the merged diff against base, and the relational family rule enforced for final approval
- [x] #3 WHEN the drift gate is wired THEN a pinned OpenRouter snapshot SHALL live in the repo and stack-check SHALL fail on >=10% roster price delta, new monitored-family slug, or removed/renamed roster slug, generating a blocking human decision brief
- [x] #4 WHEN cadence is updated THEN model-routing.md SHALL specify MONTHLY deep refresh (superseding quarterly) and the bounded auto-select ledger format
- [x] #5 IF provider cache discounts are pulled THEN Baseten/DeepInfra/NovitaAI/SiliconFlow published cache read/write rates SHALL be captured as static card facts in the research note (Phase-2 step one; not runtime telemetry)
- [ ] #6 WHEN diff review closes THEN the human SHALL approve the diff (HITL gate); sanitization scan passes before merge
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Biome and tsc pass with fresh output in the worktree
- [ ] #2 Worktree is clean (no uncommitted changes)
- [ ] #3 Branch is rebased on main and green
- [ ] #4 All acceptance criteria checked with fresh evidence (one at a time, never batched)
- [x] #5 Sanitization scan passes (no absolute home paths, no secrets)
- [ ] #6 Small reversible diff; config-only, zero logic changes outside declared tools
<!-- DOD:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
AC#1 verified: parsed opencode.jsonc/weavelog.json/agents/harness-manifest — manifest equals the 7-model roster exactly; zero retired-model references in active config; vision seats are vision-qwen (new, qwen3.8-flash) + vision-kimi; vision-deepseek/vision-minimax deleted from disk and harness manifest.

AC#2 verified: all 9 reviewer/plan-gate agents carry rung annotations matching ADR-004 (L0 flash, L1 deepseek-pro, L2 glm-5.3, L3 qwen-2.4t, L4 kimi); prompts/reviewer.md + plan-reviewer.md carry merged-diff-against-base risk signals (failing tests, protected-path glob, retry counts — no line count), no-silent-skip rule, and the relational family rule incl. the L0/L2-same-vendor caveat; plan review starts at L2 (plan-gate-glm moved to glm-5.3).

AC#3 verified: snapshot pinned at src/tools/openrouter-snapshot.json (2026-09-07, 7 roster entries + 92 monitored-family slugs); checkRosterDrift gate wired into stack-check main (check 5b) fails on >=10% price delta / new monitored-family slug / removed-renamed slug and emits a blocking decision brief (report.checks.rosterDrift.decisions + stderr ROSTER DECISION BRIEF). Evidence: 100/100 stack-check tests pass incl. 8 pure gate tests + 2 CLI wiring tests (delta fixture -> exit 1 with brief); live run vs real OpenRouter catalog (428 models) -> zero drift, PASS.

AC#4 verified: model-routing.md 'Cadence (weekly sweep + MONTHLY deep refresh — supersedes quarterly)' section states the quarterly replacement, the sweep conditions, the bounded auto-select ledger format (docs/research/roster-autoselect-ledger.jsonl, JSONL schema, reason codes cheaper-route/flash-bounded-swap, humanAck field), and the structural-change ban; roster table + rejected-ledger updated to the 7-model set.

AC#5 verified: research note gains 'Provider-card cache rates (static pull, Phase-2 step one)' — 23-row provider x model matrix (Baseten/DeepInfra/NovitaAI/SiliconFlow) with cache read/write + input/output rates, per-row source URLs, retrieval dated 2026-09-07 by the researcher seat; caveats retained (single cache-write card on DeepInfra V4-Pro, two cross-check conflicts resolved to live cards, serving-quant differences, not-checked list). Open-items list updated: cache-discount gap closed, TTFT/TPS/tool-call remain.

DoD evidence: biome check clean (47 files), tsc --noEmit clean, full suite 634 pass / 1 pre-existing skip (dist build absent in worktree); sanitization scan over diff + new files: zero hits for /Users/, personal identifiers, secret patterns (2 pre-existing test fixtures untouched by diff); worktree created from current main 90756ec, main has not moved (verified via git log main ^task/TASK-75 = empty).
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Adopted ADR-004 model roster for the opencode host (0.1.0): 7-model set in weavelog.json/opencode.jsonc/agents (access removed for minimax-m3 + deepseek-v4-flash-vision-exp; vision-qwen added; diff-reviewer-glm-5.3 L2 seat added); L0-L4 trigger semantics + relational family rule wired into reviewer/plan-gate prompts with all 9 gate agents annotated by rung; roster drift gate (checkRosterDrift) wired into stack-check against a pinned OpenRouter snapshot (src/tools/openrouter-snapshot.json) failing on >=10% price delta / new monitored-family slug / removed-renamed slug with a blocking decision brief; model-routing.md moved to MONTHLY deep refresh + bounded auto-select ledger format; provider-card cache-rate matrix (Baseten/DeepInfra/NovitaAI/SiliconFlow, sourced, retrieved 2026-09-07) appended to the research note. Verified: biome + tsc clean, 634/634 tests (10 new gate tests), live gate run vs real OpenRouter catalog = 0 drift, sanitization scan clean. Reviewed by diff-reviewer-qwen (L3, APPROVE-WITH-FIXES); dispositions applied (null-safe pricing guard, missing/malformed pricing drift, conductor-manual trigger note, ledger protocol-ahead-of-code, stale mentions). Merged to main at 8d67085 after human diff review via difit.
<!-- SECTION:FINAL_SUMMARY:END -->
