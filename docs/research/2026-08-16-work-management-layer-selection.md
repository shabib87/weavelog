---
date: 2026-08-16
topic: Work-management layer selection — beads vs beans vs backlog.md vs GSD (core/pi)
status: decided
sources:
  - "https://api.github.com/repos/gastownhall/beads (fetched 2026-08-16)"
  - "https://api.github.com/repos/MrLesk/Backlog.md (fetched 2026-08-16)"
  - "https://api.github.com/repos/hmans/beans (fetched 2026-08-16)"
  - "https://api.github.com/repos/gsd-build/gsd-2 + open-gsd/gsd-core + open-gsd/gsd-pi (fetched 2026-08-16)"
  - "https://raw.githubusercontent.com/gsd-build/gsd-2/main/README.md (redirect notice)"
  - "https://raw.githubusercontent.com/open-gsd/gsd-pi/main/README.md"
  - "https://raw.githubusercontent.com/open-gsd/gsd-core/main/README.md + docs/COMMANDS.md"
  - "qwen + glm fresh-context reviews (both ADOPT-WITH-CHANGES on the draft; identity corrections applied)"
models_used_for_research: [z-ai/glm-5.2, deepseek/deepseek-v4-flash, qwen/qwen3.8-2.4t-a95b]
supersedes: none
review_rounds: 2
reviewer_corrections_applied:
  - beans = hmans/beans (~650-834 stars), NOT "nicoburns/beans 7.3k" — research-agent misattribution corrected
  - beads is Dolt-native now (SQLite/JSONL legacy removed); moved steveyegge/beads → gastownhall/beads
  - GSD 64.7k stars belong to ARCHIVED gsd-build/get-shit-done; do not transfer to open-gsd
  - GSD identity resolved: TWO product lines (gsd-core command-pack, gsd-pi standalone agent)
  - Ownership overlap escalated from footnote to gating decision
---

# Work-management layer selection — DECIDED

## The GSD identity resolution (the source of the confusion)

"GSD" is **two products**, and both gsd-build repos are stale redirects:

| Lineage | Status (2026-08-16) | What it is |
|---|---|---|
| `gsd-build/get-shit-done` (64.7k★) | **ARCHIVED** Jun 2026 | v1 meta-prompting command pack |
| → `open-gsd/gsd-core` (8.3k★, pushed today, v1.7.0) | ACTIVE | Same pack, new home. Installs INTO opencode/Claude Code as slash commands. State: `.planning/` markdown. |
| `gsd-build/gsd-2` (7.8k★, last push May 22) | STALE REDIRECT | README points to gsd-pi |
| → `open-gsd/gsd-pi` (v1.15.0) | ACTIVE | **Standalone local-first coding agent CLI** — own TUI, `gsd --web` control plane, `.gsd/` DB + markdown projections, milestones→slices→tasks, worktree automation, multi-provider routing (Claude Code, Cursor as providers; **opencode NOT a provider**) |

So "gsd-2 is the latest" is wrong — gsd-2 is a tombstone. And gsd-pi is not a layer on opencode; **it is a competitor to opencode**.

## Rubric signals (live, 2026-08-16)

| Signal | beads | beans (hmans) | backlog.md | gsd-core | gsd-pi |
|---|---|---|---|---|---|
| Stars | 8.1k | ~0.7k | 7.9k | 8.3k (reset) | new baseline |
| Age | ~3 mo | ~7 mo | ~14 mo | ~3 mo (new org) | new baseline |
| Last push | recent | Mar 2026 | **today** | **today** | active |
| Releases | v0.43.0 | v0.5.1 | ~75, ~2/mo | v1.7.0 | v1.15.0 |
| Contributors | — | 13 | 40 | — | — |
| Open issues | 19 | 30 | 25 | 83 | — |
| Category | tracker (Dolt DB) | tracker (md files) | tracker (md files) + **kanban/web viz** | workflow framework (command pack) | **agent runtime** |
| Fights harness? | no (data layer) | no (data layer) | **no (data layer)** | yes (3rd orchestrator) | yes (replaces opencode) |

## Decision

1. **backlog.md — ADOPT** as the work-tracking + visualization layer. It fills the only real gap in the harness (no tracker, no board — scout confirmed conventions only). It is a data layer: markdown task files, MCP server, TUI kanban, web UI with dependency graphs. Zero orchestration ambitions → zero conflict with the conductor protocol and superpowers. Visualization requirement covered out of the box.
2. **GSD Core — DO NOT ADOPT (named YAGNI).** The harness already implements its loop: superpowers (brainstorming → writing-plans → executing-plans → verification-before-completion) + conductor AGENTS.md (subagents, fresh context, human gates) + test guardrails. Adopting gsd-core creates a third authority for the same stages. **Trigger to revisit:** "2+ milestone-scale projects lose planning state across sessions despite the ported skills + docs/plans" → pilot gsd-core on ONE repo, pinned version, audit installer writes first.
3. **GSD Pi — REJECT.** Standalone agent CLI; adopting it means replacing opencode + headroom (the north star). Not a layer.
4. **beads — REJECT (named YAGNI).** Dolt-native DB, daemon/hooks/telemetry surface, operational weight for a solo harness. **Trigger:** multi-agent parallel work causes task-ID collisions or lost tasks → re-evaluate.
5. **beans — REJECT.** Weakest rubric signals; opencode plugin noted but the tool duplicates what backlog.md does better.
6. **Cross-repo viz aggregator script — DEFER (named YAGNI).** backlog.md is per-project. **Trigger:** "≥3 repos with active backlogs AND manual cross-repo check takes >5 min" → build bun TS aggregator in ~/.agents/bin reading backlog dirs.

## Ownership matrix (one authority per stage — no fights)

| Stage | Owner |
|---|---|
| Brainstorm / explore | grilling + domain-modeling skills (ported, mattpocock) |
| Plan | conductor + `docs/plans/` (writing-plans ADAPT deferred — trigger: first vocabulary misfire) |
| Track + visualize work | **backlog.md** (the previously empty slot) |
| Execute | conductor pattern (AGENTS.md) → implementer agent |
| Verify | test-driven-development + verify-with-criteria (ported) + test guardrails + qa agent |
| Review | reviewer-loop script (qwen/glm cross-model) |
| Long-horizon context | headroom proxy + MCP |

## Risks accepted

- backlog.md release cadence is fast (~2/mo) → pin version, upgrade deliberately.
- Young-tool risk on everything evaluated → exit cost is low everywhere (markdown files); named triggers above control re-entry.
