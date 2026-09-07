---
date: 2026-08-19
topic: opencode non-interactive mode + programmatic API for harness binding
status: resolved
sources:
  - https://opencode.ai/docs
  - https://opencode.ai/docs/cli
  - https://opencode.ai/docs/sdk
  - https://opencode.ai/docs/plugins
  - https://opencode.ai/docs/server
  - https://github.com/coleam00/Archon
  - https://archon.diy/getting-started/ai-assistants/
  - https://archon.diy/reference/architecture/
models_used_for_research:
  - openrouter/z-ai/glm-5.2
supersedes: none
last_verified: 2026-08-19
---

# opencode non-interactive mode + programmatic API — harness binding decision

Scope: should a worktree-harness that launches an AI coding agent
non-interactively, bounded-retries, alert-on-stuck, bind to opencode's native
API or stay tool-agnostic via a CLI contract? Companion to
2026-08-19-agentic-worktree-harness-tools.md (that note covers backlog.md /
difit / PR-Agent / Archon at the plan level; this note deep-dives opencode's
own surface and the binding decision).

Budget used: 9 page fetches (opencode docs map + intro + cli + sdk + plugins +
server; Archon repo + ai-assistants + architecture).

---

## A. opencode non-interactive mode

### `opencode run` — headless one-shot

YES. opencode has a dedicated non-interactive subcommand:
`opencode run [message..]`. Docs call it out explicitly: "Run opencode in
non-interactive mode by passing a prompt directly. This is useful for
scripting, automation, or when you want a quick answer without launching the
full TUI."
Source: https://opencode.ai/docs/cli#run-1

Example: `opencode run "Explain the use of context in Go"`

### `run` flags (verified from the CLI page)

| Flag | Short | Purpose |
|---|---|---|
| `--command` | | Run a slash command, use message for args |
| `--continue` | `-c` | Continue the last session |
| `--session` | `-s` | Continue a specific session ID |
| `--fork` | | Fork session when continuing |
| `--share` | | Share the session |
| `--model` | `-m` | `provider/model` |
| `--agent` | | Agent to use |
| `--file` | `-f` | Attach file(s) to message |
| `--format` | | **`default` (formatted) or `json` (raw JSON events)** |
| `--title` | | Session title |
| `--attach` | | Attach to a running `opencode serve` instance (URL) |
| `--dir` | | **Working directory to run in** |
| `--port` | | Local server port (random default) |
| `--variant` | | Model variant (reasoning effort) |
| `--thinking` | | Show thinking blocks |
| `--auto` | | **Auto-approve permissions not explicitly denied** |

Source: https://opencode.ai/docs/cli#run-1

### What is MISSING from `run` (could NOT verify — not in docs)

- **No `--timeout` flag.** A driver must enforce wall-clock timeout itself
  (subprocess kill / AbortSignal).
- **No `--max-turns` / `--max-iterations` flag.** Turn budget is not a CLI
  surface.
- **No `--max-tokens` / `--max-cost` / `--budget` flag.** Token/cost budget is
  not a CLI surface. (`OPENCODE_EXPERIMENTAL_OUTPUT_TOKEN_MAX` env var exists
  but caps output tokens per LLM response, not cumulative run budget.)
  Source: https://opencode.ai/docs/cli#environment-variables
- **Exit-code semantics NOT documented.** The CLI page does not specify
  whether `run` exits 0 on success vs non-zero on failure/timeout/rate-limit.
  This is a GAP for a CLI-contract harness — a driver cannot distinguish
  "done" from "errored" from "rate-limited" from the exit code alone. The
  `--format json` stream is the only machine-readable signal (see below).
- **No result-file output.** `run` does not write a machine-readable result
  file; the driver must consume stdout (`--format json` for structured events,
  or scrape the formatted default output).

### Machine-readable output: `--format json`

`--format json` emits raw JSON events to stdout. This is the machine-readable
channel a driver polls. Combined with the SDK's `result` MessageChunk (which
carries `sessionId`, `tokens`, `cost`, `stopReason`, `numTurns`, `isError`,
`errorSubtype` — see section B / Archon's MessageChunk type which mirrors the
SDK), a driver can detect completion, cost, and error subtypes from the
stream rather than the exit code.
Source: https://opencode.ai/docs/cli#run-1 (flag table); MessageChunk shape
mirrored in https://archon.diy/reference/architecture/ (Archon consumes the
same SDK event vocabulary).

### Scoping / restriction

- **Worktree scoping:** `--dir <worktree-path>` sets the working directory.
  This is the primary isolation lever for a worktree harness.
- **File deny-list:** No CLI flag, but the **permissions system + plugins**
  enforce per-tool restrictions. The `.env` protection plugin example
  intercepts `read` tool calls and throws — same pattern works for any
  deny-list. `--auto` auto-approves anything not explicitly denied, so a
  harness would pair `--auto` with a deny-list plugin.
  Source: https://opencode.ai/docs/plugins#env-protection
- **Task spec on startup:** `--file/-f` attaches files to the message; a
  harness can pass a task-spec file. Or pass the spec inline as the message.

### Other non-interactive surfaces

- `opencode serve` — headless HTTP server (OpenAPI 3.1 at `/doc`).
  Source: https://opencode.ai/docs/server
- `opencode acp` — ACP (Agent Client Protocol) server over stdin/stdout
  nd-JSON. An alternative stdio contract for IDE-style integration.
  Source: https://opencode.ai/docs/cli#acp

---

## B. opencode plugin / programmatic API

### TypeScript SDK — `@opencode-ai/sdk` (in-process capable)

YES. opencode ships a type-safe JS/TS SDK on npm: `@opencode-ai/sdk`.
`createOpencode()` **starts both a server and a client in-process** — a TS
driver can import opencode as a library and call it without spawning a
subprocess. Alternatively `createOpencodeClient({ baseUrl })` connects to an
already-running `opencode serve` instance.
Source: https://opencode.ai/docs/sdk#create-client

```ts
import { createOpencode } from "@opencode-ai/sdk"
const { client } = await createOpencode()  // server + client, in-process
```

Options: `hostname`, `port`, `signal` (AbortSignal — cancellation!),
`timeout` (server-start timeout ms), `config` (inline Config override).
Source: https://opencode.ai/docs/sdk#options

### Session lifecycle API (the harness-relevant surface)

| Method | Purpose |
|---|---|
| `session.create({ body: { title } })` | Create a session |
| `session.prompt({ path: { id }, body: { parts, model?, ... } })` | **Send prompt, wait for AssistantMessage response** |
| `session.abort({ path: { id } })` | **Abort a running session** |
| `session.messages({ path: { id } })` | List messages (inspect what happened) |
| `session.command({ path, body })` | Execute a slash command |
| `session.shell({ path, body })` | Run a shell command in-session |
| `session.revert({ path, body })` | Revert a message (undo) |

Source: https://opencode.ai/docs/sdk#sessions

`session.prompt` is the blocking call that returns the AI response. The
`signal` option on `createOpencode` gives cancellation. `session.abort` gives
mid-run termination. **This is a clean programmatic inner-loop contract.**

### Structured output (done-condition checking via schema)

`session.prompt` accepts `body.format: { type: "json_schema", schema, retryCount }`.
The model uses a `StructuredOutput` tool to return validated JSON. On failure
after `retryCount` (default 2), returns `StructuredOutputError`. A harness can
use this to enforce a "done" verdict schema (e.g. `{ status: "complete" |
"blocked", summary: string }`) rather than scraping prose.
Source: https://opencode.ai/docs/sdk#structured-output

### Events (SSE stream for stuck detection)

`event.subscribe()` returns a server-sent events stream. Plugin event
vocabulary includes `session.idle`, `session.error`, `session.status`,
`message.updated`, `tool.execute.before/after`, `permission.asked/replied`.
A driver can watch `session.idle` for completion and detect no-progress (no
`message.updated` / `tool.execute.after` for N ms) for stuck detection.
Source: https://opencode.ai/docs/sdk#events ; https://opencode.ai/docs/plugins#events

### Plugin system (inject custom tools, hooks, done-checker)

YES — full plugin SDK. Plugins are TS/JS modules in `.opencode/plugins/` or
npm packages, exporting a function that receives `{ project, directory,
worktree, client, $ }` and returns a hooks object.
Source: https://opencode.ai/docs/plugins

Hook surface relevant to a harness:
- `tool.execute.before` / `tool.execute.after` — intercept/gate every tool
  call (the `.env` protection and inject-env examples show the pattern).
- `event` — subscribe to all events inside the agent process.
- `experimental.session.compacting` — inject context on compaction.
- **Custom tools:** `tool()` helper with Zod schema — a plugin can register a
  `done_check` tool the agent must call, or a `alert_human` tool.
- `shell.env` — inject env vars into all shell execution.

The plugin context receives `worktree` (the git worktree path) — first-class
worktree awareness.

**No explicit "done-condition checker" hook exists by name**, but the
combination of `tool.execute.after` + a custom `done_check` tool + the
structured-output schema covers it: the harness injects a tool the agent
calls to signal done, and the structured-output schema validates the final
verdict.

### Server mode (HTTP / OpenAPI)

`opencode serve` exposes the full API over HTTP with an OpenAPI 3.1 spec at
`/doc`. Every SDK method maps to an HTTP endpoint. A non-TS driver (Python,
Go, shell) can drive opencode over HTTP instead of importing the SDK.
Source: https://opencode.ai/docs/server

---

## C. Archon's inner-loop contract (reference harness)

### How Archon launches its inner agent

Archon supports 5 assistants via an `IAgentProvider` interface. The launch
mechanism differs per provider:
Source: https://archon.diy/reference/architecture/#adding-ai-agent-providers ;
https://archon.diy/getting-started/ai-assistants/

- **Claude Code:** shells out to the `claude` CLI binary
  (`CLAUDE_BIN_PATH` / `claudeBinaryPath` / autodetect). The provider wraps
  the Claude Agent SDK's `query()` async generator.
- **Codex:** shells out to the `codex` CLI binary (`CODEX_BIN_PATH` /
  `codexBinaryPath` / vendor dir / autodetect). Wraps the Codex SDK event
  stream.
- **OpenCode:** uses `@opencode-ai/sdk` directly — "Archon's OpenCode adapter
  uses `@opencode-ai/sdk`". "Archon always runs OpenCode as a managed
  embedded runtime — it spawns and owns the OpenCode server process,
  generates a random server password per session, and tears it down when the
  workflow completes. Connecting to an external OpenCode server (baseUrl) is
  not supported."
  Source: https://archon.diy/getting-started/ai-assistants/#opencode-community-provider
- **Pi, Copilot:** community providers via their respective SDKs.

### The IAgentProvider contract (tool-agnostic by design)

```ts
interface IAgentProvider {
  sendQuery(prompt, cwd, resumeSessionId?, options?): AsyncGenerator<MessageChunk>
  getType(): string
  getCapabilities(): ProviderCapabilities
}
```

`MessageChunk` is a discriminated union: `assistant | system | thinking |
result | rate_limit | tool | tool_result`. The `result` chunk carries
`sessionId`, `tokens`, `cost`, `stopReason`, `numTurns`, `isError`,
`errorSubtype`, `resumed`. This is the portable contract every provider
implements.
Source: https://archon.diy/reference/architecture/#iagentprovider-interface

### Worktree isolation

`IIsolationProvider` with `WorktreeProvider` as default. Creates git worktrees
at `~/.archon/workspaces/<owner>/<repo>/worktrees/<branch>/`. Branch naming by
workflow type (`issue-42`, `task-my-feature`, etc.). Adoption: reuses
existing worktree at expected path before creating new.
Source: https://archon.diy/reference/architecture/#isolation-providers

### Retry / budget / alert behavior

- **Loop nodes:** YAML `loop: { prompt, until: <condition>, max_iterations: N,
  fresh_context: true }`. `until` conditions include `ALL_TASKS_COMPLETE`,
  `APPROVED`, or a string like `"DONE"`. `max_iterations` caps iterations.
  Source: https://github.com/coleam00/Archon (README workflow example);
  https://archon.diy/guides/loop-nodes/
- **Structured-output retry:** enforced providers (Claude/Codex/OpenCode) fail
  on schema miss; best-effort providers (Pi/Copilot) re-ask up to 3x then
  fail the node.
  Source: https://archon.diy/getting-started/ai-assistants/#structured-output-guarantees
- **Cost limits (`maxBudgetUsd`):** NOT enforced for any provider. "Cost
  tracked in result chunks, but no runtime budget enforcement." This is a
  known gap — Archon tracks cost ex post in the `result` MessageChunk but
  does not halt a run mid-flight on budget breach.
- **Sandbox:** not native in any SDK; Archon relies on worktree isolation
  only.
- **Stuck detection / human alert:** Archon's alerting surface is the
  **approval node** (`loop: { until: APPROVED, interactive: true }` pauses for
  human input) and the workflow run status (`pending | running | completed |
  failed | cancelled`). There is no documented "no-progress-for-N-turns to
  alert" primitive; that is left to workflow design (a loop node with
  `max_iterations` whose `until` never triggers -> run fails -> human sees
  `failed` status).

### OpenCode-specific limitations in Archon (relevant to harness design)

Archon's own capability matrix for the OpenCode provider:
- Hooks: not supported ("Archon's per-node hooks field is Claude-SDK-shaped;
  the OpenCode provider has no translation site, so a node's hooks: is ignored").
- Effort/reasoning control: not supported. Thinking control: not supported
  (auto-enabled by model).
- Fallback model: not supported. Cost limits: not supported. Sandbox: not
  supported.
- Session resume: supported (single-agent only). MCP: supported. Structured
  output: supported. Tool restrictions: supported. Skills: supported.
Source: https://archon.diy/getting-started/ai-assistants/#supported-archon-features

**Implication:** Archon treats opencode as a black-box provider via the SDK
client surface only — it does NOT use opencode's plugin hooks for done-
checking or budget enforcement. Archon enforces structure at the workflow-DAG
layer (loop nodes, max_iterations, approval gates), not inside the agent.

---

## D. Retry + budget + alert patterns (comparable harnesses)

### Archon (verified above)
Loop nodes with `until` + `max_iterations`; structured-output retry (3x);
cost tracked but NOT enforced; no native stuck-detection; human alerting via
approval nodes + failed-run status.

### Aider, Claude Code `--print`, Cursor, Devin
**COULD NOT VERIFY within budget.** Not fetched. What I know from training
data (unverified, do NOT cite): Claude Code has a `--print` / `-p` headless
mode and a `--max-turns` flag; Aider has `--message` for one-shot scripting;
Devin is closed-source. These claims need live verification before use.

### opencode itself (verified)
No built-in retry/budget/alert primitives in the `run` CLI or SDK session
API. Budget enforcement and stuck-detection must be implemented by the
driver. The primitives available to a driver are: `session.abort` (kill),
`signal` (AbortSignal cancellation), the SSE event stream (for no-progress
detection), and the `result` chunk's `cost`/`tokens`/`numTurns` fields (for
ex-post budget accounting). A plugin's `tool.execute.after` hook can
accumulate cost mid-run and throw to halt.

---

## E. Verdict: tool-agnostic CLI contract vs opencode-native SDK

### The tradeoff

**Tool-agnostic CLI contract** (`opencode run --format json --dir <worktree>
--auto "prompt"`, or any agent with an equivalent one-shot-exit surface):
- Portable — swap opencode for Claude Code `-p`, Aider `--message`, etc.
  with a thin adapter.
- Process isolation — subprocess crash does not take down the driver.
- Simple to reason about — spawn, read JSON stream, check exit.
- No mid-run control — cannot abort cleanly (must SIGKILL), cannot inject
  context, cannot enforce structured done-verdict, cannot run a done-checker
  tool, cannot intercept tool calls for deny-list or budget-halt.
- Exit-code semantics undocumented for opencode `run` — driver must parse
  the JSON stream to distinguish success/failure/rate-limit, and even then
  the `result` chunk's `errorSubtype` is the only signal (no exit code).
- No budget enforcement inside the agent — driver can only kill on
  wall-clock timeout or ex-post cost from the final `result` chunk.

**opencode-native SDK** (`createOpencode()` in-process, or `serve` + HTTP):
- Full control — `session.abort` for clean mid-run kill, `signal` for
  cancellation, SSE events for stuck-detection, `session.prompt` with
  `format: json_schema` for enforced done-verdict.
- Plugin hooks — `tool.execute.before/after` for deny-list + budget-halt
  (throw to stop); custom `done_check` / `alert_human` tools injected via
  plugin; `shell.env` for secret injection.
- Worktree-aware — plugin context receives `worktree` path.
- Structured output with `retryCount` — built-in retry on schema miss.
- Binds to opencode — swapping the inner agent means re-implementing the
  provider interface (though Archon's `IAgentProvider` shows the shape).
- In-process coupling — an opencode crash takes down the driver (mitigate:
  run `serve` as a subprocess and use the HTTP client, or run the SDK in a
  worker thread).

### Recommendation: hybrid — define a portable contract, implement opencode-native first

**Define a thin `IAgentProvider`-style contract** (mirroring Archon's):
`sendQuery(prompt, cwd, opts) -> AsyncGenerator<Event>` where `Event` includes
`result { cost, tokens, numTurns, isError, errorSubtype, stopReason }` and
`abort()` is available. This is the tool-agnostic seam — any future agent
(Claude Code, Codex, Pi) implements it.

**Implement the opencode provider via `@opencode-ai/sdk`** (in-process or
`serve`+HTTP), NOT via `opencode run` subprocess. Specific reasons:
1. **Budget enforcement needs in-process hooks.** opencode `run` has no
   budget flag and undocumented exit codes; the only way to halt mid-run on
   cost is a `tool.execute.after` plugin hook that accumulates spend and
   throws. That requires the plugin system, which requires the SDK / server,
   not the `run` CLI.
2. **Done-condition checking needs structured output + custom tools.** The
   `format: json_schema` on `session.prompt` + a plugin-injected
   `done_check` tool gives a deterministic done-signal. The `run` CLI cannot
   inject tools.
3. **Stuck detection needs the event stream.** SSE `session.idle` +
   `message.updated` timestamps give no-progress detection. The `run` CLI's
   `--format json` gives events too, but without abort you can only SIGKILL.
4. **Archon validates the approach.** Archon's OpenCode adapter uses
   `@opencode-ai/sdk` with a managed embedded runtime (spawns + owns the
   server, random password, tears down on completion). That is the exact
   pattern to copy.

**Keep `opencode run --format json` as a fallback / smoke-test path** — useful
for quick one-shots where budget/stuck-detection are not needed, and as the
shape any future CLI-only provider would match.

### What the harness must build itself (opencode does NOT provide)

- **Cumulative cost budget with mid-run halt:** opencode tracks cost per
  `result` chunk but does not enforce a ceiling. The harness wraps the SDK
  call in a budget accumulator; on breach, call `session.abort` (SDK) or
  SIGKILL (CLI). A plugin `tool.execute.after` hook can halt earlier (before
  the next LLM call) — this is the most cost-effective halt point.
- **Max-turns / max-iterations:** not a native opencode surface. The harness
  counts `tool.execute.after` events and aborts at N.
- **Stuck detection (no progress for N turns):** watch the SSE stream for
  `message.updated` / `tool.execute.after`; if silence > threshold, abort +
  alert.
- **Human alerting:** not an opencode primitive. The harness emits an alert
  (Slack/email/backlog task) when abort-on-budget or abort-on-stuck fires.
  Archon's equivalent is the `failed` workflow-run status + approval nodes —
  no proactive "stuck" alert.

---

## Unresolved questions

1. **opencode `run` exit codes** — are they 0/non-0, and do they distinguish
   timeout/rate-limit/success? NOT documented. Needs source-code inspection
   or empirical test. (Affects only the CLI-fallback path, not the SDK
   recommendation.)
2. **Aider `--message` / Claude Code `-p` / Cursor / Devin** budget/retry/
   alert surfaces — not fetched this round. If the harness needs to support
   multiple agents beyond opencode, these need their own research notes.
3. **opencode plugin lifecycle under `serve`** — does a plugin's
   `tool.execute.after` hook fire when driven over HTTP (vs in-process SDK)?
   The docs show plugins load at server startup, so yes, but the
   budget-accumulator state would live in the plugin process, not the driver
   process — needs verification if using the `serve`+HTTP path.
4. **`session.abort` semantics** — does it produce a final `result` chunk
   with partial cost, or just kill? Affects budget accounting on abort.
