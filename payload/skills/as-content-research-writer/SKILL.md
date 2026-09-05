---
name: as-content-research-writer
description: "Use this skill when the user already has a topic, outline, partial draft, or section and wants collaborative research, source-backed support, stronger structure, or section-level revision feedback. Apply it to articles, essays, newsletters, documentation, or insight-led engineering drafts that need citations, sharper hooks, or iterative critique, not raw ideation, full article drafting from thin notes, repo-specific publication, or preservation-first edits."
license: text MIT (concept derived from ComposioHQ/awesome-claude-skills curation)
metadata:
  author: github:@shabib87
  version: "1.0.0"
---
upstream: concept from public content-research-writer skill (ComposioHQ/awesome-claude-skills curation, 2025-10, author unattributed); text harness-original

# Content Research Writer

Use this skill when the material exists and the work is research plus refinement.

## Routing Boundaries

- Use it when the user has a topic, outline, draft, or section and wants research help, citations, structure support, hook work, or actionable editorial feedback.
- Do not use it for choosing what to write next. Route pure ideation to the WHAT-loop (as-grilling / as-wayfinder) — content-brainstormer does not exist in this harness.
- Do not use it for writing a full article body from thin notes. technical-post-drafter does not exist in this harness; full drafting from an idea is a fresh writing session, not this skill.
- Do not use it when the main job is verifying existing technical claims before publication. Route that to the researcher agent (external fact-checking with source URLs — see config/agents/researcher.md).
- Do not use it for repo-specific front matter, validation, or publication workflow. jekyll-post-publisher does not exist in this harness; publication is outside this skill's scope.
- Do not use it for preservation-first historical edits or Medium migration workflows.

## Workflow

1. Read `references/outline-and-structure.md`.
2. Read `references/engineering-voice-mode.md` when the task is an insight-led engineering post,
   essay, or section rewrite for experienced engineers.
3. Read `references/research-and-citations.md`.
4. Read `references/revision-and-feedback.md`.
5. Diagnose the primary need: structure, research, revision, or a combination.
6. Strengthen the outline or section shape before polishing sentences.
7. Add source-backed notes, citations, or explicit research gaps where claims need support.
8. Give section-level feedback or rewrites that preserve the author's voice and thesis.
9. Hand off when the task crosses into ideation, full drafting, formal fact-checking (researcher agent), or publication (no harness route).

## Output Expectations

- a clearer outline, section, or draft segment
- source-backed notes or citation-ready research findings
- explicit unsupported claims or open research questions
- a clear next step when another skill should take over

## Done Criteria

- the user has materially stronger structure, sourcing, or revision guidance
- supported claims are distinguishable from unsourced suggestions
- the output sharpens the draft without hijacking the author's voice

## Rules

- Preserve the user's thesis and voice unless they ask for a tonal change.
- For insight-led engineering writing, favor `problem -> mechanism -> consequence` over step-by-step
  instruction.
- Separate sourced facts from editorial suggestions.
- Never invent citations, quotes, studies, or statistics.
- Prefer primary sources when technical or time-sensitive claims appear.
- Keep feedback specific enough to act on at the section or sentence level.
- Prefer direct rewrites or structural fixes over soft coaching when the problem is obvious.
