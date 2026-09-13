---
id: TASK-67
title: >-
  Pre-publish: stranger-test execution — local clean-user V2 run + CI regression
  battery (evidence into TASK-45)
status: To Do
assignee: []
created_date: '2026-09-06 20:35'
updated_date: '2026-09-12 20:16'
labels: []
milestone: m-7
dependencies:
  - TASK-66
  - TASK-62
  - TASK-63
  - TASK-64
  - TASK-53
  - TASK-54
  - TASK-55
  - TASK-68
  - TASK-73
  - TASK-28
  - TASK-29
  - TASK-30
  - TASK-84
priority: high
type: task
ordinal: 55000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Execute the TASK-45 stranger test and record exact-candidate evidence before the publish marker changes. Follow the approved V2 clean-user procedure, README quickstart, and the target-versus-delivery boundary in docs/trd/cli-vision.md. Verify global preflight/refusal and force-backup recovery, active-source refusal, and the project scaffold contract. Why: release evidence must prove safe behavior rather than rely on documentation claims.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 WHEN the local run executes THEN it follows V2 exactly: `sysadminctl addUser` with admin, `createhomedir`, secureTokenStatus-OFF abort path, and `sudo -i -u stranger`, with pre-state captured and post-asserts verifying full reversion
- [ ] #2 WHEN Node is provisioned THEN brew node@22 is verified by version output beginning with v22, never by existence alone
- [ ] #3 IF the release-candidate tarball is staged THEN deterministic privacy verification passes before staging and its SHA-256 is verified by the stranger account against the recorded value
- [ ] #4 WHEN the battery runs THEN it follows the README quickstart and proves the OpenCode plus Headroom supported profile, loadable config, scanned skills, enforced hook, manifest, scaffold, end-to-end task, verification, JSONL ledger, and doctor exit 0
- [ ] #5 WHEN the CI regression battery runs THEN a macos-15 arm64 job runs pack, global install, init, and doctor under a scrubbed PATH with TASK-63 SHA-pinned actions and least-privilege hardening
- [ ] #6 WHEN the ticket is picked up THEN every dependency is complete and the publish marker remains unset
- [ ] #7 WHEN the run completes THEN TASK-45 records sw_vers, uname -m, node version, doctor output and exit code, ledger tail, and exit codes without absolute home paths or secrets; teardown is evidence out, exit stranger shell, pkill stranger, deleteUser, revert home mode, remove Shared staging, then post-asserts green
- [ ] #8 WHEN the evidence is accepted THEN the human release review decides whether the npm publish marker may change
- [ ] #9 WHEN the exact candidate exercises CLI conflict and scaffold paths THEN the evidence proves default all-target preflight refuses with nonzero exit and no declared writes; confirmed --force preserves opaque protected .bak files and journal evidence with safe rollback or recovery refusal; conflicting OpenCode sources remain unsupported; and scaffold creates all four docs homes without requiring a global OpenCode profile or managing .gitignore, .env, .env.local, or .git.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Tests and lint pass with fresh output in the worktree
- [ ] #2 Worktree is clean (no uncommitted changes)
- [ ] #3 Branch is rebased on main and green
- [ ] #4 All acceptance criteria checked with fresh evidence (one at a time, never batched)
- [ ] #5 Evidence bundle committed/summarized into TASK-45 notes with zero absolute /Users/ paths and zero secrets
<!-- DOD:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-09-10 correction: TASK-67 precedes the publish-gate marker. Its former marker-before-pickup wording created a prose cycle and is superseded.

2026-09-12 scope alignment: exact-candidate evidence now includes the ADR-0008 conflict, force-backup, recovery, supported-profile, and project-scaffold contract. Documentation alone is not release proof.
<!-- SECTION:NOTES:END -->
