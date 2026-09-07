# GitHub repo metadata — setup checklist

Settings to apply when the repo goes public at the v0.1.0 flip. Traces to
the hygiene set in `2026-09-05-v010-draft-brief.md`. Items marked
REVIEWER are choices the brief does not fix.

- [ ] **Description:** `The inner harness: agent work you can audit. A deterministic CLI that composes an evidence-grade agentic devex stack.`
- [ ] **Website:** none for v1 (docs site is in fog — brief "Fog (tracked, not built)")
- [ ] **License display:** Apache-2.0 (matches LICENSE)
- [ ] **Topics:** `ai-agents`, `cli`, `devex`, `agent-skills`, `opencode`, `agentic-loop`, `macos`, `arm64`
  - `<!-- REVIEWER: decision needed — topic list is not fixed by the brief; adjust at flip -->`
- [ ] **Default branch:** `main`
- [ ] **Branch protection on `main`:**
  - Require pull request reviews: 1 (solo-dev: author self-approves via second account is NOT allowed — use admin merge with dismissal noted)
  - `<!-- REVIEWER: decision needed — exact protection rule set for a solo-dev repo (e.g., required status checks: typecheck, biome, tests, semgrep, frontmatter) -->`
  - Require conventional-commit linear history (release-please dependency)
  - No force pushes, no deletions
- [ ] **Dependabot:** enabled (npm ecosystem, weekly; GitHub Actions ecosystem, weekly)
- [ ] **Secret scanning + push protection:** enabled
- [ ] **Private vulnerability reporting:** enabled (SECURITY.md points here)
- [ ] **Releases:** tag-driven release-please over conventional commits; CHANGELOG.md automatic; CI gates publish on privacy-audit-done (brief: "Distribution")
- [ ] **npm publishing:** OIDC trusted publishing (brief: "Distribution"); no long-lived tokens
- [ ] **Issues:** templates enabled (`.github/ISSUE_TEMPLATE/`); PRs discouraged via CONTRIBUTING.md
- [ ] **Actions permissions:** least-privilege default; OIDC for npm publish job
