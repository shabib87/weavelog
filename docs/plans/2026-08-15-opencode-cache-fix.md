---
date: 2026-08-15
topic: Fix zero prompt-cache hits in real opencode sessions (headroom proxy) — resolved
status: resolved
sources:
  - "~/.agents/docs/research/2026-08-15-opencode-cache-root-cause.md"
  - "~/.agents/AGENT-STACK-RUNBOOK.md"
  - "~/Library/LaunchAgents/com.headroom.proxy.plist"
  - "live capture through headroom proxy (localhost:8788, before/after --mode switch)"
models_used_for_research: [z-ai/glm-5.2, qwen/qwen3.8-2.4t-a95b]
supersedes: none
---

# Fix zero prompt-cache hits in real opencode sessions (headroom proxy) — RESOLVED

## Mission — RESOLVED 2026-08-15

Root cause: proxy plist ran `--mode token` (rewrites prior turns every request → upstream
prefix bytes change → provider KV cache never reuses → zero cache hits). Fix: `--mode cache`
(documented headroom default, forwards prior turns byte-faithfully). All 5 agent models now
show cache hits. See ~/.agents/docs/research/2026-08-15-opencode-cache-root-cause.md for full
evidence.

## Read first (do NOT re-research — these are dated, source-attributed, verified)

- ~/.agents/AGENT-STACK-RUNBOOK.md — the full stack: proxy, routing, pricing sync, cache policy, verification battery
- ~/.agents/docs/research/2026-08-15-headroom-savings-diagnosis.md — THIS problem, findings 1-3
- ~/.agents/docs/research/2026-08-15-openrouter-prompt-caching.md — sticky routing, session_id, per-provider mechanics
- ~/.agents/docs/research/2026-08-15-headroom-pricing-internals.md — alias map, local cost map, upgrade hazard
- ~/.config/opencode/AGENTS.md — conductor protocol + engineering principles (follow them)

## Established facts (verified 2026-08-15, do not redo)

1. Cache WORKS through the proxy. Reproduce: 3 identical POSTs to localhost:8788/v1/chat/completions
   (Bearer key from ~/.local/share/opencode/auth.json), same ~3K-token system prefix + unique tail:
   - z-ai/glm-5.2 no tools -> cached 2176/4800 of 4939
   - qwen/qwen3.8-2.4t-a95b no tools -> cached 2080/3077
   - qwen3.8 WITH 12 tools -> cached 3120/3969 (headroom tool_schema_compaction is deterministic)
2. Real opencode traffic: 66 requests, 11.46M input tokens, cache_read_tokens captured = 6,976
   which is EXACTLY the synthetic probes. Real turns: zero hits. setCacheKey: true is in
   opencode.jsonc and the app was restarted multiple times — did not fix it.
3. qwen3.8 IS cacheable on its pinned providers (SiliconFlow/Modal/Alibaba advertise $0.25/M reads).
4. headroom 0.35.0 code is UNMODIFIED (all 518 .py share reinstall mtime). Pricing works via
   sync-model-pricing.ts + plist env (LITELLM_LOCAL_MODEL_COST_MAP, HEADROOM_MODEL_ALIAS_MAP).
5. headroom body forwarding is byte-faithful for unmutated bodies; compression re-serializes mutated ones.
6. headroom computes its OWN internal session_id (compression cache); it does NOT inject OpenRouter
   session_id/x-session-id upstream (grep-verified in proxy/handlers/openai.py).

## Hypothesis (test, don't assume)

Real opencode request prefixes are not byte-stable across turns. Candidates:
(a) opencode injects dynamic content early in the request (date/env/skills list/todo state in the
    system prompt; changing tool list), (b) headroom's live-zone compression boundary shifts so
    previously-frozen bytes get re-compressed differently, (c) message reordering/rewriting.

## Plan

1. CAPTURE: enable headroom request debug dumping (start at
   ~/.local/pipx/venvs/headroom-ai/lib/python3.13/site-packages/headroom/proxy/handlers/_debug_dump.py
   and grep HEADROOM_ env vars for dump/capture flags), restart proxy
   (launchctl bootout/bootstrap gui/$(id -u)/com.headroom.proxy), generate 2-3 consecutive turns in a
   real opencode session, capture the outbound bodies.
2. DIFF: byte-diff request N vs N+1 prefixes (system message, tools array, first K history messages).
   Locate the FIRST divergent byte; attribute to opencode content vs headroom transform.
3. FIX by cause:
   - opencode dynamic system content -> find the opencode config/setting that stabilizes it; if none
     exists, evaluate injecting session_id at the proxy (check headroom 0.35 for a HEADROOM_* env or
     config that sets/forwards x-session-id per conversation; if absent, file upstream issue and
     document — do NOT patch vendor code).
   - headroom compression boundary -> look for HEADROOM_* envs controlling CacheAligner/frozen-zone;
     test config changes with the probe battery (must not regress the 3 proven cache cases).
4. VERIFY (definition of done): after the fix, a real multi-turn opencode session shows
   prefix_cache.totals.cache_read_tokens GROWING across turns (curl -g localhost:8788/stats),
   and the 3 synthetic probe cases still pass. Record before/after numbers.
5. DOCUMENT: write findings to ~/.agents/docs/research/<date>-opencode-cache-root-cause.md (YAML
   frontmatter: date/topic/status/sources/supersedes), update AGENT-STACK-RUNBOOK.md sections
   (Prompt-cache policy + Verification battery), update this handoff's status to resolved.

## Constraints

- NO vendor code patches (headroom/litellm .py). Config, env vars, and independent scripts only.
- Durable scripts: TypeScript via bun, biome-checked, bun test with happy+unhappy paths (~/.agents/bin/).
- Cost discipline: probes use z-ai/glm-5.2 ($0.46/M) unless qwen3.8 specifically under test;
  reviewer-loop budget cap $2; the user is actively cost-sensitive.
- Conductor pattern: delegate research/implementation to subagents; human gates = plan approval
  before changes, merge approval after review; merge disagreements by evidence.
- Any headroom/litellm upgrade wipes the litellm pricing injections -> rerun
  ~/.agents/bin/sync-model-pricing.ts --apply after upgrades (stack-check detects drift).

## Quick reference

- proxy: localhost:8788 (health /health, stats /stats, dashboard /dashboard) — launchd com.headroom.proxy
- plist: ~/Library/LaunchAgents/com.headroom.proxy.plist
- opencode config: ~/.config/opencode/opencode.jsonc (baseURL localhost:8788/v1, setCacheKey true,
  qwen3.8 pinned SiliconFlow/Modal/Alibaba)
- scripts: ~/.agents/bin/src/{stack-check,reviewer-loop,sync-model-pricing,prefix-diff,cache-probe}.ts (all tested, 27 bun tests)
- backups: ~/backups/headroom-setup-2026-08-15/
- Interim cost relief already advised: routine work on NEW sessions (glm-5.2 default), qwen3.8 for reviews only.
