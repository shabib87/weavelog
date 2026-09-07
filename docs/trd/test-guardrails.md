---
date: 2026-08-30
topic: Test guardrails — TDD ordering, EARS acceptance, RED/GREEN split, reviewer checklist
status: draft
type: architecture
author: conductor
related_to:
  - ./README.md
  - ./loop-factory.md
  - ./tool-boundaries.md
sources:
  - "TASK-15"
  - "TASK-21 (EARS activation)"
  - "TASK-16 (full protocol moved from runbook)"
---

# Test guardrails

## TDD ordering

1. Acceptance scenarios (human-approved) first.
2. Failing tests first — watch them fail.
3. Implement → verify green → refactor.

No implementation without a failing test.

## EARS-style acceptance criteria

Acceptance criteria use **EARS-style** WHEN/THEN (or IF/THEN, WHILE/THEN) statements in
the backlog task's `acceptanceCriteria` array.

Why EARS (justification is harness-specific, not industry-bandwagon — see the corrected
2026-08-29 SDD research note): backlog ACs are requirement-layer claims — the contract
string between agents and gates. The harness variant is **EARS-inspired, not canonical
EARS**: it drops the "THE SYSTEM SHALL" response clause; accepted shapes are
WHEN/IF/WHILE + plain outcome statements (the latter covers always-true/structural
claims).

EARS does not *prevent* compound claims — "SHALL do A and B" passes a shape check, and
canonical EARS even permits Complex patterns. What EARS buys: compounds are
non-idiomatic and conspicuous, while GWT makes And-chaining idiomatic and
template-baked (BMAD's own story template bakes `**And** {{additional_criteria}}` into
every story). Atomicity is enforced by the human plan gate plus the reviewer; the
format's job is to make violations easy to see and cheap to reject. EARS is chosen over
single-line plain-string GWT because (1) no precondition slot means no room for
implementation-flavored Givens (smaller LLM drift surface), (2) each AC maps 1:1 to a
deterministic test exit code by convention (verify-gate contract — design intent,
reviewer-audited, not mechanically enforced), and (3) shape is near-mechanically
checkable, so plan-reviewer can reject malformed ACs quickly. Shape is not semantics —
"the system SHALL be user-friendly" matches the pattern and is still garbage; the plan
gate covers semantics.

Layer rule: backlog `acceptanceCriteria` are EARS-inspired claims. Gherkin
(Given/When/Then) is the appropriate format for scenario-level specs in the WHAT phase
and for multi-step E2E journeys the qa agent consumes — the two layers compose; this
reconciles the responsibility-split table below, which uses GWT scenarios for
human-owned spec scenarios.

Examples:
- `WHEN the pre-commit hook fires on main THEN the commit is blocked`
- `IF the verify-gate is active THEN code writes are blocked after >10 tool calls without a bash run`
- `the config loader uses the new schema` (plain outcome statement — always-true claim)

## RED/GREEN in the TDD skill (HOW loop, implementer-owned)

- The implementer writes the failing test first (RED), watches it fail, then implements (GREEN).
- The implementer owns unit + integration tests.
- The qa agent owns E2E/UAT from human-owned criteria.
- Humans own acceptance criteria and UAT approval.
- Spec and code never ship in the same commit.

## Boundary list

Every behavior needs ≥1 negative test. Boundary list: empty, null, zero, negative,
max-int, unicode, concurrent.

## Reviewer checklist

- Independent verdicts, fresh context, never inherits the implementer's history.
- Cross-family error diversity is intentional (one reviewer per model family).
- Verdict: APPROVE / REQUEST CHANGES, numbered findings with severity, file:line + fix.

## Deterministic verify-gate hook

The verify-gate (plugins/verify-gate.ts) enforces a deterministic signal: no write without
fresh bash output (tests/lint) in the current turn. Kill-switch available. Red-verified tests.

## Detailed protocol (moved from runbook, TASK-16)

Tests are gates, not afterthought. The loop: spec scenarios (human-approved) → failing
tests first → watch them fail → autonomous green → refactor under the net. No
implementation without a failing test; no completion claim without fresh verification
evidence run in the current turn.

Supporting skills in the harness skills hub (~/.agents/skills, §4):
`as-tdd` and `verify-with-criteria` (superpowers plugin removed 2026-08-16;
keepers ported).

### Responsibility split

| Role | Owns | Gates |
|---|---|---|
| Human | Acceptance criteria: backlog `acceptanceCriteria` use the EARS-inspired format above; spec scenarios in WHAT-phase docs use Given/When/Then (scenario layer — the two compose, see layer rule); 3-5 contract assertions for high-stakes paths; UAT click-through approval | Spec committed BEFORE implementation; spec and code never in the same commit (Zone-Guard rule) |
| Implementer (primary/worker) | Unit + integration tests, written FIRST (red-green-refactor); hermetic tests (injected clock, seeded RNG, temp dirs, no network); expands boundary cases: empty, null, zero, negative, max-int, unicode, concurrent | Integration tests run on every task; full suite before hand-off; never modifies committed assertions to go green (ask human instead) |
| QA agent (`~/.config/opencode/agents/qa.md`) | E2E/UAT from human-owned acceptance criteria only (refuses to invent criteria); boundary/negative expansion from contract tests; heuristic repair of locators/waits but NEVER assertions | E2E on every feature gate; stabilization: 10 consecutive passes before an E2E counts; reports real command output, never "should pass" |
| Reviewer agents | Anti-pattern audit (checklist below) | Merge gate verdict |

### Verification-before-completion (every role)

- Fresh evidence: run the test command in the current turn, read full output, check exit code
- Regression tests must be red-verified: write test → pass with fix → revert fix → MUST FAIL → restore fix → pass
- Never trust subagent success reports; verify via commands + git diff
- "Should pass" / "Perfect!" without output = rejected claim

### Anti-pattern checklist (reviewers MUST check)

1. Test-after (tests written with/after implementation) — reject, order is the safety property
2. Tautology/mirror assertions (expected computed by code under test) — require hand-derived literals
3. Assertion-free tests (expect(true).toBe(true), execution-only) — merge-blocking
4. Hallucinated assertion APIs — grep the framework's real assert surface
5. Tampered/deleted failing tests without human sign-off — check git diff on test paths
6. Non-hermetic tests: real clock, unseeded RNG, real network, order coupling
7. Mock-everything: mocks only at slow/external boundaries; if mock setup > half the test, demand integration
8. Change-detector tests: fail on intentional decisions, sleep through bugs
9. Happy-path-only suites: require >=1 negative test per behavior + the boundary list
10. Untrusted success claims; non-pristine output (warnings = findings)
11. E2E: brittle CSS/XPath locators (require role/label/test-id), waitForTimeout instead of web-first asserts, hardcoded run-specific data, live OAuth instead of stored state
12. Reward-hacking: editing spec/assertions to make failing tests pass

### Runners per context (one runner per package, never mix)

| Context | Runner | Command |
|---|---|---|
| `~/.agents/bin` durable scripts | bun test | `cd ~/.agents/bin && bun test` |
| chatbox project unit | vitest 4.x (installed) | `pnpm test` |
| chatbox integration | vitest | `pnpm test:integration` (timeout 300s) |
| chatbox e2e | Playwright (script `pnpm test:e2e` points at `test/e2e/playwright.config.ts`) | **NOT YET PROVISIONED** — `test/e2e/` does not exist in the repo as of 2026-08-15; creating it is a backlog item (trigger: first feature needing UAT). Until then qa.md falls back to `pnpm test` + `pnpm test:integration` |
| lint/format gate | biome 2.x | `pnpm lint` / `bunx biome` for infra |

### Cadence

- Per task: unit + integration (green required before hand-off)
- Per feature: E2E/UAT via qa.md with human acceptance-criteria approval (human gate)
- Property-based tests (fast-check) encouraged for invariants; mutation mindset: for every
  change, mentally mutate (wrong constant, flipped branch, empty return) — at least one test
  must fail

### Enforcement is physics, not prompts

- Permission rules in agent files (qa.md: edit allowed on `**/*test*/**/*spec*/**` only;
  reviewer agents: edit deny everywhere)
- Git as tamper-evidence: commit tests before implementation; git diff on test paths is the
  green-phase audit
- Fix rounds capped at 5, then escalate to human (matches harness stop-hook defaults)

## References

- Test guardrails research: [docs/research/2026-08-15-agentic-test-guardrails.md](../research/2026-08-15-agentic-test-guardrails.md)
- Spec-driven verification: [docs/research/2026-08-29-spec-driven-development-in-ai-harnesses.md](../research/2026-08-29-spec-driven-development-in-ai-harnesses.md)
