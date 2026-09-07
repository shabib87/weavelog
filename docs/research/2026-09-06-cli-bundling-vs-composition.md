---
date: 2026-09-06
topic: CLI bundling vs compose-by-reference — headroom #2677 case study, optional-tool tier model, supply-chain risk evaluation (deferred)
status: adopted
sources:
  - "headroomlabs-ai/headroom PR #2677 (fetched 2026-09-06) — 'remove rtk and lean-ctx CLI context tools', merged 2026-07-31"
  - "headroomlabs-ai/headroom PR #2026 (fetched 2026-09-06) — proxy-handler include_usage fix; backend path explicitly untouched"
  - "local probe: headroom-ai 0.36.5 pipx venv — tools.json (no rtk), context_tool_cleanup.py docstring, cli/wrap.py retired-flag gate"
  - "local probe: rtk 0.38.0 via Homebrew (formula shows 0.48.0 stable); rtk gain warn 'No hook installed'"
  - "rtk-ai/rtk releases (fetched 2026-09-06) — 0.47.0 grep flag-semantics changes (-l/-m/-t pass through natively)"
  - "pypi.org/project/headroom-ai 0.6.x page — 'Bundles the RTK binary' attribution (pre-removal era)"
  - "gglucass/headroom-desktop README — rtk as opt-in pinned add-on (the surviving bundle pattern)"
models_used_for_research: ["z-ai/glm-5.3-flash (conductor session synthesis)", "deepseek-v4-pro (plan-gate review of §6-§7 framing)"]
supersedes: none
---

# CLI Bundling vs Compose-by-Reference

## 1. Question

For weavelog workspaces: should external CLIs (rtk, semgrep, tldraw) be **bundled** (downloaded,
vendored, managed by weavelog), **recommended** (declared, checked, wired — but installed by the
user via their package manager), or **required**? Trigger: an `rtk gain` audit showed 84 greps
saving only 21.6% (no hook installed — all rtk use was manual), which surfaced the question of
whether headroom bundles rtk (it no longer does) and what weavelog should do instead.

## 2. Headroom case study — why they dropped the bundle

Headroom-ai shipped rtk (and lean-ctx) from the 0.6.x era ("Bundles the RTK binary for
shell-output rewriting") through ~0.35, then removed the entire integration in PR #2677
(merged 2026-07-31). Their stated failure modes:

| Failure mode | Evidence |
|---|---|
| **Unverified binary supply chain** | rtk download had no SHA/signature check — only `rtk --version` as smoke test |
| **Durable-state orphans** | hooks, `~/.local/bin` symlinks, vendored binaries, marker-fenced hint blocks outlived the code; nothing cleaned them up (#1669, #1955) → a 400-line `context_tool_cleanup.py` purge module now ships just to undo old installs |
| **Integration rot** | opt-in pass (#2344) left holes: `install.sh` still ran `rtk init --global --auto-patch` bypassing the Python gate; `wrap openhands` broken by default; e2e masked it by exporting `HEADROOM_RTK=1` |
| **Platform multiplier** | wrong-arch rtk binary shipped in Docker arm64 image (#2700) — every bundled binary multiplies build/verify surfaces |

Removal posture worth copying: retired flags/env (`--context-tool`, `HEADROOM_CONTEXT_TOOL`)
**fail loudly** rather than silently no-op — "accepting them as a no-op would read as Headroom
having quietly stopped working." The wrapper-peel list *keeps* `rtk` beside `sudo`/`env` so
self-installed rtk still classifies correctly downstream — compose-by-reference users were
deliberately left working.

## 3. Live state of the local stack (2026-09-06)

- headroom-ai 0.36.5: `tools.json` covers only `ast-grep`, `codebase-memory-mcp`, `difft`, `scc`
  — **no rtk**. `HEADROOM_CONTEXT_TOOL` is retired (hard error). Wrap has no rtk wiring.
- rtk 0.38.0 (brew) is a user-owned install; latest 0.48.0. 0.38→0.48 changed grep flag
  semantics (`-l`/`-m`/`-t` now pass through natively) — version drift changes agent behavior
  silently, which is the strongest argument for version-expectation checks.
- The local include_usage patch (see `plans/2026-08-25-headroom-include-usage-patch.md`) is
  intact (litellm.py:1546, anyllm.py:652); upstream `main` still has the pre-patch backend code
  (live-fetched 2026-09-06). PR #2026 fixed only the proxy-handler path.

## 4. The rule: compose by reference, never by ownership

- **Check** — `weavelog check` verifies presence, version against expectations
  (`stack-versions.json`), and wiring health; missing/stale tool ⇒ loud warn + install hint,
  never a silent skip.
- **Pin** — record expected behavior surface per tool version (e.g. rtk grep flag semantics)
  so drift is detectable, not tribal. **(Plan-gate amendment 2026-09-06):** pinning must cover
  *semantic* compatibility, not just version strings — presence/version/wiring checks cannot
  catch a flag-semantics change that silently alters behavior (the exact rtk 0.38→0.48 grep
  case). Semantic-compat detection is where zero silent failure actually lives.
- **Wire** — only with provenance-marked, idempotent, reversible blocks (the fenced
  `<!-- ... START/END -->` pattern `weavelog sync` already uses; same discipline as headroom's
  `<!-- headroom:rtk-instructions -->` fence).
- **Never fetch/vendor/manage** — no downloads, no vendored binaries, no uninstall jurisdiction
  over tools weavelog didn't install. Supply chain stays with brew/pip/npm.

This preserves the North Star: composition over invention, minimal required tooling, optional
tools stay optional, zero silent failure, arm64-macOS-only collapses the platform multiplier
that bit headroom.

## 5. Tier model + first catalog entries

| Tier | Meaning | Entries |
|---|---|---|
| Required | weavelog cannot run without it | Node/TS toolchain (only) |
| Recommended+checked | amplifier; checked, wired-if-present, loud degradation | **semgrep CLI** (security verification; absent ⇒ scan gate fails loudly, never silently skips), **rtk** (token compression; absent ⇒ fatter context, functional workspaces) |
| Personal satellites | workspace-adjacent, documented, never auto-wired | **tldraw** (diagramming for docs; desktop canvas — loosest fit, same catalog mechanics) |

Degradation is the contract: every tier-2 tool absent ⇒ `weavelog check` warns with an install
hint and the workspace remains fully functional.

## 6. What compose-by-reference does NOT protect (the open risk)

Wiring is trust escalation. A recommended tool wired into an agent workspace executes in *every*
session (hooks, MCP entries, PATH). Weavelog stops owning the **install** channel but still owns
part of the **execution** surface:

- **Per-tool update channels**: rtk via Homebrew (formula-audited, bottled), semgrep via
  pip/PyPI, headroom via pipx/PyPI, tldraw desktop — each a distinct compromise surface with
  different audit strength.
- **Weavelog's own npm distribution** is the same class of exposure headroom cited: transitive
  dependency vulnerabilities, typosquatting/dependency-confusion, install scripts, maintainer
  account compromise (event-stream/xz-style), CI/CD poisoning. A compromised *composed tool* or
  a compromised *weavelog dependency* both reach agent-session execution.
- **Post-install drift/substitution**: `weavelog check` currently (conceptually) checks
  presence/version; hash-level drift detection (recorded expectation vs installed binary) is the
  open design question — detection, not vendored-checksum enforcement.

## 7. Deferred work (NOT yet filed as a task)

Backlog task (to be created later, per plan-gate review): **evaluate the supply-chain risk
surface of tooling composition** — CLI bundles vs wiring, npm dependency vulnerabilities and
attack classes against weavelog's distribution, per-tool trust channels, and what `weavelog
check` should verify (version, wiring health, and whether hash-expectation drift detection is
worth building). Sequencing: depends on the packaged-distribution decisions (TASK-34/28/29/30
lineage — how weavelog itself ships determines the surface being attacked), so it sits behind
those in the DAG. Evaluation-first deliverable (risk model + verdict), not implementation.

## 8. Rejected precedent (for now)

Headroom Desktop (gglucass/headroom-desktop) still bundles rtk as an **opt-in** add-on with
pinned wheels + per-platform checksums inside Headroom-managed storage — the surviving bundle
pattern done responsibly. Rejected for weavelog v1: it reinstates exactly the ownership burden
(vendoring, pinning, arch builds, purge hygiene) the rule in §4 avoids. Revisit trigger: if
weavelog distribution ever needs a turnkey installer where the user cannot be asked to run a
package manager.

## 9. Verification

- PR #2677 body, commits, linked issues fetched 2026-09-06 (full text reviewed).
- Local pipx venv inspected directly (tools.json keys listed; cleanup docstring quoted; wrap.py
  retired-flag gate read).
- Upstream `backends/anyllm.py` @ main live-fetched: `stream_openai_message` still lacks the
  include_usage injection (bug unfixed on the patched path).
- `rtk --version` → 0.38.0; `brew info rtk` → 0.48.0 stable; `headroom update --check` →
  0.36.5 → 0.37.0 available.

## Plan-gate review (plan-gate-deepseek, 2026-09-06)

**Verdict: ADJUST.** Reviewer grounded its findings in the actual repo: `package.json` (single
runtime dep `yaml`, `files` allowlist, no `packageManager` field), `.github/workflows/ci.yml`
(tag-pinned mutable actions `@v4`/`@v5`, unpinned `pipx install semgrep`, no
`persist-credentials: false`, default `GITHUB_TOKEN`), `SECURITY.md:31-32` (composed tools
declared out of scope), and the TASK-34/28/29/54 publish lineage. Conductor re-verified all
file claims against the repo before recording them here.

**1. Split the proposed task into two** (they conflate two risk surfaces):

- **A — Composed-tool trust model** (rtk/semgrep/headroom/tldraw channels, blast radius,
  hash-drift question): pure research, correctly deferred — but depends_on **TASK-45** (the
  manifest seed pins the *actual* tool roster/versions; modeling trust channels against a
  hypothetical roster is wasted evidence).
- **B — weavelog's own npm + CI supply-chain posture**: **live today**, must run BEFORE
  publish, not behind distribution tasks. Place after **TASK-28** (the `files` allowlist
  defines the tarball attack surface), before/parallel to **TASK-54**, with a blocking edge
  B → publish gate.

**2. Missing scope to add:** MCP servers (highest blast radius — arbitrary code with tool
access every session; backlog-MCP "CLI-only" rejection is prior evidence, trust model for the
rest is unstated); opencode plugin/extension trust (npm packages loaded into the host; the
pi-extension-headroom deprecate/un-deprecate history is the local case study); brew **formula
vs cask** (rtk = communal homebrew/core formula, bottles carry no per-release signature;
tldraw = signed/notarized cask but Sparkle auto-update feed is a second supply chain);
integrity tooling (`npm audit` advisory-DB-only vs `osv-scanner` lockfile-native vs
socket.dev-class typosquat/install-script detection; real exposure is devDeps + CI, since
runtime surface is one dep); provenance/attestation (`npm publish --provenance` SLSA L3,
`packageManager` corepack pin, `npm ci --ignore-scripts`, SHA-pinned actions,
`persist-credentials: false`).

**3. Sharpest catch — semantic drift is the un-named gap.** rtk's grep flag-semantics change
is not a presence/version/wiring problem; §4's checks would NOT catch it, violating zero
silent failure. Amend the rule now (see §4 amendment). Also: reconcile with SECURITY.md's
scope line — "weavelog's wiring/config of a tool is at fault" is in scope, tool-internal
vulns stay out of scope; blast-radius analysis must not reopen that boundary (cross-ref
`docs/tbd/configuration-failure-seam.md` and `docs/tbd/settings-isolation.md` instead of
reopening). And "later, based on DAG" has no forcing function — attach a trigger (first
observed silent drift, or m-5 OSS release).

**4. Draft EARS criteria** (B): audit dispositions per finding (`npm audit --omit=dev` +
`npm audit`); `osv-scanner` lockfile scan mapped to OSV/GHSA ids with dispositions; publish
workflow provenance verified before first public publish; CI audit — every third-party action
commit-SHA pinned + `persist-credentials: false`. (A): verdict table per tool (channel, audit
strength, cadence, compromise history, blast radius: per-command / reads-secrets /
network-egress); explicit build/no-build decision on hash-expectation drift detection
(detection-only) with threat-modeled rationale.

**Adopted into this note:** §4 amended with semantic-compat expectation. Task filing (A and
B) deferred until the human approves specs — per HITL gate, not created in this session.

## Filing outcome (rounds 2-3, 2026-09-06 — conductor + plan-gate deepseek/qwen/kimi)

**Round 2 (independent validation, deepseek + qwen):** confirmed the A/B split survives the
layered model; machine cleanup is genuinely repo work — pipx is compiled into src/
(channel union `src/weavelog-manifest.ts:11`, install prereqs `src/agents-install.ts:323`,
venv path `src/sync-model-pricing.ts:64`, venv guards `src/hooks/enforce.ts:236-249`) and the
shipped weavelog.json declares `channel: "pipx"`. Verified live defects: tag-pinned mutable
GH Actions, unpinned `pipx install semgrep` in CI, no `persist-credentials`, no
`packageManager`; `chrome-devtools-mcp@latest` floating in payload opencode config; biome RED
on main (TASK-59) blocks every new ticket's DoD.

**Round 3 (Kimi tie-break on nvm): verdict MIGRATE, 3/3 reviewers unanimous.** Decisive
live-verified fact both earlier reviewers missed: the com.weavelog.check LaunchAgent's `pi`
binary uses an `#!/usr/bin/env node` shebang, so env-node resolves via the plist PATH to
**floating brew node v25.8.1** — the "pinned nvm v22" delivers one pinned argv, not one
runtime; non-interactive shells also resolve brew-first. The machine already runs a silent
three-runtime split (zero-silent-failure violation today). Corrections adopted: verify
`node@22 --version` (stale-alias trap: /opt/homebrew/opt/node@22 symlinks to Cellar 25.8.1
until installed); brew floating node STAYS (cspell depends on it — `brew uninstall node`
would break it); TASK-45 AC#8 zshrc-sha256 baseline needs human-approved amendment for the
nvm-block removal; shipped `payload/config/opencode.jsonc:88-90` leaks an absolute nvm npx
path to OSS users (latent, enabled:false) — fixed by the nvm ticket.

**Filed (one-time human-authorized exception to create on main, executed via ticket-branch
worktree + metadata merge; auto_commit:false, contents pre-approved in thread):**

| ID | Ticket | Milestone | Deps | Label |
|---|---|---|---|---|
| TASK-62 | pipx→uv migration + repo channel vocabulary | m-7 | TASK-59 | harness |
| TASK-63 | npm+CI supply-chain hardening (uv-pinned semgrep, SHA pins, audit gate, packageManager, provenance ADR) | m-7 | TASK-59 | harness |
| TASK-64 | nvm→brew node@22 runtime migration + launchd repin + shipped-config fix | m-7 | TASK-59 | harness |
| TASK-65 | Composed-surface trust model L0-L4 ADR (deferred; revive trigger in description) | none at creation | TASK-45, 62, 64 | deferred |

Publish-gate closure set: {TASK-53, 54, 56, 62, 63, 64}. Claim order: TASK-59 (biome red
blocks all DoDs) → {62 ∥ 63 ∥ 64} → 65 sleeps. Each requires HITL spec-approval
(`spec-approved` label) before claim per TASK-51.
