---
name: as-prototype
description: Use when a WHAT-loop design question can only be settled by a concrete artifact — "does this logic/state model feel right?" or "what should this look like?" — typically a wayfinder:prototype ticket. Builds throwaway code that answers exactly one question, then captures the verdict. Do NOT use for production work (that's the HOW loop with TDD) or when inspection/conversation settles it cheaper. Terminates when the verdict + question are recorded on the ticket.
license: MIT — ported from mattpocock/skills (© 2026 Matt Pocock), adapted to harness vocabulary 2026-08-16; see LICENSE
metadata:
  author: harness (adapted)
  version: "1.0.0"
---
upstream: prototype @ mattpocock/skills (MIT — © 2026 Matt Pocock), ported 2026-08-16

# Prototype

A prototype is **throwaway code that answers a question**. The question decides the shape. Loaded by the conductor inside the WHAT loop — never the implementer (its constitution inverts the implementer's: no tests, no polish).

## Pick a branch

- **"Does this logic / state model feel right?"** → [LOGIC.md](LOGIC.md). Single shareable HTML file — free-play buttons + tabbed guided walkthroughs — a non-developer can drive.
- **"What should this look like?"** → [UI.md](UI.md). 3–5 structurally different UI variants on one route, switched via `?variant=` + floating bottom bar.

Getting the branch wrong wastes the whole prototype. If genuinely ambiguous and the human isn't reachable, default to whichever matches the surrounding code (backend module → logic; page/component → UI) and state the assumption at the top.

## Rules that apply to both

1. **Throwaway from day one, clearly marked.** Locate near what it prototypes; name it so a casual reader sees it's not production.
2. **Trivial to run.** One command, or a double-clicked HTML file. No thinking required to start it.
3. **No persistence by default.** In-memory state unless persistence IS the question (then a scratch DB/file named "PROTOTYPE — wipe me").
4. **Skip the polish.** No tests, no error handling beyond runnable, no abstractions. Learn fast.
5. **Surface the state.** After every action, render the full relevant state.
6. **Capture it when done.** Fold the validated decision into real code (via the HOW loop, properly, with TDD — never promote prototype code). Record on the backlog ticket via `task-flow note <id> "verdict: <answer> — question settled: <q>; prototype: <branch/path>"`. Commit the prototype to a throwaway branch out of main as primary source. Main keeps only the decision.

## Red flags

- Adding tests or error handling "to be safe" — that's production work, wrong loop
- Wiring to the real database
- "What if we want X later" generalizing
- Promoting prototype code into main — rewrite it properly in the HOW loop
- Building a prototype when a grilling round or a researcher dispatch would settle it cheaper
