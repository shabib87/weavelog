# Evals and Telemetry

> **Date:** 2026-07-04
> **Status:** Active research. Informs ROADMAP.
> **Cross-ref:** `docs/NORTH_STAR.md` (open-source, credibility),
> `docs/tbd/open-blindspots-index.md` (loop telemetry proposal),
> `docs/research/2026-07-04-harness-setup-and-pmf-synthesis.md` (Tolaria, PMF)

## The question

How does weavelog measure "is it useful" and "what problem is it solving"?
What data to gather, how to gather it, how to use it for credibility?
The user wants phased (iii): usage telemetry first (v0.x), outcome/eval
telemetry once workflows stabilize (v1.x). Opt-in, privacy-conscious.

## Existing telemetry sources (already in the stack)

### 1. OpenRouter API — cost and usage data

```
GET /api/v1/key → { label, usage: $21.92, limit, is_free_tier }
GET /api/v1/generation?id=<id> → per-request cost, tokens, model
```

OpenRouter provides **aggregate spend** and **per-request cost data**. This
covers: how much was spent, on which models, per request. What it does NOT
cover: which weavelog command triggered the request, whether the output was
good, workflow-level metrics.

### 2. Headroom /stats — compression and savings data

Already available (verified this session):

```
api_requests: 28
compression.requests_compressed: 34
compression.total_tokens_removed: 7937
compression.avg_compression_pct: 80.5%
per-agent: codex (21 reqs, 7937 tokens saved, 20.14%)
```

Plus `headroom savings --json` for a durable ledger. This covers: tokens
saved, compression ratio, per-agent and per-model breakdown. What it does NOT
cover: weavelog command attribution, workflow outcomes.

### 3. Headroom evals — built-in quality evaluation

```
headroom evals adversarial   — compression robustness vs adversarial content
headroom evals probes        — retention of recorded compression events
headroom evals memory        — LoCoMo memory evaluation benchmark
```

This is a **built-in eval suite** for compression quality. Already in the
stack (headroom v0.30.0, MIT... wait, Apache 2.0). No additional install.

## The gap

What none of the existing sources track:

| Metric | OpenRouter | Headroom | weavelog needs |
|---|---|---|---|
| Cost per request | ✅ | — | ✅ |
| Tokens saved | — | ✅ | ✅ |
| Compression quality | — | ✅ (evals) | ✅ |
| Which command ran | — | — | ✅ (usage) |
| Workflow step completed | — | — | ✅ (outcome) |
| Verify gate passed/failed | — | — | ✅ (outcome) |
| Human approved/rejected | — | — | ✅ (outcome) |
| Time per step | — | — | ✅ (outcome) |
| Retries per step | — | — | ✅ (outcome) |

**The gap is workflow-level telemetry** — metrics that tie model usage to
weavelog's spec→implement→verify→document workflow.

## Telemetry tools audit (MIT/Apache 2.0, active)

| Tool | License | Stars | Verdict |
|---|---|---|---|
| PostHog | NOASSERTION | 35k | ❌ license not MIT/Apache |
| Plausible | AGPL-3.0 | 27k | ❌ license not MIT/Apache (web analytics, wrong fit) |
| LangSmith SDK | MIT | 952 | ⚠️ LangChain-specific, not general-purpose |
| Braintrust SDK | Apache 2.0 | 24 | ❌ too small (fails "not hobby" bar) |
| headroom evals | Apache 2.0 | (in stack) | ✅ built-in, compression quality |

**No external telemetry tool meets the user's bar** (MIT/Apache 2.0, active,
non-hobby, fit for devex tool telemetry). The right approach: **weavelog
implements its own minimal telemetry** as a `.weavelog/metrics.jsonl` log file,
composing with OpenRouter + headroom data sources.

## Recommendation: phased, minimal, opt-in

### Phase 1 (v0.x): Usage telemetry — local metrics log

**What:** weavelog writes a local append-only JSONL log for each command run.

```jsonl
{"ts":"2026-07-04T19:30:00Z","cmd":"weavelog check","model":"z-ai/glm-5.2","tokens_in":1234,"tokens_out":567,"cost_usd":0.003,"status":"pass","duration_ms":1200}
{"ts":"2026-07-04T19:35:00Z","cmd":"weavelog init","model":"z-ai/glm-5.2","tokens_in":0,"tokens_out":0,"cost_usd":0,"status":"pass","duration_ms":450}
```

**Where:** `.weavelog/metrics.jsonl` (gitignored, local only)

**Opt-in:** controlled by `weavelog config set telemetry local` (default: off).
No external upload. The user owns the data.

**Composes with:** OpenRouter `/api/v1/key` (aggregate cost) + headroom
`/stats` (compression savings). weavelog doesn't duplicate these — it
references them and adds the workflow attribution layer.

**This is the `docs/tbd/open-blindspots-index.md` "Loop Telemetry" proposal
made concrete.** It was already identified as "low effort, high value."

### Phase 2 (v1.x): Outcome/eval telemetry — workflow metrics

**What:** once the task loop exists (v0.3+), extend the metrics log with
workflow-level data:

```jsonl
{"ts":"...","workflow":"spec-to-code","step":"verify","model":"deepseek/deepseek-v4-pro","outcome":"pass","retries":0,"duration_ms":3400,"human_approved":true}
{"ts":"...","workflow":"spec-to-code","step":"implement","model":"z-ai/glm-5.2","outcome":"fail","retries":2,"duration_ms":12000,"error":"test_failure"}
```

**Plus:** run `headroom evals adversarial` + `headroom evals probes` on a
schedule to measure compression quality over time. Results appended to the
metrics log.

**This is the "is it useful" evidence.** The user can query the log to answer:
- How many features shipped via weavelog?
- What's the human approval rate?
- Which models fail most?
- Where do humans reject most often?

### Phase 3 (v1.x+): Public telemetry — credibility evidence

**What:** aggregate, anonymized telemetry published to the blog.

```
weavelog stats --public
  → "127 features shipped via weavelog"
  → "94% human approval rate at verify gate"
  → "$0.08 average cost per feature"
  → "2.3 retries average per implement step"
```

**Privacy design:**
- Telemetry is local-only by default (Phase 1–2)
- Public sharing requires explicit `weavelog stats --publish` (Phase 3)
- Published data is aggregate counts only — no code content, no personal data,
  no project identifiers
- Opt-in at every phase. Off by default. The user controls their data.

**This is the Tolaria "built from real use" credibility play, with data.**
Tolaria's evidence was "I use it every day." weavelog's evidence: "X developers
ran Y loops, shipped Z features, at $0.08 average cost."

## What NOT to do

- **Don't use PostHog/Plausible.** Wrong licenses (NOASSERTION, AGPL-3.0).
- **Don't build a custom eval framework.** headroom evals + metrics.jsonl
  covers it. YAGNI.
- **Don't collect code content.** Privacy risk, no value for aggregate
  metrics.
- **Don't make telemetry default-on.** OSS tools that phone home without
  consent lose trust. Opt-in is non-negotiable.

## What this resolves

| Question | Answer |
|---|---|
| What data to gather? | Usage (Phase 1) + outcome (Phase 2) + aggregate public (Phase 3) |
| How to gather? | Local `.weavelog/metrics.jsonl` + OpenRouter API + headroom /stats |
| What tools? | No external telemetry tool (none meet the bar). weavelog writes its own minimal log. |
| Opt-in design? | Default off. `weavelog config set telemetry local`. No external upload unless explicit `--publish`. |
| Evals? | `headroom evals adversarial/probes` (built-in) for compression quality |
| Privacy? | Local-only by default. Aggregate counts only for public. No code content. |
| Credibility evidence? | `weavelog stats --public` publishes aggregate data to the blog |

## What this defers

- The `weavelog stats` command implementation (Phase 4 CLI tool)
- The public dashboard design (Phase 3, when there's enough data)
- The `weavelog config` command (Phase 4 CLI tool)
- Eval cadence (how often to run headroom evals — Phase 2+ decision)
