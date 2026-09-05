# Description Optimization

Systematic approach to improving skill descriptions for reliable triggering, per [agentskills.io](https://agentskills.io/skill-creation/optimizing-descriptions).

## How Triggering Works

Agents use progressive disclosure: at startup they load only `name` and `description` of each skill. When a task matches a description, the full SKILL.md loads. The description carries the **entire burden of triggering**.

Important nuance: agents typically only consult skills for tasks requiring knowledge beyond their baseline capabilities. Simple, one-step requests may not trigger even with a matching description.

## Writing Principles

1. **Imperative phrasing**: "Use this skill when..." not "This skill does..."
2. **Focus on user intent**: Describe what the user is trying to achieve, not internal mechanics
3. **Be pushy**: Explicitly list contexts, including when users don't name the domain directly
4. **Include keywords**: Terms the agent would match against
5. **Concise**: Few sentences to a short paragraph. Hard limit: 1024 characters
6. **WHAT + WHEN**: Capabilities AND trigger scenarios

## Designing Trigger Eval Queries

Build ~20 queries labeled with expected trigger behavior:

```json
[
  {
    "query": "I've got a spreadsheet in ~/data/q4_results.xlsx with revenue in col C...",
    "should_trigger": true
  },
  {
    "query": "whats the quickest way to convert this json file to yaml",
    "should_trigger": false
  }
]
```

### Should-Trigger Queries (8-10)

Vary along:
- **Phrasing**: formal, casual, typos, abbreviations
- **Explicitness**: direct domain mention vs. indirect need description
- **Detail**: terse vs. context-heavy with file paths and column names
- **Complexity**: single-step vs. multi-step chains

Most valuable: queries where the skill helps but the connection isn't obvious.

### Should-Not-Trigger Queries (8-10)

Use **near-misses**, not obviously irrelevant queries:

```
# Weak (too easy to reject)
"Write a fibonacci function"

# Strong (shares keywords but needs different capability)
"write a python script that reads a csv and uploads each row to postgres"
```

### Realism Tips

Include in queries:
- File paths (`~/Downloads/report_final_v2.xlsx`)
- Personal context ("my manager asked me to...")
- Specific details (column names, data values)
- Casual language and abbreviations

## Testing Trigger Rates

Run each query multiple times (3+ runs). Compute trigger rate per query.

- **Should-trigger passes** if trigger rate > 0.5
- **Should-not-trigger passes** if trigger rate < 0.5

With 20 queries at 3 runs = 60 invocations. Script this.

Detection: check agent logs/traces for whether the skill's SKILL.md was loaded during the run.

## Train/Validation Splits

Prevent overfitting by splitting queries:
- **Train set (~60%)**: guide improvements
- **Validation set (~40%)**: check generalization

Both sets need proportional should-trigger / should-not-trigger mix. Keep split fixed across iterations.

Only use train set failures to guide changes. Never optimize against validation set.

## The Optimization Loop

1. **Evaluate** current description on both train and validation sets
2. **Identify failures** in train set only:
   - Should-trigger failures -> description too narrow
   - Should-not-trigger failures -> description too broad
3. **Revise** the description:
   - Broaden scope for missed triggers
   - Add specificity for false triggers
   - Avoid adding specific keywords from failed queries (that's overfitting)
   - Find the general category those queries represent
   - If stuck after several iterations, try structurally different framing
   - Check 1024-char limit (descriptions grow during optimization)
4. **Repeat** until train set passes or improvement plateaus
5. **Select best** by validation pass rate (may not be the last iteration)

Five iterations is usually enough. If not improving, check query quality.

## Before/After Example

```yaml
# Before
description: Process CSV files.

# After
description: >-
  Analyze CSV and tabular data files -- compute summary statistics,
  add derived columns, generate charts, and clean messy data. Use this
  skill when the user has a CSV, TSV, or Excel file and wants to
  explore, transform, or visualize the data, even if they don't
  explicitly mention "CSV" or "analysis."
```

The improved version: more specific capabilities, broader trigger contexts, includes non-obvious activation scenarios.

## Applying the Result

1. Update `description` in SKILL.md frontmatter
2. Verify under 1024 characters
3. Sanity check: try 5-10 fresh queries (never seen during optimization)

The [`skill-creator`](https://github.com/anthropics/skills/tree/main/skills/skill-creator) skill automates trigger testing end-to-end.
