# Document Index

> **Purpose:** Navigation map for agents and humans. Read this to decide
> what to read and what to skip. Updated as part of Phase 1.85c.
> **Last updated:** 2026-09-07 (ADR rows reconciled; research/plans/learnings
> corpus entries: `docs/research/README.md` tracks the dated research corpus;
> `archive/learnings/` and `archive/plans/` rows are indexed here)

## How to use this index

1. **Starting a session:** Read this INDEX (it replaced the deleted
   PROGRESS.md tracker) and ROADMAP.md for phase state
2. **Researching a topic:** Find the category below, scan purposes, read
   relevant files
3. **Making a decision:** Check ADRs (past decisions) and research logs
   (evidence). The TBD corpus is FROZEN (archive/tbd) — never a source of
   live questions; re-raise them as backlog tasks instead.
4. **Writing a doc:** Follow the conventions in `docs/AGENTS.md` (schemas,
   versioning, artifact flow, machine-checked linkage)

## Legend

| Column | Meaning |
|---|---|
| Type | Document category (constitution, tracker, provenance, etc.) |
| When | When an agent should read it |
| LOC | Lines of code — track for drift |

---

## Root-level entry points

| File | Type | Purpose | When | LOC |
|---|---|---|---|---|
| `../AGENTS.md` | Constitution | Build commands, MUST NOTs, standards | Every session | 122 |
| `../README.md` (repo root) | Project overview | What weavelog is, quickstart | First read only | 94 |
| `NORTH_STAR.md` | Constitution | Non-negotiables, scope, success criteria | Every session | 81 |
| `PRODUCT.md` | Strategy | Product definition, moat, PMF | On product decisions | 97 |
| `ROADMAP.md` | Roadmap | Version milestones, release plan | On phase transitions | 145 |

---

## Trackers

| File | Type | Purpose | When | LOC |
|---|---|---|---|---|

---

## Provenance & decisions

| File | Type | Purpose | When | LOC | Last updated |
|---|---|---|---|---|---|
| `research/RESEARCH.md` | Provenance | WHY behind every design decision, source-by-source | On unfamiliar territory | 241 | 2026-07-22 |
| `adr/0001-weavelog-architecture-decisions.md` | ADR | Historical umbrella record — traceability table routes each bundled decision to its current home. Do not implement from §2 | On design changes | 344 | 2026-09-07 |
| `adr/0002-bash-homebrew-tooling.md` | ADR | Bash/Homebrew decision (approved: TypeScript only; reformatted to contract) | On distribution/language | 67 | 2026-09-07 |
| `adr/0003-three-phase-loop-model.md` | ADR | Three-phase loop model + decision-recording gate (WHY ends in ADR or explicit no-decision) | Every WHY phase | 99 | 2026-09-07 |
| `adr/0004-model-selection-benchmark-policy.md` | ADR | Seat-weighted benchmark policy; L0–L4 reviewer escalation; weekly/monthly drift cadence | Model decisions | 236 | 2026-09-07 |
| `adr/0005-artifact-flow.md` | ADR | idea→PRD→TRD→milestone↔PRD→TASK doc classes; machine-checked bidirectional milestone linkage | Planning any task | 125 | 2026-09-07 |
| `AGENTS.md` | Rules | Documentation rules (nested AGENTS.md): schemas, versioning, artifact flow, machine-checked linkage | When writing docs | 114 | 2026-09-07 |

---

## Research logs (dated findings)

Dated lab notebooks. Each captures a research session with evidence.

| File | Topic | When | LOC | Last updated |
|---|---|---|---|---|
| `research/2026-07-04-codex-headroom-setup.md` | Codex + Headroom setup | On tooling questions | 348 | 2026-07-04 |
| `research/2026-07-04-doc-indexing.md` | Documentation indexing approaches | On doc navigation | 123 | 2026-07-04 |
| `research/2026-07-04-evals-and-telemetry.md` | Evaluation framework + telemetry | On quality measurement | 184 | 2026-07-04 |
| `research/2026-07-04-frontier-model-selection.md` | Initial frontier model analysis | On model decisions | 127 | 2026-07-05 |
| `research/2026-07-04-harness-setup-and-pmf-synthesis.md` | Tooling stack + PMF validation | On tool or PMF questions | 451 | 2026-07-04 |
| `research/2026-07-04-license-selection.md` | License choice analysis | On licensing | 152 | 2026-07-04 |
| `research/2026-07-04-security-qa-tdd-mechanisms.md` | Security, QA, TDD enforcement | On verification design | 213 | 2026-07-04 |
| `research/2026-07-05-pi-tui-session-api.md` | Pi TUI footer and session API — ctx.ui.setFooter(), data access patterns | On extension development | 156 | 2026-07-05 |
| `research/2026-07-08-plugin-architecture-and-scope-refinement.md` | Plugin architecture + three-layer model (1.99a) | On plugin/scope decisions | 151 | 2026-07-08 |
| `research/2026-07-22-osmani-firsthand-alignment-amendment.md` | Firsthand two-model Osmani alignment — corrections, gaps, proposed edits | On Osmani alignment claims | 112 | 2026-07-22 |

---

## Research references (living, non-dated)

These accumulate updates over time. Not per-session findings.

| File | Topic | When | LOC | Last updated |
|---|---|---|---|---|
| `research/model-selection.md` | Authoritative model team roster with live API data | On model questions | 497 | 2026-07-05 |
| `research/loop-taxonomy.md` | Loop types, patterns, terminology | On loop design vocabulary | 204 | 2026-07-04 |

---

## Learning logs (post-mortems)

Each captures what went wrong, root cause, and blog candidate.

| File | Topic | When | LOC |
|---|---|---|---|
| `archive/learnings/2026-07-04-weavelog-foundation-harness-to-product-strategy.md` | Foundation synthesis + PMF decisions | On convergence decisions | 338 |
| `archive/learnings/2026-07-05-codex-profile-naming-and-registry.md` | Codex renaming + model registry creation | On model config | 66 |
| `archive/learnings/2026-07-05-config-consistency-fix.md` | Config audit — invalid TOML, phantom models, naming contradictions | On config audits | 144 |
| `archive/learnings/2026-07-05-model-selection-audit.md` | Live OpenRouter API validation + red team | On model confidence | 70 |
| `archive/learnings/2026-07-05-model-zdr-and-free-tier-removal.md` | OpenRouter ZDR policy impact, free-tier removal | On provider changes | 166 |
| `archive/learnings/2026-07-05-session-logger-derailment.md` | TDD violation post-mortem, derailment audit | On process discipline | 45 |
| `archive/learnings/2026-07-05-session-logger-dogfood-gate.md` | Session-logger runtime verification gate | On telemetry dogfooding | 98 |
| `archive/learnings/2026-07-05-session-quality-telemetry-axis.md` | Session-quality telemetry axis design | On telemetry design | 135 |
| `archive/learnings/2026-07-07-pi-footer-redesign-and-theme.md` | Pi footer redesign + weavelog-dark theme | On author workspace | 93 |
| `archive/learnings/2026-07-08-scope-refinement-and-yak-shaving-research.md` | 1.99a scope refinement session | On scope decisions | 197 |
| `archive/learnings/2026-07-22-moe-orchestration-audit.md` | MoE fanout audit — repo state, pi-subagents gaps, roster decision | On audit findings | 95 |
| `archive/learnings/2026-07-22-pi-web-access-install.md` | pi-web-access install decision, source review, Exa egress scope | On web-search tooling | 87 |
| `archive/learnings/2026-07-22-pi-subagents-intercom-fix.md` | pi-intercom install fixes reviewer intercom tool; model override gotcha; typebox/compile retraction | On subagent setup | 77 |
| `archive/learnings/2026-07-22-chain-1-gate-realism-telemetry.md` | Chain 0/1 telemetry, supply-chain checklist, process learnings | On MoE chain execution | 58 |
| `archive/learnings/2026-07-22-addy-osmani-loop-engineering-alignment.md` | Osmani series alignment (secondhand synthesis; see research amendment) | On Osmani alignment | 162 |
| `archive/learnings/2026-09-07-task49-productivity-suite-grilling.md` | TASK-49 productivity-suite grilling (mattpocock/skills audit, session hand-off scope expansion) | On skill adoption | 88 |

---

## TRD + PRD (docs/trd, docs/prd)

| File | Topic | When | LOC |
|---|---|---|---|
| `trd/2026-06-28-weavelog-design.md` | Founding TRD — full architecture design (ETCSLV, isolation, budgets, rollback) | On implementation | 686 |
| `trd/loop-factory.md` | Three-phase × two-role loop model (the operating system of the harness) | Every dispatch | 71 |
| `trd/tool-boundaries.md` | What each tool owns; loop-POSITION placement | On tooling changes | 53 |
| `trd/backlog-lifecycle.md` | Conductor flow → backlog fields; task provenance + decision gate (ADR-005) | Task lifecycle work | 150 |
| `trd/model-routing.md` | Roster/roles, escalation ladder wiring (ADR-004 companion) | Model decisions | 177 |
| `trd/worktree-discipline.md` | Worktree flow, HITL merge gate, crash contract | Every task | 166 |
| `trd/test-guardrails.md` | TDD ordering, EARS ACs, verify-gate semantics | TDD work | 159 |
| `trd/headroom-proxy.md` | Proxy stack utilization | Proxy work | 180 |
| `trd/runbook-decomposition.md` | Runbook section map (post-decomposition index) | Runbook archaeology | 84 |
| `prd/README.md` | PRD index — ratified milestone briefs cross-referenced with backlog milestones | Milestone planning | 38 |
| `archive/superpowers/specs/2026-07-07-weavelog-footer-theme-design.md` | Author footer/theme design (not product) | On author workspace | 151 |

---

## Open questions (TBD) — frozen corpus

Frozen 2026-09-07 (moved to `docs/archive/tbd/`): **historical questions,
background only — never implement against them.** Live questions are
re-raised as backlog tasks. These files are read-only.

| File | Topic | Severity | When | LOC |
|---|---|---|---|---|
| `archive/tbd/ci-cd-strategy.md` | CI/CD pipeline design | Medium | On automation | 61 |
| `archive/tbd/cost-ceiling.md` | Per-workload cost limits | Low | On budget design | 49 |
| `archive/tbd/open-blindspots-index.md` | Master list of all known blind spots | Medium | On design reviews | 96 |
| `archive/tbd/rollback-mechanism.md` | Git-based step rollback | Medium | On loop design | 53 |
| `archive/tbd/settings-isolation.md` | Sub-agent settings isolation from user config | High | On sub-agent impl | 46 |
| `archive/tbd/configuration-failure-seam.md` | Agent-failure ownership: weavelog vs Pi runtime vs user | Medium | Before Phase 4 check scope | 39 |

---

## Implementation plans (superpowers convention)

| File | Topic | When | LOC |
|---|---|---|---|
| `archive/superpowers/plans/2026-07-04-weavelog-implementation.md` | Full implementation plan (pre-revision, needs chunking) | On implementation | 2848 |
| `archive/superpowers/plans/2026-07-07-weavelog-footer-theme.md` | Footer/theme plan (author workspace) | On author workspace | 489 |
| `archive/superpowers/plans/2026-07-07-pi-workspace-footer-theme.md` | Pi workspace footer/theme plan (author workspace) | On author workspace | 403 |
| `archive/superpowers/plans/2026-07-22-moe-fast-track-to-phase-4.md` | MoE fast-track to Phase 4 (acceleration plan) | On phase planning | 113 |

---

## Author workspace (not product)

| File | Topic | When | LOC |
|---|---|---|---|
| `archive/pi-workspace/2026-07-07-author-setup.md` | Author's private Pi setup documentation | On author env questions | 93 |

---

## Summary

| Category | Count | Total LOC |
|---|---|---|
| Root-level entry points | 5 | 540 |
| Trackers | 0 | 0 |
| Provenance & decisions | 7 | 1,226 |
| Research logs (dated) | 10 | 2,017 |
| Research references (living) | 2 | 701 |
| Learning logs | 16 | 1,919 |
| TRD + PRD | 11 | 1,915 |
| Open questions (TBD) | 6 | 344 |
| Implementation plans | 4 | 3,853 |
| Author workspace | 1 | 93 |
| **Total** | **62** | **12,608** |
