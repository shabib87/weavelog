# PRD — ratified milestone briefs

Product-requirements class per [ADR-0005](../adr/0005-artifact-flow.md):
**PRD = a milestone brief ratified by the human** — the scope of record for
one milestone, with the requirements INSIDE it (no separate requirements
class; the BRD ceremony was rejected 2026-07-04, research §7). A brief moves
to `archive/` when the milestone it scopes ships. Linkage with
`backlog/milestones/` is **bidirectional and machine-checked** (`type: prd`
frontmatter `milestones:` ↔ milestone-file `PRD anchor:` line).

| Brief | Milestone | Status |
|---|---|---|
| [2026-09-07-m-0-conductor-wiring-brief.md](./2026-09-07-m-0-conductor-wiring-brief.md) | m-0 conductor-wiring | backfilled (done pre-brief-convention) |
| [2026-09-07-m-1-first-real-task-brief.md](./2026-09-07-m-1-first-real-task-brief.md) | m-1 first-real-task | backfilled |
| [2026-09-07-m-2-docs-restructure-brief.md](./2026-09-07-m-2-docs-restructure-brief.md) | m-2 docs-restructure | backfilled (partly superseded by the ADR-0005 reorg) |
| [2026-09-07-m-3-package-and-ship-brief.md](./2026-09-07-m-3-package-and-ship-brief.md) | m-3 package-and-ship | backfilled |
| [2026-09-07-m-4-harness-agnostic-brief.md](./2026-09-07-m-4-harness-agnostic-brief.md) | m-4 harness-agnostic | backfilled |
| [2026-09-07-m-5-open-source-release-brief.md](./2026-09-07-m-5-open-source-release-brief.md) | m-5 open-source-release | draft — pending human ratification |
| [2026-09-07-m-6-version-scope-brief.md](./2026-09-07-m-6-version-scope-brief.md) | m-6 version-scope | draft — pending human ratification |
| [2026-09-05-v010-draft-brief.md](./2026-09-05-v010-draft-brief.md) | m-7 pre-publish-v0.1.0 (+ m-6 method) | approved — release scope of record |
| [2026-09-05-github-repo-metadata.md](./2026-09-05-github-repo-metadata.md) | m-7 (companion) | approved |

Brief body format (minimal by design): Scope, Requirements, TRD linkage,
Provenance. In/out-of-scope detail and success criteria live in the
milestone's task set rather than duplicated here; backfilled briefs are
intentionally minimal records.

Backfilled briefs record ratifications that already happened in-thread; they
are not retroactive decisions. Draft briefs need explicit human
ratification before their milestone's tasks claim.

Byte-identity of the v0.1.0 brief was re-ratified away by the human
(2026-09-07, TASK-76 directive 2): it now carries frontmatter and its
internal paths are repaired (see ADR-0005 amendment; TASK-56 AC#6 updated
in place). Linkage asymmetry by design: a brief may list several
milestones (e.g. the v0.1.0 brief covers m-6 and m-7), while each
milestone anchors exactly one brief.

## Flow (ADR-0005)

idea → PRD (requirements inside) → TRD → milestone ↔ PRD → TASK;
ADRs fire cross-cutting at the decision gate, any stage.
Linkage is machine-enforced; flow order and content are review-enforced.
