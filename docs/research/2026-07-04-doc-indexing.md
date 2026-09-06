# Documentation Indexing

> **Date:** 2026-07-04
> **Status:** Active research. Informs ROADMAP.
> **Cross-ref:** `docs/PROGRESS.md` (watch items: doc indexing),
> `docs/research/2026-07-04-harness-setup-and-pmf-synthesis.md` (tooling stack)

## The question

As docs grow, how do agents and humans find the right doc without context
rot? Does weavelog need a custom indexing system, or do existing tools suffice?

## Pi's native context discovery (evidence from Pi README + docs)

Pi already has a built-in doc discovery mechanism. This is the YAGNI floor:

| Mechanism | What it does | Scope |
|---|---|---|
| `AGENTS.md` / `CLAUDE.md` | Loaded at startup from `~/.pi/agent/AGENTS.md` (global) + parent dirs walking up from cwd + current dir. All concatenated. | Global + project |
| `.pi/SYSTEM.md` / `~/.pi/agent/SYSTEM.md` | Replaces default system prompt | Global + project |
| `APPEND_SYSTEM.md` | Appends to system prompt without replacing | Global + project |
| `--no-context-files` / `-nc` | Disables AGENTS.md/CLAUDE.md discovery | CLI flag |
| Prompt templates | `~/.pi/agent/prompts/`, `.pi/prompts/` | Global + project |
| Skills | `~/.pi/agent/skills/`, `~/.agents/skills/`, `.pi/skills/`, `.agents/skills/` | Global + project |
| `contextFiles` (extension API) | Extensions can inspect loaded context files via `systemPromptOptions.contextFiles` | Programmatic |

**Key finding:** Pi walks parent directories and concatenates all AGENTS.md
files. This IS an indexing mechanism — hierarchical, automatic, standard-based.
The doc-hierarchy table in weavelog's AGENTS.md (already exists) tells the
agent which docs are authoritative. This handles ~100 files trivially.

## The four options

| Option | What | Cost | Phase | YAGNI? |
|---|---|---|---|---|
| **Flat files + AGENTS.md** | docs/ as plain markdown, AGENTS.md doc-hierarchy table | $0 | v0.1 (have) | ✅ floor |
| **beads** | `bd remember` for persistent memory, `bd prime` for context injection, Dolt graph | medium (1 binary dep) | v0.3+ (Phase A+) | ✅ when task loop exists |
| **headroom memory** | `memory_search` over indexed docs, semantic search | low (already in stack) | v1.x+ | ✅ when semantic search needed |
| **MCP doc server** | Model Context Protocol server exposing docs | high (Pi has no native MCP, needs bridge) | v2+ | ❌ deferred |
| **Custom TypeScript doc-graph** | build a new indexing layer | very high | never | ❌ violates YAGNI |

## Recommendation: phased, evidence-driven

### Phase A (v0.1–v0.3): flat files + AGENTS.md — what we have now

Pi's native AGENTS.md discovery is the indexing mechanism. No additional
tooling. The doc-hierarchy table in AGENTS.md (which weavelog already has)
tells agents what to read and in what order of authority.

```
docs/
├── NORTH_STAR.md              ← anchor (what)
├── research/RESEARCH.md                ← provenance (why)
├── adr.md                     ← decisions
├── PROGRESS.md                ← phase tracker
├── NEXT_SESSION.md            ← handoff
├── specs/                     ← design specs
├── research/                  ← research logs (dated)
├── tbd/                       ← open questions
├── archive/                   ← superseded (do not use)
└── superpowers/plans/         ← implementation plans
```

**When this breaks:** agent can't find a doc by reading AGENTS.md, OR doc
count exceeds ~100, OR cross-doc semantic search is needed. None of these
are true now (we have ~26 files).

### Phase A+ (v0.3+): beads for structured task/memory graph

When the task loop exists (v0.3), agents need persistent structured memory
across sessions — which task is done, which is blocked, what was learned.
This is what beads does:

- `bd init` creates/updates AGENTS.md (integrates with the standard)
- `bd remember "insight"` stores persistent project memory
- `bd prime` injects workflow context + memories into the agent
- `bd ready` lists tasks with no open blockers
- Dolt-backed graph with version control, cell-level merge

beads is MIT, macOS-native (brew install), 25k★, agent-native. It composes
with AGENTS.md (the standard) and with Pi (runs `bd` commands via shell).

**Install requires user approval** (AGENTS.md: no package managers without
approval). Flagged for Phase 3.

### Phase B (v1.x+): headroom memory for semantic search

headroom's `--memory --learn` is already enabled in the launchd plist. Its
MCP tools (`memory_save`, `memory_search`) provide semantic search over
extracted facts. When the doc set is large enough that grep isn't enough,
headroom memory indexes the content and agents can `memory_search` for
relevant docs.

This is already in the stack — no new install. Just needs the MCP tools to
be wired into Pi (via the headroom MCP server, already registered in codex
config; Pi integration is Phase 3+).

### Never: custom TypeScript doc-graph or MCP doc server

Both violate YAGNI + KISS + "minimal required tooling." The existing stack
(Pi AGENTS.md + beads + headroom memory) covers the entire design space.
A custom indexer would be building what these tools already do, worse.

## What this resolves

| Question | Answer |
|---|---|
| Do we need a custom doc indexer? | No. Pi AGENTS.md + beads + headroom memory covers it. |
| What's the YAGNI floor? | Flat files + AGENTS.md doc-hierarchy table (have now) |
| When do we add beads? | v0.3+ (when task loop exists and agents need persistent structured memory) |
| When do we add semantic search? | v1.x+ (when doc count exceeds grep's effectiveness) |
| MCP doc server? | Deferred to v2+ (Pi has no native MCP, bridge effort not justified for v1) |

## The "evidence-driven upgrade" rule

Don't upgrade the indexer speculatively. Upgrade only when:
1. An agent demonstrably can't find a doc by reading AGENTS.md, OR
2. Doc count exceeds ~100 (grep becomes noisy), OR
3. Cross-doc semantic search is a real need (not imagined)

When one of these is true, add the *minimal* tool that fixes *that specific*
failure. Log the failure in `docs/PROGRESS.md` watch items before upgrading.
This is the YAGNI discipline applied to indexing.
