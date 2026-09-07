---
date: 2026-08-29
topic: LSP diagnostics vs CLI diagnostics in AI coding agents (opencode) — enable decision
status: decided
sources:
  - "https://opencode.ai/docs/lsp/"
  - "https://github.com/anomalyco/opencode/issues/5259"
  - "https://github.com/anomalyco/opencode/issues/3297"
  - "https://github.com/microsoft/TypeScript/issues/46028"
  - "https://github.com/microsoft/TypeScript/issues/18055"
  - "https://github.com/microsoft/vscode/issues/140090"
  - "https://github.com/typescript-language-server/typescript-language-server/issues/472"
  - "https://github.com/bash-lsp/bash-language-server/issues/736"
  - "https://github.com/redhat-developer/yaml-language-server"
  - "https://arxiv.org/html/2603.05344v1"
  - "https://yage.ai/share/why-coding-agents-still-use-grep-en-20260327.html"
  - "https://github.com/anthropics/claude-code/issues/64239"
  - "https://www.reddit.com/r/ClaudeCode/comments/1ri1hro/"
  - "https://karanbansal.in/blog/claude-code-lsp"
  - "https://dev.to/pachilo/when-read-this-file-means-run-this-code-lsp-configuration-in-opencode"
models_used_for_research: [z-ai/glm-5.2]
supersedes: none
review_rounds: 0
---

# LSP diagnostics vs CLI diagnostics in opencode — enable decision

## Question

Is enabling LSP (Language Server Protocol) diagnostics in opencode net-positive or net-negative
compared to having the agent run CLI diagnostics (lint / typecheck / tests) directly? Cover:
memory/CPU overhead of common LSP servers; LSP-in-agent-loop failure modes (staleness, crashes,
version drift, startup latency, context-cost); counter-evidence where LSP helped; opencode-specific
issues; and a bottom-line recommendation.

## TL;DR (bottom line)

**Net-negative to blanket-enable all built-in LSPs on a general-purpose machine; net-positive to
enable LSP selectively and aggressively bounded only where CLI diagnostics are slow or absent.**
The opencode docs themselves say CLI-first is the better default. tsserver (the TS LSP) is the
heaviest common server (200MB idle, up to 1-3GB on large monorepos) and is largely redundant with a
CLI `tsc --noEmit`/`biome check` for type errors. The real wins from LSP are symbol navigation
(go-to-def, find-references), not diagnostics. If LSP is enabled, copy the OpenDev pattern
(Error-severity only, <=20 diagnostics, debounced, cached, lazy-start, crash-restart). Confidence:
medium-high (strong on opencode + tsserver; weaker on bash-ls/yaml-ls specific RAM).

---

## 1. Memory / CPU overhead of common LSP servers

### typescript-language-server / tsserver (the heavy one)

tsserver is the language server opencode ships for `.ts/.tsx/.js/.jsx/...` and it is by far the
heaviest of the common servers. Verified figures, primary sources:

- ~200MB on an empty file (idle). microsoft/TypeScript#46028: `npm install typescript && touch
  index.ts` then systemd reports `Memory: 188.3M` with no code. Adding one package
  (`@cdktf/provider-aws`) jumps it to 383MB. The reporter notes medium projects (a few hundred
  files, ~15-20 deps) hit ~1GB. node_modules is <150MB on disk but tsserver holds more in heap.
  https://github.com/microsoft/TypeScript/issues/46028
- ~2GB heap, crashes under pressure. microsoft/TypeScript#18055: TSServer gets ~2GB heap from
  VS Code; on large projects it "consistently reaches this limit," spends 90-95% CPU garbage
  collecting, and "eventually crashes" -- worst on rapid file switching / hovering many symbols.
  https://github.com/microsoft/TypeScript/issues/18055
- Default max-old-space-size = 3072MB. microsoft/vscode#140090: `max-old-space-size` defaults to
  3072MB; minimum 128MB is "not enough to start properly." On low-memory hosts "the entire host
  will lock up" when tsserver exceeds available RAM.
  https://github.com/microsoft/vscode/issues/140090
- Neovim users: ~1.2GB per TS server process on large monorepos (~15% of a machine's RAM).
  https://www.reddit.com/r/neovim/comments/1q1uqmx/
- typescript-language-server#472: "1-2 GB, which is too much for comfortable work."
  https://github.com/typescript-language-server/typescript-language-server/issues/472

Order of magnitude for tsserver: ~200MB idle (empty file) -> ~400MB-1GB medium projects -> up to
~2-3GB on large monorepos, per instance. On a general-purpose machine touching several TS
projects, enabling the TS LSP means a >=200MB-resident process per project, scaling to GBs.

### bash-language-server + ShellCheck

- bash-lsp/bash-language-server#736: ShellCheck maxes out CPU/Memory when editing a bash script,
  causing full system lockup -- "all I need to do is install shellcheck and edit a bash file; my
  CPU/Memory max out." ShellCheck is auto-launched by bash-language-server (the user did not invoke
  it). bash-language-server itself is a Node process (typical Node LSP = tens-to-low-hundreds MB);
  the CPU-pegging is the ShellCheck subprocess.
  https://github.com/bash-lsp/bash-language-server/issues/736
- No hard RAM figure found for bash-language-server in my search (stated gap); the failure mode
  documented is CPU saturation, not pure RAM.

### yaml-language-server (Red Hat)

- Node-based LSP. Config exposes `yaml.maxItemsComputed: 5000` as a performance cap on document
  symbols/folding regions. https://github.com/redhat-developer/yaml-language-server
- No specific RAM benchmark found for yaml-language-server (stated gap). As a Node process its
  footprint is expected in the tens-to-low-hundreds MB range, but I did not verify a number.

Memory summary: the only common server with a verified, documented multi-GB footprint is
tsserver. bash-ls and yaml-ls are lighter in RAM but bash-ls has a documented CPU-saturation failure
mode via ShellCheck. The opencode docs phrase it "use significant memory" generically.

---

## 2. LSP-in-agent-loop failure modes (verified)

### 2a. opencode-specific: unbounded output into the agent context (FIXED but real)

opencode issue #5259 "Unbounded LSP output may use entire token quota" (Dec 8 2025, closed via
#5480): a user's language server (Java/Lombok) "asked the language server to fully inspect a repo,
and trigger[ed] tons of errors due to the language server not knowing about a particular plugin or
config." The LSP response was injected unbounded into the agent context. The fix: mirror bash.ts's
output-limiting pattern in write.ts where it processes the LSP response.
https://github.com/anomalyco/opencode/issues/5259

Takeaway: the failure mode (LSP floods context with irrelevant errors from a misconfigured
server) is real and was filed as a bug. It is now bounded, but it shows why the docs warn about
"context cost."

### 2b. opencode-specific: agents don't use LSP even when configured

opencode issue #3297 "How to get the model to use LSP correctly?" (Oct 20 2025): "Agents not using
LSP, in my case in Python (basedpyright)." LSP setup appears fine (`opencode debug lsp diagnostics`
works) but "the models just don't seem to be using it correctly." References #1939 ("tui: ability
to view active lsps (or errors if failed to start)") -- i.e. opencode users hit silent LSP startup
failures that weren't visible in the UI.
https://github.com/anomalyco/opencode/issues/3297

Takeaway: enabling LSP is not a guaranteed benefit -- models may ignore it, and startup failures
can be invisible. The cost (memory + process) can be paid with no upside.

### 2c. Staleness (Claude Code, cross-agent evidence)

anthropics/claude-code#64239 "typescript-lsp pushes stale diagnostics on 2.1.158 -- still pushes
stale diagnostics to the agent; the LSP consumes can lag a source edit; the LSP push is the stale
source." https://github.com/anthropics/claude-code/issues/64239 -- A community "stayfreshlspproxy"
temp-fix exists because "Claude Code needs to wait a little longer before actioning the LSP signals;
stale diagnostics in long-running [sessions] derail" the agent.
https://www.reddit.com/r/ClaudeCode/comments/1ri1hro/

Takeaway: staleness is a latency race -- the LSP's diagnostics lag behind the edit that triggered
them, so the agent may act on stale errors. This is an inherent LSP-in-loop hazard, not an opencode
bug.

### 2d. Startup latency / indexing

yage.ai "Why Coding Agents Still Use grep": LSP requires "a language server process to be configured
and launched for each language, an initialization handshake (`initialize` -> `initialized`), and
project indexing to complete. On large projects, initial indexing can consume significant CPU and
memory, and diagnostics may take tens of seconds to become ready. For an agent loop that needs to
iterate quickly, this startup cost is prohibitive." Cursor, when rg slowed to >15s on large
monorepos, built a local n-gram index -- "not vector search or LSP."
https://yage.ai/share/why-coding-agents-still-use-grep-en-20260327.html

Anthropic's agent design guideline cited there: "Just-in-time context, not pre-inference RAG."

Takeaway: first-turn latency from LSP indexing is tens of seconds on large projects -- directly
slows the agent loop.

---

## 3. Counter-evidence: where LSP materially helped (and the redundancy point)

### 3a. The OpenDev design (arxiv 2603.05344v1) -- bounded LSP that works

"Building AI Coding Agents for the Terminal" describes a real terminal agent (OpenDev) that
integrated LSP with these concrete, bounded design choices after hard experience:

- After each successful edit, calls `lsp.touch_file(filepath)` then waits up to 3 seconds
  (debounced) for diagnostics.
- Only Error-severity diagnostics are included; warnings and hints are suppressed to avoid
  context noise.
- Up to 20 diagnostics are appended to the tool output (hard cap).
- If no LSP server is running for the file type, the check is silently skipped (graceful
  degradation).
- LSP servers are started lazily on first query, reused across requests, with automatic liveness
  checks and transparent restart on crash.
- Two-level MD5-content-hash cache (Level 1 = raw LSP response; Level 2 = processed symbol tree)
  to avoid redundant round-trips; unchanged files return from cache without contacting the server.

https://arxiv.org/html/2603.05344v1 (section 2.4.5, edit handler; section 2.4.5 four-layer LSP
abstraction)

This is the strongest counter-evidence AND the practical guidance: LSP can give same-turn
self-correction (the agent sees "LSP errors detected: line 42: undefined variable 'foo'" and fixes
it in the same turn). But the design that works is aggressively bounded -- Error-only, <=20,
debounced, cached, lazy, crash-restart. Blanket-enable-all is not this design.

### 3b. Redundancy with CLI typecheck (the key point for the diagnostic question)

For TypeScript specifically, tsserver diagnostics and `tsc --noEmit` (or `biome check`) catch the
same cross-file type errors -- tsserver is the TypeScript typechecker. So for diagnostics, the TS
LSP is largely redundant with a CLI typecheck the agent runs via its shell tool. LSP's unique value
is symbol navigation (go-to-def, find-references, rename) -- a different use case than diagnostics.

Practitioner posts corroborate: LSP in Claude Code gives ~900x faster symbol search (50ms vs ~45s
grep) and same-turn error self-correction, but it is disabled by default, requires ENABLE_LSP_TOOL
(undocumented, discovered via GitHub issue), and Claude defaults to grep unless nudged.
https://karanbansal.in/blog/claude-code-lsp

Takeaway for the diagnostic question: if the project has a fast CLI typecheck (`tsc --noEmit`,
`biome check`, `pyright`, `mypy`, `cargo check`), LSP diagnostics add little beyond what the CLI
catches, while costing memory + latency + staleness risk. LSP symbol-nav is a separate, genuinely
additive capability.

---

## 4. opencode-specific findings (consolidated)

- opencode docs (official, last updated Aug 28 2026): LSP is disabled by default. The docs
  explicitly say: "Language servers can get out of sync, use significant memory, vary by version or
  project, and slow down agent workflows. In many projects it is better to have the agent run
  lint, typecheck, or other diagnostic CLI tools directly, so errors are fed back into the agent
  loop without those tradeoffs. Document those commands in instruction files such as `AGENTS.md` or
  skills so the agent knows what to run. Enable LSP when your project benefits from additional
  language-server feedback." 35+ built-in servers; `lsp: true` enables all.
  https://opencode.ai/docs/lsp/
- opencode #5259 (closed): unbounded LSP output -> token quota exhaustion (now bounded).
- opencode #3297 (open-ish): agents don't use LSP even when configured; silent startup failures
  (#1939).
- Security note (dev.to/pachilo, OpenCode 1.1.25): the LSP `command` config field is arbitrary
  command execution (CWE-78) -- a malicious `opencode.json` LSP entry runs code on file access. Not
  the core question, but relevant to "don't blanket-enable from untrusted config."
  https://dev.to/pachilo/when-read-this-file-means-run-this-code-lsp-configuration-in-opencode

---

## 5. Practical guidance: blanket-enable-all vs selective/CLI-first

Blanket-enable all built-in LSPs on a general-purpose machine is a bad default because:

1. tsserver alone is 200MB-3GB per instance; enabling all 35+ means every touched file extension
   spawns a resident server (gopls, rust-analyzer, jdtls, pyright, bash-ls+shellcheck, yaml-ls,
   ...). On a machine touching mixed languages this is GBs of RAM and multiple CPU-saturating
   subprocesses.
2. bash-ls + ShellCheck can peg CPU on a single bash file edit (system lockup, #736).
3. Staleness (claude-code#64239) + startup latency (tens of seconds indexing) + agents ignoring it
   (#3297) mean the cost is paid even when there's no benefit.
4. The opencode docs themselves recommend CLI-first as the default.

Selective / CLI-first is better. Recommended pattern:

1. Document CLI diagnostics in `AGENTS.md` (lint, typecheck, test commands) so the agent runs them
   directly via its shell tool -- the opencode docs' own recommendation. For TS: `tsc --noEmit` or
   `biome check`; for Python: `pyright`/`mypy`; for Rust: `cargo check`; etc.
2. Enable LSP only for languages where CLI diagnostics are slow or absent, and only on projects
   large enough that symbol navigation matters. For TS, keep LSP off for diagnostics (redundant
   with `tsc`) and on only if symbol-nav is wanted.
3. If enabling LSP, bound it like OpenDev: Error-severity only, <=20 diagnostics, debounced,
   cached, lazy-start, crash-restart. (opencode's post-#5259 write.ts already bounds output; the
   Error-only filter is a project-level choice.)
4. Never blanket-enable from untrusted config (LSP `command` = arbitrary exec).

When LSP is net-positive: large polyglot monorepos where the agent does cross-file refactors and
symbol navigation (go-to-def/find-references) saves many grep+read round-trips, AND the project's
CLI typecheck is slow (>tens of seconds), AND the LSP is configured per-project (right server
version, right tsconfig/jsconfig). The win is symbol-nav + same-turn error feedback; the cost is
memory + latency + staleness + config burden.

---

## Confidence and gaps

- High confidence: opencode docs say CLI-first (direct quote); tsserver RAM figures (200MB-3GB,
  multiple primary MS sources); opencode #5259 (unbounded output, fixed) and #3297 (agents ignore
  LSP); staleness is real (claude-code#64239); the OpenDev bounded design is the working pattern.
- Medium confidence: "LSP helps codegen quality" -- the evidence is the OpenDev design + enthusiast
  practitioner posts (snake_dragon, karanbansal, amazingcto). No controlled benchmark comparing
  LSP-on vs LSP-off on a standardized agent task set was found. The 900x speedup is symbol-search
  (50ms vs 45s grep), not a codegen-quality benchmark.
- Gaps (not checked): I did not find a hard RAM figure for bash-language-server or
  yaml-language-server (bash-ls has a documented CPU-saturation issue; yaml-ls is a Node LSP with a
  `maxItemsComputed` perf cap but no measured RAM). I did not run a live opencode LSP benchmark
  myself (read-only research). I did not check every opencode LSP issue beyond #5259, #3297, #1939.
- Last verified: 2026-08-29.

## Unresolved questions

- Does opencode's current write.ts (post-#5480) apply an Error-severity filter, or does it forward
  all severities? (Not verified from docs; would need a source read of `packages/opencode/src/tool/
  write.ts`.)
- Is there a per-project opencode LSP config that disables tsserver diagnostics but keeps symbol
  navigation tools? (The `lsp` config can disable specific servers, but diagnostics-vs-nav granularity
  is not documented at the server level.)
- Hard RAM numbers for bash-ls and yaml-ls under load inside an agent loop.
