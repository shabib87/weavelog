---
date: 2026-09-02
topic: loopeng moat analysis (OSS readiness) — defensibility of assets (a)-(e), OSS moat patterns, compression-proxy prior art, auditable-process demand, positioning for OSS launch
status: complete
sources:
  - "https://github.com/anomalyco/opencode (live metadata 2026-09-02: 203,243 stars, MIT)"
  - "https://opencode.ai/changelog (v1.18.x cadence, V1/V2 compat, Cloudflare AI Gateway passthrough, compaction hooks)"
  - "https://byteiota.com/opencode-terminal-coding-agent/ (180k stars, 7.5M MAU claim, Go/Zen pricing)"
  - "https://blog.doshby.com/what-is-opencode-ai/ (Anomaly/YC background, Charm fork dispute, Anthropic ToS enforcement 2026)"
  - "https://tech-insider.org/ie/opencode-160k-github-stars-2026/ (SpaceX-Cursor $60B acquisition July 2026)"
  - "https://open-code.ai/en/docs/plugins (plugin hook surface incl. experimental.session.compacting)"
  - "https://deepwiki.com/sst/opencode/7.3-plugin-system (plugin architecture, indexed 2026-08-14)"
  - "https://www.pointfive.co/guides/top-prompt-compression-solutions-2026 (compression category map: TokenShift, The Token Company, gateway-embedded, LLMLingua, native caching)"
  - "https://arxiv.org/pdf/2604.02985 (Kummer et al. 2026-04: prompt-compression operating-window study, 30k queries)"
  - "https://www.edenai.co/post/llmlingua-vs-longllmlingua-vs-recomp-choosing-the-right-prompt-compression (code resists token-level compression)"
  - "https://ice-ice-bear.github.io/posts/2026-05-06-llmlingua-series/ (LLMLingua ~6.2k stars, production-adoption gap)"
  - "https://www.dipankar.cc/post/llm-prompt-compression-guide/ (caching vs compression economics, OpenAI ~50% / Anthropic ~90% cache discounts)"
  - "https://www.truefoundry.com/blog/helicone-vs-litellm (Helicone in maintenance mode post-Mintlify acquisition 2026-03)"
  - "https://klymentiev.com/blog/llm-gateway-guide (gateway comparison, Portkey Apache-2.0 since 2026-03)"
  - "https://gkoreli.com/oss-radar-02-the-toolchain-is-the-moat (Astral/OpenAI 2026-03-19; toolchain position as chokepoint moat)"
  - "https://lead-scorer.com/blog/astral-open-source-enterprise-funnel (Astral wedge→proof→support→paid-adjacency system)"
  - "https://kody-w.github.io/2026/04/19/open-bones-close-body/ (bones/body/soul open-core boundary; Vercel/Next cited)"
  - "https://vermilioncliffs.substack.com/p/why-open-source-as-gtm-is-having (6M suspected fake stars; open-core enterprise boundary)"
  - "https://pristren.com/blog/open-source-as-marketing-strategy/ (PostHog/Supabase/Cal.com OSS-as-distribution patterns)"
  - "https://foundercoho.substack.com/p/how-hugging-face-built-an-incompressible (HF ecosystem moat, $130M ARR 2024)"
  - "https://www.legalithm.com/en/blog/eu-ai-act-log-retention-record-keeping-6-months (Art 12/19/26(6); Digital Omnibus 2026/1744)"
  - "https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai (official AI Act timeline: Art 50 live 2026-08-02; high-risk → 2027-12-02)"
  - "https://www.nyk.dev/blog/eu-ai-act-traceability-coding-agents (Agent Traceability Matrix: run-id join, authority snapshot, writer-outside-boundary)"
  - "https://www.nyk.dev/blog/agent-governance-traceability-regulated-org (addressability/completeness/authority/durability properties)"
  - "https://zenity.io/blog/auditors-regulators-ai-agents (NIST CAISI AI Agent Standards Initiative 2026-02-17; Singapore agentic framework 2026; SOC2 behavioral evidence)"
  - "https://www.databricks.com/product/artificial-intelligence/unity-gateway (Databricks Unity Gateway markets governance over coding agents + harnesses, 2026-08-24)"
  - "https://axiomstudio.ai/blog/from-cursor-to-copilot-the-enterprise-guide-to-governing-agentic-coding-tools (enterprise agentic-coding governance demand)"
  - "https://solana.garden/guides/llm-agent-run-audit-trail-compliance-explained/ (hash-chained agent audit trails; Harbor SOX case)"
models_used_for_research:
  - openrouter/z-ai/glm-5.3-flash
supersedes: none
---

# loopeng moat analysis (OSS readiness) — 2026-09-02

Companion to `2026-09-02-oss-agent-harnesses.md` (competitor scan; not superseded — this note
answers the *moat* question that scan left open). Method: 3 web-search rounds this dispatch
(opencode platform risk + OSS moat patterns; compression-proxy prior art; auditability demand).
Last-verified date for every claim: **2026-09-02** unless stated. Confidence flags: 🟢 high
(primary/multiple sources), 🟡 medium (single secondary source), 🔴 low-confidence flag.

---

## 1. Defensibility of the five claimed assets

Baseline correction: per the 2026-09-02 competitor scan, (d) multi-model reviewers and (e) HITL
gates are **table stakes** (one-punch, keel Guided, microsoft/conductor dashboard gates,
agent-harness plan mode all ship them). The open question was (a), (b), (c).

### (a) One-question-at-a-time dialogue + wayfinder decision tickets — COPYABLE, moat = brand
- The protocol is markdown instructions; nothing technical prevents a weekend copy. one-punch
  already ships the same shape (one-decision-at-a-time on decision tickets) — though from the
  same mattpocock-skills lineage, so convergence is partly inherited, not independent.
- Durability candidate: **"soul" (brand/trust) + distribution**, per the open-core literature
  (kody-w: protocol = bones, product = body, brand = soul; the protocol itself is not the moat).
  A protocol only becomes durable if it becomes a standard others implement — that requires
  community gravity loopeng does not yet have.
- **Verdict: copyable in a weekend. Weakest structural moat; strongest as launch narrative.**

### (b) Research/scout subagent + dated indexed evidence archive — COPYABLE MECHANISM, DURABLE CORPUS
- The mechanism (a researcher subagent writing dated, indexed notes) is trivially copyable —
  llm-conductor-style markdown rosters prove instruction-only scaffolds are the common floor.
  opencode even ships a built-in Scout agent (🟡 tech-insider), so "has a researcher" is not a
  differentiator at the feature level.
- What is NOT copyable in a weekend: the **corpus** — ~45 dated, cross-indexed notes with
  citations, re-derivation protocols, and explicit "not checked" lists, accreted over months of
  real use. This is a data flywheel in the HF sense (foundercoho): slow to build, compounding,
  and it doubles as the *proof artifact* for the launch. But a corpus moat is only defensible if
  it is public — private notes are zero-moat.
- **Verdict: mechanism copyable; corpus + discipline durable if OSS'd as content. Strong #2 moat.**

### (c) Headroom compression/caching proxy — HARDEST TO COPY, BUT NOT UNIQUE; category exists
- Copying the *code* is not a weekend job: provider quirks (stream_options.include_usage bug),
  cache-key/session pinning, sticky-routing interactions, cost attribution (see
  2026-08-15/23 headroom notes). Infrastructure with operational depth deters casual clones.
- **However — headroom is not alone.** The 2026 compression category map (PointFive, 2026-06-26)
  splits the field: (1) **TokenShift — endpoint-local compressor sitting in front of coding
  agents**, explicitly built for "CLI output trimming, file-cache dedup, image rightsizing" —
  i.e., headroom's exact surface; (2) The Token Company (YC W26, $0.05/1M tok commercial
  compression API); (3) gateway-embedded compression (Portkey, LangChain
  ContextualCompressionRetriever); (4) OSS research stack — LLMLingua family (~6.2k★, MIT, six
  papers) remains the technical baseline; (5) **native provider caching as a "fifth force" eating
  the value prop** (OpenAI auto-cache ~50% cost cut; Anthropic ~90%).
- Reality checks the launch must absorb: a 2026 30k-query study found prompt compression only
  pays inside a narrow window — with commercial APIs or vLLM, compressor overhead often cancels
  the gain (arxiv 2604.02985); **code resists token-level compression** (codebase QA 78.5% →
  72.3% with LLMLingua-2; manual summarization beats auto at the same ratio — edenai 2026-08-07).
  The winning pattern is "cache the stable prefix, compress the volatile suffix" (dreaming.press
  2026-06-22) — which is exactly what a coding-agent-semantic, endpoint-local proxy does, and
  what generic token pruners cannot.
- **Verdict: strongest *technical* moat of the five — infrastructure depth + the only
  local-first, coding-agent-semantic proxy in the harness field (no scanned competitor ships
  anything like it; keel caps spend, doesn't compress) — but it must be positioned as "the
  coding-agent context layer," not "a compression proxy," or it competes with free LLMLingua and
  native caching. Contested by TokenShift (🔴 maturity unverified — see open questions).**

### (d) Conductor + multi-model diff reviewers — HYGIENE, NOT MOAT
- Copyable in minutes (add a second model as reviewer). What makes it *credible* is not the
  mechanism but the evidence: outrigger's own experiments found "layered independent (adversarial)
  review is the one mechanism no experiment ever demoted," while the blind merge gate cost 5.9×
  without defect reduction on well-specified work. Publish loopeng's own numbers or the mechanism
  is just config.

### (e) HITL plan/merge gates — TABLE STAKES
- Confirmed table stakes (conductor dashboard gates, keel Guided posture, agent-harness plan
  mode). Copyable trivially. The only durable angle: **gates that produce records** (see §4) —
  the gate is commodity; the receipt is not.

**Strongest moat candidate:** the (c)+(b) *combination* — local context infrastructure with a
published, measured evidence trail. (c) supplies the structural barrier (infra, not markdown);
(b) supplies the credibility and content flywheel. Neither alone is a moat: (c) without published
numbers is a black box losing to native caching; (b) without (c) is a blog.

---

## 2. Moat patterns from comparable OSS (2024–2026), and the opencode platform risk

### Patterns that worked
- **Astral (ruff/uv → OpenAI acquisition, announced 2026-03-19):** narrow wedge → benchmark-led
  proof essay → attention-window support discipline → server-only problem → paid adjacency (Pyx).
  "The toolchain is the chokepoint between agent and codebase"; network effects outlive licenses
  because switching costs live in CI configs and pre-commit hooks (gkoreli 2026-04; lead-scorer
  2026-08). Lesson: **the launch artifact is a verifiable benchmark/proof, not a README.**
- **Vercel/Next.js, GitLab, HashiCorp lineage — bones/body/soul (kody-w 2026-04):** open the
  protocol (bones), close the operations (body), sell trust (soul). If your wire format becomes
  the standard, every implementation strengthens you.
- **Supabase/PostHog/Cal.com/Plausible — OSS as distribution engine:** star counts convert at
  0.5–2% to customers; the real value is GitHub/Google discoverability and credibility (pristren
  2026-05). 🟡 enterprise-funnel conversion figures are founder-reported, unaudited.
- **Hugging Face — two-sided ecosystem:** cold-start friction is the moat's constructor; give the
  free layer, monetize enterprise ($130M ARR 2024). Relevant analog: harness *skills/agents* as
  the "models," practitioners as producers (foundercoho 2026-06).
- **Open-core boundary discipline (chancery RFC-011, vermilioncliffs 2026-05):** publish the
  boundary test ("OSS = single trust domain security; EE = org-scale + compliance attestation"),
  no CLA, no license flip. Notably, chancery's EE column sells "compliance packs (SOC2, … EU AI
  Act evidence)" — i.e., **the audit-evidence layer is already being commercialized as the
  enterprise tier by others.**
- **Fake-stars warning (vermilioncliffs):** 6M suspected fake stars across ~19k repos (AI/LLM
  repos the largest category); forks, contributor retention, and issue quality are the credible
  signals. Don't optimize stars.

### Which pattern fits a harness ON TOP of opencode
loopeng is not Astral (it isn't the toolchain — opencode is). The fitting pattern is
**protocol+evidence on a substrate you don't own**: open the *process protocol* (WHAT/HOW,
decision tickets, evidence schema — bones), keep the operator-facing infra (headroom) productized,
and build brand via the public research archive (soul). The harness layer's genuine moat lever is
**standards ownership of process artifacts** — the way Hugging Face standardized hosting and
Astral standardized the agent↔toolchain interface, loopeng can standardize "what an auditable
agent run record looks like." If the run-record/evidence schema gets adopted by others (even
competitors), the schema is the moat — the HF "give the standard, take the enterprise" pattern.

### opencode platform risk — REAL but bounded; the absorption threat is specific
🟢 Facts (2026-09-02): opencode (now anomalyco/opencode) is 203,243★, MIT, created 2025-04-30,
by Anomaly Innovations (YC 2021, ex-SST) — 7.5M MAU claimed by secondary sources (🟡 byteiota,
doshby; treat as directional). Release cadence is extreme (v1.18.x multiple times weekly; 294
curated updates by Aug 28). Growth was catalyzed by Anthropic's early-2026 ToS enforcement against
third-party Claude Code alternatives (doshby) and the SpaceX–Cursor $60B acquisition (July 2026,
🟡 tech-insider). Monetization: Go ($10/mo tier) and Zen pay-as-you-go.
- **Absorption risk (the one that matters for headroom):** opencode is already building adjacent
  surface: `experimental.session.compacting` plugin hook + improved session compaction
  (changelog), and **native OpenAI/Anthropic passthroughs for Cloudflare AI Gateway** — i.e., the
  upstream is actively absorbing the *proxy/gateway* layer at the config level. If opencode ships
  first-party context compression or cache-aware routing, headroom's distribution via opencode
  config shrinks. 🔴 No evidence found of opencode shipping compression; risk is directional.
- **Breaking-change risk is mitigated in practice:** the changelog shows active V1→V2
  compatibility work ("V1 now reads supported V2 config fields," "Preserved compatibility with
  existing v1 databases") and a documented, stable plugin hook surface (auth, provider,
  chat.headers, tool.execute.before/after, permission.ask, event, custom tools,
  experimental.session.compacting — deepwiki 2026-08-14, open-code.ai docs). Still, hooks are the
  integration surface most likely to churn in a V2 rewrite (loopeng's own 2026-08-19/24 notes
  show the SDK/config surface moving underfoot within weeks).
- **Governance risk precedent:** the 2024-25 Charm/Crush fork dispute shows opencode's governance
  is contested terrain, but MIT licensing guarantees fork escape (doshby).
- **Mitigations observed in the field:** (1) be upstream-agnostic — headroom already serves
  opencode AND pi via a plain OpenAI-compatible endpoint (2026-08-28 note); formalize the portable
  IAgentProvider contract sketched in 2026-08-19; (2) own a layer opencode won't build (a
  cross-CLI, cross-provider *data-plane* proxy is infra, not a plugin — harder to absorb);
  (3) ride the changelog weekly (the harness already does); (4) support 2+ CLIs (AO supports 26;
  tiller supports 3) so no single upstream is load-bearing.

---

## 3. Is headroom a headline or a commodity? — verdict: headline *if reframed*, commodity as-is

Prior art map (all 2026):
| Layer | Prior art | What it does NOT do |
|---|---|---|
| Research OSS | LLMLingua family (MIT, ~6.2k★), Selective Context (stale), RECOMP, Gisting, 500xCompressor | token-level; mangles code; needs local GPU; not wired to agents |
| Commercial API | The Token Company (YC W26) | server-side; data leaves machine; chat/RAG-oriented |
| Endpoint, coding-agent | **TokenShift** — "the only solution on this list" at the developer endpoint; CLI-output trimming, file-cache dedup, image rightsizing | 🔴 direct competitor; maturity/adopters unverified |
| Gateways | LiteLLM (MIT, budgets/keys, exact caching), Portkey (Apache-2.0 since 2026-03; semantic caching + guardrails), Helicone (Rust gateway; **maintenance mode after Mintlify acquisition 2026-03**), Cloudflare AI Gateway (edge caching, no self-host), OpenRouter (no caching/audit) | response caching ≠ context compression; none are local-first, none are coding-agent-semantic |
| Provider-native | OpenAI auto cache (~50%), Anthropic cache_control (~90%) | invisible to multi-provider/multi-agent flows; only stable prefixes |
| Upstream agent | opencode session compaction + `experimental.session.compacting` hook | compaction ≠ pre-flight compression; no cache-key/cost telemetry |

Three facts sharpen the verdict:
1. **The category is being named right now** ("compression, pseudonymization, recovery, and
   KV-cache management are all clearly bifurcating into a production tooling layer" — ice-ice-bear
   2026-05). Being early with a working local proxy is a real position, but the window is short.
2. **Coding-agent traffic is the underserved surface** (PointFive): server-side compressors are
   built for RAG/chat; native caching only helps stable prefixes; the volatile middle (tool
   output, file reads, CLI noise) is exactly where a local, agent-aware proxy earns its keep.
   Headroom's design (toolResult compression, thresholds, cache mode) is already shaped for this.
3. **The economics must be honest.** Loopeng's own measurements show the dashboard reporting ~5%
   savings with a cache-attribution gap (2026-08-15 notes). Meanwhile a published study shows
   compression can *cost* net time outside its operating window (arxiv 2604.02985). If headroom
   launches on vibes, the first competent benchmark post will kill it. If it launches with a
   reproducible per-workload profiler ("compression break-even calculator" exists as a pattern in
   that paper), it owns the honest-measurement niche — which is also the Astral launch pattern.

**Headline vs commodity:** as "a compression proxy" → commodity (LiteLLM/Cloudflare do caching;
LLMLingua is free; native caching is free). As "**local, auditable context-infrastructure for
coding agents: measure, compress, cache, and account for every token across any provider**" →
headline. The accounting/telemetry half (cache attribution, per-session cost truth) is arguably
the more differentiated half, and it dovetails with the evidence-moat (§4).

---

## 4. Evidence/process as moat: "auditable agent process" — demand is real and freshly dated

Demand signals, all 2026:
- **NIST CAISI launched an AI Agent Standards Initiative (2026-02-17)** after a Jan-2026 Federal
  Register RFI — first time agentic AI is a distinct NIST standardization priority (zenity 2026-06).
- **Singapore's Model AI Governance Framework for Agentic AI** (2026): documented accountability,
  human-oversight design, operational transparency (zenity).
- **EU AI Act:** Art 50 transparency obligations live since **2026-08-02**; high-risk logging
  (Art 12 automatic logging) + ≥6-month log retention (Art 19 providers / Art 26(6) deployers)
  deferred by the Digital Omnibus (Reg 2026/1744, in force 2026-07-27) to **2027-12-02** (Annex
  III) / 2028-08-02 (Annex I) (legalithm; digital-strategy.ec.europa.eu). Key nuance for product
  framing: **records cannot be backfilled** — the six-month retention window means history must
  start accumulating before the deadline (nyk 2026-08-11). Also: most *coding* agents are not
  high-risk; the honest framing is "could you produce the evidence if obliged?" (nyk 2026-08-09).
- **SOC 2 Type II** practice is shifting toward behavioral evidence for agents, not just access
  logs (zenity); hash-chained, agent-run audit trails are already an enterprise pattern with
  documented SOX wins (11 days → 6 hours remediation; solana.garden 2026-06).
- **Vendors are racing to fill it:** Databricks Unity Gateway markets governance across "coding
  agents, agent harnesses, MCPs" with AI audit logging (2026-08-24); AXIOM sells agentic-coding
  governance dashboards; Automation Anywhere sells "immutable traceability." **None of the OSS
  harnesses in the 2026-09-02 scan ship tamper-evident run records — only keel does (hash chain +
  Ed25519 checkpoints), and it's pre-alpha.**

Mapping to loopeng: the dated evidence archive, backlog merge-gate decision records, and
reviewer chains are 80% of an "auditable process" story — but they are currently *claims*, not
*evidence*, by the standards the 2026 literature uses: no run-id → commit-trailer join (the
"one-line, gets-harder-every-week" item), no authority snapshot at run start, no writer outside
the agent boundary, no receipts (nyk's four properties: addressable, complete-by-construction,
bounded-in-authority, durable). keel already demonstrated the structural version; nyk's checklist
is the minimal portable version.

**Verdict: yes — "auditable agent process" is a marketable differentiator in late 2026, with a
regulatory clock (Dec 2027) and standards momentum (NIST CAISI) behind it. But it only becomes a
moat if the records are structurally unforgeable (harness-written, hash-chained, exportable
"Evidence Pack") — otherwise it's a markdown folder competitors can mimic with a README.** The
research-archive corpus (b) then becomes the *demonstration* of the discipline, and the schema
becomes the standards play (§2).

---

## 5. Positioning options for the OSS launch (ranked)

**#1 — "The evidence-grade harness: agent work you can audit."** For engineering leads and
platform teams adopting opencode/Claude Code who must answer "which agent changed this, under
whose authority, and what did it see?" Beats one-punch/tiller (zero evidence layer), beats keel
(enforcement without process: no dialogue, no research layer), beats dashboards (they log events;
loopeng produces joined records: run-id → diff → gate results → human approval). Why it wins:
unique asset (b) becomes the product's proof, (e) becomes structural via receipts, and the Dec-2027
AI Act + NIST CAISI clock gives it urgency no competitor has packaged. Moat: **standards ownership
of the run-record/evidence schema + the public corpus (b) + governance-wave timing.**

**#2 — "The context layer for the multi-model agent era" (headroom-first).** For developers and
teams running 75-provider BYOK stacks (opencode's exact audience) who are bleeding tokens on
volatile tool output that provider caching can't touch. Beats gateways (LiteLLM/Portkey cache
responses server-side; Helicone is in maintenance mode; none are local-first or coding-agent-aware)
and beats "just enable caching" with honest per-workload measurement. Moat: infra depth (c) +
benchmark credibility + the Astral-style launch essay. Risk: TokenShift collision; native caching
absorption; must fix/publish real numbers first. This option wins **if** headroom numbers are
strong; as a *complement* to #1 it is unconditionally strong (cost receipts are themselves
evidence).

**#3 — "The discipline layer: WHAT/HOW loops and one-question-at-a-time for opencode."** For
solo devs and small teams drowning in unstructured agent sessions; beats raw opencode + ad-hoc
prompts and tiller-ai (dormant since 2026-03). Moat: brand, community, methodology — the "soul"
layer only. Copyable in a weekend by anyone who reads the README; viable only as the
entry-level wedge that feeds #1/#2, not as the moat itself.

---

## TOP 3 actions before OSS launch (to deepen the moat)

1. **Make the evidence structural: ship the "Run Record + Evidence Pack."** Run-id in the commit
   trailer (one afternoon; everything else hangs off it), authority snapshot at run start
   (tools registered, approval mode, budget caps — captured by the harness, not the agent),
   hash-chained merge-gate receipts, and a single-command export that answers "which agent changed
   this line, under whose authority." Aligned to nyk's Agent Traceability Matrix and EU AI Act
   Art 12/19/26(6) shape; differentiates against every scanned harness (only keel has audit, and
   it has no process layer). This converts assets (b)+(e) from discipline into product.
2. **Publish the honest benchmark pair before launch (Astral pattern):** (i) headroom — a
   reproducible per-workload savings/latency profile on real opencode traffic, with the cache-
   attribution fix so the number is defensible, framed as "cache the stable prefix, compress the
   volatile suffix, account for every token"; (ii) a harness-vs-null run ledger (outrigger's
   discipline) showing which loopeng mechanisms earn their cost — including where the merge gate
   doesn't. The essay *is* the launch; unverified claims are the single biggest kill risk given
   arxiv 2604.02985 and TokenShift's existence.
3. **Kill the single-upstream failure mode:** formalize the portable provider/CLI contract
   (opencode SDK + `run` CLI + plain OpenAI-compatible endpoint for headroom; second CLI target —
   Claude Code or Codex — demonstrably working), and ship the tiller-style `npx init` scaffold
   with a minimal loopeng profile. Distribution to strangers' repos is the confirmed #1 gap from
   the competitor scan; multi-CLI support is also the only real mitigation for opencode absorption
   of proxy/compaction features.

## What NOT to bother with
- **OS-level sandboxing / out-of-process warden / egress pinning** (keel's territory): enormous
  build cost, pre-alpha-stage value for the target user, and adjacent to opencode's own permission
  system. Borrow only "intent-before-effect" audit concepts, not the warden.
- **Fleet observability / dashboards / multi-machine orchestration** (microsoft/conductor, AO,
  baton, and now Databricks Unity Gateway own it; funded teams win it).
- **Gateway feature parity** (semantic caching, 100+ provider routing, virtual keys): LiteLLM and
  Portkey (Apache-2.0 since 2026-03) have permanent scale advantage; headroom should route *around*
  them (endpoint-side) not compete with them.
- **Star-chasing / launch-day vanity metrics:** 6M suspected fake stars in the ecosystem; forks,
  contributors, and the proof essay are the currency.
- **More reviewers / more models in the review chain:** beyond 2–3 diff reviewers, error-diversity
  is hygiene, not moat; outrigger's own data demoted heavier gates on well-specified work (5.9×).

## Not checked / open questions
- TokenShift's repo, license, adoption, and funding — discovered only via the PointFive category
  guide; no live repo fetch this dispatch (search budget).
- opencode's plugin-hook stability guarantees (semver policy?) — changelog-level evidence only.
- "7.5M MAU" opencode figure: secondary-source only (byteiota, tech-insider, doshby) — directional.
- npm download counts for keel-harness/tiller-ai (popularity vs the star noise) — not pulled.
- Whether Portkey's "gateway-embedded compression" is semantic caching rebranded or true
  pre-flight prompt compression — vendor-page level only.
