# Session-Quality Telemetry Axis — Correction + Design Decisions

> **Date:** 2026-07-05
> **Session:** discussion (no code touched — correction of prior assessment)
> **Related:** `docs/research/2026-07-05-pi-tui-session-api.md`,
> `docs/learnings/2026-07-05-session-logger-derailment.md`,
> `docs/research/2026-07-04-evals-and-telemetry.md`,
> `docs/tbd/open-blindspots-index.md`

## Context

Followed up on the session-logger derailment. I assessed `session-logger.ts`
as "wrong shape for loopeng" because it didn't match the workflow-telemetry
axis (loopeng's own spec→implement→verify→document steps). The user pushed
back: session-logger serves a *different* axis — session-quality telemetry —
and on that axis it is first-relevance for loopeng. The user is correct.

## Findings

### 1. There are two distinct telemetry axes, not one

| Axis | Question it answers | Source | Granularity |
|---|---|---|---|
| Workflow telemetry | "did the loop ship useful features, which step fails" | loopeng run state | per-step, append-only JSONL |
| Session-quality telemetry | "how does the human use the agent, is each session healthy" | Pi session branch | per-session, one JSON per session |

`.pi/logs/<id>.stats.json` is axis 2. `.loopeng/metrics.jsonl` (planned) is
axis 1. They are complementary, not competing. My prior assessment scored
session-logger against axis 1 and dismissed it. Wrong yardstick.

### 2. The existing technical choices are correct for axis 2

My earlier technical criticisms invert for the session-quality use case:

- **One-file-per-session is better, not worse.** Conflation/mixing is an
  *intra-session* property; you need the per-session message sequence. A flat
  JSONL throws that away.
- **Shutdown-only write is fine.** You want the complete session to judge
  "was this session conflated" or "did turns inflate." Incremental writes
  matter for crash-safety, not analysis quality.
- **Per-session JSON is not redundant with OpenRouter.** `message.usage` is
  session-time truth; OpenRouter `/api/v1/key` is billing-time truth.
  Cross-referencing them is a validation feature, not duplication.

### 3. Topic classification is viable without storing content

A session's type (research / analysis / coding / docs / debugging / review)
and its conflation/mix are derivable from the session branch at shutdown
*without storing message content*, by reading tool-call type counts and
path prefixes. This preserves the privacy property the current logger has
(aggregates only, no content).

### 4. Conflation and turn-inflation are hypotheses to test, not bake in

The user's claims — "mixing types degrades sessions" and "increasing turns
degrades quality" — are exactly what the telemetry should *test*, not assume.
If "conflated = bad" is hard-coded into the logger, the analysis is biased.
The logger should record raw signals (topic-switch count, dominant-type
ratio, turn count, cost-per-turn trend); the conclusion lives in the
correlation layer, which needs the workflow axis (verify-gate outcome) to
actually prove "conflated sessions fail more."

## Decisions

1. **Closed-set taxonomy, 6 labels.** `research | analysis | coding | docs |
   debugging | review`. No `mixed` as a primary type — mixing is measured as
   a *signal* (topic switches, dominant-type ratio), not a type label. A
   closed set makes summarization simple and prevents label drift.

2. **Deterministic heuristic classification for v1.** Classify from tool-call
   counts + path prefixes at shutdown. Zero added cost, deterministic,
   private, testable. Signals: read/bash-grep/rg ratio vs edit/write ratio;
   `docs/` vs `src/` path touches; test runs; git ops. Store the label +
   confidence + signal counts, not the paths.

3. **LLM classification deferred behind opt-in.** More accurate for semantic
   conflation, but adds cost/latency at shutdown and sends message text
   somewhere, which changes the privacy surface. v2 enhancement, gated
   behind explicit opt-in. Not in v1.

4. **JSONL linked to per-session log for cross-reference analysis.** The
   join contract: `.loopeng/metrics.jsonl` entries carry a `piSessionId`
   field referencing `.pi/logs/<piSessionId>.stats.json`. This is the
   cross-reference key that lets the daily/weekly summary join
   session-quality data (axis 2) with workflow-outcome data (axis 1). Pi
   session ID is the natural key. Open question: loopeng workflow runs may
   span or sit inside Pi sessions in ways that are not 1:1 — the join
   cardinality (1:1, 1:many, many:1) needs a real decision before the
   metrics.jsonl schema is finalized.

### Schema additions to `.pi/logs/<id>.stats.json` (heuristic-only, v1)

```
type: "research" | "analysis" | "coding" | "docs" | "debugging" | "review"
typeConfidence: number
typeSignals: { reads, writes, bashes, tests, gitOps, docPaths, srcPaths }
topicSwitches: number
dominantTypeRatio: number
turnsBucket: "0-10" | "10-25" | "25-50" | "50+"
costPerTurnTrend: "flat" | "rising" | null
```

All derivable from `ctx.sessionManager.getBranch()` at shutdown. None stores
content or paths beyond counts.

### Downstream feature (noted, Phase 4+)

The daily/weekly summary is the display layer. The user also named a
**guide-suggestion** layer: loopeng proactively suggesting optimizations
from usage patterns (e.g. "your coding sessions after turn 25 cost 3x more,
consider splitting"). This is a Phase-4+ analysis feature built on top of
the joined telemetry. It depends on (a) the session-quality signals being
logged, (b) the workflow-outcome join resolving, and (c) enough data to
make suggestions non-trivial. Tracked here so it is not lost; not in v1
scope.

## Corrections

- **Prior framing was wrong.** I called session-logger "personal Pi tooling,
  wrong shape for loopeng." It is first-relevance on the session-quality
  axis. The footer + session-logger work stays; the `loopeng stats` CLI
  stays deferred to Phase 4 with TDD-first.
- **The two log locations are not a namespace collision.** `.pi/logs/`
  (session-quality, per-session JSON) and `.loopeng/metrics.jsonl`
  (workflow-outcome, append-only JSONL) measure different axes and are
  joined via `piSessionId`. Both are opt-in with telemetry.

## Blog Candidates

- "Two Telemetry Axes: Why Your Agent Logger and Your Workflow Logger Are
  Different Things" — the axis distinction, with the join as the payoff.
- "Conflation Is a Hypothesis, Not a Fact" — why the logger records signals,
  not conclusions, and why hard-coding "mixed = bad" biases the analysis.
- "Heuristic-First Topic Classification for Agent Sessions" — classifying
  session type from tool-call patterns without storing content.
