---
date: 2026-08-24
topic: opencode attachment handling, subagent passthrough, and enabled_providers
status: resolved
sources:
  - https://opencode.ai/docs/config
  - https://opencode.ai/docs/agents
  - https://github.com/anomalyco/opencode/blob/dev/packages/web/src/content/docs/config.mdx
  - https://github.com/anomalyco/opencode/blob/dev/packages/core/src/config/agent.ts
  - https://github.com/anomalyco/opencode/blob/dev/packages/core/src/models-dev.ts
  - https://github.com/anomalyco/opencode/blob/dev/specs/v2/config.md
models_used_for_research:
  - openrouter/z-ai/glm-5.2 (researcher)
supersedes: none
---

# opencode: image attachments, subagent passthrough, enabled_providers

## Question

A text-only conductor (`openrouter/z-ai/glm-5.2`, `input_modalities = [text]`) strips an
attached screenshot and injects the error "this model does not support image input"
*before* the image reaches a vision-capable subagent (`@vision-kimi`,
`openrouter/moonshotai/kimi-k3`, supports image input). The subagent works when given an
image directly. Is there a config to let a text-only conductor forward images to a
vision subagent without the conductor itself needing vision?

## Findings (verified from context7 docs)

### 1. How opencode handles image attachments — the `attachment` / `attachments` block

There IS a config block. Singular `attachment` in the published website schema, plural
`attachments` in the v2 spec. It has three image sub-options and ONLY those:

```json
{
  "attachment": {
    "image": {
      "auto_resize": true,
      "max_width": 2000,
      "max_height": 2000,
      "max_base64_bytes": 5242880
    }
  }
}
```

What it controls (per `config.mdx` "Image attachments" section, verified): opencode
auto-normalizes images that exceed 2000x2000 px or 5,242,880 base64 bytes. If
`auto_resize` is off and an image is oversized, it is **rejected**. If the image is still
too large after resizing, *tool-result* images are silently omitted while *user-provided*
images trigger an error. So the block governs **resizing and rejection policy only**. It
is NOT a passthrough toggle, NOT a per-agent routing directive, and NOT a
"send-to-subagent-anyway" flag. There is no `passthrough`, `forward`, `route_to`, or
`ignore_modalities` key anywhere in the schema surfaced by context7.

Source: https://opencode.ai/docs/config and
https://github.com/anomalyco/opencode/blob/dev/packages/web/src/content/docs/config.mdx
("Configure Image Attachment Limits" + "Image attachments" sections).

### 2. There is NO documented image-passthrough / forwarding config for subagents

The agent config schema (`packages/core/src/config/agent.ts`, `Info` class) exposes:
`model`, `variant`, `request`, `system`, `description`, `mode`, `hidden`, `color`,
`steps`, `disabled`, `permissions`. No attachment-routing, modality-override, or
passthrough field. The agents doc states a subagent with no `model` set inherits the
**model of the primary agent that invoked it** — implying modality validation runs
against the inherited/conductor context, consistent with the observed strip-then-error
behavior. No `@vision-kimi`-style "attachment model" override was found.

Conclusion: a config flag to forward images past a text-only conductor to a vision
subagent **does not exist** in the documented schema. Stating this plainly, not
speculating.

Sources:
- https://github.com/anomalyco/opencode/blob/dev/packages/core/src/config/agent.ts
- https://opencode.ai/docs/agents

### 3. Modality model: how "does not support image input" is decided

`packages/core/src/models-dev.ts` defines modality literals as
`["text", "audio", "image", "video", "pdf"]` for both `input` and `output` arrays on
each provider model. The conductor's model entry for `z-ai/glm-5.2` carries
`input: ["text"]` (no `image`), so when a user attaches an image opencode's attachment
normalizer sees the active model lacks image input support and emits the error before
the dispatch boundary. The error is tied to the **active model's declared input
modalities**, not to the eventual subagent's. The docs do not describe a mechanism by
which the active-model check is deferred to subagent dispatch time.

Source: https://github.com/anomalyco/opencode/blob/dev/packages/core/src/models-dev.ts

### 4. `enabled_providers` — what it does

From `config.mdx` ("Enable specific providers"): an array of provider IDs that
restricts opencode to **only** use the listed providers. Example:
`"enabled_providers": ["anthropic", "openai"]`. It is a global allowlist on provider
availability, not a per-agent or per-modality selector. It does not affect image
handling.

Note (v2 divergence): the v2 spec (`specs/v2/config.md` "Group 7") replaces both
`enabled_providers` and `disabled_providers` with `experimental.policies` using
`deny`/`allow` effects on `provider.use` actions. So `enabled_providers` is the v1 key;
v2 moves to policies. Behavior (allowlist semantics) is the same.

Sources:
- https://github.com/anomalyco/opencode/blob/dev/packages/web/src/content/docs/config.mdx
- https://github.com/anomalyco/opencode/blob/dev/specs/v2/config.md

### 5. No separate "vision model" / "attachment model" concept

No `vision_model`, `image_model`, `attachment_model`, or equivalent key appears in the
agent schema (`agent.ts`) or the global config schema surfaced by context7. Per-agent
model selection is a single `model` field (plus `variant`). There is a documented
`small_model` in v1 (used for cheap auxiliary tasks) but the v2 spec explicitly
**removes** `small_model`. Neither is described as an attachment-routing target.

Sources:
- https://github.com/anomalyco/opencode/blob/dev/packages/core/src/config/agent.ts
- https://github.com/anomalyco/opencode/blob/dev/specs/v2/config.md

## Realistic alternatives (since passthrough does not exist)

1. **Give the conductor a vision-capable model too** — set the primary/conductor
   `model` to a vision-capable entry (or a vision-capable alias of glm-5.2 if the
   provider exposes one). This is the only documented way to stop the strip-then-error,
   because the input-modalities check runs against the active model.
2. **Invoke the vision subagent without attaching the image to the conductor turn** —
   have the conductor reference the image by file path (e.g. `/tmp/shot.png`) in text,
   and let the vision subagent's own tooling (read tool) load it. The subagent must have
   `read` enabled and a model with `image` in input modalities. This sidesteps the
   conductor's attachment normalizer entirely.
3. **File an upstream feature request** for a per-agent `attachment_passthrough` or a
   "defer modality check to subagent" flag. The schema has room (the `Info` class is
   small) but no such field exists today.
4. **Patch models-dev override** — if the conductor model entry's `input_modalities`
   is wrong (i.e. glm-5.2 actually accepts images via OpenRouter but opencode's
   models-dev data says text-only), correcting that metadata would let the conductor
   accept and forward the image. This is a data fix, not a config feature, and depends
   on the provider actually forwarding images to the upstream model.

## What I did NOT check

- The actual opencode source for the error string "this model does not support image
  input" — context7 returned schema and config docs, not the runtime emission site. The
  error behavior is inferred from the documented modality-validation flow plus the
  reported symptom; the exact code path was not read.
- Whether OpenRouter's `z-ai/glm-5.2` truly rejects images upstream or whether
  opencode's models-dev metadata is simply conservative. Not verified against
  OpenRouter's live model card.
- v2 `experimental.policies` full schema (only the high-level replacement was
  described in the surfaced spec excerpt).
- Any plugin/SDK hooks (`/websites/opencode_ai_plugins`) that could intercept
  attachment routing — plugins can hook events, so a custom plugin MIGHT be able to
  re-route, but this was not researched in depth and is not a config option.

## Open questions

- Does opencode validate attachment modalities against the **invoking** model or the
  **target subagent** model at dispatch time? Docs imply invoking/active; runtime
  source not read to confirm.
- Is there an undocumented models-dev override mechanism (local JSON patch) to add
  `image` to a model's input_modalities without code changes? Not surfaced by context7.
- Could the plugins API (`session.attach` or similar event) re-inject a stripped
  image before subagent dispatch? Out of scope for this dispatch; would need a
  plugins-specific research round.

## Last verified

2026-08-24, via context7 `/anomalyco/opencode` (dev branch) and `/websites/opencode_ai`.
