---
date: 2026-09-03
topic: hard budget/cost caps + checkpoint/resume — keel vs ramannanda9/agent-harness vs opencode native (for loopeng OSS)
status: complete
sources:
  - "https://github.com/keel-harness/keel (README, live 2026-09-03)"
  - "https://github.com/keel-harness/keel/blob/main/docs/guide/reference.md (live 2026-09-03)"
  - "https://github.com/ramannanda9/agent-harness (README, live 2026-09-03)"
  - "https://opencode.ai/docs/plugins/ (last updated 2026-09-02)"
  - "https://opencode.ai/docs/sdk/ (last updated 2026-09-02)"
  - "https://opencode.ai/docs/server/ (last updated 2026-09-02)"
  - "https://raw.githubusercontent.com/anomalyco/opencode/dev/packages/sdk/js/src/gen/types.gen.ts (live 2026-09-03)"
models_used_for_research:
  - openrouter/z-ai/glm-5.3-flash
supersedes: none
---

# Budget caps + checkpoint/resume: keel, agent-harness, opencode native

All claims live-fetched 2026-09-03. Extends the survey note `2026-09-02-oss-agent-harnesses.md`
(deeper on budget/resume only). Supersedes nothing.

## 1. keel — cost-true token cap + wall-clock deadline

Mechanism (README config table + docs/guide/reference.md "Budget and loop safety"):
- `KEEL_MAX_TOKENS` — "Effective-cost token cap (cached input discounted). The primary spend
  ceiling." Explicitly: "a cost ceiling, not a raw-token one: a cached-heavy task runs
  proportionally longer for the same number."
- `KEEL_MAX_GROSS_TOKENS` — raw input+output backstop; ALSO the compaction runway trigger.
- `KEEL_MAX_OUTPUT_TOKENS` (cumulative output guard), `KEEL_MAX_RESPONSE_TOKENS` (default 16384),
  `KEEL_MAX_TURNS` (default 50, "Not a spend cap"), `KEEL_MAX_WALL_SEC` — "keel self-stops
  gracefully with a `deadline` outcome."
- Stop reasons surface in exit codes: "exit non-zero when the run stopped for any reason other
  than the model finishing normally (provider error, turn cap, budget, deadline)."
- Checkpoint/resume: append-only session ledger `sessions/<id>.jsonl` under `KEEL_HOME`;
  `keel --continue` / `--resume <id>` / `keel sessions branch <id> <n>` (fork ledger at event
  index n). Compaction default OFF; with it on but no gross cap, "no hard overflow backstop."

- v0 for loopeng: three counters in the run wrapper — effective-cost tokens (cache reads
  discounted), raw gross backstop, wall-clock deadline — each producing a named non-zero exit
  outcome (`budget` / `deadline`). Pure harness logic; no opencode change.
- v1: goal/loop-scoped sub-budgets (keel ships `--goal-max-turns`, `--goal-max-wall-ms`,
  `/loop --max-iterations --max-wall-ms`), gross-cap-triggered compaction runway.
- Effort: v0 **S**, v1 **M**.

## 2. ramannanda9/agent-harness — BudgetGuard + checkpoint/resume

Mechanism (README architecture table + "Cost shaping + reliability" + "Crash-resume"):
- `harness/runtime.py` AgentRuntime: "BudgetGuard with cost/token caps + per-call-site
  breakdown"; guard "wired into every distinct LLM instance automatically (deduped by object
  identity)." Cost per call lands in adapter `last_usage` from the final stream event.
- Per-call-site cost attribution: explicit LLM slots `classifier_llm` / `router_llm` /
  `planner_llm` / `synthesizer_llm` (each defaults to `llm`) — attribution falls out of which
  instance served the call; no keyword heuristics.
- Checkpoint: `harness/checkpoint.py` — "CheckpointStore + _ResumeHint + maybe_resume_key —
  pluggable run-state persistence (file + Redis); auto-resume built into dispatch_stream /
  run_stream." `harness/runstate.py` — "RunState / OrchestratorState — the explicit, serializable
  position of a run: step + phase, per-action and per-task status, budget, failure reason."
- Sub-agent crash-resume: delegation mints its own `run_id`; parent resume continues the sub
  from its own checkpoint; "best-effort… at-least-once either way — the step in flight when the
  checkpoint was written is replayed, which ActionState.attempts records." Plus `harness/trace.py` JSONL recorder + replay viewer.
- v0 for loopeng: serialize a RunState-equivalent (backlog task id, step, phase, budget spent,
  failure reason) to JSON after each completed step; resume = reload + skip completed steps;
  in-flight step replays (at-least-once), attempts counter records it.
- v1: pluggable store (file → SQLite/Redis); per-role budget attribution matching the runbook's
  model ladder (conductor/researcher/implementer/reviewer slots); JSONL trace + replay.
- Effort: v0 **S–M**, v1 **M**.

## 3. opencode native — cost reporting, enforcement surface, session persistence

Cost/token reporting (types.gen.ts, verified live):
- `AssistantMessage` has `cost: number` and `tokens: { input, output, reasoning, cache: { read,
  write } }` — cache read/write reported SEPARATELY, so keel-style cost-true discounting is
  computable natively. `StepFinishPart` repeats cost/tokens per step. `EventMessageUpdated`
  carries the full `Message` → live visibility in plugins and `event.subscribe()` SSE.

Enforcement (plugins + SDK docs):
- Plugin hook `event` sees `message.updated` (accumulate spend); `tool.execute.before` can throw
  to block a tool call (documented `.env-protection` example); plugin ctx includes `client` (full
  SDK). Compounding hooks: `experimental.session.compacting`, `session.idle`, `session.error`.
- Hard-stop path: `client.session.abort({ path })` (SDK) = `POST /session/:id/abort` (server).
- ABSENCE verified: no budget/spend/max-cost parameter anywhere in the server API tables or SDK
  method tables (sessions section: list/get/create/delete/update/init/abort/share/unshare/
  summarize/messages/message/prompt/command/shell/revert/unrevert/fork/children/todo/diff/
  permissions — nothing budget-related). Prior internal note 2026-08-19-opencode-headless-api-
  harness-binding independently found no timeout/max-turns/budget flags on the `run` CLI.

Session persistence/resume (server + SDK docs):
- Sessions are durable server-side objects. Resume/restart primitives: `GET /session` (list),
  `GET /session/status`, `POST /session/:id/fork` (fork at messageID — checkpoint/branch
  primitive), `POST /session/:id/revert` + `/unrevert` (rewind), `POST /session/:id/summarize`
  (compact), `session.messages()` (full transcript replay), SSE `GET /event` /
  `client.event.subscribe()`. `opencode serve` runs the headless server.
- v0 for loopeng: a budget-guard plugin (~100 lines): env `LOOPENG_MAX_COST` /
  `LOOPENG_MAX_EFFECTIVE_TOKENS` / `LOOPENG_MAX_WALL_SEC`; persist per-session spend to disk on
  every `message.updated`; over cap → `tool.execute.before` throw + `client.session.abort()` +
  toast.
- v1: cache-discounted effective-cost accounting (read vs write cache rates), per-agent
  attribution (AssistantMessage carries `mode`), wall-deadline via timer + abort, budget state
  keyed to fork points for cheap resume-from-checkpoint.
- Effort: v0 **S**, v1 **M**.

## Build order (recommended)

1. **opencode budget-guard plugin (v0)** — platform-enforced, works for every loopeng session
   regardless of launch path; cost data already emitted per message.
2. Harness ledger + named exit outcomes (keel-style: effective / gross / wall / turns).
3. Step-level RunState checkpoint/resume keyed to backlog tasks (agent-harness pattern).
4. v1 polish: per-call-site attribution, goal/loop sub-budgets, trace replay.

**Highest-leverage single item: #1, the budget-guard plugin** — smallest effort (S), uses only
verified native primitives (`message.updated` cost/tokens + `session.abort`), and closes the only
hard-cap hole opencode leaves open.

## Not checked this dispatch

- keel source implementing the cache-discount math (discount rate undocumented on fetched pages).
- agent-harness BudgetGuard source: exact semantics (hard-stop vs warn) unverified — README only.
- Whether opencode `AssistantMessage.cost` is provider-reported vs models.dev price-table-derived.
- agent-harness PyPI/npm packaging status and release cadence.
