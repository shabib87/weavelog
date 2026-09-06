---
id: TASK-20
title: >-
  Inner harness — pi+opencode proxy routing + compression plugin (dogfood the
  headroom stack)
status: Done
assignee:
  - '@conductor'
created_date: '2026-08-29 02:49'
updated_date: '2026-08-30 06:45'
labels:
  - harness
  - infra
  - proxy
  - dogfood
milestone: m-1
dependencies:
  - TASK-17
priority: high
type: task
ordinal: 1000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The .agents harness (which replaces loopeng) must run pi and opencode through the local Headroom proxy by default, not via direct openrouter.ai calls. This task covers: (1) documenting the proven proxy+plugin architecture under research with rationale and evidence, and (2) adding a CLI check/doctor command that verifies a fresh .agents checkout is wired correctly (proxy running in cache mode, pi models.json pointing at 127.0.0.1:8788, opencode config pointing at 127.0.0.1:8788, headroom extension present and config thresholds set).

## Dependencies context

Checked for overlap:
- **TASK-3** (opencode SDK spike): probes reasoning_effort through the headroom proxy — related but not blocking. The research doc references the proxy pass-through verification from that spike's scope but does not require the spike to be complete.
- **TASK-11** (inner harness guardrails): done. Worktree discipline only — no proxy routing overlap.
- **TASK-15** (docs architecture): the architecture docs (tool-boundaries.md) should cross-reference this research doc. Related but not a blocking dependency.
- **TASK-17** (stack-check.ts update): the CLI doctor command belongs under the stack-check harness (stack-check.ts territory). Added as a dependency so the stack-check.ts updates from TASK-17 are in place before this task adds a new proxy check mode.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Research doc exists at ~/.agents/docs/research/2026-08-28-inner-harness-proxy-plugin-design.md with full provenance
- [x] #2 Research doc covers: the two-layer savings model (Layer A = API routing via models.json/opencode config; Layer B = toolResult compression via pi extension), why cache mode is non-negotiable, the include_usage bug + local hack + upstream status (fixed in Unreleased, beyond v0.37.0), the deprecated @ryan_nookpi extension removal rationale, the measured thresholds (minContextTokens=100000, minMessageChars=10000) with the data backing them
- [x] #3 Research doc records the safety contract: plugin never spawns/restarts/configures the proxy, never sets --mode, never touches /v1/chat/completions, only reads /health + /stats + calls stateless /v1/compress
- [x] #4 CLI command (e.g. `agents doctor proxy` or `stack-check proxy`) exists and verifies: headroom proxy healthy on 127.0.0.1:8788, mode=cache, pi ~/.pi/agent/models.json openrouter baseUrl = http://127.0.0.1:8788/v1, opencode baseURL = http://localhost:8788/v1, headroom extension present at ~/.pi/agent/extensions/headroom/, settings.json thresholds set
- [x] #5 CLI command fails with actionable errors when any check fails (names the fix, not just the problem)
- [x] #6 Research doc links the plan doc at ~/.agents/docs/plans/2026-08-25-headroom-include-usage-patch.md as the hack re-apply runbook
- [x] #7 Research doc notes the .zshrc cleanup (OPENROUTER/ANTHROPIC BASE_URL exports removed; both tools route via own config; proxy has own key store)
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add 'stack-check proxy' subcommand to bin/src/stack-check.ts: verify (a) headroom proxy healthy on 127.0.0.1:8788, (b) mode=cache via /stats, (c) pi ~/.pi/agent/models.json openrouter baseUrl = http://127.0.0.1:8788/v1, (d) opencode baseURL = http://localhost:8788/v1, (e) headroom extension present at ~/.pi/agent/extensions/headroom/, (f) settings.json thresholds (minContextTokens>=100000, minMessageChars>=10000). Each failing check names the fix, exit 1. 2. TDD: write failing tests first (happy + unhappy), then implement. 3. Reuse existing stack-check.ts patterns (run(), fetchJson(), manifest-driven, report JSON, exit codes 0/1/2). 4. Verify bun test + biome. 5. Confirm research doc 2026-08-28-inner-harness-proxy-plugin-design.md covers ACs 1-3,6,7 (read, cite gaps only).
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implementation complete (ACs #4/#5): stack-check.ts --proxy doctor. TDD red-green verified (55->68 stack-check tests). Guardrails exercised: pre-commit hook blocked a commit on main; enforce.ts write-block blocked a write on main (no file created). Live smoke: all 6 checks green, exit 0. Cross-model review: qwen/glm/deepseek all APPROVE after fix round. Held at In Review awaiting human merge approval.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: @conductor
created: 2026-08-30 06:42
---
Diff review round 1: qwen REQUEST CHANGES (HTTP non-2xx misdirected to 'start it', null-parse silent pass, missing report entry on network failure), glm APPROVE (HTTP-status fix worth addressing), deepseek APPROVE (HTTP-status split + override-asymmetry doc). All three converged on the HTTP-status fix message. Fix round applied: !res.ok split from network-throw, UNSET sentinel for null-structure drift, reachable:false report entries, launchctl kickstart fix message, --help override note, research doc §10 corrections. Re-review: qwen APPROVE. Full suite 251 pass / 0 fail, 0 new biome warnings, positive smoke exit 0, negative smoke exit 1.
---
<!-- COMMENTS:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented stack-check.ts --proxy doctor (TASK-20 ACs #4/#5). Verifies headroom proxy health + cache mode, pi models.json baseUrl, opencode baseURL, extension presence, and headroom thresholds; every failing check names the fix. Research doc 2026-08-28-inner-harness-proxy-plugin-design.md covers ACs #1-3/#6/#7 (incl. new §10 corrections). Verified: 68 stack-check tests pass (251 total, 0 fail), biome clean (2 pre-existing warnings), live --proxy exit 0 all-6-green, dead-port negative smoke exit 1 with reachable:false. Cross-model diff review: qwen/glm/deepseek all APPROVE after one fix round.
<!-- SECTION:FINAL_SUMMARY:END -->
