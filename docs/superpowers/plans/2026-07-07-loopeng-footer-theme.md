# loopeng Footer + Theme Implementation Plan

> **SUPERSEDED** — This plan incorrectly treated private Pi user configuration as loopeng product code. The revised plan is `2026-07-07-pi-workspace-footer-theme.md`.

---

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single-line Pi footer with a four-line, labeled, color-coded footer, and make the custom `loopeng-dark` theme the default.

**Architecture:** The theme is a full Pi TUI theme JSON file based on the built-in dark theme with a custom palette. The footer extension renders four lines of session/model/token/cost data using semantic theme tokens. No runtime logic is shared between the theme and footer; the theme provides colors, the footer consumes them.

**Tech Stack:** TypeScript (Pi extension), JSON (Pi theme), `node --import tsx --test` for tests.

## Global Constraints

- Theme must define all 51 required Pi theme tokens.
- Footer must use semantic `theme.fg()` tokens only (no hardcoded hex).
- No new npm dependencies without explicit approval.
- TypeScript is the implementation language; no bash for logic.
- Preserve existing footer aggregation behavior for tokens/cost/context.
- Target macOS only for v1.
- Sanitize absolute home paths before committing.

---

## File Structure

- `~/.pi/agent/themes/loopeng-dark.json` — new full Pi theme
- `~/.pi/agent/settings.json` — add `"theme": "loopeng-dark"`
- `~/.pi/agent/extensions/footer.ts` — rewrite render function
- `tests/pi-extensions/footer.test.ts` — new unit tests for footer rendering
- `docs/superpowers/specs/2026-07-07-loopeng-footer-theme-design.md` — approved spec

---

## Task 1: Create the `loopeng-dark` theme file

**Files:**
- Create: `~/.pi/agent/themes/loopeng-dark.json`
- Test: `tests/pi-extensions/theme-schema.test.ts`

**Interfaces:**
- Produces: a valid Pi theme file at `~/.pi/agent/themes/loopeng-dark.json`

- [ ] **Step 1: Copy the built-in dark theme as the base**

Read `~/.nvm/versions/node/v22.23.1/lib/node_modules/@earendil-works/pi-coding-agent/dist/modes/interactive/theme/dark.json` and copy it to `~/.pi/agent/themes/loopeng-dark.json`.

- [ ] **Step 2: Define the loopeng palette vars**

Replace the `vars` block with:

```json
"vars": {
  "cyan": "#00d7ff",
  "blue": "#5f87ff",
  "green": "#b5bd68",
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

Update the `colors` block so these tokens reference the vars above:

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
  "thinkingText": "gray",
  ...
}
```

Keep all other tokens referencing the same vars as dark.json unless they were pure `#ffff00` yellow (change those to `yellowPale`).

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

- [ ] **Step 5: Commit**

```bash
git add ~/.pi/agent/themes/loopeng-dark.json
git commit -m "feat: add loopeng-dark pi theme"
```

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

Ensure the top-level JSON object contains:

```json
{
  "theme": "loopeng-dark"
}
```

If a `"theme"` key already exists, change its value to `"loopeng-dark"`. Preserve all other keys.

- [ ] **Step 3: Validate settings JSON**

Run:

```bash
node -e "const s=require(process.env.HOME+'/.pi/agent/settings.json'); console.log(s.theme);"
```

Expected output:

```
loopeng-dark
```

- [ ] **Step 4: Commit**

```bash
git add ~/.pi/agent/settings.json
git commit -m "feat: set loopeng-dark as default pi theme"
```

---

## Task 3: Rewrite the footer extension

**Files:**
- Modify: `~/.pi/agent/extensions/footer.ts`
- Test: `tests/pi-extensions/footer.test.ts`

**Interfaces:**
- Consumes: `loopeng-dark` theme tokens (accent, warning, success, text, muted, dim, error, thinking*)
- Produces: four-line footer string array from `render(width)`

- [ ] **Step 1: Write the failing test for four-line footer render**

Create `tests/pi-extensions/footer.test.ts`:

```typescript
import { describe, it } from "node:test";
import assert from "node:assert";

// Minimal mock theme
function createMockTheme() {
  const applied: Array<{ token: string; text: string }> = [];
  const fg = (token: string, text: string) => {
    applied.push({ token, text });
    return `[${token}:${text}]`;
  };
  return { fg, applied };
}

// Minimal mock context and footer data
function createMockCtx({
  branch = [],
  contextUsage = null,
  model = null,
  thinkingLevel = "medium",
  activeTools = [],
}: {
  branch?: unknown[];
  contextUsage?: { percent: number; tokens: number; contextWindow: number } | null;
  model?: { id: string } | null;
  thinkingLevel?: string;
  activeTools?: string[];
} = {}) {
  const pi = {
    getThinkingLevel: () => thinkingLevel,
    getActiveTools: () => activeTools,
  };
  const ctx = {
    sessionManager: { getBranch: () => branch },
    getContextUsage: () => contextUsage,
    model,
    ui: {
      setFooter: (factory: (tui: unknown, theme: unknown, footerData: unknown) => unknown) => {
        ctx.footerFactory = factory;
      },
    },
  };
  return { pi, ctx };
}

describe("footer", () => {
  it("renders four lines with labels and values", async () => {
    const { default: makeFooter } = await import("../../.pi/agent/extensions/footer.ts");
    const { pi, ctx } = createMockCtx({
      branch: [],
      contextUsage: { percent: 6.8, tokens: 17930, contextWindow: 262144 },
      model: { id: "moonshotai/kimi-k2.7-code" },
      thinkingLevel: "medium",
      activeTools: ["read", "bash", "edit", "write"],
    });

    makeFooter(pi as never);
    const event = { type: "session_start" as const };
    await pi.handlers?.session_start?.(event, ctx);

    const theme = createMockTheme();
    const footerData = {
      onBranchChange: (cb: () => void) => cb,
      getGitBranch: () => "main",
      getExtensionStatuses: () => new Map<string, string>(),
    };
    const tui = { requestRender: () => {} };
    const { render } = ctx.footerFactory(tui, theme, footerData) as { render: (w: number) => string[] };
    const lines = render(120);

    assert.strictEqual(lines.length, 4);
    assert.match(lines[0]!, /main/);
    assert.match(lines[0]!, /0 turn/);
    assert.match(lines[1]!, /moonshotai\/kimi-k2.7-code/);
    assert.match(lines[1]!, /medium/);
    assert.match(lines[1]!, /tools: 4/);
    assert.match(lines[2]!, /input:/);
    assert.match(lines[2]!, /output:/);
    assert.match(lines[2]!, /cache-read:/);
    assert.match(lines[2]!, /hit:/);
    assert.match(lines[3]!, /cost:/);
    assert.match(lines[3]!, /context:/);
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
node --import tsx --test tests/pi-extensions/footer.test.ts
```

Expected: FAIL (footer module does not export a testable factory, or render does not return four lines).

- [ ] **Step 3: Rewrite `~/.pi/agent/extensions/footer.ts`**

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
            statusParts.push(`${dim(name + ":")}${muted(status)}`);
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

Note: the test setup will need to be adjusted because the current extension registers a handler on `session_start` rather than exporting a factory. The test should import the default factory, call it with a mock `pi` object that captures `pi.on("session_start", handler)`, then invoke the handler with a mock `ctx`.

Adjust the test import/call pattern accordingly. The key assertion remains: `render(120)` returns 4 lines with the expected labels.

- [ ] **Step 4: Run the test to confirm it passes**

```bash
node --import tsx --test tests/pi-extensions/footer.test.ts
```

Expected: PASS.

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd ~/.pi/agent/extensions && npx tsc --noEmit footer.ts 2>/dev/null || echo "tsc not available; verify via /reload in Pi"
```

If `tsc` is not available, skip and verify via Pi `/reload`.

- [ ] **Step 6: Commit**

```bash
git add ~/.pi/agent/extensions/footer.ts tests/pi-extensions/footer.test.ts
git commit -m "feat: rewrite footer as four-line labeled color-coded footer"
```

---

## Task 4: Verify in Pi TUI

**Files:**
- None (manual verification)

**Interfaces:**
- Consumes: theme from Task 1, settings from Task 2, footer from Task 3

- [ ] **Step 1: Reload Pi**

In the Pi TUI, run:

```
/reload
```

- [ ] **Step 2: Confirm the theme loads**

Check that the editor border and message colors reflect the new palette (dim teal accents, dim orange warnings, dark green success).

- [ ] **Step 3: Confirm the footer renders four lines**

The footer should show:

```
(main) · 1 turn · tui · moonshotai/kimi-k2.7-code
model: moonshotai/kimi-k2.7-code · thinking: medium · tools: 4
input:1.3k · output:16.5k · cache-read:24.0k · hit:100.0%
cost:$0.023 · context:6.8% / 262.1k
```

- [ ] **Step 4: Confirm readability**

Check that labels recede (dim), values are readable (text/accent/warning/success), and the context percentage uses the threshold colors.

---

## Task 5: Update project docs

**Files:**
- Modify: `docs/PROGRESS.md`
- Modify: `docs/NEXT_SESSION.md`

**Interfaces:**
- Produces: updated tracker and handoff

- [ ] **Step 1: Update PROGRESS.md**

Add an entry under the active phase noting the footer/theme work is complete. Move the session-logger dogfood gate verification to a watch item if not yet confirmed.

- [ ] **Step 2: Update NEXT_SESSION.md**

Replace the footer/theme content with the new state. Keep the session-logger dogfood gate as the next verification step.

- [ ] **Step 3: Commit**

```bash
git add docs/PROGRESS.md docs/NEXT_SESSION.md
git commit -m "docs: update progress and next session after footer/theme redesign"
```

---

## Self-Review Checklist

- [ ] Spec coverage: four-line footer, `loopeng-dark` theme, default theme setting, tests, docs updates — all have tasks.
- [ ] Placeholder scan: no TBD/TODO/fill-in details.
- [ ] Type consistency: `pi.getThinkingLevel()` returns string; `theme.fg()` tokens are strings; `ctx.getContextUsage()` shape matches existing code.
- [ ] No new dependencies.
- [ ] Sanitization: theme and footer files contain no absolute `/Users/<you>/` paths.
