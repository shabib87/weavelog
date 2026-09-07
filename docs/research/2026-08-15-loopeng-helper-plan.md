---
id: loopeng-helper-plan
title: Loop Engineering Helper — Implementation Plan
status: reviewer-approved-with-fixes-applied
date: 2026-08-15
review_rounds: 4
total_review_cost_usd: 0.48
reviewer_corrections_applied:
  - frontmatter is the single source for verify/rollback strings; TS phase logic reads it (DRY)
  - Phase 0 --check verifies prerequisites (bun, pipx, python3.13, op, opencode) with per-phase mapping
  - state file schema, location, idempotent-skip, and lockfile defined in Phase 0 (not ad hoc)
  - uniform rollback rule: back up pre-existing files to state-recorded paths, plain rm created files, drop secure-delete claim (APFS makes it a lie)
  - dogfooding runs on the existing live stack until Phase 5 ships reviewer-loop.ts (circularity acknowledged)
  - hook-surface spike retied to pre-runtime only; does NOT gate Phase 4 install verify
  - Phase 4 verify = file presence + jsonc parse + agent frontmatter parse (fail closed, no headless-probe assumption)
  - Phase 5 split: scripts first, scheduling second
  - Phase 3 version reads from manifest, not hardcoded "0.35.x"
  - Phase 3 lsof is diagnostic only; primary verify = curl /health + launchctl state + PID/port
  - --check exit codes: 0 healthy, 1 failed, 2 not-implemented
  - Phase 2: refuse overwrite unless forced; verify `op whoami`; record provenance/path metadata, never secret material
  - Phase 1 frontmatter added only to installer-consumed sections; unused fields removed until runtime mode activates
outer_harness: opencode
opinionated: true
target: ~/.agents/bin/agents-install.ts (install mode) + ~/.agents/loop/ (runtime mode, deferred)
depends_on:
  - ~/.agents/AGENT-STACK-RUNBOOK.md
  - ~/.agents/stack-versions.json
  - ~/.agents/docs/research/2026-08-15-addy-loop-engineering-series.md
  - ~/.agents/docs/research/2026-08-15-loop-primitives-claude-codex-sdk.md
  - ~/.agents/docs/research/2026-08-15-inner-harness-vocabulary.md
  - ~/.agents/docs/research/2026-08-15-host-state-verification.md
reviewers: [moonshotai/kimi-k3, qwen/qwen3.8-2.4t-a95b]
principles: [YAGNI, SOLID, DRY, KISS]
delivery_mode: worktree-chunked, one phase per worktree, dogfooded through the agent review loop
topic: Loop Engineering Helper — Implementation Plan
sources:
  - ~/.agents/docs/research/2026-08-15-addy-loop-engineering-series.md
  - ~/.agents/docs/research/2026-08-15-loop-primitives-claude-codex-sdk.md
  - ~/.agents/docs/research/2026-08-15-inner-harness-vocabulary.md
  - ~/.agents/docs/research/2026-08-15-host-state-verification.md
models_used_for_research: [moonshotai/kimi-k3, qwen/qwen3.8-2.4t-a95b]
supersedes: none
---

# Loop Engineering Helper — Implementation Plan

## Goal

A bun TypeScript CLI (`agents-install.ts`) that materializes and manages a deterministic inner harness (control plane) for opencode on a fresh Mac. Two modes, one deferred:
- **install mode** (`--apply`): turns the runbook into a reproducible fresh-Mac setup, phase by phase.
- **runtime mode** (DEFERRED — YAGNI trigger: install proven on a fresh Mac): drives the named flow (research->spec->...->ship) with subagents, stage by stage, writing structured artifacts to disk.

The vocabulary (see 2026-08-15-inner-harness-vocabulary.md) is shared between this tool and the blog. The names ARE the system.

## Scope corrections from 3 review rounds (~$0.41 spent)

- Caps are prose, not physics — runtime counters must live in code, not LLM context. (Caught 3x.)
- --dry-run cut (KISS for single-operator). --check (read-only) + --apply is enough.
- Manifest stays boring JSON (versions, port, URLs, labels) — NOT a mini-framework. TS code holds phase logic.
- Secrets BEFORE proxy (headroom /health needs the key).
- Fresh Mac has no backup set — secrets need explicit provenance (1Password CLI default, others behind flags).
- Rollback is NOT `cp file.bak` — it's the runbook's existing per-phase undo commands (launchctl bootout + pipx uninstall + plist removal; secure-delete for secrets) plus a state file recording created/changed paths.
- Phase 5 self-test is opt-in acceptance (`--self-test`), NOT an install gate (live LLM calls are flaky).
- Race-fix is a separate one-off script, NOT inside the installer (SRP — fresh-install tool shouldn't repair live machines).
- YAML frontmatter for the runbook is IN SCOPE now (the 2k-line file read suffers without it).

## The install phase chain (real dependencies, stated honestly)

Each phase is one worktree chunk, dogfooded through the agent review loop (scout -> implement -> reviewer -> qa) before merge. Each phase has a deterministic verify gate and a rollback (the runbook's existing undo commands, automated).

### Phase 0 — Skeleton + boring manifest + frontmatter schema + prerequisites + state file
- `agents-install.ts` with `--help` + `--check` only (read-only, no --apply yet).
- Reads `stack-versions.json` (boring: versions, port, URLs, labels — nothing else).
- `--check` verifies prerequisites (bun, pipx, /opt/homebrew/bin/python3.13, op, opencode) with a per-phase prerequisite mapping; fails fast with a clear per-phase report.
- `--check` exit codes: 0 healthy, 1 failed, 2 not-implemented.
- Defines the state file: schema, location (~/.agents/state/install-state.json), lockfile, idempotent-skip per phase, pre-change backup paths. This is what makes `--apply` re-runnable after a partial failure.
- Defines the YAML frontmatter schema for installer-consumed runbook sections (id, title, depends_on, artifacts, verify, rollback). Verify/rollback strings live in frontmatter as the single source; TS phase logic reads them (DRY).
- Verify: `--help` exits 0; `--check` reports prerequisites + "phase N: not implemented" without mutating; state file schema documented; frontmatter schema documented.

### Phase 1 — Runbook frontmatter pass (installer-consumed sections only)
- Add YAML frontmatter to the runbook sections the installer consumes (Phases 1-5, 8, verification battery, rollback index). NOT the whole 2k-line file — only the sections Phases 2-5 read.
- Frontmatter is the authoritative source for verify/rollback strings; the CLI's TS phase logic reads it. One source, two consumers (DRY).
- NOT a rewrite of the prose — only frontmatter added per section. Unused fields (e.g. runtime-only metadata) removed until runtime mode activates.
- Verify: every installer-consumed section has frontmatter; frontmatter parses; a probe query ("what is the verify command for Phase 1?") returns the answer from frontmatter alone, no prose grep.

### Phase 2 — Secrets
- Interactive import or provenance path. Default: 1Password CLI (`op read`); verify `op whoami` first. Others behind flags (iCloud path, encrypted repo).
- auth.json + context7-key + tavily-key, perms 700/600.
- Refuse overwrite unless `--force`; record provenance/path metadata in the state file, NEVER secret material.
- Verify: auth.json valid JSON with openrouter key; perms correct (700 dir, 600 files); `op whoami` authenticated.
- Rollback: plain `rm` created files (NOT secure-delete — APFS/SSD makes overwrite meaningless); restore pre-existing files from state-recorded backups.

### Phase 3 — Headroom proxy
- pipx install --python /opt/homebrew/bin/python3.13 'headroom-ai[proxy]' + write com.headroom.proxy.plist (reads port/URLs from manifest — DRY) + launchctl bootstrap.
- plist command: --backend openrouter --openai-api-url https://openrouter.ai/api/v1 --anthropic-api-url https://openrouter.ai/api/v1 --mode token --memory --memory-storage project --learn --code-graph.
- Verify (primary): curl /health healthy + version reads from manifest (not hardcoded); launchctl state = running; PID/port check confirms ONE owner on :8788 with --backend openrouter. lsof is diagnostic only (environment-sensitive).
- Rollback (runbook 1.7): launchctl bootout + pipx uninstall + plist removal.
- NOTE: the live ownership-race fix is a SEPARATE one-off script, not this phase.

### Phase 4 — opencode config
- Write opencode.jsonc (baseURL from manifest — DRY) + AGENTS.md + agents/{scout,plan-reviewer,reviewer,qa}.md.
- Validate jsonc via an inline jsonc parse (the runbook's marshaller existence is unverified — don't assume it).
- Verify: file presence + jsonc parse + agent frontmatter parse. Fail closed if unsupported. The hook-surface spike does NOT gate this phase (it gates runtime mode only).
- Rollback: plain rm created files; restore pre-existing files from state-recorded backups.

### Phase 5a — Scripts (stack-check.ts, reviewer-loop.ts, biome.json)
- Write ~/.agents/bin/{stack-check.ts,reviewer-loop.ts,biome.json}.
- Verify: `cd ~/.agents/bin && bun test` passes; `stack-check --help` exits 0; `reviewer-loop.ts --help` exits 0.
- Rollback: rm scripts; restore from state-recorded backups.

### Phase 5b — stack-check LaunchAgent
- Write com.agents.stack-check.plist + launchctl bootstrap.
- Verify: `launchctl print .../com.agents.stack-check` shows loaded.
- Rollback (runbook P8): launchctl bootout + rm plist.

### Phase 6 — --self-test (opt-in acceptance, NOT a gate)
- A toy task (write add(a,b) with a failing test) dispatched through scout -> implement -> reviewer -> qa.
- Verify: all four agents fire and produce a VERDICT; fresh test output present; the loop respects gates.
- Not required for a green install; run on demand.

## Open blocker (must resolve before runtime mode; does NOT gate install phases)

**opencode plugin SDK lifecycle hook surface.** Does @opencode-ai/plugin expose pre-tool / post-task / pre-commit hooks? This determines whether back-pressure gates are expressible on opencode or must be conductor-side polling. Resolution: a read-only capability spike (grep the SDK, read its type definitions) written as a research note in ~/.agents/docs/research/. NOT a code change. Retied to pre-runtime only — it cannot stall Phase 4 install verify (which uses file presence + jsonc parse + frontmatter parse, fail closed).

## Dogfooding protocol (how each phase ships)

Each phase is a worktree chunk, dogfooded on the EXISTING live stack (reviewer-loop.ts and the agent .md files already exist there from prior work) until Phase 5a ships the checked-in versions:
1. Conductor creates a worktree for the phase.
2. scout agent reads the phase spec (from this plan + the runbook section's frontmatter).
3. implementer agent writes the code (TDD: failing test first, watch it fail, implement, verify).
4. reviewer agents (kimi-k3 + qwen-3.8 via reviewer-loop.ts on the live stack) review the diff.
5. qa agent runs the phase's verify gate.
6. [HUMAN GATE] you approve the merge.
Circularity acknowledged: the flow tool is built using the flow. Safe because the existing live stack has the review pieces already; Phase 5a promotes checked-in copies.

## Artifacts this plan expects to exist when done

- ~/.agents/bin/agents-install.ts (the CLI, install mode)
- ~/.agents/bin/agents-install.test.ts (bun test, happy + unhappy paths)
- ~/.agents/AGENT-STACK-RUNBOOK.md (frontmatter added per section)
- ~/.agents/docs/research/2026-08-15-opencode-plugin-hook-surface.md (the capability spike)
- Extended ~/.agents/stack-versions.json (boring: versions, port, URLs, labels)

## Deferred (YAGNI, with explicit triggers)

- Runtime mode (driving the flow with subagents) — trigger: install proven on a fresh Mac.
- flow.yaml (machine-readable stage graph) — trigger: hook-surface spike passes + runtime mode activates. Generated from runbook frontmatter, NOT hand-maintained (DRY).
- artifacts-schema.md (spec.md/tests.md/results.md/verdict.md contracts) — trigger: runtime mode activates.
- Proxy-ownership race fix — separate one-off script, trigger: now (live bug), but not inside this CLI.
- Blog vocabulary doc — separate deliverable, shares the vocabulary research note.

## Review request

This is the FINAL plan before implementation. Validate against YAGNI/SOLID/DRY/KISS for an opencode-only single-operator stack. Specifically: (a) is the phase ordering correct and are dependencies honest? (b) is Phase 1 (runbook frontmatter) correctly IN scope, or is it still premature? (c) is the dogfooding protocol sound, or does it create a circular dependency (building the flow tool using the flow)? (d) is the open blocker correctly scoped as research-not-code? (e) any phase that should be split or merged? Be adversarial one last time — the author stops planning after this round and starts Phase 0.
