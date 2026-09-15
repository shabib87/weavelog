---
id: TASK-87
title: Enable OpenAI and Anthropic provider connections
status: Done
assignee:
  - conductor
created_date: '2026-09-15 04:24'
updated_date: '2026-09-15 04:45'
labels:
  - spec-approved
dependencies: []
modified_files:
  - payload/config/opencode.jsonc
ordinal: 70000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Outcome: make the live OpenCode configuration and shipped payload template expose OpenRouter, OpenAI, and Anthropic in the provider connector. Why: the current OpenRouter-only allowlist hides ChatGPT Plus/Pro OAuth and Anthropic API-key connection choices. This task changes provider visibility only; it does not change the selected model roster, credentials, or provider routing.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 WHEN a user opens /connect with the live configuration THEN OpenRouter, OpenAI, and Anthropic are available provider choices.
- [x] #2 WHEN the payload configuration is materialized THEN its enabled provider allowlist matches the live configuration for OpenRouter, OpenAI, and Anthropic.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Tests and lint pass with fresh output in the worktree
- [ ] #2 Worktree is clean (no uncommitted changes)
- [ ] #3 Branch is rebased on main and green
- [ ] #4 All acceptance criteria checked with fresh evidence (one at a time, never batched)
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Update the enabled-provider list and explanatory comment in the payload template. 2. Apply the same provider list and comment to the live OpenCode configuration. 3. Verify both files parse as JSONC and use matching lists; verify OpenCode recognizes the three provider identifiers without changing credentials.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Verified 2026-09-15: exact provider lists match in payload/config/opencode.jsonc and ~/.config/opencode/opencode.jsonc; opencode debug config resolves openrouter, openai, and anthropic. git diff --check passed. Biome was unavailable in the worktree, so no lint claim is made.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Enabled OpenRouter, OpenAI, and Anthropic in the shipped payload allowlist. Verified matching live configuration and resolved OpenCode configuration; no credentials, model defaults, or routing changed.
<!-- SECTION:FINAL_SUMMARY:END -->
