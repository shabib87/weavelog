# Evaluation Framework

**Optional:** Behavioral QA with `evals/evals.json` is **not** required by the [agentskills.io specification](https://agentskills.io/specification) or by the **Compliance Checklist** in the parent skill. Use this reference only if you opt in to regression-style testing.

Structured methodology for testing skill quality per [agentskills.io](https://agentskills.io/skill-creation/evaluating-skills).

## Test Case Structure

Each test case has:
- **prompt**: Realistic user message (varied phrasing, detail levels, formality)
- **expected_output**: Human-readable description of success
- **files** (optional): Input files the skill needs
- **assertions** (added after first run): Verifiable statements about output

Store in `evals/evals.json` inside your skill directory:

```json
{
  "skill_name": "csv-analyzer",
  "evals": [
    {
      "id": 1,
      "prompt": "I have a CSV of monthly sales data in data/sales_2025.csv. Find the top 3 months by revenue and make a bar chart.",
      "expected_output": "Bar chart image showing top 3 months by revenue with labeled axes.",
      "files": ["evals/files/sales_2025.csv"],
      "assertions": [
        "The output includes a bar chart image file",
        "The chart shows exactly 3 months",
        "Both axes are labeled",
        "The chart title mentions revenue"
      ]
    },
    {
      "id": 2,
      "prompt": "there's a csv called customers.csv, some rows have missing emails - clean it up and tell me how many were missing?",
      "expected_output": "Cleaned CSV with missing emails handled, plus count of missing.",
      "files": ["evals/files/customers.csv"]
    }
  ]
}
```

Tips for test prompts:
- Start with 2-3 cases. Expand after first results.
- Vary phrasing: formal, casual, with typos/abbreviations
- Cover edge cases: malformed input, unusual requests, ambiguous instructions
- Use realistic context: file paths, column names, personal context

## Workspace Structure

Each eval iteration gets its own directory:

```
skill-name-workspace/
└── iteration-1/
    ├── eval-top-months-chart/
    │   ├── with_skill/
    │   │   ├── outputs/
    │   │   ├── timing.json
    │   │   └── grading.json
    │   └── without_skill/
    │       ├── outputs/
    │       ├── timing.json
    │       └── grading.json
    ├── eval-clean-missing-emails/
    │   └── ...
    └── benchmark.json
```

## Running Evals

Run each test case twice: with the skill and without (baseline).

Each run needs:
- Skill path (or none for baseline)
- Test prompt
- Input files
- Output directory

Use a clean context for each run (subagent or separate session). No leftover state.

When improving an existing skill, snapshot the previous version as baseline instead of running without any skill.

### Timing Data

Record after each run:

```json
{
  "total_tokens": 84852,
  "duration_ms": 23332
}
```

## Writing Assertions

Add assertions after seeing first-round outputs.

**Good assertions** (verifiable):
- "The output file is valid JSON"
- "The bar chart has labeled axes"
- "The report includes at least 3 recommendations"

**Weak assertions** (avoid):
- "The output is good" -- too vague
- "Uses exactly the phrase 'Total Revenue: $X'" -- too brittle

Not everything needs an assertion. Subjective qualities (style, polish) are better caught in human review.

## Grading Outputs

Evaluate each assertion as PASS or FAIL with concrete evidence:

```json
{
  "assertion_results": [
    {
      "text": "The output includes a bar chart image file",
      "passed": true,
      "evidence": "Found chart.png (45KB) in outputs directory"
    },
    {
      "text": "Both axes are labeled",
      "passed": false,
      "evidence": "Y-axis labeled 'Revenue ($)' but X-axis has no label"
    }
  ],
  "summary": {
    "passed": 3,
    "failed": 1,
    "total": 4,
    "pass_rate": 0.75
  }
}
```

Grading principles:
- Require concrete evidence for PASS (no benefit of the doubt)
- Review assertions themselves: too easy? too hard? unverifiable? Fix for next iteration.
- For version comparisons, use blind comparison: present both outputs without revealing which version produced them

## Aggregating Results

Save to `benchmark.json` after grading all runs:

```json
{
  "run_summary": {
    "with_skill": {
      "pass_rate": { "mean": 0.83, "stddev": 0.06 },
      "time_seconds": { "mean": 45.0, "stddev": 12.0 },
      "tokens": { "mean": 3800, "stddev": 400 }
    },
    "without_skill": {
      "pass_rate": { "mean": 0.33, "stddev": 0.10 },
      "time_seconds": { "mean": 32.0, "stddev": 8.0 },
      "tokens": { "mean": 2100, "stddev": 300 }
    },
    "delta": {
      "pass_rate": 0.50,
      "time_seconds": 13.0,
      "tokens": 1700
    }
  }
}
```

The delta shows what the skill costs (time, tokens) vs. what it buys (pass rate improvement).

## Analyzing Patterns

After aggregating:
- **Always pass in both configs**: Remove or replace. Not measuring skill value.
- **Always fail in both configs**: Fix assertion, test case, or accept model limitation.
- **Pass with skill, fail without**: Skill adding clear value. Understand why.
- **High stddev**: Flaky eval or ambiguous instructions. Add examples/specificity.
- **Time/token outliers**: Read execution traces to find bottleneck.

## Human Review

Record specific, actionable feedback per test case:

```json
{
  "eval-top-months-chart": "Chart months in alphabetical order instead of chronological.",
  "eval-clean-missing-emails": ""
}
```

Empty = passed human review. Focus improvements on cases with specific feedback.

## Iteration Loop

Three signal sources drive improvements:
1. **Failed assertions**: specific gaps (missing step, unclear instruction)
2. **Human feedback**: broader quality issues (wrong approach, poor structure)
3. **Execution transcripts**: reveal WHY things went wrong

The loop:
1. Give all three signals + current SKILL.md to an LLM; ask for proposed changes
2. Review and apply changes
3. Rerun all test cases in new `iteration-N/` directory
4. Grade, aggregate, review
5. Repeat until feedback is consistently empty or improvements plateau

Key principles for revisions:
- Generalize from feedback (don't patch for specific test cases)
- Keep the skill lean (fewer, better instructions win)
- Explain the why (reasoning-based > rigid directives)
- Bundle repeated helper logic into `scripts/`

The [`skill-creator`](https://github.com/anthropics/skills/tree/main/skills/skill-creator) skill automates this workflow.
