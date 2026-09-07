# Document Index

> **Purpose:** Navigation map for agents and humans. Read this to decide
> what to read and what to skip. Updated as part of Phase 1.85c.
> **Last updated:** 2026-09-07 (ADR rows reconciled; research/plans/learnings
> corpus entries beyond 2026-07-22 are tracked by `docs/research/README.md` —
> this index does not duplicate the corpus)

## How to use this index

1. **Starting a session:** Read PROGRESS.md (status, phase, watch items) →
2. **Researching a topic:** Find the category below, scan purposes, read
   relevant files
3. **Making a decision:** Check ADRs (past decisions), TBDs (open questions),
   research logs (evidence)
4. **Writing a doc:** Check templates defined in docs/conventions.md (pending)

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
| `AGENTS.md` | Constitution | Build commands, MUST NOTs, standards | Every session | 106 |
| `README.md` | Project overview | What weavelog is, quickstart | First read only | 58 |
| `NORTH_STAR.md` | Constitution | Non-negotiables, scope, success criteria | Every session | 51 |
| `PRODUCT.md` | Strategy | Product definition, moat, PMF | On product decisions | 300 |
| `ROADMAP.md` | Roadmap | Version milestones, release plan | On phase transitions | 301 |

---

## Trackers

| File | Type | Purpose | When | LOC |
|---|---|---|---|---|
| `PROGRESS.md` | Tracker | Phase status, timeline, watch items, done list | **Every session first** | 599 |

---

## Provenance & decisions

| File | Type | Purpose | When | LOC | Last updated |
|---|---|---|---|---|---|
| `research/RESEARCH.md` | Provenance | WHY behind every design decision, source-by-source | On unfamiliar territory | 241 | 2026-07-22 |
| `architecture/adr/0001-weavelog-architecture-decisions.md` | ADR | Historical umbrella record — traceability table routes each bundled decision to its current home. Do not implement from §2 | On design changes | 341 | 2026-09-07 |
| `architecture/adr/0002-bash-homebrew-tooling.md` | ADR | Bash/Homebrew decision (approved: TypeScript only; reformatted to contract) | On distribution/language | 62 | 2026-09-07 |
| `architecture/adr/0003-three-phase-loop-model.md` | ADR | Three-phase loop model + decision-recording gate (WHY ends in ADR or explicit no-decision) | Every WHY phase | 100 | 2026-09-07 |
| `architecture/adr/0004-model-selection-benchmark-policy.md` | ADR | Seat-weighted benchmark policy; L0–L4 reviewer escalation; weekly/monthly drift cadence | Model decisions | 241 | 2026-09-07 |
| `AGENTS.md` | Rules | Documentation rules (nested AGENTS.md): schemas, versioning, artifact flow PRD→TRD→ADR→TASK | When writing docs | 120 | 2026-09-07 |

---

## Research logs (dated findings)

Dated lab notebooks. Each captures a research session with evidence.

| File | Topic | When | LOC | Last updated |
|---|---|---|---|---|
| `research/2026-07-04-codex-headroom-setup.md` | Codex + Headroom setup | On tooling questions | 341 | 2026-07-04 |
| `research/2026-07-04-doc-indexing.md` | Documentation indexing approaches | On doc navigation | 123 | 2026-07-04 |
| `research/2026-07-04-evals-and-telemetry.md` | Evaluation framework + telemetry | On quality measurement | 184 | 2026-07-04 |
| `research/2026-07-04-frontier-model-selection.md` | Initial frontier model analysis | On model decisions | 127 | 2026-07-05 |
| `research/2026-07-04-harness-setup-and-pmf-synthesis.md` | Tooling stack + PMF validation | On tool or PMF questions | 445 | 2026-07-04 |
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
| `research/model-selection.md` | Authoritative model team roster with live API data | On model questions | 493 | 2026-07-05 |
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
| `archive/learnings/2026-07-22-pi-web-access-install.md` | pi-web-access install decision, source review, Exa egress scope | On web-search tooling | 60 |
| `archive/learnings/2026-07-22-pi-subagents-intercom-fix.md` | pi-intercom install fixes reviewer intercom tool; model override gotcha; typebox/compile retraction | On subagent setup | 74 |
| `archive/learnings/2026-07-22-chain-1-gate-realism-telemetry.md` | Chain 0/1 telemetry, supply-chain checklist, process learnings | On MoE chain execution | 77 |
| `archive/learnings/2026-07-22-addy-osmani-loop-engineering-alignment.md` | Osmani series alignment (secondhand synthesis; see research amendment) | On Osmani alignment | 162 |

---

## Design specs

| File | Topic | When | LOC |
|---|---|---|---|
| `specs/2026-06-28-weavelog-design.md` | Full architecture design — ETCSLV, isolation, budgets, rollback | On implementation | 675 |
| `archive/superpowers/specs/2026-07-07-weavelog-footer-theme-design.md` | Author footer/theme design (not product) | On author workspace | 151 |

---

## Open questions (TBD)

Each file = one unresolved question blocking progress.

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

---

## Author workspace (not product)

| File | Topic | When | LOC |
|---|---|---|---|
| `archive/pi-workspace/2026-07-07-author-setup.md` | Author's private Pi setup documentation | On author env questions | 34 |

---

## Summary

| Category | Count | Total LOC |
|---|---|---|
| Root-level entry points | 5 | 816 |
| Trackers | 2 | 677 |
| Provenance & decisions | 2 | 544 |
| Research logs (dated) | 10 | 2,004 |
| Research references (living) | 2 | 697 |
| Learning logs | 14 | 1,743 |
| Design specs | 2 | 826 |
| Open questions (TBD) | 7 | 395 |
| Implementation plans | 3 | 3,740 |
| Author workspace | 1 | 34 |
| **Total** | **48** | **11,553** |