# Document Index

> **Purpose:** Navigation map for agents and humans. Read this to decide
> what to read and what to skip. Updated as part of Phase 1.85c.
> **Last updated:** 2026-07-05

## How to use this index

1. **Starting a session:** Read PROGRESS.md (status, phase, watch items) →
   NEXT_SESSION.md (narrative handoff) → this index (find relevant docs)
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
| `AGENTS.md` | Constitution | Build commands, MUST NOTs, standards | Every session | ~180 |
| `README.md` | Project overview | What loopeng is, quickstart | First read only | ~60 |
| `NORTH_STAR.md` | Constitution | Non-negotiables, scope, success criteria | Every session | 49 |
| `PRODUCT.md` | Strategy | Product definition, moat, PMF | On product decisions | 209 |
| `ROADMAP.md` | Roadmap | Version milestones, release plan | On phase transitions | 225 |

---

## Trackers

| File | Type | Purpose | When | LOC |
|---|---|---|---|---|
| `PROGRESS.md` | Tracker | Phase status, timeline, watch items, done list | **Every session first** | 454 |
| `NEXT_SESSION.md` | Handoff | Narrative state for next agent | **Every session second** | 62 |

---

## Provenance & decisions

| File | Type | Purpose | When | LOC | Last updated |
|---|---|---|---|---|---|
| `research/RESEARCH.md` | Provenance | WHY behind every design decision, source-by-source | On unfamiliar territory | 220 | 2026-07-04 |
| `adr/0001-loopeng-architecture-decisions.md` | ADR | Architecture decisions (monolithic — needs splitting) | On design changes | 225 | 2026-07-05 |

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
| `research/2026-07-05-pi-tui-session-api.md` | Pi TUI footer and session API — ctx.ui.setFooter(), data access patterns | On extension development | ~90 | 2026-07-05 |

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
| `learnings/2026-07-04-loopeng-foundation-harness-to-product-strategy.md` | Foundation synthesis + PMF decisions | On convergence decisions | 338 |
| `learnings/2026-07-05-codex-profile-naming-and-registry.md` | Codex renaming + model registry creation | On model config | 66 |
| `learnings/2026-07-05-config-consistency-fix.md` | Config audit — invalid TOML, phantom models, naming contradictions | On config audits | 144 |
| `learnings/2026-07-05-model-selection-audit.md` | Live OpenRouter API validation + red team | On model confidence | 70 |
| `learnings/2026-07-05-model-zdr-and-free-tier-removal.md` | OpenRouter ZDR policy impact, free-tier removal | On provider changes | 156 |
| `learnings/2026-07-05-session-logger-derailment.md` | TDD violation post-mortem, derailment audit | On process discipline | 45 |

---

## Design specs

| File | Topic | When | LOC |
|---|---|---|---|
| `specs/2026-06-28-loopeng-design.md` | Full architecture design — ETCSLV, isolation, budgets, rollback | On implementation | 610 |

---

## Open questions (TBD)

Each file = one unresolved question blocking progress.

| File | Topic | Severity | When | LOC |
|---|---|---|---|---|
| `tbd/bash-homebrew-tooling.md` | How to ship loopeng (npm vs Homebrew) | Medium | On distribution | 49 |
| `tbd/ci-cd-strategy.md` | CI/CD pipeline design | Medium | On automation | 61 |
| `tbd/cost-ceiling.md` | Per-workload cost limits | Low | On budget design | 49 |
| `tbd/open-blindspots-index.md` | Master list of all known blind spots | Medium | On design reviews | 96 |
| `tbd/rollback-mechanism.md` | Git-based step rollback | Medium | On loop design | 53 |
| `tbd/settings-isolation.md` | Sub-agent settings isolation from user config | High | On sub-agent impl | 46 |

---

## Implementation plans (superpowers convention)

| File | Topic | When | LOC |
|---|---|---|---|
| `superpowers/plans/2026-07-04-loopeng-implementation.md` | Full implementation plan (pre-revision, needs chunking) | On implementation | 2848 |

---

## Summary

| Category | Count | Total LOC |
|---|---|---|
| Root-level entry points | 5 | 532 |
| Trackers | 2 | 516 |
| Provenance & decisions | 2 | 445 |
| Research logs (dated) | 8 | 1,675 |
| Research references (living) | 2 | 697 |
| Learning logs | 6 | 819 |
| Design specs | 1 | 610 |
| Open questions (TBD) | 6 | 354 |
| Implementation plans | 1 | 2,848 |
| **Total** | **33** | **8,496** |