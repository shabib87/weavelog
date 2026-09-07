---
date: 2026-08-15
topic: Open-weight model tiers for agentic coding (OpenRouter)
status: superseded
superseded_by: 2026-08-30-model-redistribution-cost-quality.md
sources:
  - https://openrouter.ai/api/v1/models (live catalog, fetched 2026-08-15)
  - https://openrouter.ai/api/v1/models/<id>/endpoints (per-provider context/pricing)
models_used_for_research: [qwen/qwen3.8-2.4t-a95b]
supersedes: none
---
> SUPERSEDED 2026-08-30 by the TASK-25 roster (docs/research/2026-08-30-model-redistribution-cost-quality.md).
> glm-5.2 retired → glm-5.3-flash conductor. This note is retained as the historical snapshot.

# Open-weight model tiers (Aug 2026)

Hard rules adopted: every model MUST offer >=1M context on OpenRouter; open-weights only;
vision capability tracked per model (most coding open-weights are TEXT-ONLY).

## Active stack (in ~/.agents/stack-versions.json)

| Role | Model | $/M in/out | Context | Vision | Notes |
|---|---|---|---|---|---|
| Workhorse/default | z-ai/glm-5.2 | 0.462 / 1.452 | 1,048,576 | no | MIT; 33 providers; cache read ~0.2x; left UNPINNED for sticky routing |
| Scout/small | deepseek/deepseek-v4-flash | 0.064 / 0.129 | 1,048,576 | no | cheapest large model; cache read 0.1x |
| Reviews/gates | qwen/qwen3.8-2.4t-a95b | 2.00 / 6.00 | 1,048,576 | no | text-only on OR; 1M only via SiliconFlow/Modal/Alibaba (pinned) |
| Escalation only | moonshotai/kimi-k3 | 3.00 / 15.00 | 1,048,576 | image+video | 13 providers; strongest agentic benchmarks |
| Vision-mid (backlog) | minimax/minimax-m3 | 0.30 / 1.20 | 1,048,576* | image+video | 1M only on GMICloud/Novita/StreamLake/Parasail/ModelRun |

## Dropped / watched

- moonshotai/kimi-k2.7-code — 262K ctx, violates 1M rule
- qwen/qwen3.8-max — single provider (Alibaba) + unverified ZDR; use 2.4t-a95b instead
- openai/gpt-5.5, anthropic/claude-fable-5 — non-open-weight, pruned
- deepseek/deepseek-v4-pro-0813 — heavy-text fallback candidate ($0.435/$0.87, text-only)
- GLM-5.3 — released 2026-08-14, OpenRouter slug pending; check during maintenance sweeps
- deepseek/deepseek-v3.1-terminus — EXPIRED 2026-08-17 (example of why expiry sweep exists)

## Escalation ladder on failure

flash -> glm-5.2 -> qwen3.8 -> kimi-k3 (escalate only after 2 failed attempts)

## Re-derivation protocol (quarterly, or before any model decision)

1. GET /api/v1/models -> filter open-weight families (z-ai/, moonshotai/, deepseek/, qwen/,
   minimax/, meta-llama/, mistralai/, nvidia/, meituan/, kwaipilot/, openai/gpt-oss)
2. Keep: id, context_length, pricing.prompt/completion/input_cache_read, created,
   architecture.input_modalities
3. GET /api/v1/models/<id>/endpoints -> provider count, per-provider context_length
   (SOME PROVIDERS CAP CONTEXT BELOW CATALOG VALUE -> pin provider.order for those),
   uptime, per-provider cache_read pricing
4. Criteria: >=1M ctx, open weights, price tier fit, >=5 providers for workhorse roles
