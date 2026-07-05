# Pi TUI Footer & Session API Research

> **Date:** 2026-07-05
> **Status:** Active. Findings used in `~/.pi/agent/extensions/footer.ts` and `session-logger.ts`.
> **Cross-ref:** `docs/learnings/2026-07-05-session-logger-derailment.md` (how this was built — post-mortem)

## Purpose

This session started as research into Pi's terminal UI footer API. The user
wanted to display turn counts, token usage, cost, and context info in the Pi
status bar — all left-aligned. This doc captures the API surface discovered.

---

## Footer API (`ctx.ui.setFooter()`)

The primary API for customizing Pi's status bar footer.

```typescript
ctx.ui.setFooter((tui, theme, footerData) => {
  // footerData: FooterDataProvider
  return {
    render(width: number): string[] {
      // Return lines of text. Each line must not exceed width.
      return [`my footer content`];
    },
    invalidate(): void {
      // Clear cached state. Called on theme changes.
    },
    dispose?: () => void;
  };
});
```

### `FooterDataProvider` (available in footer callback only)

Exposes data not available on the raw `ExtensionContext`:

| Method | Returns | Description |
|---|---|---|
| `getGitBranch()` | `string \| null` | Current git branch, null if not in repo, "detached" if detached HEAD |
| `getExtensionStatuses()` | `ReadonlyMap<string, string>` | Status texts set via `ctx.ui.setStatus()` |
| `getAvailableProviderCount()` | `number` | Unique providers with available models |
| `onBranchChange(callback)` | `() => void` | Subscribe to git branch changes. Returns unsubscribe. |

### Color helpers (`theme`)

Available on the theme object passed to the footer callback:

```typescript
theme.fg("dim", text)     // Muted/dim text
theme.fg("accent", text)  // Accent color
theme.fg("success", text) // Green
theme.fg("warning", text) // Yellow
theme.fg("error", text)   // Red
theme.fg("muted", text)   // Low-contrast
```

---

## Data Access Patterns

### From `ctx.model`

| Property | Returns |
|---|---|
| `ctx.model?.id` | Full model ID (e.g., `z-ai/glm-5.2`) |
| `ctx.model?.provider` | Provider name (e.g., `openrouter`) |
| `ctx.model?.contextWindow` | Max context window in tokens |

### From `ctx.sessionManager.getBranch()`

Returns `SessionEntry[]` — the full session history from root to current leaf.
Iterate to compute aggregates:

```typescript
for (const e of branch) {
  if (e.type === "message") {
    const m = e.message;
    if (m.role === "assistant") {
      // m.usage.input, m.usage.output
      // m.usage.cacheRead, m.usage.cacheWrite
      // m.usage.cost.total
      // m.usage.reasoning (thinking tokens, when reported)
      // m.content — array of TextContent | ThinkingContent | ToolCall
      //   filter by c.type === "toolCall" to count tool calls
    } else if (m.role === "user") {
      // Count for turn tally
    }
  }
}
```

### From `ctx.getContextUsage()`

Returns `ContextUsage | undefined`:

```typescript
interface ContextUsage {
  tokens: number | null;       // Estimated context tokens, null if unknown
  contextWindow: number;        // Model's max context window
  percent: number | null;       // Usage as percentage of context window
}
```

Only available after at least one LLM response (context usage is computed
after a model call).

---

## Session Events

| Event | Handler | Use case |
|---|---|---|
| `session_start` | `ExtensionHandler<SessionStartEvent>` | Initialize on session begin. Register UI components. |
| `session_shutdown` | `ExtensionHandler<SessionShutdownEvent>` | Log/write stats on session end. |
| `message_end` | `ExtensionHandler<MessageEndEvent>` | Track per-message cost. |
| `turn_end` | `ExtensionHandler<TurnEndEvent>` | Track per-turn progress. |

The `session_shutdown` event provides:
```typescript
interface SessionShutdownEvent {
  type: "session_shutdown";
  reason: "quit" | "reload" | "new" | "resume" | "fork";
  targetSessionFile?: string;
}
```

At shutdown, `ctx.sessionManager.getBranch()` is still available with the
full session data. However, `FooterDataProvider` methods (like `getGitBranch()`)
are NOT available from the raw `ExtensionContext` at shutdown — they are
footer-callback only.

---

## Limitations Found

| Limitation | Impact |
|---|---|
| `getGitBranch()` not available outside footer callback | Session-logger stats omit git branch. Workaround: parse `.git/HEAD` directly. |
| `getContextUsage()` may return `undefined` | Before first LLM response, context usage is unknown. |
| `usage.reasoning` is optional | Only providers that report thinking tokens populate this field. |
| `render(width)` lines must not exceed `width` parameter | Use `truncateToWidth()` from `@earendil-works/pi-tui` to clip safely. |

---

## Artifacts Produced

| File | Purpose |
|---|---|
| `~/.pi/agent/extensions/footer.ts` | Left-aligned footer with turns, tokens, cost, context, model |
| `~/.pi/agent/extensions/session-logger.ts` | Writes `.pi/logs/<session-id>.stats.json` on session shutdown |

Enable both in `~/.pi/agent/settings.json`:
```json
{ "extensions": ["extensions/footer.ts", "extensions/session-logger.ts"] }
```