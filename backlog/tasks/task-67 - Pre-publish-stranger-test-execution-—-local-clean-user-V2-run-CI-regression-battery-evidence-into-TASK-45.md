---
id: TASK-67
title: >-
  Pre-publish: stranger-test execution — local clean-user V2 run + CI regression
  battery (evidence into TASK-45)
status: To Do
assignee: []
created_date: '2026-09-06 20:35'
updated_date: '2026-09-06 20:43'
labels: []
milestone: m-7
dependencies:
  - TASK-66
  - TASK-62
  - TASK-63
  - TASK-64
priority: high
type: task
ordinal: 55000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Execute the TASK-45 Step 4 stranger test and lock its evidence. Local part: procedure V2 ratified by two 3-reviewer plan-gate passes (2026-09-06) — `sudo sysadminctl -addUser stranger` (-admin so brew provisioning works, matching a real single-user Mac) + `sudo createhomedir -c -u stranger` + secureTokenStatus MUST report OFF (abort -> immediate teardown if ON) + `sudo -i -u stranger` login shell; Node provisioned as brew node@22 per TASK-64 with version-output verification (v22.x, never existence — stale-alias trap); RC staged via the macOS Shared folder with sha256 verified stranger-side and privacy-audit passed BEFORE staging; battery follows the README quickstart verbatim and asserts the full TASK-45 AC#6 list (init -> loadable opencode config, skills on a scanned path, at least one enforced gate loaded, weavelog.json manifest present, JSONL ledger written, doctor exit 0 with enumerated warn/skip lines); exact teardown order with post-asserts. CI part: a reduced regression battery (not gate-of-record — it cannot reproduce secureToken/user-creation fidelity), rebased on TASK-63 workflow hardening. Runs ONLY after TASK-53 and TASK-54 close and the publish-gate marker flips (TASK-45 Step 4 ordering). Evidence (sw_vers, uname -m, node -v, doctor output, ledger tail, exit codes) recorded in TASK-45 notes, sanitized of absolute home paths. Why: TASK-45 cannot close without its Step 4 stranger-test evidence, and without this ticket the V2 procedure and its blockers lived only in chat.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 WHEN the local run executes THEN it SHALL follow V2 exactly: sysadminctl addUser (admin) + createhomedir + secureTokenStatus-OFF abort path + sudo -i -u stranger, with pre-state captured (home mode, id stranger fails) and post-asserts verifying full reversion
- [ ] #2 WHEN Node is provisioned THEN brew node@22 SHALL be verified by version output (starts with v22.), never by existence, mirroring the TASK-64 stale-alias trap
- [ ] #3 IF the RC tarball is staged THEN it SHALL have passed scripts/privacy-audit before staging AND its sha256 SHALL be verified on the stranger side against the recorded value
- [ ] #4 WHEN the battery runs THEN it SHALL follow the README quickstart verbatim and assert the full TASK-45 AC#6 list: loadable opencode config, skills on a scanned path, at least one enforced gate loaded, weavelog.json manifest present, JSONL ledger written, doctor exit 0
- [ ] #5 WHEN the CI regression battery runs THEN a macos-15 arm64 job SHALL run pack -> npm i -g -> init -> doctor exit 0 under a scrubbed PATH, compliant with TASK-63 hardening (SHA-pinned actions, least-privilege permissions)
- [ ] #6 WHEN a tag or publish is attempted THEN this ticket SHALL be closed alongside TASK-53, TASK-54, TASK-56, TASK-62, TASK-63, TASK-64 and TASK-66 before the publish-gate marker flips
- [ ] #7 WHEN the ticket is picked up THEN it SHALL run only AFTER TASK-53 and TASK-54 closure and the publish-gate marker flip per TASK-45 Step 4 ordering
- [ ] #8 WHEN the run completes THEN evidence (sw_vers, uname -m, node -v, doctor output + exit code, ledger tail) SHALL be recorded in TASK-45 notes sanitized of absolute home paths, after the exact teardown: evidence out -> exit stranger shell -> pkill -u stranger -> deleteUser -> revert home mode -> remove the Shared-folder staging -> post-asserts green
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Tests and lint pass with fresh output in the worktree
- [ ] #2 Worktree is clean (no uncommitted changes)
- [ ] #3 Branch is rebased on main and green
- [ ] #4 All acceptance criteria checked with fresh evidence (one at a time, never batched)
- [ ] #5 Evidence bundle committed/summarized into TASK-45 notes with zero absolute /Users/ paths and zero secrets
<!-- DOD:END -->
