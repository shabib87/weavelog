# 2026-07-22 — pi-web-access install decision

## Context

The session needed web search and content extraction for the loopeng repo
(tooling-doc recon: reading GitHub repos, npm package metadata, Pi docs). No
web-search tool was available in the harness. Assessed three existing Pi
packages rather than building a fourth.

## Findings

Evaluated against the author's default model (`moonshotai/kimi-k3` via
OpenRouter), star count, commit cadence, dependencies, and feature fit:

| Package | Author | Stars | Weekly DL | Fit for default model |
|---|---|---|---|---|
| `pi-web-access` | nicobailon | 862 | 28,993 | Yes (Exa MCP is model-agnostic) |
| `pi-websearch` | code-yeongyu | 6 | not cleanly published | Yes (native z-ai routing + DDG fallback) |
| `pi-web-search` | ttttmr | 14 | 1,375 | No (native Gemini/OpenAI/Anthropic only; errors on glm-5.2) |

`pi-web-access` chosen: only option with search + fetch_content (page
extraction, GitHub clone, YouTube transcripts), most mature, zero-config via
Exa MCP, sensible deps (`@mozilla/readability`, `turndown`, `unpdf`,
`p-limit`, `linkedom`).

## Source review (security)

Reviewed source before install (cloned to `/tmp`). Key points:

- **Zero-config Exa path sends search queries to `https://mcp.exa.ai/mcp`**
  (Exa's hosted MCP server, no API key). Query text leaves the machine over
  HTTPS. No code, files, session data, or API keys are sent. Adding an
  `exaApiKey` to `~/.pi/web-search.json` switches traffic to `api.exa.ai` with
  your key instead.
- **SSRF protection solid.** `ssrf-protection.ts` blocks private/loopback/
  link-local/reserved ranges for IPv4 and IPv6, re-validates every redirect
  hop. Applied to all `fetch_content` URLs. `allowRanges` escape hatch is
  off by default.
- **Browser cookies OFF by default.** Requires `allowBrowserCookies: true` in
  config or `PI_ALLOW_BROWSER_COOKIES=1` env. Reads Chrome/Arc/Helium Google
  cookies (decrypts via macOS keychain) only when explicitly enabled.
- **Shell execution is bounded.** GitHub URLs: `gh repo clone` or
  `git clone --depth 1` into `/tmp/pi-github-repos` (size cap, timeout).
  `ffmpeg`/`ffprobe`/`yt-dlp` only for video frame extraction, only if
  installed. No `exec(string)` shell parsing; all child processes use
  `execFile` with arg arrays.

## Decisions

- **Install `pi-web-access` as-is, zero-config Exa.** Low-sensitivity public-doc
  searches for solo-dev loopeng work. Acceptable query egress.
- **Do NOT add a provider key now (YAGNI).** "Maybe client work" is imagined
  future. If a real client engagement later creates a real data-handling
  requirement, add one Brave/Tavily key to `~/.pi/web-search.json` that day.
  Two minutes then, not before.

## Egress scope (for future reference)

- Zero-config: queries → `mcp.exa.ai` (Exa hosted, no key, no auth).
- With `exaApiKey`: queries → `api.exa.ai` (authenticated, under Exa API terms).
- With `provider` override (brave/tavily/etc.): queries → that provider's API.
- `fetch_content`: page fetches → the target URL's origin directly (SSRF-guarded).

## Verification evidence

- `pi install npm:pi-web-access` succeeded, 0 vulnerabilities.
- Registered in `~/.pi/agent/settings.json` `packages[]` and
  `~/.pi/agent/npm/package.json` dependencies (`pi-web-access@^0.13.0`).
- Live `web_search({ query: "pi-web-access npm package..." })` returned
  synthesized answer with 5 sourced citations; weekly-downloads figure
  (28.5K) matched independent measurement (28,993). Zero-config Exa path
  confirmed working.
- `fetch_content` available (GitHub clone, YouTube, PDF, page markdown).

## Residual risks

- Exa's hosted MCP data handling is uncontrolled (no DPA, opaque retention).
  Acceptable for public-doc solo-dev work; not acceptable for client work
  without a provider key under reviewed terms.
- Exa MCP endpoint availability depends on Exa; no fallback if it is down and
  no provider key is configured.

## Blog candidates

- "Build vs. buy for agent tools: when three mature packages beat a from-scratch
  plugin" (DRY vs. YAGNI tension, evidence-based selection).
- "Zero-config is not magic: tracing where your agent's web queries actually go."
