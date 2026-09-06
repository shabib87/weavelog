# Roadmap

> **Authority:** Delivery plan. Traces to `docs/NORTH_STAR.md` (what),
> `docs/PRODUCT.md` (strategy, moat, PMF), and
> `docs/specs/2026-09-05-v010-draft-brief.md` (ratified scope).
> Source of truth for scope: the v0.1.0 draft brief.

The milestone ladder is host-driven. Each rung = one host passing the
**stranger test**: `init` writes a loadable host config, skills land on the
host's scanned path, at least one enforced gate runs, a file manifest exists,
and `doctor` verifies the stack (installed? authenticated? config parses?
proxy up? versions pinned? arm64?). A stranger can install, run, and audit.

Distribution: npm (OIDC trusted publishing) at 0.1.0; brew tap at 0.2+.
Releases are tag-driven release-please over conventional commits;
`CHANGELOG.md` is automatic; CI gates publish on privacy-audit-done.

---

## v0.1.0 — opencode stranger test

**Goal:** a stranger on arm64 macOS installs weavelog from npm, runs the
stranger test against opencode, and gets an auditable stack.

**Deliverables:**
- `weavelog init` — installs opinionated deps (headroom[proxy], opencode,
  markitdown, semgrep, backlog.md), materializes `~/.agents/*` +
  `~/.config/opencode/*` via the two-step user-modification flow, never
  silently overwrites managed files. Models are opinionated defaults; init
  asks and flags override.
- `weavelog sync` — dev path: repo → live (dogfood loop).
- `weavelog update` — release-driven dep bump + re-materialize.
- `weavelog check` — deterministic gates: tests, lint, typecheck, semgrep
  (telemetry off, pinned rulesets), secrets, frontmatter, manifest
  completeness.
- `weavelog doctor` — installed? authenticated? config parses? proxy
  healthy? cache mode=cache? python3.13? :8788 launchd-owned? semgrep smoke?
  ledger tail? manifest drift? arm64 guard.
- `weavelog scaffold --project` — backlog init, AGENTS.md, docs/research,
  ADRs, .gitignore, .env.example (never touches .env/.env.local).
- Manifest: `weavelog.json` (JSON, CLI-managed): per-tool install channel
  (brew/pipx/npm/uv) + version + doctor check id. Completeness rule:
  every external binary invoked in skills/src/payload must appear in the
  manifest (check-enforced).
- Ledger: append-only JSONL at `~/.local/state/weavelog/`. Zero silent
  failure: refusal = log line + non-zero exit.
- Post-flip `~/.agents`: only open-standard files (AGENTS.md,
  .agents/skills/, host-standard dirs). No git, no node_modules, no state.
- npm publish (OIDC trusted publishing, release-please, CHANGELOG.md).
- CI: typecheck, biome, tests, semgrep (telemetry off), frontmatter check.

**Explicitly out:** pi, Claude Code, Codex hosts; plugin system; brew tap;
docs site; governance/PR acceptance; LaunchAgent/scheduled checks.

**Stranger test:** fresh arm64 Mac → `npm i -g weavelog` →
`weavelog init` → `weavelog doctor` (all green) →
`weavelog scaffold --project` → host loop runs in opencode.

---

## v0.2 — pi host + plugin system

**Goal:** pi passes the stranger test; plugins become a validated install
surface; brew distribution opens.

**Deliverables:**
- pi host support: config materialization, skills path, doctor checks.
- Plugin system: host plugin files as CLI-managed artifacts (src/hooks/,
  emitted per host); skills validated against the Agent Skills standard.
- brew tap distribution.
- `.pi/` pattern seeds from the author instance ported as templates.

**Explicitly out:** Claude Code, Codex hosts; subscription-mode tiering;
unattended runs.

**Stranger test:** same ladder as 0.1 with pi as host, installable via brew.

---

## v0.3 — Claude Code host (subscription-mode constraint)

**Goal:** Claude Code passes the stranger test under the subscription-mode
routing constraint.

**Constraint (non-negotiable):** inside subscription-mode hosts there is no
cross-model OpenRouter reviewer; model tiering degrades to single-provider.
The cross-model reviewer roster remains an OpenRouter-host (opencode, pi)
capability. See NORTH_STAR.

**Deliverables:**
- Claude Code host support: config, skills, hooks wiring, doctor checks.
- Subscription-mode degradation in manifest + doctor (single-provider
  tiering, documented).

**Explicitly out:** Codex host; multi-provider reviewer routing inside
subscription hosts; hosted/SaaS anything.

**Stranger test:** same ladder with Claude Code as host; doctor reports the
degraded tiering honestly.

---

## v0.4 — Codex host

**Goal:** Codex passes the stranger test.

**Deliverables:**
- Codex host support: config, skills, doctor checks (subagent format
  verification as research lands).
- Subscription-mode degradation rules as in 0.3.

**Explicitly out:** unattended v1; new agent hosts; non-arm64/non-macOS.

**Stranger test:** same ladder with Codex as host.

---

## v1.0 — all hosts shipped + public corpus

**Definition of 1.0:** Codex shipped (the host ladder complete) **and** the
evidence corpus public.

**Deliverables:**
- All four hosts passing the stranger test.
- Public evidence corpus: gate receipts, run ledger aggregates, dated
  research docs, harness-vs-null comparisons with published honest numbers.
- Proof projects shipped and documented (weavelog itself + blog; see
  PRODUCT.md PMF thesis).

**Explicitly out (still):** unattended runs; governance/PR acceptance; docs
site; hosted product.

---

## Out of scope (v1)

Traces to NORTH_STAR out-of-scope:

- Building a new agent host (hosts are composed).
- Fully unattended autonomous runs (human-gated at plan and merge).
- Lock-in to one model vendor (open-weights primary, frontier escalation).
- Taking external contributions (issues welcome, PRs not accepted).
- Platforms other than arm64 macOS.
- Hosted/SaaS surface.

## Fog (tracked, not built)

Per the brief: second-brain standardized dir in .agents; LaunchAgent /
scheduled checks; subscription-mode model tiering refinements (0.3/0.4);
reviewer roster degradation to single-provider (generalized); brew formula
polish; real logo; docs site; governance/PR acceptance. These are tracked,
not scheduled.

## How this avoids drift

Every rung traces to:
- A NORTH_STAR non-negotiable (the *what*).
- A stranger-test definition (the *evidence*).
- The v0.1.0 draft brief (the *ratified scope*).

If a proposal cannot trace to all three, it is out of scope for v1 or
requires amending the brief and this file first.
