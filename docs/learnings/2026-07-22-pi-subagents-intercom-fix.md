# 2026-07-22 — pi-subagents reviewer "unavailable child tools: intercom" fix

## Findings

- The pi-subagents bundled `reviewer` agent declares
  `tools: read, grep, find, ls, bash, edit, write, intercom` in its frontmatter.
  In pi-subagents, `tools` is a strict allowlist validated at child startup
  (`src/runs/shared/tool-availability.ts`); it does not load extension code.
- `intercom` is the supervisor messaging tool (child asks parent mid-run).
  Providers: the `pi-intercom` extension (nicobailon/pi-intercom, v0.6.0 as of
  this date) or pi-subagents' own native fallback.
- The native fallback registers `intercom` only at `before_agent_start`, but the
  tool-availability diagnostic runs at `session_start`
  (`subagent-prompt-runtime.ts`). Without pi-intercom installed, the diagnostic
  sees `intercom` missing and the parent aborts the run instantly (742 ms).
- Fix (Option B): `pi install npm:pi-intercom` added `pi-intercom@^0.6.0` to
  `~/.pi/agent/npm/package.json`. It registers `intercom` unconditionally
  (`index.ts:1306`) and `contact_supervisor` for child sessions
  (`index.ts:1031`), synchronously at extension load, so no race remains.
- Web verification (2026-07 norms): canonical install is `pi install
  npm:pi-intercom`; pi.dev lists it as a package; pi-subagents docs/changelog
  treat pi-intercom as the companion extension for the intercom bridge.

## Decisions

- Chose installing pi-intercom (Option B) over stripping `intercom` from the
  reviewer's tools, to keep the supervisor-escalation workflow available.

## Corrections

- Subagent model override `z-ai/glm-5.2` failed with "No API key found for
  nvidia". Fully qualified `openrouter/z-ai/glm-5.2` works. GLM 5.2 routes
  through OpenRouter in this setup (`~/.pi/agent/models-store.json`,
  `OPENROUTER_API_KEY` env); bare `z-ai/...` is misresolved by the subagent
  launcher.

## Verification evidence

- Fresh-context GLM 5.2 reviewer subagent (the exact config that failed)
  launched successfully and confirmed: `intercom` in toolset,
  `pi-intercom@^0.6.0` declared, reviewer.md allowlist satisfied.
  Verdict: FIXED.

## Residual risks

- If pi-intercom fails to load at runtime (peer dep or init error), the same
  fail-fast error returns. The strict diagnostic has no fallback registration;
  considered acceptable (fail-fast with clear remediation).
- `contact_supervisor` is not in the reviewer allowlist, but is available in
  child sessions anyway; deliberate, not a defect.

## Blog candidates

- "Strict tool allowlists vs. extension loading: a 742 ms subagent failure"
  (allowlist semantics, registration ordering, fail-fast diagnostics).
- Model routing gotcha: bare `z-ai/glm-5.2` vs. fully qualified
  `openrouter/z-ai/glm-5.2` in pi-subagents overrides.
