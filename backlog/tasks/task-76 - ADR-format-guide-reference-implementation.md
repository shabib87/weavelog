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
  - 'docs/architecture/adr/README.md'
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
1. Format contract added to `docs/architecture/adr/README.md` (section
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
- [ ] #1 WHEN the format contract lands THEN docs/architecture/adr/README.md SHALL contain the section skeleton with per-section format rules and the table-vs-list decision rule [ADR-005 TRD rule; ADR-003 format-contract decision]
- [ ] #2 WHEN the contract is adopted THEN docs/AUTHORING.md SHALL reference the ADR format contract
- [ ] #3 WHEN ADR-004 is reformatted THEN every decision SHALL be extractable from Decision + Alternatives tables alone (verdict markers on every option; no option without an explicit chosen/rejected) [ADR-005: ADR class format contract]
- [ ] #4 WHEN the reference implementation is done THEN frontmatter-check --schema architecture SHALL pass on docs/architecture/adr with zero violations
- [ ] #5 IF legacy ADRs are exempt THEN the ADR index SHALL say so explicitly (001/0002 marked pre-convention, not reformatted)
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Docs-only diff; zero code changes
- [ ] #2 frontmatter-check --schema architecture passes fresh in the worktree
- [ ] #3 Sanitization scan passes (no absolute home paths, no secrets)
- [ ] #4 Worktree clean; branch rebased on main
- [ ] #5 Human reviews diff before merge (HITL)
<!-- DOD:END -->
