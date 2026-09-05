# Contributing

## Issues: welcome

Bug reports, false-positive reports against `doctor`/`check`, feature
proposals, attribution corrections, and stranger-test results are all
welcome as issues. The stranger test (see README quickstart) failing on a
clean arm64 Mac is the single most valuable issue you can file.

## PRs: not accepted in v1

Per `docs/NORTH_STAR.md`, flightlead is solo-dev OSS for v1: the author
decides direction, and external pull requests are not merged. This is a
stated limit, not an oversight. Issues are the contribution surface; use
them to shape the roadmap.

## What makes a good issue

- **One problem per issue.** No mega-threads bundling bugs and features.
- **Reproduction path:** what you ran, what you expected, what happened —
  including the exit code and the relevant `~/.local/state/flightlead/`
  ledger lines (redact paths you consider private).
- **Environment:** macOS version, chip (arm64 required), node version,
  host (opencode/pi) and version.
- **For feature proposals:** which NORTH_STAR non-negotiable it serves, or
  which it conflicts with. Proposals that can't trace to the anchor get
  closed with a pointer to NORTH_STAR.
- **For attribution fixes:** the upstream repo and license; these get
  priority.

## Security reports

Do **not** open a public issue for security vulnerabilities. See
[SECURITY.md](SECURITY.md) for private reporting.

## Scope notes

- Platform support is arm64 macOS only for v1. Non-macOS issues are
  closed as out-of-scope (they're tracked in the roadmap fog, not built).
- Roadmap sequencing lives in `docs/ROADMAP.md`; "when will X ship" issues
  are answered there first.
