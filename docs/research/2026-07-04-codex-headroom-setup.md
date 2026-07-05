# Codex CLI Update + Headroom Persistence Plan

> **For agentic workers:** Execute inline in this session.

**Goal:** Reinstall Codex CLI via official method, wire it through Headroom to OpenRouter, and make Headroom survive restarts for codex, pi, and claude.

**Architecture:** Codex → Headroom proxy (launchd, port 8787) → OpenRouter API. Claude/Pi → same Headroom proxy → OpenRouter. All config preserved in `~/.codex/config.toml`.

**Tech Stack:** Codex CLI (Rust binary), Headroom v0.27.0 (pipx), launchd (macOS), OpenRouter API

## Global Constraints

- MUST NOT use OpenAI desktop app or OpenAI models directly
- MUST preserve OpenRouter API key and profiles in `~/.codex/config.toml`
- MUST use headroom-wrapped codex (durable init hooks)
- MUST make headroom survive restart via launchd
- MUST NOT run package managers without explicit human approval (per AGENTS.md)

---

## Current State

| Component | Status |
|-----------|--------|
| Codex CLI binary | ❌ Not installed (brew cask removed) |
| `~/.codex/config.toml` | ✅ Preserved with OpenRouter + 8 profiles |
| Headroom proxy | ⚠️ Running manually on port 8788 (won't survive restart) |
| Headroom deployment `init-loopeng-06391025` | ❌ Stopped, no supervisor |
| `headroom init codex` / `headroom init claude` | Previously run but config.toml not yet routed |

---

## What `headroom init` Does to Your Config

Running `headroom init codex -g --backend openrouter` will:

1. Add to `~/.codex/config.toml`:
   ```toml
   # --- Headroom init provider ---
   model_provider = "headroom"
   openai_base_url = "http://127.0.0.1:8787/v1"

   [model_providers.headroom]
   name = "Headroom init proxy"
   base_url = "http://127.0.0.1:8787/v1"
   supports_websockets = true
   # --- end Headroom init provider ---
   ```
2. Enable `hooks = true` in `[features]`
3. Create `~/.codex/hooks.json` for SessionStart/PreToolUse hooks
4. Register headroom MCP server in config.toml

Your existing profiles remain untouched and will still work — they specify models that Headroom will forward to OpenRouter. *(Note: as of codex 0.134.0+, profiles use per-file `~/.codex/<name>.config.toml` overlay format, not the old `[profiles.<name>]` inline format in `config.toml`. See `~/.pi/agent/models.md` for the current team.)*

---

### Task 1: Install Codex CLI (Official Method)

**Files:** None (binary install)

- [ ] **Step 1: Install via official curl script**

OpenAI's primary recommended method:
```bash
curl -fsSL https://chatgpt.com/codex/install.sh | sh
```

- [ ] **Step 2: Verify installation**

```bash
codex --version
```
Expected: `codex 0.142.5` (or newer)

- [ ] **Step 3: Verify config.toml is intact**

```bash
codex status
```
Expected: Should show your OpenRouter provider and profiles. If it errors about model_provider, that's expected — we haven't set up headroom routing yet.

---

### Task 2: Stop Current Manual Headroom Proxy

**Files:** None (process management)

- [ ] **Step 1: Stop the manually-started proxy on port 8788**

```bash
kill 86791
```

- [ ] **Step 2: Verify it's stopped**

```bash
curl -s http://127.0.0.1:8788/health || echo "stopped (expected)"
```
Expected: `stopped (expected)`

---

### Task 3: Remove Broken Headroom Deployment

**Files:** `~/.headroom/` (state directory)

- [ ] **Step 1: Remove the broken deployment**

```bash
headroom install remove --profile init-loopeng-06391025
```
If this errors because the deployment is already broken, manually remove the manifest:
```bash
rm -f ~/.headroom/manifests/init-loopeng-06391025.json
```

---

### Task 4: Run `headroom init` for Codex and Claude with OpenRouter Backend

**Files:**
- Modify: `~/.codex/config.toml` (adds headroom provider block)
- Create: `~/.codex/hooks.json` (hook scripts)
- Modify: `~/.claude/settings.json` (sets ANTHROPIC_BASE_URL, ENABLE_TOOL_SEARCH)

- [ ] **Step 1: Init codex with openrouter backend**

```bash
headroom init codex -g --backend openrouter --port 8787
```
This will:
- Add the headroom provider block to `~/.codex/config.toml`
- Create hooks for codex
- Register headroom MCP server
- Start a detached headroom proxy on port 8787 with openrouter backend

- [ ] **Step 2: Init claude with openrouter backend**

```bash
headroom init claude -g --backend openrouter --port 8787
```
This will:
- Set `ANTHROPIC_BASE_URL=http://127.0.0.1:8787` in `~/.claude/settings.json`
- Add Claude Code hooks
- Reuse the same proxy (port 8787)

- [ ] **Step 3: Verify config.toml was modified correctly**

```bash
grep -A 8 "Headroom init provider" ~/.codex/config.toml
```
Expected: Should show the headroom provider block with `base_url = "http://127.0.0.1:8787/v1"`

- [ ] **Step 4: Verify the proxy is running on port 8787**

```bash
curl -s http://127.0.0.1:8787/health | python3 -c "import json,sys; d=json.load(sys.stdin); print(f'status={d[\"status\"]}, backend={d[\"config\"][\"backend\"]}, port={d[\"config\"].get(\"port\",8787)}')"
```
Expected: `status=healthy, backend=openrouter`

---

### Task 5: Create launchd Plist for Headroom to Survive Restart

**Files:**
- Create: `~/Library/LaunchAgents/com.headroom.proxy.plist`

The `headroom init` command starts a detached process but without a supervisor. We need launchd to start it at login and keep it alive.

- [ ] **Step 1: Stop the init-managed detached proxy**

```bash
# The init system uses a task-based process. Find and stop it.
pkill -f "headroom proxy.*8787" || true
sleep 2
curl -s http://127.0.0.1:8787/health || echo "stopped (expected)"
```
Expected: `stopped (expected)`

- [ ] **Step 2: Create the launchd plist**

Create `~/Library/LaunchAgents/com.headroom.proxy.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.headroom.proxy</string>

    <key>ProgramArguments</key>
    <array>
        <string>~/.local/bin/headroom</string>
        <string>proxy</string>
        <string>--host</string>
        <string>127.0.0.1</string>
        <string>--port</string>
        <string>8787</string>
        <string>--backend</string>
        <string>openrouter</string>
        <string>--mode</string>
        <string>token</string>
    </array>

    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:~/.local/bin</string>
        <key>HOME</key>
        <string>~</string>
    </dict>

    <key>RunAtLoad</key>
    <true/>

    <key>KeepAlive</key>
    <true/>

    <key>StandardOutPath</key>
    <string>~/.headroom/proxy-launchd.log</string>

    <key>StandardErrorPath</key>
    <string>~/.headroom/proxy-launchd.log</string>

    <key>ProcessType</key>
    <string>Interactive</string>
</dict>
</plist>
```

- [ ] **Step 3: Load the launchd plist**

```bash
launchctl load ~/Library/LaunchAgents/com.headroom.proxy.plist
```

- [ ] **Step 4: Verify headroom proxy is running via launchd**

```bash
sleep 3
curl -s http://127.0.0.1:8787/health | python3 -c "import json,sys; d=json.load(sys.stdin); print(f'status={d[\"status\"]}, uptime={d[\"uptime_seconds\"]}s')"
```
Expected: `status=healthy, uptime=<low number>s`

- [ ] **Step 5: Verify it survives a test restart**

```bash
launchctl unload ~/Library/LaunchAgents/com.headroom.proxy.plist
sleep 2
curl -s http://127.0.0.1:8787/health || echo "stopped"
launchctl load ~/Library/LaunchAgents/com.headroom.proxy.plist
sleep 3
curl -s http://127.0.0.1:8787/health | python3 -c "import json,sys; d=json.load(sys.stdin); print(f'status={d[\"status\"]}')"
```
Expected: Shows `stopped` then `status=healthy`

---

### Task 6: Configure Pi to Route Through Headroom

**Files:** Shell config (your dotfiles)

Pi uses the same Anthropic API as Claude Code. The `headroom init claude` step already sets `ANTHROPIC_BASE_URL` in `~/.claude/settings.json`, but pi may not read that file. We need to ensure the env var is set in your shell.

- [ ] **Step 1: Check current ANTHROPIC_BASE_URL**

```bash
echo $ANTHROPIC_BASE_URL
```
Expected: Probably points to `https://openrouter.ai/api/v1`

- [ ] **Step 2: Add to shell rc file**

Add to `~/.zshrc` (or your primary shell rc):
```bash
# Headroom proxy routing for Claude/Pi
export ANTHROPIC_BASE_URL="http://127.0.0.1:8787"
export ENABLE_TOOL_SEARCH="true"
```

This ensures pi and claude always route through the headroom proxy. The proxy will forward to OpenRouter based on the `--backend openrouter` flag.

- [ ] **Step 3: Reload shell**

```bash
source ~/.zshrc
echo $ANTHROPIC_BASE_URL
```
Expected: `http://127.0.0.1:8787`

---

### Task 7: End-to-End Verification

**Files:** None

- [ ] **Step 1: Verify codex works through headroom**

```bash
HEADROOM_OUTPUT_SHAPER=off codex status
```
Expected: Should show model provider as "headroom" or similar, and list your profiles

- [ ] **Step 2: Verify headroom doctor is clean**

```bash
headroom doctor
```
Expected: All checks pass or show green. At minimum:
- proxy: ✓ pass
- codex: ✓ routed
- claude: ✓ routed
- deployments: ✓ running

- [ ] **Step 3: Verify the old port 8788 proxy is gone**

```bash
curl -s http://127.0.0.1:8788/health || echo "not running (expected)"
```
Expected: `not running (expected)`

- [ ] **Step 4: Check launchd is managing the proxy**

```bash
launchctl list | grep headroom
```
Expected: Shows `com.headroom.proxy` with PID and exit code 0

---

## Notes

- **Config.toml profiles**: Profiles live in per-file `~/.codex/<name>.config.toml` (codex 0.134.0+ overlay format), layered onto `~/.codex/config.toml` via `codex -p <name>`. They work because `model_provider = "headroom"` routes all API calls through the proxy, which forwards to OpenRouter. See `~/.pi/agent/models.md` for the current profile team.

- **Reverting**: To undo headroom routing, run `headroom init` with no targets again (it won't clean up), or manually remove the `# --- Headroom init provider ---` block from config.toml and restore `model_provider = "openrouter"`.

- **Port 8788**: The old manual proxy on port 8788 has been replaced by the launchd-managed one on port 8787.

- **headroom init hooks vs launchd**: The `headroom init` hooks (`~/.codex/hooks.json`) will try to ensure the proxy is running on each session start. Since launchd keeps it running, these hooks become no-ops — they detect the running proxy and return immediately.
