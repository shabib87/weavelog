---
name: prompt-triage
description: Use when the conductor receives a dumped mega-prompt, wall-of-text brief, or voice-note transcript with 2+ mixed asks — triggers on pasted briefs over ~15 lines, "here's everything I want" dumps, or requests mixing bugfix + feature + refactor. Decomposes into structured intent lines, each with acceptance criteria and a route (named flow or backlog). Do NOT use for a single clear task (execute it) or pure queue filing. Terminates when every clause maps to exactly one intent line with a measurable finish line.
license: Apache-2.0 (from v0.1.0; MIT pre-v0.1.0)
metadata:
  author: github:@shabib87
  version: "1.0.0"
---
upstream: none — harness-original (author github:@shabib87)

# Prompt Triage

## Overview

A mega-prompt is not a task — it's an unprocessed queue dump. Triage converts it into atomic, routable intent lines before any work starts. Skipping triage means the factory runs on an ambiguous spec, and specification failure is the largest multi-agent failure mode (~42%).

## Procedure

1. **Split** the brief into atomic clauses. One clause = one ask. Label each: bug / feature / question / chore / research.
2. **For each clause**, write:
   - **Intent** — one sentence, the bounded goal
   - **Finish line** — a measurable acceptance criterion (a runnable check, not a vibe)
   - **Route** — `work-now` (enters the named flow: research → spec → plan) or `queue` (becomes a backlog task via the intake procedure)
3. **Flag ambiguity** as ONE blocking question (one-question-at-a-time protocol). Never guess past an ambiguous clause.
4. **Emit the routing table** and stop. Triage does not start the work.

## Routing Rules

| Clause type | Route |
|---|---|
| Clear, small, current session | work-now → named flow |
| Clear, large or not-now | queue → backlog task (bounded goal + finish line + named YAGNI deferrals) |
| Open question, no deliverable | queue → research note assignment for the researcher agent |
| Ambiguous | blocking question to the human — nothing proceeds on that clause |

## Output Format

```
TRIAGE: <N> clauses
1. [bug] intent — finish line — route: work-now
2. [feature] intent — finish line — route: queue (backlog draft)
3. [?] BLOCKED: <the one question>
```

## Red Flags

- Starting implementation before the routing table exists
- Merging two clauses into one task ("and" in the intent = split it)
- A finish line that isn't runnable ("make it better" is not a finish line)
- Asking multiple clarifying questions at once
