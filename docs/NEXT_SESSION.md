# Next Session Handoff

**Last updated:** July 4, 2026 (clean restart in progress on `fresh-main` branch)
**Project:** loopeng
**Working dir:** `~/Projects/loopeng`
**Git:** clean restart — orphan branch `fresh-main`, commits 1–2 done, 3–7 pending

**READ `docs/PROGRESS.md` FIRST.** It is the single source of truth for phase
status and next actions. This file is the narrative handoff; PROGRESS.md is
the tracker. If they conflict, PROGRESS.md wins.

This file captures narrative context so no knowledge is lost between
sessions.

---

## What loopeng is

A minimal, open-source developer-experience setup that turns any project into
a self-contained agentic workspace. A pre-defined agent team runs an
end-to-end loop — spec, implement, verify, document — with the human in the
loop only for verification. Built on Pi + OpenRouter + Headroom.

Authoritative docs: `docs/NORTH_STAR.md` (what), `docs/RESEARCH.md` (why).

## Locked decisions (do not re-litigate)

| Decision | Value |
|---|---|
| Name | `loopeng` (npm + GitHub; scope `@loopeng/*`) |
| License | MIT |
| Implementation language | **TypeScript only** — CLI and extension |
| Target platform | macOS only (v1) |
| CI | Linux only (GitHub Actions `ubuntu-latest`, free tier) |
| Test framework | `node --import tsx --test` (matches pi-diff-review) |
| Linter/formatter | biome |
| Typechecker | `tsc --noEmit` |
| CLI distribution | npm primary (`npx loopeng`), Homebrew secondary (wraps node) |
| Extension distribution | `pi install npm:@loopeng/pi-loopeng` |
| Orchestration | Pi-native extension; SwarmForge rejected (no Pi support) |
| Standards | Agent Skills (agentskills.io), AGENTS.md (agents.md) |
| Models | All 6 OpenRouter IDs verified live: z-ai/glm-5.2, deepseek/deepseek-v4-pro, deepseek/deepseek-v4-flash, mistralai/devstral-2512, qwen/qwen3.6-35b-a3b, nvidia/nemotron-3-super-120b-a12b:free |
| Contributions | Solo-dev for v1; issues welcome, PRs not yet |
| Discipline | TDD + SOLID + unit + integration tests |

## What's done

- Project renamed `harness-kit` → `loopeng`
- `docs/NORTH_STAR.md` — the anchor (approved)
- `docs/RESEARCH.md` — provenance, sources, corrected assumptions
- `docs/archive/` — 4 superseded starter-research files (including the
  original ADR proposing SwarmForge)
- `docs/tbd/` — 6 open-question files (3 resolved: bash-homebrew-tooling,
  ci-cd-strategy, and the bash-vs-TS question; 3 open: settings-isolation,
  rollback-mechanism, cost-ceiling; plus open-blindspots-index)
- Root `LICENSE`, `README.md` (stub), `AGENTS.md` (stub)
- Machine setup verified: Pi 0.80.3, headroom-ai 0.27.0 (pipx; latest is
  0.30.0), markitdown 0.1.6 (pipx), rtk, pi-diff-review, superpowers all
  installed; env vars (`OPENAI_API_BASE`, `HEADROOM_PORT=8788`,
  `HEADROOM_OUTPUT_SHAPER=1`) in `~/.zshrc`
- **Headroom debug session (July 4):** See "Headroom setup" section below.
  Proxy was running but Pi was bypassing it. `pi-extension-headroom` was
  NOT installed (the prior handoff incorrectly claimed it was). User is
  installing it now and reopening shell.

## What's NOT done

- The design spec at `docs/superpowers/specs/2026-06-28-harness-kit-design.md`
  is the **pre-revision** version. It has 20 critical/severe findings from a
  6-pass red-team review (recorded in conversation; see "Spec revision scope"
  below for the full list of must-fixes). It needs to be relocated to
  `docs/specs/2026-06-28-loopeng-design.md` and structurally revised.
- `docs/adr.md` — the authoritative ADR (supersedes the archived one) — not
  written yet.
- Implementation plan — not started (invoke writing-plans skill after spec).
- Any implementation code — none.

---

## Next steps (in order)

### ✅ Step 1 — Revise the spec (one pass) — DONE

Relocated `docs/superpowers/specs/2026-06-28-harness-kit-design.md` →
`docs/specs/2026-06-28-loopeng-design.md`. All 10 must-fixes, 3 structural
changes, 3 new sections, and renames applied. See the file for details.

### ✅ Step 2 — Write `docs/adr.md` — DONE

Written to `docs/adr.md`. Records all 13 architectural decisions with
rationale, rejected alternatives, consequences, and gaps. The revised design
spec (`docs/specs/2026-06-28-loopeng-design.md`) is its detailed appendix.
Resolves blindspot #8 from `tbd/open-blindspots-index.md`.

### ✅ Step 3 — Finalize root `README.md` and `AGENTS.md` — DONE

README.md now has quickstart, doc index, and locked tech stack table.
AGENTS.md now has repo layout, build/test commands, document hierarchy,
MUST NOT rules, and standards.

### Step 4 — Invoke the writing-plans skill (NEXT)

Once the spec and ADR are approved, invoke the writing-plans skill to create
the implementation plan. This is the terminal step of brainstorming.

---

## Open items still in `docs/tbd/` (do not block the spec revision)

These remain open and are tracked for later — they fold into implementation
or separate sessions:

- `settings-isolation.md` — the mechanism is decided in the spec revision;
  the file's research questions guide it
- `rollback-mechanism.md` — same; the spec section decides stash vs branch
- `cost-ceiling.md` — same; the spec section decides default + enforcement
- `ci-cd-strategy.md` — locked except for one open question (macOS-specific
  surface size, resolves during implementation)
- `open-blindspots-index.md` — seven smaller blindspots:
  - Model drift → pre-run validation in `loopeng check` (v1)
  - Non-code workflow verification → per-mode table in spec
  - Loop telemetry → `.workflow/metrics.jsonl` (recommend include in v1)
  - Keyless first-run demo → docs-only for v1
  - Scaffold versioning → `.loopeng-version` file in v1
  - Contributor readiness → CONTRIBUTING.md + CODE_OF_CONDUCT.md when repo
    goes public
  - Missing ADR → resolved by Step 2 above

## Repo structure (still open — separate session)

Whether the TypeScript Pi extension lives in the same repo as the CLI or its
own repo (`loopeng/loopeng` + `loopeng/pi-loopeng`) is **not yet decided**.
User flagged management-headache concerns with two repos. Deferred to a
separate session. Research to do first: read `pi-diff-review/package.json`
and `superpowers/package.json` (reference models), and check whether
`pi install git:` supports subdirectories (load-bearing). The spec's
architecture doesn't change based on repo layout — write the spec assuming
the extension lives somewhere in the project, distribution TBD.

---

## Housekeeping

- **Symlink crutch:** `~/Projects/harness-kit` is a symlink to
  `~/Projects/loopeng`, created because this Pi session's bash tool was
  pinned to the old cwd. To remove it: restart the Pi session from inside
  `~/Projects/loopeng/`, then `rm ~/Projects/harness-kit`.
  Do NOT remove the symlink before restarting — the bash tool will break
  again.
- **Untracked `CLAUDE.md` at root:** appeared during the session (likely
  auto-created). Not part of any commit. Decide in the next session whether
  to keep (as a Claude dispatch stub) or delete.
- **Spec file location:** `docs/superpowers/specs/2026-06-28-harness-kit-design.md`
  is at the brainstorming skill's default path. Step 1 relocates it to
  `docs/specs/`.

## Headroom setup — status and verification (July 4, 2026)

### What was broken

`headroom doctor` confirmed Pi was **bypassing the Headroom proxy entirely**:

```
proxy     │ ✓ pass │ running at http://127.0.0.1:8788 (up 5d 8h, v0.27.0)
shell env │ ⚠ warn │ ANTHROPIC_BASE_URL / OPENAI_BASE_URL unset —
          │        │ this shell bypasses the proxy
savings   │ ⚠ warn │ no tokens saved yet
```

The proxy was running (`headroom proxy --mode token --no-cache --port 8788`)
but the Pi↔Headroom bridge (`@ryan_nookpi/pi-extension-headroom`, v0.1.2)
was **not installed** despite the prior handoff claiming it was. The
`OPENAI_API_BASE` env var points directly to OpenRouter, not through the
proxy.

### What was fixed

User ran: `pi install npm:@ryan_nookpi/pi-extension-headroom`

This extension intercepts Pi's `context` event, sends large `toolResults` to
the local proxy's `/v1/compress` endpoint, and applies compression with
alignment guards. The proxy's upstream config (Anthropic) doesn't matter for
compression — the extension uses the proxy as a side-compressor, not as a
routing proxy.

### What to verify on next launch

After Pi restarts with the extension installed:

1. **Check the extension loaded:** Look for headroom-related messages in
   Pi's startup output, or check that the TUI footer shows compression
   savings (>0%).
2. **Run `headroom doctor`:** Confirm `shell env` now shows ✓ pass instead
   of ⚠ warn. The extension should set the routing env vars for Pi's
   process.
3. **Make a few tool calls then run `headroom perf`:** Should show
   `content_router` transforms with non-zero savings on recent requests.
   If savings still show 0%, the extension may not be intercepting
   correctly.
4. **Check proxy health:** `curl -s http://localhost:8788/health | python3
   -c "import json,sys; d=json.load(sys.stdin); print(d['runtime']['compression_executor'])"`
   — `in_flight_max` should go above 0 after Pi makes tool calls.

### Diagnostic commands (keep for next session)

```bash
headroom doctor          # Routing + health check
headroom perf            # Compression savings report
headroom --version       # Installed version (0.27.0; latest is 0.30.0)
headroom update --check  # Check for newer version without upgrading
curl -s http://localhost:8788/health  # Proxy health (uptime, config, stats)
lsof -i :8788            # Confirm proxy is listening
```

### Headroom docs

- GitHub: https://github.com/chopratejas/headroom (NOT headroom-ai/headroom
  as some old docs reference)
- Docs: https://headroom-docs.vercel.app/docs
- Full docs blob for agents: https://headroom-docs.vercel.app/llms-full.txt
- Pi extension repo:
  https://github.com/Jonghakseo/pi-extension/tree/main/packages/headroom

### Version gap note

Installed headroom is v0.27.0; latest PyPI is v0.30.0. The RESEARCH.md and
spec reference v0.27.0 throughout. Upgrading may change CLI flags or
behavior. Do NOT upgrade without human approval (per AGENTS.md MUST NOT).

## How to start the next session

1. `cd ~/Projects/loopeng` (or keep the symlink for now)
2. Read this file (`docs/NEXT_SESSION.md`)
3. Read `docs/NORTH_STAR.md` and `docs/RESEARCH.md` if you need refresher
4. **FIRST: Verify Headroom is working** — follow the verification steps in
   the "Headroom setup" section above. If it's still not routing, diagnose
   before doing anything else.
5. Begin Step 1: relocate + revise the spec per the scope above
6. Do NOT skip the red-team must-fixes — they're the load-bearing corrections
