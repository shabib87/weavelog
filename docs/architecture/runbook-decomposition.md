---
date: 2026-09-06
topic: AGENT-STACK-RUNBOOK decomposition — section-by-section fate map
status: draft
type: architecture
author: conductor
related_to:
  - ./headroom-proxy.md
  - ./model-routing.md
  - ./test-guardrails.md
  - ./backlog-lifecycle.md
  - ./worktree-discipline.md
  - ./README.md
  - ../cli.md
sources:
  - "TASK-45 (port plan v8, step 1.10)"
  - "AGENT-STACK-RUNBOOK.md (2267 lines, 30 H2 headings + preamble)"
---

# Runbook decomposition — heading inventory

The source runbook (`~/.agents/AGENT-STACK-RUNBOOK.md`, archived at commit 2878c89 of
this repo's provenance) is being retired as a single prose document. Every section —
each H2 heading plus the pre-first-H2 preamble block — now has exactly one fate:

- **script** — init/check/doctor/update logic, already ported or slated for the CLI in `src/`
- **architecture doc** — distilled into `docs/architecture/<topic>.md`
- **payload template** — the tracked template under `payload/`
- **delete** — content redistributed to a destination that already exists; the rationale is stated per row

Zero sections remain prose-only. This table is the checklist artifact for the
decomposition acceptance criterion: every row is verifiable against the source
(`grep -c '^## ' <runbook>` = 30; + 1 preamble row = 31).

The live runbook file is replaced by a pointer stub; this table is the
section→fate map that stub points to.

## Section → fate map

| # | Runbook section (src) | Line | Fate | Destination | Notes |
|---:|---|---|---|---|---|
| 1 | *Preamble* (title, status, scope, legend/conventions) | 1–23 | delete | `docs/architecture/headroom-proxy.md` (localhost-not-bracketed-IP rule, 700-dir, ~-vs-absolute conventions restated where they still apply) | Legend conventions die with the narrative format; every fact is restated inside the destination that needs it. Home-dir substitution rule is now the init script's job |
| 2 | Table of contents | 24 | delete | `docs/architecture/runbook-decomposition.md` (this file, successor index) + `docs/architecture/README.md` doc index | A TOC for a file that becomes a pointer stub is dead weight |
| 3 | Start here — fresh-Mac checklist | 57 | script | `src/cli/` init flow (`weavelog init`, staged install order; each checklist item maps to an init step 1–11) + `weavelog doctor` for items 4/10 | Condensed in README "Quickstart" |
| 4 | Principles (operationalized) | 79 | delete | YAGNI/SRP/DRY/KISS checks already embedded verbatim in `payload/config/prompts/{plan-reviewer,reviewer}.md`; TS-only scripting rule in `docs/architecture/test-guardrails.md` + `docs/cli.md`; values summary in `README.md` "Principles" | No new doc; the reviewers that enforce the principles already carry them |
| 5 | Phase 0 — Host prerequisites | 103 | script | `src/cli/` init install logic: brew deps (python@3.13, pipx, bun, git, semgrep), node v22.23.1 npx pin, OpenCode app, git identity | Version pins expressed in `weavelog.json` manifest |
| 6 | Phase 1 (P1) — Headroom compression proxy | 174 | architecture doc | `docs/architecture/headroom-proxy.md` (what/why, cache mode, launchd, :8788 single-owner, doctor expectations) | Install/rollback commands → init/update script + health checks → doctor subchecks |
| 7 | Phase 2 (P2) — opencode config | 404 | payload template | `payload/config/opencode.jsonc` (tracked template) + doctor subcheck `opencode.config-parse` (docs/cli.md) | Config-sync materialization is `weavelog sync`/init |
| 8 | Phase 3 (P3) — Role agents | 592 | payload template | `payload/config/agents/*.md` (16 agents) + `payload/config/prompts/{reviewer,plan-reviewer,vision}.md` | Roster facts distilled into `docs/architecture/model-routing.md` |
| 9 | Test Guardrails | 898 | architecture doc | `docs/architecture/test-guardrails.md` (already migrated, TASK-16; runbook section is a pointer) | No content change; fate recorded here |
| 10 | Phase 4 (P4) — Skills hub | 904 | script | init symlink logic (pi/claude chains, codex real-copy exception) + `payload/skills/` as canonical content source | Gotchas: remove symlink entry before materializing a real dir; `cp -R` through a symlink copies into the target |
| 11 | Phase 5 (P5b) — Global behavior rules | 989 | payload template | `payload/AGENTS.md` (tracked canonical copy that init/sync materializes to `~/.config/opencode/AGENTS.md`) | Single-source rule: edit payload, sync; never hand-edit the live file |
| 12 | Phase 6 — Deterministic scripts (bun) | 1010 | script | `src/` — already ported: `stack-check.ts`, `reviewer-loop.ts`, `sync-model-pricing.ts`, `prefix-diff.ts`, `cache-probe.ts`, `frontmatter-check.ts`, `headroom-compress.ts`, `agents-install.ts`, `mdconvert.ts`, `hooks/enforce.ts`, `hooks/verify-gate.ts` | Runbook listings were reference excerpts; `src/` is authoritative |
| 13 | Pricing sync (OpenRouter → litellm) | 1568 | script | `src/tools/sync-model-pricing.ts` (exists) + doctor/stack-check wiring (`--check` drift) + rationale in `docs/architecture/headroom-proxy.md` | `LITELLM_LOCAL_MODEL_COST_MAP` + `HEADROOM_MODEL_ALIAS_MAP` env facts in headroom-proxy.md |
| 14 | Prompt-cache policy (OpenRouter) | 1640 | architecture doc | `docs/architecture/headroom-proxy.md` (cache-mode rationale, sticky routing, qwen pin interplay) + doctor `proxy.cache-mode` + `src/tools/cache-probe.ts` (new-model onboarding gate) | `--mode cache` is the verified default; token mode busts the KV cache |
| 15 | Phase 7 — Version manifest | 1692 | payload template | `weavelog.json` (manifest seed, already ported: tools, models, proxyPort, apiUrls, launchd labels) | Version facts: headroom 0.36.5, backlog.md 1.50.1, markitdown 0.1.7, opencode 1.18.25, pi 0.84.4, diagram-design ac490fd |
| 16 | Phase 8 — Weekly stack-check LaunchAgent | 1728 | script | `src/tools/stack-check.ts` (report-only drift sweeper, exists) + init-registered LaunchAgent `com.agents.stack-check` (Sunday 09:00, plist template generated from manifest) | Cadence facts in maintenance row below |
| 17 | Verification battery | 1800 | script | Doctor subchecks in `docs/cli.md` §Doctor subchecks (`proxy.health`, `proxy.dashboard`, `proxy.cache-mode`, `proxy.owner`, `python.venv`, `auth.openrouter`, `opencode.config-parse`, …) | 14 runbook checks → 13 subchecks; step 6 ($0.00 guard) drives the pricing-sync doctor wiring |
| 18 | Human gates and circuit breakers | 1857 | architecture doc | `docs/architecture/loop-factory.md` (plan + merge gates model) + `payload/AGENTS.md` (circuit-breaker caps: fix loops ≤5, subagent discovery ≤3, divergent reviews ≤$2/2 rounds) | Caps are codified inventory of the payload AGENTS.md contract |
| 19 | Cross-model review SOP | 1874 | script | `src/tools/reviewer-loop.ts` (exists: `--plan`, `--models`, `--exclude`, `--budget-usd`, exit codes) + usage in `docs/cli.md` | Evidence-first merge rule lives in loop-factory.md |
| 20 | Model tier protocol (self-refreshing) | 1891 | architecture doc | `docs/architecture/model-routing.md` (quarterly re-derivation: open-weights filter, ≥1M context hard gate, provider endpoint caps → `provider.order` pins, expiry checks) | Protocol, not a durable script — throwaway probes remain allowed |
| 21 | Current model tiers (2026-08-30) | 1925 | architecture doc | `docs/architecture/model-routing.md` (role→model→price table) + `weavelog.json` `models` (machine-readable default) | Snapshot, re-verify from OpenRouter before trusting |
| 22 | Watched / not-used | 1946 | architecture doc | `docs/architecture/model-routing.md` (rejected-model ledger: reasons persist as anti-re-adoption guardrails) | kimi-k2.7-code, qwen3.8-max, gpt-5.5, claude-fable-5 |
| 23 | Safe update procedures | 1956 | script | `src/cli/` update flow (`weavelog update --tool <name>`, per-tool procedure: verify-before-reload, manifest bump, stack-check green) | headroom quoted-spec reinstall, backlog.md npm bump, markitdown pipx upgrade, opencode app, models re-derive |
| 24 | Maintenance cadence | 2019 | script | stack-check LaunchAgent (weekly auto) + update flow (monthly) + model-routing.md quarterly protocol | Schedule facts in headroom-proxy.md/model-routing.md |
| 25 | Parked-but-wired inventory | 2029 | architecture doc | `docs/architecture/headroom-proxy.md` (§:8788 single-owner: pi extension auto-spawn conflict, `~/.pi/agent/headroom/settings.json` `autoStart:false`, launchd-pid == lsof-pid check) | Parked-host wiring summary survives; un-park paths die with the runbook |
| 26 | Prune rules (YAGNI backlog with triggers) | 2060 | delete | Backlog tasks with triggers (created via `backlog` CLI, deferral-with-name pattern); RUNBOOK-SPLIT trigger is superseded by this decomposition | Every deferred item keeps its name + explicit trigger in the backlog |
| 27 | Rollback index + backup set | 2081 | script | update/init rollback paths per phase (headroom pin 0.30.0, config baseURL line removal, agent-file removal, plist/script removal) + backup set (`~/backups/…`) consumed by init fresh-Mac restore | Rollback rows map to per-command rollback logic in `docs/cli.md` |
| 28 | Carry-over manifest (what must be transferred) | 2114 | delete | Executed by this port (TASK-45): skill subtrees → `payload/skills/` (incl. `references/`, `agents/`), secret values → referenced by file location only (`.env.example`, never transcribed), shell PATH wiring → init | The manifest's job is done by the port itself; receipts are the payload tree |
| 29 | Quick reference card | 2137 | delete | Redistributed: paths/ports/models/versions tables → `docs/cli.md` §Reference surfaces; install flow → `README.md` "Quickstart" | All command-surface facts now covered in product docs |
| 30 | Phase 9 — backlog.md task tracking | 2213 | architecture doc | `docs/architecture/backlog-lifecycle.md` (already migrated, TASK-16; runbook section is a pointer) | No content change; fate recorded here |
| 31 | Phase 10 — Worktree discipline (v1 inner harness) | 2219 | architecture doc | `docs/architecture/worktree-discipline.md` (already migrated, TASK-11; single source) + enforcement in `src/tools/worktree-create.ts` + `src/hooks/enforce.ts` | Crash reset + restart-after-merge procedures live in the architecture doc |

## Fate tally

| Fate | Rows |
|---|---|
| script | 3, 5, 6, 10, 12, 13, 16, 17, 19, 23, 24, 27 |
| architecture doc | 6, 9, 14, 18, 20, 21, 22, 25, 30, 31 |
| payload template | 7, 8, 11, 15 |
| delete | 1, 2, 4, 26, 28, 29 |

Rows that appear under two fates in the table (6, for example) list a primary fate and
the script surface it also feeds; the fate column is the primary one. Total: 31 rows,
one fate each.