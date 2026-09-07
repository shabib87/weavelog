---
date: 2026-08-16
topic: "AGENTS.md — root vs subdirectory placement"
status: adopted
sources:
  - https://getknack.ai/blog/agents-md-monorepo
  - https://opencode.ai/v2/docs/instructions/
  - https://opencode.ai/docs/rules
  - https://code.claude.com/docs/en/memory
  - https://codersera.com/blog/agents-md-vs-claude-md-vs-cursor-rules-comparison-2026/
  - https://thepromptshelf.dev/blog/agents-md-vs-claude-md-when-to-use-2026/
  - https://www.buildcamp.io/guides/the-ultimate-guide-to-claudemd
  - https://forum.cursor.com/t/agents-md-isolated-within-a-subdirectory-is-applied-to-root/160773
  - https://agents.md/
  - https://dev.to/mcsee/ai-coding-tip-014-use-nested-agentsmd-files-3iec
models_used_for_research: [z-ai/glm-5.2]
supersedes: none
---

# AGENTS.md — root vs subdirectory placement
- **Last verified**: 2026-08-16
- **Status**: current
- **Related**: [[2026-08-16-agentsmd-hygiene]], [[2026-08-16-primitive-selection]]

## Sources
- [AGENTS.md in a Monorepo: The Precedence Rules Nobody Wrote Down](https://getknack.ai/blog/agents-md-monorepo) (2026-05) — the strongest single source; documents how Codex (root-down concat), Claude Code (cwd-up concat), and the agents.md spec disagree on merge vs. nearest-wins, plus the 32 KiB Codex cap and phrasing-as-precedence failure mode.
- [opencode — Instructions](https://opencode.ai/v2/docs/instructions/) and [opencode — Rules](https://opencode.ai/docs/rules) — official opencode behavior: global→Location upward scan, nested files discovered on-demand nearest-first, files *combined* not selected, conflicts not resolved.
- [Claude Code — How Claude remembers your project](https://code.claude.com/docs/en/memory) — official: walks cwd-up, concatenates root→cwd (nearest last = effective precedence), subdir files load on-demand, `claudeMdExcludes` escape hatch, `.claude/rules/` with `paths:` frontmatter.
- [AGENTS.md vs CLAUDE.md vs Cursor Rules: 2026 Guide](https://codersera.com/blog/agents-md-vs-claude-md-vs-cursor-rules-comparison-2026/) (2026-05) — per-format capabilities table, Muse Code prefers AGENTS.md over CLAUDE.md, Cursor `globs` precedence (Team→Project→User, earlier wins).
- [The Prompt Shelf — AGENTS.md vs CLAUDE.md decision guide](https://thepromptshelf.dev/blog/agents-md-vs-claude-md-when-to-use-2026/) (2026-04) — capability matrix, monorepo layout, AGENTS.md root sweet spot ~400-500 tokens / median 340 tokens across 2,500 real files.
- [Buildcamp — Ultimate Guide to CLAUDE.md 2026](https://www.buildcamp.io/guides/the-ultimate-guide-to-claudemd) (2026-02) — memory file location table, hierarchy rules, `.claude/rules/*.md` path-scoping.
- [Cursor Forum — nested AGENTS.md scoping](https://forum.cursor.com/t/agents-md-isolated-within-a-subdirectory-is-applied-to-root/160773) — official Cursor answer: nested AGENTS.md = implicit glob to its subtree, loaded only when agent touches files there; root applies to whole workspace.
- [agents.md](https://agents.md/) — canonical spec: "nearest file in the directory tree takes precedence"; OpenAI monorepo runs 88 AGENTS.md files.
- [dev.to — Use Nested AGENTS.md Files](https://dev.to/mcsee/ai-coding-tip-014-use-nested-agentsmd-files-3iec) — layering mental model: root=foundations, subdir=specifics, local=quirks.

## Findings

### Placement conventions (where each file lives)
- **Global / user-level** (`~/.config/opencode/AGENTS.md`, `~/.claude/CLAUDE.md`, `~/.codex/AGENTS.md`): personal cross-project preferences and the always-on "constitution" — model routing, conductor protocol, scripting standard, test guardrails. Applies to *every* project on the machine; never committed to a repo.
- **Project root** (`./AGENTS.md`, `./CLAUDE.md`): repo-wide guidance that genuinely applies to every session — stack identity, exact build/test/lint commands, commit-message convention, architecture map, cross-cutting safety rules (secrets never committed, prod-migration policy). Community sweet spot ~340–500 tokens; hard ceiling before Codex's 32 KiB combined cap starts truncating leaves.
- **Subdirectory / per-package** (`packages/api/AGENTS.md`, `services/payments/AGENTS.md`): facts only that team knows — exact filtered test command, local dev startup, deploy quirks, the DB the service owns. Phrase as declarative facts ("the api service runs migrations via `make migrate-up`"), not global imperatives.
- **Local / personal** (`AGENTS.local.md`, `CLAUDE.local.md`): gitignored per-developer overrides. Support varies by tool; Claude Code auto-gitignores it.
- **Path-scoped rules** (`.claude/rules/*.md` with `paths:` frontmatter, `.cursor/rules/*.mdc` with `globs:`): finer than directory nesting — load only when a matching file is in context. AGENTS.md has no equivalent; it approximates this via nested files.

### What belongs at each level (decision rule)
- Root: "If you have to think about whether a rule applies to all services, it does not belong here." Cross-cutting safety rules that must hold from *every* cwd (prod migrations, secret handling) live at root and cost root-budget — a leaf file only loads when cwd is inside that subtree, so safety rules placed in a leaf are invisible to agents editing sibling code.
- Subdir: anything only one team/package knows. Push framework- or language-specific guidance down to the package that owns it; this also keeps each file short enough to be followed reliably.
- Global: anything that should follow you across repos without being copy-pasted — your conductor protocol, model ladder, script/test standards. One concern per file (DRY); the global file is the single source of truth for cross-project procedure.

### Drift / duplication prevention across levels
- **One canonical file, thin adapters.** Make AGENTS.md the source of truth for universal rules; keep CLAUDE.md as a thin pointer (`@AGENTS.md` import or symlink) plus Claude-only additions. Never duplicate the same convention in both files — duplication is what drifts three weeks later.
- **References over inlining.** Mercari's pattern: root AGENTS.md stays under ~1 KiB and links to `@docs/commands.md`, `@docs/code-style.md`, `@docs/architecture.md`. Detail lives behind references; the root is a map, not the territory ("fractal documentation").
- **Pick one phrasing convention per file.** Root rules conditional ("by default, services use vitest"), leaf rules declarative facts ("this service is on jest"). A confidently-worded root imperative can drown out a hedged leaf fact even when the leaf appears last — phrasing *is* precedence in practice.
- **Audit bytes.** Run `wc -c` over every AGENTS.md/CLAUDE.md periodically. When the combined sum approaches ~24 KiB, factor — Codex silently drops everything past its 32 KiB cap and truncates leaves first.
- **Review instruction-file diffs like code.** A PR that edits AGENTS.md merges new directives into every teammate's agent. Nested files in monorepos are an attack surface: the closest file wins, so a dropped AGENTS.md near edited code overrides the root.
- **Escape hatches for monorepos.** Claude Code: `claudeMdExcludes` to keep other teams' instructions out. Codex: `AGENTS.override.md` (same-directory swap, not cross-tree) to strengthen a root rule for one service. Keep enforcement (deny a command, require a check) in hooks/managed settings, not markdown — markdown is advisory; hooks run regardless.

## Precedence model

How root + subdir configs combine — **this differs per tool and the spec is ambiguous.** The agents.md spec says only "nearest file takes precedence," without specifying merge vs. override. Implementations diverged:

- **opencode (this user's primary tool):** Files are **combined (union), not selected as a single winner.** At startup, opencode scans upward from the Location (cwd) toward home/project root for AGENTS.md → CLAUDE.md → `~/.config/opencode/AGENTS.md` → `~/.claude/CLAUDE.md`; **first match wins in each category** (so AGENTS.md beats CLAUDE.md, and `~/.config/opencode/AGENTS.md` beats `~/.claude/CLAUDE.md`). Nested AGENTS.md *below* the Location are **not** part of the initial scan — they are discovered on-demand when the read tool reads a file or lists a directory, walking upward from that target to (but not including) the Location, injected **nearest-first**, **once per session**. OpenCode **does not resolve conflicts** between combined files — the author must keep broad guidance global and scoped guidance local with no contradictions. `OPENCODE_DISABLE_PROJECT_CONFIG=1` skips project AGENTS.md but keeps the global file. Editing an already-injected nested file does not re-inject mid-session; restart the session.
- **Claude Code:** **Concatenation (union), not override.** Walks *cwd-up*, collecting every CLAUDE.md/CLAUDE.local.md from filesystem root down to cwd; ordered root→cwd so the nearest (last) file has effective precedence. Within a directory, CLAUDE.local.md is appended after CLAUDE.md. Subdir files *below* cwd load on-demand when Claude reads files there. Does **not** read AGENTS.md natively — bridge with a one-line `@AGENTS.md` import or symlink. `claudeMdExcludes` drops ancestor files in monorepos. `.claude/rules/*.md` with `paths:` frontmatter gives path-scoped loading; rules without `paths` load unconditionally at the same priority as `.claude/CLAUDE.md`.
- **Codex (OpenAI):** **Concatenation root-down.** Concatenates every AGENTS.md on the path root→cwd; leaf appears last, effectively wins — *but* a confidently-worded root imperative can still drown out a hedged leaf fact. Checks `AGENTS.override.md` before AGENTS.md at each directory (same-directory swap, not cross-tree magic). `~/.codex/AGENTS.md` provides global defaults. Hard cap `project_doc_max_bytes` = 32 KiB **combined** across all concatenated files; truncates leaves first with no warning.
- **Cursor:** Nested AGENTS.md = **implicit glob to its subtree** — loaded only when the agent works with files inside that subtree (reads or edits during the chat); root AGENTS.md applies to the whole workspace. Combines nested files with parents; narrower instruction wins on conflict. `.cursor/rules/*.mdc` uses `globs:` frontmatter (legacy single-file `.cursorrules` is deprecated). Precedence runs Team → Project → User, with **earlier sources winning** on conflict (inverse of the "most specific wins" instinct) unless a rule is marked `enforced`.
- **agents.md spec:** "Nearest file wins; explicit chat prompt overrides everything." Ambiguous on merge vs. override — Codex chose concat, some implementations chose nearest-only. A spec v1.1 (issue #135) is proposed to nail this down; until then, layout must survive three runtimes reading the same files three different ways.

**Shared rule across all tools:** an explicit user chat prompt overrides any file. No tool merges *content semantically* — they concatenate or select. Keeping files contradiction-free is the author's job, not the runtime's.

## Recommendations for THIS user

1. **Keep `~/.agents/AGENTS.md` as the single source of truth for cross-project procedure** (conductor protocol, model routing, scripting standard, test guardrails). This is global/user-level — it should not be duplicated into any project root. `~/.config/opencode/AGENTS.md` is opencode-specific additions only; if it currently restates conductor protocol, prune the overlap and let `~/.agents/AGENTS.md` own that concern (DRY — one concern per file).

2. **In each project root (`~/Projects/loopeng`, `~/Projects/harness-kit`), keep AGENTS.md to repo-wide facts only** — stack, exact commands, commit convention, architecture map, cross-cutting safety rules. Target <400 tokens / <4 KiB. Use `@docs/...` references for detail (Mercari pattern) rather than inlining; the root is a map.

3. **Add subdirectory AGENTS.md only where a subtree genuinely diverges** — e.g., a Python data pipeline next to a TypeScript frontend in the same repo. Single-stack repos do not need nested files. When you do nest, phrase leaf rules as declarative facts ("the api service runs..."), root rules as conditional defaults ("by default..."), so phrasing reinforces precedence instead of fighting it.

4. **Avoid the global-vs-project duplication the user flagged.** The split is: global = procedure that follows you across repos; project root = facts about *this* repo. If a line in `~/.agents/AGENTS.md` describes one specific project, it does not belong there. Conversely, if a project-root AGENTS.md restates your conductor protocol, delete it and let the global file govern — opencode unions them, so restating just risks drift.

5. **Bridge to Claude Code with a one-line import, not a copy.** If any project also uses Claude Code, add `CLAUDE.md` containing `@AGENTS.md` plus Claude-only additions — never duplicate conventions in both. Claude Code does not read AGENTS.md natively; without the bridge it runs with zero project context and warns nothing.

6. **Put enforcement in hooks, not markdown.** Anything that must hold (deny a command, require a check before push) belongs in opencode/Claude hooks or managed settings. Markdown is advisory and the model can rationalize past it; hooks run regardless. Reserve AGENTS.md for guidance the agent should weigh, not guarantees.

## Open questions / next steps
- opencode's "does not resolve conflicts" behavior means a root rule and a nested rule that contradict both enter context as-is — the model picks. What's the empirically safest phrasing pattern to make the leaf reliably win in opencode specifically? (Hypothesis: declarative facts at leaf + conditional defaults at root, same as the Codex finding — needs a probe test.)
- The user's `~/.config/opencode/AGENTS.md` and `~/.agents/AGENTS.md` overlap needs an actual diff audit to confirm whether conductor protocol is duplicated across them — flagged in [[2026-08-16-agentsmd-hygiene]].
- Should `loopeng` and `harness-kit` get per-package AGENTS.md, or are they single-stack enough that a root file suffices? Depends on their internal structure — not yet inspected.
- agents.md spec v1.1 (issue #135) may standardize merge vs. nearest-wins; re-verify when it lands, since opencode's union behavior and Codex's concat behavior could converge or diverge further.
