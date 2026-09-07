---
date: 2026-08-16
topic: Inner harness bundle — opencode + headroom + superpowers + backlog.md (north-star CLI harness)
status: superseded
sources:
  - "~/.agents/docs/research/2026-08-16-work-management-layer-selection.md"
  - "~/.agents/skills/tool-selection-rubric/SKILL.md"
  - "qwen + glm reviewer findings (ownership matrix as gating precondition)"
models_used_for_research: [z-ai/glm-5.2, qwen/qwen3.8-2.4t-a95b]
supersedes: none
superseded_by: 2026-08-16-light-factory-plan.md
---

# Inner harness bundle plan

## Mission

Complete the north-star CLI inner harness by adding the missing layer — work tracking + visualization — without disturbing the layers that already work. Bundle: **opencode (agent) + headroom (context) + superpowers (workflow skills) + conductor protocol (orchestration) + backlog.md (tracking/viz)**.

## Non-goals (explicit, with named triggers)

- NOT adopting GSD Core (trigger: see research doc, milestone-scale state loss ×2)
- NOT adopting GSD Pi (replaces opencode — off-north-star)
- NOT adopting beads (trigger: multi-agent task collisions)
- NOT building a cross-repo viz script (trigger: ≥3 active backlogs AND manual check >5 min)

## Phase 1 — backlog.md pilot (one repo)

- [ ] Install backlog.md pinned to latest reviewed version; verify MCP server registers in opencode config
- [ ] Pilot on ONE active repo: create tasks, run the TUI board (`backlog board`), launch web UI, verify dependency graphs render
- [ ] Verify agent loop: subagent reads/writes tasks via CLI/MCP idempotently (re-run safety)
- [ ] Human gate: board + web UI actually get used for a week → proceed, else exit (backlog.md is markdown files; exit cost ~zero)

## Phase 2 — convention wiring

- [ ] Decide backlog ↔ docs/plans boundary: plans = approved implementation specs; backlog = task queue/board. One-line rule in root AGENTS.md.
- [ ] frontmatter-check.ts: confirm backlog task files don't trip the docs validator (backlog/ dirs are not docs/)
- [ ] Add backlog.md to stack-versions.json + stack-check.ts manifest (version drift visibility)

## Phase 3 — runbook + review

- [ ] Update AGENT-STACK-RUNBOOK.md: backlog.md section (install, pin, rollback), ownership matrix row, YAGNI triggers from research doc
- [ ] Cross-model review of the wiring diff (reviewer-loop, budget ≤ $2)
- [ ] Commit

## Deferred (named)

- `REPO-SIGNALS-SCRIPT` — trigger: rubric skill used a 3rd time
- `BACKLOG-AGGREGATOR` — trigger: ≥3 active backlogs AND manual cross-repo check >5 min
- `GSD-CORE-PILOT` — trigger: milestone-scale state loss ×2 (see research doc)
- `BEADS-REEVAL` — trigger: multi-agent task collisions
