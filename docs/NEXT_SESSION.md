# Next Session Handoff

**Project:** loopeng
**Working dir:** `~/Projects/loopeng`

**READ `docs/PROGRESS.md` FIRST.** This file is narrative context only.
PROGRESS.md owns all status.

---

## Active phase: 1.85c — Doc system overhaul (ready, no blockers)

Phase 1.85c is ready to start. This is the next session's priority.

## What was done this session (setup for 1.85c)

- `docs/INDEX.md` created — navigation map of all 32 docs with type, purpose,
  when-to-read, LOC, and last-updated timestamps
- `docs/RESEARCH.md` moved to `docs/research/RESEARCH.md` — all 14 cross-refs
  updated across NORTH_STAR, PRODUCT, ROADMAP, PROGRESS, ADR, spec, learnings,
  and research logs
- `.pi/logs/` added to `.gitignore`
- `docs/learnings/2026-07-05-session-logger-derailment.md` — post-mortem captured
- `~/.pi/agent/extensions/footer.ts` — working (left-aligned session stats)
- `~/.pi/agent/extensions/session-logger.ts` — working (per-session stats to
  `.pi/logs/<session-id>.stats.json`)
- Enable both via `~/.pi/agent/settings.json`:
  ```json
  { "extensions": ["extensions/footer.ts", "extensions/session-logger.ts"] }
  ```

## Known items for 1.85c

The INDEX.md documents the current state. The 1.85c session should:

1. **Define doc templates** — required sections for research logs, learnings,
   and TBD files. Research logs and learnings currently have loose formats.
2. **Split ADR** — monolithic file with 13 decisions into per-decision Nygard files
3. **Rename 2 outlier research files** — `loop-taxonomy.md` and `model-selection.md`
   don't follow `YYYY-MM-DD-<topic>` convention. Decide: rename or make living-ref
   convention explicit.
4. **Create `docs/conventions.md`** — single source for doc lifecycle rules
   (when something goes to PROGRESS vs NEXT_SESSION vs TBD), naming conventions,
   and template specs.
5. **Define living-ref vs dated-finding distinction** — `model-selection.md`
   accumulates updates; `2026-07-05-model-selection-audit.md` is a date-stamped
   finding. Both currently live in `research/`. Decide on a structural split
   (e.g., `research/refs/` for living, `research/` for dated).

## Not in scope for 1.85c

- The `tsx` dependency for loopeng CLI — needs user approval to install
- `loopeng stats` CLI command — Phase 4
- `loopeng init` / `loopeng check` — Phase 4
- Any Pi extension work — footer and session-logger are done

## Housekeeping

- `docs/INDEX.md` is the navigation map — agents should read it after PROGRESS
  and NEXT_SESSION to find relevant docs
- Uncommitted files: `docs/INDEX.md`, 3 learning logs, `docs/research/RESEARCH.md`,
  `.gitignore` update, `docs/adr/` updated. Everything in `docs/` is pending commit.