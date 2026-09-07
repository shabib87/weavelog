---
date: 2026-08-30
topic: Architecture Decision Record index
status: draft
type: adr
author: conductor
related_to:
  - ../README.md
  - ./0004-model-selection-benchmark-policy.md
  - ../loop-factory.md
  - ../../AGENTS.md
sources:
  - "TASK-15"
---

# Architecture Decision Records (ADR) index

ADRs are added **incrementally on trigger** — do NOT create retrospective ADRs. An ADR
is written when a decision is made that is hard to reverse and worth recording for
future agents/humans.

## Index

| ADR | Topic | Status | Added |
|---|---|---|---|
| ADR-001 | weavelog architecture decisions (legacy, migrated from `docs/adr/` 2026-09-07) | approved | 2026-07-04 |
| ADR-002 | bash-homebrew-tooling — satisfies the planned scripts-not-CLI decision (legacy, migrated 2026-09-07) | approved | 2026-06-29 |
| ADR-003 | three-phase loop model (WHY/WHAT/HOW × inner/outer roles) + decision-recording gate at end of WHY | in-review | 2026-09-07 |
| ADR-004 | model-selection benchmark policy (seat-weighted composite; HLE protocol pin; L0–L4 reviewer escalation; weekly/monthly drift cadence) | in-review | 2026-09-07 |
| ADR-005 | conductor-dispatch (subagents return findings, conductor writes state) | (planned) | trigger: next architecture decision |

> Migration note (2026-09-07): legacy ADRs 0001/0002 were migrated from
> `docs/adr/` (now removed) by human instruction; ADR-002 satisfies the
> originally planned scripts-not-CLI entry.

## Format contract (readability for humans and agents)

Nygard defines the sections; this contract defines the **format inside each
section**. An ADR reader — human or agent — must be able to extract every
decision from the Decision and Alternatives tables alone, without reading
prose.

### Section skeleton (fixed order)

`# Title` → `## Status` → `## Context` → `## Decision` → `## Consequences`
→ `## Alternatives considered` → `## Alignment` (weavelog-specific,
optional) → References footer.

### Per-section rules

| Section | Format rule |
|---|---|
| `# Title` | The decision in one line. Not "ADR: ..." — the title IS the record's handle |
| `## Status` | One vocabulary word (draft / in-review / approved / superseded / archived) + one-line sign-off state with date |
| `## Context` | Prose allowed for narrative; distinct forces become bullets. **Table when comparing ≥2 options on ≥2 shared attributes** (e.g., instruments, candidates) |
| `## Decision` | **Table when ≥3 parallel decisions** — columns `\| Decision \| Choice \| Why \|`. Bold the chosen term. Present tense ("uses", "is"). Numbered list only when order matters |
| `## Consequences` | Two buckets — **Easier:** and **Harder:** — one idea per bullet, bullet starts with a noun. No narrative paragraphs |
| `## Alternatives considered` | **Always a table** — columns `\| Option \| Verdict \| Why rejected \|`. Verdicts are `chosen` / `rejected`; every option carries an explicit verdict and every rejection a reason |
| `## Alignment` | Traceability table: `\| Decision \| Anchor \|` mapping to NORTH_STAR non-negotiables, PRODUCT, ROADMAP milestones (per the ROADMAP drift rule) |

### Decided vs rejected

No option may appear anywhere in the ADR without an explicit verdict marker.
Decisions are stated in present tense; rejections in past tense with the
reason attached ("rejected — reason"). If a revision changes a decision, the
old decision moves to Alternatives with verdict `superseded by <this ADR>`.

### Readability limits

- One idea per bullet; a bullet is one line where possible.
- Max ~5 bullets per group — beyond that, convert to a table.
- Bold only decision keywords; never bold whole sentences.
- No paragraph longer than ~8 printed lines.
- Tables over 6 rows move detail into the referenced note (ADR stays the
  decision record, not the evidence corpus).

### Legacy exemption

ADR-001 and ADR-002 are pre-convention records (migrated 2026-09-07) and are
**exempt** from this contract; they are frozen for provenance. ADR-004 is
the reference implementation.

## Amending an approved ADR

Rules (a)–(c) apply to **approved** ADRs. In-review ADRs revise in place
(the format contract's "superseded by <this ADR>" verdict covers in-review
revision). The **Decision table's Choice column is the arbiter** between
paths (b) and (c): if a Choice changes or a `chosen` verdict flips, it is
(c); if only Context/Consequences/cadence details change, it is (b).

| Change | Rule |
|---|---|
| (a) Clarification / typo / formatting | Edit in place; add a dated one-line revision note (e.g. "*(Revised 2026-09-07: ...)*") |
| (b) Details evolve, decision itself unchanged | Append a `## Addendum YYYY-MM-DD` section — placed **after Alignment, before References**. Addenda are **append-only**: earlier sections are never silently rewritten. Status stays approved |
| (c) The decision itself changes or reverses | **New ADR number** is created. The old ADR gets: frontmatter `status: superseded`, a `## Status` line "superseded by ADR-NNNN", and a flipped index row. The new ADR's Alternatives table carries the reciprocal `superseded by <old>` entry. The old file is never deleted |

Status lives in **three places** — frontmatter, the `## Status` section, and
the index table in this README. A status change must move **all three**
together; the index is the findable surface and silently lying there is the
failure mode.

Named limitation: the architecture schema has **no `supersedes` field** (the
research schema does), so supersede links are prose + `related_to` + the
index — the validator does not catch a missing link. Also note only the
frontmatter half is machine-enforced; these rules are **review-enforced**
(maker/checker), and the review must check them against this section
verbatim.

## Writing an ADR

1. Copy the format contract above into `docs/architecture/adr/NNNN-<slug>.md`.
2. Fill frontmatter per the architecture schema (date, topic, status, type: adr, author, related_to, sources).
3. Add the entry to the index table above.
4. Add reciprocal `related_to` links to linked docs.

## References

- Authoring rules: [docs/AGENTS.md](../../AGENTS.md)
- Format contract: this document (see above); validated structurally by
  `frontmatter-check.ts --schema architecture` (frontmatter half only — the
  structure half is review-enforced)
- Nygard template source: [https://github.com/joelparkerhenderson/architecture-decision-record](https://github.com/joelparkerhenderson/architecture-decision-record)
