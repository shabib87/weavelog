# Model Selection Audit — Red Team + Live API Verification

> **Date:** 2026-07-05
> **Source:** OpenRouter live API query + structural red team analysis
> **Session:** 2026-07-05T17-36-54Z (019f335a-c44e-77dd-aaf4-3048d0b2bcad)
> **Related:** `docs/research/model-selection.md`, `docs/research/2026-07-04-frontier-model-selection.md`

## Findings

### 1. GLM 5.2 cost dropped since research
- Documented: $0.91/$2.86/M
- Live API: $0.57/$1.80/M
- **Action:** Update all documents. Do not use old cost figure.

### 2. DeepSeek V4 Pro as Verifier (Code) IS justified
- Design Arena shows #29 in fullstack — initially flagged as critical weakness
- **Red team correction:** The maker/checker principle requires diversity of blind spots, not parity of capability. Different architecture (Z.ai vs DeepSeek) = different failure modes. The 68.8→59.4 coding gap does not invalidate the arrangement.
- **Action:** Document the corrected rationale explicitly. Change Verifier (Code) description from "smarter reviewer" to "complementary reviewer — different, not smarter."

### 3. Documenter tier is justified (contrary to initial red team)
- DeepSeek V4 Flash at $0.09/$0.18/M is 6.3x cheaper on prompt, 10x cheaper on completion than GLM 5.2
- For a high-throughput, low-risk role (changelogs, API docs), cost savings compound
- Not YAGNI violation — earns its keep via cost efficiency

### 4. Kimi K2.7 Code rationale confirmed correct
- K2.7 Code's coding advantage (60.8 vs 56.0) matters more than agentic index (29.6 vs 30.3) for UI review
- UI review is fundamentally about understanding: "does this UI match the spec?" — a coding comprehension task

### 5. New models appeared after research
- MIMO v2.5 Pro (60.2 coding, $0.43/$0.87) — competitive but no differentiator
- MiniMax M3 (58.6 coding, $0.30/$1.20) — competitive but no differentiator
- Qwen 3.7 Max (66 coding, $1.25/$3.75) — no clear role, kept in overrides only
- Poolside Laguna M.1 — no benchmarks yet

### 6. Gemini 4 31B has architectural diversity value
- Weak benchmarks (43.4 coding, 14.4 agentic) but Google family = different blind spots
- Should be in `models.json` overrides (available but not assigned) for passive review fallback

## Decisions

1. **Keep DeepSeek V4 Pro as Verifier (Code)** — with corrected rationale
2. **Drop Gemma 4 31B from enabledModels** — but keep in `models.json` overrides for diversity
3. **Drop Qwen 3.7 Max from enabledModels** — but keep in `models.json` overrides for diversity
4. **Drop Kimi K2.6** — subsumed by K2.7 Code
5. **Drop Nemotron paid tier** — free tier has identical benchmarks
6. **Drop Ling 2.6 Flash** — no benchmarks, same tier as Flash
7. **MIMO and MiniMax M3** — dropped, no differentiator
8. **Update GLM 5.2 cost** — $0.57/$1.80 in all docs
9. **Add GPT-5.5 codex profile** — replace opus in escalation ladder

## Corrections

- GLM 5.2 cost was stale ($0.91/$2.86 → $0.57/$1.80)
- DeepSeek V4 Pro justification needed explicit correction (diversity > capability parity)
- Documenter tier justification needed strengthening (cost savings, not YAGNI)
- Kimi K2.6 was not fully subsumed by K2.7 Code in `models.json` — now fixed

## Blog Candidates

- "Why Your Verifier Shouldn't Be Smarter Than Your Implementer" — the DeepSeek V4 Pro maker/checker principle explained
- "Model Cost Collapse: GLM 5.2 Dropped 37% in One Week" — the importance of live data
- "The 7-Model Stack: How loopeng Picks Its Team" — model selection methodology
