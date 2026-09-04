# flightlead

> The inner harness: agent work you can audit. Deterministic, human-verified
> agentic loops on Pi. Bootstrap any project as a self-contained workspace
> where agents spec, implement, and verify — you only review the diffs.

**Status:** Phase 1.95 — gate realism. Spec, ADR, and provenance complete; CLI scaffolded as a stub (`src/cli/index.ts`); full `flightlead init` / `check` / `plugin add` ship in Phase 4. Formerly codenamed *loopeng*.

flightlead turns any project into a self-contained agentic workspace. A
pre-defined agent team runs an end-to-end loop — spec, implement, verify,
document — with the human in the loop only for verification. Built on
[Pi](https://pi.dev), [OpenRouter](https://openrouter.ai), and
[Headroom](https://github.com/chopratejas/headroom).

## Quickstart

> flightlead is not yet usable. This is the planned quickstart for v1.

```bash
# 1. Verify your machine
flightlead check

# 2. Initialize a workspace
flightlead init ./my-project --mode software

# 3. Start the loop
cd ./my-project
pi
/run feature "add user login"
```

## Documentation

| Doc | Purpose |
|---|---|
| [`docs/NORTH_STAR.md`](docs/NORTH_STAR.md) | What we build — the anchor |
| [`docs/PRODUCT.md`](docs/PRODUCT.md) | Product strategy, moat, PMF |
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | Version milestones, release plan |
| [`docs/PROGRESS.md`](docs/PROGRESS.md) | Phase tracker — where we are |
| [`docs/NEXT_SESSION.md`](docs/NEXT_SESSION.md) | Narrative handoff |
| [`docs/INDEX.md`](docs/INDEX.md) | Document navigation map |
| [`docs/research/RESEARCH.md`](docs/research/RESEARCH.md) | Why we build it this way — provenance |
| [`docs/adr/0001-loopeng-architecture-decisions.md`](docs/adr/0001-loopeng-architecture-decisions.md) | Architecture decision record |
| [`docs/specs/2026-06-28-loopeng-design.md`](docs/specs/2026-06-28-loopeng-design.md) | Detailed design |
| [`docs/tbd/`](docs/tbd/) | Open questions (6 open, 1 resolved of 7) |
| [`docs/archive/`](docs/archive/) | Superseded research — **do not use** |

## Tech Stack

| Component | Choice |
|---|---|
| Language | TypeScript only (CLI + Pi extension) |
| Runtime | Node.js (`node --import tsx`) |
| Test | `node --import tsx --test` |
| Lint/Format | biome |
| Typecheck | `tsc --noEmit` |
| CI | GitHub Actions (`ubuntu-latest`) |
| Distribution | npm primary, Homebrew wraps npm (resolved — [`docs/tbd/bash-homebrew-tooling.md`](docs/tbd/bash-homebrew-tooling.md)) |
| Platform | macOS v1 |

## License

MIT — see [LICENSE](LICENSE).
