# 2026-07-22 — Osmani firsthand alignment amendment (two-model judgment)

**Amends:** `docs/archive/learnings/2026-07-22-addy-osmani-loop-engineering-alignment.md`
(the subagent-extraction synthesis) and the claims it propagated into
RESEARCH.md Source 1 and PROGRESS.md.

**Method:** After the author challenged the secondhand synthesis, all 8
posts (Jun 7 – Jul 20, 2026) were read FIRSTHAND by the conductor (Kimi K3)
from full local text, then independently read by GLM-5.2 with no access to
the prior claims. This doc records the judgment only; source docs were not
edited in this exercise.

## Correction 1 — the philosophy has a center; the extraction flattened it

The subagent synthesis produced a 12-item principle menu. Firsthand reading
shows one central claim with everything else as downstream machinery:

> Generation is solved and cheap; verification — and the human judgment
> that owns it — is the durable bottleneck. "Writing got cheap,
> understanding didn't."

Downstream of that single asymmetry: maker/checker, back pressure, lit/dark
factories, outer loop, evals, agent contracts, reviewer heterogeneity. Any
adoption list that treats these as peers of the core claim misrepresents
the philosophy.

## Correction 2 — "lit factory" is a category error for weavelog

Osmani's factory is specifically many loops fed by a queue, drained through
one review gate, at scale (his autonomy Level 5). weavelog v1 composes the
harness for ONE human-gated loop with a manual `/run` trigger.

- Wrong (even after the first correction pass): "lit-factory harness
  composer at autonomy Level 2."
- Accurate: **a harness composer for lit loops at autonomy Level 2**
  (scoped task delegation: bounded steps, defined done, human gates
  between steps).
- GLM-5.2 argued Level 1–2; conductor rules Level 2. Level 1 is
  per-action approvals; weavelog delegates bounded steps with a defined
  "done," which is his Level 2 rung.

## Correction 3 — the deepest alignment was unclaimed: judgment upstream

Osmani's lit-factory move is not "human reviews the diff." It is "review
the DECISION before it is built — a 200-line plan instead of 2,000 lines of
generated code." weavelog's human gate on the SPEC step is exactly this.
It is the strongest embodiment of his philosophy in the design and was
named in no prior doc.

## Correction 4 — the workflow JSON is his "graph" (missed by all experts)

software-factories argues agent freedom should be "constrained to the
inside of a node" of a predefined graph — "mostly deterministic code with
LLM steps sprinkled in," "back pressure drawn as a diagram." weavelog's
workflow configs (deterministic steps, `verify` commands, `gate` edges,
rollback nodes) ARE that graph. Strong alignment; unclaimed.

## Gaps both reads converged on (candidate adoptions, pending approval)

1. **Intent capture / decision log.** His concrete fix for review cost:
   the agent states what it was trying to do AND what it ruled out,
   captured as a decision log attached to the change. weavelog's handoff
   format carries payload but no ruled-out reasoning. More load-bearing
   than the accountability contract (earlier ranked #1): it is the
   mechanism that makes any verdict answerable.
2. **The five oracle criteria.** "What earns a loop the dark": the check
   must be cheap, high-frequency, ungameable, immediate, and non-drifting.
   Plus the step heuristic: agents hold up 3–10 steps, drift past 20.
   Spec §7.4 has the principle, not the criteria. Belongs in gate config.
3. **His autonomy metrics (ao4).** Review time per accepted change, defect
   escape rate, token cost per accepted change, mean time between
   interventions — richer than weavelog's planned telemetry; feeds the
   credibility model directly.
4. **Evolution-risk rule.** His "autonomy as status" anti-pattern
   generalizes: philosophical proximity treated as proof of capability.
   The corrected rule for "weavelog evolves with the series": adopt
   mechanisms ONLY when they have an operational home (a gate, a template,
   a metric), never as framing alone. The "strong external validation"
   sentence failed exactly this rule.

## GLM-5.2 independent catches (conductor accepts both)

- **Configuration-failure seam.** "Most agent failures are configuration
  failures" (ao3). weavelog deliberately does not own the runtime, so it
  cannot own the failure class Osmani calls dominant. The 90% harness is
  split between Pi (runtime) and weavelog (setup). TBD entry, not redesign.
- **Blast-radius mismatch.** Solo, no users, docs-only repo running
  enterprise-grade process is "overhead until people show up" in his
  framing. Defense: weavelog's process IS the product surface; the
  discipline is the demo. A chosen trade, not a free one.

## Model-exercise verdict

Firsthand read (Kimi K3) and independent read (GLM-5.2) converged on the
center of the philosophy, the unsoundness of the original claim, and the
factory overreach; diverged only on Level 1–2 vs 2 (conductor holds 2).
Meta-lesson: subagent extraction gave fluency without hierarchy; firsthand
reading was required for judgment. This is Osmani's comprehension-debt
thesis operating on the conductor itself, and it validates the human gate
that caught it.

## Proposed doc edits (NOT applied — awaiting author approval)

1. Alignment log + RESEARCH.md: replace "lit-factory harness composer" with
   "harness composer for lit loops at Level 2."
2. Spec: add judgment-upstream (spec gate = reviewing the decision before
   it is built) and workflow-as-graph as named alignments.
3. Spec or handoff format: add intent-capture decision log (what was
   tried, what was ruled out).
4. Spec §7.4: add the five oracle criteria + 3–10 step heuristic.
5. Telemetry plan: adopt his autonomy metrics.
6. docs/tbd/: configuration-failure seam (Pi runtime vs weavelog setup).
