---
date: 2026-08-16
topic: enforce.ts enforcement hooks — bypass flags, rollback, and recovery runbook
status: open
sources:
  - "~/.agents/docs/plans/2026-08-15-headroom-fix-plan.md (Phase 2)"
  - "~/.config/opencode/node_modules/@opencode-ai/plugin/dist/index.d.ts (verified Hooks interface)"
  - "plugins/enforce.ts and bin/test/enforce-hooks.test.ts (B3 delivery)"
models_used_for_research: [moonshotai/kimi-k3]
supersedes: none
---

# enforce.ts enforcement hooks — recovery runbook

This runbook MUST be in place before `enforce.ts` is activated (plan requirement).
The plugin is state-agnostic and fail-open: it has no state files, and every hook
degrades to a no-op when its tooling is missing, slow, or crashing.

## What the plugin does

| Hook | Trigger | Effect | Failure mode |
|---|---|---|---|
| 1 frontmatter check | `tool.execute.after` on `edit` of `~/.agents/docs/research/*.md` | appends `frontmatter_warning` (violations) or `frontmatter_check: ✓` to tool metadata | silent no-op |
| 2 commit gate | `tool.execute.before` on `bash` matching `git commit` | **throws and blocks** when staged research docs have frontmatter violations; uses `runCmd` (spawnSync) not `$` | fail-open (never blocks) |
| 3 dangerous command gate | `tool.execute.before` on `bash` matching the denylist | **throws and blocks** | n/a (pure regex, cannot fail) |
| 4 failure learning | `event` `session.idle`, once per session | runs `headroom learn` (dry-run by default), appends output to `~/.agents/logs/headroom-learn.log` | silent no-op |
| 5 review SOP reminder | `tool.execute.after` on `edit` of `~/.agents/docs/plans/*.md` | appends `review_reminder` to tool metadata | silent no-op |
| 6 write-block | `tool.execute.before` on `edit`/`write` to `~/.agents/**` | **throws and blocks** when on `main`/`master` branch; uses `gitBranch` (spawnSync) not `$` | fail-open (never blocks) |
| 7 backlog lifecycle gate | `tool.execute.before` on `bash` matching `backlog task create` / `backlog task edit --status` | **throws and blocks** when on `main`/`master` branch | fail-open (never blocks) |
| 8 live-harness write-block | `tool.execute.before` on `edit`/`write` to `~/.config/opencode/**` | **throws and blocks** — directs the edit to the tracked repo copy (`~/.agents/config/**`) + config-sync materialize; filePath is canonicalized (realpath, dangling-symlink aware, depth-guarded) so relative/`..`/symlink paths cannot dodge the block | best-effort: bash-mediated live edits (`sed -i`, redirects) bypass it and are surfaced at the NEXT session start by Hook 9 |
| 9 session-start materialize | `event` `session.created`, once per session | runs `config-sync.ts` async (Bun.spawn, does NOT block the event loop; runner kills its own proc at the timeout) with forward-only flags — NO `--force`/`--adopt`; a refusal (exit 1) surfaces as `config_sync_warning` tool metadata on the session's next tool call | fail-open: missing script, crash, timeout, or exit 2 stay silent; the surfacing is awaited, so the warning cannot be lost to a race, at the cost of a bounded ≤10s event-handler wait only if config-sync hangs (happy path is a sub-100ms all-skip) |
| 10 task create quality gate | `tool.execute.before` on `bash` matching `backlog task create` on ANY branch (Hook 7's main check runs first) | **throws and blocks** when the command lacks `-d`/`--description` or has zero `--ac` flags or passes `--no-dod-defaults`; v5 additions: **throws** on labels outside the closed vocabulary (AC #11) and on harness/dogfood labels outside a harness-dev context (AC #17); **warns** (console.warn, non-blocking) on missing/off-set priority and dep-target issues; validates via the repo module `~/.agents/bin/src/task-validate.ts` (dynamic import, `createGateCheck`) with an inline tokenizer/checks fallback when the import fails | fail-open: outside a backlog project the dep/label checks pass open; import failure falls back to the inline copy, which still enforces the three original checks; module missing AND fallback errors → no block |

Per-hook timeouts: 5s for frontmatter-check calls, 10s for `headroom learn`,
10s for the Hook 9 config-sync run (owned by the runner itself: the spawned
process is killed at the timeout).
On timeout the hook fails open — a hung subprocess degrades one tool call by at
most the timeout, never the session.

Post-activation smoke check for Hook 9 (the `session.created` event shape is
verified against `@opencode-ai/sdk` EventSessionCreated — `properties.info.id`,
2026-09-01 — but confirm it fires on the live host): start a session, then
`cat ~/.agents/state/config-materialize.json` — `updatedAt` should refresh on
first use; and deliberately touch a live file to see the refusal warning
appear as tool metadata.

## Bypass / disable flags

Ordered from most to least surgical. Env flags are read per hook call — setting
or unsetting them takes effect immediately, no opencode restart needed.

1. **Master kill switch:** `ENFORCE_DISABLED=true` in the opencode process env —
   every hook becomes a no-op (enforcement included). Use this instead of
   deleting the plugin when you want a reversible disable.
2. **Hook 4 enable (opt-in, default OFF):** `HEADROOM_LEARN_ENABLE=true` in the
   opencode process env allows the session.idle `headroom learn` run. Unset/anything
   else = learning never runs (no paid LLM calls on idle). Opt-in per glm-5.2
   adjudication 2026-08-16: default-on paid LLM invocation is a cost/consent hazard.
3. **Hook 4 apply-mode (default off):** `HEADROOM_LEARN_AUTO_APPLY=true` enables
   `headroom learn --apply` on session idle. Unset/anything else = dry-run,
   output logged to `~/.agents/logs/headroom-learn.log`.
4. **Hook 8 escape hatch (per-call):** `ENFORCE_ALLOW_LIVE_EDIT=true` in the
   opencode process env allows an intentional one-off edit to a live harness
   file (`~/.config/opencode/**`). The one-way flow is the default because a
   direct live edit desyncs repo and live: after an allowed edit, resolve the
   resulting drift explicitly — `bun ~/.agents/bin/src/config-sync.ts --adopt`
   (commit the change to the repo) or `--force` (discard the live edit).
   Read per hook call; unset it again immediately after the one-off edit.
5. **Skip the commit gate for one commit:** unstage the research docs
   (`git restore --staged docs/research/`), commit the rest, fix frontmatter
   (`bun ~/.agents/bin/src/frontmatter-check.ts --fix ~/.agents/docs/research`),
   then commit the docs. Do NOT use `git commit --no-verify`-style bypasses —
   the gate is the point.
6. **Full disable (instant rollback):**
   ```bash
   rm ~/.config/opencode/plugins/enforce.ts
   ```
   Takes effect on the next opencode start. No config key references the file,
   so removal cannot leave dangling state.

   Rollback after Hook 9 materialized something you did not want: the repo is
   the source of truth and git history is the backup. Restore = `git -C
   ~/.agents checkout <last-good-commit> -- config/ AGENTS.md` (the files you
   want back), then `bun ~/.agents/bin/src/config-sync.ts` re-materializes
   them. A refusal naming a file you want to keep: `--adopt` (keep the live
   change) or `--force` (discard it). There is no separate backup copy — git
   IS the backup.
7. **Partial disable:** edit the REPO copy `~/.agents/plugins/enforce.ts`
   (comment out the hook body there — NOT the live copy, which Hook 8 blocks),
   then deploy it yourself with
   `cp ~/.agents/plugins/enforce.ts ~/.config/opencode/plugins/enforce.ts`
   (or run the copy with `ENFORCE_ALLOW_LIVE_EDIT=true` if using the agent).
   Hook 9 will warn once about the resulting live/repo drift until the change
   is committed — resolve with `--adopt`/`--force` per the refusal message.

## Recovery procedures

### opencode fails to start or errors on every tool call after activation

1. `rm ~/.config/opencode/plugins/enforce.ts`
2. Restart opencode — expected: clean start, no enforce hooks.
3. Verify the skills hub still loads (ask the agent to list skills; superpowers
   plugin was removed 2026-08-16 — enforce.ts is independent of it).
4. File the failure in `~/.agents/logs/` before re-attempting activation.

### Commit gate blocks a commit you believe is clean

The gate runs `frontmatter-check.ts` on `~/.agents/docs/research` (the whole dir,
not just staged files). A pre-existing violation in ANY research doc blocks
research-doc commits.

1. Run `bun ~/.agents/bin/src/frontmatter-check.ts ~/.agents/docs/research` and
   read the JSON report — it names every violating file and key.
2. Fix with `--fix` (never fabricates empty `sources: []`) or by hand.
3. If the checker itself is broken (exit 2), the gate fails open — if you are
   still blocked, the block is a genuine exit 1, not a checker bug.

### Denylist blocks a legitimate command

The denylist is best-effort, NOT a security boundary (it is trivially bypassed
by design). If a legitimate command trips it, the block message tells you to run
the command manually outside the agent — do that, then extend/adjust the
`DENYLIST` array in the plugin if the false positive is repeatable.

### Task create gate (Hook 10) blocks a legitimate create

The gate requires `-d`/`--description`, ≥1 `--ac`, and no `--no-dod-defaults` on
every `backlog task create`. A legitimate bare stub should be created via
`bun ~/.agents/bin/src/worktree-create.ts --create "<title>"` (spawns the CLI
directly — the sanctioned stub path, exempt by design). If the argument
tokenizer false-positives on unusual quoting, run the command manually outside
the agent, then extend the tokenizer in `~/.agents/bin/src/task-validate.ts`
(repo source) — the plugin's inline fallback is a documented duplicate and must
be kept in sync.

### headroom learn --apply wrote patterns you want to undo

`--apply` (opt-in via `HEADROOM_LEARN_AUTO_APPLY=true`) writes a marker block
(`<!-- headroom:learn:start -->` … `<!-- headroom:learn:end -->`) into
`~/.agents/docs/learned-patterns.md`. Rollback: delete the marker block (or the
whole file) — `headroom learn` regenerates it on the next apply run. Nothing
else references the file.

### headroom learn floods the log or spends tokens

Dry-run mode (default) still invokes an LLM (`deepseek/deepseek-v4-flash`,
$0.064/M) once per session. To stop it entirely, comment out the `event` hook
in the plugin or delete the plugin. The debounce is per-process; restarting
opencode resets it.

## Activation checklist (human, at merge time)

1. `cp ~/.agents/plugins/enforce.ts ~/.config/opencode/plugins/enforce.ts`
2. Restart opencode.
3. Smoke test: edit a file in `~/.agents/docs/research/` with bad frontmatter →
   warning appears in tool output metadata.
4. Smoke test: `git commit` with frontmatter violations staged → blocked.
5. Smoke test: add a decoy `chmod 600 /tmp/hook-test-decoy` denylist rule
   temporarily, run it → blocked; remove the decoy rule.
6. Smoke test: `chmod 600 ~/.ssh/id_rsa` → NOT blocked (legitimate file permission).
7. Smoke test: `edit`/`write` a file in `~/.agents/` while on `main` → blocked with
   "no file writes on main" error. Switch to a `task/*` branch → write allowed.
8. Verify the skills hub loads and
   `curl -sS http://localhost:8788/health | jq .status` returns "healthy".
9. If anything misbehaves: Full disable (above) is one `rm` away.

## Known limitations (accepted at design time)

- Denylist is best-effort regex — bypassable via quoting, variables, aliases.
  The `headroom-ai` rule is anchored to the exact pipx venv path so unrelated
  paths like `/tmp/headroom-ai` are NOT blocked.
- Commit gate matches `git commit` including flag-wrapped forms (`git -C`,
  `git -c`, `git --git-dir=`); quoted wrappers like `bash -c "git commit"`
  remain a documented bypass (best-effort, not a security boundary).
- Commit gate validates the whole research dir, so an unrelated pre-existing
  violation blocks research-doc commits until fixed (intended back-pressure).
  It runs `git diff` via `runCmd` (spawnSync) — not the `$` shell tag, which
  throws synchronously `"$ is not a function"` in opencode 1.18.18. The
  `runCmd` default uses `spawnSync` with array args (no shell injection) and
  a native timeout (no indefinite block).
- Write-block (Hook 6) only blocks `edit`/`write` opencode tools, NOT MCP tools.
  The backlog MCP `backlog task create` can still write to `backlog/tasks/` on
  main — this is intentional (queue metadata, not code). Uses `gitBranch`
  (spawnSync) not `$` for the same reason as Hook 2.
- **Exit trigger:** Hooks 2 and 6 use `gitBranch`/`runCmd` (spawnSync-based DI)
  instead of the `$` shell tag to avoid the synchronous-throw fail-open bug
  (opencode 1.18.18). When opencode fixes the `$` shell tag upstream, revert
  Hooks 2+6 to `$`-based `withTimeout` calls and remove `gitBranch`/`runCmd`
  from `EnforceDeps`.
- Hook 4's debounce Set is per-process and bounded-LRU (cap 100, oldest entry
  evicted); an opencode restart re-runs `headroom learn` once for the new
  process's first idle session.
- Hook timeouts abandon the promise but cannot kill the underlying subprocess;
  a hung `bun`/`headroom` child is left to the OS.
