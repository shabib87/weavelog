---
id: TASK-29
title: >-
  Portable config layer — separate personal identity from reusable harness
  payload (OSS gate)
status: To Do
assignee: []
created_date: '2026-08-31 03:59'
updated_date: '2026-09-03 00:55'
labels: []
milestone: m-5
dependencies:
  - TASK-28
ordinal: 21000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
NAMED DEFERRAL (trigger: m-5 open-source-release work starting OR the next model-roster change — whichever comes first). Consult verdict (all 3 models, 2026-08-30): before OSS, personal identity must leave the payload. Scope: template/overlay layer so 16 agent files' pinned model IDs, opencode.jsonc personal policy (proxy port, secrets refs, headroom assumptions), and the model roster become a user-overridable profile; secrets injected from a documented location; packaging ships the curated subset only (never secrets/, backlog/, docs/research/, state/, reports/, logs/, .worktrees/). Depends on TASK-28's cli-vision doc + TASK-23's live-bytes manifest semantics (render layer slots between repo-read and live-write without changing drift semantics).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 WHEN a fresh user installs the CLI THEN agent files and opencode.jsonc are rendered from templates with a user profile (model roster, ports) and secrets injected from the documented secrets location — no personal defaults baked in
- [ ] #2 WHEN the packaging step runs THEN the exclusion list from cli-vision.md is enforced (nothing personal ships)
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Deferral recorded from TASK-23 session 2026-08-30 (deepseek NEEDS-RESCOPE finding 1 + kimi finding 3, resolved as post-v1).
<!-- SECTION:NOTES:END -->
