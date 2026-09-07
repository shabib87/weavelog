---
date: 2026-08-30
topic: Documentation authoring rules
status: draft
type: architecture
author: conductor
related_to:
  - ./architecture/README.md
  - ./architecture/adr/README.md
sources:
  - "TASK-15"
---

# Documentation authoring rules

Rules for writing docs in `~/.agents/docs/`. Two doc families share these rules:

- **Research / plans / spec** (`docs/research/`, `docs/plans/`, `docs/spec/`) — research schema
- **Architecture** (`docs/architecture/`) — architecture schema

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

### Research schema (`docs/research/`, `docs/plans/`, `docs/spec/`)

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
| plan | `docs/plans/` |
| spec | `docs/spec/` |

Exception: this file (`docs/AUTHORING.md`) is a root-level meta-doc that carries the
architecture schema for its own frontmatter but lives outside `docs/architecture/` by
design (naming avoids `docs/AGENTS.md` overload). It is validated explicitly with
`--schema architecture docs/` (parent-dir scan).

## related_to convention

- `related_to` entries are relative paths resolved against the doc's own directory.
- **Dangling** refs (target file doesn't exist) are an ERROR — the validator rejects them.
- **Reciprocity:** if doc A lists doc B, doc B should list doc A back. Missing reciprocity is a WARNING (non-blocking).

## Validation

```bash
# architecture schema (include adr/ — pass both dirs explicitly)
bun ~/.agents/bin/src/frontmatter-check.ts --schema architecture ~/.agents/docs/architecture ~/.agents/docs/architecture/adr

# AUTHORING.md meta-doc (root-level, architecture schema)
bun ~/.agents/bin/src/frontmatter-check.ts --schema architecture ~/.agents/docs

# research schema (default)
bun ~/.agents/bin/src/frontmatter-check.ts ~/.agents/docs/research ~/.agents/docs/plans ~/.agents/docs/spec
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
