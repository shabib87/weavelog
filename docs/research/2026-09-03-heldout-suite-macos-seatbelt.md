---
date: 2026-09-03
topic: held-out acceptance suite for loopeng — outrigger heldout-suite mechanics, macOS Seatbelt read-denial feasibility, minimal no-warden version
status: complete
sources:
  - "https://raw.githubusercontent.com/dwijenpatel/outrigger/main/tools/heldout-suite/README.md"
  - "https://raw.githubusercontent.com/dwijenpatel/outrigger/main/tools/merge-gate/README.md"
  - "https://github.com/dwijenpatel/outrigger"
  - "https://github.com/anthropic-experimental/sandbox-runtime/issues/8 (Seatbelt read-deny repro + rename bypass)"
  - "https://github.com/apple/containerization/issues/737 (sandbox-exec deprecation question, 2026-05)"
  - "https://github.com/mkke/seatbelt (sandbox-exec vs sandbox_init API reference)"
  - "https://zameermanji.com/blog/2025/4/1/sandboxing-subprocesses-in-python-on-macos/"
  - "https://wts.dev/posts/sandbox-spawnattrs-escape/ (CVE-2026-20628)"
  - "https://opencode.ai/docs/permissions/ (verified locally 2026-08-16, not refetched)"
models_used_for_research:
  - openrouter/z-ai/glm-5.3-flash
supersedes: none
---

# Held-out acceptance suite: mechanism, macOS feasibility, minimal version (2026-09-03)

## 1. Outrigger heldout-suite — verified mechanics

All from `tools/heldout-suite/README.md` (fetched 2026-09-03). Pure stdlib Python + git, four verbs:

- **materialize** — builds authoring workspace at `--out DIR`; **refuses any `--out` resolving inside
  the judged repo** (realpath + symlinks covered). Rationale: v1's in-repo suite "rode git history
  into every implementer worktree". Scope file carries only this task's entry + plan-level
  goal/non-goals — never sibling tasks.
- **validate** — runs the suite in a throwaway clean checkout of the recorded base commit (600s
  deadline; hung = policy failure). **Fails-on-base policy: ≥1 test must fail on base.** The
  failed/passed/errored split is recorded; base-passers stay as regression guards; ImportError on
  not-yet-existing modules counts as failing.
- **seal** — re-validates, writes `manifest.json` (spec sha256, base sha, per-file sha256s, exact
  consumer invocation, `fails_on_base`), **prints the manifest's own sha256** as an out-of-band
  anchor recorded in a git-committed ledger. Re-seal requires `--retire` (archives old evidence,
  never overwrites); human edits re-seal with `--adjudicated-by` on the record.
- **verify** — recomputes every file hash + spec hash **immediately before every use**; exit 0
  fresh / 1 diverged.
- Also emits **`deny-fragment.json`**: "deny-read of the whole realpathed workspace, ready to merge
  into an implementer-spawner's settings" — i.e. OS-level read denial is delivered as a profile
  fragment consumed by the spawner (Claude Code sandbox-runtime `denyOnly` style), not by this tool.
- **Threat model, 3 layers:** (1) tamper window shouldn't exist — implementer never reads/writes the
  workspace, author's access ends before sealing, author never runs `seal`; (2) verify catches
  partial tampering; (3) anchor sha256 in pushed git history makes self-consistent forgery loud.
  Documented limit: a full-write adversary forging files+manifest passes verify. Escalation named
  but not built: operator-held signing key.
- **Counts-only feedback:** verified-adjacent, not verbatim. The heldout README records the
  failed/passed/errored split and denies test-content access; `merge-gate` reports
  `checks[{exit, timed_out, output_lines, output_tail}]` with **output_tail capped at 100 lines**,
  judged in a throwaway worktree after a real `merge --no-ff --no-commit`. The implementer receives
  exit codes + capped output, never suite source. Motivation quote: "an agent graded on tests it
  can see or edit games them (§3.1; 12/12 studied systems have the hole)".

## 2. macOS feasibility: Seatbelt read-denial in 2026

- **sandbox-exec is deprecated (since macOS 10.8, 2012) but fully functional** on macOS 15
  Sequoia; production users: Bazel, Nix, Homebrew, Claude Code (`@anthropic-ai/sandbox-runtime`),
  OpenAI Codex. Emits a stderr warning per invocation. No replacement published —
  apple/containerization#737 (2026-05) asks Apple for a supported C API/timeline; unresolved.
  Kernel mechanism underpins macOS itself → removal unlikely without a replacement, but unscheduled
  removal is the named risk. (mkke/seatbelt; containerization#737)
- **Read-denial works:** `(deny file-read* (subpath "/path/to/heldout"))` in a profile +
  `sandbox-exec -f profile.sb cmd` → "Operation not permitted" (reproduced in
  anthropic-experimental/sandbox-runtime#8). Sandbox is inherited by all children, irreversible
  once applied.
- **Known bypass + fix:** `mv` uses `rename()`, a write on the *parent*, so `file-read*` deny alone
  can be escaped by moving the file/dir then reading at the new path. Fix (merged PR #9): also
  `(deny file-write-unlink)` on the denied path **and its ancestors**.
- **Recent escape patched:** CVE-2026-20628 (child process spawn-attrs could switch to a more
  permissive built-in profile), fixed macOS 26.3 (wts.dev, 2026-07-30) — the mechanism is still
  maintained.
- **Programmatic alternative:** `sandbox_init_with_parameters` via ctypes in `preexec_fn`
  (Zameer Manji post) — no CLI, sandbox applied in-process before exec.
- **Layer split matters:** in Claude Code, sandbox enforces bash subprocesses only; Read/Edit/Write
  tools are app-layer permission checks. Same split applies to opencode: its `permission` block
  (read/write/edit/bash globs, `external_directory` key) is **tool-gating policy, not OS
  enforcement** — a bash subprocess not under a Seatbelt profile can read a denied path.
- **Alternatives:** separate OS user (works but clunky on macOS-first single-user setups; ACLs are
  owner-bypassable); container (Apple Containers / VM — real isolation, heavy for a gate); per-tool
  deny rules in opencode permissions (cheap, app-layer only — fine as defense-in-depth, not as the
  wall).

## 3. Loopeng version

- **v0 — minimal shippable (no warden, S):** a single `heldout.py`-shaped script (stdlib + git):
  `materialize` (refuse in-repo out), `validate` (fails-on-base in clean checkout, hard deadline),
  `seal` (sha256 manifest + printed anchor), `verify` (hash recheck before every run). Authoring
  skill/ROLE contract for a separate-worker dispatch; tests live outside the repo; gate runs
  sealed suite in a clean worktree and reports **counts only** (pass/fail/error + exit code, no
  suite source, output tail capped). Human/conductor runs seal at the merge gate — the warden is
  the human. Implementer read-denial = opencode `permission` deny globs on the workspace path
  (policy-level; honest label: LLM-respected tool gating, per inner-harness-layers note).
- **v1 — full (M):** add `deny-fragment.json` consumption + generated Seatbelt profile wrapping
  implementer sessions and suite runs (`sandbox-exec -f … -D HELDOUT=<path>`), including the
  `file-write-unlink`-on-ancestors fix; verify-gate hook (tool.execute.before) blocking merge
  without a fresh stamp; retire/adjudication records; ledger anchor in git.
- **opencode dependencies:** v0 needs only `permission` config (agent-frontmatter permissions take
  precedence over global; `external_directory` key ships) + no hooks. v1 adds `tool.execute.before`
  hook (deny-list style, pair with `--auto` for headless runs) and a `permission.ask` hook if
  interactive; OS wall is external to opencode (sandbox-exec wrapper around the process opencode
  spawns or the runner script).
- **Build order:** (1) materialize/seal/verify script, (2) authoring contract + dispatch convention,
  (3) counts-only gate report, (4) opencode permission deny-globs, (5) Seatbelt wrapper (v1).
- **Highest-leverage single item:** the materialize-outside-repo + seal/verify manifest. It converts
  "tests are independent" from a promise into checkable evidence; every later enforcement layer
  (deny-globs, Seatbelt) hangs off that workspace+manifest contract, and it works with zero
  sandbox dependencies on day one.

## Not checked

- ROLE.md and exec-loop README not fetched (deny-fragment merge mechanics read only from heldout
  README wording). outrigger's own OS enforcement was not independently confirmed beyond that
  wording — inference, marked as such.
- sandbox-exec not executed on this machine this dispatch; feasibility claims rest on the cited
  repros and docs.
- opencode permissions docs not refetched today (last verified 2026-08-16, local note).
