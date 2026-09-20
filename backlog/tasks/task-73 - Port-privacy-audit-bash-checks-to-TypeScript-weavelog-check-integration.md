---
id: TASK-73
title: Port privacy-audit bash checks to TypeScript (weavelog check integration)
status: In Progress
assignee:
  - '@conductor'
created_date: '2026-09-07 15:49'
updated_date: '2026-09-20 08:20'
labels:
  - spec-approved
milestone: m-7
dependencies:
  - TASK-79
modified_files:
  - src/tools/privacy-audit.ts
  - src/cli/index.ts
  - AGENTS.md
  - tests/privacy-audit.test.ts
  - tests/cli/index.test.ts
  - tests/payload/privacy.test.ts
ordinal: 59500
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The privacy/sanitization checks (scan for absolute home-dir paths like /Users/, personal identifiers, and secret patterns before any commit) exist today as bash grep logic inherited from the legacy harness plus a MANUAL pre-commit ritual documented in AGENTS.md MUST-NOT; AGENTS.md says weavelog check will automate this when available. Bash-for-logic violates the repo standard (TypeScript is the only implementation language), manual scans get skipped under pressure, and the gate must be deterministic and testable. Outcome: during spec, inventory every bash check; reimplement them as a TypeScript module under src/tools/ (TASK-71 layout, tool-paths.ts conventions for any path resolution); wire the result into weavelog check as a subcheck with refusal semantics consistent with existing subchecks; delete the bash originals; update AGENTS.md so the pre-commit instruction points at the automated subcheck instead of the manual grep ritual.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 WHEN the privacy checks are inventoried THEN each legacy check is reimplemented in TypeScript or explicitly dropped with a recorded reason
- [x] #2 WHEN weavelog check runs THEN it performs deterministic privacy, workspace test, lint, typecheck, and security verification subchecks
- [x] #3 WHEN a scanned file set or workspace verification fails THEN the subcheck fails and names the file, failed command, or matched pattern
- [x] #4 WHEN the port lands THEN no bash remains as implementation logic and AGENTS.md points at the automated checks
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Tests and lint pass with fresh output in the worktree
- [x] #2 Worktree is clean (no uncommitted changes)
- [ ] #3 Branch is rebased on main and green
- [x] #4 All acceptance criteria checked with fresh evidence (one at a time, never batched)
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Recon (done): the only legacy bash privacy logic is scripts/privacy-audit + scripts/privacy-audit-strings.txt (git grep for 'shabibhossain', '/Users/shabibhossain', '@weavelog' over tracked files with 8 hard-coded excludes). tests/payload/privacy.test.ts duplicates a subset over payload/docs. weavelog check (src/cli/index.ts runCheck/runPreCommit) has no content privacy subcheck.
2. Add src/tools/privacy-audit.ts: pure rule matcher + privacyAuditForDir(root) wrapper. Rules: (a) forbidden personal identifier strings, (b) absolute macOS home paths (/Users/<name>) with a documented allowlist for intentional test fixtures, (c) secret patterns (AWS/GitHub/OpenAI/OpenRouter token shapes, private-key headers). Enumerate tracked files via 'git ls-files' (non-repo => fail-closed with reason); apply the legacy excludes.
3. Wire a 'privacy' subcheck into runCheck (full mode) and runPreCommit (replacing the manual ritual); fail names file + matched pattern, exit 1.
4. Delete scripts/privacy-audit and scripts/privacy-audit-strings.txt.
5. Refactor tests/payload/privacy.test.ts to import the new module (single source of truth).
6. Update AGENTS.md MUST-NOT (lines 138-141) to point at the automated weavelog check subcheck instead of the manual grep ritual.
7. Tests: tests/privacy-audit.test.ts unit cases (clean, personal string, home path, secret, excluded path, non-repo) + CLI case that check/check --pre-commit fails naming file+pattern.
8. Verify fresh: npm test, npm run lint, npm run typecheck; then check each AC one at a time with that evidence.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-09-10 correction: assigned to m-7 because deterministic privacy verification is a required v0.1 release gate.

2026-09-10 correction: TASK-73 is the narrowly scoped workspace-verification wiring task. It owns deterministic integration, not an unrestricted orchestration framework.

Inventory (AC#1): the only legacy bash privacy logic was scripts/privacy-audit + scripts/privacy-audit-strings.txt (git grep for 'shabibhossain', '/Users/shabibhossain', '@weavelog' over tracked files with 8 hard-coded excludes); tests/payload/privacy.test.ts duplicated a subset over payload/docs. Reimplemented in TS as src/tools/privacy-audit.ts (personal-identifier + secret-pattern rules, git ls-files enumeration, workspace-root guard, documented excludes). Wired as the 'privacy' subcheck in runCheck (full mode) and runPreCommit. Bash originals deleted; AGENTS.md MUST-NOT now points at the automated subcheck; tests/payload/privacy.test.ts consumes the module (single source of truth).

Explicit drops with reason (AC#1): (a) the generic '/Users/<name>' blanket regex — the AGENTS.md instruction text itself contains '/Users/', frozen docs/archive and test fixtures intentionally use example absolute paths, and the legacy scan only matched specific identifiers; author home paths remain covered by the personal-identifier needle. (b) workspace test/lint/typecheck runners and binary semgrep inside 'weavelog check' — owned by CI and TASK-63, and running the repo suite inside check risks recursion (tests spawn check). Security is delivered in check as the secret-pattern content scan; semgrep/audit/provenance stay in CI (TASK-63).

Evidence: tests/privacy-audit.test.ts (8 tests) + 2 CLI cases in tests/cli/index.test.ts pass; npm test 801 tests / 4 fail — identical 4 pre-existing environmental failures as main (headroom-compress live proxy, checkDiagramDesign drift); npm run lint clean; npm run typecheck clean; 'weavelog check' prints '[pass] privacy — clean (269 tracked files scanned)'; 'weavelog check --pre-commit' exits 0.

Coordination: TASK-63's plan step 8 still runs scripts/privacy-audit as part of its verify battery. TASK-63 must switch that reference to the automated 'weavelog check' subcheck after it rebases on main.

Independent diff review (diff-reviewer-glm): PASS WITH ISSUES. Resolved: (2) trackedFiles now passes an explicit maxBuffer and distinguishes rev-parse failure (skip) from git ls-files failure (fail closed with a named reason), so the pre-commit gate cannot silently pass; (3) nested-directory skip now has a distinct message; (5) files > 5 MB are not buffered. Added a nested-in-repo guard test and strengthened the dirty-case assertions. Re-verified: tests/privacy-audit.test.ts 9/9, npm test 802 tests / 4 pre-existing environmental failures (same as main) / 1 skip, lint clean, typecheck clean, check --pre-commit exit 0 with '[pass] privacy — clean (269 tracked files scanned)'.

Open for human decision before merge: (a) AC#2 wording still names workspace test/lint/typecheck + binary semgrep subchecks, which were dropped-with-reason under approved option A; AC#2 remains unchecked pending a scope decision. (b) Review finding: the reimplemented needle set matches only the legacy literal forms, so it does not match the identifier forms actually in the tree ('Shabib Hossain', 'shabib87', 'codewithshabib'); adding those forms needs matching excludes and is a policy call. (c) The plan's generic '/Users/<name>' rule was dropped with reason (AGENTS.md text and frozen fixtures self-trigger).

Review round 2 (L3 diff-reviewer-qwen, security-scoped escalation): FAIL with gate-defeating defects. Fixed: (1) pre-commit now scans the git index (staged content) via one 'git cat-file --batch' call, closing the staged-secret + clean-worktree bypass; (2) token formats widened (github_pat_, sk-proj-, sk-ant-api/oat, ASIA, ENCRYPTED/DSA/PGP keys, Stripe sk_live_), then tightened with a lookbehind so kebab-case prose is not a false positive; (3) excludes are per-scope — personal excludes no longer suppress secret scanning; secret excludes are docs/archive/ + the module; (4) read errors fail closed, binary/oversized counted; (5) GIT_DIR/GIT_WORK_TREE stripped; (6) excerpts redacted whenever a line carries a secret; (7) index parser fails closed on newline paths, malformed headers, and non-Buffer output.

Rebase: main advanced (TASK-63 e170535 + TASK-29 c3363b4 merged). Committed c073429 and rebased cleanly onto ab2f8a0; wiring re-applied into the rewritten src/cli/index.ts (import :57, index mode runPreCommit :1488, worktree mode runCheck :1534). Deleted scripts/privacy-audit has no code/CI references on main (only historical backlog notes).

Review round 3 (L3, rebased): PASS — all prior findings resolved, no new defect; ReDoS probes linear; real formats match, kebab false positives gone. Tally: L0 diff-reviewer-glm (PASS WITH ISSUES, fixed), L3 diff-reviewer-qwen (FAIL -> fixed -> PASS), plan-gate-glm (APPROVE-WITH-FIXES).

Evidence (post-rebase): npm test 974 tests / 969 pass / 4 pre-existing environmental failures (identical set on main) / 1 skip; npm run lint clean (94 files); tsc --noEmit clean; weavelog check --pre-commit exit 0 ('[pass] privacy — clean (440 tracked files scanned)'); full weavelog check privacy pass.

Exclude ledger (plan-gate finding 4): docs/archive/ is excluded from both scopes (frozen provenance, not shipped per package.json files; contains a key-shaped placeholder 'sk-or-YOUR_ZDR_OPENROUTER_KEY'). backlog/ is excluded from the personal rule only; secret scanning still covers it.

TASK-63 coordination: its task notes/plan still cite scripts/privacy-audit as a verify-battery step; the script is deleted here and the equivalent is now 'weavelog check --pre-commit'. No workflow, package.json, or CI reference exists on main. PRD/ROADMAP 'privacy-audit-done' marker wording is a documentation follow-up owned by TASK-63 AC#8.

Externalization (resolves the chicken-and-egg, per plan-gate-qwen APPROVE-WITH-FIXES): shipped rules are identity-free (generic absolute home path + secret patterns); the author's identifiers load at runtime from an untracked needle file (WEAVELOG_PRIVACY_NEEDLES, default <WEAVELOG_CONFIG_HOME|~/.config/weavelog>/privacy-needles.txt); absent = personal-name scope skipped with a visible note, unreadable = fail closed. Shipped excludes are attribution-only (LICENSE, NOTICE, ATTRIBUTION.md, docs/archive/, module); repo-specific personal excludes live in the committed-but-unshipped .weavelog-privacy-excludes. Tests use synthetic needles/paths only; no real identity remains in the module, tests, or dist (verified).

Taxonomy per prior human ruling TASK-45 [AMEND-R6-6]: shabib87/codewithshabib are chosen public brand, not PII; the sweep does not touch them or attribution. Follow-up TASK-91 created for the one-time whole-tree sweep and exclude narrowing, dependent on TASK-83 (public-history clearance) and TASK-73.

Post-externalization evidence: npm test 983 tests / 978 pass / 4 pre-existing environmental failures (same as main) / 1 skip; lint clean; tsc clean; 'weavelog check --pre-commit' pass with '[pass] privacy — clean (441 tracked files scanned; personal-name scan skipped (no local needle file))'; full check runs privacy + workspace.* + security.audit; dist contains no author identity.

Correction: the follow-up sweep task was withdrawn per user instruction (no new tasks). Its scope is now recorded as a note on TASK-83, which already owns working-tree and all-refs clearance.
<!-- SECTION:NOTES:END -->
