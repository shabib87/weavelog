# AGENTS.md — weavelog

**weavelog** is a minimal, open-source developer-experience setup that turns any
project into a self-contained agentic workspace. A pre-defined agent team
runs an end-to-end loop — spec, implement, verify, document — with the human
in the loop only for verification.

<CRITICAL_INSTRUCTION>
@payload/AGENTS.md is a conductor protocol reference for the agents, skills, and
workflows that make up the weavelog agentic workspace.
</CRITICAL_INSTRUCTION>

<IMPORTANT_NOTE>
Read [`docs/NORTH_STAR.md`](docs/NORTH_STAR.md) in case we need to anchor for
a decision. If a task cannot trace back to a non-negotiable there, it is
out of scope.
</IMPORTANT_NOTE>

## Repo layout

```
weavelog/
├── AGENTS.md                  # This file
├── README.md                  # Project overview and quickstart
├── LICENSE                    # MIT
├── CLAUDE.md                  # Claude dispatch stub
├── package.json               # npm package (CLI)
├── tsconfig.json              # TypeScript config
├── biome.json                 # Linter/formatter config
├── src/                       # TypeScript source
│   ├── cli/                   # weavelog CLI (weavelog check, weavelog init)
│   ├── hooks/                 # enforce + verify-gate hooks
│   └── tools/                 # Repo-internal tool scripts (frontmatter-check, task-validate, worktree-create, etc.)
├── tests/                     # Test suite
├── docs/                      # Project documentation
│   ├── NORTH_STAR.md          # The anchor
│   ├── PRODUCT.md             # Product strategy (what it is, moat, PMF)
│   ├── ROADMAP.md             # Product roadmap (version milestones)
│   ├── INDEX.md               # Navigation map — read this first
│   ├── cli.md                 # CLI reference (command behavior)
│   ├── research/RESEARCH.md            # Provenance
│   ├── adr/                   # Decision records (Nygard, indexed, format contract)
│   ├── prd/                   # Ratified milestone briefs (PRD) — cross-referenced with backlog milestones
│   ├── trd/                   # Durable technical design (TRD) + diagrams — changed only via ADRs
│   ├── research/              # Research logs (dated, lab notebooks)
│   ├── AGENTS.md              # Documentation rules (nested, open agents standard)
│   └── archive/               # Frozen provenance: plans, learnings, superpowers, tbd
├── backlog/                   # Tasks (backlog.md CLI) + human-owned milestones (PRD-anchored)
└── .github/workflows/         # CI (Linux, node:test + biome + tsc)
```

## Document hierarchy (what to trust)

| Doc | Authority | Status |
|---|---|---|
| `docs/NORTH_STAR.md` | What we build | Active, authoritative |
| `docs/PRODUCT.md` | Product strategy (what it is, moat, PMF) | Active, authoritative |
| `docs/research/RESEARCH.md` | Why we build it this way | Active, authoritative |
| `docs/adr/` | Architecture decision records (Nygard format, ADR index) | Active, authoritative |
| `docs/ROADMAP.md` | Product roadmap (version milestones) | Active, authoritative |
| `docs/trd/2026-06-28-weavelog-design.md` | Detailed design | Active |
| `docs/research/` | Research logs (dated, lab notebooks) | Active |
| `docs/AGENTS.md` | Documentation rules (how docs are written; ADR format contract, artifact flow) | Active, authoritative |
| `docs/prd/` | Ratified milestone briefs (PRD) — cross-referenced with `backlog/milestones/` | Active, authoritative (authority via ADR-0005) |
| `docs/archive/learnings/` | Session learning logs (July-era, frozen) | Frozen, provenance only |
| `docs/archive/superpowers/` | Implementation plans (superpowers convention) | Frozen, historical |
| `docs/archive/tbd/` | Open blindspot docs (frozen 2026-09-07) | Do not implement against; re-raise live questions as backlog tasks |
| `docs/archive/` | Superseded research | **Do not use.** Provenance only. |

## Shipping discipline

**Done is better than perfect. Incremental releases are better than a big bang.
Stop yak shaving.** These rules govern work on weavelog; they do not change the
instructions shipped to other projects.

- Work on one implementation task at a time. Subagents help finish or verify
  that task; they do not start separate product work.
- Once the human approves scope and the implementation plan, execute. Reopen
  planning only for a specific blocker, a failed promised behavior, or an explicit
  human scope change. Research only the unanswered question blocking that task.
- End each session with a tested increment or a specific blocker recorded in the
  existing task, including the next action. Do not substitute another plan for
  implementation when the next action is already known.
- Keep future ideas in existing backlog tasks without activating them. Do not
  add a skill, abstraction, research document, or planning layer unless it is
  needed for the current accepted outcome or the human explicitly requests it.
- Release when the agreed criteria have evidence and the human approves. Use
  the release, then select the next small improvement. Do not wait for the full
  future command suite or additional hosts.
- "Done" means verified against the agreed scope. It never means skipping TDD,
  independent review, security, backup/recovery, or human approval gates.

For the current release, read the [v0.1.0 brief](docs/prd/2026-09-05-v010-draft-brief.md)
and its [release diagram](docs/prd/release-dependencies.html). The existing
milestone and brief own scope; individual Backlog tasks own progress, exact
dependencies and evidence. TASK-67 owns final installed-package proof and the
human release decision; TASK-63 owns publication enforcement. TASK-45 ends with
the approved release-baseline correction and is not a live progress tracker.

Until the backlog workflow is separately improved, main shows merged progress;
the active task worktree shows live progress. Run the dashboard from the active
worktree during that task. Update its Backlog record and merge the record with
the implementation. No dashboard redesign or task-administration policy change
is required before TASK-3. Keep existing code-isolation and human approval gates.

## Build & test commands

```bash
# Lint and format
biome check
biome format --write

# Typecheck
tsc --noEmit

# Run tests
node --import tsx --test tests/**/*.test.ts

# Run a single test file
node --import tsx --test tests/cli/index.test.ts
```

## MUST NOT

- MUST NOT edit `docs/NORTH_STAR.md` or `docs/research/RESEARCH.md` without explicit
  human approval.
- MUST NOT implement against anything in `docs/archive/` — it is superseded.
- MUST NOT implement against anything in `docs/archive/` (including the frozen
  `tbd/` blindspot docs) — historical provenance only; re-raise live questions
  as backlog tasks.
- MUST NOT commit to git without human review of the diff.
- MUST NOT run package managers (`npm install`, `pip install`, `brew install`)
  without explicit human approval.
- MUST NOT introduce bash for logic — TypeScript is the only implementation
  language.
- MUST NOT add dependencies without explicit human approval.
- MUST NOT target platforms other than macOS for v1.
- MUST NOT commit absolute home-dir paths, personal emails, API keys, or
  machine-specific identifiers. Use `~` for home paths. Run a sanitization
  scan (grep for `/Users/`, personal identifiers, secret patterns) before
  any commit. `weavelog check` will automate this when available.

## Standards

- **Conventional commits:** `feat:`, `fix:`, `chore:`, `docs:`, `style:`,
  `refactor:`, `test:`, `perf:`, `ci:`, `build:` prefixes. Enforced by
  commit-msg hook (pending install) and `weavelog check` (pending build).
- **Agent Skills:** `agentskills.io` — `.pi/skills/<name>/SKILL.md`
- **Tool scripts:** repo-internal tool-script paths resolve only via
  `src/tools/tool-paths.ts`; prefer imports over spawning. Hooks follow the
  project standard; per-harness install adapters own live wiring (opencode → pi → claude → codex).
- **AGENTS.md:** `agents.md` — this file, <200 LOC
- **Agents:** Pi-native `.pi/agents/<name>.md` with YAML frontmatter
- **Workflows:** JSON configs with `schemaVersion` field
- **Session notes:** research goes to `docs/research/` (one dated corpus,
  research schema); end the WHY phase with an explicit decision outcome per
  ADR-003 (small ADR or `Decision: none — research only`). Blog-feed intent
  survives as a `**Lessons:**` block. `docs/learnings/` (now `docs/archive/learnings/`) is frozen
  (`docs/archive/learnings/`). Doc rules live in `docs/AGENTS.md`.
