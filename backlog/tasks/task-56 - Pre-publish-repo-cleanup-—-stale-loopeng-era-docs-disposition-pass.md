---
id: TASK-56
title: Stale-document cleanup — separate from release policy
status: To Do
assignee: []
created_date: '2026-09-06 07:08'
updated_date: '2026-09-13 16:46'
labels:
  - harness
  - spec-approved
  - deferred
milestone: m-7
dependencies:
  - TASK-58
  - TASK-59
priority: low
ordinal: 44000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Outcome: maintain a human-ratified disposition for stale non-spine documentation. Why: stale material needs its own reviewed cleanup, but it must not block the v0.1 release harness. Reviewer policy is resolved by ADR-007 in TASK-79; this task does not reopen that decision.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 WHEN the disposition pass runs THEN it regenerates the stale-candidate inventory from disk and every candidate has one human-ratified disposition of keep, archive, or delete before any deletion
- [ ] #2 IF a candidate was already deleted by a human THEN its provenance is retained in the inventory or archive record rather than recreated or silently forgotten
- [ ] #3 WHEN cleanup assesses the three named policy-research anchors or ADR-001 THEN it keeps or archives them and never deletes them
- [ ] #4 IF a deletion or move would create a dangling active-document reference THEN the referencing document is updated in the same change
- [ ] #5 WHEN this cleanup task is proposed for closure THEN it has its own verification evidence and does not add an npm publication blocker
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Tests and lint pass with fresh output in the worktree
- [ ] #2 Worktree is clean (no uncommitted changes)
- [ ] #3 Branch is rebased on main and green
- [ ] #4 All acceptance criteria checked with fresh evidence (one at a time, never batched)
- [ ] #5 docs/trd/diagrams/config-sync-flow diagram produced (TASK-35 absorbed; scope carve-out to the fresh-docs exclusion)
- [ ] #6 Follow-up task for the code residue (enforce.ts:647, reviewer-loop.ts:3, tool-boundaries.html:144) exists before this task closes
<!-- DOD:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-09-06: harness label added per the TASK-51 decision table (task dispositions root AGENTS.md -> first match: harness). FLAGGED for this task's thread: backlog/config.yml project_name is 'agents-harness' (copied verbatim per the TASK-45 1.6 amendment); it makes harness-dev-context detection treat flightlead as agents-harness. Decide in-thread whether to correct it to 'flightlead' (deviation from the travels-unchanged amendment) or leave it.

2026-09-06 dangling-task sweep (human-approved): absorbs TASK-35 — the config-sync-flow architecture diagram is produced as part of this cleanup pass so m-3 closes clean. Scope carve-out to the docs/architecture exclusion (diagram only, no other fresh-doc changes).

2026-09-07 amendment (this thread): scope expanded to absorb the reviewer-semantics ADR + docs single-source pass (DeepSeek plan-gate review APPROVE-WITH-CHANGES, 2026-09-07; two-axis framing, narrow brief supersession, facts-vs-framing rule, restatement budget for entry docs, Authority headers). The unmerged TASK-70 draft stub is absorbed by this amendment; the TASK-70 worktree tree is retained - another agent is using it for separate work. The human manual spine pass (2026-09-07: 11 files modified, NEXT_SESSION.md + PROGRESS.md deleted) is carried onto this branch uncommitted and becomes part of this task deliverable. Residue previously missed and now in scope: docs/trd/model-routing.md tier protocol vocabulary. Sequencing per the review: ADR first, then spine pass, then deletions.

2026-09-07: AC#12 added on human instruction - the known typos and language defects from the manual-pass review are fixed in this pass rather than deferred to TASK-53 (files already open in scope).

2026-09-07 plan-gate merge (Qwen + DeepSeek, both APPROVE-WITH-CHANGES): six amendments applied - AC#11 reference-not-restate (resolves AC#11 vs AC#8 conflict), AC#12 file fix (control-plane article is README:32 not PRODUCT) + semantic coverage of the NORTH_STAR subscription-mode sentence, AC#1 inventory regenerated from disk (archive x4, root docs x2, weavelog-design filename), AC#2 grep scoped like AC#3, AC#4 reclassified as standing publish-time constraint (no publish-gate marker exists), description-only obligations promoted (ADR-0001 flag and anchor pin to AC#5, brief-dated-record + trace-link pointers to AC#6, follow-up-task creation to DoD#6, restatement-budget home and reviewer-semantics home to AC#8). New danglers added to AC#10: README inspired-by line, NORTH_STAR CONTRIBUTING.md link. AC#7 reworded to word-boundary policy phrases with per-hit human adjudication. Human calls recorded for execution: NOTICE Apache-2.0 section 4d attribution placement, privacy-audit blind spot for the real name frozen in the byte-identical brief, host naming pick (Codex vs ChatGPT-Codex).

2026-09-11 correction: the old publish-gate acceptance criterion is superseded. TASK-56 now retains only stale-document cleanup; ADR-007 resolves its reviewer-policy decision in TASK-79. The m-7 checklist, not this cleanup task, owns release blockers.

2026-09-13 shipping audit: preserve this task and its existing approved criteria, but remove it from the active release/SDK path. Revive when a specific stale document blocks a user or an active implementation task, or the human explicitly schedules cleanup. Fix release instructions in TASK-53 without starting a repository-wide prose sweep.
<!-- SECTION:NOTES:END -->

2026-09-07 carve-out (TASK-76 reorg): TASK-76 updated PATH LITERALS in root
AGENTS.md, docs/cli.md and ATTRIBUTION.md (docs/architecture/ -> docs/trd|adr|prd)
as part of the physical reorg. Semantic/single-source ownership of those files
stays with this task; this note prevents a double-move conflict at the merge gate.
