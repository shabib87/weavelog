---
id: TASK-32
title: >-
  Re-justify EARS AC convention — remove false industry-convergence claim,
  reframe EARS vs Gherkin as layer complementarity
status: Done
assignee:
  - '@conductor'
created_date: '2026-09-02 23:31'
updated_date: '2026-09-03 00:39'
labels: []
dependencies: []
ordinal: 24000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Research (2026-09-02, web-verified) falsified the justification recorded in docs/research/2026-08-29-spec-driven-development-in-ai-harnesses.md and docs/architecture/test-guardrails.md: the claim that "the 2026 SDD tooling wave (Spec Kit, Kiro, BMAD) converged on EARS" is wrong. Verified sources: AWS Kiro DOES use EARS (kiro.dev, aws-samples prd-guide.md); GitHub Spec Kit uses Given/When/Then per Martin Fowler hands-on review (martinfowler.com/articles/exploring-gen-ai/sdd-3-tools.html); BMAD uses GWT story templates. Only Kiro mandates EARS. Correct interpretation: EARS (requirements-statement syntax, one claim per sentence, system-boundary level) and Gherkin (executable scenario format, behavior level) operate at different layers and are complementary, not competing; ecosystem tools bridge them (RequireKit EARS->GWT, ears-convert Claude skill); no head-to-head benchmarks exist (Springer Requirements Engineering journal: template notations not systematically compared). KEEPING EARS is still correct but must be justified on our own grounds: (1) backlog ACs are requirement-layer claims mapping 1:1 to deterministic test exit codes (verify-gate contract), which is EARS layer; (2) EARS grammar enforces atomic single-claim ACs without relying on model discipline — GWT freeform drifts to compound scenarios and implementation-flavored Givens with LLM authors; (3) EARS validity is near-regex-checkable so plan-reviewer can mechanically reject malformed ACs. The Kiro precedent is supporting evidence, not the reason. Do NOT edit Done task descriptions (TASK-13/15/21) — historical record; this task supersedes the rationale. MECHANISMS UNAFFECTED: verify-gate.ts, reviewer.md, plan-reviewer.md, AGENTS.md all reference EARS format only, never the convergence claim — audit confirmed 2026-09-02.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 WHEN docs/research/2026-08-29-spec-driven-development-in-ai-harnesses.md section "EARS vs Gherkin — the 2026 shift" is read THEN it states EARS and Gherkin operate at different layers (requirement-statement vs executable scenario) and are complementary, not competitors
- [x] #2 WHEN the research doc verdict section is read THEN it justifies keeping EARS on harness-specific grounds (1:1 AC-to-test-exit-code mapping at requirement layer, grammar-enforced atomicity for LLM authors, near-regex-checkable validity) without citing industry convergence as the reason
- [x] #3 IF docs/architecture/test-guardrails.md line ~30 is read THEN the "Not Gherkin, not Cucumber" framing is replaced by the layer-complementarity statement (backlog ACs are requirement-layer EARS claims; Gherkin is the appropriate format for scenario-level specs in the WHAT phase and composes with EARS)
- [x] #4 WHEN grep runs for "converged on EARS" and "2026 shift" across docs/ and config/ THEN zero live-doc matches remain
- [x] #5 IF Done task descriptions reference EARS-vs-Gherkin THEN they are left unchanged (historical record; verified by git diff showing no backlog/tasks/ edits)
- [x] #6 IF the research doc mentions tool adoption THEN it accurately states Kiro's official workflow specifies EARS for requirements while Birgitta Böckeler's hands-on review (martinfowler.com) observed GWT AC output in practice, Spec Kit uses GWT Acceptance Scenarios + System MUST requirement statements (cited to spec-template.md; EARS only a closed community feature request, issue #1356), BMAD mandates GWT with an And-chain baked into its story template, and no head-to-head benchmark was found
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Rewrite research doc section 'EARS vs Gherkin — the 2026 shift' (docs/research/2026-08-29-spec-driven-development-in-ai-harnesses.md ~lines 97-127): replace convergence framing with layer-complementarity (EARS=requirement-statement layer, Gherkin=executable scenario layer, complementary; RequireKit/ears-convert as bridges; no head-to-head benchmarks per Springer RE journal; Kiro=EARS only, Spec Kit=GWT per Fowler, BMAD=GWT). 2. Rewrite verdict section: justify EARS on harness grounds (1:1 AC-to-test-exit-code, grammar-enforced atomicity for LLM authors, near-regex-checkable validity); demote Kiro to supporting evidence. 3. Fix test-guardrails.md line ~30 'Not Gherkin, not Cucumber' to layer-complementarity framing. 4. Verify: grep 'converged on EARS' + '2026 shift' clean in docs/ config/; git diff shows no backlog/tasks/ edits; frontmatter-check + bun test pass. 5. Finalize per task-finalization guide.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Verification evidence (worktree TASK-32, branch task/TASK-32): (1) research doc section rewritten as 'EARS and Gherkin — different layers, complementary (corrected 2026-09-02, TASK-32)' with Spec Kit=GWT per Fowler sdd-3-tools review, BMAD=GWT, Kiro=EARS only, Springer RE journal no-benchmark note, RequireKit/ears-convert bridging evidence. (2) Verdict re-justified on 3 harness grounds: layer fit (1:1 AC-to-test-exit-code), grammar-enforced atomicity for LLM authors, near-regex-checkable validity; Kiro demoted to supporting evidence. (3) test-guardrails.md 'Not Gherkin, not Cucumber' replaced with layer-complementarity rationale. (4) rg 'converged on EARS' + 'the 2026 shift' across docs/ config/ = zero matches (exit 1). (5) git status: only the 2 target doc files modified; zero backlog/tasks/ edits (historical task descriptions untouched). (6) frontmatter-check 51/51 valid 0 errors; bun test 351 pass / 0 fail (one flaky headroom test failed on first run, passed on two subsequent runs).

4-reviewer 2-pass loop (deepseek/glm/kimi/qwen, 2026-09-02): pass 1 all REQUEST CHANGES. Convergent findings, all resolved: (1) my correction had introduced a NEW mis-attribution — Fowler article (actually Birgitta Böckeler's) says nothing about Spec Kit AC format; the GWT quote is her Kiro-section observation. Fixed: Spec Kit cited to spec-template.md primary source; Kiro wrinkle added (official EARS for requirements, observed GWT output — strengthens thesis: fence cannot depend on model discipline). (2) Spec Kit two-format nuance added (GWT scenarios + FR-00x System MUST; EARS = closed community issue #1356). (3) 'Grammar-enforced atomicity' overclaim corrected: EARS permits compounds (shape check can't catch 'SHALL A and B'); compounds are non-idiomatic in EARS, idiomatic/template-baked in GWT (BMAD epics-template '**And** {{additional_criteria}}' as evidence); atomicity enforced by human plan gate + reviewer. (4) test-guardrails line-103 responsibility table reconciled (WHEN-THEN-AND cell replaced with layer rule); lines 47-48 muddle fixed (harness variant = EARS-inspired, not canonical; plain outcome statement added as accepted shape). (5) Thesis restated honestly: single-line GWT also satisfies the constraints — derivation does not uniquely yield EARS; EARS wins on fence cost + drift surface; qa agent added as 5th consumer (GWT fits multi-step E2E). (6) 1:1 AC-to-exit-code mapping phrased as design intent + convention; verify: coupling noted as trade-off. (7) Citation hygiene: Springer claim softened to 'no benchmark found'; Kiro implication-mapping kept with kiro.dev/blog/deep-spec-analysis URL (verified verbatim by 2 reviewers); RequireKit softened to 'some vendors'; Böckeler attribution; sources + last_verified=2026-09-02 updated. Path dispute settled: BMAD repo path = src/bmm-skills/plan/bmad-create-epics-and-stories/ (3-solutioning 404s — installed layout, not repo). Pass 2: deepseek APPROVE, kimi APPROVE (conditional on edits landing), glm REQUEST CHANGES on 'dispositions not yet applied' (delta marker check now satisfied), qwen REQUEST CHANGES on BMAD path (verified wrong-side, fixed). Deferred sweep decision: docs/research/2026-08-15-inner-harness-vocabulary.md:40 + 2026-08-15-agentic-test-guardrails.md:26 retain historical 'Given/When/Then or WHEN-THEN-AND' — dated point-in-time research notes, not edited per repo precedent; the 08-15 vocabulary doc's spec.md artifact was YAGNI-deferred anyway.

Delta verification after fix round: marker greps all present (Böckeler, System MUST, non-idiomatic, deep-spec-analysis URL, BMAD step-03 path, reconciled table cell line 103, WHEN-THEN-AND gone from test-guardrails); old-claim grep clean (converged on EARS / the 2026 shift / cannot express a compound / Requirements Engineering journal = 0 matches); frontmatter-check 51/51 valid; bun test 351 pass / 0 fail (one flaky reviewer-loop.test.ts error under parallel load, passes in isolation + on re-run); git diff touches only the 2 target doc files; backlog/tasks/ untouched except TASK-32's own file via CLI.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Corrected the falsified 'industry converged on EARS' justification and re-derived the EARS AC convention from harness first principles, hardened by a 4-reviewer 2-pass loop (deepseek+glm+kimi+qwen). Final honest thesis: EARS is not the unique answer — single-line GWT also satisfies the storage/atomicity/human-gate constraints — but EARS wins on fence cost and drift surface (no precondition slot, compounds non-idiomatic vs GWT's template-baked And-chains per BMAD), at the correct layer (requirement claims between agents), with cheap shape checks (not semantics). Fact base fixed: Kiro officially specifies EARS but Böckeler observed GWT output (drift strengthens the thesis); Spec Kit = GWT scenarios + System MUST statements, EARS only community issue #1356; BMAD mandates GWT with And-chain template. Atomicity attributed to human plan gate + reviewer, not grammar. EARS stays; reasoning now correct and reviewer-verified. Verified: marker greps, old-claim grep clean, frontmatter 51/51, bun test 351/0, only 2 doc files changed.
<!-- SECTION:FINAL_SUMMARY:END -->
