# weavelog

```
  ______ _ _           _                   _ _
 |  ____| (_)         | |                 | | |
 | |__  | |_ _ __  ___| |_ ___  _   _  ___| | |
 |  __| | | | '_ \/ __| __/ _ \| | | |/ _ \ | |
 | |    | | | |_) \__ \ || (_) | |_| |  __/ | |
 |_|    |_|_| .__/|___/\__\___/ \__, |\___|_|_|
            | |                  | |
            |_|                  |_|
```

> The inner harness: agent work you can audit.

A deterministic CLI that composes an opinionated, evidence-grade agentic
developer-experience stack on open standards. It installs the toolchain,
materializes agent configs, runs deterministic gates, and records every
decision in an append-only ledger — so agent work can be audited, not
trusted.

**Status: v0.1.0 — works on the author's machine; the stranger test is the
product.** arm64 macOS only. Not yet published.

## Why Weavelog

The name comes from the project's non-negotiables: verification gates are
woven into every loop, the harness composes an opinionated stack from
existing tools rather than building new ones (weave), and every gate
produces a receipt — every run appends to the JSONL ledger (log). Weavelog
names both halves of the tool in one word: what it composes, and what it
proves.

## What this is

weavelog composes a stack — opencode first, then pi, Claude Code, Codex —
and wraps it in gates:

- **Setup:** `weavelog init` installs opinionated deps and materializes
  `~/.agents/*` + `~/.config/opencode/*`. Two-step user-modification flow.
  Never silently overwrites managed files.
- **Verify:** `weavelog check` runs deterministic gates — tests, lint,
  typecheck, semgrep (telemetry off, pinned rulesets), secrets, frontmatter,
  manifest completeness.
- **Audit:** `weavelog doctor` verifies the stack; every command appends to
  an append-only JSONL ledger. Zero silent failure: refusal = log line +
  non-zero exit.
- **Scaffold:** `weavelog scaffold --project` turns a repo into an agentic
  workspace: backlog, AGENTS.md, docs/research, ADRs.

Agents spec, implement, verify, and document. The human directs (conductor,
one-question-at-a-time dialogue) and verifies (plan and merge gates).

## What this is not

- Not a new agent host. Hosts are composed, not built.
- Not unattended. v1 is human-gated at the plan and merge gates.
- Not a hosted product. Local CLI, local state. No account, no
  cloud dependency; the only network use is package installs, model
  APIs, and security scans.
- Not vendor-locked. Open-weights primary; frontier models are targeted
  escalation. Subscription-mode hosts (Claude Code, Codex) degrade to
  single-provider tiering — documented, not hidden.
- Not accepting PRs in v1. Issues welcome. See `CONTRIBUTING.md`.

## Principles

YAGNI, SOLID, KISS, DRY · TDD, small ships, clean conventional commits ·
maker/checker split, the same agent never grades its own work · security
woven in · evidence over claims (gate receipts, run ledger, dated research
corpus) · open standards (AGENTS.md, Agent Skills) · composition over
invention, with attribution · local-first · terminal-native · TypeScript
only, no bash for logic · arm64 macOS v1 · zero silent failure.

Full anchor: [`docs/NORTH_STAR.md`](docs/NORTH_STAR.md).

## Moat

The scaffold is replicable — that's the point; it's the wedge. The durable
layer is the evidence-grade audit trail: gate receipts, the JSONL run
ledger, and a dated research corpus. NIST AI RMF and the EU AI Act create
real demand for exactly that. The corpus compounds; competitors start at
zero. CLI code, opinions, and process hygiene alone are not moats.
Full argument: [`docs/PRODUCT.md`](docs/PRODUCT.md).

## Who it's for

Principal/senior engineers who want disciplined, auditable agentic loops on
macOS + terminal and share the YAGNI/TDD/maker-checker philosophy. Not
junior developers (too opinionated). Not enterprise (no SSO/rbac/audit).

## Quickstart (the stranger test)

```bash
# 1. Install (npm at 0.1.0; brew tap at 0.2+)
npm i -g weavelog

# 2. Install deps + materialize configs (asks before every write)
weavelog init

# 3. Verify the stack — all subchecks green
weavelog doctor

# 4. Scaffold a project workspace
weavelog scaffold --project ./my-project

# 5. Run the loop in your agent host
cd ./my-project
```

Requirements: arm64 macOS, node, git. Models are opinionated defaults;
`init` asks and flags override. Full command spec:
[`docs/cli.md`](docs/cli.md).

## Roadmap ladder

| Version | Host | Gate to next |
|---|---|---|
| v0.1.0 | opencode | stranger test green + npm publish (this release) |
| v0.2 | pi + plugin system | brew tap |
| v0.3 | Claude Code | subscription-mode tiering shipped |
| v0.4 | Codex | stranger test green |
| v1.0 | all hosts | + public evidence corpus |

Details: [`docs/ROADMAP.md`](docs/ROADMAP.md).

## Docs map

| Doc | Purpose |
|---|---|
| [`docs/NORTH_STAR.md`](docs/NORTH_STAR.md) | The anchor — non-negotiables |
| [`docs/PRODUCT.md`](docs/PRODUCT.md) | Product strategy, moat, PMF, landscape |
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | Milestone ladder |
| [`docs/cli.md`](docs/cli.md) | CLI spec — commands, exit codes, ledger |
| [`ATTRIBUTION.md`](ATTRIBUTION.md) | Lineage — what came from where |
| [`docs/specs/`](docs/specs/) | Ratified briefs |

## License & attribution

Code: Apache-2.0 ([`LICENSE`](LICENSE), see [`NOTICE`](NOTICE)). Lineage and
inspired-by: [`ATTRIBUTION.md`](ATTRIBUTION.md).

weavelog name/logo © Shabib Hossain — not covered by the code license.
