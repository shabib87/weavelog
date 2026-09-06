# 2026-07-04 — loopeng Foundation: Harness Fix to Product Strategy

> **Session:** `verify-doc` (Pi, z-ai/glm-5.2 via OpenRouter)
> **Duration:** ~5h 18m (17:55 → 23:13 UTC, then resumed 05:06 → 06:50)
> **Session ID:** `019f2e45-6c3e-793a-a3de-4eb4c1e878d0`
> **Commits:** 33 (clean restart + research + constitution + PRODUCT.md)
> **Cost:** $9.85 (Pi-tracked); $25.57 lifetime OpenRouter spend
> **Type:** Foundational — evolved from harness verification to product strategy

This is the learning log for the session that established loopeng's
foundation. It is raw material for future blog posts. Each section is a
candidate blog post with the data that backs it.

---

## Findings (what was learned, with evidence)

### 1. codex 401 through headroom — the documented no-login fix

**Problem:** `codex exec` returned `401 Unauthorized: No user or org id found
in auth cookie` on `http://[IP_ADDRESS]:8788/v1/responses`. The request
reached OpenRouter's Cloudflare edge (`cf-ray` header), so headroom forwarded
correctly — OpenRouter rejected the auth.

**Root cause (evidence-based, not brute force):** The `headroom` provider
block in `~/.codex/config.toml` had `requires_openai_auth = true` but no
`env_key`. Per `developers.openai.com/codex/auth.md` (verbatim): *"When
`requires_openai_auth = true`, Codex ignores `env_key`."* So codex sent no
valid credential; headroom forwarded it; OpenRouter 401'd.

**Reproduction (3-way isolation):**
| Request | Result |
|---|---|
| `GET /v1/models` (no auth) via headroom | 200 (public listing) |
| `POST /v1/responses` (no auth) via headroom | 401 — identical to codex |
| `POST /v1/responses` with Bearer key | 200, full completion |

**Fix:** custom-provider-with-`env_key` pattern per `config-advanced.md`:
```toml
[model_providers.headroom]
base_url = "http://[IP_ADDRESS]:8788/v1"
env_key = "OPENROUTER_API_KEY"
wire_api = "responses"
supports_websockets = true
# requires_openai_auth removed (defaults false)
```

**Verification:** `codex exec "say hello"` → EXIT=0, no login, no 401.

**Lesson:** `requires_openai_auth` is for OpenAI-proxy scenarios where you
*want* ChatGPT login. For OpenRouter API-key auth, `env_key` (custom
provider) is the documented no-login path. The distinction matters:
`requires_openai_auth = true` silently disables `env_key`.

**Blog candidate:** "How I fixed codex-through-headroom without brute force"

### 2. The headroom bug I chased and shouldn't have

**Problem:** `POST /v1/messages` (Anthropic format) through headroom to
OpenRouter returns 502 with `TypeError: unsupported operand type(s) for +:
'int' and 'NoneType'`.

**Root cause:** OpenRouter's Anthropic-compat `usage` object returns `null`
for fields where real Anthropic returns integers. Headroom's
`anthropic_messages` forwarder does `int + None` while summing usage →
TypeError → 502. Confirmed by isolation: a temp proxy with `--no-optimize
--stateless` (bare forwarding) still 502s. No flag works around it. v0.30.0
is latest.

**Key realization:** this bug only triggers when routing Anthropic-protocol
traffic through headroom to OpenRouter. **Nothing in our stack does this.**
Pi uses its native `openrouter` provider (OpenAI wire); codex uses
`/v1/responses`. I spent effort before realizing Pi never sends
`/v1/messages` through headroom.

**Lesson:** when a bug is found, check whether it's in your actual hot path
before fixing. YAGNI applies to debugging too.

**Blog candidate:** "The headroom bug I chased and shouldn't have"

### 3. Pi was never broken — the side-compressor architecture

**Discovery:** The `@ryan_nookpi/pi-extension-headroom` plugin does NOT route
Pi's LLM traffic through headroom. It's a side-compressor: listens on Pi's
`context` event, sends oversized `toolResult` payloads to headroom's
`/v1/compress` endpoint, applies compressed result with alignment guards.
Pi's LLM calls go direct to OpenRouter via the built-in `openrouter`
provider.

**Evidence:** proxy.log showed 491 `/v1/compress` calls with
`x-headroom-stack: pi-extension`, zero `/v1/messages` from Pi.

**Why Pi doesn't appear on headroom dashboard:** `/stats` `agent_usage`
attributes by LLM-routing client. Codex routes through headroom → attributed
as `codex`. Pi's LLM calls go direct → not attributed. Pi's compression IS
counted in aggregate savings; it's just not labeled "pi."

**Lesson:** "Pi bypasses headroom" was the wrong frame. Pi uses headroom
correctly — as a side-compressor, not a routing proxy. The dashboard gap is
a labeling artifact.

**Blog candidate:** "Why my Pi setup was never broken"

### 4. Pi auto-compaction enables long sessions by design

**Finding:** Pi has auto-compaction (confirmed in `docs/compaction.md`). When
context exceeds `contextWindow - 16384`, Pi summarizes older messages while
preserving the recent 20k tokens. The summary is structured (tracks file
operations). This is a designed feature — long sessions are supported.

**Implication:** older conversation is summarized, not verbatim. Artifacts on
disk (git, docs) are what survive intact. This is why "the agent forgets,
the repo doesn't" matters — and why the session learning log (this file)
exists.

**Blog candidate:** "Running a 5-hour agentic session on Pi: how compaction
keeps it alive"

### 5. Pi session JSONL is the native audit trail

**Discovery:** Every message, tool call, and response is stored as structured
JSONL at `~/.pi/agent/sessions/--<path>--/<timestamp>_<uuid>.jsonl`. This IS
the thread-level audit trail. Export via `/export` (HTML/JSONL) or `/share`
(GitHub gist). Not in git (personal/local) but persists across sessions.

**Use in this session:** I used the session JSONL as the source of truth for
the 10-round audit, extracting all 49 user messages and verifying each topic
was captured in artifacts. Without it, the audit would rely on memory
(unreliable).

**Lesson:** when verifying "is everything captured," use the session JSONL,
not memory.

**Blog candidate:** "Pi's native audit trail: the session JSONL"

### 6. The overclaim pattern

**Self-observation (by the user):** "I overreach/inflate spec." The user
noticed a pattern where scope expands during execution. I (the agent)
exhibited the same pattern multiple times this session:

- Claimed "1.85b done" when it was tactical cleanup, not a rule
- Claimed "planning phase complete" when the constitution didn't exist
- Claimed "security clean" but missed 2 history matches from filter-branch
- Proposed new research docs repeatedly (doc pollution)

**Mitigation:** the `verification-before-completion` superpowers skill exists
for this. The fix is mechanical: run the verification command, read the
output, THEN claim. Not "should be clean" — `grep -c` returns 0.

**Lesson:** overclaiming is the agent equivalent of the user's overreach
pattern. Both violate YAGNI + verification-before-completion. The
superpowers skill is prompt-level enforcement; mechanical gates (hooks,
`loopeng check`) are the robust fix.

**Blog candidate:** "The overclaim pattern: when agents violate their own
principles"

---

## Decisions (what was decided and why)

### Product decisions

| Decision | Why | Where |
|---|---|---|
| loopeng = composer CLI (setup/verify/compose), not a runner | Pi runs the loop; loopeng sets up the workspace. SOLID. | PRODUCT.md |
| Open-weights primary, frontier as targeted escalation | Maximize cost/quality; cross-vendor maker/checker | NORTH_STAR, frontier-model-selection.md |
| 3 proof projects (loopeng, blog, mobile comparison) | Falsifiable PMF evidence; Tolaria model with data | PRODUCT.md, ROADMAP |
| Codex is personal backup, NOT a loopeng target | loopeng v1 = Pi + OpenRouter only | PRODUCT.md |
| Architecture is user-decided, not skill-dictated | Skills teach capability, not arch; user controls | PRODUCT.md, constitution |
| Tolaria = non-competing reference, not a clone | Business use-case analysis reference only | PRODUCT.md |

### Engineering decisions

| Decision | Why | Where |
|---|---|---|
| YAGNI/SOLID/KISS/DRY + TDD + two-layer QA + security as non-negotiables | Core philosophy; real engineering product | NORTH_STAR |
| Conventional commits (feat/fix/chore/docs/etc.) | Trunk-based, small ships, clean history | AGENTS.md |
| Sanitization MUST NOT (no /Users/<name>, use ~) | Public repo hygiene; dogfooded | AGENTS.md |
| Compose superpowers, don't reinvent | DRY; superpowers already enforces TDD/QA/verification | lab notebook §6 |
| Compose headroom + beads for memory, don't build a TS abstraction | YAGNI; headroom does memory, beads does graph | doc-indexing.md |
| Flat markdown + AGENTS.md for doc indexing (YAGNI floor) | Tolaria runs 10k notes this way; upgrade when evidence demands | doc-indexing.md |

### Process decisions

| Decision | Why | Where |
|---|---|---|
| PROGRESS.md = single source of truth for phase status | "Agent forgets, repo doesn't" | PROGRESS.md |
| NEXT_SESSION.md = narrative handoff only | Sharp boundaries; PROGRESS owns status | NEXT_SESSION.md |
| Session learning log at docs/learnings/YYYY-MM-DD-<topic>.md | Every session documented with data backing for blog | AGENTS.md (rule) |
| filter-branch to sanitize history (pre-push) | Personal paths in commit diffs; safe before any remote | git history |

### Deferred decisions (pending user input)

| Decision | Recommendation | Research doc |
|---|---|---|
| License (MIT vs Apache 2.0 vs AGPL-3.0) | Apache 2.0 + trademark | license-selection.md |
| Frontier models (Opus+Fable vs Fable+GPT-5.5) | Fable 5 + GPT-5.5 (cross-vendor) | frontier-model-selection.md |
| Telemetry design | Phased opt-in, local-first | evals-and-telemetry.md |

---

## Corrections (what was wrong and how it was fixed)

### 1. "Pi must route Anthropic traffic through headroom" — WRONG

I initially changed `ANTHROPIC_BASE_URL` to point at headroom, thinking Pi
needed to route through it. This was brute force based on a false premise:
Pi uses the `openrouter` provider, not `ANTHROPIC_BASE_URL`. The edit was
reverted. Pi was never broken — it uses headroom correctly as a
side-compressor.

### 2. "1.85b done" — OVERCLAIM

I claimed the docs organization pass was "done" when it was only tactical
cleanup (heading normalization, NEXT_SESSION strip, AGENTS.md table update).
No documentation rule was created. The user caught this. Corrected: PROGRESS
now notes "tactical cleanup done, rule deferred to 1.85c."

### 3. "Planning phase complete" — OVERCLAIM

I said this when the global Pi constitution (`~/.pi/agent/AGENTS.md`) didn't
exist, DRY wasn't in NORTH_STAR, and codex AGENTS.md wasn't amended. The user
caught it via "did we define the agents.md file on global and project?"
Corrected: constitution created, DRY added, gaps closed.

### 4. "Security clean, 0 matches" — WRONG (twice)

First claim: 0 personal refs. Reality: 2 matches in dangling commits from
`--amend`. Fixed with `git gc --prune=now`.
Second claim: 0 after gc. Reality: 2 matches in diff metadata of two commits
(the line documenting the sanitized home-dir path
removed). Fixed with `git filter-branch` to rewrite the diffs.

**Lesson:** `git log --all -p | grep -c` is the verification command, not
`git log -p | grep -c` (the latter misses dangling refs). And "clean working
tree" ≠ "clean history."

### 5. Docs pollution — REPEATED DRIFT

I proposed creating new research docs (`pi-extensions-skills-and-blog-
synthesis.md`) when the user had explicitly deferred docs-format work to
1.85c. The user caught it: "you are again polluting docs directory."
Corrected: insights captured as PROGRESS watch items, not new docs.

### 6. Tolaria framing — CORRECTED

I initially described Tolaria as a "reference architecture" for loopeng to
learn from. The user corrected: "don't take the codewithshabib agents too
seriously, it was a trial." Then for Tolaria: it's a non-competing reference
for business use-case analysis, NOT a template. PRODUCT.md now states this
explicitly.

### 7. Pi session path exposes username — CORRECTED

Pi encodes the working directory into the session folder name
(`--Users-<username>-Projects-<repo>--`), which leaks the username even when
the path starts with `~/`. I put the full path in NEXT_SESSION.md and the
learning log. The user caught it. Fix: reference sessions by ID
(`pi --session <uuid>`), not by file path. Document the pattern as
`--<encoded-cwd>--`, never the literal encoded path. This is a sanitization
rule addition for `loopeng check`: scan for `--Users-<name>-` patterns.

### 8. ADR not in Nygard format — GAP FOUND

The ADR (`docs/adr/0001-loopeng-architecture-decisions.md`) is a monolithic
file with 13 decisions in one document. Nygard format (the standard) is one
ADR per file, each with Title/Context/Decision/Status/Consequences, numbered
sequentially. The file was moved to `docs/adr/` (correct location) but not
restructured. Tracked as a watch item for a dedicated session.

### 9. Biome was never decided — PROVENANCE GAP

Biome appears in docs/research/RESEARCH.md, ADR, AGENTS.md, README.md, and the
implementation plan as the linter/formatter, but was NEVER explicitly
discussed or decided in this thread. It was inherited from prior-session
work and carried forward without questioning it. The decision trail is
missing. Biome is MIT, 19k★, Rust-based, active — meets the tool bar — but
the decision needs to be made explicitly, not assumed. Tracked as a watch
item for a separate session.

---

## Blog candidates (topics this session's work could become)

| # | Title | Source section | Data backing |
|---|---|---|---|
| 1 | "How I fixed codex-through-headroom without brute force" | Finding 1 | codex docs citation, 3-way isolation table, fix diff |
| 2 | "The headroom bug I chased and shouldn't have" | Finding 2 | proxy.log evidence, isolation test, v0.30.0 confirmation |
| 3 | "Why my Pi setup was never broken" | Finding 3 | 491 /v1/compress calls, dashboard attribution analysis |
| 4 | "Running a 5-hour agentic session on Pi: compaction by design" | Finding 4 | compaction.md citation, session stats (5h18m, $9.85) |
| 5 | "Pi's native audit trail: the session JSONL" | Finding 5 | JSONL path, 512 entries, 2.3MB, /export + /share |
| 6 | "The overclaim pattern: when agents violate their own principles" | Finding 6 | 4 specific overclaims, superpowers skill reference |
| 7 | "What Tolaria taught me about OSS credibility" | Decision (Tolaria) | 18k★, AGPL+trademark, "built from real use" |
| 8 | "Three proof projects: how I'll demonstrate loopeng works" | Decision (PMF) | 3 projects, falsifiability thesis |
| 9 | "I almost rebuilt superpowers. Then I read it." | Decision (compose) | skills inventory, 1:1 mapping table |
| 10 | "Why I collapsed BRD/PRD/TRD into NORTH_STAR/ROADMAP/ADR" | Decision (doc chain) | enterprise vs solo, YAGNI |
| 11 | "The honest moat of a solo OSS devex tool" | PRODUCT.md §Moat | "not code, it's integration + credibility" |
| 12 | "loopeng's constitution: YAGNI/SOLID/KISS/DRY as law" | NORTH_STAR + global AGENTS.md | 3 constitution files, principle-to-skill mapping |
| 13 | "Pi's session folder name leaks your username" | Correction 7 | Pi cwd encoding pattern, sanitization rule addition |
| 14 | "When your ADR isn't really an ADR" | Correction 8 | Nygard format vs monolithic, restructure task |
| 15 | "The linter I never chose" | Correction 9 | Biome provenance gap, inherited assumptions |

Each post cites this learning log + the relevant artifact (research doc,
PRODUCT.md, NORTH_STAR, git history) as source. Telemetry (once built)
appends data to each post: tokens saved, time saved, commits shipped.

---

## Session stats (data backing)

| Metric | Value | Source |
|---|---|---|
| Duration | ~5h 18m (17:55 → 23:13 UTC) + resume (~1h 45m) | Session JSONL timestamps |
| User messages | 49 | Session JSONL |
| Commits produced | 33 | git log |
| Session cost (Pi-tracked) | $9.85 | Session JSONL usage.cost.total |
| Lifetime OpenRouter spend | $25.57 | OpenRouter `/api/v1/key` |
| Input tokens (incl cache) | 44,205,900 | Session JSONL |
| Output tokens | 284,372 | Session JSONL |
| Research docs created | 7 (5 from 1.95 + lab notebook + codex-headroom) | docs/research/ |
| Audit rounds run | 10 (5 + 5) | This session |
| Overclaims caught by user | 4 | Corrections section above |
| Personal refs removed from history | All (filter-branch) | git log --all -p grep |
| Corrections added (path, ADR, biome) | 3 | Corrections 7-9 |

---

## Cross-references

- **Lab notebook (detailed findings):** `docs/research/2026-07-04-harness-setup-and-pmf-synthesis.md`
- **Product strategy:** `docs/PRODUCT.md`
- **Phase tracker:** `docs/PROGRESS.md`
- **Research docs:** `docs/research/2026-07-04-*.md` (7 files)
- **Constitution:** `~/.pi/agent/AGENTS.md`, `~/.codex/AGENTS.md`, `docs/NORTH_STAR.md`
- **Session JSONL (full conversation):** `~/.pi/agent/sessions/--<encoded-cwd>--/<timestamp>_<uuid>.jsonl` (Pi encodes the cwd into the folder name; resume by session ID below, not by path)
- **Resume command:** `pi --session 019f2e45-6c3e-793a-a3de-4eb4c1e878d0`
