---
date: 2026-08-16
topic: Addy Osmani — deterministic agentic workflow theory (deterministic scaffolding vs LLM judgment, the SDLC loop, orchestration patterns)
status: verified-live
sources:
  - https://addyosmani.com/blog/agent-harness-engineering/
  - https://www.oreilly.com/radar/agent-harness-engineering/
  - https://addyosmani.com/blog/loop-engineering/
  - https://addyosmani.com/blog/agentic-engineering/
  - https://addyosmani.com/blog/agent-skills/
  - https://addyosmani.com/blog/new-sdlc-vibe-coding/
  - https://addyosmani.com/blog/agentic-code-review/
  - https://addyosmani.com/blog/software-factories/
  - https://addyosmani.com/agents/18-orchestrators/
  - https://addyosmani.com/agents/17-agent-skills/
  - https://github.com/addyosmani/agent-skills
  - https://github.com/addyosmani/agent-skills/blob/main/references/orchestration-patterns.md
  - https://github.com/addyosmani/agent-engineer/blob/main/18-orchestrators/README.md
  - https://www.anthropic.com/engineering/building-effective-agents
  - https://simonwillison.net/2024/Dec/20/building-effective-agents/
models_used_for_research: [openrouter/z-ai/glm-5.2]
supersedes: none
---

# Addy Osmani — deterministic agentic workflow theory

Synthesis of Addy Osmani's published writings (May–Aug 2026) on where
deterministic scaffolding belongs vs where LLM judgment belongs, the SDLC loop
pattern he advocates, and the orchestration patterns he endorses. Addy does not
use the phrase "deterministic agentic workflow" as a single named theory; the
thesis is distributed across his harness-engineering, loop-engineering,
agent-skills, SDLC, code-review, and software-factories posts, and is sharpest
in his `agent-engineer` orchestrators lesson. Last verified 2026-08-16.

## The core thesis: deterministic outside, LLM inside

Addy's framing is **hybrid by default**: a deterministic outer skeleton (hooks,
scripts, workflows, slash commands, the user as orchestrator) wraps LLM-driven
flexibility inside each step. The cleanest single statement is in his
`agent-engineer` orchestrators lesson, which distinguishes three orchestrator
types:

> "Deterministic (workflow-based): The control flow is predefined. The
> orchestrator follows a fixed blueprint — it does not consult an LLM to decide
> what happens next... Dynamic (LLM-driven): The orchestrator uses an LLM to
> decide what happens next... Hybrid (the practical choice): Most production
> systems combine both approaches. They use deterministic orchestration for the
> overall structure while allowing LLM-driven flexibility within individual
> steps."
> — https://addyosmani.com/agents/18-orchestrators/

He credits Dex (Horthy) with the line he keeps returning to:

> "mostly deterministic code, with LLM steps sprinkled in at just the right
> points."
> — quoted in https://addyosmani.com/blog/software-factories/

The harness-engineering post (also on O'Reilly Radar, May 2026) names the
deterministic layer explicitly:

> "Hooks and middleware for deterministic execution (compaction, continuation,
> lint checks)."
> — https://addyosmani.com/blog/agent-harness-engineering/

and frames the design loop as **behaviour we want → harness piece that delivers
it** (Viv Trivedy's pattern Addy adopts). The agent's job is reasoning; the
harness's job is everything the agent would otherwise skip.

## Where deterministic scaffolding goes (and where LLM judgment goes)

From harness-engineering + agent-skills + SDLC, the split Addy advocates:

| Concern | Mechanism | Owner |
|---|---|---|
| Run typecheck/lint/tests after every edit | **Hooks** (deterministic, silent-on-success, verbose-on-failure) | harness |
| Block destructive bash (`rm -rf`, `git push --force`, `DROP TABLE`) | **Hooks / permissions** | harness |
| Require approval before PR / push to main | **Permission gate** | harness |
| Auto-format on write | **Formatter hook** | harness |
| Compaction / continuation when context fills | **Harness middleware** | harness |
| What spec to write, what to test, how to review | **Skills** (workflow chunks with exit criteria) | LLM interprets, harness enforces exit |
| Decompose a goal into steps | **Planning** (model writes plan file; harness reminds how to use it) | LLM |
| Self-verification after each step | **Hooks run the test suite, loop failures back into the model** | harness + LLM |
| Decide what subtasks to fan out | **Orchestrator-workers pattern** (LLM plans, workers execute) | LLM |
| Judge whether the work is done | **Separate evaluator agent / model** (maker-checker split) | LLM, but a *different* LLM |

The principle Addy states most forcibly, citing HumanLayer:

> "Success is silent; failures are verbose. If typecheck passes, the agent hears
> nothing. If it fails, the error text gets injected into the loop and the
> agent self-corrects."
> — https://addyosmani.com/blog/agent-harness-engineering/

And the boundary he refuses to let the model cross:

> "Deterministic gates are the one part of the pipeline that cannot be talked
> out of their verdict by a confident paragraph, so keep them strict."
> — https://addyosmani.com/blog/agentic-code-review/

## The SDLC loop pattern in practice: `/spec -> /plan -> /build -> /test -> /review -> /ship`

Addy's `agent-skills` repo (27K+ stars as of Aug 2026) is the concrete artifact.
It packages the SDLC as **6 lifecycle phases with 7 slash commands sitting on
top**, each command activating the relevant skills automatically:

| Phase | Command | Key principle |
|---|---|---|
| Define | `/spec` | Spec before code |
| Plan | `/plan` | Small, atomic tasks |
| Build | `/build` | One slice at a time |
| Verify | `/test` | Tests are proof |
| Review | `/review` | Improve code health |
| Ship | `/ship` | Faster is safer |
| (cross-cutting) | `/code-simplify` | Clarity over cleverness |

Plus `/build auto` — "generates the plan and implements every task in a single
approved pass... removes the human stepping *between* tasks, not the
verification: every task is still test-driven and committed individually, and it
pauses on failures or risky steps." (https://github.com/addyosmani/agent-skills)

The 24 skills (23 lifecycle + 1 meta-skill `using-agent-skills` which acts as a
router) are **workflows, not reference docs**: "a sequence of steps the agent
follows, with checkpoints that produce evidence, ending in a defined exit
criterion." (https://addyosmani.com/blog/agent-skills/) Five design choices:

1. **Process, not prose** — skills are workflows agents follow, not docs they read.
2. **Anti-rationalization** — every skill includes a table of excuses ("I'll add
   tests later") with counter-arguments, so the agent cannot talk itself out of
   a step.
3. **Verification is non-negotiable** — every skill ends with evidence
   (tests pass, build clean, reviewer signs off). "'Seems right' is never
   sufficient."
4. **Progressive disclosure** — only skill name + description (~100 tokens)
   loaded at startup; full SKILL.md loads on trigger; references load on
   demand. A 20-skill library fits a 5K-token slot.
5. **Scope discipline** — "touch only what you're asked to touch." The
   single biggest determinant of whether a PR is mergeable.

The loop-engineering post names the six primitives that turn a single run into
a self-driving loop:

> "1. Automations that go off on a schedule and do discovery and triage by
> themselves. 2. Worktrees so two agents working in parallel don't step on each
> other. 3. Skills to write down the project knowledge the agent would
> otherwise just guess. 4. Plugins and connectors to plug the agent into the
> tools you already use. 5. Sub-agents so one of them has the idea and a
> different one checks it."
> — https://addyosmani.com/blog/loop-engineering/

The maker/checker split is load-bearing: "The model that wrote the code is way
too nice grading its own homework. A second agent with different instructions
and sometimes a different model catches the stuff the first one talked itself
into." (same source). Claude Code's `/goal` and Codex's `/goal` both implement
this: "after every turn a separate small model checks whether you are done, so
the agent that wrote the code isn't the one grading it."

## The orchestration patterns (Anthropic's five + Addy's additions)

Addy endorses Anthropic's "Building Effective Agents" (Dec 2024, Erik Schluntz
& Barry Zhang) five workflow patterns — the canonical names the user asked
about. Anthropic's definitions (https://www.anthropic.com/engineering/building-effective-agents,
via https://simonwillison.net/2024/Dec/20/building-effective-agents/):

1. **Prompt chaining** — "decomposes a task into a sequence of steps, where each
   LLM call processes the output of the previous one. You can add programmatic
   checks ('gates') on any intermediate steps." Use when: task splits cleanly
   into fixed subtasks; trade latency for accuracy.
2. **Routing** — "classifies an input and directs it to a specialized followup
   task." Use when: distinct categories better handled separately; a small
   classifier + a strong specialist beats one giant prompt.
3. **Parallelization** — "LLMs work simultaneously on a task and have their
   outputs aggregated programmatically." Two flavors: **sectioning** (independent
   subtasks) and **voting** (same task, multiple attempts, combine).
4. **Orchestrator-workers** — "a central LLM dynamically breaks down tasks,
   delegates them to worker LLMs, and synthesizes their results." Key difference
   from parallelization: subtasks are NOT pre-defined; the orchestrator decides
   them at runtime. Use for coding (number of files to change is unknown).
5. **Evaluator-optimizer** — "one LLM call generates a response while another
   provides evaluation and feedback in a loop." Use when: clear evaluation
   criteria + iterative refinement adds value. The loop lives in code, so it
   can never run away — `max_rounds` is "the whole safety story."

Addy's `agent-skills` repo's `references/orchestration-patterns.md`
(https://github.com/addyosmani/agent-skills/blob/main/references/orchestration-patterns.md)
adds a governing rule and **anti-patterns** that sharpen these:

> "The governing rule: **the user (or a slash command) is the orchestrator.
> Personas do not invoke other personas.** Skills are mandatory hops inside a
> persona's workflow."

Endorsed patterns there: (1) Direct invocation, (2) Single-persona slash
command, (3) Parallel fan-out with merge, (4) Sequential pipeline as
user-driven slash commands, (5) Research isolation (spawn a read-only sub-agent
that returns only a digest).

**Anti-patterns Addy calls out:**
- **A. Router persona ("meta-orchestrator")** — don't build an LLM that routes
  to other LLMs; add slash commands instead, document intent->command in
  AGENTS.md.
- **B. Persona that calls another persona** — have the calling persona
  *recommend* a follow-up audit; the user runs the second pass.
- **C. Sequential orchestrator that paraphrases** — keep the user as
  orchestrator; an LLM lifecycle orchestrator loses nuance, skips human
  checkpoints, and doubles token cost via paraphrasing.
- **D. Deep persona trees** — keep orchestration depth <= 1 (slash command ->
  personas; merge in the main agent).

The `agent-engineer` orchestrators lesson
(https://github.com/addyosmani/agent-engineer/blob/main/18-orchestrators/README.md)
maps these to Google ADK's deterministic primitives: `SequentialAgent`,
`ParallelAgent`, `LoopAgent` — "These are deterministic — no LLM is involved in
the orchestration decisions. The LLM is only used within the individual
sub-agents for their specific tasks." For dynamic routing, ADK uses a parent
`LlmAgent` with sub-agents. Addy's summary table:

| Pattern | Predictability | Flexibility | Token cost | Best for |
|---|---|---|---|---|
| Sequential | High | Low | Low | Clear step-by-step |
| Parallel | High | Low | Medium | Independent analysis |
| Loop | Medium | Medium | Variable | Quality refinement |
| Routing | High | Medium | Low | Multi-domain classification |
| Hierarchical | Medium | High | Higher | Complex multi-step research |
| Group chat | Low | High | Highest | Consensus/brainstorm |

## Structured outputs, tool-use boundaries, the sprint contract

Addy's harness-engineering post names the planner/generator/evaluator split and
the **sprint contract** explicitly:

> "Anthropic's long-running harness work is explicit that separating generation
> from evaluation into distinct agents outperforms self-evaluation, because
> agents reliably skew positive when grading their own work. It's GANs for
> prose. The related pattern is the sprint contract, where the generator and
> evaluator negotiate what 'done' actually means before code gets written. In
> my own workflows, writing down the done condition before starting has caught
> more scope drift than any prompt change I've ever made."
> — https://addyosmani.com/blog/agent-harness-engineering/

On tool-use boundaries: the SDLC post splits context into **static** (loaded
every turn: AGENTS.md, CLAUDE.md, GEMINI.md, global memory, core guardrails —
reliable but expensive) vs **dynamic** (loaded on demand: skills that fire on
trigger, tool results, RAG — you only pay for what a task touches). The
architectural advice: "treat the boundary as a real architectural decision:
reviewed in a pull request, versioned like code."
(https://addyosmani.com/blog/new-sdlc-vibe-coding/)

On structured outputs specifically — Addy does not write a dedicated post on
JSON-schema-forced outputs; his treatment is implicit in skills (each skill has
"defined exit criteria" that produce evidence) and in the agent-engineer
orchestrators lesson's "validate between steps" rule: "In a sequential pipeline,
validate each agent's output before passing it to the next. A malformed or
off-topic result from Agent A will cascade through Agents B and C, wasting tokens
and producing garbage."

## The outer loop vs the inner loop (who owns what)

The sharpest statement of where the human stays:

> "I think engineers need to increasingly own the outer loop. The agents can
> investigate a bug, write up the diagnosis, implement the fix, run the tests,
> and write up a report. That's the execution of the inner loop... The bits you
> own are what I'd call the outer loop: decide whether it's the right way to
> address the problem, verify that the diagnosis and implementation are sound,
> approve the change, and carry the consequences of being wrong."
> — https://addyosmani.com/blog/software-factories/

The SDLC post names two modes the Day-1 paper calls **conductor** (real-time, in
the IDE, keystroke-by-keystroke — good for exploring) vs **orchestrator**
(async, hand a goal to one or more agents and review what comes back — good for
well-specified work like migrations). "I think the move from conductor to
orchestrator is a skills shift before it's a tooling one."
(https://addyosmani.com/blog/new-sdlc-vibe-coding/)

## What Addy does NOT say (gaps the user asked about)

- He does **not** publish a single post titled "deterministic agentic
  workflows." The thesis is spread across harness-engineering, loop-engineering,
  agent-skills, the SDLC post, code-review, and software-factories, and is
  most concrete in the `agent-engineer` orchestrators lesson and the
  `agent-skills` repo's `orchestration-patterns.md`.
- He uses "deterministic vs dynamic," not "deterministic vs probabilistic." The
  spirit is the same; the word is not.
- He does not prescribe a specific JSON-schema-forced-structured-output
  framework; structured output is implicit in skills' exit criteria and the
  "validate between steps" rule.
- The five Anthropic patterns (prompt chaining, routing, parallelization,
  orchestrator-workers, evaluator-optimizer) are **Anthropic's**, not Addy's
  coinage. Addy endorses and operationalizes them in `agent-skills`.

## Open questions

1. Addy's `agent-skills` repo ships a Claude-Code-native install path
   (`/slash-commands`). The same `SKILL.md` files are portable to Cursor
   (`.cursor/rules/`), Gemini CLI, Codex, Aider, Windsurf, OpenCode. But the
   **slash-command layer** (the `/spec /plan /build...` lifecycle) is
   Claude-Code-specific. How much of the lifecycle survives when the
   slash-command layer is absent (e.g. on opencode, which has commands but not
   these specific ones)? — UNVERIFIED; the repo says "Mode 2: drop the markdown
   into your tool of choice" but does not claim the slash commands port.
2. Addy cites Google ADK's `SequentialAgent`/`ParallelAgent`/`LoopAgent` as the
   deterministic-primitive reference. Is there an equivalent deterministic
   primitive set in the Claude Agent SDK or Codex SDK? — NOT checked in this
   dispatch; the loop-primitives note (2026-08-15) covers `/goal`/`/loop`/
   `/schedule`/workflows/agent-loop but did not compare to ADK's named classes.
3. The "sprint contract" (generator + evaluator negotiate done before code) —
   is there a public implementation, or is it a pattern description only? —
   UNVERIFIED; Addy describes it as a pattern, the agent-skills repo does not
   ship a sprint-contract skill by that name.
