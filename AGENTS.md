# AGENTS.md — loopeng

loopeng is a minimal, open-source developer-experience setup that turns any
project into a self-contained agentic workspace. A pre-defined agent team
runs an end-to-end loop — spec, implement, verify, document — with the human
in the loop only for verification.

Read [`docs/NORTH_STAR.md`](docs/NORTH_STAR.md) first. It is the anchor for
every decision. If a task cannot trace back to a non-negotiable there, it is
out of scope for v1 or requires amending the North Star first.

## Repo layout

```
loopeng/
├── AGENTS.md                  # This file
├── README.md                  # Project overview and quickstart
├── LICENSE                    # MIT
├── CLAUDE.md                  # Claude dispatch stub
├── package.json               # npm package (CLI + extension)
├── tsconfig.json              # TypeScript config
├── biome.json                 # Linter/formatter config
├── src/                       # TypeScript source
│   ├── cli/                   # loopeng CLI (loopeng check, loopeng init)
│   └── extension/             # @loopeng/pi-loopeng (Pi extension)
├── tests/                     # Test suite
├── docs/                      # Project documentation
│   ├── NORTH_STAR.md          # The anchor
│   ├── PRODUCT.md             # Product strategy (what it is, moat, PMF)
│   ├── RESEARCH.md            # Provenance
│   ├── adr/                   # Architecture decision records (numbered)
│   ├── PROGRESS.md            # Phase tracker (where we are)
│   ├── NEXT_SESSION.md        # Narrative handoff
│   ├── specs/                 # Detailed design specs
│   ├── research/              # Research logs (dated, lab notebooks)
│   ├── learnings/             # Session learning logs (dated, for blog)
│   ├── superpowers/plans/     # Implementation plans (superpowers convention)
│   ├── tbd/                   # Open questions
│   └── archive/               # Superseded — do not use
└── .github/workflows/         # CI (Linux, node:test + biome + tsc)
```

## Document hierarchy (what to trust)

| Doc | Authority | Status |
|---|---|---|
| `docs/NORTH_STAR.md` | What we build | Active, authoritative |
| `docs/PRODUCT.md` | Product strategy (what it is, moat, PMF) | Active, authoritative |
| `docs/RESEARCH.md` | Why we build it this way | Active, authoritative |
| `docs/adr/` | Architecture decision records (numbered) | Active, authoritative |
| `docs/PROGRESS.md` | Phase tracker (where we are) | Active, authoritative |
| `docs/ROADMAP.md` | Product roadmap (version milestones) | Active, authoritative |
| `docs/NEXT_SESSION.md` | Narrative handoff | Active |
| `docs/specs/2026-06-28-loopeng-design.md` | Detailed design | Active |
| `docs/research/` | Research logs (dated, lab notebooks) | Active |
| `docs/learnings/` | Session learning logs (dated, for blog) | Active |
| `docs/superpowers/plans/` | Implementation plans (superpowers convention) | Active |
| `docs/tbd/` | Open questions | Do not implement against |
| `docs/archive/` | Superseded research | **Do not use.** Provenance only. |

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
node --import tsx --test tests/cli/check.test.ts
```

## MUST NOT

- MUST NOT edit `docs/NORTH_STAR.md` or `docs/RESEARCH.md` without explicit
  human approval.
- MUST NOT implement against anything in `docs/archive/` — it is superseded.
- MUST NOT implement against anything in `docs/tbd/` — it is unresolved.
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
  any commit. `loopeng check` will automate this when available.

## Standards

- **Conventional commits:** `feat:`, `fix:`, `chore:`, `docs:`, `style:`,
  `refactor:`, `test:`, `perf:`, `ci:`, `build:` prefixes. Enforced by
  commit-msg hook (pending install) and `loopeng check` (pending build).
- **Agent Skills:** `agentskills.io` — `.pi/skills/<name>/SKILL.md`
- **AGENTS.md:** `agents.md` — this file, <200 LOC
- **Agents:** Pi-native `.pi/agents/<name>.md` with YAML frontmatter
- **Workflows:** JSON configs with `schemaVersion` field
- **Session learnings:** every working session produces a dated learning
  log at `docs/learnings/YYYY-MM-DD-<topic>.md` (findings, decisions,
  corrections, blog candidates). Raw material for future blog posts.