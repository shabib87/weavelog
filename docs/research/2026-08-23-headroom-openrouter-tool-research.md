---
date: 2026-08-23
topic: Headroom (v0.35.0) + OpenRouter API — tool identity, API surfaces, harness wiring, and usage-match audit
status: verified-live
sources:
  - "https://openrouter.ai/docs/api_reference/parameters (fetched 2026-08-23)"
  - "https://openrouter.ai/docs/guides/best-practices/reasoning-tokens (fetched 2026-08-23 via websearch)"
  - "https://openrouter.ai/docs/guides/best-practices/prompt-caching (fetched 2026-08-23 via websearch)"
  - "https://openrouter.ai/docs/guides/routing/provider-selection (fetched 2026-08-23 via websearch)"
  - "https://openrouter.ai/docs/client-sdks/python/components/chatrequestreasoningeffort (fetched 2026-08-23 via websearch)"
  - "https://openrouter.ai/docs/api_reference/overview (fetched 2026-08-23 via websearch)"
  - "https://openrouter.ai/blog/tutorials/prompt-caching-sticky-routing/ (fetched 2026-08-23 via websearch)"
  - "~/.agents/stack-versions.json (live, mtime 2026-08-16)"
  - "~/.config/opencode/opencode.jsonc (live, read 2026-08-23)"
  - "~/.agents/docs/research/2026-08-15-headroom-sdk-utilization.md (prior research, 40-page docs synthesis)"
  - "~/.agents/docs/research/2026-08-15-openrouter-prompt-caching.md (prior research, live probe verified)"
  - "~/.agents/docs/research/2026-08-16-headroom-mcp-removal.md (decision doc, status: pending live edit)"
  - "~/.agents/docs/research/2026-08-15-headroom-pricing-internals.md (litellm pricing internals)"
  - "https://docs.headroomlabs.ai/docs/ (verified 2026-08-15 by prior research note; NOT re-fetched this round — 3-round budget exhausted)"
models_used_for_research: [z-ai/glm-5.2]
supersedes: none
---

# Headroom + OpenRouter — tool research for harness plan

## TOOL 1: Headroom (v0.35.0)

### What it is

Headroom is a **context compression proxy** (Python, pipx-installed, v0.35.0). It
intercepts OpenAI-compatible LLM API calls, compresses the message payload, and
forwards the compressed request upstream. It is NOT an MCP server by primary
identity — it is a transparent HTTP proxy. The MCP server (`headroom mcp serve`)
is a secondary surface that exposes compression tools to LLM agents.

**Live configuration** (verified from `stack-versions.json` + `opencode.jsonc`):
- launchd service `com.headroom.proxy` on port 8788
- CLI flags: `--mode cache --backend openrouter --memory --memory-storage project --learn`
- Binary: `~/.local/bin/headroom` (pipx, Python 3.13)
- CCR store: `~/.headroom/ccr_store.db`

Source: `~/.agents/stack-versions.json` (lines 2, 12-14), `~/.config/opencode/opencode.jsonc` (lines 3-5, 8-9)

### API surfaces (3 distinct surfaces)

| Surface | What it is | How the harness uses it | Status |
|---|---|---|---|
| **Proxy (HTTP)** | Transparent intercept at `http://localhost:8788/v1`. All opencode LLM traffic routes through it. Exposes `/v1/compress` (POST, loopback-only), `/health`, `/stats`, `/dashboard`. | opencode.jsonc `provider.openrouter.options.baseURL = "http://localhost:8788/v1"` — every LLM call goes through the proxy | **Active** |
| **MCP server** | `headroom mcp serve` — JSON-RPC over stdio. Exposes 3 tools: `headroom_compress`, `headroom_retrieve`, `headroom_stats` | Still wired in opencode.jsonc (lines 58-62, `"enabled": true`). Removal decision approved 2026-08-16 but **live edit never executed** — status "pending live edit" | **Active (pending removal)** |
| **SDK** | npm `headroom-ai@0.22.4` (dormant), Python `headroom` (SharedContext, compress(), simulate()) | Unused — scripts call `/v1/compress` via `fetch()` directly per scripting standard | **Dormant** |

Source: `~/.agents/docs/research/2026-08-15-headroom-sdk-utilization.md` §2, §8

### Does it proxy LLM requests to OpenRouter?

**YES.** `--backend openrouter` routes all proxy traffic to `https://openrouter.ai/api/v1`. The proxy intercepts the request, compresses the messages, then forwards the full request body (including all parameters like `reasoning_effort`, `temperature`, `provider`, etc.) upstream.

Source: `~/.agents/docs/research/2026-08-15-headroom-sdk-utilization.md` §2 line 83

### Does it strip or pass through `reasoning_effort`?

**Passes through (not stripped).** The proxy compresses message *content* — it does not modify or strip top-level request body parameters like `reasoning_effort`, `temperature`, `provider`, `tools`, `tool_choice`. These are forwarded as-is to the upstream provider.

**Known interference**: headroom does NOT forward `session_id` — its internal `session_id` is a compression-cache key, which overwrites any client-provided session_id. This is documented in the prior caching research note.

Source: `~/.agents/docs/research/2026-08-15-openrouter-prompt-caching.md` line 40

### Can the harness use it programmatically (not just as a background proxy)?

**YES**, via `POST http://localhost:8788/v1/compress`. The endpoint accepts a request body with `messages`, `model`, and a `config` object (`mode`, `frozen_message_count`, `compress_user_messages`, `target_ratio`, `protect_recent`). Response is snake_case: `tokens_before`, `tokens_after`, `tokens_saved`, `compression_ratio`, `ccr_hashes`, `transforms_applied`.

The endpoint is **loopback-only by default** (404 to remote callers). Remote use requires `HEADROOM_COMPRESS_ALLOW_REMOTE=1`.

Source: `~/.agents/docs/research/2026-08-15-headroom-sdk-utilization.md` §6, §9 gotcha 1

### Is it documented online?

**YES** — `https://docs.headroomlabs.ai/docs/` (40 pages, verified 2026-08-15 by prior research note using tavily crawl/extract). NOT re-fetched this round (3-round budget exhausted). Key doc pages referenced in prior note: `/docs/proxy`, `/docs/api-reference`, `/docs/cache-optimization`, `/docs/ccr`, `/docs/opencode`, `/docs/failure-learning`, `/docs/limitations`.

Source: `~/.agents/docs/research/2026-08-15-headroom-sdk-utilization.md` §1

### MCP tools — full set confirmation

The 3 tools (`headroom_compress`, `headroom_retrieve`, `headroom_stats`) are the **complete set**. No other MCP tools are exposed by `headroom mcp serve`. Confirmed by:
- opencode.jsonc MCP block (lines 58-62): single `headroom mcp serve` command
- Prior research note §2: "exposes `headroom_compress`, `headroom_retrieve`, `headroom_stats`"
- Removal note §3: "The three tool schemas (`headroom_compress`, `headroom_retrieve`, `headroom_stats`)"

Source: `~/.config/opencode/opencode.jsonc` lines 58-62, `~/.agents/docs/research/2026-08-16-headroom-mcp-removal.md` §3

---

## TOOL 2: OpenRouter (LLM API gateway)

### What it is

OpenRouter is a **pure HTTP API gateway** at `https://openrouter.ai/api/v1`. It routes requests to 70+ underlying LLM providers (OpenAI, Anthropic, DeepSeek, Z.AI, Google, etc.) with a unified OpenAI-compatible interface. It is NOT an MCP server and does not expose agent tools — it is purely a REST API.

Source: https://openrouter.ai/docs/api_reference/overview

### Request body parameters (full list, verified 2026-08-23)

Per `https://openrouter.ai/docs/api_reference/parameters`:

| Parameter | Type | Notes |
|---|---|---|
| `model` | string | Required (or use `models` for routing) |
| `messages` | array | Chat completions format (or `prompt` for text) |
| `temperature` | float 0-2 | Default 1.0 |
| `top_p` | float 0-1 | Default 1.0 |
| `top_k` | integer | Default 0 |
| `frequency_penalty` | float -2 to 2 | |
| `presence_penalty` | float -2 to 2 | |
| `repetition_penalty` | float 0-2 | |
| `min_p` | float 0-1 | |
| `top_a` | float 0-1 | |
| `seed` | integer | |
| `max_tokens` | integer | |
| `max_completion_tokens` | integer | |
| `logit_bias` | map | |
| `logprobs` | boolean | |
| `top_logprobs` | integer 0-20 | |
| `response_format` | map | JSON mode, structured outputs |
| `structured_outputs` | boolean | |
| `stop` | array | |
| `tools` | array | OpenAI tool calling format |
| `tool_choice` | string/object | |
| `parallel_tool_calls` | boolean | Default true |
| `reasoning` | map | `{ effort, max_tokens, exclude, enabled }` |
| `reasoning_effort` | enum | Shorthand for `reasoning.effort` |
| `web_search_options` | map | |
| `verbosity` | enum (low, medium, high, xhigh, max) | |
| `provider` | map | Provider routing preferences |
| `session_id` | string | Sticky routing key (<=256 chars) |
| `plugins` | array | |
| `models` | array | For router models |
| `route` | string | "fallback" etc. |
| `include_reasoning` | boolean | **Deprecated** — use `reasoning` |
| `cache_control` | map | Top-level for automatic caching |
| `transforms` | array | |
| `user` | string | |
| `debug` | map | |

Source: https://openrouter.ai/docs/api_reference/parameters

### How `reasoning_effort` works

**Top-level key**, enum: `xhigh`, `high`, `medium`, `low`, `minimal`, `none`. Per the reasoning-tokens doc and the Python SDK component, `"max"` is also valid. It is a **shorthand** for `reasoning.effort` — "Cannot be used simultaneously with `reasoning.effort` if they differ."

**Effort allocations** (percentage of max_tokens allocated to reasoning):
- `"max"`: ~95% of max_tokens
- `"xhigh"`: ~95% of max_tokens (same as max)
- `"high"`: ~80%
- `"medium"`: ~50%
- `"low"`: ~20%
- `"minimal"`: ~10%
- `"none"`: disables reasoning

**Key finding re: the plan's claim**: The plan says "max works on deepseek-v4-pro-0813 but xhigh for general." Per OpenRouter docs, `"max"` and `"xhigh"` are **both valid for all models that support reasoning** — they are equivalent (~95% allocation). There is no documented model-specific restriction on `"max"`. If a model doesn't support a specific effort level, OpenRouter maps to the nearest supported level. The plan's distinction is **not supported by the documentation** — both values should work identically on any reasoning-capable model.

Sources: https://openrouter.ai/docs/api_reference/parameters, https://openrouter.ai/docs/guides/best-practices/reasoning-tokens, https://openrouter.ai/docs/client-sdks/python/components/chatrequestreasoningeffort

### How `provider: { zdr: true }` works

**Restricts routing to only ZDR (Zero Data Retention) endpoints.** When `zdr: true`, only endpoints that do not retain prompts will be used. When `zdr` is false or not provided, it has no effect on routing. It operates as an **OR** with account-wide and guardrail ZDR settings — if any is enabled, ZDR enforcement is applied. The request-level parameter can only *ensure* ZDR is enabled, not *override* account-wide enforcement.

Other `provider` sub-fields: `order` (provider slug list), `allow_fallbacks`, `require_parameters`, `data_collection` ("allow"/"deny"), `enforce_distillable_text`, `only`, `ignore`, `quantizations`, `sort`, `preferred_min_throughput`, `preferred_max_latency`, `max_price`.

Source: https://openrouter.ai/docs/guides/routing/provider-selection

### Prompt caching mechanics

**Most providers auto-enable caching** (OpenAI, DeepSeek, Google, Grok, Moonshot, Z.AI). Anthropic and Alibaba require explicit `cache_control` breakpoints. OpenRouter uses **sticky routing** to maximize cache hits — follow-up requests route to the same provider endpoint that holds the warm cache.

**`session_id`** (body) or `x-session-id` (header) activates sticky routing from request 1 (before any cache hit). <=256 chars. Without `session_id`, stickiness only starts after a cache hit is detected.

**4-layer payload structure**: OpenRouter docs recommend stable content first (system prompt, tool definitions, schemas), changing content later (user messages, tool results). This is not a formal "4-layer" API construct — it is a best-practice recommendation for cache key stability. The plan's "4-layer payload" is the harness's own design based on this guidance.

**Cache cost model** (per provider, verified 2026-08-23):

| Provider | Cache read | Cache write | How to enable |
|---|---|---|---|
| Anthropic (5-min TTL) | 0.1x input | 1.25x input | Automatic or explicit |
| Anthropic (1-hour TTL) | 0.1x input | 2.0x input | Explicit (`ttl: "1h"`) |
| OpenAI (pre-GPT-5.6) | 0.25x-0.50x | Free | Automatic |
| OpenAI (GPT-5.6+) | 0.25x-0.50x | 1.25x | Automatic or explicit |
| DeepSeek | 0.1x input | 1.0x input | Automatic |
| Z.AI | ~0.2x input | Free | Automatic |
| Google Gemini | 0.25x | Free | Automatic (implicit) |
| Alibaba/Qwen | 0.1x | 1.25x | Explicit `cache_control` |

**Inspection**: `usage.prompt_tokens_details.cached_tokens` (cache hits), `cache_write_tokens` (writes), `cache_discount` (savings amount).

Sources: https://openrouter.ai/docs/guides/best-practices/prompt-caching, https://openrouter.ai/blog/tutorials/prompt-caching-sticky-routing/

### Can it be used programmatically without a GUI?

**YES** — pure HTTP API. `POST /api/v1/chat/completions` (Chat Completions), `POST /api/v1/messages` (Anthropic Messages), `POST /api/v1/responses` (Responses API). Auth via `Authorization: Bearer <API_KEY>` header. No GUI needed.

### Does OpenRouter expose an MCP server or agent tools?

**NO** — purely HTTP API. No MCP server, no agent tools. The harness accesses OpenRouter through the headroom proxy (which is the HTTP client), not through any MCP surface.

---

## CROSS-CUTTING: LLM call chain

### Verified wiring (from opencode.jsonc, read 2026-08-23)

```
opencode SDK
  -> POST http://localhost:8788/v1/chat/completions  (headroom proxy)
    -> compresses messages (--mode cache)
    -> POST https://openrouter.ai/api/v1/chat/completions  (OpenRouter)
      -> routes to provider (z-ai, deepseek, qwen, etc.)
```

**opencode.jsonc** (lines 7-9):
```jsonc
"openrouter": {
  "options": {
    "baseURL": "http://localhost:8788/v1",  // headroom proxy, NOT OpenRouter directly
    "setCacheKey": true  // ensures session cache key for sticky routing
  }
}
```

**The chain is**: opencode -> headroom proxy -> OpenRouter -> provider. Opencode does NOT call OpenRouter directly — it calls the headroom proxy, which forwards to OpenRouter.

Source: `~/.config/opencode/opencode.jsonc` lines 7-12

### Does the plan's usage match the tools' documentation?

**1. reasoning_effort values — MISMATCH (minor).**
The plan says "max" for deepseek-v4-pro-0813 but "xhigh" for general. Per OpenRouter docs, both values are equivalent (~95% allocation) and both are valid for all reasoning-capable models. The distinction is not documented. **Recommendation**: use `"max"` or `"xhigh"` interchangeably — they are the same. If a specific model rejects `"max"`, OpenRouter maps to the nearest supported level automatically.

**2. session_id + headroom — KNOWN INTERFERENCE.**
opencode.jsonc sets `setCacheKey: true` to enable OpenRouter sticky routing. However, headroom does NOT forward `session_id` — it overwrites it with its own compression-cache key. This means sticky routing may not work as intended through the proxy. The prior caching research note documents this: "headroom does NOT forward session_id (its internal session_id is a compression-cache key)." The impact is that cache hits rely on OpenRouter's hash-based sticky routing (derived from the first system + first non-system message), not on explicit session_id pinning.

Source: `~/.agents/docs/research/2026-08-15-openrouter-prompt-caching.md` lines 38-40

**3. Headroom MCP removal — PENDING (not executed).**
The 2026-08-16 decision to remove the headroom MCP server from opencode.jsonc was approved by 2 cross-model reviewers (qwen3.8 + kimi-k3) but the live edit was never executed. The MCP block is still present at lines 58-62 (`"enabled": true`). The 3 tools (`headroom_compress`, `headroom_retrieve`, `headroom_stats`) still appear in the current session's tool list. Tool schemas tax the frozen prefix (~0.5-1K tokens per request) with zero usage (1 no-op compression in 906 requests per the removal doc).

Source: `~/.agents/docs/research/2026-08-16-headroom-mcp-removal.md` status field, `~/.config/opencode/opencode.jsonc` lines 58-62

**4. ZDR usage — not configured in the harness.**
opencode.jsonc does not set `provider: { zdr: true }` for any model. The harness relies on OpenRouter's default routing (no ZDR enforcement). If the plan requires ZDR compliance for specific requests, it must be added per-model in the `models` block.

**5. Underutilized headroom capabilities.**
Per the gap analysis in the prior SDK utilization note:
- `headroom learn --agent opencode --apply` (failure learning) — unused, zero code, purpose-built for autonomous fix loops
- `simulate()` for offline A/B testing — unused, available via SDK or `/v1/compress` with no model
- `HEADROOM_CCR_TTL_SECONDS` (default 1800s = 30 min) — long autonomous runs (>30 min) could lose CCR originals

Source: `~/.agents/docs/research/2026-08-15-headroom-sdk-utilization.md` §4

---

## Summary table

| Tool | Type | API surface | Harness usage | Match? |
|---|---|---|---|---|
| Headroom | Python compression proxy (v0.35.0) | Proxy HTTP + MCP (3 tools) + SDK (dormant) | Proxy active (port 8788); MCP active but pending removal; SDK dormant | **Mostly matches** — MCP removal pending |
| OpenRouter | HTTP API gateway | REST only (no MCP) | Accessed via headroom proxy at localhost:8788/v1 | **Matches** — `setCacheKey` + `baseURL` correct |
| reasoning_effort | OpenRouter param | Top-level enum (max, xhigh, high, medium, low, minimal, none) | Plan uses "max" for deepseek-v4-pro, "xhigh" for general | **Minor mismatch** — both are equivalent per docs |
| provider.zdr | OpenRouter param | Boolean in `provider` object | Not configured in harness | N/A — optional |
| Prompt caching | OpenRouter feature | Automatic (most providers) + explicit `cache_control` | `setCacheKey: true` enabled; headroom may interfere with `session_id` | **Partial** — sticky routing works via hash, not session_id |

---

## What was NOT checked (limitations)

1. **Headroom docs not re-fetched this round** — 3-round budget exhausted. The prior note (2026-08-15) verified 40 pages at `https://docs.headroomlabs.ai/docs/`. If the docs have changed since then, this note may be stale on headroom specifics.
2. **Live headroom proxy not probed** — no `curl localhost:8788/health` or `/stats` call was made this round. The prior notes verify it was running as of 2026-08-15/16.
3. **OpenRouter `/api/v1/models` endpoint not queried** — the per-model `reasoning.supported_efforts` field (which documents which effort levels each model accepts) was not fetched for the harness's specific models (glm-5.2, deepseek-v4-flash, qwen3.8, kimi-k3, minimax-m3).
4. **Whether `reasoning_effort` actually reaches the upstream provider through headroom** — inferred from the proxy's transparent-forward design but not verified by live probe with a `reasoning_effort` parameter in the request body.
