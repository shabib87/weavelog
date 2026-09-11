---
name: remove-ai-slop
description: >-
  Use before finalizing any prose written for a human reader: chat replies,
  presentation copy, documentation, plan files, handoff notes. Detects and
  removes 8 AI-writing tells (full list in references/tells-checklist.md). Use
  whenever output is three or more sentences, whenever a user says writing
  sounds "AI", "cryptic", "slop", or "robotic", and before every doc or
  presentation handoff. Companion to simplify-language (that skill governs
  sentence construction; this one governs tell removal).
license: MIT
metadata:
  author: github:@shabib87
  version: "1.0.0"
---
upstream: none — harness-original (author github:@shabib87)

# Remove AI Slop

**What this is.** A hard gate against AI-writing tells before any prose reaches a human reader. This is not a vibe check. It is a checklist that runs every time.

**Why this exists.** Generic "sound more human" prompts get skimmed and ignored. This skill only works if it runs as a gate every time, not read once and remembered.

## When to run this

- Before sending any chat reply of three or more sentences.
- Before finalizing any doc, presentation copy, or plan file.
- Whenever the user says the output sounds "AI," "cryptic," "slop," or "robotic." That is direct signal this skill was skipped.
- Skip for replies under three sentences unless the user explicitly asks for a quality check.

## The gate (run every time, in order)

If the simplify-language skill is available, run it first for sentence construction before this gate. If both skills are active, simplify-language always runs first.

1. Read the draft once, fully, before editing.
2. Scan for the 8 tells in `references/tells-checklist.md`. Mark every hit.
3. Fix every hit. One instance is worth flagging. Context matters. A legitimate aside or a user-requested style is not a tell. Require a clear tell before editing. If it is ambiguous, preserve the original wording. User-requested style wins over this gate. When you fix, note what you changed.
4. Re-read the fixed version. Check that every sentence still means what the original meant. If any fix changed the meaning, revert that fix and flag it for the user rather than shipping a semantic change.
5. For long multi-part responses: after drafting each new section, re-run steps 2-4 on that section.
6. Only then send or finalize.

## Gotchas

Short is not the same as human. Cutting a sentence to "One retry, per stage. This pipeline's own limit, not a fixed rule." is a fragment, not a fix. It is just a shorter tell. A real sentence has a subject and a verb. See `references/tells-checklist.md`, "The fragment trap."

Em-dash chaining survives density cuts if a pass only counts words instead of scanning for the em-dash pattern itself. It hides inside sentences that already look short: "65 of the 179 branches — one branch per discovered error code, not by design." Short, but still a tell.

Running this once at the start of a long response is not enough. New paragraphs written later in the same turn need the same gate. Slop creeps back in mid-response as often as at the top.

This skill is a companion to `simplify-language`. This skill removes tells; that skill governs sentence length and construction. If the simplify-language skill is available, run it first for sentence construction, then run this gate.

## Compliance check before finalizing

Full pattern list lives in `references/tells-checklist.md`. The checkboxes below are a quick gate.

- [ ] Em-dash clause chaining
- [ ] "Not just X, but Y" or "it's not about X, it's about Y" construction
- [ ] Rule-of-three list
- [ ] Empty transition
- [ ] Hedge that adds no information
- [ ] Vacuous positivity or formulaic closing
- [ ] Symmetric bolded-lead-in bullet list
- [ ] Every sentence has a real subject and verb
