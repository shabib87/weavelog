# Product Definition

> **Authority:** Product strategy. What flightlead IS, who it's for, why it wins.
> **Distinct from:** `NORTH_STAR.md` (what we build - the anchor),
> `ROADMAP.md` (how we deliver - milestones), `research/` (why choices).
> This doc answers: what is the product, what is it not, who uses it, what's
> the moat, what's the PMF thesis.

## What flightlead IS

flightlead is a **deterministic CLI that composes an opinionated,
evidence-grade agentic developer-experience stack.** Tagline: "The inner
harness: agent work you can audit." It does four things:

1. **Setup** (`init`, `update`) - install opinionated deps (headroom[proxy],
   opencode, markitdown, semgrep, backlog.md, difit), materialize
   `~/.agents/*` and `~/.config/opencode/*` through a two-step
   user-modification flow, and never silently overwrite managed files.
2. **Verify** (`check`) - run deterministic gates: tests, lint, typecheck,
   semgrep (telemetry off, pinned rulesets), secrets, frontmatter, manifest
   completeness.
3. **Audit** (`doctor`, ledger) - verify the installed stack is healthy, and
   append every command's files-touched, decisions, errors, and exit code to
   an append-only JSONL ledger.
4. **Scaffold** (`scaffold --project`) - turn a repo into an agentic
   workspace: backlog, AGENTS.md, docs/research, ADRs, .gitignore,
   .env.example (never touches .env/.env.local).

| Command | Job |
|---|---|
| `flightlead init` | install opinionated deps, materialize `~/.agents/*` + `~/.config/opencode/*` (two-step user-modification flow), never silently overwrite managed files |
| `flightlead sync` | dev path: repo → live (dogfood loop) |
| `flightlead update` | release-driven dep bump + re-materialize |
| `flightlead check` | deterministic gates: tests, lint, typecheck, semgrep, secrets, frontmatter, manifest completeness |
| `flightlead doctor` | installed? authenticated? config parses? proxy healthy? versions pinned? arm64? |
| `flightlead scaffold --project` | project scaffold: backlog init, AGENTS.md, docs/research, ADRs, .gitignore, .env.example |

Built on opencode + OpenRouter + headroom + markitdown, composing
superpowers for the skills layer. Host composition is a roadmap ladder:
opencode (0.1), pi (0.2), Claude Code (0.3), Codex (0.4). arm64 macOS-only
for v1. Open-weights primary, frontier as targeted escalation. TypeScript
implementation, no bash for logic.

flightlead is **opinionated, not generic.** It encodes one specific philosophy
(YAGNI/SOLID/KISS/DRY + TDD + two-layer QA + security + open-weights) for one
specific workflow (spec -> implement -> verify -> document). It does not try
to be all things to all teams. The philosophy is developed in public
alignment with Addy Osmani's loop-engineering series (addyosmani.com, June
2026 onward); flightlead evolves with the series, with attribution (see
`docs/research/RESEARCH.md` Source 1).

**Product attributes:**
- **Local-first.** No account, no subscription, no cloud dependency. The
  workspace and its state belong to the user. Works offline.
- **Terminal-native.** No GUI app. The stack is opencode, lazygit, git-delta
  - all terminal tools. Designed for engineers who live in the terminal.
- **Human directs and verifies.** The human runs the conductor role:
  one-question-at-a-time dialogue, plan gate, merge gate. The agent acts in
  between. Never the reverse. (Anchored in NORTH_STAR.)
- **Evidence-grade.** Gate receipts, a JSONL run ledger, and a dated research
  corpus. Every claim is checkable. (Anchored in NORTH_STAR.)
- **Phased delivery.** Everything ships in minimal viable slices. No
  big-bang features. (Traces to YAGNI + small ships.)
- **Host-extensible.** Core flightlead composes hosts one at a time across
  the milestone ladder. Host-specific plugin files are CLI-managed artifacts,
  emitted per host.

## Three-layer customization model

Adopted 2026-07-08. See
`docs/research/2026-07-08-plugin-architecture-and-scope-refinement.md`.

flightlead's customization surface is three concentric layers:

| Layer | What lives here | Who controls | User can override? |
|---|---|---|---|
| **1. Fixed (constitution)** | Engineering philosophy (YAGNI, SOLID, KISS, DRY, TDD, maker/checker, security), loop shape (spec, implement, verify, document), open standards (Agent Skills, AGENTS.md), host-composed pattern, evidence-over-claims | flightlead core | No. If user disagrees, flightlead is the wrong tool. |
| **2. Opinionated defaults** | Specific model roster, budget default, agent role prompts, CI pipeline shape, hook configs, which host first | flightlead ships defaults | Yes. `flightlead init` asks and writes them; flags override. User edits after. flightlead never overwrites user modifications. |
| **3. User-owned** | Platform skills (mobile, web, dotnet), custom agents, architecture decisions (MVVM, MVI, modular), user's existing skill libraries | User | Fully. flightlead discovers, imports, wires. Does not author. |

**Principle:** flightlead is opinionated about methodology (Layer 1),
provides sensible defaults for implementation (Layer 2), and is a neutral
compositor for user-owned capabilities (Layer 3).

**Customization ceiling:** Layer 3 is fully open. Layer 2 is editable but
flightlead owns the defaults. Layer 1 is fixed. If a user wants to change
Layer 1 (e.g., "I don't want maker/checker"), they are not the target user.

**Model defaults as living reference:** Specific model IDs are Layer 2
defaults, not Layer 1 philosophy. The tier structure (primary, verifier,
budget, frontier escalation) is Layer 1 (the pattern). Specific model IDs are
Layer 2 (the implementation). Model churn does not block core releases.
Hosts in subscription mode (Claude Code 0.3, Codex 0.4) degrade tiering to
single-provider; the cross-model reviewer roster is an OpenRouter-host
capability.

## What flightlead is NOT

- **Does NOT run the loop.** The composed host (opencode first, then pi,
  Claude Code, Codex) runs the loop. flightlead sets up, gates, and audits.
  Confusing these would expand scope into orchestration-runtime territory,
  which NORTH_STAR forbids.
- **Does NOT build a new agent host.** Hosts are composed, not built.
- **Does NOT dictate architecture.** The user decides (MVVM, MVI, MVC, TSA,
  modular, etc.), recorded in the project AGENTS.md. Skills teach capability
  (language and platform patterns), never architecture. Skills that dictate
  architecture are rejected.
- **Does NOT author platform skills.** Subject-matter experts do. flightlead
  curates, adopts, and composes - it does not reinvent what SMEs wrote.
- **Does NOT reinvent engineering methodology.** superpowers does (TDD, code
  review, verification, planning, debugging). flightlead composes it, with
  attribution.
- **Does NOT ship a hosted/SaaS product in v1.** flightlead is a local CLI.
- **Does NOT silently modify user files.** Managed-file changes go through a
  two-step flow; refusals log and exit non-zero.
- **Does NOT take PRs in v1.** Issues welcome; PRs not accepted (per
  NORTH_STAR, see CONTRIBUTING.md).

## Core user

**v1: the author.** flightlead is built for the author's own workflows
first. The author is both the builder and the client - this is the PMF
validation method. If it doesn't work for the author, it doesn't ship.

**Post-v1: developers who match the author's profile.** Principal/senior
engineers who want disciplined agentic loops with open-weights, are
comfortable on macOS + terminal, and share the shift-left/TDD/YAGNI
philosophy. Not junior developers (too opinionated, too little hand-holding).
Not enterprise (too solo-dev, no SSO/rbac/audit).

**User profile:**
- A principal/senior engineer who wants the agentic loop to just work.
- Does not want to spend time on devex plumbing.
- Shares (or is willing to adopt) the YAGNI/TDD/maker-checker philosophy.
- Lives in the terminal on macOS (arm64).
- Occasionally customizes: drops in own skills, swaps a model, adjusts a
  budget.

## Moat (v2, honest)

**The wedge is the replicable scaffold.** A deterministic TypeScript CLI that
scaffolds AGENTS.md and agent configs is replicable in a weekend. That is
fine - the scaffold is the wedge, not the moat. It gets flightlead installed
on machines. Competitors replicate it; that is the point.

**Durable layer 1: the evidence-grade audit layer.** The defensible layer is
the audit trail, not the scaffold:

- **Run Records + gate receipts.** Every gate emits a receipt; every run
  appends to the JSONL ledger. As of the Sep 2026 scan
  (`docs/research/2026-09-02-oss-agent-harnesses.md`), only keel ships a
  tamper-evident audit layer among scanned harnesses. The rest have zero
  evidence layer.
- **Dated research corpus.** Every decision traces to a dated, cited
  research document. "Why" is auditable, not tribal.
- **Regulatory demand is real.** NIST AI RMF and the EU AI Act create demand
  for exactly this: recorded decisions, verification evidence, accountable
  process. A harness that can answer "who decided this, and what did it
  see?" is the shape regulators are asking for.

**Durable layer 2: the headroom proxy.** No scanned competitor has model
routing plus compression (keel caps spend but doesn't compress; one-punch and
tiller-ai have no proxy at all). This layer needs published honest numbers
(harness-vs-null comparisons, compression quality) to become a moat.
Unpublished, it is a feature.

**Compounding layer: the corpus.** Every run, receipt, and research document
feeds a public evidence base. The corpus compounds; competitors start at
zero.

**NOT moats:** CLI code (replicable in a weekend), opinions (copyable),
process hygiene alone (outrigger's own data demoted heavier gates on
well-specified work - 5.9x cost). The moat is the evidence, not the
discipline that produces it.

**Not a defensible traditional moat.** OSS devex tools do not have traditional
moats. The evidence corpus, the credibility, and the audience ARE the moat.
The Apache-2.0 license + trademark (name/logo © the author, not covered by
the code license) add a legal layer but cannot create a technical moat. This
is stated honestly rather than claimed optimistically.

## PMF thesis

**"I built this for me and it worked so well I open-sourced it."** flightlead
is validated by the author using it on real projects, with the data published.
If the author stops using flightlead, PMF is falsified - there is no fallback
audience.

**Proof projects make the claim falsifiable:**

| Project | Type | What it proves |
|---|---|---|
| flightlead itself | Devex tool (dogfooding) | The tool builds itself - the system loop made literal |
| codewithshabib blog | Content/web (Jekyll, brownfield) | spec->implement->verify->document on a real site |
| Mobile app comparison | Mobile (native iOS / Android / KMP / RN) | Mobile-toolchain support via plugins + comparative telemetry across 4 stacks |

v1.0 proves on the flightlead + blog projects. The mobile proof project
follows after the host ladder completes. The blog is both a proof project and
the demonstration channel: the author publishes the process and the data.
This is the credibility play.

## Dogfooding as a product principle

**flightlead must dogfood itself.** This is not just a milestone - it is a
product principle. From v0.1 onward, flightlead manages its own harness
(`flightlead sync` is the dev path: repo -> live). Features are built using
the flightlead workflow. This is the deepest possible demonstration that the
tool works, and it is the agentic equivalent of a compiler compiling itself.

If flightlead cannot be used to build flightlead, the tool does not work for
its own use case, and the PMF claim is falsified.

## Credibility model

The credibility mechanism is **"built from real use," demonstrated across
project types, with published evidence.** The author publishes:

- The process (how flightlead was used, step by step)
- The data (tokens consumed, cost, retries, approval rates, time saved;
  review time per accepted change, defect escape rate, token cost per
  accepted change, mean time between interventions)
- The receipts (gate receipts, run ledger tails, dated research docs)

This is stronger than a claim. It is falsifiable evidence. A reader can
check whether the proof projects actually shipped and whether the ledger
actually shows what the author claims.

## Why open-source

flightlead is open-source for **credibility and influence, not revenue.**

- **Personal leverage:** flightlead is the author's tool first; OSS is so
  others can self-host and the author gets reputation/portfolio value.
- **Influence:** the author wants flightlead's ideas (evidence-grade agentic
  loops, the conductor pattern, YAGNI/SOLID/KISS/DRY for agents) to shape how
  others build, even if they do not use the tool.

The author is not building a user base to monetize, not taking investment,
not selling a hosted product in v1. The sponsor model is a possible post-v1
revenue path, but not the v1 motivation.

## Direction control

**The author decides where flightlead goes.** This is a product principle,
not just a license choice. It informs:

- License: Apache-2.0 + NOTICE. The flightlead name/logo © the author -
  not covered by the code license (see NOTICE).
- Contribution posture: solo-dev for v1, issues welcome, PRs not accepted
  (per NORTH_STAR).
- Roadmap authority: the author owns ROADMAP. Community input is welcome;
  community direction-setting is not, for v1.
- Plugin authority: official flightlead plugins are authored/curated by the
  author. Community plugins conform to the Agent Skills standard. flightlead
  validates but does not endorse community plugins.

## Quality bar

**flightlead is a real engineering product for real engineers.** This is not a
hobby tool or a demo. It ships with:

- TDD first-class (test-first, no production code without a failing test)
- Two-layer QA (deterministic gates + agentic maker/checker)
- Security woven in (semgrep with telemetry off, secrets scanning,
  sanitization)
- Shift-left testing
- Small ships with clean conventional commits
- Trunk-based development

The quality bar matches what a principal engineer would expect from a
production devex tool. If flightlead does not meet this bar, it does not ship.

## Competitive landscape (Sep 2026 scan)

Direct competitors exist. The claim "no direct competitors" is **false** as
of September 2026 and was retracted. The Sep 2026 OSS agent-harness scan
(full evidence: `docs/research/2026-09-02-oss-agent-harnesses.md`) found
harnesses adjacent to or overlapping flightlead's niche:

| Harness | What it is | Relationship to flightlead |
|---|---|---|
| **one-punch** (`dwijenpatel/one-punch`) | outrigger's successor; same mattpocock-skills DNA, one-decision-at-a-time, contracts compiled from resolved decisions | **Closest sibling.** Same process DNA, different evidence posture. |
| **keel** (`keel-harness/keel`) | out-of-process warden, hash-pinned policy, tamper-evident audit, OS sandbox (Seatbelt/bubblewrap), budget caps; pre-alpha npm 0.1.2 | **Enforcement leader.** Ahead on containment and audit; no model routing, no compression. |
| **outrigger** (`dwijenpatel/outrigger`) | evidence discipline: held-out examiner, null arms, harness-vs-null measurement, run ledger | **Evidence discipline reference.** Its own 5.9x experiment demoted heavier gates - flightlead's "process hygiene is not moat" lesson. |
| **tiller-ai** (`hmSchuller/tiller-ai`) | `npx init` scaffolder for Claude Code/Copilot CLI/OpenCode; managed-files manifest + upgrade | **Distribution reference.** The managed-files manifest pattern flightlead's manifest draws from. Dormant since 2026-03. |
| **microsoft/conductor** | deterministic YAML routing + human-gate dashboard (415★) | **Scale reference** for gated orchestration. |
| **agent-orchestrator (AO)** | desktop orchestrator, 26 harnesses, worktrees (10.9k★) | **Scale reference** for breadth. |

**Where flightlead differs:** none of the scanned harnesses combine model
routing + compression proxy + evidence-grade process records. keel has audit
but no routing; one-punch has process but no evidence layer; tiller-ai has
distribution but is dormant. flightlead's bet: the evidence layer (Run
Records, gate receipts, dated corpus) is the durable differentiator, and the
headroom proxy stack is unique in the set. The full gap analysis lives in
`docs/research/2026-09-02-oss-agent-harnesses.md`.

**Philosophical provenance is distinct from tool references.** Addy Osmani's
loop-engineering series is the intellectual foundation (RESEARCH.md Source
1), not a competitor and not a tool. Attribution is part of the credibility
model (see `ATTRIBUTION.md`).

## How this doc is used

- **NORTH_STAR** references this for the "what is flightlead" framing.
- **ROADMAP** traces milestones to the PMF thesis and proof projects defined
  here.
- **License/contribution decisions** trace to the moat, direction-control,
  and why-OSS sections here.
- A new agent reads NORTH_STAR first (the anchor), then this doc (the product
  strategy), then ROADMAP (the delivery plan).
