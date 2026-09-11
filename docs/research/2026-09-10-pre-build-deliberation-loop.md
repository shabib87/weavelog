---
date: 2026-09-10
topic: Pre-build deliberation loop — peer practice Sept 2026, red-blue-white protocol, and the ADR-006 amendment
status: open
sources:
  - "TASK-79"
  - "docs/adr/0003-three-phase-loop-model.md"
  - "docs/adr/0006-tiered-loop-commands.md"
  - "docs/trd/loop-factory.md"
  - "docs/research/2026-09-07-loop-taxonomy-research.md"
  - "docs/research/2026-08-16-primitive-selection.md"
  - "docs/research/2026-08-16-model-tiered-agents.md"
  - "docs/research/2026-09-02-oss-agent-harnesses.md"
  - "docs/AGENTS.md"
  - "https://www.mitsubishielectric.com/en/pr/2026/0120 (2026-01-20, adversarial multi-agent debate)"
  - "https://smartscope.blog/codex-plan-mode-guide (2026-01-28)"
  - "https://deepakness.com/raw/plan-mode-in-codex-cli (2026-02-01, Codex CLI v0.93.0 /plan)"
  - "https://blog.fsck.com/agent-blog/2026/02/12/superpowers-v4-3-0 (2026-02-12, EnterPlanMode intercept)"
  - "https://developers.openai.com/blog/run-long-horizon-tasks-with-codex (2026-02-23)"
  - "https://claude.com/blog/code-review (2026-03-09, Anthropic multi-agent code review)"
  - "https://thenewstack.io/multi-agent-code-review (2026-03-09)"
  - "https://blog.openreplay.com/vs-code-planning-mode (2026-03-23)"
  - "https://ai.plainenglish.io/inside-claude-code-when-to-use-plan-mode (2026-03-31)"
  - "https://github.com/kaushikgopal/agent-kombat (2026-04-26, planning-debate CLI)"
  - "https://reopt.com/claude-code-plan-mode-handbook (2026-05-05)"
  - "https://github.com/ramannanda9/agent-harness (2026-05-11, request_plan_approval)"
  - "https://hiddedesmet.com/speckit-vs-openspec (2026-05-21)"
  - "https://heym.run/blog/ai-code-review (2026-06-01, reviewer + challenger agents)"
  - "https://github.com/obra/superpowers/issues/1667 (2026-06-01, plan-mode vs skill interference)"
  - "https://codemyspec.com/blog/github-spec-kit-guide (2026-06-03, lean path)"
  - "https://explainx.ai/codex-slash-command-reference (2026-06-11)"
  - "https://medium.com/google-cloud/the-antigravity-loop (2026-07-10, /grill-me; Planning vs Fast Mode)"
  - "https://alphaxiv.org/abs/2607.11399 (2026-07-13, harness-native routing)"
  - "https://agentpatterns.ai/token-engineering/cost-aware-agent-design/ (2026-07-17, complexity-to-tier routing)"
  - "https://github.com/robertoecf/adversarial-review (v0.9.4, routing policy dated 2026-07-23)"
  - "https://arxiv.org/abs/2607.26212 (2026-07-28, multi-agent debate survey)"
  - "https://arxiv.org/html/2607.00038 (2026-07, interview skill, one question at a time)"
  - "https://arxiv.org/html/2608.18167 (2026-08, adversarial review protocol; false consensus)"
  - "https://arxiv.org/abs/2608.00832 (2026-08-01, AdvPlan-Bench adversarial plan evaluation)"
  - "https://github.com/deghosal-2026/adversarial-debate (v0.1.0, 2026-08, isolated dual reviewers)"
  - "https://usingclaude.com/plan-mode-guide (2026-08-09)"
  - "https://github.github.io/spec-kit/ (docs dated 2026-08-21; /speckit.clarify formerly /quizme)"
  - "https://towardsdatascience.com/optimizing-llm-inference-costs (2026-09-10, planning-vs-execution tier)"
  - "https://icml.cc/virtual/2026/68040 (ICML 2026, AgentRouter step-level routing)"
  - "https://devin.ai/blog/windsurf-wave-10 (2025-06-10, PRE-2026; megaplan keyword escalation)"
  - "https://ampcode.com/news/oracle (2025-07-04, PRE-2026; on-demand cross-family oracle)"
  - "https://www.cursor.com/changelog (2.1 2025-11-21, 2.2 2025-12-10, PRE-2026)"
  - "https://mariozechner.at/posts/2025-11-30-no-plan-mode (2025-11-30, PRE-2026)"
  - "https://github.com/obra/superpowers (brainstorming skill chain, ~2025-10, PRE-2026; still referenced 2026-02-12)"
  - "code.claude.com (live docs, permission modes + best practices)"
  - "developers.openai.com/codex/cli/reference.md (live docs)"
  - "docs.github.com/copilot + learn.microsoft.com (live docs, Plan agent)"
  - "github.github.io/spec-kit + Fission-AI/OpenSpec (live docs)"
  - "opencode.ai/docs/agents (live docs, built-in Plan primary agent)"
  - "antigravity.google/docs (live docs, Planning vs Fast Mode, artifact-review)"
  - "docs.devin.ai/desktop/cascade/modes (live docs)"
  - "geminicli.com/docs/cli/plan-mode (live docs, default-on)"
  - "github.com/zaxbysauce/opencode-swarm/blob/main/docs/planning.md (undated, SMALL/MEDIUM/LARGE sizing)"
  - "github.com/hiadrianchen/challenge-plans (undated 2026-era, cross-family objection gating; fast/standard/deep)"
  - "github.com/chpomob/adversarial-plan (undated, two-role spec-to-plan-to-challenge)"
  - "MakerChecker.ai + CIO.com (undated, four-eyes framing)"
  - "Mason 1969 / Cosier 1976 / banking maker-checker / DoD red team (PRE-2026, historical context only, not re-verified)"
models_used_for_research:
  - "openrouter/z-ai/glm-5.3-flash (conductor: synthesis + writing)"
  - "researcher subagent R1 (engine: Tavily, 3 rounds, start_date >= 2026-01-01)"
  - "researcher subagent R2 (engine: built-in websearch, 3 rounds; deviation: first 2 of 6 calls accidentally ran on Tavily — disclosed, engine-distinctness preserved from round 2)"
  - "plan-gate-deepseek (design-fork review, APPROVE with binding constraints)"
  - "plan-gate-qwen (design-fork review, FIX-FIRST — 3 blockers, all resolved in this session)"
supersedes: none
---

# Pre-build deliberation loop: peer practice (Sept 2026) and the red-blue-white protocol

**Question:** the pre-build thinking work — planning, research, and adversarial
back-and-forth between maker and checker agents of different model families, with the
human as referee — has no name or protocol in ADR-006. Do peer harnesses name, tier,
and invoke this phase as of September 2026, and is the adversarial cross-family form
established practice or open territory?

**Method:** two researcher subagents, engine-distinct (R1 Tavily, R2 built-in websearch),
3 rounds each, time-ranged (start_date >= 2026-01-01, trailing-90-day priority
2026-06-07..2026-09-10). Every external claim below is dated and source-attributed in
the frontmatter source list. Deviations: R2's first 2 of 6 searches accidentally ran on
Tavily (disclosed; rounds 2-3 used websearch only). The DESIGN FORK and reviewer
verdicts that consumed this note are recorded on TASK-79 (2026-09-10).

## Findings

### 1. Naming and invoking the thinking phase is established (Sept 2026)

- "Plan mode" is the convergent universal name: Claude Code (plan permission mode +
  `/plan` prefix, live docs; corroborated 2026-05-05, 2026-08-09), Codex (`/plan`, CLI
  v0.93.0 2026-02-01; app/IDE 2026-02-23), Cursor Plan Mode (clarifying questions in
  2.1, 2025-11-21), Copilot Plan agent (live docs), Windsurf/Devin Cascade Plan mode
  (2025-06-10, PRE-2026) with `megaplan` keyword escalation, Antigravity Planning vs
  Fast Mode (live docs; community-observed auto-gating 2026-07-10), Gemini CLI Plan Mode
  default-on (live docs), opencode built-in Plan primary agent (live docs).
- Spec pipelines ship the phase as commands instead of modes: spec-kit
  `/speckit.specify -> clarify -> plan` (clarify = 5-question Socratic interview,
  renamed from `/quizme`; docs dated 2026-08-21), OpenSpec `/opsx:explore` ("thinking
  partner", 2026-05-21), GSD `/gsd:discuss-phase` (2026-03-11), opencode-swarm
  `/swarm clarify` (undated).
- Interview/brainstorm naming: Superpowers brainstorming -> writing-plans skill chain
  (~2025-10, PRE-2026) deliberately replaces built-in plan mode via an `EnterPlanMode`
  intercept (2026-02-12); Antigravity `/grill-me` structured interview -> executable
  spec (2026-07-10); arXiv 2607.00038 (2026-07) "interview" skill, one question at a
  time.
- Anti-precedent: pi ships "No plan mode" by design — file-based PLAN.md (2025-11-30,
  PRE-2026). Backlog.md ships no command — three review checkpoints with the plan
  stored per-task via CLI.

### 2. Tiering the thinking phase is established — "not all work needs extensive planning" is normative

- Claude Code official: "Plan mode adds overhead... If you could describe the diff in
  one sentence, skip the plan" (live docs).
- spec-kit: documented shorter path (5 commands) vs full path (9 commands, quality
  gates for production features) (docs dated 2026-08-21; lean path confirmed
  2026-06-03).
- OpenSpec: "when in doubt explore; already know what you want? skip straight to
  propose" (live docs).
- Devin: keyword-gated deeper planning — `megaplan` forces clarifying questions, auto-
  exit to Code when ready (2025-06-10, PRE-2026; live docs).
- Amp oracle: on-demand only — "intentionally do not force... higher costs"
  (2025-07-04, PRE-2026; live manual). The nearest mainstream cross-family on-demand
  precedent.
- agent-harness (2026-05-11): simple/complex auto-classification with one cheap call +
  HITL `request_plan_approval` gate.
- opencode-swarm: SMALL/MEDIUM/LARGE sizing with split-before-plan rules (undated).
- Complexity-to-model-tier routing is heavily published 2026 practice (AgentRouter,
  ICML 2026; cost-aware agent design 2026-07-17; 2026-09-10 TDS).

### 3. Cross-family adversarial pre-build deliberation: NOT first-party mainstream — greenfield

Third-party niche, all 2026-dated:

- agent-kombat (2026-04-26): structured planning debate between Claude Code and Codex,
  judge verdict, bounded rounds + replay.
- challenge-plans (undated 2026-era): cross-family adversarial plan review — an
  objection hard-gates only if an INDEPENDENT model family reproduces it; profiles
  `fast | standard | deep` (its own deliberation tiering); 7 documented multi-agent
  failure modes including false consensus.
- adversarial-debate v0.1.0 (2026-08): isolated dual reviewers, delayed revelation,
  dissent preservation; field-tested on 70 PRs.
- adversarial-review v0.9.4 (2026-07-23): `/adversarial-review:adversarial-plan-review`
  — "the partner reviews, never the host," cross-host across Claude/Codex/Pi/Grok.
- Academic: arXiv 2608.18167 (2026-08) formalizes reviewer-critic disagreement and the
  false-consensus failure; AdvPlan-Bench (2026-08-01) benchmarks adversarial plan
  evaluation; Mitsubishi Electric (2026-01-20) industrial adversarial argumentation;
  arXiv 2607.26212 (2026-07-28) MAD survey.
- Anthropic Code Review (2026-03-09): multi-agent parallel review mixing model families
  — but POST-build only, never on plans.
- Four-eyes framing (MakerChecker.ai + CIO.com, undated vendor sources): four-eyes
  means "a second named PERSON signs, not a second model." Mapping to weavelog: the
  human signer at the plan gate is the four-eyes authority; cross-family models are
  draft-level checkers whose dissents are evidence, never approvals.
- Historical context only (PRE-2026, not re-verified this session): devil's advocacy
  (Mason 1969), dialectical inquiry (Cosier 1976), banking maker-checker, DoD red team
  review. The 2026 third-party tools independently reinvent these shapes.

### 4. Naming hazards

- `plan` is claimed by ~10 harnesses — maximal collision. Also in use: `explore`,
  `clarify`, `brainstorm`, `interview`, `grill-me`, `debate`, `oracle`,
  `megaplan`/`ultraplan`/`masterplan`.
- Documented churn: spec-kit `/quizme` -> `/speckit.clarify`; OpenSpec `/openspec:` ->
  `/opsx:` migration; Antigravity removed legacy `/planning` and `/fast`; opencode
  deprecated `mode` for `agent`. Superpowers issue #1667 (2026-06-01) documents
  built-in plan mode interfering with skill-based brainstorm flows.
- ADR-006's existing namespace rule stands: loom vocabulary, zero name adoption
  (weavelog-native only), TASK-57-style availability check if a CLI verb is ever added.

## Mapping to weavelog

- The gap is real but is a NAMING + SPECIFICATION gap, not a build-from-zero gap: the
  cross-family adversarial mechanism already ships post-build (`reviewer-loop.ts` with
  bounded rounds + `--budget-usd`; plan-gate/diff-reviewer agents across four model
  families). What is missing is (a) a named pre-build deliberation loop, (b) the
  red-blue-white role protocol made explicit, (c) the light/full tier contract with
  pulse's default.
- "Not all work needs the extensive back-and-forth" (the human's framing) matches
  established peer practice exactly (finding 2): small work takes the light path, big
  work takes the full deliberation loop, tier chosen by the human.
- A fifth top-level loop command was rejected by both cross-family plan-gate reviewers
  (2026-09-10, verdicts on TASK-79): it would add a de-facto third gate in WHAT
  (violates ADR-003:48 "WHAT uses continuous dialogue, not a gate"), re-characterize
  human-inside collaborative work as a delegated hand-off (violates ADR-006's "one
  command per hand-off actually delegated"), and require a complexity-gated tier-fit
  that is unimplementable pre-build (the deterministic tier-fit checker computes on the
  merged diff, which does not exist yet; LLM-judged tiers violate ADR-004).
- Correct positioning (qwen amendment): "first-party naming of a mechanism weavelog
  already ships post-build, extended pre-build" — not "first to do adversarial review."
- Tier enforcement pre-build is review-based (maker/checker), never machine-claimed:
  the deterministic budget ladder (TASK-6 machinery) bounds spend; the tier-fit checker
  stays a post-build surface. No doc may claim machine enforcement it does not deliver
  (docs/AGENTS.md).

## Decision gate (ADR-003)

Did this research produce a hard-to-reverse choice?

**Yes** — naming a first-class pre-build deliberation loop (red-blue-white protocol,
light/full tiers, pulse default) fixes the loop surface and the adversarial protocol.
Recorded as an in-place amendment to ADR-006, which is in-review (in-review ADRs
revise in place per `docs/adr/README.md` — no new ADR number). Name candidate: **warp**
(thread preparation before weaving; semantically upstream of weave; no new CLI verb,
so zero collision surface) — final name pending human ratification.

**Lessons:** the ecosystem named and tiered this phase in 2025-2026, but the
cross-family adversarial form stayed a third-party niche — the convergence layer
(names, tiers) is established while the verification protocol (independent-family
attack passes with a human referee) remains unclaimed by any first-party harness.

**Amends:** extends `docs/research/2026-09-07-loop-taxonomy-research.md` (loop surface)
and ADR-006 (in-review) with the pre-build half.