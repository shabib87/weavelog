# Progress

> **Status:** ROADMAP drafted with pending decisions. Planning phase complete. Ready for Phase 2 (global setup) after user reviews docs + decides.
> **Active phase:** User review of research + ROADMAP, then Phase 2 (global setup)
> **Last updated:** 2026-07-04

This is the single source of truth for "where are we." Agents read this first.
Update it before any phase transition. Completed phases move to **Done** at the
bottom (memory decay: don't re-read unless needed).

---

## Active phase: 1.8 — ROADMAP draft

**1.95 research is complete.** Five research docs committed:
- `docs/research/2026-07-04-license-selection.md` — MIT vs Apache 2.0 vs AGPL-3.0
- `docs/research/2026-07-04-security-qa-tdd-mechanisms.md` — enforcement stack, two-layer QA, TDD-with-agents
- `docs/research/2026-07-04-frontier-model-selection.md` — Fable 5 + GPT-5.5 cross-vendor pair
- `docs/research/2026-07-04-doc-indexing.md` — phased: flat-files → beads → headroom memory
- `docs/research/2026-07-04-evals-and-telemetry.md` — phased (iii): local metrics.jsonl → workflow metrics → public aggregate

**Decision points from research (need user input during ROADMAP review):**
- License: Apache 2.0 + trademark (recommended) vs MIT vs AGPL-3.0
- Frontier models: confirm Fable 5 + GPT-5.5 (recommended)
- Telemetry: confirm phased opt-in approach (recommended)

**Next:** draft `docs/ROADMAP.md` with:
1. Loop-engineering paradigm (Voss/Osmani/LangChain/swyx synthesis)
2. Four engineering disciplines (prompt + context + harness + loop)
3. Version milestones v0.1→v1.0 mapping loop layers to releases
4. Success metrics + telemetry hooks
5. Proof projects (loopeng, codewithshabib blog, mobile comparison)

---

## Upcoming phases

| # | Phase | Status | Blocks on |
|---|---|---|---|
| 1.85b | Docs organization pass | ✅ done | — |
| 1.85c | Docs format + link-backlink research (separate session) | ⏳ deferred | nothing |
| 1.8 | ROADMAP draft | ✅ done | — |
| 1.98b | Git hook enforcement | ⏳ deferred (fold into Phase 2) | nothing |
| 2 | Global setup (global AGENTS.md, frontier models, global memory, gh CLI) | ⏳ next, after user review | user decisions |

---

## Watch items

- **Scope-drift pattern:** noticed 2026-07-04. Scope expands during execution
  when non-build tasks (verification, research) don't trigger the brainstorming
  gate. Mitigation: log scope changes here before acting. Formalize a skill
  only after 3+ observed instances (per writing-skills TDD methodology).
- **Enforcement gap:** all rules currently Layer 1 (prompt-level) only. No
  mechanical gates (hooks, CI, `loopeng check`) exist yet. Manual compliance
  until 1.98b + Phase 2 tooling.
- **beads adoption:** requires user approval (package install). Flagged for Phase 3.
- **License decision:** Apache 2.0 recommended; user decides during ROADMAP review.
- **Frontier models decision:** Fable 5 + GPT-5.5 recommended; user decides.
- **Telemetry decision:** phased opt-in (local-first) recommended; user decides.
- **Docs format:** `docs/superpowers/plans/` stays (superpowers convention, don't fight it). The 2,848-line implementation plan needs chunking — deferred to 1.85c.
- **History rewriting performed:** filter-branch removed literal home-dir path
  from 2 commit diffs (92e2ada, f5deecf). Pre-push, safe. Verified 0 matches.

---

## Done

- **1.8** — ROADMAP drafted (version milestones v0.1→v1.0+, loop paradigm, four disciplines, success metrics, proof projects, pending decisions noted)
- **1.85b** — Docs organization: NEXT_SESSION stripped to narrative-only, headings normalized, AGENTS.md doc-hierarchy updated
- **1.95** — Research complete: license, security+QA+TDD, frontier models, doc-indexing, evals+telemetry (5 docs)
- **1.98** — Clean restart: sanitized, 7 atomic commits, .gitignore, AGENTS.md+PROGRESS.md verified
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
