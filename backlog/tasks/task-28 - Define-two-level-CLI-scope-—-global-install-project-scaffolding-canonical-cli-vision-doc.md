---
id: TASK-28
title: >-
  Define two-level CLI scope — global install + project scaffolding (canonical
  cli-vision doc)
status: To Do
assignee: []
created_date: '2026-08-31 03:58'
updated_date: '2026-09-11 03:54'
labels: []
milestone: m-4
dependencies:
  - TASK-79
ordinal: 20000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner vision 2026-08-30: ~/.agents becomes an OSS-able npm-installable CLI with two levels. (1) GLOBAL: package ~/.agents (skills, agents, scripts, plugins, hooks) and materialize it into outer harness dirs (opencode, pi, future) via harness manifests — harnesses cannot natively point at ~/.agents (opencode/pi read only their own config dirs; verified by 3-model consult), so 'configs are materialized FROM ~/.agents' is the model, not 'point AT ~/.agents'. (2) PROJECT: scaffold project-level AGENTS.md (deltas only — opencode concatenates global+project), backlog.md, docs/research/, ADRs. Precedents: chezmoi (global materialize+manifest), cookiecutter/create-* (project scaffold). This task writes the canonical doc every m-4/m-5 task builds from.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 WHEN docs/trd/cli-vision.md is read THEN it defines: the two levels, the materialize-not-point evidence, the packaging boundary exclusion list (secrets/, backlog/, docs/research/, state/, reports/, logs/, .worktrees/, node_modules/), the template/overlay requirement for personal identity (model roster, secrets refs), and the harness manifest contract (config/harnesses/<id>.json)
- [ ] #2 WHEN the runbook and global AGENTS.md mention the CLI vision THEN they point at the cli-vision doc (no duplicated content)
- [ ] #3 WHEN backlog milestones m-4 (harness-agnostic) and m-5 (open-source-release) are read THEN their descriptions reference the cli-vision doc
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Created from TASK-23 session 2026-08-30; consolidates qwen/deepseek/kimi consult verdicts.
<!-- SECTION:NOTES:END -->
