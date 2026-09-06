# MoE Fast-Track to Phase 4 — Implementation Handoff

**Status:** Ready for execution in a NEW session (author runs no
implementation in the originating thread).
**Created:** 2026-07-22 (conductor: Kimi K3)
**Review:** 3 fresh independent reviewers (2x Kimi K3, 1x GLM-5.2), all
FIX-THEN-SHIP; every finding below is resolved in this revision.
**Read first:** `docs/PROGRESS.md`, `docs/NEXT_SESSION.md`, this file.

## Goal

Reach Phase 4 (CLI: `weavelog init` / `check` / `plugin add`) with maximum
autonomous MoE fanout, bounded by Osmani back pressure: autonomy only
where verification is cheap, and **all v1 gates stay lit** (spec §7.4:
uniformly human-gated until telemetry justifies tiering). Speed comes from
parallelism and cheap oracles, never from dimming lights.

## Precondition (the one blocking human act)

Author approves and runs the install set: `tsx`, `@biomejs/biome`,
`typescript`, `@types/node` (devDependencies). Nothing runs before this.
(Reviewer A finding: biome must be explicit, not implied by "dev deps".)

## Roster (revised per Reviewer C finding 1)

| Role | Model | Notes |
|---|---|---|
| Conductor | Kimi K3 | orchestration, tie-breaks, telemetry, gate prep |
| Planner | GLM-5.2 | slice lists, scaffold plans |
| TDD worker (sole writer per run) | GLM-5.2 | v4 Pro's evidence is gate-running, not writing; roster decision reserves it |
| Verifier | DeepSeek v4 Pro | runs gates, checks evidence |
| Validators (fresh, never the maker) | GLM-5.2 + Kimi K2.7-Code | heterogeneous review |
| Bulk recon | DeepSeek v4 Flash | optional |
| Frontier | escalation only | per NORTH_STAR |

## Chains (revised per Reviewers A + B)

**Chain 0 — pre-flight verification (new, from Reviewers A2 + C2).**
Before any fanout: live-verify pi-subagents mechanics this plan assumes —
`outputSchema` + `expand` (via `.chain.json` ONLY, never `.chain.md`),
`worktree: true` behavior (documented for top-level parallel groups;
per-`expand`-item worktrees are UNDOCUMENTED — test or avoid). If per-item
worktrees are unsupported, Chain 3 falls back to sequential per-slice runs.

**Chain 1 — Phase 1.95 (gate realism).**
Scope: tsx devDep, biome.json, `.github/workflows/ci.yml`, README fixes
(links, TBD count 3→7, status line, npm-vs-Homebrew framing). INDEX
re-sync and `.pi-subagents/` gitignore already DONE 2026-07-22 (Reviewer
A5/B4). Worker (GLM-5.2, async) implements → self-verify (`biome check`,
`tsc --noEmit`, `node --import tsx --test`) → parallel fresh validators
(GLM-5.2 philosophy pass + K2.7-Code correctness pass) → conductor
synthesis → **human gate: one diff review** → commit.

**Chain 2 — Phase 2/3 (setup + scaffold).**
First confirm Phase 2 watch items are actually closed (Reviewer B5 —
PROGRESS lists Phase 3 blocked on 2; state this explicitly before
starting). Parallel fresh planners (.pi/agents roles | workflows JSON |
.pi/settings.json) → single writer applies accepted plans → validators.
NOTE (Reviewer B3): "models live on OpenRouter" is a drifting, gameable
oracle — validator checks are SENSORS; the **human gate is the verdict**.
→ human gate → commit.

**Chain 3 — Phase 4 (TDD slices).**
1. Planner (GLM-5.2) produces the slice breakdown as structured output
   (`outputSchema`: [{slice, files, failing-test, verify}]). The "~4–6
   slices" figure is a PLACEHOLDER (Reviewer C3) — the planner's breakdown
   is the real estimate. No CLI core exists today (`src/cli/index.ts` is
   a stub); the core lands as slice 0 before command slices.
2. **HUMAN GATE ON THE SLICE LIST** (Reviewer B2 — judgment upstream:
   review the 200-line plan before any code exists). No fanout before
   this gate.
3. Per slice (own async run, sequential unless Chain 0 proved safe
   parallelism): worker writes the failing test FIRST, minimal
   implementation, verify green → 2 fresh validators → conductor
   tie-break → **human gate per slice** → merge. Human gates live BETWEEN
   runs, never inside a chain (Reviewer A2 — no mid-chain checkpoint
   primitive exists). Slice size 3–10 worker steps; past ~20, decompose.

## Disagreement and failure protocol (new, Reviewer C5)

- Both validators flag a blocker → back to worker with findings.
- Validators split on a judgment call → conductor presents BOTH findings
  at the human gate; the human tie-breaks judgment, conductor tie-breaks
  only mechanical issues.
- Worker fails verify after maxRetries → conductor captures state to
  PROGRESS.md, halts the chain, escalates. No silent retries past budget.
- Cost bound: $5 per chain (spec §9 default); conductor checkpoints
  PROGRESS.md + handoff after EVERY chain (compaction survival, C6).

## Telemetry (honest scope, Reviewer C4)

- EXISTS: session-logger writes per-Pi-session tokens/cost/duration to
  `.pi/logs/*.stats.json`.
- DOES NOT EXIST: per-chain attribution, review-time-per-accepted-change.
  Conductor records these MANUALLY per chain in the dated learning log
  (chain ID, run IDs, wall time, gate review time, validator outcomes).
  Building real per-chain telemetry is a Phase 4 feature, not a
  prerequisite.

## Explicitly unchanged non-negotiables

npm installs, NORTH_STAR edits, merges, and every chain/slice gate remain
author decisions. Commits conventional, grouped per chain, author-approved.
Open-weights only; frontier is escalation. TDD: no production code without
a failing test first. This plan is deliberately heavier than a 4-file
config change strictly needs — the discipline is the demo (Reviewer B6,
accepted trade).

## Definition of done for the fast track

Phase 4 CLI slices merged, gates green (biome, tsc, node --test in CI),
telemetry logs per chain on disk, and weavelog used to scaffold its own
`.pi/` workspace — the dogfooding principle made true.
