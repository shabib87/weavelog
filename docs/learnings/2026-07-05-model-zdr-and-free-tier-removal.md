# Learning Log: ZDR-on decision, free-tier removal, and model-parity research

> **Date:** 2026-07-05
> **Session:** Model selection research thread (turns 1-8)
> **Status:** Decisions confirmed by user. Executed as one diff.

## Context

User asked three questions across a research thread: (1) is Sonnet 5 more
powerful than GLM 5.2; (2) which frontier model is GLM 5.2 / DeepSeek V4 Pro
closest to; (3) is the current open-weights setup the best cost/quality with
the right escalation. A follow-up asked about ZDR blocking the free tier and
direct Anthropic/OpenAI API. This log captures the verified findings and the
decisions that followed.

## Findings (evidence-first)

### Model parity (source: OpenRouter API `benchmarks`, fetched 2026-07-05)

OpenRouter exposes two benchmark families per model: `artificial_analysis`
(coding/agentic/intelligence indices) and `design_arena` (head-to-head Elo,
split by `agents` arena = tool-use coding, vs `models` arena = single-shot
generation). Both are Artificial Analysis data; OpenRouter is the access path
this registry already trusts.

Key finding: the two axes disagree, and for a coding agent the `agents` arena
is the more relevant signal.

| Model | AA Coding | Agents fullstack (elo/rank) | Models codecategories (rank) |
|---|---|---|---|
| Claude Fable 5 | 76.5 | top tier | - |
| OpenAI GPT-5.5 | 74.9 | 1151 / #15 | #17 |
| Claude Opus 4.8 | 74.3 | 1325 / #2 | #22 |
| Claude Sonnet 5 | 71.5 | no agents data (launched 2026-06-30) | #8 |
| GLM 5.2 (daily) | 68.8 | 1293 / #3 | #1 |
| Kimi K2.7 Code (UI) | 60.8 | 1233 / #7 | #13 |
| DeepSeek V4 Pro (checker) | 59.4 | 948 / #29 | #20 |

- GLM 5.2 has genuine parity with Opus 4.8 on the agentic axis (32 Elo, ~3%
  win-rate; both top-3 globally on agents fullstack). GLM 5.2 is #1 globally on
  single-shot codecategories.
- GPT-5.5 is weak on agentic coding (agents rank #15-18, win 44-51%) despite
  being AA coding #2. Its strength is single-fix work, not tool-use loops.
- DS V4 Pro is a full tier below Opus 4.8 on agents (rank #29). It is not
  frontier-parity. Its value is cross-family diversity, not raw power.
- Qwen 3.7 Max (AA coding 66.0) is NOT open-weights (no HuggingFace ID in the
  OpenRouter catalog). Disqualified for the primary checker slot under the
  North Star "open-weight models are primary" rule.

### Sonnet 5 (source: Anthropic announcement + AA indices)

Anthropic's own announcement (anthropic.com/news/claude-sonnet-5, 2026-06-30),
verbatim: "its performance is close to that of Opus 4.8, but at lower prices"
and "a substantial improvement over its predecessor, Sonnet 4.6" and "its
higher-effort performance can match Opus 4.8 on some tasks."

AA data corroborates: Sonnet 5 coding 71.5 vs Sonnet 4.6 63.0 (+8.5, ~13.5%
relative). vs Opus 4.8: coding gap 2.8, agentic gap 0.5 (essentially tied),
intelligence gap 2.3. Sonnet 5 is a real, substantial jump over 4.6 and close
to Opus 4.8.

### ZDR and provider routing (sources: OpenRouter Terms, OpenRouter blog, OpenRouter endpoints API, vendor privacy terms)

- OpenRouter Terms (openrouter.ai/terms): with ZDR off (default), you grant
  license to log/store User Content, log/copy/store/distribute Inputs for
  debugging, and license/sell User Content in anonymised form. "Where
  possible, OpenRouter has opted out of model training" (the "where possible"
  clause is why free-tier providers are blocked under ZDR).
- OpenRouter data-residency blog (openrouter.ai/blog/insights/ai-data-residency,
  2026-06-22): `zdr: true` "requires Zero Data Retention endpoints" and
  "restricts routing to Zero Data Retention endpoints"; `data_collection: deny`
  "excludes providers that store or train on inputs." Works per-request OR as
  account-wide default. Shifts trust from many providers to the routing layer.
- OpenRouter endpoints API (`/api/v1/models/<id>/endpoints`): Claude Sonnet 5
  has 7 endpoints (Anthropic-direct, Amazon Bedrock x3, Google Vertex x2,
  Azure). Claude Fable 5 has 5 (Azure, Bedrock x2, Vertex, Anthropic-direct).
  GPT-5.5 has 3 (OpenAI-direct, Azure x2; NO Bedrock endpoint).
- Anthropic Commercial Terms: "Anthropic may not train models on Customer
  Content from Services" (contractual, unconditional).
- OpenAI Enterprise Privacy (Wayback snapshot, updated 2026-01-08; live site
  JS-blocked this session): "We do not train our models on your data by
  default. You own your inputs and outputs." 30-day deletion for deleted
  conversations.

User's claim "Anthropic/OpenAI models route via Amazon Bedrock or similar
under ZDR" is substantively correct with one precision: Anthropic models do
have Bedrock endpoints; GPT-5.5 has no Bedrock endpoint and would route via
Azure.

Honest gap: could not find an official doc stating verbatim that ZDR-on
excludes the direct Anthropic/OpenAI endpoint. Inferred from (a) ZDR filters
to zero-retention endpoints, (b) direct APIs retain ~30 days for abuse review,
(c) Bedrock/Vertex/Azure are the remaining endpoints. Consistent with user's
empirical observation. The authoritative ZDR-eligible provider list lives in
OpenRouter's "provider logging docs," which could not be fetched (docs site is
a JS SPA; no ZDR-eligibility field in the `/api/v1/providers` schema).

### Data each party collects (verified)

- OpenRouter ZDR off: logs/stores User Content, copies/distributes Inputs for
  debugging, may license/sell anonymised User Content. Free-tier providers may
  store/train (opt-out not possible).
- OpenRouter ZDR on: restricts to zero-retention endpoints; no provider-side
  retention. OpenRouter-side handling per its own privacy policy still applies.
- Anthropic API: no training on Customer Content (contractual). Retention for
  abuse/trust-and-safety (widely documented as 30 days; could not crisply
  re-verify the exact API retention number this session).
- OpenAI API: no training by default. You own inputs/outputs. 30-day deletion.
  Access limited to authorized employees + bound contractors for abuse review.

## Decisions (confirmed by user, turn 5)

1. **Keep ZDR on.** A coding agent's prompts are proprietary source code.
   Turning ZDR off to recover one $0 model and direct-API passthrough exposes
   every prompt to logging/distribution/training-by-free-tier-providers. The
   asymmetry is not justified.
2. **Remove the free tier.** `nvidia/nemotron-3-ultra-550b-a55b:free` and
   codex profile `nemotron-3-free` removed. DeepSeek V4 Flash ($0.09/$0.18 per
   M) absorbs the former free-tier workload (CI scripts, changelogs, simple
   test assertions). ZDR blocks `:free` provider endpoints, so the free model
   is unusable regardless.
3. **Sonnet 5 is NOT added.** The turn-3 proposal (Sonnet 5 as a frontier
   reviewer slot, a new two-tier checker structure) is not adopted under
   "remaining models keep as is." If frontier-parity review is later needed,
   that is a separate +1 row in models.md, +1 codex profile, +1
   enabledModels entry, +1 AGENTS.md profile name.
4. **Keep GPT-5.5 + Fable 5 escalation** unchanged.
5. **Amend ADR 2.4 roster** to match models.md (turn 8). Original role-based
   roster preserved as superseded; current tier-based roster added. License
   correction applied (see Corrections).

## Corrections

- **DeepSeek V4 Pro license:** original ADR 2.4 recorded it as Apache 2.0.
  Verified via HuggingFace API (`huggingface.co/api/models/deepseek-ai/DeepSeek-V4-Pro`)
  on 2026-07-05: license is MIT. Corrected in the ADR amendment (commit 3099d89).
- No other corrections to prior artifacts. The pre-existing ADR/models.md
  roster drift (different model sets, role-based vs tier-based) was resolved
  by the amendment in decision 5, not by silently rewriting the ADR.

## Pre-existing drift surfaced (NOT fixed in this change)

ADR 0001 section 2.4 lists a 6-model roster (GLM 5.2, DS V4 Pro, DS V4 Flash,
devstral-2512, qwen3.6-35b-a3b, nemotron-3-super-120b-a12b:free) that differs
from models.md (now 6 models: GLM 5.2, DS V4 Pro, Kimi, DS V4 Flash, GPT-5.5,
Fable 5). Different model set, different role structure (role-based vs
tier-based), different nemotron variant. This predates this session and is
unrelated to the free-tier removal. Aligning ADR with models.md is a separate
decision with its own approval path. The ADR section 2.4 roster was amended
(2026-07-05, separate user-approved decision) to match models.md: original
role-based roster preserved as superseded, current tier-based roster added,
license correction (DeepSeek V4 Pro is MIT, not Apache 2.0 as originally
recorded; verified via HuggingFace). docs/research/RESEARCH.md retains a
pointer note since its roster is provenance-only.

## Blog candidates

- "Two benchmark axes, two different verdicts": why the AA coding index and
  the Design Arena agents category disagree, and why that matters for picking
  a coding-agent model (GPT-5.5 looks #2 on one axis and #15 on the other).
- "ZDR and the open-weights cost/quality frontier": how turning on a single
  privacy toggle reshapes the model roster, and why the $0 slot is the first
  casualty.
- "The checker does not need to be smarter": the loopeng maker/checker
  principle where a 59.4-coding model verifies a 68.8-coding model, and why
  different-family beats same-family-smarter.
