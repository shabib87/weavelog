---
id: TASK-86
title: 'Make task verification explicit with EARS ACs, Gherkin cases and tailored DoD'
status: To Do
assignee: []
created_date: '2026-09-13 19:44'
updated_date: '2026-09-13 19:45'
labels:
  - harness
  - deferred
dependencies: []
references:
  - docs/trd/test-guardrails.md
  - docs/trd/worktree-discipline.md
  - backlog/config.yml
  - TASK-21
  - TASK-32
  - TASK-51
priority: low
type: enhancement
ordinal: 69000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Outcome: make task verification repeatable by consistently using EARS-style acceptance criteria (AC), Gherkin-style test cases (TC), and a tailored Definition of Done (DoD). Update the existing task-authoring guidance and every To Do task in a finite migration snapshot. This extends TASK-21/TASK-32/TASK-51; it does not replace their requirement/scenario layers or default DoD.

Why: EARS shape and generic defaults already exist, but neither proves that a requirement is measurable or that its test cases and completion evidence are complete. Use one observable claim per AC, explicit Given/When/Then scenarios with expected results, and per-task completion checks. Syntax alone does not make model reasoning or test outcomes deterministic; controlled inputs, assertions, recorded results and human review supply the evidence. This supports NORTH_STAR evidence over claims, TDD, small ships and minimal tooling.

Scope: task-authoring guidance in the existing repository protocol and lifecycle/test-guardrails references; EARS ACs in acceptanceCriteria, Gherkin TCs in a clearly named description section (or an existing linked task specification), and tailored items in definitionOfDone via the CLI. Do not create a separate specification document for every task. Keep implementation plans out of new To Do tasks. Each TC names its AC, initial conditions, action, expected observable result and verification method. Include relevant failure and boundary cases. Documentation and research tasks use concrete artifact checks or an explicit human review condition; do not pretend subjective judgments have an automated oracle.

Migration: snapshot all tasks with status To Do at activation, before claiming this task, and record the IDs in this task. Apply the contract to every snapshot member, including this task. Preserve compliant content; fill gaps rather than rewriting for style. Tasks that leave To Do during the migration are reported separately and are not modified. New tasks created after the snapshot follow the revised authoring contract without expanding the finite migration set. A task is not counted as compliant while its requirements remain unclear. Ask the human to resolve ambiguity rather than inventing behavior.

Deferral: 0.1.1+ candidate, not a promised version and not a TASK-3, TASK-45-closure or 0.1.0 publication prerequisite. Revive after 0.1.0 ships, or earlier only if the human explicitly confirms that missing verification detail blocks an active implementation task. Until then, clarify that active task through its existing spec/plan review; do not wait for the full migration. Creation of this record does not impose a new global gate.

Out of scope: product implementation, weakening existing ACs/safety, bulk status or milestone changes, automatic spec approval, historical Done-task rewrites, new tasks/milestones/skills, Cucumber or another test framework, Backlog schema changes, dashboard redesign (TASK-85), and new universal validator enforcement. Existing TDD, independent review, code isolation, spec and human commit/merge gates remain in force.

## Test cases (Gherkin-style; specification only, not execution evidence)

TC-1 / AC-1
Given the existing task-authoring guidance
When a contributor follows the revised contract for a new task
Then ACs, TCs and tailored DoD have separate CLI-supported locations without requiring a new framework or sidecar document.
Verification: inspect the revised guidance and read a new task through Backlog CLI.

TC-2 / AC-2
Given a snapshot task with a vague or compound AC
When its requirement is reviewed and clarified with the human where needed
Then each resulting AC uses WHEN/IF/WHILE ... THEN and states one independently verifiable outcome without adding behavior.
Verification: check AC shape, then independently review its expected outcome against the original task intent.

TC-3 / AC-3
Given a task with success and refusal behavior
When its test cases are reviewed against each AC
Then linked Given/When/Then cases state controlled initial conditions, observable expected results and verification methods, including refusal and relevant boundaries.
Verification: compare the task's AC list and named TC mappings, checking expected results for success, refusal and applicable boundaries.

TC-4 / AC-4
Given a task with only the project DoD defaults
When its completion obligations are specified
Then the defaults remain and additional measurable checks name the evidence specific to that task, without marking them complete.
Verification: compare CLI-read DoD items with project defaults and the task's named deliverables.

TC-5 / AC-5
Given an approved task whose AC needs a semantic clarification
When migration reaches it
Then its approval is not reused for the changed specification and existing reapproval gates apply; unrelated metadata and task history remain unchanged.
Verification: inspect the task diff and approval record; confirm no changed AC inherits an invalid approval or checked evidence.

TC-6 / AC-6
Given the recorded snapshot and a task that changes status during migration
When the final inventory is reconciled
Then every ID is accounted for as compliant or left unchanged because it left To Do; unresolved requirements prevent this migration task from being declared complete.
Verification: reconcile the recorded snapshot IDs with final CLI statuses and coverage results.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 WHEN the revised task-authoring contract is followed THEN a new task records EARS-style ACs, linked Gherkin-style TCs and task-specific DoD in separate existing CLI-supported fields or an existing linked specification.
- [ ] #2 WHEN a snapshot task is assessed for AC compliance THEN each AC starts with WHEN, IF or WHILE, contains THEN, and states one observable outcome with enough detail to determine whether it holds.
- [ ] #3 WHEN a snapshot task is assessed for TC coverage THEN every AC maps to at least one named Given/When/Then case with initial conditions, an action, an observable expected result and a verification method, including relevant negative and boundary cases.
- [ ] #4 WHEN a snapshot task is assessed for completion obligations THEN its DoD retains the project defaults and existing valid obligations and includes measurable task-specific evidence requirements beyond copied boilerplate.
- [ ] #5 WHEN migration edits a task THEN its approved intent, dependencies, milestone, priority, status and historical evidence are preserved; any changed approved specification follows the existing removal-and-renewal approval gate without inferred approval or fabricated completion evidence.
- [ ] #6 WHEN migration is reviewed for completion THEN all recorded snapshot IDs reconcile to compliant tasks or tasks left unchanged because they left To Do, with no omitted IDs, unresolved requirements or changes to historical Done tasks.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Tests and lint pass with fresh output in the worktree
- [ ] #2 Worktree is clean (no uncommitted changes)
- [ ] #3 Branch is rebased on main and green
- [ ] #4 All acceptance criteria checked with fresh evidence (one at a time, never batched)
- [ ] #5 Record the snapshot and final per-task AC/TC/DoD coverage through Backlog CLI in this task, with fresh check output and exit codes.
- [ ] #6 Independent review verifies that migrated specifications preserve behavior and that any required human reapprovals are recorded.
- [ ] #7 Verify the migration and authoring guidance introduce no dependency on this task into the 0.1.0 release graph and no new required tool.
<!-- DOD:END -->
