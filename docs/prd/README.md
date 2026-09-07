# PRD — ratified milestone briefs

Product-requirements class per [ADR-0005](../adr/0005-artifact-flow.md):
**PRD = a milestone brief ratified by the human at kickoff** — the release
scope of record for one milestone. A brief moves to `archive/` when the
milestone it scopes ships. Everything here is a ratification record: edit
via a dated amendment note, never silently.

| File | Class | Status |
|---|---|---|
| [2026-09-05-v010-draft-brief.md](./2026-09-05-v010-draft-brief.md) | PRD — v0.1.0 scope of record | Active (milestone m-7 open). **Byte-identity-protected** (TASK-45/56): internal `docs/specs/` literals are a frozen ratification snapshot, intentionally not repaired |
| [2026-09-05-github-repo-metadata.md](./2026-09-05-github-repo-metadata.md) | Companion record (repo name/metadata ratification, TASK-45 reference) | Active until the 0.1.0 flip completes |

## Milestone cross-reference

PRD briefs ↔ backlog milestones ↔ task activity. Milestone files are
human-owned (backlog CLI); the PRD side links to them and each milestone
file points back here.

| Milestone | Scope one-liner | PRD anchor | State |
|---|---|---|---|
| [m-0](../../backlog/milestones/m-0%20-%20conductor-wiring.md) conductor-wiring | Conductor pattern → backlog.md, stack checks, EARS ACs, verify-gate | Pre-brief (conductor wiring preceded the brief format) | Done |
| [m-1](../../backlog/milestones/m-1%20-%20first-real-task.md) first-real-task | One real task end-to-end + proxy routing dogfood | Pre-brief | Done |
| [m-2](../../backlog/milestones/m-2%20-%20docs-restructure.md) docs-restructure | Architecture docs, runbook split, stale-reference fixes | Pre-brief | Done (superseded in part by this reorg) |
| [m-3](../../backlog/milestones/m-3%20-%20package-and-ship.md) package-and-ship | ~/Projects move, private GitHub, semver, setup guide | Pre-brief | Done |
| [m-4](../../backlog/milestones/m-4%20-%20harness-agnostic.md) harness-agnostic | opencode/pi-agnostic, SDK driver pipeline | Pre-brief | Done |
| [m-5](../../backlog/milestones/m-5%20-%20open-source-release.md) open-source-release | Public GitHub, LICENSE, CI/CD, community docs | Pre-brief | Open |
| [m-6](../../backlog/milestones/m-6%20-%20version-scope.md) version-scope | Version scope definition | [v0.1.0 draft brief](./2026-09-05-v010-draft-brief.md) (scope-of-record method) | Open |
| [m-7](../../backlog/milestones/m-7%20-%20pre-publish-v0.1.0.md) pre-publish-v0.1.0 | Pre-publish hardening | [v0.1.0 draft brief](./2026-09-05-v010-draft-brief.md) — the ratified scope anchor for every 0.1.0 decision | Open (active) |

Rule: a milestone with a PRD anchor cites the brief; the brief's milestone
mapping section is the authority when wording drifts. New briefs land here
(`YYYY-MM-DD-<milestone>-brief.md`), get a row above, and the milestone
file gains a reciprocal pointer.
