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
