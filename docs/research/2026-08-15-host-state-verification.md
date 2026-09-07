---
date: 2026-08-15
topic: Host state verification — headroom proxy, opencode, pi, the ownership race
status: verified-live
sources:
  - live shell probes run 2026-08-15 (launchctl, lsof, curl, ps, plutil, app.asar grep)
models_used_for_research: [z-ai/glm-5.2]
supersedes: none
---

# Host state verification (2026-08-15)

## Headroom proxy (verified live)

- headroom 0.35.0, pipx-installed with python3.13, binary at ~/.local/bin/headroom
- launchd service com.headroom.proxy loaded, pid 72977 (parent launchd), KeepAlive
- /health: healthy, version 0.35.0, backend=openrouter, memory=true, learn=true
- /dashboard returns 200 (HTMX/Alpine SPA) — NEVER mentioned in the runbook
- /stats returns live compression data (api_requests incrementing)
- plist on disk: --host [LAN IP] --port 8788 --backend openrouter --openai-api-url https://openrouter.ai/api/v1 --anthropic-api-url https://openrouter.ai/api/v1 --mode token --memory --memory-storage project --learn
- Running process: parent=launchd (pid 1), XPC_SERVICE_NAME=com.headroom.proxy

## The proxy-ownership race (verified live, silent-degrade bug)

Two systems own port 8788:
1. The runbook's hand-written launchd plist (com.headroom.proxy) — full command with --backend openrouter, --memory, --learn.
2. The pi extension @ryan_nookpi/pi-extension-headroom (installed in ~/.pi/agent/settings.json line 29) — auto-spawns its own proxy on :8788 with a STRIPPED command (proxy --host [LAN IP] --port 8788 --mode token --no-cache — no --backend, no upstream URLs, no memory/learn).

Coordination is via a beacon lock (~/.headroom/.beacon_lock_8788). If the pi extension wins the lock, opencode traffic routes to api.openai.com (default) instead of OpenRouter, and the OpenRouter key fails silently. Observed in this session: at one point pid 72977 was parented by `pi` (pid 72913) with the stripped command; later pid 74817 was parented by launchd with the full command. Which wins depends on startup ordering. The runbook documents only the launchd path and never mentions the extension or the beacon lock.

## opencode (verified live)

- App version 1.18.18 (defaults read CFBundleShortVersionString)
- app.asar grep for /goal, /loop, /schedule, /workflow, create_goal: NONE present as user-facing commands. The "workflow"/"schedule" strings in the binary are internal (effect library Schedule, sessionWorkflows Map).
- @opencode-ai/plugin SDK v1.18.18: grep for goal/loop/schedule symbols = none.
- opencode.jsonc: provider.openrouter.options.baseURL = http://localhost:8788/v1; model = openrouter/z-ai/glm-5.2; small_model = openrouter/deepseek/deepseek-v4-flash; plugin = superpowers@git+...; MCP servers: context7, tavily, semgrep, headroom, chrome-devtools (disabled); permission tavily_* = ask.
- Agents dir: scout.md, plan-reviewer.md, reviewer.md, qa.md (all mode: subagent, steps: 30, edit deny except qa which allows test globs).
- UNVERIFIED: does @opencode-ai/plugin expose lifecycle hooks (pre-tool, post-task, pre-commit)? This is the keystone blocker for runtime design.

## pi (verified live, NOT the target outer harness)

- pi core: no goal/loop/schedule/workflow by design (README: "skips features like sub agents and plan mode").
- Installed packages: pi-subagents, pi-intercom, pi-mcp-adapter, @ryan_nookpi/pi-extension-headroom.
- pi-subagents provides: workflowScript, runs.run / runs.all, schedule.create, missions with goal:true + token budget.
- Extension examples shipped (not installed): plan-mode/, subagent/, handoff.ts, todo.ts, permission-gate.ts, bash-spawn-hook.ts, file-trigger.ts.

## Runbook gaps found during verification

- /dashboard URL undocumented (runbook Phase 1.4 lists /health, /stats, /livez, /readyz, /metrics — never /dashboard).
- sync-model-pricing.ts exists on disk (~/.agents/bin/) but is never referenced in the 1983-line runbook — DRY violation in its own doc.
- Proxy-ownership race undocumented (above).
- "Enforcement is physics, not prompts" (runbook line 775) is overstated: edit:deny is opencode LLM-respected policy, not kernel/sandbox enforcement. Runbook line 779 claims caps "match harness stop-hook defaults" but no stop-hook is shipped.
