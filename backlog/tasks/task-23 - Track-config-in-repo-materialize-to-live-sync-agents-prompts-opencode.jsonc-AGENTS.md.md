---
id: TASK-23
title: >-
  Track config/ in repo + materialize-to-live sync (agents, prompts,
  opencode.jsonc, AGENTS.md)
status: Done
assignee:
  - conductor
created_date: '2026-08-30 22:15'
updated_date: '2026-09-01 02:03'
labels: []
milestone: m-3
dependencies:
  - TASK-16
modified_files:
  - bin/src/config-sync.ts
  - bin/test/config-sync.test.ts
  - bin/src/stack-check.ts
  - bin/test/stack-check.test.ts
  - bin/src/agents-install.ts
  - bin/test/agents-install.test.ts
  - config/opencode-AGENTS.md
  - config/harnesses/opencode.json
  - config/opencode.jsonc
  - AGENT-STACK-RUNBOOK.md
  - bin/AGENTS.md
ordinal: 15000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The ~/.config/opencode/ directory is largely UNTRACKED and hand-maintained: the 16 subagent files (agents/), the prompt bodies (prompts/), and opencode.jsonc exist ONLY on the live host. There is no recovery path on a fresh Mac, no sync from the repo to live locations, and no script that materializes tracked config. Only global AGENTS.md was made recoverable (TASK-16: config/opencode-AGENTS.md tracked copy). agents-install.ts exists but is a Phase-0 skeleton (--apply exits 2 as not-implemented). The runbook documents the agent/prompt shapes but nothing materializes them.

This is the heart of m-3 package-and-ship: make the repo the source of truth for config, and add a materialize command that copies repo config -> live ~/.config/opencode/ (and later ~/.pi/). Plus a drift guard in stack-check.ts so the two cannot silently diverge.

Mapping contract (the testable single source of truth):
| live path | tracked path |
|---|---|
| ~/.config/opencode/AGENTS.md | config/opencode-AGENTS.md (TASK-16) |
| ~/.config/opencode/agents/*.md (16) | config/agents/*.md |
| ~/.config/opencode/prompts/{reviewer,plan-reviewer,vision}.md | config/prompts/*.md |
| ~/.config/opencode/opencode.jsonc | config/opencode.jsonc |
| ~/.config/opencode/plugins/*.ts | plugins/*.ts (ALREADY tracked — do not duplicate under config/) |

Copies are VERBATIM byte-identical (no interpolation): opencode.jsonc keeps {file:./secrets/...} refs unresolved, agents keep {file:./prompts/...} refs; the mirror preserves the relative layout so all refs resolve after materialize. secrets/ and node_modules/ stay untracked. plugins/ materialization is a NAMED DEFERRAL (trigger: next config/ or plugins/ edit); a pre-existing verify-gate.ts formatting drift (repo vs live) is noted but out of scope.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 WHEN config/ is inspected THEN it mirrors the live tree byte-identically per the mapping contract: config/opencode-AGENTS.md, config/agents/*.md (16), config/prompts/*.md (3: reviewer, plan-reviewer, vision), config/opencode.jsonc; plugins/ stays at repo plugins/ (no duplicate); secrets/ and node_modules/ excluded
- [x] #2 WHEN bun bin/src/config-sync.ts is run THEN it copies each tracked config file repo->live; identical -> skip exit 0; live differs from the last-materialized manifest -> exit 1 naming the file unless --force; NEVER deletes untracked live files (secrets/, node_modules/ untouched)
- [x] #3 WHEN config-sync.ts runs with NO prior manifest (first run) THEN it records the current live files as the baseline manifest (adopting them, no refusal) so a fresh machine with pre-existing config materializes cleanly
- [x] #4 WHEN config-sync.ts writes the manifest THEN it stores per-file sha256 at ~/.agents/state/config-materialize.json (location and format documented in the task description)
- [x] #5 WHEN stack-check.ts runs with a deliberately drifted config file (env-overridden STACK_CHECK_CONFIG_DIR / STACK_CHECK_CONFIG_LIVE_DIR) THEN it reports the file path + both fixes (re-materialize OR commit the change) and exits 1 (matching the existing stack-check contract: 0 = no drift, 1 = drift found), while staying report-only (no auto-fix)
- [x] #6 WHEN agents-install.ts --apply is run THEN its Phase 4 (opencode-config) invokes config-sync.ts (WITHOUT --force, so pre-existing drift blocks install until resolved) and exits 0 on success / non-zero on failure; --check reports Phase 4 as implemented; NO other phase changes in this task (full --apply for secrets/headroom/launchagent is a NAMED DEFERRAL)
- [x] #7 WHEN the runbook is read THEN its fresh-Mac recreation steps for P2 (opencode.jsonc), P3 (agents), and the fresh-Mac checklist reference the tracked config/ + plugins/ source of truth (plugins deploy separately — materialize does NOT yet deploy plugins, per the named deferral)
- [x] #8 WHEN ~/.config/opencode/package.json (the @opencode-ai/plugin dep) is considered THEN it is covered by the plugins named deferral (materialize does not touch it in this task)
- [x] #9 WHEN config-sync.ts hashes a file for the manifest THEN the hash records the bytes written to live (documented in --help and the harness manifest), so a future personal-to-portable render layer can slot between repo-read and live-write without changing drift semantics
- [ ] #10 WHEN ~/.agents/AGENTS.md is redesigned THEN it is the SINGLE thin source (<=15 non-empty lines beyond the auto-injected backlog block): conductor one-liner, backlog invariant, one-question rule, intent rule, skills pointer, worktree-discipline pointer, runbook pointer; NO model routing, test-guardrail detail, or scripting standards inline; worktree discipline detail relocates verbatim to docs/architecture/worktree-discipline.md
- [ ] #11 WHEN the harness manifest resolves AGENTS.md THEN it maps live ~/.config/opencode/AGENTS.md directly to repo-root AGENTS.md (trackedRoot "."); the config/opencode-AGENTS.md copy is DELETED — no per-harness duplicate exists in the repo
- [ ] #12 WHEN ~/.agents/AGENTS.md is considered THEN it is the SINGLE thin source (<=15 non-empty lines beyond the auto-injected backlog block): conductor one-liner, backlog invariant, one-question rule, intent rule, skills pointer, worktree-discipline pointer, runbook pointer; NO model routing defaults, test-guardrail detail, or scripting standards inline; worktree discipline detail relocated verbatim to docs/architecture/worktree-discipline.md
- [ ] #13 WHEN the harness manifest resolves AGENTS.md THEN it maps live ~/.config/opencode/AGENTS.md directly to repo-root AGENTS.md (trackedRoot ".") and the config/opencode-AGENTS.md copy does NOT exist in the repo — no per-harness duplicate; config-sync and stack-check resolve tracked paths against the repo root consistently
- [ ] #14 WHEN the merge lands and config-sync re-runs THEN live ~/.config/opencode/AGENTS.md equals repo-root AGENTS.md byte-identically, all pointer targets resolve on main, and a second run is 21x skip exit 0
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Manifest spec (config-sync): ~/.agents/state/config-materialize.json — per-file sha256 of the last-materialized state. First run with no manifest adopts current live files as baseline (no refusal). Four branches: tracked==manifest && live==manifest -> no-op; tracked!=manifest && live==manifest -> copy; live!=manifest && tracked==manifest -> local edit, refuse without --force; both differ -> conflict, refuse with message. agents-install Phase 4 calls config-sync WITHOUT --force. package.json/lock (plugin dep) covered by plugins deferral.

Step 0 (scope fold, 2026-08-30 human decision + DeepSeek consult): thin the global AGENTS.md FIRST — rewrite tracked config/opencode-AGENTS.md as the <=15-line bootstrap, single-source model routing in AGENT-STACK-RUNBOOK.md (already has the section; drop duplicates from the global file only), then materialize the final form to live; the verbatim mirror tracks the FINAL thin form, not the old 79-line fat file

Then proceed as originally specced: track agents/prompts/opencode.jsonc verbatim, config-sync.ts + manifest, stack-check drift guard, agents-install Phase 4 wiring, runbook fresh-Mac references

Step 0 expected manifest path (plan-gate): first-run adoption records the FAT live file as baseline -> tracked thin file != manifest && live == manifest hits the COPY branch -> manifest updated to thin state. No refusal branch is reachable (that requires live != manifest). A live edit between adoption and materialize is a legitimate conflict, refused as designed.

One-way flow policy (owner decision 2026-08-30, replacing the earlier full-auto idea): config-sync stays FORWARD-only (repo -> live). Live -> repo happens only via explicit --adopt. Direct edits to live harness dirs are out-of-band by design and will be BLOCKED by the follow-up enforcement task (opencode plugin write-block + session-start auto-materialize). In this task, out-of-band drift is surfaced loudly by config-sync and stack-check; it is never silently adopted.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Scope fold: user decided mid-recon (asked for DeepSeek consult; verdict: user right — ~/.agents is source of truth, global AGENTS.md is a materialized thin bootstrap, routing single-sourced in RUNBOOK). Verbatim tracking of the fat file would have enshrined the duplication.

Implementation complete (conductor-verified, fresh evidence 2026-08-31): (1) config/ tracks 21 files byte-identical to live (cmp verified: AGENTS.md, opencode.jsonc, 16 agents/, 3 prompts/); no config/plugins/, secrets/node_modules excluded. (2) bin/src/config-sync.ts: four-branch semantics, --adopt/--force, exclusions guard; 22 unit tests green; real runs: first-run adoption (adoptedBaseline=true) -> thin AGENTS.md copy branch -> rerun 21x skip exit 0. (3) Manifest ~/.agents/state/config-materialize.json: version 1, 21 entries, per-file sha256 of bytes-written-live. (4) stack-check: checkConfigDrift + checkPointerTargets wired as checks 7-8 with STACK_CHECK_CONFIG_DIR/LIVE_DIR overrides; drift proof on temp tree: exit 1 naming AGENTS.md + both hashes + both fixes; real run: only pre-existing headroom 0.36.5->0.37.0 version drift. (5) agents-install Phase 4: implemented=true in --check; --apply 4 spawns config-sync without --force (8 new tests, 28/28 green). (6) Runbook: fresh-Mac checklist items 5-6 + P2 + P3 reference config/ + plugins/ source of truth + one-command materialize + plugins deferral. (7) Thin bootstrap: 8 non-empty lines (<=15). (8) Harness manifest config/harnesses/opencode.json consumed by config-sync (21-entry live->tracked map, AGENTS.md rename, exclusions, pluginsDeferral). (9) Full suite: 305 tests 0 fail; biome clean on touched files (4 pre-existing warnings in untouched cache-probe/prefix-diff).

Review round applied (3-family diff review qwen/deepseek/glm, verdicts FIX): crash self-heal (tracked==live -> converge) + atomic state tmp+rename, path normalization + root containment (secrets bypass closed), symlink refusal, flag ~ expansion, exit-2 pass-through in agents-install Phase 4, shared exclusion check in stack-check, hashSemantics field in harness manifest, runbook item-11 repoint + include_usage caveat in P1 + bin/AGENTS.md row. All reviewer majors/minors resolved. Suite 324 pass / 0 fail; real-host re-verified: config-sync 21x skip exit 0, drift-guard exit 1 proof.

Live host state: ~/.config/opencode/AGENTS.md is now the 8-line thin bootstrap (materialized); live plugins/ + package.json untouched (deferral); state manifest at ~/.agents/state/config-materialize.json (21 entries).

AC renumber note: after the 2026-08-31 restructure the task holds 13 ACs; original #9 (thin global) and #10 (pointer syntax) were superseded and replaced by the single-source triple above; #11 (pointer targets) and #12 (hash semantics) remain.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: conductor
created: 2026-08-31 03:21
---
Spec revision pending plan-gate review: ACs #1-#8 unchanged in mechanics; new ACs #9-#10 cover the thin-bootstrap redesign folded in from the AGENTS.md-layering discussion.
---

author: conductor
created: 2026-08-31 03:25
---
Plan-gate (qwen) verdict: REVISE applied — content-line counting pinned, pointer syntax pinned to backtick-quoted homedir-expandable paths, manifest path through Step 0 recorded, outside-~/.agents pointer-only risk accepted by human.
---

author: conductor
created: 2026-08-31 06:06
---
Review trail: first review (qwen) found 2 majors (path normalization, partial-failure conflict); 3-family round (qwen/deepseek/glm) found 1 major + 4 minor each, heavily overlapping; ALL resolved in commit b7981e5 with tests (TDD red-first for each behavior fix).
---

author: conductor
created: 2026-09-01 00:04
---
Owner directive 2026-08-31 (merge gate): only ONE thin ~/.agents/AGENTS.md, synced verbatim to config/opencode — no half-here-half-there duplication. config/opencode-AGENTS.md deleted; manifest maps live AGENTS.md -> repo-root AGENTS.md (trackedRoot "."); worktree discipline moved verbatim to docs/architecture/worktree-discipline.md.
---

author: conductor
created: 2026-09-01 00:31
---
Restructure landed (commit 8dc4b1e): AC #9 now = single thin ~/.agents/AGENTS.md (backlog block + conductor line + 6 invariants, ~ pointers); AC #10 = no per-harness duplicate (config/opencode-AGENTS.md deleted; manifest trackedRoot ".", live AGENTS.md -> repo-root AGENTS.md); AC #11 = worktree detail relocated verbatim to docs/architecture/worktree-discipline.md. Suite 325/0 after restructure. NOTE: real re-materialization is deliberately held until after the merge — the thin file points at docs/architecture/worktree-discipline.md which only exists on main post-merge; materializing before would create pointer drift on the live host. Post-merge sequence: materialize -> cmp -> pointer check -> idempotency.
---
<!-- COMMENTS:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Shipped (merge 9f89ac1-era, post-approval 2026-08-31): (1) repo is the single source for opencode config — config/ carries 20 files byte-identical to live (16 agents, 3 prompts, opencode.jsonc) + harness manifest as data (config/harnesses/opencode.json, 21-entry live->tracked map, trackedRoot "."); AGENTS.md maps live<->repo-root directly, no per-harness duplicate. (2) bin/src/config-sync.ts — forward-only materializer: four-branch drift semantics, sha256 manifest (~/.agents/state/config-materialize.json, hashes = bytes-written-live), first-run adoption, --adopt/--force, crash self-heal + atomic state write, path containment (secrets bypass closed), symlink refusal, exclusions guard, never deletes untracked live files. (3) stack-check.ts — config-drift + pointer-target guards (checks 7-8, report-only, exit 1; env overrides for tests). (4) agents-install Phase 4 wired: spawns config-sync without --force, exit passthrough. (5) AGENTS.md is the single thin source (conductor line + 6 invariants above the managed backlog block); worktree detail relocated to docs/architecture/worktree-discipline.md; runbook P1/P2/P3 + fresh-Mac checklist + bin/AGENTS.md updated. (6) 325 tests pass, biome clean. Post-merge verification: materialize 1 copy + 20 skip exit 0; live AGENTS.md byte-identical to repo; all 4 pointer targets resolve; idempotent rerun; stack-check shows only pre-existing headroom 0.36.5->0.37.0 version drift (unrelated). Named deferrals honored: plugins + package.json untouched (TASK-27 continues: session-start auto-materialize + live-edit blocking); portable config layer -> TASK-29; project scaffolding -> TASK-30; cli-vision doc -> TASK-28.
<!-- SECTION:FINAL_SUMMARY:END -->
