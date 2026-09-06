---
id: TASK-64
title: >-
  Pre-publish: nvm to brew node@22 runtime migration — launchd repin +
  shipped-config fix
status: To Do
assignee: []
created_date: '2026-09-06 20:06'
updated_date: '2026-09-06 20:36'
labels:
  - harness
milestone: m-7
dependencies:
  - TASK-59
priority: high
ordinal: 52000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Collapse the machine silent three-runtime node split onto keg-only brew node@22, per the ratified brew/npm/uv-only standard and the three-reviewer plan-gate tie-break (live-verified: the pi binary uses an env-node shebang, so inside the com.weavelog.check LaunchAgent it already executes on floating brew node v25.8.1, and non-interactive shells resolve node to brew first — the pinned nvm v22 delivers one pinned argv, not one runtime, which violates zero silent failure today). Sequence: capture backups (nvm tarball, plist, zshrc); human gate: brew install node@22, verifying the installed alias resolves to a v22.x binary (stale-alias trap: /opt/homebrew/opt/node@22 currently symlinks to Cellar node 25.8.1, so existence checks false-green); reinstall pi-coding-agent@0.85.1 under node@22; repin com.weavelog.check.plist (node argv, WEAVELOG_PI_BIN, and prepend the node@22 bin dir to the plist PATH); doctor and tests green; zshrc cutover removing the nvm block with the node@22 PATH prepended in ~/.zprofile (amend TASK-45 AC#8 zshrc-sha256 baseline with human sign-off); fix the shipped absolute nvm npx path in payload/config/opencode.jsonc (personal-path leak to OSS users); soak one kickstart cycle; final human gate (irreversible): remove ~/.nvm — the tarball is the rollback path. Brew floating node STAYS installed because cspell depends on it; document node@22 as stack runtime and brew node as cspell runtime dependency.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 WHEN the migration completes THEN interactive and non-interactive login shells SHALL resolve node to the brew node@22 path reporting a v22.x version
- [ ] #2 WHEN the plist is repinned THEN a kickstart of com.weavelog.check SHALL exit 0 AND weavelog doctor SHALL be green with the node path guard validating the new pin
- [ ] #3 WHEN the node@22 install is verified THEN the node@22 bin path SHALL report a version starting with v22. (version check, not existence — stale-alias false-green)
- [ ] #4 WHEN ~/.nvm is removed THEN doctor SHALL remain green AND command -v nvm SHALL fail, with the pre-removal tarball backup verified
- [ ] #5 WHEN cspell --version runs THEN it SHALL exit 0 with brew floating node retained and documented as its dependency
- [ ] #6 WHEN a tag or publish is attempted THEN this ticket SHALL be closed alongside TASK-53, TASK-54, TASK-56, TASK-62, TASK-63, TASK-66 and TASK-67 before the .github/publish-gate marker flips
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
2026-09-06 cross-thread reconciliation: closure-set AC now explicit IDs. ORDERING: TASK-66 (doctor/check clean-machine fix) lands BEFORE this ticket closes — the doctor node-path-guard evidence in AC#2 must be re-run after TASK-66 merges; TASK-67 stranger battery provisions brew node@22 and must observe this ticket stale-alias trap (version-check, not existence).
<!-- SECTION:NOTES:END -->
