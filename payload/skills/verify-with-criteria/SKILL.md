---
name: verify-with-criteria
description: 'Use in the verify and verdict stages before any claim of done, PASS, fixed, or complete — triggers on completion claims, "is this done", qa sign-off, reviewer verdicts on a diff or plan. Verifies the artifact against human-owned criteria verbatim: every acceptance criterion mapped to fresh evidence (command output + exit codes from this turn) or declared NEEDS-CRITERIA. Do NOT use for style opinions or open exploration. Terminates in one VERDICT line plus EVIDENCE and FINDINGS.'
license: Apache-2.0 (from v0.1.0; MIT pre-v0.1.0)
metadata:
  author: github:@shabib87
  version: "1.0.0"
---
upstream: none — harness-original (author github:@shabib87)

# Verify With Criteria

## Overview

**Core principle:** Evidence before claims, always — and the criteria are the human's, never invented downstream.

**Violating the letter of this rule is violating the spirit of this rule.**

The hard gate is the `verify-gate` hook (deterministic, blocks code writes when >10 tool calls pass without a bash run). This skill is the *procedure* that produces a verdict a human gate can consume.

## The Iron Law

```
NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE
NO INVENTED OR SOFTENED CRITERIA
```

If you haven't run the verification command in this turn, you cannot claim it passes. If the human's criteria don't cover something, that's NEEDS-CRITERIA — not an invitation to write your own.

## The Gate Function

```
BEFORE claiming any status or emitting a verdict:

1. EXTRACT: the human-owned criteria verbatim (task AC, spec scenarios, plan must-haves)
2. IDENTIFY: what command/evidence proves each criterion?
3. RUN: execute the FULL command (fresh, complete, this turn)
4. READ: full output, check exit code, count failures
5. MAP: every criterion → PROVEN (cite output) | FAILED (cite output) | NEEDS-CRITERIA (no human-owned test exists)
6. EMIT: one VERDICT line + EVIDENCE + numbered FINDINGS tagged [blocker|major|minor]

Skip any step = lying, not verifying
```

## Verdict Contract

- **qa**: `VERDICT: PASS | FAIL | NEEDS-CRITERIA` — every AC mapped to fresh evidence
- **reviewer / plan-reviewer**: `VERDICT: APPROVE | APPROVE-WITH-FIXES | REJECT` + numbered FINDINGS
- **implementer report**: `STATUS: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT` + test output + exit codes

A verdict without evidence lines is void. The conductor rejects it without re-reading the artifact.

## Common Failures

| Claim | Requires | Not Sufficient |
|-------|----------|----------------|
| Tests pass | Test command output: 0 failures | Previous run, "should pass" |
| Linter clean | Linter output: 0 errors | Partial check, extrapolation |
| Build succeeds | Build command: exit 0 | Linter passing, logs look good |
| Bug fixed | Test original symptom: passes | Code changed, assumed fixed |
| Regression test works | Red-green cycle verified (revert → must fail → restore) | Test passes once |
| Agent completed | VCS diff shows changes + fresh test run | Agent reports "success" |
| Criteria met | Line-by-line mapping to human-owned criteria | Tests passing |

## Red Flags - STOP

- Using "should", "probably", "seems to"
- Expressing satisfaction before verification ("Great!", "Perfect!", "Done!")
- About to commit/push/PR without verification
- Trusting agent success reports
- Writing your own acceptance criteria when the human's are missing (→ NEEDS-CRITERIA)
- **ANY wording implying success without having run verification**

## Rationalization Prevention

| Excuse | Reality |
|--------|---------|
| "Should work now" | RUN the verification |
| "I'm confident" | Confidence ≠ evidence |
| "Just this once" | No exceptions |
| "Agent said success" | Verify independently |
| "Partial check is enough" | Partial proves nothing |
| "The criteria were obvious" | Obvious to you ≠ human-owned. Declare NEEDS-CRITERIA |
