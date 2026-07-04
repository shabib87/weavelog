# TBD: CI/CD Strategy

**Status:** Partially resolved — TypeScript-only locked; pipeline shape below.
One open question remains (macOS-specific surface size).
**Constraints (user-confirmed):**
- Target platform: **macOS only** for v1.
- CI: **Linux only** (GitHub Actions `ubuntu-latest`) — `macos-latest` is too
  expensive on the free tier.
- Solo-dev OSS, no contributions in v1.
- TDD + SOLID + unit + integration tests, full production pipeline.
- **TypeScript only** (locked June 29, 2026 — see `bash-homebrew-tooling.md`).

## The Tension

We target macOS but CI runs on Linux. TypeScript is portable, but the
toolchain surface differs: macOS has `osascript`, `mdfind`, Homebrew paths;
Linux doesn't. Any CLI logic that touches macOS-specifics can't be caught by
Linux CI.

## Locked Pipeline (TypeScript-only, GitHub Actions, Linux)

Triggers: push to `main`, PRs, tags `v*.*.*`.

Jobs (sequential gates — each must pass for the next to run):
1. **lint** — `biome check`.
2. **typecheck** — `tsc --noEmit`.
3. **test-unit** — `node --import tsx --test test/**/*.test.ts` (matches
   pi-diff-review's setup).
4. **test-integration** — run `loopeng check` on a clean Ubuntu runner; run
   `loopeng init ./smoke-test --mode mobile`; assert output structure
   matches spec. **Caveat:** can't test macOS-specific paths (e.g.
   `osascript` detection). Isolate macOS-specific code behind a guard
   interface and test the cross-platform core on Linux; mock the
   macOS-specific seam.
5. **publish** (on tag only) — `npm publish` for `@loopeng/pi-loopeng`
   (extension) and `loopeng` (CLI); bump + push Homebrew formula for
   `loopeng` (wraps the npm package with a `node` dependency).

## Pre-commit (convenience, CI is the real gate)
`.githooks/pre-commit` running `biome check` on staged files. Activate via
`git config core.hooksPath .githooks` (one-time, documented in README). No
husky — overkill for solo dev.

## Release Pipeline (solo-dev sized)
- Versioning: semver, tags trigger publish.
- npm: `loopeng` (CLI) and `@loopeng/pi-loopeng` (extension) — automated via
  GitHub Actions on tag.
- Homebrew: `loopeng` CLI — formula in a `loopeng/homebrew-tap` repo, updated
  by a GitHub Action on tag; wraps the npm package.
- Changelog: `CHANGELOG.md`, hand-curated per release.

## Open Question (remaining)
- How much macOS-specific code will there be? If minimal (just detection),
  Linux CI is sufficient with a manual macOS smoke-test checklist before
  release. If significant, we may need a self-hosted macOS runner or accept
  the free-tier `macos-latest` minutes (limited but nonzero). Defer until
  the CLI is implemented and we can see the actual macOS-specific surface.

## Outcome Needed
A locked CI/CD section in the spec. The shape above is final pending the
macOS-surface-size question, which resolves during implementation.
