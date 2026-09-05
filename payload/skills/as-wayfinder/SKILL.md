---
name: as-wayfinder
description: Use when a loose idea is too big for one agent session and the way to the destination isn't visible yet — triggers on "this is huge", multi-session efforts, foggy migrations/specs, "where do we even start". Charts the way as a shared map of decision tickets in backlog.md, then resolves them one at a time. Do NOT use for work that fits one session (run the named flow) or for execution itself (that's the HOW loop). Terminates when no open tickets remain and the way is clear.
license: MIT — ported from mattpocock/skills (© 2026 Matt Pocock), adapted to backlog.md + harness vocabulary 2026-08-16; see LICENSE
metadata:
  author: harness (adapted)
  version: "1.0.0"
---
upstream: wayfinder @ mattpocock/skills (MIT — © 2026 Matt Pocock), ported 2026-08-16

# Wayfinder

## Overview

Wayfinding is for the WHAT loop when the effort is bigger than one session: chart the way to a **destination** as a **map** of **decision tickets** in backlog.md, then work them one at a time until the route is clear. **Plan, don't do** — each ticket resolves a *decision*, not a slice of build. The pull to just-do-the-work is the signal you've reached the edge of the map: hand off to the named flow (spec → plan → HOW loop).

## Primitives (backlog.md mapping)

| Wayfinder concept | backlog.md primitive |
|---|---|
| Map | parent task, label `wayfinder:map` — the canonical artifact |
| Ticket | child task (`backlog task create "..." -p <map-id>`), label `wayfinder:<type>` |
| Blocking | native dependencies (`--dep`) — renders the frontier visually |
| Claim | assignee via `task-flow claim <id> --assignee @<session>` — an open unassigned ticket is unclaimed |
| Frontier | open + unblocked + unclaimed children (query `backlog task list --plain`) |
| Resolution | `task-flow close <id> --note "<answer>" --status Done` + one-line gist appended to the map's Decisions-so-far |

**Refer by name**: in everything the human reads, use ticket titles, never bare IDs.

## The map body (index, not store)

```markdown
## Destination
<what reaching the end looks like — the spec, decision, or change. 1-2 lines.>

## Notes
<domain; skills sessions should consult; standing preferences>

## Decisions so far
- [<closed ticket title>] — <one-line gist of the answer>

## Not yet specified
<fog: suspected questions you can't yet phrase sharply — graduates as the frontier advances>

## Out of scope
<work ruled beyond the destination; never graduates>
```

A decision lives in exactly one place — its ticket. The map gists and links, never restates.

## Ticket types

- **research** (AFK): outside knowledge a decision waits on → dispatch the **researcher agent**. Resolve in parallel with other tickets.
- **prototype** (HITL): cheap rough artifact to react to → conductor loads the **as-prototype skill** (never the implementer — inverted constitutions). Verdict recorded on the ticket; artifact on a throwaway branch.
- **grilling** (HITL): conversation with the human — the default case. Conductor runs it under the one-question-at-a-time protocol; the agent never answers for the human.
- **task** (HITL or AFK): manual work blocking a *decision* (provision access, move data). Earns its place by unblocking a decision, never by delivering the destination.

## Fog of war

The map is deliberately incomplete. The test: **can you state the question precisely now?** Yes → ticket (even if blocked). No → **Not yet specified**. Resolving a ticket clears fog ahead of it; graduate newly-sharp patches into fresh tickets (create-then-wire deps in a second pass — IDs before references). Out-of-scope work never graduates; close mis-scoped tickets and log one line in Out of scope.

## Invocation

**Chart the map** (human brings a loose idea):
1. Name the destination first (grilling dialogue) — it fixes the scope.
2. Map the frontier breadth-first. If no fog surfaces — the journey fits one session — stop; no map needed.
3. Create the map task (label `wayfinder:map`) with Destination + Notes, fog in Not yet specified.
4. Create the specifiable tickets as child tasks, then wire `--dep` edges in a second pass.
5. Fire researcher agents for research tickets in parallel. Charting is one session's work; it hand-resolves nothing.

**Work through the map** (human names a map, optionally a ticket):
1. Load the map (low-res), not every ticket body.
2. Pick the named ticket or the first frontier ticket; **claim it before any work** (`task-flow claim`).
3. Resolve it — zoom into related/closed tickets on demand.
4. Record: close with the answer in notes, gist into the map's Decisions-so-far, graduate fog, wire new tickets.
5. **Never resolve more than one ticket per session** (research tickets excepted).

## Red flags

- Executing build work inside the map (that's the HOW loop — hand off)
- Answering a grilling ticket on the human's behalf
- Restating decision detail in the map body (index, not store)
- Pre-slicing fog into fake tickets
- Bare-ID narration (`#42, #43`) — names, always
