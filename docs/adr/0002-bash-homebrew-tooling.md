# Bash Tooling & Homebrew Distribution

**Status:** ✅ RESOLVED (June 29, 2026) — **TypeScript only, entire project.**

## Decision

The CLI (`weavelog check`, `weavelog init`) and the Pi extension are both
TypeScript. No bash for logic. Bash is used only for trivial shims if ever
needed (none anticipated in v1).

**Rationale:**
- Pi already requires Node, so a TypeScript CLI adds no new runtime
  dependency for users — the dependency already exists.
- One language = one test setup (`node --import tsx --test`), one linter
  (biome), one typechecker (tsc). No bats/shellcheck/shfmt parallel track.
- The CLI does logic-heavy work (version checks, package presence detection,
  idempotent file scaffolding, template rendering) where bash is a liability
  and TypeScript + SOLID + TDD apply cleanly.
- The zero-dependency-purity argument for bash doesn't hold when Pi needs
  Node anyway.

## Distribution (consequence of TS-only)
- **Primary:** npm — `npx weavelog@latest init` works with zero install.
- **Secondary:** Homebrew formula wrapping the npm package with a `node`
  dependency (how TS-based taps like `serve`/`bun` distribute).
- The extension: `pi install npm:weavelog/pi-weavelog (pre-rename scope)`.

## What was considered and rejected (preserved for provenance)

### 1. Implementation language for the CLI tools
- **Pure bash 5.x** — original plan. Pro: zero runtime dep beyond macOS.
  Con: fragile for logic-heavy scaffolding; hard to test beyond bats.
  **Rejected** — logic-heavy CLI is a liability in bash.
- **TypeScript (single language for whole project)** — CLI runs via `npx
  weavelog` or a compiled binary. **Chosen.** One language, one test setup,
  SOLID applies cleanly, shares types with the extension.
- **TypeScript + thin bash wrapper** — rejected as unnecessary complexity.
- **Go or Rust compiled binary** — rejected as overkill for solo-dev v1.

### 2. Distribution channel implications
- TypeScript → `npx weavelog` works with zero install; Homebrew wraps a
  `node` dependency. npm primary, Homebrew secondary.

### 3. Testing strategy
- TypeScript → `node:test` via `node --import tsx --test` (matches
  pi-diff-review), tsc, biome. TDD/SOLID/unit+integration all apply.

### 4. macOS-only target constraint
macOS is the only target for v1. CI runs Linux-only (free tier). See
`ci-cd-strategy.md`. TS portability makes the macOS-specific surface small
and mockable.
