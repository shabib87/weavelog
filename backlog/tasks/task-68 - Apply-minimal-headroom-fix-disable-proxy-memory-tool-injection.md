---
id: TASK-68
title: Apply minimal headroom fix - disable proxy memory-tool injection
status: To Do
assignee: []
created_date: '2026-09-06 22:11'
updated_date: '2026-09-06 22:12'
labels:
  - harness
dependencies: []
ordinal: 56000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Stop the recurring 'Model tried to call unavailable tool memory_save' bounce in opencode sessions. Root cause (verified 2026-09-06, see ~/.agents/docs/research/2026-09-06-headroom-memory-opencode-bounce.md): the launchd proxy com.headroom.proxy runs --memory, which injects memory tool schemas into every forwarded request; opencode validates tool calls against its own client-side registry and bounces injected tools. Minimal fix: add --no-memory-tools to ~/Library/LaunchAgents/com.headroom.proxy.plist ProgramArguments while keeping --mode cache, --memory, --memory-storage project and the HEADROOM_MODEL_ALIAS_MAP env byte-identical; back up the plist first; reload via launchctl bootout+bootstrap; verify savings, doctor, and no bounce across opencode/Claude Code/Codex; update the research doc. The broader stay/leave/build tool decision is tracked separately.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 WHEN the plist is edited, THE edit SHALL be preceded by a timestamped backup copy of com.headroom.proxy.plist
- [ ] #2 WHEN the proxy reloads via bootout+bootstrap, THE ProgramArguments SHALL contain --no-memory-tools while --mode cache, --memory, --memory-storage project and the HEADROOM_MODEL_ALIAS_MAP environment value remain byte-identical to the backup
- [ ] #3 WHEN a fresh opencode session runs, NO 'unavailable tool memory_save' bounce SHALL occur
- [ ] #4 WHILE the proxy serves traffic after the change, THE savings counters in ~/.headroom/proxy_savings.json SHALL continue to increase relative to a pre-change snapshot
- [ ] #5 WHEN headroom doctor -p 8788 runs post-change, IT SHALL report 0 failures with warnings unchanged from the pre-change baseline
- [ ] #6 IF any client (opencode, Claude Code, Codex) fails after the change, THEN the plist backup SHALL be restored and reloaded as the documented rollback
- [ ] #7 WHEN the work completes, THE research doc 2026-09-06-headroom-memory-opencode-bounce.md SHALL record the applied change and verification evidence
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Tests and lint pass with fresh output in the worktree
- [ ] #2 Worktree is clean (no uncommitted changes)
- [ ] #3 Branch is rebased on main and green
- [ ] #4 All acceptance criteria checked with fresh evidence (one at a time, never batched)
<!-- DOD:END -->
