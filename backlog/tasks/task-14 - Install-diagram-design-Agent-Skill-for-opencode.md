---
id: TASK-14
title: Install diagram-design Agent Skill for opencode
status: Done
assignee:
  - conductor
created_date: '2026-08-28 23:45'
updated_date: '2026-08-28 23:48'
labels:
  - skill-install
  - diagramming
dependencies: []
documentation:
  - docs/research/2026-08-28-diagramming-agent-skill.md
  - 'https://github.com/cathrynlavery/diagram-design'
  - 'https://opencode.ai/docs/skills'
priority: medium
type: feature
ordinal: 10000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Install cathrynlavery/diagram-design (39-type editorial diagram skill) for opencode. Clone the repo and place the inner skill folder where opencode discovers it (~/.config/opencode/skills/ or ~/.agents/skills/). The skill ships as a standard Agent Skills SKILL.md, which opencode natively discovers. No marketplace/plugin system needed — just the files in the right directory. See docs/research/2026-08-28-diagramming-agent-skill.md for the rubric scoring that selected this over 5 alternatives.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 diagram-design skill repo cloned to ~/code/diagram-design (or ~/.agents/diagram-design)
- [ ] #2 SKILL.md discoverable by opencode at one of the 6 recognized discovery paths
- [ ] #3 Skill appears in opencode's available_skills list and loads via the skill tool
- [ ] #4 A test diagram renders successfully (e.g., an architecture diagram) producing valid HTML output
- [ ] #5 PNG export pipeline works (pip install playwright && playwright install chromium)
- [ ] #6 Research decision record at docs/research/2026-08-28-diagramming-agent-skill.md is committed
- [ ] #7 Changes made in .worktrees/<task-id> on branch task/<task-id> — no commits on main
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
## Implementation Plan

### Context
opencode discovers Agent Skills from 6 paths (~/.config/opencode/skills/, ~/.agents/skills/, ~/.claude/skills/, and project variants). diagram-design ships as skills/diagram-design/SKILL.md inside the repo. We need to clone the repo and symlink or copy the inner skill folder to a discovery path.

### Steps
1. Clone cathrynlavery/diagram-design to ~/code/diagram-design (in the worktree, not main)
2. Symlink ~/code/diagram-design/skills/diagram-design → ~/.agents/skills/diagram-design (existing discovery path, matches the .agents/ convention used by other skills)
3. Verify SKILL.md is readable and has valid frontmatter (name + description)
4. Install Playwright + chromium for PNG export (pip install playwright && playwright install chromium)
5. Test: load the skill and generate a test architecture diagram HTML file
6. Commit the research decision record + any new files in the worktree
7. Verify AC checklist with fresh evidence
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
## What was done

1. **Cloned** cathrynlavery/diagram-design to ~/code/diagram-design (28k stars, 27 contributors, MIT)
2. **Symlinked** ~/code/diagram-design/skills/diagram-design → ~/.agents/skills/diagram-design (opencode discovery path)
3. **Installed** Playwright + chromium in a venv at ~/code/diagram-design/.venv for PNG export
4. **Tested** — generated an architecture diagram (opencode harness: opencode TUI → backlog.md, headroom proxy → OpenRouter) as valid HTML+SVG, verified via Playwright: SVG with viewBox, accessible title/desc, 11 rects, 11 text elements, PNG captured at 1200x860
5. **Scored** 6 candidates with the tool-selection rubric (live GitHub API); diagram-design won at 4.3/5
6. **Fresh-context reviewed** by qwen reviewer: AGREE, all numbers verified, arithmetic confirmed
7. **Committed** on branch task/TASK-14 in .worktrees/TASK-14 (no commits on main)

## How to use it

```bash
# The skill is already installed. Restart opencode (or start a new session) so it discovers the symlink.
# Then just ask in natural language:
#   "Make me an architecture diagram of my app: frontend, backend, database, Redis cache."
#   "Build a sequence diagram for the OAuth token refresh flow."
#   "Create a quadrant chart of Q2 projects by impact vs effort."

# For PNG/SVG export, activate the venv first:
source ~/code/diagram-design/.venv/bin/activate
# Then ask: "Export this diagram as PNG at 3x scale."

# Brand onboarding (matches your site's colors + fonts):
#   "Onboard diagram-design to https://yoursite.com"
```

## Key files
- Skill: ~/.agents/skills/diagram-design/SKILL.md (symlink → ~/code/diagram-design/)
- 39 diagram types with references in skills/diagram-design/references/
- Templates: skills/diagram-design/assets/template*.html (light, dark, full, motion, terminal)
- Research decision: docs/research/2026-08-28-diagramming-agent-skill.md
- Test diagram: test-diagram.html + test-diagram.png
<!-- SECTION:FINAL_SUMMARY:END -->
