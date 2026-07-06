# Session Logger Dogfood Gate — Auto-Discovery Audit

> **Date:** 2026-07-05
> **Session:** audit (no code touched)
> **Related:** `docs/research/2026-07-05-pi-tui-session-api.md`,
> `docs/learnings/2026-07-05-session-logger-derailment.md`,
> `docs/learnings/2026-07-05-session-quality-telemetry-axis.md`

## Context

User asked to "add the session logger at the very beginning" to dogfood
loopeng's session-quality telemetry. Before enabling it, I audited whether
it was actually running. It was not — and it could not be "enabled" the way
the docs implied.

## Findings

### 1. Pi auto-discovers global extensions — no settings entry needed

Pi docs (`docs/extensions.md`, table under "Extensions are auto-discovered
from trusted locations") state that extensions at
`~/.pi/agent/extensions/*.ts` are auto-discovered globally for all projects.
The `settings.json` `extensions` array is only for paths outside the
auto-discovery dirs. The research log (`2026-07-05-pi-tui-session-api.md`)
and NEXT_SESSION both implied an `extensions` array entry is required to
enable them. That is misleading.

Verified: `pi list` shows only settings-listed packages (superpowers,
pi-diff-review, headroom), not auto-discovered extensions. Its empty
extension list is expected, not evidence the logger is unloaded.

### 2. The logger has never been confirmed running — "working" is an overclaim

Direct node import of `session-logger.ts` succeeds: the module loads, the
default factory is a function, and calling it with a stub `pi` registers
both `session_start` and `session_shutdown` handlers without error. The
code is sound in isolation.

But: there is no `.pi/logs/` directory in the loopeng repo, and zero
`*.stats.json` files anywhere under `~/Projects`. The extensions were
created at 18:20-18:25 today; every prior session this thread references
(model-selection 17:36Z, config-fix, ZDR) ran before the logger existed.
The "working" claim in the research log, NEXT_SESSION, and PROGRESS is
unverified. It should read "code complete, not yet confirmed running."

### 3. Two candidate causes for the missing data

- **Cause 1 (likely): no shutdown has fired in this cwd since creation.**
  The `session_shutdown` handler only writes on exit. This session may be
  the first in the loopeng cwd with the logger loaded, and it has not
  ended. If so, the log appears on session end and there is nothing to fix.
- **Cause 2 (suspect): a latent silent-failure in aggregation.** Before
  the file-write try/catch, the handler does `input += m.usage.input` with
  no null-check. If any assistant message has undefined `usage`, the
  handler throws, Pi swallows the extension error, and the log is silently
  lost. The footer has the same pattern but is visible; the logger is
  invisible, so a break there looks like "no data."

### 4. Disambiguation plan (no speculative code changes)

1. Confirm the footer is visible in the Pi TUI (turns/tokens/cost/model
   line). If yes, auto-discovery works and the logger is loaded.
2. Let this session shut down, then check for
   `.pi/logs/<id>.stats.json`.
   - If it appears: logger works, dogfooding started, cause 1 confirmed.
   - If it does not: cause 2 confirmed; harden the aggregation TDD-first
     (failing test: branch with one usage-less assistant message expects a
     valid stats file treating missing usage as 0).

No settings edit is needed. No speculative logger code change is made.

## Decisions

1. **Do not add an `extensions` array to settings.json.** Auto-discovery
   covers global extensions. Adding one would be cargo-cult config.
2. **Treat the logger as unverified until a stats file appears.** Docs now
   say "code complete, pending runtime confirmation," not "working."
3. **The null-check hardening is a TDD-first session, not folded in here.**
   Per the derailment post-mortem: no production code without a failing
   test first, no carve-outs for "small" extensions.

## Corrections

- **Research log `2026-07-05-pi-tui-session-api.md` is misleading** about
  enablement. The "Enable both in settings.json" snippet implies an
  `extensions` array is required. It is not, for global extensions. Fix
  batched into 1.85c (doc-system overhaul).
- **PROGRESS / NEXT_SESSION / derailment log all said footer + logger are
  "working."** Corrected to "code complete, not yet confirmed running in a
  live session." Same overclaim pattern flagged in the 1.99 audit.

## Blog Candidates

- "The Logger That Never Ran: Why 'Code Complete' Is Not 'Working'" — the
  verification gap between writing an extension and confirming it produces
  output, and how auto-discovery hides the difference.
- "Auto-Discovery Hides Silent Failures" — invisible extensions (no UI)
  can fail silently; the footer's visibility is what made it self-checking.
