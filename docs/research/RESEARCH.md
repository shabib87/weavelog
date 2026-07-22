# Research: Loop Engineering Foundations

This document records the sources that ground `loopeng`'s design and the
corrections made during research. It exists so future work can audit *why* a
decision was made and detect drift. The North Star says *what* we build; this
says *why we build it this way*.

## Primary Sources

### 1. Addy Osmani — "Loop Engineering" (June 7, 2026)
- Link: https://addyosmani.com/blog/loop-engineering/
- The canonical essay. Defines loop engineering as "replacing yourself as the
  person who prompts the agent." Quotes Peter Steinberger ("You should be
  designing loops that prompt your agents") and Boris Cherny ("I have loops
  running that prompt Claude").
- **Adopted:** The six components — automations, worktrees, skills,
  plugins/connectors, sub-agents, memory. The maker/checker split ("the most
  useful structural thing in a loop, by far, is splitting the one who writes
  from the one who checks"). "The agent forgets, the repo doesn't" (state
  lives on disk, not in context). Phased trust.
- **Rejected:** Nothing — this is the foundation.
- **Correction:** Addy never uses the "ETCSLV" acronym. Verified by full-text
  search of the article (zero matches). The acronym originates in the original
  ADR Section 10 as the author's synthesis of Addy's components. We attribute
  ETCSLV to the ADR, not to Addy.
- **Series evolution (reviewed 2026-07-22):** The essay became a series —
  eight posts from June 7 to July 20, 2026 (agentic code review, the new
  SDLC, autonomy levels, agent-era career, earning judgment, own the outer
  loop, software factories light/dark). loopeng treats this series as a
  living provenance source: new posts trigger an alignment review. Full
  synthesis: `docs/learnings/2026-07-22-addy-osmani-loop-engineering-alignment.md`.
  - **Adopted from the series:** Back pressure ("only as much autonomy as
    you can cheaply and reliably verify") and autonomy as a per-task switch
    (spec Section 7.4). The lit-factory framing — loopeng is a lit-factory
    harness composer at autonomy Level 2–3, with human judgment at the gate
    and moved upstream into the constitution. The agent contract (goal,
    scope, non-goals, tools, stopping condition, evidence, escalation,
    budget) as the delegation template.
  - **Accepted gap:** Evals as a verification layer (output + trajectory
    rubrics) alongside deterministic tests. Adoption deferred to Phase 4+;
    eval format TBD.
  - **Deferred:** Intent debt / comprehension debt as workspace health
    metrics (framing adopted in spec 7.4, metrics deferred). Taste
    calibration (out of v1 scope, YAGNI).

### 2. Cobus Greyling — loop-engineering repo
- Link: https://github.com/cobusgreyling/loop-engineering
- Five building blocks + Memory: automations/scheduling, worktrees, skills,
  plugins & connectors (MCP), sub-agents, + memory/state. Seven production
  patterns (Daily Triage, PR Babysitter, CI Sweeper, etc.) with cadence and
  token cost. Primitives matrix across Grok/Claude Code/Codex. L1/L2/L3
  rollout maturity.
- **Adopted:** The L1/L2/L3 concept as *organizational rollout maturity*
  (documentation only — not a per-workflow config field, which was an earlier
  spec error). The pattern catalog as reference for future loop types.
- **Rejected:** The per-tool matrix (loopeng is Pi-only). The seven specific
  patterns (v1 ships one workflow: spec → code → QA → document).

### 3. LangChain — "The Art of Loop Engineering"
- Link: https://www.langchain.com/blog/the-art-of-loop-engineering
- Four loop levels: (1) agent loop, (2) verification loop, (3) event-driven
  loop, (4) hill climbing loop. The hill climbing loop "reaches inside and
  updates the agent loop directly" — traces feed an analysis agent that
  rewrites prompts/tools/config.
- **Adopted:** Levels 1 and 2 for v1 (agent loop + verification loop).
- **Scoped down honestly:** Level 3 (event-driven/cron) deferred to post-v1.
  Level 4 (hill climbing) implemented *partially* via Headroom `--learn`
  (error-pattern mining → AGENTS.md rule appendals) — this is NOT full
  trace-based harness rewriting. The spec states this limitation explicitly
  rather than claiming full Level 4 support.

### 4. Agentic AI Engineering repo
- Link: https://github.com/agenticloops-ai/agentic-ai-engineering
- First-principles agent building. "Build the loop yourself before using a
  framework." Modules: foundations → effective agents patterns → advanced
  techniques → testing/evaluation → production.
- **Adopted:** The first-principles ethos — we build on Pi's primitives, not a
  framework. The effective-agents patterns (orchestrator-workers,
  evaluator-optimizer, human-in-the-loop) as design vocabulary.
- **Rejected:** The Python tutorial content (loopeng is TypeScript + bash on
  Pi).

### 5. Anthropic — "Building Effective Agents"
- Link: https://www.anthropic.com/engineering/building-effective-agents
- Patterns: prompt chaining, routing, parallelization, orchestrator-workers,
  evaluator-optimizer, human-in-the-loop.
- **Adopted:** Orchestrator-workers (coordinator Pi session + sub-agents).
  Evaluator-optimizer (QA role checks coder output with a different model).
  Human-in-the-loop (diff gates between steps).

## Tooling Research

### Pi (pi.dev) — v0.80.2
- Docs: bundled at `~/.nvm/.../pi-coding-agent/docs/`, source examples at
  `examples/extensions/`.
- **Why chosen:** Minimal MIT-licensed terminal coding harness with a
  TypeScript extension system, session-tree branching (`/fork`, `/tree`),
  sub-agent spawning, and native OpenRouter support. Philosophy: "aggressively
  extensible so it doesn't have to dictate your workflow."
- **Verified capabilities (read from source, not assumed):**
  - Sub-agent spawning: `examples/extensions/subagent/index.ts` — single,
    parallel (max 8, 4 concurrent), and chain modes with `{previous}`
    placeholder. Per-agent model + tools via `.pi/agents/<name>.md` frontmatter.
  - Tool-call blocking: `examples/extensions/protected-paths.ts` and
    `permission-gate.ts` — `tool_call` event returns `{ block: true, reason }`.
  - State persistence: `pi.appendEntry()` + `session_start` reconstruction
    (branching-aware, documented in extensions.md "State Management").
  - Git checkpointing: `examples/extensions/git-checkpoint.ts` uses
    `pi.exec("git", ["stash", "create"])` on `turn_start` — the rollback
    pattern.
  - `/diff` review: `pi-diff-review` registers a TUI command; review comments
    flow back as a user message via `pi.sendUserMessage()`. Feedback IS
    captured, asynchronously.
- **Key constraint:** Pi is pre-1.0 (0.80.2). Extension API can break. Spec
  must pin peerDependencies and state supported Pi versions.

### Headroom — v0.27.0
- Proxy: `pipx install "headroom-ai[proxy]"` → `headroom proxy` binary.
- Pi bridge: `@ryan_nookpi/pi-extension-headroom` (installed). Intercepts the
  `context` event, sends large toolResults to local proxy `/v1/compress`,
  applies compression with alignment guards. Auto-starts proxy on Pi launch.
  Default port 8788.
- **`--learn` flag:** Observes error→recovery patterns in proxy traffic; after
  `minEvidence` (default 5) observations, writes corrections to AGENTS.md /
  MEMORY.md. This is a *partial* LangChain Level 4 (rules only, not
  prompt/tool/harness rewrites).
- **Verified working:** `headroom proxy --mode token --no-cache --port 8788`
  starts; `/health` returns `{"status":"healthy","version":"0.27.0"}`.
- **Key constraint:** Machine-global proxy port (8788). Concurrent projects
  share one proxy. For `--learn` isolation, use `--memory-storage=project`.

### OpenRouter

> **Note (2026-07-05):** The six model IDs listed below are this ADR's
> original roster, retained for provenance. The live, authoritative model
> registry is `~/.pi/agent/models.md`, which has since been revised
> (free-tier removed under OpenRouter ZDR; Kimi, GPT-5.5, and Fable 5 added).
> Do not treat the list below as the current roster; consult `models.md`. See
> `docs/learnings/2026-07-05-model-zdr-and-free-tier-removal.md`.

- All six ADR model IDs verified available on the live API
  (`https://openrouter.ai/api/v1/models`): `z-ai/glm-5.2`,
  `deepseek/deepseek-v4-pro`, `deepseek/deepseek-v4-flash`,
  `mistralai/devstral-2512`, `qwen/qwen3.6-35b-a3b`,
  `nvidia/nemotron-3-super-120b-a12b:free`.
- **Key correction:** `pi --list-models` is Pi's *bundled registry snapshot*
  (shows up to glm-5.1), NOT authoritative for what OpenRouter serves. Pi
  passes model IDs through to OpenRouter via `OPENAI_API_BASE`. The live
  OpenRouter API is the source of truth. (This correction invalidated an
  earlier review claim that two models were unavailable.)

### SwarmForge (unclebob/swarm-forge) — rejected
- Link: https://github.com/unclebob/swarm-forge
- A disciplined tmux-based agent orchestration platform. Three workflow
  branches: two-pack, four-pack, six-pack. File-based handoff protocol via
  `handoffd.bb` daemon. Git worktrees per role.
- **Why rejected:**
  1. Hard-codes agent support to `#{"claude" "codex" "copilot" "grok"}` (read
     in `swarmforge.bb` `parse-config`). Pi is not and will not be supported
     without a fork.
  2. Gherkin-first specification — doesn't match mobile/blog/research
     workflows.
  3. Competes with Pi's own orchestration (session tree, sub-agents).
- **Kept as inspiration:** Role-prompt file convention, handoff protocol
  shape, maker/checker split, worktree-per-role isolation. These map onto
  Pi's extension system rather than SwarmForge's tmux layer.

### Agent Skills standard (agentskills.io)
- Link: https://agentskills.io/specification
- Stewarded by Agentic AI Foundation under Linux Foundation. Convention:
  `.agents/skills/<name>/SKILL.md` with YAML frontmatter (`name`,
  `description` required) and markdown body. Progressive disclosure:
  discovery (name+desc) → activation (full body) → execution.
- **Verified:** Pi implements this standard (docs/skills.md). Skills load
  from `~/.pi/agent/skills/`, `~/.agents/skills/`, `.pi/skills/`,
  `.agents/skills/`.

### AGENTS.md standard (agents.md)
- Link: https://agents.md/
- Plain markdown at project root. No required fields. Best practice: under
  200 LOC. Nested AGENTS.md for monorepo subprojects. Over 60k repos use it.
- Stewarded by Agentic AI Foundation under Linux Foundation.

### Context+ (forloopcodes/contextplus) — deferred
- Link: https://github.com/forloopcodes/contextplus (v1.0.9)
- MCP server: AST-aware semantic code search, blast radius analysis,
  memory graph, validated writes with shadow restore points.
- **Why deferred:** MCP server (Pi has no built-in MCP support — needs a
  bridge extension). Triggered for large codebases (>100 files) or mobile
  workflows. v2 candidate.

### context-mode — deferred
- ELv2 license (not MIT/Apache). MCP session continuity. Personal use only.
  Add after Context+ bridge is built.

## Corrected Assumptions

A running log of claims made during research that turned out wrong, and the
evidence that corrected them. This section exists so the same errors don't
recur.

1. **"z-ai/glm-5.2 and qwen/qwen3.6-35b-a3b are unavailable"** — WRONG.
   `pi --list-models` showed only up to glm-5.1; I mistook Pi's bundled
   registry for the authoritative list. The live OpenRouter API confirms all
   six models exist. Pi passes model IDs through to OpenRouter. (I am running
   on `z-ai/glm-5.2` as I write this.)
2. **"`/diff` is not programmatically invocable, no feedback mechanism"** —
   WRONG. Reading `pi-diff-review/src/index.ts` shows review comments are
   injected as a user message via `pi.sendUserMessage()`. Feedback is
   captured, asynchronously. The `getDiff()` function is also importable.
3. **"ETCSLV acronym coined by Addy Osmani"** — WRONG. Full-text search of
   Addy's article returns zero "ETCSLV" mentions. The acronym originates in
   the original ADR Section 10.
4. **"Replace JSON workflow configs with Pi prompt templates"** — WRONG.
   Prompt templates only support `$1`/`$@` argument expansion; they cannot
   carry per-step `verify`/`worktree`/`model` metadata. JSON config IS
   justified.
5. **"Drop `--no-session`, it causes crash loss"** — WRONG. `--no-session`
   only skips session persistence; files written to disk persist. This aligns
   with Addy's "the repo doesn't forget." Intentional design.
6. **"Monorepo shipping bash via npm is clean"** — WRONG. `pi install` is for
   Pi packages (extensions/skills/prompts), not bash CLIs. Bash-via-npm
   requires a Node wrapper. Homebrew is the proper channel for bash CLIs.
   (Repo structure itself is TBD — see `docs/tbd/`.)

## Open Questions

Things research did not fully resolve; tracked for future sessions:

- Does Headroom `--learn` coexist with a human-authored AGENTS.md under 200
  LOC? (Working hypothesis: `--learn` writes to MEMORY.md, AGENTS.md
  references it. Needs validation.)
- Is Context+ worth the MCP bridge effort for v1? (Deferred to v2.)
- Can the loop run unattended safely on mobile toolchains? (Untested — v1 is
  human-gated.)
- Does `pi install git:` support subdirectories? (Load-bearing for the
  repo-structure decision — see `docs/tbd/repo-structure.md`.)
- How does loopeng isolate sub-agent settings from the user's global
  `~/.pi/agent/settings.json`? (Unresolved — see blindspots.)
