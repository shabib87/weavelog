---
date: 2026-08-16
topic: Light factory — harness assembly plan (two-loop model, 6 named agents, backlog.md queue, hooks+scripts enforcement)
status: adopted
sources:
  - "~/.agents/docs/research/2026-08-16-work-management-layer-selection.md"
  - "~/.agents/docs/research/2026-08-16-primitive-selection.md"
  - "~/.agents/docs/research/2026-08-16-model-tiered-agents.md"
  - "~/.agents/docs/research/2026-08-15-addy-loop-engineering-series.md"
  - "~/.agents/docs/research/2026-08-15-inner-harness-layers.md"
  - "~/.agents/docs/spec/2026-08-16-harness-cli-design.md"
  - "3 design fanouts + 4 fresh-context peer reviews (qwen + glm + reviewer + plan-reviewer), all ADOPT-WITH-CHANGES, corrections applied"
models_used_for_research: [z-ai/glm-5.2, deepseek/deepseek-v4-flash, qwen/qwen3.8-2.4t-a95b]
supersedes: 2026-08-16-inner-harness-bundle.md
---

# Light factory — harness assembly plan

## Model

Two loop types, one queue, two human gates:

- **WHAT loop** (research → spec): divergent, human INSIDE the loop. Produces `docs/spec/` (what) from `docs/research/` (why). Conversational, structured — not automated.
- **HOW loop** (plan → build → verify): convergent, agents inside, human at gates only. Produces software. Tight 3–10 step loops, spin detection, evidence before claims.
- **Queue**: backlog.md — one task = one bounded goal with measurable finish line. Used in BOTH loops: intake/queue (WHAT) + state machine/evidence ledger (HOW). Conductor is the only writer; subagents receive task context via dispatch prompts.
- **Conductor context economy**: conductor holds judgment only (dispatch, merge, gates). Mechanics live in scripts (`task-flow.ts`, `session-rehydrate.ts`). "Mostly deterministic code, LLM steps at the right points."

## Agent roster (6 named)

| Agent | Role | Model | Permissions |
|---|---|---|---|
| researcher (NEW) | WHAT-loop engine: external knowledge → docs/research notes | glm-5.2 | write `docs/research/**` only |
| implementer (NEW) | HOW-loop engine: TDD execution of plan steps | glm-5.2 | deny plans/backlog/AGENTS.md/runbook/config/skills; allow code+unit/integration tests |
| scout | internal codebase recon | flash | read-only |
| plan-reviewer | plan gate verdict | qwen | read-only |
| reviewer | diff verdict | qwen | read-only |
| qa | E2E/UAT from human criteria | glm | test globs only |

Routing rule: internal evidence → scout; external evidence → researcher. Implementer tier = glm-5.2 (Arize: tied with Opus at $1.28/task; cheap-per-token ≠ cheap-per-task). Re-derivation: `IMPLEMENTER-TIER-MEASURE` — instrument cost-per-successful-task quarterly.

## Build order

1. **Remove superpowers plugin; port 4 keepers** to `~/.agents/skills/` in harness vocabulary: systematic-debugging, test-driven-development, receiving-code-review, writing-skills.
2. **Activate enforce.ts** hooks; fix `plugins/` vs `plugin/` doc drift.
3. **verify-gate.ts hook** — probe hook surface first (per spec §6); deterministic signal (no write without fresh bash output); kill-switch; red-verified tests.
4. **backlog.md pilot** — bun-global pin 1.50.1; stack-versions + stack-check.ts (TDD); opencode.jsonc MCP entry (measure prefix tax with prefix-diff.ts, CLI-first); `task-flow.ts` (claim/close/note/AC in one call, TDD); pilot repo = ~/.agents; 1-week human gate.
5. **researcher.md + implementer.md** agent definitions; runbook Phase 3 grows to six; probe absolute-path deny globs on first run.
6. **2 new skills**: prompt-triage, verify-with-criteria (adapted from verification-before-completion description, not from scratch).
7. **AGENTS.md updates**: two-loop model, scout/researcher routing rule, backlog boundary (conductor-only writes), skill-catalog line. Stay under LOC ceiling.
8. **Docs/runbook sync**: research README index, runbook P4 skills list, manifest gaps, incidental drift notes (headroom MCP present in config — do NOT remove; runbook claim stale, flag to human).

## Deferred (named triggers)

- `session-rehydrate.ts` — trigger: first context-loss incident post-backlog (rehydration protocol is conductor procedure until then)
- `ship.ts` (workflow, non-idempotent) — trigger: first PR dispatched through the queue
- `worktree-setup.ts` — trigger: second manual worktree created
- Skill ADAPTs (brainstorming/writing-plans/SDD ports) — trigger: first observed vocabulary misfire
- failure-triage, gate-brief, task-intake skills — triggers: recurring failure classes / failed gate handoff / intake friction post-pilot
- Runtime mode (goal evaluator, workflow engine) — trigger: install proven on fresh Mac
- `BACKLOG-AGGREGATOR` — trigger: ≥3 active backlogs AND manual cross-repo check >5 min
- `BEADS-REEVAL` — trigger: multi-agent task-ID collisions
- `GSD-CORE-PILOT` — trigger: milestone-scale planning state lost ×2
- New agents beyond the six — trigger: two observed misfires on general dispatch

## Human gates (never sampled)

GATE 1: plan approval. GATE 2: merge approval. Everything else narrowed, sampled, or eliminated.
