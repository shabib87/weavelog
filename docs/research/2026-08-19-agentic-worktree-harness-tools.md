---
date: 2026-08-19
topic: agentic-worktree-harness-tools (backlog.md, difit, PR-Agent, Archon)
status: resolved
sources:
  - https://github.com/MrLesk/Backlog.md
  - https://github.com/yoshiko-pg/difit
  - https://github.com/The-PR-Agent/pr-agent
  - https://docs.pr-agent.ai/usage-guide/plain_diff_mode/
  - https://github.com/coleam00/Archon
  - https://github.com/coleam00/Archon/issues/957
models_used_for_research:
  - openrouter/z-ai/glm-5.2
supersedes: none
last_verified: 2026-08-19
---

# Agentic worktree-harness tools — verification for the plan

Scope: four tools cited in the user's "agentic worktree workflow" harness plan.
For each: what it actually does, install/run model, maintenance signal,
single-user-local-CLI gotchas, and a verdict vs. how the plan describes it.

Budget used: 6 page fetches (4 repo READMEs + PR-Agent plain-diff docs + Archon #957).

---

## 1. backlog.md — Verdict: AS DESCRIBED IN PLAN

**What it actually does:** Markdown-native task manager. Every task is a plain
`.md` file in a project-local `backlog/` dir (configurable). CLI + local web UI
(`backlog browser`, 127.0.0.1 only) + MCP server (`backlog mcp start`).
Source: https://github.com/MrLesk/Backlog.md

**Install/run model:** `npm i -g backlog.md` (also bun, brew, nix). Zero server,
zero account, zero telemetry. Tasks are git-tracked plain files. Matches the
"local-first single-user CLI" assumption perfectly.

**`--json` support:** YES. README states: "Read commands support stable,
versioned JSON for scripts and integrations. Use `--json` with `task list`,
`task view`, the `task <id>` shorthand, and `search`." Example:
`backlog task list --json | jq '.tasks[] | .id'`. JSON is noninteractive and
machine-readable.

**Native statuses:** Draft, To Do, In Progress, In Review, Done (confirmed via
the MCP tool schema in this session — `status` enum). These are the ONLY valid
status values; custom statuses are not a documented feature.

**Dependencies / parent-subtask:** BOTH exist.
- `dependencies` field on task create/edit (array of task IDs) — built in.
- `parentTaskId` parameter on `backlog task create` for subtasks — built in.
- `--ready` filter on `backlog task list` returns tasks whose dependencies are
  satisfied/completed. This is the dependency-resolution primitive a harness
  would want.
README headline feature list: "Milestones & dependencies — structure bigger
efforts and make execution order reviewable."

**Custom frontmatter (depends_on, worktree_path, branch_name):** COULD NOT
VERIFY directly from the README. The README strongly warns against hand-editing
task files ("prefer Backlog.md commands over hand-editing task files, so field
types and metadata stay consistent"). The MCP schema exposes `dependencies`,
`references`, `modifiedFiles`, `documentation`, `milestone`, `assignee`,
`labels`, `priority`, `type`, `ordinal` — none named `worktree_path` or
`branch_name`. `modifiedFiles` (project-root-relative file paths) is the closest
native field for tracking branch-touched files. Unverified: whether arbitrary
custom frontmatter keys survive a CLI round-trip. OPEN QUESTION — needs a
source-code read or an empirical probe (out of scope for web-only dispatch).

**Maintenance:** Active. 6.5k stars, 1,262 commits, 16 open issues, 7 open PRs.
npm package `backlog.md`. No release date visible in the fetched README, but
frequent commit cadence and a Devoxx 2025 / AI Engineer Summit 2025 talk trail
imply active maintenance.

**Gotchas for a single-user harness:**
- The package is `backlog.md` (with the dot). `npx backlog` resolves to an
  UNRELATED third-party npm package. Use `npx backlog.md` or install globally.
- Apple Silicon: Rosetta/x64 mismatch causes `illegal hardware instruction`.
  Reinstall with native arch (`arch -arm64 npm i -g backlog.md`).
- `checkActiveBranches` / `remoteOperations` config: for a local-only worktree
  harness, set these false (the `--no-git` init path does this automatically).
- Statuses are a fixed 5-value enum. If the plan needs more granular states,
  it must encode them in labels/notes, not custom status strings.

---

## 2. difit — Verdict: AS DESCRIBED IN PLAN

**What it actually does:** Local CLI that spins up a localhost web server
showing git commit/branch diffs in a GitHub-style "Files changed" view.
Comments can be copied as AI prompts. Node >= 21, Express + React + Vite.
Source: https://github.com/yoshiko-pg/difit

**Is it a real published tool:** YES. npm package `difit`, `npx difit` works,
3.1k stars, 723 commits, MIT. README explicitly: "the local code review tool
for the AI era."

**Local CLI:** YES. Default `--host 127.0.0.1 --port 4966`, opens browser,
`--no-open` / `--background` (outputs JSON connection info) / `--keep-alive`
options. `--background` is the harness-friendly mode (non-blocking, returns
connection info for orchestration).

**Does the difit-review skill exist:** YES. README: "Installed skills include:
`difit`: ask the user for a review through difit after code changes;
`difit-review`: review a specific diff or PR and launch difit with findings or
explanations preloaded as comments." Install: `npx skills add yoshiko-pg/difit`.
The repo has a `skills/` directory at root. The plan's claim of a difit-review
skill path is consistent with this; the exact on-disk path after install was
not fetched (depends on the `skills` installer convention) — minor OPEN item.

**`--comment` preload:** Confirmed and documented. `--comment` is repeatable,
accepts a single JSON object OR a JSON array. Two types:
- `thread`: new thread at a diff position
  (`{"type":"thread","filePath":"src/x.ts","position":{"side":"new","line":10},"body":"..."}`)
- `reply`: reply to latest thread at same position
Duplicate comments are skipped automatically. This is exactly the mechanism an
automated reviewer (PR-Agent, etc.) would use to preload findings into difit
before a human looks.

**Maintenance:** Active. 3.1k stars, 723 commits, 9 issues. Has a CHANGELOG and
CI badge. No explicit release date in README; multiple localized READMEs
(ja/zh/ko) suggest a maintained, internationalized project.

**Gotchas for a single-user harness:**
- Comments persist in browser localStorage per commit — so a fresh browser
  profile / headless context loses them. The `--comment` preload is the
  workaround for stateless automation.
- `--pr` mode shells out to `gh pr diff --patch` and needs `gh auth login`.
  For a local-diff harness, prefer the git-revision or stdin modes
  (`difit @ main`, `git diff ... | difit`).
- `--context <lines>` is NOT available in `--pr` or stdin mode (only git-revision
  mode). Plan accordingly if pre-generating diffs.
- Default port 4966; `--background` returns JSON for orchestration but the
  process must be managed (Ctrl+C or external kill).

---

## 3. PR-Agent — Verdict: PARTIALLY AS DESCRIBED IN PLAN

**What it actually does:** AI code-review agent. Tools: `/review`, `/improve`,
`/describe`, `/ask`, `/update_changelog`, plus more. Supports GitHub, GitLab,
Bitbucket, Azure DevOps, Gitea. Source: https://github.com/The-PR-Agent/pr-agent
Docs: https://docs.pr-agent.ai/

**Self-hostable:** YES. Fully open-source (MIT), community-owned (donated by
Qodo to an open-source foundation in progress). Self-host with your own LLM
key. Docker images at `pragent/pr-agent` (>= 0.34.2; legacy `codiumai/pr-agent`
frozen). README "Data Privacy -> Self-hosted PR-Agent" confirms.

**Does `/review` work on local git diffs (no PR URL):** YES, two ways:
1. `git_provider = "local"` mode via `--pr_url` — compares branches in a local
   repo, requires a CLEAN working tree, publishes GitHub-style comment locally.
2. **Plain-diff mode** (added v0.40.0, Jul 25 2026) — `--stdin` or `--diff-file`,
   NO platform token, NO PR URL, NO internet needed for diff processing. Output
   to stdout (+ optional `--output <file>`). Best fit for an air-gapped / CI /
   pre-push-hook harness.
   `git diff main...feature | python -m pr_agent.cli --stdin review`
   Supported commands in plain-diff: `review`, `improve`, `describe`, `ask`.
   `improve` renders suggestions as a markdown doc (no inline commits, since
   there's no platform to push to).
   Source: https://docs.pr-agent.ai/usage-guide/plain_diff_mode/

**Can it point at a local LLM:** YES. Via LiteLLM, which routes to Ollama,
LM Studio, vLLM, etc. README: "any other model reachable through LiteLLM
(Azure OpenAI, AWS Bedrock, Vertex AI, Databricks, OpenRouter, Ollama, and
more)". Plain-diff docs: "An LLM API key is still needed unless you configure a
local model." So Ollama-style local inference is the supported no-key path.

**Why "partially":** The plan's framing should be checked. The DEFAULT CLI
invocation shown in the README is `pr-agent --pr_url <PR_URL> review` — which
DOES require a PR URL. Local-diff-without-PR is the newer, opt-in plain-diff
mode (v0.40.0, ~3 weeks old as of this note). If the plan assumed `/review`
"just works on a local diff," that's only true via the explicit `--stdin` /
`--diff-file` flags. Also `pip install pr-agent` is stale (installs 0.39.0);
current release is v0.42.0 — install from the git tag until PyPI publishing
resumes.

**Maintenance:** Very active. 12.6k stars, 5,118 commits, new external
maintainer (Naor / @naorpeled). Recent releases: v0.39.0 (Jul 5), v0.40.0
(Jul 25, GPT-5.6 default + plain-diff), v0.41.0 (Jul 26, Claude Opus 5),
v0.42.0 current. Migration from `codiumai/pr-agent` to `The-PR-Agent/pr-agent`
org + `pragent/pr-agent` docker namespace is recent — pin versions.

**Gotchas for a single-user harness:**
- PyPI is behind: `pip install pr-agent` = 0.39.0. Use
  `pip install "pr-agent @ git+https://github.com/The-PR-Agent/pr-agent.git@v0.42.0"`.
- Default model is now GPT-5.6 (cloud). For a local-LLM harness, set the model
  + provider explicitly via config / LiteLLM; don't rely on defaults.
- `/improve` in plain-diff mode outputs markdown, not committable patches —
  a harness expecting apply-able suggestions from `/improve` on a local diff
  will need to parse the markdown, not call a patch API.
- Plain-diff reverse-applies the diff to reconstruct base file content for
  richer LLM context; this needs the working tree present. Patch-only
  fallback runs but with less context. Run inside the repo for best quality.

---

## 4. Archon — Verdict: AS DESCRIBED IN PLAN

**What it actually does:** An AI workflow engine for coding agents. Define
multi-step dev processes (plan -> implement -> validate -> review -> PR) as YAML
workflows in `.archon/workflows/`. Mix deterministic nodes (bash, tests, git
ops) with AI nodes (planning, code-gen, review). Ships 19 default workflows.
Source: https://github.com/coleam00/Archon

**Is it a "harness builder" with DAG + worktree isolation:** YES, on both
counts.
- DAG: workflows use `depends_on: [...]` to express node ordering (see the
  `build-feature.yaml` example in the README). A visual drag-and-drop DAG
  editor exists in the Web UI ("Workflow Builder").
- Worktree isolation: README headline feature: "Isolated - Every workflow run
  gets its own git worktree. Run 5 fixes in parallel with no conflicts."
  Worktree creation is automatic per run ("Creating isolated worktree on
  branch archon/task-...").
- Loop nodes (`loop: ... until: ALL_TASKS_COMPLETE` / `until: APPROVED`) and
  human approval gates (`interactive: true`) are first-class.

**Is issue #957 real and about harness engineering:** YES. Issue #957
"Archon: Complete Rewrite - AI Workflow Engine for Coding Agents," opened
Apr 7, 2026 by coleam00, labeled `do not touch`. It announces the rewrite
from the old Python task-management+RAG tool (now archived on
`archive/v1-task-management-rag`) to the new TypeScript workflow engine.
Quote: "The first open-source harness builder for AI coding." It is the
canonical "what happened to old Archon" reference. It is NOT a feature
request or design discussion — it's the announcement/manifest post for the
rewrite. If the plan cites #957 as evidence of harness-engineering intent,
that's accurate; if it cites #957 as a design RFC with technical detail,
that's a stretch — the technical detail lives in the README + archon.diy
docs, not in the issue body.
Source: https://github.com/coleam00/Archon/issues/957

**Install/run model:** Bun + TypeScript + SQLite (default) or PostgreSQL.
Three install paths: (a) clone + `bun install` + `claude` + setup wizard;
(b) quick-install binary (`curl ... | bash`); (c) Homebrew
`brew install coleam00/archon/archon`. The quick-install binary does NOT
bundle Claude Code — you must set `CLAUDE_BIN_PATH` or
`assistants.claude.claudeBinaryPath` in `~/.archon/config.yaml`. AI
assistants: Claude Code, Codex, Pi. Prereqs: Bun, Claude Code, GitHub CLI.

**Maintenance:** Active. 23.2k stars, 1,860 commits (on `dev` branch), 225
open issues. Trendshift-listed. The rewrite shipped recently (issue #957,
Apr 7 2026) so the v2 product is ~4 months old as of this note.

**Gotchas for a single-user harness:**
- **Telemetry is ON by default.** Sends anonymous events to PostHog
  (workflow names for BUNDLED workflows only, platform, provider/model,
  durations, success/failure, OS/arch). Opt out via `ARCHON_TELEMETRY_DISABLED=1`
  / `DO_NOT_TRACK=1` / `POSTHOG_API_KEY=off`. For a local-first harness,
  set these in the env.
- Heavy: requires Bun + Claude Code + gh CLI as prerequisites; not a
  single-binary drop-in. The Docker image bundles Claude Code; the
  quick-install binary does NOT.
- SQLite/Postgres state (14 core tables) — Archon owns its own DB, it is not
  stateless like backlog.md. This is a real architectural difference for a
  harness that wants plain-file state.
- Workflows live in `.archon/workflows/` — if your harness wants to OWN the
  workflow definitions, Archon expects to manage that dir. Same-named files in
  your repo override bundled defaults — good for customization, but means
  Archon is the workflow runtime, not just a library you call.
- `dev` is the default branch (not `main`) — pin to a tag for reproducibility.

---

## Cross-cutting notes for the plan

- **backlog.md vs Archon overlap:** Both encode "plan -> implement -> review"
  loops. backlog.md is a task tracker (human-readable files, no execution
  runtime); Archon is a workflow runtime (YAML + executor + worktree + DB).
  They are complementary, not redundant: backlog.md = WHAT to do (the queue),
  Archon = HOW to do it (the deterministic runner). A harness could use
  backlog.md as the source of task IDs/AC and Archon as the executor — but
  the integration glue is not provided by either; you'd write it.
- **difit + PR-Agent complement:** difit is the human-facing diff viewer;
  PR-Agent is the AI reviewer. The natural pipeline is
  `PR-Agent --stdin (plain-diff) -> markdown findings -> parse -> difit --comment`
  preload -> human reviews in difit. difit's `--comment` JSON shape (thread/
  reply + filePath + position) is the contract PR-Agent output must be
  reshaped into. Neither tool does that reshape for you.
- **Local-LLM story:** PR-Agent (via LiteLLM/Ollama) is the only one of the
  four with a real local-LLM path. Archon drives Claude Code/Codex/Pi (cloud
  coding agents). backlog.md and difit are model-agnostic (they don't call
  LLMs at all).
- **State philosophy:** backlog.md = plain files (git-trackable, stateless
  CLI). difit = browser localStorage per commit + CLI server (ephemeral).
  PR-Agent = stateless per-run (config + diff in, review out). Archon =
  persistent DB + workflow runtime (stateful). For a single-user local
  harness, the stateful Archon piece is the largest operational commitment.

---

## Unresolved questions (could not verify via web fetch)

1. **backlog.md custom frontmatter round-trip:** Do arbitrary user-defined
   frontmatter keys (e.g. `worktree_path`, `branch_name`, `depends_on` as a
   custom key vs the native `dependencies`) survive a `backlog task edit`
   round-trip, or does the CLI strip unknown keys? Needs a source-code read
   of the task parser or an empirical probe. The README warns against
   hand-editing, implying the CLI is the gatekeeper.
2. **difit-review skill on-disk path:** The exact path the skill lands at
   after `npx skills add yoshiko-pg/difit` (the plan references a specific
   path). Depends on the `skills` installer convention, not fetched here.
3. **PR-Agent + Ollama concrete config:** The docs confirm Ollama via
   LiteLLM is supported, but the exact `configuration.toml` / env keys for a
   no-cloud-key local run were not fetched (would need the changing_a_model
   + additional_configurations docs pages — out of budget).
4. **Archon workflow <-> backlog.md integration:** No documented bridge
   exists; the plan's assumption that these compose needs custom glue.
