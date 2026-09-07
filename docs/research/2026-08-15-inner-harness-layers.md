---
date: 2026-08-15
topic: Inner harness — the tooling layers (reviewer-corrected)
status: reviewer-corrected
sources:
  - ~/.agents/docs/research/2026-08-15-addy-loop-engineering-series.md
  - ~/.agents/docs/research/2026-08-15-loop-primitives-claude-codex-sdk.md
  - ~/.agents/docs/research/2026-08-15-inner-harness-vocabulary.md
  - ~/.agents/docs/research/2026-08-15-host-state-verification.md
models_used_for_research: [moonshotai/kimi-k3, qwen/qwen3.8-2.4t-a95b]
supersedes: none
review_rounds: 1
reviewer_corrections_applied:
  - "two axes separated: capability layers vs control mechanisms vs packaging vs infrastructure"
  - plugins demoted from peer layer to packaging axis (it CONTAINS capability layers)
  - hooks stated as conditional/spike, NOT as fact (opencode hook support unverified)
  - "permissions split: policy/instruction (LLM-respected) vs kernel/sandbox (enforcement)"
  - caching split into provider-cache + proxy-cache; litellm pricing patch demoted to known-issue footnote
  - recovery defined as state machine + verified rollback; observability as read-only evidence (distinct)
  - "install-mode orchestrator named explicitly: human/conductor (the outer loop), NOT a deferred loop primitive"
  - '"physics, not prompts" scoped to sandbox/hook/recovery only, NOT a universal claim'
  - symlink chains into parked harnesses marked unverified
  - /dashboard verify moved from Phase 1 to Phase 3 (headroom lands in Phase 3)
---

# Inner harness — the tooling layers (reviewer-corrected)

Addy defines an agent as "a model plus a harness of files, tools, memory, skills, sandboxes, permissions, observability, and recovery." The inner harness (control plane) built on opencode has distinct layers — but they live on TWO AXES, not one flat list. The first draft conflated them. This is the corrected layering.

## The two axes (the structural fix)

- **Capability axis** — what the agent can do or know. These are the layers Addy names.
- **Control axis** — how the loop runs and what enforces it.
- **Packaging axis** — how capability + control get bundled and loaded (plugins).
- **Infrastructure axis** — mechanisms that aren't layers at all (caching).

A flat list of 11 peers was wrong because plugins CONTAIN skills/tools/hooks (nesting), and caching isn't a capability.

## Capability layers (what the agent can do/know)

1. **Skills** — markdown instruction files that teach capability (language/platform patterns), NOT architecture. Read by the LLM, not executed. Live at `~/.agents/skills/*/SKILL.md`. Verified: content-research-writer, sh-humanizer exist. UNVERIFIED: symlink chains into parked pi/claude harnesses (asserted, not probed). Enforcement: instruction only — nothing stops the LLM ignoring a skill. Plan: Phase 4 points opencode at `~/.agents/skills`.

2. **Tools** — capabilities the LLM can call (read, edit, bash, web_search, MCP tools). Built-ins from the outer harness; custom tools via the packaging axis (plugins) or MCP. Verified: opencode built-ins exist; MCP servers configured (context7, tavily, semgrep, headroom). One tool registry (DRY): opencode.jsonc `mcp` block is the source of truth. Plan: Phase 4.

3. **Memory** — persistent context across runs. headroom `--memory --memory-storage project --learn` (per-project SQLite + traffic learning). Verified live: running proxy has memory=true, learn=true. Plan: Phase 3 (plist flags).

4. **Permissions** — what the agent is allowed to do. opencode agent frontmatter (`edit: deny`, `edit: allow` on test globs) + opencode.jsonc `permission` block (`tavily_*: ask`). SPLIT (reviewer correction): this is POLICY/INSTRUCTION (LLM-respected), NOT kernel/sandbox enforcement. The runbook's "physics, not prompts" is overstated here — nothing physically stops a denied edit if the LLM tries; the gate is the harness refusing to execute, which is tool-gating, not OS enforcement. Plan: Phase 4.

5. **Sandbox / isolation** — worktrees, clean env, secret denylist, resource caps. THIS IS WHERE LOW-DAMAGE FAILURE MODES LIVE. Currently NONE (shared cwd). Trigger: first runtime task executing agent-written code. Install-mode host mutations (plists, pipx, symlinks) have NO isolation — only Recovery covers them. Plan: DEFERRED (runtime mode).

## Control mechanisms (how the loop runs and what enforces it)

6. **Hooks** — lifecycle interceptors (pre-tool, post-task, pre-commit, Stop hook). CONDITIONAL, NOT FACT: back-pressure gates REQUIRE hook support, which is UNVERIFIED for opencode's `@opencode-ai/plugin`. If the SDK exposes hooks, back-pressure is a hook layer; if not, it degrades to conductor-side polling. This is the open spike. Plan: open blocker (research note), not a code phase.

7. **Loop primitives** — the control-flow primitives: goal (per-turn evaluator + finish line), loop/schedule (timer), workflow (script orchestrating subagents). opencode ships NONE built-in (verified by app.asar grep). The inner harness must BUILD these. The fourth Claude Code primitive (auto mode) is a permission classifier, not a loop primitive, so three to build. Plan: DEFERRED (runtime mode, trigger: install proven on fresh Mac). Install mode's orchestrator is the HUMAN/CONDUCTOR (the outer loop), NOT a deferred primitive — this is the named flow's two human gates.

8. **Recovery** — state machine + verified rollback. The runbook has a per-phase rollback index (launchctl bootout + pipx uninstall + plist removal). The CLI adds a state file (`~/.agents/state/install-state.json`) with pre-change backups + lockfile + idempotent-skip. Recovery is DISTINCT from observability: rollback without verified state is not recovery. Plan: Phase 0 (state file schema); each phase's rollback in frontmatter (single source — DRY).

9. **Observability** — read-only evidence surfaces. headroom `/dashboard`, `/stats`, `/health`, `proxy-launchd.log`; the verdict/results/spec/tests artifacts the flow writes. Verified: /dashboard works but is undocumented. Plan: Phase 3 (verify field documents /dashboard, since headroom lands there, not Phase 1).

## Packaging axis (how it's bundled)

10. **Plugins** — the opencode PACKAGING UNIT that bundles skills, tools, hooks, and commands. NOT a peer capability layer; it CONTAINS capability-layer entries. Verified: superpowers is installed as a plugin. The CLI itself becomes a plugin for runtime mode (deferred). Plan: Phase 4 wires superpowers; runtime mode is where CLI-as-plugin lands.

## Infrastructure axis (not layers — mechanisms)

11. **Caching** — three mechanisms, split (reviewer correction):
    - **Provider prompt cache** — OpenRouter automatic caching for DeepSeek/Z.AI/Moonshot; sticky routing; `setCacheKey`. Infrastructure.
    - **Proxy compression cache** — headroom `HEADROOM_CACHE_ENABLED`, `--mode token`. Infrastructure.
    - **litellm pricing cache** — the undocumented sync-model-pricing.ts patches it. KNOWN-ISSUE FOOTNOTE, not a layer: it's a bug workaround for `$0.00` savings on new model slugs, not architecture.
    Plan: Phase 3 (headroom plist sets `--mode token`; cache policy is configuration).

## How the axes map to enforcement (the key distinction, corrected)

- **Enforced by outer-harness tool-gating**: Tools (the harness refuses to execute a disallowed call).
- **Enforced by code in the inner harness**: Loop primitives (future), Recovery (state file), Hooks (IF the SDK supports them — unverified).
- **Enforced by infrastructure**: Provider cache, proxy cache, Memory (headroom), Sandbox (worktrees + env — when built).
- **Enforced by instruction only (NOT physics)**: Skills, Permissions (LLM-respected policy). The runbook's "physics, not prompts" applies ONLY to sandbox/hook/recovery mechanisms — NOT to skills or permissions. Scoped correction.
- **Observed, not enforced**: Observability.

## How the axes map to the plan phases

| Layer/mechanism | Install mode | Runtime mode (deferred) |
|---|---|---|
| Skills | Phase 4 | — |
| Tools | Phase 4 (MCP config, one registry) | — |
| Memory | Phase 3 (headroom flags) | — |
| Permissions | Phase 4 (policy, LLM-respected) | — |
| Sandbox | — (install relies on Recovery only) | worktrees + env |
| Hooks | open spike | back-pressure gates |
| Loop primitives | human/conductor (outer loop) | goal/loop/workflow |
| Recovery | Phase 0 (state file) | checkpoints |
| Observability | Phase 3 (/dashboard) | artifact format |
| Plugins | Phase 4 (superpowers) | CLI-as-plugin |
| Caching | Phase 3 (headroom flags) | — |

## What the layering corrects in the plan

1. The plan's "runtime mode" was one deferred blob. It's THREE layers with three different unblock triggers: Hooks (blocked on SDK spike), Loop primitives (blocked on install-proven), Sandbox (blocked on first runtime task executing agent-written code).
2. Install mode has an orchestrator today: the human/conductor running the named flow's two gates. It does NOT need a deferred loop primitive. This makes the dogfooding protocol self-consistent.
3. "Physics, not prompts" is scoped to sandbox/hook/recovery. Skills and permissions are honestly labeled as instruction/policy. The runbook's overclaim gets a correction action, not just a note.
4. Plugins are packaging, not a peer — so "the CLI is a plugin" and "the CLI uses plugins" are different statements on different axes, no contradiction.
