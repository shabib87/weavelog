---
date: 2026-09-03
topic: Packaged distribution for the loopeng OSS launch — tiller-ai init mechanics, keel npm+doctor, conductor/AO distribution shapes, v0.1.0 launch checklist
status: verified-live
sources:
  - "https://github.com/hmSchuller/tiller-ai (README + package.json, fetched 2026-09-03)"
  - "https://github.com/keel-harness/keel (README + package.json, fetched 2026-09-03)"
  - "https://github.com/microsoft/conductor (README, fetched 2026-09-03)"
  - "https://github.com/Untrivial-ai/agent-orchestrator (README, fetched 2026-09-03)"
  - "https://github.com/trailofbits/skills (open-sourcing skill, fetched 2026-09-03)"
  - "https://ossalt.com/guides/oss-licensing-guide-mit-apache-agpl-2026"
  - "https://psyll.com/articles/technology/open-source/apache-20-vs-mit-who-rules-open-source-in-2026"
  - "https://safeguard.sh/resources/blog/mit-license-vs-apache-2-0-which-to-pick"
  - "https://doi.org/10.2172/1782513 (LLNL license guidance)"
  - "https://github.com/MohitGoyal09/AgentForge/blob/master/docs/release.md"
  - "https://github.com/thisumitk/release-doctor"
models_used_for_research:
  - openrouter/z-ai/glm-5.3-flash
supersedes: none
---

# Packaging & distribution mechanics for the loopeng OSS launch (2026-09-03)

Method: 4 peer READMEs + 2 package.json files fetched live this dispatch; license and checklist
claims grounded in 2 web searches. Builds on `2026-09-02-oss-agent-harnesses.md` (gap #3 =
"packaged distribution") — this note covers the HOW. Last-verified: 2026-09-03.

## 1. tiller-ai — the `npx init` scaffolder pattern (closest analog for loopeng)
- npm mechanics: `bin: {"tiller-ai": "./dist/index.js"}`, `files: ["dist"]`, tsup; CLI =
  commander, prompts = @clack/prompts; node >=22; MIT; `prepublishOnly` = build+test+check.
- `init` prompts: project name, description, run/verify command, mode (simple/detailed),
  workflow (solo/team), AI tool (claude/copilot/opencode); writes files + initial git commit.
  Non-interactive: `--yes`, `--mode`, `--workflow`.
- Per-tool adapters: Claude Code → `.claude/` (settings.json hooks, agents/, skills/); Copilot
  CLI → `.github/` (skills/, agents/, hooks/hooks.json) + `.vscode/mcp.json` auto-wiring its
  MCP server; OpenCode experimental. Shared `.tiller/` state dir: `tiller.json` manifest
  records version + managedFiles; gitignored `compass.md` + `local.json` = per-dev overrides.
- Hooks: plain shell scripts (secret-scan PreToolUse, post-write formatter, session-resume)
  written into the tool dir + registered in that tool's own hooks config.
- Lifecycle: `upgrade` rewrites ONLY manifest-managed files (survives user edits); `config`
  re-prompts; `dashboard` local web UI; `mcp-server` for Copilot.

## 2. keel — npm ship + `keel doctor` (the preflight pattern)
- Path: `npm i -g keel-harness` or `npx keel-harness <cmd>`; doctor is the 2nd line of the
  quickstart — preflight is product, not a debugging aid. Node 20+; CI matrix 20/22/24.
- Artifact split: repo-root package.json is `private:true` ("keel"); the published npm carrier
  `keel-harness` + self-contained binaries are built separately (`pnpm package` → bun
  packaging/build.ts → build/). Release = npm version + matching GitHub Release.
- `keel doctor` checks: OS sandbox backends (Seatbelt/bubblewrap — "prints one copy-paste fix
  when something is missing"), git credential-helper eligibility, and self-awareness: run from
  a source checkout it reports the "reduced-enforcement layout" (knows when it is testing its
  own tree). State: `KEEL_HOME` → `~/.config/keel`.
- Launch hygiene: PRE-ALPHA/AI-ASSISTED banner, evidence table with per-claim reproduce
  commands, `docs/status.md` ("what is and isn't true today").

## 3. conductor + agent-orchestrator — two other distribution shapes
- conductor (Python, MIT): `curl -sSfL https://aka.ms/conductor/install.sh | sh` — installs uv
  if missing, fetches latest GitHub release with pinned deps, verifies SHA-256; `conductor
  update` re-runs the installer (no in-process self-upgrade); manual uv/pipx/pip; repo doubles
  as a Claude Code plugin marketplace + `gh skill install` (markdown-only, easy trust check).
- agent-orchestrator (desktop, Apache-2.0): GitHub Releases permalinks
  `releases/latest/download/<artifact>` per platform (dmg arm64/x64, exe, AppImage/deb/rpm) +
  in-app auto-update; docs site; CONTRIBUTING.md; in-repo bug-triage SKILL.md; telemetry
  disclosure. No npm/registry step at all.
- Field licenses: tiller MIT, conductor MIT, keel Apache-2.0, AO Apache-2.0.

## 4. License verdict for loopeng: Apache-2.0
Both permissive; the only real difference is Apache-2.0's explicit patent grant + retaliation
clause + NOTICE terms (safeguard.sh; LLNL). 2026 guidance converges: "default to Apache-2.0
for anything touching AI models or agent infrastructure" (psyll, 2026-04); it is Trail of
Bits' stated permissive default and overtook MIT on GitHub ~2020 (LLNL). loopeng = agent
infrastructure next to compression/ML (patent-thicket-adjacent), wants contributors →
Apache-2.0. MIT only if minimal friction is the sole goal. headroom is third-party — verify
its license before shipping configs that reference it.

## 5. v0.1.0 checklist (niche conventions, evidence-backed)
- Secrets audit FIRST (Trail of Bits: if history ever held secrets, recreate the repo fresh —
  history rewrites don't reach forks/caches/CI artifacts; then enable secret scanning, push
  protection, private vulnerability reporting). For loopeng's personal history: make-or-break.
- README conventions across all 4 peers: one-line essence → badges (license/runtime/CI/release)
  → quickstart ≤5 commands (doctor as step 1–2, keel pattern) → "how it works" diagram →
  scaffolded-files/CLI reference or config table → honest status/limitations + evidence table
  with reproduce commands (keel) → requirements (node, git, agent CLIs).
- SECURITY.md is "table stakes for security-adjacent tooling" (Trail of Bits): contact or
  GitHub private vulnerability reporting.
- CI basics: tests on PR across a version matrix; format/lint enforced; pin third-party
  actions to full SHAs; least-privilege `permissions: {}`; zizmor/actionlint; gitleaks in CI;
  releases via `git tag vX.Y.Z` (semver); org-owned npm account + OIDC trusted publishing.
- doctor/self-test (mirrors the task-20 idea): AgentForge runs `doctor` + `--help` in a clean
  env as the publish gate; release-doctor checks publish surface (bin, files, shebangs,
  prepublishOnly). loopeng `doctor` checks: node/bun versions, opencode installed + config
  parses, backlog CLI on PATH + `--json` round-trip, headroom `/health` on :8788 (+ `/stats`
  mode), models.json + OPENROUTER key present (never printed), skills symlinks resolve,
  config-sync idempotent (post-sync diff empty). Each failure → one copy-paste fix (keel).

## 6. v0 / v1 / effort
- v0 (stranger can install and run): fresh public repo + secrets audit [S]; LICENSE + README +
  SECURITY.md [S]; de-personalized tree (parametrized paths, placeholder keys, examples/
  instead of private notes) [M — the real work]; `git clone` + idempotent `install.sh`
  (symlinks) + `loopeng doctor` [M]; CI = gitleaks + shellcheck + doctor [S]. Overall: M.
- v1 (polished): `npx loopeng init` scaffolder (@clack/prompts-style) + per-tool adapters
  (opencode native first, optional claude-code) + managed-files manifest [L]; manifest-driven
  `upgrade` [M]; tag→CI release + npm OIDC trusted publishing [M]; doctor deep checks (proxy
  /stats, model probe, backlog round-trip, config-sync idempotency) [M]; demo GIF [S]. L.

## 7. Build order
1. Secrets audit + fresh repo (irreversible if skipped) → 2. LICENSE/README/SECURITY →
3. De-personalize/parametrize → 4. `loopeng doctor` v0 → 5. install.sh + CI → 6. tag v0.1.0 +
GitHub Release → 7. v1: init scaffolder + upgrade manifest + OIDC publish.

**Highest-leverage item: `loopeng doctor`.** It is simultaneously the stranger's acceptance
test, the CI gate, the driver that forces de-personalization (hardcoded paths can't pass
doctor), and the reusable core of v1's init preflight. Keel made it quickstart step 2 for
exactly this reason. The secrets audit is a precondition, not leverage — it protects, it
doesn't enable.

## Not checked / open
- tiller-ai prompt-flow details inferred from README + package.json deps; did not read dist source.
- keel doctor's full check list read from README prose only; did not run it.
- headroom's license not re-verified; "loopeng" npm/GitHub name collision NOT checked; peer npm download counts not checked.
