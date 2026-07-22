# Next Session Handoff

**Project:** loopeng
**Working dir:** `~/Projects/loopeng`

**READ `docs/PROGRESS.md` FIRST.** This file is narrative context only.
PROGRESS.md owns all status.

---

## Immediate next step — Phase 1.95: gate realism

The 2026-07-22 MoE audit (conductor: Kimi K3, fanouts: GLM-5.2, DeepSeek
v4 Pro, Kimi K2.7-Code) established that the documented toolchain does not
exist: `biome.json`, `.github/workflows/`, `src/extension/` are absent;
`tsc` and the test suite cannot run (`tsx` undeclared, deps uninstalled).
See `docs/learnings/2026-07-22-moe-orchestration-audit.md`.

Phase 1.95 makes the gates real before any implementation work:

1. Declare `tsx` in devDependencies; install deps (needs author approval
   per MUST NOT).
2. Write `biome.json`.
3. Add `.github/workflows/ci.yml` (Linux: node:test + biome + tsc).
4. Fix README broken links (`docs/RESEARCH.md` → `docs/research/RESEARCH.md`,
   `docs/adr.md` → `docs/adr/0001-...md`), TBD count (3 → 7), stale status
   line, and the npm-vs-Homebrew framing (it is an open TBD, not decided).

Then proceed to Phase 2 (global setup) → 3 (project setup) → 4 (CLI).
Phase ordering note: 1.85c (doc overhaul) now yields to 1.95 — real gates
before doc templates.

## What happened 2026-07-22 (MoE audit + Osmani alignment)

- Full-repo audit via open-weight MoE fanout. Findings: docs-only repo
  with CLI stub; `.pi/agents|skills|chains|settings.json` absent
  (dogfooding principle falsified); builtin `researcher` subagent broken
  (missing web tools; decision: no third-party plugin, curl suffices,
  build-own research extension post-Phase 4).
- All 8 Osmani loop-engineering posts (Jun 7–Jul 20) read firsthand after
  the secondhand synthesis overclaimed ("strong external validation" —
  corrected to framework fidelity, self-assessed). Accurate positioning:
  **loopeng is a harness composer for lit loops at autonomy Level 2 —
  design-level, not yet operational.**
- Author-approved amendments applied: RESEARCH.md Source 1 series
  evolution, PRODUCT.md provenance + telemetry metrics, spec compose-vs-run
  primitives table, spec §7.4 back pressure + oracle criteria, handoff
  decision log (intent capture), `tbd/configuration-failure-seam.md`.
- Key firsthand alignments to preserve: workflow JSON = Osmani's graph;
  spec gate = judgment upstream. See
  `docs/research/2026-07-22-osmani-firsthand-alignment-amendment.md`.

## Queued phases (updated order)

| # | Phase | Status |
|---|---|---|
| 1.95 | Gate realism (above) | next |
| 1.85c | Doc system overhaul (templates, ADR split, conventions.md) | queued after 1.95 |
| 2 | Global setup (~/.pi/agent/AGENTS.md, DRY to NORTH_STAR, tooling) | blocked on 1.95 |
| 3 | Project setup (.pi/, agents/skills/workflows) | blocked on 2 |
| 4 | CLI: `loopeng init` / `check` / `plugin add` | blocked on 3 |

## Known items (carried)

- Session-logger runtime verification still pending (see
  `docs/learnings/2026-07-05-session-logger-dogfood-gate.md`). Confirm
  `.pi/logs/<id>.stats.json` appears after a session shutdown.
- `loopeng check` scope must resolve `tbd/configuration-failure-seam.md`
  (who owns agent-failure diagnosis: loopeng vs Pi vs user).
- Eval layer (output + trajectory rubrics) accepted gap, deferred Phase 4+.
- INDEX.md re-synced 2026-07-22; keep it current per session (1.85c will
  automate conventions).

## Housekeeping

- All 2026-07-22 work PRIOR to the amendment batch is committed in grouped
  conventional commits. The amendment batch itself (spec, RESEARCH, PRODUCT,
  PROGRESS, NEXT_SESSION, INDEX, alignment log, new TBD) is uncommitted
  pending author review. `.pi-subagents/` now gitignored.
- `docs/INDEX.md` is the navigation map — read after PROGRESS and this file.
