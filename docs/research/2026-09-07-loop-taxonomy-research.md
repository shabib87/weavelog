---
date: 2026-09-07
topic: Loop taxonomy, tiered conductor routing, and loop command naming for weavelog
status: open
sources:
  - "TASK-79"
  - "TASK-76"
  - "TASK-28"
  - "TASK-29"
  - "TASK-30"
  - "TASK-51"
  - "TASK-6"
  - "TASK-8"
  - "TASK-57"
  - "TASK-58"
  - "TASK-78"
  - "docs/trd/loop-factory.md"
  - "docs/trd/worktree-discipline.md"
  - "docs/trd/tool-boundaries.md"
  - "docs/trd/model-routing.md"
  - "docs/trd/backlog-lifecycle.md"
  - "docs/adr/README.md"
  - "docs/adr/0005-artifact-flow.md"
  - "docs/adr/0007-tiered-loop-commands.md"
  - "docs/NORTH_STAR.md"
  - "docs/research/2026-08-15-addy-loop-engineering-series.md"
  - "docs/research/2026-08-15-loop-primitives-claude-codex-sdk.md"
  - "docs/research/2026-08-15-unified-sequencing.md"
  - "docs/research/2026-08-16-model-tiered-agents.md"
  - "docs/research/2026-08-16-primitive-selection.md"
  - "docs/research/2026-08-16-agentsmd-root-vs-subdirs.md"
  - "docs/research/2026-08-16-agentsmd-hygiene.md"
  - "docs/research/2026-08-16-work-management-layer-selection.md"
  - "docs/research/2026-08-23-agentic-architecture-pattern.md"
  - "docs/research/2026-09-03-budget-caps-checkpoint-resume.md"
  - "docs/research/loop-taxonomy.md (2026-07-04, no frontmatter — pre-schema legacy)"
  - "https://arxiv.org/abs/2607.00038 (2026-06-28)"
  - "https://arxiv.org/html/2607.14890v1 (2026-07, Proof-or-Stop)"
  - "https://arxiv.org/pdf/2607.06273 (2026-07-07, AgentTether)"
  - "https://viralruparel.com/blog/agent-loop-no-progress-detection-guard (2026-08-26)"
  - "https://github.com/NousResearch/hermes-agent/issues/6784 (2026-04-09)"
  - "https://github.com/snarktank/ralph (created 2026-01-07)"
  - "https://datasciencedojo.com/blog/agentic-loops-explained-from-react-to-loop-engineering-2026-guide/ (2026-06-09, 10-type)"
  - "https://github.com/KanakMalpani/Loop-Engineering (undated 2026, 6-level)"
  - "https://agentprotocol.ai/agents-md/ (2026-08-03)"
  - "https://code.claude.com/docs/en/agent-sdk/agent-loop (live, 2026)"
  - "src/tools/risk-signals.ts"
  - "src/hooks/enforce.ts"
  - "https://claude.com/blog/getting-started-with-loops (2026-06-30)"
  - "https://www.linkedin.com/posts/addyosmani_the-four-kinds-of-loops-activity-7502269317582049280-CtvQ (2026-09-06)"
  - "https://addyo.substack.com/p/practical-loop-engineering (2026-08-14)"
  - "https://addyosmani.com/blog/code-agent-orchestra/ (2026-03-26)"
  - "https://developers.openai.com/codex/use-cases/follow-goals (live, 2026)"
  - "https://developers.openai.com/cookbook/examples/codex/using_goals_in_codex (2026-05-09)"
  - "https://code.claude.com/docs/en/scheduled-tasks (live, 2026)"
  - "https://docs.github.com/en/copilot/how-tos/copilot-cli/automate-copilot-cli/schedule-prompts (live, 2026)"
  - "https://arxiv.org/html/2608.21884 (2026-08-22)"
  - "https://www.fortegrp.com/insights/skills-vs-documents-your-agent-is-only-as-good-as-its-last-skill-update (study Feb 2026, page undated)"
  - "https://vercel.com/blog/agents-md-outperforms-skills-in-our-agent-evals (undated 2026)"
  - "https://www.getclaudeskills.com/blog/agent-skills-vs-agents-md (2026-03-31)"
  - "https://ghuntley.com/ralph (2025, PRE-2026)"
models_used_for_research:
  - "openrouter/z-ai/glm-5.3-flash (conductor: synthesis + writing; also P0 scout brief via scout subagent)"
  - "openrouter/z-ai/glm-5.3-flash (R1 researcher subagent, engine: Tavily)"
  - "openrouter/z-ai/glm-5.3-flash (R2 researcher subagent, engine: built-in websearch)"
  - "plan-gate-glm (plan review, FIX-FIRST resolved)"
  - "diff-reviewer-deepseek (draft review, FIX-FIRST — fixes applied)"
  - "diff-reviewer-kimi (draft review, FIX-FIRST — fixes applied)"
  - "plan-gate-deepseek (post-fix confirmation, APPROVE)"
  - "diff-reviewer-glm (round-2 review, FIX-FIRST — fixes applied)"
  - "diff-reviewer-qwen (round-2 review, FIX-FIRST — fixes applied)"
  - "plan-gate-kimi (round-2 post-fix confirmation, APPROVE)"
  - "scout subagent, second pass (P0b: budget/naming/taxonomy prior art)"
  - "researcher subagent, second pass R1b (engine: Tavily)"
  - "researcher subagent, second pass R2b (engine: built-in websearch)"
supersedes: none
---

# Loop taxonomy, tiered conductor routing, and loop command naming

Research per TASK-79. Question: the conductor pattern is baked into always-on user-level
AGENTS.md and forces full orchestration on every task — how should weavelog scale it, where
should loop behavior live, and what should the loop commands be named? Method: P0 internal
corpus sweep (scout), P1 external research on two engines (Tavily + websearch; Exa unavailable
in harness — deviation recorded on TASK-79), P2 synthesis, cross-model review, verify.

**Reconciliation note (TASK-76) — RESOLVED 2026-09-07:** TASK-76 merged to main (commit
1dbe6cd) and this doc was rebased and refactored to the new documentation rules
(`docs/AGENTS.md`): technical docs now live in `docs/trd/`, ADRs in `docs/adr/`
(ADR-003/004/005 ratified 2026-09-07; ADR-006 conductor-dispatch planned), and this doc ends
at the ADR-003 decision gate. `src/tools/risk-signals.ts` (header: TASK-78) and its tests
are on main — §5.2's sequencing gate is gone. Remaining pre-convention debt is in
`docs/research/` only (e.g. `loop-taxonomy.md` lacks schema frontmatter) — documented in
`docs/AGENTS.md`, task pending; not this doc's scope.

---

## 1. Current state (P0, internal — provenance verbatim)

- **Loop model:** three phases (WHY → WHAT → HOW, progress, do not repeat) × two loop roles
  (inner = agent execution cycle; outer = human decision ownership). ONE boundary across all
  phases; the boundary is EVIDENCE. "Do NOT write '3 loops' anywhere" (TASK-15, TASK-22;
  `docs/trd/loop-factory.md` — the two-gates rule is at :63).
- **Operational flow:** `backlog → spec → plan → worktree → validate → [HUMAN GATE: merge
  approval] → merge → done`. No work on main; no work without a backlog task
  (`docs/trd/worktree-discipline.md:19`).
- **Review checkpoints:** (1) spec review — HITL, `spec-approved` label, backed by the
  deterministic claim gate (`src/tools/task-flow.ts claim`, TASK-51); (2) plan review —
  recorded `--plan`; (3) code review — `diff-reviewer-*` verdict. High-stakes work adds
  `plan-gate-*` cross-checks (`docs/trd/worktree-discipline.md:145-154`).
- **ADR status (post-TASK-76):** ADR-003 (three-phase loop model + decision gate) approved;
  ADR-004 (model-selection benchmark policy, L0–L4 reviewer escalation) approved;
  ADR-005 (artifact flow: PRD/TRD/ADR/TASK with AC traceability) approved — §7 aligns to it;
  ADR-006 (conductor-dispatch) planned (`docs/adr/README.md`).
- **Conductor is the always-on session** — there is no `conductor.md` agent; the conductor
  protocol lives in `payload/AGENTS.md` (82 LOC), materialized verbatim to
  `~/.config/opencode/AGENTS.md` by `weavelog sync` (one-way flow, TASK-23/TASK-27, Hook 8/9
  enforcement). Every session of every user project inherits full conductor protocol.
- **Tension flagged by the repo itself:** `docs/research/2026-08-16-model-tiered-agents.md`
  already asks "should conductor ever be GLM, or always kimi?" (unresolved); and
  `docs/NORTH_STAR.md` states "Out of scope: fully unattended autonomous runs. HITL is baked
  in" — which constrains the proactive tier below.
- **Opencode gap:** opencode 1.18.18 ships NO goal/loop/schedule primitives; the plugin SDK is
  the extension point; "CRITICAL GAP: lifecycle-hook expressibility"
  (`docs/research/2026-08-15-loop-primitives-claude-codex-sdk.md`).

## 2. The four-loop taxonomy (external, dated)

Canonical source: Anthropic, "Loop engineering: Getting started with loops"
(2026-06-30), amplified by Addy Osmani, LinkedIn (2026-09-06). A loop = an agent repeating
cycles of work until a stop condition is met. Four rungs, a ladder — each rung hands off one
more thing:

| Rung | You hand off | Trigger | Stop condition | Shipped primitive (Sept 2026) |
|---|---|---|---|---|
| Turn-based | the check | user prompt | agent judges done | agentic loop + verification skills |
| Goal-based | the stop condition | manual prompt | goal met or turn cap | Claude `/goal`; Codex `/goal` |
| Time-based | the trigger | interval | canceled or work completes | Claude `/loop`/`/schedule`; Copilot `/every`/`/after` |
| Proactive | the prompt itself | event/schedule | per-task goal; routine until off | schedules + dynamic workflows + auto mode |

Key discipline from both engines' findings: **"more autonomy isn't the upgrade. The check
is"** (Osmani, 2026-09-06); rungs **nest** ("a proactive routine is a schedule wrapped around
a goal wrapped around a check"); the Claude Code team's own triage rule is "start with the
simplest solution, use patterns selectively — smaller tasks don't need multiple agents or
loops" (claude.com, 2026-06-30); Osmani's 2026-07-25 revision separates **agency** (how far
one agent proceeds) from **orchestration** (how many agents run), with verification cost
bounding delegation (arXiv 2608.21884, 2026-08-22).

**How many loop types — is four right? (human question, 2026-09-07; second-pass findings)**
The 4-rung ladder is the most-cited autonomy taxonomy as of Sept 2026 (Anthropic
2026-06-30; restated by Osmani 2026-09-06) — but it is only ~3 months old and community
agreement traces to one origin cluster (arXiv 2608.21884, 2026-08-22, warns of this). 2026
competing schemes: Osmani's 2-axis agency/orchestration split (2026-07-25); a 6-level
cognitive-depth ladder (single-step → recursive-meta, KanakMalpani, undated 2026); a 10-type
scheme (ReAct → loop engineering, datasciencedojo 2026-06-09); the L1–L5 verification ladder
and named terminal states (arXiv 2607.00038, 2026-06-28) as an orthogonal axis. Verdict:
**the count of commands should follow the count of hand-offs we actually delegate, not a
sacred number.** Four commands survive because each maps to one real hand-off (check /
stop-condition / queued-stop-condition / trigger); strictly, `loom` and `pulse` compose
rungs rather than sitting cleanly on one (nested goal-loops; a trigger hand-off bordering
proactive, held at the gates) — the mapping is by *primary* hand-off, and the
agency/orchestration 2-axis split is the model that resolves the residual tension (§7 ADR
item). Voss's 4-scope taxonomy (execution/task/
product/system) is the orthogonal scope axis. The repo already recorded the four rungs on
2026-08-15 (`2026-08-15-addy-loop-engineering-series.md:20`), so §2 codifies in-repo prior
art as much as external research. Deeper 2-axis split flagged for the §7 ADR.

## 3. Peer practice, Sept 2026 (external)

- **Command surface shipped:** Claude Code `/loop` (bundled skill, v2.1.71+, session-scoped,
  7-day expiry, cron-backed, kill-switch env) / `/goal` (v2.1.139, evaluator-model Stop hook,
  MET/NOT-YET-MET/IMPOSSIBLE) / `/schedule` (cloud, 1h min) / `/workflows` (research preview,
  spawns tens-to-hundreds of subagents) / `/checkup` (AGENTS.md/CLAUDE.md hygiene command,
  2026-07-09). Codex `/goal` (GA 2026-05-21, thread-scoped server-side state: pursuing/paused/
  achieved/unmet/budget_limited, soft-stop budgets) + Automations (`.codex/automations/*.toml`).
  Copilot CLI `/every` + `/after` (experimental, 2026-06-02). Gemini CLI: no `/loop` shipped
  (open issue #22653); successor Antigravity CLI orchestrates background agents (2026-05-19).
  Cursor Automations + `/multitask` (2026-04-24) + event-subscribed cloud agents (2026-08-19).
  OpenCode: none shipped (issues #7345, #10262 open). Amp: Deep mode + Puck meta-agent
  (2026-07-20). All findings dated in the SOURCES section of the research notes (R1/R2).
- **Tiering practice:** Osmani's three-tier tool landscape (2026-03-26): Tier 1 interactive
  single agents; Tier 2 local parallel orchestration (3–10 agents; Vibe Kanban, Gas Town,
  Claude Squad); Tier 3 unattended/overnight drains (Ralph loops). Ralph pattern
  (`ghuntley.com/ralph`, 2025 [PRE-2026], packaged by Anthropic as the official ralph-wiggum
  plugin): fresh context per iteration, state in files/git, kill-and-reassign after 3+ stuck
  iterations, PR-before-merge. **Tier cost/quality trade:** Anthropic's multi-agent research
  system (2025, [PRE-2026]) measured 90.2% improvement over single-agent at ~15× tokens, and
  the MAST study (arXiv 2503.13657, 2025-03, [PRE-2026]) puts coordination failures at
  36.9% — historical context, corroborated in 2026 by arXiv 2608.21884 (2026-08-22) adoption
  analysis and productionnotes.dev's A/B test (2026-08-09: multi-agent ≈1.6× wall time,
  ~3.9× tool calls on non-branching triage). The repo's own reading records the same lesson
  (`docs/research/2026-08-16-model-tiered-agents.md`: reviewer must differ by vendor family;
  escalation over retry).
- **Budgets, watchdogs, break points (second pass, R1b/R2b, 2026):** Agent SDK `max_turns` /
  `max_budget_usd` default to **NO limit** and fire only after breach (code.claude.com agent
  SDK docs, live 2026) — caps are opt-in everywhere. Codex: remaining-budget reminders before
  cap (v0.142.0), `budget_limited` soft stop, resumable `blocked`/`usageLimited` states with
  a 3-attempt rule before `blocked` may be set (PR #23094, ~2026-05), per-goal token-budget
  validation (PR #37878) — and no durable waiting state (open request, issue #28144). Claude
  `/loop`: 7-day hard expiry, 50-task session cap, `loop.md` 25 KB cap, fallback wakeup
  ~20 min ends an unrescheduled loop (live docs, 2026). **No-progress detection** exists as
  pattern + shipped detectors: fingerprint (tool, args, result-digest) repeats → nudge →
  remove tool → structured stop (viralruparel, 2026-08-26); hermes-agent ships
  `generic_repeat` / `poll_no_progress` / `ping_pong` (2026-04-09). The arXiv loop-spec
  anatomy makes a budget ceiling + no-progress detector part of the standard anatomy
  (2607.00038, 2026-06-28); Proof-or-Stop finds verification loops ~2× cost/latency
  (2607.14890, 2026-07) — honest overhead to plan for. **Absences (findings, not gaps in
  this doc):** no default **per-run/per-task** wallclock budget ships in any major harness
  (Claude `/loop`'s 7-day expiry and ~20-min fallback wakeup bound session lifetime, not
  task spend); no-progress detection ships in OSS agent frameworks (hermes-agent; default-on
  status unverified) but not in the major harness products; Ralph-style loops depend on a
  user-written stuck protocol ("commit, output STUCK" — stevekinney, undated 2026).
- **Wrong-tier detection (second pass): largely ABSENT as a shipped feature** — no major
  harness detects "this task outgrew its tier." Emerging patterns only: a 4-step ladder
  (normal → retry-with-context → model-upgrade → escalate-to-human) and a tier-walking state
  machine (`RETRY_SAME_TIER` / `ESCALATE` / `END_CYCLE` / `EXHAUSTED`) with failure-class
  budgets — transport failures retry same tier, competence failures escalate immediately
  (indie orchestrator implementations, undated 2026); AgentTether's intent-drift scoring
  operates within one run, not across loop types (arXiv 2607.06273, 2026-07-07); Anthropic's
  guide frames escalation as a human upgrade path, not automatic (2026-07-07 secondary).
  A tier-fit checker is therefore greenfield — §5.2 designs it from the repo's own
  deterministic trigger philosophy (§1, ADR-004) rather than copied behavior.
- **Loop-definition standards (second pass): no ratified standard exists.** AGENTS.md is a
  convention with no schema (agentprotocol.ai, 2026-08-03), stewarded alongside MCP by the
  Agentic AI Foundation (Linux Foundation; Anthropic/Block/OpenAI co-founded); agentskills.io
  covers skills, not loops; MCP/A2A/ACP are transport/interop layers. De facto anatomy =
  arXiv 2607.00038 (trigger, goal, verification, stopping rule, memory + budget ceiling +
  no-progress detector); conventions in the wild are per-project files (`loop.md`,
  Codex `goals/*.md` + `config.toml [goals]`, `prd.json`/`progress.txt` in snarktank/ralph,
  created 2026-01-07). arXiv 2608.21884 mining: loop configs are committed in only a tiny
  fraction of repos — **committed, file-based loop definitions are themselves a
  differentiator**; weavelog's skill files + budget tuple (§5.1) are exactly that.
- **Where loop behavior lives:** thin always-on context is now evidence-backed — ETH Zurich
  AGENTbench (Feb 2026; reported via fortegrp.com, page undated [UNDATED carrier, study
  dated]) found AGENTS.md files often *decrease* pass rates (attention dilution);
  practical budgets: 60–100 lines (HumanLayer/Dometrain guidance, undated 2026 [UNDATED]),
  ~800 tokens (Codex guide, 2026-04-28), root file 200–400 lines with agents skipping
  beyond ~400 (terminalblog, 2026-07-13). Counter-evidence: Vercel evals [UNDATED 2026] —
  AGENTS.md outperforms skills
  for broad always-relevant framework knowledge; skills win for triggered vertical workflows;
  "the two approaches complement each other". Convergence: commands and skills merged —
  `user-invocable: true` skills appear as `/commands` and take precedence (Claude Code);
  recommended architecture is thin commands that delegate to skills. Enforcement belongs in
  hooks, not prose ("instruction files are context, not enforced configuration" — Claude Code
  docs). Namespacing collisions are real and documented (Claude Code issues on plugin skills
  shadowing built-ins, 2026-05-26; custom `run.md` hijacking `/loop`, issue #54633).

## 4. Mapping to weavelog: gap analysis

1. **Conductor-always-on vs tiered routing.** The taxonomy's ladder is autonomy-per-task;
   weavelog today has exactly one rung wired into every session via `payload/AGENTS.md`.
   The fix is not removing the conductor but **routing**: the always-on layer should carry a
   minimal contract (backlog rule, one-question rule, communication rule, HITL gate rule) and
   delegate loop behavior to on-demand skills. This matches the repo's own load-model taxonomy
   (`docs/research/2026-08-16-primitive-selection.md`: AGENTS.md = always-on deterministic;
   skills = on-demand probabilistic; hooks = deterministic enforcement) and TASK-28/29/30
   (two-level CLI scope, portable config, project scaffolding — already tracked).
2. **The "3 loops" rule is compatible with the four-loop ladder.** Loop-factory's "phases
   progress, loops repeat" is a statement about workflow stages; the four rungs are execution
   autonomy levels inside HOW (and inside WHY/WHAT as research/spec loops). The ladder does
   not contradict the canonical model — but nothing in the repo maps the rungs to weavelog
   flows yet. This doc proposes that mapping (§5).
3. **Two "four loops" taxonomies coexist in the repo — different axes, both valid.**
   `docs/research/loop-taxonomy.md` (2026-07-04, Laurie Voss) classifies loops by SCOPE
   (execution / task / product / system) and maps them to weavelog v1 (the task loop IS v1).
   The ladder in §2 classifies loops by AUTONOMY (turn/goal/time/proactive — how much the
   human hands off per loop). They compose: the `weave`/`loom` commands in §5 are
   autonomy rungs applied to Voss's task loop. That file predates the research schema
   (no frontmatter, non-ISO filename) — reconciliation candidate for TASK-76.
4. **NORTH_STAR constraint binds the proactive tier.** "Fully unattended autonomous runs"
   are out of scope; HITL is baked in. Therefore weavelog's proactive tier must be a
   **triggered weave, not an autonomous factory**: an event/schedule may START a loop, but
   the loop still pauses at the two HITL gates (spec, merge). Peer harnesses allow unattended
   completion (auto mode); weavelog deliberately does not — that is the differentiator, not a
   gap.
5. **Mechanism gap.** weavelog's gates are already deterministic (claim gate, pre-commit hook,
   enforce.ts) — stronger than peers who rely on prompt discipline. What is missing is the
   *invocable loop layer* (skills/commands that fire CLI triggers) and a verified opencode
   plugin-SDK path for evaluator-style goal loops (the recorded CRITICAL GAP,
   `2026-08-15-loop-primitives-claude-codex-sdk.md`). PRD must verify SDK lifecycle-hook
   expressibility before committing to goal-loop mechanics.
6. **Naming collisions are a first-class hazard.** Documented incidents: plugin skills
   shadowing built-ins; custom command files hijacking `/loop`. Recommendation: distinctive
   verbs for weavelog flows (avoid `/loop` and `/goal` exactly because their semantics
   diverge per harness — Claude session-scoped vs Codex thread-scoped) and one namespace
   (`weavelog <verb>` CLI triggers + skills), with names that do not collide with shipped
   commands in Claude Code, Codex, Copilot, or Cursor.

## 5. Recommended loop command surface (recommended future CLI surface — none of these exist
today; implementation is out of scope per TASK-79 AC #8)

Each name maps to exactly one taxonomy rung, keeps the two HITL gates — the two phases the
human dictated — and fires a `weavelog` CLI trigger.

**Gate-model reconciliation (reviewer-flagged):** `loop-factory.md`'s two formal gates are
**plan approval / merge approval** (both in HOW); TASK-51 layered a claim-time **spec gate**
on top (`spec-approved` before In Progress, `src/tools/task-flow.ts claim`). NORTH_STAR's
"plan and merge gates" and this doc's "spec + merge" refer to the same human touchpoints at
different lifecycle moments — spec sign-off happens at claim time, plan approval at
activation. The naming (spec vs plan as the first gate) is an open question flagged for the
§7 ADR. Consequence for `stitch`: any task-tracked stitch still passes the claim-time spec gate;
only trivial untracked work skips it (backlog overview exemption).

| Command | Rung | What it does | HITL pauses | Future CLI trigger |
|---|---|---|---|---|
| `stitch` | turn-based | small task, conductor works solo or with one implementer; no orchestration, still task-tracked when non-trivial (spec gate applies at claim) | spec gate if task-tracked; merge gate if worktree used | `weavelog stitch "<task>"` |
| `weave` | goal-based | full conductor flow: task → spec gate → dispatch → per-AC verify → merge gate; stop condition = verified ACs + approved merge | **spec + merge** (the two dictated gates) | `weavelog weave TASK-N` |
| `loom` | goal-based (nested) | Ralph-style loop over ready backlog tasks (deps Done), one worktree per task; = N queued `weave` iterations; stop = queue empty or budget spent (§2: rungs nest) | **spec + merge per task** | `weavelog loom [--max N]` |
| `pulse` | time-based (proactive-guarded) | the TRIGGER is handed off (event/schedule starts a weave per firing); never runs unattended past the gates (NORTH_STAR constraint — the proactive rung, held at the gate) | **spec + merge** | `weavelog pulse --on <event>` |

Human-approved name **direction** (2026-09-07; ratified at the §7 ADR): `weave` retained; `run`/`drain`/`watch` replaced with the
loom-vocabulary set above — one coherent metaphor where the scale is the fabric: a stitch is
one small pass, a weave is the full flow, the loom is the machine that weaves a whole queue,
the pulse is the heartbeat that starts the loom on a schedule. Alternatives considered:
`thread`/`reel`/`tick`. Known non-harness adjacency, noted for ecosystem review: Loom (video
product) and Pulse (generic monitoring name) — neither is a shipped harness command.

Reviewer correction adopted: `loom` does not hand off a time trigger — under §2's
own definitions it is a compound goal-based loop (queue/budget stop), so it is mapped there
rather than to time-based; `pulse` is the command that actually hands off the trigger.

### 5.1 Loop budgets and break points (per-loop mechanics)

**In-repo prior art (scout, second pass — extend, do not re-specify):** the budget tuple is
already specified twice in this repo. TASK-6 ("Retry budget + no-progress + reasoning-depth
escalation", To Do): three caps (wall-clock / $ / attempts), first wins; no-progress
detector driven by the SDK `session.diff` event (not manual diff hashing); tuple comparator
(sorted failing-test IDs + normalized error kind); split retry counters (inner-loop vs
kick-back); one `reasoning_effort: high` re-dispatch on capability failure before
abort+alert; a provisioned OpenRouter sub-key with a spending cap throttling runaway agents.
`docs/research/2026-09-03-budget-caps-checkpoint-resume.md` (status: complete): a
cost-true cap family with **named non-zero exit outcomes** (`budget`/`deadline`),
effective-cost token
discounting, gross backstop, wall-clock deadline, and an opencode budget-guard plugin
(`tool.execute.before` throw + `client.session.abort()`) — keel (`keel-harness/keel`) is
cited prior art; its names are not adopted (weavelog-native naming per ADR-007). `src/tools/reviewer-loop.ts`
already implements `--budget-usd` (default 2.00) with a named BUDGET-CAP-EXCEEDED outcome.
TASK-7 adds "PASS but over-budget = FAIL"; TASK-8 adds kick-back budget K=2 → auto-escalate
and the `harness approve|kickback|replan|stuck` decision CLI.

**What this doc adds to that machinery** (the second-pass human question): a
**break-point ladder** between the two HITL gates, evaluated only at iteration/turn
boundaries — (1) **inform** at 80% of any cap (one-line note; mirrors Codex
remaining-budget reminders, v0.142.0); (2) **alert** on stall or risk-trigger; (3) **stop**
at 100% with a progress report, copying Codex `budget_limited` soft-stop semantics (finish
the current step cleanly, summarize, exit — never kill mid-edit) and the repo's named-outcome
pattern. Stall detection: the repo's `session.diff`-based tuple comparator (TASK-6) is
stronger than fingerprint-repetition (viralruparel, 2026-08-26; hermes-agent detectors,
2026-04-09) — reuse it. Escalation-before-abort: one reasoning-effort re-dispatch (TASK-6)
before any human alert fires.

**External corroboration and absences (R1b/R2b, 2026):** caps are opt-in everywhere (SDK
`max_turns`/`max_budget_usd` default NO limit); `/loop`'s 7-day expiry and 50-task cap are
the only shipped default caps found (session-lifetime bounds, not per-task spend); **no
default per-run/per-task wallclock budget and no harness-shipped no-progress detector
exist** (OSS frameworks like hermes-agent ship detectors; default-on status unverified) —
shipping both deterministically (as the repo already specifies) is a differentiator, and
the arXiv anatomy (2607.00038, 2026-06-28) lists budget ceiling + no-progress detector as
standard loop components. Proof-or-Stop (2607.14890, 2026-07): expect verification loops to
~2× cost/latency — budget for it honestly.

### 5.2 Tier-fit checker (wrong-command course-correct)

**Honest finding first (R1b/R2b): nothing like this ships in any major harness as of Sept
2026** — escalation is a human upgrade path (Anthropic guide, 2026-07-07 secondary), or
within-run model escalation (and even that is rejected by some maintainers as standing
policy — hermes-agent issue #30587, undated). The closest emerging patterns are indie: a
4-step ladder ending in escalate-to-human, and a tier-walking state machine
(`RETRY_SAME_TIER` / `ESCALATE` / `END_CYCLE` / `EXHAUSTED`) with failure-class budgets —
transport failures retry the same tier, competence failures escalate immediately (undated
2026 implementations). This checker is greenfield; the design below is derived from the
repo's own deterministic trigger philosophy, not copied behavior.

A deterministic checker detects tier mismatch in BOTH directions and corrects by
**least-intrusion first**:

- **Under-tiered** (e.g. `stitch` growing into `weave`): signals computed at claim and at
  each iteration boundary — files-touched count vs tier thresholds, ACs added mid-run, new
  dependency touched, `risk-signals.ts` classes firing on the merged diff (the three
  implementable signals: failing-tests / protected-path / retry-failures; ADR-004 mandates
  "the risk-signal set ... never self-report or LLM judgment", detector operates on the
  merged diff against base), repeated test failures, no-progress (TASK-6 comparator).
  Net-new signal classes beyond the three (e.g. destructive/schema ops) are additions to
  `risk-signals.ts`, not free assumptions.
- **Over-tiered** (e.g. `weave` spinning on a one-liner): task metadata vs historical
  similar-task outcomes (files-touched, AC count) — an inform-only downgrade suggestion
  (cost saving, zero risk).
- **Response ladder:** (1) **inform** — one-line note at the next natural boundary:
  "this run now meets `weave` criteria: 7 files, risk class R2 — continue, or escalate via
  `weavelog weave TASK-N`?" — never mid-edit, never auto-abort; (2) **require** — inside
  autonomous stretches (`loom`/`pulse`), crossing INTO a higher tier mid-iteration becomes a
  **hard breakpoint** at the next iteration boundary: a loop may not silently climb tiers
  unattended, because tier ≈ blast radius per unchecked iteration; (3) **never auto-migrate**
  — the checker suggests and blocks unattended escalation; the human (or the two gates)
  decides. This mirrors the repo's own model-seat rule: "The machine never selects across
  tiers" (`docs/trd/model-routing.md:84-88`) — extended from model seats to task
  tiers. The two ladders are **orthogonal escalands**: ADR-004 escalates reviewer model
  seats; this checker escalates loop/task tiers; only the trigger-computation philosophy
  transfers.
- **Merge dependency (resolved 2026-09-07):** `src/tools/risk-signals.ts` and
  `tests/risk-signals.test.ts` landed on main with the TASK-76 merge (commit 1dbe6cd) — the
  checker can be implemented directly; no sequencing gate remains.

Naming rationale: one coherent loom-vocabulary set (`stitch → weave → loom → pulse`), verbs
and nouns that scale with the fabric metaphor, no collisions with shipped harness commands
(`/loop`, `/goal`, `/schedule`, `/every`, `/multitask`, Automations); `weave` is the on-brand
flagship full flow; `loom` encodes the Ralph pattern honestly (queue-emptying, budget-bound
machine); `pulse` is deliberately the most constrained name for the most constrained tier.
Rejected: adopting `/loop`/`/goal` verbatim — their semantics diverge across harnesses
(session- vs thread-scoped persistence) and would import documented collision behavior.
Known collisions to note for ecosystem review (second pass): repo-recorded adjacency from
the naming spike — the `weave` namespace is crowded, closest adjacencies wandb/weave and
pgermishuys/opencode-weave (TASK-57, Done) — plus third-party "Weaver" projects in the
agent-orchestration space (operatoronline/weaver; sherkevin/Weaver, 2025-12-05 [PRE-2026];
dgenio Weaver Stack; fivepanelhat/Weaver) and "Loom" (video) / "Pulse" (generic). None are
shipped harness commands; flagged so the names survive review.

**The weaver persona (human question, 2026-09-07): adoptable.** "Weaver" has **zero
in-repo semantic load** (grep-verified across docs/, payload/, src/, backlog/) and fits the
existing role-noun agent roster (`payload/config/agents/`: scout, implementer, qa,
diff-reviewer-*, ...). It is maximally on-brand: the ratified rename rationale states
"Weave is the composition principle ... Log is the evidence principle" (TASK-58) — the
weaver is then the agent who does the composing. Precedent supports persona + command
coexistence (Ralph is simultaneously technique and persona), and no documented pitfall was
found in either engine's pass — though no formal study exists either (absence finding).
External namespace: several indie/hobby orchestration projects named Weaver exist, none
major — same posture as the TASK-57 findings (adjacency, not blocker). Recommendation:
**adopt `weaver` as the persona/agent name for the orchestrator that runs weave/loom** (the
current conductor, personified), keep `stitch`/`weave`/`loom`/`pulse` as commands, and run
a TASK-57-style availability check (npm/GitHub/domain/trademark) as a PRD item before
ratification. Alternative if the check fails: keep the role-noun "conductor".

## 6. Agent-primitives implications

- **Per primitive-selection axes** (`2026-08-16-primitive-selection.md`): each command = a
  user-invocable **skill** in `payload/skills/` (on-demand, probabilistic guidance) that
  fires a deterministic **CLI trigger** (`src/cli/`); gate enforcement stays in
  **hooks/enforce.ts + task-flow claim gate** (deterministic). Loop *behavior* never lives in
  always-on AGENTS.md.
- **Budgets + tier-fit checker ship as one deterministic module** (§5.1/§5.2): extension of
  `src/tools/risk-signals.ts` + a loop-runner surface in `src/cli/` + hook enforcement —
  TRD item, not prose. The budget tuple and the inform/require/stop ladder are the
  machine-side of the two HITL gates: between gates, they are the human's ears.
- **`payload/AGENTS.md` slims to the user-level contract:** backlog rule, one-question rule,
  communication protocol, the two-gate rule, and a routing line — "pick the smallest loop
  that finishes the task; escalate only when verification fails" — plus pointers to the loop
  skills. Target: the thin-context budgets above (≤100 lines). Project scaffolding via
  `weavelog init` writes a *different*, project-specific AGENTS.md (TASK-30) — the
  user-level and project-level artifacts stop being the same file.
- **Model routing impact** (`docs/trd/model-routing.md`, ADR-004): `stitch` keeps
  the workhorse; `weave`/`loom` escalate reviewers per the existing four-family rule;
  `pulse` adds no new model class.
- **Sequencing dependency:** opencode's plugin SDK must be verified for lifecycle-hook
  expressibility before `weave`'s evaluator-loop mechanics are promised (P0 gap; PRD item).

## 7. Feeding the artifact chain (ADR-005 flow, post-TASK-76)

ADR-005 (approved 2026-09-07) fixes the flow: **idea → PRD → TRD → milestone ↔ PRD → TASK**,
with ADRs firing **cross-cutting at the decision gate — an ADR is not a pipeline stage** —
TRD changed only via ADRs, and TASK acceptance criteria required to cite the TRD section or
ADR constraint they implement:

1. **PRD** (requirements live inside the PRD): user-facing loop surface (the four commands) +
   the `weaver` persona name gate (TASK-57-style availability check before ratification),
   HITL contract, NORTH_STAR compliance for `pulse`.
2. **TRD**: skill files + `src/cli/` triggers + gate wiring through existing
   enforce/task-flow machinery; loop budget tuple + tier-fit checker module (§5.1/§5.2 —
   extending TASK-6 and the budget-caps design, not duplicating them); opencode SDK
   verification spike.
3. **TASKs**: slim `payload/AGENTS.md`; add four skills + CLI verbs; routing rule; scaffold
   split (feeds TASK-28/29/30) — every AC citing the TRD section or ADR constraint it
   implements (ADR-005 traceability rule; tasks that trace to nothing are rejected at the
   plan gate).

**Cross-cutting ADR:** "tiered loop commands vs conductor-always-on" — **fired at the
decision gate as ADR-007 (in-review)** when the human ratified this research; adjacent to
ADR-003/004/005, supersedes none (absorbs the planned ADR-006).

## 8. Source classification (per TASK-79 AC #4)

- **Dated 2026** (primary evidence): Anthropic loops blog (2026-06-30); Osmani LinkedIn
  (2026-09-06); Osmani Practical Loop Engineering (2026-08-14); Osmani Code Agent Orchestra
  (2026-03-26); arXiv 2608.21884 (2026-08-22); Codex Goals cookbook (2026-05-09) and /goal GA
  (2026-05-21); Antigravity transition (2026-05-19); `/checkup` (2026-07-09); Copilot
  scheduling (2026-06-02); Cursor `/multitask` (2026-04-24), event agents (2026-08-19),
  self-hosted machines (2026-09-03); Amp Puck (2026-07-20); Claude Code collision issues
  (2026-05-26, #40135 2026-03-28); productionnotes.dev A/B test (2026-08-09);
  getclaudeskills.com (2026-03-31); terminalblog budgets (2026-07-13).
- **Live/undated 2026** (flagged): code.claude.com scheduled-tasks docs; Codex follow-goals
  docs; GitHub Copilot schedule-prompts; Vercel skills-vs-AGENTS.md evals; HumanLayer/
  Dometrain 60–100-line budget; fortegrp AGENTbench report (study dated Feb 2026, page
  undated).
- **PRE-2026** (historical context only, 2026 corroboration noted): Ralph pattern origin,
  ghuntley.com/ralph (2025) — corroborated 2026 by the official ralph-wiggum plugin and 2026
  tiering coverage; Anthropic multi-agent research system 90.2%/15× figures (2025) —
  corroborated by arXiv 2608.21884 (2026-08-22) and productionnotes.dev (2026-08-09);
  MAST coordination-failure taxonomy, arXiv 2503.13657 (2025-03).
- **Internal repo claims**: P0 brief carries verbatim file/line provenance (§1).
- **Second pass (2026-09-07, R1b/R2b/scout):** dated 2026 — arXiv 2607.00038 (2026-06-28),
  AgentTether arXiv 2607.06273 (2026-07-07), Proof-or-Stop arXiv 2607.14890 (2026-07),
  hermes-agent detectors (2026-04-09), no-progress guard pattern (2026-08-26), datasciencedojo
  10-type (2026-06-09), nerdschalk four-types (2026-07-15), aibuilderclub synthesis
  admission (2026-07-10), agentprotocol.ai AGENTS.md explainer (2026-08-03), snarktank/ralph
  (created 2026-01-07), Codex v0.142.0 budgets + v0.145.0 (2026-07-21/23 secondary),
  arXiv 2609.00050 (Sept 2026, via 2026-09-06 secondary). Live/undated — Claude SDK agent-loop
  docs, Codex cookbook, PRs #23094/#37878, issue #28144, agentpatterns.ai loop-budgeting,
  KanakMalpani 6-level taxonomy, AAIF/agentproto coverage, stevekinney Ralph stuck protocol,
  indie tier-walking ladder implementations, hermes-agent issue #30587 (escalation policy
  rejection). PRE-2026 (historical context,
  2026 corroboration noted) — ralph-orchestrator hats/human.interact (2025-09-07),
  sherkevin/Weaver (2025-12-05), Ralph origin (2025). Secondary-only, flagged: Anthropic
  Managed Agents outcome primitive (agentpatterns.ai, undated); Symphony mention (single
  secondary source). Discrepancy note: Anthropic loops blog dated 2026-06-30 (page metadata,
  R2 pass 1) vs 2026-07-07 (secondary sources, R1b) — content canonical either way.

---

## Decision gate (ADR-003)

**Decision: recorded — [ADR-007](../adr/0007-tiered-loop-commands.md) (in-review, fired at
this gate on human ratification 2026-09-07):** tiered loop commands
(`stitch`/`weave`/`loom`/`pulse`) + the `weaver` persona replace the always-on conductor
protocol; two HITL gates preserved; budgets + tier-fit checker stay deterministic. The
planned-but-never-ratified ADR-006 (conductor-dispatch) is absorbed there. Implementation
still requires the §7 chain — this research performs none.

**Lessons:**
1. The strongest signal came from the repo itself — TASK-6 and the budget-caps design
   already specified what the external loop-engineering discourse is still asking for. Mine
   internal prior art before designing anything net-new.
2. Absence findings (no per-task wallclock budget, no harness-shipped no-progress detector,
   no wrong-tier detection) are the product opportunity — state them as evidence-scoped
   absences, never universal negatives.
3. Naming: a persona (`weaver`) and command verbs coexist cleanly when the vocabulary is one
   coherent metaphor; the ecosystem's collision incidents (Puck ×3 within a year) argue for
   distinctive names plus a TASK-57-style availability check.
4. The four-rung ladder is useful vocabulary, not settled consensus — cite it as Anthropic's
   frame from a single origin cluster, and keep the deeper agency/orchestration 2-axis split
   for the ratifying ADR.
