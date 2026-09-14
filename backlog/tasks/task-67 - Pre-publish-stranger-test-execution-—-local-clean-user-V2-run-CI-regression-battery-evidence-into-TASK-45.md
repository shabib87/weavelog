---
id: TASK-67
title: 'Pre-publish: verify the exact package and SDK workflow locally'
status: To Do
assignee: []
created_date: '2026-09-06 20:35'
updated_date: '2026-09-13 18:45'
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
  - TASK-7
  - TASK-5
priority: high
type: task
ordinal: 55000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Outcome: prove the exact npm candidate and the SDK-controlled harness safely on the author's own Mac. Use isolated test roots or a local test account, inspect effective configuration and file changes, and execute one actual project workflow. If a final live-path test is needed, verify protected backups and restoration first. Why: the author can establish release evidence without recruiting another tester or obtaining another machine. Retain every agreed conflict/refusal, replacement, backup/recovery and scaffold requirement; file replacement alone does not prove runtime behavior. The earlier mandatory sysadminctl/administrator-account procedure is an available method, not a requirement.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 WHEN local installation verification runs on the author's Mac THEN it uses isolated configuration, state and project roots or an isolated local account, records effective configuration sources and tool paths, and proves that pre-existing working configuration did not hide missing package inputs.
- [ ] #2 WHEN the supported Node runtime is checked THEN its actual version is recorded and matches the documented supported profile; a second installation or a particular personal version manager is not required.
- [ ] #3 WHEN the exact release candidate is installed for local testing THEN TASK-54 has cleared it, its SHA-256 matches the recorded artifact, and the CLI and adapters resolve to that installed package rather than the development checkout.
- [ ] #4 WHEN the local end-to-end test runs THEN it follows TASK-53 instructions and proves the OpenCode plus Headroom profile, loaded roster and skills, enforced hooks, scaffold, TypeScript SDK workflow, independent review, human gates, JSONL receipts and doctor exit 0.
- [ ] #5 WHEN local evidence satisfies the release criteria THEN another person, a second machine and a clean-user CI job are optional follow-up checks rather than publication blockers; existing TASK-63 general CI and security requirements remain.
- [ ] #6 WHEN the ticket is picked up THEN every dependency is complete and the publish marker remains unset
- [ ] #7 WHEN local testing finishes THEN this task records sanitized platform, runtime, package hash, before/after file manifests, command exit codes and receipt locations, with temporary artifacts accounted for and any changed live targets restored as planned; a real configuration-path test uses verified backups and a tested restoration path.
- [ ] #8 WHEN the evidence is accepted THEN the human release review decides whether the npm publish marker may change
- [ ] #9 WHEN the exact candidate exercises CLI conflict and scaffold paths THEN the evidence proves default all-target preflight refuses with nonzero exit and no declared writes; confirmed --force preserves opaque protected .bak files and journal evidence with safe rollback or recovery refusal; conflicting OpenCode sources remain unsupported; and scaffold creates all four docs homes without requiring a global OpenCode profile or managing .gitignore, .env, .env.local, or .git.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Tests and lint pass with fresh output in the worktree
- [ ] #2 Worktree is clean (no uncommitted changes)
- [ ] #3 Branch is rebased on main and green
- [ ] #4 All acceptance criteria checked with fresh evidence (one at a time, never batched)
- [ ] #5 Evidence bundle committed or summarized in TASK-67 with sanitized paths, no secrets, exact artifact hash and receipt locations.
<!-- DOD:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-09-10 correction: TASK-67 precedes the publish-gate marker. Its former marker-before-pickup wording created a prose cycle and is superseded.

2026-09-12 scope alignment: exact-candidate evidence now includes the ADR-0008 conflict, force-backup, recovery, supported-profile, and project-scaffold contract. Documentation alone is not release proof.

2026-09-13 shipping audit: the user retained independent npm setup and full replacement, backups and recovery. All current functional acceptance criteria and the approved V2 procedure remain. Personal-machine TASK-84 is removed from release dependencies; TASK-7 owns the shipped review helper's confirmed failure/cost reporting defects. Evidence must use the same exact artifact cleared by TASK-54.

2026-09-13 explicit user correction: testing on the author's own laptop is sufficient. No outside tester or second machine is required. A clean test state means verifying the package independently of the author's existing working configuration, not recruiting a stranger. OpenCode config sources merge, so setting OPENCODE_CONFIG_DIR alone is not proof of isolation; inspect effective sources. Preserve all full installer replacement/backup/recovery acceptance requirements. This task defines future proof only; no live configuration was changed by the audit correction.

2026-09-13 final ownership correction: TASK-67 is the final release-proof and human-decision record. Record sanitized platform/runtime, exact artifact hash, configuration provenance, before/after manifests, command exit codes, independent review and receipt locations here, not in TASK-45. Prior notes requiring TASK-45 updates or mandatory external/clean-user testing are superseded by the current criteria. TASK-63 implements publication enforcement; its existing marker remains unset until this task's proof is accepted and the human authorizes release.
<!-- SECTION:NOTES:END -->
