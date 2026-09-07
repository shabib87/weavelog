---
date: 2026-08-29
topic: Spec-driven development in AI agent harnesses — Gherkin/BDD, spec→task mapping, deterministic verification, KISS approach for backlog.md + opencode + bun test
status: verified-live
sources:
  - https://www.thebcms.com/blog/spec-driven-development
  - https://www.the-main-thread.com/p/spec-trap-agent-work
  - https://www.oreilly.com/radar/why-ai-coding-agents-still-need-clear-specs
  - https://martinfowler.com/articles/exploring-gen-ai/sdd-3-tools.html
  - https://www.augmentcode.com/guides/what-is-spec-driven-development
  - https://www.augmentcode.com/tools/best-spec-driven-development-tools
  - https://zarar.dev/spec-driven-development-from-vibe-coding-to-structured-development
  - https://codemyspec.com/blog/openspec-explained
  - https://www.linkedin.com/pulse/practical-tips-spec-driven-development-ai-agents-what-arun-gupta-wyy7c
  - https://jacobknowledgeaddict.substack.com/p/why-your-ai-coding-agent-keeps-making
  - https://regolo.ai/the-build-verify-loop-stop-your-ai-agent-from-claiming-victory-before-the-tests-pass
  - https://medium.com/@jbpoley/spec-driven-with-a-backlog-928c13cf48cd
  - https://ainativedev.io/podcast/ai-first-project-management-for-developers-alex-gavrilescu-on-backlog-md
  - https://github.com/github/spec-kit/discussions/152
  - https://www.testmuai.com/learning-hub/gherkin-testing
  - https://www.blog-des-telecoms.com/en/blog/specification-executable-gherkin-proprietes
  - https://addyosmani.com/blog/agent-harness-engineering/
  - https://addyosmani.com/blog/agentic-code-review/
  - https://addyosmani.com/agents/18-orchestrators/
  - "local: docs/research/2026-08-15-agentic-test-guardrails.md"
  - "local: docs/research/2026-08-23-backlog-md-capability-audit.md"
  - "local: docs/research/2026-08-16-addy-osmani-deterministic-agentic-workflows.md"
  - "local: backlog.md task-finalization instructions (MCP)"
  # 2026-09-02 TASK-32 re-verification sources
  - https://kiro.dev/blog/introducing-kiro
  - https://kiro.dev/blog/deep-spec-analysis
  - https://github.com/aws-samples/sample-kiro-cli-prompts-for-product-teams/blob/main/.kiro/steering/prd-guide.md
  - https://github.com/github/spec-kit/blob/main/templates/spec-template.md
  - https://github.com/github/spec-kit/issues/1356
  - https://github.com/bmad-code-org/BMAD-METHOD/blob/main/src/bmm-skills/plan/bmad-create-epics-and-stories/steps/step-03-create-stories.md
  - https://github.com/bmad-code-org/BMAD-METHOD/blob/main/src/bmm-skills/plan/bmad-create-epics-and-stories/templates/epics-template.md
models_used_for_research:
  - openrouter/z-ai/glm-5.2
supersedes: none
last_verified: 2026-09-02
---

# Spec-Driven Development in AI Agent Harnesses

## Context

The harness (AGENTS.md + opencode + backlog.md) already has a WHAT-loop (research → spec →
dialogue) and a HOW-loop (plan → build → verify). The question: what is the minimum viable
spec format and verification chain that gives deterministic gates without duplicating what
backlog.md already provides (ACs, plan, finalSummary, comments, DoD)?

This note synthesizes external evidence from the 2025–2026 SDD tooling wave (GitHub Spec Kit,
Kiro, OpenSpec, BMAD, Tessl) plus the Gherkin/BDD ceremony debate, and maps it to the harness's
existing capabilities.

---

## 1. Gherkin/BDD in AI agent workflows — is it ceremony?

### The U-shaped cost curve

The sharpest framing comes from Markus Eisele (the-main-thread, Apr 2026):

> "The total cost of both approaches traces a U-shaped curve when you plot it against
> specification completeness. The minimum of that curve — the sweet spot — sits somewhere
> around well-structured acceptance criteria or BDD scenarios. Not at zero specification, and
> not at a 40-page formal requirements document."
> — https://www.the-main-thread.com/p/spec-trap-agent-work

The key insight: **you're not eliminating cost by skipping the spec, you're deferring it**.
Minimal spec front-loads token cost and back-loads human judgment (endless review cycles).
Heavy spec front-loads human effort and back-loads almost nothing (automated verification
doesn't scale with runs).

### Where Gherkin earns its keep vs. where it's overhead

Eisele again:

> "BDD earns its keep when it moves judgment out of repeated human review and into an
> executable oracle. That is why its sweet spot appears around behavior that is stable enough
> to test."
> — https://www.the-main-thread.com/p/spec-trap-agent-work

And the counter:

> "The honest summary: Gherkin is worth it where a non-technical stakeholder genuinely engages
> with the scenarios, and where the behavior is complex enough that misunderstanding it is
> expensive. For everything below that line, particularly unit tests and developer-only suites,
> it is overhead wearing the costume of rigour."
> — https://www.testmuai.com/learning-hub/gherkin-testing

### The multi-agent amplification effect

For harnesses with conductor + worker + reviewer (like this one), Eisele's analysis sharpens:

> "In a multi-agent system, a spec isn't just guidance for a single execution — it's a
> coordination contract between agents... You want a strongly typed interface between agents,
> not a loose conversational handoff."
> — https://www.the-main-thread.com/p/spec-trap-agent-work

This harness has conductor → implementer → reviewer. Each handoff is a place where interpretive
drift compounds. The spec is the contract that prevents drift. **More spec precision pays off
proportionally to the number of agent boundaries crossed.**

### EARS and Gherkin — different layers, complementary (corrected 2026-09-02, TASK-32)

**Correction:** an earlier version of this section claimed that the 2026 SDD tooling
wave (Spec Kit, Kiro, BMAD) had all adopted EARS notation for acceptance criteria.
Web re-verification (2026-09-02, primary sources) falsified that:

- **Kiro's official spec workflow specifies EARS notation** for requirements
  (kiro.dev/blog/introducing-kiro; aws-samples `.kiro/steering/prd-guide.md`). But
  Birgitta Böckeler's hands-on review of SDD tools (published on martinfowler.com,
  sdd-3-tools.html) observed Kiro generating user stories with "GIVEN… WHEN… THEN…"
  acceptance criteria in practice — the prescribed notation and the observed output
  diverged. This drift *strengthens* this harness's thesis below: even a tool whose
  own steering files prescribe EARS drifted to GWT output, so a fence cannot depend
  on the model following the prescribed format.
- **GitHub Spec Kit** templates use two formats: its
  [spec-template.md](https://github.com/github/spec-kit/blob/main/templates/spec-template.md)
  defines GWT "Acceptance Scenarios" **and** `FR-00x: System MUST [capability]`
  requirement statements. The MUST statements are requirement-layer claims — Spec
  Kit itself separates the two layers, which is direct evidence for the layering
  below. EARS support in Spec Kit is only a closed community feature request
  (issue #1356), not first-party.
- **BMAD-METHOD** mandates GWT: its create-epics-and-stories step
  (`src/bmm-skills/plan/bmad-create-epics-and-stories/steps/step-03-create-stories.md`)
  requires "Use Given/When/Then format" for ACs — and its story template
  (`templates/epics-template.md`) bakes `**And** {{additional_criteria}}` into every
  story, so And-chain compounding is built into a major SDD framework's own template
  even as its own guidelines demand "independently testable" ACs.
- No head-to-head benchmark comparing the two notations was found. The accurate
  framing: **EARS and Gherkin operate at different layers and are complementary, not
  competitors.** EARS (Easy Approach to Requirements Syntax, Mavin 2009) is a
  *requirements-statement* syntax — one sentence per claim, system-boundary level.
  Gherkin is an *executable scenario* format — Given/When/Then, behavior level. Some
  vendors (e.g., RequireKit) ship EARS→GWT generation pipelines; Kiro's own spec
  analysis maps each EARS clause to a logical implication ("the WHERE/WHILE/WHEN/IF
  clauses become the antecedent, the THE ... SHALL clause becomes the consequent" —
  kiro.dev/blog/deep-spec-analysis), demonstrating EARS's value as machine-checkable
  requirement claims.

EARS's five patterns:

| Pattern | Form | Example |
|---------|------|---------|
| Ubiquitous | "The system shall X" | "The system shall log every auth attempt" |
| Event-driven | "WHEN trigger THE system SHALL response" | "WHEN a user submits the form THE system SHALL validate credentials" |
| State-driven | "WHILE state THE system SHALL behavior" | "WHILE sync is in progress THE system SHALL display a progress indicator" |
| Unwanted | "IF condition THEN THE system SHALL response" | "IF auth fails 3x in 60s THEN THE system SHALL lock the account" |
| Optional | "WHERE feature THE system SHALL behavior" | "WHERE MFA is enabled THE system SHALL require TOTP" |

### Verdict for this harness

**EARS-style WHEN/THEN for backlog ACs — justified on harness-specific grounds, not
industry adoption.** Kiro's use of EARS is supporting evidence only (with a drift
caveat, above).

The constraint: the backlog AC string is the contract that flows between agents and
gates. It must serve (1) the verify-gate — one AC maps to one deterministic test
exit code, forcing atomicity; (2) LLM authors and reviewers — unambiguous
trigger→response, with a fence that cannot depend on model discipline; (3) the human
plan gate — 10–20 ACs evaluated quickly, low ceremony; (4) the qa agent — which
consumes human-owned criteria for E2E journeys; (5) backlog.md storage — plain
strings, no structural scenario blocks.

Single-line plain-string GWT ("GIVEN x WHEN y THEN z — verify: `cmd`") also
satisfies the storage, atomicity, and human-gate constraints — **the derivation does
not uniquely yield EARS.** EARS wins on three discriminating grounds:

1. **Layer fit and drift surface.** Backlog `acceptanceCriteria` entries are
   requirement-layer claims. EARS has no precondition slot, so there is nowhere to
   park implementation-flavored Givens — the smallest authoring-drift surface of the
   candidate formats. If scenario-level specs are ever written in the WHAT phase —
   or for multi-step E2E journeys the qa agent drives — Gherkin is the appropriate
   format there and composes with EARS ACs; Spec Kit's own two-format template
   demonstrates the split.
2. **Compounds are non-idiomatic, not impossible.** Canonical EARS permits compound
   responses and Complex (WHEN+WHILE+IF) patterns — "THE system SHALL do A and B"
   passes a shape check. But EARS makes compounds conspicuous and non-idiomatic,
   while GWT makes And-chaining idiomatic and template-baked (BMAD, above).
   Atomicity is ultimately enforced by the human plan gate plus the reviewer, not
   by grammar alone; the format's job is to make violations easy to see and cheap
   to reject.
3. **Shape checks are cheap.** AC validity is checkable near-mechanically — shape,
   not semantics ("THE system SHALL be user-friendly" matches the pattern and is
   still garbage; the plan gate covers semantics). Today this is a prompt rule in
   plan-reviewer.md, not a lint. The harness variant is **EARS-inspired, not
   canonical EARS**: it drops the "THE SYSTEM SHALL" response clause; accepted
   shapes are WHEN/IF/WHILE + plain outcome statements (the latter covers
   always-true/structural claims).

The 1:1 AC-to-test-exit-code mapping is design intent and convention (per-AC
evidence in verify-with-criteria plus reviewer audit), not a mechanically enforced
mapping today; embedding a `verify:` command in the AC string couples ACs to test
paths — a known trade-off. The harness has no non-technical stakeholders, no
Cucumber runner, and no business-language requirement. The existing
agentic-test-guardrails note still holds: "BDD today = plain-language scenarios in
spec markdown, not Cucumber tooling." (local: 2026-08-15-agentic-test-guardrails.md)

---

## 2. Spec → task mapping patterns

### The convergent 4-phase loop

Every major SDD framework converges on the same structure:

> "The 4 phases: Specify → Plan → Tasks → Implement, each with a human checkpoint."
> — https://www.thebcms.com/blog/spec-driven-development

| Tool | Phase names | Where specs live |
|------|------------|-----------------|
| GitHub Spec Kit | constitution → specify → plan → tasks → implement | `.specify/` directory |
| AWS Kiro | requirements → design → tasks | Kiro IDE workspace |
| OpenSpec | propose → explore → apply → sync → archive | `openspec/changes/` directory |
| BMAD-METHOD | spec → plan → tasks → implement | Project root |

### The mapping is 1:many, not 1:1

No tool maps one scenario = one task. The pattern is:

> "The plan is decomposed into atomic, independently-shippable tasks. Each task has a single
> objective, inputs (files to read, related specs), outputs (files to create/modify, tests to
> write), and an acceptance check. A good task list looks like a checklist a junior engineer
> could execute."
> — https://www.thebcms.com/blog/spec-driven-development

From the spec-to-backlog skill pattern (Confluence → Jira):

> "Creates an Epic first to organize the work, then generates individual Jira tickets linked
> to the Epic."
> — https://mcpservers.org/agent-skills/atlassian/spec-to-backlog

From the Jacob knowledgeaddict article on state machines:

> "Modules → Milestones → Atomic tasks. Each task is one behavior change with one
> verification. 'Add exponential backoff to HTTP client retry — verify with
> `test_retry_backoff`.' This is so precisely scoped that the agent can't drift."
> — https://jacobknowledgeaddict.substack.com/p/why-your-ai-coding-agent-keeps-making

The pattern: **one spec (feature) → one plan → many atomic tasks, each with one verification
command.** The task is the unit of work; the spec is the unit of intent.

### Flowspec — the precedent for spec-kit + backlog.md

Jason Poley's Flowspec project explicitly combines spec-kit with backlog.md:

> "flowspec is a deliberate implementation of spec-kit & backlog.md with task memory"
> — https://github.com/jpoley/flowspec (via https://medium.com/@jbpoley/spec-driven-with-a-backlog-928c13cf48cd)

This confirms the combination is viable: spec-kit provides the spec/plan format, backlog.md
provides the task tracking. The harness already has backlog.md; the question is whether a
separate spec format layer is needed on top.

---

## 3. Deterministic verification gates

### The spectrum of approaches

| Approach | How it works | Infrastructure cost | Determinism |
|----------|-------------|---------------------|-------------|
| Test exit code | Run `bun test`, check exit code | Zero (built-in) | 100% |
| AC-to-test mapping | Each AC references a test name; gate checks that test passed | Low (convention only) | High (if tests are well-named) |
| Gherkin → Cucumber/Behave | Step definitions execute scenarios | High (Cucumber, step defs, glue) | 100% but brittle |
| LLM-judged AC compliance | Ask an LLM "did the code meet this AC?" | Zero | Low (probabilistic) |
| Structured output + schema | Force JSON schema output, validate fields | Medium | High |

### What the evidence says works

The regolo.ai build-verify-loop article describes the pattern most directly:

> "By enforcing a deterministic verification gate, the system shifts from relying on prompt
> compliance to structural enforcement."
> — https://regolo.ai/the-build-verify-loop-stop-your-ai-agent-from-claiming-victory-before-the-tests-pass

The gates are shell scripts checking exit codes: `bun test`, `biome check`, grep for secrets,
forbidden paths. No LLM judgment in the gate — just pass/fail.

Addy Osmani's principle:

> "Deterministic gates are the one part of the pipeline that cannot be talked out of their
> verdict by a confident paragraph, so keep them strict."
> — https://addyosmani.com/blog/agentic-code-review/

And from the agentic-test-guardrails note:

> "Enforcement is PHYSICS not prompts: permission rules, git tamper-evidence (commit tests
> before impl; git diff test paths)."
> — local: 2026-08-15-agentic-test-guardrails.md

### The hallucination risk in verification

From the DEV community article on validating agent output:

> "The one mapping that bit us hardest: `committed` needs the SHA to resolve, not just be
> present. We caught a turn that emitted a clean-looking `a3f92c1` with no matching Bash result
> behind it — the confab faked the shape of the evidence, so a check that just greps for a
> 7-hex string would've waved it through."
> — https://dev.to/teppana88/how-i-validate-quality-when-ai-agents-write-my-code-481c

**Lesson: the gate must verify that the command actually ran and produced real output, not just
that the agent claimed it did.** Exit codes from the current turn are the cheapest anti-hallucination
measure. The verify-with-criteria skill already requires "fresh command output + exit codes in the
current turn."

### What backlog.md already provides for verification

From the backlog.md capability audit (local: 2026-08-23-backlog-md-capability-audit.md) and
task-finalization instructions:

- `acceptanceCriteria` — array of strings, each checkable via `acceptanceCriteriaCheck`
- `definitionOfDone` — project-level defaults + task-specific additions, checkable via `definitionOfDoneCheck`
- `implementationPlan` — the plan field, editable via `planSet`/`planAppend`
- `implementationNotes` — progress log via `notesAppend`
- `comments` — review discussion via `commentsAppend`
- `finalSummary` — PR-style completion summary
- `modifiedFiles` — file-to-task traceability

The task-finalization guide says:

> "Run objective verification before checking acceptance criteria. Use automated tests, command
> output, scripted UI checks, or explicit manual verification. Do not check acceptance criteria
> from code presence, grep output, or implementation intent alone."
> — backlog.md task-finalization instructions (MCP)

**backlog.md already has the AC tracking infrastructure. The gap is not in tracking — it's in
the format of the ACs and the deterministic gate that checks them.**

---

## 4. The KISS approach for this harness

### What the harness already has

| Capability | Already in backlog.md | Already in harness |
|------------|----------------------|-------------------|
| Spec (what + why) | task description + acceptanceCriteria | Yes (AGENTS.md WHAT-loop) |
| Plan (how) | implementationPlan field | Yes (AGENTS.md HOW-loop) |
| Task decomposition | task create + dependencies + parentTaskId | Yes (conductor creates) |
| Execution tracking | implementationNotes + comments | Yes (conductor writes) |
| AC checking | acceptanceCriteriaCheck/uncheck | Yes (task-finalization) |
| DoD checklist | definitionOfDoneCheck/uncheck | Yes (task-finalization) |
| Completion summary | finalSummary | Yes (task-finalization) |
| File traceability | modifiedFiles | Available, underutilized |
| Verification skill | — | Yes (verify-with-criteria skill) |
| Test runner | — | Yes (bun test, vitest, playwright) |

### The KISS spec format

**The spec IS the backlog task.** No separate spec.md file for the common case. The task's
`description` field is the spec body; the `acceptanceCriteria` array is the EARS-style
contract.

AC format (EARS-inspired, not canonical EARS and not Gherkin — accepted shapes include a
plain outcome statement for always-true/structural claims):

```
- WHEN [trigger] THEN [observable outcome] — verify: `bun test test/path.test.ts`
- IF [edge condition] THEN [expected behavior] — verify: `bun test test/path.test.ts -t "edge"`
- WHILE [state] THEN [invariant holds] — verify: `bun test test/path.test.ts -t "invariant"`
- [plain outcome statement, for always-true claims] — verify: `bun test test/path.test.ts`
```

Each AC is a single testable claim with a verification command. No Given/When/Then ceremony,
no Cucumber, no step definitions. The test file IS the executable oracle.

### The KISS verification gate

```
1. Run `bun test` (or vitest, playwright) in the worktree
2. Check exit code — if non-zero, the gate fails
3. If exit code is zero, check each AC in backlog via acceptanceCriteriaCheck
4. Run DoD checklist via definitionOfDoneCheck
5. Write finalSummary via task_edit
6. Set status to Done
```

The gate is: **exit code from the test runner in the current turn.** That's it. No LLM judgment
in the gate. The verify-with-criteria skill already implements this pattern: it maps each AC
to "fresh command output + exit codes from this turn" and declares a VERDICT.

### The KISS artifact chain

**Minimal artifacts (no separate files for the common case):**

| Artifact | Where it lives | Who writes it |
|----------|---------------|---------------|
| Spec | backlog task: description + acceptanceCriteria | Human (WHAT-loop) |
| Plan | backlog task: implementationPlan | Conductor (HOW-loop) |
| Tests | test files in the worktree | Implementer (TDD) |
| Results | command output in the conversation | Implementer (current turn) |
| Verdict | verify-with-criteria skill output | Conductor (gate) |
| Summary | backlog task: finalSummary | Conductor (done) |

**The spec.md → plan.md → tests.md → results.md → verdict.md chain is over-engineered for this
harness.** It creates five separate files that duplicate what backlog.md already stores as
fields on the task. The backlog task IS the spec, the plan, the execution log, and the
completion record — all in one resumable, version-controlled markdown file.

### When to use separate spec files

Separate spec files (docs/spec/ or backlog documents type: specification) are warranted when:

1. **The spec spans multiple tasks** — a multi-task feature (e.g., "add auth system") needs a
   shared spec that individual tasks reference. Use a backlog document (type: specification)
   or docs/spec/ for this. Each sub-task's ACs are derived from the shared spec.

2. **The spec needs human dialogue before task creation** — the WHAT-loop's dialogue phase
   (grilling, prototype) produces a spec that the human approves before tasks are created.
   That spec lives in docs/spec/ until it's decomposed into tasks.

3. **The spec is a system-level invariant** — cross-cutting constraints (security policy, API
   contracts, architecture decisions) that apply to many tasks. Use backlog decisions
   (backlog decision create) or docs/spec/ for these.

For the common case (one task, one bounded goal), **the task IS the spec — no separate file.**

---

## 5. Where specs live — the DRY approach

### The current duplication

The harness currently has:
- `docs/spec/` — separate spec files
- `docs/plans/` — separate plan files
- `backlog/` — task files with description, ACs, plan, notes, summary

This is a **parallel structure** that violates DRY. The same information (what to build, how
to build it, whether it's done) lives in two places: the spec/plan files and the backlog task.

### The DRY resolution

| Spec scope | Where it lives | Why |
|------------|---------------|-----|
| Task-level spec (1 task) | backlog task: description + ACs | No duplication; task is the unit of work |
| Multi-task spec (feature) | backlog document (type: specification) | Shared reference; tasks link via documentation field |
| System-level invariant | backlog decision or AGENTS.md | Cross-cutting; not task-specific |
| Research (why) | docs/research/ | Already established; separate concern |
| Plan (how) | backlog task: implementationPlan | No separate plan.md per task |

**For multi-task specs:** create a backlog document (type: specification) with the full spec,
then create tasks that reference it via the `documentation` field. Each task's ACs are derived
from the relevant section of the spec document. This keeps the spec searchable
(`backlog doc search`) and visible in the web UI, without duplicating it into docs/spec/.

**For single-task specs:** the task's description + ACs are the spec. No separate file.

---

## 6. Recommendation — the KISS flow for this harness

### The minimal spec-driven loop

```
WHAT loop (human inside):
  1. Human describes intent → conductor creates backlog task with description + ACs
  2. ACs are WHEN/THEN statements with verification commands (EARS-inspired, not Gherkin)
  3. Human reviews ACs (gate 1) — approves or iterates
  4. [If multi-task] Conductor creates backlog document (type: specification) + child tasks

HOW loop (agents inside, human at 2 gates):
  5. Conductor sets implementationPlan on the task
  6. Human reviews plan (gate 2) — approves or iterates
  7. Implementer writes failing tests first (TDD), watches them fail
  8. Implementer writes code to pass tests
  9. Implementer runs `bun test` — exit code is the deterministic gate
  10. If exit code != 0: iterate (cap 5 rounds, then escalate)
  11. If exit code == 0: conductor runs verify-with-criteria skill
  12. Skill maps each AC to fresh evidence (command output + exit codes)
  13. If all ACs verified: acceptanceCriteriaCheck for each, definitionOfDoneCheck
  14. Conductor writes finalSummary, sets status to Done
  15. Human reviews PR (gate 3)
```

### What changes from current practice

1. **AC format**: shift from freeform to WHEN/THEN with verification commands. This is the
   only format change — no new infrastructure.

2. **Spec location**: stop creating docs/spec/ files for single-task specs. Use the task's
   description + ACs. For multi-task specs, use backlog documents (type: specification).

3. **Plan location**: stop creating docs/plans/ files for single-task plans. Use the task's
   implementationPlan field. Keep docs/plans/ only for cross-task planning that spans multiple
   backlog tasks (the wayfinder/map level).

4. **Verification gate**: already implemented by verify-with-criteria skill. The gate is
   `bun test` exit code in the current turn. No new tooling.

5. **No Gherkin, no Cucumber, no custom test runner.** The test files ARE the executable oracle.
   ACs reference test names; the test runner proves them.

### What stays the same

- backlog.md as the task tracker (already adopted)
- TDD red-green-refactor (already in agentic-test-guardrails)
- verify-with-criteria skill for the gate (already exists)
- Two-loop model (WHAT/HOW) with human gates (already in AGENTS.md)
- Worktree discipline (already enforced)

---

## 7. YAGNI candidates — what NOT to build

| Don't build | Why | What to do instead |
|-------------|-----|-------------------|
| Gherkin/Cucumber integration | No non-technical stakeholders; ceremony overhead; Cucumber is heavy infra | Use EARS-inspired WHEN/THEN in ACs |
| Separate spec.md per task | Duplicates backlog task description + ACs | Put spec in the task |
| Separate plan.md per task | Duplicates backlog task implementationPlan | Put plan in the task |
| tests.md artifact file | Tests are real files, not markdown | Write actual test files |
| results.md artifact file | Results are command output in the conversation | Use verify-with-criteria skill output |
| verdict.md artifact file | The verdict is the verify-with-criteria skill's VERDICT line | Use the skill |
| AC-to-test mapping file | ACs already carry verification commands | Embed `verify: \`bun test ...\`` in each AC |
| Custom spec validation agent | The verify-with-criteria skill + test exit codes already do this | Use existing skill |
| Spec format parser/compiler | EARS-inspired WHEN/THEN is human-readable, no parsing needed | Just write them as strings |
| OpenSpec or Spec Kit installation | The harness already has backlog.md + opencode + bun test; adding Spec Kit duplicates the task tracking layer | Use backlog.md's existing fields |

---

## Open questions

1. **Should the harness adopt backlog documents (type: specification) for multi-task specs,
   or keep using docs/spec/?** The DRY argument favors backlog documents (unified search,
   web UI visibility, no parallel directory). But docs/spec/ is already established and
   the research notes live there too. **Not resolved — needs a decision in the WHAT-loop dialogue.**

2. **Is the EARS-inspired WHEN/THEN format too rigid for non-behavioral tasks (e.g., "refactor
   the config loader")?** Some tasks are structural, not behavioral. ACs for those might be
   "the config loader uses the new schema" without a WHEN/THEN trigger. **Likely answer:
   use WHEN/THEN for behavioral ACs, plain statements for structural ACs — the format is a
   guideline, not a straitjacket.**

3. **Should the verification command be embedded in the AC string, or in a separate field?**
   backlog.md has no `verificationCommand` field — it would need to be part of the AC string
   or a convention in the comments/notes. **Practical answer: embed it in the AC string
   (`verify: \`bun test ...\``) — it's human-readable and the implementer can parse it.**

4. **Does the 5-round fix cap from agentic-test-guardrails interact correctly with the
   deterministic gate?** If `bun test` fails 5 times, the harness escalates to a human.
   But the gate is exit-code-based, not LLM-judged, so the cap is on the implementation loop,
   not the verification. **Likely answer: yes, the cap is on the implementation loop; the
   gate is always deterministic regardless of round count.**

---

## Evidence quality

- **Verified from primary sources**: Spec Kit, Kiro, OpenSpec workflows (official docs + GitHub
  discussions); EARS notation (thebcms.com definitive guide); U-shaped cost curve
  (the-main-thread.com, Apr 2026); backlog.md capabilities (local audit + MCP instructions).
- **Verified from secondary sources**: Augment Code tool comparison; Martin Fowler SDD tools
  analysis; Zarar's blog SDD overview.
- **Inference, not verified**: The specific claim that "the harness's docs/spec/ and
  docs/plans/ directories duplicate backlog.md fields" is based on the capability audit's
  finding that backlog.md has description, ACs, plan, notes, summary fields — but I did not
  audit the actual contents of docs/spec/ and docs/plans/ to confirm duplication.
- **Not checked**: Whether Spec Kit or OpenSpec integrate natively with backlog.md (Flowspec
  does, but it's a separate project, not the harness's current stack).
