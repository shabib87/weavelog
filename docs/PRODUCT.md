# Product Definition

> **Authority:** Product strategy. What loopeng IS, who it's for, why it wins.
> **Distinct from:** `NORTH_STAR.md` (what we build - the anchor),
> `ROADMAP.md` (how we deliver - milestones), `research/RESEARCH.md` (why choices).
> This doc answers: what is the product, what is it not, who uses it, what's
> the moat, what's the PMF thesis.

## What loopeng IS

loopeng is a **deterministic CLI that composes an opinionated agentic-loop
developer-experience stack.** It does three things:

1. **Setup** (`init`, `update`) - verify and configure the toolchain (Pi,
   headroom, markitdown, OpenRouter, gh), scaffold the workspace, write the
   AGENTS.md constitution.
2. **Verify** (`check`) - run deterministic gates (tests, lint, typecheck,
   SAST, secrets, sanitization, policy).
3. **Compose** - discover and wire skills/extensions per workspace profile,
   including plugin packages for platform-specific capabilities.

Built on Pi + OpenRouter + headroom + markitdown, composing superpowers for
the skills layer. macOS-only for v1. Open-weights primary, frontier as
targeted escalation. TypeScript implementation, no bash for logic.

loopeng is **opinionated, not generic.** It encodes one specific philosophy
(YAGNI/SOLID/KISS/DRY + TDD + two-layer QA + security + open-weights) for one
specific workflow (spec -> implement -> verify -> document). It does not try
to be all things to all teams. The philosophy is developed in public
alignment with Addy Osmani's loop-engineering series (addyosmani.com, June
2026 onward); loopeng evolves with the series, with attribution (see
`docs/research/RESEARCH.md` Source 1).

**Product attributes:**
- **Local-first.** No account, no subscription, no cloud dependency. The
  workspace and its state belong to the user. Works offline.
- **Terminal-native.** No GUI app. The stack is Pi, lazygit, git-delta - all
  terminal tools. Designed for engineers who live in the terminal.
- **Human-in-the-loop.** The human provides intent and verifies; the agent
  acts in between. Never the reverse. (Anchored in NORTH_STAR.)
- **Phased delivery.** Everything ships in minimal viable slices - evals,
  telemetry, contributions, profiles. No big-bang features. (Traces to YAGNI
  + small ships.)
- **Plugin-extensible.** Core loopeng is platform-agnostic. Platform
  capabilities (mobile, web, dotnet) ship as independently released plugin
  packages. Users install only what they need.

## Three-layer customization model

Adopted 2026-07-08. See
`docs/research/2026-07-08-plugin-architecture-and-scope-refinement.md`.

loopeng's customization surface is three concentric layers:

| Layer | What lives here | Who controls | User can override? |
|---|---|---|---|
| **1. Fixed (constitution)** | Engineering philosophy (YAGNI, SOLID, KISS, DRY, TDD, maker/checker, security), loop shape (spec, implement, verify, document), open standards (Agent Skills, AGENTS.md), Pi as host, open-weights-primary pattern | loopeng core | No. If user disagrees, loopeng is the wrong tool. |
| **2. Opinionated defaults** | Specific model roster, budget default, agent role prompts, CI pipeline shape, hook configs | loopeng ships defaults | Yes. `loopeng init` writes them. User edits after. loopeng never overwrites user modifications. |
| **3. User-owned** | Platform skills (mobile, web, dotnet), custom agents, architecture decisions (MVVM, MVI, modular), user's existing skill libraries | User | Fully. loopeng discovers, imports, wires. Does not author. |

**Principle:** loopeng is opinionated about methodology (Layer 1), provides
sensible defaults for implementation (Layer 2), and is a neutral compositor
for user-owned capabilities (Layer 3). This matches the existing statement
below: "loopeng does NOT author platform skills."

**Customization ceiling:** Layer 3 is fully open. Layer 2 is editable but
loopeng owns the defaults. Layer 1 is fixed. If a user wants to change
Layer 1 (e.g., "I don't want maker/checker"), they are not the target user.

## Plugin and package system

Platform-specific capabilities ship as independently released packages, not
as core loopeng features. This allows incremental release and updates while
keeping the opinionated core orchestration controlled by loopeng.

**Distribution:** Pi-native `pi install` mechanism.
- Official packages: `pi install npm:@loopeng/plugin-mobile-ios`, etc.
- Community packages: any Pi-installable repo conforming to Agent Skills.
- User's own skills: drop into `.agents/skills/` (project-local) or
  `~/.pi/agent/skills/` (global). Pi discovers natively from all four
  standard paths.

**`loopeng plugin add` is a validated wrapper around `pi install`:**
1. Runs `pi install <source>` (Pi handles package installation).
2. Validates installed skills against the Agent Skills standard.
3. Checks `compatibility` frontmatter against the workspace profile.
4. Reports what was installed and what was validated.

**During `loopeng init`, the user is prompted:** "Found N skills in
~/.pi/agent/skills/. Import them into this workspace?" The user chooses
which to import. No forced installs, no symlinks.

**Model defaults as living reference:** The specific model IDs (GLM 5.2,
DeepSeek V4 Pro, etc.) are Layer 2 defaults, not Layer 1 philosophy. loopeng
ships a `models.md` template. `loopeng init --global` copies it to
`~/.pi/agent/models.md`. The user owns the file after. The tier structure
(primary, verifier, budget, frontier escalation) is Layer 1 (the pattern).
Specific model IDs are Layer 2 (the implementation). Model churn does not
block core releases.

## What loopeng is NOT

- **Does NOT run the loop.** Pi runs the loop. loopeng sets up the workspace
  in which Pi runs the loop. Confusing these would expand scope into
  orchestration-runtime territory, which NORTH_STAR forbids.
- **Does NOT dictate architecture.** The user decides (MVVM, MVI, MVC, TSA,
  modular, etc.), recorded in the project AGENTS.md. Skills teach capability
  (language and platform patterns), never architecture. Skills that dictate
  architecture are rejected.
- **Does NOT author platform skills.** Subject-matter experts do (e.g.
  twostraws for SwiftUI, callstackincubator for React Native). loopeng
  curates, adopts, and composes — it does not reinvent what SMEs wrote.
- **Does NOT reinvent engineering methodology.** superpowers does (TDD, code
  review, verification, planning, debugging). loopeng composes superpowers.
- **Does NOT target codex or Claude Code.** loopeng v1 targets Pi + OpenRouter
  on macOS. **Codex is the author's personal backup harness, not a loopeng
  target.** Claude Code is not in scope for v1. Neither is a loopeng
  dependency.
- **Does NOT build a new agent host.** Pi is the host.
- **Does NOT ship hosted/SaaS product in v1.** loopeng is a local CLI. The
  license choice (pending decision) accounts for a possible future hosted
  surface, but v1 is local-only.
- **Does NOT bundle platform-specific skills into core.** Mobile, web, and
  other platform capabilities ship as independently released plugins. Core
  loopeng is platform-agnostic.

## Core user

**v1: the author.** loopeng is built for the author's own workflows first.
The author is both the builder and the client - this is the PMF validation
method. If it doesn't work for the author, it doesn't ship.

**Post-v1: developers who match the author's profile.** Principal/senior
engineers who want disciplined agentic loops with open-weights, are
comfortable on macOS + terminal, and share the shift-left/TDD/YAGNI
philosophy. Not junior developers (too opinionated, too little hand-holding).
Not enterprise (too solo-dev, no SSO/rbac/audit). This matches the audience
shape of comparable solo-OSS devex tools.

**User profile sharpened (2026-07-08):**
- A principal/senior engineer who wants the agentic loop to just work.
- Does not want to spend time on devex plumbing.
- Shares (or is willing to adopt) the YAGNI/TDD/maker-checker philosophy.
- Lives in the terminal on macOS.
- May have platform-specific needs (mobile, web, etc.) but does not want
  those forced on them.
- Occasionally customizes: drops in own skills, swaps a model, adjusts a
  budget.

## Moat (honest)

**For v1, the moat is not code.** A deterministic TypeScript CLI that
scaffolds AGENTS.md and `.pi/` is replicable in a weekend. Pi, headroom,
markitdown, superpowers are all dependencies, freely available.

**The actual moat is the opinionated integration plus builder credibility:**
- This exact stack (Pi + OpenRouter + headroom + markitdown + superpowers)
  assembled with this exact philosophy (YAGNI/SOLID/KISS/DRY + TDD +
  two-layer QA + security + open-weights-primary).
- Nobody has assembled this exact stack with this exact philosophy.
- The assembly is validated by real proof projects with published
  telemetry, not by claims.

**The moat stays in core.** The three-layer model reinforces this: Layer 1
(the philosophy and loop shape) is the moat. Layer 2 (defaults) and Layer 3
(user-owned capabilities) are interchangeable. Plugins do not dilute the
moat because the moat is the opinionated integration, not the platform
skills.

**Not a defensible long-term moat.** OSS devex tools do not have traditional
moats. The credibility, audience, and patterns ARE the moat. The license
decision (pending) may add a legal layer (trademark, copyleft) but cannot
create a technical moat. This is stated honestly rather than claimed
optimistically.

## PMF thesis

**"I built this for me and it worked so well I open-sourced it."** loopeng is
validated by the author using it on real projects, with the data published.
If the author stops using loopeng, PMF is falsified - there is no fallback
audience.

**Proof projects make the claim falsifiable:**

| Project | Type | What it proves |
|---|---|---|
| loopeng itself | Devex tool (dogfooding) | The tool builds itself - the system loop made literal |
| codewithshabib blog | Content/web (Jekyll, brownfield) | spec->implement->verify->document on a real site |
| Mobile app comparison | Mobile (native iOS / Android / KMP / RN) | Mobile-toolchain support via plugins + comparative telemetry across 4 stacks |

v1.0 proves on two projects (loopeng + blog). The mobile proof project
follows at v1.2 after plugin packages ship at v1.1. The blog is both a
proof project and the demonstration channel: the author publishes the
process and the data. This is the credibility play.

## Dogfooding as a product principle

**loopeng must dogfood itself.** This is not just a milestone (v0.4) - it is
a product principle. From v0.4 onward, loopeng features are built using
loopeng. This is the deepest possible demonstration that the tool works, and
it is the agentic equivalent of a compiler compiling itself.

If loopeng cannot be used to build loopeng, the tool does not work for its
own use case, and the PMF claim is falsified. This principle is
non-negotiable from v0.4 onward.

## Credibility model

The credibility mechanism is **"built from real use," demonstrated across
project types, with published telemetry.** The author publishes:

- The process (how loopeng was used, step by step)
- The data (tokens consumed, cost, retries, approval rates, time saved)
- The output (the shipped feature, site update, or mobile app)

This is stronger than a claim. It is falsifiable evidence. A reader can
check whether the proof projects actually shipped and whether the telemetry
actually shows what the author claims.

## Why open-source

loopeng is open-source for **credibility and influence, not revenue.** The
author's outcomes (from the PMF interview):

- **Personal leverage (outcome a):** loopeng is the author's tool first; OSS
  is so others can self-host and the author gets reputation/portfolio value.
- **Influence (outcome c):** the author wants loopeng's ideas (loop
  engineering on Pi+OpenRouter, the agent-team pattern, YAGNI/SOLID/KISS/DRY
  for agents) to shape how others build, even if they do not use the tool.

The author is not building a user base to monetize, not taking investment,
not selling a hosted product in v1. The sponsor model (like comparable
tools) is a possible post-v1 revenue path, but not the v1 motivation.

## Direction control

**The author decides where loopeng goes.** This is a product principle, not
just a license choice. It informs:

- License decision (pending): trademark policy to keep name/logo under
  author control, regardless of code license.
- Contribution posture: solo-dev for v1, issues welcome, PRs not yet
  accepted (per NORTH_STAR).
- Roadmap authority: the author owns ROADMAP. Community input is welcome;
  community direction-setting is not, for v1.
- Plugin authority: official loopeng plugins are authored/curated by the
  author. Community plugins conform to the Agent Skills standard. loopeng
  validates but does not endorse community plugins.

## Quality bar

**loopeng is a real engineering product for real engineers.** This is not a
hobby tool or a demo. It ships with:

- TDD first-class (test-first, no production code without a failing test)
- Two-layer QA (deterministic gates + agentic maker/checker)
- Security woven in (SAST in CI, secrets scanning, sanitization)
- Shift-left testing
- Small ships with clean conventional commits
- Trunk-based development

The quality bar matches what a principal engineer would expect from a
production devex tool. If loopeng does not meet this bar, it does not ship.

## Reference landscape (non-competing)

loopeng has no direct competitors in its exact niche (Pi-native,
open-weights-primary, agentic-loop devex CLI). Comparable tools are
**references for approach, not competitors to displace:**

| Reference | What it is | What loopeng learns from it | Non-competing because |
|---|---|---|---|
| Tolaria (`refactoringhq/tolaria`) | Solo-OSS markdown knowledge base (AGPL-3.0, 18k stars) | The "built from real use" credibility model; license+trademark approach; sponsor-not-revenue model | Different domain (knowledge base vs agentic-loop devex). loopeng is NOT a Tolaria clone, fork, or reimplementation. |

**Tolaria is a business use-case analysis reference only.** It demonstrates
that a solo-OSS devex tool can build credibility via "built from real use"
plus published evidence. loopeng applies that *approach* to a different
domain. loopeng is not creating Tolaria, not competing with Tolaria, and not
derived from Tolaria.

## How this doc is used

- **NORTH_STAR** references this for the "what is loopeng" framing.
- **ROADMAP** traces milestones to the PMF thesis and proof projects defined
  here.
- **License/telemetry/contribution decisions** (pending) trace to the moat,
  direction-control, and why-OSS sections here.
- A new agent reads NORTH_STAR first (the anchor), then this doc (the product
  strategy), then ROADMAP (the delivery plan).
