---
id: TASK-38
title: >-
  Binary doc conversion pipeline for scout and researcher (mdconvert + skill +
  stack manifest)
status: Done
assignee:
  - conductor
created_date: '2026-09-03 02:37'
updated_date: '2026-09-04 21:42'
labels: []
dependencies: []
ordinal: 29000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Scouts and researchers must never read raw binary documents (PDF/DOCX/PPTX/XLSX/EPub/etc.) directly — token-expensive and often unparseable by the model. Route them through Microsoft markitdown (installed, v0.1.7) first.

Build the three-layer pipeline from the Qwen design consultation (2026-09-02):
1. Prompt rule (mandatory): scout.md + researcher.md each get a "Binary documents" section — any file that is not source code or plain text/config (.md/.txt/.csv/.json/.yaml) MUST go through `mdconvert` before reading, plus extract/compress discipline and a reference to `mdconvert --help`.
2. Wrapper (mechanics): `mdconvert` decides binary vs text, runs markitdown, caches converted output at `docs/research/scratch/converted/<sha1(path+mtime)>-<name>.md` (reusable across re-dispatches), caps output (~2000 lines + truncation notice), returns a UNSUPPORTED stub on failure/unsupported extension instead of raw bytes. Scout stays read-only; its conversions land in the shared scratch zone. Add `docs/research/scratch/` to .gitignore.
3. Skill (expertise): `~/.agents/skills/binary-doc-conversion/SKILL.md` — progressive disclosure: per-format gotchas, chunking/locate strategy, when markitdown is the wrong tool.
4. Stack manifest: markitdown becomes a tracked stack component — add key to stack-versions.json (full tracked treatment per TASK-17 precedent), a drift check in stack-check.ts, and runbook Phase 7 update.

Token discipline encoded for agents: convert -> cap -> locate (grep/offset-read) -> quote <=40 lines -> compress the rest.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 WHEN mdconvert converts a binary document THEN markitdown output is cached at docs/research/scratch/converted/<sha1(path+mtime)>-<name>.md AND a re-dispatch with an unchanged file reuses the cache
- [x] #2 WHEN mdconvert is run on an unsupported extension OR markitdown fails THEN it returns a text stub naming the file, the attempted converter, and UNSUPPORTED — never the raw bytes
- [x] #3 WHEN mdconvert output exceeds the cap THEN it truncates to ~2000 lines AND appends a truncation notice with the total line count
- [x] #4 WHEN scout.md and researcher.md are loaded THEN both contain the Binary documents routing rule, the extract/compress discipline, and a reference to mdconvert --help
- [x] #5 WHEN stack-versions.json is updated THEN it contains a markitdown key with the installed version AND updatedAt is bumped
- [x] #6 WHEN stack-check.ts runs THEN it compares the installed markitdown version against the manifest AND reports drift
- [x] #7 WHEN the runbook Phase 7 is updated THEN it documents the markitdown manifest key
- [x] #8 WHEN the task completes THEN mdconvert ships happy + unhappy path tests under bin/test/ that pass via bun test AND the bin/AGENTS.md script inventory is updated
- [x] #9 WHEN docs/research/scratch/ is created THEN it is gitignored so converted artifacts never land on a task branch
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. mdconvert wrapper — bin/src/mdconvert.ts (bun TS per bin conventions): --help, single file arg, text-vs-binary rule (text ext allowlist + NUL-byte sniff), cache at docs/research/scratch/converted/<sha1(abspath+mtime)>-<basename>.md keyed for re-dispatch reuse, run ~/.local/bin/markitdown, cap output ~2000 lines + truncation notice with total line count, UNSUPPORTED stub on unsupported/failure (never raw bytes), exit codes 0/1/2.
2. Tests — bin/test/mdconvert.test.ts: happy path (converts + cache file created), cache reuse (2nd run no re-convert), unsupported ext stub, cap truncation notice, missing file.
3. stack-check.ts — markitdownVersion check: run ${HOME}/.local/bin/markitdown --version, strip "markitdown " prefix, compare vs manifest.markitdown, push drift line; add markitdown to Manifest interface.
4. Conductor-owned (implementer denied set): .gitignore += docs/research/scratch/; skills/binary-doc-conversion/SKILL.md; config/agents/{scout,researcher}.md Binary documents sections; stack-versions.json += markitdown key + updatedAt bump; runbook blessed-scripts list + §6.x section + Phase 7 manifest + update procedure; bin/AGENTS.md inventory row.
5. Verify: bun test all green in bin/, biome clean, stack-check --json renders markitdown check.
6. Post-merge: config-sync materializes config/agents/*.md to live; restart session to pick up new agent instructions.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implementer (deepseek) delivered mdconvert.ts + tests + stack-check wiring; 376 pass, biome clean. Conductor completed config/skill/manifest/runbook edits. Round-1 diff review (glm + kimi): both APPROVE-WITH-FIXES. Blockers/majors applied: 64MB maxBuffer (1MB ENOBUFS dropped >1MB docs), cache now holds FULL converted text with cap-on-print, failures/empties NOT cached (fixed sticky UNSUPPORTED-exit-0), passthrough capped, directory-arg->exit 2, EMPTY marker for textless scans, stack-check missing-key message, scout cache-write exception + remote-binaries guidance, skill license clause + OCR wording. Re-verified: 381 pass/0 fail, biome clean, real-markitdown smoke green.

Finalization verified from within task/TASK-38 worktree (2026-09-04): bun test 387 pass/0 fail across 14 files in bin/; mdconvert 25 tests green incl. cache reuse, UNSUPPORTED stub (never raw bytes), 2000-line cap + truncation notice, >1MB buffer, EMPTY marker, passthrough cap; stack-check report shows markitdown current 0.1.7 == manifest 0.1.7 (no drift); stack-versions.json has markitdown key + updatedAt bump; runbook Phase 7 documents the key; .gitignore covers docs/research/scratch/; scout.md + researcher.md both carry Binary documents routing + mdconvert --help + extract/compress/quote discipline.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Binary doc conversion pipeline complete: mdconvert wrapper (bin/src/mdconvert.ts) converts binaries via markitdown with sha1(path+mtime) caching to docs/research/scratch/converted/, 2000-line print cap + truncation notice, UNSUPPORTED text stub on failure (never raw bytes); scout/researcher agent prompts route all binary docs through it with extract/compress/quote token discipline; markitdown tracked in stack-versions.json (0.1.7) with stack-check drift check + runbook Phase 7 entry; skill added at skills/binary-doc-conversion. Verified: bun test 387 pass/0 fail, mdconvert 25/25, biome clean, stack-check renders markitdown current==manifest, real-markitdown smoke green. Diff-reviewed (glm + kimi APPROVE-WITH-FIXES, all applied).
<!-- SECTION:FINAL_SUMMARY:END -->
