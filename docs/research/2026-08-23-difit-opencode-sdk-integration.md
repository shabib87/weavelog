---
date: 2026-08-23
topic: difit + opencode SDK integration verification for harness plan
status: verified-live
sources:
  - https://github.com/yoshiko-pg/difit (README, fetched 2026-08-23)
  - https://raw.githubusercontent.com/yoshiko-pg/difit/main/skills/difit-review/SKILL.md (fetched 2026-08-23)
  - https://opencode.ai/docs/sdk/ (fetched 2026-08-23)
  - https://opencode.ai/docs/plugins/ (fetched 2026-08-23)
  - https://opencode.ai/docs/server/ (fetched 2026-08-23)
  - https://opencode.ai/docs/mcp-servers/ (fetched 2026-08-23)
  - https://opencode.ai/docs/cli/ (fetched 2026-08-23)
  - https://opencode.ai/docs/agents/ (fetched 2026-08-23)
models_used_for_research:
  - z-ai/glm-5.2
supersedes: none
---

# difit + opencode SDK integration verification

Verifies whether the harness plan integrates difit and opencode per their
official documentation. Each section ends with a verdict.

Last verified: 2026-08-23

---

## 1. difit — what it provides

**Verified facts:**

difit is a CLI tool (npm package `difit`, Node.js >= 21) that spins up a local
Express web server to display git commit diffs in a GitHub-style "Files changed"
view. Core capabilities:

- **Local CLI + web viewer**: `difit <target>` starts a server on port 4966
  (configurable via `--port`) and opens a browser. React 18 + Vite frontend,
  Express + simple-git backend.
- **`--comment` preload**: repeatable flag accepting a JSON object or array.
  Supported types: `thread` (new comment at diff position) and `reply` (reply
  to latest thread at same position). Positions specify `side: "new"|"old"` and
  `line` (number or `{start, end}` for ranges). Duplicate comments are skipped.
- **`--background` orchestration**: flag description reads "Keep the server
  running in the background and output JSON connection info." The exact JSON
  field names are NOT documented in the README — see Open Questions.
- **`--pr` mode**: fetches PR patches via `gh pr diff --patch` and imports
  unresolved inline review threads as startup comments. Requires GitHub CLI auth.
- **stdin mode**: pipe unified diffs from any tool (`git diff | difit`,
  `cat patch | difit`, `difit -` for explicit stdin).
- **Comment system**: browser localStorage per commit; "Copy Prompt" button
  formats comments for AI agents; "Copy All Prompt" exports structured format.

Source: https://github.com/yoshiko-pg/difit

**Verdict: integrated per docs** — the harness plan's use of `--comment`,
`--background`, and CLI invocation matches the documented interface.

---

## 2. difit-review skill — automated review

**Verified facts:**

YES, the `difit-review` skill exists. Installed via `npx skills add yoshiko-pg/difit`.
Two skills are installed:

- `difit` — asks the user for a review through difit after code changes
- `difit-review` — reviews a specific diff/PR, then launches difit with
  findings preloaded as `--comment` arguments

The `difit-review` SKILL.md specifies:

1. Agent inspects the diff (local git revision, GitHub URL, patch file)
2. Agent prepares review comments as `--comment` JSON arguments
   (`type: "thread"`, `position.side: "new"|"old"`, line or range)
3. Agent launches `<difit-command> <target> [compare-with] --comment '...'`
4. Agent shares the difit URL and finishes

Key constraints from the skill:
- For PR reviews: "inspect the PR locally and keep the review result limited to
  difit output. Do not post comments back to remote GitHub."
- Never copy secrets/credentials into `--comment` bodies
- Use `difit` if `command -v difit` succeeds, else `npx difit`
- No manual verification of the launched difit page required

Source: https://raw.githubusercontent.com/yoshiko-pg/difit/main/skills/difit-review/SKILL.md

**Verdict: integrated per docs** — the skill is designed exactly for the
harness's automated-review-then-human-review flow. The harness should install
and invoke this skill rather than reimplementing the comment-preload logic.

---

## 3. difit `--background` — programmatic orchestration

**Verified facts:**

The `--background` flag exists and is documented as: "Keep the server running
in the background and output JSON connection info." This is the only
programmatic orchestration interface difit provides.

**What could NOT be verified:**

The exact JSON schema returned by `--background` is not documented in the
README. Based on the flag description and the `--port` (default 4966) and
`--host` (default 127.0.0.1) options, the JSON likely contains at minimum a
URL and port, but the field names are unconfirmed from documentation alone.
The source code (`src/` directory) was not fetched.

**Verdict: partially integrated** — the flag exists and is the correct
orchestration mechanism, but the harness plan should not assume a specific JSON
schema without either (a) running `difit --background` to capture the output, or
(b) reading the source in `src/`.

---

## 4. difit MCP integration

**Verified facts:**

difit is **CLI-only**. There is no MCP server, no SDK, no programmatic HTTP API.
The Express server serves the web viewer (static React app + diff data
endpoints for the frontend), not a general-purpose API for external callers.

The only integration surfaces are:
1. CLI flags (`--comment`, `--background`, `--pr`, `--no-open`, stdin)
2. Agent skills (`difit`, `difit-review`) — which are themselves CLI wrappers
3. The web viewer URL (for human consumption)

Source: https://github.com/yoshiko-pg/difit

**Verdict: integrated per docs** — the harness plan correctly treats difit as
CLI-only. There is no MCP or API layer to integrate.

---

## 5. difit — per-diff vs branch watching

**Verified facts:**

difit is designed for **per-diff invocation**. Each run targets a specific diff
(commit, branch comparison, staging area, working tree, or PR). There is no
watch mode, no daemon that monitors a branch, and no persistent server that
auto-refreshes on new commits.

The `--keep-alive` flag keeps the server running after browser disconnects
(stopped manually with Ctrl+C), but this is for keeping a single view alive,
not for watching new diffs.

The `--background` flag is the closest to programmatic use: it starts the
server in the background and outputs JSON, but the server still serves a single
diff. To review a new diff, the harness must start a new difit instance.

The proper harness integration pattern:
1. Harness detects a diff (commit, PR, staged changes)
2. Harness (or difit-review skill) prepares `--comment` JSON with findings
3. Harness calls `difit <target> --comment '...' --background --no-open`
4. Harness parses JSON output for URL/port
5. Harness presents URL to human (or opens browser)
6. Human reviews in difit web viewer, adds comments, copies prompts

Source: https://github.com/yoshiko-pg/difit

**Verdict: integrated per docs** — per-diff invocation is the correct pattern.
Branch watching is not a difit capability and should not be assumed.

---

## 6. opencode SDK — what `@opencode-ai/sdk` exposes

**Verified facts:**

The SDK (`@opencode-ai/sdk`, npm) is a type-safe JS/TS client for the opencode
HTTP server. It exposes:

**Factory functions:**
- `createOpencode({ hostname, port, signal, timeout, config })` — starts both
  a server and a client. Returns `{ client, server }`. Server URL available at
  `opencode.server.url`.
- `createOpencodeClient({ baseUrl, fetch, parseAs, responseStyle, throwOnError })`
  — client-only, connects to an already-running server.

**Session API (key methods):**
- `client.session.create({ body: { title } })` — create session
- `client.session.prompt({ path: { id }, body: { parts, model?, agent?, noReply?, format? } })`
  — send prompt and wait for response. `noReply: true` injects context without
  triggering AI response. Supports `format` for structured JSON output.
- `client.session.abort({ path: { id } })` — abort running session
- `client.session.list()` / `client.session.get({ path: { id } })` — list/get
- `client.session.messages({ path: { id } })` — list messages
- `client.session.command({ path, body })` — execute slash command
- `client.session.shell({ path, body })` — run shell command
- `client.session.revert({ path, body })` / `unrevert({ path })` — revert/restore
- `client.session.share({ path })` / `unshare({ path })` — share/unshare
- `client.session.summarize({ path, body })` — summarize session
- `client.session.children({ path })` — list child sessions (subagent sessions)

**Event API:**
- `client.event.subscribe()` — SSE stream. Returns async iterable.
  Usage: `for await (const event of events.stream) { ... }`

**Other APIs:**
- `client.global.health()` — health check
- `client.app.agents()` — list available agents
- `client.app.log({ body })` — structured logging
- `client.project.list()` / `client.project.current()`
- `client.config.get()` / `client.config.providers()`
- `client.find.text({ query })` / `client.find.files({ query })` / `client.find.symbols({ query })`
- `client.file.read({ query })` / `client.file.status({ query })`
- `client.tui.*` — TUI control (appendPrompt, submitPrompt, showToast, etc.)
- `client.auth.set({ path, body })` — set provider credentials
- `client.path.get()` — current path

**Structured output:**
- `body.format: { type: "json_schema", schema: {...}, retryCount?: number }`
- Response: `result.data.info.structured_output` (validated JSON)
- Error: `result.data.info.error?.name === "StructuredOutputError"`

Source: https://opencode.ai/docs/sdk/

**Verdict: integrated per docs** — the SDK exposes `createOpencode`,
`session.prompt`, `session.abort`, and `event.subscribe` exactly as the harness
plan expects. The `noReply` option for context injection and structured output
support are additional capabilities the harness can leverage.

---

## 7. opencode MCP server mode

**Verified facts:**

opencode does **NOT** expose an MCP server. It exposes an HTTP server with an
OpenAPI 3.1 spec (viewable at `http://<host>:<port>/doc`). The architecture is:

```
opencode serve  ->  HTTP server (OpenAPI 3.1)  <-  SDK client / HTTP client
                                                       (NOT MCP protocol)
```

opencode is an MCP **client** — it consumes external MCP servers (local via
`command` array, or remote via `url`). MCP tools become available to the LLM
alongside built-in tools. But opencode itself is not drivable via MCP.

The server is started via:
- `opencode serve [--port 4096] [--hostname 127.0.0.1] [--cors ...]` — headless
- `createOpencode()` — SDK starts server + client in-process
- `opencode` (TUI) — starts both TUI and server (random port, or `--port`)

The SDK is the documented-recommended way to drive opencode programmatically:
"Use it to build integrations and control opencode programmatically."

Sources:
- https://opencode.ai/docs/server/ — "runs a headless HTTP server that exposes an OpenAPI endpoint"
- https://opencode.ai/docs/mcp-servers/ — MCP servers are consumed, not exposed
- https://opencode.ai/docs/sdk/ — "type-safe JS client for opencode server"

**Verdict: integrated per docs** — the harness plan correctly uses the SDK (not
MCP) to drive opencode. There is no MCP server mode to integrate. The harness
should use `createOpencode()` for in-process control or `createOpencodeClient()`
to connect to a running `opencode serve` instance.

---

## 8. opencode non-interactive mode

**Verified facts:**

Three documented paths for non-interactive use, in order of programmatic control:

1. **SDK (most control)**: `createOpencode()` + `client.session.prompt()` +
   `client.event.subscribe()` + `client.session.abort()`. Full control over
   sessions, events, structured output, mid-session abort. Recommended for
   harness integration.

2. **CLI `run` (simplest)**: `opencode run "prompt"` — accepts prompt directly,
   prints response. Flags: `--format json` (raw JSON events), `--agent`,
   `--model`, `--auto` (auto-approve permissions), `--attach <url>` (connect to
   running `opencode serve`), `--continue`/`--session` (resume), `--file`
   (attach files), `--title`, `--thinking`.

3. **HTTP server (raw API)**: `opencode serve` then HTTP calls to
   `POST /session/:id/message` (sync, wait for response) or
   `POST /session/:id/prompt_async` (async, 204 No Content).

The `--attach` flag on `opencode run` is notable: it lets you start a
long-lived `opencode serve` and then fire multiple `run` commands at it,
avoiding MCP server cold-boot on each invocation.

Sources:
- https://opencode.ai/docs/cli/#run-1
- https://opencode.ai/docs/sdk/
- https://opencode.ai/docs/server/

**Verdict: integrated per docs** — the harness plan's use of the SDK for
in-process control is the documented-recommended path. CLI `run` with
`--format json` is a viable fallback for simpler use cases.

---

## 9. opencode agent/bot mode

**Verified facts:**

YES, opencode has configurable agents for autonomous task execution:

**Built-in agents:**
- **Build** (primary, default) — all tools enabled, full development
- **Plan** (primary) — restricted, file edits and bash set to `ask` by default
- **General** (subagent) — multi-step tasks, full tool access except todo
- **Explore** (subagent) — read-only, fast codebase exploration
- **Scout** (subagent) — read-only, external docs/dependency research
- **Compaction/Title/Summary** (primary, hidden) — system agents

**Autonomous execution config:**
- `steps` (formerly `maxSteps`, deprecated) — limits agentic iterations before
  forced text-only response. When limit hit, agent receives a system prompt
  instructing it to summarize work and recommend remaining tasks.
- `--auto` flag (CLI) / `permission: { "*": "allow" }` (config) — auto-approve
  permissions not explicitly denied
- `OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS` env var — enable background
  subagent tasks
- `mode: "primary" | "subagent" | "all"` — controls how agent is invoked
- `hidden: true` — hide from autocomplete, still invocable via Task tool
- `permission.task` — glob patterns controlling which subagents an agent can
  invoke (last matching rule wins)

**Custom agents:** JSON config in `opencode.json` or markdown files in
`.opencode/agents/` / `~/.config/opencode/agents/`. Markdown frontmatter
becomes agent config; body becomes system prompt.

**Non-interactive autonomous pattern:**
```
opencode run --auto --agent build "Implement feature X according to spec Y"
```
Or via SDK:
```
client.session.create({ body: { title: "autonomous task" } })
client.session.prompt({ path: { id }, body: { agent: "build", parts: [...] } })
// listen for session.idle event
```

Source: https://opencode.ai/docs/agents/

**Verdict: integrated per docs** — opencode's agent system supports autonomous
task execution with step limits, auto-approve, and subagent delegation. The
harness can use custom agents with `steps` limits and `--auto` for controlled
autonomy.

---

## 10. opencode plugin system — hooks and custom tools

**Verified facts:**

YES, the plugin system lets the harness inject custom tools, hooks, and
permissions.

**Plugin loading:**
- Local files: `.opencode/plugins/` (project) or `~/.config/opencode/plugins/` (global)
- npm packages: `"plugin": ["pkg-name"]` in opencode.json
- Load order: global config -> project config -> global plugin dir -> project plugin dir
- Plugins are JS/TS modules exporting a function that returns a hooks object

**Plugin context:** `{ project, client, $, directory, worktree }`
- `client` — an opencode SDK client (plugins have full SDK access)
- `$` — Bun shell API for command execution

**Available hooks (complete list from docs):**

| Hook | Purpose |
|------|---------|
| `tool.execute.before` | Intercept/modify tool calls before execution |
| `tool.execute.after` | Act on tool call results |
| `event` | Subscribe to all events (generic catch-all) |
| `shell.env` | Inject environment variables into all shell execution |
| `experimental.session.compacting` | Customize compaction context/prompt |
| `tool` | Define custom tools (using `tool()` helper + Zod schema) |

**Event types (subscribable via `event` hook or `client.event.subscribe()`):**

- Command: `command.executed`
- File: `file.edited`, `file.watcher.updated`
- Installation: `installation.updated`
- LSP: `lsp.client.diagnostics`, `lsp.updated`
- Message: `message.part.removed`, `message.part.updated`, `message.removed`, `message.updated`
- Permission: `permission.asked`, `permission.replied`
- Server: `server.connected`
- Session: `session.created`, `session.compacted`, `session.deleted`, `session.diff`, `session.error`, `session.idle`, `session.status`, `session.updated`
- Todo: `todo.updated`
- Shell: `shell.env`
- Tool: `tool.execute.after`, `tool.execute.before`
- TUI: `tui.prompt.append`, `tui.command.execute`, `tui.toast.show`

**Custom tools:** Plugins can define tools using `tool()` from `@opencode-ai/plugin`:
```ts
tool({ description, args: zodSchema, execute: async (args, ctx) => result })
```
Plugin tools take precedence over built-in tools with the same name.

**Key plugin examples from docs:**
- `.env` protection (block reads of `.env` via `tool.execute.before`)
- Environment variable injection (`shell.env` hook)
- Session completion notifications (`event` hook -> `session.idle`)
- Compaction context injection (`experimental.session.compacting`)

Source: https://opencode.ai/docs/plugins/

**Verdict: integrated per docs** — the plugin system provides the hooks the
harness needs: `tool.execute.before/after` for tool interception, `session.idle`
for completion detection, `session.diff` for diff tracking, `permission.asked/
replied` for permission gating, and `tool` for custom tool injection. The
harness should use plugins (not external polling) for event-driven integration.

---

## 11. Cross-cutting: right integration layer for each tool

### backlog.md via MCP — CORRECT

The harness already uses the backlog.md MCP server (confirmed by the MCP tools
available in this session: `backlog_task_*`, `backlog_document_*`, etc.). The
MCP server provides structured state management with type-safe tool calls.
The CLI is a fallback for human/TUI use, not the primary programmatic interface.

**Recommendation from docs:** MCP is the correct layer for programmatic state
management. The existing research note `2026-08-16-work-management-layer-selection.md`
covers the adoption decision. No change needed.

**Verdict: integrated per docs**

### opencode via SDK — CORRECT

The SDK docs explicitly state: "Use it to build integrations and control
opencode programmatically." The SDK wraps the HTTP server API with type safety,
provides `createOpencode()` for in-process server+client, `session.prompt()`
for sending prompts, `session.abort()` for cancellation, and `event.subscribe()`
for real-time SSE events. This is strictly more capable than CLI `run` (no
event stream, no mid-session abort, no structured output).

**Recommendation from docs:** SDK is the primary integration layer. Use
`createOpencode()` for in-process control, or `createOpencodeClient()` to
connect to a long-running `opencode serve` instance. Plugins provide
event-driven hooks for tighter integration (session.idle, tool.execute.before,
etc.).

**Verdict: integrated per docs**

### difit via CLI — CORRECT (only option)

difit has no MCP server, no SDK, no HTTP API. The CLI is the only integration
surface. The `--background` flag provides JSON output for programmatic
orchestration, and `--comment` provides the preload mechanism. The
`difit-review` skill wraps the CLI for the automated-review flow.

**Recommendation from docs:** CLI is correct and only option. Use
`difit <target> --comment '...' --background --no-open` for programmatic
invocation, parse the JSON output for the URL, and present it to the human.
Install the `difit-review` skill for the review-then-launch flow.

**Verdict: integrated per docs**

### Integration-layer summary

| Tool | Available layers | Recommended layer | Why |
|------|-----------------|-------------------|-----|
| backlog.md | MCP server, CLI, agent instructions | **MCP** | Type-safe structured state; CLI is human-facing |
| opencode | SDK, CLI (`run`/`serve`), HTTP API, plugins | **SDK + plugins** | In-process control, event stream, abort, structured output; plugins for hooks |
| difit | CLI only | **CLI** | Only available interface; `--background` for JSON, `--comment` for preload |

The harness plan's proposed layering (MCP for backlog, SDK for opencode, CLI
for difit) matches each tool's documented recommendation. No better pattern
exists — each tool's docs point to the same layer the plan already selects.

**Overall verdict: integrated per docs** across all three tools.

---

## Open questions

1. **difit `--background` JSON schema**: The README documents the flag but not
   the exact JSON field names. The harness must either (a) run `difit --background`
   once to capture the output shape, or (b) read the source in `src/` to confirm.
   Marked as `partially integrated` in section 3.

2. **opencode `run --format json` output shape**: The CLI docs mention
   `--format json` for "raw JSON events" but do not show the JSON structure.
   If the harness uses CLI `run` as a fallback, this shape needs verification.
   Not blocking if the SDK is the primary path (SDK response types are
   documented and generated from OpenAPI).

3. **opencode ACP mode**: `opencode acp` starts an Agent Client Protocol server
   (stdin/stdout, nd-JSON). Not researched in depth. Could be relevant if the
   harness needs stdio-based agent communication instead of HTTP. Not blocking.

4. **backlog.md MCP vs CLI for the harness**: Not researched in this dispatch
   (out of scope). The existing note `2026-08-16-work-management-layer-selection.md`
   covers the adoption decision. The harness already uses the MCP server.

---

## What was NOT checked

- difit source code (`src/` directory) — only README and SKILL.md were fetched
- difit npm package internals or changelog
- opencode source code (`packages/sdk/` directory) — only docs pages were fetched
- opencode ecosystem/community plugins — only the plugin system docs were reviewed
- opencode permissions docs (`/docs/permissions/`) — referenced but not fetched
- opencode custom tools docs (`/docs/custom-tools/`) — referenced but not fetched
- opencode skills docs (`/docs/skills/`) — referenced but not fetched
- backlog.md documentation — covered by prior research note, not re-researched
- Whether `opencode run --format json` output matches SDK event types
