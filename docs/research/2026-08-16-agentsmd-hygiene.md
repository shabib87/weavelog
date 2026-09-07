---
date: 2026-08-16
topic: "AGENTS.md hygiene — deterministic standards & drift prevention"
status: adopted
sources:
  - https://www.agentlint.app/blog/claude-md-best-practices-2026
  - https://www.agentlint.app
  - https://github.com/akz4ol/agentlint
  - https://github.com/mauhpr/agentlint
  - https://blog.codacy.com/introducing-agentlinter-codacy-now-scans-your-ai-agent-config-files
  - https://www.morphllm.com/agents-md-guide
  - https://medium.com/data-science-collective/claude-md-vs-agents-md-vs-skill-md-which-file-owns-what-in-2026-13859378f56a
  - https://www.emergentmind.com/topics/agents-md-files
  - https://kingy.ai/news/the-definitive-guide-to-agents-md-what-it-is-how-to-use-it-and-why-it-matters
  - https://blakecrosley.com/blog/agents-md-patterns
  - https://www.aihero.dev/a-complete-guide-to-agents-md
  - https://redreamality.com/blog/claude-md-agents-md-deep-dive
  - https://amattn.com/p/using_agentsmd_or_claudemd_to_counteract_agent_drift.html
  - https://www.buildcamp.io/guides/the-ultimate-guide-to-claudemd
  - https://packmind.com/context-engineering-ai-coding/context-engineering-best-practices
  - https://www.morphllm.com/cursor-rules-best-practices
  - https://www.iamraghuveer.com/posts/pre-commit-hooks-agentic-output-validation
  - https://arxiv.org/html/2512.18925v2
models_used_for_research: [z-ai/glm-5.2]
supersedes: none
---

# AGENTS.md hygiene — deterministic standards & drift prevention
- **Last verified**: 2026-08-16
- **Status**: current
- **Related**: [[2026-08-16-agentsmd-root-vs-subdirs]], [[2026-08-16-primitive-selection]]

## Sources
- [CLAUDE.md Best Practices, 2026 — AgentLint Blog](https://www.agentlint.app/blog/claude-md-best-practices-2026) — the eight-rule consensus (≤250 LOC, pair every rule with enforcement, capture decisions not behaviors).
- [AgentLint — Lint your agent harness](https://www.agentlint.app) — 58 deterministic checks across 6 dimensions (Findability/Instructions/Workability/Safety/Continuity/Harness); 40,000-char hard limit; auto-fix; every check cites a primary source.
- [akz4ol/agentlint (GitHub)](https://github.com/akz4ol/agentlint) — 20 security rules in 8 categories (EXEC/FS/NET/SEC/HOOK/INST/SCOPE/OBS) for agent config files; CI gate with SARIF output.
- [mauhpr/agentlint (GitHub)](https://github.com/mauhpr/agentlint) — 77 real-time rules across 8 packs; MCP server exposes `check_content` so agents pre-validate before writing.
- [Introducing AgentLinter — Codacy blog](https://blog.codacy.com/introducing-agentlinter-codacy-now-scans-your-ai-agent-config-files) — Codacy ships AgentLinter as part of its analysis toolset; detects instruction drift + secrets in CLAUDE.md/AGENTS.md/.cursorrules.
- [AGENTS.md Spec (2026) — Morph](https://www.morphllm.com/agents-md-guide) — format comparison table; Codex 32 KiB hard truncation; CLAUDE.md ~200-line recommendation; SKILL.md frontmatter schema.
- [CLAUDE.md vs AGENTS.md vs SKILL.md (2026) — Data Science Collective](https://medium.com/data-science-collective/claude-md-vs-agents-md-vs-skill-md-which-file-owns-what-in-2026-13859378f56a) — the three loading gates: always-on vs nearest-file vs description-triggered.
- [AGENTS.md Files: AI Agent Configuration — Emergent Mind](https://www.emergentmind.com/topics/agents-md-files) — empirical survey: median 335 words, mean 142 lines, shallow hierarchy (1×H1, 6–7×H2, ~9×H3); AGENTS.md cuts runtime 28.6% and tokens 16.6%.
- [The Definitive Guide to AGENTS.md — Kingy.ai](https://kingy.ai/news/the-definitive-guide-to-agents-md-what-it-is-how-to-use-it-and-why-it-matters) — adapter pattern (one canonical AGENTS.md, others symlink); anti-pattern: structured content in prose.
- [AGENTS.md Patterns — blakecrosley.com](https://blakecrosley.com/blog/agents-md-patterns) — command-first, task-organized, closure-defined; writing order: build/test → done → escalation → sections → scoping.
- [A Complete Guide To AGENTS.md — AI Hero](https://www.aihero.dev/a-complete-guide-to-agents-md) — "ball of mud" test; root = relevant to every task, separate file = one domain.
- [CLAUDE.md and AGENTS.md, In Depth — redreamality](https://redreamality.com/blog/claude-md-agents-md-deep-dive) — two-strikes rule; Auto Dream memory hygiene; versioned changelog header.
- [Using AGENTS.md to Counteract Agent Drift — amattn](https://amattn.com/p/using_agentsmd_or_claudemd_to_counteract_agent_drift.html) — position matters, specificity over vagueness, "must" not "should".
- [The Ultimate Guide to CLAUDE.md 2026 — Buildcamp](https://www.buildcamp.io/guides/the-ultimate-guide-to-claudemd) — "don't use CLAUDE.md as a linter"; hooks > instructions; ~40-line example.
- [Context Engineering Best Practices — Packmind](https://packmind.com/context-engineering-ai-coding/context-engineering-best-practices) — 400-token focused file beats 4,000-token sprawl; cross-file divergence is the insidious failure mode.
- [Cursor Rules Best Practices — Morph](https://www.morphllm.com/cursor-rules-best-practices) — keep rules <500 lines; reference files, don't copy them; specificity over vagueness.
- [Pre-Commit Hooks for Agentic Output Validation — iamraghuveer](https://www.iamraghuveer.com/posts/pre-commit-hooks-agentic-output-validation) — two-layer model: PostToolUse hook (session) + git pre-commit (commit gate); sub-2s rule.
- [Beyond the Prompt: An Empirical Study of Cursor Rules — arXiv 2512.18925](https://arxiv.org/html/2512.18925v2) — 374 repos, avg 462 lines, SD 1,197; convention category dominates at 0.84 prevalence.

## Findings

### What "hygienic" means in 2026

The 2026 consensus converges on six concrete properties, all machine-checkable:

1. **Size-bounded.** Anthropic's own guidance is ~200 lines; the AgentLint community bar is 250; Codex silently truncates at 32 KiB; AgentLint enforces a 40,000-char hard limit. Empirically, well-run files average 142 lines / 335 words (Emergent Mind survey, n = large). Every line competes for the agent's attention budget — files above the cap get skim-read by both humans and models.
2. **Single source of truth.** The "adapter pattern" (Kingy, Buildbetter, Keeborg): one canonical AGENTS.md, with CLAUDE.md / GEMINI.md / copilot-instructions.md symlinking or importing (`@AGENTS.md`) back to it. Manual cross-file maintenance is the documented failure mode — files "drift within a week."
3. **Command-first, closure-defined.** Effective files contain exact shell invocations (not descriptions) and explicit "done" criteria that are runnable checks (blakecrosley). Prose paragraphs, "be careful", and contradictory priorities reliably get ignored.
4. **Capture decisions, not behaviors.** "We use strict TS because of the Q3-2024 any cascade" is high-signal; "use strict TS" is low-signal because the agent can read tsconfig.json (AgentLint blog rule four). Restating what the codebase already declares burns the cacheable prefix.
5. **Shallow hierarchy.** Empirically: 1×H1, 6–7×H2, ~9×H3, H4 rare, H5+ absent (Emergent Mind). Deep nesting is anti-correlated with effectiveness.
6. **Every rule paired with enforcement.** A rule that lives only in AGENTS.md is a wish. The 2026 practice: each rule maps to a hook, CI check, linter rule, or an explicit "advisory only" tag. AGENTS.md alone gets 25–40% compliance; runtime hooks hit ~95% (gist comment thread).

### The three-layer ownership model (resolves duplication)

| Layer | Loading | What belongs |
|---|---|---|
| AGENTS.md / CLAUDE.md | always-on, every turn | universally applicable policy, build/test commands, definition of done, escalation |
| SKILL.md / .cursor/rules/*.mdc | on-demand (description-gated or glob-gated) | domain procedures, multi-step workflows, specialized knowledge |
| hooks / CI / linters | deterministic, non-LLM | anything that must be enforced regardless of model compliance |

The user's prior finding is correct and now reinforced by 2026 sources: **stable config belongs in files (linters/hooks), not prompts**. Restating rules in every prompt "poisons the cacheable prefix" — the 2026 framing is "a rule that lives only in CLAUDE.md is a wish."

### Named anti-patterns (2026 catalog)

From Kingy, blakecrosley, AI Hero, Tessl/pantheon-ai, and the Augment X post:

- **Ball of mud** — root AGENTS.md accumulates domain-specific rules that only apply to one task type. Test: "is this relevant to every single task?" If no, graduate to a separate file or skill.
- **Structured content in prose** — encoding tool access, MCP config, model selection in markdown paragraphs. Belongs in `SKILL.md` / `.agent.md` / `instructions.md`.
- **Copy-paste duplication** — same instruction maintained in AGENTS.md + CLAUDE.md + .cursorrules; drifts within a week. Fix: adapter pattern, single source.
- **Restating the codebase** — "use strict TS" when tsconfig already says so; "use Drizzle ORM" when imports show it. The agent reads code; restating wastes attention budget.
- **Using AGENTS.md as a linter** — style rules that a formatter (Biome/ESLint/Prettier) already enforce. Deterministic tools are "faster, cheaper, more reliable" (Buildcamp).
- **Welcome / explanatory prose** — "Welcome to...", "This document explains...". Banned by the pantheon-ai anti-patterns reference.
- **Vague directives** — "be careful", "write clean code", "should". Use "always/never/must" with concrete triggers (amattn).
- **No verification criteria** — rules without a "how the agent checks its own work" step.
- **Two-strikes violation** — Anthropic's rule: only write a CLAUDE.md rule on the second occurrence of the same error. Writing rules preemptively for hypothetical errors produces noise.
- **Instruction rot** — paths to renamed scripts, stale SDK versions, deprecated patterns left unmarked.

## Deterministic enforcement

This is the core of the user's question: how to keep AGENTS.md hygienic deterministically, not by willpower. The 2026 toolkit, in order of leverage:

### 1. Static linters (exist now, off-the-shelf)

- **AgentLint (`agentlint-ai` on npm)** — the most mature. 51 deterministic core checks across 6 weighted dimensions: Findability (20%), Instructions (15%), Workability (15%), Safety (15%), Continuity (15%), Harness (20%). Enforces a 40,000-char hard limit. Detects broken `@include` references, instruction rot over time, missing CI/hooks/.gitignore, unpinned Action SHAs. Outputs a score (NN/100) and a fix plan. Runs local-only by default (zero AI, zero data egress). GitHub Action available. Install: `npm install -g agentlint-ai`. Run: `agentlint check` or `/al` inside Claude Code.
- **akz4ol/agentlint** — supply-chain/security-focused. 20 rules across 8 categories (EXEC/FS/NET/SEC/HOOK/INST/SCOPE/OBS). Catches `curl|bash`, unscoped writes, `.git/` access, `$GITHUB_TOKEN` in configs, "ignore previous instructions", hidden hooks, scope widening. SARIF output for GitHub Code Scanning. Good complementary layer to the harness-quality AgentLint.
- **mauhpr/agentlint** — 77 runtime rules, runs in milliseconds locally. Ships an **MCP server** exposing `check_content(content, file_path)` so the agent pre-validates before writing, eliminating the block-retry loop. Supports Claude Code, Cursor, Kimi, Grok, Gemini, Codex. This is the closest thing to "agent self-lints its own config edits."
- **Codacy AgentLinter** — hosted/same engine as part of Codacy's analysis toolset; detects instruction drift + secrets across CLAUDE.md/AGENTS.md/.cursorrules/copilot-instructions.md.

### 2. Git pre-commit gate (the commit-time hard stop)

Wire AgentLint (or a custom checker) into `.pre-commit-config.yaml` so any edit to AGENTS.md/CLAUDE.md that violates a rule fails the commit. Two-layer model from iamraghuveer:

- **Layer 1 — PostToolUse hook** (during agent session): fires after every Write/Edit to config files; warns in-session so the agent self-corrects before commit.
- **Layer 2 — git pre-commit** (at commit time): validates staged config files; blocks hard if LOC > ceiling, broken `@include`, duplicate sections, secrets present.

Sub-2-second rule: anything slower belongs in CI, not pre-commit.

### 3. Custom deterministic checker (if off-the-shelf gaps exist)

Per the user's scripting standard (TypeScript + bun, `~/.agents/bin/`), a `agentsmd-check.ts` would enforce the user-specific rules no general linter covers. Concrete checks to implement:

| Check | Rule | Threshold |
|---|---|---|
| `loc` | total non-blank lines | ≤ 200 (warn), > 250 (fail) |
| `bytes` | file size | ≤ 32 KiB (Codex hard truncation boundary) |
| `hierarchy` | max heading depth | H4 fail, H5+ fail |
| `sections` | required H2 present | Build, Test, Done, Escalation |
| `duplication` | n-gram overlap between ~/.agents/AGENTS.md and ~/.config/opencode/AGENTS.md | > 30% identical lines → fail (force symlink or single source) |
| `advisory_tag` | rules without enforcement | any imperative ("must/always/never") not paired with a hook/linter/CI ref → warn |
| `no_prose_bloat` | welcome/explanatory phrases | "Welcome to", "This document explains", "You should" → fail |
| `no_restate` | lines restating tsconfig/biome.json/package.json | grep against config files; matches → warn |
| `changelog` | versioned header present | `## Changelog vYYYY-MM-DD` at head → required (redreamality) |
| `broken_includes` | `@path` references resolve | unresolved path → fail |
| `two_strikes` | rules added before second occurrence | advisory-only (cannot be deterministic; track via changelog) |

### 4. Drift-prevention mechanisms (the "keep it that way" part)

- **Changelog header** — `## Changelog v2026-08-16` at the file head lets the agent diff against the last session and notice rule changes (redreamality). Cheap, high-signal.
- **Auto Dream / periodic rewriter** — a scheduled job that rewrites relative time anchors ("yesterday's deploy") to absolute dates and prunes rules older than N months without a trigger hit. The user's harness already has a conductor pattern; this fits as a recurring subagent task.
- **CI gate on PRs touching config** — `paths: [".claude/", ".cursorrules", "CLAUDE.md", "AGENTS.md"]` triggers `agentlint check --ci` (akz4ol's documented workflow). Findings appear as PR annotations via SARIF.
- **Score trend tracking** — AgentLint's NN/100 score is commit-able to a JSON manifest; plot drift over time. Downward trend triggers a hygiene review subagent.
- **Symlink enforcement** — pre-commit hook that fails if `~/.config/opencode/AGENTS.md` is a regular file (not a symlink) pointing at `~/.agents/AGENTS.md`. Kills copy-paste drift mechanically.

## Recommendations for THIS user

Prioritized against the user's evidence: organic-grown AGENTS.md pair, restating habit, conductor harness with model ladder.

1. **Collapse the two-file pair to one source.** `~/.agents/AGENTS.md` is canonical; replace `~/.config/opencode/AGENTS.md` with a symlink. Add a pre-commit (or a `~/.agents/bin/agentsmd-check.ts` invoked by the conductor) that fails if the opencode path is a regular file. This single change eliminates the user's duplication class mechanically. Evidence: Kingy/Morph/Keeborg all name the adapter pattern as the #1 anti-drift mechanism.

2. **Install AgentLint as the deterministic gate.** `npm install -g agentlint-ai`; run `agentlint check` in pre-commit and CI on the `paths: ["AGENTS.md", "CLAUDE.md"]` trigger. Start with the 51 core checks; the 40,000-char limit and broken-`@include` detection alone cover the user's "organic growth" failure mode. Add the 6-dimension score to the user's report/manifest pattern so drift is observable. If the user wants agent self-linting, add mauhpr/agentlint's MCP `check_content` so subagents pre-validate config edits before writing.

3. **Write `agentsmd-check.ts` for the user-specific rules no general linter covers.** Per the user's scripting standard (bun, biome, `--help`, exit codes, tests under `bun test`). The four highest-value custom checks: (a) LOC ≤ 200 warn / 250 fail, (b) duplication > 30% between the two paths → fail, (c) any "must/always/never" not paired with an enforcement ref → warn, (d) changelog header present. Ship with happy + unhappy path tests (the user's test guardrails already mandate this).

4. **Kill the restating habit structurally, not by willpower.** The user restates AGENTS.md rules in every prompt. Two mechanical fixes: (a) add an advisory-tag discipline to AGENTS.md itself — mark every rule `[advisory]` or `[enforced:hook X]` so the conductor knows which rules are already backed by a hook and need no restatement; (b) add a `no_restate` check to `agentsmd-check.ts` that greps AGENTS.md lines against tsconfig/biome.json/package.json and warns on overlaps. The principle (from the prior session, now 2026-confirmed): stable config belongs in files, not prompts; restating poisons the cacheable prefix.

5. **Apply the two-strikes rule going forward.** Stop adding rules preemptively. Only graduate a behavior into AGENTS.md on the second occurrence of the same agent error. This is Anthropic's own documented rule and directly addresses organic growth — it caps the rate of addition.

6. **Add a scheduled hygiene subagent.** The user's harness already has scout/explore/reviewer/plan-reviewer/general subagent types. Add a recurring (weekly) task: run `agentlint check` + `agentsmd-check.ts`, write the score to a manifest, and if score dropped or LOC crossed 250, dispatch a reviewer subagent to propose graduations (rule → skill, rule → hook, rule → deletion). This is the "keep it that way" loop — deterministic detection + bounded human gate.

## Open questions / next steps
- Does AgentLint's 40,000-char limit / 6-dimension score cover the user's duplication-between-two-paths check, or does `agentsmd-check.ts` need to own that? (Verify by running `agentlint check` on the current pair.)
- Should the scheduled hygiene subagent run as a scout (cheap, flash model) or a reviewer (qwen)? Hypothesis: scout for the lint pass, reviewer only on score-drop.
- Is the 200-line ceiling right for this user's harness, or does the conductor+model-ladder context warrant a higher cap? Empirical test: measure AgentLint score at 150/200/250 LOC variants.
- Map every current rule in `~/.agents/AGENTS.md` to `[advisory]` vs `[enforced:X]` — this is the one-time audit that seeds the ongoing deterministic check.
