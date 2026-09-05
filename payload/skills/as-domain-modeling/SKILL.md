---
name: as-domain-modeling
description: Use when discussing codebase terminology, sharpening fuzzy domain language during WHAT-loop dialogue, or deciding whether a decision deserves an ADR — triggers on overloaded terms, "what do we call X", glossary work, or hard-to-reverse decisions. Do NOT use for merely reading vocabulary (any skill can do that) or for implementation detail capture (that belongs in plans). Terminates when terms are resolved and recorded.
license: MIT — ported from mattpocock/skills (© 2026 Matt Pocock), lite adaptation for the harness 2026-08-16; see LICENSE
metadata:
  author: harness (adapted)
  version: "1.0.0"
---
upstream: domain-modeling @ mattpocock/skills (MIT — © 2026 Matt Pocock), ported 2026-08-16

# Domain Modeling (lite)

Actively sharpen the domain model during design dialogue: challenge terms, stress-test relationships with invented scenarios, record resolutions the moment they crystallize.

## During the session

1. **Challenge against the glossary.** A term conflicting with recorded language gets called out immediately: "the spec glossary defines 'cancellation' as X, you seem to mean Y — which is it?"
2. **Sharpen fuzzy language.** Vague or overloaded terms get a precise canonical proposal: "'account' — do you mean the Customer or the User?"
3. **Invent concrete scenarios.** Stress-test relationships with edge cases that force precision about concept boundaries.
4. **Cross-check against code.** When a claim contradicts the code, surface it: "the code cancels entire Orders, you said partial is possible — which is right?" (dispatch scout for the check).
5. **Record inline, never batched.** Resolved terms go into the glossary the moment they settle.

## Where things live (harness mapping)

- **Glossary** → a `## Glossary` section in the effort's spec doc (`docs/spec/`) or the wayfinder map's Notes — glossary ONLY, no implementation detail.
- **ADRs** → `docs/architecture/adr/` — Nygard template + index in `docs/architecture/adr/README.md`. ADRs are written incrementally on trigger (hard-to-reverse decisions), never retrospectively. Research notes under `docs/research/` are dated, source-attributed notes — a different artifact.

## Offer an ADR only when all three hold

1. **Hard to reverse** — changing your mind later costs meaningfully
2. **Surprising without context** — a future reader will wonder "why this way?"
3. **A real trade-off** — genuine alternatives existed and one was chosen for specific reasons

Any missing → skip the ADR, record as a plain decision line instead.

## Red flags

- Batching glossary updates for "later" — capture inline or lose them
- Implementation detail leaking into the glossary
- ADR-ing reversible, obvious decisions (ceremony without value)
- Letting the human use two terms for one concept unchallenged
