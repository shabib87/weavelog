# Configuration-Failure Seam (Pi Runtime vs weavelog Setup)

**Status:** OPEN (2026-07-22)
**Severity:** Medium
**Source:** `docs/research/2026-07-22-osmani-firsthand-alignment-amendment.md`
(GLM-5.2 independent catch, conductor-accepted)

## Question

Osmani: "most agent failures are configuration failures" (the new SDLC
post). weavelog deliberately does NOT own the runtime — Pi runs the loop,
weavelog composes the setup. If the dominant failure class lives in
configuration, and configuration is split between Pi's runtime behavior
(session, extensions, tool wiring) and weavelog's scaffolded files
(agents, skills, workflows, settings), who owns diagnosing and fixing
agent failures in a weavelog workspace?

## Why it matters

- The moat claim is "we productize the 90% harness." If half the harness
  is Pi's runtime, weavelog's support story ends at the scaffold boundary.
- A user hitting an agent failure will not know (or care) whether the
  cause is weavelog-composed config or Pi runtime behavior.

## Options

1. **`weavelog check` diagnoses the seam** — extend check beyond presence
   verification into config lint: validate scaffolded files against Pi's
   discovered state (agents found, tools registered, model IDs live on
   OpenRouter). Failure report names the layer (weavelog vs Pi vs user).
2. **Document the boundary only** — a troubleshooting doc mapping symptom
   → owning layer. Cheapest; no code.
3. **Accept the seam** — weavelog is a scaffolder; runtime failures are
   Pi's domain. Honest but weakens the harness-ownership story.

## Trigger to resolve

Before Phase 4 (`weavelog check` implementation) finalizes the check
command's scope.
