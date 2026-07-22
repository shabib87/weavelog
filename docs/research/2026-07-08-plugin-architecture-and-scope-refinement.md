# Plugin Architecture and Scope Refinement

> **Date:** 2026-07-08
> **Status:** Active. Decisions adopted into ROADMAP, PRODUCT, ADR.
> **Session:** scope-refinement discussion (Codex, GLM 5.2)
> **Cross-ref:** `docs/PRODUCT.md`, `docs/ROADMAP.md`,
> `docs/adr/0001-loopeng-architecture-decisions.md`, `docs/NORTH_STAR.md`

## Context

User identified that bundling mobile-stack-heavy skills at launch is
unnecessary and complicates the core. The core moat (opinionated integration
plus builder credibility) stays the same. The question: how to refine the
roadmap so loopeng stays generic and simple enough for `loopeng init` to
produce a working agentic workspace with the author's engineering philosophy,
while allowing platform-specific capabilities (mobile, web, dotnet) to be
added as independently released packages.

## Decisions

### 1. Three-layer customization model

loopeng's customization surface is three concentric layers:

| Layer | What lives here | Who controls it | User can override? |
|---|---|---|---|
| **1. Fixed (constitution)** | Engineering philosophy (YAGNI, SOLID, KISS, DRY, TDD, maker/checker, security), loop shape (spec, implement, verify, document), open standards (Agent Skills, AGENTS.md), Pi as host, open-weights-primary pattern | loopeng core | No. If user disagrees, loopeng is the wrong tool. |
| **2. Opinionated defaults** | Specific model roster, budget default, agent role prompts, CI pipeline shape, hook configs | loopeng ships defaults | Yes. `loopeng init` writes them. User edits after. loopeng never overwrites user modifications. |
| **3. User-owned** | Platform skills (mobile, web, dotnet), custom agents, architecture decisions (MVVM, MVI, modular), user's existing skill libraries | User | Fully. loopeng discovers, imports, wires. Does not author. |

**Principle:** loopeng is opinionated about methodology (Layer 1), provides
sensible defaults for implementation (Layer 2), and is a neutral compositor
for user-owned capabilities (Layer 3). This matches the existing PRODUCT.md
statement: "loopeng does NOT author platform skills."

### 2. Plugin/package architecture

Platform-specific capabilities ship as independently released packages, not
as core loopeng features.

**Distribution:** Pi-native `pi install` mechanism.

- Official packages: `pi install npm:@loopeng/plugin-mobile-ios`,
  `pi install npm:@loopeng/plugin-mobile-android`, etc.
- Community packages: any Pi-installable repo that conforms to Agent Skills
  standard.
- User's own skills: drop into `.agents/skills/` (project-local) or
  `~/.pi/agent/skills/` (global). Pi discovers natively from all four
  paths (`~/.pi/agent/skills/`, `~/.agents/skills/`, `.pi/skills/`,
  `.agents/skills/`).

**`loopeng plugin add` is a validated wrapper, not a replacement for
`pi install`:**

1. Runs `pi install <source>` (Pi handles package installation)
2. Validates installed skills against Agent Skills standard (required
   frontmatter: `name`, `description`; optional: `license`,
   `compatibility`, `metadata`, `allowed-tools`)
3. Checks `compatibility` frontmatter against workspace profile (e.g.,
   `mobile-native-ios` skill declaring `requires Xcode 16+` gets verified
   against the machine)
4. Reports what was installed and what was validated

**No symlinks.** Pi discovers skills from multiple native paths. No
indirection, no fragile path assumptions.

**Validation logic is shared.** `loopeng plugin add` and `loopeng check`
use the same skill-validation code (DRY).

### 3. Model defaults as living reference

The specific model IDs (GLM 5.2, DeepSeek V4 Pro, Kimi K2.7, etc.) are
Layer 2 defaults, not Layer 1 philosophy. They change every few months.

- loopeng ships a `models.md` template.
- `loopeng init --global` copies it to `~/.pi/agent/models.md`.
- User owns the file after. loopeng never overwrites it.
- The tier structure (primary, verifier, budget, frontier escalation) is
  Layer 1 (the pattern). Specific model IDs are Layer 2 (the implementation).
- Model churn does not block core releases. `~/.pi/agent/models.md` updates
  independently of loopeng core.

### 4. User profile sharpened

- Principal/senior engineer who wants the agentic loop to just work.
- Does not want to spend time on devex plumbing.
- Shares (or is willing to adopt) the YAGNI/TDD/maker-checker philosophy.
- Lives in the terminal on macOS.
- May have platform-specific needs but does not want those forced on them.
- Occasionally customizes: drops in own skills, swaps a model, adjusts a
  budget.

**Customization ceiling:** Layer 3 fully open. Layer 2 editable but loopeng
owns defaults. Layer 1 fixed. If a user wants to change Layer 1, they are
not the target user.

### 5. Mobile moved out of core

**Before:** Mobile app comparison was a v1.0 proof project. Mobile
toolchain support was a core NORTH_STAR non-negotiable.

**After:** Mobile capabilities ship as independently released plugin
packages. The mobile proof project moves to v1.2. Core v1.0 proves on
two proof projects (loopeng itself + blog).

**Why this is a correctness fix, not a scope reduction:** PRODUCT.md already
states "loopeng does NOT author platform skills." Bundling mobile skills
into core contradicted that principle. The plugin model makes the product
consistent with its own stated strategy.

## Verified against

- **Pi package system** (`pi.dev` docs, `github.com/earendil-works/pi`):
  `pi install npm:` and `pi install git:` are official. Packages declare
  resources via `pi` key in `package.json`. Auto-discovery from
  conventional directories. Package filtering via settings.
- **Agent Skills standard** (`agentskills.io/specification`):
  Required frontmatter: `name` (max 64 chars, lowercase), `description`
  (max 1024 chars). Optional: `license`, `compatibility`, `metadata`,
  `allowed-tools`. Progressive disclosure. Official validation tool:
  `skills-ref validate`. Adopted by Claude Code, OpenAI, GitHub Copilot,
  Google Gemini CLI, JetBrains, Cursor, Cline, Goose, Windsurf (as of
  April 2026 compatibility matrix).

## NORTH_STAR amendment proposed

Current NORTH_STAR non-negotiable:
"loopeng-target workspaces support mobile toolchains (Swift/KMP/Kotlin)
without Docker."

**Proposed amendment:**
"loopeng workspaces support platform toolchains (mobile, web, etc.) via
plugin packages, not core. Core loopeng is platform-agnostic. Platform
capabilities ship as independently released plugins conforming to the
Agent Skills standard."

**Status:** Requires explicit user approval per MUST NOT rule on
NORTH_STAR.md edits.

## Open items

- **Yak shaving / local tracking:** User parked this topic. Needs further
  thinking. No design or doc changes until user picks it back up. Research
  findings preserved in this doc's sibling learning log (to be created when
  the topic is resumed).
- **Plugin compatibility verification depth:** How strict should
  `compatibility` frontmatter checking be? Hard fail vs. warning.
  Recommendation: warning in v0.2, hard fail option in v0.3.
- **Plugin versioning:** Should plugins declare a minimum loopeng version?
  Recommendation: yes, via `compatibility` frontmatter `minLoopengVersion`
  field. Validated by `loopeng plugin add`.
