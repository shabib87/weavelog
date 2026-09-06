---
date: 2026-09-02
topic: OSS AI coding-agent harnesses/orchestrators (outrigger, one-punch, keel, trammel, tiller-ai, baton, agent-harness, microsoft/conductor, AO, SupaConductor, llm-conductor) vs weavelog
status: complete
sources:
  - "https://github.com/dwijenpatel/outrigger"
  - "https://github.com/dwijenpatel/one-punch"
  - "https://github.com/keel-harness/keel"
  - "https://github.com/IronAdamant/Trammel"
  - "https://github.com/hmSchuller/tiller-ai"
  - "https://github.com/bencode/baton"
  - "https://github.com/ramannanda9/agent-harness"
  - "https://github.com/microsoft/conductor"
  - "https://github.com/Ibrahim-3d/orchestrator-supaconductor"
  - "https://github.com/Untrivial-ai/agent-orchestrator"
  - "https://github.com/Vibecodelicious/llm-conductor"
  - "https://api.github.com/repos/* (live metadata, 2026-09-02)"
  - "https://registry.npmjs.org/-/v1/search (collision checks, 2026-09-02)"
models_used_for_research:
  - openrouter/z-ai/glm-5.3-flash
supersedes: none
---

# OSS agent-harness competitors vs weavelog (2026-09-02)

Method: all primary READMEs fetched live from GitHub HTML pages this dispatch; metadata
(stars/created/pushed/license) pulled live from the GitHub REST API the same day. Last-verified
date for every claim: **2026-09-02**. All repos are 2026-vintage and young; star counts are
small except where noted.

The reference design ("weavelog"): CONDUCTOR main agent + specialized subagents (scout/researcher,
TDD implementer, QA gate, security gate/Semgrep, vision gates, multi-model diff reviewers); human
owns plan gate + merge gate; WHAT loop (design dialogue) vs HOW loop (TDD execution); backlog.md
CLI tracker + wayfinder multi-session mapping; skills catalog + model-routing runbook +
worktree discipline + headroom proxy/compression stack; runs on opencode CLI; one-question-at-a-time.

---

## 1. outrigger — https://github.com/dwijenpatel/outrigger

**Essence:** an evidence *lab* for long-horizon coding agents — every mechanism must earn its
place via pre-registered experiments, and can be demoted by its own measurements.

**Architecture (what enforces what):** Python standalone CLIs connected by schema-validated files
and exit codes, plus a Claude Code skill (`spec-interview`). Tools: `spec-interview` (goal →
ratified machine-checkable plan), `plan-preflight` (refuses malformed/unratified plans),
`heldout-suite` (blind acceptance suite authored separately from the worker; fails-on-base proof;
tamper-evident seal), `merge-gate` (judges the merged tree in a clean worktree), `exec-loop`
(author → seal → implement → gate → land, unattended), `run-ledger` (append-only measurement
ledger of every prediction and null arm), `shadow-pilot` (harness-vs-null comparisons with a
blind arbiter). Enforcement is *process + exit codes*, not OS sandboxing. Full mock-worker test
pipeline runs with zero API spend.

**Key findings the repo itself reports (all dated 2026-07):** spec ambiguity is the defect class
that survives everything → cheapest interception is a planning interview + adversarial *plan*
review; the blind merge gate **underperformed** on well-specified work (three-arm experiment
2026-07-16: same single defect in all arms, gate cost 5.9× the ungated arm) and was demoted to a
profile for weak specs/high stakes; frontier one-shot builds are strong and residual defects
cluster at cross-artifact seams; **layered independent (adversarial) review is the one mechanism
no experiment ever demoted**; error compounding over run length is real but "fresh links + gates
beats one long session" is still an open bet, not a settled fact.

**vs weavelog:** spec-interview ≈ WHAT loop / grilling; adversarial plan review ≈ weavelog's diff
reviewers; exec-loop ≈ HOW loop. Differences: weavelog has NO held-out examiner (separate worker
authors the acceptance suite, OS-level read denial keeps the implementer blind) and NO
harness-vs-null measurement discipline; outrigger has NO model routing, no task tracker, no
skills catalog, no proxy/compression, and no productized onboarding. Notably, outrigger's own
evidence **partially contradicts** weavelog's merge gate on well-specified work (cost without
defect reduction) — weavelog's merge gate is justified by human ownership, not defect-catching,
but the 5.9× number is a live counter-data-point.

**Pros:** unmatched epistemic discipline; runnable evidence; demotes its own failed ideas on the
record. **Cons:** experiment rig, not a product; single experimenter; active work moved out.

**Maturity:** 0 stars · created 2026-07-07 · last push 2026-07-29 · 249 commits · MIT · Python ·
no releases. **Successor:** one-punch (below) is where the surviving artifacts live.

**Verdict:** weavelog **AHEAD** on productization breadth (routing, tracker, skills, proxy,
multi-session) — **BEHIND** on exactly two things: (1) the held-out examiner pattern, (2) the
measurement regime (pre-registered predictions, null arms, deletion criteria). Both are cheap to
adopt as a skill + gate rather than a fork.

---

## 2. one-punch — https://github.com/dwijenpatel/one-punch (outrigger's successor)

**Essence:** "Decisions by execution, contracts by compilation" — a thin HITL pipeline layer over
the mattpocock/skills plugin: destination → decision map (grilling/spike/prototype/research) →
[contract] → tickets → TDD build → two-axis review; human merges.

**Architecture:** pure Claude Code plugin skills over mattpocock-skills 1.2.0; decisions resolved
**one at a time** on decision tickets; v1's total-spec AFK runner + plan-review rounds were
*removed by evidence* (4 review rounds, 79 findings, 1 plan) — v2 ratified 2026-07-27.

**vs weavelog:** this is weavelog's closest sibling — same upstream skill DNA (wayfinder, grilling,
prototype), same one-question-at-a-time decision protocol, same human merge gate, same WHAT→HOW
shape. Divergence: one-punch *compiles* contracts from resolved decisions (rather than
interviewing specs into existence), uses probe-transcript spikes as the only admissible source of
external-behavior claims, and demoted its own runner. It has no model routing, no tracker of its
own, no proxy stack, opencode absent.

**Verdict:** **PARITY** on process philosophy (independent convergence on the WHAT/HOW +
one-decision-at-a-time design); weavelog **AHEAD** on infrastructure (opencode SDK/plugins,
backlog CLI, compression proxy, model routing) and **BEHIND** on decision-hygiene details worth
stealing: spike transcripts as evidence artifacts, and the willingness to delete stages that
don't re-earn their cost.

---

## 3. keel — https://github.com/keel-harness/keel

**Essence:** a governance-native agent harness — the model can only *request*; a separate
out-of-process warden decides under a hash-pinned policy and writes tamper-evident audit.

**Architecture (the strongest structural enforcement in this whole field):** kernel (agent) →
**warden process** (owns policy evaluation, sandbox launch, authoritative audit) → hash-pinned
policy the model cannot rewrite → tamper-evident audit (hash chain + Ed25519 checkpoints +
offline verifier). Vendors Anthropic `@anthropic-ai/sandbox-runtime` v0.0.59: macOS Seatbelt +
Linux bubblewrap; required denial probes fail CI when a backend is missing. Connect-time egress
guard resolves/classifies/pins every destination before dialing. Typed publication authority:
`git.push` binds one repo+branch+exact commit OID; `github.pr.create` is a separate once-only
approval. Trust-before-parse (reads no project files, not even AGENTS.md, until the workspace is
trusted); intent-before-effect (durable intent record precedes any side effect). Autonomy
postures: **Guided** (default, prompts inside enforced bounds) vs **Autopilot** ("Autopilot is
not YOLO" — unprompted action only for warden-proven contained actions; the model can never raise
its own mode). Cost knobs: `KEEL_MAX_TOKENS` (cost-true spend cap), `KEEL_MAX_TURNS` (50),
`KEEL_MAX_WALL_SEC`. Evidence: 7,528 tests, 1,123 adversarial denied-path tests, 97.79%
statement coverage gate; TerminalBench run explicitly caveated as single-trial/subset.

**vs weavelog:** weavelog's enforcement is conventions + hooks + HITL gates; there is **no OS-level
boundary, no out-of-process anything, no audit chain** — a misbehaving subagent in weavelog is
stopped by instruction and by the human, not by the OS. weavelog is AHEAD on: subagent
specialization, WHAT/HOW dialogue, research layer, routing runbook, wayfinder multi-session,
proxy/compression, opencode-native depth. keel is AHEAD on: containment, egress control, audit,
publication authority, and the cost-true spend cap.

**Pros:** the honest security-model doc; fail-closed everywhere; audited claims ledger
(`docs/quality/claim-ledger.md`). **Cons:** explicitly pre-alpha, solo-maintained, AI-assisted,
not independently audited; no subagent/conductor model; dialogue-free.

**Maturity:** 6 stars · created 2026-07-31 (public history import) · pushed 2026-08-28 · 168
commits · Apache-2.0 · TypeScript/Node 20+/pnpm · npm `keel-harness@0.1.2` (pre-alpha).

**Verdict:** weavelog **BEHIND** on enforcement architecture (OS sandbox, warden, audit —
structurally absent) — **AHEAD** on everything above the kernel: collaboration model, gates as
dialogue, research, routing, and multi-session orchestration. Adoptable: hard budget caps
(cost-true) and an intent-before-effect audit trail.

---

## 4. Trammel — https://github.com/IronAdamant/Trammel

**Essence:** a stdlib-only Python planning engine that treats planning as structured *search* —
beam strategies, per-step verification in temp copies, failure constraints, recipe memory —
handed to any LLM via MCP.

**Architecture:** a tool **for** LLMs, not one that calls them. Decompose (import analysis →
dependency DAG → ordered steps), Explore (9 beam strategies: bottom-up, top-down, risk-first,
critical-path, cohesion, minimal-change…), Verify (edits applied in isolated temp copies; real
test suite per step + AST preflight + import-integrity + static analysis), Constrain (failure
signatures block repeat mistakes across sessions), Remember (recipe store in SQLite: trigram +
TF-IDF + MinHash retrieval). Surfaces: MCP server (12 primary of 33 tools), CLI, Python API,
direct SQLite. Multi-agent: `claim_step`/`release_step` (10-min auto-expiry) + DAG metrics
(`max_parallelism`, `layer_widths`, `critical_path_length`). 15 languages; 414 unittest tests;
CI 3.10–3.13. Companion tools Stele (context) and Chisel (code analysis) via MCP, no
cross-dependencies.

**vs weavelog:** dependency-aware decomposition ≈ backlog `depends_on` + wayfinder tickets;
per-step verification in isolated copies ≈ weavelog's worktree discipline (different mechanism,
same goal); multi-agent claiming ≈ backlog task assignment. Trammel has **no** HITL gates, no
security, no reviewer diversity, no model routing — the LLM client orchestrates; Trammel only
supplies deterministic planning muscle. Recipe memory (mined, similarity-retrieved,
success-weighted) has no weavelog equivalent; weavelog's memory/research notes are curated, not
mined.

**Pros:** deterministic, dependency-free, genuinely novel plan-search + failure-constraint ideas.
**Cons:** planner quality bound by regex analyzers; push activity stopped 2026-07-08; 1 star.

**Maturity:** 1 star · created 2026-03-22 · pushed 2026-07-08 · 103 commits · MIT · Python
stdlib-only · PyPI `trammel` v3.15.2.

**Verdict:** **ORTHOGONAL** with two concrete borrowables: beam/strategy branching over backlog
task plans, and mined failure-constraint memory (persist "what failed and why" as machine-checked
constraints). weavelog AHEAD on governance, security, dialogue; BEHIND on nothing critical here.

---

## 5. tiller-ai — https://github.com/hmSchuller/tiller-ai

**Essence:** scaffolds a nautical-metaphor dev workflow (branching, planning, parallel builds,
review, changelog) into any repo for Claude Code / GitHub Copilot CLI / OpenCode via `npx
tiller-ai init`.

**Architecture:** enforcement = **conventions + hooks only**. Scaffolded per-tool: skills
(`/setup /sail /scout /anchor /dock /recap /repair-hull /cookbook`), 4 agents (Quartermaster =
diff review PASS/FAIL with one negotiation round + Captain arbitration; Bosun = tech debt, auto
every 3 features; Cartographer = `codebase-map.md` at /dock), hooks (secret-scan PreToolUse
blocking writes containing secrets, post-write formatter, session-resume orientation,
plan-context injection), `.tiller/` state (manifest, compass waypoint file, tech-debt counter),
MCP server (10 tools: agent registry, inbox messaging, compass, sessions) to backfill Copilot
CLI's missing coordination, live web dashboard. Modes: simple/detailed (detailed waits for
approval before touching files); workflows: solo (auto-merge to main!) / team (PR via gh).

**vs weavelog:** closest surface overlap: skills + agent roster + hooks + OpenCode support
(experimental there; native in weavelog). Quartermaster review ≈ weavelog's QA/diff gates, but
single reviewer, single negotiation, and **solo mode merges to main without a human gate** —
weaker HITL than weavelog's mandatory merge gate. No security gate beyond secret-scan, no
research/scout depth (a `/scout` exists but is a ticket producer), no model routing, no
multi-session wayfinding. `/dock` changelog discipline and Bosun's automatic every-3-features
debt sweep are nice weavelog borrowables.

**Pros:** best-in-class onboarding UX (`npx init` → structured repo), genuinely multi-tool.
**Cons:** dormant — last push 2026-03-09 (~6 months stale at research date); enforcement is
advisory; 2 stars.

**Maturity:** 2 stars · created 2026-02-27 · pushed 2026-03-09 · 435 commits · MIT · TypeScript
(Node 22+, tsup/vitest) · npm `tiller-ai`.

**Verdict:** weavelog **AHEAD** on gate rigor, security depth, research layer, routing, and
OpenCode-native depth — **BEHIND** only on distributable packaging (`npx init` scaffold for
strangers' repos) which weavelog hasn't attempted (it's personal-config today; OSS-bound this is
the gap that matters).

---

## 6. baton — https://github.com/bencode/baton

**Essence:** an agent collaboration *engine* — a persistent server (Hono + SQLite) holds
workspaces → projects → requirements → tasks; worker machines register, claim sessions in git
worktrees; humans watch/intervene from web UI, DingTalk, or Feishu.

**Architecture:** server + React SPA + `@lesscap/baton-cli` worker daemon + chat bridges + Docker
compose. References-only storage (content lives in git), light GitHub issue mirroring, share
links, xterm.js-over-WebSocket interactive terminal into any remote worker (pty, no inbound
port), worker-to-worker delegation via global W-N handles. Enforcement: none (collaboration
dimension only).

**vs weavelog:** solves multi-machine human↔agent relay, not quality. weavelog's per-worktree
session model is similar but single-machine and conductor-mediated.

**Maturity:** 1 star · created 2026-05-26 · pushed 2026-08-05 · 321 commits · MIT · TypeScript
monorepo · npm `@lesscap/baton-cli`.
**Verdict:** **ORTHOGONAL**; weavelog AHEAD on quality machinery, baton AHEAD on distributed
collaboration/observability (relevant only if weavelog ever goes fleet).

---

## 7. agent-harness (react-agent-harness) — https://github.com/ramannanda9/agent-harness

**Essence:** a BYO-LLM Python *framework* for building multi-agent systems: hybrid DAG planning
with replan-on-failure, two-tier memory, streaming event bus, cost budgets, HITL gates, sandboxed
tool execution.

**Architecture:** `AgentRuntime` with per-call-site LLM injection (`classifier_llm=cheap`,
`router_llm=cheap`, planner/synthesizer on main model), `BudgetGuard` (cost/token caps with
per-call-site attribution), `FallbackLLM`/`RoutingLLM`, `ExecutorBridge` (allowlist, env
scrubbing, Docker network/fs isolation, timeouts), `hitl.py` approval gates + **plan mode**
(approves intent, not fabricated args; free-text rejection becomes planner feedback with a
revision limit), persistent tool policies, checkpoint/resume incl. sub-agent crash-resume, JSONL
trace + timeline viewer, memory reconciliation (LLM-arbitrated ADD/UPDATE/MERGE/DELETE, deletes
demoted by default), MCP adapter, SKILL.md-style skills (instructions only; tool access never
granted by skills). Dispatch classifies simple-vs-complex with one cheap call.

**vs weavelog:** the SubAgentTool/coordinator pattern ≈ CONDUCTOR; plan-mode HITL ≈ plan gate;
skills-dir support ≈ weavelog's catalog. But it is a *library for writing agent systems*, not a
coding-workflow harness: no TDD discipline, no tracker, no reviewer diversity, no security
scanning, no dialogue protocol. Most active repo in the primary set (pushed 2026-09-02).

**Maturity:** 3 stars · created 2026-05-11 · pushed 2026-09-02 · 66 commits · MIT · Python.
**Verdict:** weavelog **AHEAD** on coding-specific gates and process; **BEHIND** on runtime
plumbing weavelog lacks: hard budget guard, checkpoint/resume, tool-result caching, observation
caps, persistent tool policy. These are the cheapest adoptable ideas in this entire landscape.

---

## 8. Landscape (brief) — the bigger 2026 orchestrators

**microsoft/conductor — https://github.com/microsoft/conductor** (415★, MIT, created 2026-02-02,
pushed 2026-09-02, Python): YAML-defined multi-agent workflows over Copilot SDK/Anthropic;
**no LLM in the routing loop** (Jinja2 condition routing, first-match wins); parallel groups,
sub-workflows, AGENTS.md injection, web dashboard with in-browser **human gates**, Fleet Manager
TUI, Azure Container Apps sandboxed provider. Validates weavelog's human-gates + deterministic
scaffolding thesis, at Microsoft scale; has zero dialogue/spec-discovery layer. weavelog AHEAD on
WHAT-loop dialogue + gates-with-evidence; BEHIND on fleet observability and distribution.

**Untrivial-ai/agent-orchestrator (AO) — https://github.com/Untrivial-ai/agent-orchestrator**
(10,866★ — the field's giant, Apache-2.0, Go desktop app, created 2026-02-13, pushed 2026-09-03):
desktop workspace; per-worker branch+worktree; project orchestrator plans/delegates/spawns;
26 supported agent CLIs (incl. opencode); Kanban with PR/CI/review state; agent reviews returned
to the owning worker. Converges hard with weavelog on worktrees + conductor-style planning;
diverges by being a GUI product optimizing operator throughput, not gate rigor. weavelog BEHIND on
reach/maturity; AHEAD on gate/evidence rigor.

**Ibrahim-3d/orchestrator-supaconductor (SupaConductor) — https://github.com/Ibrahim-3d/orchestrator-supaconductor**
(375★, AGPL-3.0, created 2026-02-17, pushed 2026-04-08 — dormant): Claude Code plugin;
Evaluate-Loop (plan → evaluate plan → execute → evaluate → fix, ≤5 cycles); Board of Directors
(5 deliberating directors); 15 agents/4 evaluators; **Opus for plan+eval, Sonnet for execution**
(model routing, convergent with weavelog's runbook); bundles obra/superpowers v4.3.0; optional
human-in-the-loop mode (default is autonomous — opposite of weavelog).

**Vibecodelicious/llm-conductor — https://github.com/Vibecodelicious/llm-conductor** (5★, MIT,
created 2026-01-16, pushed 2026-08-19): pure-markdown orchestrator instructions
(developer/reviewer/judge subagents, develop-review-judge loop ≤5 iterations) portable across 7
agent CLIs incl. OpenCode. Convergent: reviewer/judge separation ≈ weavelog's gate diversity; but
zero machine enforcement — closest cousin to weavelog's AGENTS.md-as-protocol approach, and proof
that instruction-only enforcement is the common floor.

Also noted: **neul-labs/conductor** (0★, supervisor over Claude/Codex/Gemini CLIs,
sequential/parallel/consensus/handoff patterns), **tinhtran24/maestro** (1★, Go workbench, 23
agent adapters, per-session worktrees, CI-failure/review-comment feedback routing), and prior-art
**Archon** (already researched 2026-08-19: DAG harness using `@opencode-ai/sdk` — the only other
opencode-native harness found).

---

## Competitive landscape

**Where the field converges (weavelog is not differentiated on these):**
1. Deterministic scaffolding around LLM judgment — universal (every repo above).
2. Human gates at plan and merge — common (one-punch, keel Guided, microsoft/conductor dashboard
   gates, agent-harness plan mode). weavelog's plan/merge gates are **table stakes**, not USPs.
3. Specialized subagent rosters with adversarial review — common (tiller's Quartermaster,
   llm-conductor's dev/review/judge, SupaConductor's evaluators/board). Multi-model reviewer
   diversity specifically is directionally common (EtroxTaran's 4-eyes, SupaConductor Opus/Sonnet).
4. Git-worktree session isolation — common (baton, AO, maestro, superpowers skills).
5. Task/DAG tracking with dependencies — common (Trammel DAG, baton R-N/T-N, agent-harness DAG,
   AO Kanban). backlog.md is a good implementation, not a differentiator.
6. Model routing for cost — common (agent-harness per-call-site, SupaConductor tiers).

**Where the field differentiates (weavelog's unique or rare assets):**
- One-question-at-a-time dialogue protocol + wayfinder decision-ticket mapping: matched only by
  one-punch (same skill lineage). Rare and defensible.
- Research/scout as a first-class subagent with a dated, indexed evidence archive: essentially
  unmatched in this set.
- Compression proxy stack (headroom between agent and provider): no competitor ships anything
  like it; keel caps spend but doesn't compress.
- Evidence-grade process hygiene (outrigger's held-out examiner, null arms, deletion criteria):
  unique to outrigger/one-punch — weavelog's main borrowable gap.
- Out-of-process warden + OS sandbox + tamper-evident audit: unique to keel — weavelog's
  structural gap if security posture ever matters for adoption.

**Overall verdict:** weavelog is **AHEAD on process** (WHAT/HOW separation, dialogue discipline,
gates-with-evidence, research layer) and **orthogonal on enforcement** (nobody else combines
conductor dialogue with keel-style containment, and nobody else has the proxy stack). It is
**behind on**: (1) held-out acceptance suites authored by a separate worker (outrigger), (2)
hard budget/cost caps and checkpoint/resume (agent-harness, keel), (3) packaged distribution to
other repos/users (tiller's `npx init`, keel's npm, AO's desktop), (4) fleet-level observability
(microsoft/conductor, AO). No competitor replicates the full weavelog stack; the nearest overall
rival in spirit is one-punch (process) and keel (rigor), and neither has model routing, a
tracker-native spec store, or a research layer.

## Collision check (GitHub + npm, verified 2026-09-02)

| Name | GitHub | npm | Risk for naming |
|---|---|---|---|
| **fermata** | AndreyPavlenko/Fermata (1289★, Android video), natevw/fermata (331★, 2011 REST client) | `fermata@0.11.1` (2020, REST client) + plugins | **Clear** — taken names exist but nothing in the agent-harness space |
| **caesura** | DataManagementLab/caesura (21★), dbox/caesura (13★), propensive/caesura (11★) | `caesura@0.3.0` (2017 CSS) **plus active 2026 org `@caesura-io/*`** (OpenAI SDK wrapper + AI-SDK adapter, 2026-06-30) | **Partial** — bare npm name occupied; an AI-scoped org is actively using the name |
| **downbeat** | music-domain results (BeatNet, beat_this); no agent repos | `downbeat@1.0.4` (2015 Stylus), `@audio/mir-downbeat` (2026) | **Clear-ish** — music/vertical-rhythm domain, no AI collision |
| **batuta** | **paiml/batuta (25★, agent orchestration, MOVED→paiml/aprender `crates/aprender-orchestrate`)** | `@vorluno/batuta-mcp@0.1.0` (MCP task-splitter, 2026-06-22) | **Collision** — name already used by an agent-orchestration project and an MCP package |
| **sides** | only generic-word matches | generic fragments (`@stdlib/blas-base-operation-sides`, `parse-css-sides`) | **Clear but unusable** — too generic to search or brand |
| **wayline** | Tao-tao520/planar-wayline (54★, DJI drones), **ANRGUSC/wayline (10★, K8s one-shot-DAG runtime)** | **`wayline@0.0.0` taken** (placeholder), `dji-wayline-map@0.2.0` (2026-08-19) | **Collision** — bare npm name taken; drone domain active; DAG-runtime name squat in GitHub |

## Not checked / open questions
- Did not read outrigger's `docs/design/evidence-based-harness.md`, keel's `MASTER_SPEC.md`, or
  Trammel's full changelog beyond what the README rendered; all verdicts rest on README-level claims.
- one-punch has no LICENSE file detected via the API (lic=`?`) — unknown if it is OSS-safe to borrow from.
- Did not verify npm download counts (popularity vs stars) for any package.
- Star counts for repos this small are noise; activity (pushed dates) is the better signal and is recorded above.
