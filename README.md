# weavelog

```txt

                               _             
 __      _____  __ ___   _____| | ___   __ _ 
 \ \ /\ / / _ \/ _` \ \ / / _ \ |/ _ \ / _` |
  \ V  V /  __/ (_| |\ V /  __/ | (_) | (_| |
   \_/\_/ \___|\__,_| \_/ \___|_|\___/ \__, |
                                       |___/ 

```

> The inner harness: agent work you can audit.

> **Pre-release:** this public repository is not ready to install or use.
> The commands below describe the planned v0.1 release flow; do not run them
> as setup instructions yet.

> **Setup model:** Weavelog is an opinionated, greenfield-first harness. It
> does not merge with or adopt existing agent rules or host configuration.
> Setup checks for conflicts before writing. You can choose `--force` to
> replace an eligible declared file after confirmation; Weavelog keeps a
> protected backup. Custom combinations outside the supported profile are
> the project owner's responsibility to validate.

The [CLI vision](docs/trd/cli-vision.md) describes the target contract. It is
not proof that every behavior has shipped; see the linked delivery tasks and
the release status before relying on a feature.

## Why **Weavelog**?

As I learned more about AI and agentic work, I experimented with my workflow. I developed stronger views on how people like me should compose tools and work.

**weavelog** is the result of my own learnings and experiments. It is a deterministic CLI that composes an opinionated, evidence-grade agentic developer-experience stack on open standards. It installs the toolchain, materializes agent configs, runs deterministic gates, and records every decision in an append-only ledger.

> TL;DR: **weavelog** is an outer, harness-agnostic tool. It controls guardrails, removes tool-plumbing overhead, and helps teams ship with an agentic SDLC. It is still SDLC, now with AI.

## What is **Weavelog**?

A deterministic CLI that composes an opinionated, evidence-grade agentic
developer-experience stack on open standards. It installs the toolchain,
materializes agent configs, runs deterministic gates, and records every
decision in an append-only ledger.

## Why the name **Weavelog**?

The name comes from the project's non-negotiable: verification gates are
woven into every loop, the harness composes an opinionated stack from
existing tools rather than building new ones (weave), and every gate
produces a receipt — every run appends to the JSONL ledger (log). Weavelog
names both halves of the tool in one word: what it composes, and what it
proves.

## What this is

**weavelog** composes an opinionated agentic control plane: the inner harness.

- Agents spec, implement, verify, and document. 
- The human directs and verifies (plan and merge gates).

## What this is not

- Not a new agent host. Hosts are composed, not built.
- Not project-specific. The harness is host-agnostic and project-agnostic.

See [NORTH_STAR.md](docs/NORTH_STAR.md) and [PRODUCT.md](docs/PRODUCT.md) for more details.

## Planned v0.1 quickstart (the stranger test)

```bash
# 1. Install (npm at 0.1.0; brew tap at 0.2+)
npm i -g weavelog

# 2. Check prerequisites and materialize the declared setup
weavelog init

# 3. Verify the stack — all subchecks green
weavelog doctor

# 4. Scaffold a project workspace
weavelog scaffold --project ./my-project

# 5. Run the loop in your agent host
cd ./my-project
```

Requirements: arm64 macOS, node, and the tools listed in the CLI reference.
Models are opinionated defaults; `init` asks and flags override. Full command spec:
[`docs/cli.md`](docs/cli.md).

## Roadmap ladder

| Version | Host | Gate to next |
|---|---|---|
| v0.1.0+ | opencode | stranger test green + npm publish (this release) |
| v0.2.0+ | pi + plugin system | brew tap |
| v0.2.1+ | hybrid | ratified brief + stranger test green |
| v0.3.0+ | Codex | stranger test green |
| v0.4.0+ | Claude Code | reviewer capability disclosed |
| v1.0.0+ | all hosts | + complete documentation |

Details: [`docs/ROADMAP.md`](docs/ROADMAP.md).

## Docs map

| Doc | Purpose |
|---|---|
| [`docs/NORTH_STAR.md`](docs/NORTH_STAR.md) | The anchor — non-negotiables |
| [`docs/PRODUCT.md`](docs/PRODUCT.md) | Product strategy, moat, PMF, landscape |
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | Milestone ladder |
| [`docs/cli.md`](docs/cli.md) | CLI spec — commands, exit codes, ledger |
| [`docs/trd/cli-vision.md`](docs/trd/cli-vision.md) | Canonical package, ownership, replacement, and scaffold contract |
| [`ATTRIBUTION.md`](ATTRIBUTION.md) | Lineage — what came from where |

## License & attribution

Code: MIT ([`LICENSE`](LICENSE), see [`NOTICE`](NOTICE)). Lineage and
inspired-by: [`ATTRIBUTION.md`](ATTRIBUTION.md).

**weavelog** name/logo © shabib87 — not covered by the code license.
