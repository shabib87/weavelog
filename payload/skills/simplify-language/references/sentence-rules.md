# Simplify Language: rule detail and worked examples

## Rule 1 and 2 worked example: splitting long, multi-clause sentences

**Before (one 48-word sentence, three ideas):**
> "Track configuration changes per deployment, categorized by environment, and compare results only across matching deployment types while documenting the specific setting added or removed for each observed change."

**After (four short sentences, one idea each):**
> "Track configuration changes per deployment. Categorize each one by environment. Compare results only across matching deployment types. Document the specific setting added or removed."

## Rule 3 worked example: active voice

**Before (passive, vague actor):** "The number that gets measured is retries per run, and improvement is what gets tested."
**After (active, real actor):** "This lets the system improve without mistaking activity for judgment."

## Rule 4 worked example: fixed Technical Names, no synonym drift

Once a document establishes "Station" as the term for a stage in the delivery pipeline, every later reference must say "Station," never "stage," "phase," or "step," even where those words would be grammatically fine in isolation. The same applies to "deployment," "rollback," "health check," "config drift," "retry budget," and "circuit breaker" (pick your own fixed terms once, define them near the top of your document before first use).

**Bad (synonym drift across two sentences):** "Each Station has one retry step. If the second review also fails, the fix cycle stops and a human decides."
**Fixed:** "Each Station has one retry step. If the second review also fails, the retry cycle stops and a human decides."

## Rule 5 worked example: the fragment trap in full

This is the single most common failure mode when applying Rule 1 without also holding Rule 5. Cutting for length without checking for a subject and verb produces something that LOOKS short and clean but is actually harder to read than a normal sentence.

**Over-cut fragment (real, user-caught example):**
> "One retry, per stage. This pipeline's own limit, not a fixed rule."

Read that out loud. The first sentence has no verb. The second has no verb either. A reader has to mentally reconstruct: "[There is] one retry, per stage. [This is] this pipeline's own limit, not a fixed rule." That reconstruction work is exactly the cognitive load this whole rule set exists to remove.

**Fixed (three complete sentences, still short):**
> "The pipeline runs one retry per stage. We chose that limit. It is not a fixed rule."

Each sentence now has an explicit subject ("This build," "We," "It") and a real verb ("allows," "chose," "is"). Nothing was added back except the grammar that makes each sentence stand on its own.

**How to self-check for this:** for any sentence under 8 words, explicitly identify its subject and its main verb before moving on. If you can't point to both, it's a fragment, not a short sentence — lengthen it just enough to restore both, and no more.

## Rule 4 detail: defining Technical Names correctly

A Technical Names list should be:
- Short (3-8 terms for most documents; more than that suggests the document is trying to cover too much at once).
- Stated once, in one place, before first use — not scattered as inline parenthetical asides the first three times each term appears.
- Defined in one plain sentence each, not a paragraph.
- Never abbreviated on first use without the expansion stated somewhere on the same page. If "PM" or "Tech Lead" is used in a diagram or table before it's spelled out anywhere, add a one-line glossary hint directly above that diagram or table, not just in a far-away section.

## When 20-25 words is too strict

A single list of proper nouns (a citation list, a tool-name list) reads fine as one longer sentence, since there's no clause structure to parse, just a flat enumeration. Don't force an artificial split there. The rule targets clause complexity, not raw word count for enumerations.
