# Agent Instructions: Build harness-init

> **Archived.** This was a task brief from the original idea session. It is
> superseded by the `weavelog` design. Preserved for provenance only — do not
> implement against this. See `docs/archive/README.md` and `docs/NORTH_STAR.md`.

## Mission

Implement `harness-init` as a bash CLI tool that scaffolds self-contained
agentic workspaces. Full architecture spec is at `docs/adr.md`. Read it
before writing a single line. The acceptance criteria are in
`docs/tasks/HARNESS-001.md`. Work that task to completion.

## Spec Authority

`docs/adr.md` is the single source of truth for:
- Directory structure and file names (Section 5)
- Role model IDs and temperatures (Section 6)
- Bootstrap sequence this script must produce (Section 7)
- MVP smoke test target used to verify your output (Section 11)

If anything in these instructions conflicts with the ADR, the ADR wins.

## Hard Boundaries

MUST NOT read, write, or execute any path outside `./`
MUST NOT modify any existing `.env` file
MUST NOT run `npm install`, `pip install`, or any package manager
MUST NOT commit to git — present diffs for human review via `/diff`
MUST NOT create or modify `~/.pi/` or any path outside this workspace
MUST NOT access the network

## Implementation Rules

- `harness-init` is a bash script. Zero runtime dependencies beyond
  stock macOS bash, `git`, and `mkdir`. No Node, no Python.
- The `$HARNESS_ROOT` guard is a standalone bash function written to
  `.harness/guard.sh`. It is not a Pi extension. It must reject any
  path that does not resolve under `$HARNESS_ROOT` and exit non-zero.
- Skill files in `.harness/skills/` are stubs in v1: correct filename,
  single `# TODO` body. No remote fetching.
- `swarmforge.conf` is a placeholder template in v1: correct keys from
  ADR Section 6, empty values where the user must fill in.
- Role files in `.harness/roles/` contain model ID and temperature only,
  sourced directly from ADR Section 6. Nothing else in v1.
- `AGENTS.md` written into each workspace carries the MUST NOT rules
  from ADR Section 5 verbatim.
- `CLAUDE.md` written into each workspace is a two-line dispatch stub.

## Workflow

1. Read `docs/adr.md` in full.
2. Read `docs/tasks/HARNESS-001.md`.
3. Implement. Work incrementally — write, test each logical unit, continue.
4. Run the smoke test defined in HARNESS-001 acceptance criteria.
5. Present the full diff for review before any commit.
6. Do not ask clarifying questions you can answer by reading the ADR.
