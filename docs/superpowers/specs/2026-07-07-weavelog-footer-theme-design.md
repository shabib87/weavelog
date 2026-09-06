# loopeng Footer + Theme Design

Date: 2026-07-07
Status: Draft — pending user review

## Goal

Replace the current single-line, symbol-heavy footer in Pi with a four-line, labeled, color-coded footer. Introduce a custom `loopeng-dark` theme based on the current active dark theme with the requested palette (dim orange, dim dark green, dim white, dim teal, yellowish, white), and make it the default.

## Background

The current footer (`~/.pi/agent/extensions/footer.ts`) renders everything on one line with ambiguous symbols:

```
(main)  1t  ↑16.5k ↓1.3k  R24.0k  CH100.0%  $0.023  6.8%/262.1k  (auto)  moonshotai/kimi-k2.7-code
```

Specific problems:
- `R24.0k` actually means **cache-read tokens**, not reasoning tokens.
- `↑`/`↓` require decoding.
- Token counts, cost, context, branch, model, mode, and thinking level are visually flattened.
- The current dark theme has no dedicated dim orange or dim teal tokens.

## Design

### Footer layout (4 lines)

```
┌────────────────────────────────────────────────────────────────────────────────────┐
│  (main)   ·   1 turn   ·   auto                                                     │
│  model: moonshotai/kimi-k2.7-code   ·   thinking: medium   ·   tools: 4             │
│  input:1.3k   output:16.5k   cache-read:24.0k   hit:100.0%                          │
│  cost:$0.023   ·   context:6.8% / 262.1k   ·   herdr: idle                          │
└────────────────────────────────────────────────────────────────────────────────────┘
```

- **Line 1 — session identity**: git branch, turn count, mode.
- **Line 2 — model/runtime**: model name, thinking level, active tool count.
- **Line 3 — token flow**: input, output, cache-read, cache-hit rate.
- **Line 4 — cost/pressure/extensions**: running cost, context usage percent/window, extension statuses.

### Color mapping

| Footer element | Theme token | `loopeng-dark` var | User palette |
|---|---|---|---|
| Labels (`input:`, `output:`, `model:`, etc.) | `dim` | `dimGray` | dim gray |
| Branch / turns / mode / separator `·` | `muted` | `warmWhiteDim` | dim white |
| Input tokens value | `text` | `warmWhite` | white |
| Output tokens value | `warning` | `orangeDim` | dim orange |
| Cache-read tokens value | `accent` | `tealDim` | dim teal |
| Cache hit rate value | `success` | `greenDark` | dim dark green |
| Cost value | `warning` if >$0.05, else `text` | `orangeDim` / `warmWhite` | dim orange / white |
| Context percent value | `success` if <60, `warning` if 60-85, `error` if >85 | `greenDark` / `orangeDim` / `redDim` | pressure gauge |
| Thinking level value | `thinkingOff` / `thinkingMinimal` / `thinkingLow` / `thinkingMedium` / `thinkingHigh` / `thinkingXhigh` | existing Pi tokens | match Pi thinking borders |
| Model value | `text` | `warmWhite` | white |
| Active tools count | `muted` | `warmWhiteDim` | dim white |
| Extension status value | `muted` | `warmWhiteDim` | dim white |

### Theme file

Create `~/.pi/agent/themes/loopeng-dark.json` with all 51 required Pi theme tokens. The file is based on the current active `dark.json` theme; only the `vars` and color values are changed to preserve readability relationships and keep the theme global (affects the whole TUI, not just the footer).

Key palette vars:

```json
{
  "orangeDim": "#d19a66",
  "orange": "#e5c07b",
  "tealDim": "#56b6c2",
  "teal": "#2aa198",
  "greenDark": "#608b4e",
  "greenOlive": "#b5bd68",
  "yellowPale": "#f0c674",
  "warmWhite": "#d4d4d4",
  "warmWhiteDim": "#a0a0a0",
  "dimGray": "#666666",
  "darkGray": "#505050",
  "redDim": "#cc6666"
}
```

Map existing semantic tokens to these vars so the rest of the TUI stays coherent:

- `accent` → `tealDim`
- `success` → `greenDark`
- `warning` → `orangeDim`
- `error` → `redDim`
- `text` → `warmWhite`
- `muted` → `warmWhiteDim`
- `dim` → `dimGray`

### Settings change

Update `~/.pi/agent/settings.json` to set:

```json
{
  "theme": "loopeng-dark"
}
```

### Footer implementation

Update `~/.pi/agent/extensions/footer.ts`:

1. Keep the existing aggregation logic for tokens, cost, and context.
2. Add `pi.getThinkingLevel()` to display the current thinking level.
3. Add `pi.getActiveTools().length` to display active tool count.
4. Add `footerData.getExtensionStatuses()` to display extension statuses.
5. Render four lines using `theme.fg()` with the semantic tokens above.
6. Apply context-percentage thresholds for coloring.
7. Apply cost threshold for coloring.
8. Continue to subscribe to `footerData.onBranchChange()` for git branch updates.

### Available footer data

The footer can display any value available through:

- `footerData.getGitBranch()`
- `footerData.getExtensionStatuses()`
- `ctx.sessionManager.getBranch()` (turns, messages, usage)
- `ctx.model` (model id, name, provider, context window)
- `ctx.getContextUsage()` (tokens, percent, context window)
- `pi.getThinkingLevel()`
- `pi.getActiveTools()`
- `pi.getSessionName()`
- `ctx.sessionManager.getSessionFile()`

Values not directly available (e.g., git dirty state, CPU, clock) would require additional code and are out of scope.

## Files changed

- `~/.pi/agent/themes/loopeng-dark.json` (new)
- `~/.pi/agent/settings.json` (add `"theme": "loopeng-dark"`)
- `~/.pi/agent/extensions/footer.ts` (rewrite render)

## Out of scope

- `tsx` dependency installation (requires approval)
- `loopeng check` / `loopeng init` CLI
- Session-logger verification
- Any other Pi extensions
- Additional footer data sources (git status, system metrics)

## Verification

1. Save files, run `/reload` in Pi.
2. Confirm footer shows four labeled lines.
3. Confirm colors match the palette in a truecolor terminal.
4. Confirm `settings.json` has `"theme": "loopeng-dark"`.
5. Verify readability against the current dark theme's contrast hierarchy.
