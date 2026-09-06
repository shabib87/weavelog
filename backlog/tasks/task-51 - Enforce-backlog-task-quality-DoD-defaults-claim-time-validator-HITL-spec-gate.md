---
id: TASK-51
title: >-
  Enforce backlog task quality - DoD defaults, claim-time validator, HITL spec
  gate
status: Done
assignee:
  - conductor
created_date: '2026-09-05 18:34'
updated_date: '2026-09-05 23:21'
labels:
  - harness
  - spec-approved
dependencies: []
priority: high
ordinal: 40000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Backlog task quality is unenforced: backlog task create requires only a title, DoD defaults are unconfigured, spec review (checkpoint #1) is advisory not HITL, and 3 of 50 tasks have zero acceptance criteria. Both plan gates (DeepSeek, Qwen) revised the draft plan: the hard gate moves from creation-time to the To Do -> In Progress transition (task-flow.ts claim), validator logic lives in a versioned bin/src module called by three surfaces, and HITL approval becomes an auditable spec-approved marker. Scope: one atomic PR covering config, validator module, claim gate, pre-commit hook, enforce.ts nudge, docs, and thin-task backfill.

Design decisions (gate-ratified):
- Hard gate at To Do -> In Progress transition; creation-time is warn-only (stub flow exempt by construction)
- Validator module: ~/.agents/bin/src/task-validate.ts (injectable runner, unit-tested); enforce.ts nudge + pre-commit hook + claim gate all import it
- enforce.ts edit target is ~/.agents/plugins/enforce.ts (repo copy); pluginsDeferral:true means manual copy to ~/.config/opencode/plugins/ is a DoD item, plus drift reconciliation of existing copies
- HITL spec gate: human approval recorded as spec-approved marker (label or comment) before In Progress; claim gate verifies the marker
- Housekeeping class (type chore/docs/spike): EARS shape warn-only; AC presence still required
- --no-dod-defaults blocked for non-housekeeping creation; --append-plan-on-create check dropped (flag does not exist on create)
- task edit AC-mutating flags (--clear-ac, --remove-ac, --acceptance-criteria) blocked post spec-approved via pre-commit hook
- AGENTS.md carries harness deltas only (EARS convention, forbidden-at-creation plan, HITL pointer); backlog instructions task-creation remains the base guide

Refs: docs/research/2026-08-23-backlog-md-capability-audit.md, docs/research/2026-08-29-backlog-mcp-enforcement-bypass.md, docs/architecture/worktree-discipline.md, docs/plans/2026-08-16-enforce-hooks-recovery.md
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 WHEN task-flow.ts claim sets a task to In Progress and the task has an empty description or zero acceptance criteria THEN the transition is refused with fix guidance
- [x] #2 WHEN a chore/docs/spike type task transitions To Do to In Progress THEN EARS shape violations warn but AC presence is still enforced
- [x] #3 WHEN a bash backlog task create command runs in any branch without -d or --description or with zero --ac flags THEN enforce.ts throws with fix guidance
- [x] #4 IF backlog task edit attempts --clear-ac or --remove-ac or --acceptance-criteria on a task carrying the spec-approved marker THEN the pre-commit hook blocks the commit
- [x] #5 WHEN backlog/config.yml defines definition_of_done defaults THEN every task created afterwards carries the 4-point done-condition checklist
- [x] #6 WHEN worktree-discipline.md and backlog-lifecycle.md document review checkpoint 1 THEN spec review requires explicit human approval recorded as a spec-approved marker before In Progress
- [x] #7 WHEN config-sync runs THEN the updated AGENTS.md materializes to ~/.config/opencode/AGENTS.md with the harness-delta creation checklist and HITL spec gate
- [x] #8 IF the repo plugin copy and live plugin copy differ in task-validation logic THEN drift is reconciled and the manual copy step is recorded in the task DoD
- [x] #9 WHEN task-31 task-41 and task-44 are audited THEN each has a description and at least one acceptance criterion or a recorded housekeeping exemption
- [x] #10 IF the flightlead port matrix still counts 15 bin/test suites THEN task-45 carries an amendment note recording 16 suites with run-time enumeration
- [x] #11 WHEN a task carries a label outside the reserved set (spec-approved dispatched stuck merged housekeeping wayfinder:map - machinery-only) or the general set (harness dogfood deferred) THEN claim refuses and the create gate and pre-commit block the unknown label
- [x] #12 WHEN task-validate.ts unit tests run THEN happy and unhappy paths pass for the claim gate, label vocabulary, DAG check, priority check, EARS shape check, and pre-commit validation
- [x] #13 WHEN a task is claimed while any dependency is not Done (Done tasks read from backlog/tasks and backlog/completed and backlog/archive) THEN claim refuses; WHEN a --dep target is missing from all three locations THEN the create gate warns and claim warns; WHEN a --dep would create a cycle or self-dep THEN the create gate refuses; cross-branch task files are declared unverified
- [x] #14 WHEN a task without a priority matching the configured set (case-insensitive) is claimed THEN claim refuses with fix guidance and the create gate warns at creation time
- [x] #15 WHEN an agent assigns a general label THEN it evaluates the decision table in first-match order: harness WHEN the task modifies bin or plugins or config or AGENTS.md or docs/architecture or stack-versions.json; dogfood WHEN the deliverable is real work run through the harness as the verification subject; deferred WHEN the task records an explicit revive trigger; no match THEN no label - label matching is case-insensitive and gates enforce vocabulary membership only; table application is agent duty audited by spot check, and reserved labels are set by machinery as a procedural rule
- [x] #16 WHEN the one-shot migration runs (committed atomically BEFORE the gates activate) THEN every label on currently-open tasks maps to exactly one action: harness absorbs infra tooling enforce worktree inner-harness proxy pi-sharing skill-install architect architecture diagramming docs skills; v1 and v2 are dropped; immediate becomes priority; bugfix becomes type bug; cleanup and maintenance become type chore; migration uses --label replace semantics; Done tasks keep history untouched
- [x] #17 WHEN the working repo is detected as a harness-dev context (canonical repo list in task-validate config: the agents-harness repo and the flightlead dev repo) THEN the harness and dogfood labels are settable per the decision table; WHEN the working repo is not a harness-dev context THEN harness and dogfood are a validation failure at claim and create gate and pre-commit; WHEN flightlead scaffold generates a new workspace THEN the generated task vocabulary excludes harness and dogfood and ships the reserved set plus the fixed default general label (deferred) only; WHEN a scaffolded workspace needs different general labels THEN scaffold config adds them explicitly
- [x] #18 WHEN an agent assigns a milestone to a task with an empty milestone field THEN the agent evaluates the deterministic table in first-match order (version scope takes precedence over wayfinder map membership, intentional): the version milestone WHEN the task carries v1 or v2 scope (assigned by the one-shot migration in the same pass it drops the v1 v2 labels; migration-time-only; the human creates and names the version milestone before migration runs); the wayfinder map milestone WHEN the task belongs to a wayfinder decision map (one milestone per map, name-derived); no milestone otherwise; WHEN the task already has a milestone assignment THEN the agent leaves it unchanged; WHEN the target milestone does not exist THEN the agent warns and assigns none and never creates it; workflow agents never create milestones - the wayfinder skill creates a map milestone as part of map setup and all other milestone creation is human-owned; scaffolded workspaces ship no default milestone table
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 All tests and lint pass with fresh output in the worktree
- [x] #2 Plugin drift reconciled: repo enforce.ts copy manually copied to ~/.config/opencode/plugins/ and verified
- [x] #3 config-sync run and AGENTS.md materialization verified
- [x] #4 Recovery runbook (docs/plans/2026-08-16-enforce-hooks-recovery.md) updated with the new throw class
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Backfill: task-31/41/44 get description + >=1 AC or recorded housekeeping exemption (retrospective, via task edit from worktree so files land on task branch)
2. TDD: bin/src/task-validate.ts module (claim-gate check: desc+ACs+spec-approved marker; EARS shape check with keyword anchored at start, case-sensitive, warn-only for chore/docs/spike; pre-commit check: block AC-gutting flags on spec-approved tasks) + bin/test/task-validate.test.ts happy/unhappy
3. backlog/config.yml: definition_of_done 4-point defaults (tests+lint fresh, worktree clean, rebased main green, ACs checked with evidence)
4. task-flow.ts claim: refuse To Do->In Progress on empty desc/0 ACs/missing spec-approved marker; chore/docs/spike warn-only EARS
5. Pre-commit hook: call task-validate for backlog/tasks/*.md changes
6. enforce.ts (repo copy ~/.agents/plugins/): new hook, any branch, backlog task create without -d or --ac throws; thin import of task-validate; keep plugin thin
7. Docs (conductor-owned): worktree-discipline.md + backlog-lifecycle.md checkpoint #1 = HITL with spec-approved marker; AGENTS.md harness-delta creation checklist; recovery runbook new throw class
8. Drift reconcile: copy repo enforce.ts to ~/.config/opencode/plugins/, verify live
9. config-sync run, verify AGENTS.md materialization; full tests+lint
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
SPEC v2 (kickback amendment 2026-09-09, human-approved direction): (1) CLOSED LABEL VOCABULARY — reserved tier set only by owning machinery: spec-approved (HITL gate), dispatched/stuck/merged (conductor dispatch state), housekeeping (chore/docs/spike class), wayfinder:map (wayfinder skill); free tier (only hand-settable labels): harness, infra, skills, docs, dogfood, deferred, v1, v2; one-offs remapped: bugfix->type bug, cleanup/maintenance->type chore, immediate->priority, merged->state label, architect/architecture/tooling/skill-install/proxy/pi-sharing/diagramming/inner-harness/worktree absorbed or dropped. task-validate rejects unknown labels at claim + Hook 10 create + pre-commit. (2) DAG CHECK — backlog only validates dep existence, no cycles; task-validate gains dep-graph check: --dep creating a cycle, self-dep, or dep on a Done task is refused at create (Hook 10) and at claim. (3) ASSIGNEE DROPPED from creation checklist (solo dev; claim sets --assignee conductor mechanically). (4) PRIORITY DETERMINISM — every task carries a priority from the configured set; missing priority refuses claim, warns at create; config gains priorities key if unset. (5) TASK-45 PORT NOTE — amendment recorded on task-45: port matrix suite count is now 16 (task-validate suite added), enumerate at run time.

SPEC v4.1 (2026-09-09, both plan gates ratified fixes): B1 stale v2 vocabulary AC removed and v1 tests AC restored; B2 DAG semantics corrected - claim refuses UNMET deps (a Done dep is satisfied, not a violation); create gate refuses only cycle/self-dep, warns on dep-on-Done and missing targets; archived Done tasks count as satisfied (validator reads backlog/tasks + backlog/completed + backlog/archive); cross-branch deps declared unverified and Hook 10 fails open outside a backlog project; B4 table reordered mechanical-first (harness before dogfood) and declared limits recorded: gates enforce vocabulary membership only, decision-table application is agent duty audited by spot check, reserved-label machinery-only is procedural not technical; migration table made TOTAL (adds architect architecture diagramming docs skills to harness absorption) and runs atomically before gate activation; priority compare is case-insensitive (frontmatter lowercase vs CLI High); label matching case-insensitive.

SPEC v5 (2026-09-09, human kickback): (6) harness label scoped to harness-dev contexts only - flightlead scaffold --workspace generates a project vocabulary WITHOUT harness/dogfood labels since scaffolded workspaces are not harness development; (7) milestone assignment joins the deterministic table set: v1/v2 scope maps to the version milestone (replacing the dropped labels), wayfinder map tasks map to their map milestone, default none, agents never create milestones (human or wayfinder skill only).

SPEC v5.1 (2026-09-05, both plan gates ratified v5 amendments): D6 - harness-dev context detection is a canonical repo list in task-validate config (agents-harness repo + flightlead dev repo); harness/dogfood outside that context are a validation failure not a warning; scaffold vocabulary excludes harness/dogfood and ships reserved set + fixed default general label (deferred), extensible only via scaffold config; (harness dogfood) wording fixed to (harness and dogfood). D7 - migration assigns the version milestone in the same pass it drops v1/v2 labels, v1/v2 scope row is migration-time-only; human creates and names the version milestone before migration; wayfinder map-to-milestone convention: one milestone per map, name-derived; human-assigned milestones always win (table fires only on empty milestone); missing target milestone warns and assigns none, never creates; version scope outranks map membership by design; workflow agents never create milestones, wayfinder skill creates map milestones at map setup, all other creation human-owned; scaffolded workspaces ship no default milestone table.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
TASK-51 shipped end-to-end: backlog task quality is now enforced. (1) task-validate.ts is the single validation module: claim gate (description + ACs + spec-approved marker + closed label vocabulary + harness-dev context + priority + DAG), pre-commit check, create-gate createGateCheck, decision tables for labels and milestones, all TDD red/green. (2) Surfaces wired: task-flow.ts claim (env TASK_FLOW_HARNESS_DEV / TASK_FLOW_BACKLOG_DIR for tests), generated pre-commit hooks, enforce.ts Hook 10 (thin import, fail-open outside backlog projects). (3) One-shot migration applied and committed atomically: 26 open tasks remapped - harness absorbed 12 one-off labels, v1/v2 dropped, human-assigned m-4 preserved (HITL ruling), immediate/bugfix/cleanup/maintenance remapped to priority/type; --clear-labels fix for backlog silent no-op. (4) Live round-trip: scratch task-52 refused without spec-approved and with an unknown label, claimed after valid labels, completed. (5) Conductor docs: vocabulary + milestone tables in worktree-discipline.md, backlog-lifecycle.md, AGENTS.md deltas, recovery runbook Hook 10 row, bin inventory. Full suite 567 pass / 0 fail; plugin drift reconciled; config-sync run (v5 AGENTS.md deltas materialize post-merge).
<!-- SECTION:FINAL_SUMMARY:END -->
