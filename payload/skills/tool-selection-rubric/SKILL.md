---
name: tool-selection-rubric
description: Use when comparing or selecting third-party tools, CLIs, frameworks, plugins, or repos to adopt — triggers on "which tool should I use", "compare X vs Y", "should I adopt", stars/maintenance/activity questions, or building an adoption shortlist
license: Apache-2.0 (from v0.1.0; MIT pre-v0.1.0)
metadata:
  author: github:@shabib87
  version: "1.0.0"
---
upstream: none — harness-original (author github:@shabib87)

# Tool Selection Rubric

## Overview

Adoption decisions are made on **live evidence, scored against a fixed rubric** — never on training-data memory, README vibes, or inherited social proof. Same rubric every time = decisions are comparable, reviewable, and re-derivable.

## Procedure

1. **Identity gate (before any scoring).** Confirm the canonical repo for each candidate via the API (`fork` and `archived` fields, `created_at`, redirect READMEs). Check for: org moves, forks after disputes, archived predecessors, package renames. A tool discussed in the community may not be the repo you find first — and one project may have MULTIPLE product lines under similar names (verify which line you are actually evaluating). If the repo moved or was forked, the predecessor's star count does NOT transfer — score the current home as its own project.
2. **Classify the category.** Framework vs tracker vs runtime vs plugin. Tools in different categories are not competitors — the real decision may be "which categories do I need," not "which tool." Also check: does the tool replace a component you already run (agent, proxy, tracker) instead of layering on it?
3. **Pull live numbers** (GitHub API, never memory). Budget: ~4 fetches/candidate, in priority order — drop later ones if budget runs out:
   - `api.github.com/repos/<owner>/<repo>` → stars, forks, created_at, pushed_at, open_issues_count (**never drop** — most signals in one call)
   - `/releases?per_page=5` → latest version, cadence
   - `/contributors?per_page=100` → count array length (the `per_page=1` Link-header trick does not work via webfetch/curl)
   - Derivation rule: if `pushed_at` is >90 days stale, commit frequency is 0 — skip the commits call.
   - If a number is unretrievable: score from corroborating evidence and flag the gap explicitly; never guess silently.
4. **Score each candidate** against the rubric below (use the 0–5 anchors).
5. **Apply vetoes before ranking** (a veto beats a high score): fit veto (replaces/duplicates a component you already run) and every red flag below.
6. **Write the decision record** to `~/.agents/docs/research/YYYY-MM-DD-<topic>.md` — frontmatter convention lives in `~/.agents/docs/research/README.md`. Then get one fresh-context reviewer before declaring "adopt"; if no reviewer can be dispatched, mark the record `status: provisional (pending fresh-context review)` instead of skipping.
7. **On adoption:** pin the exact version, audit what the installer writes, and record a **named exit trigger** (e.g., "unmaintained >2 months → exit to fallback").

## The Rubric

Score each row 0–5 using the anchors, multiply by weight, rank.

| Signal | Weight | Anchors (0 → 5) |
|---|---|---|
| Stars / adoption | 10% | 0: <100 · 3: ~5k · 5: >20k or clear category leader |
| Repo age | 10% | 0: <1 month · 3: ~6 months · 5: >1 year, survived a hype cycle |
| Commit frequency | 20% | 0: nothing >1 month · 3: commits in last month · 5: commits in last week |
| Release cadence | 15% | 0: none >6 months · 3: ~quarterly · 5: monthly or faster with changelogs |
| Contributors | 10% | 0: 1 person · 3: ~10 · 5: >30 with merged external PRs |
| Open-issue health | 10% | 0: unanswered pile-up · 3: slow triage · 5: maintainer replies, healthy close ratio |
| Harness fit | 15% | 0: replaces a component you run · 3: works via adapter · 5: native integration |
| Exit cost / overlap | 10% | 0: lock-in DB or duplicates an existing SSOT · 5: plain files, zero overlap |

## Red Flags (any one = investigate before adopting; fit veto = reject regardless of score)

- Star count belongs to an archived/renamed predecessor repo
- Multiple same-name product lines (core vs standalone) — you may be evaluating the wrong one
- Maintainer disappearance, governance dispute, or token/rug-pull lineage
- Installer writes to global config without an audit/rollback path
- Storage engine or format churn (multiple breaking migrations in <6 months)
- Category mismatch: adopting a framework to solve a tracker problem (or vice versa)
- **Fit veto:** the tool duplicates an existing source of truth (DRY) or replaces a component you intend to keep (e.g., a standalone agent when your stack is opencode)

## Common Mistakes

| Mistake | Fix |
|---|---|
| Quoting stars/commits from training data | Live API pull, cite the date |
| Comparing tools across categories | Classify first (step 2) |
| "Build vs adopt" decided on enthusiasm | Build only after the adopted tool's gap is proven in real use (name the trigger) |
| Social proof transferred across repo moves | Score the CURRENT repo home |
| Skipping the decision record | No record = decision can't be re-derived or reviewed |

## Deferred

`REPO-SIGNALS-SCRIPT`: a bun TS script in `~/.agents/bin` that pulls step-3 numbers into a table. **Trigger: this rubric is used a 3rd time** (per scripting standard: used twice → promote to durable script).
