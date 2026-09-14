---
id: TASK-84
title: Synchronize restored MIT headers to live project copies
status: To Do
assignee: []
created_date: '2026-09-11 04:29'
updated_date: '2026-09-13 18:45'
labels:
  - deferred
milestone: m-7
dependencies:
  - TASK-79
  - TASK-29
priority: low
type: task
ordinal: 67000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Outcome: safely synchronize the restored MIT license headers to exactly the seven known live project skill copies, using the ownership contract in docs/trd/cli-vision.md and the supported synchronization path from TASK-29. Prove each target belongs to Weavelog before changing it; if ownership is missing, content changed, or evidence is ambiguous, refuse that target without adoption. Why: repository restoration does not update installed copies, and a broad implicit adoption path is unsupported.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 WHEN the migration inspects the seven inventoried live skill copies THEN it verifies each exact target and proves Weavelog ownership; changed, unowned, or ambiguous targets are refused without writes.
- [ ] #2 WHEN a target is proven Weavelog-owned and safe to update THEN only its restored MIT header is synchronized through TASK-29 supported materialization; third-party headers and unrelated file content remain unchanged.
- [ ] #3 WHEN synchronization completes THEN it records sanitized before-and-after header evidence for each updated target and verifies the result without logging secrets or absolute home paths.
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
2026-09-12 scope alignment: this is a bounded migration of the seven inventoried copies. It must prove ownership before updating; ambiguous or changed targets are refused without adoption.

2026-09-13 shipping audit: personal maintenance, not an npm blocker. Revive when the author requests synchronization of the seven known installed copies. Preserve all existing ownership, refusal and license requirements. Package-source licensing is still mandatory in TASK-54. Existing milestone assignment is retained for human review; release membership is defined by the existing release milestone and brief and dependency edges.

2026-09-13 release ownership: current release membership is defined by the existing milestone/brief and task prerequisites, not by keeping TASK-45 open. This remains deferred personal maintenance and is not an npm gate.
<!-- SECTION:NOTES:END -->
