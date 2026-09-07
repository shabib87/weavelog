---
date: 2026-09-07
topic: Documentation authoring rules
status: approved
type: architecture
author: conductor
related_to:
  - ./architecture/README.md
  - ./architecture/adr/README.md
  - ./INDEX.md
sources:
  - "TASK-15"
  - "TASK-76"
---

# Documentation authoring rules

Rules for writing docs in `docs/`. Two doc families share these rules:

- **Research** (`docs/research/`) — research schema. Ratified briefs (`docs/specs/`) also use the research schema for new files. Plans and learnings are frozen under `docs/archive/` (historical, closed)
- **Architecture** (`docs/architecture/`) — architecture schema

Enforcement split: the **frontmatter half is machine-enforced**
(`src/tools/frontmatter-check.ts`); the **structure half** (ADR format
contract, section rules) is **review-enforced** (maker/checker). No doc may
claim machine enforcement it does not deliver.

## Versioning (no semver on docs)

Documents carry **no semver**. Versioning signals, in order of authority:

1. **Git history** — every edit is immutable and diffable.
2. **Status lifecycle** — architecture: draft → in-review → approved →
   superseded/archived; research: open → decided/adopted → superseded.
3. **Identity + supersession** — ADR numbers are permanent; a changed
   decision gets a new ADR number with reciprocal supersede links; research
   notes use the `**Amends:**` header pattern.
4. **Dated addenda** — appended sections inside an ADR (see the ADR format
   contract's amendment rules).

A manual `version:` frontmatter field is prohibited: it duplicates git,
rots silently, and signals a compatibility contract docs do not have.
`schemaVersion` belongs to the **validator's schema definition** (in
`src/tools/frontmatter-check.ts`), added the day a second schema version
exists — and the validator must fail loudly on a future/unknown schema
version, never silently accept.

## Learnings vs research (merged forward, 2026-09-07)

`docs/learnings/` is **frozen and archived** — moved to `docs/archive/learnings/`
(2026-09-07) for provenance; **no new learnings files**. Session notes and reflections go to `docs/research/` as one dated
corpus under the research schema. The blog-feed intent survives as a
`**Lessons:**` block or topic tag inside the research note, not as a second
directory.

Rationale: two dated corpora with different schemas caused real drift — a
learnings file propagated secondhand claims into RESEARCH.md and required
cross-family correction (see `docs/research/2026-07-22-osmani-firsthand-
alignment-amendment.md`). One corpus, one schema, one validator path.
(AGENTS.md's former "every session produces a docs/learnings/ log" mandate
is superseded by this section.)

## Frontmatter template

### Architecture schema (`docs/architecture/**`)

```markdown
---
date: 2026-08-30            # ISO 8601, must match filename date prefix
topic: <concise topic>       # string
status: draft                # draft | in-review | approved | superseded | archived
type: architecture           # architecture | adr
author: conductor            # non-empty string
related_to:                  # array of relative paths (resolve against the doc's dir)
  - ./peer-doc.md
sources:                     # non-empty array
  - "TASK-15"
---
```

### Research schema (`docs/research/`, `docs/specs/`)

```markdown
---
date: 2026-08-30
topic: <concise topic>
status: open                 # verified-live | reviewer-corrected | resolved | open | decided | adopted | superseded | reviewer-approved-with-fixes-applied
sources:                     # non-empty array
  - "<source>"
models_used_for_research: []
supersedes: none             # 'none' or a filename in the same directory
---
```

## Statuses

- **Architecture:** draft → in-review → approved → (superseded | archived)
- **Research:** open → decided/resolved/adopted/verified-live → superseded

## Type-to-directory mapping

| type | directory |
|---|---|
| architecture | `docs/architecture/` |
| adr | `docs/architecture/adr/` |
| research | `docs/research/` |
| plan | **frozen** — moved to `docs/archive/plans/`; task planning lives in backlog tasks |
| spec | `docs/specs/` (ratified briefs; new plans live in backlog tasks) |

This file is `docs/AGENTS.md` (renamed from `docs/AUTHORING.md`, 2026-09-07): the
open AGENTS.md standard supports nested discovery, so agents working anywhere
under `docs/` auto-load these rules. It carries the architecture schema for its
own frontmatter. Parent-dir scan (`--schema architecture docs/`) is the
validation path; it also flags frontmatter-free root docs (`NORTH_STAR.md`,
`PRODUCT.md`, `ROADMAP.md`, `INDEX.md`, `NEXT_SESSION.md`, `cli.md`) — those are
anchor/hierarchy docs, intentionally frontmatter-free (NORTH_STAR is
human-owned), so their violations are **accepted known noise**. Only this
file's own result is authoritative in that scan.

## related_to convention

- `related_to` entries are relative paths resolved against the doc's own directory.
- **Dangling** refs (target file doesn't exist) are an ERROR — the validator rejects them.
- **Reciprocity:** if doc A lists doc B, doc B should list doc A back. Missing reciprocity is a WARNING (non-blocking).

## Validation

The checker resolves via the repo (`src/tools/frontmatter-check.ts`, wired
through `src/tools/tool-paths.ts` — not the `~/.agents/bin` path this file
carried from its origin repo):

```bash
# architecture schema (include adr/ — pass both dirs explicitly)
node --import tsx src/tools/frontmatter-check.ts --schema architecture docs/architecture docs/architecture/adr

# docs/AGENTS.md meta-doc (root-level, architecture schema)
node --import tsx src/tools/frontmatter-check.ts --schema architecture docs/AGENTS.md

# research schema (default)
node --import tsx src/tools/frontmatter-check.ts docs/research docs/specs
```

## ADR template

See [architecture/adr/README.md](./architecture/adr/README.md) — Nygard
sections plus the **format contract** (per-section format rules,
table-vs-list decision rule, explicit chosen/rejected verdicts, readability
limits; ADR-004 is the reference implementation). ADRs are added
incrementally on trigger; do NOT create retrospective ADRs.

## File naming

- **Research / plans / spec:** ISO date prefix `YYYY-MM-DD-<kebab-topic>.md`; the
  frontmatter `date` must match the filename prefix.
- **Architecture:** undated kebab-case (e.g. `loop-factory.md`, `tool-boundaries.md`); the
  frontmatter `date` records when the doc was written/updated and is not filename-bound.
- README.md files (indexes) are skipped by the validator.
