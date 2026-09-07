---
date: 2026-08-28
topic: diagramming-agent-skill
status: adopted
sources:
  - https://github.com/cathrynlavery/diagram-design
  - https://github.com/Agents365-ai/mermaid-skill
  - https://github.com/imxv/Pretty-mermaid-skills
  - https://github.com/coleam00/excalidraw-diagram-skill
  - https://github.com/SpillwaveSolutions/design-doc-mermaid
  - https://github.com/veelenga/claude-mermaid
  - https://opencode.ai/docs/skills
  - https://api.github.com/repos/<each-candidate>
models_used_for_research:
  - z-ai/glm-5.2 (conductor)
  - tool-selection-rubric skill
supersedes: none
---

# Diagramming Agent Skill — Selection Rubric

## Question

Which diagramming Agent Skill should be adopted for a harness running opencode + Pi?

## Category

All candidates are **Agent Skills** (SKILL.md format, Agent Skills open standard). They are direct competitors within the same category. Sub-distinction: output format (self-contained HTML+SVG vs Mermaid .mmd vs Excalidraw JSON) and rendering dependency (none vs mmdc/Node vs Playwright vs MCP server).

## Candidates (6)

1. **cathrynlavery/diagram-design** — 39 editorial diagram types, self-contained HTML+SVG
2. **Agents365-ai/mermaid-skill** — Mermaid .mmd from NL, validation, PNG/SVG/PDF via mmdc/Kroki
3. **imxv/Pretty-mermaid-skills** — Mermaid render as SVG/ASCII, 15 themes, 6 types
4. **coleam00/excalidraw-diagram-skill** — Excalidraw JSON from NL, Playwright render, visual validation
5. **SpillwaveSolutions/design-doc-mermaid** — Mermaid architect, code-to-diagram, high-contrast
6. **veelenga/claude-mermaid** — MCP server + skill, Mermaid preview with live reload

## Live Evidence (GitHub API, 2026-08-28)

| Candidate | Stars | Forks | Created | Last Push | Issues | Contributors | Releases |
|---|---|---|---|---|---|---|---|
| cathrynlavery/diagram-design | 28,316 | 1,779 | 2026-04-16 | 2026-08-27 | 29 | 27 | none (README versions v2.0→v2.5.10) |
| Agents365-ai/mermaid-skill | 201 | 17 | 2026-03-03 | 2026-08-15 | 0 | 2 | v1.1.0 (Aug 15), v1.0.0 (May 17) |
| imxv/Pretty-mermaid-skills | 1,164 | 58 | 2026-01-30 | 2026-08-22 | 0 | 2 | none |
| coleam00/excalidraw-diagram-skill | 4,621 | 522 | 2026-03-01 | 2026-03-01 | 33 | 1 | none |
| SpillwaveSolutions/design-doc-mermaid | 158 | 23 | 2025-11-02 | 2026-08-24 | 10 | 1 | v1.1.1 (Aug 24), v1.1.0 (Aug 24), v1.0.0 (Dec 14) |
| veelenga/claude-mermaid | 203 | 22 | 2025-09-29 | 2026-08-26 | 0 | 8 | none (frequent commits) |

## Rubric Scoring

| Signal | Weight | diagram-design | mermaid-skill | Pretty-mermaid | excalidraw-skill | design-doc-mermaid | claude-mermaid |
|---|---|---|---|---|---|---|---|
| Stars / adoption | 10% | 5 (28k, leader) | 1 (201) | 2 (1.2k) | 3 (4.6k) | 1 (158) | 1 (203) |
| Repo age | 10% | 3 (4.5mo) | 3 (5.5mo) | 4 (7mo) | 3 (5.5mo) | 4 (10mo) | 4 (11mo) |
| Commit frequency | 20% | 5 (daily) | 4 (13d ago) | 5 (6d ago) | 0 (5mo stale) | 5 (4d ago) | 5 (2d ago) |
| Release cadence | 15% | 4 (README versions, no formal tags) | 3 (quarterly) | 2 (none) | 0 (none, stale) | 4 (3 releases) | 4 (frequent commits) |
| Contributors | 10% | 4 (27) | 0 (2) | 0 (2) | 0 (1) | 0 (1) | 2 (8) |
| Open-issue health | 10% | 4 (29/28k, active triage) | 5 (0) | 5 (0) | 1 (33, abandoned) | 3 (10, active) | 5 (0) |
| Harness fit | 15% | 4 (Agent Skills, Pi explicit, opencode via same standard) | 3 (Agent Skills, needs mmdc) | 3 (Agent Skills, needs Node) | 4 (explicit OpenCode, needs Playwright) | 3 (Agent Skills, needs renderer) | 3 (MCP server + skill) |
| Exit cost / overlap | 10% | 5 (plain HTML+SVG, zero lock-in) | 4 (.mmd, widely supported) | 4 (.mmd + SVG/ASCII) | 3 (Excalidraw JSON, somewhat proprietary) | 4 (.mmd) | 3 (MCP server = infra) |
| **Total** | 100% | **4.3** | **3.0** | **3.25** | **1.6** | **3.25** | **3.55** |

## Red Flags

- **coleam00/excalidraw-diagram-skill**: Maintainer disappearance — no commits since 2026-03-01 (5 months), 33 unanswered issues, 1 contributor. **Investigate before adopting; effectively disqualified.**
- No other red flags detected for remaining candidates.
- **Fit veto check**: None of these replace a component the harness already runs (all are additive capabilities). No veto triggered.

## Verdict

**Adopt: cathrynlavery/diagram-design** (score 4.3, clear winner)

- Highest score across every weighted signal except repo age and open-issue count
- Category leader by adoption (28k stars, 1.8k forks)
- Active daily development with 27 contributors
- Self-contained HTML+SVG output — zero external rendering dependency (Playwright only for optional PNG export)
- Explicit Pi support with prompt templates and install instructions
- opencode discovers the same SKILL.md via the Agent Skills open standard (`~/.config/opencode/skills/`, `~/.agents/skills/`, `~/.claude/skills/`)
- Brand onboarding from URL, WCAG AA contrast checks, accessible SVG, draw.io/Mermaid import, 39 diagram types
- Exit cost: plain files, no lock-in

**Runner-up: veelenga/claude-mermaid** (3.55) — active, clean, 8 contributors, but adds MCP server infrastructure and produces Mermaid (not self-contained editorial HTML+SVG).

**Not recommended: coleam00/excalidraw-diagram-skill** (1.6) — red flag: maintainer disappearance.

## Install (completed 2026-08-28)

```bash
git clone https://github.com/cathrynlavery/diagram-design.git ~/code/diagram-design
ln -s ~/code/diagram-design/skills/diagram-design ~/.agents/skills/diagram-design
# Playwright for PNG export (in a venv, not system-wide):
python3 -m venv ~/code/diagram-design/.venv
source ~/code/diagram-design/.venv/bin/activate && pip install playwright && playwright install chromium
```

- **Clone**: `~/code/diagram-design` (pinned commit `ac490fd`, recorded in `stack-versions.json` as `diagramDesignCommit`)
- **Symlink**: `~/.agents/skills/diagram-design` → `~/code/diagram-design/skills/diagram-design`
- **opencode discovery**: `~/.agents/skills/*/SKILL.md` is one of the 6 recognized discovery paths; the symlink makes the skill visible to opencode on next session start
- **PNG export**: Playwright + chromium installed in `~/code/diagram-design/.venv`; activate before export

## Update procedure

The clone has no tags/releases — it's tracked by commit. To check for updates:

```bash
cd ~/code/diagram-design
git fetch origin
git log --oneline HEAD..origin/main | head    # see new commits since last pull
```

If there are new commits worth pulling:

```bash
cd ~/code/diagram-design
git pull origin main
# Update the pinned commit in stack-versions.json:
# "diagramDesignCommit": "<new-short-sha>"
```

The symlink at `~/.agents/skills/diagram-design` follows automatically — no reinstall needed after a pull. Restart opencode to load any changed skill instructions.

## Named Exit Trigger

- diagram-design unmaintained >2 months (no commits to `origin/main`) → re-evaluate; fallback to veelenga/claude-mermaid (MCP + skill) or imxv/Pretty-mermaid-skills (Mermaid SVG/ASCII).
- `diagramDesignCommit` in `stack-versions.json` tracks the pinned version; the weekly `stack-check.ts` drift report should flag if the upstream `main` is ahead by >30 commits since the pinned SHA.
