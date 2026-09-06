# North Star

Build the inner harness: agent work you can audit. weavelog is a
deterministic CLI that composes an opinionated, evidence-grade agentic
developer-experience stack on open standards. A pre-defined agent team runs an
end-to-end loop — spec, implement, verify, document — with the human directing
and verifying.

## Non-negotiables

- Core engineering principles: YAGNI, SOLID, KISS, DRY. Every agent and every
  artifact obeys these, globally and per-project.
- TDD and small ships with clean conventional commits are first-class. Every
  feature, in weavelog and in workspaces it produces, ships test-first with
  atomic commits.
- QA is non-negotiable: maker/checker split and verification gates are woven
  into every loop. The same agent never grades its own work.
- Security is non-negotiable: weavelog's own code is scanned, `weavelog
  check` enforces security on workspaces it produces, and security
  verification is woven into the loop.
- **Host-composed, not host-built.** The host is a composition choice:
  opencode first (v0.1), pi (0.2), Claude Code (0.3), Codex (0.4). weavelog
  composes hosts. It never builds a new agent host.
- **The human directs AND verifies.** The human runs the conductor role:
  one-question-at-a-time dialogue, plan gate before implementation, merge
  gate before code lands. The agent acts in between. Never the reverse.
- **Evidence over claims.** Every gate produces a receipt. Every run appends
  to a JSONL run ledger. Research is a dated, cited corpus. If it isn't
  recorded, it didn't happen.
- Open standards: Agent Skills (agentskills.io), AGENTS.md (agents.md). No
  proprietary formats for things an open standard already covers.
- Minimal required tooling. Optional tools stay optional.
- TypeScript is the implementation language for the entire project. No bash
  for logic. One language, one toolchain.
- Composition over invention. Skills, techniques, and tooling are ported,
  distilled, and composed with attribution (see `ATTRIBUTION.md`), not
  reinvented.
- Local-first. No account, no subscription, no cloud dependency. State lives
  on the user's machine.
- Terminal-native. No GUI app. Built for engineers who live in the terminal.
- arm64 macOS is the only v1 platform.
- Open-weight models are primary. Frontier models are targeted last-resort
  escalation, called specifically when open-weights fall short and handed
  back when done. Maximize cost/quality. Hosts in subscription mode (Claude
  Code at 0.3, Codex at 0.4) degrade the roster to single-provider tiering:
  no cross-model OpenRouter reviewers inside those hosts.
- Zero silent failure. Every refusal is a log line and a non-zero exit. Every
  command leaves a ledger record.

## Out of scope

- Building a new agent host. Hosts are composed, not built.
- Fully unattended autonomous runs. v1 is human-gated at the plan and merge
  gates.
- Lock-in to one model vendor.
- Taking external contributions (solo-dev OSS for v1; issues welcome, PRs not
  accepted — see `CONTRIBUTING.md`).

## Success

A feature ships from intent to merged, tested, documented code with the human
directing through dialogue, reviewing plans at the plan gate and diffs at the
merge gate — and every gate, run, and decision leaving an auditable record.

## How we avoid drift

This file is the anchor. Every spec, plan, and implementation decision must
trace back to a non-negotiable here. If a proposal cannot, it is out of scope
for v1 or requires amending this file first. For product definition, moat,
PMF, and the competitive landscape, see `docs/PRODUCT.md`. For milestone
sequencing, see `docs/ROADMAP.md`. Provenance for *why* these choices were
made lives in the dated research corpus (`docs/research/`).
