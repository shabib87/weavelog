# 2026-07-22 — MoE orchestration audit of loopeng (conductor: Kimi K3)

Raw session material. Not polished. Feeds future blog posts and Phase 1.95 planning.

## Method

Mixture-of-experts fanout via pi-subagents, all open-weight models, fresh
context, read-only, single-block parallel dispatch (run 07c3937f):

| Expert | Model | Domain | Outcome |
|---|---|---|---|
| scout | GLM-5.2 | docs/state coherence | completed, all findings conductor-verified |
| reviewer | DeepSeek v4 Pro | code/tests/verification gates | completed, ran real commands |
| reviewer | Kimi K2.7-Code | pi-subagents setup alignment | completed |
| researcher | DeepSeek v4 Flash | model landscape | FAILED: builtin researcher requests web_search/fetch_content/get_search_content, none installed |

Conductor spot-verified every load-bearing claim against the repo. One expert
error caught: AGENTS.md is 107 LOC (expert claimed 200+).

## Findings

### Code reality (DeepSeek v4 Pro, conductor-verified)
- `src/cli/index.ts` is a ~20-line stub. No `check`, no `init`.
  `src/extension/` does not exist.
- `biome.json` and `.github/workflows/` are claimed in AGENTS.md repo layout.
  Neither exists.
- `tsc --noEmit` and test suite cannot run: `typescript`/`@types/node` unmet,
  `tsx` used in commands but never declared as dependency. No node_modules.
- Only test file is a comment admitting a TDD violation (self-tracked in
  PROGRESS as Session Logger Derailment).

### Docs reality (GLM-5.2, conductor-verified)
- README: 2 broken doc links (docs/RESEARCH.md, docs/adr.md), wrong TBD count
  (says 3, actual 6), stale status line, presents unresolved npm-vs-Homebrew
  TBD as decided.
- INDEX.md stale by 7 files (4 learnings, 1 research, 2 plans).
- No NORTH_STAR non-negotiable violations. Doc hierarchy disagrees with
  itself only on staleness, not substance.

### pi-subagents setup gaps (Kimi K2.7-Code, conductor-verified)
- No `.pi/agents/`, `.pi/skills/`, `.pi/chains/`, `.pi/settings.json`,
  no workflow JSON with schemaVersion. All claimed as standards in AGENTS.md.
- `.pi-subagents/` artifacts are NOT gitignored (this session wrote
  transcripts into the repo tree). `.gitignore` covers `.pi/logs/` etc. only.
- Builtin `researcher` is broken in this runtime (missing web tools). Fix:
  install a web tool extension AND/OR override
  `subagents.agentOverrides.researcher.tools` to actual registered names.
- No `subagents.defaultModel` / `modelScope`: children inherit whatever the
  parent runs; enabledModels mixes open-weight and frontier with no policy.

### Git compliance check (conductor)
- Last 20 commits: 100% Conventional Commits. Author identity redacted.
- Gaps: commit-msg hook still pending (manual discipline), `loopeng check`
  does not exist (manual sanitization).

### Strategic finding
- PRODUCT.md dogfooding principle ("loopeng builds loopeng from v0.4") is
  currently falsified: no `.pi/agents/`, no chains, no working gates.
  Fastest path back to thesis-true: Phase 1.95 (make documented gates real)
  + `.pi/` dogfood artifacts, making the repo its own first proof project.

## Decisions

1. **MoE roster (Layer 2 default, evolving with releases):**
   - Conductor/oracle/synthesis: Kimi K3
   - General expert (docs, code review, verification): GLM-5.2 (author's #2)
   - Tooling/pi-alignment specialist: Kimi K2.7-Code (earned via evidence)
   - Budget recon: DeepSeek v4 Flash (optional, untested)
   - DeepSeek v4 Pro: dropped/reserved unless GLM-5.2 underperforms on gates
   - All fanouts open-weight only. Frontier = targeted escalation per
     NORTH_STAR. Model IDs are Layer 2; the tier pattern is Layer 1.
2. **Plugin vetting gate before any install:** stars, contributors, commit
   frequency, release cadence. No unmaintained dependencies. Candidates:
   pi-web-search, @heyhuynhgiabuu/pi-search, @rjshrjndrn/pi-fetch.
3. **Addy Osmani loop-engineering alignment research commissioned** (8 posts
   since 2026-06-07, addyosmani.com/blog) as second MoE fanout.
4. Deferred pending author approval: `.pi/settings.json`, dogfood agent
   files, biome.json, CI, README/INDEX fixes, any `pi install`.

## Corrections

- AGENTS.md LOC is 107, compliant with <200 standard (expert error).
- Earlier README status "Implementation not started" is accidentally more
  true than PROGRESS implies, but for the wrong reasons (gates don't run).

## Blog candidates

1. "I audited my agentic-workspace repo with a mixture-of-experts fanout of
   open-weight models. The docs were excellent; the product didn't exist."
2. "Dogfooding falsification: the day my own product principle failed its
   own audit" (PMF thesis as executable check).
3. "Vetting agent plugins like dependencies: stars, commit cadence, and the
   strict-allowlist failure mode" (researcher tool bug as case study).
4. "Conductor patterns with Kimi K3: fresh-context children, compact
   contracts, status-before-steer, supervisor-reply-before-resume."
