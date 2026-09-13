---
date: 2026-09-12
topic: Canonical CLI distribution and project scaffold contract
status: approved
type: architecture
author: conductor
related_to:
  - ../adr/0008-cli-distribution-contract.md
  - ./README.md
  - ../prd/2026-09-05-v010-draft-brief.md
sources:
  - "TASK-28"
---

# CLI vision: one opinionated harness, explicit ownership

This document is the canonical target contract for package distribution,
global materialization, and project scaffolding. It starts in v0.1.0. The
contract is opinionated and greenfield-first. It does not promise that the
current CLI already implements every behavior. TASK-29 owns global
materialization. TASK-30 owns project scaffolding. TASK-66 and TASK-67 own
supported-profile checks and release proof.

The key terms in this document are **declared target**, **managed global
target**, **project-owned target**, **profile**, and **run journal**. A
declared target is listed in a harness manifest. A managed global target is
materialized under the user's home directory. A project-owned target is
created by scaffold and belongs to the project after creation. A profile
contains user choices and secret references. A run journal records actions
and recovery state without file contents or secrets.

## Product boundary

Weavelog installs one complete, declared harness. Global `init` and `update`
preflight their managed targets and active OpenCode configuration. They do not
merge or automatically adopt an existing agent setup. Project scaffolding
checks only its requested project targets and does not require global OpenCode
installation or an OpenCode profile.

The CLI owns declared global outputs. The project owns scaffold outputs after
creation. Users own profiles, secrets, `.gitignore`, `.env`, `.env.local`, and
all undeclared paths. README users must see this boundary before installation:
Weavelog is opinionated and greenfield-first. Unsupported custom combinations
are the user's responsibility to validate.

## Package fan-out

The npm package has three distinct inputs: shared open-standard assets,
host-native configuration, and project scaffold templates. The harness
manifest maps package paths to declared global targets. It is control metadata
and is never copied into a live host directory.

```text
<installed-weavelog>/
├── payload/skills/<skill>/**
│   └── copy ───────────────────────────────► ~/.agents/skills/<skill>/**
├── payload/AGENTS.md
│   └── render ─────────────────────────────► ~/.config/opencode/AGENTS.md
├── payload/config/opencode.jsonc
│   └── render whole file ──────────────────► ~/.config/opencode/opencode.jsonc
├── payload/config/agents/**, prompts/**
│   └── render declared files ──────────────► ~/.config/opencode/{agents,prompts}/**
├── dist/hooks/*.js
│   └── reference from generated loaders ───► ~/.config/opencode/plugins/*.ts
├── payload/config/harnesses/opencode.json
│   └── read as control metadata; no live destination
└── payload/scaffold/project/**
    └── copy only during `weavelog scaffold --project`

~/.agents/
└── skills/<skill>/**                         shared open-standard skills

~/.config/opencode/
├── AGENTS.md, opencode.jsonc
├── agents/**, prompts/**, plugins/**         OpenCode-native configuration
└── secrets/**                                user-owned; never read or copied

~/.config/weavelog/profiles/<id>.json           user choices and secret references
~/.local/state/weavelog/                        run journal, ownership state, backups

~/project/my-project/
├── AGENTS.md                                  created by scaffold, then project-owned
├── backlog/                                   initialized by Backlog CLI
├── docs/
│   ├── README.md
│   ├── research/README.md
│   ├── adr/README.md
│   ├── prd/README.md
│   └── trd/README.md
└── .env.example                               placeholder only
```

`~/.agents` is the shared-skill location. It is not an OpenCode configuration
root. OpenCode's global behavior file is `~/.config/opencode/AGENTS.md`. A
future host must declare its own behavior-file target and pass host-specific
discovery checks before Weavelog claims support.

### Package exclusions

The package builder and global-install inputs exclude these path segments and
trees:

- `secrets/`
- `backlog/`
- `docs/research/`
- `state/`
- `reports/`
- `logs/`
- `.worktrees/`
- `node_modules/`

The privacy boundary also excludes secret values, personal paths, and
personal model defaults. Exclusion checks apply at every package depth, not
only at the repository root.

### Harness manifest and configuration formats

Each host has a strict JSON manifest at
`config/harnesses/<id>.json`. The current OpenCode source is
`payload/config/harnesses/opencode.json`. The manifest declares which package
files Weavelog reads, renders, and writes. It is not a live configuration
file and is never copied to `~/.config/opencode/`.

`payload/config/opencode.jsonc` is the full opinionated OpenCode template.
JSONC permits comments and trailing commas for human-maintained settings.
Weavelog renders it as a whole file. It does not merge individual fields
with an existing configuration. Generated output must parse as JSONC and
pass the OpenCode load check.

The manifest stays strict JSON because software consumes it as package
control data. It has no comments or trailing commas. These two files have
different roles: the JSON manifest controls fan-out; the JSONC template
defines the complete OpenCode configuration Weavelog materializes.

## Profile, state, and secrets

User profile input lives at
`~/.config/weavelog/profiles/<lowercase-path-safe-id>.json`. It may include
model choices, port choices, and secret references. It must not include
secret values. Precedence is CLI flags, confirmed `init` answers, profile,
then package-safe defaults.

Derived render state and replacement backups live under
`~/.local/state/weavelog/`. Target IDs are opaque digests of canonical target
paths; logs and snapshots do not expose raw home paths. Secret values are
never read into render state, copied, hashed, snapshotted, or logged.
Authentication diagnostics may parse configuration in memory, but must not
emit or persist its contents. Secret-file checks only report presence and
permissions.

The state layout separates command history, ownership state, and backups:

```text
~/.local/state/weavelog/
├── ledger.jsonl
├── materialize/<harness>/<target-id>/
│   ├── active-profile                 profile ID and snapshot hash
│   └── snapshots/<profile-id>/<sha256>.json
└── backups/<run-id>/<opaque-target-id>.bak
```

The `~/.local/state/weavelog/` directory and every directory below it use
mode `0700`. Backup files use mode `0600`. Before writes, the CLI checks
targets with `lstat` and never follows symlinks. A declared target must be
absent or a regular file. Symlinks, special files, and symlinked parent
directories cause refusal, including when `--force` is set. Backup paths
must be absent before creation; an existing symlink or non-regular backup
target causes refusal.

The run journal records intent and completion for each replacement. The
active-profile record points to the immutable resolved render snapshot. The
snapshot contains non-secret inputs after precedence is applied. Backups use
opaque names, stay under the protected state directory, and remain after a
successful replacement.

## Ownership and replacement

Before any write, `init`, `update`, and `scaffold` preflight every declared
target. A preflight conflict logs a refusal, exits nonzero, and leaves all
declared targets unchanged.

| Target state | Default behavior | With `--force` |
|---|---|---|
| Global target is absent | Create it | Create it |
| Global target is proven Weavelog-owned and unchanged | Update it | Update it |
| Global target is unowned, changed, ambiguous, or has missing ownership state | Refuse the run | Confirm and replace only if it is an eligible declared leaf file |
| Project scaffold target is absent | Create it once; the project owns it afterward | Same create behavior |
| Project scaffold target already exists | Refuse the run | Confirm and replace only if it is an eligible declared leaf file |
| Directory, `.git`, `.gitignore`, secret, or undeclared path | Never replace | Never replace |
| Symlink, special file, or symlinked managed parent | Refuse the run | Never follow or replace |

Replacement has these required steps:

1. Resolve and validate the exact declared leaf-file target.
2. Preflight all declared targets and verify the selected OpenCode profile is supported.
3. Stage the new content and write durable journal intent before changing the target.
4. Move the prior file to a unique opaque `.bak` under
   `~/.local/state/weavelog/backups/<run-id>/`. Never overwrite a backup.
5. Install the staged file, then record completion in the journal.
6. Preserve backups. Do not parse, hash, or log backup contents.

On a safe failure, restore the original target and record the rollback. If
the target changed after the interrupted run, refuse automatic recovery and
report the journal and backup paths. Do not overwrite the later change.

An interactive `--force` operation shows the target and replacement warning,
then requires confirmation. In a noninteractive environment, replacement
requires both `--force --yes`. `--yes` alone never permits replacement.
`--force` does not bypass unsupported host state, failed global preflight, or
protected-path checks. There is no merge or automatic adoption path.

The durable run journal records target paths, decisions, backup references,
actions, errors, and exit status. It never records file contents, secret
values, or backup contents. A conflict or failure exits nonzero.

## Project scaffold contract

`weavelog scaffold --project <path>` creates this opinionated project core:

```text
<project>/
├── AGENTS.md
├── backlog/                         initialized by the Backlog CLI
├── docs/
│   ├── README.md
│   ├── research/README.md
│   ├── adr/README.md
│   ├── prd/README.md
│   └── trd/README.md
└── .env.example                     placeholder; no secret values
```

The four docs homes are part of the scaffold contract. Their neutral README
files explain the project artifact flow:

```text
idea → PRD → TRD → milestone ↔ PRD → TASK
```

Research provides dated evidence when useful; it is not a required stage.
ADRs record hard-to-reverse decisions at any stage; they are not a required
stage. This follows ADR-005. Scaffold does not copy Weavelog's own research,
ADRs, PRDs, or TRDs into the user's project.

Scaffolding does not require `weavelog init`, a global OpenCode profile, or
global OpenCode configuration. Its preflight is limited to the requested
project targets.

The scaffolded project `AGENTS.md` uses the conductor-era v0.1.0 method. It
states the Backlog CLI prerequisite, TDD-first practice, task review gates,
local commands, local constraints, and documentation locations. It does not
install a weaver persona or `stitch`, `weave`, `loom`, `pulse`, or `warp`
commands. TASK-80 and TASK-81 own that later work. The scaffold AGENTS file
will be revisited when that work reaches its implementation stage.

Weavelog does not create, edit, own, or validate `.gitignore`. It never reads,
copies, hashes, logs, or modifies `.env`, `.env.local`, or `.git`. The project
owner controls those files and their ignore policy. `.env.example` is a
placeholder without credentials.

Existing project scaffold targets cause a default refusal. With `--force`,
Weavelog may replace only declared eligible leaf files after confirmation and
backup. It does not replace directories or initialize git. Project files are
not drift-managed after scaffold creates them.

## Current delivery and task ownership

This section separates the target contract from current behavior:

`weavelog sync` remains the tested developer dogfood path from the Weavelog
repository to the developer's live configuration. It is not the end-user
installer. Global `init` and `update` follow the materialization contract
above.

| Area | Target contract | Delivery owner |
|---|---|---|
| Global targets | Manifest-driven fan-out, ownership receipts, profile rendering, whole-run preflight, safe `--force` replacement, journal recovery | TASK-29 |
| Project scaffold | Four docs homes, lean conductor-era `AGENTS.md`, required Backlog, placeholder `.env.example`, protected-path refusal, safe `--force` replacement | TASK-30 |
| OpenCode profile | Detect active competing configuration sources and report unsupported combinations | TASK-66 |
| Exact release proof | Verify conflict refusal, unchanged targets, force backup and recovery, and scaffold output | TASK-67 |
| Existing skill ownership | Decide bounded evidence for the seven legacy live skill copies | TASK-84 |
| Future agent persona and loops | Rename conductor surfaces and implement loop commands under the approved future design | TASK-80 and TASK-81 |

Until those tasks deliver their behavior, `docs/cli.md` labels it as the
target contract. Current implementation may still expose older overwrite,
skip, adoption, or scaffold behavior. Do not treat documentation as proof of
delivery; use the named task's tests and exact-candidate evidence.

## Related documents

- [ADR-0008: package, host, and project decision](../adr/0008-cli-distribution-contract.md)
- [CLI command reference](../cli.md)
- [ADR-0005: artifact flow](../adr/0005-artifact-flow.md)
- [Corrected v0.1.0 brief](../prd/2026-09-05-v010-draft-brief.md)
