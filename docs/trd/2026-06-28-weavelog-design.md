# weavelog: Agentic Loop Engineering Workspace

**Status:** Draft (revised July 4, 2026)
**Date:** June 28, 2026 (original); revised July 4, 2026
**Supersedes:** `docs/superpowers/specs/2026-06-28-harness-kit-design.md` (relocated and revised)
**Authoritative sources:** `docs/NORTH_STAR.md` (what), `docs/research/RESEARCH.md` (why)

---

## 1. Context & Motivation

The original ADR (`docs/archive/stateless-multi-model-agent-swarm-adr.md`) proposed Pi + OpenRouter + Headroom + SwarmForge as the stack. After investigating each tool against its actual documentation and source code, three gaps emerged:

1. **SwarmForge** (unclebob/swarm-forge) hard-codes support to `#{"claude" "codex" "copilot" "grok"}` agents. Pi is not and will not be a supported agent without a fork. SwarmForge also assumes Gherkin-driven specification, which doesn't match mobile, blog, or research workflows.

2. **The original `.harness/` directory structure** was bespoke. It doesn't match the Agent Skills standard (`agentskills.io`), the AGENTS.md standard (`agents.md`), or Pi's native agent-discovery convention (`.pi/agents/<name>.md`).

3. **Machine-level and workspace-level concerns** were conflated in a single bootstrap sequence. Pi, headroom, rtk are per-machine installs; workspace scaffolding is per-project.

This design replaces the SwarmForge orchestration layer with a lightweight Pi TypeScript extension that implements the ETCSLV loop engineering framework — an acronym synthesized in the original ADR (Section 10) from Addy Osmani's loop-engineering components — directly on Pi's extension system. (Note: Addy Osmani never uses "ETCSLV" in his article; verified by full-text search. The acronym is this project's synthesis and is attributed to the original ADR.)

### Primary Architectural Drivers

1. **Pi-native orchestration.** All loop coordination lives in a Pi TypeScript extension. No separate orchestration tool is required.
2. **Open standards first.** Skills follow the Agent Skills standard (`agentskills.io`). AGENTS.md follows `agents.md` conventions (<200 LOC). Roles use Pi's native `.pi/agents/<role>.md` convention. No bespoke formats where standards exist.
3. **Two-tier setup.** Machine-level (`weavelog check`) verifies Pi, Headroom, env vars. Workspace-level (`weavelog init`) scaffolds project-local `.pi/agents/`, workflow configs, and associated files.
4. **Headroom compression + learning.** The Headroom proxy compresses tool outputs before each LLM call (via `@ryan_nookpi/pi-extension-headroom`). The `--learn` flag writes observed failure patterns back to AGENTS.md. When `--learn` is enabled, `--memory-storage=project` prevents cross-project memory bleed.
5. **Human-gated verification.** Every step gates on human approval of a deterministic verifier's results. The verifier provides signal; the human provides judgment. No unattended autonomous runs in v1.

---

## 2. Loop Engineering Framework

This design implements the ETCSLV framework synthesized from Addy Osmani's "[Loop Engineering](https://addyosmani.com/blog/loop-engineering/)" (June 7, 2026), corroborated by Cobus Greyling's [loop-engineering repo](https://github.com/cobusgreyling/loop-engineering), LangChain's "[The Art of Loop Engineering](https://www.langchain.com/blog/the-art-of-loop-engineering)", and the [Agentic AI Engineering repo](https://github.com/agenticloops-ai/agentic-ai-engineering).

| Component | What It Is | Our Implementation |
|---|---|---|
| **E — Execution** | Automations that make a loop an actual loop | Workflow JSON configs + Pi sub-agent spawning |
| **T — Tool Registry** | Bounded set of tools the agent can call | Pi's built-in tools + custom tools via extension. MCP bridge for Context+ (v2). |
| **C — Context Manager** | What the agent sees; keeping the window alive | `.pi/skills/` (progressive disclosure). Headroom for token compression. |
| **S — State Store** | External memory persisting across steps | Pi session tree via `pi.appendEntry()` + `session_start` reconstruction (branching-aware, auto-persisted). |
| **L — Lifecycle Hooks** | Events at key loop transitions | Pi extension events (`turn_end`, `agent_end`, `tool_call`). |
| **V — Verification** | Deterministic signal: succeed, fail, escalate | Sub-agent maker/checker split with different models. Human diff gate. Headroom `--learn` for self-improvement. |

### Osmani Loop Primitives: Compose vs Run Boundary

Osmani's canonical primitives map onto weavelog's composition surface.
weavelog scaffolds and wires each primitive; Pi executes it. weavelog
composes the harness — it does not run the loop.

| Primitive (Osmani) | weavelog composes (init/check) | Pi runs |
|---|---|---|
| **Automations** | Workflow JSON configs (`.pi/workflows/`) | Extension spawns steps; v1 trigger is manual `/run` |
| **Worktrees** | Deferred post-v1 (v1: sequential, shared cwd) | Git worktree isolation |
| **Skills** | `.pi/skills/<name>/SKILL.md` (Agent Skills standard) | Progressive disclosure at runtime |
| **Plugins/connectors** | `weavelog plugin add` wrapper around `pi install` | Package loading |
| **Sub-agents** | `.pi/agents/<role>.md` with per-role model/tools | Sub-agent processes, maker/checker split |
| **State/memory** | PROGRESS/INDEX conventions + session-tree entries | `pi.appendEntry()` persistence |

### Named Alignments with the Osmani Series (2026-07-22 firsthand review)

- **The workflow config is the graph.** Osmani argues agent freedom should
  be constrained to the inside of a node of a predefined graph — "mostly
  deterministic code with LLM steps sprinkled in," back pressure drawn as a
  diagram. weavelog workflow JSON (steps, `verify`, `gate`, rollback nodes)
  is exactly that graph.
- **The spec gate is judgment upstream.** His lit-factory move is reviewing
  the decision before it is built ("a 200-line plan, not 2,000 lines of
  generated code"). weavelog's human gate on the spec step embodies this —
  the deepest alignment in the design.

### LangChain's Four Loop Levels Mapped

| Level | What It Does | Our Implementation |
|---|---|---|
| 1 — Agent loop | Model calls tools until task complete | Sub-agent Pi process per role |
| 2 — Verification loop | Output scored against rubric, retried with feedback | QA role checks coder output. Human diff gate. |
| 3 — Event-driven loop | Events trigger agent runs (cron, webhook) | Deferred to post-v1 |
| 4 — Hill climbing loop | Traces → analysis → harness improvement | Headroom `--learn` (partial: error-pattern mining → AGENTS.md rule appendals, NOT full trace-based harness rewriting). Limited honestly — v1 does NOT claim full Level 4. |

### Why Manual `/run` (Not Automated Triggers)

V1 ships with the human invoking `/run <workflow> <task>` manually. This is intentional:

- **Determinism first.** Automating the trigger (cron, webhook, git-hook) requires the loop to be proven deterministic — the same task, same inputs, same outputs, every time. V1 establishes that determinism by running the loop end-to-end with human gates.
- **Both Addy Osmani and Cobus Greyling agree automation is the defining feature of a loop, but they also agree it follows trust.** You don't automate a loop you haven't proven. V1 proves the loop; v2 automates the trigger.
- **Practical cost control.** Automated triggers can run loops you forgot about. Manual `/run` puts spending decisions on the human.

---

## 3. Tool Stack

| Tool | Version | Role | Install Method |
|---|---|---|---|
| **Pi** | 0.80.3 | Harness host, sub-agent spawning, session management | `npm install -g @earendil-works/pi-coding-agent` |
| **Headroom** | 0.30.0 | Token compression, context optimization, auto-learning | `pipx install headroom-ai` |
| **pi-extension-headroom** | (installed) | Pi ↔ Headroom bridge | `pi install npm:@ryan_nookpi/pi-extension-headroom` |
| **pi-diff-review** | (installed) | Structured diff overlay | `pi install npm:pi-diff-review` |
| **Superpowers** | (installed) | Composable skill files | `pi install git:github.com/obra/superpowers` |
| **rtk** | (installed) | CLI output compression (bundled in Headroom) | `brew install rtk` |
| **markitdown** | 0.1.6 | PDF/Word/PPTX → Markdown conversion | `pipx install markitdown` |
| **OpenRouter** | (API) | Multi-model routing through one key | API key in env vars |

### Deferred (Post-MVP)

| Tool | Role | Trigger |
|---|---|---|
| **Context+** (forloopcodes/contextplus) | MCP server for AST-aware semantic code search + blast radius analysis | Large codebase (>100 files) or mobile workflows. Needs Pi MCP bridge extension. |
| **context-mode** (ELv2) | MCP session continuity | Personal use. Add after Context+ bridge is built. |

---

## 4. Two-Tier Setup Architecture

### 4.1 Tier 1: Machine Setup (`weavelog check`)

A TypeScript CLI command that runs once per machine. It does not scaffold projects.

**Verification sequence:**

```
weavelog check
├── Check Pi installed → if no, show install command
│   └── If outdated (current: 0.80.3), show: "Update with: npm update -g @earendil-works/pi-coding-agent"
├── Check Pi packages: superpowers, pi-diff-review, pi-extension-headroom
│   └── If missing, show install command
├── Check headroom CLI in PATH → if no, suggest pipx install
├── Check rtk in PATH → if no, suggest brew install
├── Check markitdown in PATH → if no, suggest pipx install (optional)
├── Check env vars: OPENAI_API_BASE, HEADROOM_PORT, HEADROOM_OUTPUT_SHAPER
│   └── If missing, show: "Add to ~/.zshrc: export VAR=value"
├── Check OPENROUTER_API_KEY is set → if no, error
└── Exit 0 if all green, 1 otherwise with actionable messages
```

**Env vars (set in `~/.zshrc`):**
```bash
export OPENAI_API_BASE=https://openrouter.ai/api/v1
export HEADROOM_PORT=8788
export HEADROOM_OUTPUT_SHAPER=1
```

**Pi model routing:** Model selection happens per sub-agent, not globally. Each role spawns Pi with `--model <provider/model>` via the extension. No monolithic models.json is required; the `--model` flag per invocation gives per-role routing.

### 4.2 Tier 2: Workspace Scaffold (`weavelog init`)

A TypeScript CLI command that scaffolds a project directory as a self-contained agentic workspace.

**Interface:**
```bash
weavelog init <path> [--mode <mode>...]
```
Modes: `software`, `mobile`, `writing`, `research`. Additive (union of skill sets).

**Output structure:**

```
$PROJECT_ROOT/
├── AGENTS.md                          # Platform-agent contract, <200 LOC
├── CLAUDE.md                          # Thin dispatch stub
├── .gitignore                         # Includes .workflow/
│
├── .pi/                               # Pi-native config directory
│   ├── skills/                        # Agent Skills standard (agentskills.io)
│   │   ├── tdd-loop/SKILL.md          # TDD workflow skill
│   │   ├── technical-writing/SKILL.md # ADR/PRD/blog writing skill
│   │   └── mobile-kmp/SKILL.md        # Swift/Kotlin/KMP mobile skill
│   ├── agents/                        # Pi-native agent definitions
│   │   ├── specifier.md               # GLM-5.2: behavior specs
│   │   ├── coder.md                   # DeepSeek V4 Pro: TDD implementation
│   │   ├── qa.md                      # DeepSeek V4 Flash: verification
│   │   └── writer.md                  # Devstral: documentation
│   └── workflows/                     # Loop workflow definitions
│       ├── feature.json               # spec → code → qa → docs
│       └── fix.json                   # triage → fix → verify
│
├── .env.weavelog                       # Per-project env (gitignored)
├── docs/tasks/.gitkeep                # Bounded task directory
└── .workflow/                         # Runtime state (gitignored)
```

**Key conventions:**

- `AGENTS.md` follows `agents.md` standard: plain markdown, no required fields, under 200 LOC. Covers build commands, code style, testing instructions, MUST NOT isolation rules.
- **Skills** follow `agentskills.io` standard: `.pi/skills/<name>/SKILL.md` with YAML frontmatter (`name`, `description` required) and markdown body.
- **Agents (roles)** use Pi's native convention: `.pi/agents/<name>.md` files with YAML frontmatter (`name`, `description` required; optional `model`, `tools`) and markdown body. Pi's sub-agent extension discovers agents from this directory. This replaces the bespoke `.agents/roles/<role>.prompt` convention from earlier drafts.
- **Workflows** are JSON configs: `.pi/workflows/<name>.json` with step definitions.
- `.pi/` is the canonical Pi config directory. No `swarmforge/`, no `.agents/`, no bespoke directories.

**Idempotency:** Running `weavelog init` twice on the same path exits 0 and does not overwrite existing files (skip, do not clobber).

---

## 5. The Loop Extension (`pi-weavelog`)

A Pi TypeScript extension distributed as an npm package (`weavelog/pi-weavelog`) that provides the ETCSLV orchestration layer. Installed via `pi install npm:weavelog/pi-weavelog (pre-rename scope)`.

### 5.1 Workflow Config Format

```json
{
  "schemaVersion": 1,
  "name": "feature",
  "description": "Full feature development: spec → implement → QA → document",
  "budget": 5.0,
  "steps": [
    {
      "id": "spec",
      "agent": "specifier",
      "model": "z-ai/glm-5.2",
      "temperature": 0.1,
      "verify": { "type": "tests-pass", "command": "test -f docs/prd/feature-spec.md" },
      "gate": "human"
    },
    {
      "id": "code",
      "agent": "coder",
      "model": "deepseek/deepseek-v4-pro",
      "temperature": 0.2,
      "verify": { "type": "tests-pass", "command": "node --import tsx --test", "maxRetries": 5 },
      "gate": "human"
    },
    {
      "id": "qa",
      "agent": "qa",
      "model": "deepseek/deepseek-v4-flash",
      "temperature": 0.0,
      "verify": { "type": "tests-pass", "command": "biome check --no-errors" },
      "gate": "human"
    },
    {
      "id": "docs",
      "agent": "writer",
      "model": "mistralai/devstral-2512",
      "temperature": 0.3,
      "verify": { "type": "tests-pass", "command": "test -f docs/adr.md" },
      "gate": "none"
    }
  ]
}
```

**Key changes from earlier drafts:**
- `schemaVersion` field added for forward compatibility.
- `role` → `agent`: references Pi-native `.pi/agents/<agent>.md` definitions, not bespoke prompt files.
- `promptFile` removed: agent system prompts live in the `.pi/agents/<agent>.md` frontmatter.
- `worktree` removed: v1 uses sequential execution in shared cwd, not per-step worktrees.
- `phases`/`currentPhase` removed: v1 ships human-gated verification only (L2); L1/L3 documented as future.
- `verify` vs `gate` split: `verify` is deterministic (test command, exit code); `gate` is the lifecycle checkpoint (`human` or `none`). See Section 7.
- `budget` field added (USD): per-workflow spending cap. See Section 9.

Each step:
- Spawns an isolated Pi child process (`--mode json -p --no-session`) with the specified model
- Reads the agent's system prompt from `.pi/agents/<agent>.md` frontmatter
- Receives the previous step's output via `{previous}` placeholder in its task
- After completion: runs `verify` command (deterministic check)
- On `verify` failure: retries up to `maxRetries`, then escalates to human
- On `verify` pass + `gate: human`: presents diff for human approval
- On `verify` pass + `gate: none`: auto-advances

### 5.2 Agent Definition Format (`.pi/agents/<name>.md`)

Pi-native convention using YAML frontmatter + markdown body:

```markdown
---
name: coder
description: TDD implementation agent — writes code, fixes tests, never commits without green
model: deepseek/deepseek-v4-pro
tools:
  - read
  - bash
  - edit
  - write
---

You are the coder role in a weavelog workflow. You receive a specification
from the specifier and implement it using test-driven development.

Rules:
- Write the failing test first. Run it to confirm it fails.
- Implement the minimal code to make it pass. Run tests. Confirm green.
- Commit each TDD cycle separately.
- Never commit on red.
- If you encounter an ambiguous spec, flag it — do not guess.
```

Pi's sub-agent extension discovers agents from `.pi/agents/` by parsing frontmatter (`name`, `description` required; `model`, `tools` optional). This is the standard Pi mechanism — no bespoke role format.

### 5.3 Sub-Agent Isolation

Sub-agents run in isolated Pi processes. The extension enforces isolation via the `tool_call` event hook, using Pi's `protected-paths.ts` pattern:

```typescript
pi.on("tool_call", async (event, ctx) => {
  // Block writes outside the project tree
  if (event.toolName === "write" || event.toolName === "edit") {
    const targetPath = event.args.path || event.args.file;
    if (targetPath && isOutsideProject(targetPath, ctx.cwd)) {
      return { block: true, reason: "Write denied: path outside project root" };
    }
  }
  // Block destructive shell commands
  if (event.toolName === "bash") {
    const cmd = event.args.command || "";
    if (isDestructive(cmd)) {
      return { block: true, reason: "Destructive command blocked: " + cmd };
    }
  }
});
```

This replaces the `guard.sh` approach from earlier drafts. The `tool_call` hook is Pi-native, works across all shell environments, and can't be bypassed by the sub-agent.

### 5.4 Spawning Per-Role

The extension configures sub-agent isolation through Pi's per-invocation flags:

- `--model <provider/model>` — routes to the role's assigned model
- `--tools <allowlist>` — restricts to the role's declared tools (from agent `.md` frontmatter)
- `--no-skills` — strips global skills; only project-local `.pi/skills/` are loaded
- `--no-context-files` — strips global AGENTS.md; only project-local context files are loaded
- `--no-extensions` — strips global extensions; only the project's `.pi/extensions/` are loaded

The combination of `--no-skills` + `--no-context-files` + `--no-extensions` (when the agent definition doesn't need them) gives a clean, deterministic sub-agent environment. When an agent does need specific skills, they're passed explicitly via `--skill`.

**Sub-agent discovery priority:** Per the resolved settings-isolation question (Section 6), project-local `.pi/agents/` takes precedence, then user-global `~/.pi/agent/agents/`. Per-role `--model`, `--tools`, and skill allowlists override any inherited defaults.

### 5.5 Extension Events

| Event | Handler |
|---|---|
| `input` | Intercept `/run <workflow> <task>` commands |
| `before_agent_start` | Inject workflow context into system prompt |
| `tool_call` | Enforce isolation (protected paths, destructive command blocking) |
| `turn_end` | Track progress for current step |
| `agent_end` | Step complete → run `verify` → if pass, run `gate` → advance or pause |
| `session_shutdown` | Persist state via `pi.appendEntry()` |

### 5.6 Commands

| Command | Description |
|---|---|
| `/run <workflow> <task>` | Start a workflow with the given task description |
| `/status` | Show current workflow progress and active step |
| `/approve` | Manually approve a human verification gate |
| `/retry` | Re-run the current step |
| `/skip` | Skip current step |
| `/abort` | Abort the current workflow |

### 5.7 Sub-Agent Communication

Sub-agents communicate through file-based handoffs under `.workflow/handoffs/`:

```
.workflow/handoffs/
├── specifier/outbox/       # Spec writes handoff files here
├── coder/inbox/            # Coder reads from here
├── coder/outbox/
├── qa/inbox/
└── ...
```

Handoff format:

```json
{
  "type": "handoff",
  "from": "specifier",
  "to": "coder",
  "task": "implement-login",
  "payload": "## Specification\n\nFeature: User login...",
  "decisionLog": {
    "tried": "Approaches attempted during the step",
    "ruledOut": "Alternatives considered and rejected, with reasons"
  },
  "timestamp": "2026-06-28T12:00:00Z",
  "commit": "abc123def0"
}
```

The `decisionLog` implements Osmani's intent capture: the agent states what
it was trying to do and what it ruled out, attached to the change. The
reviewer is never "the first human to lay eyes on this code" — the intent
reconstruction work stays with the producer, where it is cheap.

### 5.8 Human Verification Gate

Between each step where `gate: human`, the extension:
1. Runs `pi-diff-review` to show what changed
2. Presents: `Approve? (y/n/edit)`
   - `y`: Advance to next step
   - `n`: Re-run current step with feedback (rollback first — see Section 8)
   - `edit`: Open editor to modify handoff payload

In v1, all non-`docs` steps use `gate: human`. This is the L2 (assisted fixes) maturity level from Cobus Greyling's framework — agent writes with human approval per step, verification gates are automated.

---

## 6. Sub-Agent Isolation

### Problem

The user's `~/.pi/agent/settings.json` carries personal `defaultModel`, `enabledModels`, `packages`, `skills`, and global context files. When weavelog spawns a sub-agent for a workflow step, the sub-agent inherits all of this by default — including the user's other extensions, skills, and global context files that have nothing to do with the workflow. A workflow meant to run exactly `specifier → coder → qa → writer` could derail mid-coder-step if, for example, the user's superpowers `brainstorming` skill activates (its description says "You MUST use this before any creative work") or a global extension intercepts a tool call unexpectedly. This breaks the determinism the North Star promises.

### Mechanism

Pi supports isolation flags that compose with sub-agent spawning:

| Flag | Effect | When to Use |
|---|---|---|
| `--no-skills` | Disables all skills (global + project). Add back with `--skill <path>`. | When the agent needs only its agent definition. |
| `--no-context-files` | Disables all context files (AGENTS.md, CLAUDE.md, etc.). Add back with `--context-file <path>`. | When the agent should not see global instructions. |
| `--no-extensions` | Disables all extensions. Add back with `--extension <path>`. | When the agent should only have built-in tools. |
| `--tools <allowlist>` | Restricts to specific tool names. | When the agent role has a bounded tool set. |
| `--model <provider/id>` | Overrides the default model. | Per-role model routing. |

The weavelog extension constructs the sub-agent invocation with exactly the flags the role needs. A specifier might get `--tools read,bash,write --skill .pi/skills/technical-writing/SKILL.md`. A coder gets `--tools read,bash,edit,write --no-skills --no-context-files --no-extensions`.

### Precedence

Project-local `.pi/settings.json` takes precedence over user-global `~/.pi/agent/settings.json`. This is Pi's built-in behavior. weavelog's `weavelog init` writes a project-local `.pi/settings.json` that disables global packages/skills for the workspace and enables only the weavelog extension and project skills.

---

## 7. Verification and State

### 7.1 Verification Split: `verify` vs `gate`

Following Addy Osmani's principle — "trust a deterministic verifier, never the agent's self-report" — verification is split into two orthogonal concerns:

| Concern | Field | What It Does | Example |
|---|---|---|---|
| **Verifier** | `verify` | A deterministic command that produces signal. Exit 0 = pass. | `node --import tsx --test` |
| **Gate** | `gate` | The lifecycle checkpoint. `human` = requires approval; `none` = auto-advance. | `human` |

The human is a **lifecycle gate**, not a verifier. They review the verifier's output and decide whether to advance — but they don't manually run the tests themselves.

### 7.2 Deterministic Exit Conditions

"Done" must be a testable claim, not a model's self-report:

| Step | "Done" means |
|---|---|
| Spec | Spec file exists at expected path (`test -f docs/prd/feature-spec.md`) |
| Code | Test suite passes (`node --import tsx --test`) |
| QA | Lint clean + tests pass (`biome check --no-errors && node --import tsx --test`) |
| Docs | Doc files exist at expected paths |

### 7.3 State Persistence

State lives in Pi's session tree via `pi.appendEntry()`, not in a separate `.workflow/state.json`:

```typescript
// Save workflow progress
pi.appendEntry("weavelog-workflow", {
  workflow: "feature",
  task: "Add login screen",
  currentStep: "code",
  completedSteps: ["spec"],
  startedAt: new Date().toISOString(),
  stepCheckpoint: "weavelog/step-code",   // git branch ref for rollback (Section 8)
  budgetSpent: 0.82,
});

// Reconstruct on session_start
pi.on("session_start", async (_event, ctx) => {
  for (const entry of ctx.sessionManager.getEntries()) {
    if (entry.type === "custom" && entry.customType === "weavelog-workflow") {
      // entry.data contains the saved state
      // entry.id is the session entry ID (for rollback refs)
    }
  }
});
```

**Why Pi's session tree instead of a separate file:**
- **Branching-aware.** If the user forks the session, the state forks with it — no concurrency races on a shared JSON file.
- **Auto-persisted.** `pi.appendEntry()` writes to Pi's session file, which survives crashes.
- **Reconstructable.** `session_start` with `reason: "resume"` replays all entries in order. State is always reconstructable from the entry stream.
- **Survives `/resume`.** When Pi resumes a session, all `pi.appendEntry()` entries are available via `ctx.sessionManager.getEntries()`.

### 7.4 Back Pressure and Per-Task Autonomy

Following Osmani's back-pressure principle — "you can only hand a loop as
much autonomy as you can cheaply and reliably verify" — gate depth is a
per-task switch, not a global setting:

- **Verification cost sets autonomy.** A step whose verdict has a cheap
  deterministic oracle (tests, lint, typecheck) can tolerate `gate: none`
  or light review. A step with no cheap oracle (spec quality, doc accuracy)
  keeps `gate: human` with full review.
- **Every delegation carries a verification budget.** Before a step runs,
  its `verify` command and evidence requirements are fixed (Section 7.2) —
  the agent knows what will be checked, and how, before it acts. This is
  Osmani's agent contract (goal, scope, non-goals, tools, stopping
  condition, evidence, escalation, budget) applied to workflow steps.
- **v1 default is uniformly lit** (`gate: human` on all non-docs steps).
  Osmani's "all-lit is a bottleneck" warning is a known v1 risk: at diff
  volume, uniform human review degrades into review fatigue and
  rubber-stamping (comprehension debt). Risk-tiered gate depth (blast
  radius × verification cost) is the post-v1 evolution path, adopted once
  telemetry shows where human attention is actually load-bearing.
- **The human gate is a verdict, not a sensor.** AI review output is a
  sensor; the human owns the advance/merge decision.
- **Oracle quality decides what can go dark.** A loop earns automation only
  when its check is cheap, high-frequency, ungameable, immediate, and
  non-drifting (green/red oracles, type gates, property tests, review
  agents with real rubrics). Loop length is the practical proxy: agents
  hold up for 3–10 steps and drift past 20, so steps stay short.

---

## 8. Step Rollback

### Problem

When a verification gate rejects a step's output ("re-run with feedback"), the sub-agent re-runs on a dirty working tree — the rejected work compounds into the next attempt. This undermines the deterministic verification principle: the same task run twice should produce the same starting conditions.

### Mechanism

Adopt Pi's `git-checkpoint.ts` pattern at the **step level** (not turn level):

**Before each step:**
```typescript
// Create a git branch checkpoint
const ref = `weavelog/step-${step.id}`;
await pi.exec("git", ["branch", ref]);
```

**On rejection (re-run):**
```typescript
// Reset to checkpoint, then re-apply feedback
await pi.exec("git", ["reset", "--hard", ref]);
await pi.exec("git", ["clean", "-fd"]);  // Remove untracked files created by the step
```

**On approval:**
```typescript
// Discard the checkpoint branch
await pi.exec("git", ["branch", "-D", ref]);
```

**On crash recovery:**
```typescript
// On session_start with reason: "resume", check for orphaned checkpoint branches
const branches = await pi.exec("git", ["branch", "--list", "weavelog/step-*"]);
// If current step has a checkpoint, the previous attempt crashed. Re-run from checkpoint.
```

### Why Branches (Not Stashes)

- **Stashes don't survive Pi crashes.** The in-memory `Map` in `git-checkpoint.ts` is lost on crash — the stash ref is unrecoverable.
- **Branches survive crashes** and are inspectable (`git log weavelog/step-code`).
- **Branches handle untracked files** when combined with `git clean -fd`.

### Decision

Use `git branch weavelog/step-<id>` as the checkpoint mechanism. The ref is stored in the session tree entry so it survives `/resume`. Newly-created untracked files are cleaned on reset.

---

## 9. Budgets & Runaway Detection

### Problem

A workflow loops without explicit cost boundaries. A coder step with `maxRetries: 5` on DeepSeek V4 Pro ($0.435/$0.87 per 1M tokens) could spend arbitrarily if each retry escalates context. The North Star promise is "human only verifies," but silent runaway spending erodes trust in the tool.

### Mechanism

**Per-workflow budget field** in the workflow config:

```json
{
  "schemaVersion": 1,
  "name": "feature",
  "budget": 5.00,
  ...
}
```

**Enforcement in the weavelog extension** (not Headroom proxy), for per-workflow granularity:

```typescript
// Track spend from message_end events
pi.on("message_end", (event) => {
  const cost = event.usage?.cost || 0;
  workflowState.budgetSpent += cost;

  if (workflowState.budgetSpent >= workflowState.budget) {
    // Pause workflow, surface to human
    workflowState.paused = true;
    workflowState.pauseReason = "budget_exceeded";
    ctx.ui.notify(
      `Budget exceeded: $${workflowState.budgetSpent.toFixed(2)} / $${workflowState.budget}`,
      "warning"
    );
  }
});
```

### Defaults and Escalation

- **Default budget: $5.00** per workflow. The user must explicitly set a higher budget to run workflows that expect more spending.
- **On budget hit:** Pause (do not abort). Present: `Budget exceeded ($X.XX / $Y.YY). Raise budget? (y/new amount/n)`. If yes, update and continue. If no, abort.
- **Token-vs-dollar:** Budget is in USD, sourced from OpenRouter's pricing endpoint at workflow start. This gives the user meaningful numbers, not abstract token counts.
- **Proxy-level budget:** Headroom's `--budget` flag is available as a second layer of defense but is not the primary enforcement — it's shared across all concurrent workflows on the same proxy and can't distinguish one workflow's spend from another's.

---

## 10. Headroom Integration

### 10.1 Token Compression

The installed `@ryan_nookpi/pi-extension-headroom` intercepts the `context` event before each LLM call. It:
1. Checks if context exceeds `minContextTokens` (default: 20k)
2. Sends an OpenAI-shaped payload to the local Headroom proxy (`/v1/compress`)
3. Applies compression only to large `toolResult` messages
4. Returns the compressed messages for the LLM call

The proxy is auto-started by the extension when Pi launches. Verified working with `headroom proxy --mode token --no-cache --port 8788`.

### 10.2 Auto-Learning (Hill Climbing, Partial)

With `headroom proxy --learn`:
- Headroom observes error patterns in proxy traffic
- After `minEvidence` (default: 5) observations of the same pattern, it writes corrections to AGENTS.md / MEMORY.md
- This is a **partial** LangChain Level 4 (rules only, not prompt/tool/harness rewrites). The spec states this limitation explicitly — v1 does NOT claim full trace-based harness rewriting.

When `--learn` is enabled, also set `--memory-storage=project` to prevent cross-project memory bleed. Without this flag, headroom uses a global memory DB, and patterns from one project could contaminate another.

To enable: `HEADROOM_LEARN=1` or `headroom proxy --learn`. Default: disabled for v1.

---

## 11. Error Handling and Recovery

### 11.1 Step-Level Failures

Each step has a `maxRetries` (default: 3). On `verify` failure:
1. Check if retries remaining → rollback to checkpoint (Section 8), re-run with error context appended
2. If `maxRetries` exhausted → mark step as `failed`, escalate to human
3. Human can: approve partial progress, retry with custom feedback, or abort

### 11.2 Context Management

- Headroom compresses tool results before each LLM call (automatic at >20k tokens)
- Pi's built-in compaction summarizes older messages when context window is full
- The session tree (`/tree`) preserves the full trajectory for audit

---

## 12. Scope-Out (v1)

- MCP server integration (Context+ bridge): deferred to v2
- Event-driven/cron-triggered loops (LangChain Level 3): deferred to v2
- Full trace-based harness rewriting (LangChain Level 4): deferred. Headroom `--learn` provides partial coverage only.
- Headroom `--learn`: disabled by default in v1
- Cross-project memory sharing (Hivemind): not in scope
- GUI or web dashboard: CLI-only for v1
- Per-step git worktrees: deferred (v1 uses sequential execution in shared cwd)
- L1 (report-only) and L3 (unattended) phases: documented as future. V1 ships L2 only (assisted fixes with human gates).

---

## 13. References

1. [Loop Engineering — Addy Osmani](https://addyosmani.com/blog/loop-engineering/) — Canonical components (automations, worktrees, skills, plugins/connectors, sub-agents, memory)
2. [Loop Engineering — Cobus Greyling](https://github.com/cobusgreyling/loop-engineering) — 5 building blocks + Memory, 7 patterns, primitives matrix, L1/L2/L3 maturity
3. [The Art of Loop Engineering — LangChain](https://www.langchain.com/blog/the-art-of-loop-engineering) — 4 loop levels, hill climbing loop
4. [Agentic AI Engineering](https://github.com/agenticloops-ai/agentic-ai-engineering) — First-principles agent building
5. [Agent Skills Standard](https://agentskills.io/specification) — Open format for agent skills
6. [AGENTS.md Standard](https://agents.md/) — Open format for agent instructions
7. [Pi Coding Agent](https://pi.dev) — Terminal coding harness and extension system
8. [Headroom](https://github.com/chopratejas/headroom) — Context optimization proxy
9. [Building Effective Agents — Anthropic](https://www.anthropic.com/engineering/building-effective-agents) — Agent architecture patterns