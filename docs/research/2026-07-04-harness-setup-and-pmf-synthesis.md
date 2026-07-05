# Harness Setup & PMF Synthesis

> **Date:** 2026-07-04
> **Status:** Active lab notebook. Source material for future blog writing.
> **Session:** `verify-doc` (Pi, z-ai/glm-5.2 via OpenRouter)
> **Cross-ref:** `docs/NORTH_STAR.md`, `docs/research/RESEARCH.md`, `docs/research/model-selection.md`

This is a lab notebook, not a polished blog. It captures the findings,
decisions, and corrections from the 2026-07-04 session so they survive the
session and can feed future writing. It will grow. Indexing is flat-markdown +
headers + grep until that breaks (YAGNI).

## Table of contents

1. [Harness setup: codex 401 fix](#1-harness-setup-codex-401-fix)
2. [Headroom anthropic-forwarder crash bug](#2-headroom-anthropic-forwarder-crash-bug)
3. [Pi architecture: openrouter-direct + side-compressor](#3-pi-architecture-openrouter-direct--side-compressor)
4. [Tolaria reference: the credibility model](#4-tolaria-reference-the-credibility-model)
5. [PMF lock: three proof projects](#5-pmf-lock-three-proof-projects)
6. [Superpowers fit: loopeng composes, does not reinvent](#6-superpowers-fit-loopeng-composes-does-not-reinvent)
7. [Doc-chain decision: BRD/PRD/TRD collapsed](#7-doc-chain-decision-brdprdtrd-collapsed)
8. [Engineering philosophy synthesized](#8-engineering-philosophy-synthesized)
9. [Tooling stack (verified)](#9-tooling-stack-verified)
10. [Open threads for Phase 1.95 research](#10-open-threads-for-phase-195-research)

---

## 1. Harness setup: codex 401 fix

**Symptom:** `codex exec "say hello"` failed with
`401 Unauthorized: No user or org id found in auth cookie` on
`http://127.0.0.1:8788/v1/responses`. The request reached OpenRouter's
Cloudflare edge (`cf-ray` header), so headroom forwarded correctly —
OpenRouter rejected the auth.

**Root cause (evidence-based, not brute force):**

`~/.codex/config.toml` defined:

```toml
[model_providers.headroom]
name = "Headroom init proxy"
base_url = "http://127.0.0.1:8788/v1"
supports_websockets = true
requires_openai_auth = true   # breakage
```

Per `developers.openai.com/codex/auth.md` (verbatim):

> "OpenAI authentication: Set `requires_openai_auth = true` to use OpenAI
> authentication. … When `requires_openai_auth = true`, Codex ignores
> `env_key`."

So with `requires_openai_auth = true` and no completed `codex login`, codex
sent no valid OpenRouter credential; headroom forwarded it as-is; OpenRouter
returned 401. Adding `env_key` alone would NOT have fixed it — codex is
documented to ignore `env_key` under `requires_openai_auth = true`.

**Reproduction (3-way isolation):**

| Request | Result |
|---|---|
| `GET /v1/models` (no auth) via headroom | 200 (public listing) |
| `POST /v1/responses` (no auth) via headroom | 401 — identical to codex |
| `POST /v1/responses` with `Authorization: Bearer $OPENROUTER_API_KEY` | 200, full completion |

**Fix (documented, no login required):**

Switched to the custom-provider-with-`env_key` pattern per
`developers.openai.com/codex/config-advanced.md`:

```toml
[model_providers.headroom]
name = "Headroom init proxy"
base_url = "http://127.0.0.1:8788/v1"
env_key = "OPENROUTER_API_KEY"
wire_api = "responses"
supports_websockets = true
# requires_openai_auth removed (defaults false)
```

**Verification:** `codex exec "say hello"` → EXIT=0, "Hello! How can I help
you today?", no login, no 401. `headroom doctor`: 0 failures, codex routed.

**Lesson:** `requires_openai_auth` is for OpenAI-proxy scenarios where you
*want* ChatGPT login. For OpenRouter API-key auth through a proxy,
`env_key` (custom provider) is the documented no-login path. The distinction
matters: `requires_openai_auth = true` silently disables `env_key`.

---

## 2. Headroom anthropic-forwarder crash bug

**Symptom:** `POST /v1/messages` (Anthropic format) through headroom to
OpenRouter returns 502 with `TypeError: unsupported operand type(s) for +:
'int' and 'NoneType'`.

**Root cause (from proxy.log):**

OpenRouter's Anthropic-compat `usage` object returns `null` for several
fields where real Anthropic returns integers:

```json
"usage": {
  "input_tokens": 13,
  "output_tokens": 30,
  "cache_creation_input_tokens": null,   // ← real Anthropic: int
  "cache_creation": null,                // ← real Anthropic: int
  ...
}
```

Headroom's `anthropic_messages` forwarder does `int + None` while summing
usage → `TypeError` → 502.

**Key finding:** this is a **headroom v0.30.0 code defect**, not a config
error. Proven by isolation: a temp proxy on port 8789 with
`--no-optimize --stateless` (bare forwarding, no compression, no memory)
*still 502s* on `/v1/messages`. No flag works around it. `headroom update
--check` confirms v0.30.0 is the latest (no fixed version).

**Scope:** this bug only triggers when routing Anthropic-protocol traffic
through headroom to OpenRouter. Nothing in our stack does this — Pi uses
its native `openrouter` provider (OpenAI wire), and codex uses
`/v1/responses`. So the bug is real but **does not affect us**. Chased and
discarded; documented here so it's not re-investigated.

**Lesson:** when a bug is found, check whether it's in your actual hot path
before fixing. We spent effort on this before realizing Pi never sends
`/v1/messages` through headroom. YAGNI applies to debugging too.

---

## 3. Pi architecture: openrouter-direct + side-compressor

**What Pi actually does (verified from proxy.log, not assumed):**

- Pi uses its built-in `openrouter` provider (`defaultProvider: "openrouter"`
  in `~/.pi/agent/settings.json`). LLM calls go **direct** to OpenRouter
  via OpenAI wire format. Pi's `/v1/messages` traffic never touches headroom.
- The `@ryan_nookpi/pi-extension-headroom` plugin is a **side-compressor**,
  not a routing proxy. It listens on Pi's `context` event, sends oversized
  `toolResult` payloads to headroom's `/v1/compress` endpoint, and applies
  the compressed result with alignment guards.
- Proxy.log evidence: 491 `/v1/compress` calls with
  `x-headroom-stack: pi-extension`, user-agent `undici`. Zero `/v1/messages`
  calls from Pi.

**Why this is the correct architecture (not a workaround):**

- The hot path (LLM calls) goes direct — no proxy hop, no latency, no
  crash-bug exposure.
- Only oversized toolResults get compressed — selective by design
  (`minContextTokens=20000`, `minMessageChars=2000`, plus headroom's
  content_router skips <50-word messages, Read/Glob outputs, error output).
- This matches the North Star "minimal required tooling" and the plugin's
  stated design ("compresses only oversized toolResult payloads").

**Why Pi doesn't appear on the headroom dashboard:**

`/stats` `agent_usage` attributes by LLM-routing client. Codex routes
through headroom (`/v1/responses`) → attributed as client `codex`. Pi's
LLM calls go direct to OpenRouter → not attributed. Pi's `/v1/compress`
calls are utility, attributed to provider `openai` (wire format). Pi's
compression IS counted in aggregate savings; it's just not labeled "pi."

**Lesson:** "Pi bypasses headroom" was the wrong frame. Pi uses headroom
correctly — as a side-compressor, not a routing proxy. The dashboard
attribution gap is a labeling artifact, not a malfunction.

---

## 4. Tolaria reference: the credibility model

**Reference:** `refactoringhq/tolaria` (18,308 ★, TypeScript, AGPL-3.0,
created 2026-02-14, ~5 months old). HN Show: 318 points, 142 comments.

**Creator:** Luca (lucaronin), founder of *Refactoring* newsletter
(170,000+ subscribers). Built Tolaria for his own 10,000+ note vault.

**Credibility mechanism (from README principles, verbatim):**

> "💪 Built from real use — Tolaria was created to manage my personal vault
> of 10,000+ notes, and I use it every day. Every feature exists because it
> solved a real problem."

This is the exact model loopeng adopts: **personal need → opinionated tool
→ public OSS → credibility from "built from real use."** Luca was the
primary user, built for himself, shared it, got 18k stars in 5 months.

**Three transferable elements:**

1. **License choice:** Tolaria uses **AGPL-3.0 + trademark policy**, not
   MIT/Apache 2.0. AGPL forces anyone shipping Tolaria-as-a-service to
   open-source changes; trademark keeps name/logo controlled. For a tool
   where credibility + direction-control matters, this is a deliberate
   choice. Loopeng's MIT-vs-Apache-2.0 question is incomplete — AGPL is a
   third option. (Phase 1.95 will research all three.)
2. **"Built from real use" as explicit principle:** loopeng should list this
   as a project principle. The three proof projects (§5) are the evidence.
3. **Sponsor model, not revenue:** Tolaria is backed by tool sponsors
   (Codacy, CodeScene, CircleCI, Unblocked), not user payments. Relevant
   to the "bragging rights + credibility" outcome.

**Lesson:** OSS devex tools don't have traditional moats. The credibility +
audience + patterns ARE the moat. Tolaria went AGPL+trademark for a legal
layer; that's worth researching, not assuming.

---

## 5. PMF lock: three proof projects

**Outcome:** loopeng's credibility comes from the builder's own real work,
demonstrated across three project types, with the blog as the demo channel.

**Three proof projects (paths verified):**

1. **loopeng itself** (`~/Projects/loopeng`) — dogfooding. The system loop
   / hill-climbing loop made literal. loopeng builds loopeng. Strongest
   possible demonstration that the tool works. (Sequenced post-v0.3: hand-
   build through v0.3, then v0.4+ features built *using* loopeng v0.3.)
2. **codewithshabib blog** (`~/Projects/Claude-Cowork/CodeWithShabib/
   shabib87.github.io`, main branch, active, codex-trusted) — content/web
   proof point. spec→implement→verify→document on a real site. The blog
   itself is the demonstration channel: you publish the process.
3. **Mobile app comparison: native iOS / native Android / KMP / RN** —
   mobile proof point. Exercises the mobile non-negotiable. Generates
   comparative telemetry (which approach ships fastest/cheapest/highest-
   quality). Sequenced at v1.0.x (the public proof-of-concept, not the v1
   deliverable).

**Audience:** developers who want an opinionated agentic-loop devex tool,
proven credible by the builder's own real work. Broader than "mobile
engineers," narrower than "any solo dev." Matches Tolaria's audience shape.

**Why this is stronger than Tolaria:** Tolaria had one proof point (Luca's
notes). loopeng has three, across three project shapes (devex tool, content
site, mobile app). Each generates different telemetry. The blog publishes
all of it.

**Lesson:** PMF for a solo OSS tool is "I built this for me and it worked
so well I generalized it" — not "I built a general tool, trust me." The
proof projects make the claim falsifiable.

---

## 6. Superpowers fit: loopeng composes, does not reinvent

**Discovery:** Superpowers (`github.com/obra/superpowers`, MIT, installed at
`~/.pi/agent/git/github.com/obra/superpowers/`) is a near-exact
implementation of loopeng's engineering philosophy, already running in this
session.

**Superpowers' own description (verbatim from README):**

> "It starts from the moment you fire up your coding agent… it doesn't just
> jump into trying to write code. Instead, it steps back and asks you what
> you're really trying to do. Once it's teased a spec out of the
> conversation… After you've signed off on the design, your agent puts
> together an implementation plan… it emphasizes true red/green TDD, YAGNI,
> and DRY. Next up, once you say 'go', it launches a subagent-driven-
> development process… inspecting and reviewing their work."

That IS loopeng's philosophy: shift-left, spec-first, TDD, YAGNI, sub-agent
maker/checker, verification before completion.

**Skills inventory maps 1:1 to NORTH_STAR non-negotiables:**

| NORTH_STAR non-negotiable | Superpowers skill enforcing it |
|---|---|
| YAGNI/SOLID/KISS | `brainstorming`, `using-superpowers` |
| TDD first-class | `test-driven-development` |
| QA maker/checker | `requesting-code-review`, `receiving-code-review` |
| Verification gates | `verification-before-completion` |
| Small ships / clean commits | `subagent-driven-development`, `executing-plans` |
| Plan-first | `writing-plans` |
| Skills standard | `writing-skills` |
| Isolation | `using-git-worktrees` |
| Debugging discipline | `systematic-debugging` |

**Where superpowers fits:** it's the **skills layer** — the codified
engineering methodology that makes the loop behave according to loopeng's
principles. Loop engineering (Voss/Osmani) names "skills" as one of the
five loop components. Superpowers IS that layer, pre-built, MIT, Pi-native.

**Decision:** loopeng **composes** superpowers; it does not reinvent it.
This shrinks loopeng's scope (YAGNI) and strengthens the integration story.

- loopeng = deterministic CLI (workspace setup, model config, `loopeng
  check` verifier, workflow configs)
- superpowers = skills layer (the *how* of TDD, review, verification)
- Pi = host (executes the loop, spawns sub-agents)
- headroom = compression + memory
- markitdown = doc ingestion

**Open thread:** verify superpowers LICENSE is MIT (README implies open;
LICENSE file not yet read). Tracked in Phase 1.95.

**Lesson:** before building a feature, check whether a composable OSS
dependency already implements it. YAGNI isn't just "don't build imagined
features" — it's "don't rebuild what you can compose."

---

## 7. Doc-chain decision: BRD/PRD/TRD collapsed

**Question:** the enterprise chain (BRD → PRD → TRD → ADR → Spec → Task) —
how does it fit loopeng?

**Decision:** loopeng does NOT adopt separate BRD/PRD/TRD files. That's
enterprise ceremony violating YAGNI. The chain collapses to:

| Enterprise doc | loopeng equivalent | Status |
|---|---|---|
| BRD (business requirements) | `NORTH_STAR.md` + PMF/blog narrative | ✅ Exists |
| PRD (product requirements) | `ROADMAP.md` (milestones, metrics, telemetry) | ⏳ Pending 1.95 |
| TRD (technical requirements) | `adr.md` + `specs/2026-06-28-...md` | ✅ Exists |
| ADR | `adr.md` | ✅ Exists |
| Spec | `specs/2026-06-28-loopeng-design.md` | ✅ Exists |
| Task | `superpowers/plans/2026-07-04-loopeng-implementation.md` | ✅ Exists |

4 of 5 exist. ROADMAP is the missing one. This validates the ROADMAP draft
as the next deliverable and rejects inventing BRD/TRD as separate docs.

**For eval work:** the "task" layer is where superpowers'
`test-driven-development` + `verification-before-completion` enforce that
each task ships test-first with a verification gate. The eval/telemetry
research (1.95) defines what "verified" means measurably; superpowers
enforces it procedurally.

**Lesson:** enterprise doc chains are for organizations with separated
roles (PM/tech lead/architect/engineer). For a solo OSS tool, one person
fills all roles — the chain collapses. Don't cargo-cult ceremony.

---

## 8. Engineering philosophy synthesized

**Six pillars, all anchored in NORTH_STAR:**

1. **YAGNI + SOLID + KISS** — the constitution. Every artifact obeys these.
2. **Shift-left testing** — TDD first-class, test-first in loopeng and in
   every workspace it produces. Tests are the first artifact, not a phase.
3. **Two-layer QA** — maker/checker split (different models review) +
   verification gates (deterministic: tests, lint, build, SAST). The loop
   engineering verification loop, made explicit.
4. **Small ships, clean commits** — atomic commits, reviewable diffs.
   Anti-bloat.
5. **Security woven in, not bolted on** — SAST in the loop, secrets policy
   in `loopeng check`, security verifier in the gate.
6. **Open-weights primary, frontier as targeted escalation** — cost/quality
   maximized.

**Moat (honest):** for v1, the moat is not code — it's the opinionated
integration + builder credibility. Not the CLI (replicable in a weekend),
not Pi/headroom (dependencies). The actual moat: Pi + OpenRouter + headroom
+ markitdown, configured to enforce YAGNI/SOLID/KISS + TDD + two-layer QA +
security, on macOS, with open-weights-primary model strategy. Nobody has
assembled this exact stack with this exact philosophy. The deeper moat
(v1.x+): the three proof projects + public telemetry + blog-as-demo-channel.
Once published, this is *evidence* competitors can't easily replicate.

Not a defensible long-term moat. OSS devex tools don't have those. The
credibility + audience + patterns are the moat.

---

## 9. Tooling stack (verified)

| Tool | Version | Role | Discipline | Status |
|---|---|---|---|---|
| Pi | 0.80.3 | Agent host | Harness | ✅ Running |
| Headroom | 0.30.0 | Compression + memory | Context | ✅ launchd, healthy |
| markitdown | 0.1.6 | PDF/doc ingestion | Context | ✅ Installed |
| OpenRouter | — | Model routing | — | ✅ 8 models verified live |
| Superpowers | (git main) | Skills layer | Methodology | ✅ Installed, MIT (LICENSE TBC) |
| Codex | 0.142.5 | Personal backup (NOT loopeng target) | — | ✅ Fixed |
| beads | — | Task/memory graph | Context | ⏳ Phase A+ (not installed) |
| biome + tsc + node:test | — | Lint/typecheck/test | Engineering | ⏳ Pending |

**This is the complete stack for v0.x.** Nothing else needed to start.
Adding anything now violates YAGNI.

---

## 10. Open threads for Phase 1.95 research

1. **Evals + telemetry** — what to gather, how (OpenRouter API + custom),
   phased (iii): usage telemetry first (v0.x), outcome/eval telemetry once
   workflows stabilize (v1.x). Opt-in design, privacy.
2. **License** — MIT vs Apache 2.0 vs AGPL+trademark. Dependency
   compatibility (Pi, headroom, markitdown, superpowers licenses). Tolaria
   reference = AGPL.
3. **Doc indexing** — flat-files + AGENTS.md (YAGNI floor) vs beads graph
   vs headroom memory vs MCP doc server. Pi's native context discovery
   capabilities (contextFiles, -nc flag — not fully mapped).
4. **TDD with AI agents** — design patterns for test-first + small-ships +
   clean-commits when agents produce large diffs. Not a toggle; a design
   problem.
5. **Two-layer QA mechanism** — which models for maker/checker, which
   gates, how security verifier composes (dedicated agent vs SAST-in-gate
   vs both, phased).
6. **Security scope mechanisms** — which SAST (CodeQL / Semgrep), how
   `loopeng check` enforces (dependency vuln scan, secret detection,
   AGENTS.md policy), security agent vs gate.
7. **Superpowers license + dependency check** — confirm MIT, confirm no
   commercial-use restrictions that conflict with loopeng OSS stance.

---

## Indexing mechanism (for this lab notebook, as it grows)

**Current (YAGNI floor):** flat markdown + TOC + headers + `grep`/`rg`.
This handles ~100 files trivially. Tolaria works this way with 10,000 notes.

**When it breaks (evidence-driven upgrade):**
- Agent can't find a doc by reading AGENTS.md → add beads `bd remember` for
  the doc, or a `docs/INDEX.md` with one-line summaries.
- Cross-doc semantic search needed → headroom `memory_search` over indexed
  docs (already in stack).
- Doc graph (supersedes, relates-to) needed → beads (Phase A+, already
  planned).

**Never:** build a custom TypeScript doc-graph indexer speculatively.
Violates YAGNI + KISS + "minimal required tooling."

---

## How this feeds the blog

This file is the **lab notebook** — raw, dated, evidence-cited. Blog posts
are written *from* it, not by publishing it directly. Likely blog posts
from this session's material:

- "How I fixed codex-through-headroom without brute force" (§1)
- "The headroom bug I chased and shouldn't have" (§2)
- "Why my Pi setup was never broken" (§3)
- "What Tolaria taught me about OSS credibility" (§4)
- "Three proof projects: how I'll demonstrate loopeng works" (§5)
- "I almost rebuilt superpowers. Then I read it." (§6)
- "Why I collapsed BRD/PRD/TRD into NORTH_STAR/ROADMAP/ADR" (§7)
- "The honest moat of a solo OSS devex tool" (§8)

Each post cites this file as source. Telemetry (once built) appends data to
each post: tokens saved, time saved, commits shipped, defects caught.
