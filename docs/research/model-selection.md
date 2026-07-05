# Model Selection for loopeng

> **Date:** 2026-07-04
> **Last verified:** 2026-07-05 (live OpenRouter API + full red team)
> **Status:** Active
> **Cross-referenced against:** `docs/NORTH_STAR.md`, `docs/research/RESEARCH.md`
> **Data source:** OpenRouter live API (`https://openrouter.ai/api/v1/models`)
> **Benchmarks:** Artificial Analysis indices + Design Arena (agent + model categories)
> **Verification model:** GLM 5.2 (open-weight). Frontier models used only where
>   the cost/quality gap is demonstrably worth it.
> **Verified by:** Live API query 2026-07-05T00:00Z. Full red team analysis.
>   Corrections: GLM 5.2 cost ($0.57/$1.80 vs documented $0.91/$2.86),
>   DeepSeek V4 Pro as Verifier (Code) IS justified (diversity > capability parity).

## Purpose

This document records the model selection rationale for loopeng v1. Every
model choice must trace back to the North Star: a pre-defined agent team
running spec → implement → verify → document for mobile fullstack projects
(iOS, Android, React Native, KMP) with Maestro/Appium E2E testing, on Pi,
with minimal cost and maximal agentic capability.

**Principle:** Frontier models (GPT 5.5, Claude Opus 4.8, Claude Fable 5) are
benchmarks only, not daily drivers. If an open-weight model can do a task,
use the open-weight model. Frontier usage is reserved for tasks where the
quality gap has measurable impact — and is documented as such.

---

## Types of Work and Relevant Benchmarks

Loopeng runs different *types* of work. The right model depends on the task,
not just the overall score.

### Agentic Coding (spec → implement → verify)

This is the core loopeng workflow. The model must reason about architecture,
write code across multiple files, use tools, and verify its own output.
**Most relevant:** AA Agentic Index + Design Arena agent categories
(`fullstack`, `webapps`, `mobileapps`, `androidnative`).

### Analytical Research (this document)

Querying APIs, cross-referencing data, calculating cost/quality ratios,
writing structured analysis. Zero code generation, zero tool use.
**Most relevant:** AA Intelligence Index.

The model that did this research: Claude Fable 5 (AA Intel 59.9, $10/$50).
The best open-weight alternative: **GLM 5.2** (AA Intel 51.1, $0.57/$1.80).
GLM 5.2 would do this work at ~85% of the intelligence for ~1% of the cost.

### The Maker/Checker Principle

A core loopeng insight: *the same model should never review its own output.*
Different model families have different architectures, training data, and
failure modes. A Z.ai model and a DeepSeek model won't share the same blind
spots. The reviewer doesn't need to be smarter than the maker — it needs to
be **different**.

### Deep Codebase Analysis

Feeding in a large codebase to trace bugs, map dependencies, or plan
refactors. **Most relevant:** Context window size + AA Coding Index, since
agentic tool use matters less than bulk comprehension.

### Visual Verification (Mobile UI)

Reviewing screenshots, comparing UI diffs, identifying layout regressions.
**Most relevant:** Image support + Design Arena `mobileapps`.

## Benchmark Methodology

We use two independent benchmark sources to avoid single-vendor bias:

1. **Artificial Analysis** (AA) — coding_index, agentic_index, intelligence_index.
   These are composite scores from independent third-party evaluation.
2. **Design Arena** — head-to-head agent battles on real development tasks:
   `fullstack`, `webapps`, `mobileapps`, `androidnative`, `codecategories`.
   These measure actual agentic performance, not just code generation.

Frontier models serve as the quality ceiling:

| Model | Prompt/M | Compl/M | AA Coding | AA Agentic | AA Intel | Code Cat | Fullstk | Mobile | Android |
|---|---|---|---|---|---|---|---|---|---|
| **Fable 5** | $10.00 | $50.00 | **76.5** | **52.8** | **59.9** | #2 | — | — | — |
| **GPT 5.5** | $5.00 | $30.00 | 74.9 | 44.9 | 54.8 | #17 | #15 | #9 | #4 |

Open-weight models are evaluated against these on a value-per-dollar basis.

---

## Primary Agent: GLM 5.2

**ID:** `z-ai/glm-5.2`
**Cost:** $0.57/M prompt, $1.80/M completion, $0.17/M cache read
> **Verified:** 2026-07-05 live API. Previously documented $0.91/$2.86 (price
dropped after initial research).
**Context:** 1,048,576 tokens
**Modality:** text → text

### Why GLM 5.2

| Metric | GPT 5.5 | Claude Opus 4.8 | GLM 5.2 | % of Frontier |
|---|---|---|---|---|
| AA Coding Index | 74.9 | 74.3 | **68.8** | 92% |
| AA Agentic Index | 44.9 | 47.2 | **43.1** | 91–96% |
| AA Intelligence Index | 54.8 | 55.7 | **51.1** | 92–93% |
| Cost (prompt + completion) | $5.00/$30.00 | $5.00/$30.00 | **$0.57/$1.80** | 10–18% |

| Design Arena Agent Task | GLM 5.2 | GPT 5.5 | Claude Opus 4.8 |
|---|---|---|---|
| Fullstack | **#3** | #15 | #2 |
| Webapps | **#3** | #18 | #2 |
| Mobileapps | #5 | #9 | **#1** |
| Android Native | #7 | #4 | **#1** |
| Code Categories (models) | **#1** | #17 | #22 |

GLM 5.2 is the only open-weight model that competes with frontier models on
agentic tasks. It is #1 in code categories (beating all frontier models), #3
in fullstack and webapps, and #5 in mobileapps. At ~18% the price of GPT 5.5,
it delivers ~92% of the quality across all dimensions.

**Assigned roles:** Spec writer, implementer.

**Limitations:** No image support. For tasks requiring screenshots or UI
review, delegate to Kimi K2.7 Code.

---

## Secondary Agent: Kimi K2.7 Code (Multimodal / Mobile)

**ID:** `moonshotai/kimi-k2.7-code`
**Cost:** $0.74/M prompt, $3.50/M completion, $0.15/M cache read
**Context:** 262,144 tokens
**Modality:** text + image → text

### Why Kimi K2.7 Code

| Metric | K2.6 | K2.7 Code | Notes |
|---|---|---|---|
| AA Coding Index | 56.0 | **60.8** | K2.7 Code is the code-specialized variant |
| AA Agentic Index | 30.3 | 29.6 | Negligible difference for UI review |
| Design Arena Mobileapps | #8 | #10 | Both strong on mobile |
| Image support | ✅ | ✅ | Both support images |
| Cost (prompt) | $0.66 | $0.74 | Nearly identical |

K2.7 Code was chosen over K2.6 because the Verifier (UI) role is primarily
visual reasoning backed by code understanding — not multi-step agentic tool
use. The 4.8-point coding advantage of K2.7 Code matters more for
determining whether a UI matches its spec than the 0.7-point agentic
advantage of K2.6.

**Assigned roles:** Verifier (UI).

**Dropped:** `moonshotai/kimi-k2.6` — subsumed by K2.7 Code (higher coding,
same image support, nearly identical cost).

---

## Deep Analysis: DeepSeek V4 Pro

**ID:** `deepseek/deepseek-v4-pro`
**Cost:** $0.43/M prompt, $0.87/M completion, $0.004/M cache read
**Context:** 1,048,576 tokens
**Modality:** text → text

### Why DeepSeek V4 Pro

| Metric | Value | Notes |
|---|---|---|
| AA Coding Index | 59.4 | 79% of GPT 5.5 |
| AA Agentic Index | 36.4 | Second-highest among open models |
| Context | 1M tokens | Feeds entire codebases in one shot |
| Cost | $0.43/$0.87 | 2.1x cheaper than GLM 5.2 |

The primary use case is deep codebase analysis: feed in a 200K+ token
codebase, ask it to trace a bug across multiple files, understand dependency
chains, or propose a large-scale refactor. The 1M context and strong reasoning
(36.4 agentic) make it better suited for this than the cheaper flash variant.

**Assigned roles:** Verifier (Code), deep codebase analysis.

### Why DeepSeek V4 Pro (after red team review 2026-07-05)

Design Arena shows #29 in fullstack agents and #25 in webapps. This is a known
weakness — but it is **not a problem** for the Verifier (Code) role.

The maker/checker principle requires **diversity of blind spots**, not parity
of capability. GLM 5.2 (Z.ai, MoE) and DeepSeek V4 Pro (DeepSeek, MoE with
different routing) have completely different architectures, training data, and
failure modes. When Z.ai's expert routing misses a cross-module type error,
a DeepSeek model will think differently and likely catch it.

| Model | AA Coding | Design Arena Fullstack | Fullstack Rank Gap |
|---|---|---|---|
| Implementer: GLM 5.2 | 68.8 | #3 | baseline |
| Verifier: DS V4 Pro | 59.4 | #29 | -26 |

The 26-rank gap is real but does not invalidate the arrangement. The checker
does not need to be *smarter* than the maker — it needs to be *different*
from the maker. Different architecture = different blind spots = better
verification.

**Trade-off acknowledged:** DeepSeek V4 Pro is not a superior reviewer. It
is a *complementary* reviewer. It catches different classes of errors, not
the same errors more reliably. This is the correct interpretation of the
maker/checker principle.

**Deep analysis role:** Feed in a 200K+ token codebase, trace a bug across
multiple files, understand dependency chains, propose large-scale refactors.
The 1M context and strong reasoning (36.4 agentic) make it better suited
for this than the cheaper flash variant.

---

## Budget Workhorses

### DeepSeek V4 Flash

**ID:** `deepseek/deepseek-v4-flash`
**Cost:** $0.09/M prompt, $0.18/M completion, $0.02/M cache read
**Context:** 1,048,576 tokens
**AA Coding:** 56.2 | **AA Agentic:** 31.1 | **AA Intel:** 40.3

Use for: test boilerplate generation, documentation drafts, simple lint fixes,
CI/CD status messages — anything high-throughput and low-stakes.

At $0.09/$0.18, it is **55x cheaper than GPT 5.5** while retaining
75% of GPT 5.5's coding ability.



---

## Free Tier

> **Superseded 2026-07-05.** The free tier is removed from the active model
> roster. OpenRouter ZDR (account-wide) blocks `:free` provider endpoints, so
> `nvidia/nemotron-3-ultra-550b-a55b:free` is unusable. Its workload (CI
> scripts, changelogs, simple test assertions) is absorbed by
> `deepseek/deepseek-v4-flash` ($0.09/$0.18 per M, ZDR-compliant). The
> authoritative registry is `~/.pi/agent/models.md`. See
> `docs/learnings/2026-07-05-model-zdr-and-free-tier-removal.md`.

### Nemotron Ultra 550B:free

**ID:** `nvidia/nemotron-3-ultra-550b-a55b:free`
**Cost:** Free
**Context:** 1,000,000 tokens
**AA Coding:** 49.3 | **AA Agentic:** 27.4 | **AA Intel:** 37.8

The best free model with benchmarks. 49.3 coding at $0 cost. Use for any
non-critical task where spending credits isn't justified — CI/CD pipeline
scripts, changelog generation, simple test assertions.

---

## Full Agent Team: 7 Roles, 4 Models

Loopeng runs two phases. The **analysis loop** runs before any code exists.
The **code loop** runs after analysis is validated. Each phase has its own
maker/checker pairs.

### Pre-Code: Analysis Loop

| # | Role | Model | AA Intel | Does |
|---|---|---|---|---|
| 1 | **Analyst** | GLM 5.2 | 51.1 | Web search, API queries, gather benchmarks, synthesize data, draft analysis |
| 2 | **Analysis Reviewer** | DeepSeek V4 Pro | 44.3 | Fact-check analyst output, cross-reference claims, catch reasoning errors, verify numbers |

### Code: Implementation Loop

| # | Role | Model | Does |
|---|---|---|---|
| 3 | **Spec Writer** | GLM 5.2 | Validated analysis → actionable, implementable spec |
| 4 | **Implementer** | GLM 5.2 | Write code across files, follow spec |
| 5 | **Verifier (Code)** | DeepSeek V4 Pro | Review diffs against spec, 1M context for large codebases |
| 6 | **Verifier (UI)** | Kimi K2.7 Code | Screenshots, Maestro/Appium results, layout regressions |
| 7 | **Documenter** | DeepSeek V4 Flash | Changelogs, API docs, README updates. 6.3x cheaper on prompt, 10x cheaper on completion than GLM 5.2. Earns its keep via cost savings on high-throughput, low-risk role.

### Maker/Checker Pairs

```
Analyst (GLM 5.2)      ──→  Analysis Reviewer (DeepSeek V4 Pro)
    Z.ai model                DeepSeek model
    AA Intel 51.1             AA Intel 44.3
    Different families → different blind spots

Implementer (GLM 5.2)   ──→  Verifier Code (DeepSeek V4 Pro)
    Same cross-family split
```

The reviewer exists to catch what the maker misses. When GLM 5.2 makes a
subtle interpretation error in benchmark data, DeepSeek V4 Pro won't share
the same blind spot because they're built by different teams, with different
architectures and training data.

### The Iteration Contract

The loop runs until every agent AND the human are satisfied:

```
Analyst → Reviewer → [issues?] → Analyst → Reviewer → [clear?]
    ↓
Spec Writer → Reviewer → [issues?] → Spec Writer → Reviewer → [clear?]
    ↓
Implementer → Verifier → [issues?] → Implementer → Verifier → [clear?]
    ↓
Verifier (UI) → [screenshots match spec?] → [no] → Implementer
    ↓
Documenter → [human signs off]
```

Each gate can loop back indefinitely. The human reviews at handoff gates:
analysis→spec, spec→code, code→delivery.

### Model Summary

| Model | Cost (P+C) | Roles | Why This Model for These Roles |
|---|---|---|---|
| **GLM 5.2** | $0.57/$1.80 | Analyst, Spec Writer, Implementer | 51.1 Intel, #3 fullstack, #1 code cat. The workhorse. |
| **DeepSeek V4 Pro** | $0.43/$0.87 | Analysis Reviewer, Verifier (Code) | Different family from GLM. 1M ctx. 36.4 agentic. Complementary reviewer — not smarter, *different*. |
| **Kimi K2.7 Code** | $0.74/$3.50 | Verifier (UI) | Images + 60.8 coding. Only role requiring vision. |
| **DeepSeek V4 Flash** | $0.09/$0.18 | Documenter | 56.2 coding at $0.09/$0.18. 6.3x cheaper on prompt, 10x on completion. Earns its keep via cost savings. |

---

## Available but Not Assigned (passive fallback, not in `enabledModels`)

These models are kept for architectural diversity and emergency fallback but
are NOT in the active team (`enabledModels`) and NOT configured in any
profile. They exist as built-in OpenRouter models that can be invoked ad hoc
via `pi --model <id>` or `codex -p` with a new profile if needed. No
`models.json` overrides exist (deleted 2026-07-05; built-in models need none).

| Model | Why Kept | AA Coding | AA Agentic | AA Intel | Cost (P/C/M) |
|---|---|---|---|---|---|
| `google/gemma-4-31b-it` | Google family = different blind spots. Weak but available for passive review. | 43.4 | 14.4 | 29.4 | $0.12/$0.35 |
| `qwen/qwen3.7-max` | Qwen architecture diversity. 66 coding but no role. | 66 | 30.6 | 46 | $1.25/$3.75 |

---

## Dropped from Active Selection (2026-07-05 red team)

| Model | Why Dropped |
|---|---|
| `nvidia/nemotron-3-super-120b-a12b:free` | Inferior to Ultra 550B:free on every metric. |
| `nvidia/nemotron-3-ultra-550b-a55b` (paid) | Paid tier has identical benchmarks to free tier at $0 cost. |
| `google/gemma-4-31b-it:free` | Covered by paid override (gemma-4-31b-it at $0.12/$0.35). |
| `moonshotai/kimi-k2.6` | Subsumed by K2.7 Code (higher coding, same image support). |
| `inclusionai/ling-2.6-flash` | No AA benchmarks. Same budget tier as Flash. |
| `xiaomi/mimo-v2.5-pro` | New, competitive, but no differentiator. |
| `minimax/minimax-m3` | Same as MIMO — no clear advantage. |

---

## Corrections to RESEARCH.md

RESEARCH.md (as of 2026-07-05) lists these models. Corrections from live API verification:

1. **GLM 5.2 cost updated:** documented $0.91/$2.86 → live API $0.57/$1.80 (dropped after initial research). Do not use old cost figure.
2. **`mistralai/devstral-2512`** → drop. AA Coding 31.3, AA Agentic 10.6.
   This is far below the quality floor needed for agentic work. Replace with
   DeepSeek V4 Pro for deep analysis or Qwen 3.6 Plus for multimodal.

3. **`qwen/qwen3.6-35b-a3b`** → upgrade to `qwen/qwen3.6-plus`.
   54.5 coding vs 41.9, 27.6 agentic vs 21.4, 1M context vs 262K,
   same image support, at $0.33/$1.95 vs $0.14/$1.00 (2.4x cost, 1.3x quality).

4. **`nvidia/nemotron-3-super-120b-a12b`** → drop entirely.
   Ultra 550B:free (49.3 coding, 27.4 agentic) subsumes it. Super 120B:free
   (37.7 coding, 8.7 agentic) is inferior on every metric. Keep only
   Ultra 550B:free as the single free-tier option.

---

## Models Not Recommended

| Model | Why Not |
|---|---|
| Codestral 2508 | #90 in code categories. Surprising miss from Mistral. |
| Mistral Large 2512 | 20.1 coding index at $0.50/$1.50 — outclassed by DeepSeek V4 Flash (56.2 at $0.09/$0.18). |
| Qwen 3 Coder 480B | #55 in code categories despite size. Underwhelming. |
| Solar Pro 3 | 16.2 coding. Too weak. |
| Granite 4.1 8B | 9.5 coding. Too small/weak for any loopeng task. |
| GPT 5 / GPT 5.5 Pro | Frontier pricing without frontier-tier Design Arena agent results. No value case. |

---

## How to Cross-Verify This Document

You can verify every claim in this document without spending money. The
document's data comes entirely from the OpenRouter API. Re-run the queries
and compare.

### Method 1: Review with an Open-Weight Model (Recommended)

Feed this document to **GLM 5.2** with the prompt:

> "Review this model selection document for factual errors. Cross-check every
> claimed benchmark number, cost figure, and comparison percentage against the
> OpenRouter API (`https://openrouter.ai/api/v1/models`). For each model
> mentioned, verify: (a) the model ID exists, (b) pricing matches, (c) AA
> benchmarks match within rounding, (d) Design Arena ranks match. Flag every
> discrepancy with the exact correct value."

**Cost: ~$0.008** (under one cent). This is the same model the document
recommends as the primary agent — eat your own dog food.

If GLM 5.2 finds issues it cannot resolve (ambiguous data, conflicting
benchmarks), escalate to a frontier model for those specific claims only.

### Tiered Review Strategy

| Pass | Model | Cost | Purpose |
|---|---|---|---|
| 1 | GLM 5.2 | $0.003 | Catch all obvious discrepancies |
| 2 | DeepSeek V4 Pro | $0.002 | Second opinion, cross-check reasoning |
| 3 | GPT-5.5 (frontier) | $0.04 | Resolve ambiguities, edge cases |

Only escalate to pass 3 if passes 1 and 2 produce conflicting results.

### When to Use Frontier for Review

| Scenario | Model | Why |
|---|---|---|
| Benchmark data is self-contradictory | GPT-5.5 | Needs highest analytical reasoning (cross-vendor from Fable) |
| Design Arena ranks reshuffled significantly | GPT-5.5 | Needs careful rank interpretation |
| New model released, no AA data yet | Fable 5 | Needs inference from partial data |
| Routine monthly re-verification | GLM 5.2 | Sufficient |

### Frontier Model Costs for Doc Review

| Model | Cost | AA Intel | Notes |
|---|---|---|---|
| GLM 5.2 | **$0.003** | 51.1 | Best open-weight. Always try first. |
| DeepSeek V4 Pro | $0.002 | 44.3 | Cheaper, slightly weaker. Good second pass. |
| GPT-5.5 | $0.04 | 54.8 | Frontier. Cross-vendor from Fable. First escalation. |
| Fable 5 | $0.13 | 59.9 | Frontier. Best analytical mind, highest cost. Last resort. |
| Nemotron Ultra:free | $0.00 | 37.8 | Free sanity check pass. |

### Method 2: Self-Verify with the OpenRouter API

```bash
# Verify any model's current pricing and benchmarks
curl -s "https://openrouter.ai/api/v1/models" \
  -H "Authorization: Bearer $OPENROUTER_API_KEY" \
  | python3 -c "
import json, sys
data = json.load(sys.stdin)
for m in data['data']:
    if m['id'] == 'z-ai/glm-5.2':
        p = m['pricing']
        print(f'Prompt: \${float(p[\"prompt\"])*1e6:.2f}/M')
        print(f'Completion: \${float(p[\"completion\"])*1e6:.2f}/M')
        b = m.get('benchmarks',{}).get('artificial_analysis',{})
        print(f'Coding: {b.get(\"coding_index\")}')
        print(f'Agentic: {b.get(\"agentic_index\")}')
        print(f'Intelligence: {b.get(\"intelligence_index\")}')
"
```

### Method 3: Verify Design Arena Rankings

Design Arena rankings update frequently. Check the live data:

```bash
curl -s "https://openrouter.ai/api/v1/models" \
  -H "Authorization: Bearer $OPENROUTER_API_KEY" \
  | python3 -c "
import json, sys
data = json.load(sys.stdin)
for m in data['data']:
    if m['id'] == 'z-ai/glm-5.2':
        for e in m.get('benchmarks',{}).get('design_arena',[]):
            if e.get('arena') == 'agents':
                print(f'{e[\"category\"]}: ELO={e[\"elo\"]} Rank=#{e[\"rank\"]} WR={e[\"win_rate\"]}%')
"
```



---

## Update Cadence

- **Monthly:** Re-run the OpenRouter API queries. Model availability and
  pricing change. New models appear.
- **On Design Arena refresh:** Rankings shift as more battles complete.
  Re-check the agent arena benchmarks especially.
- **On new model release:** Especially Poolside Laguna M.1 and Cohere North
  Mini Code — purpose-built coding agent models with no AA benchmarks yet.
  When benchmarks drop, re-evaluate.
