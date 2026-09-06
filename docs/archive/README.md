# Archive

These files are **superseded starter research and task briefs** from the
original idea session that preceded `weavelog`. They are preserved here for
provenance — to show why the original approach (SwarmForge + bespoke
`.harness/` structure) was rejected in favor of the Pi-native `weavelog` design.

**These are not active specifications.** Do not implement against them. The
authoritative documents are:

- `docs/NORTH_STAR.md` — what we are building
- `docs/RESEARCH.md` — why we build it this way
- `docs/adr.md` — the active architecture decision record (to be written)
- `docs/specs/` — detailed design specs

## Contents

| File | What it was | Why superseded |
|---|---|---|
| `original-harness-init-task-brief.md` | Instructions to an agent to build `harness-init` as a bash CLI with a `.harness/` structure | The `.harness/` structure was bespoke; replaced by `.agents/` (open standard) + `.pi/agents/` (Pi convention). `harness-init` is now `weavelog init`. |
| `HARNESS-001.md` | Acceptance criteria for the original `harness-init` bash CLI | Describes the rejected `.harness/` layout and a verbatim `swarmforge.conf`. Superseded by the weavelog design spec. |
| `stateless-multi-model-agent-swarm-adr.md` | The original ADR proposing SwarmForge as the orchestration layer | SwarmForge hard-codes its agent allowlist to `{claude, codex, copilot, grok}` and excludes Pi. Replaced by a Pi-native extension. See `docs/RESEARCH.md` § SwarmForge (rejected). |
