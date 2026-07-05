# North Star

Build a minimal, open-source developer-experience setup that turns any project
into a self-contained agentic workspace. A pre-defined agent team runs an
end-to-end loop — spec, implement, verify, document — with the human in the
loop only for verification.

## Non-negotiables
- Core engineering principles: YAGNI, SOLID, KISS, DRY. Every agent and
  every artifact obeys these, globally and per-project.
- Pi is the host. No separate orchestration runtime.
- Open standards: Agent Skills (agentskills.io), AGENTS.md (agents.md).
- The human provides intent and verifies; the agent acts in between. Never the
  reverse.
- Open-weight models are primary. Frontier models are targeted last-resort
  escalation (analyst/researcher/reviewer), called specifically when
  open-weights fall short and handed back when done. Maximize cost/quality.
- loopeng-target workspaces support mobile toolchains (Swift/KMP/Kotlin)
  without Docker.
- Minimal required tooling. Optional tools stay optional.
- TypeScript is the implementation language for the entire project (CLI and
  extension). No bash for logic. One language, one toolchain.
- loopeng ships as a deterministic CLI that installs and configures both
  global and project workspaces.
- macOS is the only target platform for v1.
- Security is non-negotiable: loopeng's own code is scanned, `loopeng check`
  enforces security on workspaces it produces, and security verification is
  woven into the loop.
- TDD and small ships with clean commits are first-class. Every feature, in
  loopeng and in workspaces it produces, ships test-first with atomic commits.
- QA is non-negotiable: maker/checker split and verification gates are woven
  into every loop. The same agent never grades its own work.

## Out of scope
- Building a new agent host.
- Fully unattended autonomous runs (v1 is human-gated at each verification gate).
- Lock-in to one model vendor.
- Taking external contributions (solo-dev OSS for v1).

## Success
A feature ships from intent to merged, tested, documented code with the human
reviewing diffs at verification gates — and never prompting the agents by hand.

## How we avoid drift
This file is the anchor. Every spec, plan, and implementation decision must
trace back to a non-negotiable here. If a proposal cannot, it is out of scope
for v1 or requires amending this file first. For product definition, moat,
and PMF, see `docs/PRODUCT.md`. `docs/RESEARCH.md` holds the provenance for
*why* these choices were made.
