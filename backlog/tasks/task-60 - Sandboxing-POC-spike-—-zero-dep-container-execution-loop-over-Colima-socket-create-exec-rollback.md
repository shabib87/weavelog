---
id: TASK-60
title: >-
  Sandboxing POC spike — zero-dep container execution loop over Colima socket
  (create/exec/rollback)
status: To Do
assignee: []
created_date: '2026-09-06 16:14'
updated_date: '2026-09-06 21:54'
labels:
  - harness
  - deferred
dependencies: []
references:
  - 'https://github.com/abiosoft/colima'
  - 'https://bun.com/docs/guides/http/fetch-unix'
priority: medium
type: spike
ordinal: 48000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Validate and operationalize the 2026-09-06 sandboxing research with a working spike in this repo: a zero-added-dependency module that runs tool commands inside an ephemeral Colima container with the task git worktree bind-mounted, captures stdout/stderr and exit codes, and destroys the container on exit (rollback). Deliverables: (1) runner module plus tests under the repo node toolchain (node --import tsx); (2) the research note mirrored into repo docs/research/; (3) the trade-off matrix plus recommendation for integrating sandboxed execution into the inner-harness execution state machine (m-4 steps TASK-3..10) recorded as the final summary with confidence levels; (4) an answer or explicit deferral for every open question in research note §7 — top risk: a linked worktree .git FILE may break git in-container under a single-dir bind-mount. Toolchain note: the research note reference snippet is Bun-specific (fetch with {unix}); on the repo node-only toolchain the zero-dep equivalent is Node bundled undici dispatcher (or dockerode if the human approves the dependency) — the spike resolves and records this. Why: today isolation is file-level (git worktrees, TASK-11). Process-level sandboxing prevents host side effects and makes execution loops deterministic; the competitor scan (docs/research/2026-09-02-oss-agent-harnesses.md) flags OS-sandbox enforcement as weavelog gap vs keel. Machine note: colima/docker are NOT installed on this machine; `brew install colima docker` requires explicit human approval — live-daemon criteria stay uncheckable until that approval.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 WHEN the sandbox runner module runs under the repo node toolchain (node --import tsx) against a running Colima THEN it creates a container, executes a command, returns stdout/stderr plus the exit code, and destroys the container, adding zero new npm runtime dependencies unless the human explicitly approves one
- [ ] #2 WHEN an executed command exits non-zero THEN the runner returns the exit code as data (no unhandled throw) and still destroys the container
- [ ] #3 IF the Colima socket is absent THEN the runner fails fast with an actionable error naming the install prerequisite (colima docker) and never hangs silently
- [ ] #4 WHEN git status and git commit are exercised inside the container against a bind-mounted linked worktree THEN the working-or-broken result and the chosen mount strategy are recorded in the POC report
- [ ] #5 WHEN the spike completes THEN docs/research/2026-09-06-sandboxing-substrates.md is mirrored into the repo docs/research/, the trade-off matrix plus recommendation are recorded as the final summary with confidence levels, and every §7 open question has an answer or explicit deferral
- [ ] #6 IF human approval for installing Colima is absent THEN live-daemon acceptance criteria are marked blocked in notes, never passed
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Tests and lint pass with fresh output in the worktree
- [ ] #2 Worktree is clean (no uncommitted changes)
- [ ] #3 Branch is rebased on main and green
- [ ] #4 All acceptance criteria checked with fresh evidence (one at a time, never batched)
- [ ] #5 POC report and code pass a sanitization scan before merge (no absolute home paths, no secrets)
- [ ] #6 docs/tbd/rollback-mechanism.md updated with a cross-reference to the destroy-on-finally pattern
<!-- DOD:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-09-06 (human): deferred — not immediate work, priority medium. At pickup: run the 4-model plan-gate review loop (glm/qwen/deepseek/kimi) on this spec BEFORE claim, then re-present the HITL spec gate for explicit approval (spec-approved), then metadata-merge the task branch to main and dispatch.
<!-- SECTION:NOTES:END -->
