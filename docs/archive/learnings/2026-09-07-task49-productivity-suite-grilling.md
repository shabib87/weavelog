# 2026-09-07 — TASK-49 amendment: grilling + three-gate plan review

Session: amended TASK-49 from "handoff skill only" to "mattpocock/skills
productivity suite ponytail steal" via the as-grilling protocol, with
deepseek / qwen / kimi plan-gate review. Spec approved by the human,
committed, metadata-merged to main. Worktree `.worktrees/TASK-49` ready.

## Findings

### 1. The bug that wasn't: DoD defaults apply at creation only (correction)

Claimed "DoD defaults are not landing" because TASK-49 (created 2026-09-05
16:59) showed no DoD items. All three gates disproved it: the 4 DoD defaults
arrived with TASK-51 (2026-09-05 18:34, landed via author-instance copy
3c98695 on 09-06); defaults apply at task CREATION, never retroactively;
post-TASK-51 tasks (65-69) all carry the 4 items. Real work is *backfill* on
pre-TASK-51 open tasks, not a fix. Lesson: before calling a default broken,
check when the default was introduced and whether the mechanism is
creation-time-only.

### 2. "Zero write access" is a claim about the wrong channel (key technical find)

Kimi's tie-break finding: backlog mutations travel via bash→CLI, not the
edit tool. enforce.ts hooks match command shape, never caller identity — a
well-formed `backlog task create` passes from any seat on a task branch. So
a "drafting-only" agent with `edit: deny` still holds a live write surface.
Safe isolation would need a permission shape no current agent uses (edit-deny
PLUS bash pattern-deny PLUS output contract). Lesson: when reasoning about
enforcement, enumerate ALL mutation channels; the edit-tool deny list is not
the write surface.

### 3. Upstream PM-agent: rejected as an agent, distilled instead (decision)

MrLesk/Backlog.md `project-manager-backlog.md` will NOT become a
dispatchable agent. Three reasons, now recorded in the TASK-49 comment and
to be re-recorded in sibling task B: (a) the bash-channel bypass class above;
(b) precedent — all 16 wired agents are homegrown seats, upstream imports
land as distilled skills (TASK-33 "distill only", TASK-41/49 ponytail
steals); (c) spec drafting is dialogic (one-question-at-a-time HITL), which
a cold fire-and-return subagent cannot run. Its distillable core (task
anatomy rubric, dependency-ordered breakdown, quality checklist) is
skill-shaped; its toxic core is precisely its agency.

### 4. Three-gate review converged on evidence, diverged only on judgment

deepseek NO-GO, qwen GO-WITH-CHANGES, kimi GO-WITH-CHANGES (tie-break B).
Agreements were evidence-backed and adopted wholesale: DoD misdiagnosis,
over-broad sibling dependency, one-PR size (as-writing-skills demands a TDD
cycle per port → evaluation becomes plan-phase research). The single
disagreement (agent vs skill) fell to a tie-break grounded in repo
precedent, not preference. Lesson: cross-family plan gates earn their cost
when each reviewer verifies claims against the repo — every gate
independently re-derived the DoD timeline from primary evidence.

### 5. Grilling protocol held the line across a scope expansion

Six questions, one at a time, each with a recommended answer. Scope moved:
handoff-only → full suite (Q1) → two-task split (Q2) → implementation
breadth (Q3) → composition mechanics (Q4) → tie-break (Q5) → confirmation
(Q6). Facts were fetched before each question (upstream skill lists, config
files, agent rosters), so the human never answered anything lookup-able.

## Decisions

- TASK-49 amended: suite scope, `harness` label (deferred dropped, revive
  trigger recorded as comment), Medium priority, 7 EARS ACs, DoD added
  directly (so sibling A excludes it).
- Distribution rule: content lives in skills; payload/AGENTS.md carries
  thin invariant/pointer lines only; new skills only where nothing covers
  the job. Expected landings: grill-me→as-grilling, writing-for-agents→
  as-writing-skills, to-questionnaire→as-grilling family, wait-what→thin
  protocol line, handoff→new as-handoff (anchor), grilling→already done,
  teach→likely reject.
- Attribution is AC-enforced now: every port ships frontmatter lineage +
  ATTRIBUTION.md row update in the same change; the verdict table pins the
  upstream commit SHA (tightening from as-grilling's date-only provenance).
- Sibling A (CLI/config audit + DoD backfill + missing MCP-bypass note
  port): no dependency. Sibling B (PM distillation): created after the
  verdict table lands — backlog deps are static IDs, conditional deps are
  not expressible.

## Blog candidates

- "The tie-break gate": three model families reviewed one plan; the
  disagreement was resolved by evidence (bash-channel bypass), not voting.
- "The bug that wasn't": a default that looked broken was a creation-time
  mechanism meeting an old task — and three AI reviewers independently
  proved it from primary evidence.
