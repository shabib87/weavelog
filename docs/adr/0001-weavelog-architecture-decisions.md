# Architecture Decision Record: weavelog

**Status:** Accepted
**Date:** July 4, 2026
**Supersedes:** `docs/archive/stateless-multi-model-agent-swarm-adr.md`
**Appendix:** `docs/specs/2026-06-28-weavelog-design.md` (detailed design)
**Authoritative sources:** `docs/NORTH_STAR.md` (non-negotiables), `docs/research/RESEARCH.md` (provenance)

---

## 1. What weavelog Is

weavelog is a minimal, open-source developer-experience setup that turns any
project into a self-contained agentic workspace. A pre-defined agent team
runs an end-to-end loop — spec, implement, verify, document — with the human
in the loop only for verification. Built on Pi + OpenRouter + Headroom.

The North Star (`docs/NORTH_STAR.md`) is the anchor. Every decision here
traces back to a non-negotiable there. This ADR records the architectural
decisions; the spec is the detailed design appendix.

---

## 2. Key Decisions

### 2.1 Harness Host: Pi

Pi is the host. No separate orchestration runtime (no SwarmForge, no tmux
layer, no Babashka scripts). All loop coordination lives in a Pi TypeScript
extension (`weavelog/pi-weavelog`).

**Why Pi:**
- MIT-licensed terminal coding agent with a TypeScript extension system.
- Session-tree branching (`/fork`, `/tree`) — critical for the loop's
  ability to explore divergent approaches and merge the superior branch.
- Sub-agent spawning with per-agent model routing, tool allowlists, and
  isolation flags (`--no-skills`, `--no-extensions`, `--no-context-files`).
- Native OpenRouter support via `OPENAI_API_BASE` env var — one-line config.
- `pi-diff-review` provides the structured diff gate for human verification.

**Why not SwarmForge:** Hard-codes agent support to
`#{"claude" "codex" "copilot" "grok"}`. Pi is not supported without a fork.
Assumes Gherkin-driven specification. Competes with Pi's own orchestration.

### 2.2 Implementation Language: TypeScript Only

The entire project — CLI and Pi extension — is implemented in TypeScript.
No bash for logic. One language, one toolchain.

**Toolchain:**
- **Runtime:** Node.js (via `node --import tsx`)
- **Test framework:** `node --import tsx --test` (native test runner)
- **Linter/formatter:** biome
- **Typechecker:** `tsc --noEmit`
- **Distribution:** npm primary (`npx weavelog`), Homebrew secondary (wraps node)

### 2.3 Platform: macOS Only (v1)

macOS is the only target platform for v1. Linux CI via GitHub Actions
(`ubuntu-latest`, free tier). No Windows support.

**Why macOS-only for v1:** Mobile toolchains (Xcode, Android Studio, iOS
simulators) require native host access. Docker is incompatible with these
workflows. macOS is the common platform for mobile development.

### 2.4 Model Routing: OpenRouter + Open-Weight Default

All model inference routes through a single OpenRouter API key with
account-level ZDR enforcement. The default model stack is 100% open-weight
(MIT, Apache 2.0, or modified MIT). Proprietary frontier models are
available only as explicit opt-in.

**Default model allocation:**

> **Amended 2026-07-05.** Roster updated from the original 6-model role-based
> allocation (preserved below) to a 6-model tier-based allocation matching the
> live registry (`~/.pi/agent/models.md`).
>
> **Reason:** OpenRouter ZDR (account-wide) blocks `:free` provider endpoints,
> removing the Utility/free-tier slot (nemotron). Kimi K2.7 Code added for
> vision support (GLM 5.2 has no image input). GPT-5.5 and Fable 5 added as
> frontier escalation tiers (per North Star: frontier as last-resort
> escalation). devstral-2512 (Writer) and qwen3.6-35b-a3b (Router) dropped;
> their roles consolidated into GLM 5.2 (daily driver) and DS V4 Flash
> (budget/docs). License correction: DeepSeek V4 Pro is MIT (not Apache 2.0 as
> originally recorded); verified via HuggingFace 2026-07-05.
> See `docs/learnings/2026-07-05-model-zdr-and-free-tier-removal.md`.

| Tier | Model | License | Cost (input/output per 1M) |
|---|---|---|---|
| Primary (daily driver) | `z-ai/glm-5.2` | MIT | $0.57 / $1.80 |
| Verifier (checker) | `deepseek/deepseek-v4-pro` | MIT | $0.43 / $0.87 |
| Verifier (UI/vision) | `moonshotai/kimi-k2.7-code` | Other | $0.74 / $3.50 |
| Budget (docs/CI) | `deepseek/deepseek-v4-flash` | MIT | $0.09 / $0.18 |
| Frontier escalation 1 | `openai/gpt-5.5` | Proprietary | $5.00 / $30.00 |
| Frontier escalation 2 | `anthropic/claude-fable-5` | Proprietary | $10.00 / $50.00 |

All model IDs and prices verified against the live OpenRouter API (2026-07-05).
Licenses verified via HuggingFace (`huggingface.co/api/models/<id>`):
GLM 5.2 = MIT, DeepSeek V4 Pro = MIT, Kimi K2.7 Code = Other (custom).

**Original allocation (2026-07-04, superseded 2026-07-05):**

| Role | Model | License | Cost (input/output per 1M) |
|---|---|---|---|
| Specifier | `z-ai/glm-5.2` | MIT | $0.95 / $3.00 |
| Coder | `deepseek/deepseek-v4-pro` | Apache 2.0 | $0.435 / $0.87 |
| QA | `deepseek/deepseek-v4-flash` | Apache 2.0 | $0.14 / $0.28 |
| Writer | `mistralai/devstral-2512` | Modified MIT | $0.40 / $2.00 |
| Router | `qwen/qwen3.6-35b-a3b` | Apache 2.0 | $0.14 / $1.00 |
| Utility | `nvidia/nemotron-3-super-120b-a12b:free` | NVIDIA Open | Free |

**Why OpenRouter:** Single API key manages all models, all providers, and
fallback routing. 5.5% markup on credits is worth the operational simplicity.
Single point of ZDR enforcement.

**Why open-weight default:** Near-frontier capability at a fraction of
proprietary cost. GLM-5.2 beats GPT-5.5 on SWE-bench Pro (62.1% vs 58.6%).
No vendor lock-in. MIT/Apache 2.0 licenses permit any use.

### 2.5 Context Compression: Headroom

Headroom proxy compresses tool outputs before each LLM call via the
`@ryan_nookpi/pi-extension-headroom` Pi extension. Real-world savings:
60-95% token reduction on agentic coding workloads.

**Why Headroom:** Apache 2.0 license. Pi-native integration (extension
auto-manages the proxy). Output shaping trims verbose preambles and
restated context. `--learn` flag enables partial hill climbing
(error-pattern mining → AGENTS.md rule appendals).

**Constraint:** Machine-global proxy port (8788). Concurrent projects
share one proxy. For `--learn` isolation, use `--memory-storage=project`.

### 2.6 Workspace Isolation: Git-Native, Not Containers

Docker is explicitly rejected. Mobile toolchains (Xcode, Android Studio,
iOS simulators, Gradle) require native host access that containers break.

Isolation is enforced through:
1. **Sub-agent isolation flags** (`--no-skills`, `--no-extensions`,
   `--no-context-files`) per role.
2. **`tool_call` hook** blocking writes outside the project tree and
   destructive shell commands (Pi's `protected-paths.ts` pattern).
3. **Per-step git branch checkpoints** with rollback on rejection.

### 2.7 Verification: Deterministic Verifier + Human Gate

Verification is split into two orthogonal concerns:
- **Verifier** (`verify`): A deterministic command that produces signal.
  Exit 0 = pass. Example: `node --import tsx --test`.
- **Gate** (`gate`): The lifecycle checkpoint. `human` = requires approval;
  `none` = auto-advance.

The human is a lifecycle gate, not a verifier. They review the verifier's
output and decide whether to advance — but they don't manually run the
tests themselves. This follows Addy Osmani's principle: "trust a
deterministic verifier, never the agent's self-report."

### 2.8 State: Pi Session Tree

Loop state lives in Pi's session tree via `pi.appendEntry()`, not a
separate `.workflow/state.json`. Benefits:
- **Branching-aware.** Fork the session → state forks with it.
- **Auto-persisted.** Survives crashes.
- **Reconstructable.** `session_start` replays all entries in order.

### 2.9 Rollback: Git Branch Checkpoints

On step rejection, reset to a git branch checkpoint (`weavelog/step-<id>`).
Branches survive Pi crashes (unlike stashes). Combined with `git clean -fd`
for untracked files created by the step.

### 2.10 Budget: $5 Default, Pause on Exhaustion

Per-workflow `budget` field (USD) enforced in the weavelog extension by
tracking spend from `message_end` events. Default: $5.00. On exhaustion:
pause, surface, let human decide — budget exhaustion is a verification event.

### 2.11 Standards: Agent Skills + AGENTS.md

Skills follow the Agent Skills standard (`agentskills.io`):
`.pi/skills/<name>/SKILL.md` with YAML frontmatter. AGENTS.md follows
`agents.md` conventions (<200 LOC). Roles use Pi's native agent discovery
convention (`.pi/agents/<name>.md`). No bespoke formats where standards exist.

### 2.12 V1 Scope: Human-Gated, Sequential, L2 Maturity

- **Human-gated:** Every non-documentation step requires human diff approval.
- **Sequential:** Steps run in shared cwd (no per-step worktrees).
- **L2 maturity:** Agent writes with human approval per step; verification
  gates are automated. L1 (report-only) and L3 (unattended) documented as
  future.
- **No automated triggers:** `/run` is manually invoked. V1 proves the
  loop's determinism before adding cron/webhook triggers.

### 2.13 License + Contributions

MIT license. Solo-dev for v1; issues welcome, PRs not yet. Standards:
Agent Skills (agentskills.io), AGENTS.md (agents.md).

### 2.14 Plugin/Package Architecture and Three-Layer Customization

**Adopted 2026-07-08.** See
`docs/research/2026-07-08-plugin-architecture-and-scope-refinement.md`.

Platform-specific capabilities ship as independently released packages, not
as core weavelog features. Core weavelog is platform-agnostic.

**Three-layer customization model:**

| Layer | What lives here | User can override? |
|---|---|---|
| **1. Fixed (constitution)** | Engineering philosophy, loop shape, open standards, Pi as host, open-weights-primary pattern | No |
| **2. Opinionated defaults** | Model roster, budget, agent prompts, CI pipeline, hooks | Yes (edit after init; weavelog never overwrites) |
| **3. User-owned** | Platform skills, custom agents, architecture decisions | Fully |

**Distribution:** Pi-native `pi install` mechanism (`pi install npm:` and
`pi install git:`). weavelog does not reinvent package management.

**`weavelog plugin add` is a validated wrapper:**
1. Runs `pi install <source>` (Pi handles installation).
2. Validates skills against Agent Skills standard (required frontmatter:
   `name`, `description`; optional: `license`, `compatibility`,
   `metadata`, `allowed-tools`).
3. Checks `compatibility` frontmatter against workspace profile.
4. Reports what was installed and what was validated.

Validation logic is shared between `weavelog plugin add` and `weavelog check`
(DRY).

**No symlinks.** Pi discovers skills natively from four standard paths
(`~/.pi/agent/skills/`, `~/.agents/skills/`, `.pi/skills/`,
`.agents/skills/`). No indirection.

**Model defaults as living reference:** Specific model IDs are Layer 2
defaults, not Layer 1 philosophy. weavelog ships a `models.md` template;
`weavelog init --global` copies it to `~/.pi/agent/models.md`; user owns the
file after. The tier structure (primary, verifier, budget, frontier
escalation) is Layer 1. Model churn does not block core releases.

**Official plugin packages (v1.1):**
- `weavelog/plugin-mobile-ios` (native iOS: Swift, SwiftUI, Xcode)
- `weavelog/plugin-mobile-android` (native Android: Kotlin, Compose, Gradle)
- `weavelog/plugin-mobile-kmp` (Kotlin Multiplatform)
- `weavelog/plugin-mobile-react-native` (React Native)

Each plugin ships skills conforming to the Agent Skills standard with
`compatibility` frontmatter validated by `weavelog plugin add`.

**Why Pi-native distribution:** weavelog is Pi-native. Pi's package system
(`pi install`, auto-discovery, settings-based filtering) is the official
mechanism. Wrapping it with validation (Agent Skills conformance,
compatibility checking) adds weavelog's opinionated layer without reinventing
package management.

---

## 3. Rejected Alternatives

| Alternative | Why Rejected | Where Documented |
|---|---|---|
| SwarmForge orchestration | Hard-coded agent list; Gherkin-first; competes with Pi | `docs/research/RESEARCH.md` §SwarmForge |
| Docker-based isolation | Incompatible with Xcode, Android Studio, iOS simulators | §2.6 |
| Bash for orchestration logic | TypeScript is the project language; bash for config only | `docs/NORTH_STAR.md` |
| Proprietary frontier models as default | Open-weight models achieve near-frontier capability at lower cost | `docs/research/RESEARCH.md` §Model Allocation |
| Separate `.workflow/state.json` | Pi's session tree is branching-aware and auto-persisted | §2.8 |
| Per-step git worktrees in v1 | Adds complexity without benefit for sequential execution | §2.12 |
| `guard.sh` for isolation | Pi's `tool_call` hook is native, cross-platform, can't be bypassed | `docs/specs/...` §5.3 |
| Bundling platform skills into core | Contradicts "weavelog does NOT author platform skills" (PRODUCT.md); forces all users to install capabilities they may not need | §2.14 |
| Custom plugin package manager | Pi-native `pi install` is the official mechanism; reinventing it violates KISS and DRY | §2.14 |
| Symlink-based skill import | Pi discovers natively from four standard paths; symlinks add fragility for no benefit | §2.14 |

---

## 4. Consequences

| Consequence | Type | Mitigation |
|---|---|---|
| Variable token cost per workflow | Negative | Headroom compression (60-95%), budget enforcement ($5 default), Nemotron free tier for utility tasks |
| No container-level filesystem isolation | Negative | Sub-agent isolation flags + `tool_call` hook + git branch checkpoints. Sufficient for single-developer workspaces. |
| Pi is pre-1.0 (0.80.3) — extension API can break | Negative | Pin peerDependency in `package.json`; state supported Pi versions in spec |
| Headroom proxy is machine-global (port 8788) | Neutral | Shared across concurrent projects; `--memory-storage=project` prevents cross-project bleed |
| macOS-only v1 | Negative | Linux CI validates test suite; Windows deferred indefinitely |
| Open-weight model availability can change | Negative | `weavelog check` validates model IDs against live OpenRouter API before each run |
| Solo-dev for v1 | Neutral | MIT license permits forks; issues welcome |

> **Note (2026-07-05):** The "Nemotron free tier for utility tasks" mitigation
> above is superseded. OpenRouter ZDR (account-wide) blocks `:free` provider
> endpoints, so the free tier is unusable and removed. Utility tasks now route
> to `deepseek/deepseek-v4-flash` ($0.09/$0.18 per M). The authoritative
> registry is `~/.pi/agent/models.md`. See
> `docs/learnings/2026-07-05-model-zdr-and-free-tier-removal.md`.

---

## 5. Gaps (Post-V1)

- **MCP bridge for Context+:** Semantic code search for large codebases (>100 files) or mobile workflows. Deferred to v2.
- **Event-driven triggers (LangChain Level 3):** Cron/webhook/git-hook triggered workflows. Requires proven determinism first.
- **Full trace-based harness rewriting (LangChain Level 4):** Headroom `--learn` provides partial coverage (error-pattern mining only). Full prompt/tool/config rewriting deferred.
- **promptfoo regression testing:** Prompt/workflow regression testing for harness config changes. Not yet in place.
- **Cross-workspace memory (Hivemind):** Optional persistent skill codification across workspaces. Deferred.
- **Runtime security monitoring (Adrian):** Rogue tool call detection, prompt injection blocking, policy drift alerting. Deferred.