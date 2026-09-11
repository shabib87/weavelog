---
id: TASK-79
title: >-
  Loop taxonomy research — repo synthesis + harness comparison + loop command
  names
status: In Progress
assignee:
  - conductor
created_date: '2026-09-07 23:36'
updated_date: '2026-09-11 01:55'
labels:
  - spec-approved
dependencies: []
references:
  - >-
    https://www.linkedin.com/posts/addyosmani_the-four-kinds-of-loops-activity-7502269317582049280-CtvQ
documentation:
  - docs/AUTHORING.md
  - docs/research/2026-08-15-addy-loop-engineering-series.md
  - docs/research/2026-08-16-primitive-selection.md
priority: high
ordinal: 62500
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Large orchestrated research: settle how weavelog scales its conductor (full orchestration vs small runs), where loop behavior lives (skills/commands vs root AGENTS.md), and name the loop command surface. Outcome: a research doc at `docs/research/2026-09-07-loop-taxonomy-research.md` following the AUTHORING.md research schema (frontmatter: date=filename prefix, topic, status, non-empty sources, models_used_for_research, supersedes; validated with frontmatter-check). Required corpus: full backlog (task list + DONE history), docs/architecture/ (loop-factory, worktree-discipline, tool-boundaries, model-routing), ADR index, and prior research — esp. 2026-08-15-addy-loop-engineering-series, 2026-08-15-loop-primitives-claude-codex-sdk, 2026-08-15-unified-sequencing, 2026-08-16-model-tiered-agents, 2026-08-16-primitive-selection, 2026-08-16-agentsmd-root-vs-subdirs, 2026-08-16-agentsmd-hygiene, 2026-08-16-work-management-layer-selection, 2026-08-23-agentic-architecture-pattern. External: multiple research agents using BOTH Tavily and Exa, findings dated and attributed. Method: conductor orchestration — recorded plan, plan-gate review before dispatch, >=2 fresh-context cross-model reviewers on the draft, verify-with-criteria before done. Output sections: four-loop taxonomy (turn/goal/time/proactive) mapped to weavelog, peer-harness practice Sept 2026, recommended loop command names with HITL pause points and CLI triggers, agent-primitives implications, and how it feeds the future PRD -> TRD -> ADR -> TASK chain. Needs reconciliation after TASK-76 (docs restructure) merges — carry reconciliation notes, do not pre-emptively restructure. Out of scope: implementing any loop command, restructuring docs (TASK-76 owns that), editing NORTH_STAR.md / docs/research/RESEARCH.md; docs/learnings/ is being archived and is NOT the deliverable target.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 WHEN the research completes THEN a doc exists at docs/research/2026-09-07-loop-taxonomy-research.md carrying the AUTHORING.md research frontmatter (date matching filename prefix, topic, status, non-empty sources, models_used_for_research, supersedes) and passes frontmatter-check validation
- [ ] #2 IF the research doc recommends loop commands THEN each recommended name maps to one taxonomy tier (turn/goal/time/proactive), states its HITL pause points, and names the CLI trigger it fires, labelled as recommended future CLI surface rather than an existing command
- [ ] #3 WHEN external research is performed THEN at least two research agents query distinct engines (Tavily AND the built-in websearch engine; Exa unavailable in harness, deviation recorded 2026-09-07) with time-ranged searches (start_date >= 2026-01-01, prioritizing the trailing 90 days) and every external claim in the doc is dated and source-attributed
- [ ] #4 WHEN a source predates 2026 OR is undated THEN its claims are either corroborated by a 2026-dated source or explicitly flagged as historical context in the doc, never presented as current state
- [ ] #5 WHEN the research plan is recorded on the task THEN at least one plan-gate reviewer from a different model family reviews it before any research dispatch
- [ ] #6 WHEN the draft is complete THEN at least two independent reviewers from different model families return fresh-context verdicts recorded as task comments, and all blocking objections are resolved before presentation
- [ ] #7 WHILE TASK-76 (docs restructure) remains unmerged THEN sections the restructure will move carry an explicit reconciliation note rather than being pre-emptively restructured
- [ ] #8 WHEN the synthesis is presented to the user THEN the task records how it feeds the PRD -> TRD -> ADR -> TASK chain with no implementation performed
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Tests and lint pass with fresh output in the worktree
- [ ] #2 Worktree is clean (no uncommitted changes)
- [ ] #3 Branch is rebased on main and green
- [ ] #4 All acceptance criteria checked with fresh evidence (one at a time, never batched)
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
P0 Corpus assembly (scout agent): full backlog list + DONE history, docs/architecture/* (loop-factory, worktree-discipline, tool-boundaries, model-routing, backlog-lifecycle), ADR index + bodies, 9 named prior research docs. Output: compressed current-state brief (loop model, orchestration tiers, AGENTS.md layering, HITL gates, open questions). P1 External research (researcher x2, parallel, distinct engines, time-ranged >= 2026-01-01, trailing-90-days priority): R1 Tavily — four-loop taxonomy (turn/goal/time/proactive), shipped Claude Code loop commands Sept 2026, peer harness tiered routing + loop-as-command practice, AGENTS.md thin-context conventions, loop command naming conventions. R2 Exa — same questions independently, corroborate or flag disagreements. P2 Consolidation (conductor): taxonomy -> weavelog current-state mapping, gap analysis (conductor-always-on vs tiered routing), loop command name candidates (tier + HITL pauses + CLI trigger each), agent-primitives implications, PRD->TRD->ADR->TASK chain, TASK-76 reconciliation notes. Draft docs/research/2026-09-07-loop-taxonomy-research.md per AUTHORING.md research schema. P3 Review: >=2 fresh-context diff-reviewer-* agents from different model families; verdicts + blocking objections recorded as task comments; iterate until no blocking objections. P4 Verify + present: frontmatter-check validation; verify-with-criteria across all 7 ACs with fresh evidence; present synthesis + name recommendation to user. Deliverable: docs/research/2026-09-07-loop-taxonomy-research.md (status: open). No implementation, no docs restructure, no commits without human review.

Plan-gate amendments (glm FIX-FIRST resolved): P0/P1 run in parallel (scout + R1 + R2 together); P2 may run ONE targeted follow-up research pass for P0-surfaced open questions. P2 adds a classification pass: every external claim tagged dated/pre-2026/undated; pre-2026/undated claims get 2026 corroboration or an explicit historical-context flag; start_date >= 2026-01-01 governs primary discovery only, targeted archival lookups permitted solely for corroboration. Frontmatter validation: npx tsx src/tools/frontmatter-check.ts docs/research from the worktree (research schema default); models_used_for_research populated with actual R1/R2/reviewer model IDs; supersedes: none unless a superseded same-directory filename applies. P0 brief preserves source identifiers verbatim (TASK-NN, doc filenames, ADR numbers) per claim. All recommended CLI triggers labelled recommended future surface. P4 verifies against ACs #1-#8 as recorded.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
P0-P3 complete (two research passes, two review rounds) + post-TASK-76 rebase refactor. Deliverable: docs/research/2026-09-07-loop-taxonomy-research.md (frontmatter-check ok under the NEW validator; status: open; uncommitted pending human review). TASK-76 merged (1dbe6cd); branch rebased; doc refactored to new docs rules: paths docs/architecture -> docs/trd + docs/adr (line refs re-verified), reconciliation note RESOLVED, ADR-005 flow adopted in section 7 (ADR cross-cutting, not a pipeline stage; TASK ACs cite TRD/ADR constraints), ADR-003 decision gate applied (Decision: none — research only) + Lessons block, ADR-status bullet added (ADR-003/004/005 approved, ADR-006 planned). Loop surface (future CLI): stitch / weave / loom / pulse; weaver persona recommended (availability check gated at PRD). Budget tuple extends TASK-6 + 2026-09-03-budget-caps-checkpoint-resume.md; risk-signals.ts ON MAIN (no sequencing gate). Fresh-reviewer loop on the refactor: diff-reviewer-deepseek VERDICT APPROVE — 6 non-blocking findings all addressed (name direction reworded per ADR-003, :145-154 anchor, ADR de-pipelined in section 7, task notes synced; finding-1 stray artifact did NOT reproduce — git status clean); AC #8 wording drift (linear chain vs ADR-005 flow) recorded, AC frozen per spec gate.

HANDOFF (2026-09-07, human directive: commit only — different thread continues, worktree stays): branch task/TASK-79 fully committed at c41ec2a (7 commits ahead of main: research doc + task record + ADR-006 in-review + index updates + de-branding). Worktree .worktrees/TASK-79 alive. PENDING HUMAN GATES: (1) ADR-006 approval — flip status in-review->approved in THREE places (frontmatter, ## Status section, docs/adr/README.md index row) on explicit human "approved"; (2) merge gate — difit http://localhost:4968 (task/TASK-79 vs main), on merge: merge branch to main, mark TASK-79 Done via task-flow close, THEN worktree cleanup only if human says so. Standing rules: KEEL_*/third-party names stay out of decision records (research citations only); ADR-006 row stays annotated as absorbed; task AC #8 wording drift recorded, ACs frozen. Next thread: rebase onto main before further edits if main moved.

Correction: 6 commits ahead of main (not 7) — c6ddbee..c41ec2a, see git log.

Correction: 6 commits ahead of main (not 7) — c6ddbee..c41ec2a, see git log.

UPDATE (2026-09-10, session 01a07f60): human directed ADR revision — 8th-grade plain-English
sections, 6-step worked example (build-half scope), gate semantics restored to ADR-003's
plan+merge (human rejected the gate redesign), gate vocabulary harmonized to the TASK-8 CLI
(approve/kickback/reject; replan+stuck = lifecycle states), PRD/TRD brainstorming stated as
human-collaborative never agent-solo, multi-run continuation across threads, renumbered
0007->0006 (announced-but-never-drafted conductor-dispatch ADR absorbed; index annotated),
rtk.ts removed at repo level (license blocker, human-directed 2026-09-09). Review loop: 3
rounds x 4 model families (deepseek-v4-pro, kimi-k3, glm-5.3, qwen3.8) — final-round
blockers: research S5 stale gate vocabulary (harmonized) + TASK-80 zero ACs (4 EARS ACs
added; claim-gate refusal reproduced then resolved). ADR-0003/0004 status drift synced to
approved (index+frontmatter already recorded 2026-09-07 ratification; dated revision notes).
Gates green: frontmatter-check (adr 6/6, research doc ok), biome, tsc, DAG pass (no cycles,
no dangling), claim-gate check on TASK-80. NEW TASKS: TASK-80 (weaver sweep, deps TASK-79),
TASK-81 (ADR-006 implementation umbrella: budget module, tier-fit checker, CLI surface,
AGENTS.md slimming, name check, SDK verification; deps TASK-80+TASK-6). HUMAN STATE: commits
approved for task/TASK-79; merge DEFERRED — human wants more refinement. PENDING: (1) human
refinement of ADR-006, (2) ADR-006 approval + 3-place status flip, (3) difit merge gate.
Worktree stays alive; branch is self-contained (TASK-80/81 travel with it).
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: conductor
created: 2026-09-07 23:53
---
Plan-gate review (plan-gate-glm, fresh context): VERDICT FIX-FIRST. Findings: [BLOCKING] recorded AC list was duplicated/contradictory (14 ACs, learnings-vs-research targets) — RESOLVED: restored approved 8-AC set via --acceptance-criteria replace, spec-approved re-added per gate procedure. [NON-BLOCKING] persist verdict as comment — done here. [NON-BLOCKING] add P2 source-classification pass — adopted into plan. [NON-BLOCKING] pin frontmatter validation invocation + models_used_for_research population — adopted. [NON-BLOCKING] P0 brief must preserve source identifiers verbatim — adopted. [NON-BLOCKING] P0/P1 ordering — resolved: scout + R1 + R2 dispatch in parallel; P2 may run one targeted follow-up research pass for P0-surfaced open questions. [NON-BLOCKING] AC2 CLI triggers labelled recommended future surface — adopted (AC amended).
---

author: conductor
created: 2026-09-08 00:05
---
Engine decision (human, 2026-09-07): Exa unavailable in harness; AC 3 amended to Tavily + built-in websearch as the two distinct engines; deviation recorded. spec-approved re-applied after amendment per gate procedure.
---

author: conductor
created: 2026-09-08 00:39
---
P3 review verdicts: diff-reviewer-deepseek = FIX-FIRST; diff-reviewer-kimi = FIX-FIRST. Blocking findings (both): (1) spec-vs-plan gate naming unreconciled vs NORTH_STAR/loop-factory — FIXED via gate-model reconciliation note in section 5; (2) MAST 90.2%/15x figures misattributed to model-tiered-agents.md — FIXED: reattributed to Anthropic multi-agent research system (2025, PRE-2026) + MAST arXiv 2503.13657 (2025-03, PRE-2026), corroborated by arXiv 2608.21884 (2026-08-22) and productionnotes.dev (2026-08-09); false cross-ref removed. Non-blocking fixes adopted: drain re-mapped to goal-based (nested) rung, watch carries the trigger hand-off; run row gate cell corrected; models_used_for_research populated with model IDs; 60-100-line + AGENTbench carrier flagged UNDATED; weave third-party product collision noted; Voss fourth loop corrected to system; loop-taxonomy.md added to sources.
---

author: conductor
created: 2026-09-08 00:39
---
External research execution parameters (AC 3/4 evidence): R1 Tavily — time-ranged queries start_date >= 2026-01-01, trailing-90-day priority (2026-06-07..2026-09-07), 3 search rounds, deep extraction on primary posts. R2 websearch — 2026-dated queries, trailing-90-day priority, independent coverage. Both returned dated SOURCES lists; pre-2026/undated items tagged and flagged in doc section 8. Engine deviation (Exa unavailable) recorded 2026-09-07.
---

author: conductor
created: 2026-09-08 00:42
---
Confirmation review (plan-gate-deepseek, cross-family): VERDICT APPROVE — all four prior blockers verified resolved; no new contradictions; ACs #1/#2/#4/#7/#8 satisfied from doc + record. One non-blocking adopted: watch rung cell now "time-based (proactive-guarded)" — single primary rung per AC 2.
---

author: conductor
created: 2026-09-08 00:50
---
Human feedback round (2026-09-07): (1) names — weave retained; run/drain/watch replaced by stitch/loom/pulse (loom-vocabulary set), human-approved direction, alternatives thread/reel/tick recorded; (2) loop budgets + break points added as section 5.1 — deterministic budget tuple (wallclock/iterations/tokens/no-progress), Codex budget_limited soft-stop as UX model, inform->alert->stop ladder at iteration boundaries only; (3) tier-fit checker added as section 5.2 — under-tiered + over-tiered detection from risk-signals.ts signals, inform/require/never-auto-migrate ladder, hard breakpoint for unattended tier climbs. Doc re-validated: frontmatter-check ok.
---

author: conductor
created: 2026-09-08 01:03
---
Second research pass (human-directed: fact-check budgets/breakpoints/tier-fit, taxonomy count, standards, weaver naming). P0b scout: TASK-6 + 2026-09-03-budget-caps-checkpoint-resume.md are the direct budget-machinery precedents (three caps first-wins, session.diff no-progress, KEEL_MAX_* named outcomes, reviewer-loop --budget-usd) — doc now EXTENDS them, not re-specifies; ADR-004 ladder = model seats (orthogonal escaland), never-auto-migrate precedent model-routing.md:84-88; risk-signals.ts lives on unmerged TASK-76 branch (merge dependency recorded); weaver zero in-repo collision, on-brand per TASK-58 rationale; TASK-57 wandb/weave + opencode-weave adjacency added to naming. R1b Tavily + R2b websearch (time-ranged >= 2026-01-01, trailing-90d priority, dated sources): ABSENCE findings — no shipped default wallclock cap, no product-shipped no-progress detector, no shipped wrong-tier detection in major harnesses (greenfield; emerging indie patterns cited); 4-rung ladder = most-cited but ~3 months old, one origin cluster (2608.21884 caveat), competing 2026 schemes recorded (2-axis, 6-level, 10-type, L1-L5); NO ratified agentic-loop standard (AAIF stewards AGENTS.md/MCP; de facto anatomy = 2607.00038; committed file-based loop definitions are a differentiator). Doc amended: taxonomy-count paragraph (section 2), budgets/watchdogs + wrong-tier + standards bullets (section 3), section 5.1 rewritten (extend TASK-6/budget-caps; 80% inform / 100% soft-stop ladder), section 5.2 rewritten (absence framing, orthogonal escalands, TASK-76 merge dependency), weaver persona recommendation (adopt with TASK-57-style availability check as PRD item), section 8 second-pass classification. frontmatter-check ok.
---

author: conductor
created: 2026-09-08 01:16
---
Round-2 review verdicts: diff-reviewer-glm = FIX-FIRST; diff-reviewer-qwen = FIX-FIRST. Findings all resolved: [BLOCKING] stale pre-rename names (weave/drain in 4.3, run in 5 gate note, run/drain/watch in 6/7) — replaced with stitch/loom/pulse; [BLOCKING] absence overclaims — scoped to per-run/per-task wallclock budgets in major harnesses (7-day TTL bounds session lifetime) and harness-shipped no-progress detectors (OSS frameworks only, hermes default-on unverified); weaver check staged to PRD (5.2 + 7 aligned); 2 mapping honesty + 2-axis ADR pointer added; stevekinney + indie tier-walking added to section 8; hermes maintainers clause attributed (#30587); task notes refreshed.
---

author: conductor
created: 2026-09-08 01:26
---
Final confirmation (plan-gate-kimi, fresh context): VERDICT APPROVE — all five round-2 items verified resolved with line refs; no new contradictions; ACs #1/#2/#7/#8 satisfiable. Two non-blocking residuals closed: round-2 reviewer IDs added to models_used_for_research; hermes-agent #30587 added to section 8. Research complete — presenting to human for review.
---

author: conductor
created: 2026-09-08 04:58
---
Rebase + refactor round (2026-09-07): TASK-76 merged to main; task/TASK-79 rebased (no commits yet — artifacts untracked, clean rebase). Refactor to new docs/AGENTS.md rules applied and verified by fresh diff-reviewer-deepseek (VERDICT APPROVE, all non-blocking findings addressed; stray-artifact finding did not reproduce — git status shows only the two intended untracked artifacts). Doc now ends at the ADR-003 decision gate: Decision none — research only; ADR fires at the section 7 ratification gate per ADR-005.
---

author: @conductor
created: 2026-09-11 01:55
---
2026-09-10 design-fork round (human-directed): pre-build deliberation loop gap in ADR-006. R1 researcher (Tavily) + R2 researcher (built-in websearch; deviation: first 2/6 calls accidentally Tavily, disclosed) time-ranged >= 2026-01-01: naming+tiering the thinking phase ESTABLISHED (plan mode universal; spec-interview commands; light/full paths; Claude Code 'skip the plan if one sentence'; spec-kit short/full path; Amp oracle on-demand); cross-family adversarial pre-build deliberation NOT first-party mainstream (third-party niche: agent-kombat 2026-04-26, challenge-plans, adversarial-debate 2026-08, adversarial-review 2026-07-23; arXiv 2608.18167, 2608.00832); 'plan' maximal collision (~10 harnesses). Deliverable: docs/research/2026-09-10-pre-build-deliberation-loop.md (frontmatter validated). Plan-gate consultation (fresh context, cross-family): plan-gate-deepseek VERDICT APPROVE (recommends named sub-loop, no fifth command; binding constraints: no tri-state endpoint, adversarial pass must be ADDED not just named, tiers human-selected not complexity-gated); plan-gate-qwen VERDICT FIX-FIRST (3 blockers: phase conflation — scope WHAT-side grilling vs HOW-side plan-attack loci separately; B/C double-count weave hand-off without skip contract; research must land in docs/research/ before ADR cites it — resolved: note filed). Both converge: Option A (named sub-loop with inherited tiers). HUMAN DECISION (2026-09-10): Option A approved — ADR-006 amended in place (in-review revision rule): named pre-build deliberation sub-loop (candidate name warp, pending ratification), red-blue-white protocol (blue=maker drafts/defends, red=cross-family checker attacks, white=human referee; dissents preserved as receipts into the existing plan gate; models never sign), light tier = grilling only / full tier = adds cross-family attack pass, human-selected at invocation, never auto-migrated, pulse defaults to light, no new gate. B/C rejected (third-gate risk, hand-off double-count, pre-diff tier-fit unimplementable per ADR-004).
---
<!-- COMMENTS:END -->
