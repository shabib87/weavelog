# 2026-07-22 — Chain 1 telemetry: Phase 1.95 gate realism

First execution of the fast-track handoff
(`docs/superpowers/plans/2026-07-22-moe-fast-track-to-phase-4.md`).
Telemetry is conductor-recorded (manual per handoff; per-chain token
attribution is a Phase 4 feature).

## Chain 0 — pre-flight (DeepSeek v4 Flash, trivial runs)

- `outputSchema` + `expand` + `collect`: WORKS (chain 4d43abe9, 3 steps,
  15.6s). Constraints learned: `expand.from.path` must be a JSON Pointer
  (`/items`); expand parallel template must be a single object, not array.
- `worktree: true` (top-level parallel): WORKS — per-task temp worktrees
  (`pi-worktree-*`, branches `pi-parallel-*`). Requires clean git state
  (stash needed when package files are dirty).
- Per-`expand`-item worktrees: untested, undocumented — Chain 3 uses
  top-level parallel + worktree instead.

## Chain 1 — Phase 1.95 (worker + 2 validators)

| Role | Model | Outcome |
|---|---|---|
| Worker (sole writer) | GLM-5.2 | 6 files, all gates self-verified green, honest deviation list |
| Validator (correctness) | Kimi K2.7-Code | SHIP; re-ran all gates independently; 1 residual note |
| Validator (philosophy) | GLM-5.2 | SHIP; 3 note-level findings, all valid |

Conductor fixed all 3 notes directly (~5 min, no worker round-trip):
README distribution was RESOLVED in the TBD (npm primary, Homebrew wraps
npm — validator 2 was right, the earlier audit's "unresolved" claim was
wrong); TBD open count 6-of-7; biome `includes` extended to tests/.

## Verification evidence (final, conductor-run)

- `npx biome check` PASS (4 files incl. tests/)
- `npx tsc --noEmit` PASS
- `npm test` PASS (1/1)
- ci.yml YAML-valid; README links resolve; scripts runnable

## Supply-chain security (new install-act checklist, earned today)

- `npm audit`: 0 vulnerabilities
- `npm audit signatures`: 8/8 verified, 5/8 Sigstore attestations
- Install hooks: none in any installed package (primary attack vector)
- typescript held at ^5.9.3; 7.0.2 released same-day — avoided
- semgrep 1.156.0: 378 rules, 0 findings (update available; deferred)
- package-lock.json committed = byte-identical future installs

## Process learnings

1. Pre-flight smoke tests on trivial cheap runs before depending on new
   mechanics — caught 3 syntax constraints for cents.
2. Installs before fanout; dirty package files block worktree isolation.
3. Conductor fixes validator notes; workers only on blocker flags.
4. K2.7-Code validates well with explicit commands in the prompt.
5. Gates between runs (not inside chains) worked — one coherent human
   diff review.
6. Validators catch audit errors: the "npm-vs-Homebrew unresolved" claim
   from the morning audit was itself wrong; second-order checking pays.
