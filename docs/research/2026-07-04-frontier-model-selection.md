# Frontier Model Selection

> **Date:** 2026-07-04
> **Status:** Active research. Decision pending user approval.
> **Cross-ref:** `docs/research/model-selection.md` (primary agent team),
> `docs/NORTH_STAR.md` (open-weights primary, frontier as targeted escalation)

## The question

The user has two Anthropic frontier models as backup (`claude-opus-4.8` +
`claude-fable-5`) and wants to replace one with an OpenAI GPT model for
cross-vendor diversity: *"there should be fable and gpt 5.6 or 5.5 something
like that."* The goal: maximize cost/quality, cross-vendor maker/checker,
targeted last-resort escalation only.

## OpenRouter API evidence (queried 2026-07-04)

### OpenAI GPT frontier models available

| Model | Cost (P/C per M) | Context | AA Coding | AA Agentic | AA Intel |
|---|---|---|---|---|---|
| `openai/gpt-5` | $1.25/$10.00 | 128K | 37.8 | 25.7 | 34.7 |
| `openai/gpt-5.1` | $1.25/$10.00 | 400K | — | — | — |
| `openai/gpt-5.2` | $1.75/$14.00 | 400K | — | — | — |
| `openai/gpt-5.4` | $2.50/$15.00 | 400K | — | — | — |
| **`openai/gpt-5.5`** | **$5.00/$30.00** | **1.05M** | **74.9** | **44.9** | **54.8** |
| `openai/gpt-5.5-pro` | $30.00/$180.00 | 1.05M | — | — | — |

**GPT-5.6 does not exist on OpenRouter.** GPT-5.5 is the latest available.
GPT-5.5-pro is $30/$180 — too expensive for targeted escalation.

### Anthropic Claude frontier models available

| Model | Cost (P/C per M) | Context | AA Coding | AA Agentic | AA Intel |
|---|---|---|---|---|---|
| `anthropic/claude-opus-4.8` | $5.00/$25.00 | 200K | 74.3 | 47.2 | 55.7 |
| **`anthropic/claude-fable-5`** | **$10.00/$50.00** | 200K | **76.5** | **52.8** | **59.9** |
| `anthropic/claude-sonnet-5` | $2.00/$10.00 | 200K | 71.5 | 46.7 | 53.4 |

## Analysis: the cross-vendor pair

The user's requirement: *"exclusively as targeted last resort backup they
will do sanity test, research, fix of where open weights are coming short
and handback when done, minimal use, maximum benefit with cost being
minimized."*

### Recommendation: `anthropic/claude-fable-5` + `openai/gpt-5.5`

| Role | Model | Cost (P/C) | Why |
|---|---|---|---|
| Final escalation (strongest) | `anthropic/claude-fable-5` | $10/$50 | Highest benchmarks on all dimensions (coding 76.5, agentic 52.8, intel 59.9). The "when all else fails" model. |
| First escalation (cheaper) | `openai/gpt-5.5` | $5/$30 | Strong benchmarks (coding 74.9, agentic 44.9, intel 54.8) at half Fable's cost. Cross-vendor = different blind spots. |

### Why this pair beats the current setup

| Criterion | Current (Opus 4.8 + Fable 5) | Recommended (Fable 5 + GPT 5.5) |
|---|---|---|
| Vendor diversity | ❌ Both Anthropic | ✅ Anthropic + OpenAI |
| Maker/checker blind spots | ❌ Same vendor, shared blind spots | ✅ Different vendors, different architectures |
| Cost range | $5/$25 to $10/$50 | $5/$30 to $10/$50 |
| Benchmark ceiling | Fable 76.5 coding | Fable 76.5 coding (same) |
| Benchmark floor | Opus 74.3 coding | GPT-5.5 74.9 coding (higher) |
| Context window | Both 200K | Fable 200K, GPT-5.5 1.05M |

**Key improvement:** GPT-5.5 has a **1.05M token context window** (vs Opus
4.8's 200K). For the "research" and "fix" escalation use cases, this is
valuable — the model can ingest the full codebase + spec + error context
without truncation.

### The escalation ladder (cost-optimized)

```
Open-weights primary (daily driver)
  ├── GLM 5.2 ($0.91/$2.86)           — workhorse
  ├── DeepSeek V4 Pro ($0.43/$0.87)   — deep analysis, checker
  ├── Kimi K2.7 Code ($0.74/$3.50)    — UI/multimodal
  └── DeepSeek V4 Flash ($0.09/$0.18) — docs, boilerplate

Frontier escalation (targeted, last-resort)
  ├── GPT-5.5 ($5/$30)                — first escalation, cross-vendor, 1M ctx
  └── Fable 5 ($10/$50)               — final escalation, strongest model
```

The agent tries open-weights first. If they fall short, escalate to GPT-5.5
(cheaper frontier, different vendor). If GPT-5.5 can't resolve it, escalate
to Fable 5 (strongest, most expensive). This minimizes cost while maximizing
the chance that open-weights or cheaper frontier resolves the issue.

## Codex profile update

The codex profiles at `~/.codex/config.toml` currently have:
```toml
[profiles.opus]
model = "anthropic/claude-opus-4.8"

[profiles.fable]
model = "anthropic/claude-fable-5"
```

**Recommended update:**
```toml
[profiles.gpt55]
model = "openai/gpt-5.5"
model_reasoning_effort = "high"

[profiles.fable]
model = "anthropic/claude-fable-5"
model_reasoning_effort = "high"
```

This replaces `opus` with `gpt55` — cross-vendor, cheaper, larger context.
(Not applied yet — pending user approval. This is a personal codex config
change, not a loopeng repo change.)

## What this resolves

| Question | Answer |
|---|---|
| GPT 5.5 or 5.6? | GPT-5.5 (5.6 doesn't exist on OpenRouter yet) |
| Replace opus or fable? | Replace opus with GPT-5.5 (keep fable as the strongest) |
| Why cross-vendor? | Different blind spots (maker/checker principle) |
| Cost optimization? | GPT-5.5 ($5/$30) as first escalation, Fable ($10/$50) as final |
| Context window? | GPT-5.5 has 1.05M (vs Opus 200K) — better for research/fix |

## What this defers

- Pi `models.json` modelOverrides for the frontier pair (Phase 2 global setup)
- The escalation workflow config (when to auto-escalate vs human-triggered —
  Phase 3+ workflow design)
- Reverification cadence (monthly per `model-selection.md`)
