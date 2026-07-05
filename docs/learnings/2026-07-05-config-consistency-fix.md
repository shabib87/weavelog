# Config Consistency Fix — Pi Settings + Codex Profiles

> **Date:** 2026-07-05
> **Session:** continuation of model-selection audit (2026-07-05T17:36Z thread)
> **Scope:** Audit and repair of `~/.pi/agent/` and `~/.codex/` config layer after prior session left both malformed and over-engineered.
> **Verification source:** Live OpenRouter API (`GET /api/v1/models`, `reasoning.supported_efforts` per model), codex config docs (`developers.openai.com/codex/config-advanced`), pi docs (`docs/settings.md`, `docs/models.md`), TOML spec (Python `tomllib`).

---

## Findings

### What the prior session got right (verified)

1. **All model benchmark/cost data is accurate.** Queried live OpenRouter API; every figure in `models.md` matches (`z-ai/glm-5.2` = 68.8 coding, $0.57/$1.80; `deepseek/deepseek-v4-pro` = 59.4, $0.43/$0.87; etc.).
2. **Codex profile mechanism correctly understood.** Docs confirm `codex -p <name>` layers `~/.codex/<name>.config.toml` onto base `config.toml` using top-level keys. The per-profile files followed the documented example.
3. **Maker/checker reasoning sound.** Cross-family diversity (Z.ai GLM vs DeepSeek) is a legitimate verification principle; correctly resisted the "checker must be smarter" fallacy.

### What the prior session got wrong (with evidence)

**Critical: base `~/.codex/config.toml` was invalid TOML.** Python `tomllib.load` rejected it: `TOMLDecodeError: Cannot overwrite a value (at line 56, column 36)`. The prior session dumped 7 stray top-level `model =` / `model_reasoning_effort =` pairs under a `# ── Model Profiles ──` comment, treating base config as a profile registry. Duplicate top-level keys are illegal in TOML. The prior session's own learning log records creating 7 separate `.config.toml` files (correct) AND dumping the same 7 model lines into base config (wrong).

**Phantom models left in base config.** `inclusionai/ling-2.6-flash` and `anthropic/claude-opus-4.8` were in the stray block but had no profile file, were not in `models.md`, and were not in `settings.json`. The learning log said "Drop Ling 2.6 Flash" and "replace opus" but left them rotting in `config.toml`. Classic "the agent forgot, the repo didn't."

**Default-model contradiction.** `settings.json` → `z-ai/glm-5.2`; `config.toml` line 1 → `deepseek/deepseek-v4-pro`; `config.toml` tail (if lenient loader) → `anthropic/claude-fable-5` (the $10/$50 model). Three different defaults across two tools.

**DRY violation: registry triplicated.** The learning log claimed "centralized source of truth (`models.md`) + linked references." Reality: full table in `models.md` (source), full table reproduced in `~/.codex/AGENTS.md` (second authority), comment headers in each `*.config.toml` (third copy), and `bin/model-help` bash script re-rendering the comments into a table (fourth rendering). Four renderings of one truth.

**Bash-for-logic violation.** `bin/model-help` parsed TOML comments with regex in bash, against the global constitution ("no bash for logic where TypeScript is the implementation language"). Its output was identical to what `models.md` already is as a literal table.

**Naming-convention drift.** Global `~/.pi/agent/AGENTS.md` stated profiles use tier-only names (`workhorse`, `checker`, `ui`...) but actual files were model-based (`ds-v4pro-checker`, `kimi-k27-code-ui`). The codex `AGENTS.md` said "model-tier naming" in the same paragraph listing model-based names, self-contradicting.

**Dead alias layer (YAGNI).** `models.json` defined 8 short-name aliases (`glm`, `ds-pro`, `kimi`, `qwen`, `qwen-max`, `nemotron-free`, `gemma`). None referenced anywhere; all profiles and `config.toml` used full model IDs. Two aliased models (`qwen`, `gemma`) weren't even in `enabledModels`.

**Invalid reasoning efforts (NEW, not caught by prior session).** Live OpenRouter API exposes `reasoning.supported_efforts` per model:
- `deepseek/deepseek-v4-flash`: supported `["xhigh","high"]`. Prior session set `"low"` — INVALID, not in supported set.
- `nvidia/nemotron-3-ultra-550b-a55b:free`: supported `["high","medium"]`. Prior session set `"low"` — INVALID, not in supported set.

The prior session never verified effort values against the provider's actual supported set. Codex would have sent an unsupported effort, with undefined behavior (likely clamped or rejected) at the provider.

### Authority clarification (verified)

`settings.json` and `models.json` are separate concerns by design (pi `docs/settings.md` + `docs/models.md`):
- `settings.json` = runtime prefs + UI + behavior (`defaultModel`, `enabledModels`, `defaultThinkingLevel`, theme, compaction, retry, packages).
- `models.json` = custom provider/model registry + per-model overrides (`thinkingLevelMap`, `cost`, `contextWindow`, `compat`).

Cannot move `defaultModel`/`enabledModels` into `models.json`; schema does not support it. Since all used models are built-in OpenRouter models needing no overrides, `models.json` was pure dead config — deleted.

Codex equivalent (verified against codex docs + binary strings): three separate concerns, all correct by design — `config.toml` (base global), `<name>.config.toml` (profile overlay), `AGENTS.md` (instructions). Not redundant. The prior session's sin was dumping profile `model=` lines into base config, not the file separation itself.

### Reasoning effort levels (verified)

| Tool | Supported levels | Max | Source |
|---|---|---|---|
| pi | `off`, `minimal`, `low`, `medium`, `high`, `xhigh` | `xhigh` | README, `docs/settings.md`, `docs/models.md` |
| codex | `minimal`, `low`, `medium`, `high`, `xhigh` | `xhigh` | codex docs example uses `model_reasoning_effort = "xhigh"` |

User belief "codex max = high" was wrong. Both tools share the same level set and the same max (`xhigh`). pi handles unsupported levels gracefully via `thinkingLevelMap` (hides/clamps); codex does not, so codex profiles must use only provider-supported values.

---

## Decisions

1. **Delete stray block from base `config.toml`.** Removed lines 51-66 (7 duplicate `model=`/`model_reasoning_effort=` pairs + orphaned `[tui.model_availability_nux]` placement). Base config now holds only global concerns (provider, MCP, hooks, features, project trust).
2. **Set base `config.toml` default to `z-ai/glm-5.2` @ `xhigh`.** Matches `settings.json` default and the `glm-5-2-default` profile. Bare `codex` (no `-p`) now equals `codex -p glm-5-2-default`.
3. **Delete `~/.pi/agent/models.json`.** All 8 aliases unreferenced; all models are built-in. Recreate only when adding custom providers or per-model overrides.
4. **Delete `~/.pi/agent/bin/model-help`.** Bash reinvention of `models.md`. `models.md` is the table.
5. **Rename 7 codex profiles to `model-version-type` format** (kebab-case):
   - `workhorse` → `glm-5-2-default`
   - `ds-v4pro-checker` → `deepseek-4-pro-checker`
   - `ds-v4flash-docs` → `deepseek-4-flash-docs`
   - `kimi-k27-code-ui` → `kimi-k2-7-ui`
   - `nemotron-free` → `nemotron-3-free`
   - `gpt55-escalate` → `gpt-5-5-escalate`
   - `fable-final` → `claude-fable-5-final` (per user: keep "fable" in model segment)
6. **Set effort levels per OpenRouter `supported_efforts`:**
   - glm-5-2-default: `xhigh` (user request; open-weights primary, max reasoning for implementation)
   - deepseek-4-pro-checker: `xhigh` (user request; open-weights checker, max reasoning for verification)
   - deepseek-4-flash-docs: `high` (was invalid `low`; `high` is cheaper valid option, xhigh wasteful for docs)
   - kimi-k2-7-ui: `medium` (reasoning mandatory, effort param ignored)
   - nemotron-3-free: `medium` (was invalid `low`; `medium` is cheapest valid)
   - gpt-5-5-escalate: `high` (user request; paid frontier, high is sufficient)
   - claude-fable-5-final: `high` (user request; paid frontier, high is sufficient)
7. **Pi `defaultThinkingLevel`: `high` → `xhigh`.** Primary model glm-5.2 supports it.
8. **Replace inline table in `~/.codex/AGENTS.md` with pointer** to `~/.pi/agent/models.md`. Single authority for the model team.
9. **Update `~/.pi/agent/AGENTS.md` naming wording** to `model-version-type` with actual profile names.
10. **Leave absolute home paths in `config.toml` `[projects.*]` and `[hooks.state.*]`.** Codex binary enforces `path must resolve to an absolute path`; docs examples use `/Users/me/...`. The "no absolute home-dir paths" rule is for committed repo hygiene (`loopeng check` scans the repo), not local machine config files. Documented as deferred, not a defect.
11. **Fix doc rot in active research docs.** The prior session corrected data in some docs but left the same data stale in others, and left dead config references after the config was changed:
    - `docs/research/model-selection.md`: fixed numbering bug (two items numbered "2" in "Corrections to RESEARCH.md"); updated "Available but Not Assigned" section to reflect `models.json` deletion.
    - `docs/research/2026-07-04-frontier-model-selection.md`: fixed stale GLM cost ($0.91/$2.86 → $0.57/$1.80, which the prior session corrected elsewhere but left stale here); replaced dead `[profiles.X]` TOML examples with the per-file overlay format; updated profile filenames (`gpt55.config.toml` → `gpt-5-5-escalate.config.toml`); removed `models.json` reference.
    - `docs/research/2026-07-04-codex-headroom-setup.md`: replaced `[profiles.glm]`/`[profiles.deepseek]` old-format references with per-file overlay format description.
    - `docs/PROGRESS.md`: annotated superseded entries (models.json cleanup, old profile names, model-help script, naming rationale) with `*(Superseded 2026-07-05: ...)*` markers pointing to the new "Config Consistency Fix" entry. Added the new entry documenting all fixes.
    - `docs/NEXT_SESSION.md`: fixed stale audit gap that claimed `~/.pi/agent/AGENTS.md` was "NEVER CREATED" (it exists).
12. **Add frontier escalation models to pi `enabledModels`.** The prior session created codex profiles for `openai/gpt-5.5` and `anthropic/claude-fable-5` (escalation ladder) but never added them to pi's `enabledModels` (Ctrl+P cycling list). Result: the documented 7-model team was a 5-model team in pi. `models.md` listed all 7; pi only cycled 5. Added both to `enabledModels`; pi and codex now have identical 7-model sets.
13. **Strip profile comment headers (DRY fix, found in self-audit).** Each `~/.codex/*.config.toml` had `# Model:`, `# Tier:`, `# When:`, `# AA:`, `# Reasoning:` comment headers duplicating the `models.md` registry table. These headers existed only to feed the `model-help` bash script (deleted in fix 5). With no consumer, they were a second copy of the registry guaranteed to drift. Replaced with a 3-line pointer comment (profile name + pointer to `models.md`). Profile files now hold only `model` + `model_reasoning_effort` (the per-profile overrides), nothing else.
14. **Annotate unannotated `models.json` reference in PROGRESS.md (found in self-audit).** Line 152 (prior session's "Audit Fix" item 3) still said "Qwen in `models.json` overrides as available but not assigned" as if current. Added `*(Superseded 2026-07-05: ...)*` marker pointing to the Config Consistency Fix entry.

---

## Corrections

- Prior session's `models.md` claimed "centralized source of truth" but the table was duplicated in `codex AGENTS.md` and comment headers across 7 profile files. Now genuinely single-sourced: `models.md` is the only table; `AGENTS.md` files point to it; profile comments are minimal metadata not a rendered table.
- Prior session set `model_reasoning_effort = "low"` on `deepseek-v4-flash` and `nemotron-free` profiles. Both were invalid per OpenRouter `supported_efforts`. Corrected to `high` and `medium` respectively.
- Prior session's learning logs read as confident retrospectives but papered over the actual breakage: none noted that `config.toml` was invalid TOML, that two phantom models were left in it, that the default-model now contradicted `settings.json`, or that effort values were never validated against the provider. The verification step the constitution requires ("evidence before claims, run the command, read the output") was skipped for the config file itself.
- The "model-tier naming" convention was a local preference the prior session invented and elevated to a global rule in the same session, then implemented inconsistently (tier-only names in AGENTS.md prose vs model-based actual filenames). Now the convention is `model-version-type`, documented once in `models.md`, and the AGENTS.md prose matches the files.

---

## Verification (all passed)

5-pass audit run on final state, re-verifying every fix from scratch against live evidence (fresh OpenRouter API query, not cached).

| Pass | Scope | Result |
|---|---|---|
| 1 | TOML validity — every config file parses per spec (`tomllib`) | ALL VALID (base + 7 profiles) |
| 2 | Cross-tool consistency — pi `enabledModels` == codex profile models == `models.md` profiles; defaults consistent | ALL CONSISTENT (7=7=7; base default == pi default; base effort == pi thinking) |
| 3 | Effort values valid against live OpenRouter `reasoning.supported_efforts` (fresh API) | ALL VALID (6 validated; kimi has mandatory reasoning, effort ignored) |
| 4 | Doc consistency — no unannotated stale references in active docs | CLEAN (historical PROGRESS.md entries annotated with `*(Superseded ...)*` markers) |
| 5 | Engineering principles (SOLID/KISS/DRY/YAGNI) | DRY: profile headers stripped to pointer, single registry in `models.md`, 0 AGENTS.md inline tables. KISS: no bash logic (`bin/` = fd, rg only). YAGNI: `models.json` gone, `model-help` gone. SRP: base config holds global concerns only; profiles hold only `model` + `model_reasoning_effort`. |

## Why the `enabledModels` gap was missed (honest root cause)

The user caught that pi's `enabledModels` had 5 models while codex had 7. I had verified pi's `settings.json` parsed correctly and had the right `defaultModel`, but I never compared the model SETS across tools. My verification was per-file (does this file parse, does it have the right default) not cross-tool (do all tools agree on the team). This is the same class of error the prior session made: verifying local correctness without checking global consistency. The cross-tool consistency check (Pass 2) should have been in the original verification, not added after the user caught the gap.

## Why trust the rest of the fixes

The 5-pass audit above re-verifies every fix from scratch against live evidence, not against my prior claims. Specifically:
- Pass 1 re-parses every config file with `tomllib` (does not trust my edit claims).
- Pass 2 compares the actual model sets across pi, codex, and `models.md` (the check that was missing originally).
- Pass 3 re-queries the OpenRouter API live (fresh fetch, not the cached file from earlier in the session).
- Pass 4 greps the actual doc files for stale references.
- Pass 5 audits against SOLID/KISS/DRY/YAGNI explicitly and found (and fixed) a DRY violation in profile comment headers that I had carried forward from the prior session.

Two additional defects were found and fixed DURING this audit (decisions 13 and 14), which is evidence the audit is real, not a rubber stamp.

---

## Blog Candidates

- "The Agent Forgot, the Repo Didn't: Catching a Config That Looked Done" — how a learning log full of confident retrospectives hid an invalid TOML file and phantom models, and why verification must run commands not read prose.
- "Four Renderings of One Truth: A DRY Autopsy" — when "centralized registry" still triplicates data across docs, comments, and a bash renderer.
- "Validating Reasoning Efforts Against the Provider, Not Your Assumptions" — `model_reasoning_effort = "low"` was never in the model's `supported_efforts`; the silent failure mode of unverified config values.
- "settings.json vs models.json: Two Files, Two Jobs" — why pi's separation is correct by design, and when `models.json` is dead config.
- "Per-File Correct, Cross-Tool Wrong" — how I verified each config file parsed and had the right default, yet missed that pi had 5 models while codex had 7. Local correctness without global consistency is not verification. The cross-tool set comparison was the missing check.
- "The Audit That Found Its Own Bugs" — running a 5-pass audit on your own fixes is not theater; it caught a DRY violation in profile comment headers and an unannotated doc reference that the original fix pass missed.
