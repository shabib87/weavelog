# Progress

> **Status:** Clean restart complete. Repo sanitized, 7 atomic commits on `main`, AGENTS.md + PROGRESS.md verified against July 2026 standards. Ready for 1.98b (hooks) or 1.95 (research).
> **Active phase:** 1.98b — Git hook enforcement (deferred) OR 1.95 — Research (7 threads)
> **Last updated:** 2026-07-04

This is the single source of truth for "where are we." Agents read this first.
Update it before any phase transition. Completed phases move to **Done** at the
bottom (memory decay: don't re-read unless needed).

---

## Active phase: choosing next step

**1.98 is closed.** Two paths forward:
- **1.98b** — Git hook enforcement (commit-msg + pre-commit stopgap). Quick,
  closes the enforcement gap.
- **1.95** — Research: evals, telemetry, license, doc-indexing,
  TDD-with-agents, two-layer QA, security mechanisms. Larger, blocks ROADMAP.

**Recommendation:** 1.95 first (it blocks ROADMAP, which blocks everything
  downstream). Hooks (1.98b) can be installed during Phase 2 global setup.

## Done (1.98 — clean restart)

- ✅ Sanitized `home-dir` → `~` (4 refs in 2 files)
- ✅ Moved codex-headroom plan → `docs/research/2026-07-04-codex-headroom-setup.md`
- ✅ Deleted superseded spec
- ✅ Created `.gitignore` (macOS, Node, TypeScript, Pi, headroom)
- ✅ Added sanitization MUST NOT + conventional commits to AGENTS.md
- ✅ Created `docs/PROGRESS.md` (agent-readable tracker)
- ✅ Refreshed `docs/NEXT_SESSION.md` (points to PROGRESS.md)
- ✅ Clean restart: 7 atomic commits on `main`, orphan branch
- ✅ Security scan: 0 personal refs in all committed history
- ✅ AGENTS.md verified against agents.md July 2026 standard (90 lines, compliant)
- ✅ PROGRESS.md verified against loop engineering principles

---

## Upcoming phases (in order)

| # | Phase | Status | Blocks on |
|---|---|---|---|
| 1.98b | Git hook enforcement | ⏳ deferred (can fold into Phase 2) | nothing |
| 1.95 | Research: evals, telemetry, license, doc-indexing, TDD-with-agents, two-layer QA, security mechanisms | ⏳ not started — **recommended next** | nothing |
| 1.8 | ROADMAP draft (v0.1→v1.0 milestones, loop paradigm, four disciplines) | ⏳ blocked | 1.95 |
| 2 | Global setup (global AGENTS.md for Pi+Codex, frontier model selection, global memory, gh CLI in workflow) | ⏳ blocked | 1.8 |
| 3 | Project setup (project AGENTS.md, project memory, agents/skills/loops wiring, beads integration) | ⏳ blocked | 2 |
| 4 | CLI tool (loopeng as deterministic setup CLI — `loopeng init` + `loopeng check`) | ⏳ blocked | 3 |

---

## Watch items

- **Scope-drift pattern:** noticed 2026-07-04. Scope expands during execution
  when non-build tasks (verification, research) don't trigger the brainstorming
  gate. Mitigation: log scope changes here before acting. Formalize a skill
  only after 3+ observed instances (per writing-skills TDD methodology).
- **Enforcement gap:** all rules currently Layer 1 (prompt-level) only. No
  mechanical gates (hooks, CI, `loopeng check`) exist yet. Manual compliance
  until 1.98b + Phase 2 tooling.
- **NEXT_SESSION.md is stale** — being refreshed in commit 7.

---

## Done

- **1.97** — gh CLI added to stack (MIT, 31 releases/year, already installed)
- **1.96** — Git/GitHub/SAST/review-tool research (all tools activity-audited, MIT)
- **1.94** — Lab notebook captured (`docs/research/2026-07-04-harness-setup-and-pmf-synthesis.md`)
- **1.93** — Superpowers fit (compose, don't reinvent) + doc-chain decision (BRD/PRD/TRD collapsed)
- **1.92** — NORTH_STAR amend round 2 (security, TDD, QA non-negotiables)
- **1.9** — PMF locked (3 proof projects: loopeng, codewithshabib blog, mobile comparison)
- **1.85** — Tolaria reference research (AGPL+trademark, "built from real use")
- **1.75** — Loop-engineering research (Voss, Osmani, LangChain, swyx)
- **1.5** — NORTH_STAR amend round 1 (YAGNI/SOLID/KISS, open-weights-primary, deterministic CLI, mobile clarified)
- **1** — Tooling setup verified (Pi 0.80.3, headroom 0.30.0, markitdown 0.1.6, codex fixed)
