---
date: 2026-09-20
topic: npm provenance and release gating — OIDC trusted publishing for v0.1.0
status: in-review
type: adr
author: conductor
related_to:
  - ../prd/2026-09-05-v010-draft-brief.md
  - ./0008-cli-distribution-contract.md
  - ../trd/cli-vision.md
  - ./README.md
sources:
  - "TASK-63"
  - "npm registry probe: npm view weavelog (2026-09-20)"
  - "https://docs.npmjs.com/trusted-publishers"
  - "https://docs.npmjs.com/generating-provenance-statements"
  - "https://github.blog/changelog/"
---

# npm publication uses OIDC trusted publishing with provenance, gated by a human marker

## Status

in-review — recorded by TASK-63; pending the human merge gate (2026-09-20).

## Context

v0.1.0 publishes `weavelog` to npm. The v0.1.0 brief mandates "npm (OIDC
trusted publishing)" and a human-controlled publication path: no tag or
publish until TASK-67 evidence is accepted and the author decides to release.

Registry facts verified 2026-09-20:

| Fact | Evidence |
|---|---|
| Package name owned | `npm view weavelog` → `weavelog@0.0.0`, dist-tags `reserved` + `latest` (placeholder "Reserved. weavelog is under development.") |
| Local toolchain | `npm 10.9.8`, `node 22.23.1` (below the trusted-publishing floor) |
| Trusted-publishing floor | npm CLI **>= 11.5.1** and Node **>= 22.14** (npm docs) |
| 2026 governance change | npm added multiple trusted publishers and staged publishing (2026-09-03) |

A long-lived `NPM_TOKEN` secret is the alternative. In 2026 several npm
supply-chain incidents (axios, and the Mini Shai-Hulud TanStack/@antv worms)
had the same root primitive: a stealable publish token. OIDC exchange removes
that primitive and grants build provenance at no cost.

## Decision

| Decision | Choice | Why |
|---|---|---|
| npm authentication | **OIDC trusted publishing** | Short-lived per-run token; no stealable secret |
| Provenance attestation | **Enabled** (`npm publish --provenance`) | Registry-signed SLSA build provenance links artifact to repo, commit, workflow |
| Publish prerequisite | **`npm-publish` environment + `WEAVELOG_PUBLISH_APPROVED` repo variable** | Two independent human acts; the gate fails closed when the marker is unset |
| Release preparation | **release-please `skip-github-release: true`** | Opens/updates the release PR; creates no tag |
| Tag / GitHub Release | **Manually dispatched `skip-github-pull-request: true` job after the publish gate** | No tag exists while the closure set is incomplete |
| Publish trigger | **`gh workflow run publish.yml` from the gated job** | A release created with `GITHUB_TOKEN` does not fire `on: release`; `workflow_dispatch` is the documented exception |
| Security scan | **semgrep exact version + `semgrep-rules` pinned by commit** | Reproducible scanner and rules; curated security rules, documented scope |
| Pinning | **Exact npm, actions pinned to commit SHAs** | Reproducible build and supply chain |

## Consequences

**Easier:**
- Publication needs no stored secret.
- Consumers can verify the artifact's repository, commit, and workflow.
- A tag or release cannot appear before the closure set is Done.

**Harder:**
- The publish job must install npm >= 11.5.1 (Node 24 may bundle an older npm).
- The trusted publisher must be configured once in the npm account (human step).
- npm provenance attestation is published only for a **public** repository;
  TASK-83 must clear public visibility before the first provenance-backed publish.
- The release-please flow is split into a prepare job and a gated release job.
- The semgrep scan runs a curated set of pinned security rules; broader rule
  triage is deferred, so the gate starts narrow.

## Alternatives considered

| Option | Verdict | Why rejected |
|---|---|---|
| Long-lived `NPM_TOKEN` secret | rejected | Stealable credential; the 2026 npm incidents' root primitive; no provenance |
| Publish directly from the release-please push | rejected | Creates the tag before any human gate or closure-set check |
| release-please default mode (`on: release` → publish) | rejected | A `GITHUB_TOKEN` release does not trigger workflows; the chain would never run |
| Registry ruleset `p/default` | rejected | Curated but mutable remote content; cannot be immutably pinned |
| Skip provenance | rejected | The PRD mandates trusted publishing; provenance is free with OIDC |
| npm >= 11.5.1 for every job | rejected | Only publication needs it; CI keeps the lockfile-producer npm 10.9.8 |

## Alignment

| Decision | Anchor |
|---|---|
| OIDC trusted publishing + provenance | NORTH_STAR "evidence over claims (receipts)"; v0.1.0 brief distribution line |
| Human marker gate | NORTH_STAR "human directs and verifies"; worktree discipline HITL gates |
| SHA-pinned actions, uv-pinned tools | PRODUCT credibility / quality bar; TASK-63 AC#1–#2 |

## References

- npm trusted publishers: https://docs.npmjs.com/trusted-publishers
- Provenance statements: https://docs.npmjs.com/generating-provenance-statements
- Task: TASK-63; implementation in `.github/workflows/ci.yml`, `publish.yml`, `release-please.yml`, `src/tools/publish-gate.ts`
- Index: [README.md](./README.md)