# HARNESS-001: Implement harness-init

> **Archived.** This was the acceptance-criteria task spec for the original
> `harness-init` bash CLI. It is superseded by the `loopeng` design.
> Preserved for provenance only — do not implement against this. See
> `docs/archive/README.md` and `docs/NORTH_STAR.md`.

## Goal

Create `./harness-init` — a bash executable that initializes any target
directory as a self-contained agentic workspace matching the directory
structure in ADR Section 5.

## Interface

```bash
./harness-init <path> [--mode <mode>] [--mode <mode>]
```

- `<path>` — target directory (created if it does not exist)
- `--mode` — one of: `software`, `mobile`, `writing`, `research`
- Multiple `--mode` flags are additive (union of skill sets)
- `--mode software` is the default if no mode is specified
- Exits `0` on success
- Exits `1` with a descriptive message to stderr on any error

## Acceptance Criteria

All of the following must be true after a successful run.

### Workspace structure

- [ ] `.harness/guard.sh` exists and contains a bash function that
      resolves the target path and rejects any access outside
      `$HARNESS_ROOT`, exiting non-zero with a descriptive error
- [ ] `.harness/roles/` contains one file per role: `research`,
      `coding`, `writing`, `qa`, `router` — each file contains the
      model ID and temperature from ADR Section 6, nothing else
- [ ] `.harness/skills/` contains the stub files for the selected
      mode(s) per ADR Section 5 — each file has the correct name
      and a single `# TODO` body
- [ ] `.harness/constitution/` directory exists (empty in v1)
- [ ] `.env.harness` is created with the exact keys from the
      `## .env.harness Keys` section of this file, added to `.gitignore`
- [ ] `AGENTS.md` is created containing the MUST NOT isolation rules
      from ADR Section 5 verbatim
- [ ] `CLAUDE.md` is created as a two-line dispatch stub:
      line 1 — project name, line 2 — `See AGENTS.md for rules.`
- [ ] `swarmforge.conf` is created using the exact template from the
      `## swarmforge.conf Format` section of this file
- [ ] `docs/tasks/.gitkeep` is created

### Git

- [ ] If no git repo exists in `<path>`, `git init` is run
- [ ] If a repo already exists, it is left untouched
- [ ] `.gitignore` includes `.env.harness` and `.harness/guard.sh`

### Idempotency

- [ ] Running `harness-init` twice on the same path exits `0` and
      does not overwrite existing files (skip, do not clobber)

### Smoke test

Run this after implementation:

```bash
./harness-init ./smoke-test --mode mobile
```

Then verify:

```bash
test -f ./smoke-test/.harness/guard.sh
test -f ./smoke-test/AGENTS.md
test -f ./smoke-test/.env.harness
grep -q "HARNESS_ROOT" ./smoke-test/.harness/guard.sh
git -C ./smoke-test status
```

All five commands must exit `0`.

## .env.harness Keys

Write this file verbatim. Values are empty placeholders — the user fills them in.

```bash
OPENAI_API_KEY=
OPENAI_API_BASE=https://openrouter.ai/api/v1
HEADROOM_OUTPUT_SHAPER=1
HEADROOM_PORT=8788
HARNESS_ROOT=
HARNESS_MODE=
```

## swarmforge.conf Format

Bash-sourceable key=value. No spaces around `=`. No quotes unless the value
contains spaces. Write this template verbatim — values are empty for the user
to fill in post-init.

```bash
SWARMFORGE_SESSION_NAME=harness
SWARMFORGE_LAYOUT=tiled
SWARMFORGE_CONTEXT_LOG=.harness/session/context.log
SWARMFORGE_ROLES=research,coding,writing,qa,router,utility
SWARMFORGE_RESEARCH_MODEL=z-ai/glm-5.2
SWARMFORGE_CODING_MODEL=deepseek/deepseek-v4-pro
SWARMFORGE_WRITING_MODEL=mistralai/devstral-2512
SWARMFORGE_QA_MODEL=deepseek/deepseek-v4-flash
SWARMFORGE_ROUTER_MODEL=qwen/qwen3.6-35b-a3b
SWARMFORGE_UTILITY_MODEL=nvidia/nemotron-3-super-120b-a12b:free
```

## Scope-Out

MUST NOT fetch remote content (skills are stubs, not real content)
MUST NOT modify or create `~/.pi/agent/models.json`
MUST NOT generate Xcode project files, Gradle config, or package manifests
MUST NOT install any dependency
MUST NOT write anything outside `<path>`

## Definition of Done

Smoke test passes. Full diff presented for human review. No uncommitted
changes remain in `./` (this workspace root).
