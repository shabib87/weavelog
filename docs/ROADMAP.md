# Roadmap

> **Authority:** Product requirements (PRD equivalent). Traces to
> `docs/NORTH_STAR.md` (what), `docs/RESEARCH.md` (why), and
> `docs/PRODUCT.md` (product strategy — what loopeng is, moat, PMF).
> **Cross-ref:** `docs/PROGRESS.md` (phase tracker), `docs/adr/` (decisions)

This is the phased delivery plan for loopeng. It maps the loop-engineering
paradigm to version milestones, defines success metrics, and sequences the
proof projects. Every milestone traces to a NORTH_STAR non-negotiable.

---

## Pending decisions (need user input)

Three decisions from the 1.95 research are pending user review. They are
noted here with recommendations so the ROADMAP can be drafted without
blocking. The user will read the research docs and decide.

| Decision | Recommendation | Research doc | Impact if deferred |
|---|---|---|---|
| **License** | Apache 2.0 + trademark policy | `docs/research/2026-07-04-license-selection.md` | LICENSE file stays MIT until decided; no blocker for v0.1 |
| **Frontier models** | Fable 5 + GPT-5.5 (cross-vendor) | `docs/research/2026-07-04-frontier-model-selection.md` | Codex profiles keep current opus+fable until decided; no blocker for v0.1 |
| **Telemetry** | Phased opt-in, local-first | `docs/research/2026-07-04-evals-and-telemetry.md` | No telemetry until v0.2; no blocker for v0.1 |

**Recommendation:** proceed with v0.1 work using current state (MIT, existing
models, no telemetry). Resolve all three before v0.2.

---

## Loop engineering paradigm

loopeng grounds itself in the loop-engineering vocabulary named by the field
in June–July 2026. Four sources, all read in full:

| Source | Author | Date | Contribution |
|---|---|---|---|
| "Loop Engineering" | Addy Osmani | Jun 7, 2026 | Five+one components: automations, worktrees, skills, plugins, sub-agents, memory. Maker/checker split. "Agent forgets, repo doesn't." |
| "Loopcraft: The Art of Stacking Loops" | swyx (Latent Space) | Jun 12, 2026 | Stack loops effectively. "Salty Lesson for agents." Go down a loop for reliability, up a loop for leverage. |
| "The Art of Loop Engineering" | LangChain | Jun 16, 2026 | Four loop levels: agent → verification → event-driven → hill climbing. The fourth "reaches inside and updates the agent loop directly." |
| "What the hell is a loop, anyway?" | Laurie Voss | Jul 3, 2026 | Four-loop taxonomy: execution / task / product / system + oversight. "Autonomy is a dial on every loop." |

### The four loops (Voss's taxonomy, adopted)

| Loop | What it iterates on | Ends when | Human role | loopeng scope |
|---|---|---|---|---|
| **Execution** | Steps within one task | Environment feedback (test output, API response) | Absent mid-loop, present at boundaries | v0.1 (Pi agent loop) |
| **Task** | A single artifact against a spec | Spec compliance + passing tests | Writes spec, judges done-ness | v0.3 (Ralph-loop shape) |
| **Product** | A codebase + its backlog | Continuous (external signals: issues, feedback) | Configurable checkpoints | v1.0 (one workflow: spec→code→QA→document) |
| **System** | Prompts, harness, model choices | Continuous (evals, traces) | Last checkpoint | v1.x+ (partial via headroom `--learn`) |
| **Oversight** | Goals, budgets, culling | None (the human lives here) | The human | Always (the user) |

**v1 scope:** execution + task loops (human-gated). Product loop partial (one
workflow). System loop partial (headroom `--learn` rules only, not harness
rewrites). Oversight = the user. This traces to NORTH_STAR: "Fully unattended
autonomous runs (v1 is human-gated at each verification gate)" is out of scope.

---

## Four engineering disciplines

loopeng combines four engineering disciplines. Each milestone applies them.

| Discipline | What it means | loopeng mechanism |
|---|---|---|
| **Prompt engineering** | Crafting agent instructions, system prompts, skill descriptions | AGENTS.md, superpowers skills, `.pi/agents/<role>.md` |
| **Context engineering** | Managing what reaches the model's context window | Headroom compression, markitdown ingestion, beads memory, doc indexing |
| **Harness engineering** | The environment one agent runs inside | Pi host, extensions, git worktrees, `loopeng check` gates |
| **Loop engineering** | Designing the loops that prompt the agents | Workflow configs, sub-agent spawning, verification gates, the spec→implement→verify→document loop |

These compose. A change to the prompt (prompt eng) affects context (context
eng) affects the harness (harness eng) affects the loop (loop eng). loopeng
treats them as one integrated practice, not four separate concerns.

---

## Version milestones

Each version maps to a loop layer and ships the minimum that proves the layer
works. Trunk-based, small ships, TDD throughout.

### v0.1.x — Global tooling setup (execution loop)

**Goal:** a developer can install loopeng and configure their global
workspace deterministically.

**Deliverables:**
- `loopeng init --global` — verifies + configures Pi, headroom, markitdown,
  OpenRouter, gh CLI. Writes `~/.pi/agent/AGENTS.md` (global constitution).
- `loopeng check` (minimal) — verifies tooling is installed and healthy
  (Pi version, headroom health, OpenRouter key, gh auth).
- Global AGENTS.md with YAGNI/SOLID/KISS constitution.
- Conventional commit hooks (commitlint + pre-commit + gitleaks).
- GitHub Actions CI (CodeQL + gitleaks + commitlint).

**Loop layer:** execution loop (Pi agent runs, uses tools, produces output).
**Proof:** the user (author) uses loopeng to manage their own global setup.
**Blocks on:** nothing (this is the start).

### v0.2.x — Project workspace setup (execution loop)

**Goal:** a developer can run `loopeng init` in any project and get a
scaffolded agentic workspace.

**Deliverables:**
- `loopeng init` (project) — scaffolds AGENTS.md, `.pi/` tree, model profiles,
  workflow config skeleton, `.gitignore`, hooks.
- `loopeng check` (extended) — adds: sanitization scan, dependency audit,
  AGENTS.md policy check, license scan.
- Telemetry: local `.loopeng/metrics.jsonl` (opt-in, usage data only).
- beads integration (optional, with user approval).

**Loop layer:** execution loop (per-project).
**Proof:** loopeng used to scaffold a real project workspace.
**Blocks on:** v0.1.

### v0.3.x — Task loop (Ralph loop)

**Goal:** loopeng runs spec→implement→verify→document for a single task,
human-gated.

**Deliverables:**
- Workflow config format (JSON with `schemaVersion`).
- Sub-agent spawning (Pi extension): specifier, implementer, verifier,
  documenter — each with model + tools per role.
- Verification gate: `loopeng check` + tests + lint + tsc must pass.
- Maker/checker: different model reviews diff (GLM 5.2 → DeepSeek V4 Pro).
- Git checkpointing (rollback on rejected step).
- State persistence (`.loopeng/state.json` — what's done, what's next).
- Telemetry: workflow-level metrics (step, model, outcome, retries).

**Loop layer:** task loop (one artifact, spec compliance).
**Proof:** loopeng runs a real task end-to-end, human reviews at gates.
**Blocks on:** v0.2.

### v0.4.x — Dogfooding begins (system loop activates)

**Goal:** loopeng v0.4+ features are built *using* loopeng v0.3.

**Deliverables:**
- The loopeng codebase itself is developed via the loopeng workflow.
- headroom `--learn` writes error-pattern rules to AGENTS.md.
- Telemetry captures dogfooding data (tokens, retries, approval rates).

**Loop layer:** system loop (partial — rules only, not harness rewrites).
**Proof:** "loopeng builds loopeng" — the strongest credibility demonstration.
**Blocks on:** v0.3.

### v1.0.x — Product loop (the North Star vision)

**Goal:** loopeng runs the full spec→implement→verify→document workflow
across multiple project types, with public proof.

**Deliverables:**
- Multi-workflow support (code, writing, research modes).
- Frontier model escalation (targeted, last-resort: Fable 5 + GPT-5.5).
- Security QA agent in the verify gate (scope iii).
- Public telemetry aggregate (`loopeng stats --public`).
- beads as the structured task/memory graph.
- Full two-layer QA (deterministic gate + agentic maker/checker).

**Loop layer:** product loop (continuous, codebase + backlog).
**Proof:** the three proof projects (below).
**Blocks on:** v0.4.

### Post-v1 — System loop (full)

**Goal:** loopeng improves itself via trace analysis.

**Deliverables:**
- Trace-based harness rewriting (LangChain's level 4, full).
- Eval-driven prompt/tool improvement.
- Mobile app comparison proof project (v1.0.x demonstration).
- Contributor readiness (CONTRIBUTING.md, CODE_OF_CONDUCT.md).

**Loop layer:** system loop (full).
**Blocks on:** v1.0.

---

## Success metrics

How loopeng knows it's working. Phased with telemetry (1.95 research).

| Metric | Source | Phase | Target |
|---|---|---|---|
| Tooling installs successfully | `loopeng check` exit code | v0.1 | 100% on author's machine |
| Workspaces scaffold correctly | `loopeng check` after `init` | v0.2 | 100% on test projects |
| Tasks complete end-to-end | Workflow state file | v0.3 | >80% without human intervention mid-step |
| Human approval rate at verify gate | Telemetry log | v0.3 | >90% |
| Tokens saved vs no-headroom | Headroom /stats | v0.3 | >15% |
| Cost per task | OpenRouter API + telemetry | v0.3 | < $0.50 average |
| Dogfooding: loopeng features built via loopeng | Git log + telemetry | v0.4 | >50% of commits |
| Public proof: features shipped | Telemetry aggregate | v1.0 | 3 proof projects complete |
| Compression quality | `headroom evals adversarial` | v1.0 | No regression vs baseline |

---

## Proof projects

Three real projects that demonstrate loopeng works. Each exercises a different
project type. The blog (`codewithshabib`) publishes the process + data.

| Project | Type | Path | Phase | What it proves |
|---|---|---|---|---|
| **loopeng itself** | Devex tool (dogfooding) | `~/Projects/loopeng` | v0.4+ | The tool builds itself (system loop) |
| **codewithshabib blog** | Content/web | `~/Projects/Claude-Cowork/CodeWithShabib/shabib87.github.io` | v1.0 | spec→implement→verify→document on a real site |
| **Mobile app comparison** | Mobile (iOS/Android/KMP/RN) | (to be created) | v1.0.x | Mobile toolchain support; comparative data across 4 native approaches |

**Credibility model:** Tolaria's "built from real use" — but with three proof
points across three project shapes, plus published telemetry. The blog is both
a proof project and the demonstration channel.

---

## Out of scope (v1)

Traces to NORTH_STAR "Out of scope" + research findings:

- Building a new agent host (Pi is the host)
- Fully unattended autonomous runs (human-gated at each verification gate)
- Lock-in to one model vendor (open-weights primary, frontier as escalation)
- Taking external contributions (solo-dev OSS for v1; issues welcome, PRs not yet)
- Custom doc-graph indexer (flat files + beads + headroom memory covers it)
- MCP doc server (Pi has no native MCP; deferred to v2+)
- Building a TypeScript memory abstraction (headroom + beads compose; YAGNI)
- Targets other than macOS for v1

---

## How this avoids drift

Every milestone traces to:
- A NORTH_STAR non-negotiable (the *what*)
- A loop layer (the *paradigm*)
- A proof project (the *evidence*)
- A success metric (the *measurement*)

If a proposal cannot trace to all four, it is out of scope for v1 or requires
amending this ROADMAP first. This is the same drift-prevention principle as
NORTH_STAR, applied to delivery sequencing.
