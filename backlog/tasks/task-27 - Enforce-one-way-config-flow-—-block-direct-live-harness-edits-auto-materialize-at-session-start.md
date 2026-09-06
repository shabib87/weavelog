---
id: TASK-27
title: >-
  Enforce one-way config flow — block direct live-harness edits,
  auto-materialize at session start
status: Done
assignee:
  - '@conductor'
created_date: '2026-08-31 03:57'
updated_date: '2026-09-01 05:19'
labels: []
milestone: m-3
dependencies: []
ordinal: 19000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
TASK-23
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 WHEN an agent tool write/edit targets a live harness path (~/.config/opencode/**) THEN the opencode plugin blocks it with a message directing the edit to ~/.agents/config/** + how to materialize; a documented escape hatch exists for intentional one-off live changes
- [x] #2 WHEN an opencode session starts THEN config-sync runs automatically forward (repo -> live) and changed tracked files materialize without prompting
- [x] #3 WHEN live differs from the manifest but repo matches it (out-of-band live edit) THEN the session-start check fails loudly naming the file + the one-command adopt path (--adopt); it NEVER silently adopts
- [x] #4 IF both repo and live differ from the manifest THEN a conflict is surfaced and nothing auto-copies until the human resolves it
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Hook 8 (enforce.ts): block edit/write targeting ~/.config/opencode/** — message points to repo copy + config-sync command; escape hatch ENFORCE_ALLOW_LIVE_EDIT=true; bash-path edits remain a documented best-effort gap (session-start drift check catches them). 2. Hook 9 (enforce.ts event, session.created): run config-sync forward (no flags) with timeout, fail-open on machinery errors; stash refusal report + surface loudly via tool.execute.after metadata once per session; never auto-adopt (--adopt/--force not passed). 3. TDD red-first tests in bin/test/enforce-hooks.test.ts for both hooks. 4. Update runbook + enforce recovery doc with new hooks + escape hatch. 5. Deploy: manual cp of enforce.ts to live plugins/ (plugins stay a named deferral) + live verification.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Created from TASK-23 session 2026-08-30: owner chose one-way flow over two-way auto-sync — 'restrict direct edit on ~/.config/opencode to ensure single source of truth'.

Implemented Hooks 8+9 in plugins/enforce.ts (TDD red-first, 17 new tests): Hook 8 blocks edit/write under ~/.config/opencode/** with repo+materialize message, escape hatch ENFORCE_ALLOW_LIVE_EDIT=true, prefix boundary + fail-open covered; Hook 9 runs config-sync forward (no --force/--adopt) once per session on session.created (fail-open on missing script/throw/exit 2), refusal (exit 1) stashed and surfaced once as config_sync_warning tool metadata naming file + --adopt, never silently adopted. Full suite 343 pass / 0 fail; biome clean (2 pre-existing warnings untouched). Docs updated: enforce recovery runbook (hook table rows 7-9? — 8/9 + escape hatch), runbook 6.10, plugin header.

Review round applied (2-family kimi APPROVE-WITH-FIXES + qwen REJECT; deepseek timed out both rounds): canonicalized Hook 8 prefix check (realpath + dangling-symlink readlink + depth-5 cycle guard + defensive lexical fallback, root canonicalized too — macOS /var symlink fix); Hook 9 switched to async Bun.spawn (event loop never blocked; runner owns its timeout; injected runners get withTimeout) with cwd=home; pendingConfigWarnings + syncedSessions LRU-capped at 100 (Map evicts oldest — dead sessions cannot leak); refusal also appended to log; configSyncArgv exported pure + argv contract test (no --force/--adopt); symlinked-home test fixed (was vacuous); cycle-guard test added; recovery runbook: rollback story (git IS the backup), bash-gap + one-session-lag, latency/race notes, partial-disable step now edits the REPO copy. REJECTED with rationale: fire-and-forget sync (loses warning to race — worse than bounded wait), SRP plugin split, pre-sync backup (git history is the backup). Suite 351/0; redeployed to live byte-identical, plugin loads, config-sync 21 skip exit 0.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: @conductor
created: 2026-09-01 03:44
---
Remaining before finalize: live deploy (cp enforce.ts to ~/.config/opencode/plugins/) + live verification per ACs.
---

author: @conductor
created: 2026-09-01 04:07
---
3-family diff review: kimi APPROVE-WITH-FIXES (all majors/minors fixed), qwen REJECT (blockers fixed or rejected-with-rationale above), deepseek timeout x2 (noted; two independent families already converged). Ready for human merge gate.
---
<!-- COMMENTS:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Enforced the one-way config flow (TASK-27): Hook 8 in plugins/enforce.ts blocks edit/write to ~/.config/opencode/** with a canonicalized prefix check (realpath + dangling-symlink + cycle guard) directing edits to ~/.agents/config/** + config-sync, escape hatch ENFORCE_ALLOW_LIVE_EDIT=true (AC #1); Hook 9 runs config-sync forward-only (async Bun.spawn, cwd=home, no --force/--adopt) once per session on session.created, changed tracked files materialize without prompting (AC #2); an out-of-band live edit (exit 1) is stashed per session and surfaced loudly once as config_sync_warning metadata naming the file + the --adopt path, never silently adopted (AC #3); a both-sides-changed conflict comes back as the same loud refusal with no auto-copy and no rescuing flag (AC #4). Verified: 83 enforce-hook tests + 351 suite pass / 0 fail; 2-family cross-model review (kimi approve-with-fixes, qwen reject — blockers fixed or rejected with recorded rationale) applied and re-verified; deployed to ~/.config/opencode/plugins/ byte-identical, plugin loads, live config-sync 21x skip exit 0; runbook 6.10 + enforce recovery runbook updated (bypass flags, rollback, smoke check).
<!-- SECTION:FINAL_SUMMARY:END -->
