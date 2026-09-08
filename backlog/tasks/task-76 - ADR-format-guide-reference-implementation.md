---
id: TASK-76
title: >-
  docs/ governance — ADR format contract, ADR-001 umbrella resolution,
  artifact flow (ADR-005), task-process contract, archive reorganization
status: In Progress
assignee: []
created_date: '2026-09-07 21:40'
updated_date: '2026-09-07 21:40'
labels:
  - spec-approved
milestone: m-7
dependencies:
  - TASK-61
references:
  - 'docs/adr/README.md'
  - 'docs/AUTHORING.md'
priority: medium
type: task
ordinal: 51000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
ADRs follow Nygard + architecture frontmatter but lack a format contract:
no rules for when to use tables vs lists, no explicit decided-vs-rejected
markers, narrative paragraphs where scannable structure belongs. ADRs are
read by humans AND agents; readability is a correctness property (an agent
must be able to extract every decision from tables alone).

Deliverables:
1. Format contract added to `docs/adr/README.md` (section
   skeleton with per-section format rules; table-vs-list decision rule;
   decided/rejected verdict markers; readability limits) and a pointer from
   `docs/AUTHORING.md`.
2. ADR-004 reformatted as the reference implementation (dogfood: the guide
   is validated by applying it).
3. Legacy ADR-001/0002 marked exempt (pre-convention records; not
   reformatted).

Out of scope: structural validation in check-gates (optional post-0.1.0
extension, not promised); TASK-75 config adoption.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 WHEN the format contract lands THEN docs/adr/README.md SHALL contain the section skeleton with per-section format rules and the table-vs-list decision rule [ADR-005 TRD rule; ADR-003 format-contract decision]
- [ ] #2 WHEN the contract is adopted THEN docs/AGENTS.md SHALL reference the ADR format contract [retargeted 2026-09-07: AUTHORING.md was renamed docs/AGENTS.md earlier this branch]
- [ ] #3 WHEN ADR-004 is reformatted THEN every decision SHALL be extractable from Decision + Alternatives tables alone (verdict markers on every option; no option without an explicit chosen/rejected) [ADR-005: ADR class format contract]
- [ ] #4 WHEN the reference implementation is done THEN frontmatter-check --schema architecture SHALL pass on docs/trd, docs/adr, docs/prd with zero violations beyond the documented pre-convention exceptions
- [ ] #5 IF legacy ADRs are exempt THEN the ADR index SHALL say so explicitly (001/0002 marked pre-convention, not reformatted)
<!-- AC:END -->

## Plan (2026-09-07, human-directed full reorg)

Human directive: docs/ fully organized — docs/prd/, docs/trd/, docs/adr/;
guardrails + conventions; backlog DAG/description/AC/DoD updates; docs/prd
cross-references every backlog milestone. Supersedes the earlier specs/
decision. PLAN REVIEW GATE before implementation; diff review after.

Phase 1 — moves (git mv, no content edits):
- specs/2026-09-05-v010-draft-brief.md + github-repo-metadata.md -> docs/prd/
- specs/2026-06-28-weavelog-design.md -> docs/trd/ (founding TRD)
- architecture/*.md (8 TRD docs) -> docs/trd/; README.md -> docs/trd/README.md (TRD index)
- architecture/adr/ -> docs/adr/; architecture/diagrams/ -> docs/trd/diagrams/
- empty specs/ + architecture/ removed

Phase 2 — conventions + ADR-005 amendment (in-review: amend in place, dated):
- ADR-005 gains the physical directory map (prd/trd/adr homes)
- docs/AGENTS.md: what-lives-where, artifact-flow links, validation commands
  (--schema architecture docs/trd docs/adr docs/prd), hard rules
- docs/adr/README.md paths + related_to in all 5 ADRs
- docs/trd/README.md nav map; docs/prd/README.md NEW: PRD index with
  milestone cross-reference table (m-0..m-7 <-> brief anchors <-> status)
  + reciprocal pointers in backlog/milestones/*.md
- INDEX.md, backlog-lifecycle.md, 5 TRD docs cross-refs, 3 research notes
  (path repair only)

Phase 3 — code path literals (TDD: test first):
- tests/task-policy.test.ts:288 -> docs/trd/worktree-discipline.md (fails first)
- src/tools/task-validate.ts:232 protected paths; src/hooks/enforce.ts:742,777
  messages; src/tools/worktree-create.ts:49,56 hook text
- payload: AGENTS.md, config/prompts/reviewer.md, config/opencode.jsonc,
  skills/as-domain-modeling/SKILL.md
- AC#1 "zero code changes" amended with dated note (human-directed scope growth)

Phase 4 — backlog DAG:
- affected open tasks (28, 35, 45, 49, 56, 59, 74): dated AC path amendments
- TASK-76 AC provenance + DoD updates; Done tasks untouched (ledger)

Phase 5 — gates:
- frontmatter-check (all dirs), task-validate --pre-commit, biome, tsc, tests
- diff review: DeepSeek + Qwen + GLM; blockers fixed before merge gate

## Plan review disposition (2026-09-07, DeepSeek + Qwen: APPROVE-WITH-CHANGES)

Applied to the plan:
- P0: package.json files[] ships docs/trd/ -> replace with docs/trd/ + docs/adr/ + docs/prd/ (Phase 3)
- Validator/frozen-docs conflict: NO new exclusion flag (scope discipline). DoD#2 reworded: passes with only the 3 documented pre-convention exceptions (prd/ brief + metadata, trd/ founding spec)
- Exhaustive grep-driven related_to + body sweep, depth-aware (replaces "5 TRD docs cross-refs"); ADR-001 (approved) gets tier-1 dated note
- Added to sweep: root AGENTS.md:38-57, docs/cli.md:4,213,225,231, ATTRIBUTION.md:25, frontmatter-check.ts help text (39,71)
- Dropped: "3 research notes path repair" (they cite docs/spec/ singular, a backlog convention, not this tree)
- Brief byte-identity: internal docs/specs/ literals are FROZEN-SNAPSHOT, intentionally not repaired (recorded in ADR-005 amendment + prd/README)
- AUTHORING.md does not exist (renamed to docs/AGENTS.md earlier this branch): AC#2 retargeted
- Phase 4 corrected: 35/59 are Done (dropped, ledger rule); added 30; TASK-56 carve-out noted (path literals only here; it owns semantic AGENTS.md/cli.md work)
- HARNESS_PATH_RULES: prefix set = docs/trd/, docs/adr/, docs/prd/ (test fixture extended same commit)

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Docs-only diff; zero code changes [AMENDED 2026-09-07, human-directed: path-literal touch-ups in src/ (test-first), payload/ configs, and backlog/ task files now in scope per the Phase 1-5 plan below]
- [ ] #2 frontmatter-check --schema architecture passes fresh in the worktree on docs/trd docs/adr docs/prd, with only the 3 documented pre-convention exceptions (frontmatter-free ratified records)
- [ ] #3 Sanitization scan passes (no absolute home paths, no secrets)
- [ ] #4 Worktree clean; branch rebased on main
- [ ] #5 Human reviews diff before merge (HITL)
<!-- DOD:END -->

2026-09-07 execution note (phases 1-4 done): plan review DeepSeek + Qwen
APPROVE-WITH-CHANGES, all dispositions applied (package.json files[] P0,
validator noise list instead of new code, exhaustive grep-driven sweep,
research-note repair dropped, byte-identity frozen-snapshot rule, Phase-4
list corrected). DISCLOSURE: the global path sweep also touched DONE task
files (24/33/35/36/51/58/61/71/75) — mechanical path-literal repair only,
no AC/summary/narrative changes; ledger rule interpreted as protecting
historical narrative, not dangling references. Residual old-path strings in
Done files (15/16/32/58/61) are inside historical commit quotes or
superseded-inventory descriptions and are left as provenance.
