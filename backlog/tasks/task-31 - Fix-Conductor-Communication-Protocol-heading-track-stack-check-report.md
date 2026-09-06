---
id: TASK-31
title: Fix Conductor Communication Protocol heading; track stack-check report
status: Done
assignee: []
created_date: '2026-09-01 03:30'
updated_date: '2026-09-05 18:39'
labels:
  - housekeeping
dependencies: []
ordinal: 23000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Retrospective spec (backfilled under TASK-51). The Conductor Communication Protocol heading was missing from the materialized ~/.config/opencode/AGENTS.md and the stack-check report did not track it. Fix: add the heading to the source AGENTS.md and verify stack-check reports it.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 WHEN config-sync materializes AGENTS.md THEN the Conductor Communication Protocol heading appears in ~/.config/opencode/AGENTS.md
- [ ] #2 WHEN stack-check runs THEN the report includes the Conductor Communication Protocol heading check
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Merged via fast-forward; config-sync conflict resolved by re-adopting baseline
<!-- SECTION:NOTES:END -->
