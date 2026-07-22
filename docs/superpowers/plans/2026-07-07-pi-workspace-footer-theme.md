# Pi Workspace Footer + Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve the author's personal Pi TUI workspace with a readable four-line footer and a custom `loopeng-dark` theme. This is **not** loopeng product code; it is private Pi user configuration documented here for reference.

**Architecture:** The theme is a full Pi TUI theme JSON file based on the built-in `dark` theme. The footer is a Pi extension that renders four lines of session/model/token/cost data using semantic theme tokens. Both live in `~/.pi/agent/`, not in `~/Projects/loopeng`.

**Tech Stack:** TypeScript (Pi extension), JSON (Pi theme).

## Global Constraints

- No production code or config in `~/Projects/loopeng` from this work.
- Theme must define all 51 required Pi theme tokens.
- Footer must use semantic `theme.fg()` tokens only.
- No new npm dependencies without explicit approval.
- TypeScript is the implementation language; no bash for logic.
- Preserve existing footer aggregation behavior.
- Sanitize absolute home paths before committing docs.

---

## File Structure

- `~/.pi/agent/themes/loopeng-dark.json` — new full Pi theme (private config)
- `~/.pi/agent/settings.json` — add `"theme": "loopeng-dark"` (private config)
- `~/.pi/agent/extensions/footer.ts` — rewrite render function (private config)
- `docs/pi-workspace/2026-07-07-author-setup.md` — documentation of the private setup
- `docs/ROADMAP.md` — note future Pi package formalization
- `docs/PROGRESS.md` — honest status update
- `docs/NEXT_SESSION.md` — handoff with corrected framing

---

## Task 1: Create the `loopeng-dark` theme file

**Files:**
- Create: `~/.pi/agent/themes/loopeng-dark.json`

**Interfaces:**
- Produces: a valid Pi theme file at `~/.pi/agent/themes/loopeng-dark.json`

- [ ] **Step 1: Copy the built-in dark theme as the base**

Read `~/.nvm/versions/node/v22.23.1/lib/node_modules/@earendil-works/pi-coding-agent/dist/modes/interactive/theme/dark.json` and copy it to `~/.pi/agent/themes/loopeng-dark.json`.

- [ ] **Step 2: Update `name` and define the loopeng palette vars**

Set `"name": "loopeng-dark"` and replace the `vars` block with:

```json
"vars": {
  "cyan": "#00d7ff",
  "blue": "#5f87ff",
  "green": "#608b4e",
  "red": "#cc6666",
  "yellow": "#f0c674",
  "text": "#d4d4d4",
  "gray": "#808080",
  "dimGray": "#666666",
  "darkGray": "#505050",
  "accent": "#56b6c2",
  "selectedBg": "#3a3a4a",
  "userMsgBg": "#343541",
  "toolPendingBg": "#282832",
  "toolSuccessBg": "#283228",
  "toolErrorBg": "#3c2828",
  "customMsgBg": "#2d2838",
  "orangeDim": "#d19a66",
  "orange": "#e5c07b",
  "tealDim": "#56b6c2",
  "teal": "#2aa198",
  "greenDark": "#608b4e",
  "greenOlive": "#b5bd68",
  "yellowPale": "#f0c674",
  "warmWhite": "#d4d4d4",
  "warmWhiteDim": "#a0a0a0",
  "redDim": "#cc6666"
}
```

- [ ] **Step 3: Map semantic colors to the palette**

Update the `colors` block so at minimum these tokens reference the vars above:

```json
{
  "accent": "tealDim",
  "border": "blue",
  "borderAccent": "cyan",
  "borderMuted": "darkGray",
  "success": "greenDark",
  "error": "redDim",
  "warning": "orangeDim",
  "muted": "warmWhiteDim",
  "dim": "dimGray",
  "text": "warmWhite",
  "thinkingText": "gray"
}
```

Also change any pure `#ffff00` values to `yellowPale`.

- [ ] **Step 4: Validate the theme file**

Run:

```bash
node -e "const fs=require('fs'); const t=JSON.parse(fs.readFileSync(process.env.HOME+'/.pi/agent/themes/loopeng-dark.json','utf8')); console.log('name:', t.name); console.log('vars:', Object.keys(t.vars).length); console.log('colors:', Object.keys(t.colors).length);"
```

Expected output:

```
name: loopeng-dark
vars: 25
colors: 51
```

- [ ] **Step 5: Verify visually via Pi `/reload`**

In Pi, run `/settings`, choose `loopeng-dark`, and confirm the TUI colors load without errors.

---

## Task 2: Set `loopeng-dark` as the default theme

**Files:**
- Modify: `~/.pi/agent/settings.json`

**Interfaces:**
- Consumes: `loopeng-dark.json` from Task 1
- Produces: updated settings with `"theme": "loopeng-dark"`

- [ ] **Step 1: Read current settings**

```bash
cat ~/.pi/agent/settings.json
```

- [ ] **Step 2: Add or update the theme field**

Ensure the top-level JSON object contains `"theme": "loopeng-dark"`. Preserve all other keys.

- [ ] **Step 3: Validate**

```bash
node -e "const s=require(process.env.HOME+'/.pi/agent/settings.json'); console.log(s.theme);"
```

Expected output:

```
loopeng-dark
```

---

## Task 3: Rewrite the footer extension

**Files:**
- Modify: `~/.pi/agent/extensions/footer.ts`

**Interfaces:**
- Consumes: `loopeng-dark` theme tokens (`accent`, `warning`, `success`, `text`, `muted`, `dim`, `error`, `thinking*`)
- Produces: four-line footer string array from `render(width)`

- [ ] **Step 1: Rewrite `~/.pi/agent/extensions/footer.ts`**

Replace the file contents with:

```typescript
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  pi.on("session_start", (_event, ctx) => {
    ctx.ui.setFooter((tui, theme, footerData) => {
      const unsub = footerData.onBranchChange(() => tui.requestRender());

      return {
        dispose: unsub,
        invalidate() {},
        render(_width: number): string[] {
          const dim = (s: string) => theme.fg("dim", s);
          const muted = (s: string) => theme.fg("muted", s);
          const text = (s: string) => theme.fg("text", s);
          const accent = (s: string) => theme.fg("accent", s);
          const warning = (s: string) => theme.fg("warning", s);
          const success = (s: string) => theme.fg("success", s);
          const error = (s: string) => theme.fg("error", s);

          const branchName = footerData.getGitBranch() || "no-git";
          const modelId = ctx.model?.id || "no-model";
          const thinkingLevel = pi.getThinkingLevel();
          const activeToolCount = pi.getActiveTools().length;

          const branch = ctx.sessionManager.getBranch();
          let input = 0;
          let output = 0;
          let cacheRead = 0;
          let cacheWrite = 0;
          let cost = 0;
          let userTurns = 0;
          let assistantTurns = 0;

          for (const e of branch) {
            if (e.type === "message") {
              const m = e.message;
              if (m.role === "assistant") {
                assistantTurns++;
                input += m.usage?.input ?? 0;
                output += m.usage?.output ?? 0;
                cacheRead += m.usage?.cacheRead ?? 0;
                cacheWrite += m.usage?.cacheWrite ?? 0;
                cost += m.usage?.cost?.total ?? 0;
              } else if (m.role === "user") {
                userTurns++;
              }
            }
          }

          const turns = Math.min(userTurns, assistantTurns);
          const fmt = (n: number) => (n < 1000 ? `${n}` : `${(n / 1000).toFixed(1)}k`);

          const ctxUsage = ctx.getContextUsage();
          const ctxPct = ctxUsage?.percent != null ? `${ctxUsage.percent.toFixed(1)}%` : "?";
          const ctxWindow = ctxUsage?.contextWindow ? `/${fmt(ctxUsage.contextWindow)}` : "";

          const cacheHitRate =
            cacheRead + cacheWrite > 0
              ? `${((cacheRead / (cacheRead + cacheWrite)) * 100).toFixed(1)}%`
              : "-";

          const costValue = cost > 0.05 ? warning(`$${cost.toFixed(3)}`) : text(`$${cost.toFixed(3)}`);

          const ctxPctStyled =
            ctxUsage && ctxUsage.percent > 85
              ? error(ctxPct)
              : ctxUsage && ctxUsage.percent > 60
                ? warning(ctxPct)
                : success(ctxPct);

          const sep = dim(" · ");

          const statuses = footerData.getExtensionStatuses();
          const statusParts: string[] = [];
          for (const [name, status] of statuses) {
            statusParts.push(`${dim(`${name}:`)}${muted(status)}`);
          }
          const statusLine = statusParts.length > 0 ? sep + statusParts.join(sep) : "";

          const line1 = `${muted("(")}${text(branchName)}${muted(")")}${sep}${text(`${turns}`)}${dim(" turn")}${sep}${text(ctx.mode === "tui" ? "tui" : ctx.mode)}${sep}${text(modelId)}`;

          const line2 = `${dim("model:")}${text(modelId)}${sep}${dim("thinking:")}${theme.fg(`thinking${thinkingLevel.charAt(0).toUpperCase() + thinkingLevel.slice(1)}` as never, thinkingLevel)}${sep}${dim("tools:")}${text(`${activeToolCount}`)}`;

          const line3 = `${dim("input:")}${text(fmt(input))}${sep}${dim("output:")}${warning(fmt(output))}${sep}${dim("cache-read:")}${accent(fmt(cacheRead))}${sep}${dim("hit:")}${success(cacheHitRate)}`;

          const line4 = `${dim("cost:")}${costValue}${sep}${dim("context:")}${ctxPctStyled}${dim(ctxWindow)}${statusLine}`;

          return [line1, line2, line3, line4];
        },
      };
    });
  });
}
```

Note: `theme.fg()` only accepts theme token names, so the thinking-level color is generated by mapping the level string to the corresponding `thinking*` token.

- [ ] **Step 2: Verify visually via Pi `/reload`**

In Pi, run `/reload`. Confirm the footer renders four lines and labels are readable.

---

## Task 4: Document the private workspace setup in loopeng docs

**Files:**
- Create: `docs/pi-workspace/2026-07-07-author-setup.md`

**Interfaces:**
- Produces: reference documentation for the author's Pi workspace configuration

- [ ] **Step 1: Create the docs directory and file**

Create `docs/pi-workspace/2026-07-07-author-setup.md` with:

```markdown
# Author's Pi Workspace Setup

This documents the private Pi workspace configuration used by the loopeng author. These files live in `~/.pi/agent/`, not in the loopeng repo.

## Files

- `~/.pi/agent/themes/loopeng-dark.json` — custom Pi theme
- `~/.pi/agent/extensions/footer.ts` — four-line footer extension
- `~/.pi/agent/settings.json` — Pi settings, including `"theme": "loopeng-dark"`

## loopeng-dark theme

Based on Pi's built-in `dark` theme with a custom palette:

- dim teal (`#56b6c2`) → `accent`
- dim dark green (`#608b4e`) → `success`
- dim orange (`#d19a66`) → `warning`
- dim red (`#cc6666`) → `error`
- warm white (`#d4d4d4`) → `text`
- dim white (`#a0a0a0`) → `muted`
- gray (`#666666`) → `dim`

## Footer layout

Four lines:

1. Session identity: branch, turns, mode, model
2. Model/runtime: model, thinking level, active tools count
3. Token flow: input, output, cache-read, cache-hit rate
4. Cost/pressure/extensions: cost, context usage, extension statuses

## Future

This setup may become a distributable Pi package when loopeng is ready to offer it to users. Until then, it is author-only configuration.
```

- [ ] **Step 2: Commit**

```bash
git add docs/pi-workspace/2026-07-07-author-setup.md
git commit -m "docs: add author pi workspace setup reference"
```

---

## Task 5: Update loopeng roadmap, progress, and next session

**Files:**
- Modify: `docs/ROADMAP.md`
- Modify: `docs/PROGRESS.md`
- Modify: `docs/NEXT_SESSION.md`

- [ ] **Step 1: Update `docs/ROADMAP.md`**

Add a note under a future milestone (e.g., v0.3 or later) that loopeng may ship a Pi package bundling the theme, footer, and other extensions. Example line:

```markdown
- Pi package: offer `loopeng-dark` theme and footer extension as an installable Pi package
```

- [ ] **Step 2: Update `docs/PROGRESS.md`**

Add a clear note that the footer/theme work is **author workspace polish**, not a loopeng product phase. Do not inflate the phase list.

- [ ] **Step 3: Update `docs/NEXT_SESSION.md`**

Correct the framing: the footer/theme work is done as private config. The next loopeng product work remains Phase 1.85c (doc system overhaul), plus the session-logger dogfood gate verification.

- [ ] **Step 4: Commit**

```bash
git add docs/ROADMAP.md docs/PROGRESS.md docs/NEXT_SESSION.md
git commit -m "docs: update roadmap, progress, and handoff for pi workspace footer/theme"
```

---

## Task 6: Manual TUI verification

**Files:**
- None

- [ ] **Step 1: Reload Pi**

Run `/reload` in Pi.

- [ ] **Step 2: Confirm theme loads**

Check that the editor border, messages, and tools use the new palette.

- [ ] **Step 3: Confirm footer layout**

The footer should show four lines with clear labels and values.

- [ ] **Step 4: Confirm readability**

Check that labels recede, values pop, and threshold colors for cost/context are correct.

---

## Note on Testing

No automated tests are planned for this task. The deliverable is private Pi user configuration whose primary correctness criteria are visual readability and semantic accuracy of labels (e.g., `cache-read` not `reasoning`). These are verified manually in the Pi TUI.

---

## Self-Review Checklist

- [ ] No files created or modified in `~/Projects/loopeng` other than docs.
- [ ] Theme defines all 51 Pi tokens.
- [ ] Footer uses only semantic theme tokens.
- [ ] `cache-read` is labeled correctly, not reasoning.
- [ ] `settings.json` is updated.
- [ ] Docs explain the private/public split.
- [ ] ROADMAP notes future Pi package formalization.
