# docs/ — rules for agents working in this directory tree

Applies to every file under `docs/`. The repo-root `AGENTS.md` holds the
global rules; this file adds the docs-specific ones. Anchor documents
(`NORTH_STAR.md`, `PRODUCT.md`, `ROADMAP.md`) are human-owned — never edit
them without explicit human instruction.

## What lives where

| Path | Purpose |
|---|---|
| `research/` | The ONE dated corpus (research schema). Session notes, evidence, amendments |
| `architecture/` | Durable architecture docs (architecture schema, undated filenames) |
| `architecture/adr/` | Decision records — Nygard sections + format contract in that README. Read it before writing an ADR |
| `specs/` | Ratified PRD/TRD-class docs: requirements and design that backlog tasks implement (e.g. the v0.1.0 draft brief — the release scope of record — and the weavelog design spec). A brief moves to `archive/` when the milestone it scopes ships; a design spec stays while it describes the current system |
| `archive/` | Frozen provenance. **Never edit, never implement against, never add** (except whole-directory moves per the root AGENTS.md) |

## When you finish research (end of WHY phase)

1. Note lands in `research/` with frontmatter (research schema) and a
   `YYYY-MM-DD-` filename matching its `date`.
2. Answer exactly one question: **did this produce a hard-to-reverse
   choice?**
   - Yes → write a small ADR in `architecture/adr/` (next free number; see
     that README's format contract) before moving on. ADR-004 is the
     reference implementation.
   - No → end the note with `Decision: none — research only`.

## When you write or edit an ADR

- Follow the format contract in `architecture/adr/README.md` — fixed
  section order, tables per the contract, explicit `chosen`/`rejected`
  verdicts. ADR-004 is the reference implementation.
- Amending an **approved** ADR: three tiers only — clarify in place with a
  dated note; append a dated `## Addendum` (decision unchanged); or create
  a new ADR and mark the old one `superseded` (decision changed). Details
  in the ADR README's "Amending an approved ADR".

## Hard rules

- **No semver** in doc frontmatter. Git, status lifecycle, and supersede
 links are the versioning — git history plus the status lifecycle.
- **No absolute home paths, no secrets, no personal identifiers** — the
  privacy sweep rejects them.
- **Frontmatter schemas:** `architecture/**` uses the architecture schema;
  `research/` and `specs/` use the research schema. The checker scans
  non-recursively — pass each directory explicitly:
  `node --import tsx src/tools/frontmatter-check.ts --schema architecture docs/architecture docs/architecture/adr`
  then `node --import tsx src/tools/frontmatter-check.ts docs/research docs/specs`
- Known accepted noise: `NORTH_STAR.md`, `PRODUCT.md`, `ROADMAP.md`,
  `INDEX.md`, `cli.md`, this file, and `archive/**` are
  intentionally frontmatter-free or frozen — their validator violations are
  accepted. So are pre-convention files the validator flags in `research/`
  and `specs/` (e.g. the v0.1.0 draft brief, the design spec); normalizing
  them is deferred debt, not an error to fix casually. Do not "fix" any of
  these by adding frontmatter without the human's say-so.
- New plans do **not** go in `docs/` — task planning lives in backlog tasks
  (acceptance criteria + definition of done). `archive/plans/` and
  `archive/superpowers/` are historical only.
- `specs/` is for **ratified briefs** only; a brief becomes archival when
  the milestone it scopes ships.
