# Author's Pi Workspace Setup

> **Snapshot as of 2026-07-22.** This is a hand-maintained inventory of the
> author's private Pi harness under `~/.pi/agent/`. It will drift. Verify
> against the live directory before relying on it. The durable, machine-checked
> version of this is the planned `weavelog check` command (Phase 4); until then,
> treat this as a dated snapshot, not a permanent source of truth.

This documents the private Pi workspace configuration used by the weavelog author.
These files live in `~/.pi/agent/`, not in the weavelog repo.

## Local extensions (`~/.pi/agent/extensions/`)

- `footer.ts` — four-line footer (session identity, model/runtime, token flow,
  cost/context/extension statuses). Spec: `docs/superpowers/specs/2026-07-07-weavelog-footer-theme-design.md`.
- `herdr-agent-state.ts` — bridges Pi agent state (working/blocked/idle) to the
  herdr pane manager over a Unix socket. Installed by herdr; managed file.
- `session-logger.ts` — session-quality telemetry. Schema designed; runtime
  dogfood gate pending. See `docs/learnings/2026-07-05-session-logger-*.md`.

## Packages (`~/.pi/agent/npm/` + `settings.json` `packages[]`)

Five npm packages and one git package:

| Package | Version | Source | Notes |
|---|---|---|---|
| `pi-subagents` | ^0.35.1 | `npm:pi-subagents` | Subagent delegation (single/chain/parallel/async). Companion to pi-intercom. |
| `pi-intercom` | ^0.6.0 | `npm:pi-intercom` | Supervisor bridge for pi-subagents. See `docs/learnings/2026-07-22-pi-subagents-intercom-fix.md`. |
| `pi-diff-review` | ^0.1.26 | `npm:pi-diff-review` | Diff review. |
| `pi-web-access` | ^0.13.0 | `npm:pi-web-access` | `web_search` + `fetch_content` tools. Installed 2026-07-22. See `docs/learnings/2026-07-22-pi-web-access-install.md`. |
| `@ryan_nookpi/pi-extension-headroom` | ^0.1.5 | `npm:@ryan_nookpi/pi-extension-headroom` | Context compression. **Deprecated** per package README (npm registry `deprecated` field is NOT set). Headroom proxy itself is separate; see below. |
| `superpowers` | git main | `git:github.com/obra/superpowers` | Skills framework (brainstorming, TDD, debugging, plans, etc.). Not npm. |

## Settings highlights (`~/.pi/agent/settings.json`)

- `defaultModel`: `moonshotai/kimi-k3` (changed from `z-ai/glm-5.2` on
  2026-07-22; see `docs/research/model-selection.md` and `~/.pi/agent/models.md`)
- `defaultProvider`: `openrouter`
- `defaultThinkingLevel`: `high`
- `enabledModels`: `z-ai/glm-5.2`, `moonshotai/kimi-k3`, `deepseek/deepseek-v4-pro`,
  `deepseek/deepseek-v4-flash`, `moonshotai/kimi-k2.7-code`, `openai/gpt-5.5`,
  `anthropic/claude-fable-5`
- `compaction`: enabled, reserveTokens 16384, keepRecentTokens 20000
- `retry`: enabled, maxRetries 3
- `quietStartup`: false
- `theme`: `weavelog-dark`

## State files and directories (`~/.pi/agent/`)

- `AGENTS.md` — global agent constitution (loaded first by Pi; applies to every
  project unless a project-root AGENTS.md overrides).
- `intercom/` — pi-intercom broker runtime state (`broker.pid`, `broker.sock`).
  Populated when a subagent session is active.
- `run-history.jsonl` — subagent run log (agent, task, status, duration).
- `models.md` — model registry (codex profile naming, tier framing,
  default-vs-advisor split). Updated 2026-07-22.
- `models-store.json` — cached model catalog from OpenRouter live API.
- `themes/weavelog-dark.json` — custom theme (see below).
- `bin/`, `skills/`, `sessions/` — standard Pi runtime dirs.

## weavelog-dark theme

Based on Pi's built-in `dark` theme with a custom palette:

- dim teal (`#56b6c2`) → `accent`
- dim dark green (`#608b4e`) → `success`
- dim orange (`#d19a66`) → `warning`
- dim red (`#cc6666`) → `error`
- warm white (`#d4d4d4`) → `text`
- dim white (`#a0a0a0`) → `muted`
- gray (`#666666`) → `dim`

## Footer layout

Four lines:

1. Session identity: branch, turns, mode, model
2. Model/runtime: model, thinking level, active tools count
3. Token flow: input, output, cache-read, cache-hit rate
4. Cost/pressure/extensions: cost, context usage, extension statuses

## System stack (external to `~/.pi/agent/`)

For the broader system stack (Pi host, headroom proxy, markitdown, codex), see
`docs/research/2026-07-04-harness-setup-and-pmf-synthesis.md` §9. Headroom
proxy runs launchd-managed as `com.headroom.proxy` on port 8788
(`--memory --memory-storage project --learn`), separate from the deprecated
npm extension above.

## Future

This setup may become a distributable Pi package when weavelog is ready to offer
it to users. Until then, it is author-only configuration.
