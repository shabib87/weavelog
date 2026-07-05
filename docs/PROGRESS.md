# Progress

> **Status:** Constitution complete (DRY + global Pi AGENTS.md + codex AGENTS.md). PRODUCT.md created. 5 insights tracked. 3 pending decisions. Ready for Phase 2 tooling install.
> **Active phase:** 2 — Global setup (constitution done; tooling install + 3 decisions next)
> **Last updated:** 2026-07-05

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
| 1.99 | Audit corrections (this — tracker honesty, NEXT_SESSION update) | 🟡 in progress | nothing |
| 1.85c | Docs format + link-backlink research (separate session) | ⏳ deferred | nothing |
| 1.98b | Git hook enforcement | ⏳ deferred (fold into Phase 2) | nothing |
| 2 | Global setup: create ~/.pi/agent/AGENTS.md, amend ~/.codex/AGENTS.md, add DRY to NORTH_STAR, install tooling | ⏳ next | 1.99 |
| 3 | Project setup: create .pi/, project AGENTS.md, beads, agents/skills/loops | ⏳ blocked | 2 |
| 4 | CLI tool: `loopeng init` + `loopeng check` | ⏳ blocked | 3 |

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
- `~/.codex/gpt55.config.toml` — created (replaces opus in escalation)
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
- `~/.codex/*.config.toml` (old) — removed: `deepseek`, `glm`, `kimi`, `flash`,
  `nemotron`, `ling`, `opus`, `fable`.
- `~/.pi/agent/models.md` — NEW. Central registry with full tables (roles, tiers,
  benchmarks, when-to-use, escalation ladder, verification methods).
- `~/.pi/agent/bin/model-help` — NEW. 40-line bash script that parses profile
  comment headers and outputs a formatted table. Run: `~/.pi/agent/bin/model-help`.
- `~/.pi/agent/AGENTS.md` — Added "Model selection" section (links to registry).
- `~/.codex/AGENTS.md` — Added "Codex model profiles" table (Compact table with
  profile commands, model IDs, and when-to-use).
- `docs/learnings/2026-07-05-codex-profile-naming-and-registry.md` — NEW.

**Naming rationale:** `model-tier` format encodes both *what the model is* and
*when to use it*. Old names (`deepseek`, `glm`) only encoded the model. The
user can't remember 7 opaque model names but can remember `workhorse`,
`checker`, `escalate`, `fable`.

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
- **ADR format: not Nygard** — current `docs/adr/0001-loopeng-architecture-
  decisions.md` is a monolithic file with 13 decisions. Nygard format
  (https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)
  is the standard: one ADR per file, each with Title/Context/Decision/
  Status/Consequences, numbered sequentially (0001-, 0002-, ...).
  Restructuring is a dedicated-session task (split 211 lines into 13 files).
- **Biome decision provenance** — biome appears in RESEARCH.md, ADR, AGENTS.md,
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
