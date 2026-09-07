---
date: 2026-08-30
topic: Architecture Decision Record index
status: draft
type: adr
author: conductor
related_to:
  - ../README.md
  - ./0004-model-selection-benchmark-policy.md
  - ../loop-factory.md
  - ../../AUTHORING.md
sources:
  - "TASK-15"
---

# Architecture Decision Records (ADR) index

ADRs are added **incrementally on trigger** — do NOT create retrospective ADRs. An ADR
is written when a decision is made that is hard to reverse and worth recording for
future agents/humans.

## Index

| ADR | Topic | Status | Added |
|---|---|---|---|
| ADR-001 | scripts-not-CLI (deterministic TS via bun, not shell CLI artifacts) | (planned) | trigger: next architecture decision |
| ADR-002 | conductor-dispatch (subagents return findings, conductor writes state) | (planned) | trigger: next architecture decision |
| ADR-003 | three-phase model (WHY/WHAT/HOW phases × inner/outer loop roles) | (planned) | trigger: when recorded in an ADR — consensus already restored in loop-factory.md + TASK-15 |
| ADR-004 | model-selection benchmark policy (seat-weighted composite; HLE protocol pin; L0–L4 reviewer escalation; weekly/monthly drift cadence) | in-review | 2026-09-07 |

> Note: ADR-003's content already exists as the restored 3-reviewer consensus in
> [loop-factory.md](../loop-factory.md) and TASK-15. The ADR is the formal record; write
> it on the next trigger rather than retrospectively.

## Nygard template

```markdown
# Title

## Status

draft | in-review | approved | superseded | archived

## Context

The forces at play and why the decision is being made.

## Decision

The change we are committing to.

## Consequences

What becomes easier, and what becomes harder.
```

## Writing an ADR

1. Copy the Nygard template into `docs/architecture/adr/NNNN-<slug>.md`.
2. Fill frontmatter per the architecture schema (date, topic, status, type: adr, author, related_to, sources).
3. Add the entry to the index table above.
4. Add reciprocal `related_to` links to linked docs.

## References

- Authoring rules: [AUTHORING.md](../../AUTHORING.md)
- Nygard template source: [https://github.com/joelparkerhenderson/architecture-decision-record](https://github.com/joelparkerhenderson/architecture-decision-record)
