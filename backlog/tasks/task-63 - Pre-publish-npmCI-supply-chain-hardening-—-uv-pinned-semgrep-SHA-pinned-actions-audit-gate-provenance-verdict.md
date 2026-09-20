---
id: TASK-63
title: >-
  Pre-publish: npm+CI supply-chain hardening — uv-pinned semgrep, SHA-pinned
  actions, audit gate, provenance verdict
status: In Progress
assignee:
  - '@conductor'
created_date: '2026-09-06 20:06'
updated_date: '2026-09-20 05:39'
labels:
  - spec-approved
milestone: m-7
dependencies:
  - TASK-59
  - TASK-79
modified_files:
  - package.json
  - .github/workflows/ci.yml
  - .github/workflows/publish.yml
  - .github/workflows/release-please.yml
  - .github/audit-exceptions.json
  - src/tools/audit-gate.ts
  - src/tools/pack-check.ts
  - src/tools/publish-gate.ts
  - tests/audit-gate.test.ts
  - tests/pack-check.test.ts
  - tests/publish-gate.test.ts
  - tests/ci-supply-chain.test.ts
  - docs/adr/0009-npm-provenance-and-release-gating.md
  - docs/adr/README.md
  - docs/adr/0008-cli-distribution-contract.md
  - docs/trd/cli-vision.md
priority: high
ordinal: 51000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Outcome: harden Weavelog build, publish, and supply-chain machinery in package metadata and `.github/workflows/`. Why: v0.1 needs reproducible package evidence and a human-controlled publication path. Pin semgrep through uv, third-party actions to full commit SHAs, least-privilege permissions and checkout without persisted credentials; pin the package manager and reproducible install; fail npm audit on untriaged high or critical production advisories; build before pack; and record a numbered ADR for the npm provenance adopt-or-skip decision. TASK-63 owns release-please or equivalent publication-workflow wiring, which may only publish after TASK-67 evidence and an explicit human marker decision. It does not own external tool installation or TASK-83 public-history clearance.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 WHEN the CI semgrep step runs THEN semgrep installs through the documented pinned channel with metrics off, pinned rulesets, error mode, and no pipx references under workflows
- [ ] #2 WHEN a touched workflow is inspected THEN every third-party action is pinned to a full commit SHA with a version comment, least-privilege permissions, and checkout without persisted credentials
- [ ] #3 WHEN package metadata is inspected THEN it pins the package manager that produced the lockfile and CI runs the reproducible install command
- [ ] #4 WHEN CI runs on main, pull requests, and its scheduled cadence THEN the audit gate fails on untriaged high or critical production advisories with committed rationale and expiry for every exception
- [ ] #5 WHEN this task closes THEN a numbered ADR records the npm provenance adopt-or-skip verdict for v0.1.0 with verified registry evidence
- [ ] #6 WHEN a tag or npm publish is attempted THEN TASK-3, TASK-4, TASK-5, TASK-7, TASK-29, TASK-30, TASK-53, TASK-54, TASK-62, TASK-63, TASK-64, TASK-66, TASK-67, TASK-68, TASK-73, TASK-55 are closed and the human release decision is recorded; TASK-67 accepts local proof on the author's Mac without an external tester, another machine or a clean-user CI job.
- [ ] #7 WHEN npm pack runs THEN the exact tarball contains a fresh build, dist, payload, and zero backlog files
- [ ] #8 WHEN the publication workflow is implemented THEN release-please or its approved equivalent prepares the release but cannot publish unless TASK-67 evidence is accepted and the human-controlled publish marker is set
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Tests and lint pass with fresh output in the worktree
- [ ] #2 Worktree is clean (no uncommitted changes)
- [ ] #3 Branch is rebased on main and green
- [ ] #4 All acceptance criteria checked with fresh evidence (one at a time, never batched)
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Red tests first (TDD): tests/ci-supply-chain.test.ts parses .github/workflows/*.yml and asserts every third-party action is a 40-char SHA with a '# vX.Y.Z' comment, top-level permissions are least-privilege, checkout has persist-credentials=false, no pipx under workflows, semgrep is uv-installed at an exact version with metrics off/error mode, a schedule trigger exists, and publish is environment-gated. Add unit tests for the new tools (tests/audit-gate.test.ts, tests/pack-check.test.ts, tests/publish-gate.test.ts).

2. src/tools/audit-gate.ts: parse 'npm audit --omit=dev --json', fail on any production high/critical advisory not covered by .github/audit-exceptions.json; each exception needs id+rationale+expires(YYYY-MM-DD); expired or missing rationale fails.

3. src/tools/pack-check.ts: read 'npm pack --dry-run --json', assert dist/cli/index.js and payload/** present and zero backlog/** entries; wire into prepack and CI.

4. src/tools/publish-gate.ts: read backlog/tasks/*.md frontmatter, require the AC#6 closure set Done and the human-controlled WEAVELOG_PUBLISH_APPROVED marker plus TASK-67 acceptance; fail closed.

5. package.json: add packageManager npm@10.9.8 (lockfile producer), prepack build, and scripts wiring audit/pack gates. Harden .github/workflows/ci.yml: schedule trigger, permissions: contents: read, SHA-pinned actions (uv/setup, checkout persist-credentials false), uv-pinned semgrep (metrics off, explicit ruleset, --error), npm ci, audit gate, pack check.

6. Add .github/workflows/release-please.yml (pinned action, node release-type; prepares release only) and .github/workflows/publish.yml (environment npm-publish with required reviewers = human marker, OIDC id-token: write, contents: read, node 24, runs publish-gate, builds+pack-checks, npm publish --provenance).

7. docs/adr/0009-npm-provenance-and-release-gating.md + index row: record adopt/skip verdict for OIDC trusted publishing + provenance with verified registry evidence (npm 'weavelog@0.0.0' reserved probe 2026-09-20; npm/npmjs trusted-publisher requirements) and the publish-gate marker mechanism.

8. Verify: full gate battery (npm test, tsc --noEmit, biome check, scripts/privacy-audit, frontmatter-check for docs/adr). Present diff for plan-gate and human merge gate. Out of scope: TASK-53 prose, TASK-54 artifact clearance, TASK-67 local proof, TASK-83 history clearance, live npm account/trusted-publisher setup (human).

9. Plan-gate resolutions (2026-09-20): (a) semgrep rules pinned by cloning semgrep/semgrep-rules at a full commit SHA; exact semgrep version via uv. (b) npm: keep the existing lockfile and pin packageManager to its producer npm@10.9.8; CI reproducible install uses that npm; only the OIDC publish job installs npm>=11.5.1 explicitly. (c) split release-please into command:pr (prepares only) and a gated command:github-release job that runs publish-gate first, so no tag exists while the closure set is incomplete. (d) persist-credentials:false applies to ci.yml and publish.yml; release-please.yml is a documented exception with contents:write/pull-requests:write. (e) ADR-0009 verdict: adopt OIDC trusted publishing + provenance (PRD mandates it), with dated registry probe of weavelog@0.0.0 and npm/npmjs requirement evidence.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-09-06 cross-thread reconciliation: closure-set AC now explicit IDs; prepack AC added (pack freshness gap found by the stranger-test 3-reviewer passes). Coordinate hunks with TASK-67 CI battery job (same workflow files; 67 rebases on this rewrite).

2026-09-13 shipping audit: align the publish gate with actual supported installer dependencies, including TASK-29/TASK-30 and bounded reviewer correctness TASK-7. Keep existing supply-chain and publication controls. Remove author-machine TASK-84 from the gate.

2026-09-20 implementation (worktree task/TASK-63): added src/tools/audit-gate.ts, pack-check.ts, publish-gate.ts with unit tests; rewrote .github/workflows/ci.yml (schedule, contents:read, SHA-pinned actions, persist-credentials:false, uv-pinned semgrep 1.177.0 with semgrep-rules pinned at commit 311ca4e9ba59d700624539bf658e3d29b134ee77, npm ci, audit + pack gates); added .github/workflows/release-please.yml (command:pr + gated command:github-release) and publish.yml (environment npm-publish, id-token:write, npm 12.0.2, npm publish --provenance); added .github/audit-exceptions.json (empty); package.json packageManager npm@10.9.8 + prepack build + gate scripts; ADR-0009 (npm provenance adopt) + index row.

Fresh evidence: tsc --noEmit exit 0; biome check exit 0 (78 files); frontmatter-check --schema architecture 28/28 valid; privacy-audit clean; new gate tests green (audit 11, pack 6, publish 11, ci-supply-chain 16); pack-check end-to-end: '153 files, dist+payload present, no backlog' exit 0; audit-gate end-to-end: '0 high/critical production advisories' exit 0; publish-gate negative: exit 1 (closure set open + marker unset). Full suite 835 pass / 4 fail; the 4 (stack-check diagram drift + 3 headroom live-proxy) fail identically on main, pre-existing/environmental.

2026-09-20 diff-review round 1 (glm-5.3) REQUEST CHANGES — all four blockers fixed: (1) release-please-action v4 has no 'command' input; replaced with skip-github-release:true (prepare) and a gated manual job using skip-github-pull-request:true; (2) publish chain was dead because GITHUB_TOKEN releases don't trigger 'on: release'; the gated job now runs 'gh workflow run publish.yml' (workflow_dispatch exception) with actions:write; (3) audit-gate now fails closed on an npm error envelope or a missing vulnerabilities key (parseAuditReport throws), with new tests; (4) semgrep CI is green: pinned commit 311ca4e9, curated pinned security rules (ts/lang/security + generic/secrets + 9 JS security rule files), 61 rules / 0 findings / exit 0, .semgrepignore excludes generated docs. Non-blocking fixes: release-please checkout persist-credentials:false; scoped actions:write.

Re-verification after fixes: tsc exit 0; biome check exit 0 (78 files); frontmatter-check 28/28 valid; privacy-audit clean; gate tests 52/52; full suite 838 pass / 4 fail (same pre-existing stack-check diagram + 3 headroom live-proxy); semgrep pinned invocation 61 rules / 0 findings / exit 0.

2026-09-20 diff-review round 2 (glm-5.3): APPROVE-WITH-CONDITIONS — all four round-1 blockers verified fixed; no new blockers. Conditions addressed: ci.yml semgrep comment reworded to state the gate is deliberately narrow (JS spawn/string/regex false positives deferred); audit-gate parse adds an Array.isArray guard. Remaining condition (create a follow-up backlog task for the deferred semgrep rule triage) proposed at the merge gate. Non-blocking carried: exact npm not enforced in CI (corepack), pack-check not in an npm lifecycle script.

Final battery: tsc exit 0; biome check exit 0; gate tests 52/52; frontmatter-check 28/28; privacy-audit clean; semgrep pinned invocation 61 rules / 0 findings / exit 0; publish-gate negative exit 1; full suite 838 pass / 4 fail / 1 skip (4 pre-existing).
<!-- SECTION:NOTES:END -->
