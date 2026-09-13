---
id: TASK-28
title: >-
  Define two-level CLI scope — global install + project scaffolding (canonical
  cli-vision doc)
status: In Progress
assignee:
  - '@conductor'
created_date: '2026-08-31 03:58'
updated_date: '2026-09-12 23:10'
labels:
  - harness
  - spec-approved
milestone: m-4
dependencies:
  - TASK-79
priority: high
type: docs
ordinal: 20000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Define the canonical CLI-distribution contract for the npm-installed weavelog package, starting in v0.1.0. The package fans out shared open-standard skills to ~/.agents and host-native configuration to verified host roots; ~/.agents is not host configuration. The contract is opinionated and greenfield-first: normal conflicts refuse; explicit --force replacement is whole-target, confirmed, backed up, journaled, and recoverable. Project scaffolding creates a conductor-era AGENTS.md, Backlog, a placeholder .env.example, and neutral docs homes for research, adr, prd, and trd; it never manages .gitignore, .env, .env.local, or .git. The contract distinguishes target behavior from current delivery and assigns implementation to TASK-29, TASK-30, TASK-66, TASK-67, and TASK-84. ADR-0008 must ratify the durable topology before the TRD is created.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 WHEN docs/trd/cli-vision.md is read THEN it defines package fan-out, OpenCode materialization, the package exclusion list (secrets/, backlog/, docs/research/, state/, reports/, logs/, .worktrees/, node_modules/), the strict-JSON harness manifest config/harnesses/<id>.json, and the JSONC OpenCode template boundary.
- [ ] #2 WHEN a declared target conflicts THEN the target contract defines default refusal and explicit --force replacement: exact eligible leaf targets only; TTY confirmation or --force --yes; a protected opaque backup; durable journal; rollback or recovery refusal; no merge, adoption, directory replacement, or undeclared-path replacement.
- [ ] #3 WHEN project scaffolding is described THEN it creates project-owned AGENTS.md, Backlog, .env.example, and neutral docs README homes for research, adr, prd, and trd; it does not manage .gitignore, .env, .env.local, or .git; it uses the ADR-005 artifact flow and conductor-era v0.1 contract.
- [ ] #4 WHEN the runbook successor, global AGENTS.md, README, corrected v0.1 brief, PRODUCT, ROADMAP, and documentation indexes mention the CLI vision THEN they use the canonical pointer and identify target behavior versus the TASK-29/TASK-30 delivery gap without duplicating the full contract.
- [ ] #5 WHEN m-4 and m-5 briefs and affected downstream task records are read THEN they point to cli-vision.md and assign the approved global-materialization, project-scaffold, supported-profile, stranger-test, legacy-migration, and future-weaver work to their named tasks.
- [ ] #6 WHEN ADR-0008 is ratified THEN its Decision table records the topology, ownership, force/backup/recovery boundary, profile and active-source boundary, project scaffold, and future weaver separation; its approved status is synchronized in frontmatter, Status, and ADR index before cli-vision.md is created.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Renew the approved TASK-28 specification and downstream ownership map through Backlog CLI.
2. Revise ADR-0008 to record the approved package, host, project, force, backup, recovery, and conductor-era boundaries; present it for ratification.
3. After ADR ratification, create docs/trd/cli-vision.md and align command, product, roadmap, brief, README, payload, index, and milestone references.
4. Update TASK-29, TASK-30, TASK-66, TASK-67, TASK-80, and TASK-84 specifications and dependency edges through Backlog CLI; leave implementation deferred to those tasks.
5. Validate frontmatter, links, task DAG, focused tests, formatting, and privacy constraints.
6. Run the approved two-round maker-checker loop, resolve its findings, show the full uncommitted diff, and wait for commit approval.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Created from TASK-23 session 2026-08-30; consolidates qwen/deepseek/kimi consult verdicts.

2026-09-12 human decision: Weavelog is deliberately opinionated. The v0.1 brownfield contract is greenfield-first: managed global configuration and managed scaffold targets must not be merged, adopted, or silently overwritten. A conflict must be detected and refused. Exact target ownership, preflight wording, and the README warning remain subject to the Astra review and a renewed spec gate.

2026-09-12 Astra brownfield review: no critical issues. Required contract additions before approval: (1) allow repeat updates only for unchanged, provably Weavelog-owned managed files; absent targets may be created; unowned, locally modified, ambiguous, or state-missing targets are refused with no merge, adoption, overwrite, or v0.1.0 force bypass; (2) supported-profile checking must account for other active OpenCode configuration sources, not destination collisions only; unsupported combinations do not receive a support claim; (3) preflight must occur before writes and conflict exits nonzero with declared targets unchanged; (4) update task/doc contract from research+adr to research+adr+prd+trd, and define global/project AGENTS ownership. Full review was read-only; implementation remains TASK-29/TASK-30.

2026-09-12 prompt-triage and source audit: nine user concerns are routed. TASK-28 owns the contract and documentation for strict opinionated ownership; configuration-file roles; global/project AGENTS layering; Backlog/TDD method; project docs research+adr+prd+trd; README audience/refusal warning; v0.1.0 wording; and durable review evidence. TASK-29/TASK-30 own tested behavior for ownership receipts, active-source profile checks, preflight/refusal, and scaffold writes. The corrected brief and docs/cli currently say research+adr only; docs/cli also documents --force, skipped existing files, and two-step overwrite. These are known contradictions to reconcile through the approved TASK-28 contract and downstream implementation, not silent edits.

2026-09-12 independent red/blue/Astra impact review: the strict contract is a real behavior change, not a wording-only change. No completed task is reopened. Before approval, TASK-28 must renew its spec and ADR-0008. After approval, task specs must be reconciled: TASK-29 owns global materialization (ownership receipts, absent-state refusal, no force/adopt on supported paths, profile rendering, whole-run preflight); TASK-30 owns four project document homes, lean project AGENTS, required Backlog, create-once project ownership, and all-target preflight/no protected-file overwrite; TASK-66 owns active OpenCode-source supported-profile checks; TASK-67 owns exact-candidate negative-path proof; TASK-53 preserves README/release wording; TASK-84 needs a separate legacy-ownership decision; TASK-19/62/64/68 need future references only. Current code/docs expose force/adopt/two-step overwrite and scaffold-before-prerequisite behavior, so TASK-28 docs must state target contract plus implementation gaps honestly. Global managed files differ from project scaffold output: only global, provably unchanged Weavelog-owned files may update; project files create once then are project-owned; conflict refuses. No new task is justified; dependencies require DAG review after the proposed task amendments.

2026-09-12 human correction, verified against ADR-005: do not describe research -> ADR -> PRD -> TRD -> task as the flow. Canonical flow is idea -> PRD -> TRD -> milestone <-> PRD -> TASK. Research supplies dated evidence as needed and an ADR is cross-cutting: it records a hard-to-reverse decision at any stage, never a mandatory pipeline step. Scaffold documentation must state this rule. Forced replacement is accepted with safety: before replacing each declared existing target, stage the new content and move the old file/directory to a unique sibling .bak timestamp path; never overwrite a backup; if backup/staged replacement fails, abort and restore the original where needed; ledger records paths/action but never contents/secrets. .gitignore is project-owned and outside the scaffold contract.

2026-09-12 superseding decision record: Human approved the amendment bundle and ratified ADR-0008. This note supersedes earlier in-thread notes that disallowed force replacement or proposed sibling backups. Final contract: default whole-run preflight refuses conflicts with no writes and nonzero exit; explicit --force replaces eligible declared leaf files only after TTY confirmation, or --force --yes noninteractively; stage first, preserve an opaque .bak under ~/.local/state/weavelog/backups/<run-id>/, journal the operation, roll back only when safe, and refuse recovery if a later change is detected. No merge, adoption, directory replacement, or protected/undeclared path replacement. Project scaffold does not require global OpenCode init/profile and never manages .gitignore, .env, .env.local, or .git. It creates neutral docs README homes for research, ADR, PRD, and TRD using ADR-005 flow; research is as-needed and ADRs are cross-cutting. TASK-80 depends on TASK-28 so the future persona sweep covers this scaffold. Terra review corrections: a JSONL conflict example contains no materialize event and exits 3; scaffold profile independence is explicit.

2026-09-12 claim-gate fix traceability: detectHarnessDevFromCwd now extracts the URL field from each git remote -v line before matching repository identity. Standard fetch/push output previously passed the whole line to URL matching, so this Weavelog worktree could be misclassified and the TASK-28 claim gate could refuse. Added a regression test for standard remote output. Verified with `node --import tsx --test tests/task-policy.test.ts`: 41 passed, 0 failed.
<!-- SECTION:NOTES:END -->
