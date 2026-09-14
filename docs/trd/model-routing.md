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
  - ../adr/0007-independent-review-policy.md
sources:
  - "AGENT-STACK-RUNBOOK.md §Model tier protocol, §Current model tiers, §Watched / not-used, §Phase 2/3 (TASK-45 decomposition)"
---

# Model tier protocol (self-refreshing)

## The tier concept

Every seat on the host gets a model tier, expressed in `opencode.jsonc` as two keys:

- `model` — the default workhorse. Runs the conductor. As of the 2026-08-30 snapshot:
  `openrouter/z-ai/glm-5.3-flash` (1M context, native multimodal, cheapest-capable
  planning).
- `small_model` — the cheap bulk default for new sessions. Currently the
  `openrouter/deepseek/deepseek-v4.1-flash` manual A/B slot (human override
  2026-09-11, no seat — see the research hold note and ADR-004 Addendum
  2026-09-14). The worker seats (`implementer`, `scout`) still carry
  `deepseek/deepseek-v4-flash-0731` in their own agent files.

Model identity facts: the ID format is `openrouter/<org>/<model>`. `model` /
`small_model` apply to **new sessions only** — existing sessions keep their model.
Subagents inherit the parent session's model **unless** the agent file sets its own
`model` field, which is how the roster below is expressed (one model per agent file in
`payload/config/agents/`).

Escalation ladder (ADR-004, 2026-09-07): reviewer/plan-gate seats run flash-first and
climb on deterministic triggers — L0 `glm-5.3-flash` → L1 `deepseek-v4-pro-0813`
(risk-signal triggers computed on the merged diff against base; no line count) → L2
`glm-5.3` → L3 `qwen3.8-2.4t-a95b` → L4 `kimi-k3`. Final approval follows the relational
family rule (family = vendor; never bless your own family's output unless the
ADR-007 unavailable-family exception has an explicit human receipt). Trigger semantics
live in `payload/config/prompts/reviewer.md` and `plan-reviewer.md`; per-agent model
fields may name only L0–L4 seats.

## Roster (snapshot 2026-09-07 — re-verify, don't trust)

| Role | Model | $/1M in/out | Why |
|---|---|---|---|
| Default workhorse / conductor | `z-ai/glm-5.3-flash` | $0.075 / $0.25 | 1M ctx, native multimodal, cheapest-capable planning; L0 reviewer rung |
| Scout / bulk / implementer | `deepseek/deepseek-v4-flash-0731` | $0.14 / $0.28 | 1M ctx, text-only, cheapest viable executor |
| Review / qa (L1) | `deepseek/deepseek-v4-pro-0813` | $0.66 / $1.98 | text-only; risk-signal escalation + long deterministic test loops |
| High-stakes review (L2/L3) | `z-ai/glm-5.3`, `qwen/qwen3.8-2.4t-a95b` | $1.40 / $4.40 · $2.00 / $6.00 | architecture/security-scoped diffs; qwen is the 4th-family voice, provider-pinned for 1M |
| Escalation ceiling / hardest / vision-hard (L4) | `moonshotai/kimi-k3` | $3.00 / $15.00 | 13 providers, image+video, escalation only |
| Vision/UI (cheap) | `qwen/qwen3.8-flash` | $0.15 / $0.47 | image+video input, routine visual reads |

Design rules behind the roster:

- **Cross-family error diversity is the point.** The reviewer/gate seats span four
  families (glm, deepseek-v4-pro, qwen3.8, kimi-k3) so a review never shares the
  author's blind spot. The qa seat rides deepseek-v4-pro-0813 deliberately — long
  deterministic test loops, not cross-family review.
- **qwen3.8-2.4t-a95b is provider-pinned for context, not caching.** It gets 1M
  context on only some OpenRouter providers, so `provider.openrouter.models` pins
  `order: ["SiliconFlow", "Modal", "Alibaba"]`. Do not remove the pin; the side effect
  (sticky routing disabled) is acceptable and the first entry is the most stable.
  glm-5.3-flash stays unpinned.
- **Vision routes qwen3.8-flash cheap / kimi-k3 hard** (ADR-004 roster, 2026-09-07).
  minimax-m3 and deepseek-v4-flash-vision-exp access was removed 2026-09-07.
- **Prices are a snapshot.** Verify against the OpenRouter catalog
  (`expiration_date` per model) before any model decision.

## Cadence (weekly sweep + MONTHLY deep refresh — supersedes quarterly)

Per ADR-004 (revised 2026-09-07: quarterly is too slow for the current
model-progression pace), the roster stays true through two loops. At 0.1.0 both run
on-demand via `stack-check`; scheduling (LaunchAgent) is explicitly post-0.1.0.

### Weekly — pricing/deal sweep (deterministic)

`stack-check` diffs the live OpenRouter `/api/v1/models` catalog against the pinned
snapshot at `src/tools/openrouter-snapshot.json` and FAILS (exit 1) on:

- a ≥10% price delta (input or output) on any roster model;
- a new slug in a monitored family (`z-ai/`, `deepseek/`, `qwen/`, `moonshotai/`);
- a removed/renamed roster slug.

Every failure is a BLOCKING human decision: the drift report carries a decision brief
and the roster is stale until the human acknowledges. The machine never selects across
tiers or admits a new model unilaterally. **Bounded auto-select** is the only machine
action allowed, and only for pre-approved, reversible selections (cheaper provider route
for the same slug; tier-bounded flash swaps with equal-or-better tool-bench evidence).

Re-pinning the snapshot after an acknowledged decision (manual, on-demand at 0.1.0):

```bash
curl -s https://openrouter.ai/api/v1/models | node -e "/* build snapshot — see research note */"
```

The snapshot is versioned in the repo; the sweep script NEVER edits ADR-004.

### Bounded auto-select ledger format

Auto-applied selections append one JSON line to `docs/research/roster-autoselect-ledger.jsonl`
(append-only, never rewritten):

```json
{"date":"YYYY-MM-DD","kind":"route-swap|tier-bounded-swap","model":"<org>/<slug>","from":{"provider":"…","$/m_in":0,"$/m_out":0},"to":{"provider":"…","$/m_in":0,"$/m_out":0},"reason":"<code>","evidence":"<snapshot date or benchmark source>","reversible":true,"appliedBy":"stack-check","humanAck":null}
```

Reason codes: `cheaper-route` (same slug, cheaper provider route) and
`flash-bounded-swap` (flash→flash swap with equal-or-better tool-bench evidence).
Anything structural — new model adoption, seat remapping, roster entry/exit, evidence
revision — is FORBIDDEN in the ledger and goes to the decision brief instead. The human
sets `humanAck` on review; entries without it are provisional. This ledger is
protocol-ahead-of-code at 0.1.0: the format is fixed here, no auto-select/ledger-writing
code exists yet — the sweep is manual/on-demand and any ledger entries are written by hand.

### Monthly — deep refresh (replaces the former quarterly protocol)

Full benchmark re-evaluation per ADR-004's seat-weighted composite (Terminal-Bench 2.1,
SWE-bench Pro, HLE-with-tools under the Artificial Analysis protocol pin), producing the
decision brief that feeds the next roster revision. Also before any model decision;
throwaway `curl`/`python3` probes are fine — this is a protocol, not a durable script.

1. **Live catalog.** GET `https://openrouter.ai/api/v1/models`; filter to open-weight
   families only (`z-ai/`, `moonshotai/`, `deepseek/`, `qwen/`,
   `meta-llama/`, `mistralai/`, `nvidia/`, `meituan/`, `kwaipilot/`, `openai/gpt-oss`).
   Keep `id`, `context_length`, `pricing.prompt`/`completion`, `created`,
   `architecture.input_modalities` per model.
2. **Endpoints per candidate.** GET `https://openrouter.ai/api/v1/models/<id>/endpoints`;
   record provider count, per-provider `context_length`, uptime, per-provider prices.
   Some providers cap context below the catalog value — pin `provider.order` for such
   models (that is why qwen3.8-2.4t-a95b is pinned).
3. **Apply the rules.** ≥1M context is a hard requirement; open-weights only; vision
   capability tracked per model (vision work routes qwen3.8-flash cheap or kimi-k3
   hard). Update the agent files, `opencode.jsonc`, and the manifest `models` list
   together — the weekly sweep then re-pins the snapshot after human acknowledgement.
4. **Check expiry.** `expiration_date` per model; `src/tools/stack-check.ts` already sweeps
   the manifest list and flags models missing from OpenRouter or expiring within 30 days.

Deprecation history worth keeping in mind: `deepseek/deepseek-v3.1-terminus` expired
2026-08-17; `z-ai/glm-5.2` was retired 2026-08-30 as a value trap (replaced by
glm-5.3-flash); `qwen3.8-2.4t-a95b` replaced qwen3.8-max because max was single-provider
with unclear ZDR; `minimax/minimax-m3` and `deepseek/deepseek-v4-flash-vision-exp` had
access removed 2026-09-07 when the roster consolidated to the seven-model ADR-004 set
(vision moved to qwen3.8-flash).

## Rejected / watched ledger

| Model | Status | Reason |
|---|---|---|
| `kimi-k2.7-code` | rejected | 256K ctx → violates the 1M rule |
| `qwen3.8-max` | rejected | single provider + ZDR unverified |
| `minimax/minimax-m3` | removed 2026-09-07 | vision consolidated onto qwen3.8-flash (ADR-004 roster) |
| `deepseek/deepseek-v4-flash-vision-exp` | removed 2026-09-07 | experimental vision checkpoint; replaced by qwen3.8-flash |
| `gpt-5.5` / `claude-fable-5` | pruned | non-open-weight |

Reasons persist so nobody re-adopts these without addressing the stated blocker.

## How the config expresses tiers

- `payload/config/opencode.jsonc` — `model`, `small_model`, `provider.openrouter` (the
  `baseURL http://localhost:8788/v1` proxy route, `setCacheKey`, and the qwen order
  pin), `enabled_providers: ["openrouter"]`.
- `weavelog.json` — machine-readable `models` list (the manifest default; the eight
  manifest models: glm-5.3-flash, glm-5.3, deepseek-v4-flash-0731,
  deepseek-v4.1-flash, deepseek-v4-pro-0813, qwen3.8-flash,
  qwen3.8-2.4t-a95b, kimi-k3).
- `payload/config/agents/*.md` — per-seat `model` overrides (scout, plan-gate-*,
  diff-reviewer-*, qa, researcher, implementer, vision-*, security).
- `src/tools/stack-check.ts` — model expiry sweep plus the roster drift gate against the
  pinned snapshot (missing model, ≥10% price delta, new monitored-family slug, or
  expiring <30 days = drift; roster drift also emits a blocking decision brief).
- `src/tools/openrouter-snapshot.json` — the pinned OpenRouter catalog snapshot the
  drift gate diffs against (re-pinned only after human acknowledgement).
- Doctor/check wiring — `auth.openrouter` (key file present and parses),
  `versions.pinned` (manifest pins for all tools), `manifest.drift` (managed files match
  the manifest) in `docs/cli.md`.

The model-tier runtime (which seat gets which model) is enforced by the agent files and
the config; the protocol above is how the roster stays true when models retire or
providers change.
