---
date: 2026-09-03
topic: "Lean adoption evaluation: addyosmani/agent-skills + DietrichGebert/ponytail — final skill/agent evaluation set, 25-skill disposition, steal list, attribution policy"
status: complete
sources:
  - "https://github.com/addyosmani/agent-skills"
  - "https://github.com/DietrichGebert/ponytail"
  - "https://github.com/obra/superpowers"
---

# Agent-skills + ponytail adoption — decision record

Two upstream skill packs evaluated across 3 review rounds (addyosmani: qwen/deepseek/kimi/glm;
ponytail: qwen/deepseek/kimi) plus a SOLID/KISS/DRY/YAGNI pass. Outcome: distill-only into
existing SSOTs — zero new catalog skills, zero forks, zero always-on injection.

## addyosmani/agent-skills — 25-skill disposition table

Upstream @ `1c760d643497e9da289300e5eb2f5aca861503f7` (MIT — © 2025 Addy Osmani), verified 2026-09-02/03.

| Upstream skill | Disposition | Reason (one line) |
|---|---|---|
| code-review-and-quality | DISTILL → config/prompts/reviewer.md | gives-review depth gap; severity mapped onto [blocker\|major\|minor]; verdicts stay with verify-with-criteria |
| code-simplification | FOLD → reviewer.md paragraph | Chesterton's Fence + preserve-behavior + Rule of 500; standalone slot unjustified (thin, trigger collision) |
| security-and-hardening | DISTILL → config/agents/security.md | keep LLM-security (prompt injection, untrusted output, tool scoping), secrets, supply-chain; web boilerplate cut |
| api-and-interface-design | DISTILL → skills/skill-spec | harness products ARE interfaces (skill frontmatter, MCP schemas, CLI contracts); REST depth cut |
| documentation-and-adrs | META-STEAL → none | adr/README.md already ships Nygard template; diff-for-gaps only if one bites |
| doubt-driven-development | META-STEAL → conductor discipline | CLAIM→EXTRACT→DOUBT→RECONCILE→STOP loop; loop spine in dispatch discipline, adversarial framing in reviewer.md; cross-model escalation already owned by 4-family roster |
| interview-me | REJECT | trigger literally "grill me" — direct collision with grilling |
| test-driven-development | REJECT | superpowers port kept (pressure-tested, harness-adapted) |
| debugging-and-error-recovery | REJECT | systematic-debugging (superpowers port) kept |
| spec-driven-development | REJECT | backlog SSOT + conductor-owned plans |
| planning-and-task-breakdown | REJECT | backlog SSOT + plans |
| constraint-driven-development | REJECT | AGENT-STACK-RUNBOOK.md IS the standing quality bar; silencing-detection lives in reviewer.md test-guardrail audit |
| git-workflow-and-versioning | REJECT | worktree-discipline + runbook own this |
| incremental-implementation | REJECT | implementer + TDD flow |
| source-driven-development | REJECT | context7 MCP mandate already enforced |
| idea-refine | REJECT | grilling / wayfinder / prototype cover it |
| context-engineering | REJECT (steal-only note) | compaction tooling exists; nothing stolen |
| browser-testing-with-devtools | REJECT | no web product |
| frontend-ui-engineering | REJECT | no web product |
| performance-optimization | REJECT | no web product |
| using-agent-skills | REJECT (router) + META-STEAL (eval practice) | installing the router is the one move that breaks conductor routing; its description-collision eval practice is distilled into skill-spec |
| ci-cd-and-automation | REJECT | Ship cluster; no CI pipeline for a personal harness |
| shipping-and-launch | REJECT | Ship cluster |
| deprecation-and-migration | REJECT | no deprecation event; revisit when one exists |
| observability-and-instrumentation | REJECT (optional steal note) | structured-logging discipline = optional future steal; RED/OTel not applicable |

## DietrichGebert/ponytail — steal verdicts

Upstream @ `974d940a1c5344210874150b98ff0d2c861fab6a` (MIT — © 2026 DietrichGebert).

| Technique | Verdict | Where |
|---|---|---|
| YAGNI 7-rung decision ladder + never-cut carve-out | ADOPT | config/agents/implementer.md paragraph |
| Canary invariants (phrase-level asserts where byte-compare impossible) | ADOPT | bin/test/canary-invariants.test.ts |
| promptfoo behavioral-eval harness (arms + metric-tagged asserts) | DEFER | TASK-42, trigger = first behavioral regression static evals miss |
| Byte-compare drift checker | REJECT | config-sync sha256 manifest already is that layer |
| Always-on plugin injection | REJECT | second always-on voice vs AGENTS.md single-source |
| Mode levels (lite/full/ultra/off) | REJECT | modulates an injection that does not exist here; on-demand skills are the intensity dial |
| Config layering (env > file > default) | REJECT | runtime precedence undermines tracked-config SSOT determinism |
| Subagent matcher regex scoping | REJECT | per-agent prompts are authored in config/agents/*.md by construction |
| provides_* declarative manifest | REJECT | harnesses/opencode.json + SKILL.md frontmatter already inventory |
| Parameterized hooks template | REJECT | single host; hooks are materialized TS |
| Uninstall/state-cleanup script | REJECT | no uninstall consumer; manifest-listed state |

## Attribution policy

- Everything taken is MIT (superpowers, mattpocock/skills, agent-skills, ponytail) — verified 2026-09.
- Skill ports: frontmatter `MIT — ported from <owner>/<repo> (© <year> <owner>), adapted to harness vocabulary <date>; see LICENSE`.
- Technique/script steals: file-header comment `adapted from <owner>/<repo> (MIT © <year> <owner>) <path>, <URL> @ <sha>` — SHA-pinned (both upstreams push frequently).
- Full MIT notice only for verbatim code copies (none so far); LICENSE at repo root added 2026-09-03 with third-party attribution section.

- **Umbrella name:** the mixed-provenance skill set is named **Agent-Stack Skills (AS-skillset)**.
  FINAL naming decision (supersedes the initial no-rename approach rejected by human kick-back #2):
  the `as-` prefix marks the ported/distilled set (as-tdd, as-systematic-debugging, as-code-review,
  as-writing-skills, as-grilling, as-wayfinder, as-prototype, as-domain-modeling,
  as-content-research-writer); harness-original skills carry clean names (in-my-voice, prompt-triage,
  remove-ai-slop, simplify-language, skill-spec, tool-selection-rubric, verify-with-criteria,
  binary-doc-conversion); symlinked third-party skills keep upstream names (diagram-design) or are
  app-installed and unversioned (tldraw-offline). Provenance lives in `skills/README.md` (lineage
  table) + per-skill `upstream:` frontmatter.
- **Artifact-write convention:** every script writes generated artifacts under gitignored
  `~/.agents/state/<script>/` (stack-check → `state/stack-check/`, mdconvert →
  `state/mdconvert/converted/`); `.gitignore` covers `state/` + `reports/` wholesale; the
  scripting standard in `bin/AGENTS.md` states the rule so new scripts inherit it.
- **Kick-back #4/#5 decisions (recorded 2026-09-04):** lineage corrected — as-grilling, as-wayfinder,
  as-prototype, as-domain-modeling are mattpocock/skills ports (MIT © 2026 Matt Pocock), license
  lines are the provenance source of truth; as-receiving-code-review renamed as-code-review;
  /evals dirs removed (behavioral evals = TASK-42 promptfoo harness); as- prefix rescoped to
  ported/distilled only; binary-doc-conversion ruled original; all-4 diff-reviewer families now
  mandatory per kick-back fix round (author errors survived single/no-reviewer rounds).

## Watchlists (named cut triggers)

- wayfinder + prototype: cut if no `wayfinder:map` ticket within ~90 days of 2026-09-02.
- general-agent removal: open decision — runbook says implementer replaces ad-hoc general dispatch; keeping `general` is an unguarded path around TDD/permission envelopes. Decide at next roster change.

## Review provenance

- addyosmani evaluation: 3 rounds × qwen/deepseek/kimi (+glm verify) — unanimous APPROVE-WITH-CHANGES, folded.
- ponytail evaluation: qwen/deepseek/kimi — adopt A(ladder)+C(canary), defer D(promptfoo→TASK-42), reject E–J unanimous; attribution = SHA-pinned headers for technique steals.
- TASK-33 implementation: implementer (6 slices) + conductor (memory policy, decision record, canary test finish).

## Kick-back #3 decisions (2026-09-04)

- **difit direction convention:** `difit <branch> main` — branch first renders changes as
  additions. Root cause of the recurring "reverse changelog" confusion: main-first invocation.
  Documented in worktree-discipline.md (difit bullet). Not a difit defect.
- **Author naming:** ported skills (as-tdd, as-systematic-debugging, as-code-review)
  carry `author: harness (adapted)` — they are not original work; the upstream author
  (© 2025 Jesse Vincent) is credited in the `upstream:` frontmatter field. Harness-original
  skills carry `author: github:@shabib87`.
- **Reviewer-lane split (security / quality / over-engineering personas): DEFERRED to
  loop-engineering v2 (TASK-7 lane).** Blast radius: new agent files + reviewer-loop.ts
  dispatch changes + ~2-3x token cost per round; the current 4-model-family parallel roster
  already provides multi-lens coverage over one shared reviewer.md, whose five axes assign
  each lens. Simplification loop: already covered proactively (implementer YAGNI ladder) and
  reactively (reviewer.md simplification heuristics); a separate simplification loop would
  duplicate reviewer authority. Revisit when TASK-7 builds the per-AC review chain.

## Round-6 supersession note (2026-09-04)

- Human confirmed as-content-research-writer keeps the as- prefix (concept-derived from the public content-research-writer skill; text harness-original). The earlier round-5.5 note suggesting a clean name is superseded.
