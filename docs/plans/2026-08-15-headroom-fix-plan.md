---
date: 2026-08-15
topic: Headroom fix plan — phased actions with checklist gates and reviewer loop
status: open
sources:
  - "~/.agents/docs/research/2026-08-15-headroom-sdk-utilization.md"
  - "https://docs.headroomlabs.ai/docs/ (all 40 pages)"
  - "qwen/qwen3.8-2.4t-a95b reviewer findings (8 findings, APPROVE-WITH-FIXES)"
models_used_for_research: [z-ai/glm-5.2, qwen/qwen3.8-2.4t-a95b]
supersedes: none
review_rounds: 1
reviewer_corrections_applied:
  - Phase 5 (inter-agent context compression) rewritten: evaluate MCP headroom_retrieve (cross-process CCR) before building TS SharedContext; local Map is per-process and useless for subagent handoffs
  - ast-grep is NOT installed — add install step if used as fallback
  - frontmatter status enum expanded to include reviewer-approved-with-fixes-applied
  - /v1/compress response is snake_case, not camelCase
  - --memory-storage project verification removed (already correct)
  - permanent Serena adds tool-schema tokens to frozen prefix — weigh per-project enablement
  - headroom learn --model should pin cheap model (deepseek/deepseek-v4-flash)
  - Phase 1b test needs skip-if-/health-down for hermetic CI
---

# Headroom fix plan — phased actions with checklist gates

## Reviewer gate protocol

After each phase is written/executed, dispatch qwen3.8 reviewer to verify:
- Docs accuracy (do claims match installed headroom source + official docs?)
- No speculative building (every item has an explicit trigger)
- No system breakage (headroom proxy still healthy after changes)
- Convention alignment (bun, biome, buntest, YAGNI, DRY)

Verdict: APPROVE | APPROVE-WITH-FIXES | REJECT gates the next phase.

## Pre-flight: verify headroom is healthy BEFORE any changes

- [ ] `curl -sS http://localhost:8788/health | jq .status` returns "healthy"
- [ ] `~/.local/bin/headroom --version` returns "headroom, version 0.35.0"
- [ ] `launchctl list | grep com.headroom.proxy` shows PID (not dash)
- [ ] `ls -ld ~/.headroom | grep 'drwx------'` confirms exact 700 permissions (not 755)
- [ ] `curl -sS http://localhost:8788/stats | jq '.summary.mode'` returns "cache" (NOT "token")
- [ ] Record baseline: `curl -sS http://localhost:8788/stats | jq '.lifetime'` (save to /tmp/headroom-baseline.json)

If ANY check fails, STOP and fix before proceeding. Do not touch the plist or any headroom config during this plan.

---

## Phase 0: Documentation infrastructure + research persistence

### 0a. Create frontmatter-check.ts

**File:** `~/.agents/bin/src/frontmatter-check.ts`
**Tests:** `~/.agents/bin/test/frontmatter-check.test.ts`
**No headroom dependency.** Pure file parsing — cannot break the proxy.

**Spec — two modes: validation (default) and indexing (`--index`)**

#### Mode 1: validation (default)

- Scans `~/.agents/docs/research/*.md` and `~/.agents/docs/plans/*.md`, parses YAML frontmatter
- Required keys: `date` (ISO 8601), `topic` (string), `status` (enum), `sources` (non-empty array, per cross-model review finding), `models_used_for_research` (array), `supersedes` (string: `"none"` or filename)
- Status enum (expanded per reviewer finding 4): `verified-live | reviewer-corrected | resolved | open | decided | adopted | superseded | reviewer-approved-with-fixes-applied`
- Optional keys: `review_rounds` (int), `total_review_cost_usd` (float), `reviewer_corrections_applied` (array of strings)
- Cross-validation:
  - If `supersedes != "none"`, named file must exist in the same directory
  - If `status == "superseded"`, at least one other doc must have `supersedes` pointing to this file
  - Date in frontmatter must match filename date prefix (for `YYYY-MM-DD-*.md` files only)
- Exit codes: 0 = valid, 1 = violations found, 2 = error (file not found, parse error)
- `--fix` flag: auto-adds missing keys. Per cross-model review (finding 2b.4): `--fix` never inserts empty `sources: []` — uses `sources: ["(unknown — manual entry required)"]` unless `--source <value>` is provided. Other defaults: `status: open`, `models_used_for_research: []`, `supersedes: none`, `topic: <derived from filename slug>`.
- `--help` flag: usage, exit codes, schema
- Structured output: JSON report to stdout with per-file results

#### Mode 2: indexing (`--index`)

As the doc collection grows, manual README.md maintenance is a DRY violation waiting to happen. `--index` auto-generates the index from frontmatter.

- `--index` flag: scans all `*.md` files in research + plans dirs, generates a structured index
- Output to stdout (JSON) with: `{ files: [{ filename, date, topic, status, supersedes, superseded_by, models, review_rounds, directory }] }`
- `--index --markdown` flag: outputs a markdown-formatted index (the README.md body), grouped by directory, sorted by date descending, with status badges
- `--index --update-readme` flag: writes the generated markdown index to `~/.agents/docs/research/README.md` (preserves the header prose, replaces only the `## Index` section)
- Orphan detection: files not referenced by any other doc's `supersedes` AND with `status: open` or `status: decided` for >30 days → flagged with `orphan: true` in the JSON output
- Staleness detection: `status: verified-live` with `date` >90 days old → flagged with `stale: true` and a re-derivation reminder in the JSON output
- Supersession chain validation: if A supersedes B, and B's status is NOT `superseded` → violation (exit 1 in validation mode, flagged in index mode)

**Tests (happy + unhappy paths per scripting standard):**
- Happy: valid doc with all required keys → exit 0
- Unhappy 1: missing required key → exit 1, reports which key
- Unhappy 2: wrong status enum value → exit 1
- Unhappy 3: dangling supersedes (file does not exist) → exit 1
- Unhappy 4: date mismatch (filename says 2026-08-15, frontmatter says 2026-08-14) → exit 1
- `--fix` behavior: missing key → added with default, `sources` → `["(unknown — manual entry required)"]` (NOT empty), existing key → preserved, exit 0 after fix
- `--index` behavior: generates JSON with all files, correct sort order, orphan/stale flags
- `--index --markdown` behavior: generates valid markdown with header preservation
- Supersession chain: A supersedes B, B status is `verified-live` (not `superseded`) → exit 1

**Checklist gate 0a:**
- [ ] `frontmatter-check.ts` written, biome-checked (2 modes: validation, `--index`)
- [ ] `frontmatter-check.test.ts` written with all 8 test cases above
- [ ] `bun test frontmatter-check.test.ts` passes (all green)
- [ ] `bun frontmatter-check.ts` (no --fix) on existing docs reports violations (expected: loopeng-helper-plan.md)
- [ ] Run `bun frontmatter-check.ts --fix` on existing docs, re-run without --fix → exit 0
- [ ] `bun frontmatter-check.ts --index` outputs JSON with all files, orphan/stale flags
- [ ] `bun frontmatter-check.ts --index --markdown` generates valid markdown

### 0b. Standardize 3 non-conforming existing docs

**Cannot break headroom — these are documentation files, not system config.**

- [ ] `loopeng-helper-plan.md` — add `topic`, `sources`, `models_used_for_research`, `supersedes: none`; keep existing `id`/`title`/`review_rounds`/`total_review_cost_usd`/`reviewer_corrections_applied`; reorder to match canonical schema (required keys first, optional keys after)
- [ ] `HANDOFF-opencode-cache-fix.md` → already moved to `~/.agents/docs/plans/2026-08-15-opencode-cache-fix.md`
- [ ] Grep for references to old `HANDOFF-opencode-cache-fix` filename in all `~/.agents/docs/research/*.md` and `~/.agents/AGENT-STACK-RUNBOOK.md` — update any inbound links to the new path
- [ ] `failure-log-2026-08-15.md` — already moved to `~/.agents/logs/failure-log-2026-08-15.md`
- [ ] Run `frontmatter-check.ts` on all 3 normalized docs → exit 0

**Checklist gate 0b:**
- [ ] All 3 docs have canonical frontmatter
- [ ] `frontmatter-check.ts` passes on all docs in `~/.agents/docs/research/`
- [ ] No content lost during normalization (diff the prose sections before/after)

### 0c. Write 2 new research docs (already written, needs moving to correct location)

- [ ] Move `headroom-sdk-utilization.md` from plans dir to `~/.agents/docs/research/2026-08-15-headroom-sdk-utilization.md`
- [ ] Write `~/.agents/docs/research/2026-08-15-headroom-fix-plan.md` (this document)
- [ ] Run `frontmatter-check.ts` on both → exit 0

**Checklist gate 0c:**
- [ ] Both docs in `~/.agents/docs/research/` with canonical frontmatter
- [ ] `frontmatter-check.ts` passes on both

### 0d. Generate README.md index

- [ ] Run `bun ~/.agents/bin/src/frontmatter-check.ts --index --markdown --update-readme` to auto-generate the index from frontmatter
- [ ] Verify the generated index includes all files in research + plans dirs
- [ ] Verify the header prose (lines 1-9 of README.md) is preserved, only the `## Index` section is replaced
- [ ] Manually verify a few entries match the frontmatter `topic` field

**Checklist gate 0d:**
- [ ] README.md index auto-generated, includes all files
- [ ] Header prose preserved (not overwritten)
- [ ] No manual edits needed — the script is the single source of truth for the index (DRY)

### 0e. Fix runbook plist template (line 237)

**Cannot break headroom — this is a documentation fix in the runbook, NOT the live plist.**

- [ ] Read `~/.agents/AGENT-STACK-RUNBOOK.md` line 237
- [ ] Change `<string>token</string>` → `<string>cache</string>`
- [ ] Verify the runbook's own policy section (line 1678) already says "MUST run `--mode cache`" — this is now consistent
- [ ] Grep for any other `--mode token` references in the runbook that should be `--mode cache` (the `inner-harness-layers.md` line 71 says "headroom `--mode token`" — this is a historical research note, mark as superseded or add a correction note inline)

**Checklist gate 0e:**
- [ ] Runbook line 237 says `cache`, not `token`
- [ ] No contradiction between the plist template and the policy section
- [ ] Live plist is UNCHANGED (already says `cache` — do NOT touch it)

### 0f. Update runbook script inventory

- [ ] Add `frontmatter-check.ts` to runbook §6.x (script documentation section) with one-line description
- [ ] Add `headroom-compress.ts` (Phase 1) to runbook §6.x
- [ ] Add both to the verification battery section with appropriate check commands
- [ ] Add YAGNI backlog entries (see Phase 5)

**Checklist gate 0f:**
- [ ] Runbook §6.x includes both new scripts
- [ ] Verification battery includes frontmatter-check (weekly, alongside stack-check)
- [ ] YAGNI backlog table has new entries with triggers

### Reviewer gate: Phase 0

- [ ] Run cross-model review via the runbook SOP:
  ```bash
  /opt/homebrew/bin/bun ~/.agents/bin/src/reviewer-loop.ts \
    --plan ~/.agents/docs/plans/2026-08-15-headroom-fix-plan.md \
    --models z-ai/glm-5.2,moonshotai/kimi-k3 \
    --max-tokens 4000 --budget-usd 2.00
  ```
- [ ] Review scope:
  - Research docs for accuracy (first job: verify the agent-90 mechanism correction from finding 1 is correctly explained)
  - Frontmatter validator for correctness (does it pass on all existing docs after 0b normalization? do all 3 modes work?)
  - Fix plan for soundness (are triggers correct? any speculative building?)
  - Scripting standard alignment with inner harness architecture
  - No headroom system files were touched (verify plist unchanged)
- [ ] Merge disagreements by evidence (files, installed headroom source, official docs)
- [ ] Max 2 rounds, then escalate to user
- [ ] Verdict: APPROVE | APPROVE-WITH-FIXES | REJECT gates execution of Phases 1-6

### Post-Phase-0 headroom health check

- [ ] `curl -sS http://localhost:8788/health | jq .status` returns "healthy"
- [ ] `curl -sS http://localhost:8788/stats | jq '.summary.mode'` returns "cache"
- [ ] Verify proxy was not restarted during Phase 0 (check uptime: `curl -sS http://localhost:8788/health | jq .uptime_seconds` should be > pre-flight uptime — meaning no restart occurred)

---

## Phase 1: Headroom scripting standard (immediate, inner harness goal)

**Trigger: immediate (part of inner harness goal — scripts should utilize headroom whenever possible)**

### 1a. Create headroom-compress.ts

**File:** `~/.agents/bin/src/headroom-compress.ts`
**Tests:** `~/.agents/bin/test/headroom-compress.test.ts`
**Cannot break headroom — this is a new client of /v1/compress, read-only on the proxy.**

**Spec:**
- `headroomCompress(messages, options?)` — POST `http://localhost:8788/v1/compress` via `fetch()`
- Options: `model` (string, default `z-ai/glm-5.2`), `mode` (`"ccr" | undefined`), `frozen_message_count` (int | undefined), `target_ratio` (float | undefined), `protect_recent` (int | undefined)
- Returns: `{ messages, tokens_before, tokens_after, tokens_saved, compression_ratio, transforms_applied, ccr_hashes }` (snake_case per reviewer finding 5)
- Fail-open: if proxy is down or returns error, return original messages unchanged with zeroed metrics. Do NOT throw — scripts must not crash because headroom is unavailable.
- `--help` flag: usage, endpoint, config knobs, response shape
- No SDK dependency — just `fetch()` + the proxy already running

**Tests (happy + unhappy paths):**
- Happy: compress 2K-token payload (array of 50 mock tool results), assert `tokens_saved > 0` — **skip if `curl -sS http://localhost:8788/health` fails** (non-hermetic, but proxy is a launchd service always running)
- Unhappy: proxy down (mock fetch to throw) → returns original messages, `tokens_saved: 0`, does not throw
- `mode: "ccr"` → assert `ccr_hashes` is populated (non-empty array)
- `frozen_message_count: 4` with 6 messages → assert first 4 messages unchanged, only last 2 compressed
- Large payload (10K tokens) → assert `tokens_saved > 0` (do NOT assert compression_ratio threshold — content-dependent and flaky)

**Checklist gate 1a:**
- [ ] `headroom-compress.ts` written, biome-checked
- [ ] `headroom-compress.test.ts` written with all 5 test cases
- [ ] `bun test headroom-compress.test.ts` passes (all green, happy path skipped if proxy down)
- [ ] Manual smoke test: `bun headroom-compress.ts --help` shows usage

### 1b. Document the scripting standard

- [ ] Update `~/.agents/bin/AGENTS.md` script inventory: add `headroom-compress.ts` with description "thin helper for POST /v1/compress via fetch(), no SDK dependency"
- [ ] Add a "Headroom scripting standard" section to `~/.agents/bin/AGENTS.md`:
  ```
  ## Headroom scripting standard
  
  Scripts that produce large outputs (>1K tokens) should call `headroomCompress()` 
  before returning results to the conductor. The proxy compresses LLM traffic 
  (opencode → proxy → OpenRouter); scripts compress handoff data via /v1/compress.
  
  Do NOT install the npm SDK. Call /v1/compress directly via fetch().
  Response is snake_case: tokens_before, tokens_after, tokens_saved, 
  compression_ratio, ccr_hashes, transforms_applied.
  
  Fail-open: if the proxy is down, return original messages unchanged. 
  Scripts must not crash because headroom is unavailable.
  ```

**Checklist gate 1b:**
- [ ] `~/.agents/bin/AGENTS.md` updated with headroom-compress.ts entry + scripting standard section
- [ ] Runbook §6.x references headroom-compress.ts (from Phase 0f)

### Reviewer gate: Phase 1

- [ ] Dispatch qwen3.8 reviewer to review:
  - headroom-compress.ts: does it correctly call /v1/compress? Is the response parsing correct (snake_case)? Does fail-open work?
  - Tests: are all 5 cases covered? Is the skip-if-health-down approach sound?
  - Scripting standard: is it clear enough for a subagent to follow without context?
- [ ] Verdict gates Phase 2

### Post-Phase-1 headroom health check

- [ ] `curl -sS http://localhost:8788/health | jq .status` returns "healthy"
- [ ] `curl -sS http://localhost:8788/stats | jq '.summary.mode'` returns "cache"

---

## Phase 2: opencode enforcement hooks (immediate, inner harness "physics" layer)

**Trigger: immediate (closes the instruction-vs-physics gap — without hooks, plan checklists are LLM-respected, not enforced)**

**Depends on:** Phase 0 (frontmatter-check.ts) + Phase 1 (headroom-compress.ts) existing.

**Cannot break headroom** — hooks are an opencode plugin, not a headroom config change. The proxy on 8788 is untouched. Hooks fire in the opencode process, calling scripts via `$` (shell helper) or `fetch()`.

### Spike resolution (verified 2026-08-15)

opencode supports hooks via `@opencode-ai/plugin` SDK (installed at `~/.config/opencode/node_modules/@opencode-ai/plugin@1.18.18`). The `Hooks` interface (verified in `dist/index.d.ts` lines 173-322) exposes:

- `tool.execute.before` — PRE-TOOL: fires before any tool call. Can block (throw) or rewrite args.
- `tool.execute.after` — POST-TOOL: fires after any tool call. Can inspect/modify output + metadata.
- `event` — GENERIC EVENT BUS: subscribes to all events (`file.edited`, `session.idle`, `tool.execute.after`, etc.)
- `experimental.chat.messages.transform` — rewrite messages sent to the LLM (superpowers uses this already)

Hooks are configured via a plugin at `~/.config/opencode/plugins/*.ts` (global, auto-loaded — no config key needed). Superpowers already uses `config` + `experimental.chat.messages.transform` hooks in this session.

### 2a. Create the enforcement plugin

**File:** `~/.config/opencode/plugins/enforce.ts`
**Tests:** `~/.agents/bin/test/enforce-hooks.test.ts`

**Hooks to wire (4 enforcement points):**

#### Hook 1: `tool.execute.after` on `edit` — frontmatter enforcement

Fires after ANY file edit. If the edited file path matches `~/.agents/docs/research/*.md`:
- Run `bun ~/.agents/bin/src/frontmatter-check.ts <file>` via `$` (shell helper from plugin context)
- If exit code 1 (violations): append a warning to the tool output metadata:
  ```
  ⚠ frontmatter-check.ts violations in <filename>:
  <violation details>
  Run `bun ~/.agents/bin/src/frontmatter-check.ts --fix <file>` to fix.
  ```
- If exit code 0: append `✓ frontmatter valid` to metadata (silent on success — low noise)
- If frontmatter-check.ts doesn't exist yet (Phase 0 not complete): skip silently
- **Does NOT block the edit** (it already happened) — reports violations for the agent to see

#### Hook 2: `tool.execute.before` on `bash` — commit gate (back-pressure)

Fires before ANY bash command. If the command contains `git commit`:
- Run `bun ~/.agents/bin/src/frontmatter-check.ts` on all files in `~/.agents/docs/research/`
- If any violations: **throw to block** the commit:
  ```
  throw new Error("frontmatter-check.ts found violations in research docs. Run `bun ~/.agents/bin/src/frontmatter-check.ts --fix` before committing.")
  ```
- This is PHYSICS — the commit cannot proceed until frontmatter is valid
- If frontmatter-check.ts doesn't exist yet: skip silently (don't block commits during Phase 0)

#### Hook 3: `tool.execute.before` on `bash` — dangerous command gate

Fires before ANY bash command. If the command matches a denylist:
- `chmod 600` on a directory (the exact incident from `failure-log-2026-08-15.md` — chmod 600 on `~/.headroom` crashed the proxy)
- `rm -rf ~/.headroom` or `rm -rf ~/.local/pipx/venvs/headroom-ai`
- `launchctl bootout gui/$(id -u)/com.headroom.proxy` (would kill the proxy)
- **throw to block** with an explanation:
  ```
  throw new Error("Blocked: <command> would damage the headroom proxy. If intentional, explain why in the task and run manually.")
  ```
- Denylist is a constant array at the top of the plugin, easy to extend
- This is the "physics, not prompts" layer — prevents the chmod 600 class of incident

#### Hook 4: `event` on `session.idle` — failure learning (debounced)

Fires when a session goes idle (turn ended). Debounced: runs at most once per session (track session IDs in a Set).
- Run `headroom learn --agent opencode --apply --target ~/.agents/docs/learned-patterns.md --model deepseek/deepseek-v4-flash` via `$`
- If `headroom learn` is not installed or fails: log warning, continue (fail-open)
- If `learned-patterns.md` already has a marker block from this session: skip
- This automates Phase 3 (failure learning) — no manual trigger needed

### 2b. Plugin structure

```typescript
// ~/.config/opencode/plugins/enforce.ts
// PSEUDOCODE — Spikes A-D (section 2b.1) must resolve before implementation.
// The code below illustrates intent; arg shapes, throw behavior, event shapes
// are all SPIKE-DEPENDENT and may change.
import type { Plugin } from "@opencode-ai/plugin"

const RESEARCH_DIR = `${process.env.HOME}/.agents/docs/research`
const PLANS_DIR = `${process.env.HOME}/.agents/docs/plans`
const DENYLIST = [
  // chmod 600 on DIRECTORIES only — files like ~/.ssh/id_rsa legitimately use 600.
  // Best-effort patterns — trivially bypassed (absolute paths, $HOME, chmod u=rw).
  // Documented as best-effort, not a security boundary.
  { pattern: /chmod\s+(-R\s+)?600\s+~\/\.headroom\b/, message: "chmod 600 on ~/.headroom strips execute bit from directory — use chmod 700" },
  { pattern: /chmod\s+(-R\s+)?600\s+~\/\.local\/pipx/, message: "chmod 600 on pipx dir strips execute bit — use chmod 700" },
  { pattern: /rm\s+-rf\s+~\/\.headroom\b/, message: "removing ~/.headroom destroys the proxy state" },
  { pattern: /rm\s+-rf.*headroom-ai/, message: "removing the headroom pipx venv destroys the proxy" },
  { pattern: /launchctl\s+bootout.*com\.headroom\.proxy/, message: "this would kill the headroom proxy" },
]

// Cap the Set to prevent unbounded growth in long-lived opencode process.
// Clear on session.end or when size exceeds 100 entries.
const learnedSessions = new Set<string>()
const MAX_LEARNED_SESSIONS = 100

export const Enforce = async ({ $, client }) => {
  return {
    // SINGLE tool.execute.after handler — JS object keys must be unique.
    // Merged Hook 1 (frontmatter) + Hook 5 (review SOP reminder).
    "tool.execute.after": async (input, output) => {
      if (input.tool !== "edit") return
      // SPIKE C: verify which object carries args for tool.execute.after.
      // Pseudocode uses input.args — may need output.args depending on spike.
      const filePath = input.args?.filePath ?? output.args?.filePath
      if (!filePath) return

      // Hook 1: frontmatter enforcement on research docs
      if (filePath.startsWith(RESEARCH_DIR)) {
        try {
          const result = await $`bun ~/.agents/bin/src/frontmatter-check.ts ${filePath}`.quiet()
          if (result.exitCode === 1) {
            output.metadata = { ...output.metadata, frontmatter_warning: result.stdout }
          }
        } catch { /* fail-open */ }
      }

      // Hook 5: review SOP reminder on plan docs
      if (filePath.startsWith(PLANS_DIR) && filePath.endsWith(".md")) {
        output.metadata = {
          ...output.metadata,
          review_reminder: `Run \`bun ~/.agents/bin/src/reviewer-loop.ts --plan ${filePath} --models z-ai/glm-5.2,moonshotai/kimi-k3\` for cross-model review (runbook SOP line 1896).`,
        }
      }
    },

    "tool.execute.before": async (input, output) => {
      // SPIKE B: throw-to-block may not work — may need permission.ask instead.
      // SPIKE: args live in output.args (verified for .before in dist/index.d.ts:235-241)
      if (input.tool === "bash") {
        const cmd = output.args?.command ?? ""

        // Commit gate — resolve repo root from the command, not process.cwd()
        // git pathspecs don't expand ~, use $HOME
        if (/(^|&&|\|)\s*git commit/.test(cmd)) {
          try {
            const staged = await $`git diff --cached --name-only -- ${process.env.HOME}/.agents/docs/research/`.quiet()
            const files = staged.stdout.trim().split("\n").filter(f => f)
            if (files.length > 0) {
              // Pass files as separate args, not a single joined string
              const result = await $`bun ~/.agents/bin/src/frontmatter-check.ts ${files}`.quiet()
              if (result.exitCode === 1) {
                throw new Error(`frontmatter violations detected in staged files — fix before committing:\n${result.stdout}`)
              }
            }
          } catch (e) {
            // Only re-throw if it's our frontmatter error, not a git failure
            if (e instanceof Error && e.message.includes("frontmatter violations")) throw e
          }
        }

        // Dangerous command gate — best-effort, not a security boundary
        for (const rule of DENYLIST) {
          if (rule.pattern.test(cmd)) {
            throw new Error(`Blocked: ${rule.message}`)
          }
        }
      }
    },

    "event": async ({ event }) => {
      // SPIKE D: verify session.idle event shape
      if (event.type === "session.idle" && !learnedSessions.has(event.properties?.sessionID)) {
        // Cap Set size to prevent unbounded growth
        if (learnedSessions.size >= MAX_LEARNED_SESSIONS) learnedSessions.clear()
        learnedSessions.add(event.properties?.sessionID)

        // Dry-run by default — --apply is opt-in via env var
        // Persist output to a log file so dry-run has a consumer
        const applyFlag = process.env.HEADROOM_LEARN_AUTO_APPLY === "true" ? "--apply" : ""
        try {
          const result = await $`~/.local/bin/headroom learn --agent opencode ${applyFlag} --target ~/.agents/docs/learned-patterns.md --model deepseek/deepseek-v4-flash`.quiet()
          // Persist dry-run output so it's not wasted tokens
          if (result.stdout) {
            await $`echo ${new Date().toISOString() + "\n" + result.stdout} >> ${process.env.HOME}/.agents/logs/headroom-learn.log`.quiet()
          }
        } catch {
          // fail-open — headroom learn is not critical
        }
      }
    },
  }
}
```

#### Hook 5: review SOP reminder (merged into Hook 1's `tool.execute.after` handler)

Hook 5 is NOT a separate `tool.execute.after` key (JS object keys must be unique — duplicate keys silently overwrite). It is merged into Hook 1's handler body: after checking research docs for frontmatter, the same handler checks plans docs for the review SOP reminder.

Fires after ANY file edit. If the edited file is in `~/.agents/docs/plans/*.md`:
- Append a reminder to `output.metadata.review_reminder`:
  ```
  Run `bun ~/.agents/bin/src/reviewer-loop.ts --plan <file> --models z-ai/glm-5.2,moonshotai/kimi-k3` for cross-model review (runbook SOP line 1896).
  ```
- **Does NOT block** — the edit already happened. This is a nudge, not a gate.
- **Does NOT auto-run** the review — the conductor decides whether the plan warrants cross-model review (low-stakes plans may not). The hook makes the SOP visible; the conductor enforces it.
- If `reviewer-loop.ts` doesn't exist yet: skip silently
- This is the hook that would have caught my miss — I wrote the plan, no hook reminded me to run the SOP, so I took the shortcut

### 2b.1 Pre-Phase-2 spikes (must complete before any code)

**Per cross-model review (kimi-k3 finding 6): spikes must be resolved BEFORE writing code, not inline.**

**Spike A — plugin discovery:** Test whether `~/.config/opencode/plugins/*.ts` auto-loads without a config entry.
- If yes: no config change needed
- If no: add `"./plugins/enforce.ts"` to `opencode.jsonc` `"plugin"` array (matching superpowers pattern)
- Go/no-go: if neither path works, Phase 2 is blocked — escalate to user

**Spike B — throw-to-block:** Test whether `throw` inside `tool.execute.before` gracefully blocks (agent sees error, continues) or crashes the session.
- If throw works: use throw in Hooks 2-3
- If throw crashes: route denylist through `permission.ask` hook (which has typed `status: "deny"` per d.ts:225-227)
- Go/no-go: determines Hook 2-3 implementation pattern

**Spike C — tool.execute.after args shape:** Verify which object carries args for `tool.execute.after` (input or output — may differ from `.before`).
- Check `dist/index.d.ts` for the `after` input/output types
- Determines how Hook 1 reads `filePath`
- Go/no-go: Hook 1 cannot be written without this

**Spike D — session.idle event shape:** Verify the event object structure (`event.properties.sessionID` or different shape).
- Go/no-go: Hook 4 cannot be written without this

### 2b.2 Plugin rollback and timeout

**Per cross-model review (kimi-k3 finding 7): a hanging hook degrades every opencode session globally.**

- **Rollback:** remove the plugin entry from `opencode.jsonc` `"plugin"` array (or delete `~/.config/opencode/plugins/enforce.ts`). One-line removal, instant rollback.
- **Per-hook timeout:** wrap each hook body in a timeout (e.g., `AbortSignal.timeout(5000)` for frontmatter-check, `AbortSignal.timeout(10000)` for headroom learn). If a hook times out, fail-open (return without modifying output).
- **Hook ordering:** hooks fire in plugin load order. If `enforce.ts` is after superpowers, it fires after superpowers' transforms. Document this in the plugin file header.

### 2b.3 Hook 4 dry-run by default

**Per cross-model review (glm-5.2 finding 2, kimi-k3 finding 6): `headroom learn --apply` mutates a tracked file without a gate.**

Hook 4 runs **dry-run by default** (no `--apply`). To enable `--apply`:
- Set env var `HEADROOM_LEARN_AUTO_APPLY=true` in the opencode session
- Or manually run `headroom learn --agent opencode --apply --target ~/.agents/docs/learned-patterns.md` after reviewing the dry-run output

### 2b.4 frontmatter-check.ts --fix semantics

**Per cross-model review (glm-5.2 finding 5, kimi-k3 finding 1): `--fix` inserting `sources: []` contradicts the "non-empty array" requirement.**

`--fix` behavior for missing `sources`:
- If `--source <value>` flag is provided: use that value
- If no `--source` flag: insert `sources: ["(unknown — manual entry required)"]` (non-empty, but signals incomplete)
- Never insert empty `sources: []` — it satisfies schema but creates semantically invalid docs

### 2b.5 Acceptance criteria for hooks (per reviewer finding 8)

| Hook | Given | When | Then |
|---|---|---|---|
| Hook 1 (frontmatter) | A file in `~/.agents/docs/research/` is edited with invalid frontmatter | `tool.execute.after` fires on `edit` | `output.metadata.frontmatter_warning` is populated with violation details; exit 0 |
| Hook 2 (commit gate) | `git commit` is run with frontmatter violations in research docs | `tool.execute.before` fires on `bash` | Tool call is blocked; error message contains violation details |
| Hook 3 (dangerous cmd) | `chmod 600 ~/.headroom` is run | `tool.execute.before` fires on `bash` | Tool call is blocked; error message contains "chmod 600 strips execute bit" |
| Hook 4 (failure learning) | A session goes idle | `session.idle` event fires | `headroom learn` runs once (dry-run); second `session.idle` on same session does NOT trigger a second run |
| Hook 5 (review SOP) | A file in `~/.agents/docs/plans/*.md` is edited | `tool.execute.after` fires on `edit` | `output.metadata.review_reminder` contains the `reviewer-loop.ts` command |

**Note:** Block mechanism (throw vs permission.ask) for Hooks 2-3 is finalized after the 2b.2 spike; tests and criteria are updated to match the spike's outcome.

### 2c. Tests

**Tests:** `~/.agents/bin/test/enforce-hooks.test.ts`

- Hook 1 (frontmatter enforcement): mock an edit on a research doc, mock frontmatter-check.ts returning exit 1 → assert warning in output.metadata
- Hook 1 (happy): mock an edit on a research doc, mock frontmatter-check.ts returning exit 0 → assert no warning
- Hook 1 (non-research file): mock an edit on a non-research file → assert hook skips silently
- Hook 2 (commit gate): mock `git commit`, mock frontmatter-check.ts returning exit 1 → assert throw
- Hook 2 (commit gate happy): mock `git commit`, mock frontmatter-check.ts returning exit 0 → assert no throw
- Hook 3 (dangerous command): mock `chmod 600 ~/.headroom` → assert throw with correct message
- Hook 3 (safe command): mock `ls -la` → assert no throw
- Hook 4 (session.idle): mock session.idle event → assert headroom learn called once
- Hook 4 (debounce): mock same session.idle twice → assert headroom learn called only once
- Hook 4 (fail-open): mock headroom learn throwing → assert no throw propagates
- Hook 4 (dry-run default): mock session.idle → assert `--apply` is NOT in the command (only with env var)
- Hook 5 (review SOP): mock an edit on a plans dir file → assert `review_reminder` in metadata contains `reviewer-loop.ts`
- Hook 5 (non-plans file): mock an edit on a non-plans file → assert hook skips silently

### Checklist gate 2

- [ ] `enforce.ts` plugin written, biome-checked
- [ ] `enforce-hooks.test.ts` written with all 13 test cases
- [ ] `bun test enforce-hooks.test.ts` passes (all green)
- [ ] Manual smoke test: edit a file in `~/.agents/docs/research/` with bad frontmatter → warning appears in tool output
- [ ] Manual smoke test: `git commit` with frontmatter violations → blocked
- [ ] Manual smoke test: `chmod 600 /tmp/hook-test-decoy` (denylist temporarily includes this decoy path) → blocked
- [ ] Manual smoke test: `chmod 600 ~/.ssh/id_rsa` → NOT blocked (legitimate file permission)
- [ ] Verify superpowers plugin still works (both hooks fire — no conflict)
- [ ] Verify proxy health unchanged: `curl -sS http://localhost:8788/health | jq .status` returns "healthy"

### Reviewer gate: Phase 2

- [ ] Run cross-model review via the runbook SOP:
  ```bash
  /opt/homebrew/bin/bun ~/.agents/bin/src/reviewer-loop.ts \
    --plan ~/.agents/docs/plans/2026-08-15-headroom-fix-plan.md \
    --models z-ai/glm-5.2,moonshotai/kimi-k3 \
    --max-tokens 4000 --budget-usd 2.00
  ```
- [ ] Review scope: plugin code (correct @opencode-ai/plugin Hooks interface), denylist (comprehensive, no false positives), fail-open behavior, per-hook timeouts, interaction with superpowers
- [ ] Merge disagreements by evidence (files, SDK d.ts, runtime checks)
- [ ] Max 2 rounds, then escalate to user
- [ ] Verdict gates Phase 3

### Post-Phase-2 headroom health check

- [ ] `curl -sS http://localhost:8788/health | jq .status` returns "healthy"
- [ ] `curl -sS http://localhost:8788/stats | jq '.summary.mode'` returns "cache"
- [ ] No denylist false positives blocked legitimate commands during the smoke test

---

## Phase 3: Serena code-graph evaluation

**Trigger: scouts burning excessive tokens on code recon (already in YAGNI backlog at runbook line 2087)**

### 3a. Scratch evaluation setup

- [ ] Create a git worktree (isolated from main workspace)
- [ ] Run `headroom wrap opencode --code-graph --port 8789` in the worktree (avoids ownership race on 8788)
- [ ] Verify Serena launches via `uvx` (already installed)

**Cannot break headroom — uses port 8789, not 8788. The live proxy on 8788 is untouched.**

### 3b. Test per language

**Pass criteria (all languages):** `find_symbol` returns the correct symbol within 2 seconds. Fail = timeout, crash, or wrong symbol.

- [ ] **TS**: `find_symbol` on a known exported function, `find_referencing_symbols` on a known export, `symbol_overview` on a file. Expect: pass (TypeScript LS mature).
- [ ] **Swift**: same tests on a Swift project. Expect: pass (sourcekit-lsp mature upstream, Serena docs thin).
- [ ] **Kotlin**: same tests on a Kotlin project. Expect: may fail (official kotlin-lsp is pre-alpha per JetBrains badge at KotlinConf May 2026). If it fails: verify Serena fails open (returns nothing, does not crash) and document the failure.

### 3c. Document fallback tooling

**Per reviewer finding 3: ast-grep is NOT installed.**

- [ ] If Kotlin LSP is unstable and ast-grep is needed as structural fallback: `brew install ast-grep` and verify `ast-grep --version` works
- [ ] Alternatively, document Semgrep (already in MCP config) as the structural fallback for Kotlin
- [ ] Document findings in `~/.agents/docs/research/<date>-serena-code-graph-evaluation.md` with canonical frontmatter

### 3d. Decision gate

**Per reviewer finding 8: permanent Serena in opencode.jsonc adds tool-schema tokens to every frozen prefix (schemas never compressed).**

- [ ] If ≥2/3 languages pass: decide between:
  - **Per-project enablement** (recommended): Serena MCP tools enabled per-project via a project-local opencode config, not globally
  - **Global enablement**: add Serena to `opencode.jsonc` globally (accepts the tool-schema token cost on every frozen prefix)
- [ ] If <2/3 languages pass: keep YAGNI backlog entry, document the failure, set re-evaluation trigger to "kotlin-lsp reaches Beta"

**Checklist gate 3:**
- [ ] Scratch evaluation complete, findings documented
- [ ] Per-language pass/fail recorded
- [ ] Decision: per-project vs global vs defer (with rationale)
- [ ] If enabling: Serena MCP config added (per-project or global), worktree cleaned up
- [ ] If deferring: YAGNI backlog updated with re-evaluation trigger
- [ ] Port 8789 scratch proxy stopped, worktree cleaned up

### Post-Phase-3 headroom health check

- [ ] `curl -sS http://localhost:8788/health | jq .status` returns "healthy" (live proxy untouched)
- [ ] Port 8789 is no longer listening (scratch proxy stopped)

---

## Phase 4: Failure learning

**Trigger: next autonomous session (Phase 2 Hook 4 automates this — this phase validates the automation works)**

### 4a. Dry run

- [ ] Run `headroom learn --agent opencode` (dry-run, no `--apply`)
- [ ] **Per reviewer finding 8**: pin a cheap model for the LLM analysis: `headroom learn --agent opencode --model deepseek/deepseek-v4-flash` ($0.064/M)
- [ ] Review the recommendations output

### 4b. Test --target flag

- [ ] Run `headroom learn --agent opencode --apply --target ~/.agents/docs/learned-patterns.md`
- [ ] Verify the file was created with marker blocks:
  ```markdown
  <!-- headroom:learn:start -->
  ## Headroom Learned Patterns
  *Auto-generated by `headroom learn` -- do not edit manually*
  ...
  <!-- headroom:learn:end -->
  ```
- [ ] If `--target` does not work for opencode writer (docs say "Claude Code only"):
  - Let it write to `CLAUDE.local.md` (gitignored by default)
  - Manually copy the marker block to `~/.agents/docs/learned-patterns.md`

### 4c. AGENTS.md pointer (keep under 200 LOC)

**Per reviewer finding 8: name the file explicitly — `~/.config/opencode/AGENTS.md` (43 lines today).**

- [ ] Add ONE pointer line to `~/.config/opencode/AGENTS.md`:
  ```
  - Headroom-learned patterns: see ~/.agents/docs/learned-patterns.md
  ```
- [ ] Verify `~/.config/opencode/AGENTS.md` stays under 200 LOC

### 4d. Verify Phase 2 Hook 4 automation

- [ ] End a session (trigger `session.idle`) and verify `headroom learn` ran automatically (check `learned-patterns.md` mtime)
- [ ] Verify debounce: trigger `session.idle` twice on the same session — `headroom learn` runs only once
- [ ] Verify fail-open: if `headroom learn` is not installed, the session ends without error

### 4e. Evaluate usefulness

- [ ] After 2-3 autonomous sessions with `headroom learn` running (automated via Phase 2 Hook 4):
  - Are the learned patterns actionable? (file path corrections, command patterns, search scope)
  - Are they reducing failures in subsequent sessions?
- [ ] If useful: the Phase 2 Hook 4 automation is the permanent mechanism — no manual step needed
- [ ] If noise: disable Hook 4 in `enforce.ts`, remove the AGENTS.md pointer line, document

**Checklist gate 4:**
- [ ] Dry-run output reviewed
- [ ] `--target` behavior documented (works or workaround applied)
- [ ] AGENTS.md has one pointer line, stays under 200 LOC
- [ ] `learned-patterns.md` created with marker blocks
- [ ] Phase 2 Hook 4 automation verified (runs on session.idle, debounced, fail-open)
- [ ] Usefulness evaluation scheduled (after 2-3 sessions)

---

## Phase 5: Inter-agent context compression

**Trigger: conductor subagent dispatch exceeding 5K tokens per handoff**

**Per reviewer finding 2 — completely rewritten: evaluate MCP CCR first, do NOT build a per-process Map.**

### 5a. Evaluate MCP capability first

**Precondition step 0 (added 2026-08-16): the headroom MCP block was REMOVED from `opencode.jsonc` (YAGNI). Before evaluating MCP tools, re-add it.**

- [ ] Re-add the headroom MCP block to `opencode.jsonc` from git history or the runbook template. See `2026-08-16-headroom-mcp-removal.md` for the removal decision and rationale. Only re-add if MCP is judged better than scripts calling `/v1/compress` via `fetch()` — if scripts suffice, skip 5a/5b and go directly to 5c.
- [ ] Restart opencode, verify `headroom_compress` / `headroom_retrieve` / `headroom_stats` appear as tools

- [ ] Test the existing MCP tools for inter-agent context compression:
  - Conductor calls `headroom_compress` on large subagent results (scout returns 50K tokens → compress → ~10K)
  - Conductor passes compressed version + CCR hash to downstream agents
  - Downstream agents call `headroom_retrieve` with the hash if they need full detail
- [ ] Verify this works cross-process (MCP server is a separate process from opencode, CCR store is shared via `~/.headroom/ccr_store.db`)
- [ ] Measure token savings on a real conductor dispatch with >5K token handoff

### 5b. If MCP tools suffice

- [ ] Document the pattern in a research note: "Inter-agent context compression via MCP CCR"
- [ ] No new script needed — the MCP tools are already wired
- [ ] Add to conductor protocol: "when subagent returns >5K tokens, call headroom_compress before passing to downstream agents"

### 5c. If MCP tools are insufficient

- [ ] Extend `headroom-compress.ts` with a `compressAndStore()` function:
  - Calls `/v1/compress` with `config.mode="ccr"`
  - Stores hash → key mapping in a **file-backed store** (NOT a per-process Map — a JSON file at `~/.headroom/shared-context.json` that survives across processes)
  - `retrieveByKey(key)` calls `/v1/retrieve` with the stored hash
  - TTL: 7200s (depends on Phase 6 CCR TTL raise)
- [ ] Tests: compress → retrieve round-trip, TTL expiry, concurrent compress from parallel subagents (file-backed store, append-only writes with file lock to prevent lost-update race)

### 5d. Prerequisite: raise CCR TTL

**Per reviewer finding 4: this step duplicates Phase 6b. Do NOT re-perform the plist change here.**

- [ ] Ensure Phase 6b is complete (CCR TTL raised to 7200, proxy restarted, verified)
- [ ] Verify: `curl -sS http://localhost:8788/v1/retrieve/stats | jq '.store.default_ttl_seconds'` returns 7200
- [ ] If Phase 6b is not yet triggered: Phase 5 cannot activate — defer until the trigger fires

**Checklist gate 5:**
- [ ] MCP CCR evaluation documented (suffices or does not)
- [ ] If MCP suffices: pattern documented, conductor protocol updated, no new script
- [ ] If MCP insufficient: file-backed shared-context.ts written, tested, integrated
- [ ] CCR TTL raised to 7200 BEFORE activation
- [ ] Post-change health check: proxy healthy, mode still "cache"

---

## Phase 6: Remaining optimizations (various triggers)

| # | Item | Trigger | Action | Can break headroom? |
|---|---|---|---|---|
| 6a | Delete dormant npm SDK | Next workspace cleanup | `rm -rf ~/node_modules/headroom-ai`; remove from `~/package.json` and `~/package-lock.json` | **No** — not wired to anything |
| 6b | Raise `HEADROOM_CCR_TTL_SECONDS` to 7200 | First autonomous run >30 min OR Phase 5 activation | 1. Backup plist: `cp ~/Library/LaunchAgents/com.headroom.proxy.plist ~/backups/plist-pre-ttl-$(date +%s).plist` (capture the backup path in a variable) 2. Add `HEADROOM_CCR_TTL_SECONDS` → `7200` to plist `EnvironmentVariables` dict 3. Restart proxy: `launchctl kickstart -k gui/$(id -u)/com.headroom.proxy` 4. Verify health: `curl -sS http://localhost:8788/health | jq .status` returns "healthy" 5. Verify TTL: `curl -sS http://localhost:8788/v1/retrieve/stats | jq '.store.default_ttl_seconds'` returns 7200 6. If health check FAILS: rollback — `cp <backup-path> ~/Library/LaunchAgents/com.headroom.proxy.plist && launchctl kickstart -k gui/$(id -u)/com.headroom.proxy` 7. Verify rollback: `curl -sS http://localhost:8788/health | jq .status` returns "healthy" 8. If rollback also fails: escalate to user | **Low risk** — env var addition, proxy restart. Rollback + post-rollback health check documented. |
| 6c | `simulate()` in stack-check.ts | Before any future profile/config change | Add `headroomSimulate()` to `headroom-compress.ts`; call in stack-check to verify compression without spending tokens | **No** — /v1/compress is LLM-free |
| 6d | ~~`--memory-storage project` scope verification~~ | ~~N/A~~ | **Removed per reviewer finding 6 — code accepts `project` as valid, it's the default** | N/A |
| 6e | ast-grep install | Serena evaluation fails for Kotlin (Phase 3) | `brew install ast-grep`, verify `ast-grep --version` | **No** |

### Building now (immediate phases — not deferred)

```
| frontmatter-check.ts | Phase 0a |
| headroom-compress.ts helper | Phase 1 |
| opencode enforcement hooks (enforce.ts plugin) | Phase 2 |
```

### YAGNI backlog additions (append to runbook § Prune rules — deferred with triggers)

```
| Serena code-graph evaluation | scouts burning excessive tokens on code recon |
| headroom learn --agent opencode | next autonomous session (automated via Phase 2 Hook 4) |
| Inter-agent context compression (MCP CCR first) | conductor subagent dispatch exceeding 5K tokens per handoff |
| HEADROOM_CCR_TTL_SECONDS=7200 | first autonomous run >30 min OR Phase 5 activation |
| Delete dormant npm SDK headroom-ai@0.22.4 | next workspace cleanup |
| simulate() in stack-check.ts | before any future profile/config change |
| ast-grep install (if needed for structural fallback) | Serena evaluation fails for Kotlin |
| frontmatter-check --find (keyword routing) | grep proves insufficient for doc routing OR subagents regularly miss relevant docs |
```

---

## Constraints (carry forward from existing docs)

- **No vendor code patches** (headroom/litellm `.py`). Config, env vars, and independent scripts only.
- **Durable scripts**: TypeScript via bun, biome-checked, `bun test` with happy + unhappy paths.
- **Cost discipline**: probes use `z-ai/glm-5.2` ($0.46/M) unless a specific model is under test. `headroom learn` uses `deepseek/deepseek-v4-flash` ($0.064/M).
- **Conductor pattern**: delegate to subagents; human gates = plan approval before, merge approval after.
- **YAGNI**: every deferred item has a NAME and explicit trigger; nothing built speculatively.
- **Any headroom/litellm upgrade** wipes litellm pricing injections → rerun `sync-model-pricing.ts --apply` after upgrades.
- **Do NOT touch the live plist** during Phase 0-2. The plist already says `--mode cache` (correct). Only Phase 6b touches the plist (adds an env var, does not change the mode).

## What this plan does NOT do

- Does not change the savings profile (already optimal: `coding` + `--mode cache`)
- Does not install the npm SDK (scripts call `/v1/compress` via `fetch()` directly)
- Does not build SharedContext speculatively (Phase 5 evaluates MCP CCR first, triggers on token budgets)
- Does not touch the proxy plist's mode flag (already correctly `cache`)
- Does not verify `--memory-storage project` (already correct per reviewer finding 6)
- Does not wire hooks speculatively — Phase 2 wires 4 hooks with clear enforcement purposes (frontmatter, commit gate, dangerous commands, failure learning)

## Quick reference

- Proxy: `http://localhost:8788` (health `/health`, stats `/stats`, dashboard `/dashboard`)
- Plist: `~/Library/LaunchAgents/com.headroom.proxy.plist`
- OpenCode config: `~/.config/opencode/opencode.jsonc` (baseURL `localhost:8788/v1`, `setCacheKey: true`)
- Scripts: `~/.agents/bin/src/{stack-check,reviewer-loop,sync-model-pricing,prefix-diff,cache-probe}.ts` (all tested, 27 bun tests)
- Backups: `~/backups/headroom-setup-2026-08-15/`
- Research: `~/.agents/docs/research/2026-08-15-headroom-sdk-utilization.md` (full docs synthesis)
- Savings profiles: `coding` (default, cache, ~50%) | `balanced` (token, ~70%) | `agent-90` (token+force_kompress, ~90%) | `general` (token, ~60%)
- CCR default TTL: 1800s (30 min) — raise to 7200 for long autonomous runs
- `/v1/compress` response: snake_case (`tokens_before`, `tokens_after`, `tokens_saved`, `compression_ratio`, `ccr_hashes`)
