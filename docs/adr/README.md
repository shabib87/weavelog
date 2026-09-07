# Legacy ADR location — do not add ADRs here

**Status:** Frozen (2026-09-07). Superseded as the ADR home by
[`docs/architecture/adr/`](../architecture/adr/README.md) per
[`~/.agents/docs/AUTHORING.md`](../../.agents/docs/AUTHORING.md)
(Nygard format, architecture-schema frontmatter, incremental-on-trigger).

## What lives here

| File | Status |
|---|---|
| `0001-weavelog-architecture-decisions.md` | Legacy record (2026-07-04), pre-convention. Retained for provenance; referenced by other docs by this path. |
| `0002-bash-homebrew-tooling.md` | Legacy record (2026-06-29), pre-convention. Retained for provenance. Topic corresponds to the ratified index's planned ADR-001 (scripts-not-CLI). |

## Rules

- New ADRs go to `docs/architecture/adr/NNNN-<slug>.md` and get an index row
  in that directory's README.
- These two files stay at their paths so existing inbound references do not
  break; they are not renumbered into the ratified index (that would be
  retrospective ADR creation, which the convention forbids).
- Absorbing/reconciling these legacy records into the ratified index is a
  future docs task, not part of TASK-61.
