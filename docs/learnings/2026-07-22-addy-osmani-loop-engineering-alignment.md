# 2026-07-22 — Addy Osmani loop engineering vs loopeng (MoE research fanout)

Raw session material. Companion to 2026-07-22-moe-orchestration-audit.md.

**Method note (amended):** the cluster table above describes the SECONDHAND
extraction. It is superseded as analysis by the firsthand two-model
amendment: `docs/research/2026-07-22-osmani-firsthand-alignment-amendment.md`.
Key corrections from the amendment: the philosophy has one center
(verification bottleneck), "lit factory" was a category error (loopeng is a
harness composer for lit loops, not a factory), and judgment-upstream plus
workflow-as-graph are the deepest unclaimed alignments.

Second MoE fanout, all open-weight, fresh context, read-only. Source set:
all 8 addyosmani.com loop-engineering posts since 2026-06-07 (dates verified
via RSS feed):

| Cluster | Posts | Expert model | Result |
|---|---|---|---|
| Loop core | loop-engineering (06-07), new-sdlc-vibe-coding (06-16), own-the-outer-loop (07-15) | GLM-5.2 | clean first pass |
| Quality/judgment | agentic-code-review (06-15), earning-judgment (07-14), career-advice-age-of-agents (07-06) | Kimi K2.7-Code | FAILED once (ENOENT '/1' on self-chosen fetch path), clean on retry with explicit fetch commands |
| Autonomy/org | agentic-autonomy-levels (07-02), software-factories (07-20) | DeepSeek v4 Pro | clean first pass |

Roster data point: K2.7-Code needs explicit, spelled-out tool commands;
GLM-5.2 and DeepSeek v4 Pro handled a fetch hint with latitude.

## Osmani principle synthesis (his terms, across 8 posts)

1. Loop design over prompting: design the system that prompts, not the
   prompts. Five primitives: automations, worktrees, skills, plugins,
   sub-agents, plus state on disk ("the agent forgets, the repo doesn't").
2. Agent = model + harness; "10% model, 90% harness"; most agent failures
   are configuration failures.
3. Spec is the bottleneck; verification moves to the middle. Implementation
   is cheap; requirements, architecture, verification stay slow.
4. Inner loop (agent: investigate, implement, verify, repeat) vs outer loop
   (human: constraints, sampling, audit, ownership). "Engineers own the
   outer loop."
5. Back pressure: "only as much autonomy as you can cheaply and reliably
   verify." Autonomy is a per-task switch, not a rank.
6. Two-axis autonomy taxonomy (Agency x Orchestration), Levels 0-5; Level 2
   scoped delegation is the current center of gravity. Verification drives
   the level, not the task name.
7. Loop → harness → factory. Dark factory (no human reads the code) vs lit
   factory (human judgment at the gate AND moved upstream to design).
   "Short loops earn darkness; long loops demand light."
8. Deterministic gates are "the wall that does not move"; AI review is a
   sensor, not a verdict; a human owns the merge.
9. Named debts: intent debt, comprehension debt, cognitive debt/surrender,
   orchestration tax. "Writing got cheap, understanding didn't."
10. Accountability: verdict triad (Quality / Verdict / Answerability),
    accountability contract (checklist understood, evidence, who was
    accountable, system status after), agent contract per run (goal, scope,
    non-goals, tools, stopping condition, evidence, escalation, budget).
11. Evals over demos: output + trajectory evaluation; "set the bar at the
    eval, not the demo."
12. Review craft: tier by blast radius (not by author), heterogeneous
    reviewers ("heterogeneity is the whole point"), evidence-required
    intake bar, human-on-the-loop sampling.

## Alignment verdict

loopeng's **documented design** maps, in Osmani's framing, to a harness
composer for lit loops at autonomy Level 2 (scoped delegation, human-gated,
manually triggered) with a human-owned outer loop. Three caveats keep this
honest: (1) the mapping is SELF-ASSESSED — AI agents applied his taxonomy
to our docs, so this is framework fidelity (loopeng was designed from his
essay), not external validation; (2) it describes the design, not a running
system — the CLI is a stub as of this date; (3) real validation requires
operational telemetry from proof projects or independent review. The
NORTH_STAR shape (spec→implement→verify→document, maker/checker,
deterministic gates, human-gated verification, state on disk) is consistent
with his published principles, but consistency is not evidence.

Strong matches: maker/checker (his sub-agent checker on stop condition),
state-on-disk (his exact phrase mirrors the constitution), deterministic
gates, human owns the merge, model routing tiers (his "financial lever" =
loopeng roster pattern), skills with progressive disclosure.

Conflicts/tensions:
- Osmani's loop primitives (automations, worktrees, scheduling) belong to Pi
  per loopeng's "does NOT run the loop" boundary. loopeng composes, Pi runs.
  No change needed, but the boundary should cite this framing.
- "All-lit is a bottleneck" warning: human-gated-everything risks review
  fatigue at volume. loopeng's small-ships discipline mitigates; untested
  at real throughput.
- loopeng does not name intent debt / comprehension debt as risks. Both
  apply directly (agent fills intent holes with confident guesses; generated
  code outpaces human understanding).

## Candidate adoptions (deduped across experts, ranked)

1. **Accountability contract artifact** — persist the verdict: checklist
   satisfied, evidence, who approved, system status post-change. Extends the
   existing human gate; low scope creep. (GLM cluster)
2. **Evals as first-class verification layer** — output + trajectory rubrics
   alongside deterministic tests. Two clusters converged on this
   independently ("set the bar at the eval, not the demo" + "build an
   eval"). (GLM + K2.7 convergence = strongest signal)
3. **Back pressure as named design constraint + per-task autonomy switch** —
   every delegation carries a verification budget and evidence requirements.
   (DeepSeek + K2.7 convergence)
4. **Agent contract template** — goal/scope/non-goals/tools/stop
   condition/evidence/escalation/budget per run. Maps 1:1 to pi-subagents
   compact-contract prompting; could ship as a loopeng template. (DeepSeek)
5. **Tier review by blast radius + heterogeneous review at high-blast-radius
   gates** — two differently-built reviewers where it matters. (K2.7)
6. **Name the debts** — add intent debt and comprehension debt to NORTH_STAR
   watch items / PRODUCT risk framing; consider reviewed-vs-generated ratio
   as a workspace health signal. (all clusters)
7. **Static/dynamic context boundary as a reviewed decision** — AGENTS.md
   (static) vs skills (dynamic) framed as versioned, PR-reviewed
   architecture. Mostly framing, low effort. (GLM)

None of these violate YAGNI if adopted as templates/framing first
(Layer 2 defaults), with enforcement deferred to when the CLI exists.

## Plugin vetting results (maintenance gate, data from npm + GitHub API)

| Package | Stars | Contributors | Commits (60d) | Releases | Last push | License | Verdict |
|---|---|---|---|---|---|---|---|
| pi-web-search (ttttmr) | 14 | 2 | 19 | none (tags only) | 2026-07-09 | NONE | usable but license-less; flag |
| @heyhuynhgiabuu/pi-search | 13 | 3 | 54 | v0.2.6→v0.3.0 regular | 2026-07-17 | present | healthiest; recommended |
| pi-fetch (rjshrjndrn) | repo 404 | — | — | — | — | — | fails gate; drop |
| pi-fetch (kotarac, unscoped) | ? | ? | npm last publish 2026-04-12 | v2.0.0 | stale 3mo+ | ? | borderline; only if needed |

Recommendation: install @heyhuynhgiabuu/pi-search (fixes broken builtin
researcher; needs Exa/Firecrawl keys). pi-web-search as alternative if
provider-native search preferred (Gemini/OpenAI/Anthropic keys), but no
license is a real flag for a project whose own license philosophy is
careful. pi-fetch dropped; curl+textutil covers fetch needs for now (YAGNI).

## Author direction (2026-07-22 session, later)

1. loopeng is based on Osman's loop-engineering philosophy (project started
   alongside his first post, 2026-06-07) and EVOLVES with it. His blog is a
   provenance source, not just a reference. Proposed: cite him in
   research/RESEARCH.md (needs author approval, MUST NOT list) and treat new
   Osmani posts as recurring alignment inputs.
2. Loop primitives (automations, worktrees, skills, plugins, sub-agents,
   state) map to loopeng's COMPOSITION surface: loopeng scaffolds/wires
   them, Pi runs them. No conflict with "does NOT run the loop"; the
   boundary sharpens to "loopeng composes the harness, Pi executes it."
3. pi-search install REJECTED by author: 13 stars, young, iffy. curl
   suffices for fetch; web search gap accepted for now. Long-term
   preference: build loopeng's own minimal research extension with Pi
   (dogfooding), post-Phase 4.
4. APPROVED and applied (2026-07-22): RESEARCH.md series-evolution
   amendment, PRODUCT.md provenance, spec compose-vs-run primitives table,
   spec 7.4 back pressure + per-task autonomy. NORTH_STAR untouched
   (separate approval required). Evals adopted as accepted gap, deferred
   Phase 4+.

## Blog candidates

1. "Addy Osmani published 8 loop-engineering posts in 6 weeks. I ran an
   open-weight MoE fanout to audit my project against all of them."
2. "My repo's design fits Osmani's lit-factory taxonomy at level 2 — but
   I graded that myself. Fidelity vs validation in agentic self-assessment."
3. "The eval gap: two independent model experts converged on the same
   missing layer."
4. "Vetting agent plugins like dependencies: stars, commit cadence, and the
   strict-allowlist failure mode."
