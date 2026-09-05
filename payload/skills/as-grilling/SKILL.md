---
name: as-grilling
description: Use when stress-testing a plan, decision, or idea with the human — WHAT-loop dialogue, wayfinder:grilling tickets, "grill me", "poke holes in this". Maps the decision as a design tree and works the frontier one question at a time with recommended answers. Do NOT use for fact lookups (dispatch scout/researcher) or after shared understanding is confirmed (act on it). Terminates when the frontier is empty and the human confirms shared understanding.
license: MIT — ported from mattpocock/skills (© 2026 Matt Pocock), adapted to the one-question-at-a-time protocol 2026-08-16; see LICENSE
metadata:
  author: harness (adapted)
  version: "1.0.0"
---
upstream: grilling @ mattpocock/skills (MIT — © 2026 Matt Pocock), ported 2026-08-16

# Grilling

Interview the human relentlessly until shared understanding. Map the decision as a **design tree**: every decision branches into the decisions that hang off it.

## The frontier discipline

The **frontier** is every decision whose prerequisites are settled — the questions askable now without guessing at unheard answers. Compute it explicitly. Each answer reshapes the tree and pushes the frontier outward; a question depending on an open answer belongs to a later round.

**Harness adaptation (overrides the original):** the harness protocol is ONE question at a time — never batch the frontier. Use the frontier to pick the *next* question (highest-leverage first), ask it, wait, recompute. Everything else is unchanged.

## Question format

```
❓ **Q<n>** — **<title>**: <body — context, choices, trade-offs>

➡️ <your recommended answer>
```

The recommended answer is mandatory: it lets the human confirm with a word instead of composing from scratch, and it forces you to hold a position worth stress-testing.

## Facts are your job, never the human's

When a frontier question needs a fact (codebase, config, external docs), dispatch scout (internal) or researcher (external) — never ask the human for anything lookup-able. Don't block the rest of the frontier on a running lookup: downstream questions wait, the rest proceed.

## Termination

Done when the frontier is empty — every branch visited, nothing silently assumed. **Do not act on the result until the human confirms shared understanding out loud.**

## Red flags

- Asking a question whose prerequisite is still open
- Asking the human for a fact you could look up
- Batching multiple questions (harness protocol violation)
- Acting before explicit confirmation
- No recommended answer on a question
