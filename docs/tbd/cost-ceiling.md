# Cost Ceiling & Runaway Detection

**Status:** Open blindspot — spec has retry limits but no budget.
**Severity:** Medium. Affects trust and wallet.

## The Problem

A coder step with `maxRetries: 5` on a hard problem could burn significant
tokens. At DeepSeek V4 Pro's $0.435/$0.87 per 1M tokens, 5 retries with long
context and Headroom compression overhead could quietly spend real money
before escalating. The spec caps retries but not **dollars** or **tokens**.

For a tool whose promise is "human only verifies," silent runaway spending
erodes the trust that makes unattended-ish runs acceptable.

## The Verified Lever

Headroom's proxy supports `--budget` and `--budget-period` (read in
`headroom proxy --help`):
> `--budget FLOAT RANGE` — Budget limit in USD per `--budget-period`.
> Requests are rejected with 429 once the limit is reached.

So the mechanism exists at the proxy layer. Loopeng needs to:
1. Expose a per-workflow `budget` field in the workflow config (USD).
2. Pass it to the Headroom proxy when starting a workflow run, OR enforce it
   in the loopeng extension by tracking spend per step.
3. On budget exhaustion: abort the workflow with a clear message, not a
   silent 429 retry storm.

## Decisions to Make

1. **Where to enforce** — Headroom proxy `--budget` (proxy-level, simple,
   but shared across concurrent workflows on the same proxy) vs. loopeng
   extension (per-workflow, but requires parsing token usage from
   `message_end` events). Recommend extension-level for per-workflow
   granularity.
2. **Default budget** — should a workflow have a default ceiling (e.g., $5)
   if unspecified, forcing the user to opt into higher? Or no default
   (trust the user)? Recommend a safe default with override.
3. **Token budget vs dollar budget** — dollars require price tables that
   drift; tokens are model-agnostic but meaningless to the user. Recommend
   dollars, sourced from OpenRouter's pricing endpoint at run start.
4. **Escalation on budget hit** — abort entirely, or pause and ask the human
   to raise the budget? Recommend: pause, surface, let human decide. Aligns
   with "human only verifies" — budget exhaustion is a verification event.

## Outcome Needed
A spec section: "Budgets & Runaway Detection" with the workflow config
field, enforcement point, default, and escalation behavior.
