---
date: 2026-08-25
topic: Headroom GitHub bug-report pre-flight — duplicate-issue check, contribution guidelines, CoC for OpenAI include_usage injection bug
status: verified-live
sources:
  - "https://github.com/headroomlabs-ai/headroom/issues?q=is%3Aissue+include_usage (fetched 2026-08-25)"
  - "https://github.com/headroomlabs-ai/headroom/issues?q=is%3Aissue+stream_options (fetched 2026-08-25)"
  - "https://github.com/headroomlabs-ai/headroom/issues?q=is%3Aissue+usage+chunk+OR+usage+frame+OR+zero+tokens (fetched 2026-08-25)"
  - "https://github.com/headroomlabs-ai/headroom/issues?q=is%3Aissue+stream_openai_message (fetched 2026-08-25)"
  - "https://github.com/headroomlabs-ai/headroom/issues?q=is%3Aissue+OpenAI+backend+usage+injection (fetched 2026-08-25)"
  - "https://github.com/headroomlabs-ai/headroom/issues/2957 (fetched 2026-08-25)"
  - "https://github.com/headroomlabs-ai/headroom?tab=contributing-ov-file (fetched 2026-08-25)"
  - "https://github.com/headroomlabs-ai/headroom?tab=coc-ov-file (fetched 2026-08-25)"
models_used_for_research: [z-ai/glm-5.2]
supersedes: none
---

# Headroom GitHub bug-report pre-flight

Pre-flight checks before filing a bug for: **OpenAI-compatible backend path missing `include_usage` injection in `stream_openai_message`** — the proxy never injects `stream_options: { include_usage: true }` into the upstream streaming request, so the usage chunk/frame is never emitted, and the dashboard shows zero tokens.

## 1. Duplicate-issue check

Searched GitHub issues (open AND closed) across five query variants: `include_usage`, `stream_options`, `usage chunk OR usage frame OR zero tokens`, `stream_openai_message`, `OpenAI backend usage injection`.

### Closest match — NOT a duplicate

**[#2957](https://github.com/headroomlabs-ai/headroom/issues/2957)** — "[BUG] OpenAI Responses WebSocket fallback does not propagate provider input token usage" — Closed (completed), linked to [PR #2988](https://github.com/headroomlabs-ai/headroom/pull/2988).

**Why it is related but distinct from our bug:**

| Dimension | #2957 | Our bug |
|---|---|---|
| Endpoint | `/v1/responses` (Responses API) | `/v1/chat/completions` (Chat Completions) |
| Transport | WebSocket to HTTP/SSE fallback | Standard HTTP SSE streaming |
| Root cause | Usage from SSE `response.completed` event not propagated into WS session totals | `stream_openai_message` never injects `stream_options.include_usage: true`, so upstream never sends a usage chunk at all |
| Fix location | `_ws_http_fallback()` in `headroom/proxy/handlers/openai.py` | `stream_openai_message` (different function, same file or adjacent) |
| Symptom overlap | Dashboard shows `INPUT: 0`, `SAVINGS: 33233%` | Dashboard shows zero tokens — same symptom, different cause |

The reporter's local patch in #2957 forced `HEADROOM_OPENAI_RESPONSES_UPSTREAM_TRANSPORT=http` and extracted usage from `response.completed`. Our bug is upstream: the usage frame is never requested in the first place because `include_usage` is not injected into the request body.

### Other usage-related issues — all distinct

| Issue | Title | Status | Why distinct |
|---|---|---|---|
| [#1132](https://github.com/headroomlabs-ai/headroom/issues/1132) | Bedrock streaming: message_start emits input_tokens=0 | Closed | Bedrock backend, not OpenAI; different transport (AWS event stream) |
| [#1285](https://github.com/headroomlabs-ai/headroom/issues/1285) | ainvoke() fails with AttributeError: AsyncStream | Closed | LangChain integration crash, not usage accounting |
| [#2392](https://github.com/headroomlabs-ai/headroom/issues/2392) | OpenAI-format + litellm-vertex fails on max_tokens | Closed | Request validation error (extra_body), not usage |
| [#1264](https://github.com/headroomlabs-ai/headroom/issues/1264) | Anthropic-compatible third-party upstream support | Open | Feature request for non-OpenAI backends |
| [#3032](https://github.com/headroomlabs-ai/headroom/issues/3032) | _get_cache_prices bills cache reads at full uncached rate | Open | Pricing logic, not usage propagation |
| [#3019](https://github.com/headroomlabs-ai/headroom/issues/3019) | Empty HTTP 200 after CCR buffered-stream conversion | Closed | Empty response body, not usage |
| [#3040](https://github.com/headroomlabs-ai/headroom/issues/3040) | Proxy returns HTTP 200 with empty/malformed body | Not planned | Empty body, not usage |

**Verdict: No existing open or closed issue covers the specific bug (Chat Completions `stream_openai_message` missing `include_usage` injection).** The bug is safe to file.

### What was NOT checked

- PR list was not searched separately (only issues). A merged PR could have already fixed this in `main` without a corresponding issue. Recommend a `git log` / PR search for `include_usage` or `stream_options` in the repo before filing.
- The actual source code of `stream_openai_message` was not fetched from GitHub — this research relied on issue text only. The function name and file path come from the task description, not verified against the repo.

## 2. Contribution guidelines summary

Source: [CONTRIBUTING.md](https://github.com/headroomlabs-ai/headroom/blob/main/CONTRIBUTING.md) (fetched 2026-08-25)

### Contribution routing (critical)

| Type | What to do |
|---|---|
| Bug or small fix | **Open a PR** (with repro + test) — NOT an issue first |
| New feature / architectural change | Open an issue or ask in Discord first |
| Refactor-only | Don't (unless a maintainer asked) |
| Test/CI-only chasing a known `main` failure | Don't (they're tracking it) |
| New dep or version bump | PR with written justification |
| Question | Discord `#help` |

**Issue creation is restricted** in this repository (confirmed on the issues page: "New issue — Issue creation is restricted in this repository"). Non-collaborators likely cannot open issues. This aligns with the bug-fix policy: bugs go straight to PR.

### Bug-fix PR requirements (mandatory)

1. **Reproduction** — minimal code, failing test, or steps.
2. **A test that fails before your fix and passes after** (unit, integration, or e2e). If you genuinely can't write a test, say so explicitly and explain how you verified.
3. **"Real behavior proof" section** in the PR body — required on every external PR. Must include:
   - Setup tested on (OS, Python, config, provider/model)
   - Exact command or steps run after the patch
   - After-fix evidence + observed result
   - What you did NOT test
   - Acceptable: screenshots, recordings, terminal output, copied live output, linked artifacts, redacted runtime logs
   - NOT acceptable alone: unit tests, mocks, snapshots, lint, typechecks, green CI (have them too, but they prove the test passes, not that the feature works)
   - **PRs missing this may be autoclosed.**

### PR workflow

1. Fork, branch from `main`.
2. Install Node 18+ and run `uv sync --extra dev` then `make install-git-hooks` — installs pre-commit checks, commitlint, and ci-precheck.
3. One logical change per PR.
4. Add tests.
5. Run: `uv run pytest` / `uv run ruff check .` / `uv run ruff format .`
6. Do NOT edit `CHANGELOG.md` — release-please generates it from the Conventional Commit PR title. A CI guard rejects manual edits.
7. Open the PR with clear description + Real behavior proof + any spec/justification. Keep PR in draft until `Review Readiness` boxes are complete.

### Formatting rules

- Title: Conventional Commits — `fix:`, `feat:`, `docs:`, `test:`, `refactor:`
- Commit message: enforced by local `commit-msg` hook AND CI
- Lint/format: Ruff, line length 100, PEP 8
- Type hints on public functions; Google-style docstrings
- Python 3.10+
- More than 80% coverage on new code

### Other constraints

- **No CLA** — Apache-2.0 license, no contributor license agreement mentioned.
- **No issue templates** — issue creation is restricted; no `.github/ISSUE_TEMPLATE/` content was visible.
- **Open PR cap: 10 per author** — get existing ones merged before opening more.
- **Review gate:** CI green + one maintainer review + coverage held/improved.
- **Architecture principles:** Safety first (never drop content, never break tool call/response pairing, malformed passes through, prefer false negatives). Performance: transforms less than 50ms at P99.

## 3. Code of conduct

Source: [CODE_OF_CONDUCT.md](https://github.com/headroomlabs-ai/headroom/blob/main/CODE_OF_CONDUCT.md) (fetched 2026-08-25)

Standard **Contributor Covenant v2.1**. Nothing project-specific or unusual.

- Pledge: harassment-free experience for everyone
- Positive: empathy, respect for differing opinions, constructive feedback, responsibility for mistakes
- Unacceptable: sexualized language, trolling, insults, personal/political attacks, harassment, publishing private info
- Enforcement: 4-step ladder (Correction then Warning then Temporary Ban then Permanent Ban)
- Reports to `[EMAIL]` (redacted in the rendered page; check the raw file for the actual address)
- Scope: all community spaces plus official representation in public

**Framing guidance:** The CoC is standard. No special constraints on how to frame the bug report. Keep it factual, technical, and constructive. Reference #2957 as related work to show due diligence, but clearly distinguish the code path and root cause.

## 4. Recommended report format

### Verdict: PR with fix, NOT an issue

Rationale:
1. CONTRIBUTING.md explicitly routes bug fixes to PRs (not issues).
2. Issue creation is restricted in the repo — non-collaborators likely cannot file issues at all.
3. The PR must include repro + failing test + "Real behavior proof" section or it may be autoclosed.

### Recommended PR structure

**Title:** `fix(proxy): inject stream_options.include_usage in OpenAI Chat Completions streaming path`

**PR body sections:**
1. **Problem** — one paragraph: `stream_openai_message` does not inject `stream_options: { include_usage: true }` into the upstream request body when streaming. The upstream provider never sends a usage chunk, so the dashboard reports zero input/output tokens.
2. **Related work** — link [#2957](https://github.com/headroomlabs-ai/headroom/issues/2957) and explain the distinction (Responses API WS fallback vs. Chat Completions SSE streaming; propagation vs. injection).
3. **Reproduction** — minimal steps: Headroom version, proxy config, provider/model, exact command, observed dashboard output (zero tokens).
4. **Fix** — the code change (inject `stream_options` into the request payload before forwarding).
5. **Test** — failing-before/passing-after test that asserts `stream_options.include_usage` is present in the forwarded request when streaming is enabled.
6. **Real behavior proof** — OS, Python, config, provider/model, exact command run after patch, terminal/dashboard output showing non-zero tokens, what was NOT tested.
7. **Checklist** — CI green, ruff clean, coverage held.

### Before filing — recommended pre-checks

- Search merged PRs for `include_usage` or `stream_options` to confirm the fix is not already on `main`.
- Verify the function name `stream_openai_message` against current `main` source (it may have been renamed).
- Check the latest Headroom version (issues reference v0.34.0/v0.35.0) to confirm the bug is still present.
