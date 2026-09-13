# Product Definition

> **Authority:** Product strategy. What **weavelog** IS, who it's for, why it wins.
> **Distinct from:** [NORTH_STAR.md](./NORTH_STAR.md) (what we build - the anchor),
> [ROADMAP.md](./ROADMAP.md) (how we deliver - milestones), [research/](./research/) (why choices).
> This doc answers: what is the product, what is it not, who uses it, what's
> the moat, what's the PMF thesis.

## What **weavelog** IS

**weavelog** is a **deterministic CLI** tool that composes an opinionated,
evidence-grade agentic developer-experience stack. 

Tagline: "The inner harness: agent work you can audit."

It does four things:

1. **Setup** (`init`, `update`) — verify required external tools through pinned
   instructions, then materialize shared skills and OpenCode-native
   configuration from declared package inputs. The canonical target contract
   is [the CLI vision](./trd/cli-vision.md). This is the target contract;
   TASK-29, TASK-30, TASK-66, and TASK-67 own implementation and proof. It
   allows a user-confirmed `--force` replacement with a protected backup. It
   does not merge or adopt an existing agent setup, or install external tools.
2. **Verify** (`check`) - run deterministic gates: tests, lint, typecheck, security, front-matter, manifest
   completeness.
3. **Audit** (`doctor`, ledger) - verify the installed stack is healthy, and
   append every command's files-touched, decisions, errors, and exit code to
   an append-only JSONL ledger.
4. **Scaffold** (`scaffold --project`) — create a project-owned conductor-era
   `AGENTS.md`, Backlog, `.env.example`, and neutral README homes for research,
   ADR, PRD, and TRD. Weavelog does not manage `.gitignore`, `.env`,
   `.env.local`, or `.git`.


> `weavelog` is **strongly opinionated**. It is not a generic agent host. The is that the use (builder profile like the author) does not have to think or spend time on DXP plumbing, focus on **building the product**.
>
> Hence the the strong opinions control agent tools like skills, subagents, model selection as well as the core agent settings, e.g. `~/.config/opencode/opencode.jsonc`.


### First iteration (v0.1.0)

Built on `opencode` + `OpenRouter` + `headroom` + `markitdown`, composing by adapting OSS skills and the author's own skills. 

#### Host composition is a roadmap ladder:

- opencode (0.1.0+), 
- pi (0.2.0+), 
- hybrid (0.2.1+),
- Codex (0.3.0+),
- Claude Code (0.4.0+).

Subscription routing is optional. It may limit cross-family reviewer choice, but
it does not remove the fresh-context maker/checker requirement; ADR-007 owns that
policy.

**weavelog* is **opinionated, not generic.** 

It encodes one specific philosophy:

- (YAGNI/SOLID/KISS/DRY + TDD + two-layer QA + security + open-weights) for one
specific workflow 
- (spec -> implement -> verify -> document). 

It does not try to be all things to all teams. The philosophy is developed in public
alignment with Addy Osmani's [blog](https://addyosmani.com/blog/) on Loop Engineering and Agentic SDLC.

Weavelog is greenfield-first. It installs its declared setup as a whole and
does not merge or adopt existing agent rules or host configuration. If
preflight finds a conflict, setup refuses by default. A user may choose
`--force` for an eligible whole-file replacement after confirmation; the CLI
preserves an opaque backup and records the action. Users remain responsible
for custom combinations outside the supported profile.

## What weavelog is NOT

- **Does NOT build a new agent host.** Hosts are composed, not built.
- **Does NOT dictate architecture.** The user decides the architecture, language and specificities of the project, **weavelog** provides the agentic inner harness.
- **Does NOT author platform skills.** Subject-matter experts and your project do. weavelog
  curates, adopts, and composes Agentic primitives for the inner harness.

## Core user

**The Author.** weavelog is built for the author's own workflows
first. The author is both the builder and the client - this is the PMF
validation method. If it doesn't work for the author, it doesn't ship.

**Builders who match the author's profile.** Engineers / Builders who want disciplined agentic loops, are comfortable on macOS + terminal, and share the shift-left/TDD/YAGNI philosophy.

**User profile:**
- A builder who wants the agentic loop to just work.
- Does not want to spend time on devex (DXP) plumbing.
- Shares (or is willing to adopt) the YAGNI/TDD/maker-checker philosophy.
- Comfortable in the terminal on macOS.
- Occasionally customizes: drops in own skills, swaps a model, adjusts a few settings.

## Dogfooding as a product principle

**weavelog must dogfood itself.** This is not just a milestone - it is a
product principle. From v0.1 onward, weavelog manages its own harness
(`weavelog sync` is the dev path: repo -> live). Features are built using
the weavelog workflow. This is the deepest possible demonstration that the
tool works, and it is the agentic equivalent of a compiler compiling itself.

If weavelog cannot be used to build weavelog, the tool does not work for
its own use case, and the PMF claim is falsified.

## Quality bar

**weavelog is an agentic DXP tool for Agentic SDLC.** It ships with:

- TDD first-class (test-first, no production code without a failing test)
- Multi-layer QA (deterministic gates + agentic maker/checker)
- Security woven in (semgrep, secrets scanning,
  sanitization)
- Shift-left testing
- Small ships with clean conventional commits
- Trunk-based development
