---
date: 2026-08-15
topic: Unified sequencing of two plans — loopeng-helper-plan + headroom-fix-plan
status: reviewer-approved-with-fixes-applied
reviewers: [z-ai/glm-5.2, moonshotai/kimi-k3, qwen/qwen3.8-2.4t-a95b]
review_rounds: 1
total_review_cost_usd: 0.08
reviewer_corrections_applied:
  - two tracks: build-time (live Mac) and install-time (fresh Mac), tagged per step (was one conflated linear list)
  - step 0 (git init) defines .gitignore + secret scan BEFORE the baseline commit; baseline commit must be green (27 tests pass)
  - enforce.ts is state-agnostic (fail-open unconditionally) in its initial version — the state-file-vs-hooks ordering constraint is deleted
  - step 1 ships frontmatter-check.ts schema + fixtures + failing tests BEFORE normalizing docs
  - step 8 split: 8a headroom install+start, 8b headroom acceptance probe (needs opencode from 9 first)
  - step 2 (plist template fix) dropped — already live-fixed, not a forward step
  - hooks need explicit bypass/disable flags + recovery runbook before activation
  - step 10 references a single manifest entry, not a re-listed script set (DRY)
  - rollback scope softened: git tracks ~/.agents only; LaunchAgents/1Password/opencode config live elsewhere and need per-step rollback notes
  - existing live install needs manifest adoption/drift check before self-test so the installer is not a second source of truth
  - deferred-phase triggers marked "manual decision after N sessions" until a token counter exists
sources:
  - ~/.agents/docs/research/2026-08-15-loopeng-helper-plan.md (my installer CLI plan)
  - ~/.agents/docs/plans/2026-08-15-headroom-fix-plan.md (other agent's headroom utilization + hooks plan)
  - ~/.agents/docs/research/2026-08-15-headroom-sdk-utilization.md (40-page docs synthesis)
  - ~/.agents/docs/research/2026-08-15-opencode-cache-root-cause.md (resolved cache fix)
  - ~/.agents/docs/research/2026-08-15-inner-harness-layers.md (the two-axis layering)
models_used_for_research: [z-ai/glm-5.2]
supersedes: none
---

# Unified sequencing — two plans, one stack

## What exists now (verified 2026-08-15)

Two OPEN plans overlap:
- **Plan A (loopeng-helper-plan.md)** — the installer CLI: materializes the inner harness on a fresh Mac (Phase 0 skeleton + manifest + state file; Phase 1 runbook frontmatter; Phase 2 secrets; Phase 3 headroom; Phase 4 opencode config; Phase 5 scripts; Phase 6 self-test). Install mode. Runtime mode deferred.
- **Plan B (headroom-fix-plan.md)** — headroom utilization + enforcement: Phase 0 frontmatter-check.ts + doc normalization; Phase 1 headroom-compress.ts helper; Phase 2 opencode enforcement hooks plugin (enforce.ts); Phase 3 Serena code-graph eval; Phase 4 failure learning; Phase 5 inter-agent compression; Phase 6 optimizations.

ALREADY DONE (do not re-plan):
- Cache bug fixed: --mode cache live, cache_read_tokens 0 -> 56,012 (resolved)
- Ownership race fixed: pi extension autoStart=false, launchd sole owner of :8788
- /dashboard documented in runbook (4 locations)
- ~/.agents/bin restructured: src/ + test/ + AGENTS.md, 27 tests green
- cache-probe.ts + prefix-diff.ts built and tested
- Runbook updated to 2224 lines with the above
- opencode hook surface VERIFIED: @opencode-ai/plugin exposes tool.execute.before/after, event, experimental.chat.messages.transform

STILL MISSING (not in either plan):
- **git init ~/.agents** — neither plan addresses that ~/.agents is untracked. All worktree dogfooding is blocked. The other agent built 27 tests + 5 scripts + restructured bin/ with NO version control. This is the risk the user flagged.

## Overlaps and conflicts

1. **Frontmatter**: Plan A Phase 1 adds frontmatter to the runbook. Plan B Phase 0 builds frontmatter-check.ts (the validator) + normalizes existing docs. Sequence: B Phase 0 first (build the tool), then A Phase 1 (add frontmatter the tool validates). Reversed, you'd add frontmatter with no validator.
2. **Scripts**: Plan A Phase 5 installs scripts. Plan B already restructured them and added 2 new ones. Plan A's Phase 5 is now partially done; it should install what B built, not re-write.
3. **Hooks**: Plan B Phase 2 (enforce.ts) resolves Plan A's "open blocker" (hook surface). A's runtime mode is now unblocked by B's work. B should ship before A's runtime mode.
4. **Headroom**: Plan A Phase 3 installs the proxy. Plan B assumes it's already running (it is, on the live machine). On a fresh Mac, A Phase 3 must run before any B phase that probes /health.
5. **State file**: Plan A Phase 0 defines the state file. Plan B Phase 0 doesn't. But B's enforce.ts (Phase 2) needs to know about state for fail-open behavior. A's state file should land before B's hooks, OR B's hooks must be state-agnostic (fail-open without it).

## Proposed unified sequence (what after what) — two tracks

### TRACK 1: build-time (live Mac — where the code gets written and tested)

```
B0.  git init ~/.agents + .gitignore (state/, logs/, *.env, node_modules, secrets) + secret scan + baseline commit  [PREREQUISITE — neither plan, unblocks all worktree dogfooding]
       gate: `cd ~/.agents/bin && bun test` green (27 tests) before the baseline commit
B1.  frontmatter-check.ts (schema + fixtures + failing tests FIRST, then impl, then normalize existing docs)  [Plan B Phase 0 — the tool before the content]
B2.  headroom-compress.ts helper (POST /v1/compress via fetch, fail-open, no SDK)  [Plan B Phase 1]
B3.  enforce.ts hooks plugin (state-agnostic, fail-open; bypass/disable flags + recovery runbook before activation)  [Plan B Phase 2 — resolves the hook blocker]
B4.  agents-install.ts skeleton + manifest + prereq checks + state file schema  [Plan A Phase 0 — the installer shape, read-only --check]
     NOTE: enforce.ts (B3) is state-agnostic, so B4's state file is not a prerequisite for B3. B4 wires state into a later enforce.ts revision.
```

### TRACK 2: install-time (fresh Mac — where the stack gets materialized)

```
I1.  secrets via 1Password CLI (op whoami first; refuse overwrite unless --force; perms 700/600)  [Plan A Phase 2]
I2.  headroom install (pipx + plist from manifest + launchctl bootstrap)  [Plan A Phase 3 — 8a: install + start]
I3.  opencode config (opencode.jsonc + AGENTS.md + agents/*.md; jsonc validated)  [Plan A Phase 4]
I4.  headroom acceptance probe (curl /health via the proxy; one owner on :8788)  [Plan A Phase 3 — 8b: needs I3's opencode as the test client]
I5.  scripts + stack-check LaunchAgent (reference manifest entry, not a re-listed set)  [Plan A Phase 5 — installs what B2-B4 built]
I6.  manifest adoption/drift check (the live install is unmanaged; reconcile against the manifest so the installer is not a second source of truth)  [reviewer addition]
I7.  --self-test (opt-in acceptance: toy task through scout->implement->review->qa)  [Plan A Phase 6]
```

### DEFERRED (YAGNI — trigger-gated, manual decision after N sessions until a token counter exists)

```
D1.  Serena code-graph evaluation        [trigger: scouts burning excessive tokens — manual decision]
D2.  failure learning (headroom learn)    [trigger: next autonomous session]
D3.  inter-agent compression (MCP CCR)    [trigger: handoffs >5K tokens — manual decision]
D4.  optimizations (CCR TTL, npm SDK cleanup)  [trigger: runs >30 min OR workspace cleanup]
```

### RUNTIME MODE (Plan A, deferred — trigger: install proven on fresh Mac)

```
R1.  goal/loop/workflow primitives (the CLI as runtime, not installer)
```

## Key sequencing rules

- **Step 0 (git init) blocks everything.** No worktree dogfooding, no diff, no rollback until ~/.agents is tracked. This is the user's flagged risk.
- **Step 1 (frontmatter-check.ts) before Step 3 (runbook frontmatter).** Build the validator before the content it validates.
- **Steps 7-8-9 (secrets -> headroom -> opencode) are a hard chain.** Headroom /health needs the key; opencode needs the proxy baseURL.
- **Step 6 (enforce.ts) can run on the live machine immediately** (it's an opencode plugin, doesn't touch the proxy). On a fresh Mac it needs Step 9 (opencode config) first. So: build + test on live (step 6), install on fresh Mac (after step 9).
- **Steps 12-15 (Plan B deferred phases) are independent of the installer.** They improve the live stack and can run in parallel with fresh-Mac install work.

## Review request (3 reviewers: glm-5.2, kimi-k3, qwen-3.8)

Validate this unified sequence against YAGNI/SOLID/DRY/KISS and the two source plans. Specifically:
(a) Is step 0 (git init) correctly the first step, or is there something even smaller?
(b) Is the frontmatter-tool-before-frontmatter-content ordering (step 1 before 3) correct?
(c) Is the secrets->headroom->opencode chain (7-8-9) the right order, or should opencode config come before headroom (so there's a client to test the proxy with)?
(d) Can steps 5-6 (headroom-compress + enforce.ts) run on the live machine BEFORE the installer exists (step 4), or do they need the state file / manifest first?
(e) Are the deferred phases (12-15) correctly trigger-gated, or should any be pulled forward?
(f) Is anything in either source plan MISSING from this sequence?
(g) Does this sequence create any circular dependency (building the flow tool using the flow)?
Be adversarial — the author has two plans and needs ONE sequence, not a third plan.
