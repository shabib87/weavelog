---
name: simplify-language
description: >-
  Use when writing or editing documentation, proposals, presentation copy,
  or technical prose meant to be read quickly by a mixed audience,
  including non-native English speakers and engineering leaders skimming
  under time pressure. Applies a practical subset of ASD-STE100
  (Simplified Technical English) discipline: short complete sentences, one
  idea per sentence, active voice, and a fixed Technical-Names vocabulary
  with no synonym substitution, without adopting the full formal
  approved-word dictionary, which is overkill outside translated
  maintenance manuals. Use whenever a user asks for content to be
  "simpler," "plain English," "ESL-readable," "AuDHD or visual-learner
  friendly," or references ASD-STE100 or Simplified Technical English by
  name.
license: Apache-2.0 (from v0.1.0; MIT pre-v0.1.0)
metadata:
  author: github:@shabib87
  version: "1.0.0"
---
upstream: none — harness-original (author github:@shabib87)

# Simplify Language

**What this is.** A practical subset of Simplified Technical English discipline: sentence construction and a controlled vocabulary for load-bearing terms. Not the full formal ASD-STE100 dictionary.

**Why not full ASD-STE100.** Full compliance requires an approved word list of roughly 1,000 words, each locked to one part of speech, built for translated maintenance manuals with decades of revision history. That is disproportionate for internal docs, presentations, or chat prose read by engineers and sponsors, not global field technicians reading a translated manual. This subset gets the readability win without that process overhead.

## The five rules

1. **Cap sentences at roughly 20-25 words.** Split anything longer into two sentences. A sentence with two or more comma-joined independent clauses needs to split.
2. **One idea per sentence.** A sentence that needs "and" or "which also" to fit its second half needs to split.
3. **Active voice, present tense, wherever the meaning allows.**
4. **Fixed vocabulary for load-bearing terms (Technical Names).** Pick the term once. Never swap in a synonym for variety. State the fixed list once, plainly, near the top of the document, before using any of them.
5. **Complete sentences, not fragments.** Every sentence needs a subject and a verb. Cutting words is not the same as simplifying. A fragment is harder to parse than a short complete sentence, not easier.

## How to apply it

1. Before writing, list the 3-8 terms in this document that must never be rephrased (the Technical Names). State them once, plainly, near the top.
2. Draft normally.
3. Re-read every paragraph. Split any sentence over roughly 25 words. Merge two sentences only if splitting them created two fragments.
4. Check every Technical Name is used the same way every time it appears. No synonym drift.
5. Read the result out loud. If a sentence sounds clipped or missing a word, it's over-cut. Fix toward a complete sentence, not a shorter fragment. Pair with the `remove-ai-slop` skill for this specific check.

## Gotchas

- **Rule 1 and Rule 5 work against each other if applied carelessly.** Cutting words to hit a length target can produce a fragment ("One retry, per stage. This pipeline's own limit, not a fixed rule.") instead of a short complete sentence ("The pipeline runs one retry per stage. We chose that limit. It is not a fixed rule."). When in doubt, keep the sentence complete even if it runs a little longer than the target.
- **Once a term is established nearby, keep using the exact same word.** Swapping in a synonym for variety (e.g. "categorized" becoming "sorted" a paragraph later) reads as inconsistent, not varied. Consistency beats variety here.
- **Don't apply these rules to a direct quote from a source document.** Simplification applies to your own prose, not to material you're citing or quoting verbatim.
- **A Technical Name needs a one-time definition before first use, not a footnote after.** If "PM" or "Tech Lead" appears before either is spelled out anywhere on the page, a reader has no way to resolve it.

Full rule detail and worked before/after examples: `references/sentence-rules.md`.
