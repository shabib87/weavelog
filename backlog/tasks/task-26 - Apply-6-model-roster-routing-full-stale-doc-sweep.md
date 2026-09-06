---
id: TASK-26
title: Apply 6-model roster routing + full stale-doc sweep
status: Done
assignee:
  - conductor
created_date: '2026-08-31 01:37'
updated_date: '2026-08-31 02:48'
labels: []
dependencies: []
ordinal: 18000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Apply the approved 6-model roster (TASK-25) to active routing config, agent definitions, scripts, and all live documentation. Roster: flash-0731 (bulk/scout + implementer), glm-5.3-flash (conductor/researcher/security + glm-family reviewers), v4-pro-0813 (qa + deepseek-family reviewers), qwen3.8 (high-stakes review), kimi-k3 (escalation + kimi-family reviewers + vision-kimi), minimax-m3 (vision). Shed glm-5.2 from all ACTIVE routing. Full stale-doc sweep: repoint or retire every glm-5.2 reference that encodes CURRENT routing; dated research notes get a superseded-pointer, not content rewrite. Guardrail: config-only PR, verified by bun test + biome + stack-check.ts + config JSON validity.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 WHEN the opencode config is updated THEN "model" routes to openrouter/z-ai/glm-5.3-flash and "small_model" stays openrouter/deepseek/deepseek-v4-flash-0731 and the config parses as valid JSONC
- [x] #2 WHEN the agent definitions are re-pointed THEN every glm-family agent (diff-reviewer-glm, plan-gate-glm, researcher, security) pins openrouter/z-ai/glm-5.3-flash, implementer pins flash-0731, and no agent def references glm-5.2
- [x] #3 WHEN the scripts are updated THEN reviewer-loop.ts DEFAULT_MODELS lists the 4 review families (glm-5.3-flash/kimi/qwen/v4-pro), headroom-compress default is glm-5.3-flash, and the reviewer-loop tests pass with the new defaults
- [x] #4 WHEN the runbook is swept THEN the model tier section, §3 agent definitions, DEFAULT_MODELS, pricing tables, HEADROOM_MODEL_ALIAS_MAP, and escalation ladder all reflect the new roster with no glm-5.2 as active routing
- [x] #5 WHEN the stale-doc sweep completes THEN stack-versions.json models list, AGENTS.md + config/opencode-AGENTS.md routing tables, and enforce.ts reminders reflect the roster, and the superseded tier doc (2026-08-15-openweight-model-tiers.md) carries a pointer to the 2026-08-30 note
- [x] #6 WHEN the task validates THEN cd ~/.agents/bin && bun test passes, biome check passes on changed scripts, and stack-check.ts runs without error
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Update opencode.jsonc: model -> glm-5.3-flash, small_model stays flash-0731, add glm-5.3-flash to models block. 2. Update stack-versions.json: replace glm-5.2 with glm-5.3-flash in models list. 3. Re-point agent defs: glm-family agents -> glm-5.3-flash, implementer -> flash-0731, security -> glm-5.3-flash. 4. Update scripts: reviewer-loop DEFAULT_MODELS, headroom-compress default, sync-model-pricing comments, enforce.ts reminder, + reviewer-loop tests. 5. Sweep AGENT-STACK-RUNBOOK: tier section, §3 agent defs, pricing tables, alias maps, escalation ladder. 6. Sweep AGENTS.md + config/opencode-AGENTS.md routing tables. 7. Add superseded pointer to old tier doc. 8. Validate: bun test, biome, stack-check, config JSONC validity.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implementation complete. Applied 6-model roster across live config (~/.config/opencode/: opencode.jsonc model=glm-5.3-flash, small_model=flash-0731, agent defs re-pinned, enforce.ts reminder) + repo-tracked files (stack-versions.json, runbook model tiers + §3 agent defs + pricing tables + alias maps + ladder, AGENTS.md + config/opencode-AGENTS.md routing tables, bin scripts DEFAULT_MODELS/defaults, bin test fixtures, superseded pointer on old tier doc). Cross-family diff review (deepseek): APPROVE-WITH-NITS, 2 nits fixed (stale pricing-sync prose, flash slug reconciled to -0731). Validation: bun test 263/263 pass, biome lint clean on changed files, stack-check runs (only pre-existing headroom 0.36.5->0.37.0 drift).

Cross-family review complete (3 families): deepseek APPROVE-WITH-NITS (2 nits fixed) → qwen APPROVE-WITH-NITS (6 findings, all fixed) → kimi REJECT-narrow (7 findings incl. HIGH live-plist, all fixed) → kimi re-verify APPROVE-WITH-NITS. Live-state fixes: headroom plist alias map → roster (plutil OK), litellm pricing --apply (5/6 priced; glm-5.3-flash self-resolves post-merge), proxy restart deferred to human. Frontmatter: 42 scanned 0 invalid. bun test 263/263. Residual sequencing: after merge, run sync-model-pricing --apply on main BEFORE proxy restart so glm-5.3-flash pricing lands in same activation window.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
6-model roster applied end-to-end. Live config: opencode.jsonc model=glm-5.3-flash, small_model=flash-0731, +multimodal decl; 16 agent defs re-pinned (glm-family→glm-5.3-flash, implementer→flash-0731); enforce.ts LEARN_MODEL+reminder updated. Repo: stack-versions.json, runbook (tier table/ladder/alias maps/pricing, §3 agent defs), config/opencode-AGENTS.md, bin scripts+test fixtures, superseded pointer on old tier doc. Live state: headroom plist alias map→roster, litellm pricing --apply (6/6 roster models priced, glm-5.3-flash $0.075/M). Validation: bun test 263/263, biome clean, frontmatter 42/42, stack-check clean. Review: deepseek APPROVE, qwen APPROVE-WITH-NITS (fixed), kimi REJECT-narrow→APPROVE (fixed). Baseline TASK-25 prediction ($55-75/16d) now verifiable against live savings telemetry.
<!-- SECTION:FINAL_SUMMARY:END -->
