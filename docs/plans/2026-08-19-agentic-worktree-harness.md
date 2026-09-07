---
title: Agentic Worktree Harness — Plan v1.3
date: 2026-08-19
topic: Agentic worktree harness — v1 inner-harness plan
status: open
type: how-loop-plan
supersedes: none
sources:
  - "docs/research/2026-08-19-agentic-worktree-harness-tools.md"
  - "docs/research/2026-08-19-opencode-headless-api-harness-binding.md"
  - "docs/research/2026-08-23-architecture-pattern-extraction.md"
models_used_for_research:
  - z-ai/glm-5.2
depends_on:
  - docs/research/2026-08-19-agentic-worktree-harness-tools.md
  - docs/research/2026-08-19-opencode-headless-api-harness-binding.md
  - docs/research/2026-08-23-architecture-pattern-extraction.md
review_verdicts:
  - reviewer: "qwen3.8 (fresh context, lens: inner-loop contract + retry + state)"
    verdict: APPROVE-WITH-FIXES
  - reviewer: "kimi-k3 (fresh context, lens: DAG + merge + review-gate + cascade)"
    verdict: APPROVE-WITH-FIXES
---

# Agentic Worktree Harness — Plan v1.3

> **v1.3 changelog** (2026-08-23): deep tool-integration audit (3 research
> notes: backlog.md capability audit, difit+opencode SDK integration, headroom
> +OpenRouter). All tools checked against their documentation; underutilized
> capabilities added; hallucinated interfaces corrected.
>
> **backlog.md** — added: `onStatusChange` callback (event channel replacing
> polling for status drift), `backlog decision` (merge-gate decision records),
> `--final-summary` (PR notes at merge), `--check-ac` (AC verification at gate
> pass), `--implementation-notes`/`--comments` (task-native progress/review),
> DoD checklist, `milestone` for DAG phases, `--modified-files` for
> file→task traceability.
>
> **opencode SDK** — added: `noReply` for context injection (kick-back
> feedback), named events (`session.idle`, `session.error`, `session.diff`,
> `session.compacted`), `experimental.session.compacting` hook, agent `steps`
> limit, `reasoningEffort` in agent config, permission policy for headless
> (native glob denies as primary deny-list, `permission.asked` auto-deny or
> sessions hang), `StructuredOutputError` handling in DoneVerdict parser.
>
> **difit** — corrected: `--background` JSON includes `pid` (kill handle),
> auto-adds `--keep-alive` + `--no-open`, `--clean` for stale localStorage on
> kick-back re-review, secret scrubbing in findings→`--comment` pipeline.
>
> **headroom** — clarified: compression proxy in-path (not just a wire-value
> obstacle), CCR TTL 1800s for long runs, cost accounting post-compression,
> `reasoning_effort` passes through (not stripped), session_id interference
> with sticky routing, MCP removal pending (don't build on MCP tools).
>
> **OpenRouter** — corrected: `reasoning_effort: "max"` and `"xhigh"` are
> equivalent per docs (plan's distinction was wrong); both valid for all
> reasoning-capable models.
>
> **reviewer-loop.ts** — corrected: plan's `STATUS: FAILED` reference was
> hallucinated (doesn't exist in code). Actual: `===== <model> =====` +
> free-text VERDICT, `ERROR: <reason>`, exit codes 0/1/2. `--report <path>`
> emits machine-readable JSON — build the new parser on `--report`, not
> from zero.
>
> **context7** — added: enable for worker sessions (in-task doc lookups
> improve done-condition quality at near-zero setup cost).
>
> **tavily** — deferred with trigger: "when workers get stuck on
> external-API errors a doc lookup would resolve."

> **v1.2 changelog** (2026-08-23): extracted 5 concepts from architecture-pattern
> docs (research note: `2026-08-23-architecture-pattern-extraction.md`):
> (1) `deepseek/deepseek-v4-pro-0813` added as a second reviewer seat (logic);
> (2) review chain formalized as sequential (logic → security);
> (3) reasoning-depth escalation added as intermediate step before abort+alert;
> (4) 4-layer prompt-caching payload naming adopted;
> (5) conductor-boundary added as machine-checkable health assertion.
> ZDR header (`X-Data-Retention: none`) confirmed hallucinated — use
> `provider: { zdr: true }` in the JSON body instead.

## Goal

A lightweight, self-owned harness around opencode that:
1. Breaks a problem into tasks with a human in the loop (WHAT-loop handoff)
2. Fires isolated git worktrees per task, respecting a dependency DAG
3. Runs each task's agent autonomously until a hard done-condition passes
4. Gates merge on human review; escalates conflicts instead of guessing
5. Breaks stuck loops with bounded retries + human alert (no infinite loops)

No framework dependency. Stack: TypeScript + bun + biome, backlog.md as the task
ledger, plain git worktrees, opencode as the inner-loop worker via its TS SDK.

This plan is the HOW-loop spec. It assumes the WHAT-loop (research + dialogue +
spec) has produced approved tasks. The harness owns the HOW side only:
approved tasks → DAG → dispatch → done-check → review → merge.

---

## Architecture: inner loop / outer loop

**Outer loop** (TypeScript driver, `bin/src/`)
- Owns the DAG, the schedule, the worktree lifecycle, every human gate, the
  retry budget, the no-progress detector, and crash reconciliation.
- Never writes code. Never writes backlog state directly from a worktree —
  the driver is the **sole writer** of backlog.md (per AGENTS.md conductor
  rule). Agents signal via worktree-local files; the driver translates.

**Inner loop** (opencode agent inside one worktree)
- Owns one task. Runs autonomously until the done-condition passes or the
  driver aborts it (budget / no-progress / cap).
- Has no visibility into other tasks or the outer schedule. Scoped to one
  worktree via opencode's `--dir` / SDK session scoping + a deny-list.

---

## Inner-loop binding: IAgentProvider port + opencode SDK

**Verdict (research-confirmed): hybrid.** Define a portable `IAgentProvider`
contract in the driver; implement the opencode provider via the TS SDK
(`@opencode-ai/sdk`) in-process. Keep `opencode run --format json` as a
smoke-test fallback only.

### Why SDK, not CLI

The `run` CLI has `--format json`, `--dir`, `--auto`, `--file` but **no**
`--timeout`, `--max-turns`, `--budget` flags and **undocumented exit codes**
(research note: `2026-08-19-opencode-headless-api-harness-binding.md`).
Budget enforcement, stuck-detection, and done-condition-checking all require
in-process hooks, structured output, and abort that the CLI cannot provide.
Archon (the reference harness) uses the SDK the same way: it spawns+owns the
opencode server per session and exposes a portable `IAgentProvider`
interface.

### IAgentProvider port (define signatures in Step 1)

Minimum interface that lets the driver swap opencode → another agent later
without rewriting. Driver depends on the contract (DIP), not opencode's
mechanism.

```ts
interface IAgentProvider {
  start(task: TaskSpec, worktree: Worktree): Promise<RunHandle>;
}

interface RunHandle {
  verdict(): Promise<DoneVerdict>;        // structured: tests-passed, ac-met, blocked-reason
  abort(deadlineMs: number): Promise<CostReport>;
  events(): AsyncIterable<NormalizedEvent>;  // SSE-normalized: message, tool-call, cost, error
  usage(): CostReport;                    // driver-accumulated, never agent-reported
}

interface DoneVerdict {
  testsPassed: boolean;
  lintClean: boolean;
  acceptanceCriteria: { id: string; met: boolean; evidence: string }[];
  blockedReason?: string;                  // present when agent cannot proceed
}

interface CostReport { turns: number; tokens: number; dollars: number; aborted: boolean; }
```

**Step 0 must resolve:** opencode SDK has a **v1 vs v2 surface split** —
`format: json_schema` exists on the v2 surface only; v1 `SessionPromptData`
has no format field (reviewer finding). Step 0 pins which surface the
provider targets.

### opencode provider mechanism

- `createOpencode()` starts server+client in-process
- `session.prompt({ format: "json_schema" })` for structured done-verdict.
  **Structured output error handling:** check
  `result.data.info.error?.name === "StructuredOutputError"` in the
  DoneVerdict parser — retry with a simpler schema or free-text fallback
- `session.prompt({ body: { noReply: true } })` injects context without
  triggering an AI response — use for kick-back feedback injection (see
  Human gate)
- `session.abort()` w/ `AbortSignal` for clean mid-run kill
- `event.subscribe()` SSE stream — **named events** the driver consumes:
  - `session.idle` — agent finished, check done-condition
  - `session.error` — transient vs capability failure classification
  - `session.diff` — diff hash for no-progress detector (replaces manual
    diff hashing; the SDK emits this directly)
  - `session.compacted` — context compaction occurred; task/AC state
    preserved via `experimental.session.compacting` hook
  - `message.updated` — per-message cost accumulation
  - `permission.asked` / `permission.replied` — permission gating events
- Plugin hooks:
  - `tool.execute.before/after` — intercept/modify tool calls (deny-list,
    halt-on-budget)
  - custom `tool()` injection — inject a `done_check` tool
  - `shell.env` — inject environment variables
  - `experimental.session.compacting` — preserve task/AC state across
    compaction (long inner-loop runs compact; without this hook, AC
    state is lost mid-run)
- **Agent `steps` limit** — native iteration cap complementing driver caps.
  Set in agent config (`steps: N`) — when hit, agent receives a system
  prompt to summarize + recommend remaining tasks
- **`reasoningEffort` in agent config** — the documented reasoning lever
  (not hand-rolled wire values). Set in the agent's JSON config, not
  manually injected per-request

### Permission policy for headless sessions (Step 0 critical)

**Any `ask` permission hangs a headless session.** The deny-list must be
configured before dispatch:

1. **Native permission globs** (primary deny-list): `edit: {"backlog/**":
   "deny", "AGENTS.md": "deny", ".harness/**": "deny"}` in the opencode
   config or agent config. This is the documented primary mechanism.
2. **`tool.execute.before` hook** (second layer): programmatically block
   any tool call touching denied paths — catches what globs miss.
3. **`--auto` flag / `permission: { "*": "allow" }`**: auto-approve
   everything NOT explicitly denied. Combine with globs: deny-list first,
   then auto-approve the rest.
4. **`permission.asked` event**: if a permission request reaches the
   event stream, it means the deny-list has a gap. Auto-deny and log it
   as a deny-list miss.

**Budget source of truth:** `AssistantMessage.cost: number` + `message.updated`
SSE events. Driver sums provider-reported per-message cost; never
agent-reported.

**Abort-cost semantics (pessimistic, pre-committed):** if `session.abort()`
does not yield a final cost chunk (unverified — Step 0 answers), count the
ceiling as consumed. Abort-kill ladder: `session.abort(deadlineMs)` →
`server.close()` (via `ServerOptions.signal`).

### Prompt-caching payload structure (4-layer naming)

**Extracted from architecture-pattern research:** adopt explicit 4-layer
naming for prompt construction. The principle ("push dynamic content to
end") already exists in the `openrouter-prompt-caching` note; this names
the layers:

1. **System** (pinned) — role definition, policies, deny-list. Highly cacheable.
2. **References** (static) — project schemas, API docs, large immutable context.
3. **History** (append-only) — prior turns, task notes, accumulated context.
4. **Volatile query** (appended last) — the current instruction. Invalidates nothing above.

This triggers provider-side prompt caching (up to 50% token cost drop on
recurring static blocks). The existing `openrouter-prompt-caching` note has
provider-specific cache rates and the Qwen explicit-cache caveat
(`qwen3.8-2.4t-a95b` NOT listed → treat as no-cache).

### ZDR (Zero-Data Retention)

**Correction from architecture-pattern research:** the source docs used
`X-Data-Retention: none` as an HTTP header — this is **hallucinated** and
would be silently ignored by OpenRouter. The real mechanism is
`provider: { zdr: true }` in the **JSON request body** (verified:
https://openrouter.ai/docs/guides/features/zdr). If ZDR enforcement is
needed, use the body parameter, not a header.

### Headroom in-path (compression proxy, not just a wire-value obstacle)

**Research finding:** headroom is a **compression proxy** (port 8788,
`--mode cache --backend openrouter`) that sits between opencode and
OpenRouter. Every LLM call traverses it. The plan must treat it as an
in-path component, not just a wire-value risk.

- **`reasoning_effort` passes through** — the proxy compresses message
  *content*, not top-level request body parameters. `reasoning_effort`,
  `temperature`, `provider`, `tools` are forwarded as-is to OpenRouter.
- **CCR TTL = 1800s (30 min)** — long autonomous runs may hit expired CCR
  originals, silently degrading context. Step 0 must probe CCL TTL impact
  on long sessions and consider `HEADROOM_CCR_TTL_SECONDS` override.
- **Cost accounting post-compression** — `AssistantMessage.cost` is
  computed through the pricing-bridge alias map after compression.
  Verify cost accuracy in Step 0.
- **session_id interference** — headroom overwrites `session_id` with its
  own compression-cache key. Sticky routing relies on OpenRouter's
  hash-based routing, not explicit `session_id` pinning. Known limitation,
  not a blocker.
- **4-layer payload aligns with `--mode cache`** — the 4-layer naming
  (system → references → history → volatile) aligns with headroom's
  byte-faithful forwarding of the frozen prefix. Static content at the
  top is cacheable; dynamic at the end is compressed.
- **MCP removal pending** — the headroom MCP server
  (`headroom_compress`, `headroom_retrieve`, `headroom_stats`) is still
  wired in opencode.jsonc but approved for removal (2026-08-16 decision,
  never executed). **Do not build on the MCP tools** — use
  `POST http://localhost:8788/v1/compress` via fetch() for any
  programmatic compression.

### OpenRouter parameter corrections

**Research correction:** `reasoning_effort: "max"` and `"xhigh"` are
**equivalent** per OpenRouter docs (both ~95% of max_tokens). The plan's
v1.2 claim that "max works on deepseek-v4-pro-0813 but xhigh for general"
was **not supported by documentation** — both values work on all
reasoning-capable models. Use either interchangeably.

Full enum: `max`, `xhigh`, `high`, `medium`, `low`, `minimal`, `none`.
Top-level in the request body (shorthand for `reasoning.effort`).

---

## Task ledger — backlog.md

`backlog init` already done (project `agents-harness`). Tasks stored as
markdown + YAML frontmatter under `backlog/tasks/`.

### Native fields used (no custom frontmatter)

- `id`, `title`, `description`, `acceptanceCriteria`, `dependencies` (array
  of IDs — native), `parentTaskId` (subtasks — native), `--ready` filter
  (tasks whose deps are satisfied — native)
- `modifiedFiles` (native, closest to "files this task touches" — used by
  the planning step to guess `depends_on`)

### What is NOT stored in backlog.md

- `worktree_path`, `branch_name` — derived by convention:
  `.worktrees/<task-id>` + `task/<task-id>`. Storing them depends on
  unverified custom-frontmatter round-trip and creates sync drift.
- `retry_count`, `$ used`, `dispatch_id`, kick-back count, no-progress
  strikes — machine state, **not** re-derivable from git. Live in the
  driver-owned `state.json` (see Crash/reconcile).

### Status model — native enum + labels + driver state.json

backlog.md has a **fixed 5-value enum** (Draft / To Do / In Progress / In
Review / Done) — custom statuses are unsupported (confirmed via config.yml
+ MCP schema). The plan's earlier status flow (planned→approved→…→merged)
is remapped:

| Plan state | backlog status | label | state.json |
|---|---|---|---|
| approved | To Do | — | dispatch_id=null |
| dispatched / in-progress | In Progress | `dispatched` | dispatch_id, retry_count, $ used |
| ready-for-review | In Review | — | reviewer verdict |
| merged | Done | `merged` | merged_at |
| stuck (alerted) | In Progress | `stuck` | stuck_reason, stuck_at |
| re-planned | To Do | `replan` | replan_reason |

`merged` is **not** a native status — merged tasks go to `Done` + `merged`
label. `Draft` is excluded from the workflow (planning artifacts, not
dispatchable).

### Underutilized backlog.md capabilities (v1.3 additions)

**Research finding (audit note: `2026-08-23-backlog-md-capability-audit.md`):**
backlog.md has 10+ capabilities the plan didn't use. Top additions:

| Capability | How the harness uses it | Step |
|---|---|---|
| **`onStatusChange` callback** | Event channel for human-initiated status drift — replaces re-verification polling as primary; re-verify kept as belt-and-braces. Config-level shell command fires on `{command, taskId, oldStatus, newStatus, taskTitle}` | 1, 6 |
| **`backlog decision` (CLI-only)** | Records merge-gate decisions (approve/kickback/replan/conflict) as first-class markdown artifacts in `backlog/decisions/` with a status. Audit trail for gate history | 5, 7 |
| **`--final-summary`** | PR-style completion notes at merge time (merge SHA, cost, reviewer verdicts). Written by the driver via `task edit --final-summary` when the task reaches `Done` + `merged` | 7 |
| **`--check-ac`** | Acceptance criteria verification at gate pass. `task-flow.ts` already wraps `--check-ac` — use it instead of raw status edits for the gate transition | 4, 5 |
| **`--implementation-notes` / `--comments`** | Task-native progress (implementationNotes), review collaboration (comments with commentAuthor), attributed kick-back rounds. Currently written to chat/plans — move to the task itself | 2, 3, 5 |
| **DoD checklist (`--dod`)** | Mirrors the 4-point done-condition (tests+lint+clean+rebased-green). Project-level DoD defaults via `definition_of_done_defaults_upsert`; task-level via `--dod-add`. DoD is a completion checklist, not AC — keep scope/behavior in ACs | 1, 4 |
| **`milestone`** | Tracks DAG phases as native grouping. Tasks assigned to each milestone are visible in the board grouped by milestone. Multi-phase efforts get milestones | 1 |
| **`--modified-files`** | File→task traceability without a sidecar. `backlog search --modified-file src/path.ts` finds which task touched a file — useful for conflict diagnosis | 2, 7 |

**MCP vs CLI:** the MCP server is a **subset** of the CLI (no decisions,
board, browser, drafts, cleanup, config, init). The plan uses MCP for
task/document/milestone/DoD operations (type-safe, programmatic) and CLI
for decisions + board export + cleanup (MCP doesn't expose them).

---

## Planning step (WHAT-loop handoff, no worktrees)

This is the existing two-loop model's WHAT side; the harness does not
re-spec it. A task breakdown (title, description, acceptance criteria,
first-pass `depends_on` guessed from `modifiedFiles`) is produced in a
plain interactive opencode session, reviewed by the human, and on approval
written to backlog.md with status `To Do`. Nothing fires until the human
says "approved."

---

## Scheduler — DAG walk

- Read all `To Do` tasks + their native `dependencies` edges.
- **Lean on `--ready`** (native: tasks whose deps are satisfied). A
  driver-side toposort is YAGNI — but cycle detection lives nowhere
  (backlog.md does not reject cycles; a cyclic pair silently never becomes
  `--ready` and hangs forever).
- **Cycle check at startup reconcile** + a **deadlock watchdog**:
  `--ready` empty while non-Done tasks exist ⇒ alert, never idle silently.
- Eligible tasks dispatch in parallel; dependent tasks wait for their
  prerequisite's `merged` (Done + `merged` label) status.
- **Confirm `--ready` excludes Done tasks themselves** (Step 1 verify);
  else filter.
- Eligibility re-check is **event-driven** on merge (no polling).

---

## Dispatch — worktree + inner loop

For each eligible task:
1. `git worktree add .worktrees/<task-id> -b task/<task-id>`
2. Write `TASK.md` (description + acceptance criteria) into the worktree
   for the agent to read on startup.
3. Driver spawns opencode SDK session in the worktree, scoped to one task,
   deny-list = `backlog/`, `AGENTS.md`, `.harness/` (via native permission
   globs + `tool.execute.before` hook — see Permission policy).
4. Agent implements → runs tests/lint → if fail, iterate → if pass,
   commit. Driver watches SSE named events (`session.diff` for no-progress,
   `session.idle` for completion, `session.error` for transient vs
   capability, `message.updated` for cost accumulation).
5. Agent signals done via the structured `DoneVerdict`; driver re-runs
   tests + lint itself (never the agent's claim). Handle
   `StructuredOutputError` in the parser — retry with simpler schema or
   free-text fallback.
6. **context7 enabled for worker sessions** — `context7_resolve-library-id`
   → `context7_query-docs` provides up-to-date library docs at near-zero
   setup cost. Worker prompt includes: "consult current SDK docs before
   using unverified APIs." Caveat: MCP tool schemas sit in the frozen
   prefix (never compressed) — weigh per-session enablement vs global.

**Hard done-condition, not agent self-report.** Driver-verified:
- Tests + lint green (driver runs the commands)
- Working tree clean (committed)
- Green against **rebased main** (rebase happens before the gate, see Merge)

---

## Loop-breakers (concrete)

Three independent caps, **first hit wins**:
1. **Wall-clock** per task
2. **Hard per-task $ cap** (driver-accumulated from `AssistantMessage.cost`)
3. **Attempts** (inner-loop retry count)

**No-progress detector** (not just failure count):
- Same failing-test signature ×2, OR
- Diff hash unchanged between retries

**Failure signature = tuple** (sorted failing test IDs + normalized error
kind). Unit-test the comparator (exact-test-name is brittle under renames;
error-class is too coarse).

**Split retry counters:** inner-loop retries (agent re-attempts within one
dispatch) vs human kick-backs (human sends back to In Progress) are
**different counters**, not conflated.

**On cap-hit / no-progress:**
- `session.abort(deadlineMs)` → `server.close()` kill ladder
- Worktree **KEPT as evidence** (not cleaned up)
- Task gets `stuck` label
- Human alerted (alert channel = the human decision CLI, see Human gate)

**Alert channel:** the driver surfaces stuck tasks through the same
`harness` CLI the human uses for review decisions — surfaced as
`harness stuck <id>` with the no-progress evidence, last diff, and cost
report. No external notifier in v1.

### Reasoning-depth escalation (intermediate step before abort+alert)

**Extracted from architecture-pattern research:** before aborting +
alerting the human, try one `reasoning_effort: high` re-dispatch of the
worker on a reasoning-capable model. This is a finer-grained lever than
"switch to a more expensive model" — it escalates reasoning *depth* at
the same model, not the model itself.

- **Trigger:** reviewer-reported capability failure (logic error, not
  transient: rate limit, network, timeout). The reviewer-loop's actual
  output format is `===== <model> =====` + free-text VERDICT +
  `ERROR: <reason>` lines + exit codes (0=pass, 1=fail, 2=error). The
  new structured-output parser (Step 4) classifies: transport `ERROR`
  lines → transient (retry review); verdict FAIL → capability (escalate
  worker). **Do NOT parse `STATUS: FAILED`** — that string does not
  exist in the code (hallucinated in v1.2). Build the parser on
  `--report <path>` JSON output (`{totalUsd, reviews:[{model, costUsd,
  content, usage}]}`) — the natural machine-readable substrate.
- **Action:** re-dispatch the **worker** (not the reviewer) with
  `reasoning_effort: high` on a reasoning-capable model (GLM-5.2 supports
  this; DeepSeek V4 Pro at `max` if added to the reviewer chain).
- **Budget:** consumes one additional worker dispatch within the existing
  per-task $ cap. No new budget — it's a use of the existing cap.
- **Cap:** one reasoning-depth escalation per task, then fall through to
  the existing abort + alert path.
- **Wire value:** `reasoning_effort: "high"` at the **top level** of the
  request body, NOT inside `provider: {}` (the source docs' placement was
  wrong). **Correction (v1.3):** `"max"` and `"xhigh"` are equivalent per
  OpenRouter docs (both ~95% of max_tokens) — use either interchangeably.
  The `max` vs `xhigh` "mismatch" from v1.2 was **not supported by
  documentation**. Step 0 spike verifies the headroom proxy passes
  `reasoning_effort` through (it should — the proxy forwards all
  top-level body params).

**Open:** does `reasoning_effort: high` route through the headroom proxy
correctly, or does the proxy strip it? Step 0 must verify.

---

## Done-condition (driver-verified, honest)

The agent's `DoneVerdict` is a **claim**, not proof. The driver verifies:
1. Tests pass (driver runs the test command)
2. Lint clean (driver runs the lint command)
3. Working tree clean (agent committed everything)
4. Green against rebased main (driver rebases task branch onto current
   main, re-runs tests — if the rebase itself conflicts, that's a merge
   signal, surfaced before the review gate)

"Spec matches" is **not** a mechanical claim — PR-Agent `/review` is
code-quality only and cannot verify acceptance-criteria conformance
(reviewer finding). Per-AC attestation is done by a different-family
reviewer + the human (see Automated gate).

---

## Automated review gate (inside loop, before human)

### Sequential review chain: logic first, security second

**Extracted from architecture-pattern research:** the review is a **Chain
of Responsibility** — sequential, not parallel. Reviewer 1 (logic) runs
first; if it fails, the task goes back to reasoning-depth escalation (see
Loop-breakers) or back to the worker. Only if logic passes does Reviewer 2
(security/policy) run. This saves a full review pass when logic is broken
(security review on broken logic wastes tokens).

### Reviewer seats — three-family diversity

| Seat | Model | Role | Why |
|---|---|---|---|
| Implementer | `z-ai/glm-5.2` | code generation | workhorse, evidence-backed |
| Reviewer 1 (logic) | `deepseek/deepseek-v4-pro-0813` | algorithmic reasoning, edge cases, anti-patterns | **net-new** — not in current stack; 1.6T params, 49B activated, 1M ctx, $0.3969/$0.7938 per M; `reasoning_effort: max` on this dated SKU |
| Reviewer 2 (security) | `qwen/qwen3.8-2.4t-a95b` | security policy, exception handling, code style, infra alignment | existing routing; different family from both implementer and logic reviewer |

Three-family diversity (GLM → DeepSeek → Qwen) directly addresses the
"correlated blind spots" risk from the model-tiered-agents note. The
existing reviewer-loop.ts used glm+kimi (same family as implementer for
the first seat) — this was a silent invariant break.

**Open:** does `deepseek/deepseek-v4-pro-0813` at $0.3969/$0.7938 per M
fit within the existing $2 reviewer-loop cap for typical review payloads?
Measure cost-per-review-pass in Step 4. The `-0813` SKU is a dated
release — OpenRouter may deprecate it; pin the slug and monitor.

### reviewer-loop.ts is NOT a drop-in — per-AC attestation is NEW work

`reviewer-loop.ts` is a **stateless one-shot dispatch** (read the code):
glm+kimi defaults, $2 cap, free-text VERDICT/FINDINGS output. It has no
loop, no per-AC mode, no structured-output parser. Per-AC attestation
requires:
- A new **per-AC rubric mode** (one verdict per acceptance criterion)
- **Structured output** (json_schema) + parser
- Tests for the parser

Step 4 is re-spec'd as new work, not "reuse reviewer-loop.ts."

### Family-disjointness (enforced, not assumed)

`reviewer-loop.ts` `DEFAULT_MODELS = glm + kimi` — **includes the
implementer's family** (glm-5.2). "Different family" silently breaks unless
the driver passes `--models` explicitly (`deepseek-v4-pro-0813,qwen3.8`)
and **asserts family-disjointness at startup** (implementer family ∉
reviewer families). With the 3-seat chain (GLM implementer → DeepSeek
logic → Qwen security), all three families are disjoint by construction.

### Budget semantics

The $2 cap is **post-hoc** (overspends then exits 1) — it bounds, doesn't
prevent. Rule: **"PASS but over-budget" = FAIL the gate.** A per-task
lifetime review budget must be stated (kick-backs re-fire reviews: up to 3
firings/task). Which budget pays (task budget vs harness review budget) is
specified in Step 4.

### Gate

Driver-verified tests+lint green AND reviewer-loop per-AC verdict PASS
(all ACs met) → reaches human. PR-Agent **dropped from v1** (deferred with
trigger: "when reviewer-loop.ts can't cover a code-quality dimension we
need").

---

## Human gate (Gate 2) — difit + decision CLI

### difit is display-only; the decision channel is a driver CLI

difit comments live in browser localStorage — there is no approve/kickback
callback. The human's choice reaches the driver via:

```
harness approve <id>          # → merge gate
harness kickback <id> <feedback>   # → In Progress, re-dispatch
harness replan <id> <reason>       # → To Do, human re-plans
harness stuck <id>                  # → view stuck evidence
```

### difit setup

- `difit --background` returns connection JSON including `{port, url, pid}`
  — **`pid` is the kill handle** for the "killer after decision" (the
  process must be killed, not just the browser tab). `--background`
  auto-adds `--keep-alive` + `--no-open` (server survives disconnect).
- `--comment` preloaded from reviewer-loop findings — schema:
  `{type: "thread"|"reply", filePath, position: {side: "new"|"old",
  line|{start, end}}, body}`, repeatable, dedupes duplicates
- **MVP: one summary thread per file** (positional PR-Agent→difit translation
  is deferred to the difit-review skill later — don't build a markdown parser
  against a moving upstream)
- **difit is NOT installed on this machine** (reviewer finding: not in PATH,
  no skill in `~/.agents/skills`). Step 5 has an explicit install/verify
  gate; fallback = terminal diff + PR-style comments
- **`--clean` flag** — clears stale localStorage comments on kick-back
  re-review of the same commit. Add `--clean` per review round to avoid
  showing stale human comments from a prior kick-back
- **Secret scrubbing** — the difit-review skill specifies "never copy
  secrets/credentials into `--comment` bodies." The findings→`--comment`
  preload pipeline must inherit this rule: scrub secrets from reviewer
  findings before passing to `difit --comment`

### Three actions (not two)

1. **Kick back to In Progress** with feedback → re-dispatch resuming from
   prior diff + appended feedback, never scratch
2. **Approve for merge** → merge gate
3. **Re-plan/reject** → To Do + reason (breaks ping-pong; without this,
   wrong tasks cycle forever)

### Feedback carrier

Backlog task **notes** (git-trackable; `task-flow.ts` already wraps
`--append-notes`), rendered into the resume prompt — **not** state.json.

### Kick-back worktree fate

On kick-back: worktree **kept** (resume from prior diff). On re-plan:
worktree **deleted** (fresh start). On approve: worktree deleted at merge.

### Failure-cascade breaker

Kick-back budget **K=2**: same failure signature after 2 human kick-backs →
**auto-escalate** (not auto-replan — re-splitting is WHAT-loop work; the
driver never writes code). Escalate = `To Do` + `replan` label + reason +
`stuck` + human re-plans.

---

## Merge gate

On approval:
1. **Re-rebase immediately before `git merge`** — main can move between
   human approval and merge under parallel dispatch (Step 6). A green-gated
   merge can still conflict at merge time.
2. `git merge task/<task-id>` against current main
3. **Clean merge** → `Done` + `merged` label, delete worktree, re-run
   scheduler eligibility check (event-driven, no polling)
4. **Conflict** → stop, surface to human. **Do NOT auto-resolve.** Log
   conflicted files with honest diagnosis: "DAG-wrong OR expected hot-file
   contention" — not "DAG was wrong" alone. Genuinely-independent tasks
   collide on hot files (this repo: every new script edits
   `bin/AGENTS.md` inventory + the 107KB runbook).

`git rerere` enabled — but near-worthless when conflicts are rare-by-design.
**One config line, not a build step.**

Whole workflow done when every task in the DAG reaches `Done` + `merged`.

---

## Crash / reconcile-on-startup

**state.json is re-derivable for geometry, NOT for counters.** Git recovers
worktree↔branch geometry + merge state only. `retry_count`, `$ used`,
`dispatch_id`, kick-back count, no-progress strikes are **not** in git and
**lost on crash**.

**Crash semantics (pessimistic, pre-committed):**
- unknown `retry_count` = ceiling (treat as exhausted)
- unknown `$ used` = ceiling (treat as over-budget)
- unknown `dispatch_id` = orphan (reconcile from `git worktree list`)
- Human resets counters after reviewing the stuck state

**Reconcile on startup:**
- Rebuild worktree↔branch geometry from `git worktree list` + `git branch -a`
- Rebuild task statuses from backlog.md
- Detect orphan worktrees (branches with no matching task, tasks with no
  matching branch) and surface them
- **Legacy rule:** the 2 existing worktrees (`deny-glob-source-of-truth`,
  `deterministic-harness-research`) violate the `task/<id>` convention —
  they're perpetual orphans under the reconcile rule; treat as manual /
  excluded from orphan alerts

**Mid-run backlog drift:** human may edit statuses while the driver runs.
Reconcile is not startup-only — **re-verify backlog status before dispatch
and before merge** (the task may have been human-moved to Done or To Do
while in flight).

**Self-modification hazard:** the harness lives in the repo it drives.
Merging a harness-touching task swaps the running driver's code. Required:
**restart-after-merge discipline** for tasks touching `bin/src/` paths
(driver restarts itself from the new HEAD after such a merge).

---

## Build order

### Step 0 — BLOCKING spike: opencode SDK invocation

Gate everything on this. Success criteria (enumerated up front):
- `createOpencode()` + `session.prompt({format: "json_schema"})` +
  `session.abort()` + `event.subscribe()` reliability under bun
- **v1 vs v2 surface** — pin which surface the `format` field lives on
  (reviewer finding: json_schema is v2-only)
- **Named events** — verify `session.idle`, `session.error`, `session.diff`,
  `session.compacted` fire as documented; wire the no-progress detector
  to `session.diff` (not manual diff hashing)
- **`noReply` context injection** — verify `session.prompt({body:
  {noReply: true}})` injects context without triggering a response
- **`StructuredOutputError` handling** — verify the error name appears in
  `result.data.info.error?.name` when structured output fails; test
  retry with simpler schema
- **Abort-cost semantics** — does `session.abort` yield a final cost chunk?
  Apply the pessimistic rule if not.
- **Abort deadline / kill ladder** — `session.abort(deadlineMs)` →
  `server.close()` via `ServerOptions.signal`
- **Plugin hooks fire under in-process serve** — `tool.execute.before/after`,
  custom `tool()`, `shell.env`, `experimental.session.compacting` (currently
  deferred to Step 2 — pull forward, discovery costs more there)
- **Deny-list enforcement** — native permission globs (`edit: {"backlog/**":
  "deny"}`) as primary; `tool.execute.before` as second layer; `--auto` /
  `permission: { "*": "allow" }` for everything not denied; `permission.asked`
  event as deny-list-miss detector
- **`reasoning_effort` through headroom proxy** — probe that the proxy
  passes `reasoning_effort` through (it should — proxy forwards all
  top-level body params). Use `"high"` (or `"max"`/`"xhigh"` — equivalent
  per docs). Verify no 400 errors.
- **Headroom CCR TTL probe** — `HEADROOM_CCR_TTL_SECONDS` default 1800s;
  verify long sessions don't silently degrade. Consider override for
  long autonomous runs.
- **Agent `steps` limit** — verify `steps: N` in agent config caps
  iterations and triggers summarize-and-recommend on hit

### Step 1 — driver skeleton + port + state schema + cycle/deadlock + backlog integration

- Read tasks via `backlog task list --json` (MCP) or `backlog task list --json`
  (CLI — MCP is a subset; CLI is the recommended integration path per docs)
- **Define `IAgentProvider` signatures** (not deferred) — include
  capability query, `NormalizedEvent` schema, `verdict()` failure path,
  model/reasoning selection via `TaskSpec`
- Toposort-free scheduler leaning on `--ready`; **cycle detection** +
  **deadlock watchdog** (`--ready` empty while non-Done tasks exist ⇒ alert)
- Confirm `--ready` excludes Done tasks (else filter)
- **Done-condition contract as a failing test first** (TDD — the test fails
  before any dispatch exists)
- `state.json` schema with pessimistic crash semantics documented
- **Conductor-boundary health assertion** — machine-checkable: verify the
  conductor's dispatch log shows zero file-write tool calls (the conductor
  never writes production code; if it starts, strip the capability). Cheap
  to add to the existing health-check script
- **`onStatusChange` callback** — configure a config-level shell command
  that fires on `{command, taskId, oldStatus, newStatus, taskTitle}`.
  Primary event channel for human-initiated status drift (replaces
  polling); re-verify as belt-and-braces
- **`milestone` for DAG phases** — create milestones for multi-phase
  efforts; tasks assigned to milestones are visible in the board grouped
- **DoD defaults** — `definition_of_done_defaults_upsert` with the
  4-point done-condition (tests+lint+clean+rebased-green); task-level DoD
  checklist mirrors the done-condition
- **`--modified-files`** — set on task creation for file→task traceability
  (useful for conflict diagnosis in Step 7)

### Step 2 — single-task dispatch end-to-end

- SDK provider, deny-list (native permission globs + `tool.execute.before`),
  done-check, state update
- **`--implementation-notes`** — driver writes progress to the task itself
  via `task edit --implementation-notes` (not just chat output)
- **`--modified-files`** — set on the task for file→task traceability
- **context7** — enable `context7_resolve-library-id` +
  `context7_query-docs` for worker sessions; worker prompt includes
  "consult current SDK docs before using unverified APIs"
- One task working: worktree creation, agent invocation, driver-verified
  done-condition, status update

### Step 3 — retry budget + no-progress detector + alert + reasoning-depth escalation

- Three caps (wall-clock, $, attempts), first wins
- **No-progress detector** — use `session.diff` event from the SDK (not
  manual diff hashing) for the diff-hash-unchanged check; use
  `session.error` for transient-vs-capability classification
- No-progress detector (tuple comparator, unit-tested)
- Split retry counters (inner-loop vs kick-back)
- **Reasoning-depth escalation** — one `reasoning_effort: high` re-dispatch
  on capability failure, before abort+alert. Gate on reviewer-reported
  capability failures only (not transient: rate limit, network, timeout).
  Trigger from the Step 4 structured-output parser (verdict FAIL →
  escalate worker; transport `ERROR` → retry review)
- Alert via `harness stuck <id>` CLI
- **Step 0 prerequisite:** probe `reasoning_effort` wire value through
  the headroom proxy (`"high"` — proxy passes through top-level body
  params; `"max"` = `"xhigh"` per docs, use either)

### Step 4 — sequential per-AC review chain (NEW work, re-spec'd)

- **Sequential chain, not parallel:** Reviewer 1 (logic, DeepSeek Pro)
  runs first → if FAIL, back to reasoning-depth escalation or worker
  → only if logic passes, Reviewer 2 (security, Qwen) runs
- Per-AC rubric mode on reviewer-loop.ts (one verdict per AC)
- **Structured output (json_schema) + parser + tests** — build the parser
  on `--report <path>` JSON output (`{totalUsd, reviews:[{model, costUsd,
  content, usage}]}`), not from zero. Classify: `ERROR` lines → transient
  (retry review); verdict FAIL → capability (escalate worker). Do NOT
  parse `STATUS: FAILED` (hallucinated — doesn't exist in the code)
- **3-family diversity:** implementer GLM / logic reviewer DeepSeek Pro /
  security reviewer Qwen. Driver passes `--models deepseek-v4-pro-0813,qwen3.8`
  explicitly. Assert family-disjointness at startup
- **DeepSeek V4 Pro 0813** — pin dated slug; `reasoning_effort: max` (or
  `xhigh` — equivalent per docs) at top level (not inside `provider: {}`).
  Measure cost-per-review-pass vs $2 cap
- **`--check-ac`** — use `task-flow.ts` `close` (note + `--check-ac` +
  status in one verified call) for the gate-pass transition, not raw
  status edits
- Per-task lifetime review budget (kick-backs re-fire: up to 3 firings)
- Rule: "PASS but over-budget" = FAIL

### Step 5 — difit human gate + three-action + kick-back budget

- **difit install/verify gate** (not installed today); fallback = terminal
- `harness approve|kickback|replan|stuck` decision CLI
- Feedback via backlog notes (`task-flow.ts` wraps `--append-notes`;
  `noReply: true` for context injection into the worker session)
- **`backlog decision` (CLI-only)** — record merge-gate decisions
  (approve/kickback/replan/conflict) as first-class markdown artifacts
  in `backlog/decisions/` with a status. Audit trail for gate history
- Kick-back budget K=2 → auto-escalate
- Worktree fate policy (kept on kick-back, deleted on replan/approve)
- **difit parallel lifecycle** — port allocation + **kill by `pid`**
  (from `--background` JSON) after decision; `--background` auto-adds
  `--keep-alive` + `--no-open`; `--clean` per review round for stale
  localStorage comments on kick-back re-review
- **Secret scrubbing** — scrub secrets from reviewer findings before
  passing to `difit --comment` (difit-review skill rule: "never copy
  secrets/credentials into `--comment` bodies")

### Step 6 — parallel dispatch + reconcile-on-startup

- Multiple eligible tasks at once
- Reconcile-on-startup (pessimistic: unknown counter = ceiling)
- Orphan worktree detection (legacy exclusion rule for the 2 existing)
- **Mid-run backlog drift re-verify** before dispatch and before merge
- Merge serialization order for parallel approvals

### Step 7 — merge gate + rerere + final-summary

- Re-rebase immediately before `git merge`
- Clean-merge path → `Done` + `merged` label, delete worktree, re-run eligibility
- **`--final-summary`** — write PR-style completion notes at merge time
  (merge SHA, cost, reviewer verdicts) via `task edit --final-summary`
- Conflict → bail to human, honest diagnosis (DAG-wrong OR hot-file
  contention); use `--modified-files` to trace which files each task
  touched for conflict diagnosis
- `git rerere` as one config line
- **Restart-after-merge discipline** for self-updating merges (driver paths)

---

## Bootstrap (dogfooding)

The harness itself is built in its own worktree — but the harness doesn't
exist yet to manage its own worktree. **Bootstrap paradox is benign:**
Steps 0–7 run in one manually-created worktree
(`.worktrees/agentic-worktree-harness`, branch
`plan/agentic-worktree-harness` — precedent exists: 2 manual worktrees
today). Self-ownership begins after Step 7, compiler-bootstrap style. This
plan + the two research notes are the first artifacts in that worktree.

---

## Explicitly out of scope (v1)

- PR-Agent (deferred; trigger: "when reviewer-loop.ts can't cover a
  code-quality dimension we need")
- **tavily** (deferred; trigger: "when workers get stuck on external-API
  errors a doc lookup would resolve." Research is WHAT-loop work; giving
  inner-loop workers open web search is scope leakage)
- Custom backlog.md statuses (unsupported; native enum + labels instead)
- `worktree_path` / `branch_name` in backlog.md (derive by convention)
- Automated conflict resolution (bail to human, honest diagnosis)
- `/improve` + `/describe` (markdown-only output, no gate value)
- Auto-split fallback logic (auto-escalate instead; re-splitting is
  WHAT-loop work)
- Multi-surface triggers (Slack/Telegram/GitHub webhooks)
- Workflow sharing / marketplace format
- Anything resembling a YAML DSL — plain TypeScript functions are enough
- Positional PR-Agent→difit translation (deferred to difit-review skill)
- External notifiers (alert channel = the `harness` CLI)
- **headroom MCP tools** (`headroom_compress`, `headroom_retrieve`,
  `headroom_stats`) — removal pending; use `POST /v1/compress` via fetch()
  for any programmatic compression
- **`OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS`** — experimental
  intra-session flag, considered-rejected (not needed for the worktree
  isolation pattern)

---

## Review-loop verdicts (this plan)

**Round 1** — two parallel reviewers, fresh contexts, different lenses. Both:
**APPROVE-WITH-FIXES.** All RED/YELLOW findings integrated above.

- **Reviewer 1 (lens: inner-loop contract + retry + state):** caught the
  v1/v2 SDK surface split, the false reconcile claim (counters not in git),
  difit-not-installed, 5-not-4 statuses, reviewer-loop.ts defaults include
  glm. All fixed.
- **Reviewer 2 (lens: DAG + merge + review-gate + cascade):** caught
  cycle-detection-nowhere, reviewer-loop.ts is stateless one-shot (per-AC
  is new code), $2 cap is post-hoc, difit is display-only (need decision
  CLI), auto-replan violates two-loop, conflict≠DAG-wrong, re-rebase-before-
  merge, restart-after-merge for self-updates. All fixed.

**Round 2** — architecture-pattern extraction (researcher cross-referenced
two pattern docs vs existing harness). 5 net-new concepts extracted and
integrated as v1.2 amendments (see changelog at top). ZDR header
hallucinated; `reasoning_effort` placement wrong; Flash-as-conductor and
Kimi-as-researcher rejected as cost regressions. See research note:
`docs/research/2026-08-23-architecture-pattern-extraction.md`.

**Round 3** — deep tool-integration audit (3 research notes + 1 reviewer
gap analysis). Every tool checked against its documentation; 6 research
notes produced. Findings integrated as v1.3 amendments (see changelog at
top). Key corrections: `STATUS: FAILED` hallucinated (replaced with actual
reviewer-loop outputs + `--report` JSON); `reasoning_effort: "max"` ≠
`"xhigh"` corrected (equivalent per docs); headroom framed as in-path
compression proxy (not just wire-value obstacle); difit `--background` JSON
includes `pid`; `--clean` + secret scrubbing added; opencode SDK named
events + `noReply` + permission policy + `StructuredOutputError` +
compacting hook + `steps` limit added; backlog.md `onStatusChange` +
`decision` + `--final-summary` + `--check-ac` + DoD + milestone +
`--modified-files` added; context7 enabled for workers; tavily deferred.

Research notes:
- `docs/research/2026-08-19-agentic-worktree-harness-tools.md` (tool
  verification: backlog.md, difit, PR-Agent, Archon)
- `docs/research/2026-08-19-opencode-headless-api-harness-binding.md`
  (opencode SDK vs CLI, Archon's IAgentProvider pattern, hybrid verdict)
- `docs/research/2026-08-23-architecture-pattern-extraction.md` (5
  extracts from architecture-pattern docs vs existing harness; ZDR
  hallucination; reasoning_effort correction; model-tiering rationale)
- `docs/research/2026-08-23-backlog-md-capability-audit.md` (full
  v1.50.1 surface audit; 10 underutilized capabilities; MCP is CLI
  subset; no custom frontmatter; onStatusChange, decisions, documents,
  DoD, milestones, modified-files, implementation-notes)
- `docs/research/2026-08-23-difit-opencode-sdk-integration.md` (difit
  CLI-only confirmed; opencode SDK full surface; plugins; agents;
  permission system; cross-cutting integration-layer verdict: MCP for
  backlog, SDK for opencode, CLI for difit — all match docs)
- `docs/research/2026-08-23-headroom-openrouter-tool-research.md`
  (headroom compression proxy in-path; OpenRouter full param list;
  reasoning_effort max=xhigh; zdr; caching/sticky routing; session_id
  interference; CCR TTL 1800s; MCP removal pending)
