---
date: 2026-09-07
topic: Model-selection benchmark policy (open-weight roster vs frontier)
status: superseded
type: adr
author: conductor
related_to:
  - ./README.md
  - ./0005-artifact-flow.md
  - ../NORTH_STAR.md
  - ../PRODUCT.md
  - ../ROADMAP.md
  - ../research/2026-09-07-flagship-tier-pricing-quality-preliminary.md
  - ./0003-three-phase-loop-model.md
  - ./0006-tiered-loop-commands.md
  - ./0007-independent-review-policy.md
sources:
  - "TASK-61"
---

# Model-Selection Benchmark Policy (Open-Weight Roster vs Frontier)

## Status

superseded by ADR-007 (2026-09-11) for the reviewer-fallback decision. ADR-007
carries forward this record's benchmark selection, escalation triggers, and drift
governance. Traces to NORTH_STAR non-negotiables and the ROADMAP milestone ladder.

*(Revised 2026-09-10: status word synced to approved — frontmatter, this section, and the index row then agreed; the body had drifted while frontmatter and index recorded the 2026-09-07 ratification.)*

**Transition recorded 2026-09-11:** ADR-007 was ratified. It supersedes this record
for the reviewer-fallback decision and carries forward benchmark selection,
escalation triggers, and drift governance unchanged.

## Context

The weavelog harness selects models for role seats (conductor, implementer,
scout, researcher, reviewers, qa, security) from an open-weight roster routed
through OpenRouter. Model selection has been driven by ad-hoc benchmark
citations that mix vendor-reported scores, inconsistent benchmark versions
(Terminal-Bench 2.0 vs 2.1 vs 3.0; SWE-bench Verified vs Pro), and
non-comparable evaluation setups (reasoning effort, tools on/off). The
2026-09-07 research note
(`docs/research/2026-09-07-flagship-tier-pricing-quality-preliminary.md`)
records the cost side; this ADR fixes *which quality evidence is allowed to
drive seat decisions*, and how the open-weight roster is judged against
Anthropic/OpenAI frontier models.

## Decision

| Decision | Choice | Why |
|---|---|---|
| Benchmark basis | **Seat-weighted composite** — TB 2.1, SWE-bench Pro, HLE-with-tools, each primary for a seat class (table below) | One instrument cannot judge both loop throughput and reasoning-about-code |
| HLE role | **Primary** for plan-gate/security/researcher; closed-book HLE **rejected**; Artificial Analysis = governing protocol source | Biggest open-weight-vs-frontier gap lives there — the escalation boundary |
| Reviewer escalation | **L0–L4 ladder** (table below), risk-signal triggers, relational family rule | Replaces ad-hoc reviewer picks; cheapest-first with diversity guarantee |
| Routing surface | **OpenRouter** primary until 0.2.0+ (pi host) | ROADMAP host ladder; aggregation is not vendor lock-in |
| Drift cadence | **Weekly** pricing sweep + **monthly** deep refresh (table below) | Quarterly too slow for model-progression pace; human brief blocks structural changes |
| Phase-2 host scope | **opencode only** (0.1.0); pi config deferred to 0.2.0 | ROADMAP v0.1.0 scope |

A seat assignment is defensible only when the seat's primary instrument plus
at least one corroborating instrument support it at the stated cost.
(Revised 2026-09-07 after independent DeepSeek V4 Pro review: a single
primary instrument conflates "the product is an agent loop" with "every seat
needs agent-loop benchmarks" — reviewers, plan-gate, and security seats
reason *about* code rather than operate inside a terminal.)

### Primary per seat class

| Seat class | Primary instrument | Why |
|---|---|---|
| Implementer / scout / worker loops | Terminal-Bench 2.1 (version-pinned) | Measures agent-plus-model pair on terminal tasks end to end; matches loop failure modes |
| Reviewer / QA | SWE-bench Pro (contamination-resistant) | Repo-level patch reasoning on commercial-style codebases; SWE-bench Verified deprecated (OpenAI recommendation, contamination) |
| Plan-gate / security / researcher | HLE-with-tools (protocol-pinned) | Expert-level reasoning on novel, underspecified problems — exactly what these seats do; HLE is community-recognized (Nature-published, tracked by BenchLM/AA/Wikipedia) |

Protocol discipline for HLE: tool configuration, reasoning effort, and judge
model vary wildly across leaderboards (BenchLM Aug 2026 shows Kimi K3 at 56%
while the Artificial Analysis Sept 3 2026 table shows 46.9% — same model,
different protocol). **Governing source for HLE-with-tools is the Artificial
Analysis table** (single consistent protocol); BenchLM and other figures are
advisory only and must be protocol-tagged. HLE figures from different
protocols must never be mixed in one decision. Corroborators (below) apply
to all three seat classes.

### Corroborator 1: Artificial Analysis composite indexes

Independent, harness-normalized, updates continuously. Used to detect
vendor-score inflation, never as the sole basis for a seat.

### Corroborator 2: Tool-call reliability + cost-per-task

Toolathlon Verified (or BFCL v4) for tool-call accuracy, and cost-per-task
computed from the same eval trajectory (FriendliAI methodology), not from
list prices. A cheap model that stalls loops is expensive.

### Rejected as primary evidence

| Option | Verdict | Reason |
|---|---|---|
| HumanEval, LiveCodeBench | rejected | function-level generation; saturated and not agentic |
| HLE closed-book (no tools) | rejected | answers a different question than tool-assisted runs; not comparable to harness operation |
| Any vendor-reported score used alone | rejected | permitted only with an explicit `unverified` tag and a corroborating independent instrument |

### HLE as the beyond-open-weights signal

On the agentic instruments the open-weight roster sits close to frontier
(GLM-5.3 86.5% vs Opus 5 89.1% on TB 2.1). On HLE-with-tools the gap is
wide: GLM-5.3 at 42.3 and DeepSeek V4 Pro 0813 at 41.0 vs Claude Fable 5.1
at 59.1 (Artificial Analysis, Sept 3 2026, consistent protocol). HLE is
therefore the decision boundary signal for when a seat must escalate past
the open-weight ladder to a paid frontier model — plan-gate and security
judgments on novel problems are where open weights lag most. This is why
HLE is a primary instrument for those seats rather than a tiebreaker.

### Frontier comparison rule

Every roster decision brief must place the candidate against the current
frontier anchors on the primary instrument: Anthropic (Opus 5 / Fable 5) and
OpenAI (GPT-5.6 Sol / GPT-5.5), at published price. The question is never
"is this open-weight model good" but "what quality-per-dollar fraction of
frontier does it deliver on Terminal-Bench 2.1". Example from current data:
GLM-5.3 at 86.5% TB 2.1 vs Opus 5 at 89.1% — a 2.6-point gap for roughly
1/8th the output price is the trade the roster exists to exploit.

## Reviewer escalation ladder (concrete, deterministic)

Reviewer seats run flash-first and climb on triggers. Thresholds live in
workflow config, are recorded per run with a reason code, and a diff never
silently skips a level.

**Host-mode scope (dated 2026-09-07 example):** this ladder
assumes an OpenRouter-mode host (opencode 0.1, pi 0.2) where cross-model
review is available. Inside subscription-mode hosts (Codex 0.3, Claude Code
0.4 under the current ROADMAP) there is no cross-model OpenRouter reviewer; the ladder degrades to
the ROADMAP-specified substitute — cross agent fresh subagent review
(e.g. Sonnet writes, Opus reviews) — with the family-diversity intent
preserved as fresh-context diversity. The manifest and doctor report the
degraded tiering honestly. Seats are opinionated defaults; the human
directs and can override per PRODUCT ("init asks and flags override").

The host order in this paragraph is illustrative and follows the active ROADMAP;
it is not an additional architecture decision. ADR-007 governs the unavailable
cross-family fallback and its human receipt.

| Level | Seat | Escalation triggers | Notes |
|---|---|---|---|
| L0 | **glm-5.3-flash** | always runs first | default reviewer; ~$0.075/$0.25 while promo lasts |
| L1 | **deepseek-v4-pro-0813** | failing test; diff touches auth/crypto/secrets/data-persistence/permission paths; complexity delta in a changed function; new cross-module coupling | cheapest pro; fine for same-family rechecks of the deepseek implementer. Line-count triggers **rejected** (gameable, no signal) |
| L2 | **glm-5.3** | security-scoped or architecture-scoped diff; L0/L1 disagreement | same vendor as L0 — cannot give final approval on GLM-family diffs |
| L3 | **qwen3.8-2.4t-a95b** | two consecutive rework cycles failed; change touches the harness/orchestration itself | third family; deep context |
| L4 | **kimi-k3** | L3 disagreement; image/screenshot input required | frontier reasoning + multimodal, most expensive — last resort |

**Family rule (relational, applies to every rung):** "family" = vendor
(Z.AI, DeepSeek, Alibaba, Moonshot). Final approval comes from the lowest
ladder rung whose vendor differs from the maker's vendor. L0 (glm-5.3-flash)
and L2 (glm-5.3) are the SAME vendor, so a GLM-family diff approved only at
L0/L2 violates this rule and must climb to L1 or L3. This replaces the
earlier hard-coded "implementer is deepseek" wording (GLM-5.3 and
Qwen3.8-2.4T second-pass reviews, 2026-09-07: the hard-coded rule made the
cheapest-first ladder illusory and let GLM flagship reviewers bless their
own family's flash output).

### Trigger determinism (phased per ROADMAP v0.1.0)

At 0.1.0, `weavelog check` ships tests/lint/typecheck/semgrep/secrets/
frontmatter/manifest gates only. The L1 triggers implementable there:

| Trigger | Mechanism at 0.1.0 |
|---|---|
| Failing tests | existing check gate |
| Protected-path touch (auth/crypto/secrets/data-persistence/permission) | glob match — plain path matching, no AST |
| Retry-failure count | run ledger |
| Complexity / coupling deltas | **deferred** — requires AST analysis beyond the 0.1.0 gate set; post-0.1.0 check-gate extension |

The risk-signal set is the three implementable triggers, never self-report
or LLM judgment. The detector must operate on the merged diff against base —
this is a Phase-2 acceptance test (TASK-75).

Plan review uses the same ladder with architecture-scoped diffs starting at
L2. Escalation events are logged (level, trigger, reason code) so the ladder
itself can be tuned against TASK-47 telemetry later.

### Drift cadence (revised 2026-09-07, human decision: quarterly too slow)

| Cadence event | Rule |
|---|---|
| Weekly — pricing/deal sweep | diff live OpenRouter `/api/v1/models` against pinned snapshot; fails on ≥10% price delta on any roster model, new slug in a monitored family (z-ai, deepseek, qwen, moonshotai), or removed/renamed roster slug |
| Weekly — bounded auto-select | sweep MAY auto-apply only pre-approved reversible selections: cheaper provider route for the same slug (deal capture); tier-bounded swaps already covered by the ladder. Ledger-logged with reason codes |
| Human decision brief (blocking) | structural changes — new model, seat remapping, roster entry/exit, HLE/TB evidence revision — mark the roster stale until the human acknowledges. Machine never selects across tiers or admits a model unilaterally |
| Monthly — deep refresh | full benchmark re-evaluation (replaces the former quarterly protocol in model-routing.md); produces the decision brief for the next roster revision |

**Milestone phasing (ROADMAP alignment):** at v0.1.0 the sweep runs
on-demand (`stack-check` / `doctor`; `config-sync` materializes via
`weavelog sync`, a 0.1.0 deliverable). Scheduling via LaunchAgent is
EXPLICITLY OUT of v0.1.0 per ROADMAP; the weekly/monthly cadence is the
policy target, not a 0.1.0 deliverable.

## Consequences

**Easier:**

- Seat choices become auditable — every assignment traces to a primary
  instrument, a corroborator, and a cost.
- Reviewer selection is deterministic; per-agent model fields may name only
  L0–L4 seats.
- Model-price changes surface automatically instead of via accidental
  bill shock.
- Frontier comparison is systematic: every decision brief measures
  quality-per-dollar against Opus 5 / GPT-5.6-class anchors, not vibes.

**Harder:**

- Benchmark version discipline: bare "SWE-bench" or "Terminal-Bench" is
  ambiguous and rejected; notes must cite TB 2.1 and SWE-bench Pro
  explicitly.
- Pricing figures expire: anything older than 30 days is stale and must be
  re-pulled (OpenRouter snapshot is the source of truth; vendor cards are
  verification cross-checks only).
- HLE protocol pinning: closed-book knowledge exams are demoted;
  HLE-with-tools requires naming the evaluation protocol on every citation.
- The subscription-mode degradation (v0.3+) means two ladder variants must
  be documented and doctor-reported honestly.
- Structural roster changes now block on a human brief — cost of the HITL
  guarantee (intended, per NORTH_STAR).
- Living-document split: this ADR records policy only; the weekly script
  updates snapshots/briefs, never the ADR. Material changes amend via dated
  addenda (append-only audit trail, NORTH_STAR: evidence over claims).

## Alternatives considered (provenance)

| Option | Verdict | Why rejected |
|---|---|---|
| Single primary instrument (Terminal-Bench only) | rejected | conflates the product's agent loop with every seat's evaluation need; replaced by the seat-weighted composite after DeepSeek V4 Pro review (2026-09-07) |
| BenchLM agentic composite as primary | rejected | weights (30/25/25 browsing/computer-use heavy) do not match a coding-harness product; kept as watch-list |
| Pure price-per-benchmark-point ranking | rejected | ignores tool-call reliability and family diversity, which drive retry cost; folded into corroborator 2 and the ladder's family rule |
| Keeping SWE-bench Verified as primary | rejected | contamination concerns and upstream deprecation recommendation; Pro replaces it |
| Seat-weighted composite (this ADR) | chosen | matches each seat's actual work; validated by four-family review |

## Alignment (NORTH_STAR / PRODUCT / ROADMAP traceability)

| ADR decision | Anchor |
|---|---|
| Open-weight roster, multi-vendor (Z.AI/DeepSeek/Alibaba/Moonshot) | NORTH_STAR: maximize cost/quality through open-weights; no single-vendor lock-in (out-of-scope list) |
| OpenRouter as routing surface until 0.2.0+ | ROADMAP host ladder: opencode 0.1 → pi 0.2; aggregation is not model-vendor lock-in |
| L0–L4 cross-model ladder | NORTH_STAR: QA maker/checker split; host-composed (opencode 0.1, pi 0.2) |
| Subscription-host degradation | ROADMAP v0.3 non-negotiable constraint; doctor reports degraded tiering honestly |
| Opinionated seats, human override | PRODUCT: opinionated not generic; "init asks and flags override"; human directs and verifies |
| Phase-2 = opencode only (0.1.0) | ROADMAP v0.1.0 scope; pi config deferred to v0.2 deliverables |
| Weekly/monthly drift cadence | NORTH_STAR: zero silent failure, evidence over claims; scheduling itself lands post-0.1.0 per ROADMAP explicit-out |
| Escalation triggers via deterministic gates | NORTH_STAR: TDD + deterministic tool validation; ROADMAP v0.1.0 check-gate set |

## Addendum 2026-09-11

ADR-007 supersedes the host-mode wording above. Cross-family review is a
separate capability, not the definition of independent maker/checker review.
When a requested full review cannot obtain another family, the system reports
the limitation and requires an explicit human-selected alternative; it does
not silently call a same-provider fallback full cross-family review.

ADR-007 ratification changed this record's frontmatter, Status section, and index
entry together to `superseded`. ADR-007 is the successor for the changed host-mode
reviewer decision and carries the retained policies forward by reference.

## Addendum 2026-09-14

Records a roster-list addition, not a decision change. `deepseek/deepseek-v4.1-flash`
enters the machine-readable `models` roster and takes the `small_model` manual A/B
slot (human override recorded 2026-09-11). It receives **no seat**: the worker seats
(`implementer`, `scout`) and the escalation ladder are unchanged. Seat eligibility
still waits on Terminal-Bench 2.1, SWE-bench Pro, and HLE-with-tools scores under the
carried-forward benchmark governance. Provenance:
`docs/research/2026-09-11-deepseek-v4.1-flash-evaluation-hold.md`; applied via TASK-3.
The reviewer-fallback supersession by ADR-007 is unaffected.

