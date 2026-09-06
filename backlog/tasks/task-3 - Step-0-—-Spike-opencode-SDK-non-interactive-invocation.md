---
id: TASK-3
title: 'Step 0 — Spike: opencode SDK non-interactive invocation'
status: To Do
assignee: []
created_date: '2026-08-24 02:48'
updated_date: '2026-09-05 23:01'
labels: []
milestone: m-4
dependencies:
  - TASK-11
priority: high
type: spike
ordinal: 2000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Blocking spike — gate everything on this. Verify opencode SDK (`@opencode-ai/sdk`) can run non-interactively under bun. Success criteria: (1) `createOpencode()` + `session.prompt({format: json_schema})` + `session.abort()` + `event.subscribe()` reliability under bun; (2) v1 vs v2 surface — pin which surface the `format` field lives on (json_schema is v2-only); (3) Named events — verify `session.idle`, `session.error`, `session.diff`, `session.compacted` fire; (4) `noReply` context injection — verify `session.prompt({body: {noReply: true}})` injects context without response; (5) `StructuredOutputError` handling — verify error name in `result.data.info.error?.name`; (6) Abort-cost semantics — does `session.abort` yield a final cost chunk? Apply pessimistic rule if not; (7) Abort deadline / kill ladder — `session.abort(deadlineMs)` → `server.close()`; (8) Plugin hooks fire under in-process serve — `tool.execute.before/after`, custom `tool()`, `shell.env`, `experimental.session.compacting`; (9) Deny-list enforcement — native permission globs (`edit: {"backlog/**": "deny"}`) as primary, `tool.execute.before` as second layer, `--auto` / `permission: {"*": "allow"}` for non-denied, `permission.asked` event as deny-list-miss detector; (10) `reasoning_effort` through headroom proxy — probe that proxy passes it through (use "high"; "max"="xhigh" per docs); (11) Headroom CCR TTL probe — default 1800s, verify long sessions don't degrade; (12) Agent `steps` limit — verify `steps: N` caps iterations.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 createOpencode() + session.prompt + session.abort + event.subscribe all work under bun
- [ ] #2 v1 vs v2 surface pinned — format: json_schema confirmed on v2 surface
- [ ] #3 Named events verified: session.idle, session.error, session.diff, session.compacted fire as documented
- [ ] #4 noReply context injection verified — session.prompt({body: {noReply: true}}) injects without response
- [ ] #5 StructuredOutputError handling verified — error name appears in result.data.info.error?.name
- [ ] #6 Abort-cost semantics resolved — session.abort yields final cost chunk or pessimistic rule applied
- [ ] #7 Plugin hooks fire under in-process serve — tool.execute.before/after, custom tool(), shell.env, experimental.session.compacting
- [ ] #8 Deny-list enforcement verified — native permission globs block writes to backlog/, AGENTS.md, .harness/
- [ ] #9 reasoning_effort passes through headroom proxy — no 400 errors
- [ ] #10 Headroom CCR TTL impact on long sessions probed and documented
- [ ] #11 Agent steps limit verified — steps: N caps iterations and triggers summarize-and-recommend
- [ ] #12 WHEN the spike probes #9/#10 through the headroom proxy THEN a request with usage: {include: true} SHALL return cost data unstripped by the proxy, and the per-request cost as seen by the caller SHALL be recorded in the spike findings
<!-- AC:END -->
