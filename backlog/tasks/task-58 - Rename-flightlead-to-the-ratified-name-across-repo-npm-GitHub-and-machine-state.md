---
id: TASK-58
title: >-
  Rename flightlead to the ratified name across repo, npm, GitHub, and machine
  state
status: In Progress
assignee:
  - '@opencode'
created_date: '2026-09-06 07:27'
updated_date: '2026-09-06 08:33'
labels:
  - harness
  - spec-approved
dependencies:
  - TASK-57
priority: high
type: chore
ordinal: 46000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Outcome: the project carries ONE name everywhere — code, docs, npm, GitHub, machine state — with zero stale references in tracked files. Scope (the hassle map, ratified 2026-09-06): (1) in-repo sweep: package.json name+bin, flightlead.json manifest (filename becomes <name>.json + all references), CLI help/output strings, tests pinning those strings, README/NOTICE/ATTRIBUTION trademark lines ('<name> name/logo (c) Shabib Hossain — not covered by the code license'), docs spine + docs/architecture + CHANGELOG; (2) npm: abandon the 0.0.0 placeholder, claim <name> (2FA publish by human, minimal placeholder or straight to real publish if all gates allow); (3) GitHub: rename repo (human, redirects), git remote set-url; (4) machine state: mv ~/.local/state/flightlead -> ~/.local/state/<name>, rewrite com.flightlead.check plist (label <name>.check, pinned argv, logs path), bootout/bootstrap, doctor verify; (5) optional human call: ~/Projects/flightlead dir rename. Why: user finds the name unsatisfying and ratified rename-everything as the highest-priority post-port task (2026-09-06); doing it now (pre-0.1.0, pre-public) costs one mechanical session vs breaking install docs post-publish. Preconditions: TASK-57 ratifies the name. Postcondition wiring: this task blocks TASK-53, TASK-55, TASK-56, and the publish flow. Precedent: the loopeng->flightlead rename (commit 7a3bd18) was the same operation.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 WHEN the rename completes THEN grep across tracked files SHALL find zero occurrences of the old name outside git history and backlog/ historical task text, and every occurrence of the new name SHALL be consistent (package.json, manifest, CLI output, docs, plist)
- [ ] #2 WHEN the new LaunchAgent is loaded THEN the renamed CLI check --stack-only SHALL exit 0 from the pinned argv and the old com.flightlead.check plist SHALL be bootout-ed and deleted with doctor green
- [ ] #3 IF the npm name is free THEN it SHALL be claimed under the human's account (shabibhossain) with a minimal placeholder or the real publish, verified via npm view
- [ ] #4 WHEN all gates re-run (npm test, tsc, biome, privacy-audit, doctor, check, backlog task list) THEN all SHALL exit green with the new name
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Tests and lint pass with fresh output in the worktree
- [ ] #2 Worktree is clean (no uncommitted changes)
- [ ] #3 Branch is rebased on main and green
- [ ] #4 All acceptance criteria checked with fresh evidence (one at a time, never batched)
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. SCOPE: old names = loopeng AND flightlead (TASK-39 absorbed). Exclusions: .git history, backlog/ (historical task text). Survey baseline 2026-09-06: 363 flightlead + 567 loopeng occurrences in tracked files excl. backlog.
2. IN-REPO SWEEP (agent, worktree): package.json name+bin; git mv flightlead.json -> weavelog.json + all references; payload tokens FLIGHTLEAD_* -> WEAVELOG_* (env example, templates, src defaults incl. config-sync state path, agents-install, FLIGHTLEAD_PI_BIN seam); CLI help/output strings; tests pinning strings; README (incl. name-origin paragraph from ratified rationale) / NOTICE / ATTRIBUTION trademark lines; docs spine + architecture + cli.md + specs + ROADMAP/PRODUCT; CHANGELOG; loopeng text in ADRs/learnings/research/archive + git mv of files with old names in filenames.
3. GATES (fresh evidence, one at a time): npm test, tsc --noEmit, biome check, scripts/privacy-audit, npm run build + node dist/cli/index.js --help, zero-occurrence grep (AC#1).
4. HITL SEQUENCE (flagged, NOT agent-executed): (a) human renames GitHub repo -> agent git remote set-url; (b) human claims npm weavelog (2FA; flightlead 0.0.0 placeholder disposition recorded); (c) human renames ~/Projects/flightlead -> weavelog; (d) THEN agent machine-state: update live .env tokens, mv ~/.local/state/flightlead -> weavelog, rewrite plist label com.weavelog.check (pinned argv to post-rename path), bootout old, bootstrap new, doctor green.
5. Close TASK-39 as absorbed; check ACs one at a time with fresh evidence.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
I have chosen `Weavelog ` as the name of this project. And here's the reasoning that aligns with NORTH_STAR and PRODUCT:

```
The name `Weavelog` comes straight from the project's own non-negotiables. North Star describes verification gates as "woven into every loop," a phrase used for both the general loop and security specifically. Weave is the composition principle: this harness composes an opinionated stack from existing tools rather than building new ones. Log is the evidence principle: every gate produces a receipt, every run appends to the JSONL ledger. Weavelog names both halves of the tool in one word: what it composes, and what it proves.
```

A version of this should be added to README.

2026-09-06 SPEC APPROVED (HITL gate, human in-thread): ACs ratified AS SPECIFIED plus one human-approved amendment: SWEEP BOTH OLD NAMES (loopeng AND flightlead) and ABSORB TASK-39 (its loopeng->flightlead docs rename is superseded; one sweep covers both). Conflict evidence (recorded in TASK-57 closure): npm weavelog 404/free, GitHub clear, weavelog.net near-match = 0-star personal HTML site (no conflict), wandb/weave + opencode-weave = adjacency awareness only. Name-origin paragraph from the ratified rationale goes into README.

2026-09-06 IMPLEMENTATION COMPLETE on task/TASK-58 (commits 96edcc8 + 7e17fcf, executed via implementer then conductor-verified): full sweep of BOTH old names (flightlead 363 + loopeng 567 occurrences at baseline). Renames: flightlead.json->weavelog.json, src/weavelog-manifest.ts, ADR/learnings/research/specs/superpowers filenames; FLIGHTLEAD_* tokens -> WEAVELOG_*; CLI strings; plist label com.weavelog.check in src; README + name-origin rationale; AGENTS.md reconciled to real repo layout + Apache-2.0 + payload/AGENTS.md aligned. GATE EVIDENCE: npm test 598/598 pass 0 fail 0 skip; tsc --noEmit 0; build 0; node dist/cli/index.js --help exit 0 shows weavelog; privacy-audit exit 0 (after implementing recorded [AMEND-R4-3] backlog/ exclusion that was missing from the script); zero-occurrence grep: flightlead 0, loopeng 0, flighlead-typo 0, weavelog 940. ENV FIXES (worktree-local, not repo changes): symlinked node_modules into worktree (was absent -> absolute TSX_LOADER spawn failed); biome format --write on 4 files (package.json, cli/index.test.ts, payload/manifest.test.ts, worktree-create.test.ts). KNOWN PRE-EXISTING BLOCKER (NOT caused by sweep, evidence recorded): biome gate broken repo-wide — main tree fails config parse ('Biome exited because the configuration resulted in errors', biome 2.5.5 wants migrate); worktree run flags style findings (noExplicitAny, noNonNullAssertion, useTemplate) in files BYTE-IDENTICAL to main (verified src/reviewer-loop.ts). AC#4 biome clause cannot go green without a biome-config fix task. Node-modules-symlink + TASK.md stub accidentally committed then amended out; .gitignore hardened (node_modules without trailing slash + TASK.md).
<!-- SECTION:NOTES:END -->
