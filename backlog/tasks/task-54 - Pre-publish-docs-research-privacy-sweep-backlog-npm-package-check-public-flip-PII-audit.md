---
id: TASK-54
title: >-
  Pre-publish: docs/research privacy sweep + backlog npm-package check +
  public-flip PII audit
status: To Do
assignee: []
created_date: '2026-09-05 23:39'
updated_date: '2026-09-05 23:45'
labels: []
dependencies: []
ordinal: 42000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Outcome for TASK-45 Step 0.5 (three distinct deliverables): (1) FULL docs/research privacy sweep — enumerate ALL notes under ~/.agents/docs/research at run time (50 dated notes + README as of 2026-09-05, no hardcoded count), record an explicit fate for every note (only the two public-safe notes named in TASK-45 Step 1.5 port: 2026-09-02-oss-agent-harnesses.md and 2026-09-02-loopeng-moat-analysis.md; all remaining notes STAY PRIVATE, excluded from the port); done-state = sweep report green + fates recorded. (2) SEPARATE backlog npm-package check — verify the published npm package does NOT contain backlog/ (package.json files allowlist + published-tarball inspection); this is NOT part of the scripts/privacy-audit grep. (3) PUBLIC-FLIP PII AUDIT (gates the GitHub repo flip to public ONLY, not publish): multi-scout divide-and-conquer scan of the flightlead working tree, git history of ALL branches (main, draft/v0.1.0-spec, archive/loopeng-history), ported backlog/, and ignored-but-present files; 3 analyze-fix-review loop passes; categories: identity strings (real name, /Users/shabibhossain absolute paths, personal emails, hostnames — NOT the brand handles shabib87/codewithshabib which are allowed), secrets/credentials incl. git history, private infrastructure (private repo URLs, proxy/LaunchAgent details), pre-rename loopeng references, personal content (in-my-voice, career/CV material, backlog decision text, competitor-strategy notes). Git history cannot be fixed by file deletion — git filter-repo / clean squash or repo-stays-private. Repo remains PRIVATE until this audit passes. Why: TASK-45 PORT PLAN v8 gates tag/publish on (1)+(2) closure and the public flip on (3).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 WHEN the docs/research sweep runs THEN every enumerated note under ~/.agents/docs/research SHALL have a recorded fate (PORT the two named public-safe notes / STAY PRIVATE for all others) and the sweep report SHALL be green
- [ ] #2 WHEN the published npm tarball is inspected THEN it SHALL contain zero files under backlog/
- [ ] #3 IF the public-flip PII audit has not passed its 3 analyze-fix-review loop passes THEN the flightlead GitHub repo SHALL remain private
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
2026-09-05 (TASK-45 0.6 escalation): branch protection on flightlead main added to this ticket as a pre-publish precondition — GitHub blocks protection on private repos without Pro (403 verified). Human decision 2026-09-05: defer to pre-publish. Enable via gh api repos/shabib87/flightlead/branches/main/protection (required check: verify, strict) before tag/publish; the .github/publish-gate marker flip depends on it.
<!-- SECTION:NOTES:END -->
