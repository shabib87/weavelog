---
date: 2026-06-29
topic: Bash tooling and Homebrew distribution (scripts-not-CLI; legacy, migrated from docs/adr/)
status: approved
type: adr
author: conductor
related_to:
  - ./README.md
sources:
  - "TASK-15"
---

# Bash Tooling & Homebrew Distribution

## Status

approved (2026-06-29) — **TypeScript only, entire project.** Legacy record
(migrated from `docs/adr/` 2026-09-07); reformatted to the format contract,
content unchanged.

## Context

- The CLI (`weavelog check`, `weavelog init`) does logic-heavy work:
  version checks, package presence detection, idempotent file scaffolding,
  template rendering.
- Pi already requires Node, so a TypeScript CLI adds no new runtime
  dependency — it exists anyway.
- v1 targets macOS only; CI runs Linux-only (free tier) — see
  `ci-cd-strategy.md`.

## Decision

| Decision | Choice | Why |
|---|---|---|
| Implementation language | **TypeScript** for the CLI and the Pi extension — entire project | One language = one test setup (`node --import tsx --test`), one linter (biome), one typechecker (tsc); SOLID/TDD apply; shares types with the extension |
| Bash usage | **None for logic**; trivial shims only if ever needed (none anticipated in v1) | Bash is a liability for logic-heavy scaffolding and testing |
| Distribution, primary | **npm** — `npx weavelog@latest init`, zero install | Works without Homebrew; standard TS distribution |
| Distribution, secondary | **Homebrew formula** wrapping the npm package with a `node` dependency | How TS-based taps (`serve`, `bun`) distribute |
| Extension install | `pi install npm:weavelog/pi-weavelog` (pre-rename scope) | Extension ships as an npm package |

## Consequences

**Easier:**

- One toolchain: tests, lint, typecheck all in TS tooling.
- SOLID and TDD apply cleanly to CLI logic.
- Zero-install onboarding via `npx`.

**Harder:**

- CI runs Linux-only while the target is macOS — TS portability keeps the
  macOS-specific surface small and mockable.
- Homebrew users get a transitive `node` dependency.

## Alternatives considered (provenance)

| Option | Verdict | Why rejected |
|---|---|---|
| Pure bash 5.x (original plan) | rejected | fragile for logic-heavy scaffolding; hard to test beyond bats |
| TypeScript + thin bash wrapper | rejected | unnecessary complexity |
| Go or Rust compiled binary | rejected | overkill for solo-dev v1 |

## Notes

- Testing strategy follows from the language choice: `node:test` via
  `node --import tsx --test`, tsc, biome; TDD/SOLID/unit+integration apply.
- This record satisfies the originally planned "scripts-not-CLI" index entry.
