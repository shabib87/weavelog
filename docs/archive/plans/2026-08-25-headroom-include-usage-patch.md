---
date: 2026-08-25
topic: Headroom include_usage patch log — re-apply after every upgrade
status: adopted
sources:
  - "live probe output (see Verification section)"
models_used_for_research: []
supersedes: none
---

# Headroom `include_usage` Patch Log

**Date:** 2026-08-25  
**Version at time of fix:** 0.36.5  
**Status:** Active — re-apply after every headroom upgrade until upstream fixes this

---

## The bug

On headroom's OpenAI-compatible backend path (`/v1/chat/completions` with `--backend openrouter`), `stream_options.include_usage` was never injected when the client didn't specify it. Result: zero token usage recorded for all sessions.

## The fix (re-apply after `headroom update`)

**First, back up the files** (a pipx upgrade wipes site-packages, so any previous `.bak` files are gone):

```bash
V=~/.local/pipx/venvs/headroom-ai/lib/python3.13/site-packages/headroom
cp $V/backends/litellm.py $V/backends/litellm.py.bak-usage-fix
cp $V/backends/anyllm.py $V/backends/anyllm.py.bak-usage-fix
```

Two files, same pattern. From `~/.local/pipx/venvs/headroom-ai/lib/python3.13/site-packages/headroom/backends/`:

### litellm.py ~line 1544

```python
# BEFORE:
if "stream_options" in body:
    kwargs["stream_options"] = body["stream_options"]

# AFTER:
stream_options = body.get("stream_options")
if stream_options is None:
    kwargs["stream_options"] = {"include_usage": True}
elif isinstance(stream_options, dict) and "include_usage" not in stream_options:
    kwargs["stream_options"] = {**stream_options, "include_usage": True}
else:
    kwargs["stream_options"] = stream_options
```

### anyllm.py ~line 652 (identical pattern)

### After patch

```bash
launchctl kickstart -k gui/$(id -u)/com.headroom.proxy
```

## Verification probe

```bash
KEY=$(python3 -c "import json,os; print(json.load(open(os.path.expanduser('~/.local/share/opencode/auth.json')))['openrouter']['key'])")
curl -s -N --max-time 60 -X POST http://localhost:8788/v1/chat/completions \
  -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
  -d '{"model":"deepseek/deepseek-v4-flash-0731","messages":[{"role":"user","content":"Say OK"}],"stream":true,"max_tokens":5}' \
  | grep -c '"usage"'
# Expected: 1 (before fix: 0)
```

## Rollback

```bash
V=~/.local/pipx/venvs/headroom-ai/lib/python3.13/site-packages/headroom
cp $V/backends/litellm.py.bak-usage-fix $V/backends/litellm.py
cp $V/backends/anyllm.py.bak-usage-fix $V/backends/anyllm.py
launchctl kickstart -k gui/$(id -u)/com.headroom.proxy
```

## Upstream status

- **Not yet filed** — deferring; will reconsider if unfixed by ~2026-09-25
- **Related issue:** #2957 (similar symptom, different endpoint — confirms the bug class exists upstream)
- **Four-reviewer consensus** (conductor + GLM + Qwen + Deepseek): genuine headroom bug, not misconfiguration
