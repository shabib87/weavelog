---
id: TASK-65
title: >-
  Composed-surface trust model — L0-L4 ADR, per-tool trust table, MCP
  pin-or-accept (deferred)
status: To Do
assignee: []
created_date: '2026-09-06 20:06'
updated_date: '2026-09-06 21:54'
labels:
  - deferred
dependencies:
  - TASK-45
  - TASK-62
  - TASK-64
  - TASK-63
priority: medium
ordinal: 53000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Decision-only, deferred. Define and persist the declare-only trust model for everything weavelog composes but does not ship: layered model L0 weavelog npm package, L1 host tools declare-only, L2 MCP servers and plugins pin-or-accept, L3 wired CLIs, L4 model-API endpoints declare-only. Deliverable: a numbered ADR plus a dated research note containing the per-tool trust table (tier, install channel from the post-C vocabulary npm/uv/brew/app/git, update mechanism, audit strength, blast radius across filesystem, network egress, model traffic and secrets, verdict) covering headroom, backlog, pi, opencode, markitdown, uv, node, rtk, semgrep, diagram-design and every MCP server and plugin in the payload opencode config; explicit pin-or-accept verdicts per MCP entry including chrome-devtools-mcp@latest and egress declarations for tavily and context7; build-or-not verdicts for hash-drift and semantic-compat detection (detection only; the rtk 0.38 to 0.48 grep flag-semantics change is the motivating case); per-entry weavelog.json extension verdicts (rtk, semgrep, node, uv, an MCP manifest section) keeping weavelog.json the single whole-stack manifest. Out of scope: OS sandboxing (TASK-60), egress enforcement, reopening the SECURITY.md composed-tools boundary, implementing against the frozen archive (docs/archive/tbd), drift-detection implementation. REVIVE TRIGGER: earliest of (1) weavelog init or sync begins writing L2 composition (MCP servers or plugins) into a user config, (2) planning begins for the first post-v0.1.0 version milestone — assign this ticket to that milestone at revival, (3) a security report or OSS issue concerning a composed third-party surface. At revival: re-label per the decision table (expect harness), re-present these ACs at the HITL spec gate, then claim.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 WHEN the trust model lands THEN a numbered ADR SHALL persist the L0-L4 model with per-layer enforcement posture and explicit out-of-scope pointers
- [ ] #2 WHEN the trust table commits THEN every composed surface SHALL hold exactly one row with tier, channel, update mechanism, audit strength, blast radius and verdict
- [ ] #3 WHEN MCP handling is decided THEN each wired MCP server SHALL carry a pinned-or-accepted-floating verdict with rationale, explicitly covering chrome-devtools-mcp@latest, and each remote server SHALL carry a declared egress endpoint and key-handling posture
- [ ] #4 WHEN the ticket closes THEN build-or-not verdicts for hash-drift detection and semantic-compat checking SHALL be recorded with rationale and explicit reopen triggers
- [ ] #5 WHEN the manifest decisions land THEN per-entry tracked or not-tracked verdicts SHALL be recorded for rtk, semgrep, node, uv and an MCP manifest section, keeping weavelog.json the single whole-stack manifest
- [ ] #6 WHEN this ticket closes at revival THEN the revive trigger SHALL be quoted verbatim in the ADR and the then-current milestone assigned per the trigger
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Tests and lint pass with fresh output in the worktree
- [ ] #2 Worktree is clean (no uncommitted changes)
- [ ] #3 Branch is rebased on main and green
- [ ] #4 All acceptance criteria checked with fresh evidence (one at a time, never batched)
<!-- DOD:END -->
