---
id: TASK-47
title: OpenRouter usage telemetry — continuous local trend dashboard skill
status: To Do
assignee: []
created_date: '2026-09-05 16:59'
updated_date: '2026-09-06 18:19'
labels: []
milestone: m-7
dependencies: []
priority: medium
type: feature
ordinal: 36000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Continuous, user-facing local telemetry: an ongoing capability (not a one-time analysis) so the owner AND any harness user can see cost/token-efficiency trends over time — harness maturity vs spend as a live dashboard. Two motivations: dogfood proof material (v0.1.0 publish) and a user-facing skill. Headroom ships a version but it is too odd and does not show proper OpenRouter data. Feeds from and feeds the TASK-6 substrate ACs (usage.include, activity API, credits). Scope note from grooming: depends heavily on what OpenRouter's APIs actually provide — probe that first; data retention limits are why the capture layer matters early (history evaporates, analysis can wait).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 WHEN the OpenRouter usage APIs are probed THEN the data surface and retention limits of activity, credits, and usage.include SHALL be documented, determining dashboard feasibility and whether a capture-cron must start before the dashboard is built
- [ ] #2 WHEN headroom's dashboard is investigated THEN the reason it does not show proper OpenRouter data SHALL be recorded, and the fix SHALL be either applied upstream or the dashboard explicitly built independent of headroom
- [ ] #3 WHEN the telemetry skill runs THEN any harness user SHALL see a local dashboard of cost, tokens, and cache-hit trends over time from locally captured data, with no external service dependency
- [ ] #4 WHEN trend analysis runs THEN harness-maturity vs cost/token-efficiency trends SHALL be visible as supplementary dogfood proof material suitable for thesis/v0.1.0 publish use
<!-- AC:END -->
