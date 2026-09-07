---
id: TASK-24
title: Add missing architecture diagrams to docs
status: Done
assignee:
  - '@conductor'
created_date: '2026-08-30 22:17'
updated_date: '2026-09-04 18:24'
labels: []
milestone: m-3
dependencies: []
ordinal: 16000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
docs/trd/ currently has only ONE diagram: diagrams/loop-factory.html (TASK-15, via diagram-design skill). The remaining architecture docs are text-only. This task adds FOUR diagrams (config-sync-flow is DEFERRED to a follow-up gated on TASK-23 Done — it depicts a mechanism that doesn't exist yet):

| Diagram | Home doc (must link it) | Scope |
|---|---|---|
| tool-boundaries.html | docs/trd/tool-boundaries.md | tool loop-POSITION placement on the phase x loop model (not a re-render of the table) |
| backlog-lifecycle.html | docs/trd/backlog-lifecycle.md | task STATE MACHINE: create -> plan -> worktree -> verify -> merge -> Done, with backlog.md field mapping (distinct from loop-factory which is phases/roles/boundary) |
| conductor-dispatch.html | global AGENTS.md section 'Agent roster + dispatch routing' (runbook has NO dispatch section — verified) | roles across the 3 phases (scout/researcher/implementer/reviewer/qa/security) — NOT per-seat |
| subagent-roster.html | AGENT-STACK-RUNBOOK.md Phase 3 'Role agents' roster section | ownership map with POD GROUPING: conductor root + scout, researcher, implementer, qa, security + reviewers-x4 pod + plan-gates-x4 pod + vision-x3 pod = 9 nodes max |

Verification split (self_check.py does NOT check grid/coral/counts): each diagram passes self_check.py exit 0 (accessible-SVG contract) AND vision-minimax render-verify on a fixed checklist (no clipping, legend readable, coral <= 2, coordinates on 4px grid, node/arrow counts within skill budget). Vision-kimi only if minimax verdict is ambiguous. Also add diagrams/README.md index (each diagram, one-line description, source-doc link, generated date).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 WHEN ls docs/trd/diagrams/ is run THEN it lists loop-factory.html, tool-boundaries.html, backlog-lifecycle.html, conductor-dispatch.html, subagent-roster.html, and README.md (config-sync-flow is DEFERRED — gated on TASK-23 Done, not part of this task)
- [x] #2 WHEN each new diagram is generated THEN it passes the diagram-design skill self_check.py (exit 0) AND vision-minimax render-verify on the fixed checklist (no clipping, legend readable, coral <= 2, 4px grid, node/arrow counts within the skill budget); vision-kimi only if the minimax verdict is ambiguous
- [x] #3 WHEN subagent-roster.html and conductor-dispatch.html are generated THEN same-family agent shims (diff-reviewer-*, plan-gate-*, vision-*) are drawn as single grouped pod nodes so the total node count is <= 9 (conductor + scout/researcher/implementer/qa/security + reviewers-x4 pod + plan-gates-x4 pod + vision-x3 pod)
- [x] #4 WHEN each home doc named in the mapping table is read THEN it contains a one-line markdown link to its diagram: tool-boundaries.md -> tool-boundaries.html; backlog-lifecycle.md -> backlog-lifecycle.html; global AGENTS.md 'Agent roster + dispatch routing' section -> conductor-dispatch.html; runbook Phase 3 'Role agents' roster section -> subagent-roster.html
- [x] #5 WHEN docs/trd/diagrams/README.md is read THEN it lists each diagram, a one-line description, its source-doc link, and the generated date
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Recon: read diagram-design SKILL.md + the 4 home docs (tool-boundaries.md, backlog-lifecycle.md, AGENTS.md roster section, runbook Phase 3 roster) to extract exact content per diagram. 2. Generate 4 HTML diagrams via diagram-design skill: tool-boundaries (loop-position placement), backlog-lifecycle (task state machine + backlog.md field mapping), conductor-dispatch (roles across 3 phases), subagent-roster (pod-grouped ownership map, <=9 nodes). 3. Verify each: self_check.py exit 0 + vision-minimax render check on the fixed checklist. 4. Add one-line links in each home doc + diagrams/README.md index. 5. Cross-model review, human merge gate.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
4 diagrams generated (tool-boundaries, backlog-lifecycle, conductor-dispatch, subagent-roster): all pass self_check.py exit 0 AND vision-minimax render verify (5-item fixed checklist: no clipping, legend readable, coral<=2 focal nodes, 4px grid 10/10 spot-checks, node/arrow counts within budget). Deviation noted: AC #4's 'AGENTS.md Agent roster + dispatch routing section' no longer exists (AGENTS.md thinned to 49 lines in TASK-23) — conductor-dispatch.html home link placed in diagrams/README.md + ADR-002 reference; subagent-roster.html linked in runbook Phase 3. Home-doc links + diagrams/README.md index added.

Render-verify round (owner directed GLM-5.3-flash vision on headless-Chrome PNG screenshots instead of SVG-source analysis — minimax verdicts missed real defects): caught and fixed tag text off-center (PLUGIN/SCRIPT/GATE-3), box overlaps, labels clipping under boxes, dashed infra line transiting worktree box, kick-back arc landing wrong, gate-semantics color mismatch, EVIDENCE return transiting implementer, roster pod drops crossing researcher/qa boxes, model-version ID rot, roster count 16-role-agents+conductor. Two render rounds until all four PNGs inspected clean by direct vision. self_check.py ALL-OK after fixes.

Merged to main (fast-forward 239cbe0) after human merge approval 2026-09-01; worktree cleanup pending.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Shipped 4 architecture diagrams (docs/trd/diagrams/): tool-boundaries.html (6 tools on loop positions), backlog-lifecycle.html (state machine + 2 human gates + field mapping), conductor-dispatch.html (roles across WHY/WHAT/HOW), subagent-roster.html (16 role agents + conductor, 3 model-family pods), plus diagrams/README.md index and one-line links in each home doc. Verification: self_check.py exit 0 on all + vision-minimax checklist + TWO rounds of direct PNG render inspection via GLM-5.3-flash vision on headless-Chrome screenshots (owner-directed after minimax missed real defects) — all renders verified clean. 3-family diff review (kimi/deepseek approve-with-fixes, qwen reject): all shared blockers fixed (roster count, invalid SVG rect, disconnected pod, gate semantics, dead artifacts, tilde links, self-contained claim softened). AC #4 deviation: AGENTS.md roster section was thinned in TASK-23 — conductor-dispatch home link lives in README index + ADR-002 reference. Verified with: bun test 351/0 (no code touched), self_check.py, Chrome headless renders.
<!-- SECTION:FINAL_SUMMARY:END -->
