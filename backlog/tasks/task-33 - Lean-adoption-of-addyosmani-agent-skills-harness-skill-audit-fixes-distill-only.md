---
id: TASK-33
title: >-
  Lean adoption of addyosmani/agent-skills + harness skill-audit fixes
  (distill-only)
status: Done
assignee:
  - conductor
created_date: '2026-09-03 00:43'
updated_date: '2026-09-05 04:55'
labels:
  - harness
  - skills
  - cleanup
dependencies: []
references:
  - 'https://github.com/addyosmani/agent-skills'
  - TASK-7
ordinal: 25000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Distill-only adoption of https://github.com/addyosmani/agent-skills (MIT, 91.7k stars) + ponytail techniques (https://github.com/DietrichGebert/ponytail, MIT): reviewer.md upgrade, security.md LLM checklist, skill-spec contract-discipline + description-collision eval policy, YAGNI ladder in implementer prompt, canary taxonomy test. Zero new catalog skills, zero forks. Attribution: skill ports use the house frontmatter pattern; technique steals use file-header comments pinned to upstream SHA (both upstreams push frequently). License note: add repo-root LICENSE (MIT) — existing port lines say "see LICENSE" and it is dangling.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Decision record exists at docs/research/ with a 25-skill disposition table (exact upstream names, one line each: 3 distillations, 1 fold, 3 meta-steals incl. doubt-driven-development named, 18 rejects) and the 4-reviewer verdict noted
- [x] #2 prompts/reviewer.md upgraded in ONE pass: five-axis review depth + ~100-line change sizing, simplification heuristics (Chesterton Fence, preserve-behavior, Rule of 500) folded as one paragraph, severity mapping Critical→blocker / Required→major / Nit+Optional+FYI→minor, final verdict delegated to verify-with-criteria, one-line adversarial framing, stale test-guardrails pointer fixed, size cap respected
- [x] #3 config/agents/security.md gains LLM-security checklist (prompt injection, untrusted model output, tool permission scoping), secrets handling, supply-chain hygiene; severity reconciled to blocker|major|minor; no web-app boilerplate (sessions/CORS/GDPR/rate-limiting)
- [x] #4 skill-spec gains contract-discipline section (Hyrum Law, boundary validation, error semantics retargeted to skill frontmatter, MCP tool schemas, CLI contracts; cross-links Script Design instead of duplicating) and a description-collision eval policy (pairwise similarity + 3 positive / 2 negative triggers at skill-add time) framed as harness-local policy
- [x] #5 writing-skills folded: frontmatter/description spec sections defer to skill-spec (resolves the <500-char vs <1024-char contradiction), TDD-for-skills process retained
- [x] #6 Wiring one-liners: researcher.md (adoption dispatches load tool-selection-rubric), qa.md names verify-with-criteria as canonical contract, content-research-writer dead routes (content-brainstormer, technical-post-drafter, fact-checker, jekyll-post-publisher) fixed or pruned, domain-modeling ADR pointer corrected to docs/adr/
- [x] #7 AGENTS.md gains a 2-line memory policy: memory tools are advisory cache, decisions live in backlog/docs, never secrets
- [x] #8 Runbook hygiene: section 4.5 embedded verbatim skill copies (~250 lines incl. retired SH Humanizer) replaced with hub pointers, headroom MCP removed-vs-enabled contradiction resolved, hub inventory includes diagram-design and tldraw-offline, qa permission-order drift checked
- [x] #9 Watchlists and open decisions recorded in the decision record: wayfinder + prototype cut triggers (no wayfinder:map in ~90 days → cut), general-agent removal decision left open with rationale
- [x] #10 WHEN the implementer prompt is distilled THEN it contains the YAGNI decision ladder (need it? reuse in codebase? stdlib? native platform? installed dep? one line? then minimum) with the carve-out that validation, error handling, security, and accessibility are never cut — adapted from DietrichGebert/ponytail (MIT)
- [x] #11 WHEN the canary-invariants test runs THEN it asserts load-bearing phrases ([blocker|major|minor], VERDICT:) appear in every severity-taxonomy copy (derive the copy list by grep at implementation time — live drift exists: security.md still says [critical|major|minor]) — technique adapted from DietrichGebert/ponytail scripts/check-rule-copies.js (MIT)
- [x] #12 WHEN any script in bin/src/ produces a generated artifact (reports, caches, scratch, manifests) THEN it writes under the gitignored state/ directory (e.g. state/stack-check/, state/mdconvert/), never the repo root or scattered paths
- [x] #13 WHEN .gitignore is read THEN it covers state/ (and reports/ until migrated) so no script byproduct can dirty git status on main
- [x] #14 WHEN bin/AGENTS.md scripting standard is read THEN it states the artifact convention: generated artifacts go to state/ (gitignored), never repo root
- [x] #15 WHEN the skills catalog is inspected THEN the harness skill set carries a distinct umbrella name (not upstream names) and the SKILL.md of every skill touched by this task carries attribution to all three upstreams — obra/superpowers (MIT), addyosmani/agent-skills (MIT), DietrichGebert/ponytail (MIT) — per the SHA-pinned header policy
- [x] #16 WHEN docs/research/2026-09-03-agent-skills-ponytail-adoption.md is read THEN it records the umbrella-name decision and the artifact convention decision
- [x] #17 WHEN the skills catalog is inspected THEN skill directories carry a harness-unique prefix (as-) distinguishing them from upstream names (e.g. skills/as-tdd/, skills/as-grilling/), and ALL references are updated in the same pass: agent prompts in config/agents/*, conductor dispatch, AGENTS.md, runbook, skills/README.md lineage table, canary test paths, and any cross-references in SKILL.md files
- [x] #18 WHEN the rename is applied THEN every renamed skill SKILL.md carries frontmatter + header attribution to its full lineage (obra/superpowers MIT, addyosmani/agent-skills MIT, DietrichGebert/ponytail MIT as applicable) per the SHA-pinned policy, and upstream-original skill names are preserved in the frontmatter (e.g. upstream: test-driven-development) for provenance
- [x] #19 WHEN the rename lands THEN bun test passes with zero broken skill-path references (canary test + wiring greps confirm no dangling old names)
- [x] #20 WHEN the skills catalog is inspected THEN skill directories carry the AS- prefix (as-tdd, as-grilling, ...) distinguishing harness-unique names from upstream names, upstream originals preserved in SKILL.md frontmatter upstream: field, and all references (agent prompts, runbook, tests, symlinks, README lineage table) updated atomically
- [x] #21 WHEN any skill SKILL.md frontmatter is read THEN author is github:@shabib87 for harness-original skills, and ported/adapted skills use author: harness (adapted) with the upstream author credited in the upstream: field (never "sh" on non-original work)
- [x] #22 WHEN the reviewer lane is inspected THEN the code-review responsibility is split across focused reviewer personas (security, quality/over-engineering, simplification) rather than one monolithic reviewer, wired via reviewer.md profile sections and dispatched per lane
- [x] #23 WHEN difit is launched for merge-gate review THEN it is invoked in the direction that shows branch changes as additions (branch first, main second), and the invocation convention is documented in the runbook merge-gate section
- [x] #24 WHEN the skill catalog is inspected THEN the as- prefix appears ONLY on skills whose content is ported/distilled from upstream (as-tdd, as-systematic-debugging, as-code-review, as-writing-skills, as-grilling, as-wayfinder, as-prototype, as-domain-modeling, as-content-research-writer, as-binary-doc-conversion); harness-original skills carry clean names (in-my-voice, prompt-triage, remove-ai-slop, simplify-language, skill-spec, tool-selection-rubric, verify-with-criteria); symlinked third-party skills keep upstream names (diagram-design, tldraw-offline)
- [x] #25 WHEN any SKILL.md frontmatter is read THEN the upstream: field states the TRUE lineage — 4 mattpocock/skills ports (as-grilling, as-wayfinder, as-prototype, as-domain-modeling, MIT © 2026 Matt Pocock) properly attributed, superpowers ports credit Jesse Vincent, addy distills credit addyosmani @ 1c760d6 — matching the license: line
- [x] #26 WHEN skills/*/evals are inspected THEN the directories are removed (promptfoo-based behavioral evals are TASK-42 scope, per the deferral decision — eval-as-data without a runner is dead weight)
- [ ] #27 WHEN a kick-back fix round is presented at the merge gate THEN all four diff-reviewer families have reviewed the freshly regenerated three-dot diff of that round (not a stale diff), with already-fixed items explicitly flagged from prior commits
- [ ] #28 WHEN the reviewer-lane split is implemented THEN it happens in the TASK-7 sequential per-AC review chain lane (deferred from TASK-33 by human decision 2026-09-04)
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Round-3 amendments from ponytail evaluation (qwen/deepseek/kimi unanimous): A ladder + C canary-invariants adopted into scope; byte-compare drift checker REJECTED (config-sync sha256 manifest subsumes it); D promptfoo harness deferred to TASK-42; E-J rejected (always-on injection veto holds). Attribution upgraded: SHA-pin for technique steals.

Implemented in 8 commits: adopted parallel-thread WIP (5526910), reviewer.md one-pass (40dca86), security.md LLM checklist + severity fix (5acb001), implementer ladder (3f7377b), skill-spec (792999b), skills wiring (b9f0bf1), runbook hygiene (995d3f6), memory policy + decision record + canary test + researcher/qa wiring (651cf53). Upstreams pinned: addyosmani 1c760d6, ponytail 974d940. Suite: 395 tests 0 fail; canary 8/8 GREEN (RED verified pre-fix on security.md drift).

Reopened by human: (1) artifact-write convention - no stray patterns, all scripts write to gitignored state/; (2) distinct umbrella name for the mixed-provenance skill set with attribution to all 3 upstreams + licenses. Name proposal to confirm at implementation: no rename of skill dirs (routing stability) - umbrella name via catalog README + skill-file attribution blocks.

Kick-back #2 (human): umbrella name MUST change actual directory names — the README-only approach is rejected. Rename all skill dirs with the AS- prefix in this task; routing references must be updated atomically in the same pass. Previous kick-backs: #1 (username placeholders in launchd — fixed aa3afa7); feedback history bundled: (a) lean-harness SOLID pass → distill-only, (b) attribution to all 3 upstreams with licenses, (c) artifact convention state/, (d) umbrella name with real renames (this fix).

Kick-back #3 (human, 4 points): (1) difit shows changelog reversed — investigate + fix invocation convention, part of this task; (2) author "sh" on ported skills feels wrong — those are NOT original work; (3) original skills author = github:@shabib87 — agreed, applied to all; (4) reviewer-lane split question (security/quality/over-engineering distribution) + simplification loop for reviewer — evaluate blast radius now.

Kick-back #3 fixes: (1) difit direction — root cause confirmed: difit <a> <b> renders a-to-b; every past invocation used main-first, so new files rendered as deletions (recurred 2x: TASK-36 TASK-37, TASK-33 task-37/38). Fixed by convention: difit <branch> main, documented in worktree-discipline.md difit bullet. Not a difit bug — invocation contract. (2) author field: ported skills -> author: harness (adapted) with upstream author credited in upstream: field; (3) original skills -> github:@shabib87 (15 files). (4) REVIEWER-LANE SPLIT EVALUATED — blast radius HIGH, deferred: current design = ONE shared reviewer.md consumed by 4 model-family shims (deepseek/glm/kimi/qwen) running PARALLEL on the same diff = implicit 4-lens coverage already; splitting into per-lane agents (security/quality/over-engineering) = new agent files, dispatch changes in reviewer-loop.ts + loop-factory, token cost ~2-3x per review round, and reviewer.md five-axis already assigns each axis a lens. SIMPLIFICATION LOOP: already present as heuristics para in reviewer.md (Chesterton/preserve-behavior/Rule-of-500) + implementer YAGNI ladder prevents at write time; a separate simplification LOOP would duplicate reviewer authority and expand the fix-loop contract. Decision: keep single reviewer.md + 4-family roster; per-lane personas DEFERRED to loop-engineering v2 (TASK-7 lane, sequential per-AC review chain is the natural home). Recorded in decision record.

Kick-back #4 (human): (1) promptfoo evals — /evals dirs removed from 3 skills; real evals deferred to TASK-42 (rubric run + design pass required). (2) LINEAGE AUDIT CORRECTED — user skeptic instinct validated: grilling, wayfinder, prototype, domain-modeling are mattpocock/skills ports whose license lines said so but upstream: field wrongly said harness-original; fixed to true lineage. (3) as- prefix RESCOPED: only ported/distilled skills carry it; 8 originals de-prefixed; as-code-review renamed from as-receiving-code-review (user suggestion). (4) symlink skills (diagram-design, tldraw-offline) keep upstream names — un-prefixed; stack-check + tests updated.

Kick-back #5 (human): (1) binary-doc-conversion de-prefixed — original, not ported; (2) stale as- cross-refs inside in-my-voice + remove-ai-slop bodies fixed; (3) tldraw SKILL.md username paths → $HOME (7 occurrences); runbook symlink lines sanitized (no .claude mention — user does not use claude as primary); (4) PROCESS FIX: all-4 review now mandatory per kick-back round — the author-crediting errors survived because single/no reviewer ran on fix rounds. Note: reviewer ran on stale range 8cdf836..4cd2cca; 3 of 8 findings were already fixed in 30285d9.

Human rulings round 5.5: prototype -> as-prototype (mattpocock port, consistent). content-research-writer: scout verified — concept derived from public content-research-writer (ComposioHQ/awesome-claude-skills, 2025-10-17, upstream author unidentifiable), text is from-scratch rewrite. Human asked to confirm original: verdict = NOT clean-original; treatment: keep content-research-writer name (human listed it for de-prefix) but frontmatter must record concept derivation: "upstream: concept from public content-research-writer skill (ComposioHQ/awesome-claude-skills curation, 2025-10, author unattributed); text harness-original (github:@shabib87)". author stays github:@shabib87 (text original). promptfoo stays separate (TASK-42) — confirmed by human.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
TASK-33 complete after 7 review rounds (4-family from round 5 onward). Final state: (1) DISTILLS — reviewer.md five-axis upgrade, security.md LLM checklist + severity fix, implementer YAGNI ladder, skill-spec contract-discipline + collision evals, all from addyosmani/agent-skills @1c760d6; (2) PONYTAIL TECHNIQUES — YAGNI ladder + canary-invariants test @974d940; (3) NAMING — Agent-Stack Skills (AS-skillset): as- prefix on 9 ported/distilled skills, 8 clean originals, symlinks upstream-named, tldraw app-installed unversioned; every SKILL.md carries true lineage (superpowers/mattpocock/addyosmani/ponytail/harness-original) in license: + upstream: fields; authors: ports=harness (adapted), originals=github:@shabib87; LICENSE credits all 4 upstreams; (4) ARTIFACTS — state/ convention, reports/ untracked, gitignore wholesale; (5) difit branch-first convention; reviewer-lane split deferred to TASK-7. Suite 395/0, canary 8/8. Supersedes the earlier dir-names-unchanged summary (kick-back #2 reversed it).
<!-- SECTION:FINAL_SUMMARY:END -->
