---
date: 2026-08-16
topic: Fix inert agent deny-glob rules + relocate agent definitions into the repo with a sync deploy
status: open
sources:
  - conductor session 2026-08-16 (deny-glob probe found permission rules inert)
  - opencode docs (permissions: last matching rule wins; edit patterns match file paths)
  - docs/plans/2026-08-16-light-factory-plan.md (system of record, Deferred section)
models_used_for_research: []
supersedes: none
---

# Plan: Fix inert deny-glob rules + relocate agent definitions into the repo

## Context

At activation (2026-08-16), the conductor dispatched an implementer deny-glob
probe. All three "denied" surfaces (AGENTS.md, docs/plans, backlog/) were
writable — the deny rules were inert. Root cause: **last-match-wins**. The
implementer agent frontmatter had `"**/*": allow` as the LAST rule, overriding
every `deny` above it. The same bug affected `researcher.md` (couldn't write
its own zone) and `qa.md` (couldn't edit test files). The bug was invisible
because `~/.config/opencode/agents/` is not under version control — no diff,
no review, no revert.

## Scope

Two pieces of work, one branch:

1. **Deny-glob fix** (emergency hotfix, already applied in-place to
   `~/.config/opencode/agents/{implementer,researcher,qa}.md` — needs
   recording + bootstrap into the repo)
2. **Agent source-of-truth relocation** — move agent definitions from
   `~/.config/opencode/agents/` (unversioned) into `~/.agents/agents/`
   (in-repo, version-controlled) and deploy to the opencode-discovered
   location via a new `--sync` mode on `agents-install.ts`

## Changes

### 1. Bootstrap agent definitions into the repo

- `mkdir ~/.agents/agents/` (in the worktree)
- `cp ~/.config/opencode/agents/*.md ~/.agents/agents/` (the fixed versions
  with the deny-glob reorder applied are the initial canonical content)
- Commit: "import agent definitions into repo (source-of-truth relocation)"

### 2. Implement `agents-install.ts --sync`

The existing `agents-install.ts` (runbook §6.9) is a Phase 0 skeleton with
`--help` and read-only `--check` only. Add a `--sync` mode:

- Copies `~/.agents/agents/*.md` → `~/.config/opencode/agents/`
- **Drift detection** (the non-obvious correctness requirement): before
  overwriting a target file, compare it against the source. If the target
  has changes not present in the source, exit 1 with a diff naming the
  drifted file. Do NOT overwrite. This catches direct in-place edits
  (like the hotfix) before they are silently clobbered.
- Exit 0 on clean copy (all targets match source or are new)
- Exit 1 on drift (refuses to overwrite, prints diff)
- Exit 2 on error (missing source dir, missing target dir, bad flags)
- `--help` updated to document `--sync`

### 3. Post-merge git hook

- `~/.agents/.git/hooks/post-merge` (not version-controlled itself, but
  trivial — one line): calls
  `bun ~/.agents/bin/src/agents-install.ts --sync`
- Fires after `git merge`/`git pull` on main
- Merge-to-main is human GATE 2 — the hook deploys reviewed content

### 4. Manual sync for worktree testing

- Same `--sync` script, invoked manually
- When agent changes are drafted in a worktree, the post-merge hook hasn't
  fired yet. The manual sync deploys from the worktree's `agents/` dir to
  `~/.config/opencode/agents/` so changes can be tested before merge.
- Both entry points call the same script (DRY, one code path).

### 5. Tests

`agents-install.test.ts` gains happy + unhappy path tests for `--sync`:
- Clean copy: source → target, all consistent, exit 0
- Drift refusal: target has unsourced changes → exit 1, diff printed, no
  overwrite
- Missing source dir → exit 2
- Missing target dir → exit 2

### 6. Docs

- Runbook §6.9 (`~/.agents/AGENT-STACK-RUNBOOK.md`): document `--sync` mode
- `~/.agents/bin/AGENTS.md` inventory table: update `agents-install.ts` row
- `docs/plans/2026-08-16-light-factory-plan.md` Deferred section: mark
  `agents-install.ts --sync` as UN-DEFERRED with trigger + cross-ref
- `docs/spec/2026-08-16-agent-source-of-truth.md`: the decision record
  (relocation, Both trigger, drift guardrail, agents-only scope)

## Acceptance criteria

1. `bun ~/.agents/bin/src/agents-install.ts --sync` copies
   `~/.agents/agents/*.md` → `~/.config/opencode/agents/`, exit 0 on clean
2. Drift: target with unsourced changes → exit 1, diff printed, no overwrite
3. Missing source dir → exit 2 with clear error
4. Missing target dir → exit 2 with clear error
5. Post-merge hook installed, fires after merge/pull on main
6. Manual `--sync` from a worktree deploys that worktree's `agents/` dir
7. `agents-install.test.ts` covers: clean copy, drift refusal, missing source,
   missing target
8. Runbook §6.9 + `bin/AGENTS.md` inventory updated
9. Bootstrap: fixed agent files committed into `~/.agents/agents/`

## Test guardrails

- TDD red-first: write the `--sync` tests before the implementation
- Run `cd ~/.agents/bin && bun test` — all tests must pass
- Negative path: drift detection must be tested (the guard is worthless
  without a test that proves it refuses)
- `bunx --bun @biomejs/biome@2.0.0 check --write` on changed .ts files

## What is NOT in scope

- `opencode.jsonc` and `~/.config/opencode/plugins/` stay in place,
  unversioned (YAGNI — extend later if config drift bites)
- The deny-glob hotfix in `~/.config/opencode/agents/` is not reverted — it
  is needed for the restart. It gets re-derived properly when the bootstrap
  copies the fixed files into `~/.agents/agents/` and the sync deploys them.
- `worktree-setup.ts` (separately deferred in the plan)
- Normalizing `**` → `*` in permission patterns (intake #4 dialogue, not
  this surgical fix)
