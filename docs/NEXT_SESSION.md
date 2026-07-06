# Next Session Handoff

**Project:** loopeng
**Working dir:** `~/Projects/loopeng`

**READ `docs/PROGRESS.md` FIRST.** This file is narrative context only.
PROGRESS.md owns all status.

---

## Immediate next step — verify the session-logger actually runs

Before 1.85c, confirm the dogfood gate is open:

1. Confirm the footer is visible in the Pi TUI (turns/tokens/cost/model
   line). If yes, auto-discovery works and both extensions are loaded.
2. Let this session shut down, then check for
   `.pi/logs/<id>.stats.json` in the loopeng repo.
   - **Appears:** logger works, dogfooding has started. Proceed to 1.85c.
   - **Does not appear:** null-check bug in `m.usage.input` aggregation is
     the prime suspect. Harden TDD-first (failing test: branch with one
     usage-less assistant message expects a valid stats file). See
     `docs/learnings/2026-07-05-session-logger-dogfood-gate.md`.

Do NOT add an `extensions` array to `settings.json` — global extensions
auto-discover. The earlier enablement snippet in the research log is
misleading and gets fixed in 1.85c.

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
- `~/.pi/agent/extensions/footer.ts` — code complete, pending runtime confirmation (left-aligned session stats)
- `~/.pi/agent/extensions/session-logger.ts` — code complete, pending runtime confirmation (per-session stats to `.pi/logs/<session-id>.stats.json`). Zero `.pi/logs/` data exists yet; see `docs/learnings/2026-07-05-session-logger-dogfood-gate.md`.
- Pi auto-discovers global extensions — no `settings.json` `extensions` entry needed. The earlier "enable via settings.json" snippet was misleading; fix batched into 1.85c.

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
- session-logger topic-classification implementation — designed this session
  (closed-set 6 labels, heuristic v1, LLM opt-in v2, JSONL linked via
  `piSessionId`), but implementation is a separate TDD-first session. See
  `docs/learnings/2026-07-05-session-quality-telemetry-axis.md`.
- telemetry join cardinality (piSessionId 1:1 vs 1:many vs many:1) — open
  decision before `.loopeng/metrics.jsonl` schema is finalized.

## Housekeeping

- `docs/INDEX.md` is the navigation map — agents should read it after PROGRESS
  and NEXT_SESSION to find relevant docs
- Uncommitted files: `docs/INDEX.md`, 3 learning logs, `docs/research/RESEARCH.md`,
  `.gitignore` update, `docs/adr/` updated. Everything in `docs/` is pending commit.