---
id: TASK-16
title: >-
  Split runbook — move architecture sections to docs/architecture/, replace with
  cross-references
status: Done
assignee:
  - '@conductor'
created_date: '2026-08-29 00:19'
updated_date: '2026-08-30 22:59'
labels:
  - v1
  - architecture
milestone: m-2
dependencies:
  - TASK-17
priority: medium
type: task
ordinal: 850
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The AGENT-STACK-RUNBOOK.md is 2,501 lines. The runbook's own prune trigger says: 'RUNBOOK-SPLIT when runbook exceeds ~4,000 lines OR an agent garbles/misses runbook content due to length.' The user is hitting the 'garbled/missed' condition — the architecture is buried inside operational instructions.

After TASK-15 creates docs/architecture/, this task moves the architecture-relevant sections OUT of the runbook and replaces them with cross-reference links:

1. 'Test Guardrails' section (lines ~852-920, ~68 lines) -> docs/architecture/test-guardrails.md
2. 'Phase 9 — backlog.md task tracking' section (lines ~2428-2453, ~25 lines) -> docs/architecture/backlog-lifecycle.md
3. AGENTS.md 'Factory model: three phases, two loop roles' section (renamed from 'Two-loop factory model' by TASK-22) -> docs/architecture/loop-factory.md

What STAYS in the runbook (operational content):
- Phase 0-8 (host prerequisites, headroom, opencode config, agents, skills, scripts, manifest, stack-check)
- Verification battery
- Human gates and circuit breakers
- Cross-model review SOP
- Model tier protocol + current model tiers
- Safe update procedures
- Maintenance cadence
- Parked inventory
- Prune rules
- Rollback index + backup set
- Carry-over manifest
- Quick reference card

The runbook becomes purely operational: 'how to set up and maintain the stack.' The architecture docs become: 'what the system is and why it's structured this way.' Clear separation of concerns.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Test Guardrails section moved from AGENT-STACK-RUNBOOK.md to docs/architecture/test-guardrails.md; runbook section replaced with a one-line markdown cross-reference link
- [x] #2 Phase 9 (backlog.md) section moved from AGENT-STACK-RUNBOOK.md to docs/architecture/backlog-lifecycle.md; runbook section replaced with a one-line markdown cross-reference link
- [x] #3 All inbound cross-references to moved sections updated: runbook TOC, inline references, and rollback index entries now point to the new architecture doc paths (docs/architecture/test-guardrails.md, docs/architecture/backlog-lifecycle.md) and resolve
- [x] #4 AGENT-STACK-RUNBOOK.md line count reduced by at least 90 lines
- [x] #5 No content lost — all moved sections have a 1:1 mapping to the new architecture docs; runbook retains install/ops/rollback/verification content
- [x] #6 frontmatter-check.ts validates the new architecture docs (all have correct frontmatter)
- [x] #7 TASK-16 does not add content to AGENTS.md (the factory-model section stays in the live global AGENTS.md as session behavior rules; it is already documented as architecture in docs/architecture/loop-factory.md)
- [x] #8 Runbook P5b AGENTS.md embed replaced with a cross-reference to the repo-tracked config/opencode-AGENTS.md (DRY — the tracked copy is the recoverable record)
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Enrich docs/architecture/test-guardrails.md with the FULL runbook Test Guardrails section content (responsibility split table, verification-before-completion, 12-item anti-pattern checklist, runners-per-context table, cadence, enforcement-is-physics) so AC #5 1:1 holds. 2. Enrich docs/architecture/backlog-lifecycle.md with Phase 9 operational content (install, manifest, MCP status, per-repo adoption, conductor ops, pilot, safe update). 3. Replace runbook Test Guardrails section (lines ~867-935) with one-line cross-ref to test-guardrails.md. 4. Replace runbook Phase 9 section (lines ~2448-2475) with one-line cross-ref to backlog-lifecycle.md. 5. Update all inbound cross-refs (runbook lines 639/682/708/726/1265/2306 referencing #test-guardrails + Phase 9 refs + rollback index rows) to point at the arch docs. 6. Replace P5b AGENTS.md embed (lines ~1244-1288) with a cross-reference to ~/.config/opencode/AGENTS.md (DRY) + rollback note. 7. Verify: runbook < 2431 lines (reduced >=90), frontmatter valid on arch docs, AGENTS.md under 55 lines, diff review, human merge gate.
<!-- SECTION:PLAN:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: @conductor
created: 2026-08-30 21:46
---
Diff review round 1: qwen REQUEST CHANGES + kimi REQUEST CHANGES (2 HIGH blockers: broken ../docs links from repo root; P5b recreation chain pointed at non-existent restore sources). Fix round applied: links corrected (TOC/rollback repo-relative docs/...; agent-template refs absolute ~/.agents/docs/...); global AGENTS.md tracked in-repo at config/opencode-AGENTS.md (byte-identical to live) + P5b points there; AC #7 reconciled (TASK-16 adds nothing to AGENTS.md); rollback rows delete arch docs; one-line link stubs; TASK-16 provenance added. Re-review: qwen APPROVE + kimi APPROVE, all blockers resolved. Runbook 2521->2394 lines (-127 >= -90). frontmatter arch 4/4 valid, research/plans/spec 50/50 valid, bun test 263 pass. Held at In Review awaiting human merge approval.
---
<!-- COMMENTS:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Split the runbook: moved Test Guardrails + Phase 9 (backlog.md) sections out of AGENT-STACK-RUNBOOK.md into docs/architecture/test-guardrails.md + backlog-lifecycle.md (enriched with the FULL runbook content — responsibility split, 12-item anti-pattern checklist, runners table, install/manifest/MCP ops — so no content lost). Replaced both runbook sections with one-line cross-reference links; updated all inbound refs (TOC, inline, rollback index, agent-template absolute paths). Replaced the stale P5b AGENTS.md embed with a DRY cross-reference to the repo-tracked config/opencode-AGENTS.md (restoring the fresh-Mac recreation chain). Runbook: 2521 -> 2394 lines (-127, exceeds the -90 target). Verified: frontmatter arch 4/4 valid, research/plans/spec 50/50 valid, bun test 263 pass, all links resolve. Diff review: qwen + kimi both APPROVE after 2 fix rounds (broken ../ links + P5b recreation chain were the 2 HIGH blockers). All 8 ACs checked.
<!-- SECTION:FINAL_SUMMARY:END -->
