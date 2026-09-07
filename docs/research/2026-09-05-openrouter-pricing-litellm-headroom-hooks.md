---
date: 2026-09-05
topic: OpenRouter pricing APIs, non-LiteLLM cost libraries, LiteLLM capability survey vs headroom, headroom pricing hooks (Q4)
status: verified-live
sources:
  - "LIVE PROBE 2026-09-05: https://openrouter.ai/api/v1/models (curl, no auth header sent; headers + pricing schema inspected)"
  - "https://openrouter.ai/docs/api-reference/overview (generation endpoint, OpenAPI specs)"
  - "https://openrouter.ai/docs/use-cases/usage-accounting (usage/cost in every response; include:true deprecated)"
  - "https://openrouter.ai/docs/api-reference/get-credits (total_credits/total_usage; 401/403 semantics)"
  - "https://openrouter.ai/docs/llms.txt (docs index; guides only - no /models API-reference slug found)"
  - "https://www.npmjs.com/package/or-pricing (endpoint table: /models auth=None; /endpoints per-provider pricing+uptime)"
  - "registry.npmjs.org probes 2026-09-05: tokenlens, token-costs, or-pricing, llm-pricing, tokentally, @basisoasis/llm-intel (last-publish dates)"
  - "https://tokenlens.dev/docs/overview ; https://github.com/basisoasis/llm-intel ; https://github.com/Jannchie/llm-pricing ; https://github.com/steipete/tokentally ; https://github.com/dev3mike/llm-cost-calculator"
  - "context7 /websites/litellm_ai -> docs.litellm.ai: /docs/sdk_custom_pricing, /token_usage, /routing (custom pricing, token_counter, router/fallbacks/load-balance)"
  - "https://docs.litellm.ai/docs/proxy/users (virtual key max_budget), /docs/proxy/caching, /docs/proxy/health, /docs/proxy/embedding, /docs/proxy/guardrails/quick_start (200; base /guardrails is 404)"
  - "LOCAL SOURCE VERIFICATION: headroom 0.36.5 at ~/.local/pipx/venvs/headroom-ai/lib/python3.13/site-packages/headroom/ (pricing/, proxy/model_router.py, transforms/content_router.py, proxy/server.py); headroom proxy --help"
  - "~/.agents/docs/research/2026-08-15-headroom-pricing-internals.md (litellm map fetch semantics, alias-map mechanics, per-token unit note)"
models_used_for_research: [openrouter/z-ai/glm-5.3-flash]
supersedes: none
---

# OpenRouter pricing APIs, LiteLLM ecosystem, headroom pricing hooks (2026-09-05)

Note: locally installed headroom is **0.36.5** (dispatch said 0.35.x); all headroom evidence below is from 0.36.5.

## 1. OpenRouter native pricing APIs (no litellm)

**GET /api/v1/models - verified live 2026-09-05:**
- **No API key required** (HTTP/2 200 with no Authorization header; or-pricing endpoint table also documents auth=None).
- Top-level: `{data, total_count, links}` (pagination via links); 431 models at probe time.
- Model object keys: `id, canonical_slug, alias_target, hugging_face_id, name, created, description, context_length, architecture, pricing, top_provider, per_request_limits, supported_parameters, default_parameters, supported_voices, knowledge_cutoff, expiration_date, links, reasoning`.
- **pricing = strings, USD PER TOKEN** (do not scale by 1e6 - see 2026-08-15 pricing-internals note). Full field superset observed on `google/gemini-3-pro-image`: `prompt, completion, image, image_output, audio, input_audio_cache, web_search, internal_reasoning, input_cache_read, input_cache_write`. Field set varies per model (e.g. `~z-ai/glm-flash-latest` had only prompt/completion/input_cache_read). **Cache-read AND cache-write prices are included** where the provider supports them.
- **No ETag**; `cache-control: public, max-age=300, stale-while-revalidate=3600, stale-if-error=3600`, `cf-cache-status: HIT` (Cloudflare CDN; expect <=5-min-fresh data, no per-version changelog documented for this endpoint).

**Other cost-bearing endpoints:**
- **Usage accounting**: every response (streaming last SSE chunk and non-streaming) now auto-includes `usage` with native-tokenizer token counts, `cost` (credits), `cost_details.upstream_inference_cost`, `cached_tokens`, `cache_write_tokens`. `usage:{include:true}` / `stream_options:{include_usage:true}` are deprecated no-ops (docs). Cheapest native "exact cost" hook - no pricing table needed.
- **GET /api/v1/generation?id=<id>**: async audit of a completed generation (native token counts + cost). Auth required.
- **GET /api/v1/credits**: `{total_credits, total_usage}`; Bearer auth; 401 missing header, 403 unless management key.
- **GET /api/v1/models/{author}/{slug}/endpoints**: per-provider pricing + uptime + status, no auth (per or-pricing README).

## 2. Non-litellm cost libraries (npm registry probes 2026-09-05)

| Package | Version | Last publish | Verdict |
|---|---|---|---|
| @basisoasis/llm-intel | 1.0.77 | **2026-09-04** | Most active; OpenRouter-sourced pricing, bignumber.js exact math, 3-tier cache |
| llm-pricing (Jannchie) | 0.17.0 | 2026-08-25 | Active; models.dev + OpenRouter catalogs, offline snapshot + overrides, cost ranges |
| tokentally (steipete) | 0.1.4 | 2026-08-10 | Early (0.1.x); usage normalization + static/LiteLLM/OpenRouter pricing resolution |
| token-costs | 3.5.0 | 2026-02-23 (~6.5 mo) | Daily-crawled JSON API + npm data, zero deps; freshness slipping |
| or-pricing | 3.0.0 | 2026-02-16 (~6.5 mo) | CLI research tool; self-described "not billing integration" |
| tokenlens | 1.3.1 | 2025-10-04 (~11 mo) | Multi-gateway catalogs (OpenRouter/models.dev/Vercel); stale latest, 2.0.0-alpha.3 pre-release exists |
| llm-cost-calculator (GitHub, dev3mike) | - | 2025-01-20 | Node, auto-fetches OpenRouter /models; single-author, minimal |

Assessment: several credible **cost-computation** libraries exist (TypeScript/Node; **no maintained Python-side non-litellm package surfaced**). But none replaces our bridge: headroom itself calls `litellm.cost_per_token()` internally, so prices must land in litellm `model_cost` regardless. models.dev (`api.json`) is a neutral catalog alternative used by llm-pricing/tokenlens.

## 3. LiteLLM beyond pricing - vs what headroom 0.36.5 already does

| Capability | LiteLLM (docs) | headroom overlap | Verdict for our harness |
|---|---|---|---|
| Token counting | `litellm.token_counter` - model-specific tokenizers or tiktoken fallback (/token_usage) | Own tokenizer stack (tiktoken, HF) for compression decisions | No gap; tiktoken alone cannot cover OpenRouter models |
| Budgets | Proxy virtual keys `max_budget`/`budget_duration` per key/user/team, DB-backed (/proxy/users) | **Native**: `--budget` USD x `--budget-period` hourly/daily/monthly, 429 enforcement, `HEADROOM_BUDGET_ESTIMATED_BASIS` (verified --help) | headroom covers single-user; LiteLLM only for multi-tenant |
| Routing + fallbacks | `Router` model_list, strategies (simple-shuffle/latency/cost-based), `routing_groups`, retries, cooldowns (/routing) | `HEADROOM_MODEL_ROUTES` JSON array + `HEADROOM_MODEL_ROUTER_ENABLED` (model_router.py) + retry-max-attempts/base/max-delay; OpenRouter has model fallbacks natively | Overlap high; LiteLLM router only pays with multi-provider fleets |
| Load balancing | Multi-deployment same-name balancing | None (single upstream; concurrency caps only) - but OpenRouter balances providers itself | No gap |
| Caching | Redis exact + `redis-semantic`; **docs warn semantic caching "replays stale responses" on multi-turn/agentic traffic** (/proxy/caching) | Semantic cache + CCR + provider prefix-cache mode (`--mode cache`), designed for agent traffic | headroom strictly better fit; LiteLLM semantic cache is an anti-feature here |
| Embeddings | `/v1/embeddings` OpenAI-compatible passthrough (/proxy/embedding) | Internal embedder (HEADROOM_EMBEDDING_SERVER, Qdrant, sentence-transformer) for its own features | Partial overlap; no need |
| Guardrails | Guardrails system (docs.litellm.ai/docs/proxy/guardrails/quick_start - 200; base /guardrails path now 404) | None (compression only) | Only genuinely LiteLLM-exclusive capability; not currently needed |
| Health checks | `/health` + background per-deployment LLM probes (/proxy/health) | `/health`, `/livez`, `/stats` (server.py, verified) | Adequate overlap |
| Standalone gateway | Multi-tenant proxy: virtual keys, DB spend tracking, teams | headroom IS the local gateway | Stacking both = extra hop; unjustified for single-user |

## 4. headroom official pricing hooks (0.36.5, source-verified)

- **NO pricing-injection hook exists.** Exhaustive env inventory (300+ HEADROOM_* vars) shows **no** HEADROOM_*PRICE*/CSV/JSON pricing-file option.
- `HEADROOM_MODEL_ALIAS_MAP` (litellm_pricing.py): official, gateway-agnostic, fail-soft JSON `{client_name: target}` - resolves names to **existing** `litellm.model_cost` keys (direct lookup, no get_llm_provider). It maps to prices; it cannot ADD prices.
- `HEADROOM_BEDROCK_MODEL_MAP`: second alias map (bedrock-specific).
- `HEADROOM_NET_COST_POLICY=1` (content_router.py): opt-in compression-vs-cache-bust break-even gate (P_alive, expected reads) - **compression economics, not per-token pricing config**.
- headroom itself ships static price modules (pricing/anthropic_prices.py, deepseek_prices.py, openai_prices.py, registry.py) injected into litellm at import - the vendor extension pattern is "inject into litellm.model_cost", same as our bridge.
- LiteLLM-side alternatives to file patching: `litellm.register_model(model_cost={...})` (exists in installed litellm utils.py) or per-call `input_cost_per_token`/`output_cost_per_token` (/docs/sdk_custom_pricing); `LITELLM_LOCAL_MODEL_COST_MAP=true` forces the bundled JSON. **Inference (unverified)**: a headroom proxy extension (`HEADROOM_PROXY_EXTENSIONS`) could call register_model at proxy startup - upgrade-proof, worth a prototype.
- Upgrade hazard confirmed (see 2026-08-15 note); weekly sync-model-pricing --check drift detection remains the guard.

## Bottom lines

1. **OpenRouter gives you everything natively**: keyless /models with per-token in/out/cache-read/cache-write prices; per-response usage.cost (now automatic); /generation for audit; /credits for account totals. No ETag/changelog; CDN-cached ~5 min.
2. Cost libraries are viable only if headroom telemetry path changes - it will not; keep the litellm-DB bridge.
3. LiteLLM marginal value to this harness = guardrails only; budgets/routing/caching/health all overlap with headroom, and LiteLLM semantic caching is explicitly unsuited to agentic traffic.
4. No official headroom pricing hook beyond HEADROOM_MODEL_ALIAS_MAP; the supported extension pattern is litellm model_cost injection.

## Unresolved questions

- Exact docs URL for the /models endpoint schema (llms.txt lists guides only; API reference likely OpenAPI-generated - overview page references OpenAPI specs but I did not fetch the spec).
- Whether HEADROOM_MODEL_LIMITS covers pricing (unverified; likely context limits).
- tokenlens v2 release status (latest=1.3.1 but 2.0.0-alpha.3 exists).
- Whether a headroom proxy extension can reliably register_model before first cost resolution (needs prototype).
