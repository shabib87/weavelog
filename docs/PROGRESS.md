# Progress

> **Status:** Clean restart in progress (commits 1–2 done, 3–7 pending). Enforcement hooks deferred to tracked item.
> **Active phase:** 1.98 — Repo clean restart + sanitization + commit hygiene
> **Last updated:** 2026-07-04

This is the single source of truth for "where are we." Agents read this first.
Update it before any phase transition. Completed phases move to **Done** at the
bottom (memory decay: don't re-read unless needed).

---

## Active phase: 1.98 — Repo clean restart

**Sub-fork resolved (decision (b)):** enforcement hooks (commit-msg, pre-commit)
deferred to a tracked item. Clean restart proceeds with manual compliance only.
Hooks are the next discrete task after 1.98 closes.

**Done in this phase:**
- ✅ File operations: sanitized home-dir paths → `~` (4 refs in 2 files)
- ✅ Moved `docs/superpowers/plans/2026-07-04-codex-headroom-update.md` → `docs/research/2026-07-04-codex-headroom-setup.md`
- ✅ Deleted superseded spec at `docs/superpowers/specs/`
- ✅ Created root `.gitignore` (macOS, Node, TypeScript, Pi, headroom)
- ✅ Added sanitization MUST NOT rule to AGENTS.md
- ✅ Created orphan branch `fresh-main`
- ✅ Commit 1: `chore: add .gitignore`
- ✅ Commit 2: `docs: add North Star and research foundations`

**Remaining (commits 3–7):**
- [ ] Commit 3: `chore: add project identity (AGENTS.md, CLAUDE.md, README)`
  - Add conventional-commit format to AGENTS.md Standards section
  - AGENTS.md (with sanitization MUST NOT), CLAUDE.md, README.md
- [ ] Commit 4: `docs: add architecture decision record and design spec`
  - docs/adr.md, docs/specs/2026-06-28-loopeng-design.md
- [ ] Commit 5: `docs: add open questions and blindspots`
  - docs/tbd/ (6 files)
- [ ] Commit 6: `docs: archive superseded starter research`
  - docs/archive/ (4 files, reference PDFs excluded by .gitignore)
- [ ] Commit 7: `docs: add research logs, progress tracker, handoff, and plans`
  - docs/PROGRESS.md (this file), docs/NEXT_SESSION.md (refreshed),
    docs/research/ (4 files), docs/superpowers/plans/ (1 file)

**After 1.98 closes:** rename `fresh-main` → `main`, then move to 1.98b (hooks).

---

## 1.98b — Git hook enforcement (deferred from 1.98)

**Decision:** resolve as a discrete task after the clean restart. Two options
recorded for when we pick it up:
- Shell stopgap hooks (commit-msg regex + pre-commit grep) — no install, but
  "no bash for logic" rule needs interpretation (git infra vs project logic)
- Real tooling (commitlint + pre-commit + gitleaks) — needs package install
  approval, robust, replaces shell stopgap

**Status:** deferred, not started.

---

## Upcoming phases (in order)

| # | Phase | Status | Blocks on |
|---|---|---|---|
| 1.98b | Git hook enforcement | ⏳ deferred | 1.98 close |
| 1.95 | Research: evals, telemetry, license, doc-indexing, TDD-with-agents, two-layer QA, security mechanisms | ⏳ not started | 1.98 close |
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
