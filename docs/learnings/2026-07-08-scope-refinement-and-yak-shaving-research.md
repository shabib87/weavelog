# Scope Refinement and Yak Shaving Research

> **Date:** 2026-07-08
> **Session:** scope-refinement discussion (Codex, GLM 5.2)
> **Related:** `docs/research/2026-07-08-plugin-architecture-and-scope-refinement.md`,
> `docs/PRODUCT.md`, `docs/ROADMAP.md`, `docs/adr/0001-loopeng-architecture-decisions.md`,
> `docs/NORTH_STAR.md`

## Scope refinement (adopted, NORTH_STAR amended)

User identified that bundling mobile-stack-heavy skills at launch is
unnecessary and complicates the core. The core moat (opinionated integration
plus builder credibility) stays the same. The refinement: mobile and other
platform capabilities ship as independently released plugin packages, not
core features.

**Key decisions adopted:**
1. Three-layer customization model (Fixed / Opinionated defaults /
   User-owned).
2. Plugin/package architecture using Pi-native `pi install`.
3. `loopeng plugin add` as validated wrapper around `pi install`.
4. Model defaults as living reference (Layer 2, not Layer 1).
5. Mobile moved to v1.1 (plugins) and v1.2 (proof project).
6. Core v1.0 proves on two proof projects (loopeng + blog).

**NORTH_STAR amendment applied (user-approved 2026-07-08).** Line 18
changed from "loopeng-target workspaces support mobile toolchains
(Swift/KMP/Kotlin) without Docker" to "loopeng workspaces support platform
toolchains (mobile, web, etc.) via plugin packages, not core. Core loopeng
is platform-agnostic."

**Docs updated:** NORTH_STAR.md, ROADMAP.md, PRODUCT.md, ADR 0001 (new
section 2.14, amendments to 2.3 and 2.12), PROGRESS.md. Research log at
`docs/research/2026-07-08-plugin-architecture-and-scope-refinement.md`.

## Key learnings

### 1. Correctness fix, not scope reduction

Removing mobile from core was not a scope reduction. It was a correctness
fix. PRODUCT.md already stated "loopeng does NOT author platform skills."
Bundling mobile skills into core contradicted that principle. The plugin
model makes the product consistent with its own stated strategy. When a
product's scope contradicts its own stated principles, the scope is wrong,
not the principles.

### 2. Separating pattern from implementation (model tiers vs model IDs)

The model allocation has two layers that should not be conflated:
- The tier structure (primary, verifier, budget, frontier escalation) is
  Layer 1 philosophy. It encodes the open-weights-primary, frontier-as-
  escalation pattern. This does not change.
- The specific model IDs (GLM 5.2, DeepSeek V4 Pro, Kimi K2.7, etc.) are
  Layer 2 defaults. These change every few months as models evolve.

By separating them, model churn no longer blocks core releases. The
`~/.pi/agent/models.md` file updates independently of loopeng core. The
user owns it after `loopeng init --global` copies the template. This is the
same principle as separating interface from implementation in SOLID.

### 3. Opinionated defaults, not dictatorship

The three-layer model clarified a principle that was implicit before:
loopeng is opinionated about methodology (Layer 1, fixed), provides sensible
defaults for implementation (Layer 2, editable), and is a neutral compositor
for user-owned capabilities (Layer 3, fully open). This is "opinionated
defaults, not dictatorship" - the same posture as Prettier (opinionated
defaults, limited config surface) or Rails (convention over configuration).
The moat is the opinion, not the configurability.

### 4. Customization ceiling defined by Layer 1

The user asked "to what level do I allow customization?" The answer is
Layer 3 is fully open, Layer 2 is editable but loopeng owns defaults, and
Layer 1 is fixed. If a user wants to change Layer 1 (e.g., "I don't want
maker/checker"), they are not the target user. This is the filter: the
philosophy IS the product. Users who disagree with the philosophy self-
select out. This is a feature, not a bug.

### 5. Pi-native distribution avoids reinvention

Choosing Pi-native `pi install` over a custom plugin package manager is a
KISS and DRY decision. Pi already has a package system with auto-discovery,
settings-based filtering, and validation. Wrapping it with loopeng's
opinionated validation layer (Agent Skills conformance, compatibility
checking) adds value without reinventing package management. The validation
logic is shared between `loopeng plugin add` and `loopeng check` (DRY).

### 6. No symlinks - Pi discovers natively

The instinct to use symlinks for skill import was wrong. Pi already
discovers skills from four standard paths (`~/.pi/agent/skills/`,
`~/.agents/skills/`, `.pi/skills/`, `.agents/skills/`). Adding symlink
indirection would add fragility for no benefit. The user puts skills where
Pi expects them, and loopeng surfaces what was found. Simpler is better.

## Yak shaving / local tracking (parked by user)

User wants to track: user usage patterns, yak shaving, user topic drift,
agent drift, and suggest improvements or guide. Local-only, no server
telemetry. User explicitly said "I have not thought it through." No design
or doc changes made for this. Research findings preserved below for future
pickup.

### Tools and patterns researched

1. **KEEL** (`vzwjustin/KEEL`): Real-time drift detection. Signal types:
   plan drift (files outside active step), goal drift (work does not match
   declared scope), scope expansion, cluster detection. Pre-edit hard stop
   blocking writes outside plan step. Pushes drift warnings into agent
   status line during session.

2. **ScopeGuard** (`mksimple-blip/scope-guard_demo`): Intent-to-change
   alignment. Detects scope expansion, structural drift, propagation drift,
   signature drift, dependency drift. Severity model: None/Low/Medium/High/
   Critical mapped to Allow/Warning/Approval/Block.

3. **AgentScope** (`abdouloued/agentscopev2`): Layered approach.
   Deterministic policy engine first (path rules, file counts, line counts,
   protected files), then opt-in LLM judge (can only make results more
   cautious, never less). Git baseline diffing. Drift forensics walks
   commits and marks first violation.

4. **agent-loop-guard** (`ArkNill/agent-loop-guard`): Behavioral loop
   detection via sliding window. Four strategies: exact repeat, fuzzy
   repeat (Jaccard + edit distance), cycle detection (A to B to C to A),
   output stagnation. Escalating actions: CONTINUE, WARN, STOP, ESCALATE.

5. **Scope Lock** (`Ktulue/scope-lock`): Claude Code skill generating
   SCOPE.md boundary contract from plan, flags deviations during execution.
   Logs every decision as Permit/Decline/Defer.

6. **AI Secured by Design DEL-03**: Formal delegation depth limits per
   risk tier, circular delegation detection, chain identifier tracking.
   Depth visible in logs but not exposed to agent context window (to
   prevent manipulation).

### What loopeng already captures

From the existing two-axis telemetry design:
- **Session-quality axis** (`.pi/logs/<id>.stats.json`): `topicSwitches`,
  `dominantTypeRatio`, `turnsBucket`, `costPerTurnTrend`.
- **Workflow axis** (`.loopeng/metrics.jsonl`): `step`, `model`, `outcome`,
  `retries`, `duration`, `human_approved`.

These are observational (post-hoc), not preventive. They tell you what
happened after the fact. They do not define scope boundaries or enforce
them.

### What is missing

| Signal | What it catches |
|---|---|
| Scope boundary declaration | What files/dirs are in scope for this step |
| Plan-to-reality diff | Agent touched files outside declared scope |
| Task chain depth | Sub-agent spawned too many levels deep |
| Behavioral loop detection | Agent repeating same tool calls |
| Output stagnation | Tool returns same output repeatedly |
| Files-touched ratio | Scope drift score (touched vs planned) |
| Time-per-step trend | Disproportionate time on one step |

### Proposed (not agreed, parked)

Three-layer model:
- Layer 1: Deterministic scope gate in `loopeng check` (verify gate). Spec
  declares expected scope, `git diff --name-only` checks actual vs declared
  after step.
- Layer 2: Behavioral loop detection in loopeng Pi extension (real-time via
  `tool_call` hook). Sliding window, four patterns, escalating actions.
- Layer 3: Enhanced session-quality telemetry signals (`taskChainDepth`,
  `scopeDriftScore`, `timePerStepTrend`, `loopDetected`).

Meta problem: human yak shaving (user self-identified). Guardrails differ
from agent yak shaving. Possible: plan step must trace to NORTH_STAR/
ROADMAP, session stats show scope drift score, `loopeng stats` includes a
"yak shaving index."

### Decision

User parked this topic. Do not implement or design further until user picks
it back up.

## Blog candidates

- "The Plugin Boundary: Why Core Should Stay Core" - the decision to move
  mobile skills out of core loopeng into plugins, and how it made the
  product more consistent with its own stated philosophy.
- "Three Layers of Opinion" - the Fixed/Defaults/User-owned model and how it
  defines the customization ceiling for an opinionated tool.
- "Pattern vs Implementation: Why Model IDs Are Not Philosophy" - the
  separation of tier structure (Layer 1) from specific model IDs (Layer 2)
  and how it decouples model churn from core releases.
- "Opinionated Defaults, Not Dictatorship" - the customization posture and
  why the philosophy IS the product, not a configurable option.
- "Yak Shaving Detection in Agentic Loops" - survey of the landscape (KEEL,
  ScopeGuard, AgentScope, agent-loop-guard, Scope Lock) and what loopeng
  could adopt (to be written when the topic is resumed).
