---
date: 2026-08-16
topic: opencode.ai/docs capabilities (August 2026) — hooks, workflows, subagents, plugins, permissions, config, skills
status: verified-live
sources:
  - https://opencode.ai/docs/
  - https://opencode.ai/docs/rules/
  - https://opencode.ai/docs/permissions/
  - https://opencode.ai/docs/agents/
  - https://opencode.ai/docs/plugins/
  - https://opencode.ai/v2/docs/build/plugins
  - https://opencode.ai/v2/docs/agents
  - https://github.com/anomalyco/opencode/blob/dev/packages/plugin/src/index.ts
  - https://github.com/anomalyco/opencode/issues/29059
  - https://github.com/anomalyco/opencode/issues/20387
models_used_for_research: [openrouter/z-ai/glm-5.2]
supersedes: none
---

# opencode.ai/docs capabilities (August 2026)

What opencode offers for building deterministic agentic workflows, verified
against the live docs site (fetched 2026-08-16, "Last updated: Aug 16, 2026")
and the plugin source on `dev`. The docs are split into a stable v1 surface
(`opencode.ai/docs/*`) and a newer V2 surface (`opencode.ai/v2/docs/*`); both
are live. V2 adds a transform-hook + runtime-hook plugin API and richer agent
config. The workflow engine is **in-flight** (PR #29789 + #32167, not merged
to `dev` as of this dispatch).

## Docs site structure (verified 2026-08-16)

The nav (`opencode.ai/docs/`) groups capabilities into **Usage**, **Configure**,
and **Develop**:

- **Usage**: Go, TUI, CLI, Web, IDE, Zen, Share, GitHub, GitLab
- **Configure**: Tools, **Rules**, **Agents**, Models, Themes, Keybinds,
  **Commands**, Formatters, **Permissions**, **Policies**, LSP Servers,
  **MCP servers**, ACP Support, **Agent Skills**, References, Custom Tools
- **Develop**: **SDK**, **Server**, **Plugins**, Ecosystem

(https://opencode.ai/docs/ — fetched 2026-08-16)

## Config format: where everything lives

| Artifact | Location | Purpose |
|---|---|---|
| Project config | `opencode.json` or `opencode.jsonc` in project root | `$schema: https://opencode.ai/config.json`; agents, permissions, instructions, MCP servers, plugins |
| Global config | `~/.config/opencode/opencode.json` | Same schema, user-wide defaults |
| Project rules | `AGENTS.md` at project root (+ nested) | Custom instructions injected into LLM context |
| Global rules | `~/.config/opencode/AGENTS.md` | Personal rules across all sessions |
| Agent defs | `.opencode/agents/*.md` (project) or `~/.config/opencode/agents/*.md` (global) | Markdown with frontmatter; filename = agent ID |
| Agent Skills | `.opencode/skills/` + `~/.config/opencode/skills/` (per `/docs/skills/`) | SKILL.md packages |
| Local plugins | `.opencode/plugins/` (project) or `~/.config/opencode/plugins/` (global) | JS/TS modules |
| MCP servers | declared in `opencode.json` under `mcp` (per `/docs/mcp-servers/`) | stdio/SSE/streamable-http |

**Claude Code compatibility** (verified in `/docs/rules/`): opencode falls back to
`CLAUDE.md` if no `AGENTS.md` exists, and to `~/.claude/CLAUDE.md` if no
`~/.config/opencode/AGENTS.md` exists. Disable with
`OPENCODE_DISABLE_CLAUDE_CODE=1` (or split: `_PROMPT=1` / `_SKILLS=1`).
Precedence: local files (traversing up) -> global -> Claude Code fallback;
first match wins in each category. (https://opencode.ai/docs/rules/)

The `instructions` field in `opencode.json` lets you pull in external files
(`CONTRIBUTING.md`, `docs/guidelines.md`, `.cursor/rules/*.md`, even remote URLs
with a 5s fetch timeout) and combine them with `AGENTS.md`. This is opencode's
answer to Claude Code's `@import` — but opencode does **not** parse `@file`
references inside `AGENTS.md` automatically; you either use the `instructions`
field or teach the agent to `Read` referenced files via explicit instructions.
(https://opencode.ai/docs/rules/)

## The hook system (the deterministic enforcement layer)

opencode has two hook surfaces. The **v1 plugin hook system** (in
`packages/plugin/src/index.ts` on `dev`) defines a `Hooks` interface with these
events:

**Session/message hooks:**
- `chat.message` — fires on new user message; can mutate `message` + `parts`.
- `chat.params` — modify `temperature`, `topP`, `topK`, `maxOutputTokens`,
  `options` before LLM call.
- `chat.headers` — modify HTTP headers before provider dispatch.
- `experimental.chat.messages.transform` — transform the message array.
- `experimental.chat.system.transform` — transform the system-prompt array.
- `experimental.session.compacting` — inject `context[]` or replace the entire
  compaction `prompt` before summarization.
- `experimental.compaction.autocontinue` — enable/disable the synthetic
  "continue" turn after compaction.
- `experimental.text.complete` — modify completed text.
- `experimental.provider.small_model` — override the small-model selection.

**Tool/permission hooks:**
- `tool.execute.before` — fires before a tool runs; can mutate `args` (block by
  throwing).
- `tool.execute.after` — fires after; mutates `title`/`output`/`metadata`.
- `tool.definition` — mutate a tool's `description` + `parameters` before the
  LLM sees it.
- `permission.ask` — intercept a permission request; set `status` to
  `ask`/`deny`/`allow`.
- `command.execute.before` — fires before a slash command runs; can inject
  `parts`.
- `shell.env` — mutate env for shell commands (per `cwd`/`sessionID`/`callID`).

**Lifecycle:** `event` (subscribe to the public event stream), `config` (on
config load), `dispose` (cleanup).

(https://github.com/anomalyco/opencode/blob/dev/packages/plugin/src/index.ts)

The **V2 plugin API** (`opencode.ai/v2/docs/build/plugins`) wraps this in a
typed `ctx` with two hook families:

- **Transform hooks** (modify how opencode is configured): `agent.transform`,
  `catalog.transform`, `command.transform`, `integration.transform`,
  `reference.transform`, `skill.transform`, `tool.transform`.
- **Runtime hooks** (intercept live operations): `ctx.aisdk.hook("sdk")`,
  `ctx.aisdk.hook("language")`, `ctx.session.hook("context")` (mutate
  `system` + `messages` + `tools` immediately before model dispatch),
  `ctx.session.hook("http.request")`, `ctx.session.hook("http.response")`,
  `ctx.tool.hook("execute.before")` (mutate `input` before tool runs),
  `ctx.tool.hook("execute.after")` (terminal `result` or `error`).

V2 also ships a first-class **Effect API** (`@opencode-ai/plugin/effect`) for
typed, scoped plugins with automatic finalizer/fiber cleanup.
(https://opencode.ai/v2/docs/build/plugins)

**Key gap vs Claude Code:** opencode hooks can block/modify/inject static text,
but **cannot spawn a reactive sub-agent from a hook**. Claude Code's
`"type": "agent"` hook (a `PreToolUse` hook that spawns a lightweight model to
analyze changes and return `additionalContext`) has no opencode equivalent.
Issue #20387 proposes adding `output.agent = { prompt, model, tools, timeout }`
to `tool.execute.before`; it is open, not merged. Without it, "OpenCode plugin
hooks can only *react* (block/allow/modify), never *analyze and advise*."
(https://github.com/anomalyco/opencode/issues/20387)

## Permissions model (deterministic gate)

Verified from `/docs/permissions/` (fetched 2026-08-16). The `permission` config
resolves each action to `allow` / `ask` / `deny`. Granular object syntax with
wildcards (`*` = zero-or-more, `?` = exactly one); **last matching rule wins**.

Available permission keys (the deterministic knobs):

| Key | Gates | Notes |
|---|---|---|
| `read` | `read` | file path match; `.env` denied by default |
| `edit` | `write`, `edit`, `apply_patch` | file path match |
| `glob` | `glob` | pattern match |
| `grep` | `grep` | regex match |
| `bash` | `bash` | parsed-command match (`git status --porcelain`) |
| `task` | subagent dispatch | matches subagent type |
| `skill` | `skill` | matches skill name |
| `lsp` | LSP queries | non-granular |
| `question` | asking the user | |
| `webfetch` | `webfetch` | URL match |
| `websearch` | `websearch` | query match |
| `external_directory` | any tool touching paths outside the worktree | defaults to `ask` |
| `doom_loop` | the same tool call repeating 3x with identical input | defaults to `ask`; spin detection |

`--auto` mode (or `opencode run --auto`) auto-approves anything not explicitly
`deny`-ed. Per-agent permissions merge with global; agent rules take precedence.
(https://opencode.ai/docs/permissions/)

The `doom_loop` permission is opencode's built-in spin detector — the
deterministic guard against an agent repeating itself. This is the opencode
analogue of the "separate model checks whether you are done" primitive Addy
describes, but implemented as a permission rule, not a second model.

## Subagents / agents

Verified from `/docs/agents/` + `/v2/docs/agents`. Built-in agents:

| Agent | Mode | Purpose |
|---|---|---|
| Build (`build`) | primary | default coding agent; all tools; sensitive env reads ask |
| Plan (`plan`) | primary | planning; edits denied; shell allowed |
| General (`general`) | subagent | multi-step research; broad tools; cannot spawn subagents |
| Explore (`explore`) | subagent | read-only: `read`, `glob`, `grep`, `webfetch`, `websearch` |
| Scout (`scout`) | subagent | read-only external docs/dependency research; clones into managed cache |

V2 adds hidden `compaction`, `title`, `summary` system agents (not selectable).
V2 agent `mode`: `primary` (main agent only), `subagent` (child session only),
`all` (either). Subagents run in **child sessions with fresh context**; the
parent's `subagent` permission controls which it may launch. `@`-mention a
visible subagent to delegate. (https://opencode.ai/v2/docs/agents)

Agent config (V2, in `opencode.json` under `agents`): `description`, `mode`,
`model` (e.g. `anthropic/claude-sonnet-4-5#high`), `system`, `color`, `steps`
(max model turns), `permissions` (ordered array of `{action, resource, effect}`;
last match wins; global rules apply first, then agent-specific), `hidden`,
`disabled`. Markdown agent files in `.opencode/agents/` use frontmatter +
body-as-system.

## The workflow engine (in-flight, NOT merged)

opencode does **not** ship a deterministic workflow/pipeline engine on `dev`
as of 2026-08-16. The capability is being built in two related PRs:

- **PR #29789** (issue #29059): `.opencode/workflows/` TypeScript workflow files,
  discovered statically (no code execution at discovery). An engine `ctx` API:
  `ctx.agent({agent, prompt, model?, schema?, permissionSessionID?})` returns
  `{data, text}` (a `schema` forces structured output, fails
  `WorkflowStructuredOutputError` if not JSON — never silent plaintext);
  `ctx.parallel(...)` for fan-out; `ctx.pipeline(items, ...stages)` for
  per-item staging with checkpoints. `/workflow <name> arg=value` runs in
  background; `/workflows` opens a TUI dashboard of runs (status icons, live
  logs, retries, token count, costs). Persisted run history; pause/resume via a
  persisted journal; per-run approval gate; HTTP API at `/workflow`. A single
  built-in workflow `deep-research` (phases: plan/research/verify/synthesize).
  (https://github.com/anomalyco/opencode/issues/29059)

- **PR #32167** (superset of #29789): nested sub-agent spawning (depth <= 5),
  worktree isolation, an approval gate, headless `opencode run --workflow`, an
  `ultracode` keyword/toggle for orchestration. The two PRs are the same
  lineage; #32167 is a genealogical superset. A consolidation branch exists
  (`dzianisv/opencode/tree/feat/workflows-consolidated`) that merges clean onto
  current `dev`.

**Implication:** today, to build a deterministic multi-step workflow in opencode
you have two paths — (a) wire it yourself via the plugin hook system
(`tool.execute.before/after` + `permission.ask` + slash `commands`), or (b) wait
for the workflow engine to merge. There is no first-class `Workflow` primitive
in shipped opencode yet.

## Skills, commands, formatters, policies, references, custom tools

- **Agent Skills** (`/docs/skills/`): SKILL.md packages, progressive disclosure,
  loaded from `.opencode/skills/` + `~/.config/opencode/skills/` + Claude Code
  compat `~/.claude/skills/`. The `skill` permission gates loading.
- **Commands** (`/docs/commands/`): slash commands; custom ones definable.
- **Formatters** (`/docs/formatters/`): auto-format on write (the "agent doesn't
  waste tokens on whitespace" hook Addy describes).
- **Policies** (`/docs/policies/`): exists in the nav; not fetched in this
  dispatch. Likely the enterprise/governance layer (the nav groups it near
  Permissions + LSP + MCP).
- **References** (`/docs/references/`): reference material injectable into
  context.
- **Custom Tools** (`/docs/custom-tools/`): user-defined tools beyond the
  built-in `read`/`edit`/`glob`/`grep`/`bash`/`webfetch`/`websearch`/`task`/
  `skill`/`lsp`/`question`.

## CLI / automation / scripting integration

- `opencode` — TUI.
- `opencode run "<prompt>"` — headless one-shot; `--auto` to skip approvals.
- `opencode run --workflow` — headless workflow execution (in-flight, PR #32167).
- `/init` — scan the repo and write/update `AGENTS.md`.
- `/undo`, `/redo` — revert/redo changes.
- `/share` — create a shareable conversation link.
- `/connect` — configure a provider (Zen recommended for new users).
- Tab — switch primary agents (Build <-> Plan); `switch_agent` keybind.
- `@` — fuzzy-search files; `@`-mention a subagent to delegate.
- SDK (`/docs/sdk/`) + Server (`/docs/server/`) for programmatic access.

(https://opencode.ai/docs/)

## What opencode's deterministic layer looks like, summarized

| Deterministic primitive | opencode mechanism | Status |
|---|---|---|
| Run checks after every edit | `tool.execute.after` hook + `command.execute.before` | shipped (plugin API) |
| Block destructive bash | `permission.bash` with `deny` rules + wildcards | shipped |
| Auto-format on write | Formatters (`/docs/formatters/`) | shipped |
| Spin detection | `doom_loop` permission (3x repeat -> ask) | shipped |
| External-path gating | `external_directory` permission | shipped |
| Subagent dispatch with isolation | `task` tool + child sessions + `subagent` permission | shipped |
| Compaction policy | `experimental.session.compacting` + `.autocontinue` hooks | shipped |
| Pre/post tool analysis via a spawned model | **`type: agent` hook** | **NOT shipped** (issue #20387 open) |
| Deterministic multi-step pipeline | **workflow engine** (`.opencode/workflows/`, `ctx.agent/parallel/pipeline`) | **NOT shipped** (PR #29789/#32167 in-flight) |
| Structured output from a step | `schema` on `ctx.agent` (workflow engine) or `tool.definition` transform | workflow engine in-flight; tool transform shipped |

## Open questions

1. Does `/docs/policies/` overlap with `/docs/permissions/` (enterprise governance
   vs per-action gates), or is it a distinct deterministic layer? — NOT fetched;
   the nav places it between Permissions and LSP Servers, suggesting
   enterprise/network policy. Needs a dedicated fetch.
2. The V2 docs (`opencode.ai/v2/docs/*`) are live but the v1 docs
   (`opencode.ai/docs/*`) are also live and updated 2026-08-16. Which is
   canonical? The v1 `/docs/agents/` still lists `Scout` as a built-in subagent;
   V2 `/v2/docs/agents` says "There is no built-in `scout` agent in V2." Are
   these parallel releases, or is V2 the next major? — UNVERIFIED; the
   install instructions and most nav links point at v1.
3. The workflow engine's `ctx.agent({schema})` forces structured output via
   `WorkflowStructuredOutputError` — but the shipped V2 plugin
   `tool.transform` + `tool.hook("execute.before")` does not obviously enforce
   JSON schema on a tool's *return*. Is structured output only available inside
   the workflow engine, or can a plugin force it on any tool today? —
   UNVERIFIED; the plugin `tools.add` registration mentions `output` with
   Effect/Standard-Schema validation but the v1 `Hooks` interface does not
   surface a schema-forcing field.
4. `doom_loop` fires after 3 identical repeats — is the threshold configurable?
   The `/docs/permissions/` page does not show a config knob for the count. —
   UNVERIFIED.
