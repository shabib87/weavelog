---
id: TASK-62
title: >-
  Pre-publish: dependency standard — pipx to uv migration + repo channel
  vocabulary
status: To Do
assignee: []
created_date: '2026-09-06 20:06'
updated_date: '2026-09-06 23:51'
labels:
  - harness
milestone: m-7
dependencies:
  - TASK-59
  - TASK-68
priority: high
ordinal: 50000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Enforce the ratified machine standard (brew for native, npm for JS, uv for Python; pipx removed everywhere) on the reference machine and in weavelog source. Migrate headroom-ai 0.36.5 and markitdown 0.1.7 from pipx to uv tool install, remove pipx, and update the repo channel vocabulary: the channel union in src/weavelog-manifest.ts gains uv and drops pipx, src/agents-install.ts install prereqs drop pipx, src/sync-model-pricing.ts venv path moves to the uv tools dir, src/hooks/enforce.ts venv guards are repointed (they currently block this very migration), and the shipped weavelog.json channel values are corrected. CRITICAL ORDER: capture the include_usage patch (diff of litellm.py against its adjacent .bak-usage-fix inside the headroom-ai pipx venv) as a committed sanitized .patch BEFORE any uninstall — the patch is lost on reinstall until upstream fixes the backend include_usage bug. Preserve the ~/.local/bin/headroom shim path byte-identically so opencode MCP wiring and the com.headroom.proxy plist argv stay untouched. Every brew install or uninstall and every venv-destructive step requires explicit human approval per repo MUST NOT rules. Manifest tracking of rtk, semgrep and node is deferred ticket A scope — add only the uv channel value. Evidence: research note cli-bundling-vs-composition 2026-09-06 plus three-reviewer plan-gate consensus.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 WHEN the migration begins THEN, before any uninstall, the include_usage patch SHALL be captured as a committed sanitized .patch and baselines recorded (proxy 8788 healthy, pipx list, plist and zshrc checksums), with explicit human approval for every brew install or uninstall and every venv-destructive step
- [ ] #2 WHEN headroom-ai migrates THEN the order SHALL be bootout com.headroom.proxy, pipx uninstall headroom-ai, uv tool install headroom-ai==0.36.5, patch re-applied in the uv tools dir, bootstrap and kickstart, proxy healthy with usage fields present
- [ ] #3 WHEN markitdown migrates THEN uv tool install markitdown==0.1.7 SHALL replace pipx and the mdconvert pipeline SHALL verify end-to-end with the mdconvert test suite green
- [ ] #4 WHEN both packages are on uv THEN pipx SHALL be fully removed (brew uninstall pipx, ~/.local/pipx deleted, command -v pipx empty) AND the enforce.ts venv guards SHALL be repointed to the uv-tools path with tests, keeping raw rm -rf of live venvs blocked
- [ ] #5 WHEN the repo side lands THEN the channel union SHALL gain uv and drop pipx, weavelog.json SHALL read channel uv for headroom and markitdown with stale keys corrected, and zero pipx references SHALL remain under src/ and weavelog.json
- [ ] #6 WHEN the ticket completes THEN npm test, tsc, biome, weavelog doctor and weavelog check SHALL exit 0, committed files SHALL contain zero absolute /Users/ paths, and no rtk, semgrep or node manifest entries SHALL be added (deferred ticket A scope)
- [ ] #7 WHEN a tag or publish is attempted THEN this ticket SHALL be closed alongside TASK-53, TASK-54, TASK-56, TASK-63, TASK-64, TASK-66 and TASK-67 before the .github/publish-gate marker flips
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Tests and lint pass with fresh output in the worktree
- [ ] #2 Worktree is clean (no uncommitted changes)
- [ ] #3 Branch is rebased on main and green
- [ ] #4 All acceptance criteria checked with fresh evidence (one at a time, never batched)
<!-- DOD:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-09-06 cross-thread reconciliation: closure-set AC updated to explicit IDs (canonical set {53,54,56,62,63,64,66,67} recorded in the TASK-45 pointer note; mechanical enumeration owned by the publish-gate CI). ORDERING: TASK-66 (doctor/check clean-machine fix) lands BEFORE this ticket closes — re-run doctor-exit-0 evidence after TASK-66 merges.

2026-09-06 DAG integration: hard edge on TASK-68 added — the headroom proxy plist argv changes there first (--no-memory-tools), this migration then preserves that argv byte-identically.
<!-- SECTION:NOTES:END -->
