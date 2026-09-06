# Security, QA, and TDD Mechanisms

> **Date:** 2026-07-04
> **Status:** Active research. Informs ROADMAP design.
> **Cross-ref:** `docs/NORTH_STAR.md` (security, TDD, QA non-negotiables),
> `docs/research/model-selection.md` (maker/checker pairs),
> `docs/research/2026-07-04-harness-setup-and-pmf-synthesis.md` (superpowers fit)

## Scope

This doc covers three interrelated 1.95 research threads:
1. Security scope mechanisms (which SAST, how `weavelog check` enforces)
2. Two-layer QA mechanism (maker/checker + verification gates)
3. TDD with AI agents (test-first + small-ships + clean-commits design)

They're combined because they compose into a single enforcement architecture.

## The enforcement stack (four layers)

| Layer | What | Exists now? | When |
|---|---|---|---|
| 1. Prompt-level | AGENTS.md rules, NORTH_STAR principles, superpowers skills | ✅ Now | v0.1 |
| 2. Git hooks | commit-msg (format), pre-commit (secrets + sanitization) | ❌ Pending (1.98b) | v0.1 |
| 3. CI | CodeQL (SAST), gitleaks (secrets), commitlint (format) | ❌ Pending | v0.1 |
| 4. `weavelog check` | deterministic verifier (tests, lint, SAST, secrets, policy) | ❌ Not built | v0.2+ |

Layers 1–3 are infrastructure (tools + config). Layer 4 is the product —
the deterministic CLI that bundles all checks into one command. This is
where weavelog adds value beyond what the individual tools do alone.

## Security mechanisms (thread 6)

### The three security scopes (from NORTH_STAR)

The user confirmed all three are non-negotiable:

| Scope | What | Mechanism | Phase |
|---|---|---|---|
| (i) weavelog's own code is scanned | Standard OSS hygiene | CodeQL in CI + gitleaks pre-commit | v0.1 |
| (ii) `weavelog check` enforces on workspaces | The CLI validates workspaces it produces | `weavelog check` runs: dependency vuln scan, secret detection, AGENTS.md policy, sanitization scan | v0.2 |
| (iii) Security verification in the loop | Security is a step in spec→implement→verify→document | SAST runs as a verify gate; optional security-focused QA agent reviews diffs | v0.3+ |

### Tool mapping (all activity-audited, MIT unless noted)

| Tool | License | Role | Scope | Phase |
|---|---|---|---|---|
| GitHub CodeQL | MIT | Semantic SAST for TypeScript | (i) CI | v0.1 |
| gitleaks | MIT | Secrets scanning | (i)+(ii) pre-commit + CI + `weavelog check` | v0.1 |
| Semgrep | LGPL-2.1* | Custom rules (AGENTS.md policy, sanitization patterns) | (ii) `weavelog check` | v0.2 |
| `weavelog check` | (weavelog) | Bundles: gitleaks + Semgrep rules + dependency audit + sanitization grep | (ii) on-demand | v0.2 |

*Semgrep is LGPL-2.1, approved exception (used-not-linked).

### What `weavelog check` enforces (scope ii design)

```
weavelog check
├── Secret detection        → gitleaks (API keys, tokens, passwords)
├── Sanitization scan       → grep for /Users/<name>, absolute paths, personal emails
├── Dependency audit        → npm audit (vuln DB) for the workspace
├── AGENTS.md policy        → verify AGENTS.md exists, <200 LOC, has MUST NOT section
├── License scan            → verify all deps are MIT/Apache 2.0 (flag copyleft)
└── SAST (custom rules)     → Semgrep rules for weavelog-specific patterns
```

This is the deterministic verifier. It runs on-demand (`weavelog check`) and
in the verify gate (scope iii). Every check is a pass/fail — no ambiguity.

### Security in the loop (scope iii design)

The verify step of spec→implement→verify→document runs:
1. `weavelog check` (deterministic — all checks above)
2. Tests pass (`node --import tsx --test`)
3. Lint clean (`biome check`)
4. Typecheck clean (`tsc --noEmit`)
5. Optional: security QA agent reviews the diff (v0.3+, agentic layer)

The security QA agent is phased — not v1. At v1, SAST-in-gate (scope ii) is
sufficient. The agent layer adds value when the codebase is large enough
that SAST rules miss contextual issues.

## Two-layer QA mechanism (thread 5)

### The two layers (from loop engineering sources)

| Layer | What | Source | Mechanism |
|---|---|---|---|
| 1. Verification gate (deterministic) | Tests, lint, build, SAST pass | LangChain "verification loop"; Voss "task loop ends on spec compliance + passing tests" | `weavelog check` + CI |
| 2. QA agent (agentic) | Different model reviews diff against spec | Addy Osmani "maker/checker split"; superpowers `requesting-code-review` | Sub-agent with different model |

### Maker/checker model pairs (from model-selection.md)

Already designed. The key principle: **the same model never grades its own
work.** Different model families have different blind spots.

| Maker (implements) | Checker (reviews) | Why different |
|---|---|---|
| GLM 5.2 (Z.ai) | DeepSeek V4 Pro (DeepSeek) | Different families, different architectures |
| GLM 5.2 (Z.ai) | Kimi K2.7 Code (Moonshot) | Different family, multimodal for UI review |

Frontier escalation (targeted, last-resort):
- Fable 5 (Anthropic) — analyst/researcher/reviewer when open-weights fall short
- GPT 5.5/5.6 (OpenAI) — cross-vendor second opinion (research pending in 1.95)

### How QA composes with the verify gate

```
spec → implement → verify → document
                     │
                     ├── (1) Deterministic gate: weavelog check + tests + lint + tsc
                     │     └── fail → back to implement
                     │
                     ├── (2) QA agent: different model reviews diff vs spec
                     │     └── issues found → back to implement
                     │
                     └── (3) Human review (diff gate)
                           └── approved → document step
```

Layer 1 is mechanical (no LLM). Layer 2 is agentic (LLM, different model).
Layer 3 is human (the oversight loop). This traces to Laurie Voss's four-loop
stack: execution loop (implement) → task loop (verify) → oversight loop (human).

### What superpowers already enforces

| QA principle | Superpowers skill | Enforcement |
|---|---|---|
| Test-first | `test-driven-development` | Iron Law: "NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST" |
| Evidence before claims | `verification-before-completion` | Run the command, read output, then claim |
| Maker/checker | `requesting-code-review` + `receiving-code-review` | Different agent reviews diff |
| Small ships | `subagent-driven-development` | One implementer per task, commit after tests pass |
| Plan-first | `writing-plans` + `brainstorming` | Design before implementation |

weavelog composes these skills (doesn't reinvent them). The workflow config
specifies which skill applies at which step. The verify gate runs
`weavelog check` mechanically; the QA agent uses `requesting-code-review`.

## TDD with AI agents (thread 4)

### The challenge

AI agents naturally:
- Produce large diffs (not atomic commits)
- Don't write tests first (they write implementation, then maybe tests)
- Don't decompose work into small shippable units

Making TDD + small ships + clean commits first-class requires design work,
not a toggle. The design:

### The TDD-with-agents pattern

```
For each task in the implementation plan:
  1. Implementer agent receives: task spec + existing tests + constraints
  2. Implementer writes the FAILING TEST first (superpowers TDD skill)
  3. Implementer runs test → confirms RED (verification-before-completion)
  4. Implementer writes minimal code to pass
  5. Implementer runs test → confirms GREEN
  6. Implementer commits (atomic, conventional commit format)
  7. QA agent reviews the diff (maker/checker)
  8. If issues → back to step 2; if clean → next task
```

### Small ships + clean commits

- **One task = one commit.** The workflow config enforces this. Each task
  in the plan produces exactly one atomic commit.
- **Conventional commit format.** Enforced by commit-msg hook (commitlint).
- **The implementer agent doesn't commit directly.** It produces a diff.
  The workflow runner (Pi session) commits after verifying tests pass.
  This separates "produce work" from "commit work" — the commit is gated.

### What's hard (honest)

1. **Agents resist test-first.** The TDD skill is prompt-level enforcement.
   An agent CAN ignore it. The mechanical gate (tests must exist and fail
   before implementation) catches this — but requires the workflow to
   check for test existence, not just test passage.
2. **Large diffs slip through.** An agent might do 3 tasks worth of work
   in one commit. The workflow must enforce task boundaries — one task
   per commit, no batching.
3. **"Clean commits" is subjective.** Conventional commit format is
   mechanically enforceable (commitlint). But "clean" (no debug code, no
   commented-out blocks, no unrelated changes) requires the QA agent.
   This is where layer 2 (agentic QA) earns its cost.

### Phased approach

| Phase | TDD enforcement | Small ships | Clean commits |
|---|---|---|---|
| v0.1 (weavelog itself) | Manual (superpowers skill) | Manual (one task per commit) | Manual (commitlint) |
| v0.3 (task loop exists) | Workflow checks test-first | Workflow enforces task-per-commit | QA agent reviews |
| v1.0 (product loop) | Full TDD-in-loop | Automated decomposition | Full maker/checker |

## What this research resolves

| Question | Answer |
|---|---|
| Which SAST? | CodeQL (CI) + gitleaks (pre-commit + CI) + Semgrep (custom, v0.2) |
| How does `weavelog check` enforce? | Bundles: gitleaks + Semgrep + dep audit + sanitization + policy |
| Security agent vs gate? | Gate first (v0.1–v0.2), agent later (v0.3+) — phased |
| Which models for maker/checker? | GLM 5.2 → DeepSeek V4 Pro (code); GLM 5.2 → Kimi K2.7 (UI) |
| How does security verifier compose? | SAST-in-gate (deterministic) at v1; security QA agent at v0.3+ |
| TDD with agents — how? | Skill-level (superpowers) + mechanical gate (test must exist + fail before impl) + one-task-per-commit |
| Small ships — how? | Workflow enforces task-per-commit; implementer produces diff, runner commits after tests pass |
| Clean commits — how? | commitlint (format) + QA agent (content review) |

## What this research defers

- Frontier model selection (GPT 5.5/5.6 for escalation) — separate thread
- Evals + telemetry design — separate thread
- Doc indexing — separate thread
- `weavelog check` implementation details — ROADMAP + implementation plan
