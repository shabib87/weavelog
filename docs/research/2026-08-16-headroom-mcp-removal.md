---
date: 2026-08-16
topic: Headroom MCP server removed from opencode.jsonc (YAGNI decision)
status: decided
sources:
  - "~/.agents/docs/research/2026-08-15-headroom-sdk-utilization.md"
  - "~/.agents/docs/research/2026-08-15-headroom-savings-diagnosis.md"
  - "~/.agents/docs/plans/2026-08-15-headroom-fix-plan.md"
  - "~/.agents/AGENT-STACK-RUNBOOK.md"
  - "cross-model review: qwen/qwen3.8-2.4t-a95b + moonshotai/kimi-k3 (both APPROVE-WITH-FIXES)"
models_used_for_research: [z-ai/glm-5.2, qwen/qwen3.8-2.4t-a95b, moonshotai/kimi-k3]
supersedes: none
review_rounds: 2
reviewer_corrections_applied:
  - "qwen3.8: confirm pricing fix (sync-model-pricing.ts + LITELLM_LOCAL_MODEL_COST_MAP + HEADROOM_MODEL_ALIAS_MAP) lives entirely in proxy/plist layer; zero MCP dependency — delete MCP block, do not just disable"
  - "kimi-k3: strict YAGNI — prefer full deletion over `enabled: false`; this decision doc is the sole canonical restore source (live config is not git-tracked, runbook template carries only a removal note)"
  - "both reviewers: MCP tool schemas sit in the frozen prefix and are never compressed (tool_schema_tokens_saved: 0 per savings-diagnosis Finding 1); keeping the MCP server taxes every request"
  - "round 2 (both): backup live opencode.jsonc before edit, validate JSONC after, document rollback; paste exact deleted block verbatim rather than reconstructed"
---

# Headroom MCP server removed from opencode.jsonc (YAGNI)

- **Decision date**: 2026-08-16
- **Status**: approved — pending live edit (docs + runbook committed; live `opencode.jsonc` edit deferred — backup, JSONC validation, and rollback procedure required, see Verification)
- **Related**: [[2026-08-15-headroom-sdk-utilization.md]], [[2026-08-15-headroom-savings-diagnosis.md]], [[2026-08-15-headroom-fix-plan.md]]

## Decision

Delete the `headroom` MCP server block from `opencode.jsonc` entirely — not
`enabled: false`, full removal. The runbook template in `AGENT-STACK-RUNBOOK.md`
is updated in the same change so a fresh-Mac rebuild does not re-enable it.

## Rationale

1. **Proxy already compresses all traffic.** The headroom proxy (launchd,
   `com.headroom.proxy`, port 8788, `--mode cache`) intercepts every LLM
   request from opencode and compresses it transparently. The MCP server is
   not in that path and adds no compression.
2. **MCP tool schemas tax every request.** The three tool schemas
   (`headroom_compress`, `headroom_retrieve`, `headroom_stats`) sit in the
   frozen prefix of every request and are never compressed
   (`tool_schema_tokens_saved: 0` — see `2026-08-15-headroom-savings-diagnosis.md`
   Finding 1). Estimated cost: ~0.5–1K tokens per request (3 schemas against
   ~78.5K avg tokens/request at capture time). Not precisely quantified — a
   `prefix-diff.ts` measurement before the live edit would yield an exact
   number, but the order of magnitude is enough to justify removal given the
   tools are unused.
3. **Empirically unused.** Live stats captured before deletion (proxy
   uptime ~16h 30m, 906 requests):
   `mcp: {compressions: 1, tokens_removed: 0, retrievals: 4}`. The single
   compression was a no-op. The 4 retrievals were manual diagnostic calls
   during the 2026-08-16 session that produced this decision — no agent or
   script consumes `headroom_compress` / `headroom_retrieve` / `headroom_stats`
   (grep-verified across `~/.agents/bin/`, `~/.agents/AGENT-STACK-RUNBOOK.md`,
   `~/.config/opencode/agents/`, and `~/.config/opencode/opencode.jsonc`
   permission rules: zero callers).
4. **Scripts cannot use MCP anyway.** MCP is JSON-RPC over stdio for agent
   hosts. The only documented future use (Phase 5 inter-agent compression)
   is handled by scripts calling `POST /v1/compress` via `fetch()` — scripts
   already do this per the scripting standard and the `headroom-compress.ts`
   helper.
5. **Pricing fix is orthogonal.** The pricing bridge
   (`sync-model-pricing.ts` + `LITELLM_LOCAL_MODEL_COST_MAP=true` +
   `HEADROOM_MODEL_ALIAS_MAP`) lives entirely in the proxy / launchd plist
   layer. It has zero dependency on the MCP server.

## Review verdicts

| Reviewer | Verdict | Key correction |
|---|---|---|
| qwen/qwen3.8-2.4t-a95b | APPROVE-WITH-FIXES | Confirm pricing fix has zero MCP dependency — delete, do not disable |
| moonshotai/kimi-k3 | APPROVE-WITH-FIXES | Strict YAGNI — full deletion, re-add from git history if Phase 5 fires |

Both reviewers confirmed the pricing bridge is untouched by MCP removal.

## What was NOT changed

- **Headroom proxy** (launchd `com.headroom.proxy`, port 8788, `--mode cache`)
  — untouched. Compression of all LLM traffic continues unchanged.
- **Pricing bridge** (`sync-model-pricing.ts` + plist env vars) — untouched.
- **CCR store** (`~/.headroom/ccr_store.db`) — untouched; still available to
  scripts via `/v1/compress` with `config.mode="ccr"`.
- **`headroom-compress.ts` helper** — untouched; scripts still call
  `/v1/compress` via `fetch()`.

## Re-enable path (if ever needed)

If the Phase 5 trigger fires AND MCP is judged better than scripts calling
`/v1/compress` via `fetch()`:

1. Re-add the block below to `opencode.jsonc` (this doc is the single
   canonical restore source — the runbook template carries only a removal
   note, and the live config is not git-tracked).
2. Restart opencode.
3. Verify `headroom mcp serve` starts and the three tools appear.

**Canonical restore block:**

```jsonc
"headroom": {
  "type": "local",
  "command": ["{env:HOME}/.local/bin/headroom", "mcp", "serve"],
  "enabled": true
}
```

**Trigger that would warrant re-evaluation**: Phase 5 inter-agent
compression trigger fires (conductor subagent dispatch >5K tokens per
handoff) AND a measured benefit threshold is met (re-evaluate with a
measured baseline at that time — e.g., MCP-based compress+retrieve produces
fewer handoff tokens than scripts calling `/v1/compress`, or lower latency).

## Verification

### Live edit procedure (required before status → "decided")

1. **Backup**: `cp ~/.config/opencode/opencode.jsonc ~/.config/opencode/opencode.jsonc.bak.$(date +%Y%m%d)`
2. **Record exact deleted block**: paste the verbatim bytes removed from the live config into this doc (replace the reconstructed block in the Re-enable path above if different).
3. **Delete** the `headroom` MCP block from `opencode.jsonc`.
4. **Also check**: if any `headroom_*` permission rules exist in `opencode.jsonc`, remove them (grep-verified: none exist at decision time, but check again at edit time).
5. **Validate JSONC**: open opencode (or run a JSONC linter) to confirm the file parses — one trailing comma breaks opencode entirely.
6. **Restart opencode**, check startup logs for errors.
7. **Verify tools absent**: confirm `headroom_compress` / `headroom_retrieve` / `headroom_stats` no longer appear in the tool list.
8. **Verify proxy health** (unchanged, separate process):
   - `launchctl print gui/$(id -u)/com.headroom.proxy | grep state` → `running`
   - `curl -sS http://localhost:8788/health` → 200
   - `curl -sS http://localhost:8788/stats | jq '.totals.requests'` → still incrementing
9. **Rollback** (if step 5-7 fail): `cp ~/.config/opencode/opencode.jsonc.bak.<date> ~/.config/opencode/opencode.jsonc`, restart opencode.

### After verification passes

- Update this doc's status → `decided`
- Merge `disable-headroom-mcp` branch → `main`

## References

- `docs/research/2026-08-15-headroom-savings-diagnosis.md` — Finding 1
  (tool schemas never compressed, `tool_schema_tokens_saved: 0`).
- `docs/research/2026-08-15-headroom-sdk-utilization.md` — §2 Active
  integrations, §8 integration modes table (both updated to "Removed").
- `docs/plans/2026-08-15-headroom-fix-plan.md` — Phase 5a precondition
  step 0 added (re-add MCP before evaluating it).
- `AGENT-STACK-RUNBOOK.md` — opencode.jsonc template (headroom block
  removed + note), prose (MCP REMOVED), Prune rules (re-add backlog row).
