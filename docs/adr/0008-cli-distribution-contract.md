---
date: 2026-09-12
topic: Canonical CLI distribution contract for package, hosts, and projects
status: approved
type: adr
author: conductor
related_to:
  - ./README.md
  - ./0009-npm-provenance-and-release-gating.md
  - ../prd/2026-09-05-v010-draft-brief.md
  - ../trd/cli-vision.md
  - ../trd/README.md
sources:
  - "TASK-28"
  - "TASK-29"
  - "TASK-30"
---

# Canonical CLI distribution contract uses package fan-out and host manifests

## Status

approved (human ratified 2026-09-12) — the companion CLI vision records the
durable target contract. TASK-29 and TASK-30 own implementation.

## Context

The corrected v0.1 brief requires an installed package to materialize shared
open-standard assets and host-native configuration. The CLI needs one durable
contract for package, host, and project boundaries.

- OpenCode is the only verified host for v0.1.0.
- Weavelog is an opinionated, greenfield-first harness.
- Personal identity and secret values must not ship in package payloads.
- Shared standards, host configuration, and project files have different owners.
- Existing commands do not yet meet the complete target contract.

## Decision

| Decision | Choice | Why |
|---|---|---|
| Topology | The installed package fans out shared skills to `~/.agents` and configuration to verified host-native roots; OpenCode is the only v0.1.0 host | Shared standards are not host configuration |
| Package and identity boundary | Exclude `secrets`, `backlog`, `state`, `reports`, `logs`, `.worktrees`, `node_modules`, and every `docs/research` subtree; package content has no secret values, personal paths, or personal model defaults | Private evidence and machine state must not ship |
| Manifest and OpenCode config | `config/harnesses/<id>.json` is strict JSON control metadata; `payload/config/opencode.jsonc` is the full human-maintained template, rendered whole and never field-merged | Control metadata and commented user configuration have different roles |
| Profile and materialization state | User profiles store choices and secret references; precedence is CLI flags, confirmed answers, profile, then safe defaults; per-root state stores active profile and immutable content-addressed snapshots with opaque target IDs | User choices stay separate from package data and profiles do not collide |
| Ownership and replacement | Create absent targets and update only unchanged, proven Weavelog-owned global targets; refuse other conflicts by default; confirmed `--force` replaces eligible declared leaf files with opaque protected backups and journaled recovery; active-source conflicts remain unsupported | Users can intentionally replace files without silent adoption or loss of the prior version |
| Project and v0.1.0 method | Create project-owned `AGENTS.md`, Backlog, `.env.example`, and neutral research/ADR/PRD/TRD READMEs; never manage `.gitignore`, `.env`, `.env.local`, or `.git`; keep conductor-era rules until future weaver work | Scaffold sets Weavelog's workflow while leaving project policy and later loops to their owners |

The force path is whole-file replacement. It never merges, adopts, replaces a
directory, touches `.git`, `.gitignore`, secrets, or an undeclared path. A
noninteractive replacement requires `--force --yes`. A conflict or failed
preflight exits nonzero and leaves all declared targets unchanged. Backups
are opaque: the CLI does not parse, hash, or log their contents.

The artifact flow follows ADR-005: idea → PRD → TRD → milestone ↔ PRD → TASK.
Research provides dated evidence when needed. ADRs record hard-to-reverse
decisions across that flow; they are not a required pipeline stage.

### Target contract, not current delivery

These mappings define the intended behavior. They do not claim that the
current CLI already conforms. See [the CLI vision](../trd/cli-vision.md) for
the full target contract and delivery gaps.

| Source | Operation | Destination | Owner |
|---|---|---|---|
| `payload/skills/<distributable-skill>/**` | copy | `~/.agents/skills/<skill>/**` | Weavelog-managed global target |
| `payload/AGENTS.md` | render | `~/.config/opencode/AGENTS.md` | Weavelog-managed global target |
| `payload/config/{opencode.jsonc,agents/**,prompts/**}` | render from declared profile inputs | matching `~/.config/opencode/` paths | Weavelog-managed global target |
| `dist/hooks/{enforce,verify-gate}.js` | reference from generated loaders | `~/.config/opencode/plugins/{enforce,verify-gate}.ts` | Weavelog-managed global target |
| `payload/config/harnesses/opencode.json` | consume as control metadata | no live destination | Weavelog package |
| `payload/scaffold/project/AGENTS.md` | create if absent | `<project>/AGENTS.md` | Project-owned after creation |
| no package source | initialize with Backlog CLI | `<project>/backlog/` | Project-owned after creation |
| no package source | create neutral documentation homes | `<project>/docs/{research,adr,prd,trd}/README.md` | Project-owned after creation |
| `payload/scaffold/project/.env.example` | create if absent | `<project>/.env.example` | Project-owned after creation |

`~/.agents` contains shared skills. OpenCode behavior rules live at
`~/.config/opencode/AGENTS.md`. A future host must declare its own native
behavior-file mapping and pass its own discovery checks.

The user profile lives under `~/.config/weavelog/profiles/`. It may contain
model and port choices plus secret references, never secret values. Precedence
is CLI flags, confirmed init answers, user profile, then package-safe defaults.
Derived render state and backups live under `~/.local/state/weavelog/`; target
identifiers must not expose raw home paths. The command journal records paths
and actions, never secret values or backup contents.

## Consequences

**Easier:**

- **Portability:** package, host, and project boundaries have one source of truth.
- **Privacy:** package exclusions and secret boundaries are explicit.
- **Recovery:** forced replacements retain opaque backups and a durable journal.

**Harder:**

- **Ownership:** safe updates require durable proof that Weavelog owns an unchanged target.
- **Preflight:** the CLI must find active OpenCode sources before writing.
- **Scaffolding:** four neutral documentation homes and Backlog initialization need safe preflight.

## Alternatives considered

| Option | Verdict | Why rejected |
|---|---|---|
| Route host configuration through `~/.agents` or duplicate global `AGENTS.md` there | rejected | `~/.agents` is for shared standards, OpenCode does not load host rules there, and duplicate sources conflict |
| Merge into or automatically adopt an existing setup | rejected | The result would no longer be the declared opinionated harness and could hide conflicts |
| Refuse every replacement, or replace without a protected backup | rejected | Users need an explicit replacement path that preserves the prior file |
| Ship personal model and secret defaults | rejected | The package would be machine-specific and unsafe to distribute |
| Claim support for hosts without discovery evidence | rejected | One host's behavior does not prove another host's target paths |
| Package fan-out with host manifests and project-owned scaffold files | chosen | It keeps shared standards portable and makes each ownership boundary explicit |

## Alignment

| Decision | Anchor |
|---|---|
| Opinionated, host-composed setup | NORTH_STAR: host-composed, not host-built |
| Explicit replacement and refusal receipts | NORTH_STAR: human directs and verifies; zero silent failure |
| Local profiles, state, and backups | NORTH_STAR: evidence over claims; local-first state |
| Portable project scaffold | ADR-0005 artifact flow; corrected v0.1.0 brief |
| Future weaver separation | ADR-0006 tiered loop commands; TASK-80 and TASK-81 |

## References

- [Canonical CLI vision](../trd/cli-vision.md)
- [CLI command reference](../cli.md)
- TASK-28 defines the contract; TASK-29 and TASK-30 implement global and project behavior.
