---
id: TASK-15
title: >-
  Create docs/architecture/ — loop model, tool boundaries, backlog lifecycle,
  test guardrails, ADRs, navigation map
status: Done
assignee:
  - '@conductor'
created_date: '2026-08-29 00:19'
updated_date: '2026-08-30 21:13'
labels:
  - v1
  - architecture
milestone: m-2
dependencies: []
priority: high
type: task
ordinal: 800
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The harness has no architecture documentation. The loop model (3-phase WHY/WHAT/HOW x 2-role inner/outer), tool boundaries, backlog.md lifecycle mapping, and test guardrails are scattered across the 2.5k-line runbook and dozens of research notes. This task creates a structured docs/architecture/ directory with wiki-style navigation, EARS-style acceptance criteria (not Gherkin — EARS is the harness convention per AGENTS.md), and cross-references to existing research and plans.

## Loop-model consensus (restored from commit 6366cc0^ via TASK-22)

3-reviewer consensus on the loop model (kimi + qwen + deepseek, recorded 2026-08-29; source git commit 6366cc0^ — the block was deleted as collateral damage of the Gherkin→EARS cleanup in 6366cc0 and restored by TASK-22):

- WHY/WHAT/HOW are PHASES, not loops; a loop is a control structure that repeats. Phases progress — nothing re-triggers research.
- WHY is the research half of WHAT (intake → research → dialogue → prototype → spec), sharing the same divergent, human-inside control character. Not a separate loop.
- Inner/outer is ONE boundary across all phases, not 3 separate inner/outer pairs. Inner loop = agent execution cycle (investigate → implement → verify → repeat); outer loop = human decision ownership (decide → verify → approve → carry consequences); the boundary is EVIDENCE.
- 2 formal gates (plan approval, merge approval), both in HOW. WHAT uses continuous dialogue, not a gate.
- EARS-style acceptance criteria are a WHAT-phase concern (spec docs, human-owned) — the harness convention per AGENTS.md (Gherkin is NOT used; this supersedes any earlier Gherkin-in-spec reference).
- backlog.md ACs are plain EARS outcome statements (distilled from spec scenarios).

This consensus feeds ADR-003 "three-phase model" (planned in adr/README.md) and loop-factory.md (AC #13). Do NOT write "3 loops" anywhere — phases progress, loops repeat.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 docs/architecture/README.md exists — wiki-style navigation map linking to all architecture docs, research index, plans index, and spec index; serves as the front door for both agents and humans
- [x] #2 docs/architecture/tool-boundaries.md documents what each tool owns and where it sits in the loop model: backlog.md, enforce.ts, worktree-create.ts, reviewer-loop.ts, headroom, opencode; each tool has a clear SRP boundary
- [x] #3 docs/architecture/backlog-lifecycle.md maps the conductor flow to backlog.md native fields: --plan (not docs/plans/), --notes, --comments, --modified-files, --final-summary, --check-ac (per-AC as proven), board/browser as human tools, conductor uses task list / board export; three review checkpoints documented; onStatusChange/backlog decision/--due-date deferred with triggers
- [x] #4 docs/architecture/adr/README.md is an ADR index with the Nygard template; ADRs added incrementally on trigger — do NOT create retrospective ADRs
- [x] #5 All architecture docs use structured frontmatter: date, topic, status (draft/in-review/approved/superseded/archived), type (architecture/adr), author, related_to, sources; frontmatter-check.ts gains --schema flag or separate validator for architecture schema
- [x] #6 frontmatter validator: ERROR on dangling related_to refs (file doesn't exist), WARNING on missing reciprocity
- [x] #7 docs/AUTHORING.md (not docs/AGENTS.md to avoid naming overload) created with documentation authoring rules: frontmatter template, statuses, type-to-directory mapping, related_to convention, ADR Nygard template reference
- [x] #8 Research README index updated to include all docs through 2026-08-29 (no stale entries)
- [x] #9 Duplicate architecture-pattern research docs consolidated (2026-08-23-agentic-architecture-pattern.md + 2026-08-23-agentic-deisgn-pattern.md → one doc, typo fixed)
- [x] #10 9 stale open research docs reviewed and closed or marked stale (grep -l 'status: open' docs/research/*.md)
- [x] #11 diagram-design and tldraw-offline skills referenced in AGENTS.md or architecture docs
- [x] #12 vision-deepseek agent added to runbook agent roster (§577 currently lists 15, should list 16)
- [x] #13 loop-factory.md documents 3-phase x 2-role model; diagram via diagram-design skill (architecture type) HTML in docs/architecture/diagrams/ with EARS-style acceptance criteria (not Gherkin)
- [x] #14 docs/architecture/test-guardrails.md documents: TDD ordering, EARS-style WHEN/THEN acceptance criteria in backlog ACs (not Gherkin — EARS is less ceremony and maps to backlog ACs directly), RED/GREEN in TDD skill (HOW loop, implementer-owned), reviewer checklist, deterministic verify-gate hook
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Dispatch implementer (TDD) for frontmatter-check.ts --schema: add architecture schema (status enum draft/in-review/approved/superseded/archived, type architecture/adr, author, related_to, sources), ERROR on dangling related_to, WARNING on missing reciprocity; --schema flag or sub-mode; tests happy+unhappy. 2. Conductor writes docs/architecture/: README.md (nav map), tool-boundaries.md, backlog-lifecycle.md, loop-factory.md (3-phase x 2-role per restored consensus), test-guardrails.md, adr/README.md (Nygard template, no retrospective ADRs), docs/AUTHORING.md. 3. Diagram: diagram-design skill (architecture type) HTML at docs/architecture/diagrams/loop-factory.html embedded in loop-factory.md. 4. Research consolidation: merge 2026-08-23-agentic-architecture-pattern.md + 2026-08-23-agentic-deisgn-pattern.md -> one doc (typo fixed); review+close 9 stale status:open research docs; update research README index through 2026-08-29. 5. Skill refs + roster: reference diagram-design + tldraw-offline in AGENTS.md or architecture docs; add vision-deepseek to runbook roster (16). 6. Verify: frontmatter-check --schema clean on architecture, bun test, biome, diff review (cross-model), human merge gate.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
User requested the reviewer-flagged frontmatter gap be fixed in-TASK (not deferred). Fixed: 2 YAML parse errors (diagramming-agent-skill unquoted status; agentic-worktree-harness lens: colon in plain scalar) + 11 violations across research/plans. Status normalized to valid enums (verified->verified-live, complete->resolved, approved-pending->decided, provisional->open, in-progress->adopted, draft->open), models_used_for_research scalar->array (3), missing frontmatter added (headroom-include-usage-patch full block; agentic-worktree-harness topic/sources/models/supersedes; diagramming-agent-skill supersedes). Full scan now: 50/50 valid, exit 0. Also gitignored reports/*.log to stop the transient launchd log re-entering the repo. bun test 263 pass / 0 fail.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: @conductor
created: 2026-08-30 16:49
---
Diff review (4 families, all APPROVE): qwen APPROVE (14 ACs met; findings: adr/ not scanned by default, --fix --schema untested, runbook native vision tables stale, AUTHORING naming rule). glm APPROVE (reciprocity AUTHORING<->README, type-to-dir exception, basename shortcut nit). kimi APPROVE (adr scan, pre-existing supersedes:[] in 4 touched files, global AGENTS roster line). deepseek APPROVE (AUTHORING out of validator scope, pre-existing diagramming parse error). Fix round applied: AUTHORING type-to-dir exception + adr/ validation snippets + architecture naming rule; reciprocal related_to in READMEs; runbook vision routing/tier/role tables + global AGENTS roster add vision-deepseek; 4 supersedes:[]->none; trailing newlines. Re-verified: architecture 4 valid 0 warnings, AUTHORING meta-doc valid, 263 tests pass, diagram self-check OK. Removed accidental transient launchd log from branch. Held at In Review awaiting human merge approval.
---
<!-- COMMENTS:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Created docs/architecture/ — the harness's missing architecture documentation. Delivered: README nav map (#1), tool-boundaries (6 tools SRP, #2), backlog-lifecycle (field map, 3 checkpoints, deferrals, #3), adr/README (Nygard, incremental-only, #4), loop-factory (3-phase x 2-role per TASK-22 consensus + EARS ACs + diagram via diagram-design skill, #13), test-guardrails (TDD/EARS/RED-GREEN/verify-gate, #14), AUTHORING.md (#7). frontmatter-check.ts gained --schema architecture (status draft/in-review/approved/superseded/archived, type architecture/adr, author, related_to) with dangling-related_to ERROR + reciprocity WARNING (#5/#6); 10 new tests. Research consolidation: merged duplicate agentic-architecture-pattern + typo'd agentic-deisgn-pattern (#9), closed 9 stale status:open docs (#10), README index complete through 2026-08-29 (#8). Skills referenced (#11); vision-deepseek added to runbook roster 15->16 + global AGENTS.md (#12). Also remediated the reviewer-flagged frontmatter gap: 2 YAML parse errors + 11 violations fixed, research/plans/spec scan now 50/50 valid exit 0. Verified: bun test 263 pass/0 fail, biome clean, --schema architecture 4/4 valid 0 warnings, diagram self-check + vision-verified. Diff review: qwen/glm/kimi/deepseek all APPROVE (after fix round). All 14 ACs checked.
<!-- SECTION:FINAL_SUMMARY:END -->
