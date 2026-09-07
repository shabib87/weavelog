---
date: 2026-08-16
topic: Harness CLI — design spec
status: open
author: conductor session
sources:
  - ~/.agents/docs/research/2026-08-16-agentsmd-hygiene.md
  - ~/.agents/docs/research/2026-08-16-agentsmd-root-vs-subdirs.md
  - ~/.agents/docs/research/2026-08-16-primitive-selection.md
  - ~/.agents/docs/research/2026-08-16-model-tiered-agents.md
models_used_for_research: []
supersedes: none
---

# Harness CLI — design spec

## 1. Purpose

A bun + TypeScript CLI that installs an opinionated "inner harness" of agentic primitives onto a Mac and scaffolds agentic structure into projects. The harness uses opencode + open-weight models via OpenRouter. The tool is opinionated: it overwrites (with backup), does not merge, and ships all content bundled. It exists so a new Mac or project reaches a working conductor-based agent setup in one command instead of manual config assembly.

## 2. Design principles

- **Opinionated** — the harness is canonical. Tool overwrites, does not merge. No conflict UI. Rationale: target users have fragments, not working harnesses; merge logic is speculative complexity.
- **Backup-before-overwrite** — any file the tool replaces is copied to `<file>.bak` first. Only safety mechanism. Rationale: simple, reversible; defers additive logic until evidence demands it.
- **YAGNI** — no additive/merge/remote-fetch/plugin-marketplace. Each deferred item has a named trigger (section 9).
- **Semver** — version tags (x.y.z). `update` checks latest tag. One artifact = one version.
- **Bundled content** — skills, hooks, scripts, AGENTS.md, runbook all ship inside the CLI package. Rationale: harness is small and evolves together; split-to-remote trigger is "skill updates require a tool bump that feels excessive."
- **bun + TypeScript** — per scripting standard: durable scripts are TS executed by bun, biome-formatted, with --help, explicit exit codes, structured output, happy + unhappy path tests under `bun test`.

## 3. Directory model

### 3.1 Machine layout (`~/.agents/` and `~/.config/opencode/`)

| Path | What | Owner | init | update | doctor |
|------|------|-------|------|--------|--------|
| `~/.agents/AGENTS.md` | Canonical global agent protocol (conductor, principles, scripting, routing, comms) | TOOL | create | overwrite (bak) | validate |
| `~/.config/opencode/AGENTS.md` | SYMLINK → `~/.agents/AGENTS.md` (adapter, NOT a duplicate) | TOOL | create symlink | verify symlink | verify symlink |
| `~/.agents/skills/<name>/SKILL.md` | On-demand procedures | TOOL | create | overwrite (bak) | validate present |
| `~/.agents/bin/*.ts` | bun-executed durable scripts | TOOL | create | overwrite (bak) | validate + run |
| `~/.agents/AGENT-STACK-RUNBOOK.md` | Model stack, rollback, re-derivation protocol | TOOL | create | overwrite (bak) | validate |
| `~/.agents/research/index.md` | Research hub entry point | TOOL/USER | create skeleton | never touch (see §3.3) | validate |
| `~/.agents/research/*.md` | Dated research entries | USER/AGENT | none | never touch | list |
| `~/.config/opencode/plugins/*.ts` | Hooks (deterministic gates) | TOOL | create | overwrite (bak) | validate registration |
| `~/.config/opencode/opencode.jsonc` | opencode config (MCP, model routing, plugins) | USER | create if absent | never overwrite | validate keys |

**Key rule**: `~/.config/opencode/AGENTS.md` is a symlink, not a file. opencode unions AGENTS.md files and resolves no conflicts (per `2026-08-16-agentsmd-root-vs-subdirs.md`), so a duplicate file drifts within a week. If a regular file exists at install time, `init` backs it up and replaces with the symlink.

**opencode.jsonc handling**: `init` creates it with defaults if absent. If present, `init` does NOT touch it. `doctor` checks for required keys (model routing, plugin path, MCP servers) and flags missing ones — never auto-edits user config.

### 3.2 Project layout (`scaffold`)

| Path | What | scaffold action |
|------|------|----------------|
| `<project>/AGENTS.md` | Project-specific FACTS (stack, conventions, structure) — NOT conductor protocol | backup + overwrite |
| `<project>/docs/research/index.md` | Project research hub entry point | create (never overwrite if exists) |
| `<project>/docs/research/*.md` | Dated research entries | none (user/agent owns) |
| `<project>/docs/logs/` | Session logs, run history | create dir |
| `<project>/<subdir>/AGENTS.md` | Subpackage facts (only on genuine stack divergence) | SUGGEST only — print recommendation, do not create |

**Global vs project split** (per research): conductor protocol, principles, model routing, scripting standard = GLOBAL (`~/.agents/AGENTS.md`). Project stack, conventions, structure, dependencies = PROJECT (`<project>/AGENTS.md`). Never duplicate conductor rules at project level.

**Subdir AGENTS.md**: only when a subpackage has genuine stack divergence (different language/framework/test-runner). `scaffold` detects monorepo structure and prints a recommendation like "packages/api/ uses Python+pytest — suggest `packages/api/AGENTS.md`". Does not auto-create.

### 3.3 Ownership & overwrite policy

| Path | Policy |
|------|--------|
| `~/.agents/AGENTS.md` | backup + overwrite (tool owns canonical version) |
| `~/.config/opencode/AGENTS.md` | replace regular file with symlink (backup first) |
| `~/.agents/skills/**` | overwrite (tool owns) |
| `~/.agents/bin/**` | overwrite (tool owns) |
| `~/.agents/AGENT-STACK-RUNBOOK.md` | overwrite (tool owns) |
| `~/.agents/research/index.md` | create if absent; if present, NEVER overwrite (user/agent may have appended entries) |
| `~/.agents/research/*.md` (dated) | never touch (user/agent authored) |
| `~/.config/opencode/plugins/**` | overwrite (tool owns hooks) |
| `~/.config/opencode/opencode.jsonc` | create if absent; if present, NEVER overwrite (user owns MCP/routing config) |
| `<project>/AGENTS.md` | backup + overwrite |
| `<project>/docs/**` | create if absent; never overwrite existing |

## 4. Commands

### 4.1 init

**Purpose**: Machine bootstrap. Installs/verifies opencode + headroom, creates `~/.agents/` + `~/.config/opencode/` structure, drops canonical content, sets up symlink adapter.

**Preconditions**: macOS, bun installed, internet access.

**Steps (in order)**:
1. Verify bun present (fail with exit 2 if not — print install instructions)
2. Verify/install opencode (check `opencode --version`; if absent, `bun install -g opencode-ai`; if stale, update)
3. Verify/install headroom (check process / config; if absent, print install instructions — do not auto-install, requires API key)
4. Create `~/.agents/` directory tree (skills/, bin/, research/)
5. Create `~/.config/opencode/` directory tree (plugins/)
6. Write canonical `~/.agents/AGENTS.md` (backup existing if present)
7. Create symlink `~/.config/opencode/AGENTS.md` → `~/.agents/AGENTS.md` (backup + remove existing regular file)
8. Write runbook `~/.agents/AGENT-STACK-RUNBOOK.md` (backup existing)
9. Write skills to `~/.agents/skills/<name>/SKILL.md` (backup existing)
10. Write hooks to `~/.config/opencode/plugins/*.ts` (backup existing)
11. Write scripts to `~/.agents/bin/*.ts` (backup existing)
12. Create `~/.agents/research/index.md` skeleton (skip if exists)
13. Create `~/.config/opencode/opencode.jsonc` with defaults if absent (skip if exists)
14. Print summary: what was installed, what was backed up, what was skipped

**Postconditions**: `~/.agents/AGENTS.md` exists, symlink valid, skills/hooks/scripts present, opencode + headroom verified.

**Idempotency**: re-running `init` is safe. Existing files backed up + overwritten. Symlink verified. Missing pieces re-created.

**Exit codes**: 0 = success, 2 = bun missing, 3 = opencode install failed, 4 = headroom not found (warn, not fatal), 5 = write permission error.

**Output**: structured JSON (`--json` flag) or human-readable summary (default).

### 4.2 scaffold

**Purpose**: Project setup. Adds agentic structure to the current project directory.

**Preconditions**: run inside a project directory (has or will have code). `init` has been run on this machine.

**Steps**:
1. Detect project type: greenfield (empty/near-empty dir) vs brownfield (has files, possibly has AGENTS.md)
2. Write `<project>/AGENTS.md` with project-facts template (backup existing if brownfield)
3. Create `docs/research/` with `index.md` skeleton (skip if exists)
4. Create `docs/logs/` directory
5. Detect monorepo structure (scan for `packages/`, `apps/`, `services/`, `libs/` with distinct stacks)
6. For each divergent subpackage, print recommendation: "suggest `packages/<name>/AGENTS.md` (reason: <divergence>)" — do NOT create
7. Scan existing docs for YAML front matter; flag missing (report only, do not auto-fix unless `--fix` flag)
8. Print summary: what was created, what was backed up, suggestions

**Greenfield vs brownfield**: greenfield = clean create, no backups. Brownfield = backup before overwrite, detect existing structure, respect `docs/` if present.

**Exit codes**: 0 = success, 6 = not in a project dir (no writable parent), 7 = AGENTS.md write failed.

### 4.3 update

**Purpose**: Pull latest semver-tagged release and replace bundled content.

**Steps**:
1. Check current installed version (from `~/.agents/.harness-version` or similar manifest)
2. Fetch latest tag from the tool's release source (GitHub releases)
3. If latest > current: download, backup all owned files, replace, update version manifest
4. If latest = current: print "up to date", exit 0
5. If latest < current: warn (downgrade not auto-applied), exit 0

**What gets replaced**: all tool-owned paths (AGENTS.md, skills, bin, plugins, runbook). What is NOT touched: `opencode.jsonc`, `research/index.md` (if user-appended), dated research entries, project files.

**Exit codes**: 0 = up-to-date or updated, 8 = fetch failed, 9 = version check failed.

### 4.4 doctor

**Purpose**: Diagnose setup health. Verify everything is canonical and functional.

**Checks**:
1. bun version (warn if < minimum)
2. opencode installed + version
3. headroom running/configured
4. `~/.agents/AGENTS.md` exists + LOC under ceiling + hygiene checks (duplication >30%, no_restate directive present, changelog header, advisory-vs-enforced tags)
5. `~/.config/opencode/AGENTS.md` is a valid symlink (not a regular file)
6. skills present (compare against bundled manifest)
7. hooks present + files exist in plugins dir (opencode auto-discovers at startup — verify files, not "registration")
8. scripts present + executable
9. runbook present
10. research hub index.md present
11. opencode.jsonc has required keys (model routing, plugin path, MCP servers)
12. symlink integrity (target exists)
13. run `agentsmd-check.ts` hygiene linter if present

**Report**: table of check / status (ok/warn/broken) / detail. `--json` for structured output.

**Auto-fix vs flag**: doctor REPORTS only by default. `--fix` flag auto-fixes simple issues: recreate broken symlink, restore missing skill from bundled copy. Does NOT auto-fix opencode.jsonc, does NOT auto-fix user-authored research, does NOT overwrite a drifted AGENTS.md without confirmation.

**Exit codes**: 0 = healthy, 10 = warnings, 11 = broken (one or more checks failed).

## 5. Bundled content manifest

| Item | Install path | Versioned with tool |
|------|-------------|-------------------|
| Canonical AGENTS.md | `~/.agents/AGENTS.md` | yes |
| symlink adapter | `~/.config/opencode/AGENTS.md` → `~/.agents/AGENTS.md` | yes |
| Agent stack runbook | `~/.agents/AGENT-STACK-RUNBOOK.md` | yes |
| `prompt-triage` skill | `~/.agents/skills/prompt-triage/SKILL.md` | yes |
| `verify-with-criteria` skill | `~/.agents/skills/verify-with-criteria/SKILL.md` | yes |
| Verification-gate hook | `~/.config/opencode/plugins/verify-gate.ts` | yes |
| `agentsmd-check.ts` | `~/.agents/bin/agentsmd-check.ts` | yes |
| Research hub skeleton | `~/.agents/research/index.md` | yes (create-only) |
| Version manifest | `~/.agents/.harness-version` | yes |

Note: `no-closing-ceremony` is an AGENTS.md directive, NOT a skill (per `2026-08-16-primitive-selection.md`). It ships inside the canonical AGENTS.md content.

## 6. Hook design: verification gate

**Problem**: agents claim "done, tests pass" without pasting fresh output. The user must trust unverifiable claims.

**Event**: `tool.execute.before` (opencode v1.18.18 plugin hook). Fires before any tool call.

**Blocking mechanism**: `throw` inside the hook aborts the tool call. No boolean/return-deny API exists — throw is the only block path (verified against `@opencode-ai/plugin` dist types).

**Trigger condition**: when a write tool (`edit`, `write`, `apply_patch`, `task`) is invoked AND no recent bash-output part exists in the session (queried via `client.session` / `client.message` APIs to inspect recent parts + timestamps).

**Behavior**:
1. Hook receives `{tool, sessionID, callID}`, output `{args}`
2. If tool is a write/finish tool: query session messages for recent bash/shell tool output parts
3. If no bash output part exists in the last N turns: throw `Error("verification gate: run tests/build before finishing — no fresh command output in session")`
4. If bash output exists: allow (return without throwing)

**Session inspection**: the hook needs to query recent session parts to detect fresh bash output. The exact opencode client API for this (`client.session` / `client.message` or equivalent) was identified from the plugin types but NOT runtime-verified. Before implementation, run a hook-surface probe: write a minimal `tool.execute.before` hook that logs its input args + available client methods, trigger a write tool, and confirm which API exposes session message history. If no clean API exists, downgrade the gate to a simpler trigger: block write tools after every N turns unless a bash tool was called in the last turn (coarser but API-free).

**Known gap**: opencode v1.18.18 has NO `chat.message.before` / `assistant.message.before` hook that fires before the assistant emits its final text. The gate works at the tool-action level (block the write), not the text level (block the claim). This is stronger in practice — if the agent can't write its changes without running verification first, the "done" claim is moot.

**Fallback**: `session.idle` event (observe-only) can surface a post-hoc warning if the agent finished without verification, but cannot block. This is a secondary signal, not the primary gate.

**Escalation path**: if a true pre-send assistant-text gate is needed, request upstream (anomalyco/opencode) a `chat.message.before` blocking hook. Until then, the tool-level gate is the mechanism.

## 7. Safety & rollback

- Every overwritten file → `<file>.bak` before write. Restore = `mv <file>.bak <file>`.
- Symlink replacement: if `~/.config/opencode/AGENTS.md` was a regular file, backed up to `.bak` before symlink created. Restore = `mv AGENTS.md.bak AGENTS.md` (removes symlink first).
- `doctor --fix` can restore missing skills/hooks from bundled copies.
- `update` writes a new `.harness-version` only after all replacements succeed. Mid-install failure = version unchanged + `.bak` files present for manual restore.
- NOT auto-reversible: `opencode.jsonc` (tool never overwrites it), user-authored research entries, project `docs/` content.

## 8. Testing strategy

Per scripting standard: happy + unhappy paths, `bun test`, boundary cases.

**Key test scenarios**:
- `init` on clean machine (no ~/.agents, no ~/.config/opencode) → all paths created, symlink valid
- `init` on machine with existing regular file at `~/.config/opencode/AGENTS.md` → backed up, symlink created
- `init` idempotent (re-run) → backups created, no duplicate content
- `init` without bun → exit 2, message printed
- `scaffold` on empty dir → clean create, no backups
- `scaffold` on dir with existing AGENTS.md → backed up, overwritten
- `scaffold` on monorepo → subdir suggestions printed, not created
- `scaffold` on dir with existing `docs/research/index.md` → skipped, not overwritten
- `update` when latest = current → exit 0, "up to date"
- `update` when latest > current → backups created, content replaced, version updated
- `update` mid-install failure → version unchanged, .bak files present
- `doctor` on healthy setup → exit 0
- `doctor` on broken symlink → warn, `--fix` recreates
- `doctor` on drifted AGENTS.md → warn, no auto-fix without confirmation
- `doctor` on missing opencode.jsonc keys → warn only

**Boundary cases**: empty project, existing custom AGENTS.md with user content, broken symlink, stale version, opencode absent, headroom absent, mid-install failure, read-only permissions, non-Mac OS.

## 9. Out of scope (YAGNI — deferred with trigger)

| Item | Deferral trigger |
|-----|-----------------|
| Additive/merge logic for existing config | a user reports lost customizations they wanted to keep |
| Conflict resolution UI | merge logic is built and conflicts are frequent |
| Remote content fetching (decouple content from tool) | skill updates require a tool bump that feels excessive |
| Plugin/skill marketplace | community contributes third-party skills |
| Non-Mac support (Linux/Windows) | a non-Mac user asks to install |
| Auto-PR creation for project scaffolding | scaffold needs to commit to a remote repo |
| CI integration (run doctor in CI) | team adoption requires CI gate |
| Interactive TUI for init/scaffold | user requests guided mode |
| Rollback command (`harness rollback`) | manual .bak restore proves insufficient |
| Per-project skill customization | a project needs skills the global hub doesn't cover |

## 10. Open questions

1. **CLI tool's own repo location** — where does the tool's source live? Separate git repo. User to decide.
2. **Skill set v1 scope** — ship just `prompt-triage` + `verify-with-criteria`, or more? Recommendation: start with those two; add as they're authored.
3. **Hook set v1 scope** — ship just the verification gate, or more? Recommendation: start with one; hooks are the user's biggest gap and one proves the pattern.
4. **Version manifest format** — `.harness-version` plain text, JSON, or TOML? Recommendation: JSON (`{version, installedAt, contentHash}`).
5. **Headroom install** — auto-install or instructions only? Recommendation: instructions only (requires API key, user must complete setup).

**Resolved in spec body** (not open): semver source = GitHub releases tags (§4.3); doctor `--fix` flag (§4.4); opencode.jsonc required keys enumerated (§4.4 check 12 + §3.1); update touch-policy for research/index.md = never (§3.3).
