---
date: 2026-08-16
topic: Terminal markdown viewer for the agentic harness — glow vs frogmouth
status: open
sources:
  - https://api.github.com/repos/charmbracelet/glow (fetched 2026-08-16)
  - https://api.github.com/repos/Textualize/frogmouth (fetched 2026-08-16)
  - https://api.github.com/repos/charmbracelet/glow/releases?per_page=10 (fetched 2026-08-16)
  - https://api.github.com/repos/Textualize/frogmouth/releases?per_page=10 (fetched 2026-08-16)
  - https://api.github.com/repos/charmbracelet/glow/contributors?per_page=100 (fetched 2026-08-16)
models_used_for_research: [moonshotai/kimi-k3]
supersedes: none
---

# Terminal markdown viewer: adopt glow

## Verdict: charmbracelet/glow (pin v3.0.0, released 2026-08-11)

## Identity gate (2026-08-16)

| | glow | frogmouth |
|---|---|---|
| Canonical repo | charmbracelet/glow | Textualize/frogmouth |
| fork / archived / renamed | false / false / no rename indicators | false / false / no rename indicators |
| Created | 2019-11-04 | 2023-04-03 |

Both repos are their original homes; no star-transfer hazard. Category: both are terminal
markdown viewers (same category — direct competitors). Sub-type differs: glow is a stdout
CLI renderer (pipe-friendly, optional TUI stash); frogmouth is an interactive TUI browser.

## Live numbers (fetched 2026-08-16)

| Signal | glow | frogmouth |
|---|---|---|
| Stars / forks | 26,905 / 745 | 3,267 / 84 |
| Last push | 2026-08-16 (same day) | 2024-08-01 (>12 months dead) |
| Latest release | v3.0.0 — 2026-08-11 | v0.9.1 — 2023-11-02 |
| Release cadence | v3.0.0 (2026-08), v2.1.2 (2026-04), v2.1.1 (2025-05), v2.1.0 (2025-02), v2.0.0 (2024-08) | none in ~2.75 years; never left 0.x |
| Contributors | 49 listed | not retrieved (fetch budget exhausted) |
| Open issues | 221 | 46 |
| Commits last 90d | not counted (jq parse failure); activity proven by pushed_at + v3.0.0 cut 2026-08-11 | 0 (derived from pushed_at 2024-08-01) |

## Rubric scores (0–5 × weight)

| Signal (weight) | glow | frogmouth |
|---|---|---|
| Stars/adoption (10%) | 5 → 0.50 | 2 → 0.20 |
| Repo age (10%) | 5 → 0.50 | 3 → 0.30 |
| Commit frequency (20%) | 5 → 1.00 | 0 → 0.00 |
| Release cadence (15%) | 5 → 0.75 | 0 → 0.00 |
| Contributors (10%) | 5 → 0.50 | 1 → 0.10 (partial evidence: zero PR-merge activity proven) |
| Open-issue health (10%) | 3 → 0.30 (issues endpoint not pulled; 221 open vs very active org) | 1 → 0.10 (46 open, zero code activity in a year = pile-up) |
| Harness fit (15%) | 5 → 0.75 (non-interactive stdout render, `glow -p`, pipe-friendly) | 1 → 0.15 (requires interactive TTY browser; fights a non-interactive harness) |
| Exit cost (10%) | 5 → 0.50 (pure viewer, no SSOT duplication) | 4 → 0.40 (viewer, low lock-in; pinned to frozen dep stack) |
| **Total** | **4.80 / 5** | **1.25 / 5** |

## Red flags

- **frogmouth — maintainer disappearance**: no push since 2024-08-01, no release since
  2023-11-02. Abandoned in practice (not archived). Veto-level for new adoption.
- **frogmouth — fit veto**: interactive TUI-only; rubric rule "fit and exit cost are vetoes,
  not just points" applies independently of its score.
- **glow — watch item (not a veto)**: 221 open issues; v3.0.0 is 5 days old, so expect patch
  churn. Pin exact version and re-check on upgrade.
- No star-transfer, archive, governance-dispute, or installer red flags found for either.
  glow's render path writes nothing; optional config lives in ~/.config/glow/glow.yml only
  if the TUI stash is used.

## Adoption record (skill step 7)

- **Pin**: glow v3.0.0 (brew: `brew install glow`; go: `go install github.com/charmbracelet/glow/v3@v3.0.0`).
- **Installer audit**: single binary via brew/go; no global config written on install.
- **Named exit trigger**: no commit to main for >2 months OR no release for >6 months →
  exit to fallback (bat with markdown syntax theme, else plain `cat`). Exit cost is near
  zero — glow holds no data.

## Re-derivation protocol

Re-run the five GitHub API calls in `sources` on the current date; recompute the rubric
table above. If glow's pushed_at is >60 days stale, invoke the exit trigger.
