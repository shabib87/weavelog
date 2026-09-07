---
date: 2026-08-15
topic: Root cause of zero prompt-cache hits in real opencode sessions + fix
status: resolved
sources:
  - "https://docs.headroomlabs.ai/docs/cache-optimization (fetched 2026-08-15)"
  - "https://openrouter.ai/docs/features/prompt-caching (fetched 2026-08-15)"
  - "https://platform.minimax.io/docs/api-reference/text-prompt-caching (fetched 2026-08-15)"
  - "live capture through headroom proxy (localhost:8788, before/after --mode switch)"
  - "~/.local/pipx/venvs/headroom-ai/lib/python3.13/site-packages/headroom/proxy/handlers/openai.py"
  - "~/.local/pipx/venvs/headroom-ai/lib/python3.13/site-packages/headroom/proxy/request_logger.py"
  - "~/.local/pipx/venvs/headroom-ai/lib/python3.13/site-packages/headroom/proxy/models.py (RequestLog dataclass)"
  - "~/.agents/bin/src/prefix-diff.ts (cache-bust detector)"
  - "~/.agents/bin/src/cache-probe.ts (model-agnostic cache verifier)"
  - "OpenRouter catalog API (/api/v1/models — minimax-m3 input_cache_read pricing)"
models_used_for_research: [z-ai/glm-5.2, qwen/qwen3.8-2.4t-a95b, moonshotai/kimi-k3, deepseek/deepseek-v4-flash, minimax/minimax-m3]
supersedes: 2026-08-15-headroom-savings-diagnosis.md
---

# Root cause: zero prompt-cache hits in real opencode sessions

> Supersedes `2026-08-15-headroom-savings-diagnosis.md` — specifically its Finding 2 (zero cache hits).

## TL;DR

The headroom proxy plist ran `--mode token`, which rewrites prior turns every request.
Real opencode sessions grow a multi-turn conversation, so the upstream prefix bytes changed
every turn, and the provider KV cache never reused them. Switching to `--mode cache` (the
documented default) forwards prior turns byte-faithfully, so the provider KV cache reuses the
stable prefix. All 5 agent models now show cache hits.

## Evidence (red-green)

### RED: token mode (before fix)

Captured real opencode traffic via `HEADROOM_LOG_MESSAGES=true` +
`HEADROOM_LOG_FILE=~/.headroom/cache-probe.jsonl` (CLI flags `--log-file` `--log-messages`).
The OpenAI handler's RequestLog records `request_messages` (inbound from opencode) but NOT
`compressed_messages` (always null — that field is only populated by Anthropic/batch handlers).
Evidence came from `transforms_applied` + `cache_read_tokens`.

Two consecutive real opencode main-conversation turns (258 and 260 messages):
- **Request prefix: STABLE** — 0 differences across 258 messages. opencode sends a
  byte-identical growing prefix.
- **Transforms: content-rewriting** — `router:mixed:0.82`, `router:config:0.36`. Token mode
  rewrites prior turns (compression of history).
- **Cache: zero hits** — `cache_read_tokens=0` on both turns.

Token-mode cost baseline (2 real turns): 315,532 tokens, $0.145776, 0 cache.

### GREEN: cache mode (after fix)

Switched plist `--mode token` → `--mode cache`. Same proxy, same models.

Transforms on real opencode traffic: only `openai:chat:tool_schema_compaction` (deterministic,
cache-safe) + occasional `router:cross_turn_dedup` (cold-prefix only). The content-rewriting
transforms (`router:mixed`, `router:config`) are GONE.

cache_read_tokens: 0 → 56,012 (across 41 requests including probes).

All 5 model cache probes (4 sequential requests, shared ~4K prefix + unique tails):

| Model | Verdict | Cache hits (req 2-4) | Max cached tokens |
|---|---|---|---|
| z-ai/glm-5.2 | CACHED | 1 of 3 | 3891 (99%) |
| qwen/qwen3.8-2.4t-a95b | CACHED | 3 of 3 | 3120 (76%) |
| deepseek/deepseek-v4-flash | CACHED | 3 of 3 | 3840 (95%) |
| moonshotai/kimi-k3 | CACHED | 2 of 3 | 3730 (100%) |
| minimax/minimax-m3 | CACHED | 3 of 3 | 4096 (99%) |

Rollback guard: cache-mode est cost $0.032654 vs token-mode $0.145776 for same workload →
77.6% savings. Keep cache mode.

## Root cause (from official docs)

headroom 0.35 docs (cache-optimization page):

> "In proxy mode, prefix-cache stability comes from cache mode (`--mode cache`, the default),
> which compresses only the newest delta and forwards prior turns byte-faithfully. The prefix
> must stay byte-identical across requests for provider KV caches to reuse previously computed
> attention states."

`headroom proxy --help`:
- `token` = "prioritize compression; prior turns may be rewritten for max savings"
- `cache` = "freeze prior turns to maximise provider prefix-cache hit rate"

Token mode rewrites prior turns → upstream prefix bytes change → provider KV cache never
reuses → zero cache_read_tokens. Synthetic probes passed because each was a standalone
fixed-prefix + unique-tail request with no growing multi-turn history to rewrite.

## Fix

plist `--mode token` → `--mode cache`. Config-only, no vendor code patches.

## All 5 models cacheable (confirmed)

| Model | Cache mechanism | Read price | Evidence |
|---|---|---|---|
| z-ai/glm-5.2 | Automatic (Z.AI) | 0.2x | OpenRouter docs + cache-probe 3891 tokens |
| qwen/qwen3.8-2.4t-a95b | SiliconFlow KV (provider.order pin) | 0.1-0.25x | cache-probe 3120 tokens; HANDOFF Fact #3 |
| moonshotai/kimi-k3 | Automatic (Moonshot) | 0.25x | OpenRouter docs + cache-probe 3730 tokens |
| deepseek/deepseek-v4-flash | Automatic (DeepSeek) | 0.1x | OpenRouter docs + cache-probe 3840 tokens |
| minimax/minimax-m3 | Automatic + explicit cache_control | 0.2x | OpenRouter catalog `input_cache_read: 0.06/M` + MiniMax API docs + cache-probe 4096 tokens |

Note on qwen3.8: OpenRouter's per-provider table lists Alibaba's native `cache_control` API
(excludes qwen3.8), but through OpenRouter, qwen3.8 is served by SiliconFlow (first in
provider.order), which has automatic KV caching. The `provider.order` pin
[SiliconFlow, Modal, Alibaba] is beneficial for caching — it deterministically routes to
SiliconFlow, more stable than sticky routing (no 10-min expiry). ZDR (Zero Data Retention)
is a data-retention policy; it does not disable provider-side KV caching.

## Secondary risk (not triggered)

CacheAligner docs warn that opencode system prompts may contain dynamic content (dates, session
IDs, timestamps) that busts the prefix even in cache mode. The capture showed the request prefix
was byte-stable across turns, so this risk did not materialize. CacheAligner is detector-only
and can surface `cache_metrics.prefix_changed` / `warnings` if it arises in the future.

## Tooling created

- `~/.agents/bin/src/prefix-diff.ts` — loads headroom JSONL, diffs consecutive turn prefixes,
  attributes cache-bust cause (TOKEN_MODE_HISTORY_REWRITE / OPENCODE_DYNAMIC_PREFIX / STABLE).
  12 bun tests (happy + unhappy). Uses a whitelist of known cache-safe transforms
  (`openai:chat:tool_schema_compaction`, `router:noop`, `router:cross_turn_dedup`) — any
  other transform is treated as content-rewriting. Initial implementation used a denylist
  (`router:text:*`, `kompress`, `smart_crusher`) which missed the real token-mode transforms
  (`router:mixed:0.82`, `router:config:0.36`). Whitelist is more robust — new transform names
  are content-rewriting by default unless explicitly whitelisted.
- `~/.agents/bin/src/cache-probe.ts` — model-agnostic cache verifier. Takes `--model <id>`,
  runs 4 sequential requests through the proxy, reports cached_tokens per request. Exit 0
  if cache hits, 1 if no cache, 2 on error. 3 bun tests (happy + unhappy). KNOWN LIMITATION:
  tests only cover --help and arg validation; the exit-0/exit-1 verdict logic is untested
  hermetically (requires live proxy + API key). Backlog: extract verdict computation for
  unit testing.

## Gotchas learned (for future debugging)

1. **HEADROOM_LOG_FILE env var does not work via plist EnvironmentVariables.** The env var
   is visible to the process (confirmed via `launchctl print`), but headroom's click CLI
   resolves `log_file` from `--log-file` arg OR `HEADROOM_LOG_FILE` env — however the env path
   through the plist's EnvironmentVariables dict did not populate `config.log_file` (stayed
   None in /stats). Fix: use CLI flags `--log-file <path>` `--log-messages` in ProgramArguments
   instead of env vars. The env var may work in other contexts but not reliably via launchd.

2. **`/stats` `config.log_file` shows None even when logging IS working.** The JSONL file
   IS created and populated, but the /stats endpoint's `config` object does not reflect the
   log_file path. Do not use /stats to verify logging — check the file directly.

3. **`compressed_messages` is always null in the OpenAI handler.** RequestLog populates
   `compressed_messages` only in the Anthropic and batch handlers. For OpenRouter traffic
   (OpenAI handler), use `transforms_applied` + `cache_read_tokens` as evidence instead.
   prefix-diff.ts handles this case: when compressed_messages is null, it falls back to
   transform analysis.

4. **Token-mode transform names are varied.** Observed in real traffic: `router:mixed:0.82`,
   `router:config:0.36`, `router:cross_turn_dedup:4`. The `router:cross_turn_dedup` transform
   is cache-safe (fires on cold-prefix only); the others rewrite content. This is why
   prefix-diff.ts uses a whitelist, not a denylist.

## Failure recorded

During Phase 1c, `chmod 600 ~/.headroom` removed the directory execute bit, causing headroom to
crash with PermissionError/exit 78 on startup (launchd KeepAlive respawn loop). Fix: `chmod 700`.
Lesson: never chmod 600 a directory — always preserve the execute bit for traversal. Added to
runbook Phase 1 health gate.

## Backlog items (from this work)

- **cache-probe.ts verdict test coverage**: extract the pure verdict computation
  (results → CACHED/NO_CACHE) and test it hermetically, including empty-results and
  all-zero-cached boundaries. Trigger: next time cache-probe.ts is modified.
- **:8788 ownership race permanent fix**: the runbook documents the launchd-vs-pi-extension
  conflict, but `~/.pi/agent/settings.json` still installs `@ryan_nookpi/pi-extension-headroom`
  which can win the beacon lock. Trigger: pi is unparked or the proxy fails to start
  unexpectedly.

## Before/after numbers

| Metric | Token mode (before) | Cache mode (after) |
|---|---|---|
| cache_read_tokens (real opencode) | 0 | 56,012 |
| Content-rewriting transforms | router:mixed, router:config | (none) |
| Request prefix stability | stable (but rewritten by proxy) | stable (forwarded byte-faithful) |
| Est cost (2-turn workload) | $0.145776 | $0.032654 (77.6% savings) |
| All 5 models cache | No (real traffic) | Yes (all 5 probe CACHED) |
