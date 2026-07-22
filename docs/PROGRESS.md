# Progress

> **Status:** Constitution complete (DRY + global Pi AGENTS.md + codex AGENTS.md). PRODUCT.md created. 5 insights tracked. 3 pending decisions. Author's Pi workspace polished (loopeng-dark theme + four-line footer). Ready for Phase 2 tooling install.
> **Active phase:** 1.99 — Audit corrections
> **Last updated:** 2026-07-22 (MoE orchestration audit + Osmani series alignment)

This is the single source of truth for "where are we." Agents read this first.
Update it before any phase transition. Completed phases move to **Done** at the
bottom (memory decay: don't re-read unless needed).

---

## Active phase: 1.99 — Audit corrections

**Full thread audit performed (2026-07-04).** Gaps found:

1. `~/.pi/agent/AGENTS.md` (global Pi constitution) — discussed, approved,
   NEVER CREATED. Does not exist.
2. `~/.codex/AGENTS.md` — discussed amending with YAGNI/SOLID/KISS/DRY,
   NOT AMENDED. Still the original 36-line file with no principles.
3. DRY principle — user stated KISS+SOLID+DRY+YAGNI; NORTH_STAR has only
   YAGNI/SOLID/KISS. DRY is missing.
4. Documentation rule — deferred to 1.85c but I claimed "1.85b done."
   Overclaim. No rule exists.
5. Blog documentation rule — user said "everything needs documentation with
   data backing." NOT captured as a rule. Lab notebook exists for one session
   only; no rule enforces per-session capture.
6. Thread reasoning/decisions — NOT captured. Artifacts survive; conversation
   reasoning is compacted by Pi auto-compaction. If session dies, reasoning
   is gone.
7. No project `.pi/` directory — never created.

**What 1.99 does:**
- Correct PROGRESS (this file) — honest status, no overclaims
- Update NEXT_SESSION with the audit findings
- Note: creating global AGENTS.md + adding DRY are Phase 2 work (the global
  setup phase). The audit found the gap; the fix happens in Phase 2.
- The "blog documentation rule" and "thread reasoning capture" are new
  tracked items (see Watch items below)

---

## Upcoming phases

| # | Phase | Status | Blocks on |
|---|---|---|---|
| 1.99 | Audit corrections (tracker honesty, NEXT_SESSION update) | 🟡 in progress | nothing |
| 1.99a | **Scope refinement** — plugin architecture, three-layer model, mobile moved to v1.1/v1.2, ROADMAP/PRODUCT/ADR updated. NORTH_STAR amendment pending user approval. | ✅ done (except NORTH_STAR) | nothing |
| 1.85c | **Doc system overhaul** — define templates (research logs, learnings, TBD), split ADR, create conventions.md, enforce naming, add LOC tracking, doc lifecycle rules. INDEX.md scaffolded. Next session. | ⏳ ready (no blockers) | nothing |
| 1.98b | Git hook enforcement | ⏳ deferred (fold into Phase 2) | nothing |
| 2 | Global setup: create ~/.pi/agent/AGENTS.md, amend ~/.codex/AGENTS.md, add DRY to NORTH_STAR, install tooling | ⏳ next | 1.99 |
| 3 | Project setup: create .pi/, project AGENTS.md, beads, agents/skills/loops | ⏳ blocked | 2 |
| 4 | CLI tool: `loopeng init` + `loopeng check` + `loopeng plugin add` | ⏳ blocked | 3 |

---

## 2026-07-22 — MoE Orchestration Audit + Osmani Series Alignment

**Session:** 2026-07-22 (conductor: Kimi K3; MoE fanouts: GLM-5.2,
DeepSeek v4 Pro/Flash, Kimi K2.7-Code)
**Scope:** Audited repo state with a mixture-of-experts subagent fanout;
audited loopeng against all 8 Osmani loop-engineering posts (Jun 7–Jul 20).

**Findings (evidence in `docs/learnings/2026-07-22-*.md`):**
- Repo is docs-only with a CLI stub; `biome.json`, `.github/workflows/`,
  `src/extension/` claimed but absent; gates cannot run (tsx undeclared,
  deps uninstalled).
- `.pi/agents|skills|chains|settings.json` absent — dogfooding principle
  currently falsified.
- Builtin `researcher` subagent broken (requests uninstalled web tools).
  Decision: no third-party search plugin (maintenance gate); curl suffices;
  build-own research extension is a post-Phase-4 dogfooding candidate.
- Osmani alignment: loopeng = lit-factory harness composer, autonomy
  Level 2–3. Strong external validation of NORTH_STAR shape.

**Applied (author-approved):** RESEARCH.md Source 1 series-evolution
amendment; PRODUCT.md provenance lines; spec Section 2 compose-vs-run
primitives table; spec Section 7.4 back pressure + per-task autonomy.

**New tracked items:**
- **Phase 1.95 (proposed): gate realism** — declare tsx, write biome.json,
  add CI workflow, fix README links/TBD count/status, re-sync INDEX.md
  (now 9 files stale), add `.pi-subagents/` to .gitignore.
- Eval layer (output + trajectory rubrics) accepted as gap, deferred
  Phase 4+.

---

## 2026-07-05 — Model Selection Audit (live API + red team)

**Session:** 2026-07-05T17:36Z (252 lines, GLM 5.2)
**Scope:** Validated all model choices against live OpenRouter API, red-teamed
own analysis, applied engineering principles (SOLID/KISS/DRY/YAGNI).

**Changes made:**
- `docs/research/model-selection.md` — updated costs, added red-team-corrected
  DeepSeek V4 Pro justification, added "Available but Not Assigned" section,
  added "Dropped" section, updated summary table, updated tiered review
- `docs/research/2026-07-04-frontier-model-selection.md` — noted codex profile
  applied (gpt55 replaces opus)
- `~/.pi/agent/settings.json` — `enabledModels` corrected to final selection,
  `defaultModel` changed from qwen-35b-a3b to z-ai/glm-5.2
- `~/.pi/agent/models.json` — cleaned up (removed kimi-26, mim0, minimax,
  ling-flash overrides; kept gemma + qwen-max as available but not assigned)
  *(Superseded 2026-07-05: `models.json` deleted entirely; all aliases were
  unreferenced dead config. See "Config Consistency Fix" entry below.)*
- `~/.codex/gpt55.config.toml` — created (replaces opus in escalation)
  *(Superseded 2026-07-05: renamed to `gpt-5-5-escalate.config.toml`.
  See "Config Consistency Fix" entry below.)*
- `docs/learnings/2026-07-05-model-selection-audit.md` — created

**Key corrections from live API:**
- GLM 5.2 cost: $0.91/$2.86 → **$0.57/$1.80** (dropped ~37%)
- DeepSeek V4 Pro as Verifier (Code) IS justified (diversity of blind spots > capability parity)
- Documenter tier IS justified (6.3x cheaper on prompt, 10x on completion)
- Kimi K2.7 Code rationale confirmed correct (coding > agentic for UI review)

**Red team self-corrections:**
- Initially claimed DeepSeek V4 Pro too weak for code verification — WRONG.
  Maker/checker is about diversity, not parity.
- Initially claimed Documenter is YAGNI — WRONG. Cost savings justify the tier.
- Initially claimed K2.6 might be better for UI — WRONG. K2.7 Code's coding
  advantage is the entire reason it exists over K2.6.

---

## 2026-07-05 — Codex Profile Naming + Model Registry

**Scope:** Renamed all 7 codex profiles to `model-tier` format. Created centralized
model registry (`~/.pi/agent/models.md`). Created user-facing help script.

**Changes:**
- `~/.codex/*.config.toml` — 7 profiles renamed: `workhorse`, `ds-v4pro-checker`,
  `ds-v4flash-docs`, `kimi-k27-code-ui`, `nemotron-free`, `gpt55-escalate`,
  `fable-final`. Each has structured `# Model:` `# Tier:` `# When:` comment headers.
  *(Superseded 2026-07-05: renamed again to `model-version-type` format:
  `glm-5-2-default`, `deepseek-4-pro-checker`, `deepseek-4-flash-docs`,
  `kimi-k2-7-ui`, `nemotron-3-free`, `gpt-5-5-escalate`, `claude-fable-5-final`.
  See "Config Consistency Fix" entry below.)*
- `~/.codex/*.config.toml` (old) — removed: `deepseek`, `glm`, `kimi`, `flash`,
  `nemotron`, `ling`, `opus`, `fable`.
- `~/.pi/agent/models.md` — NEW. Central registry with full tables (roles, tiers,
  benchmarks, when-to-use, escalation ladder, verification methods).
- `~/.pi/agent/bin/model-help` — NEW. 40-line bash script that parses profile
  comment headers and outputs a formatted table. Run: `~/.pi/agent/bin/model-help`.
  *(Superseded 2026-07-05: deleted. Bash-for-logic violation + DRY violation
  (reinvented the `models.md` table). See "Config Consistency Fix" entry below.)*
- `~/.pi/agent/AGENTS.md` — Added "Model selection" section (links to registry).
- `~/.codex/AGENTS.md` — Added "Codex model profiles" table (Compact table with
  profile commands, model IDs, and when-to-use).
- `docs/learnings/2026-07-05-codex-profile-naming-and-registry.md` — NEW.

**Naming rationale:** `model-tier` format encodes both *what the model is* and
*when to use it*. Old names (`deepseek`, `glm`) only encoded the model. The
user can't remember 7 opaque model names but can remember `workhorse`,
`checker`, `escalate`, `fable`.
*(Superseded 2026-07-05: convention changed to `model-version-type` kebab-case
per user preference. See "Config Consistency Fix" entry below.)*

**SOLID/KISS/DRY/YAGNI evaluation:**
- **YAGNI:** Not a full help CLI, not a web UI, not a profile auto-discovery
  system. Just a 40-line script and a markdown file.
- **KISS:** Profile names are `kebab-case-model-tier`. One comment per field.
  Script reads comments and prints table. That's it.
- **DRY:** Registry (`models.md`) is the single source of truth. AGENTS.md files
  link to it. Profile comments are the machine-readable source for the script.
- **SOLID:** Script has one job — display profiles. If it gets bigger, it gets
  its own package. Registry is the authoritative source; configs reference it.

---

## 2026-07-05 — Audit Fix (follow-up)

**Session:** 2026-07-05T17:36Z (same session as above, `019f335a`)
**Scope:** Fixed 3 issues found during 5-pass audit trail verification.

**Fixes:**
1. **Duplicate GPT 5.5 row** — model-selection.md benchmark table had two identical
   GPT 5.5 rows (line 86-87). Removed duplicate.
2. **Frontier doc status stale** — status said "pending user approval" but the
   user approved and the codex profile was applied. Updated to "Approved 2026-07-05."
3. **Missing qwen discussion** — user questioned whether DS V4 Pro is a better
   replacement for qwen3.6-35b-a3B than qwen3.6-plus. This exchange was not
   captured in learning logs. Added Finding 7 to audit log documenting the
   YAGNI vs diversity tradeoff (Qwen in `models.json` overrides as available
   but not assigned).
   *(Superseded 2026-07-05: `models.json` deleted; Qwen is now a passive
   built-in fallback, not configured anywhere. See "Config Consistency Fix" entry below.)*

---

## 2026-07-05 — Config Consistency Fix (audit of prior session's work)

**Session:** 2026-07-05 (continuation, config-consistency-fix)
**Scope:** Audited and repaired `~/.pi/agent/` and `~/.codex/` config layer
after prior session left both malformed and over-engineered. Verified every
claim against live OpenRouter API, codex docs, pi docs, and TOML spec.

**Defects fixed:**
1. Base `~/.codex/config.toml` was invalid TOML (7 duplicate top-level `model=`
   keys). Deleted the stray block.
2. Phantom models (`ling-2.6-flash`, `claude-opus-4.8`) left in base config.
   Removed.
3. Default-model contradiction across `settings.json` / `config.toml` (3
   different defaults). Resolved to `z-ai/glm-5.2` @ `xhigh` everywhere.
4. Registry triplicated (models.md + AGENTS.md table + profile comments +
   `model-help` bash script). Consolidated to `models.md` as single source.
5. `~/.pi/agent/bin/model-help` deleted (bash-for-logic + DRY violation).
6. `~/.pi/agent/models.json` deleted (8 unreferenced dead aliases).
7. Invalid `model_reasoning_effort = "low"` on `deepseek-v4-flash` and
   `nemotron-free` profiles — not in OpenRouter `supported_efforts`.
   Corrected to `high` and `medium`.
8. Naming convention self-contradiction (AGENTS.md prose vs filenames). Fixed
   to `model-version-type` kebab-case.
9. Pi `defaultThinkingLevel`: `high` → `xhigh` (primary model supports it).
10. Renamed all 7 codex profiles to `model-version-type` format.
11. Reasoning efforts validated against live OpenRouter `supported_efforts`.

**Doc fixes:**
- `docs/research/model-selection.md` — fixed numbering bug (two items numbered
  "2"), updated "Available but Not Assigned" section (models.json deleted).
- `docs/research/2026-07-04-frontier-model-selection.md` — fixed stale GLM
  cost ($0.91/$2.86 → $0.57/$1.80), replaced dead `[profiles.X]` TOML format
  with per-file overlay format, updated profile filenames.
- `docs/PROGRESS.md` — annotated superseded entries (this entry).
- `docs/NEXT_SESSION.md` — fixed stale audit gap (`~/.pi/agent/AGENTS.md`
  now exists).
- `docs/learnings/2026-07-05-config-consistency-fix.md` — NEW. Full audit
  with evidence.

**What the prior session got right (verified):** all model benchmark/cost data
in `models.md` matches live OpenRouter API; codex profile mechanism correctly
understood; maker/checker reasoning sound.

**Root cause:** the prior session did good research and produced correct data,
then did a careless implementation pass that shipped an invalid config,
triplicated the registry it claimed to centralize, set two effort values the
provider doesn't support, and wrote confident learning logs that papered over
all of it. Verification step ("evidence before claims") was skipped for the
config file itself.

---

## 2026-07-05 — Session Logger Derailment (TDD Violation)

**Session:** 2026-07-05 (this thread)
**Scope:** Research/discussion only — should NOT have touched implementation.

**What was supposed to happen:** Research how Pi's footer and session events work,
discuss per-session logging design for loopeng.

**What actually happened:** Jumped to writing two Pi extensions (footer.ts,
session-logger.ts) and started scaffolding the loopeng CLI project — all without
writing a single failing test first. Constitution violation.

**Defects produced:**
- `~/.pi/agent/extensions/footer.ts` — accepted (valid discovery work, working)
- `~/.pi/agent/extensions/session-logger.ts` — accepted (working, but should have been its own implementation session)
- `loopeng/package.json` — on disk, needs tsx dev dep (blocked, needs approval)
- `loopeng/tsconfig.json` — basic config, may need review
- `loopeng/src/cli/index.ts` — stripped to stub (no stats.ts import, deferred to Phase 4)
- `loopeng/tests/cli/stats.test.ts` — replaced with placeholder comment (Phase 4)
- `loopeng/src/cli/stats.ts` — deleted (never completed)

**Root cause:** Treated user's "yes" as permission to implement immediately.
Should have flagged as a separate implementation session. Did not invoke
brainstorming skill (which gates creative work).

**Blog candidate:** Derailment post-mortem — how TDD-first catches scope creep
and why "yes" is not an implementation signal.

---

## 2026-07-05 — ZDR-on decision + free-tier removal

**Scope:** Model selection research thread (turns 1-5). Verified findings +
4 decisions confirmed by user.

**Decisions:**
1. **Keep OpenRouter ZDR on** (account-wide). A coding agent's prompts are
   proprietary source code; turning ZDR off to recover one $0 model exposes
   every prompt to logging/distribution/training-by-free-tier-providers.
   Verified: OpenRouter Terms (`openrouter.ai/terms`) grant license to
   log/store/distribute Inputs when ZDR is off; OpenRouter data-residency blog
   (`openrouter.ai/blog/insights/ai-data-residency`, 2026-06-22) documents
   `zdr: true` restricts routing to zero-retention endpoints.
2. **Remove the free tier.** `nvidia/nemotron-3-ultra-550b-a55b:free` and
   codex profile `nemotron-3-free` removed from `~/.pi/agent/models.md`,
   `settings.json` `enabledModels`, `~/.pi/agent/AGENTS.md`, and
   `~/.codex/nemotron-3-free.config.toml` deleted. DeepSeek V4 Flash
   ($0.09/$0.18 per M) absorbs the former free-tier workload. ZDR blocks
   `:free` provider endpoints, so the free model is unusable regardless.
3. **Sonnet 5 NOT added.** The turn-3 proposal (Sonnet 5 as frontier reviewer)
   is not adopted under "remaining models keep as is." If frontier-parity
   review is later needed, that is a separate +1 row +1 profile +1
   enabledModels +1 AGENTS.md name.
4. **Keep GPT-5.5 + Fable 5 escalation** unchanged.

**Verified findings (full detail in learning log):**
- GLM 5.2 has parity with Opus 4.8 on the agentic axis (Design Arena agents
  fullstack: 1293 vs 1325 Elo, both top-3 globally). GPT-5.5 is weak on
  agentic coding (agents rank #15-18) despite AA coding #2.
- DS V4 Pro is a full tier below Opus 4.8 on agents (rank #29); its value is
  cross-family diversity, not raw power. The loopeng design makes the
  deterministic verifier the real gate, so the LLM checker's job is diversity.
- Qwen 3.7 Max (AA coding 66.0) is NOT open-weights (no HuggingFace ID);
  disqualified for the primary checker slot.
- Sonnet 5 is close to Opus 4.8 (Anthropic announcement, 2026-06-30: "its
  performance is close to that of Opus 4.8"; AA coding 71.5 vs 74.3).
- Bedrock/ZDR routing: Anthropic models have Bedrock + Vertex + Azure
  endpoints (7 for Sonnet 5); GPT-5.5 has Azure only (no Bedrock). User's
  "Bedrock or similar" claim substantively correct.

**Files changed:**
- `~/.pi/agent/models.md` — removed 5 nemotron references; added Budget Tier
  note; updated DS V4 Flash to absorb free-tier workload.
- `~/.pi/agent/settings.json` — removed nemotron from `enabledModels`.
- `~/.pi/agent/AGENTS.md` — removed `nemotron-3-free` from profile-name list.
- `~/.codex/nemotron-3-free.config.toml` — deleted.
- `docs/learnings/2026-07-05-model-zdr-and-free-tier-removal.md` — NEW.
- `docs/research/model-selection.md` — added Superseded note to Free Tier.
- `docs/research/RESEARCH.md` — added awareness note to OpenRouter section (roster is
  historical; consult models.md).
- `docs/adr/0001-loopeng-architecture-decisions.md` — section 2.4 amended:
  roster updated to current tier-based allocation (matching models.md), original
  roster preserved as superseded, license corrected (DeepSeek V4 Pro = MIT, not
  Apache 2.0; verified via HuggingFace). Section 4 awareness note retained.
- `docs/PROGRESS.md` — this entry.

**Pre-existing drift resolved (amended 2026-07-05):** ADR 2.4 roster was
amended to match models.md: current tier-based roster added, original
role-based roster preserved as superseded. License correction: DeepSeek V4
Pro is MIT (not Apache 2.0 as originally recorded), verified via HuggingFace.

**Honest gaps:** Could not fetch OpenRouter's ZDR-eligible provider list
(docs site is a JS SPA; no ZDR field in `/api/v1/providers`). Could not
verify OpenAI's live privacy policy from source (JS-blocked; used Wayback
snapshot updated 2026-01-08). Anthropic's exact API retention period (30
days) is widely documented but could not be crisply re-verified from
`docs.anthropic.com` (JS SPA) this session.

---

## 2026-07-05 — Session-Quality Telemetry Axis (correction + decisions)

**Session:** 2026-07-05 (discussion only — no code touched)
**Scope:** Corrected prior misframing of session-logger. Established the
session-quality telemetry axis as distinct from workflow telemetry. Locked
4 design decisions for the session-logger v2 schema.

**Correction:** Prior assessment called session-logger "wrong shape for
loopeng." Wrong. It serves the session-quality axis (how the human uses the
agent, per-session health), which is distinct from the workflow-outcome axis
(did the loop ship features). The two are complementary and joined via
`piSessionId`, not competing.

**Decisions (locked):**
1. Closed-set taxonomy, 6 labels: `research | analysis | coding | docs |
   debugging | review`. Mixing is a measured signal, not a type.
2. Deterministic heuristic classification for v1 (tool-call counts + path
   prefixes at shutdown). Private, free, testable.
3. LLM classification deferred behind opt-in (v2). Changes privacy surface.
4. JSONL linked to per-session log: `.loopeng/metrics.jsonl` entries carry
   `piSessionId` referencing `.pi/logs/<piSessionId>.stats.json`. Join
   cardinality (1:1 vs many) is an open decision before metrics.jsonl
   schema is finalized.

**What is NOT done (deferred to a TDD implementation session):**
- Topic-classification code in `session-logger.ts` — schema designed, not
  implemented. Must be TDD-first in its own session.
- `loopeng stats` daily/weekly summary — Phase 4.
- `metrics.jsonl` writer — Phase 4, depends on loopeng run loop existing.

**Files changed:**
- `docs/learnings/2026-07-05-session-quality-telemetry-axis.md` — NEW

---

## 2026-07-05 — Session Logger Dogfood Gate (auto-discovery audit)

**Session:** 2026-07-05 (audit only — no code touched)
**Scope:** Before enabling the session-logger for dogfooding, audited
whether it was actually running. It was not, and the enablement story in
the docs was wrong.

**Findings:**
1. Pi auto-discovers global extensions (`~/.pi/agent/extensions/*.ts`) —
   no `settings.json` `extensions` entry needed. The research log and
   NEXT_SESSION implied one was required. Misleading.
2. Direct node import of `session-logger.ts` succeeds (loads, factory
   registers both handlers). Code is sound in isolation.
3. Zero `.pi/logs/` data exists anywhere under `~/Projects`. The
   "working" claim is an overclaim — should be "code complete, pending
   runtime confirmation."
4. Two candidate causes: (1) no shutdown has fired in this cwd since
   creation (likely — this session may be the first with the logger
   loaded, and it has not ended); (2) latent null-check bug in
   `input += m.usage.input` swallows silently if `usage` is undefined.

**Disambiguation plan (no speculative changes):**
1. Confirm footer is visible in Pi TUI (proves auto-discovery works).
2. Let this session shut down, check for `.pi/logs/<id>.stats.json`.
   - Appears → logger works, dogfooding started.
   - Does not appear → null-check hardening, TDD-first session.

**Decisions:** Do NOT add `extensions` array to settings (cargo-cult).
Treat logger as unverified until a stats file appears. Null-check
hardening is its own TDD session, not folded in here.

**Files changed:**
- `docs/learnings/2026-07-05-session-logger-dogfood-gate.md` — NEW
- `docs/PROGRESS.md` — this entry + watch items
- `docs/NEXT_SESSION.md` — corrected "working" claims, added verification step

---

## Watch items

- **Pi session JSONL is the native audit trail** — every message, tool call, and response is stored as structured JSONL at `~/.pi/agent/sessions/--<path>--/<timestamp>_<uuid>.jsonl`. This IS the thread-level audit trail. Export via `/export` (HTML/JSONL) or `/share` (GitHub gist). Not in the git repo (personal/local) but persists across sessions. This is how to recover thread reasoning if PROGRESS.md is insufficient.
- **token-saving.pdf NOT evaluated** — the LinkedIn post (10 token-saving tools) was read via markitdown but not captured as research or evaluated against loopeng's stack. NEW tracked item: `docs/research/2026-07-04-token-saving-tools-evaluation.md`.
- **Enforcement-layer analysis NOT in research doc** — the 4-layer analysis (prompt/hooks/CI/loopeng check) is in conversation only. Should be added to `docs/research/2026-07-04-security-qa-tdd-mechanisms.md`. NEW tracked item.
- **NORTH_STAR audit + AGENTS.md compliance verification** — results are in conversation only, not in docs. Low severity (amendments applied, compliant). Optional to capture.
- **Global Pi AGENTS.md** — ✅ CREATED at `~/.pi/agent/AGENTS.md` (YAGNI/SOLID/KISS/DRY + TDD/QA/security/arch-agnostic). Closed.
- **CLI + skill model synthesis (msgs 43-44, captured)** — from this
  session's reasoning: loopeng is a composer (setup/verify/compose, not run).
  Skill tiers: T0 methodology (superpowers, always) + T1 language (SME, per
  profile) + T2 platform (SME, arch-agnostic filter) + architecture as a
  user-decided config field (NOT a skill). Profiles deferred to v0.3+ (manual
  `loopeng add skill` first). Selection criterion: arch-dictating skills
  rejected (e.g. Meet-Miyani/compose-skill). SME candidates audited:
  twostraws/SwiftUI-Agent-Skill (4.2k★, MIT, adopt), callstackincubator/
  agent-skills RN (1.5k★, MIT, adopt), new-silvermoon/awesome-android-agent-
  skills (877★, Apache-2.0, adopt). MCP servers deferred to v2+ (Pi has no
  native MCP). Maestro (14.6k★, Apache-2.0) = preferred mobile E2E, v1.0.x.
- **Extensions map (msg 43, NOT captured)** — validated: superpowers +
  headroom extension (in use). When-needed (YAGNI, non-speculative):
  subagent spawning (Pi built-in example, v0.3), git-checkpoint (if rollback
  tbd resolves to stash-based), protected-paths (if `loopeng check` can't
  enforce statically), handoff (not planned, compaction may suffice).
  Principle: adopt extensions when a concrete need is proven, not because Pi
  ships examples.
- **Greenfield vs brownfield (msg 45, NOT captured)** — `loopeng init` must
  be idempotent + non-destructive: detect → preserve → augment. Applies to
  all profiles. In brownfield (existing code/AGENTS.md/skills), preserves and
  augments; in greenfield, scaffolds fresh. Architecture in brownfield is
  detected from existing state, not re-decided. This collapses green/brown
  into one behavior (KISS). Already aligns with tbd/open-blindspots-index.md
  idempotency note.
- **Blog (codewithshabib) is a stale trial, NOT a reference (msg 45)** — the
  existing .agents/skills/ and AGENTS.md in the blog repo are April 2026
  trial work, not July 2026 best practice. Do NOT use as a template.
  Blog's role: brownfield proof project (content/web type) only. When
  loopeng v1.0 runs against it, sets up the agent workspace fresh.
- **Architecture is user-decided, not skill-dictated (msgs 43,46)** —
  skills teach capability (language/platform patterns), NOT architecture
  (MVVM/MVI/MVC/TSA/modular). Architecture is a workspace config field,
  recorded in AGENTS.md `## Architecture` section, defaulting to "TBD —
  user-decided." `loopeng check` verifies presence (not value). The
  brainstorming flow for arch selection is just superpowers' brainstorming
  skill applied to the question — no loopeng feature to build.
- **~/.codex/AGENTS.md** — ✅ AMENDED with engineering principles section (YAGNI/SOLID/KISS/DRY/TDD/QA/security/arch). Closed.
- **DRY in NORTH_STAR** — ✅ ADDED. Closed.
- **Release strategy NOT yet active** — semver tags cut per ROADMAP milestone
  when actual code ships (not docs). First tag `v0.1.0` when `loopeng init`
  works (Phase 4). No tags now (repo is docs-only, 28 commits). Strategy
  noted in `docs/tbd/ci-cd-strategy.md` ("Versioning: semver, tags trigger
  publish"). GitHub remote not yet configured (deferred per user). Tags +
  releases get cut when there's a shippable artifact, not before.
- **Git workflow: PR vs direct push** — recommendation: PRs for feature work
  (v0.2+, when SAST/CI should run before merge), push directly to main for
  docs/chore (v0.1, solo-dev). Worktrees per feature branch. PRs add value as
  recorded review checkpoints + CI gates + public narrative for the blog.
  Noted here, not yet in AGENTS.md (Phase 2).
- **Research-before-changes principle** — user stated: "no guesswork, no
  shortcut, proper research and analysis and reasoning work before you start
  changing thing." Implied by YAGNI + evidence-before-claims in constitution,
  but not explicit. Consider adding to global Pi AGENTS.md as a process rule.
- **Session logger TDD violation (2026-07-05)** — see 2026-07-05 entry above.
  New watch item: enforce TDD-first gate on any implementation session, even
  for "small" extensions. The constitution says "no production code without a
  failing test first" — no carve-outs for scripts or config files.
- **Loopeng stats CLI — deferred to Phase 4 (correct)** — the `loopeng stats`
  command belongs in Phase 4 (CLI tooling) alongside `loopeng init` and
  `loopeng check`. Should not have been started early.
- **Session-logger topic classification — designed, not implemented
  (2026-07-05)** — schema for `type`, `typeConfidence`, `typeSignals`,
  `topicSwitches`, `dominantTypeRatio`, `turnsBucket`, `costPerTurnTrend`
  locked. Closed-set 6-label taxonomy. Heuristic-only v1, LLM behind opt-in
  v2. Implementation is a TDD-first session, NOT yet started. See learning
  log `2026-07-05-session-quality-telemetry-axis.md`.
- **Telemetry join cardinality — open decision** — `piSessionId` links
  `.loopeng/metrics.jsonl` to `.pi/logs/<id>.stats.json`, but whether a
  loopeng workflow run is 1:1, 1:many, or many:1 with a Pi session is
  unresolved. Must be decided before the metrics.jsonl schema is finalized.
  Affects whether the daily/weekly summary can prove "conflated sessions
  fail more."
- **Two telemetry axes, not one (2026-07-05)** — session-quality axis
  (`.pi/logs/`, per-session JSON) and workflow-outcome axis
  (`.loopeng/metrics.jsonl`, append-only JSONL) measure different things.
  Both opt-in. Do NOT merge the locations or read one as if it were the
  other. `loopeng stats` joins them via `piSessionId`.
- **Session-logger runtime confirmation PENDING (2026-07-05)** — code is
  complete and imports clean, but never confirmed running in a live
  session. Zero `.pi/logs/` data exists. Disambiguation: check footer is
  visible in TUI, then check for `.pi/logs/<id>.stats.json` after this
  session shuts down. If absent, suspect null-check bug in `m.usage.input`
  aggregation. See `docs/learnings/2026-07-05-session-logger-dogfood-gate.md`.
- **Session-logger null-check hardening — TDD candidate** — `input +=
  m.usage.input` has no null-check before the try/catch. If any assistant
  message has undefined `usage`, the handler throws and Pi swallows it
  silently. Fix: treat missing usage as 0. Must be TDD-first, own session.
- **Pi auto-discovers global extensions (2026-07-05)** —
  `~/.pi/agent/extensions/*.ts` load globally with no settings entry. The
  `settings.json` `extensions` array is only for paths outside auto-
  discovery dirs. Research log `2026-07-05-pi-tui-session-api.md` enable-
  ment snippet is misleading; fix batched into 1.85c.
- **ADR format: not Nygard** — current `docs/adr/0001-loopeng-architecture-
  decisions.md` is a monolithic file with 13 decisions. Nygard format
  (https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)
  is the standard: one ADR per file, each with Title/Context/Decision/
  Status/Consequences, numbered sequentially (0001-, 0002-, ...).
  Restructuring is a dedicated-session task (split 211 lines into 13 files).
- **Biome decision provenance** — biome appears in research/RESEARCH.md, ADR, AGENTS.md,
  README.md, implementation plan as the linter/formatter, but was NEVER
  explicitly discussed or decided in this thread. Inherited from prior-session
  work. Needs verification: is biome still the right choice vs eslint+prettier?
  Separate session or discussion required. Biome is MIT, 19k★, Rust-based,
  active — meets the tool bar, but the decision trail is missing.
- **Pi session path exposes username** — Pi encodes the cwd into the session
  folder name (`--Users-<username>-Projects-<repo>--`), which leaks the
  username even when the path starts with `~/`. Fix: reference sessions by
  ID (`pi --session <uuid>`), not by file path. Document the pattern as
  `--<encoded-cwd>--` in docs, never the literal encoded path. This is a
  sanitization rule addition for `loopeng check` (Phase 4): scan for
  `--Users-<name>-` patterns in committed docs.
- **Documentation rule NOT created** — 1.85b was tactical cleanup only.
  Format research (linked-list/graph/backlinks) deferred to 1.85c.
- **Doc naming conventions not enforced** — audit found 2/8 research files
  (`loop-taxonomy.md`, `model-selection.md`) violate `YYYY-MM-DD-<topic>`
  convention. No research doc template defined (no required sections unlike
  learnings or ADRs). No distinction between living references and dated
  findings. All feed into 1.85c scope.
- **`docs/research/RESEARCH.md` is correct** — it is the provenance doc (WHY behind
  design decisions), not a research log. The dated research logs live in
  `docs/research/`. Confirmed: no relocation needed.
- **Blog documentation rule NOT captured** — user said "everything needs
  documentation with data backing." No rule enforces per-session lab notebook
  capture. NEW tracked item: define this rule in Phase 2.
- **Thread reasoning NOT captured** — artifacts survive in git; conversation
  reasoning is compacted by Pi auto-compaction. This audit trail (in this
  response) is the first attempt to capture thread-level reasoning. NEW
  tracked item: define a "session audit" convention.
- **Scope-drift pattern:** noticed 2026-07-04. I overclaimed "done" multiple
  times (1.85b, "planning phase complete"). The user caught each. Mitigation:
  verify before claiming; the verification-before-completion skill exists for
  this exact reason.
- **Enforcement gap:** all rules currently Layer 1 (prompt-level) only. No
  mechanical gates (hooks, CI, `loopeng check`) exist yet.
- **beads adoption:** requires user approval (package install). Phase 3.
- **License decision:** Apache 2.0 recommended; user decides.
- **Frontier models decision:** Fable 5 + GPT-5.5 recommended; user decides.
- **Telemetry decision:** phased opt-in (local-first) recommended; user decides.
- **Pi auto-compaction:** confirmed by design (compaction.md). Long sessions
  are supported. Older conversation is summarized, not verbatim. Artifacts
  on disk are what survive intact — "agent forgets, repo doesn't."
- **History rewriting performed:** filter-branch removed literal home-dir
  path from commit diffs. Pre-push, safe. Verified 0 matches.

---

## Done (honestly — no overclaims)

- **1.8** — ROADMAP drafted (version milestones, loop paradigm, pending
  decisions noted). Note: "planning phase complete" was an overclaim; global
  constitutions were not created.
- **1.85b** — Docs tactical cleanup (NEXT_SESSION stripped, headings
  normalized, AGENTS.md table updated). Note: NOT a documentation rule.
  Overclaimed as "done." Rule is deferred to 1.85c.
- **1.95** — Research complete: 5 docs (license, security+QA+TDD, frontier
  models, doc-indexing, evals+telemetry)
- **1.98** — Clean restart: sanitized, atomic commits, .gitignore,
  AGENTS.md+PROGRESS.md verified against July 2026 standards
- **1.97** — gh CLI added to stack (MIT, 31 releases/year)
- **1.96** — Git/GitHub/SAST/review-tool research (all tools activity-audited)
- **1.94** — Lab notebook captured (one session only — not a systematic rule)
- **1.93** — Superpowers fit (compose, don't reinvent) + doc-chain decision
- **1.92** — NORTH_STAR amend round 2 (security, TDD, QA — but NOT DRY)
- **1.9** — PMF locked (3 proof projects)
- **1.85** — Tolaria reference research
- **1.75** — Loop-engineering research (Voss, Osmani, LangChain, swyx)
- **1.5** — NORTH_STAR amend round 1 (YAGNI/SOLID/KISS — but NOT DRY)
- **1** — Tooling setup verified (codex fixed, headroom healthy, Pi working)
