---
id: TASK-46
title: Fix opencode context-window gauge misreport + canary rollover guardrail
status: To Do
assignee: []
created_date: '2026-09-05 16:58'
updated_date: '2026-09-05 16:58'
labels: []
dependencies: []
priority: high
type: bug
ordinal: 35000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The opencode context-window gauge is unreliable. Case study: session ses_f9af9b11affejc4IUVYirSur9P ('Harness naming ideas (not loopeng)') reached 194 messages and degraded into wild hallucination while the gauge read 10-15% the whole time, so no thread-rollover action was taken. A context gauge that under-reads is worse than none — it suppresses the start-a-new-thread instinct. Fix the gauge, then add a canary guardrail as a conductor default that hints thread rollover on recall failure. Scope note from grooming: the canary-technique search (small) happens INSIDE this task as the first step, not as a separate research note.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 WHEN session ses_f9af9b11affejc4IUVYirSur9P is analyzed as the case study THEN the root cause of the gauge reading 10-15% while the 194-message session degraded into hallucination SHALL be identified and documented, with the headroom-proxy usage-reporting divergence as a prime suspect to confirm or eliminate
- [ ] #2 WHEN the root cause is fixed THEN the context gauge SHALL reflect actual model context consumption during long sessions, verified by reproducing the case-study conditions and showing the gauge climbing past the previously stuck range
- [ ] #3 WHEN a canary token is planted early in a session THEN the conductor SHALL periodically demand it be echoed, and WHEN recall fails or degrades THEN the conductor SHALL receive a thread-rollover hint
- [ ] #4 WHEN the canary guardrail ships THEN it SHALL be a conductor default requiring no per-session opt-in
<!-- AC:END -->
