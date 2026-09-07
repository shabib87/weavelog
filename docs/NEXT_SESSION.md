# NEXT_SESSION handoff — TASK-61 model-routing spike (2026-09-07)

**Where:** worktree `.worktrees/TASK-61`, branch `task/TASK-61`, based on main @ e0f686c. All changes uncommitted — **the commit is the human's gate (HITL).**
**Status:** spike CLOSED per human instruction; four-family review complete; both final reviewers verdict SHIP, zero blocking issues. Awaiting: human diff review → commit → merge → worktree removal.

## What this session produced

1. **`docs/architecture/adr/0004-model-selection-benchmark-policy.md`** (new) — the living policy: seat-weighted benchmark composite, HLE-with-tools protocol pin (Artificial Analysis = governing source), L0–L4 reviewer escalation ladder, weekly/monthly drift cadence, NORTH_STAR/PRODUCT/ROADMAP traceability table. Validated clean by `frontmatter-check.ts --schema architecture` (0 violations; 4 accepted reciprocity warnings — anchor docs are human-owned, research corpus is plain-markdown).
2. **`docs/architecture/adr/README.md`** (modified) — ADR-004 index row + related_to reciprocity.
3. **`docs/adr/README.md`** (new) — legacy-location marker: 0001/0002 frozen as provenance, do not add ADRs there.
4. **`AGENTS.md`** (modified, 1 row) — doc-hierarchy table points at `docs/architecture/adr/` (active) and marks `docs/adr/` frozen.
5. **`docs/research/2026-09-07-flagship-tier-pricing-quality-preliminary.md`** (new) — 7-candidate pricing matrix (OpenRouter-governed), HLE cross-check, role-to-tier distribution, three-family review record, AC #1 disposition.
6. **TASK-61** — closed (Done), all 6 ACs checked with explicit dispositions.
7. **TASK-75** — new Phase-2 adoption task: opencode host only (0.1.0), 6 ACs.

## Key decisions (all human-owned, dated)

- Roster: pro = deepseek-v4-pro-0813, glm-5.3, qwen3.8-2.4t-a95b, kimi-k3; fast = deepseek-v4-flash-0731, glm-5.3-flash, qwen3.8-flash. GLM 5.2 + qwen3.8-max dropped; minimax-m3 + deepseek-v4-flash-vision-exp access removed; Kimi K3 KEPT (differentiation seat).
- Conductor/default = glm-5.3-flash. Ladder L0 flash → L1 deepseek-pro (risk-signal triggers, NO line count) → L2 glm-5.3 → L3 qwen2.4t → L4 kimi-k3. Family = vendor; final approval needs a different vendor than the maker.
- Benchmarks: seat-weighted composite — TB 2.1 (implementer/scout), SWE-bench Pro (reviewer/QA), HLE-with-tools (plan-gate/security/researcher). SWE-bench Verified deprecated. HLE = the beyond-open-weights signal (AA protocol: GLM-5.3 42.3 vs Fable 5.1 59.1).
- Cadence: weekly pricing/deal sweep (bounded auto-select, ledger-logged) + blocking human brief for structural changes + MONTHLY deep refresh. Quarterly retired.
- Provider: OpenRouter primary until 0.2.0+. Host scope: 0.1.0 = opencode only; pi config deferred to 0.2.0.

## Corrections made this session (do not regress)

- **Scripts that already exist** (check before proposing new ones): `src/tools/config-sync.ts` (manifest-driven repo→live materialization; "adding a harness = adding a manifest, no code change"), `sync-model-pricing.ts`, `stack-check.ts`, `frontmatter-check.ts`, `task-validate.ts`, `worktree-create.ts`, `agents-install.ts`. The earlier "implement weavelog sync" proposal was wrong — it exists; the gap is manifest coverage (skills not wired) and pi manifest.
- **LaunchAgent/scheduled checks are EXPLICITLY OUT of v0.1.0** (ROADMAP). Weekly/monthly cadence = policy target; 0.1.0 runs sweeps on-demand (doctor/stack-check).
- **v0.3 subscription-mode constraint** (ROADMAP, non-negotiable): no cross-model OpenRouter reviewer inside subscription hosts; ladder degrades to cross-agent fresh-subagent review (Sonnet writes, Opus reviews). ADR-004 scopes the ladder to OpenRouter-mode hosts.
- **AST complexity/coupling triggers are NOT 0.1.0** — v0.1.0 check ships tests/lint/typecheck/semgrep/secrets/frontmatter/manifest only. L1 at 0.1.0 = failing tests + protected-path globs + retry-failure counts; AST deltas deferred.
- ADRs live in `docs/architecture/adr/` (AUTHORING.md, 2026-08-30), not `docs/adr/`. Next free number: 0005.
- Naming: worktrees at `.worktrees/TASK-NN` (case-sensitive-looking but macOS CI — use the TASK-NN form); branches `task/TASK-NN`.

## Open items

1. **Human gate (blocking):** diff review → commit (`docs: TASK-61 model-routing spike — ADR-004, pricing matrix, closure`) → merge to main → remove worktree.
2. **TASK-75** (created): opencode-only roster adoption per ADR-004 — includes protected-path trigger wiring, pinned OpenRouter snapshot, manifest skills coverage.
3. **Payload restructure question (open design):** per-host `config/opencode/`+`config/pi/` trees vs extending `config/harnesses/*.json` manifests over canonical `config/agents/`. Session recommendation: manifests + canonical sources (DRY; AGENTS.md already ratifies adapter pattern). Skills missing from live hosts = manifest + sync gap, not layout.
4. **Legacy ADR reconciliation** (0001/0002 → ratified index): future docs task, deliberately not done here.
5. **Deferred research:** TTFT/TPS/tool-call accuracy (telemetry), per-provider cache discounts (static card pull, TASK-75 AC #5).

## Verify commands

```bash
git -C .worktrees/TASK-61 diff            # modified files (TASK-61, AGENTS.md, adr README)
git -C .worktrees/TASK-61 status --short  # + 4 new files
node --import tsx src/tools/frontmatter-check.ts --schema architecture .worktrees/TASK-61/docs/architecture/adr
```
