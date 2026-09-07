---
date: 2026-08-15
topic: Skill pack selection — obra/superpowers vs addyosmani/agent-skills
status: decided
sources:
  - https://github.com/obra/superpowers (v6.3.0, 2026-08-12; local checkout ~/.pi/agent/git/github.com/obra/superpowers)
  - https://github.com/addyosmani/agent-skills (v0.6.7, 2026-08-14)
  - https://raw.githubusercontent.com/obra/superpowers/main/.opencode/INSTALL.md
models_used_for_research: [qwen/qwen3.8-2.4t-a95b]
supersedes: none
---

# Skill pack decision: obra/superpowers

## Verdict: superpowers (installed as opencode plugin, unpinned spec tracks latest)

| Criterion | obra/superpowers | addyosmani/agent-skills |
|---|---|---|
| opencode support | FIRST-CLASS native plugin + tool mapping | prompt-compliance only (their docs admit) |
| pi support | first-class package + bootstrap extension | NONE |
| Agentic SDLC loops | CORE product: subagent-driven-development (fresh implementer/task, two-stage review, 5-round circuit breaker, plan-scoped ledgers), dispatching-parallel-agents | personas are harness-native, thin portability |
| Skills | 14 tight loop skills incl. test-driven-development, verification-before-completion, systematic-debugging, brainstorming, writing-plans | 24 broader single-task skills |
| License/maintenance | MIT, ~1 release/3-4 weeks | MIT, monthly |

## Key facts

- opencode plugin line: "plugin": ["superpowers@git+https://github.com/obra/superpowers.git"]
- opencode resolves the git dep into ~/.cache/opencode/packages/superpowers@git+https:/...
  (NOT ~/.config/opencode/node_modules — that dir holds the plugin SDK @opencode-ai/plugin;
  never delete it when clearing the superpowers cache)
- Update procedure: rm -rf "$HOME/.cache/opencode/packages/superpowers@git+https:/github.com/obra/superpowers.git"
  -> restart OpenCode.app -> smoke test "Tell me about your superpowers"
- Cherry-picked from agent-skills: documentation-and-adrs idea only (not installed)
- Skills hub is ~/.agents/skills (opencode + pi both scan it; names must stay unique across
  all scanned locations)
