# Rollback Mechanism for Rejected Steps

**Status:** Open blindspot — spec mentions rollback as a gap but specifies no
mechanism.
**Severity:** High. Affects the integrity of the verification gate.

## The Problem

Addy Osmani's S principle: "the agent forgets, the repo doesn't." Weavelog
sub-agents write files to disk during a step. If the human **rejects** the
diff at the verification gate ("n — re-run with feedback"), the sub-agent's
files are already in the working tree. There is no automatic rollback.

Without rollback, "re-run with feedback" operates on a dirty tree — the
rejected work compounds into the next attempt. This undermines the
deterministic verification principle.

## The Verified Mechanism

Pi ships an example that does exactly this:
`examples/extensions/git-checkpoint.ts`. It uses:
- `pi.exec("git", ["stash", "create"])` on `turn_start` — captures a ref
  before changes.
- `git stash apply <ref>` on fork — restores state.

Weavelog should adopt this at the **step level**, not the turn level:
- Before each workflow step spawns, create a git stash ref (or a branch
  checkpoint).
- On rejection: `git reset --hard <ref>` to restore, then re-run with
  feedback.
- On approval: discard the ref, advance to next step.

## Decisions to Make

1. **Stash vs branch vs commit-and-revert.** Stash is simplest but doesn't
   survive a Pi crash (in-memory map in git-checkpoint.ts). A branch
   checkpoint (`git branch weavelog/step-<id>`) survives crashes and is
   inspectable. Recommend branch.
2. **Where the checkpoint ref is stored.** If state lives in the Pi session
   tree (`pi.appendEntry`), the ref survives `/resume`. If state is
   in-memory only, a crash loses the ref and rollback breaks. Reinforces the
   "state in session tree" decision.
3. **Worktree interaction.** If we later adopt per-step worktrees (deferred
   from v1), rollback = discard the worktree. Simpler. But v1 is sequential,
   shared cwd, so we need explicit rollback.
4. **Newly-created files.** `git stash`/`reset` handles tracked files.
   Untracked files created by the step need `git clean -fd` or explicit
   tracking. Risk: deleting files the user wanted. Need a safe rule (only
   clean files created since the checkpoint, tracked via the stash ref).

## Outcome Needed
A spec section: "Step Rollback" defining the checkpoint strategy, the
approval/rejection flow, and crash-recovery semantics.
