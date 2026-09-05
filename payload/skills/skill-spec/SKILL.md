---
name: skill-spec
description: >-
  Use when creating or reviewing Agent Skills, auditing SKILL.md for
  agentskills.io compliance, debugging discovery or trigger behavior, reviewing
  skill PRs, or fixing malformed YAML frontmatter. Enforces spec conventions:
  frontmatter and name rules, package directory layout, progressive disclosure,
  description quality, and script patterns. Pair with
  client-specific scaffolding (e.g. Cursor create-skill, Claude Code plugins) where
  you use them; on spec details, follow this skill. Also use when a skill fails
  to activate and you need a structured compliance pass.
metadata:
  author: github:@shabib87
  version: "1.0.0"
  spec-url: "https://agentskills.io/specification"
---
upstream: contract-discipline + collision-eval sections distilled from addyosmani/agent-skills (MIT — © 2025 Addy Osmani) @ 1c760d6; core spec harness-original (author github:@shabib87)

# Agent Skills Open Standard

Spec reviewed as of 2026-08-16. For the current spec, check [llms.txt](https://agentskills.io/llms.txt).

**What this skill is.** Spec-backed checklist and review playbook for any skill directory against the [agentskills.io specification](https://agentskills.io/specification). (Activation cues sit in the YAML `description` above.)

**Non-goals:** Not a substitute for domain skills (CI/CD, data pipelines, presentation tooling, etc.). Use alongside **client-specific** scaffolding (for example Cursor `create-skill` or Claude Code plugin workflows) when those apply; when they conflict with **spec** details, **this skill takes precedence** (it tracks the upstream spec).

## Review tracks

- **(A) Spec compliance (default):** Required spec artifacts and layout. Follow **Review workflow** and the **Compliance Checklist** at the end.
- **(B) Description / trigger tuning (optional):** When activation is wrong or too narrow, read [references/description-optimization.md](references/description-optimization.md). Separate from structural spec review; not required on every pass.

## Review workflow (ordered)

1. Confirm the parent directory name matches YAML `name` (see [Name Validation Rules](#name-validation-rules)).
2. Run `skills-ref validate ./skill-name` when the CLI is available ([Validation](#validation)).
3. Check frontmatter: required `name` and `description`; optional fields within spec limits ([Spec-Compliant Frontmatter](#spec-compliant-frontmatter)).
4. Check **SKILL.md** body size and structure ([Progressive Disclosure](#progressive-disclosure)): keep under 500 lines and under 5000 tokens; push depth into `references/`.
5. Verify file references are **relative** to the skill root and **one level deep** from `SKILL.md` ([Directory Structure](#directory-structure)).
6. If the skill has `scripts/`, apply [Script Design](#script-design).
7. **If needed** for wrong or missing activation: use track **(B)** via [references/description-optimization.md](references/description-optimization.md).
8. Sign off with the **Compliance Checklist** (all applicable rows).

## Spec-Compliant Frontmatter

All six fields defined by the specification:

| Field | Required | Constraints |
|-------|----------|-------------|
| `name` | Yes | Max 64 chars. Lowercase `a-z`, digits, hyphens only. No start/end hyphen. No consecutive hyphens. **Must match parent directory name.** |
| `description` | Yes | Max 1024 chars, non-empty. Must describe WHAT the skill does AND WHEN to use it. |
| `license` | No | Short license name or reference to bundled file. |
| `compatibility` | No | Max 500 chars. Environment requirements (runtime, tools, platform). Most skills do not need this field. |
| `metadata` | No | Map of string keys to string values. Use unique key names. |
| `allowed-tools` | No | Space-delimited pre-approved tools list. Experimental. |

Full example:

```yaml
---
name: data-pipeline
description: >-
  Build and validate ETL pipelines for PostgreSQL data warehouses. Use when
  the user needs to create, debug, or optimize data pipelines, transform
  schemas, or troubleshoot warehouse ingestion failures.
license: Apache-2.0 (from v0.1.0; MIT pre-v0.1.0)
compatibility: Requires Python 3.12+ and uv
metadata:
  author: data-team
  version: "1.0.0"
allowed-tools: Bash(psql:*) Bash(uv:*) Read
---
```

## Name Validation Rules

All five constraints must pass:

- 1-64 characters
- Only lowercase letters (`a-z`), digits, and hyphens (`-`)
- Must NOT start or end with a hyphen
- Must NOT contain consecutive hyphens (`--`)
- Must EXACTLY match the parent directory name

```yaml
# Valid
name: pdf-processing
name: data-analysis
name: code-review

# Invalid
name: PDF-Processing    # uppercase
name: -pdf              # starts with hyphen
name: pdf--processing   # consecutive hyphens
name: my_skill          # underscores not allowed
```

## Directory Structure

Canonical layout per the spec:

```
skill-name/
├── SKILL.md          # Required: metadata + instructions
├── scripts/          # Optional: executable code
├── references/       # Optional: documentation
├── assets/           # Optional: templates, schemas, data files
└── evals/            # Optional: behavioral QA (see Optional behavioral QA section)
    └── evals.json
```

Key rules:
- File references from SKILL.md use **relative paths** from skill root
- Keep references **one level deep** from SKILL.md (no nested chains)
- The spec standard is `references/` (directory, plural), not `reference.md`
- `scripts/` for executable code, `assets/` for static resources

For a starter skeleton, see [references/skill-template.md](references/skill-template.md).

## Progressive Disclosure

Three-tier loading strategy with token budgets:

| Tier | Loaded | When | Budget |
|------|--------|------|--------|
| 1. Catalog | `name` + `description` | Session start | ~100 tokens/skill |
| 2. Instructions | Full SKILL.md body | Skill activated | **under 5000 tokens** |
| 3. Resources | scripts/, references/, assets/ | On demand | Varies |

Rules:
- SKILL.md body: **under 500 lines, under 5000 tokens**
- Move detailed material to `references/` files
- Tell the agent **when** to load each reference: "Read `references/api-errors.md` if the API returns a non-200 status" -- not just "see references/ for details"

## Discovery and install paths (out of scope)

**Not part of this review.** The [specification](https://agentskills.io/specification) defines the **skill package** (`SKILL.md`, optional `scripts/`, `references/`, `assets/`). Where that folder lives on disk (user dir, project dir, symlinks, vendor defaults) is agent-product and team policy, not a spec pass/fail criterion. Do not score, require, or "fix" install location. If the user asks how a client discovers skills, answer from that product's docs or [agentskills.io](https://agentskills.io/), not from this checklist.

## Portable spec vs Cursor / Claude Code extensions

The [agentskills.io specification](https://agentskills.io/specification) defines the **portable** core (`name`, `description`, optional `license`, `compatibility`, `metadata`, `allowed-tools`). Clients add keys and behaviors on top:

- **[Cursor Agent Skills](https://cursor.com/docs/context/skills):** Folder + `SKILL.md`; optional `disable-model-invocation` (when `true`, only explicit `/skill-name`, no automatic agent load). Cursor discovers project and user skill directories. **[Rules](https://cursor.com/docs/context/rules)** are separate: system-level instructions vs packaged skills.
- **[Claude Code skills](https://docs.anthropic.com/en/docs/claude-code/skills):** Extends the spec with invocation controls (`disable-model-invocation`, `user-invocable`), optional YAML `name` (directory name used if omitted), and extra frontmatter (`when_to_use`, `paths`). For **portable** skills, still include **`name`** and **`description`** so validators and all targeted clients stay satisfied.

**Dual-client authoring:** Keep **portable** instructions (relative paths, `compatibility` for runtime deps) in the shared package. Put **vendor-specific** UX only in labeled callouts or `references/` loaded on demand — not in a `compatibility` line that implies a single product. Prefer [agentskills.io](https://agentskills.io/specification) wording when behavior must be identical everywhere. Flag vendor-only frontmatter when reviewing: portable layout and spec fields first, then client extensions for the target runtime.

## Multi-agent and orchestration

Child threads may not inherit loaded skills. When dispatching a reviewer, include the skill path and review steps in the subagent prompt.

## Description Quality

The description is the **primary signal** for whether an agent loads a skill; it should match task intent and keywords ([spec](https://agentskills.io/specification#description-field)). Even strong descriptions may not activate for trivial one-step tasks (see [optimizing descriptions](https://agentskills.io/skill-creation/optimizing-descriptions)).

Rules:
- **Imperative phrasing**: "Use when..." not "This skill helps..."
- **Focus on user intent**, not implementation mechanics
- **Be pushy**: explicitly list contexts, including non-obvious ones
- **Include keywords** the agent matches against
- **Under 1024 characters**
- **WHAT + WHEN**: capabilities AND trigger scenarios

```yaml
# Poor
description: Process CSV files.

# Good
description: >-
  Analyze CSV and tabular data files -- compute summary statistics,
  add derived columns, generate charts, and clean messy data. Use this
  skill when the user has a CSV, TSV, or Excel file and wants to
  explore, transform, or visualize the data, even if they don't
  explicitly mention "CSV" or "analysis."
```

Read [references/description-optimization.md](references/description-optimization.md) when optimizing a description for trigger accuracy or setting up trigger eval queries.

## Best Practice Patterns

From the spec authors at agentskills.io:

- **Gotchas are the highest-value content.** Concrete, non-obvious facts that defy reasonable assumptions. Keep in SKILL.md where the agent reads them before encountering the situation. When an agent makes a correctable mistake, add it to gotchas.
- **Defaults, not menus.** Pick one default tool or approach. Mention alternatives briefly. Never present equal options without a recommendation.
- **Procedures over declarations.** Teach HOW to approach a class of problems, not WHAT to produce for one instance.
- **Plan-validate-execute.** For batch or destructive operations: create an intermediate plan in a structured format, validate against the source of truth, execute only after validation passes.
- **Start from real expertise.** Extract skills from hands-on work — runbooks, code reviews, incident reports, real conversations. Not from generic LLM-generated content.
- **Refine with real execution.** Run the skill against real tasks and review execution traces, not just outputs. One iteration noticeably improves quality.
- **Add what the agent lacks.** Challenge each instruction: "Would the agent get this wrong without it?" If no, cut it. If unsure, test it.

## Contract Discipline (harness-local)

Interfaces are contracts. Every observable behavior becomes a de facto commitment once another agent, skill, or tool depends on it (Hyrum's Law) — including error messages, ordering, and undocumented quirks. Applied to the three contract surfaces this playbook reviews:

- **Skill frontmatter**: `name` and `description` are the skill's public API. The description is the trigger contract — every promise it makes (WHAT + WHEN) is what agents load on; changing its wording without re-running trigger evals is a breaking change. Renaming a skill mid-catalog is a breaking change: update name, directory, and every cross-reference in one commit.
- **MCP tool schemas**: tool names, parameter shapes, and error codes are contracts consumed by agents at runtime. Define the schema before implementing; validate at the boundary; use one consistent error strategy (structured `{code, message, details}`); never return different shapes depending on conditions; treat third-party responses as untrusted and validate their shape.
- **CLI contracts**: `--help` text, flag names, exit codes, and stdout/stderr discipline (see [Script Design](#script-design) — referenced, not duplicated here). Distinct non-zero exit codes per failure class; stable flag semantics; extend additively.

Rules:
- **Contract first**: define the interface before the implementation; the contract is the spec.
- **Validate at boundaries**: trust internal code; validate at system edges (external input, env vars, third-party responses). Do NOT scatter validation through internal calls that share typed contracts.
- **Consistent error semantics**: pick one error strategy and use it everywhere; don't mix throw / null / `{error}` returns in one contract.
- **Prefer addition over modification**: extend interfaces additively (new optional fields, new flags) rather than changing or removing existing ones — consumers depend on current behavior.
- **Plan deprecation at design time**: every public surface will eventually need retirement; make removal a deliberate, documented migration.

<!-- Contract-discipline section adapted from addyosmani/agent-skills api-and-interface-design (MIT — © 2025 Addy Osmani), https://github.com/addyosmani/agent-skills @ 1c760d6. -->

## Description-Collision Eval Policy (harness-local)

The catalog is discovered by description matching; near-identical descriptions split routing nondeterministically between skills. Run this policy at skill-add time:

- **Pairwise description similarity**: compare the new description against every catalog description (shared-token / Jaccard ratio over the trigger vocabulary). Treat >0.6 token overlap as a collision requiring distinct trigger framing.
- **Trigger examples**: every new description must carry 3 positive trigger examples (phrases an agent would actually say) that match it, and 2 negative (near-miss phrases that must NOT route to it) — checked against the existing catalog so a negative for one skill is not a positive for another.

Collision resolution: sharpen WHEN (trigger conditions), not WHAT (capabilities); if two skills still collide after reframing, fold them. This policy is harness-local — the upstream spec does not mandate it; harness vocabulary in descriptions is "Use-when / Do-NOT-use".

<!-- Description-collision eval policy adapted from addyosmani/agent-skills using-agent-skills evals (MIT — © 2025 Addy Osmani), https://github.com/addyosmani/agent-skills @ 1c760d6. -->

## Gotchas

- **`create-skill` coexistence (Cursor)**: Both skills may activate together. This skill takes precedence on spec compliance (e.g., `references/` vs `reference.md`, all frontmatter fields). Follow `create-skill` for Cursor-only workflow steps (AskQuestion, phase-based creation).
- **Name-directory mismatch**: The `name` field must match the parent directory name exactly. Renaming a directory without updating frontmatter (or vice versa) silently breaks discovery.
- **YAML colon trap**: Description values containing colons need quoting or block scalar syntax. `description: Use when: the user asks...` is invalid YAML. Use `>-` block scalar or quote the value.
- **`references/` not `reference.md`**: The spec-standard directory name is plural (`references/`). The older singular-file pattern from `create-skill` is not spec-aligned.
- **Token budget scope**: The under-5000-token budget applies to the SKILL.md body only (after frontmatter). Frontmatter is parsed separately and costs ~100 tokens in the catalog.
- **Install path ≠ spec**: See [Discovery and install paths (out of scope)](#discovery-and-install-paths-out-of-scope). `name` must still match the skill’s **parent directory name** (the folder that contains `SKILL.md`), wherever that folder lives.

## Script Design

Aligned with [Using scripts in skills](https://agentskills.io/skill-creation/using-scripts) (see also spec [File references](https://agentskills.io/specification#file-references)).

**One-off commands vs `scripts/`**: Use a short pinned command to an existing tool when a few flags suffice; state prerequisites in `compatibility` or the body. The spec documents six runners with caveats: `uvx`, `pipx`, `npx`, `bunx`, `deno run`, `go run` — pin versions on all of them. Move work into `scripts/` when the invocation is error-prone, needs tests, or repeats across workflows.

**Self-contained scripts**: the spec documents inline dependency declarations so a script carries its own dependencies — Python PEP 723 headers run with `uv run scripts/x.py` (recommended), Deno `npm:`/`jsr:` specifiers, Bun auto-install, Ruby `bundler/inline`.

**Paths in command examples**: Reference bundled files with paths **relative to the skill root** (agent runs from there), e.g. `bash scripts/validate.sh`, `python3 scripts/process.py`. The same rule applies in `references/*.md` for runnable snippets.

**Implementation language (spec-neutral):** The spec is language-neutral. Any language is allowed if **`compatibility`** states prerequisites and examples use **paths relative to the skill root** ([using scripts](https://agentskills.io/skill-creation/using-scripts)). For script authoring recommendations, see [references/script-patterns.md](references/script-patterns.md).

**Rules for code in `scripts/`**:

- **No interactive prompts** -- hard requirement; agents cannot respond to TTY input
- **`--help`** -- primary way agents learn the interface; document **meaningful exit codes** there (distinct non-zero codes per failure class: not found, invalid args, auth, etc.)
- **Helpful error messages** -- what went wrong, what was expected, what to try
- **stdout vs stderr** -- structured, machine-readable output (JSON, CSV, TSV) on **stdout**; progress, warnings, and human-readable notes on **stderr** so pipelines and parsing stay clean
- **Output size** -- many harnesses truncate long tool output; default to summaries or safe limits; support pagination flags (e.g. `--offset` / `--limit`) or **`--output` / `-`** so large streams are explicit, per upstream guidance
- **Idempotent** -- agents may retry; "create if not exists" over "create and fail"
- **Input constraints** -- reject ambiguous input; prefer enums and closed sets over free text
- **Safe defaults** -- destructive or stateful operations require explicit `--confirm`/`--force` flags
- **`--dry-run`** for destructive or stateful operations when preview helps
- **Pin dependency versions** for reproducibility

**Static analysis (e.g. Semgrep) is org policy, not spec.** [agentskills.io](https://agentskills.io/specification) does not require any particular linter. If your org requires Semgrep on committed code, treat `scripts/**` like any other code: run the project or security team's ruleset in CI or before merge. The script rules above govern **format and agent-runtime** behavior; Semgrep is a separate gate layered on when applicable.

Read [references/script-patterns.md](references/script-patterns.md) for one-off runners (uvx, npx, etc.), inline dependencies, and fuller patterns.

## Optional behavioral QA (`evals/evals.json`)

**Not required for create or review.** The [specification](https://agentskills.io/specification) requires **`SKILL.md`** and allows optional `scripts/`, `references/`, and `assets/`. An `evals/` directory and `evals/evals.json` are **not** spec artifacts, and this playbook does not treat them as part of completion or review sign-off. Upstream describes **optional** behavioral regression testing in [Evaluating skill output quality](https://agentskills.io/skill-creation/evaluating-skills); if you opt in, use [references/evaluation-framework.md](references/evaluation-framework.md). Otherwise skip.

## agentskills.io quick links

Prefer the index in [llms.txt](https://agentskills.io/llms.txt) if URLs change. Key pages: [Specification](https://agentskills.io/specification), [Quickstart](https://agentskills.io/skill-creation/quickstart), [Best practices](https://agentskills.io/skill-creation/best-practices), [Optimizing descriptions](https://agentskills.io/skill-creation/optimizing-descriptions), [Evaluating skills](https://agentskills.io/skill-creation/evaluating-skills) (optional QA), [Using scripts](https://agentskills.io/skill-creation/using-scripts).

## Validation

Use the skills-ref library to validate frontmatter and naming:

```bash
skills-ref validate ./my-skill
```

From this skill’s root you can also run **`npm run validate`** (uses `npx skills-ref validate .`).

Source: https://github.com/agentskills/agentskills/tree/main/skills-ref

## Compliance Checklist

Before considering a skill complete **under this playbook** (spec compliance + applicable rows below), verify all applicable items.

**Frontmatter**
- [ ] `name` passes all 5 validation rules
- [ ] `name` matches parent directory name exactly
- [ ] `description` is 1-1024 characters with WHAT + WHEN
- [ ] `description` uses imperative phrasing
- [ ] Optional fields (`license`, `compatibility`, `metadata`, `allowed-tools`) used when applicable; omit unused optional keys

**Structure**
- [ ] SKILL.md body under 500 lines and under 5000 tokens
- [ ] File references use relative paths from skill root
- [ ] References one level deep (no nested chains)
- [ ] Directories follow spec names: `references/`, `scripts/`, `assets/`
- [ ] Checklist sign-off does not depend on `evals/` (optional QA only; see [Optional behavioral QA](#optional-behavioral-qa-evalsevalsjson))

**Content**
- [ ] Instructions focus on what agent does not already know
- [ ] Gotchas section for non-obvious facts (if applicable)
- [ ] Defaults provided, not menus of equal options
- [ ] Examples are concrete and realistic
- [ ] No time-sensitive information
- [ ] Consistent terminology throughout
- [ ] Grounded in real expertise, not generic guidance

**Portability (if the author cares about multi-client use)**
- [ ] Portable core in frontmatter: at minimum **`name`** and **`description`** per spec; client-only YAML justified or called out ([Portable spec vs Cursor / Claude Code extensions](#portable-spec-vs-cursor--claude-code-extensions))
- [ ] `compatibility` field set when platform-specific tools, runtimes, or keys matter
- [ ] No platform-specific tool names in examples without alternatives or a clear scope note

**Scripts (if applicable)**
- [ ] One-off commands are simple and pinned; complex or repeated logic lives under `scripts/`
- [ ] Runnable examples use paths relative to skill root (e.g. `scripts/...`)
- [ ] Language and **how to run** are clear (`compatibility` and/or body); TS-authored skills should document **`node scripts/*.mjs`** (or equivalent) for the portable runtime path
- [ ] Org / repo policy: static analysis (e.g. Semgrep) satisfied for `scripts/` **if** your standards require it (not an agentskills.io requirement)
- [ ] No interactive prompts
- [ ] `--help` implemented; exit codes documented and meaningful per failure type
- [ ] Structured data on stdout; diagnostics on stderr
- [ ] Output size controlled (summary/limit defaults; pagination or explicit `--output`/`-` for large results)
- [ ] Idempotent operations
- [ ] Dependencies pinned with versions
- [ ] `--dry-run` for destructive operations where appropriate
