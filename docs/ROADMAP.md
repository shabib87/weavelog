# Roadmap

> **Authority:** Delivery plan. Traces to [`NORTH_STAR.md`](./NORTH_STAR.md) and
> [`PRODUCT.md`](./PRODUCT.md) brief.

The milestone ladder is host-driven. Each rung = one host passing the
**stranger test**: `init` writes a loadable host config, skills land on the
host's scanned path, at least one enforced gate runs, a file manifest exists,
and `doctor` verifies the stack (installed? authenticated? config parses?
proxy up? versions pinned? arm64?). A stranger can install, run, and audit.

For v0.1.0, "stranger test" means proof of independent installation. The author
can produce that evidence on their own Mac; another person or machine is not a
release prerequisite. The [release brief](./prd/2026-09-05-v010-draft-brief.md)
records the scope, and TASK-67 owns the final evidence and human release decision.

Distribution: npm (OIDC trusted publishing) at 0.1.0; brew tap at 0.2+.
Releases are tag-driven release-please over conventional commits;
`CHANGELOG.md` is automatic; CI gates publish on privacy-audit-done.

---

## v0.1.0 — OpenCode + Headroom stranger test

**Goal:** the exact **weavelog** candidate supports independent npm installation
on arm64 macOS and one auditable TypeScript-controlled OpenCode + Headroom workflow.

The deliverables below describe the v0.1.0 target. The [CLI vision](./trd/cli-vision.md)
separates target behavior from current delivery; TASK-29, TASK-30, TASK-66,
and TASK-67 own implementation and proof.

**Deliverables:**
- A bounded TypeScript SDK controller over the existing OpenCode roster, skills
  and hooks: TASK-3 proves invocation, TASK-4 implements workflow transitions and
  gates, and TASK-5 proves one real project. TASK-7 repairs reviewer reporting.
- `weavelog init` — verifies required external-tool prerequisites using
  pinned instructions, then materializes shared skills and OpenCode-native
  configuration from declared package inputs. Normal conflicts refuse before
  writes. A user-confirmed `--force` replacement preserves an opaque backup
  under Weavelog's protected local state. It does not install external tools.
  See the [canonical CLI vision](./trd/cli-vision.md) for target behavior and
  delivery status.
- `weavelog sync` — dev path: repo → live (dogfood loop).
- `weavelog update` — release-driven dep bump + re-materialize.
- `weavelog check` — deterministic gates: tests, lint, typecheck, semgrep
  (telemetry off, pinned rulesets), secrets, frontmatter, manifest
  completeness.
- `weavelog doctor` — installed? authenticated? config parses? proxy
  healthy? cache mode=cache? python3.13? :8788 launchd-owned? semgrep smoke?
  ledger tail? manifest drift? arm64 guard.
- `weavelog scaffold --project` — initialize Backlog and create a project-owned
  conductor-era `AGENTS.md`, `.env.example`, and neutral docs README homes for
  research, ADR, PRD, and TRD. Weavelog does not manage `.gitignore`, `.env`,
  `.env.local`, or `.git`.
- Manifest: `weavelog.json` (JSON, CLI-managed): per-tool install channel
  (brew/pipx/npm/uv) + version + doctor check id. Completeness rule:
  every external binary invoked in skills/src/payload must appear in the
  manifest (check-enforced).
- Ledger: append-only JSONL at `~/.local/state/weavelog/`. Zero silent
  failure: refusal = log line + non-zero exit.
- Post-flip `~/.agents`: only open-standard files (AGENTS.md,
  .agents/skills/, host-standard dirs). No git, no node_modules, no state.
- Compiled package artifact: CLI, hook adapters, portable configuration, agents,
  distributable skills and references, manifests, scaffolding, and MIT licensing.
- Required external tools documented with pinned installation instructions:
  OpenCode, Headroom, Backlog, review/security gates. MarkItDown, diagram tooling,
  RTK, and credential-dependent integrations declare their own capability needs.
- npm publish (OIDC trusted publishing, release-please, CHANGELOG.md) only after
  the exact tarball passes TASK-67. Repository/history clearance remains a separate
  m-5 public-release gate.
- CI: typecheck, biome, tests, semgrep (telemetry off), frontmatter check.

**Explicitly out:** Pi, hybrid, Codex, and Claude Code hosts; plugin system; brew tap;
docs site; governance/PR acceptance; LaunchAgent/scheduled checks.

**Local release proof:** isolated configuration/state/project roots or a local
test account on the author's Mac → exact TASK-54-cleared tarball install →
`weavelog init` → `weavelog doctor` → `weavelog scaffold --project` → one real
SDK-controlled workflow using OpenCode, Headroom, the roster, skills, required
hooks, independent review, human gates and audit records. TASK-67 verifies the
artifact hash, installed-package provenance and effective configuration sources
so the working setup cannot hide missing inputs. Full replacement, protected
backups, journaling and recovery remain required. A real configuration-path test
uses verified backups and a tested restoration path. Another tester, another
machine and a clean-user CI job are optional; general CI/security checks remain.

**Next OpenCode increments, before additional hosts:** retain the conductor role
temporarily for 0.1.0, then introduce the weaver persona and stitch/weave, followed
by loom and pulse through existing ADR-006 tasks and their safety prerequisites.
The full command suite does not block 0.1.0. The host-version ladder below remains
unchanged; these are incremental OpenCode releases within that ladder.

---

## v0.2 — Pi host

**Goal:** pi passes the stranger test; plugins become a validated install
surface; brew distribution opens.

**Deliverables:**
- pi host support: config materialization, skills path, doctor checks.
- Host plugin files are CLI-managed artifacts; skills remain validated against the
  Agent Skills standard.
- brew tap distribution.
- `.pi/` pattern seeds from the author instance ported as templates.

**Explicitly out:** hybrid, Codex, Claude Code; unattended runs.

**Stranger test:** same ladder as 0.1 with pi as host, installable via brew.

---

## v0.2.1 — hybrid routing

**Goal:** add the hybrid routing profile without changing the host-composition or
human-gate rules. A ratified brief is required before tasks claim.

---

## v0.3 — Codex host

**Goal:** Codex passes the stranger test. OpenAI subscription routing is optional;
the audit record states whether cross-family review was available and which explicit
alternative the human selected when it was not.

## v0.4 — Claude Code host

**Goal:** Claude Code passes the stranger test under the independent-review policy.

**Constraint:** a locked-in host may not provide cross-family review. It still uses
an independent fresh-context checker; a missing family is disclosed and handled by
the explicit-alternative rule in ADR-007.

**Deliverables:**
- Claude Code host support: config, skills, hooks wiring, doctor checks.
- Reviewer-capability disclosure in manifest + doctor, including the explicit
  alternative selected when cross-family review is unavailable.

**Explicitly out:** multi-provider reviewer routing inside locked-in hosts;
hosted/SaaS anything.

**Stranger test:** same ladder with Claude Code as host; doctor reports the
available reviewer capability honestly.

---

## v1.0 — all hosts shipped + public corpus

**Definition of 1.0:** all planned hosts shipped (the host ladder complete) **and** the
evidence corpus public.

**Explicitly out:** unattended runs; governance/PR acceptance; docs
site; hosted product.

---

## Out of scope (v1)

Traces to NORTH_STAR out-of-scope:

- Building a new agent host (hosts are composed).
- Fully unattended autonomous runs (human-gated at plan and merge).
- Lock-in to one model vendor (open-weights primary).
- Taking external contributions (issues welcome, PRs not accepted).
- Platforms other than arm64 macOS.
- Hosted/SaaS surface.

## How this avoids drift

Every rung traces to:
- A NORTH_STAR non-negotiable (the *what*).
- A stranger-test definition (the *evidence*).
- The v0.1.0 draft brief (the *ratified scope*).

If a proposal cannot trace to all three, it is out of scope for v1 or
requires amending the brief and this file first.
