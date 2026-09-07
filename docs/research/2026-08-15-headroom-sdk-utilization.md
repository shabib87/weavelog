---
date: 2026-08-15
topic: Headroom SDK utilization — full docs synthesis (40 pages) + gap analysis vs live stack
status: reviewer-corrected
sources:
  - "https://docs.headroomlabs.ai/docs/ (all 40 pages, extracted via 4 parallel subagents using tavily_tavily_extract + tavily_tavily_map + tavily_tavily_crawl)"
  - "~/.agents/AGENT-STACK-RUNBOOK.md (live stack state, ~2224 lines)"
  - "~/Library/LaunchAgents/com.headroom.proxy.plist (live plist, mtime 2026-08-15 19:38)"
  - "~/.config/opencode/opencode.jsonc (live opencode config)"
  - "~/.headroom/ (runtime state: proxy_savings.json, savings_events.jsonl, ccr_store.db, settings.json)"
  - "~/.local/pipx/venvs/headroom-ai/lib/python3.13/site-packages/headroom/ (installed source, v0.35.0)"
  - "qwen/qwen3.8-2.4t-a95b reviewer findings (8 findings, APPROVE-WITH-FIXES)"
models_used_for_research: [z-ai/glm-5.2, qwen/qwen3.8-2.4t-a95b]
supersedes: none
review_rounds: 1
reviewer_corrections_applied:
  - agent-90 mechanism corrected: on single-worker (--workers=1), CLI --mode cache WINS over profile proxy_mode; the real cache-bust vector is compress_system_messages + compress_user_messages + force_kompress + target_ratio=0.10
  - SharedContext Phase 4 rewritten: MCP headroom_retrieve already provides cross-process CCR-backed compress+retrieve; local Map is per-process and useless for subagent handoffs
  - ast-grep is NOT installed (not on PATH, not in brew, not in runbook) — install step required if used as fallback
  - frontmatter status enum must include reviewer-approved-with-fixes-applied (live in loopeng-helper-plan.md)
  - /v1/compress response is snake_case (tokens_before, tokens_after, tokens_saved, compression_ratio, ccr_hashes), not camelCase
  - --memory-storage project is CORRECT (code accepts Literal["project","user","global"], project is the default) — verification item removed
  - permanent Serena in opencode.jsonc adds tool-schema tokens to frozen prefix (schemas never compressed) — weigh per-project enablement
---

# Headroom SDK utilization — full docs synthesis + gap analysis

## 1. Docs coverage (40 pages, read by 4 parallel subagents)

All pages under https://docs.headroomlabs.ai/docs/ were extracted via tavily_tavily_map (site enumeration) + tavily_tavily_crawl (full content) + tavily_tavily_extract (per-page advanced extraction). Grouped by category:

### Getting started & core
- `/docs` — introduction, compression table, framework integrations, real-world results
- `/docs/installation` — uv/pip/npm tracks, Python extras table, Docker tags, env vars
- `/docs/quickstart` — zero-to-compressed in 5 minutes, proxy mode alternative
- `/docs/architecture` — request interception, ContentRouter pipeline, provider cache, CCR, TOIN, Rust core
- `/docs/savings` — durable ledger (savings_events.jsonl), headroom savings vs headroom_stats vs /stats
- `/docs/benchmarks` — compression performance, accuracy preservation, SDK latency, cost-benefit, pipeline timing
- `/docs/agent-orchestration` — repeated wake anatomy, CacheAligner (detector-only), CCR digest curation, integration modes
- `/docs/shared-context` — SharedContext put/get/stats/keys/clear, ~80% token cut on agent handoffs
- `/docs/memory` — hierarchical scoping (user/session/agent/turn), with_memory() wrapper, temporal versioning, backends
- `/docs/filesystem-contract` — two-root model (HEADROOM_CONFIG_DIR, HEADROOM_WORKSPACE_DIR), Docker overlap

### Integrations & SDKs
- `/docs/anthropic-sdk` — withHeadroom() TS wrapper, Anthropic to OpenAI format conversion
- `/docs/vercel-ai-sdk` — withHeadroom(), headroomMiddleware(), compressVercelMessages()
- `/docs/litellm` — HeadroomCallback, ASGI middleware, direct compress(), guardrail mode
- `/docs/opencode` — headroom wrap opencode, native HeadroomPlugin, provider model mapping, failure learning
- `/docs/agno` — HeadroomAgnoModel, HeadroomPreHook/HeadroomPostHook, optimize_messages()
- `/docs/autogen` — wrap_tools_with_headroom(), per-tool metrics, min_chars_to_compress
- `/docs/crewai` — wrap_tools_with_headroom(), HeadroomToolWrapper(BaseTool)
- `/docs/strands` — model wrapping (full pipeline) + hook provider (SmartCrusher only)
- `/docs/proxy` — THE central piece: endpoints, savings profiles, CLI flags, /v1/compress, gotchas
- `/docs/api-reference` — HeadroomClient, chat.completions.create/simulate, compress(), config types, error hierarchy

### Optimization & advanced
- `/docs/cache-optimization` — CacheAligner (detector-only, never mutates), provider strategies, cold-prefix recompaction
- `/docs/code-compression` — CodeAwareCompressor (tree-sitter), CodeCompressorConfig, language tiers
- `/docs/ccr` — Compress-Cache-Retrieve architecture, four phases, CCRConfig, retention
- `/docs/local-llm-prefill` — local model prefill benchmarking, --no-optimize baseline
- `/docs/pipeline-extensions` — lifecycle events, PRE_SEND hook, x-headroom-base-url routing, route_advice
- `/docs/simulation` — simulate() without LLM call, waste signals, block breakdown, config comparison
- `/docs/failure-learning` — headroom learn, success correlation, CLAUDE.local.md/MEMORY.md, marker-based updates
- `/docs/runtime-rollouts` — deterministic feature control, channels (stable/beta/canary/dev), precedence
- `/docs/persistent-installs` — headroom deploy, install CLI, presets, runtime kinds, scopes
- `/docs/ci-cd-flows` — PR/release/Docker/docs flows, workflow ownership, gate summary

### Tooling, limits, errors, recovery
- `/docs/vscode-claude-code` — wrap vscode-claude, settings injection, ENABLE_TOOL_SEARCH
- `/docs/vscode-copilot` — wrap vscode, OAuth device flow, settings lifecycle
- `/docs/claude-code-azure-foundry` — wrap claude with Foundry mode
- `/docs/claude-code-vertex` — wrap claude with Vertex mode
- `/docs/grok-build` — wrap grok-build, config.toml injection
- `/docs/codex-recovery` — temp-to-durable home migration, SQLite merge, backup/rollback
- `/docs/limitations` — when headroom helps vs doesn't, safety gates, adaptive K, configuration tuning
- `/docs/errors` — error hierarchy, proxy error mapping, best practices
- `/docs/troubleshooting` — proxy won't start, no savings, Claude Code context larger, compression too aggressive
- `/docs/releases` — release-please, packages/registries, version strategy, safety gates

## 2. Current state (verified live 2026-08-15)

### Active integrations
- **Proxy** (pipx, Python 3.13, v0.35.0): launchd `com.headroom.proxy` on port 8788, `--mode cache`, `--backend openrouter`, `--memory --memory-storage project --learn`
- **MCP server**: `headroom mcp serve` wired into `opencode.jsonc` (lines 48-52), exposes `headroom_compress`, `headroom_retrieve`, `headroom_stats` — **Removed (YAGNI — see 2026-08-16-headroom-mcp-removal.md)**
- **Pricing bridge**: `sync-model-pricing.ts` + `HEADROOM_MODEL_ALIAS_MAP` + `LITELLM_LOCAL_MODEL_COST_MAP=true` in plist env
- **5 models**: z-ai/glm-5.2 (workhorse), deepseek/deepseek-v4-flash (scout), qwen/qwen3.8-2.4t-a95b (reviewer), moonshotai/kimi-k3 (escalation), minimax/minimax-m3 (vision)

### Savings (as of 2026-08-15 23:49)
- Lifetime: 723 requests, 5,177,802 tokens saved, $4.172531 compression + $0.071564 cache = $4.244095 total
- Session: 539 requests, 6.26% savings
- Cache reads: 83,555 tokens (all earned after the --mode cache fix at 19:38)
- Recent per-request: 280-855 tokens saved ($0.0001-0.0004 each) — modest, consistent with cache mode design

### Savings profile (corrected per reviewer finding 1)
- Active profile: `coding` (default — `HEADROOM_SAVINGS_PROFILE` is unset)
- The `coding` profile uses **cache** mode, which aligns with the plist's `--mode cache`
- **Mechanism correction**: on single-worker deployments (`--workers` defaults to 1, `create_app(config)` direct), CLI `--mode cache` WINS over the profile's `proxy_mode`. The profile's `proxy_mode` is only seeded via `setdefault` on the multi-worker `create_app_from_env` path.
- The real cache-bust vector in `agent-90` is NOT `proxy_mode` override — it's `compress_system_messages=True` + `compress_user_messages=True` + `force_kompress` + `target_ratio=0.10`. These rewrite the prefix.
- **Conclusion stands**: do NOT switch to `agent-90` or any token-mode profile. Current `coding` + `--mode cache` is optimal for cache hits.

### Cache mode fix (resolved 2026-08-15)
- Root cause: plist ran `--mode token` (rewrites prior turns every request, upstream prefix bytes change, provider KV cache never reuses, zero cache hits)
- Fix: `--mode cache` (documented headroom default, forwards prior turns byte-faithfully)
- Evidence: cache_read_tokens 0 to 56,012 across 41 requests; 77.6% cost reduction on 2-turn workload
- Documented in `2026-08-15-opencode-cache-root-cause.md` (status: resolved)

## 3. What's correctly configured (respects docs)

1. **Cache mode** — `--mode cache` + `coding` profile = optimal for cache hits. Matches `/docs/proxy` and `/docs/cache-optimization`.
2. **CacheAligner understanding** — `inner-harness-layers.md` and `savings-diagnosis.md` correctly state CacheAligner is detector-only, never mutates. Matches `/docs/cache-optimization` and `/docs/agent-orchestration`.
3. **CCR is reversible** — understanding matches `/docs/ccr`. CCR store active (`ccr_store.db` verified on disk).
4. **Proxy ownership race resolution** — `~/.pi/agent/headroom/settings.json` `{"autoStart": false}` keeps launchd as sole owner of 8788. Matches `/docs/filesystem-contract` "local-first, one proxy per session" guidance.
5. **MCP tool wiring** — `headroom mcp serve` was in `opencode.jsonc` exposing compress/retrieve/stats. **Removed (YAGNI — see 2026-08-16-headroom-mcp-removal.md)**: tool schemas taxed every frozen prefix (`tool_schema_tokens_saved: 0`), empirically unused (1 no-op compression), proxy already compresses all traffic.
6. **Pricing bridge** — `HEADROOM_MODEL_ALIAS_MAP` is the documented official hook (`/docs/proxy`). `sync-model-pricing.ts` is a legitimate bridge, not a vendor patch.
7. **python3.13** — correctly installed via pipx on python3.13 (verified: `~/.local/pipx/venvs/headroom-ai/lib/` contains only `python3.13`). The python3.14 traceback in `ccr_store.db-wal` is a historical artifact from a past failed run, not the current state.

## 4. Gap analysis

| # | Gap | Docs reference | Impact for autonomous work | Status |
|---|---|---|---|---|
| 1 | Runbook plist template stale (line 237: `token`) | `/docs/proxy`, `/docs/troubleshooting` | Fresh-Mac rebuild re-introduces zero-cache-hits bug | **Immediate fix** |
| 2 | `headroom learn --agent opencode --apply` unused | `/docs/failure-learning` | Reads past sessions, correlates failures with fixes, writes corrections. Purpose-built for autonomous fix loops. Zero code. | **Trigger: next autonomous session** |
| 3 | Serena code-graph via `headroom wrap opencode --code-graph` | `/docs/opencode` | MCP tools (find_symbol, find_referencing_symbols, symbol_overview) give agents IDE-grade code navigation without an IDE. TS: solid. Kotlin: LSP Alpha. Swift: thin docs. | **Trigger: scouts burning tokens on recon** |
| 4 | Inter-agent context compression (SharedContext equivalent) | `/docs/shared-context`, `/docs/ccr` | ~80% token cut on agent handoffs. MCP `headroom_compress` + `headroom_retrieve` already provide cross-process CCR-backed compress+retrieve — evaluate first before building TS SharedContext. | **Trigger: conductor subagent dispatch >5K tokens per handoff** |
| 5 | `HEADROOM_CCR_TTL_SECONDS` (default 1800s = 30 min) | `/docs/ccr` | Long autonomous runs (>30 min) could lose CCR originals mid-run. Verified default: `compression_store.py:51`. | **Trigger: first autonomous run >30 min OR Phase 4 activation** |
| 6 | Dormant npm SDK `headroom-ai@0.22.4` | `/docs/installation` | Dead weight; scripts call `/v1/compress` via `fetch()` directly, no SDK needed. | **Trigger: next workspace cleanup** |
| 7 | `simulate()` for offline A/B testing | `/docs/simulation` | Preview compression without LLM calls — test configs before touching live proxy. | **Trigger: before any future profile/config change** |
| 8 | Frontmatter inconsistency across research docs | (internal convention) | `loopeng-helper-plan.md` uses wrong schema; `HANDOFF-*` has no frontmatter; `failure-log-*` has no frontmatter. | **Immediate fix** |

## 5. Tool layering for Kotlin/Swift/TS (autonomous agentic work)

| Tool | TS | Swift | Kotlin | What it gives | Already in stack? |
|---|---|---|---|---|---|
| **Serena (LSP)** | Solid | Verify | Alpha risk | Cross-file find_symbol, find_referencing_symbols, type hierarchy — semantic layer | No (needs `--code-graph`) |
| **ast-grep** | Native | Native | Native | Structural pattern matching ($FUNC, $ARG) — no type info, no cross-file refs | **No — NOT installed** (reviewer finding 3). Install: `brew install ast-grep` |
| **Semgrep** | Yes | Beta | Beta | Security/lint rules, pattern-based scanning | Yes (in MCP config) |

Recommended layering for autonomous work:
- **Serena as primary** for all three. For Kotlin, accept Alpha risk but verify in scratch session — IntelliJ-backed analysis engine is strong even if LSP wrapper is immature. Serena fails open (returns nothing, agent falls back to grep/glob).
- **ast-grep as structural fallback** — supports all three languages natively, zero LSP dependency. Requires install (`brew install ast-grep`).
- **Semgrep** stays for security/lint — already wired via MCP.

Complementary, not either/or. The only question is whether Serena's Kotlin LSP is stable enough — a 10-minute scratch-session test, not a research project.

**Per reviewer finding 8**: permanent Serena in `opencode.jsonc` adds tool-schema tokens to every frozen prefix (schemas are never compressed per diagnosis doc). Weigh per-project enablement vs global.

## 6. Scripting standard: /v1/compress via fetch(), no SDK dependency

### MCP vs SDK vs HTTP API — which surface for which consumer

| Consumer | How it reaches Headroom | What it gets |
|---|---|---|
| **Agent (LLM)** | MCP tools (headroom_compress, headroom_retrieve, headroom_stats) | Compress/retrieve/stats during a conversation — LLM calls these tools itself |
| **Script (deterministic code)** | SDK compress() / simulate() / SharedContext OR direct POST /v1/compress to the proxy | Compress data outside the LLM request path, preview compression offline, share compressed context between agents |

Scripts (TypeScript/bun) cannot use MCP — MCP is JSON-RPC over stdio for agent hosts. But they do not need the npm SDK either. The TS SDK is just a wrapper around `POST http://localhost:8788/v1/compress`. Scripts call that endpoint directly via `fetch()` — no dependency, no SDK install.

### /v1/compress API (per finding 5 — snake_case response)

**Request:**
```json
{
  "messages": [{"role": "user", "content": "..."}],
  "model": "z-ai/glm-5.2",
  "config": {
    "mode": "ccr",
    "frozen_message_count": 4,
    "compress_user_messages": false,
    "target_ratio": 0.5,
    "protect_recent": 4
  }
}
```

**Response (snake_case):**
```json
{
  "messages": [...],
  "tokens_before": 15000,
  "tokens_after": 3500,
  "tokens_saved": 11500,
  "compression_ratio": 0.23,
  "transforms_applied": ["router:smart_crusher:0.35"],
  "transforms_summary": "...",
  "ccr_hashes": ["abc123", "def456"]
}
```

Key `config` knobs:
- `mode`: unset = marker-free (default, forward-and-forget); `"ccr"` = emits `<<ccr:...>>` markers + writes to CCR store (only if headroom_retrieve is injected and /v1/retrieve is reachable)
- `frozen_message_count`: number of already-cached leading messages — for multi-turn agent loops, set this and resend previously-forwarded (compressed) messages, not pristine originals. Sending originals silently destroys the provider prefix cache.

### Where scripts calling /v1/compress adds value (beyond the proxy)

The proxy already compresses all traffic that flows through it (opencode to proxy to OpenRouter). Scripts calling /v1/compress adds value in three cases where the proxy does not see the data:

1. **Inter-agent handoffs** — when conductor dispatches parallel subagents and their results return to the conductor, that handoff does not go through the proxy. A script can compress the results before passing them back.
2. **Offline cost estimation** — simulate (POST /v1/compress with no model) previews what compression would do without an LLM call.
3. **Compressing data before it enters the agent context** — a scout script reads 50 files, compresses the batch via /v1/compress, then passes the compressed version to the agent. The agent sees a smaller context immediately.

### SharedContext — Python-SDK-only, but MCP already covers the capability

SharedContext (put/get/keys/clear, ~80% token cut) is Python SDK only. Not in TS SDK, not in MCP, not in proxy HTTP API.

**Per reviewer finding 2**: the MCP tools `headroom_compress` + `headroom_retrieve` already provide functionally equivalent compress+retrieve-by-hash, CCR-backed, cross-process, TTL-governed. The claim "not exposed via MCP" is true only for the SharedContext class, not the capability. Phase 4 of the fix plan evaluates MCP CCR first before building a TS equivalent.

## 7. Corrected recommendation (agent-90 profile)

**Original recommendation (now corrected)**: set `HEADROOM_SAVINGS_PROFILE=agent-90` for ~90% savings.

**Why it was wrong**: `agent-90` forces `compress_system_messages=True` + `compress_user_messages=True` + `force_kompress` + `target_ratio=0.10`. These settings rewrite the prefix (system messages, user messages, aggressive compression), which destroys the provider KV cache — the exact bug that was fixed today by switching from `--mode token` to `--mode cache`.

**Corrected**: keep the default `coding` profile (which uses cache mode) + `--mode cache` in the plist. This is optimal for cache hits. The `coding` profile's ~50% emergent savings target is modest but the dominant savings come from provider cache reads (90% off input price on Anthropic, 50% on OpenAI, 75% on Google), not from compression alone.

**Per reviewer finding 1**: on single-worker deployments, CLI `--mode cache` wins over the profile's `proxy_mode` anyway (the profile's `proxy_mode` is only seeded via `setdefault` on the multi-worker `create_app_from_env` path). So even if a profile specified `token` mode, the CLI flag would override it on the user's single-worker launchd setup. The cache-bust risk is from the profile's OTHER settings (compress_system_messages, etc.), not from proxy_mode override.

## 8. Headroom integration modes summary

| Mode | What it is | User's status | Recommended for scripts? |
|---|---|---|---|
| Proxy (pipx Python) | Transparent compression of all LLM traffic | **Active** (launchd, 8788) | N/A — compresses traffic automatically |
| MCP server (headroom mcp serve) | headroom_compress/retrieve/stats as agent tools | **Removed (YAGNI)** (see 2026-08-16-headroom-mcp-removal.md) | N/A — for agents, not scripts |
| SDK (npm headroom-ai or Python headroom) | Programmatic compress(), simulate(), SharedContext | **Dormant** (npm 0.22.4 installed, unused) | No — scripts call /v1/compress via fetch() directly |
| HTTP API (/v1/compress) | Direct POST for compression without LLM call | **Available** (proxy running) | **Yes — this is the scripting surface** |

## 9. Key docs gotchas (for future reference)

1. `/v1/compress` is **loopback-only by default** — returns 404 (not 403) to remote callers. Remote use requires `HEADROOM_COMPRESS_ALLOW_REMOTE=1`.
2. `/v1/compress` is **stateless** — it cannot manage the provider's prefix cache. For multi-turn agent loops, pass `config.frozen_message_count` and resend previously-forwarded (compressed) messages, not pristine originals.
3. Compression **fails open on timeout**: returns 200 with original messages, zeroed metrics, `compression_skipped: true`. Always check `compression_skipped`.
4. `x-headroom-bypass: true` header skips compression.
5. **Savings profile `coding` is the default** — uses cache mode. Other profiles (balanced, agent-90, general) use token mode which rewrites prior turns.
6. **Code compression is OFF by default** (opt-in via `[code]` extra / `CodeAwareCompressor`). SmartCrusher only compresses JSON arrays.
7. **CacheAligner is detector-only** — it never mutates messages; it only reports drift. Repair is the caller's job.
8. **CCR is on by default** — disable with `--no-ccr`, or go marker-free with `--lossless`. Default TTL: 1800s (30 min).
9. **TOIN is local observation-only** — no tool/traffic data leaves the box.
10. **Headroom "fails open"** — any compressor error returns content unchanged; the request still goes through.
11. **Vertex AI** requires `google-cloud-aiplatform>=1.38`, not in any extra or Docker image.
12. **Docker `HEADROOM_WORKSPACE` (host bind-mount) is NOT the same as `HEADROOM_WORKSPACE_DIR` (in-container state root)** — both retained for backward compatibility.
13. **`/v1/compress` response is snake_case** — `tokens_before`, `tokens_after`, `tokens_saved`, `compression_ratio`, `ccr_hashes`, `transforms_applied`.
14. **`--memory-storage project` is valid and is the default** — code accepts `Literal["project","user","global"]`. No verification needed.
15. **`headroom learn --target <path>`** may only work for Claude Code writer — test with `--agent opencode` before relying on it.
16. **Permanent Serena MCP tools in opencode.jsonc** add tool-schema tokens to every frozen prefix (schemas are never compressed). Weigh per-project enablement.
