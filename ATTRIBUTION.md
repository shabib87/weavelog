# Attribution

flightlead is composition over invention. This file records what came from
where. Every skill carries its lineage in frontmatter (`license:` +
`upstream:`); technique steals carry SHA-pinned header comments.

## Upstream skill lineage

Ported from the author-instance skills catalog (the `as-` prefix marks
skills ported or distilled from upstream; harness-original skills keep clean
names; symlinked third-party skills keep their upstream names).

| Upstream | License | What came from it |
|---|---|---|
| obra/superpowers (© 2025 Jesse Vincent) | MIT | as-tdd, as-systematic-debugging, as-code-review, as-writing-skills — ported + adapted |
| mattpocock/skills (© 2026 Matt Pocock) | MIT | as-grilling, as-wayfinder, as-prototype, as-domain-modeling — ported + adapted |
| addyosmani/agent-skills (© 2025 Addy Osmani) | MIT | review depth/sizing → reviewer; LLM-security → security; contract discipline + collision evals → skill-spec; doubt-driven adversarial framing |
| DietrichGebert/ponytail (© 2026 DietrichGebert) | MIT | YAGNI ladder → implementer; canary-invariants technique |
| third-party symlinks | own terms | diagram-design, tldraw-offline — un-prefixed, canonical copies outside the repo |
| public concept-derived (CompositionalHQ/awesome-claude-skills curation, 2025-10, author unattributable) | text MIT | as-content-research-writer (text from-scratch, concept derived) |
| harness-original (this project) | Apache-2.0 | in-my-voice, prompt-triage, remove-ai-slop, simplify-language, tool-selection-rubric, verify-with-criteria, binary-doc-conversion; skill-spec core (addy distills credited in its frontmatter) |

<!-- REVIEWER: decision needed — harness-original skills were MIT in the
author instance; shipping under Apache-2.0 (per the ratified license
decision) changes their license. Confirm the relicense intent. -->

<!-- REVIEWER: decision needed — CompositionalHQ vs ComposioHQ naming: the
instance README says ComposioHQ; verify before public flip. -->

## Tool lineage

Tools flightlead installs, invokes, or composes. Licenses respected; nothing
bundled that forbids it.

| Tool | License | Relationship |
|---|---|---|
| backlog.md | MIT | installed dep — task/project management |
| difit | MIT | installed dep — diff review |
| markitdown | MIT | installed dep — document ingestion |
| headroom (proxy) | <!-- REVIEWER: decision needed — license not recorded in brief --> | installed dep — compression proxy, model routing |
| opencode | <!-- REVIEWER: decision needed — license not recorded in brief --> | composed host (v0.1) |
| pi | <!-- REVIEWER: decision needed — license not recorded in brief --> | composed host (v0.2) |
| semgrep | LGPL-2.1 | **INVOKED-NOT-BUNDLED** — invoked as a pinned external binary, never linked or distributed with flightlead |

## Inspired by

Ideas flightlead adopted, with credit:

| Source | What was adopted |
|---|---|
| tiller-ai (`hmSchuller/tiller-ai`) | managed-files manifest pattern (`flightlead.json` records managed files; update re-materializes) |
| keel (`keel-harness/keel`) | `doctor` as a stranger-facing preflight step (subcheck battery, one copy-paste fix per failure) |
| outrigger (`dwijenpatel/outrigger`) | evidence discipline: harness-vs-null measurement, run ledgers — and the lesson that process hygiene alone is not a moat |

The competitive scan behind these: `docs/research/2026-09-02-oss-agent-harnesses.md`.

## Reciprocity

flightlead exists because of MIT-licensed upstream work, a public
concept-derived curation, and ideas published by peers. Reciprocity here
means: (1) credit above, kept current as lineage grows; (2) flightlead's own
contributions ship under Apache-2.0 for anyone to reuse; (3) borrowed
techniques point at their source, pinned; (4) upstreams that asked for
nothing got credited first. If we missed an attribution, open an issue —
fixing it takes priority.
