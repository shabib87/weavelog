# Session Learning Log: Pi Footer Redesign + Theme

**Date:** 2026-07-07
**Session:** Footer/theme redesign for author's Pi workspace

---

## Findings

### Pi's usage aggregation API (with evidence)

Pi's built-in footer (`dist/modes/interactive/components/footer.js`) is the authoritative reference for how to aggregate session usage. Key corrections found during source-code audit:

1. **Cache hit rate formula** (footer.js:91-93):
   ```
   cacheRead / (input + cacheRead + cacheWrite) * 100
   ```
   This is the proportion of prompt tokens served from cache, not a read/write ratio. Our initial formula (`cacheRead / (cacheRead + cacheWrite)`) was wrong.

2. **Context thresholds** (footer.js:117-122):
   ```
   >90% → error (red)
   >70% → warning (yellow)
   else  → normal
   ```
   These align with Pi's compaction settings (16384 reserve tokens, 20000 keep-recent). At 70% of a 262k window, you have ~78k tokens remaining. Using 60% as a warning threshold (our first attempt) would fire across most of a session and is too aggressive.

3. **Token formatting** (footer.js:27-33):
   ```
   <1000     → raw number
   <10000    → N.Nk
   <1000000  → round(k)
   <10000000 → N.NM
   else      → round(M)
   ```
   Pi has a more nuanced formatter than the simple `N.Nk` our first version used.

4. **Session entries for aggregation**: Pi's footer uses `sessionManager.getEntries()` (ALL entries including compacted), not `getBranch()` (current branch only). This matters because compacted entries still contributed to total cost and tokens. Using `getBranch()` would undercount cumulative usage after compaction.

### Pi theme system

- Pi themes define 51 mandatory color tokens in a JSON file.
- Themes are **global TUI-wide**, not per-component. Setting `"theme": "loopeng-dark"` affects messages, tools, markdown, syntax highlighting, borders, and the footer.
- `theme.fg()` accepts only semantic token names (e.g., `"accent"`, `"warning"`), not arbitrary hex values. Custom colors require defining or overriding theme tokens.
- Hot-reload: editing the active theme file triggers automatic refresh.

### Pi footer extension API

- `ctx.ui.setFooter((tui, theme, footerData) => ...)` replaces the built-in footer.
- `footerData` provides: `getGitBranch()`, `getExtensionStatuses()`, `getAvailableProviderCount()`, `onBranchChange(callback)`.
- `ctx.modelRegistry.isUsingOAuth()` detects subscription-based auth for `(sub)` indicator.
- Pi auto-discovers global extensions from `~/.pi/agent/extensions/*.ts` — no `settings.json` entry needed.

### User vs assistant message counts

Pi's agent loop generates one assistant message per tool-call cycle, not per user prompt. A single user prompt can produce 3-5 assistant messages as the model iterates through tools. This means:
- `assistantMessages` ≠ `userMessages` (they measure different things)
- The ratio (assistant/user) is a useful signal: higher ratios mean more tool-call iterations per prompt
- Calling both "turns" is misleading; "prompts" and "responses" are more precise

---

## Decisions

1. **loopeng-dark theme**: Created as a personal Pi theme based on the built-in dark theme with custom palette (dim orange, dim dark green, dim white, dim teal). Made the default via `settings.json`.

2. **Four-line footer layout**: Session identity / Model+runtime / Token flow / Cost+context+extensions. Explicit labels, no symbols, color-coded by semantic theme tokens.

3. **Personal Pi config ≠ loopeng product**: The theme and footer live in `~/.pi/agent/`, not in the loopeng repo. Loopeng may ship a Pi package later (noted in ROADMAP post-v1). Separating these prevented category confusion.

4. **No automated tests for footer**: The footer is a visual/presentation artifact whose primary correctness criteria are readability and label accuracy. Manual TUI verification is appropriate; automated tests would be mostly theater (testing string labels against mocked Pi APIs).

---

## Corrections

1. **Wrong cache hit formula**: Changed from `cacheRead/(cacheRead+cacheWrite)` to Pi's `cacheRead/(input+cacheRead+cacheWrite)`. The old formula measured cache-read vs cache-write ratio; the correct one measures the proportion of prompt tokens served from cache.

2. **Wrong context thresholds**: Changed from 60%/85% to Pi's 70%/90%. Our thresholds were too aggressive.

3. **Wrong scope framing**: First spec/plan incorrectly treated Pi workspace config as loopeng product code. Revised to document as author's personal setup with ROADMAP note for future formalization.

4. **Redundant model name**: First footer version showed model on both line 1 and line 2. Removed from line 1.

5. **Misleading "turns" label**: Both user and assistant counts were labeled "turns" but measure different things. Renamed to "prompts" and "responses."

---

## Blog candidates

- "Evidence-Driven Footer Design: What Pi's Source Code Taught Me About Cache Calculations"
- "Correctness Over Guessing: How Reading Source Code Saved Three Wrong Assumptions"
- "The Config-Not-Code Boundary: Why Your Theme Shouldn't Live in Your Product Repo"
