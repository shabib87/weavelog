---
date: 2026-08-15
topic: headroom 0.35.0 pricing internals (litellm) + the three-part fix for $0.00 savings
status: verified-live
sources:
  - "~/.local/pipx/venvs/headroom-ai/lib/python3.13/site-packages/headroom/pricing/litellm_pricing.py"
  - "~/.local/pipx/venvs/headroom-ai/lib/python3.13/site-packages/headroom/pricing/litellm_model_resolution.py"
  - "~/.local/pipx/venvs/headroom-ai/lib/python3.13/site-packages/headroom/proxy/cost.py"
  - "~/.local/pipx/venvs/headroom-ai/lib/python3.13/site-packages/litellm/litellm_core_utils/get_model_cost_map.py"
  - live verification through resolve_litellm_model + cost_per_token
models_used_for_research: [deepseek/deepseek-v4-flash]
supersedes: none
---

# headroom pricing internals (0.35.0)

## How headroom prices requests

proxy/cost.py estimate_cost() -> headroom.pricing.litellm_pricing.resolve_litellm_model(model)
-> litellm.cost_per_token(resolved_model, ...). Shared by live (cost.py) and persisted
(savings_tracker) paths.

## litellm behaviors that matter

1. litellm FETCHES its cost map from GitHub at import; the bundled backup JSON
   (litellm/model_prices_and_context_window_backup.json in the venv) is only read when
   LITELLM_LOCAL_MODEL_COST_MAP=true OR the fetch fails.
2. litellm.cost_per_token calls get_llm_provider() which REJECTS unknown provider prefixes
   (z-ai/, qwen/, moonshotai/). Known: openrouter, openai, deepseek, minimax, anthropic, etc.
3. litellm's DB (bundled AND GitHub main, Aug 2026) LACKS newer OpenRouter models:
   z-ai/glm-5.2, qwen/qwen3.8-2.4t-a95b, minimax/minimax-m3, moonshotai/kimi-k3.
   => without intervention these price at $0.00.

## headroom hooks available

- HEADROOM_MODEL_ALIAS_MAP (env, JSON {client_name: target}) — official gateway-alias hook.
  _reduce_to_priced_key(target) does a DIRECT litellm.model_cost lookup (no get_llm_provider),
  so aliasing to an openrouter/<id> key works.
- headroom already injects DeepSeek V4 pricing at import (_inject_deepseek_pricing) and
  MiniMax-M3 (_register_minimax_pricing) — pattern proof that model_cost injection is the way.

## THE FIX (three coordinated parts, all in the runbook)

(a) ~/.agents/bin/sync-model-pricing.ts injects live OpenRouter prices into the litellm backup
    JSON under 'openrouter/<model-id>' keys. UNIT NOTE: OpenRouter returns PER-TOKEN prices
    ("0.000000462" = $0.462/M) — do NOT divide by 1e6 (we hit this bug; script has a sanity
    range guard 1e-9..1e-3 per token, exits 3 on implausible).
(b) LaunchAgent plist env: LITELLM_LOCAL_MODEL_COST_MAP=true + HEADROOM_MODEL_ALIAS_MAP
    mapping the 5 manifest models -> openrouter/<id> keys.
(c) stack-check.ts runs sync-model-pricing.ts --check weekly (drift = exit 1).

## Verified prices after fix (2026-08-15)

glm-5.2 $0.462/$1.452 · qwen3.8 $2.000/$6.000 · minimax-m3 $0.300/$1.200 ·
kimi-k3 $3.000/$15.000 · v4-flash $0.064/$0.129 (per 1M in/out)

## UPGRADE HAZARD

ANY headroom or litellm upgrade (pipx reinstall) WIPES the injected litellm JSON entries.
Re-run sync-model-pricing.ts --apply + proxy restart after every upgrade. Weekly stack-check
detects the drift automatically.
