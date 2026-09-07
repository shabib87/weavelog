---
date: 2026-08-15
topic: OpenRouter prompt caching mechanics + our verified cache behavior
status: verified-live
sources:
  - https://openrouter.ai/docs/features/prompt-caching (fetched 2026-08-15)
  - live probe through headroom proxy (4x glm-5.2, ~4.9K shared prefix, unique tails)
models_used_for_research: [z-ai/glm-5.2]
supersedes: none
---

# OpenRouter prompt caching (Aug 2026)

## Per-provider mechanism

| Provider family | Caching | Cache read price | Notes |
|---|---|---|---|
| DeepSeek | automatic | 0.1x input | no annotation needed |
| Z.AI (glm) | automatic | ~0.2x input | OR sends Z.AI a session-affinity key derived from account + session_id |
| Moonshot (kimi) | automatic | 0.25x input | no annotation needed |
| OpenAI | automatic | 0.25x/0.5x | min 1024 tokens; GPT-5.6+ charges writes 1.25x |
| Alibaba/Qwen | EXPLICIT cache_control | 0.1x read / 1.25x write | only listed models (qwen3-max, qwen-plus, qwen3.6-plus, qwen3-coder-*). qwen3.8-2.4t-a95b NOT listed -> treat as no-cache |
| Anthropic | cache_control | 0.1x read / 1.25x write(5m) / 2x(1h) | min tokens per model |
| Google | implicit + cache_control | 0.25x | min 1024/4096 |

## Sticky routing (critical)

- OpenRouter applies provider STICKY ROUTING per conversation, keyed by hash of first system
  + first non-system message. Activates AFTER first cache hit (unless session_id given).
- session_id (body) or x-session-id (header) activates sticky from request 1. <=256 chars.
- **Manual provider.order DISABLES sticky routing.** Our qwen3.8 pin exists for 1M-context
  correctness, NOT caching. glm-5.2 deliberately unpinned so sticky routing can maximize hits.
- Sticky sessions expire after 10 min inactivity; each request resets the timer.
- Fallback to OpenAI-style prompt_cache_key field if no session_id.

## Our config

- opencode.jsonc: provider.openrouter.options.setCacheKey = true (ensures a cache key is always
  set -> session-pinned routing). REQUIRES OpenCode.app RESTART to activate.
- headroom does NOT forward session_id (its internal session_id is a compression-cache key).

## Verified probe (2026-08-15)

4 sequential glm-5.2 requests, ~4939-token shared system prefix + unique user tails:
cached_tokens = 2176, 0, 0, 4800 (97% on request 4).
=> Cache mechanism WORKS through the proxy. Mid-sequence misses are normal provider
propagation; when testing, assert cached_tokens>0 on ANY of requests 2-4, use >=4K prefix.

## Pitfalls

- Identical repeat requests may be served from headroom's OWN compression cache and never reach
  upstream -> cache probes MUST vary a tail per request.
- usage.prompt_tokens_details.cached_tokens reports hits; cache_write_tokens on first write.
- Keep the initial message array bytes IDENTICAL between requests; push dynamic content to the end.
