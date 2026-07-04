# loopeng

> Deterministic, human-verified agentic loops on Pi. Bootstrap any project as
> a self-contained workspace where agents spec, implement, and verify — you
> only review the diffs.

**Status:** Design phase. Spec and ADR complete. Implementation not started.

loopeng turns any project into a self-contained agentic workspace. A
pre-defined agent team runs an end-to-end loop — spec, implement, verify,
document — with the human in the loop only for verification. Built on
[Pi](https://pi.dev), [OpenRouter](https://openrouter.ai), and
[Headroom](https://github.com/chopratejas/headroom).

## Quickstart

> loopeng is not yet usable. This is the planned quickstart for v1.

```bash
# 1. Verify your machine
loopeng check

# 2. Initialize a workspace
loopeng init ./my-project --mode software

# 3. Start the loop
cd ./my-project
pi
/run feature "add user login"
```

## Documentation

| Doc | Purpose |
|---|---|
| [`docs/NORTH_STAR.md`](docs/NORTH_STAR.md) | What we build — the anchor |
| [`docs/RESEARCH.md`](docs/RESEARCH.md) | Why we build it this way — provenance |
| [`docs/adr.md`](docs/adr.md) | Architecture decision record |
| [`docs/specs/2026-06-28-loopeng-design.md`](docs/specs/2026-06-28-loopeng-design.md) | Detailed design |
| [`docs/tbd/`](docs/tbd/) | Open questions (3 remaining) |
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
| Distribution | npm primary, Homebrew secondary |
| Platform | macOS v1 |

## License

MIT — see [LICENSE](LICENSE).
