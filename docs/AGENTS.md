# docs/ — rules for agents working in this directory tree

Applies to every file under `docs/`. The repo-root `AGENTS.md` holds the
global rules; this file adds the docs-specific ones. Anchor documents
(`NORTH_STAR.md`, `PRODUCT.md`, `ROADMAP.md`) are human-owned — never edit
them without explicit human instruction.

## What lives where

| Path | Purpose |
|---|---|
| `research/` | The ONE dated corpus (research schema). Session notes, evidence, amendments |
| `prd/` | Ratified milestone briefs (PRD class) — the release scope of record; cross-referenced with `backlog/milestones/` (see `prd/README.md`). A brief moves to `archive/` when the milestone it scopes ships |
| `trd/` | Durable technical design (TRD class — architecture schema, undated filenames) incl. the 2026-06-28 founding spec and `diagrams/`. Changed only via ADRs |
| `adr/` | Decision records — Nygard sections + format contract in that README. Read it before writing an ADR |
| `archive/` | Frozen provenance. **Never edit, never implement against, never add** (except whole-directory moves per the root AGENTS.md) |

## Artifact flow: PRD → TRD → ADR → TASK

Full rules in [adr/0005-artifact-flow.md](./adr/0005-artifact-flow.md).
Summary:

- **PRD** — ratified milestone brief in `prd/` (human-owned at kickoff;
  archives when the milestone ships).
- **TRD** — durable design in `trd/`; **changed only via ADRs**.
- **ADR** — one hard-to-reverse decision per record (format contract in
  `adr/README.md`); immutable once approved, superseded never
  rewritten.
- **TASK** — backlog item whose **acceptance criteria must cite the TRD
  section or ADR constraint they implement**; a task that traces to nothing
  is a YAGNI violation and is rejected at the plan gate.
- **BRD stays collapsed** into `NORTH_STAR.md` + PRODUCT.md (ADR-005,
  partially superseding the 2026-07-04 doc-chain collapse).

Authority: PRD > TRD > TASK on what; ADRs amend any level via a human gate;
research notes end at the decision gate (ADR-003) and never change the TRD
directly.

## When you finish research (end of WHY phase)

1. Note lands in `research/` with frontmatter (research schema) and a
   `YYYY-MM-DD-` filename matching its `date`.
2. Answer exactly one question: **did this produce a hard-to-reverse
   choice?**
   - Yes → write a small ADR in `adr/` (next free number; see
     that README's format contract) before moving on. ADR-004 is the
     reference implementation.
   - No → end the note with `Decision: none — research only`.

## When you write or edit an ADR

- Follow the format contract in `adr/README.md` — fixed
  section order, tables per the contract, explicit `chosen`/`rejected`
  verdicts. ADR-004 is the reference implementation.
- Amending an **approved** ADR: three tiers only — clarify in place with a
  dated note; append a dated `## Addendum` (decision unchanged); or create
  a new ADR and mark the old one `superseded` (decision changed). Details
  in the ADR README's "Amending an approved ADR".

## Versioning (no semver on docs)

Documents carry **no semver**. Versioning signals, in order of authority:
(1) git history; (2) status lifecycle; (3) ADR numbers + reciprocal
supersede links / research `**Amends:**` headers; (4) dated addenda.
A manual `version:` frontmatter field is prohibited — it duplicates git and
rots. `schemaVersion` belongs to the validator's schema definition
(`src/tools/frontmatter-check.ts`), added the day a schema v2 exists; the
validator must fail loudly on an unknown schema version.

## Learnings (archived)

`docs/learnings/` is frozen at `archive/learnings/` — no new learnings
files. Session notes go to `research/` (one dated corpus); blog intent
survives as a `**Lessons:**` block. Rationale and the superseded
"learning log every session" mandate: see `docs/AGENTS.md` history (commit
`1bc456a`) and `docs/research/2026-07-22-osmani-firsthand-alignment-amendment.md`
for the propagated-claims correction that motivated the merge.

## Validation

The checker (`src/tools/frontmatter-check.ts`) scans **non-recursively** —
pass each directory explicitly:

```bash
# architecture schema
node --import tsx src/tools/frontmatter-check.ts --schema architecture docs/trd docs/adr docs/prd

# research schema
node --import tsx src/tools/frontmatter-check.ts docs/research
```

Enforcement split: the **frontmatter half is machine-enforced**; the
**structure half** (ADR format contract, amendment tiers) is
**review-enforced** (maker/checker). No doc may claim machine enforcement it
does not deliver.

## Hard rules

- **No semver** in doc frontmatter (see Versioning above).
- **No absolute home paths, no secrets, no personal identifiers** — the
  privacy sweep rejects them.
- **Frontmatter schemas:** `trd/**` and `adr/**` use the architecture
  schema; `research/` uses the research schema. Known pre-convention
  exceptions (frontmatter-free, never "fix" without the human) plus
  `trd/worktree-discipline.md` (pre-existing debt, task pending): the v0.1.0
  draft brief and github-repo-metadata in `prd/` (the brief is
  byte-identity-protected — its internal `docs/specs/` literals are a
  frozen ratification snapshot), and the founding design spec in `trd/`.
- Known accepted noise: `NORTH_STAR.md`, `PRODUCT.md`, `ROADMAP.md`,
  `INDEX.md`, `cli.md`, this file, `archive/**`, and pre-convention files
  the validator flags in `research/`, `prd/`, and `trd/` (e.g. the v0.1.0 draft brief,
  the design spec) are intentionally frontmatter-free or frozen. Do not
  "fix" them by adding frontmatter without the human's say-so.
- New plans do **not** go in `docs/` — task planning lives in backlog tasks
  (acceptance criteria + definition of done). `archive/plans/` and
  `archive/superpowers/` are historical only.
- New **ratified briefs** go in `prd/`; new session notes go in
  `research/`; new durable design goes in `trd/` via an ADR.
