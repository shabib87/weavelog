---
date: 2026-08-15
topic: Why headroom dashboard shows only ~5% savings — full diagnosis
status: verified-live
sources:
  - "curl localhost:8788/stats (live, 91 requests at capture time)"
  - "~/.local/pipx/venvs/headroom-ai/lib/python3.13/site-packages/headroom/proxy/cost.py (build_prefix_cache_stats, _CACHE_ECONOMICS)"
  - "~/.local/pipx/venvs/headroom-ai/lib/python3.13/site-packages/headroom/proxy/handlers/openai.py (cache token extraction)"
  - "~/.local/pipx/venvs/headroom-ai/lib/python3.13/site-packages/headroom/proxy/prometheus_metrics.py (record)"
models_used_for_research: [z-ai/glm-5.2]
supersedes: none
---

# Why savings read ~5% (diagnosis, 2026-08-15)

Observed: 91 requests, avg_compression_pct 7.1, savings_pct 6.4,
cost breakdown {cache_savings_usd: 0.0, compression_savings_usd: 0.67}.

## Finding 1 — compression % is structurally low BY DESIGN

- CacheAligner keeps the FROZEN PREFIX (system prompt + tool schemas + conversation history)
  byte-identical so the provider prompt cache is not busted. Only the LIVE ZONE (new tool
  output, latest turn) is compressed.
- tool_schema_tokens_saved: 0 — tool schemas are not compacted.
- opencode traffic: 44 reqs, 5.15M -> 4.89M tokens = 5.19%. pi-extension (/v1/compress tool
  results): 35 reqs = 11.56%.
- DO NOT "fix" this by enabling HEADROOM_COMPRESS_SYSTEM_MESSAGES / _USER_MESSAGES: rewriting
  the prefix destroys the prompt cache, a net LOSS (cache reads cost 0.1-0.25x; compression
  saves only ~5-7% on uncached bytes).

## Finding 2 — real opencode traffic had ZERO cache hits at diagnosis time

- prefix_cache.totals.cache_read_tokens = 6976 = EXACTLY the 4 synthetic probe requests
  (2176 + 4800). The 44 real opencode requests reported cached_tokens = 0.
- Likely causes: (a) opencode.jsonc setCacheKey=true was staged but OpenCode.app NOT restarted,
  so no prompt_cache_key was sent; (b) without a cache key / stable prefix, sticky routing never
  engages and providers rotate -> no cache accumulates.
- ACTION: restart OpenCode.app, run a real multi-turn session, re-check
  prefix_cache.totals.cache_read_tokens — it must GROW. If it stays 0, opencode's prefix is
  unstable (investigate dynamic system-prompt content / headroom transform determinism).

## Finding 3 — dashboard UNDER-REPORTS cache $ for OpenRouter models (attribution gap)

- handlers/openai.py DOES parse usage.prompt_tokens_details.cached_tokens (lines ~489, ~1461)
  and record() stores it under provider="openai" / "litellm-openrouter".
- BUT cost.py build_prefix_cache_stats prices cache savings only via a hardcoded allowlist:
  _CACHE_ECONOMICS = {anthropic, openai, gemini, bedrock} and model matching only for
  claude/gpt-o1-o3-o4/gemini names. openrouter open-weight models match NOTHING ->
  input_price_per_token = None -> cache_savings_usd = 0.
- Also _CACHE_ECONOMICS["openai"].read_multiplier = 0.5, wrong for our models (0.1-0.25).
- CONSEQUENCE: even when cache hits happen, dashboard shows ~$0. headroom's total_saved_usd
  is COMPRESSION-ONLY for our stack.

## Correct mental model

- headroom dashboard compression % (5-7%) = real, additive, expected.
- Prompt-cache savings = the DOMINANT lever, realized on the OpenRouter BILL, invisible in
  headroom's cache_savings_usd for openrouter models.
- Source of truth for cache $: OpenRouter Activity/Logs page (cache_discount field), NOT
  headroom's dashboard.

## Do NOT patch vendor code

Fixing the attribution allowlist means patching installed headroom source — wiped on upgrade,
violates KISS/durability. Document + use OpenRouter's own accounting instead.
