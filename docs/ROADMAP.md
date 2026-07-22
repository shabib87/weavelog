# Roadmap

> **Authority:** Product requirements (PRD equivalent). Traces to
> `docs/NORTH_STAR.md` (what), `docs/research/RESEARCH.md` (why), and
> `docs/PRODUCT.md` (product strategy — what loopeng is, moat, PMF).
> **Cross-ref:** `docs/PROGRESS.md` (phase tracker), `docs/adr/` (decisions)

This is the phased delivery plan for loopeng. It maps the loop-engineering
paradigm to version milestones, defines success metrics, and sequences
proof projects. Every milestone traces to a NORTH_STAR non-negotiable.

**Scope refinement (2026-07-08):** Platform-specific capabilities (mobile,
web, dotnet) ship as independently released plugin packages, not core
loopeng features. Core loopeng is platform-agnostic. See
`docs/research/2026-07-08-plugin-architecture-and-scope-refinement.md`.

---

## Pending decisions (need user input)

Three decisions from 1.95 research are pending user review. Their
recommendations are noted; ROADMAP is drafted without blocking. The user
will read the research docs and decide.

| Decision | Recommendation | Research doc | Impact if deferred |
|---|---|---|---|
| **License** | Apache 2.0 + trademark policy | `docs/research/2026-07-04-license-selection.md` | LICENSE file stays MIT until decided; no blocker for v0.1 |
| **Frontier models** | Fable 5 + GPT-5.5 (cross-vendor) | `docs/research/2026-07-04-frontier-model-selection.md` | Codex profiles keep current opus+fable until decided; no blocker for v0.1 |
| **Telemetry** | Phased opt-in, local-first | `docs/research/2026-07-04-evals-and-telemetry.md` | No telemetry until v0.2; no blocker for v0.1 |

License decision: MIT for v0.1, Apache 2.0 recommended for v0.2.

---

## Loop-engineering paradigm

### Primary sources

| Source | Author | Date | Key insight |
|---|---|---|---|
| "Loop Engineering" | Addy Osmani | Jun 7, 2026 | Five+one components: automations, worktrees, skills, plugins, sub-agents, memory. Maker/checker split. "Agent forgets, repo doesn't." |
| "Loopcraft: The Art of Stacking Loops" | swyx (Latent Space) | Jun 12, 2026 | Stack loops effectively. "Salty Lesson for agents." Go down a loop for reliability, up a loop for leverage. |
| "The Art of Loop Engineering" | LangChain | Jun 16, 2026 | Four loop levels: agent → verification → event-driven → hill climbing. The fourth "reaches inside and updates the agent loop directly." |
| "What the hell is a loop, anyway?" | Laurie Voss | Jul 3, 2026 | Four-loop taxonomy: execution / task / product / system + oversight. "Autonomy is a dial on every loop." |

### Four loops (Voss's taxonomy, adopted)

| Loop | What it iterates on | Ends when | Human role | loopeng scope |
|---|---|---|---|---|
| **Execution** | Steps within one task | Environment feedback (test output, API response) | Absent mid-loop, present at boundaries | v0.1 (Pi agent loop) |
| **Task** | A single artifact against a spec | Spec compliance + passing tests | Writes spec, judges done-ness | v0.3 (Ralph-loop shape) |
| **Product** | A codebase + its backlog | Continuous (external signals: issues, feedback) | Configurable checkpoints | v1.0 (one workflow: spec→code→QA→document) |
| **System** | Prompts, harness, model choices | Continuous (evals, traces) | Last checkpoint | v1.x+ (partial via headroom `--learn`) |
| **Oversight** | Goals, budgets, culling | None (the human lives here) | The human | Always (the user) |

**v1 scope:** execution + task loops (human-gated). Product loop partial (one
workflow). System loop partial (headroom `--learn` rules only, not harness
rewrites). Oversight = user. This traces to NORTH_STAR: "Fully unattended
autonomous runs (v1 human-gated verification gate)" out of scope.

---

## Four engineering disciplines

| Discipline | What it means | loopeng mechanism |
|---|---|---|
| **Prompt engineering** | Crafting agent instructions, system prompts, skill descriptions | AGENTS.md, superpowers skills, `.pi/agents/<role>.md` |
| **Context engineering** | Managing what reaches the model's context window | Headroom compression, markitdown ingestion, beads memory, doc indexing |
| **Harness engineering** | The environment one agent runs inside | Pi host, extensions, git worktrees, `loopeng check` gates |
| **Loop engineering** | Designing the loops that prompt the agents | Workflow configs, sub-agent spawning, verification gates, the spec→implement→verify→document loop |

These compose. A change to a prompt (prompt eng) affects context (context
eng) affects the harness (harness eng) affects the loop (loop eng). loopeng
treats them as one integrated practice, not four separate concerns.

---

## Three-layer customization model

Adopted 2026-07-08. See
`docs/research/2026-07-08-plugin-architecture-and-scope-refinement.md`.

| Layer | What lives here | Who controls | User can override? |
|---|---|---|---|
| **1. Fixed (constitution)** | Engineering philosophy, loop shape, open standards, Pi as host, open-weights-primary pattern | loopeng core | No |
| **2. Opinionated defaults** | Model roster, budget, agent prompts, CI pipeline, hooks | loopeng ships defaults | Yes (edit after init; loopeng never overwrites) |
| **3. User-owned** | Platform skills, custom agents, architecture decisions | User | Fully |

---

## Version milestones

Each version maps to a loop layer that ships at minimum to prove that layer
works. Trunk-based, small ships, TDD throughout.

### v0.1.x — Global tooling setup (execution loop)

**Goal:** A developer can install loopeng and configure the global
workspace deterministically.

**Deliverables:**
- `loopeng init --global` — verifies and configures Pi, headroom, markitdown,
  OpenRouter, gh CLI. Writes `~/.pi/agent/AGENTS.md` (global constitution).
- `loopeng check` (minimal) — verifies tooling is installed and healthy
  (Pi version, headroom health, OpenRouter key, gh auth).
- Global AGENTS.md with YAGNI/SOLID/KISS/DRY constitution.
- Model defaults shipped as `~/.pi/agent/models.md` template (Layer 2
  default; user owns the file after `loopeng init --global`).
- Conventional commit hooks (commitlint + pre-commit + gitleaks).
- GitHub Actions CI (CodeQL + gitleaks + commitlint).

**Loop layer:** execution loop (Pi agent runs, uses tools, produces output).
**Proof:** user (author) uses loopeng to manage own global setup.
**Blocks on:** nothing (start here).

### v0.2.x — Project workspace setup + plugin foundation (execution loop)

**Goal:** A developer can run `loopeng init` in a project and get a
scaffolded agentic workspace. Plugin system is available for adding
platform-specific capabilities.

**Deliverables:**
- `loopeng init` (project) — scaffolds AGENTS.md, `.pi/` tree, model
  profiles, workflow config skeleton, `.gitignore`, hooks.
- Skill discovery and import: `loopeng init` scans `~/.pi/agent/skills/`,
  `~/.agents/skills/`, `.pi/skills/`, `.agents/skills/` and prompts the
  user to import discovered skills into the workspace.
- `loopeng plugin add <source>` — wraps `pi install` with validation:
  runs `pi install`, validates skills against Agent Skills standard,
  checks `compatibility` frontmatter against workspace profile.
- `loopeng plugin list` — lists installed plugins and their resources.
- `.loopeng/metrics.jsonl` (opt-in, local-only telemetry, Phase 1 shape).
- Conventional commit hooks (per-project).
- `loopeng check` extended — validates workspace structure, model IDs
  against live OpenRouter API, skill conformance.

**Loop layer:** execution loop (workspace is the environment).
**Proof:** user runs `loopeng init` on test projects; `loopeng check` passes.
**Blocks on:** v0.1.

### v0.3.x — Task loop (spec → implement → verify → document)

**Goal:** loopeng runs a full spec→implement→verify→document workflow,
human-gated.

**Deliverables:**
- Workflow config (JSON with `schemaVersion`).
- Sub-agent spawning (Pi extension): specifier, implementer, verifier,
  documenter — each with model + tools per role.
- Verification gate: `loopeng check` + tests + lint + tsc must pass.
- Maker/checker: different model reviews diff (GLM 5.2 → DeepSeek V4 Pro).
- Git checkpointing (rollback on rejected step).
- State persistence (`.loopeng/state.json` — what's done, what's next).
- Telemetry: workflow-level metrics (step, model, outcome, retries).

**Loop layer:** task loop (one artifact, spec compliance).
**Proof:** loopeng runs end-to-end, human reviews gates.
**Blocks on:** v0.2.

### v0.4.x — Dogfooding begins (system loop activates)

**Goal:** loopeng v0.4+ features are built *using* loopeng v0.3.

**Deliverables:**
- loopeng codebase itself is developed via loopeng workflow.
- headroom `--learn` writes error-pattern rules to AGENTS.md.
- Telemetry captures dogfooding data (tokens, retries, approval rates).

**Loop layer:** system loop (partial — rules only, not harness rewrites).
**Proof:** "loopeng builds loopeng" — strongest credibility demonstration.
**Blocks on:** v0.3.

### v1.0.x — Product loop (core proven)

**Goal:** loopeng runs the full spec→implement→verify→document workflow
across multiple project types, with public proof.

**Deliverables:**
- Multi-workflow support (code, writing, research modes).
- Frontier model escalation (targeted, last-resort: Fable 5 + GPT-5.5).
- Security QA agent in verify gate.
- Public telemetry aggregate (`loopeng stats --public`).
- beads structured task/memory graph.
- Full two-layer QA (deterministic gate + agentic maker/checker).

**Loop layer:** product loop (continuous, codebase + backlog).
**Proof:** two proof projects (loopeng itself + blog). See below.
**Blocks on:** v0.4.

### v1.1.x — Mobile plugin packages

**Goal:** Platform-specific capabilities ship as independently released
plugin packages.

**Deliverables:**
- `@loopeng/plugin-mobile-ios` — native iOS (Swift, SwiftUI, Xcode).
- `@loopeng/plugin-mobile-android` — native Android (Kotlin, Jetpack
  Compose, Gradle).
- `@loopeng/plugin-mobile-kmp` — Kotlin Multiplatform.
- `@loopeng/plugin-mobile-react-native` — React Native.
- Each plugin: skills conforming to Agent Skills standard, `compatibility`
  frontmatter, validated by `loopeng plugin add`.

**Loop layer:** execution loop (plugins extend the environment).
**Proof:** plugins install and validate cleanly via `loopeng plugin add`.
**Blocks on:** v1.0.

### v1.2.x — Mobile proof project

**Goal:** Mobile app comparison across four stacks using loopeng mobile
plugins from v1.1.

**Deliverables:**
- Build the same app four ways (native iOS, native Android, KMP, RN)
  using loopeng workflows.
- Comparative telemetry across four stacks (tokens, cost, retries,
  approval rates, time).
- Published process and data on the blog.

**Loop layer:** task + product loop (proven on mobile toolchains via
plugins).
**Proof:** mobile toolchain support works through the plugin system.
**Blocks on:** v1.1.

---

## Post-v1 (documented, not scheduled)

- Trace-based harness rewriting (LangChain's Level 4).
- Eval-driven prompt/tool optimization.
- Event-driven triggers (LangChain's Level 3): cron, webhooks, git hooks.
- Community contributions (CONTRIBUTING.md, CODE_OF_CONDUCT.md).
- Additional plugin packages: `@loopeng/plugin-web`, `@loopeng/plugin-dotnet`,
  community-authored plugins.

---

## Success metrics

How loopeng knows it's working. Phased telemetry (1.95 research).

| Metric | Source | Phase | Target |
|---|---|---|---|
| Tooling installs successfully | `loopeng check` exit code | v0.1 | 100% on author's machine |
| Workspaces scaffold correctly | `loopeng check` after `init` | v0.2 | 100% on test projects |
| Plugins install and validate | `loopeng plugin add` exit code | v0.2 | 100% on test plugins |
| Tasks complete end-to-end | Workflow state file | v0.3 | >80% without human intervention mid-step |
| Human approval rate at verify gate | Telemetry log | v0.3 | >90% |
| Tokens saved vs no-headroom | Headroom /stats | v0.3 | >15% |
| Cost per task | OpenRouter API + telemetry | v0.3 | <$0.50 average |
| Dogfooding: loopeng features built via loopeng | Git log + telemetry | v0.4 | >50% of commits |
| Public proof: features shipped | Telemetry aggregate | v1.0 | 2 proof projects complete |
| Compression quality | `headroom evals adversarial` | v1.0 | No regression vs baseline |
| Mobile plugins functional | Plugin install + skill validation | v1.1 | 4 plugins shipped |
| Mobile proof: comparative data | Telemetry aggregate | v1.2 | 4 stacks, published data |

---

## Proof projects

Real projects that demonstrate loopeng works. Each exercises a different
project type. The blog (`codewithshabib`) publishes the process and data.

| Project | Type | Path | Phase | What it proves |
|---|---|---|---|---|
| **loopeng itself** | Devex tool (dogfooding) | `~/Projects/loopeng` | v0.4+ | The tool builds itself (system loop) |
| **codewithshabib blog** | Content/web | `~/Projects/Claude-Cowork/CodeWithShabib/shabib87.github.io` | v1.0 | spec→implement→verify→document on a real site |
| **Mobile app comparison** | Mobile (iOS/Android/KMP/RN) | (to be created) | v1.2 | Mobile-toolchain support via plugins + comparative telemetry across 4 stacks |

v1.0 proves on two projects (loopeng + blog). Mobile proof follows at v1.2
after plugin packages ship at v1.1.

---

## Out of scope (v1)

Traces to NORTH_STAR out-of-scope:

- Building a new agent host (Pi is the host).
- Fully unattended autonomous runs (v1 is human-gated verification gate).
- Lock-in to one model vendor (open-weights primary, frontier escalation).
- Taking external contributions (solo-dev OSS for v1; issues welcome, PRs not yet).
- Custom doc-graph indexer (flat files + beads + headroom memory covers it).
- MCP doc server (Pi has no native MCP; deferred to v2+).
- Building a TypeScript memory abstraction (headroom + beads compose; YAGNI).
- Targeting platforms other than macOS for v1.
- Bundling platform-specific skills into core loopeng (shipped as plugins).

---

## How this avoids drift

Every milestone traces to:
- A NORTH_STAR non-negotiable (the *what*).
- A loop layer (the *paradigm*).
- A proof project (the *evidence*).
- A success metric (the *measurement*).

If a proposal cannot trace to all four, it is out of scope for v1 or
requires amending the ROADMAP first. This is the same drift-prevention
principle from NORTH_STAR, applied to delivery sequencing.
