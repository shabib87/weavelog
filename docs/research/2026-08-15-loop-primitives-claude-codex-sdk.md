---
date: 2026-08-15
topic: Loop primitives in Claude Code, Codex, and the Agent SDK (Aug 2026)
status: verified-live
sources:
  - https://code.claude.com/docs/en/goal (fetched live 2026-08-15)
  - https://code.claude.com/docs/en/scheduled-tasks (fetched live 2026-08-15)
  - https://code.claude.com/docs/en/routines (fetched live 2026-08-15)
  - https://code.claude.com/docs/en/workflows (fetched live 2026-08-15)
  - https://code.claude.com/docs/en/auto-mode-config (fetched live 2026-08-15)
  - https://docs.claude.com/en/docs/agent-sdk/agent-loop (fetched live 2026-08-15)
  - Codex /goal: secondary sources only (GA May 2026 per blogs); primary docs NOT fetched
models_used_for_research: [moonshotai/kimi-k3, qwen/qwen3.8-2.4t-a95b]
supersedes: none
---

# Loop primitives — Claude Code, Codex, Agent SDK (verified Aug 2026)

## Claude Code /goal (verified from live docs)

A wrapper around a session-scoped prompt-based Stop hook. After each turn, a small fast model (defaults to Haiku) checks the condition against the conversation so far. Returns one of three verdicts with a short reason: NOT-YET-MET (keep working), MET (clear the goal, record achieved), IMPOSSIBLE (clear, record failed). The evaluator never runs commands or reads files — it only judges what Claude already surfaced. Spin detection: if Claude answers the evaluator without tool use for several turns, the loop stops and returns control. Compare to a Stop hook: /goal is session-scoped and model-evaluated; a Stop hook is in settings and can run a script (deterministic) or a prompt (model). Effective conditions have: one measurable end state, a stated check (npm test exits 0), constraints that must not change.

## Claude Code /loop + /schedule (verified)

/loop is a bundled skill: re-run a prompt on an interval while the session stays open. Cron under the hood (CronCreate/CronList/CronDelete tools, 5-field cron, 50 tasks/session max). Session-scoped, 7-day expiry, jitter (recurring up to 30 min offset, one-shot up to 90s). Can let Claude choose the interval dynamically (1 min to 1 hr based on observations). /schedule + Routines: cloud, persists across restarts, fresh clone, autonomous (no permission prompts), min interval 1 hour. Routines have three trigger types: schedule (cron), API (HTTP POST with bearer token, text wrapped in untrusted <routine-fire-payload> block), GitHub (pull_request / release events with filters).

## Claude Code dynamic workflows (verified)

A JS script that orchestrates subagents at scale; the SCRIPT holds the plan, branching, and intermediate results (not Claude's context). Runtime: up to 1000 agents total, 16 concurrent, resumable in-session, prefix-cache stagger (siblings wait up to 5s for the first agent's cache). 1.5M-token / 25-agent warning threshold (advisory). Bundled /deep-research. Saved workflows become /commands. Agent() spawns one; pipeline() runs one per item. No mid-run user input; no direct fs/shell from the script (agents do that). Ultracode = xhigh effort + auto workflow orchestration.

## Claude Code auto mode (verified)

NOT a loop primitive — a permission classifier. Routes tool calls through a model that blocks irreversible/destructive/external actions. Complementary to /goal (auto mode removes per-tool prompts, /goal removes per-turn prompts).

## Claude Agent SDK agent loop (verified from live docs)

receive prompt -> evaluate and respond (text + tool calls) -> execute tools -> repeat until no tool calls -> return result. Capped by max_turns (tool-use round trips) and max_budget_usd (covers subagents). Five message types: SystemMessage (init/compact_boundary/informational/worker_shutting_down), AssistantMessage, UserMessage, StreamEvent, ResultMessage. Hooks intercept/modify/block tool calls before they run. Subagents get fresh context (no parent history); only their final response returns to the parent. Automatic compaction near context limit (PreCompact hook can archive full transcript).

## Codex /goal (UNVERIFIED — secondary sources only)

Secondary blogs (dated 2026) report: /goal GA May 2026, long-running autonomous tasks, pause/resume/clear, best in full-auto mode with a clear objective. Codex CLI as MCP server + OpenAI Agents SDK for deterministic reviewable workflows. PRIMARY DOCS NOT FETCHED — do not claim parity in blog without cites.

## What this means for opencode (the target outer harness)

opencode 1.18.18 (verified by grepping app.asar 2026-08-15) ships NONE of /goal, /loop, /schedule, /workflow as user-facing commands. The @opencode-ai/plugin SDK v1.18.18 exposes no goal/loop/schedule symbols. The extension point is the plugin SDK. CRITICAL GAP (unverified): does the plugin SDK expose lifecycle hooks (pre-tool, post-task, pre-commit)? This determines whether back-pressure gates are expressible on opencode or must be conductor-side polling. This is the keystone blocker for all runtime design.
