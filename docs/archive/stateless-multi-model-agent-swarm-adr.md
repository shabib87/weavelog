# Architecture Decision Record: Stateless Multi-Model Open-Weight Agent Swarm Harness

**Status:** Accepted
**Date:** June 27, 2026
**Supersedes:** `stateless-multi-model-agent-swarm-adr.md` (Under Review)
**Target System:** Personal Agentic Loop Engineering CLI — Self-Contained Workspace Harness

***

## 1. Context & June 2026 Architectural Drivers

The goal is a minimal, reusable agentic harness that can bootstrap any new project or workspace — software engineering or technical writing (blogs, ADRs, PRDs, TRDs) — with a pre-defined agent team (roles, model tiers, tool permissions, skills), a reviewable diff loop, and a self-contained workspace boundary that prevents rogue agent access to unrelated directories. The system must support mobile app development workflows (Swift/KMP/Kotlin) without requiring Docker or container runtimes, which are incompatible with Xcode, Android Studio, iOS simulators, and native mobile SDKs.

The June 2026 open-weight model landscape has reached near-frontier capability at a fraction of the cost of proprietary models[^1][^2]. GLM-5.2 (MIT, released June 13, 2026) scores #1 on the Artificial Analysis Intelligence Index v4.1 and achieves 62.1% on SWE-bench Pro — above GPT-5.5 (58.6%)[^2][^3]. DeepSeek V4 Pro (Apache 2.0) and Devstral 2 (modified MIT) round out a capable open-weight tier that removes the operational dependency on proprietary frontier APIs for everyday agentic loops[^4][^5][^6].

### Primary Architectural Drivers

1. **Open-weight first:** 100% open-weight stack by default. Proprietary frontier models (Claude Opus 4.8, GPT-5.5) available only as explicit opt-in via `--review-model` flag — never on the default execution path.
2. **Minimal infrastructure overhead:** No Docker, no litellm, no local GPU pipelines. All model inference routes through OpenRouter with ZDR enforcement — purely variable, pay-per-token.
3. **Zero Data Retention (ZDR):** All upstream providers selected for ZDR compliance. Engineering payloads never persist to disk at any provider node.
4. **Self-contained workspace isolation:** Workspaces are filesystem-scoped git repositories with explicit MUST NOT boundaries enforced by agent configs — not container-based. Mobile toolchains (Xcode, Android Studio, Gradle, KMM) require native host access that containers break.
5. **Reviewable diff loop:** Every agent write is reviewable as a structured diff before acceptance. No silent bulk changes.
6. **Token cost control:** Headroom (Apache 2.0) wraps the entire execution loop, compressing 60–95% of tool outputs before they reach the LLM.

***

## 2. Architectural Decisions

### 2.1 Harness Host: Pi (pi.dev)

Pi is selected as the primary harness host[^7][^8]. It is a minimal MIT-licensed terminal coding agent with a system prompt under 1,000 tokens (fully auditable), four core tools (read, write, edit, bash), JSONL session tree branching (`/fork`, `/tree`), and native support for 324 models across 15+ providers via BYOK configuration[^7]. The session-tree architecture is critical for agentic loop engineering: execution branches can be forked mid-task, divergent approaches explored in parallel sessions, and the superior branch merged — a capability absent in linear-commit agents.

Pi natively reads `OPENAI_API_BASE` and `OPENAI_API_KEY`, making OpenRouter integration a one-line environment variable set with no code changes[^9][^10].

The `pi-diff-review` plugin provides structured turn-by-turn diff overlays (`/diff`, `/diff --cached`, `/diff main...HEAD`) before any write is committed[^11]. This is the primary human-in-the-loop gate for the agentic loop.

### 2.2 Context Compression Layer: Headroom

Headroom (Apache 2.0, 52.4k GitHub stars) integrates with Pi via the `@ryan_nookpi/pi-extension-headroom` Pi package (`pi install npm:@ryan_nookpi/pi-extension-headroom`), which auto-manages a local Headroom proxy that intercepts all outbound requests and compresses tool outputs, logs, RAG chunks, and file reads before they reach OpenRouter. Real-world savings on agentic coding workloads: 92% on code search (100 results), 92% on SRE incident debugging, 73% on GitHub issue triage. On Opus-class models where output costs 5× input, Headroom's output shaper (`HEADROOM_OUTPUT_SHAPER=1`) additionally trims verbose preambles and restated context.

Cross-agent shared memory (`SharedContext`) allows context to persist and be passed between Pi sessions and any auxiliary agents without re-sending full payloads. The `headroom learn` command mines failed sessions and writes corrections to `AGENTS.md` automatically, making the harness self-improving over time.

### 2.3 Workspace Isolation: Git-Native Scoped Boundaries

Docker is explicitly rejected as a workspace isolation mechanism for this harness. The reasons are:

- **Mobile toolchain incompatibility:** Xcode simulators, iOS code signing, Android SDK, and Gradle require native host filesystem access and OS-level services that container bind mounts cannot reliably replicate.
- **Friction cost:** Container startup, volume configuration, and network bridging add setup overhead that contradicts the "minimal DevX" constraint.

Isolation is instead enforced through three complementary mechanisms:

1. **Git repository scoping:** Each workspace is initialized as its own git repo. The Pi session is launched from within `$WORKSPACE_ROOT`. Agent file system tools (`read`, `write`, `edit`) are bounded to this directory by the AGENTS.md `MUST NOT` rules.
2. **Explicit MUST NOT boundaries:** Every agent config declares `MUST NOT touch files outside ./`, `MUST NOT modify .env files`, `MUST NOT execute package installs without human approval`. These are enforced structurally — not via prompting.
3. **Shell-level `$HARNESS_ROOT` guard:** The `harness-init` CLI script sets `HARNESS_ROOT=$(pwd)` and pre-pends a guard function to the bash tool wrapper that rejects any path resolution outside `$HARNESS_ROOT` at shell-execution time. This is the lightweight equivalent of a container's filesystem namespace.

This approach is inspired by the bulkhead and blast-radius-control patterns established in production agentic systems.

### 2.4 Skills & Behavioral Constitution

Superpowers (MIT, 229k stars) provides the composable skills layer. Skills are markdown files loaded as tool-available context: `brainstorming.md`, `writing-plan.md`, `tdd-loop.md`, `subagent-driven-dev.md`, `git-worktrees.md`, and project-type-specific overlays (e.g., `mobile-kmp.md` for Swift/Kotlin/KMP, `technical-writing.md` for ADRs/PRDs/blogs).

Andrej Karpathy Skills (MIT) provides the behavioral constitution loaded into `AGENTS.md` at workspace init: Think Before Coding, Simplicity First, Surgical Changes, Goal-Driven execution. These prevent the AI over-engineering and context-drift failures that are the primary failure mode of overnight agentic sessions.

Swarm-Forge (no explicit license — personal use only) provides the multi-agent role orchestration config template (`swarmforge.conf`) with a tmux-based session layout: one pane per agent role, one shared context log, a coordinator that routes tasks to the appropriate role pane.

***

## 3. Model Allocation — June 2026 Open-Weight Stack

All models route through a single OpenRouter account with account-level ZDR enforcement. Model IDs are OpenRouter aliases.

| Sub-Agent Slot | OpenRouter Model ID | License | Input/1M | Output/1M | Technical Justification |
|---|---|---|---|---|---|
| **1. Research & Context Ingestion** | `z-ai/glm-5.2` | MIT[^1] | $0.95[^12] | $3.00[^12] | 744B MoE (40B active), 1M context, IndexShare sparse attention (2.9× lower FLOP cost for long-context), #1 open-weight on Artificial Analysis Index v4.1, 62.1% SWE-bench Pro[^2][^3]. Reasoning effort parameter (`reasoning_effort`) for controllable think depth. |
| **2. Implementation & Coding** | `deepseek/deepseek-v4-pro` | Apache 2.0 | $0.435[^13] | $0.87[^13] | 1.6T total / 49B active MoE. Hybrid CSA+HCA attention compresses KV cache to 10% of prior limits. ZDR-compliant (SOC 2). High/Max reasoning effort. Best open-weight for multi-file synthesis tasks. |
| **3. Writing, Docs & Technical Prose** | `mistralai/devstral-2512` | Mod. MIT[^14] | $0.40[^6] | $2.00[^6] | 123B dense transformer, 256K context, 72.2% SWE-bench Verified[^4]. Purpose-built for agentic coding and technical writing. Strong on structured documents (ADR, PRD, TRD, blog prose). |
| **4. QA, Testing & Linting** | `deepseek/deepseek-v4-flash` | Apache 2.0 | $0.14 | $0.28 | 284B total / 13B active. 1M context at ultra-low cost. Runs recursive validation passes and test loops for fractions of a cent without stalling execution threads. |
| **5. State Routing & Schema Validation** | `qwen/qwen3.6-35b-a3b` | Apache 2.0[^15] | $0.14[^15] | $1.00[^15] | 35B total / 3B active MoE (April 2026). Hybrid Gated DeltaNet + Gated Attention, 262K context, native thinking mode. Confirmed in Pi's own model catalog[^16]. Standout agentic coding model from the Qwen3.6 family — fast, cheap routing decisions with only 3B active params per token. |
| **Utility / Free Tier** | `nvidia/nemotron-3-super-120b-a12b:free` | NVIDIA Open | $0[^17] | $0[^17] | 120B MoE (12B active), 1M context, ZDR compliant. Free tier on OpenRouter. Use for classification, routing decisions, and any non-sensitive utility tasks where cost matters most. |
| **Frontier Fallback (opt-in only)** | `anthropic/claude-opus-4-8` | Proprietary | $5.00[^18] | $25.00[^18] | Triggered only by explicit `--review-model claude` flag. Never default. Use for final human-quality prose review on published content or exceptionally complex architectural reasoning only. |

***

## 4. Tool Stack

| Tool | License | Role | Integration |
|---|---|---|---|
| **Pi** (`pi.dev`) | MIT | Harness host, diff review loop, session branching | `curl -fsSL https://pi.dev/install.sh \| sh` |
| **Headroom** | Apache 2.0 | Token compression proxy, cross-agent memory, failure learning | `pip install headroom-ai[all]` → `pi install npm:@ryan_nookpi/pi-extension-headroom` |
| **RTK** | Apache 2.0 | CLI command output compression (already bundled in Headroom) | `rtk init -g` or via Headroom |
| **MarkItDown** | MIT | Converts PDFs, Word docs, PPTX, Excel → Markdown for agent ingestion | `pip install markitdown[all]` → `markitdown file.pdf > doc.md` |
| **Superpowers** | MIT | Composable skill files per project type | Installed as Pi plugin via `/plugin install` |
| **Andrej Karpathy Skills** | MIT | Behavioral constitution loaded into `AGENTS.md` | Copied into `.harness/constitution/` at workspace init |
| **Swarm-Forge** | No license (personal use only) | Multi-role tmux orchestration config template | `git clone` → customize `swarmforge.conf` |
| **ContextPlus** | MIT-ish | MCP server with Tree-sitter AST + semantic RAG for codebase search (6–10k tokens saved per prompt, 2× faster) | Optional — add for large mobile codebases |
| **Adrian** | Apache 2.0 (freemium) | Runtime security monitoring — blocks rogue tool calls, prompt injection, policy drift | Add post-MVP (Week 2+) |
| **context-mode** | ⚠️ ELv2 (not MIT/Apache) | MCP session continuity | Personal use only — do not redistribute |

***

## 5. Workspace Init Spec

The `harness-init` CLI script, when run in any target directory, produces a fully functional self-contained workspace. No Docker required.

### Directory Structure

```
$PROJECT_ROOT/
├── AGENTS.md                    # Platform-neutral agent contract (AGENTS.md standard)
├── CLAUDE.md                    # Thin Claude-specific dispatch layer (for fallback use)
├── .harness/
│   ├── constitution/
│   │   └── base.md              # Andrej Karpathy skills behavioral rules
│   ├── skills/
│   │   ├── technical-writing.md # For ADR / PRD / TRD / blog workflows
│   │   ├── tdd-loop.md          # For software engineering workflows
│   │   └── mobile-kmp.md        # For Swift / Kotlin / KMP mobile workflows
│   ├── roles/
│   │   ├── research.md          # GLM-5.2 role config
│   │   ├── coding.md            # DeepSeek V4 Pro role config
│   │   ├── writing.md           # Devstral 2 role config
│   │   ├── qa.md                # DeepSeek V4 Flash role config
│   │   └── router.md            # Qwen 3.5 role config
│   ├── swarmforge.conf          # Multi-agent tmux layout
│   └── models.json              # Pi model routing config (see Section 6)
├── .env.harness                 # API keys — gitignored
├── docs/
│   └── tasks/                   # Bounded task files (immutable at agent pickup)
└── .gitignore                   # Includes .env.harness, .harness/session/
```

### Isolation Rules (enforced in AGENTS.md)

```markdown
## Boundaries

MUST NOT touch any file outside ./
MUST NOT modify .env.harness or any .env file
MUST NOT execute `npm install`, `pip install`, `brew install`, or any package manager without explicit human approval
MUST NOT commit to git without human review of the diff via /diff
MUST NOT access, read, or write to any path containing ../ (path traversal blocked)
```

### Workspace Modes (set at init time)

The `harness-init` CLI accepts a `--mode` flag that swaps the active skill set:

- `--mode software` — loads `tdd-loop.md`, `subagent-driven-dev.md`, `git-worktrees.md`
- `--mode mobile` — loads `mobile-kmp.md`, `tdd-loop.md`, native toolchain hints (Xcode, Gradle, KMM)
- `--mode writing` — loads `technical-writing.md`, `writing-plan.md`, doc structure templates (ADR, PRD, TRD, blog)
- `--mode research` — loads `brainstorming.md`, `research-loop.md`, MarkItDown ingestion pipeline

Modes are additive — `--mode software --mode writing` loads both skill sets for hybrid work.

***

## 6. Pi Model Routing Config

Create or update `~/.pi/agent/models.json` with the full open-weight stack:

```json
{
  "providers": {
    "openrouter": {
      "baseUrl": "https://openrouter.ai/api/v1",
      "apiKey": "YOUR_ENFORCED_ZDR_OPENROUTER_KEY",
      "defaultHeaders": {
        "HTTP-Referer": "https://localhost",
        "X-Title": "StatelessSwarmHarness"
      }
    }
  },
  "roles": {
    "research": {
      "provider": "openrouter",
      "model": "z-ai/glm-5.2",
      "temperature": 0.1,
      "reasoning_effort": "high"
    },
    "coding": {
      "provider": "openrouter",
      "model": "deepseek/deepseek-v4-pro",
      "temperature": 0.2,
      "reasoning_effort": "high"
    },
    "writing": {
      "provider": "openrouter",
      "model": "mistralai/devstral-2512",
      "temperature": 0.3
    },
    "qa": {
      "provider": "openrouter",
      "model": "deepseek/deepseek-v4-flash",
      "temperature": 0.0
    },
    "router": {
      "provider": "openrouter",
      "model": "qwen/qwen3.6-35b-a3b",
      "temperature": 0.0
    },
    "utility": {
      "provider": "openrouter",
      "model": "nvidia/nemotron-3-super-120b-a12b:free",
      "temperature": 0.0
    }
  }
}
```

***

## 7. Bootstrap Sequence (Overnight MVP)

```bash
# 1. Install core tooling
curl -fsSL https://pi.dev/install.sh | sh
pip install "headroom-ai[all]"
pip install "markitdown[all]"
rtk init -g   # or: headroom auto-bundles rtk

# 2. Set environment
export OPENAI_API_KEY="sk-or-YOUR_ZDR_OPENROUTER_KEY"
export OPENAI_API_BASE="https://openrouter.ai/api/v1"
export HEADROOM_OUTPUT_SHAPER=1

# 3. Initialize any new workspace
harness-init ./my-project --mode software   # or --mode mobile, --mode writing

# 4. Start harness
cd ./my-project
pi install npm:@ryan_nookpi/pi-extension-headroom   # Headroom proxy auto-managed by Pi extension
pi   # start Pi — extension compresses all tool output before it reaches the LLM

# 5. Inside pi session — load skills and start
/plugin install superpowers
/load .harness/skills/tdd-loop.md
/fork   # branch sessions as needed for parallel approaches
```

***

## 8. Consequences & Mitigation

| Consequence | Type | Mitigation |
|---|---|---|
| Variable token cost per session | Negative | Headroom compression (60–95%), Nemotron free tier for utility tasks, ZDR-cached prefix reuse via OpenRouter |
| Stateless context passing overhead | Negative | Headroom `SharedContext` carries compressed cross-agent state; `headroom learn` writes session corrections back to `AGENTS.md` |
| No container-level filesystem isolation | Negative | Git-scoped boundaries + AGENTS.md MUST NOT rules + shell-level `$HARNESS_ROOT` path guard. Sufficient for personal, single-developer workspaces. |
| GLM-5.2 high output token verbosity (~43k/task) | Negative | Headroom output shaper trims ceremony and restated context. Monitor with `headroom output-savings` |
| Swarm-Forge has no explicit license | Negative | Personal use only. Not for distribution. File a GitHub issue requesting MIT license if needed. |
| Mobile toolchain (Xcode/Android) requires native host | Positive | Containerless design fully supports iOS simulator, Android emulator, code signing, and native Gradle builds without friction. |
| Open-weight parity with frontier now confirmed | Positive | GLM-5.2 beats GPT-5.5 on SWE-bench Pro[^2]; Devstral 2 matches Claude Opus 4.7 on SWE-bench Verified[^4]. Frontier fallback is genuinely optional. |

***

## 9. Where to Obtain API Access

| Model | Primary Provider | OpenRouter ID | Direct API |
|---|---|---|---|
| GLM-5.2 | OpenRouter (9 providers)[^12] | `z-ai/glm-5.2` | `bigmodel.cn` (Z.ai direct) |
| DeepSeek V4 Pro | OpenRouter or direct[^13] | `deepseek/deepseek-v4-pro` | `platform.deepseek.com` |
| Devstral 2 | OpenRouter or Mistral direct[^6] | `mistralai/devstral-2512` | `console.mistral.ai` |
| DeepSeek V4 Flash | OpenRouter | `deepseek/deepseek-v4-flash` | `platform.deepseek.com` |
| Nemotron 3 Super | OpenRouter (free)[^17] | `nvidia/nemotron-3-super-120b-a12b:free` | NVIDIA API catalog |
| Claude Opus 4.8 (fallback) | Anthropic direct[^18] | `anthropic/claude-opus-4-8` | `console.anthropic.com` |

**Single-key recommendation:** Start with one OpenRouter account key (ZDR enabled at account level). OpenRouter's 5.5% markup on credits[^19] is worth the convenience of a single key managing all models, all providers, and all fallback routing. Add a direct Mistral key (`MISTRAL_API_KEY`) as an optional override for Devstral once usage patterns are established — direct Mistral pricing is identical to OpenRouter at $0.40/$2.00 with no markup[^6].

***

## 10. ETCSLV Loop Engineering Validation

### What ETCSLV Maps To

Loop engineering is the practice of designing the *system* that drives an agent in a repeating cycle — act, observe, verify, repeat — rather than prompting by hand each step. The concept crystallized in June 2026 from Peter Steinberger's viral post (6.5M views) and Addy Osmani's naming essay, which gave the practice its anatomy: automations, worktrees, skills, connectors, sub-agents, and external state.

ETCSLV maps the six structural components of a well-engineered loop onto this harness:

| Component | What It Is | This Harness Implementation |
|---|---|---|
| **E — Execution** | The agent taking action against the real environment | Pi runs the agentic loop; bash tool, write tool, edit tool touch the actual project filesystem |
| **T — Tool Registry** | The declared, bounded set of tools the agent can call | Pi's 4 core tools (read, write, edit, bash) + ContextPlus MCP for semantic search; AGENTS.md MUST NOT rules define the boundary |
| **C — Context Manager** | What the agent sees at each step; keeping the window alive without overflow | Headroom compression (60–95% token reduction); `SharedContext` for cross-role state passing; `headroom learn` writes session corrections back to AGENTS.md |
| **S — State Store** | External memory persisting across steps so the loop doesn't forget | `docs/tasks/CWS-NNN.md` immutable task file (single-writer, snapshot at pickup); `docs/agent-context.md` freshness ledger with stale-after timestamp |
| **L — Lifecycle Hooks** | Events that fire at key loop transitions: plan→execute, step→step, done→human | Pi `/diff` gate before any write commit (human-in-the-loop); Swarm-Forge tmux pane routing between roles; `headroom learn --verbosity` post-session |
| **V — Verification Interface** | The deterministic signal that tells the loop whether a step succeeded or failed | Test runner output (deterministic pass/fail); type checker; linter; Pi `/diff` review before commit — never the agent's self-report |

The ReAct pseudocode skeleton that underlies every production loop maps directly:

```
state = init_state(goal)              # harness-init ./project --mode mobile

for step in range(MAX_STEPS):         # Pi session with hard cap
  thought = model.reason(state)       # GLM-5.2 (research/planning role)
  action  = model.choose_action()     # DeepSeek V4 Pro (coding role)
  result  = tools.execute(action)     # Pi bash/edit tools, scoped to $HARNESS_ROOT
  state   = update(state, result)     # docs/agent-context.md freshness ledger
  state   = compact(state)            # Headroom compression pass

  if verifier.passes(state):          # test runner green + /diff approved
    return success(state)             # human reviews final diff, approves PR
  if no_progress(state):              # 3 failed attempts on same error
    return escalate_to_human(state)   # Pi surfaces to you, stops burning tokens
```

The three hardest parts of loop engineering — context overflow, termination logic, and verification quality — are each addressed structurally in this harness: Headroom handles context; Pi's session tree and `no_progress` escalation handle termination; the diff gate + test runner handle verification. The critical rule from production loop engineering applies: **trust a deterministic verifier, never the agent's self-report.**

***

## 11. MVP Validation Project: `HarnessKit` Mobile Utility Module

### Why This Project

The MVP validation task must exercise all 6 ETCSLV components simultaneously, be completable by the harness in ~30 minutes unattended, have a clear deterministic success condition (loop termination), and be mobile-dev friendly (native toolchain, no Docker). The chosen project: a **Kotlin Multiplatform (KMP) utility module called `HarnessKit`** — a single shared library with three utility functions, full unit test coverage, and a brief TechDoc (README + inline KDoc).

This is ideal because:
- Small enough scope that GLM-5.2 (research) can hold the full context in one pass
- Concrete enough that DeepSeek V4 Pro (coding) produces real Kotlin, not stubs
- Has a binary success condition: `./gradlew :harnesskit:test` goes green
- Exercises the writing role (Devstral 2 writes KDoc + README)
- Exercises the QA role (DeepSeek V4 Flash runs recursive lint + test passes)
- Runs natively on your machine — no iOS simulator needed, pure JVM tests

### The 30-Minute Loop Plan

**Phase 1 — Init (2 min, human)**
```bash
harness-init ./harnesskit --mode mobile
cd ./harnesskit
pi install npm:@ryan_nookpi/pi-extension-headroom
pi
```

**Phase 2 — Research role: scaffold (5 min, GLM-5.2)**

Task file `docs/tasks/HK-001.md` is created at init with this bounded brief:
```markdown
# HK-001: Scaffold HarnessKit KMP Module

## Goal
Create a Kotlin Multiplatform shared module with:
- `DateFormatter.kt` — ISO-8601 date string formatter (commonMain)
- `StringExtensions.kt` — `String.titleCase()` extension (commonMain)
- `NetworkUtils.kt` — `isValidUrl(url: String): Boolean` (commonMain)
- Unit tests for all three in `commonTest`
- KDoc on every public symbol
- README.md with usage examples

## Success Condition
`./gradlew :harnesskit:test` passes with 0 failures.

## Scope-Out
MUST NOT touch any directory outside ./harnesskit/
MUST NOT add any dependency not in the approved list: kotlin-stdlib, kotlinx-datetime
MUST NOT generate platform-specific (androidMain/iosMain) code in this task
```

**Phase 3 — Coding role: implement (15 min, DeepSeek V4 Pro)**

Orchestrator routes HK-001 to the coding role. Agent implements all three files, writes tests, runs `./gradlew :harnesskit:test` via bash tool, reads output, corrects failures. Loop continues until test suite is green. The loop termination condition is deterministic — no ambiguity.

**Phase 4 — QA role: validate (5 min, DeepSeek V4 Flash)**

Quick recursive pass: `./gradlew :harnesskit:detekt` (linter), check KDoc coverage via `./gradlew :harnesskit:dokka`, verify no stubs or `TODO()` in production code.

**Phase 5 — Writing role: document (5 min, Devstral 2)**

Devstral 2 reads the implemented code and generates the README.md (installation, API reference, usage examples) and fills any missing KDoc. Output is a Markdown file — Devstral's natural register.

**Phase 6 — Human review gate: diff + approve (3 min, you)**

```
/diff main...HEAD   # Pi shows full session diff before any commit
```
Review the diff. If it looks right, approve. If something is wrong, `/fork` a new branch and correct — the session tree preserves the full trajectory.

### ETCSLV Checklist for the MVP Run

| Component | What to Check During Validation |
|---|---|
| **E — Execution** | Did Pi's bash tool actually run `./gradlew test`? Did it read real output? |
| **T — Tool Registry** | Did any tool call reference a path outside `./harnesskit/`? (Should be zero) |
| **C — Context Manager** | Run `headroom perf` — confirm token savings > 0. Check no context overflow mid-session. |
| **S — State Store** | Is `docs/tasks/HK-001.md` unchanged from init? (Immutable — single-writer rule holds) |
| **L — Lifecycle Hooks** | Did the `/diff` gate appear before any write? Did the coding role correctly hand off to QA? |
| **V — Verification** | Did `./gradlew test` pass with 0 failures? Did QA role report based on test output, not self-assessment? |

### Pass Criteria for Harness Graduation

The harness is considered validated when the MVP run produces:
1. ✅ `./gradlew :harnesskit:test` — 0 failures
2. ✅ `./gradlew :harnesskit:detekt` — 0 violations
3. ✅ All public symbols have KDoc
4. ✅ README.md present with usage examples
5. ✅ Zero files touched outside `./harnesskit/` (verify with `git diff --name-only`)
6. ✅ `headroom perf` shows > 40% token savings vs uncompressed
7. ✅ Human diff review passed — no stubs, no `TODO()`, no hallucinated imports

If any check fails, the failure mode categorises against the known loop failure taxonomy: context overflow → Headroom config; no-progress loop → escalation threshold too high; hallucinated success → verifier gate missing; objective misspecification → task file scope too vague. Each failure produces a structural fix to the harness template — not a prompt change. This is the meta-lesson of loop engineering: the harness grows by absorbing failures.

***

## 12. ADR Gaps Acknowledged (Backlog)

- **Evaluator agent (Pattern 7):** A standalone QA evaluator with structured grading criteria per domain (code quality vs. content quality) is not yet implemented. Currently reliant on human-in-the-loop diff review gate only. This is the documented gap between this harness and Anthropic/OpenAI's production agentic systems.
- **Adrian security layer:** Runtime security monitoring (rogue tool call detection, prompt injection blocking, policy drift alerting) is deferred to Week 2+ post-MVP.
- **promptfoo regression testing:** Prompt/workflow regression testing for harness config changes not yet in place.
- **Hivemind cross-session memory:** Optional upgrade for persistent skill codification across workspaces. Requires DeepLake account. Deferred.

---

## References

1. [GLM-5.2 is probably the most powerful text-only open weights LLM](https://simonwillison.net/2026/jun/17/glm-52/) - GLM-5.2 is probably the most powerful text-only open weights LLM. 17th June 2026. Chinese AI lab Z.a...

2. [GLM 5.2 Benchmarks Published: 62.1 SWE-bench Pro, MIT-Licensed Weights on HuggingFace (June 2026)](https://www.totalum.app/blog/glm-5-2-benchmarks-open-weights-2026) - GLM 5.2 benchmarks finally public: 62.1 SWE-bench Pro beats GPT-5.5 and Claude. MIT-licensed weights...

3. [GLM-5.2: 1M Context, MIT License & 80.3% GPQA (2026) - HokAI](https://hokai.io/hub/models/glm-5.2) - GLM-5.2 by Z.ai: 744B MoE, MIT-licensed model with 1M-token context and 80.3% GPQA Diamond. Costs $1...

4. [Devstral 2 Review: Mistral's Open Agentic Coding Model (2026)](https://localaimaster.com/models/devstral) - The flagship Devstral 2 (123B) hits 72.2% on SWE-bench Verified, among the best open-weight scores f...

5. [The $0.40 Ceiling](https://www.koda.community/editorial/2026-06-12-the-040-ceiling.html) - Mistral priced its 123B-parameter Devstral 2 at $0.40 per million input tokens with open weights, sc...

6. [Devstral 2 2512 - API Pricing & Benchmarks | OpenRouter](https://openrouter.ai/mistralai/devstral-2512) - Devstral 2 is a state-of-the-art open-source model by Mistral AI specializing in agentic coding. $0....

7. [Claude Code, Codex, Amp, OpenCode, Gemini CLI, Pi ...](https://techstackups.com/comparisons/coding-agent-harness-comparison-2026/) - Nine terminal coding agents compared on open source status, model flexibility, funding, GitHub healt...

8. [Pi Coding Agent Review: The Minimalist AI Harness That Modifies Itself](https://www.youtube.com/watch?v=5sBoPualwTY) - In this video, I take Pi (https://pi.dev) for a spin — the minimal, self-modifying terminal coding a...

9. [Pi Coding Agent](https://pi.dev/models/openrouter/openai-gpt-latest) - A terminal-based coding agent

10. [NVIDIA: Nemotron 3 Super (free) - Pi Coding Agent](https://pi.dev/models/openrouter/nvidia-nemotron-3-super-120b-a12b-free?provider=fireworks) - A terminal-based coding agent

11. [pi-diff-review · Packages · Pi](https://pi.dev/packages/pi-diff-review) - A terminal-based coding agent

12. [Z.ai: GLM 5.2 - API Pricing & Benchmarks - OpenRouter](https://openrouter.ai/z-ai/glm-5.2) - GLM 5.2 is a large-scale reasoning model from Z.ai. $0.95 per million input tokens, $3 per million o...

13. [Using DeepSeek V4 Pro on OpenRouter - LLM Reference](https://www.llmreference.com/provider/openrouter/deepseek-v4-pro) - Current API pricing: $0.435/$0.87 per 1M input/output tokens; DeepSeek made the former 75% promotion...

14. [Introducing: Devstral 2 and Mistral Vibe CLI.](https://mistral.ai/news/devstral-2-vibe-cli/) - Both are open-source and permissively licensed to accelerate distributed intelligence. Devstral 2 is...

15. [Qwen3.6 35B A3B - API Pricing & Benchmarks - OpenRouter](https://openrouter.ai/qwen/qwen3.6-35b-a3b) - Qwen3.6-35B-A3B is an open-weight multimodal model from Alibaba Cloud with 35 billion total paramete...

16. [Qwen: Qwen3.6 35B A3B · Models · Pi](https://pi.dev/models/openrouter/qwen-qwen3-6-35b-a3b) - A terminal-based coding agent

17. [Nemotron 3 Super (free) - API Pricing & Benchmarks | OpenRouter](https://openrouter.ai/nvidia/nemotron-3-super-120b-a12b:free) - NVIDIA Nemotron 3 Super is a 120B-parameter open hybrid MoE model, activating just 12B parameters fo...

18. [Claude Opus 4.8: Pricing, benchmarks, and which model to run](https://www.cloudzero.com/blog/claude-opus-4-8-pricing/) - Claude Opus 4.8 launched May 28, 2026 at $5/$25 per 1M tokens. New features, real pricing, and which...

19. [OpenRouter vs Direct API: Real Cost for AI Agents - BetterClaw](https://www.betterclaw.io/blog/openrouter-vs-direct-api-agents) - OpenRouter charges 5.5% on credits, not per-token. Real cost math for AI agents: when OpenRouter sav...

