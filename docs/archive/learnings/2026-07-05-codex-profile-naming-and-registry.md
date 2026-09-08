# Codex Profile Naming + Model Registry Architecture

> **Date:** 2026-07-05
> **Session:** 2026-07-05T17:36Z (continued from model-selection audit)
> **Source:** First-principles analysis, OpenAI codex docs

## Findings

### Profile naming problem
Old profile names (`deepseek`, `glm`, `kimi`, `flash`, `nemotron`) encoded
**implementation detail** (which model) rather than **intent** (what it does).
Every profile name would break if you swap the model. The user can't reliably
remember 7 opaque names.

### Naming convention: `model-tier`
Format: `kebab-case-model-tier` where model = short identifier, tier = context.
The user remembers the tier (`workhorse`, `checker`, `escalate`) and the model
prefix (`glm52`, `ds-v4pro`). Each file has a structured comment header that
the `model-help` script parses.

### Model registry architecture
Pattern: **centralized source of truth** (`~/.pi/agent/models.md`) + **linked
references** (PI AGENTS.md links, CODEx AGENTS.md has a compact table). This
follows the same pattern as session learnings — the convention file lives
somewhere, the AGENTS.md says where to find it.

### User-facing help
Created `~/.pi/agent/bin/model-help` — a 40-line bash script that reads
profile TOML comment headers and outputs a formatted table. Not a full CLI
command, not a web UI. Just a script you run to see the team. KISS.

### Schemas used by codex for profiles
From codex docs (developers.openai.com/codex/config-advanced):
- Profile names: letters, numbers, hyphens, underscores
- Files: `~/.codex/<name>.config.toml`
- In codex 0.134.0+: `--profile` no longer reads `[profiles.<name>]` from config.toml
- TOML comments are preserved in files (no schema constraint against them)

## Decisions

1. **Rename all 7 codex profiles** to `model-tier` format
2. **Create `~/.pi/agent/models.md`** — central registry with full tables
3. **Create `~/.pi/agent/bin/model-help`** — lightweight table output
4. **Update `~/.codex/AGENTS.md`** — add model table (in "Context and stack")
5. **Update `~/.pi/agent/AGENTS.md`** — add one-line reference
6. **Profile comment format**: one `# Key: Value` line per field, with optional
   continuation lines for longer descriptions. Script parses first line only.
7. **Keep TOML comments** in profile files — they are the source the script reads.
   The registry (`models.md`) is the human-readable version.

## Corrections

- Old name `op` was a profile, but `opus` was never used with short name `op`.
  The original codex profiles used: `deepseek`, `glm`, `kimi`, `flash`,
  `nemotron`, `ling`, `opus`, `fable`. None of these were easily memorable.
- The user suggested `glm-5-2-high` format — but reasoning effort (`high`) is
  not part of the profile name because it's a dial you can tweak independently.
  The model + role is the important part; effort is a secondary concern.
- TOML comment parsing for continuation lines was a complexity trap. Simplified
  to first-line-only for "When" descriptions. Full text is in `models.md`.

## Blog Candidates

- "Why Your Codex Profiles Should Be Named After Their Purpose, Not Their Model"
- "The 40-Line Script That Solves 'What Model Does What'"
- "Centralized Model Registry for Solo-Developer DevEx Tools"
