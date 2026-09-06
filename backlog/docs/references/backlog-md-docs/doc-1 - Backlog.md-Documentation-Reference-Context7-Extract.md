---
id: doc-1
title: Backlog.md Documentation Reference (Context7 Extract)
type: other
created_date: '2026-08-18 02:35'
tags:
  - backlog
  - reference
  - context7
---
# Backlog.md Documentation (Context7 Extract, 2026-08-16)

## Library
- Context7 ID: `/mrlesk/backlog.md`
- Source: https://github.com/mrlesk/backlog.md
- Snippets: 3376 | Reputation: High | Benchmark: 80.18

## State Model (verified)

### Statuses (configurable in config.yml)
```yaml
statuses: ["To Do", "In Progress", "Done"]
default_status: "To Do"
```
- Local config adds `In Review` (4 statuses)
- MCP schema adds `Draft` (5 values, pre-commitment)
- No transitions enforced — any status to any status
- No phase/step/stage/progress field exists

### onStatusChange (only hook surface)
```yaml
# Global (config.yml)
onStatusChange: 'echo "Task $TASK_ID moved from $OLD_STATUS to $NEW_STATUS"'

# Per-task (frontmatter override)
onStatusChange: 'claude "Task $TASK_ID has been moved to $NEW_STATUS from $OLD_STATUS. Please take over it"'
```
- Post-transition only, fail-safe (cannot block)
- Variables: `$TASK_ID`, `$OLD_STATUS`, `$NEW_STATUS`, `$TASK_TITLE`
- Issue #456 proposes richer hooks (`post-task-create/update/archive`) — NOT shipped in v1.50.1

### Stable JSON API
```bash
backlog task 42 --json        # view (schemaVersion: 1)
backlog task list --json      # list
backlog search "api" --json   # search
```
Returns versioned JSON. Envelope: `{kind: "task-view", task: {...}}` or `{kind: "task-list", tasks: [...]}`.

### Plain output
```bash
backlog task 42 --plain
backlog task list --plain
backlog search "topic" --plain
backlog search --modified-file src/api.ts --plain
backlog task list -s "In Progress" --plain
backlog task list -a @sara --plain
backlog task list -p task-42 --plain
```

### Dependencies
- Simple task-ID references in `dependencies` array
- No DAG, no cycle detection
- `backlog task list --ready` filters tasks whose dependencies are satisfied/completed

### Documents (managed via API/CLI only)
- Document paths relative to `backlog/docs/`
- Absolute paths or directory traversal not permitted
- Must use CLI/API to ensure frontmatter + file paths stay valid

## Gap analysis (for SDLC harness)
- No phase/step concept — only flat status enum
- No pre-transition hooks — onStatusChange is post-only
- No custom fields — fixed schema, labels only
- Phase state must live OUTSIDE backlog (per-worktree `phase-state.yml`)
- Hooks query backlog via `backlog task <id> --json`
