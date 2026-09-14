---
id: TASK-54
title: 'Pre-publish: exact npm artifact privacy and license clearance'
status: To Do
assignee: []
created_date: '2026-09-05 23:39'
updated_date: '2026-09-13 17:08'
labels: []
milestone: m-7
dependencies:
  - TASK-7
  - TASK-29
  - TASK-30
  - TASK-53
  - TASK-62
  - TASK-63
  - TASK-64
  - TASK-68
  - TASK-73
  - TASK-5
priority: high
ordinal: 42000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Outcome: prove the exact npm candidate contains only the documented package allowlist, excludes private source material and has correct licensing. Why: independent installation requires an inspectable artifact without secrets or personal data. Audit all shipped files, including included documentation and embedded examples. Research-source public/private classification and Git history belong to existing TASK-83; excluded source material does not add an npm publication gate.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 WHEN the exact candidate is audited THEN every shipped file is checked for secrets, personal data, private paths and licensing issues, and the report records its hash, inspected scope and result.
- [ ] #2 WHEN the exact candidate tarball is inspected THEN it contains zero backlog or docs/research subtree files and includes only the documented package allowlist.
- [ ] #3 IF privacy, licensing or artifact inspection fails THEN npm publication remains blocked and the failed item is named; TASK-83 source-history clearance is never inferred from this result.
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
2026-09-11 correction: TASK-54 owns only privacy sweep and npm artifact safety. Public repository and full-history clearance is separate m-5 release work; neither result implies the other.

2026-09-13 shipping audit: package inspection remains mandatory. Classification of excluded research notes is assigned to existing TASK-83, avoiding a second source-publication project before npm. Inspect only after the final package inputs and instructions are ready.

2026-09-13 user correction: inspect the final package after the SDK workflow has been proven locally in TASK-5. External user testing is not a prerequisite.
<!-- SECTION:NOTES:END -->
