---
date: 2026-09-05
topic: What "supported <host>" requires for a scaffolding agent-harness CLI — tiller-ai, agent-orchestrator (AO), looprail evidence + per-host surfaces for opencode, pi, Claude Code, Codex
status: verified-live
sources:
  - https://github.com/hmSchuller/tiller-ai (README, fetched live)
  - https://github.com/Untrivial-ai/agent-orchestrator (README, fetched live)
  - https://aoagents.dev/docs/plugins/agents/ (fetched live)
  - https://github.com/saimeda32/looprail (README, fetched live)
  - https://opencode.ai/docs/ (config/rules/skills pages via context7 /anomalyco/opencode)
  - https://pi.dev/docs/latest + https://pi.dev/docs/latest/settings (fetched live)
  - https://developers.openai.com/codex/config-file/config-basic (fetched live)
  - https://raw.githubusercontent.com/openai/codex/main/docs/config.md (fetched live)
  - related, not superseded: docs/research/2026-08-16-agent-cli-portability.md (cites code.claude.com/docs/en/hooks)
models_used_for_research: [openrouter/z-ai/glm-5.3-flash]
supersedes: none
---

# "Supported <host>": what it actually requires

Verified 2026-09-05 against live sources. Three repos show two different
meanings of "supported":

- **Launcher adapter** (AO, looprail): spawn the installed CLI, read status.
  Needs binary-on-PATH, auth detection, a TUI or protocol driver. No files written.
- **Scaffolder adapter** (tiller-ai): generate config/skills/agents/hooks into
  host-specific paths. Needs a per-host file map. This is what a harness CLI means.

## Reference implementations

**tiller-ai** — shared core (`.tiller/tiller.json` manifest, TILLER.md rules,
changelog.md, tech-backlog.md) + per-host trees. Claude Code = mature;
Copilot CLI = active focus (needs an MCP server, 10 coordination tools,
because Copilot lacks native agent teams/hooks parity); OpenCode =
"scaffolded but experimental — not on the near-term roadmap".

**agent-orchestrator (AO)** — NOT a scaffolder. Daemon registry advertises 26
harnesses (claude-code, codex, opencode, pi, aider, goose, cline, ...). Contract
per host: readiness probe (supported / installed / authenticated) + spawn with
`--agent`, authoritative validation at spawn. Only 4 have structured-Chat
drivers: codex (native app-server), claude-code (claude-agent-acp), opencode
(native ACP), droid (native ACP). All others TUI-only. Uses your installed CLI
+ existing auth. `ao agent ls --refresh --json` = live catalog, not a static list.

**looprail** — adapters per README: claude-code, codex, Antigravity (Gemini),
aider, GitHub Copilot, opencode, ollama-local, any shell command. NOTE: the
dispatch claimed cursor/codex/copilot-cli — cursor is NOT in the README list.
Contract: run installed CLI non-interactively, no API keys in looprail,
`looprail doctor` = installed+logged-in probe, per-agent model/env/permissions,
fallback on 429s.

## Per-host support requirements (scaffolding harness view)

| Artifact | opencode | pi | Claude Code | Codex |
|---|---|---|---|---|
| Config file | `opencode.json` (+$schema), project or `~/.config/opencode/`; `instructions[]` globs incl. `packages/*/AGENTS.md` | `.pi/settings.json` project (deep-merges over `~/.pi/agent/settings.json`); `skills`/`extensions`/`prompts` path arrays | `.claude/settings.json` (hooks wiring) | `.codex/config.toml` project (trusted-projects only) / `~/.codex/config.toml`; `[features] hooks = true` |
| Skills | `.opencode/skills/<n>/SKILL.md`; ALSO auto-scans `.claude/skills/` and `.agents/skills/` | Agent Skills; project `.agents/skills` loaded (behind project trust); `skills` arrays; npm/git `packages` | `.claude/skills/<n>/SKILL.md` | Skills supported (/codex/build-skills page exists; not fetched this round) |
| Hooks | No native shell hooks — TS plugin, event hooks (`tool.execute.before/after`, ...) | No shell hooks — TS extensions (tools/commands/events) | settings.json: PreToolUse, PostToolUse, UserPromptSubmit, ExitPlanMode (+ more) | `hooks.json` or inline `[hooks]` — Stable per feature table; admin `requirements.toml` can force managed hooks |
| Subagents | `.opencode/agent(s)/<n>.md` frontmatter (`mode: subagent`, model, permission) or `agent{}` in config | None first-class (no subagents page in docs nav) | `.claude/agents/<n>.md` | Subagents doc page + `multi_agent` feature flag (Stable); exact file format NOT verified |
| Context file | AGENTS.md native | AGENTS.md (context files in /usage; not fetched this round) | CLAUDE.md (imports `@path`) | AGENTS.md (doc page exists in nav; content not fetched) |
| Trust gate | none beyond permissions | Project trust: `.pi/` resources + `.agents/skills` need `/trust` or `defaultProjectTrust` | none for project files | `.codex/` layers load only for trusted projects |

## One contract vs bespoke

Shareable core (one IR -> many emitters): SKILL.md skill dirs (opencode/pi/
Claude Code all read SKILL.md; opencode even reads `.claude/skills/` +
`.agents/skills/` natively), context markdown (same content, filename differs),
file manifest + readiness probe (AO supported/installed/authenticated model).
Bespoke per host, mandatory: config-file format and merge rules (JSON vs TOML,
trust conditions), hooks wiring (settings.json vs hooks.json vs TS plugin),
subagent-def frontmatter flavors. tiller Copilot adapter proves the
costliest bespoke case: any host lacking native coordination needs an MCP
bridge server. Codex hooks (hooks.json) are new-but-Stable; subagent format
unverified -> risk item.

## Effort per host (scaffolding harness)

- **opencode — M**: skills/agents are plain files, AGENTS.md native; large
  config surface; hooks only via TS plugin (skip in v1).
- **pi — S (skills+config only) / M (with extensions)**: no hook surface to
  emulate; must handle project-trust prompt in docs (`/trust`, `--approve`).
- **Claude Code — M**: richest native surface but fully documented; tiller
  proves the file map.
- **Codex — L**: TOML + new hooks system + unverified subagent format; do last.

## Minimal definition of "supported <host>" (stranger test)

A stranger runs `init --host <h>` and gets: (1) a host config file the host
actually loads (path + format verified against that host docs, not assumed);
(2) skills dropped into a path the host scans; (3) at least one enforced gate
(hook/plugin) OR a documented no-op fallback; (4) a manifest of written files
plus a doctor check: installed? authenticated? config parses? (5) tested host
version pinned in the README. "Scaffolded" alone (tiller OpenCode status)
does NOT count as supported.

## Milestone sequencing: opencode -> pi -> Claude Code -> Codex

1. **opencode first**: dogfood target (this harness runs on it); everything
   file-based; `.agents/skills` convention already in use here; produces the
   reference emitter + IR.
2. **pi second**: cheapest incremental host; validates the shared SKILL.md +
   settings.json contract on a second host with zero hook emulation; trust
   gate is a docs problem, not code.
3. **Claude Code third**: highest user value, mature documented surface,
   identical skills format — only the hooks/agents emitter is new.
4. **Codex last**: TOML config, freshly-Stable hooks, unverified subagent
   format — most moving parts; land once the contract is frozen.

## Not checked (explicit)

- pi `models.json` exact filename (Custom Models page not fetched).
- Codex subagents file format; Codex skills layout; Codex AGENTS.md content.
- Claude Code hooks schema this round (relied on tiller README + 2026-08-16 note).
- tiller actual OpenCode scaffold output (README says experimental; src not read).
