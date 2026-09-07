---
date: 2026-09-07
topic: Model-selection benchmark policy (open-weight roster vs frontier)
status: in-review
type: adr
author: conductor
related_to:
  - ./README.md
  - ../../NORTH_STAR.md
  - ../../PRODUCT.md
  - ../../ROADMAP.md
  - ../../research/2026-09-07-flagship-tier-pricing-quality-preliminary.md
sources:
  - "TASK-61"
---

# Model-Selection Benchmark Policy (Open-Weight Roster vs Frontier)

## Status

in-review (2026-09-07) — TASK-61 evidence base closed; human sign-off gates
the merge (HITL). Traces to NORTH_STAR non-negotiables and the ROADMAP
milestone ladder (see Alignment below); amendable only via dated addenda
(living-document split, Consequences).

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

Model selection uses a **seat-weighted composite**: different seats have
primary instruments matched to what the seat actually does. A seat
assignment is defensible only when the seat's primary instrument plus at
least one corroborating instrument support it at the stated cost. (Revised
2026-09-07 after independent DeepSeek V4 Pro review: a single primary
instrument conflates "the product is an agent loop" with "every seat needs
agent-loop benchmarks" — reviewers, plan-gate, and security seats reason
*about* code rather than operate inside a terminal.)

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

- **HumanEval, LiveCodeBench** — function-level generation; saturated and
  not agentic.
- **HLE closed-book (no tools)** — answers a different question than
  tool-assisted runs; not comparable to harness operation.
- **Any vendor-reported score used alone** — permitted only with an explicit
  `unverified` tag and a corroborating independent instrument.

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

**Host-mode scope (ROADMAP v0.3 constraint, non-negotiable):** this ladder
assumes an OpenRouter-mode host (opencode 0.1, pi 0.2) where cross-model
review is available. Inside subscription-mode hosts (Claude Code 0.3, Codex
0.4) there is no cross-model OpenRouter reviewer; the ladder degrades to
the ROADMAP-specified substitute — cross agent fresh subagent review
(e.g. Sonnet writes, Opus reviews) — with the family-diversity intent
preserved as fresh-context diversity. The manifest and doctor report the
degraded tiering honestly. Seats are opinionated defaults; the human
directs and can override per PRODUCT ("init asks and flags override").

- **L0 — glm-5.3-flash** (default reviewer, ~$0.075/$0.25 while promo lasts).
- **L1 — deepseek-v4-pro-0813** triggers: any failing test; diff touches
  auth, crypto, secrets, data-persistence, or permission paths; cyclomatic
  complexity increases in a changed function; or new cross-module coupling.
  (Line-count triggers were removed after sweep review: risk-signal triggers
  are the gate; line count was gameable and adds no signal.) Cheapest pro; fine for same-family
  rechecks of the deepseek implementer.
- **L2 — glm-5.3** triggers: security-scoped or architecture-scoped diff,
  or L0/L1 disagreement.
- **L3 — qwen3.8-2.4t-a95b** triggers: two consecutive rework cycles failed,
  or the change touches the harness/orchestration itself.
- **L4 — kimi-k3** triggers: L3 disagreement, or image/screenshot input is
  required for the review.

**Family rule (relational, applies to every rung):** "family" = vendor
(Z.AI, DeepSeek, Alibaba, Moonshot). Final approval comes from the lowest
ladder rung whose vendor differs from the maker's vendor. Note that
L0 (glm-5.3-flash) and L2 (glm-5.3) are the SAME vendor, so a GLM-family
diff approved only at L0/L2 violates this rule and must climb to L1 or L3.
This replaces the earlier hard-coded "implementer is deepseek" wording
(GLM-5.3 and Qwen3.8-2.4T second-pass reviews, 2026-09-07: the hard-coded
rule made the cheapest-first ladder illusory and let GLM flagship reviewers
bless their own family's flash output).

**Trigger determinism (phased per ROADMAP v0.1.0):** at 0.1.0, `weavelog
check` ships tests/lint/typecheck/semgrep/secrets/frontmatter/manifest gates
only. The L1 triggers implementable there are: failing tests (existing
gate), protected-path touches (glob match on auth/crypto/secrets/
data-persistence/permission paths — plain path matching, no AST), and
retry-failure counts from the run ledger. Cyclomatic-complexity and
cross-module-coupling deltas require AST analysis beyond the 0.1.0 gate set
and are deferred to a post-0.1.0 check-gate extension; until then the
risk-signal set is the three implementable triggers, never self-report or
LLM judgment. The detector must operate on the merged diff against base —
this is a Phase-2 acceptance test (TASK-75).

Plan review uses the same ladder with architecture-scoped diffs starting at
L2. Escalation events are logged (level, trigger, reason code) so the ladder
itself can be tuned against TASK-47 telemetry later.

## Consequences

- Benchmark version discipline: notes must cite Terminal-Bench 2.1 and
  SWE-bench Pro explicitly; bare "SWE-bench" or "Terminal-Bench" is
  ambiguous and rejected in review.
- Pricing figures age; any figure older than 30 days is stale and must be
  re-pulled before reuse (OpenRouter `/api/v1/models` snapshot is the
  routing-target source of truth).
- HLE closed-book and knowledge exams without tools are demoted;
  HLE-with-tools is a PRIMARY instrument for plan-gate/security/researcher
  seats under the Artificial Analysis protocol pin. (An earlier draft said
  "demoted to tiebreakers" — corrected after second-pass review.)
- **Provider pin:** OpenRouter is the primary routing target at least until
  weavelog 0.2.0+ (pi host support); pricing snapshots and drift gates run
  against OpenRouter's API, with first-party vendor cards as verification
  cross-checks only.
- **Phase-2 host scope (0.1.0):** config adoption touches the opencode host
  ONLY (`payload/config/opencode.jsonc` + `payload/config/agents/*`). Pi
  host config changes (models.md, settings.json) are deferred to 0.2.0.
- **Living-document split:** ADR-004 records the policy and cadence; the
  weekly script updates the pinned snapshot and generated decision briefs —
  it never edits this ADR. Material policy changes amend the ADR via dated
  addenda, keeping the audit trail append-only (NORTH_STAR: evidence over
  claims).
- **Cadence (revised 2026-09-07, human decision: quarterly is too slow for
  current model-progression pace):**
  - **Weekly — pricing/deal sweep (deterministic):** diff live OpenRouter
    `/api/v1/models` against the pinned snapshot; fails on ≥10% price delta
    on any roster model, new slug in a monitored family (z-ai, deepseek,
    qwen, moonshotai), or removed/renamed roster slug.
  - **Weekly — bounded auto-select:** the sweep MAY auto-apply only
    pre-approved, reversible selections: cheaper provider route for the same
    model slug (deal capture) and tier-bounded swaps already covered by the
    ladder (e.g., a flash model dropping below another flash seat's price
    with equal or better tool-bench evidence). Auto-applied changes append
    to the ledger with reason codes.
  - **Human decision brief (blocking):** structural changes — new model
    adoption, seat remapping, roster entry/exit, HLE/TB evidence revision —
    mark the roster stale until the human acknowledges. The machine never
    selects across tiers or admits a new model unilaterally.
  - **Monthly — deep refresh:** full benchmark re-evaluation (replaces the
    former quarterly protocol in model-routing.md), producing the decision
    brief that feeds the next roster revision.
- **Milestone phasing (ROADMAP alignment):** at v0.1.0 the sweep runs
  on-demand (`stack-check` / `doctor` invocation; `config-sync` materializes
  via `weavelog sync`, a 0.1.0 deliverable). Scheduling via LaunchAgent is
  EXPLICITLY OUT of v0.1.0 per ROADMAP and lands in a later milestone; the
  weekly/monthly cadence is the policy target, not a 0.1.0 deliverable.
- The escalation ladder replaces ad-hoc reviewer model picks; per-agent
  model fields may name only L0–L4 seats.

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

## Alternatives considered (provenance)

- **Single primary instrument (Terminal-Bench only)** — conflates the
  product's agent loop with every seat's evaluation need. Rejected for the
  seat-weighted composite after DeepSeek V4 Pro review (2026-09-07).
- **BenchLM agentic composite as primary** — useful tracker, but its weights
  (30/25/25 browsing/computer-use heavy) do not match a coding-harness
  product. Rejected as primary; kept as a watch-list.
- **Pure price-per-benchmark-point ranking** — ignores tool-call reliability
  and family diversity, which drive retry cost. Rejected; folded into
  corroborator 2 and the ladder's family rule.
- **Keeping SWE-bench Verified as primary** — contamination concerns and
  upstream deprecation recommendation. Rejected; Pro replaces it.
