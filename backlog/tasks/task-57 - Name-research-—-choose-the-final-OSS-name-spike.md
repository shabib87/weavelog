---
id: TASK-57
title: Name research — choose the final OSS name (spike)
status: Done
assignee: []
created_date: '2026-09-06 07:26'
updated_date: '2026-09-06 08:03'
labels: []
dependencies: []
priority: high
type: spike
ordinal: 45000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Outcome: a ratified final OSS name replacing 'flightlead' (user is unsatisfied with the name; decision 2026-09-06). Deliverable = shortlist of 3-5 candidates each with: npm availability (registry search + exact-name check), GitHub repo/org name availability, domain plausibility, quick trademark/conflict sanity check (existing OSS projects with similar names), pronunciation/spelling robustness, and fit with the product (the inner harness: agent work you can audit). Human makes the final pick; this task ONLY researches and presents. Why: rename-everything is the highest-priority follow-up of the port (user decision 2026-09-06) and must complete BEFORE the name-bearing pre-publish work (TASK-53 voice-pass, TASK-56 cleanup, TASK-55 hooks, publish) to avoid doing them twice. Research method: researcher subagent for landscape/availability, human ratifies shortlist then final pick in-thread.
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Tests and lint pass with fresh output in the worktree
- [ ] #2 Worktree is clean (no uncommitted changes)
- [ ] #3 Branch is rebased on main and green
- [ ] #4 All acceptance criteria checked with fresh evidence (one at a time, never batched)
<!-- DOD:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-09-06 NAME RATIFIED: Weavelog (human decision in-thread). Availability evidence gathered per spike deliverable: (1) npm registry: 'npm view weavelog' -> E404, exact name AVAILABLE (as of 2026-09-06T08:02Z); (2) GitHub: no repo named exactly 'weavelog' blocks shabib87/weavelog (repo names are per-account); 2 near-matches exist: KentaKamei/weavelog.net (small personal project, active 2026-08) and svilupp/WeaveLoggers.jl (Julia, different name); (3) domains: weavelog.com RESOLVES (taken/parked), weavelog.dev + weavelog.io no DNS (plausibly available, DNS non-resolution is not proof of purchase availability); (4) conflict sanity: zero prominent OSS projects named 'Weavelog'; 'weave' namespace is crowded but no direct collision — closest adjacency is wandb/weave (AI tracing/logging toolkit, different two-word name 'Weave by W&B') and pgermishuys/opencode-weave (opencode plugin, scoped @opencode_weave/weave) — noted for awareness, not blockers; (5) pronunciation/spelling: single phonetic word, robust; (6) fit: rationale recorded in TASK-58 notes (weave = composition principle, log = evidence principle, straight from North Star non-negotiables). Human pick = final; spike closes with the name ratified.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Name ratified: Weavelog. Verified with fresh evidence: npm registry 404 (name free), no blocking GitHub repo, .dev/.io DNS-clear (.com taken), zero direct OSS conflicts (wandb/weave + opencode-weave noted as adjacency only). Human pick recorded 2026-09-06; TASK-58 unblocks.
<!-- SECTION:FINAL_SUMMARY:END -->
