# TBD: Settings Isolation for Sub-Agents

**Status:** Open blindspot — unaddressed in the current spec.
**Severity:** High. Affects loop determinism.

## The Problem

The user's `~/.pi/agent/settings.json` carries their personal `defaultModel`,
`enabledModels`, `packages`, `skills`, and global `AGENTS.md`. When loopeng
spawns a sub-agent for a workflow step, that sub-agent **inherits all of it**
by default — including the user's other extensions, skills, and global
context files.

A workflow meant to run exactly `specifier → coder → qa → writer` could be
derailed mid-coder-step if, for example, the user's superpowers
`brainstorming` skill activates (its description says "You MUST use this
before any creative work"), or a global extension intercepts a tool call in
an unexpected way.

This breaks the determinism the North Star promises.

## Options to Evaluate

1. **Per-workspace `.pi/settings.json`** — loopeng writes a project-local
   settings file that scopes what loads. Question: does project-local
   settings *override* or *merge* with global? (Read Pi's settings.md to
   confirm precedence.)
2. **Spawn sub-agents with isolation flags** — `pi --no-context-files
   --no-skills --no-extensions --skill <explicit>` to start clean, then
   allowlist only what each role needs. Verify these flags compose with
   `--mode json -p` used by the subagent extension.
3. **Hybrid** — project `.pi/settings.json` disables global packages/skills
   for the workspace; sub-agents spawn with explicit `--skill` and `--model`
   per role.

## Research to Do
- Read `~/.pi/agent/settings.json` precedence rules in Pi's settings docs.
- Test: does `pi --no-skills --skill ./my-skill.md -p "test"` load only
  `my-skill.md`?
- Check the subagent extension — does it already pass isolation flags? (Read
  `examples/extensions/subagent/index.ts` `getPiInvocation` and args
  construction.)

## Outcome Needed
A spec section: "Sub-Agent Isolation" defining exactly what each role
loads, with the mechanism (flags, project settings, or both).
