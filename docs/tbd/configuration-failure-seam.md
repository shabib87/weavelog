# Configuration-Failure Seam (Pi Runtime vs loopeng Setup)

**Status:** OPEN (2026-07-22)
**Severity:** Medium
**Source:** `docs/research/2026-07-22-osmani-firsthand-alignment-amendment.md`
(GLM-5.2 independent catch, conductor-accepted)

## Question

Osmani: "most agent failures are configuration failures" (the new SDLC
post). loopeng deliberately does NOT own the runtime — Pi runs the loop,
loopeng composes the setup. If the dominant failure class lives in
configuration, and configuration is split between Pi's runtime behavior
(session, extensions, tool wiring) and loopeng's scaffolded files
(agents, skills, workflows, settings), who owns diagnosing and fixing
agent failures in a loopeng workspace?

## Why it matters

- The moat claim is "we productize the 90% harness." If half the harness
  is Pi's runtime, loopeng's support story ends at the scaffold boundary.
- A user hitting an agent failure will not know (or care) whether the
  cause is loopeng-composed config or Pi runtime behavior.

## Options

1. **`loopeng check` diagnoses the seam** — extend check beyond presence
   verification into config lint: validate scaffolded files against Pi's
   discovered state (agents found, tools registered, model IDs live on
   OpenRouter). Failure report names the layer (loopeng vs Pi vs user).
2. **Document the boundary only** — a troubleshooting doc mapping symptom
   → owning layer. Cheapest; no code.
3. **Accept the seam** — loopeng is a scaffolder; runtime failures are
   Pi's domain. Honest but weakens the harness-ownership story.

## Trigger to resolve

Before Phase 4 (`loopeng check` implementation) finalizes the check
command's scope.
