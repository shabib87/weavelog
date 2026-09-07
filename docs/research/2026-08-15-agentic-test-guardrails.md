---
date: 2026-08-15
topic: Agentic TDD/BDD test guardrails — Aug 2026 standards
status: adopted
sources:
  - https://github.com/obra/superpowers/blob/main/skills/test-driven-development/SKILL.md
  - https://github.com/obra/superpowers/blob/main/skills/verification-before-completion/SKILL.md
  - https://arxiv.org/html/2607.12068 (AIDev study, 204,673 test files, Jul 2026)
  - https://playwright.dev/docs/test-agents
  - https://www.codewithseb.com/blog/test-driven-agentic-development-guide (Aug 1, 2026)
models_used_for_research: [qwen/qwen3.8-2.4t-a95b]
supersedes: none
---

# Agentic test guardrails (Aug 2026 standards)

## Canonical loop (red-green-refactor, unchanged; OWNERSHIP is what evolved)

spec scenarios (human-approved) -> failing tests first -> WATCH THEM FAIL -> implement ->
verify green -> refactor under the net.
- NO production code without a failing test first (pre-written code gets deleted, not kept)
- "If you didn't watch the test fail, you don't know it tests the right thing"

## Responsibility split (adopted in AGENTS.md + runbook)

- HUMAN: owns acceptance criteria (Given/When/Then or WHEN-THEN-AND, RFC 2119), 3-5 contract
  assertions for high-stakes paths, UAT approval. Spec and code NEVER in the same commit.
- IMPLEMENTER: unit + integration tests, written first, hermetic (injected clock, seeded RNG,
  temp dirs, no network). Expands boundary list: empty, null, zero, negative, max-int, unicode,
  concurrent.
- QA AGENT (qa.md): E2E/UAT from human-owned criteria ONLY (never invents). Healers repair
  locators/waits, NEVER assertions. E2E counts after 10 consecutive stable passes.
- REVIEWERS: anti-pattern audit (checklist in runbook "Test Guardrails").

## Verification-before-completion (every role)

Fresh command output + exit codes in the current turn; regression tests red-verified
(revert fix -> MUST fail -> restore -> pass); never trust a subagent's "done" report.

## 2026-specific findings

- Agents beat humans on edge-case coverage (AIDev: boundary variety 0.62 vs 0.32); their failure
  mode is FLAKINESS/hermeticity + assertion drift.
- Enforcement is PHYSICS not prompts: permission rules (qa.md edit-glob to test paths only;
  reviewers edit-deny), git tamper-evidence (commit tests before impl; git diff test paths).
- BDD today = plain-language scenarios in spec markdown, not Cucumber tooling.
- Runners: one per package. bun test for ~/.agents/bin scripts; vitest for chatbox;
  playwright for E2E (chatbox test/e2e NOT yet provisioned as of 2026-08-15).
- Fix rounds capped at 5 then escalate to human.
