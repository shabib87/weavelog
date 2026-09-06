---
date: 2026-09-06
topic: Model tier protocol — tier concept, opencode expression, manifest default, doctor checks
status: draft
type: architecture
author: conductor
related_to:
  - ./headroom-proxy.md
  - ./runbook-decomposition.md
  - ./README.md
  - ../cli.md
sources:
  - "AGENT-STACK-RUNBOOK.md §Model tier protocol, §Current model tiers, §Watched / not-used, §Phase 2/3 (TASK-45 decomposition)"
---

# Model tier protocol (self-refreshing)

## The tier concept

Every seat on the host gets a model tier, expressed in `opencode.jsonc` as two keys:

- `model` — the default workhorse. Runs the conductor. As of the 2026-08-30 snapshot:
  `openrouter/z-ai/glm-5.3-flash` (1M context, native multimodal, cheapest-capable
  planning).
- `small_model` — the cheap bulk default. `openrouter/deepseek/deepseek-v4-flash-0731`
  (1M context, text-only, cheapest reliable executor) — the scout and implementer seats.

Model identity facts: the ID format is `openrouter/<org>/<model>`. `model` /
`small_model` apply to **new sessions only** — existing sessions keep their model.
Subagents inherit the parent session's model **unless** the agent file sets its own
`model` field, which is how the roster below is expressed (one model per agent file in
`payload/config/agents/`).

Escalation ladder on failure: flash → glm-5.3-flash → qwen3.8 → kimi-k3, escalating
only after two failed attempts. Frontier models are targeted escalation, not defaults.

## Roster (snapshot 2026-08-30 — re-verify, don't trust)

| Role | Model | $/1M in/out | Why |
|---|---|---|---|
| Default workhorse / conductor | `z-ai/glm-5.3-flash` | $0.075 / $0.25 | 1M ctx, native multimodal, cheapest-capable planning |
| Scout / bulk / implementer | `deepseek/deepseek-v4-flash-0731` | $0.065 / $0.18 | 1M ctx, text-only, cheapest viable executor |
| Review / qa | `deepseek/deepseek-v4-pro-0813` | $1.32 / $3.96 | text-only; routine review + long deterministic test loops |
| High-stakes review | `qwen/qwen3.8-2.4t-a95b` | $2.00 / $6.00 | 4th-family voice, provider-pinned for 1M |
| Vision-mid | `minimax/minimax-m3` | $0.30 / $1.20 | image+video; 1M ctx only on some providers |
| Escalation / hardest / vision | `moonshotai/kimi-k3` | $3.00 / $15.00 | 13 providers, image+video, escalation only |
| Vision-cheap fallback | `deepseek/deepseek-v4-flash-vision-exp` | $0.44 / $1.32 | 1M ctx, image input, routine visual reads |

Design rules behind the roster:

- **Cross-family error diversity is the point.** The reviewer/gate seats span four
  families (qwen3.8, glm, kimi-k3, deepseek-v4-pro) so a review never shares the
  author's blind spot. The qa seat rides deepseek-v4-pro-0813 deliberately — long
  deterministic test loops, not cross-family review.
- **qwen3.8 is provider-pinned for context, not caching.** It is text-only and gets 1M
  context on only some OpenRouter providers, so `provider.openrouter.models` pins
  `order: ["SiliconFlow", "Modal", "Alibaba"]`. Do not remove the pin; the side effect
  (sticky routing disabled) is acceptable and the first entry is the most stable.
  glm-5.3-flash stays unpinned.
- **Prices are a snapshot.** Verify against the OpenRouter catalog
  (`expiration_date` per model) before any model decision.

## Re-derivation protocol (quarterly + before any model decision)

The tiers refresh on a quarterly cadence and before any model decision; throwaway
`curl`/`python3` probes are fine — this is a protocol, not a durable script.

1. **Live catalog.** GET `https://openrouter.ai/api/v1/models`; filter to open-weight
   families only (`z-ai/`, `moonshotai/`, `deepseek/`, `qwen/`, `minimax/`,
   `meta-llama/`, `mistralai/`, `nvidia/`, `meituan/`, `kwaipilot/`, `openai/gpt-oss`).
   Keep `id`, `context_length`, `pricing.prompt`/`completion`, `created`,
   `architecture.input_modalities` per model.
2. **Endpoints per candidate.** GET `https://openrouter.ai/api/v1/models/<id>/endpoints`;
   record provider count, per-provider `context_length`, uptime, per-provider prices.
   Some providers cap context below the catalog value — pin `provider.order` for such
   models (that is why qwen3.8 is pinned).
3. **Apply the rules.** ≥1M context is a hard requirement; open-weights only; vision
   capability tracked per model (vision-heavy work routes minimax-m3 cheap or kimi-k3
   hard, deepseek-v4-flash-vision-exp as the cheap routine fallback). Update the agent
   files, `opencode.jsonc`, and the manifest `models` list together.
4. **Check expiry.** `expiration_date` per model; `src/stack-check.ts` already sweeps
   the manifest list and flags models missing from OpenRouter or expiring within 30 days.

Deprecation history worth keeping in mind: `deepseek/deepseek-v3.1-terminus` expired
2026-08-17; `z-ai/glm-5.2` was retired 2026-08-30 as a value trap (replaced by
glm-5.3-flash); `qwen3.8-2.4t-a95b` replaced qwen3.8-max because max was single-provider
with unclear ZDR.

## Rejected / watched ledger

| Model | Status | Reason |
|---|---|---|
| `kimi-k2.7-code` | rejected | 256K ctx → violates the 1M rule |
| `qwen3.8-max` | rejected | single provider + ZDR unverified |
| `gpt-5.5` / `claude-fable-5` | pruned | non-open-weight |

Reasons persist so nobody re-adopts these without addressing the stated blocker.

## How the config expresses tiers

- `payload/config/opencode.jsonc` — `model`, `small_model`, `provider.openrouter` (the
  `baseURL http://localhost:8788/v1` proxy route, `setCacheKey`, and the qwen order
  pin), `enabled_providers: ["openrouter"]`.
- `flightlead.json` — machine-readable `models` list (the manifest default; the six
  manifest models: glm-5.3-flash, deepseek-v4-flash-0731, deepseek-v4-pro-0813,
  qwen3.8-2.4t-a95b, kimi-k3, minimax-m3). Vision-exp is an agent-file-only model, not a
  manifest default.
- `payload/config/agents/*.md` — per-seat `model` overrides (scout, plan-gate-*,
  diff-reviewer-*, qa, researcher, implementer, vision-*, security).
- `src/stack-check.ts` — model expiry sweep against OpenRouter (missing model or
  expiring <30 days = drift).
- Doctor/check wiring — `auth.openrouter` (key file present and parses),
  `versions.pinned` (manifest pins for all tools), `manifest.drift` (managed files match
  the manifest) in `docs/cli.md`.

The model-tier runtime (which seat gets which model) is enforced by the agent files and
the config; the protocol above is how the roster stays true when models retire or
providers change.