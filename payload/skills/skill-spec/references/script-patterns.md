# Script Patterns

Design patterns for bundling scripts in agent skills, per [agentskills.io](https://agentskills.io/skill-creation/using-scripts).

## One-Off Commands

When an existing package does what you need, reference it directly in SKILL.md without a `scripts/` directory. Pin versions for reproducibility.

| Runner | Ecosystem | Example |
|--------|-----------|---------|
| `uvx` | Python (via uv) | `uvx ruff@0.8.0 check .` |
| `pipx` | Python | `pipx run 'black==24.10.0' .` |
| `npx` | Node.js (ships with npm) | `npx eslint@9 --fix .` |
| `bunx` | Bun | `bunx eslint@9 --fix .` |
| `deno run` | Deno | `deno run npm:create-vite@6 my-app` |
| `go run` | Go | `go run golang.org/x/tools/cmd/goimports@v0.28.0 .` |

Tips:
- Pin versions (`npx eslint@9.0.0`) for consistent behavior
- State prerequisites in SKILL.md or use `compatibility` frontmatter
- Move complex commands into `scripts/` when they grow unwieldy

## Self-Contained Scripts

Bundle scripts in `scripts/` with inline dependency declarations. No separate manifest or install step needed.

### Python (PEP 723)

```python
# /// script
# dependencies = [
#   "beautifulsoup4>=4.12,<5",
# ]
# ///

from bs4 import BeautifulSoup
# ... script logic ...
```

Run with: `uv run scripts/extract.py`

- Pin versions with PEP 508 specifiers
- Use `requires-python` to constrain Python version
- Use `uv lock --script` for full reproducibility

### Deno

```typescript
#!/usr/bin/env -S deno run
import * as cheerio from "npm:cheerio@1.0.0";
// ... script logic ...
```

Run with: `deno run scripts/extract.ts`

- `npm:` for npm packages, `jsr:` for Deno-native
- Version specifiers follow semver

### Bun

```typescript
#!/usr/bin/env bun
import * as cheerio from "cheerio@1.0.0";
// ... script logic ...
```

Run with: `bun run scripts/extract.ts`

- Auto-installs missing packages (no package.json needed)
- Disabled if `node_modules` exists anywhere up the directory tree

### Ruby

```ruby
require 'bundler/inline'

gemfile do
  source 'https://rubygems.org'
  gem 'nokogiri', '~> 1.16'
end
# ... script logic ...
```

Run with: `ruby scripts/extract.rb`

## Language Choice

The agentskills.io spec is language-neutral. Any language is allowed if `compatibility` states prerequisites and examples use paths relative to the skill root.

**Recommended default for structured skill CLIs** (JSON on stdout, parsing, validation, cross-platform): author in **TypeScript**, emit **ECMAScript modules** (`.mjs`) run with `node scripts/<tool>.mjs` so agents and CI need no compile step on the execution path. Plain `.mjs` is acceptable when a team has no TS toolchain. Reserve **Bash** for thin wrappers (glue only), not primary parsers.

## Referencing Scripts from SKILL.md

List available scripts so the agent knows they exist:

```markdown
## Available scripts

- **`scripts/validate.sh`** -- Validates configuration files
- **`scripts/process.py`** -- Processes input data
```

Use relative paths from skill root in instructions:

```markdown
## Workflow

1. Validate: `bash scripts/validate.sh "$INPUT_FILE"`
2. Process: `python3 scripts/process.py --input results.json`
```

## Designing for Agentic Use

### Hard Requirements

**No interactive prompts**: Agents run in non-interactive shells. Scripts that block on TTY input hang indefinitely. Accept ALL input via flags, env vars, or stdin.

```
# Bad: hangs waiting for input
$ python scripts/deploy.py
Target environment: _

# Good: clear error with guidance
$ python scripts/deploy.py
Error: --env is required. Options: development, staging, production.
Usage: python scripts/deploy.py --env staging --tag v1.2.3
```

### Interface Design

**`--help` output**: Primary way agents learn the interface. Include brief description, available flags, and examples.

```
Usage: scripts/process.py [OPTIONS] INPUT_FILE

Process input data and produce a summary report.

Options:
  --format FORMAT    Output format: json, csv, table (default: json)
  --output FILE      Write output to FILE instead of stdout
  --verbose          Print progress to stderr

Examples:
  scripts/process.py data.csv
  scripts/process.py --format csv --output report.csv data.csv
```

### Error Messages

Tell the agent what to do next:

```
Error: --format must be one of: json, csv, table.
       Received: "xml"
```

Include: what went wrong, what was expected, what to try.

### Output Design

- **Structured formats** (JSON, CSV) over free-form text
- **Data to stdout**, diagnostics to stderr
- **Predictable size**: default to summary, support `--offset` for pagination
- Many agent harnesses truncate output beyond 10-30K characters

### Safety Patterns

- **Idempotent**: "create if not exists" over "create and fail on duplicate"
- **Input validation**: reject ambiguous input with clear errors; use enums
- **`--dry-run`**: preview destructive operations before execution
- **Safe defaults**: require `--confirm` or `--force` for destructive ops
- **Meaningful exit codes**: distinct codes for different failure types, documented in `--help`
