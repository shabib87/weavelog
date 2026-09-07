---
date: 2026-09-06
topic: Headroom memory does not work for opencode — root cause, evidence, options
status: verified-live
sources:
  - "Live reproduction: memory_save call bounced in opencode session (2026-09-06)"
  - "~/.agents/docs/research/2026-08-28-inner-harness-proxy-plugin-design.md (include-usage patch origin)"
  - "~/.agents/docs/plans/2026-08-25-headroom-include-usage-patch.md (re-apply runbook)"
  - "https://headroom-docs.vercel.app/docs/memory (canonical memory path = Python SDK wrapper)"
  - "https://headroom-docs.vercel.app/docs/opencode (no documented opencode memory-MCP path)"
  - "https://headroom-docs.vercel.app/docs/failure-learning (learn --agent opencode writes project AGENTS.md)"
  - "/Users/shabibhossain/.local/pipx/venvs/headroom-ai/lib/python3.13/site-packages/headroom/ (source audit, v0.36.5)"
  - "https://github.com/anomalyco/opencode docs (no built-in memory feature; memory = ecosystem plugins)"
models_used_for_research:
  - z-ai/glm-5.3-flash
  - plan-gate-deepseek
  - plan-gate-qwen
  - plan-gate-kimi
supersedes: none
---

# Headroom memory does not work for opencode

## Symptom

opencode sessions intermittently fail with:

```
invalid [tool=memory_save, error=Model tried to call unavailable tool 'memory_save']
```

Reproduced live on 2026-09-06 by the conductor calling `memory_save` inside an
opencode session.

## Root cause

The launchd proxy (`com.headroom.proxy`) runs with `--memory`, which injects
memory tool schemas (`memory_save`, `memory_search`, …) into every forwarded
request ("side door"). opencode validates every tool call against its own
client-side registry and bounces anything it did not declare. Injected tools
are therefore **undeliverable in opencode** — every attempt bounces, wastes a
turn, and adds an error to conversation history.

Headroom's documented ("front door") memory path is the Python SDK wrapper
`with_memory(OpenAI(), user_id=...)` — for apps embedding an OpenAI client.
There is **no documented opencode memory integration**. The `memory.mcp_server`
module exists in the package (wired for Codex by `wrap codex --memory`) but is
undocumented for opencode.

## Evidence

- All 7 project-scoped memory DBs (`~/.headroom/memories/projects/*/memory.db`)
  contain **0 rows** after months of `--memory --memory-storage project`.
- Proxy memory-context injection has **0 successful injections ever**
  (39 `memory_inject_skipped reason=project_unresolved` in current log).
- Global `~/.headroom/memory.db` has 22 rows, all `source=traffic_learner`
  (the proxy `--learn` traffic analyzer), newest written 2026-09-06. Content is
  truncated instruction fragments, including a **semantically inverted
  permission**: "User preference: edit any file named AGENTS" (learned from
  "Do NOT edit any file named AGENTS").
- `--learn` writes to the global DB regardless of `--memory-storage project`
  (off-spec, source-verified).
- opencode has **no built-in memory**: no `memory_save` string in the installed
  binary (`/opt/homebrew/Cellar/opencode/1.18.29`), no memory feature in the
  official docs (memory is an ecosystem-plugin category, e.g.
  `opencode-supermemory`, none installed), no memory MCP server or plugin in
  any local config. The memory tools visible in session toolsets are headroom's
  injected schemas. (A reviewer's earlier claim of an "opencode native memory
  plugin" was wrong and is corrected here.)
- Docs confirm `headroom learn --agent opencode --apply` writes project
  `AGENTS.md` — colliding with `weavelog sync` materialization.
- The include-usage patch (`backends/litellm.py` + `anyllm.py` inside the pipx
  venv, forcing `stream_options.include_usage=True` for token accounting) is
  hand-applied and is **wiped by any headroom update**; re-apply runbook:
  `~/.agents/docs/plans/2026-08-25-headroom-include-usage-patch.md`. Probe:
  streamed completion through `localhost:8788` must show exactly 1 `"usage"`
  occurrence (0 = patch missing).

## What works / what does not

| Capability | Status |
|---|---|
| Proxy compression (`--mode cache` compression) | Works — $33.70 lifetime |
| Provider cache alignment + telemetry | Works — ~$103 lifetime, file-backed counters |
| Memory tool delivery to opencode (side door) | **Broken by design mismatch** — bounce |
| Memory context injection (read path) | Alive but **0 hits ever** (empty project DBs) |
| Traffic learner (`--learn`) | Produces junk into an unread global DB; AGENTS.md auto-write risk |
| Headroom memory via documented SDK path | Works — but not applicable to opencode |
| Headroom memory via `memory.mcp_server` in opencode | Works in source (2 tools: `memory_save`, `memory_search`) but **undocumented** → maintenance burden is ours |

## Review-process lesson (standing rule)

Two review rounds returned "correct, no functional risk" while real gaps
remained. Cause: reviews validated plan-internal consistency against
already-collected facts instead of (a) diffing every factual claim against the
installed source, (b) reading the vendor's own client-integration code, and
(c) inventorying everything non-standard already in the stack (hand-patched
venv files, custom routing, disabled integrations). Standing rule: **no claim
reaches the human unverified against source or docs; every flag/env is
classified global vs per-client; every store/daemon/patch the change overlaps
is inventoried first.**

## Options matrix (input for stay / leave / build decision)

| Option | Description | Gain | Cost / risk |
|---|---|---|---|
| STAY-proxy | Headroom as proxy only (drop `--memory`, `--learn` — note `--learn` implies `--memory`) | Full ~$137 savings, clean requests, documented path only | No agent memory from headroom |
| STAY+MCP | STAY-proxy + register `headroom.memory.mcp_server` as opencode MCP with pinned `--db ~/.headroom/memory.db`, add `--no-memory-tools`, prune 22 junk rows | Working memory tools in opencode, one coherent store | **Undocumented path**; breaks on upgrades (precedent: include-usage patch); we own maintenance |
| LEAVE | Remove headroom; rtk (client-side tool-output compression) + provider-native caching | Simplicity, one less daemon | Lose ~$137 measured savings incl. cache alignment; lose savings telemetry |
| BUILD | Contribute opencode memory-MCP support upstream to headroom (Codex wiring already exists in their code — small gap), or build a thin own layer | Documented path permanently; fits frontier thesis | Upstream latency; own build cost |

## Minimal change proposed (pending human approval — NOT applied)

Single flag addition to the launchd plist:

```
--no-memory-tools
```

- Stops the side-door injection → bounce disappears.
- Everything else unchanged: `--memory` stays (read-path store), `--learn`
  stays for now (writes junk to the unread global DB — harmless until anything
  reads it; removal is part of any follow-up decision), `--mode cache`
  untouched, savings untouched.
- Global flag (also affects Claude Code / Codex): verified zero tool-sourced
  memory writes ever across all clients, so functional impact ≈ nil; smoke-test
  both after reload.
- Fully reversible: remove the flag, `launchctl bootout` + `bootstrap`.

## Status

- 2026-09-06: root cause verified live; docs audited; opencode-native-memory
  claim corrected; minimal change proposed. Decision (options matrix) pending.
