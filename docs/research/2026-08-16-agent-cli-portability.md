---
date: 2026-08-16
topic: Agent CLI portability patterns — opencode vs claude code vs codex vs pi.dev vs hermes; the minimal inner-harness contract; emerging standards (AGENTS.md, MCP, SKILL.md)
status: verified-live
sources:
  - https://agents.md/
  - https://codersera.com/blog/agents-md-complete-guide-2026/
  - https://chatcode.dev/articles/agents-md-claude-md-best-practices
  - https://tomevault.io/fix/agents-md-vs-claude-md
  - https://thepromptshelf.dev/blog/does-claude-code-support-agents-md-2026/
  - https://getknack.ai/blog/agents-md-monorepo
  - https://benjamincrozat.com/agents-md
  - https://github.com/anthropics/claude-code/issues/50778
  - https://github.com/ruvnet/metaharness
  - https://github.com/ruvnet/metaharness/blob/main/docs/adrs/ADR-004-host-integration-model.md
  - https://github.com/ruvnet/agent-harness-generator/blob/main/docs/adrs/ADR-003-generator-architecture.md
  - https://pi.dev/
  - https://www.npmjs.com/package/metaharness
  - https://github.com/azrlb/hermes-pi-dev-team
  - https://code.claude.com/docs/en/hooks
  - https://opencode.ai/docs/
  - https://opencode.ai/docs/rules/
  - https://opencode.ai/docs/permissions/
  - https://addyosmani.com/blog/agent-skills/
  - https://addyosmani.com/blog/new-sdlc-vibe-coding/
models_used_for_research: [openrouter/z-ai/glm-5.2]
supersedes: none
---

# Agent CLI portability patterns

What an "inner harness" would need from any agent CLI host, which tools provide
each capability, and the emerging standards (AGENTS.md, MCP, SKILL.md) that make
portability possible. Verified 2026-08-16. The metaharness project
(github.com/ruvnet/metaharness) is the most concrete portability-contract
synthesis found; it ships 10 host adapters and an explicit `HostCapabilities`
interface. Claude Code's hooks system is the richest native hook surface; Pi
deliberately ships without MCP; Hermes bridges via `optional-mcps/`.

## The portability contract: what an inner harness needs from a host

Derived from metaharness ADR-004's `HostAdapter` + `HostCapabilities`
(https://github.com/ruvnet/metaharness/blob/main/docs/adrs/ADR-004-host-integration-model.md).
An inner harness needs the outer host to provide, at minimum:

| Capability | Why the inner harness needs it | HostCapabilities field |
|---|---|---|
| **Config file** | Where the host reads its settings | `configFileFormat` + `configFileLocation` |
| **Instructions file** | Where the agent reads project rules | `hostInstructionsFile` |
| **MCP registration** | How the harness exposes its tools to the agent | `supportsMcp: stdio\|http\|both\|none` |
| **Hook system** | Where deterministic enforcement runs | `supportsHooks: native\|kernel-side-only` |
| **Tool-call API** | How the agent invokes harness-provided tools | `supportsToolCallApi: native\|mcp-bridged\|function-calling` |
| **Model invocation** | How the harness calls the LLM | `invokeModel(req): Promise<ModelResponse>` |
| **Subagent dispatch** | Spawning child sessions for fan-out / maker-checker | `supportsBackgroundAgents: boolean` |
| **Thinking-block support** | Whether the host emits/scrubs thinking blocks | `supportsThinkingBlocks: boolean` |
| **Smoke test** | Asserting the harness can spawn one agent that lists tools | `smokeTest(harness): Promise<SmokeResult>` |
| **Output post-processing** | Host-specific cleanup (e.g. Hermes thinking-block scrubbing) | `postProcessAgentOutput(text): string` |

When a host lacks a capability (e.g. Pi has no MCP, no native hooks), the
metaharness kernel **compensates out-of-band**: `bridgeHooks` returns `null` and
the kernel runs hooks itself; the Pi adapter ships as a Pi extension
(`pi.registerTool`) bypassing MCP; the harness's `bin/` wrapper fires
kernel-side hooks before/after the Pi session.

## Tool-by-tool comparison (verified 2026-08-16)

| Capability | opencode | Claude Code | OpenAI Codex | Pi (pi.dev) | Hermes (hermes-agent) |
|---|---|---|---|---|---|
| **Config file** | `opencode.json` / `opencode.jsonc` (JSON) | `.claude/settings.json` (JSON, 3-scope) | `~/.codex/config.toml` (TOML) | `.pi/` + `~/.pi/agent/` (JSON) | `cli-config.yaml` (YAML) |
| **Instructions file** | `AGENTS.md` (native) + `CLAUDE.md` fallback | `CLAUDE.md` (native; `AGENTS.md` via `@import` only) | `AGENTS.md` (native, root + nested + `~/.codex/AGENTS.md`) | `AGENTS.md` + `SYSTEM.md` | `HERMES.md` |
| **Hooks** | Plugin hooks: `tool.execute.before/after`, `chat.*`, `permission.ask`, `command.execute.before`, `shell.env`, `tool.definition`, `experimental.session.compacting` (v1 `Hooks` interface) + V2 transform/runtime hooks | **Richest native surface**: 3-level shape `event -> matcher -> handler[]`; 5 handler types (`command`, `http`, `mcp_tool`, `prompt`, `agent`); 10 events (`SessionStart`, `Setup`, `UserPromptSubmit`, `PreToolUse`, `PostToolUse`, `PostToolUseFailure`, `Stop`, `SubagentStart`, `SubagentStop`, `FileChanged`); matchers like `"Bash(rm *)"` | **No hooks** (TOML config, no lifecycle hook system) | **No native hooks** (kernel-side only; the harness `bin/` wrapper fires them) | **No native lifecycle hooks** (kernel-side only; kernel wraps session start/end) |
| **MCP support** | Native (`mcp` in `opencode.json`; stdio/SSE/streamable-http) | Native (`claude mcp add`; stdio/HTTP) | Native (`[mcp_servers.*]` in `config.toml`) | **Deliberately none** ("No MCP. Build CLI tools with READMEs, or build an extension that adds MCP support." — https://pi.dev/) | Native (`optional-mcps/*.yaml` + `mcp_serve.py`; stdio) |
| **Subagent dispatch** | `task` tool, child sessions, `subagent` permission, `@`-mention | `Task` tool, Agent Teams (teammates that message each other) | Subagents on demand, `.codex/agents/*.toml` | Extensions via `pi.registerTool`/`registerCommand`; no native subagent primitive | Hermes = orchestrator; Pi = worker via CLI child process (process isolation) |
| **Skills/plugins** | `.opencode/skills/` SKILL.md + `.opencode/plugins/` JS/TS + npm plugins | `.claude/skills/` SKILL.md + Claude marketplace plugins | `.codex/agents/*.toml` + skills | Pi packages (npm/git), extensions (TS modules), skills, prompt templates | Skills loaded at session start (`-s`), `~/.hermes/skills/dev-team/` |
| **File ops** | `read`, `edit`/`write`/`apply_patch`, `glob`, `grep` | `Read`, `Edit`, `Write`, `Glob`, `Grep` | filesystem ops | filesystem ops | filesystem ops |
| **Bash execution** | `bash` (permission-gated, wildcard match on parsed command) | `Bash` (matcher hooks like `"Bash(git commit*)"`) | shell exec | shell exec | shell exec |
| **Structured output** | `tool.definition` transform; `ctx.agent({schema})` in-flight workflow engine | `type: agent` hook returns `additionalContext` (structured) | TOML agents | function-calling | tool-call parsing, `tools.json` schema |
| **Deterministic workflow engine** | **In-flight** (`.opencode/workflows/`, `ctx.agent/parallel/pipeline`, PR #29789/#32167) | `workflows` (Claude Code dynamic workflows, hidden feature) | `AGENTS.md`-driven; no named engine | `/harness` autonomous loop (pi-harness-runtime package); job state machine, task DAG | vibe-loop/work-loop skills (orchestration brain) |

## Emerging standards (the portability substrate)

### AGENTS.md — the cross-tool instruction standard

- **Steward**: Linux Foundation's Agentic AI Foundation. 60K+ repos adopt it.
  (https://codersera.com/blog/agents-md-complete-guide-2026/)
- **Native support**: Codex (root + nested + `~/.codex/AGENTS.md` + 32 KiB cap +
  `AGENTS.override.md`), Cursor, GitHub Copilot, Gemini CLI (alongside
  `GEMINI.md`), Jules, Windsurf, Aider, Zed, Warp, Factory (root + nested +
  `~/.factory/AGENTS.md`), Devin, Amp, Kilo (falls back to `AGENT.md` singular),
  RooCode, Augment, JetBrains Junie, Ona, UiPath, Semgrep, **opencode**,
  goose, Phoenix, VS Code Copilot custom agents.
- **Claude Code**: reads `CLAUDE.md`, NOT `AGENTS.md` directly. Workaround:
  `@AGENTS.md` as the first line of `CLAUDE.md` (import, max 5 hops, cross-
  platform) OR `ln -s AGENTS.md CLAUDE.md` (Unix, no Claude-specific extensions
  possible). Anthropic's stated reasons: backward compat, Claude-specific
  extensions (`@import`, `claudeMdExcludes`, `.claude/rules/` path-scoped
  rules), hierarchy semantics (parent->current->subdir), auto-memory integration.
  (https://thepromptshelf.dev/blog/does-claude-code-support-agents-md-2026/)
- **Monorepo precedence (the unresolved ambiguity)**: Codex walks **root-down**
  (concatenates, 32 KiB combined cap, leaf appears last -> wins on paper);
  Claude Code walks **cwd-up** (parent files at launch, subdir files on demand
  when Claude touches a file there); the AGENTS.md spec says only "the nearest
  file in the directory tree takes precedence" — ambiguous (Codex chose
  concatenation, some chose nearest-only). Issue #135 proposes v1.1 to nail
  this down. (https://getknack.ai/blog/agents-md-monorepo)
- **Practical guidance**: "if you would tell every new engineer this, it belongs
  in AGENTS.md. If only the engineer using Claude Code, it belongs in
  CLAUDE.md. If it's a packaged reusable capability with code, it belongs in a
  SKILL.md. If it changes every task, it stays in the prompt."
  (https://codersera.com/blog/agents-md-complete-guide-2026/)

### MCP (Model Context Protocol) — the tool-integration standard

Every host except Pi supports MCP. Pi's rejection is deliberate and documented:
"a single MCP server can burn 10,000+ tokens of context window — Pi's
tool-via-extension model avoids that cost." An out-of-tree MCP shim exists
(`nicobailon/pi-mcp-adapter`) but the Pi adapter in metaharness bypasses it and
ships as a Pi extension instead. (ADR-004 §pi.dev)

### SKILL.md (agentskills.io) — the reusable-capability standard

The Agent Skills spec: a folder with `SKILL.md` (frontmatter + instructions) +
optional `references/`, `assets/`, `scripts/`. Progressive disclosure — only
`name` + `description` (~100 tokens) load at startup; full body loads on trigger;
references load on demand. Portable across Claude Code, Cursor, Gemini CLI,
Codex, Aider, Windsurf, opencode. The same `SKILL.md` works in any harness that
accepts system-prompt content. (Addy Osmani,
https://addyosmani.com/blog/agent-skills/)

### A2A (agent-to-agent) — mentioned but not verified

Addy's SDLC post mentions "Coordination between agents runs on open standards:
MCP for tools, A2A for handing work to other agents."
(https://addyosmani.com/blog/new-sdlc-vibe-coding/) — A2A is named but not
further verified in this dispatch.

## The "kernel-side hooks" fallback pattern

When a host has no native hook system (Pi, Codex, Hermes), the inner harness
runs hooks **out-of-band** via the `bin/` wrapper: it fires kernel-side hooks
before and after the host session. This is the metaharness pattern
(`supportsHooks: 'kernel-side-only'`). The tradeoff: the hooks run outside the
agent's context window, so they cannot inject `additionalContext` the way
Claude Code's `type: prompt` or `type: agent` hooks can. They can block, log,
and gate — but they cannot advise the model mid-turn. This is the fundamental
portability gap: **reactive sub-agent spawning from a hook is Claude-Code-only
as of Aug 2026.** opencode issue #20387 proposes adding it; it is open.

## Claude Code's hook system (the reference surface)

From metaharness ADR-004, citing https://code.claude.com/docs/en/hooks:

- **Three-level shape**: `event -> matcher -> handler[]`
- **Five handler types**: `command` (run a shell cmd), `http` (call a URL),
  `mcp_tool` (invoke an MCP tool), `prompt` (inject text into the agent's
  context), `agent` (spawn a sub-agent that uses tools and returns
  `additionalContext`).
- **Ten events**: `SessionStart`, `Setup`, `UserPromptSubmit`, `PreToolUse`,
  `PostToolUse`, `PostToolUseFailure`, `Stop`, `SubagentStart`, `SubagentStop`,
  `FileChanged`.
- **Matchers**: a pseudo-DSL, e.g. `"Bash(rm *)"` matches a `Bash` tool call
  whose command matches `rm *`.

This is the richest native hook surface among the five tools. The `type: agent`
handler is the one no other host replicates — it is what makes Claude Code's
"deterministic gate that can also analyze and advise" possible.

## The Hermes + Pi team pattern (orchestrator + worker, process-isolated)

The `azrlb/hermes-pi-dev-team` repo
(https://github.com/azrlb/hermes-pi-dev-team) shows a portable pattern: Hermes
is the orchestrator (manages the pipeline, escalates failures through a
retry -> different-approach -> model-upgrade -> web-research -> deep-research chain,
never dead-ends to a human). Pi is the worker — **dispatched as isolated CLI
child processes, one per story**, not via MCP. "If Pi crashes, Hermes is
unaffected — process isolation by design." This is the portable substitute for
native subagent dispatch when the host lacks it: spawn the worker as a CLI
child process.

## Candidate tools/plugins for rubric evaluation (NOT recommendations)

Per dispatch instructions, these are **candidates for the tool-selection
rubric**, not adoption recommendations. Each needs a separate rubric run.

| Candidate | What it is | Tradeoff to evaluate |
|---|---|---|
| **metaharness / `@metaharness/kernel`** | A Rust/WASM kernel + 10 host adapters that mint a custom branded harness from any repo. Ed25519 witness-signed releases, SPDX SBOM, `harness doctor/validate/score` CLI. | Adds a kernel layer + NAPI-RS + wasm-pack; opinionated about config generation; 462 stars (small community); the `harness` subcommands are a new surface to maintain. |
| **Claude Code `type: agent` hooks** | The richest native reactive-hook surface (spawn a sub-agent from a `PreToolUse` hook). | Claude-Code-only; no other host replicates it; locks you to Anthropic's harness. |
| **opencode workflow engine (PR #29789/#32167)** | `.opencode/workflows/*.ts`, `ctx.agent/parallel/pipeline`, `/workflow` + `/workflows` TUI, persisted journal, structured output via `schema`. | Not merged to `dev` as of 2026-08-16; in a fork/PR; timeline uncertain; the `ultracode` keyword/toggle is a new UX surface. |
| **pi-harness-runtime (npm)** | Pi extension: `/harness` autonomous loop, 14-state job lifecycle, task DAG, auto-repair, quota-aware pause/resume, per-provider mirror. | Pi-only (no MCP by design); bundles a lot (MiniMax quota scraper, playwright, cookie-sanitizer); the `bd` Beads CLI dependency is external and unverified. |
| **AGENTS.md as the single canonical instruction file** | The cross-tool default; 60K+ repos; Linux Foundation stewardship. | Claude Code needs a `@import` bridge; precedence ambiguity in monorepos (Codex root-down vs Claude cwd-up); 32 KiB cap on Codex. |
| **SKILL.md (agentskills.io) as the reusable-capability format** | Portable across Claude Code, Cursor, Gemini CLI, Codex, Aider, opencode. | Progressive disclosure needs harness support; slash-command layer (`/spec /plan /build...`) is Claude-Code-native and does not port as commands. |
| **Hermes + Pi CLI-child-process team** | Process-isolated orchestrator + worker; no MCP needed. | Two tools to maintain; Hermes's `optional-mcps/` is Hermes-specific; the escalation chain (retry -> model-upgrade -> web-research -> deep-research) is a skill, not a primitive. |

## Key open questions

1. **Is there a stable "inner harness" contract beyond metaharness's?**
   metaharness's `HostAdapter` is the most concrete, but it is a single project's
   ADR, not a community standard. Is there an emerging IETF/W3C-style spec for
   agent-harness portability, or is AGENTS.md + MCP + SKILL.md the de-facto
   standard layer? — UNVERIFIED; no portability-spec body beyond the Linux
   Foundation's Agentic AI Foundation (stewards AGENTS.md) was found.
2. **Does opencode's in-flight workflow engine subsume the plugin hook system,
   or layer on top?** The issue says `ctx.agent` reuses `Session.create({
   parentID})` from `TaskTool` and `Plugin.trigger()` — suggesting it layers on
   the existing hook + subagent infrastructure. But the merge timeline is
   uncertain. — UNVERIFIED; needs a re-check once #29789/#32167 lands.
3. **AGENTS.md precedence v1.1** — issue #135 proposes nailing down the
   root-down vs nearest-only ambiguity. Until it lands, a portable harness must
   either (a) keep root AGENTS.md small + leaves declarative (Codex-safe), or
   (b) accept that Claude Code won't load leaf files until it touches a file in
   that subtree. — UNVERIFIED; the v1.1 spec is not out.
4. **Is `doom_loop` (opencode's 3x spin detector) portable?** It is the only
   built-in spin detector found among the five tools. Claude Code has
   `PostToolUseFailure` and `Stop` events but no named spin detector. Does the
   inner harness need to implement spin detection kernel-side for non-opencode
   hosts? — UNVERIFIED; likely yes.
5. **A2A (agent-to-agent) standard** — Addy names it alongside MCP but no
   other source in this dispatch corroborates a shipped, stable A2A spec. Is it
   Google's A2A protocol, or something else? — UNVERIFIED; flagged for a
   follow-up dispatch.
