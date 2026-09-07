---
date: 2026-08-16
topic: "Primitive selection: prompt vs skill vs agent vs script vs workflow vs hook"
status: adopted
sources:
  - https://docs.anthropic.com
  - https://learn.microsoft.com/en-us/agent-framework/agents/skills
  - https://genaiunplugged.substack.com/p/claude-code-skills-commands-hooks-agents
  - https://gist.github.com/zeke/1e0ba44eaddb16afa6edc91fec778935
  - https://gouthamnekalapu.com/posts/hooks-across-ecosystems
  - https://waveassist.ai/blog/deterministic-vs-agentic-ai-agents
  - https://arxiv.org/html/2602.12430v4
  - https://duet.so/guides/claude-code-skills-complete-guide
models_used_for_research: [z-ai/glm-5.2]
supersedes: none
---

# Primitive selection: prompt vs skill vs agent vs script vs workflow vs hook
- **Last verified**: 2026-08-16
- **Status**: current
- **Related**: [[2026-08-16-agentsmd-hygiene]], [[2026-08-16-model-tiered-agents]]

## Sources

- [Anthropic Agent Skills — Claude API Docs / Oct 2025 launch, Dec 2025 open standard](https://docs.anthropic.com) — defines SKILL.md as the on-demand procedural-knowledge primitive; progressive disclosure (catalog → activate → execute); cross-platform standard adopted by OpenAI, Cursor, Gemini, Codex.
- [Microsoft Agent Framework — Agent Skills (updated 2026-08-10)](https://learn.microsoft.com/en-us/agent-framework/agents/skills) — the canonical skills-vs-workflows decision: control (AI-decides vs explicit-path), resilience (single-turn retry vs checkpointed resume), side effects (idempotent vs must-not-repeat). The single cleanest statement of the workflow boundary.
- [Claude Code Skills vs Hooks vs Agents vs CLAUDE.md — genaiunplugged](https://genaiunplugged.substack.com/p/claude-code-skills-commands-hooks-agents) — the deterministic-vs-probabilistic axis: CLAUDE.md and hooks are deterministic (run every time); skills and agents are probabilistic (model judgment). Exit code 2 = the only hard block.
- [OpenCode vs Claude Code Hooks Comparison — gist/zeke](https://gist.github.com/zeke/1e0ba44eaddb16afa6edc91fec778935) + [Hooks Architectures Across Ecosystems — Goutham Nekkalapu](https://gouthamnekalapu.com/posts/hooks-across-ecosystems) — opencode is plugin-based hooks (TS modules, ~25 events, block by throwing Error), not config-based; event bus: tool.execute.before/after, session.*, file.edited, permission.ask.
- [Deterministic vs Agentic — WaveAssist](https://waveassist.ai/blog/deterministic-vs-agentic-ai-agents) — when a script beats an agent: 79% of multi-agent failures are spec/coordination, not infra; scoped deterministic pipelines calling a model for one well-scoped step beat fat harness loops on reliability.
- [Agent Skills for LLMs: Architecture, Acquisition, Security — arXiv 2602.12430](https://arxiv.org/html/2602.12430v4) — skills vs MCP dimension table (procedural knowledge vs tool connectivity; filesystem-persisted vs session-based); confirms industry convergence on the abstraction.
- [Claude Code Subagents & Skills Complete Guide — duet.so (2026)](https://duet.so/guides/claude-code-skills-complete-guide) — subagent = isolated context + own tools + own model; `context: fork` runs a skill inside a subagent (not mutually exclusive); 500-line SKILL.md rule.

## Findings

### What each primitive IS in 2026 (tied to this user's inventory)

| Primitive | One-line definition | Lives in this stack | Load model | Determinism |
|---|---|---|---|---|
| **Reusable prompt** | A manually-triggered instruction shortcut; lives in the conversation, not persisted. | Inline prompt or slash command | Manual, in-turn | n/a (human fires it) |
| **Skill** | A sometimes-relevant PROCEDURE (trigger + termination) the agent loads on demand via progressive disclosure. | `~/.agents/skills/*/SKILL.md` + superpowers plugin cache | Agent-judged, on-demand | Probabilistic |
| **Custom agent (subagent)** | A runtime execution unit with its own context window, tools, model, and permission scope. | `~/.config/opencode/agents/*.md` (mode: subagent) | Dispatched by conductor or `@mention` | Probabilistic (isolated) |
| **Script** | A deterministic TypeScript program executed by bun; the contract/reproducibility layer. | `~/.agents/bin/src/*.ts` | Invoked explicitly or by agent | Deterministic |
| **Workflow** | A deterministic, checkpointed, resumable multi-step process where steps have side effects that must not re-execute on retry. | Not yet present (would be a `.ts` orchestrator + state file, or a future flow.yaml) | Engine-driven, step-by-step | Deterministic path |
| **Hook** | A harness-enforced lifecycle handler that fires at an event regardless of what the model decides; can block. | **NONE currently** — would be `.opencode/plugin/*.ts` or `~/.config/opencode/plugin/*.ts` | Event-driven, always | Deterministic |
| **AGENTS.md / config** | The always-on constitution: identity, policy, principles. Taxed every turn. | `~/.config/opencode/AGENTS.md` + `opencode.jsonc` | Always loaded | Deterministic (prose, but always-on) |

### The three load-bearing distinctions (from prior research + 2026 sources)

1. **Always-on vs on-demand.** AGENTS.md and config load every turn; everything else loads conditionally. The cost of always-on is context tax on every turn — so it earns its place only when the content is short AND always relevant. Prior research nailed this: AGENTS.md = constitution; skill = on-demand procedure.

2. **Deterministic vs probabilistic.** Hooks and scripts are deterministic — they run the same way every time, enforced by the harness or by code. Skills and agents are probabilistic — the model uses judgment about when and how to apply them. This is the single most-missed distinction (genaiunplugged, MindStudio). If a missed step is an *annoyance*, a skill is fine; if a missed step is a *security or correctness failure*, you need a hook.

3. **Single-turn vs checkpointed.** A skill runs within a single agent turn — if it fails, the whole operation retries. A workflow checkpoints after each step and resumes from the last success. Workflows earn their weight when (a) steps have side effects that must not repeat (emails, payments, PRs, DB writes) or (b) the process is long enough that re-executing from scratch is expensive (Microsoft Agent Framework, Aug 2026).

## Decision framework

### Primary decision tree (answer in order)

```
1. Must it fire EVERY time at a lifecycle event, no exceptions,
   regardless of what the model decides?
   YES → HOOK (harness-enforced, can block)
   NO  → continue

2. Is it a short, always-relevant fact or policy that should apply
   to every turn?
   YES → AGENTS.md / config (always-on)
   NO  → continue

3. Do the steps have side effects that MUST NOT re-execute on retry,
   OR does the process need checkpointing / resumability across a
   long multi-step run?
   YES → WORKFLOW (deterministic, checkpointed)
   NO  → continue

4. Is the work fully deterministic with no language reasoning needed
   (API calls, file ops, formatting, validation, version checks)?
   YES → SCRIPT (deterministic, testable, cheap)
   NO  → continue

5. Does it need its own context window, own tool set, own model,
   or parallel execution isolated from the main session?
   YES → CUSTOM AGENT / SUBAGENT
   NO  → continue

6. Is it a sometimes-relevant PROCEDURE with a clear trigger and
   termination that the agent should apply on demand?
   YES → SKILL (on-demand, progressive disclosure)
   NO  → continue

7. Is it a one-off or a manually-triggered instruction shortcut?
   YES → REUSABLE PROMPT (slash command / inline)
```

### Routing table

| Condition | Primitive | Why |
|---|---|---|
| "Never commit secrets; block the write before it happens" | **Hook** (`tool.execute.before` + deny) | Must fire every time; a skill can be forgotten; only a hook can hard-block. |
| "Run biome on every file edit" | **Hook** (`tool.execute.after` on Write/Edit) | Deterministic formatting; model shouldn't have to remember. |
| "The conductor pattern, YAGNI, scripting standard" | **AGENTS.md** | Short, always-relevant policy; applies to every turn. |
| "Model routing defaults: glm-5.2 workhorse, flash scout" | **AGENTS.md** + **config** | Always-on; config holds the wiring, AGENTS.md holds the rationale. |
| "Cross-model adversarial review with a $2 budget cap" | **Script** (`reviewer-loop.ts`) | Deterministic dispatch + budget enforcement belongs in code, not prose. A prose cap is not a circuit breaker. |
| "Weekly version-drift check across the stack" | **Script** (`stack-check.ts`) | Deterministic, scheduled, report-only. No judgment needed. |
| "Triage a dumped mega-prompt into structured intent + acceptance criteria" | **Skill** (`prompt-triage`) | Sometimes-relevant procedure with a trigger (mega-prompt detected) and termination (structured intent emitted). Model judgment required. |
| "Verify work against human-owned criteria before claiming done" | **Skill** + **Hook** pair | The *procedure* (how to verify) is a skill; the *gate* (block "done" without evidence) is a `Stop`/`session.idle` hook. |
| "Stop restating rules, closing ceremony, post-ambles" | **AGENTS.md** (always-on policy) | This is a behavior that must apply to EVERY turn, not on-demand. A skill fires conditionally; this must be always-on. |
| "E2E/UAT test authoring from human criteria, scoped to test files only" | **Custom agent** (`qa.md`) | Needs isolated context, restricted permissions (test files only), own model. Exactly what the user built. |
| "Fast read-only codebase scouting before the conductor plans" | **Custom agent** (`scout.md`, flash model) | Isolated context, cheap model, read-only — keeps verbose output out of main context. |
| "Open a PR: branch → commit → push → create PR → comment" | **Workflow** | Side effects (push, PR creation) must not re-execute on retry; needs checkpointing. A skill would retry the whole thing. |
| "Run database migrations forward, with rollback on failure" | **Workflow** | Side effects (DB writes) are not idempotent; checkpoint per migration. |
| "Format/lint this file once" | **Script** (or hook) | Deterministic, no reasoning. If it should be automatic → hook; if manual → script. |
| "How to debug a failing test systematically" | **Skill** (superpowers `systematic-debugging`) | Procedure with trigger (bug/failure) and termination (root cause + fix). Model judgment throughout. |
| "What's the current price of qwen3.8 on OpenRouter?" | **Script** (`sync-model-pricing.ts`) | Deterministic fetch + normalize. No judgment. |

### The two axes that disambiguate most cases

Plot any candidate on these two axes:

```
            Deterministic  ←————————→  Probabilistic
                 |                          |
Always-on   AGENTS.md/config          (n/a — if it's
            hooks (enforced)            probabilistic AND
                                         always-on, it's
                                         just AGENTS.md prose)
                 |
On-demand       scripts              skills
                workflows            agents
                hooks (event-gated)   prompts (human-gated)
```

- **Always-on + deterministic** = AGENTS.md / config / hooks
- **On-demand + deterministic** = scripts / workflows / event-gated hooks
- **On-demand + probabilistic** = skills / agents / prompts
- **Always-on + probabilistic** doesn't exist as a distinct primitive — it's just AGENTS.md prose the model is told to follow.

## Primitive inventory for THIS user

### Skills (`~/.agents/skills/` + superpowers plugin)

| Skill | When to extend | When to switch primitive |
|---|---|---|
| `content-research-writer` | Add reference templates, citation format variants | If it becomes a deterministic citation formatter → script |
| `sh-humanizer` | Add voice-sample corpus, edge-case patterns | If "humanize" becomes a fixed find-replace list → script |
| superpowers: `brainstorming`, `systematic-debugging`, `test-driven-development`, `verification-before-completion`, `writing-plans`, etc. (~14) | Tune trigger descriptions to the user's vocabulary | These are correctly skills — on-demand procedures with triggers |

**Gap**: No skill currently enforces verification rituals or triages prompts. The 3 candidate skills address this (see Recommendations).

### Agents (`~/.config/opencode/agents/`)

| Agent | Role | Correctly an agent? |
|---|---|---|
| `scout.md` | Fast read-only scouting, flash model | Yes — isolated context, cheap model, read-only |
| `reviewer.md` | Cross-model adversarial review | Yes — but the *dispatch* is a script (`reviewer-loop.ts`); the agent is the reviewer persona |
| `plan-reviewer.md` | Plan review gate | Yes — isolated judgment, own context |
| `qa.md` | E2E/UAT gate, scoped to test files only | Yes — permission isolation is the key reason (edit only `*test*`) |

All four are correctly subagents. The conductor delegates; they execute in isolation.

### Scripts (`~/.agents/bin/src/`)

| Script | Why a script (not a skill/agent) |
|---|---|
| `stack-check.ts` | Deterministic version-drift check, scheduled, report-only |
| `reviewer-loop.ts` | Deterministic dispatch + budget cap enforcement; a prose cap is not a circuit breaker |
| `sync-model-pricing.ts` | Deterministic API fetch + normalize; no judgment |
| `prefix-diff.ts` | Byte-diff cache-bust detection; pure computation |
| `cache-probe.ts` | Deterministic cache verification through the proxy |

All correctly scripts. The AGENTS.md scripting standard ("anything used twice MUST be promoted to a durable .ts script") is the right policy and matches the 2026 guidance: deterministic work belongs in code, not in prompts.

### Hooks — **NONE (gap)**

The user has zero hooks. `.opencode/plugin/` and `~/.config/opencode/plugin/` do not exist. This is the single biggest inventory gap. Several of his documented problems are deterministic-enforcement candidates that hooks solve better than skills or AGENTS.md prose:

- "Verification before claims" — a `Stop` / `session.idle` hook could block completion claims lacking fresh command output.
- "Closing ceremony" — could be trimmed by a `PreCompact` or system-prompt transform hook, though AGENTS.md is the better lever (see Recommendations).
- "Never commit secrets" — a `tool.execute.before` hook on Write/Edit/Bash could deny writes matching a secret pattern. Currently relies on AGENTS.md prose, which is probabilistic.

### AGENTS.md (`~/.config/opencode/AGENTS.md`)

Currently holds: conductor pattern, core principles, scripting standard, test guardrails, model routing. This is correctly always-on policy. But two of the user's problems belong here and are absent:
- "Stop restating rules" — the agent restates because the rules are verbose and it's hedging. A tighter, imperative AGENTS.md reduces this.
- "Closing ceremony" — an explicit "no preamble, no postamble, answer in <4 lines" directive belongs here as always-on policy, not as an on-demand skill.

### Config (`opencode.jsonc`)

Provider routing, model defaults, MCP servers, permissions. Correctly config. The `permission` block (`tavily_*: ask`) is a deterministic gate — this is config doing hook-like work, which is fine for simple cases.

## Boundary cases

### Skill-that-is-really-a-script
If a skill's body is "run this command and report the result" with no model judgment in between, it's a script wearing a skill's clothes. **Test**: could a shell script do this end-to-end? If yes → script, and call it from a skill or hook if the agent needs to trigger it. The user's `reviewer-loop.ts` is the right pattern: the *dispatch* is a script; a thin skill could invoke it, but the logic lives in code.

### Agent-that-should-be-a-hook
If an agent's entire job is "enforce that X happens / doesn't happen," it's a hook. Agents are for *doing work in isolation*; hooks are for *enforcing policy at the boundary*. **Test**: is the agent making a judgment, or just checking a condition and blocking? If just checking → hook. Example: an agent that "reviews for secrets before commit" → should be a `tool.execute.before` hook with a deny pattern.

### Skill-that-should-be-AGENTS.md
If the skill has no real trigger condition — it applies to every turn — it's AGENTS.md prose paying the on-demand tax for nothing. **Test**: is there a clear "when NOT to use this skill"? If you can't write one, it's always-on. Example: "no-closing-ceremony" has no trigger — it applies always → AGENTS.md.

### Hook-that-is-really-a-skill
If the hook needs to *reason* about whether to block (not just pattern-match), the model should do that reasoning — in a skill. Hooks are for deterministic checks; skills are for judgment. **Test**: can the decision be a regex / exit code? If you need the LLM to decide → skill, and use the hook only for the hard block after the skill signals.

### Workflow-that-is-really-a-script
If the "workflow" is a single deterministic path with no LLM in the loop and no side effects that need guarding, it's just a script. **Test**: are there checkpoints and non-idempotent side effects? If neither → script. Workflows earn their complexity when retry-safety matters.

### Prompt-that-should-be-a-skill
Per the user's own scripting standard ("anything used twice MUST be promoted"): if a prompt is reused, promote it to a skill. **Test**: have you pasted this prompt more than once? → skill. The mega-prompt problem is partly a failure to promote.

## Recommendations

1. **`no-closing-ceremony` is NOT a skill — put it in AGENTS.md.** It has no trigger condition; it applies to every turn. A skill fires on-demand; this must be always-on. Add a tight imperative directive to `~/.config/opencode/AGENTS.md`: "Answer in <4 lines. No preamble, no postamble, no restating the question, no summary of what you did." This also addresses "restating rules" — verbose rules invite verbose restating.

2. **`verify-with-criteria` is correctly a skill, but pair it with a hook.** The *procedure* (how to verify against human criteria) is a skill. The *enforcement* (block "done"/"complete"/"fixed" claims that lack fresh command output + exit codes) is a `Stop` or `session.idle` hook. The user has zero hooks — this is the highest-value one to build first. A skill alone is probabilistic; the user's "undefined verification rituals" problem is precisely a deterministic-enforcement gap.

3. **`prompt-triage` is correctly a skill.** It's a sometimes-relevant procedure: trigger = a dumped mega-prompt; termination = structured intent + acceptance criteria emitted. Model judgment is required to decompose the prompt. This correctly lives in `~/.agents/skills/prompt-triage/SKILL.md`. Optional later: a `chat.message` hook that detects mega-prompt patterns and *suggests* the skill — but the triage itself stays a skill.

4. **Build the first hook: a verification gate.** Create `~/.config/opencode/plugin/verify-gate.ts` subscribing to `session.idle` (or `tool.execute.after` on a "claim complete" pattern). Logic: if the agent's last message claims completion but the turn produced no fresh command output, inject a context note forcing evidence. This converts the "verification before claims" principle from AGENTS.md prose (probabilistic) into harness enforcement (deterministic). This is the single highest-leverage move — it addresses the user's core reliability problem with the primitive he's entirely missing.

5. **Keep scripts as the determinism backbone; resist agent-ifying them.** The user's `reviewer-loop.ts` is exemplary: budget cap and dispatch in code, model only for the review judgment. 2026 evidence (WaveAssist, arXiv survey) confirms scoped deterministic pipelines calling a model for one well-scoped step beat fat harness loops. The AGENTS.md rule "anything used twice → promote to a .ts script" is correct and should be defended against the temptation to make everything an agent.

6. **Defer workflows until a real side-effect + checkpoint need appears.** No current task has non-idempotent side effects requiring checkpointed resume (PRs, migrations, payments). Per YAGNI: defer with a NAME — trigger = "a process where re-executing failed steps would send a duplicate email / PR / charge." Until then, scripts + the conductor pattern cover the ground. A premature workflow adds ceremony without the property that justifies it.

## Open questions / next steps

- **Hook-surface probe**: confirm which opencode plugin events actually fire in the user's version (event names drift between docs and runtime). Build a tiny probe plugin that logs every event, run one session, verify the event list. This de-risks recommendation #4.
- **AGENTS.md hygiene pass**: audit `~/.config/opencode/AGENTS.md` for content that is on-demand prose masquerading as always-on (e.g., detailed test rubrics that belong in a skill). Candidates for extraction → skills. This is the `[[2026-08-16-agentsmd-hygiene]]` companion note.
- **Model-tiered agents review**: the 4 subagents all use glm-5.2 or inherit. Verify whether scout should drop to flash (it may already) and whether plan-reviewer should use qwen3.8 per the routing defaults. This is the `[[2026-08-16-model-tiered-agents]]` companion note.
- **Skill description tuning**: vague skill descriptions fire on everything (genaiunplugged's debugging story). Audit the 3 candidate skills' `description` fields for specificity before deploying — write them like search queries with real trigger phrases.
- **flow.yaml trigger**: per prior research (inner-harness-vocabulary), the stage graph becomes machine-readable only when runtime mode + hook surface are proven. That trigger is now closer if recommendation #4 lands.
