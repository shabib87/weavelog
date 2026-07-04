# Open Blindspots Index

**Status:** Tracked open questions discovered during the bird's-eye review.
Each has its own file or is folded into the spec revision.

These are the smaller blindspots from the review. The three high-severity
ones have dedicated files: [`settings-isolation.md`](settings-isolation.md),
[`rollback-mechanism.md`](rollback-mechanism.md),
[`cost-ceiling.md`](cost-ceiling.md).

## Model Drift / Availability
We verified all six models exist on OpenRouter *today*. Models get renamed,
deprecated, or repriced. A workflow config hardcoding `z-ai/glm-5.2` breaks
silently the day Z.ai ships glm-5.3 and deprecates 5.2.

**Options:**
- A model alias layer in loopeng (`research: latest-glm` → resolve at runtime).
- A `loopeng check` step that validates workflow configs against the live
  OpenRouter `/api/v1/models` before running.
- Both.

**Decision needed:** alias layer vs pre-run validation vs both. Recommend:
pre-run validation in `loopeng check` for v1 (simple, catches breakage
early); alias layer deferred.

## Non-Code Workflow Verification
The spec's deterministic exits are code-centric (`./gradlew test` exits 0).
But the North Star says "software *or* technical writing." For a blog post
workflow, what's the deterministic verifier? Spelling/grammar? Word count?
Human-only?

If writing/research modes fall back to human-only gates, they undermine the
"deterministic verifier" principle — but forcing a fake deterministic check
on prose is worse.

**Decision needed:** per-mode verification definitions. For `writing`:
perhaps `markdown lint passes` + `prose lint (e.g., alex) passes` as
deterministic, human for quality. For `research`: perhaps `all citations
resolve` as deterministic. Spec needs a per-mode verification table.

## Loop Telemetry / Observability
We track workflow state (step, handoffs, verification results). We don't
track *loop health*: retries per step across runs, which models fail most,
average tokens per step, where humans reject most often. This is the data
LangChain's Level 4 (hill climbing) needs. Without it, Headroom `--learn`
has only raw error patterns.

**Proposal:** append-only `.workflow/metrics.jsonl` per run: step, model,
tokens in/out, cost, retries, outcome (approved/rejected/aborted), duration.
Feeds both debugging and future self-improvement. Low effort, high value.

**Decision needed:** include metrics logging in v1 or defer. Recommend:
include — it's cheap and unblocks Level 4 later.

## First-Run Experience Without OpenRouter Key
`loopeng check` verifies `OPENAI_API_KEY` is set. For someone cloning loopeng
to try it, requiring an OpenRouter key upfront is friction.

**Options:**
- A "demo mode" using `nvidia/nemotron-3-super-120b-a12b:free` (on the model
  list, free) that runs a trivial workflow without a key.
- A recorded sample run in the README (no execution needed).

**Decision needed:** demo mode vs docs-only. Recommend: docs-only for v1
(keep scope tight); demo mode post-v1.

## The Revised ADR Doesn't Exist Yet
We have NORTH_STAR (what), RESEARCH (why), the design spec (detailed, under
revision). But the **ADR** — the single architectural decision record that
supersedes the original — hasn't been written. The original ADR is in
`docs/archive/`.

**Action:** Write `docs/adr.md` as the authoritative architecture doc, with
the revised design spec as its detailed appendix. The spec should not do
double duty as both ADR and design.

## Workspace Scaffold Versioning
`loopeng init` v0.1 scaffolds certain files. v0.2 changes the scaffold. How
does an *existing* workspace upgrade? `loopeng init` is idempotent (skip,
don't clobber), so it won't update stale scaffolds.

**Options:**
- A `.loopeng-version` file in scaffolded workspaces that `loopeng check`
  reads and warns about.
- A `loopeng upgrade` command that applies scaffold migrations.

**Decision needed:** version file + warning (v1) vs upgrade command (post-v1).
Recommend: version file in v1, upgrade command deferred.

## Contributor Readiness vs Solo-Dev Claim
User stated no contributions for v1. But OSS means people *will* file issues
and PRs. Without expectation-setting, you'll get PRs you have to respond to.

**Action:** A `CONTRIBUTING.md` stating "v1 is solo-dev; issues welcome, PRs
not yet accepted." Also a `CODE_OF_CONDUCT.md` (standard for OSS, costs
nothing). Both should be created when the repo goes public, not before.
