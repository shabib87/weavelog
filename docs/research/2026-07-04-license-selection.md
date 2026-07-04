# License Selection

> **Date:** 2026-07-04
> **Status:** Active research. Decision pending user approval.
> **Cross-ref:** `docs/NORTH_STAR.md` (open-source, solo-dev OSS for v1), `docs/research/2026-07-04-harness-setup-and-pmf-synthesis.md` (Tolaria reference)

## The question

loopeng is currently MIT (inherited from the initial scaffold). The user is
rethinking this stance: *"should it be MIT or changed to Apache 2.0? what
gives me most benefit based on my what i just said."* The user's goals:
personal leverage + influence, credibility, direction control, built on OSS.

## Dependency license audit (evidence-based)

Every tool in the loopeng stack, verified from PyPI/GitHub/package metadata:

| Dependency | License | Role | Compatible with? |
|---|---|---|---|
| Pi | MIT | Agent host | MIT, Apache 2.0, AGPL-3.0 |
| Headroom | **Apache 2.0** | Compression + memory | MIT, Apache 2.0, AGPL-3.0 |
| markitdown | MIT | Doc ingestion | MIT, Apache 2.0, AGPL-3.0 |
| Superpowers | MIT | Skills layer | MIT, Apache 2.0, AGPL-3.0 |
| beads | MIT | Task/memory graph (future) | MIT, Apache 2.0, AGPL-3.0 |
| gh CLI | MIT | GitHub interaction | MIT, Apache 2.0, AGPL-3.0 |
| commitlint | MIT | Commit format | MIT, Apache 2.0, AGPL-3.0 |
| pre-commit | MIT | Hook management | MIT, Apache 2.0, AGPL-3.0 |
| gitleaks | MIT | Secrets scanning | MIT, Apache 2.0, AGPL-3.0 |
| GitHub CodeQL | MIT | SAST in CI | MIT, Apache 2.0, AGPL-3.0 |
| lazygit | MIT | TUI git review | MIT, Apache 2.0, AGPL-3.0 |
| git-delta | MIT | Diff rendering | MIT, Apache 2.0, AGPL-3.0 |
| Semgrep | LGPL-2.1* | Custom SAST rules (v0.2) | Used-not-linked, no conflict |

*Semgrep is LGPL-2.1, not MIT/Apache 2.0, but the user explicitly approved it.
It's used as a tool (not linked into loopeng's code), so LGPL doesn't
contaminate loopeng's license. The rules loopeng writes are its own.

**Conclusion:** All dependencies are MIT or Apache 2.0 (Semgrep exception
approved). loopeng can choose MIT, Apache 2.0, or AGPL-3.0 — all are
compatible. No dependency forces a license constraint.

## The three options

### MIT (current)

- **What it is:** Permissive. Anyone can use, copy, modify, distribute, even
  commercially. Only requirement: retain the copyright notice.
- **Patent grant:** No. (This is MIT's main weakness vs Apache 2.0.)
- **Copyleft:** None. Anyone can fork and close-source.
- **Direction control:** None legal. Trademark can be added separately.
- **Adoption friction:** Lowest. Everyone understands MIT.
- **Credibility signal:** Neutral. Standard. Doesn't signal anything.
- **Used by:** Pi, markitdown, superpowers, beads, gh, commitlint, gitleaks,
  lazygit, git-delta, CodeQL — most of the stack.

### Apache 2.0

- **What it is:** Permissive (like MIT) + explicit patent grant + NOTICE file
  for attribution + contribution CLA framework.
- **Patent grant:** Yes. Contributors grant a perpetual, irrevocable patent
  license. If someone sues over patents, they lose their license. This
  protects against patent trolls.
- **Copyleft:** None. Anyone can fork and close-source.
- **Direction control:** None legal beyond trademark.
- **Adoption friction:** Low. Well-understood, used by major projects.
- **Credibility signal:** "Serious project." Used by Kubernetes, Headroom,
  Android, Apache Foundation projects.
- **Used by:** Headroom (the key compression dependency), Kubernetes, et al.

### AGPL-3.0 + trademark policy (Tolaria's choice)

- **What it is:** Strong copyleft. Anyone who modifies and deploys loopeng
  (including as a network service) must open-source their modifications.
  Trademark policy (separate) keeps name/logo under creator control.
- **Patent grant:** Yes (GPL family includes patent provisions).
- **Copyleft:** Strong. Modified versions must be AGPL-3.0.
- **Direction control:** Strongest. If someone forks and improves loopeng,
  they must share those improvements publicly. This is the legal lever.
- **Adoption friction:** High. Some companies (Google, etc.) ban AGPL
  internally. Reduces adoption potential.
- **Credibility signal:** "Committed to openness." Tolaria's choice.
- **Used by:** Tolaria, MongoDB (Community), Mastodon, MinIO.

## Analysis against the user's goals

| Goal | MIT | Apache 2.0 | AGPL-3.0+TM |
|---|---|---|---|
| Personal leverage (a) | ✅ simplest | ✅ | ✅ |
| Influence (c) — patterns adopted | ✅ lowest friction | ✅ | ⚠️ AGPL scares some adopters |
| Credibility / "real product" | neutral | ✅ "serious" | ✅ "committed to openness" |
| Direction control | ❌ weakest | ❌ weak (permissive) | ✅ strongest (must-share) |
| Built on MIT/Apache 2.0 OSS | ✅ | ✅ | ✅ |
| Bragging rights | — | — | — (proof projects drive this, not license) |

## The key tension

The user wants **both** influence (max adoption, patterns copied) **and**
direction control (nobody forks and closes). These pull in opposite
directions:

- **Influence** favors permissive (MIT/Apache 2.0) — easy to adopt, easy to
  copy patterns into any codebase.
- **Direction control** favors copyleft (AGPL) — must-share improvements.

**Important:** for a CLI tool (not a SaaS), AGPL's network clause is mostly
irrelevant. Nobody runs a CLI as a network service. The main AGPL effect for
loopeng is: modified distributions must be open-sourced. This is the
"direction control" lever, but it also scares adopters.

**Trademark is separate from code license.** The user can add a trademark
policy (like Tolaria) to ANY of the three licenses. This prevents others from
using the "loopeng" name/logo, regardless of code license. This is the
"direction control" lever that doesn't cost adoption.

## Recommendation

**Apache 2.0 + trademark policy.**

Reasoning:
1. **Patent protection** — MIT has none; Apache 2.0 does. For a tool that
   could see commercial use, this matters.
2. **Consistency with Headroom** — the key compression dependency is Apache
   2.0. Matching it signals ecosystem coherence.
3. **Adoption-friendly** — permissive enough for maximum influence (the user's
   outcome (c) goal). AGPL would reduce this.
4. **"Serious project" credibility** — Apache 2.0 signals maturity without the
   AGPL controversy.
5. **Trademark policy** — adds the direction-control lever (nobody else can
   call their fork "loopeng") without sacrificing adoption.
6. **YAGNI on AGPL** — the "must-share improvements" protection is valuable
   for SaaS tools (where Tolaria sits — a desktop app could become a hosted
   service). loopeng is a CLI; the SaaS scenario is speculative. If loopeng
   ever adds a hosted component, revisit then.

**If the user wants stronger must-share protection** (prevent closed-source
forks entirely): AGPL-3.0 + trademark. But note the adoption cost.

## What this doesn't decide

- The trademark policy itself (name/logo usage rules). Deferred to when the
  repo goes public.
- The CONTRIBUTING.md / CODE_OF_CONDUCT.md (already tracked in
  `docs/tbd/open-blindspots-index.md` as "create when repo goes public").
- The copyright holder name in LICENSE (currently "Shabib Hossain" — confirm
  real name vs handle is intentional).

## Decision needed

The user decides. The recommendation is Apache 2.0 + trademark policy, but
the user's goals (influence vs direction control) determine the tradeoff. If
direction control is more important than adoption, AGPL-3.0 is the answer.
If adoption is more important, Apache 2.0 (or stay MIT).
