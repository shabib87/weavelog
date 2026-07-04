# Next Session Handoff

**Project:** loopeng
**Working dir:** `~/Projects/loopeng`

**READ `docs/PROGRESS.md` FIRST.** It is the single source of truth for phase
status, pending decisions, and next actions. This file is narrative context
only — what loopeng is, how to start a session, and housekeeping notes.
PROGRESS.md owns all status information. If they appear to conflict,
PROGRESS.md wins.

---

## What loopeng is

A minimal, open-source developer-experience setup that turns any project into
a self-contained agentic workspace. A pre-defined agent team runs an
end-to-end loop — spec, implement, verify, document — with the human in the
loop only for verification. Built on Pi + OpenRouter + Headroom + markitdown,
composing Superpowers for the skills layer.

Authoritative docs:
- `docs/NORTH_STAR.md` — the anchor (what we build, non-negotiables)
- `docs/RESEARCH.md` — provenance (why these choices)
- `docs/adr.md` — architecture decision record
- `docs/PROGRESS.md` — phase tracker (where we are)

## How to start a session

1. `cd ~/Projects/loopeng`
2. Read `docs/PROGRESS.md` — it tells you the current phase and next action
3. Read `docs/NORTH_STAR.md` if you need a refresher on non-negotiables
4. Check `docs/AGENTS.md` for MUST NOT rules and standards before any work
5. Begin the next action from PROGRESS.md

## Engineering principles (from NORTH_STAR)

YAGNI, SOLID, KISS. Shift-left testing (TDD first-class). Two-layer QA
(maker/checker + verification gates). Small ships with clean commits.
Security woven in. Open-weights primary, frontier as targeted escalation.

## Tooling stack

Pi (host) + Headroom (compression + memory) + markitdown (doc ingestion) +
OpenRouter (model routing) + Superpowers (skills) + gh CLI (GitHub). Codex
is the author's personal backup harness, not a loopeng target. See
`docs/research/2026-07-04-harness-setup-and-pmf-synthesis.md` for the full
verified stack with versions.

## Housekeeping

- **Git history was rewritten** (filter-branch) to remove literal home-dir
  paths from two early commit diffs. Pre-push, safe. Verified 0 personal
  refs in all history.
- **`docs/superpowers/`** follows the superpowers skill's conventions
  (specs/, plans/). Do not relocate — loopeng composes superpowers, the docs
  structure respects its conventions.
- **The 2,848-line implementation plan** at
  `docs/superpowers/plans/2026-07-04-loopeng-implementation.md` is a
  pre-revision artifact. It needs chunking — tracked as 1.85c (separate
  session, docs format + link-backlink research).

## Audit gaps (found 2026-07-04, to fix in Phase 2)

- `~/.pi/agent/AGENTS.md` (global Pi constitution) — discussed, approved,
  NEVER CREATED. Must be created in Phase 2.
- `~/.codex/AGENTS.md` — must be amended with YAGNI/SOLID/KISS/DRY in Phase 2.
- DRY missing from NORTH_STAR — user stated KISS+SOLID+DRY+YAGNI; only
  YAGNI/SOLID/KISS are present. Phase 2 amendment.
- No project `.pi/` directory — create in Phase 3.
- Documentation rule (format, naming, links) not defined — 1.85c research.
- Blog documentation rule not captured — user wants every session's work
  documented with data backing for public blog posts. Define as a rule in
  Phase 2.
- Thread reasoning not systematically captured — Pi auto-compaction
  summarizes older conversation. Artifacts (git, docs) survive; the reasoning
  path does not. Define a "session audit" convention.
