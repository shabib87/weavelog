# AI-writing tells: the full checklist

Checked directly against the live [Wikipedia:Signs of AI writing](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing) article (fetched and verified, not recalled from memory) on 2026-07-28. Patterns 1, 3, 4, 6, 7, and the vocabulary list are confirmed against that page, with its own shortcut codes noted. Patterns 2 and 8 are the author's own additions, from real mistakes caught in use — labeled as such, not attributed to Wikipedia.

## 1. Em-dash clause chaining (WP:AIDASH, verified)

The tell is not the em-dash itself. Human writers use them too. The tell is using em-dashes more often than commas, colons, or parentheses would call for, especially to glue two or more independent clauses together in a "punched up" way. The real article also notes AI-generated em dashes are usually surrounded by spaces, unlike typical human typographic style. This sign is strongest combined with other indicators, not alone.

**Bad (real, self-caught example):**
> "This build shows the same risk in action. Before this note, the retry handler had grown to 65 of the 179 branches — one branch per discovered error code, not by design."

**Fixed:**
> "This build shows the same risk in action. The retry handler grew to 65 of the 179 branches. Each branch came from one discovered error code. No one planned this size in advance."

## 2. The fragment trap (the author's own addition, not from Wikipedia)

Cutting a sentence for length is not the same as simplifying it. A fragment (no subject, no verb, or both) is harder to parse than a short complete sentence, even though it has fewer words.

**Bad (real, user-caught example):**
> "One retry, per stage. This pipeline's own limit, not a fixed rule."

**Fixed:**
> "The pipeline runs one retry per stage. We chose that limit. It is not a fixed rule."

Rule of thumb: if reading it out loud requires mentally inserting a missing word, it's a fragment, not a short sentence.

## 3. Negative parallelisms: "not just X, but Y" and "X rather than Y" (WP:AINEGPAR, verified)

Two forms of the same rhetorical move, both confirmed on the real page: "not just X, but also Y" manufactures drama out of a plain statement; "X rather than Y" (the reversed form) is called out as particularly common in Grok output specifically, but shows up across models.

**Bad:** "This isn't just a bug fix — it's a fundamental rethink of the recovery model."
**Fixed:** "This changes how recovery works, not just one function."

**Bad:** "The team prioritized shipping speed rather than architectural purity."
**Fixed:** state which one actually happened and why, without the rhetorical frame: "The team shipped fast and left the architecture cleanup for later."

## 4. Rule of three (WP:RO3, verified)

The real article's exact description: "adjective, adjective, adjective" or "short phrase, short phrase, and short phrase," often used to make a superficial analysis look more comprehensive than it is.

**Bad:** "This gives you speed, clarity, and confidence."
**Fixed:** state the one or two things that are actually true and specific, or use a real list where every item is genuinely a distinct, checkable claim.

## 5. Vague attributions / weasel wording (WP:AIWEASEL, verified)

Attributing a claim to an unnamed authority instead of a real, checkable source: "Industry reports," "Observers have cited," "Experts argue," "Some critics argue," "several sources" when only one or two are actually cited, "such as" placed before a list that isn't actually exhaustive.

**Bad:** "Industry observers have noted that this approach improves reliability."
**Fixed:** name the actual source, or state the claim as your own assessment if there isn't one: "This approach improved reliability in our own test run — see the numbers above."

## 6. Superficial analyses (WP:SUPERFICIAL, verified)

A present-participle ("-ing") phrase tacked onto the end of a sentence, usually assigning significance or impact without evidence: highlighting, underscoring, emphasizing, ensuring, reflecting/symbolizing, contributing to, cultivating/fostering, encompassing, enhancing, "valuable insights," align/resonate with.

**Bad:** "The change simplifies the pipeline, underscoring the team's commitment to maintainability."
**Fixed:** "The change simplifies the pipeline." (Delete the tacked-on clause entirely unless it states a specific, checkable fact.)

## 7. Section summaries and formulaic conclusions (WP:CONCLUSION / WP:INCONCLUSION, verified)

The real article's exact watch-words: "In summary," "In conclusion," "Overall." Restating a section's core idea in a closing paragraph instead of ending on the last real point.

**Fix:** end on the last real point. If a summary is genuinely needed, summarize the specific decision or result, not the general feeling about it.

## 8. Symmetric bolded-lead-in bullet lists (author's framing of WP:AILIST, verified pattern)

The real article calls this "inline-header vertical lists": a list marker followed by an inline bolded header, separated by a colon from the rest of the line, applied uniformly whether or not the content actually calls for that structure.

**Fix:** ask whether the content is genuinely a parallel set of comparable items (then a list is right) or a sequence of different-shaped points (then prose, or a list with real per-item structural variation, reads better).

## A pattern checked and deliberately NOT included as a strong tell

**Transition words in isolation** ("Additionally," "Moreover," "Notably" to open a sentence) — the real Wikipedia article explicitly lists this under **"Ineffective indicators."** It says this pattern also shows up in ordinary human essay writing and is accepted by many style guides, so it is not reliable as a tell by itself. Don't flag isolated transition words as proof of anything; only flag them if stacked densely alongside several of the confirmed patterns above.

## Vocabulary tells (verified against the real article's word lists)

The article tracks these by "LLM era" since the overused words change over time as models change:
- **2023 to mid-2024 (GPT-4 era):** additionally, boasts, bolstered, crucial, delve, emphasizing, enduring, garner, vibrant.
- **Mid-2024 to mid-2025 (GPT-4o era):** align with, bolstered (carried forward), and others in the same register.
- **Superficial-analysis-specific words** (see pattern 6 above): highlighting, underscoring, emphasizing, ensuring, reflecting, symbolizing, contributing to, cultivating, fostering, encompassing, enhancing, "valuable insights," align/resonate with.

None of these words are banned outright. The tell is reaching for them by default instead of the plainer word that already fits, especially several at once.

## The verification standard

After fixing, ask: would a specific person, in this specific project, actually say this sentence out loud to a colleague? If the answer is "yes, but only in a more casual tone," the content is probably right and only the register needs a small adjustment. If the answer is "no person talks like this," it's still slop, no matter how short it now is.
