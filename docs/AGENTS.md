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
| `specs/` | Ratified briefs only (e.g. the v0.1.0 draft brief — the release scope of record) |
| `archive/` | Frozen provenance. **Never edit, never implement against, never add** (except whole-directory moves per the root AGENTS.md) |
| `NEXT_SESSION.md` | Session handoff — update before closing a session |

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
  links are the versioning (see `AGENTS.md` "Versioning").
- **No absolute home paths, no secrets, no personal identifiers** — the
  privacy sweep rejects them.
- **Frontmatter schemas:** `architecture/**` uses the architecture schema;
  `research/` and `specs/` use the research schema. Validate:
  `node --import tsx src/tools/frontmatter-check.ts --schema architecture docs/`
- Known accepted noise: `NORTH_STAR.md`, `PRODUCT.md`, `ROADMAP.md`,
  `INDEX.md`, `NEXT_SESSION.md`, this file, and `archive/**` are
  intentionally frontmatter-free or frozen — their validator violations are
  accepted. Do not "fix" them by adding frontmatter.
- New plans do **not** go in `docs/` — task planning lives in backlog tasks
  (acceptance criteria + definition of done). `archive/plans/` and
  `archive/superpowers/` are historical only.
- `specs/` is for **ratified briefs** only; a brief becomes archival when
  the milestone it scopes ships.
