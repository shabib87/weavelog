---
id: TASK-8
title: Step 5 — difit human gate + three-action decision CLI
status: To Do
assignee: []
created_date: '2026-08-24 02:48'
updated_date: '2026-09-13 16:48'
labels: []
milestone: m-4
dependencies:
  - TASK-7
  - TASK-11
  - TASK-6
priority: medium
type: task
ordinal: 7000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
difit install/verify gate (not installed today; fallback = terminal). `harness approve|kickback|replan|stuck` decision CLI. Feedback via backlog notes (task-flow.ts wraps --append-notes; noReply: true for context injection into worker session). `backlog decision` (CLI-only) — record merge-gate decisions as first-class markdown artifacts in backlog/decisions/. Kick-back budget K=2 → auto-escalate. Worktree fate policy (kept on kick-back, deleted on replan/approve). difit parallel lifecycle: port allocation + kill by pid (from --background JSON) after decision; --background auto-adds --keep-alive + --no-open; --clean per review round for stale localStorage. Secret scrubbing: scrub secrets from reviewer findings before passing to difit --comment.

INVESTIGATION SCOPE (added 2026-09-01, owner request): (1) difit browser comments → batch prompt. Read the difit docs/source properly to determine whether/how comments saved in the browser (localStorage) can be exported and fed to the conductor as ONE batch prompt instead of N turn prompts — e.g. human leaves 5 comments, the decision step delivers a single turn containing all 5 messages (candidates to evaluate: difit API/export endpoints, localStorage read via a companion page or CLI, `--comment` JSON round-trip, browser extension/AppleScript bridge). Deliverable: documented export path + decision-CLI integration sketch; if difit has no export path, record that finding and the chosen workaround. (2) Auto-open contract: the conductor must ALWAYS auto-open difit in the browser for the human (never make the human click/paste a URL) and present the merge-gate question alongside it — this belongs in the decision-CLI flow, not ad-hoc chat.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 difit installed and verified (or fallback documented)
- [ ] #2 harness approve|kickback|replan|stuck decision CLI implemented
- [ ] #3 Feedback via backlog notes with noReply: true context injection
- [ ] #4 backlog decision records merge-gate decisions in backlog/decisions/
- [ ] #5 Kick-back budget K=2 → auto-escalate
- [ ] #6 Worktree fate policy: kept on kick-back, deleted on replan/approve
- [ ] #7 difit --background JSON parsed for pid; kill by pid after decision
- [ ] #8 --clean per review round for stale localStorage
- [ ] #9 Secret scrubbing in findings→--comment pipeline
- [ ] #10 Stuck-state alert surfaces via the harness stuck <id> decision CLI (moved from TASK-6 — CLI does not exist until this step)
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-09-13 draft review: TASK-7 now owns the standalone shipped reviewer repair. Keep the explicit TASK-6 dependency so this decision CLI cannot start before SDK dispatch and kick-back budgeting exist. It is not an npm-release blocker.
<!-- SECTION:NOTES:END -->
