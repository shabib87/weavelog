/**
 * enforce.ts — opencode enforcement-hooks plugin (Plan B Phase 2 of the 2026-08-15 headroom fix plan).
 *
 * NOT ACTIVE on delivery — this worktree ships code + tests + docs only.
 * Activation (human step): copy this file to ~/.config/opencode/plugins/enforce.ts
 * (plugin files in that directory auto-load; verified 2026-08-15, spike A).
 * Rollback: delete the file (or remove it from opencode.jsonc "plugin") — instant.
 * Bypass/disable flags + recovery: docs/plans/2026-08-16-enforce-hooks-recovery.md.
 *
 * Design contract (reviewer-mandated):
 *   - fail-open: hook machinery errors (missing scripts, crashes, timeouts) never
 *     break a session. The only intentional throws are the commit gate and the
 *     dangerous-command denylist.
 *   - state-agnostic: no state files. Works with no scripts, logs, or config present.
 *   - hook ordering: hooks fire in plugin load order. If enforce loads after
 *     other plugins it runs after their transforms; there is no inter-plugin
 *     dependency either way. (superpowers removed 2026-08-16.)
 *
 * Verified hook surface (@opencode-ai/plugin dist/index.d.ts, verified 2026-08-15):
 *   - tool.execute.before: input { tool, sessionID, callID }, output { args } — throw blocks the call.
 *   - tool.execute.after:  input { tool, sessionID, callID, args }, output { title, output, metadata }.
 *   - event:               input { event } — session.idle carries properties.sessionID;
 *                          session.created carries properties.info.id.
 *
 * One-way config flow (TASK-27, 2026-09-01): Hook 8 blocks direct edits to the
 * live harness dir (~/.config/opencode/**) — the repo (~/.agents/config/**) is
 * the single source; Hook 9 auto-materializes repo -> live at session start and
 * surfaces sync refusals loudly (never silently adopts). Escape hatches:
 * ENFORCE_ALLOW_LIVE_EDIT=true (Hook 8) and ENFORCE_DISABLED=true (master).
 *
 * Hook 10 (TASK-51, 2026-09-05): nudge — `backlog task create` on ANY branch
 * must carry a description (-d), at least one acceptance criterion (--ac), and
 * must not pass --no-dod-defaults (creation-time sprinkle warn-only; the hard
 * gate lives at the claim transition in bin/src/task-flow.ts). Reuses
 * bin/src/task-validate.ts parseTaskCreateArgs when the module is importable;
 * falls back to an inline minimal copy (see inlineCreateIssueCheck) when the
 * plugin runs outside the repo. This is the one intentional throw class beyond
 * the commit gate + denylist: it is a nudge with explicit fix guidance, and
 * Hook 7's main-scope check still runs FIRST (no behavior change on main).
 */
import { spawn, spawnSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readlinkSync, realpathSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** Structural subset of the plugin-context BunShell — keeps the plugin unit-testable. */
export interface ShellOutcome {
	exitCode: number;
	text(): string;
}
export type ShellTag = (
	strings: TemplateStringsArray,
	...values: unknown[]
) => {
	quiet(): { nothrow(): Promise<ShellOutcome> };
};

function defaultShellTag(
	strings: TemplateStringsArray,
	...values: unknown[]
): { quiet(): { nothrow(): Promise<ShellOutcome> } } {
	let command = strings[0];
	for (let i = 0; i < values.length; i++) {
		const v = values[i];
		command += (Array.isArray(v) ? v.join(" ") : String(v)) + strings[i + 1];
	}
	const run = (): Promise<ShellOutcome> =>
		new Promise((resolvePromise) => {
			const r = spawnSync(command, {
				encoding: "utf-8",
				shell: true,
				timeout: 10000,
			});
			resolvePromise({
				exitCode: r.status ?? -1,
				text: () => r.stdout ?? "",
			});
		});
	return {
		quiet: () => ({ nothrow: run }),
	};
}

export interface EnforceDeps {
	$?: ShellTag;
	home: string;
	env: Record<string, string | undefined>;
	/** Defaults to appending to ~/.agents/logs/headroom-learn.log. */
	appendLog?: (text: string) => void;
	exists?: (path: string) => boolean;
	timeouts?: { checkMs: number; learnMs: number; syncMs?: number };
	/** Synchronous git branch check — used by Hook 6 (write-block). Default: spawnSync. */
	gitBranch?: (dir: string) => string;
	/** Synchronous command runner — used by Hook 2 (commit gate). Default: spawnSync. */
	runCmd?: (
		cmd: string,
		args: string[],
		opts?: { cwd?: string; timeout?: number },
	) => { status: number | null; stdout: string; stderr: string };
	/**
	 * Async config-sync runner — used by Hook 9 (session-start materialize).
	 * Default: Bun.spawn (non-blocking) with the syncMs timeout. Returns the
	 * config-sync report contract (exit 0 ok/skip, 1 refusal with a refusals[]
	 * JSON report on stdout, 2 machinery — see bin/src/config-sync.ts --help),
	 * or null on crash/timeout (fail-open).
	 */
	runConfigSync?: () => Promise<{
		status: number | null;
		stdout: string;
	} | null>;
	/** Hook 10 working directory (default: process.cwd(); injectable for tests). */
	cwd?: string;
	/** Hook 10 harness-dev context (default: detected from cwd by task-validate). */
	harnessDev?: boolean;
	/** Hook 10 backlog-project detection (default: backlog/config.yml exists at cwd). */
	isBacklogProject?: boolean;
}

/** Thrown only by the commit gate — distinguishes enforcement blocks from machinery failures. */
export class FrontmatterViolationError extends Error {}

/**
 * Hook 9 argv — pure so the forward-only contract (no --force, no --adopt:
 * a refusal means a human decides) is testable without spawning a process.
 */
export function configSyncArgv(home: string): string[] {
	const js = fileURLToPath(new URL("../config-sync.js", import.meta.url));
	if (existsSync(js)) return ["node", js];
	return ["node", "--import", "tsx", fileURLToPath(new URL("../config-sync.ts", import.meta.url))];
}

/**
 * Hook 10 inline fallback — a minimal copy of parseTaskCreateArgs + the three
 * quality checks from bin/src/task-validate.ts, DUPLICATED here on purpose so
 * enforcement survives when the plugin runs outside the repo (the module is
 * not importable). Keep the tokenizer and checks in sync with the module.
 * Returns the list of missing pieces (empty = command is complete).
 */
export function inlineCreateIssueCheck(command: string): string[] {
	const tokens: string[] = [];
	let cur = "";
	let started = false;
	let quote = "";
	for (let i = 0; i < command.length; i++) {
		const c = command[i];
		if ((c === "'" || c === '"') && (!quote || quote === c)) {
			if (!quote) {
				quote = c;
				started = true;
			} else {
				quote = "";
			}
			continue;
		}
		if (quote) {
			cur += c;
			started = true;
			continue;
		}
		if (c === " " || c === "\t" || c === "\n") {
			if (started) {
				tokens.push(cur);
				cur = "";
				started = false;
			}
			continue;
		}
		cur += c;
		started = true;
	}
	if (started) tokens.push(cur);

	let hasDescription = false;
	let acCount = 0;
	let noDodDefaults = false;
	for (let i = 0; i < tokens.length; i++) {
		const t = tokens[i];
		if (t === "--no-dod-defaults") {
			noDodDefaults = true;
			continue;
		}
		if (t === "-d" || t === "--description" || t === "--desc") {
			const v = tokens[i + 1];
			if (v !== undefined && !v.startsWith("--")) hasDescription = true;
			continue;
		}
		if (t.startsWith("--description=") || t.startsWith("--desc=")) {
			if (t.slice(t.indexOf("=") + 1).length > 0) hasDescription = true;
			continue;
		}
		if (t === "--ac" || t === "--acceptance-criteria") {
			const v = tokens[i + 1];
			if (v !== undefined && !v.startsWith("--")) acCount++;
			continue;
		}
		if (t.startsWith("--ac=") || t.startsWith("--acceptance-criteria=")) {
			if (t.slice(t.indexOf("=") + 1).length > 0) acCount++;
		}
	}
	const issues: string[] = [];
	if (!hasDescription) issues.push("missing description (-d/--description)");
	if (acCount === 0) issues.push("zero acceptance criteria (--ac)");
	if (noDodDefaults) issues.push("--no-dod-defaults");
	return issues;
}

const MAX_LEARNED_SESSIONS = 100;
const LEARN_MODEL = "deepseek/deepseek-v4-flash-0731";
// Matches `backlog task create` and `backlog task edit <id> --status` (status changes).
// Blocks task lifecycle mutations on main — the conductor must be in a worktree.
const BACKLOG_CREATE_RE = /\bbacklog\s+task\s+create\b/;
const BACKLOG_STATUS_RE = /\bbacklog\s+task\s+edit\s+\S+.*--status\b/;
// git -c k=v commit, git --git-dir=... commit). Still best-effort by design:
// quoted wrappers like `bash -c "git commit"` are a documented bypass.
const COMMIT_RE = /(?:^|[;&|]+)\s*git\s+(?:--?[\w-]+(?:[ =]\S+)?\s+)*commit\b/;

function escapeRegExp(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Best-effort denylist — trivially bypassed (absolute paths, $HOME, chmod u=rw).
 * Documented as best-effort, NOT a security boundary (plan §2a). Blocks the
 * chmod-600-on-a-directory incident class from logs/failure-log-2026-08-15.md.
 */
function denylist(home: string): Array<{ pattern: RegExp; message: string }> {
	const HOME_ALT = String.raw`(?:~|\$HOME|\$\{HOME\}|${escapeRegExp(home)})`;
	return [
		{
			pattern: new RegExp(String.raw`chmod\s+(?:-R\s+)?600\s+${HOME_ALT}/\.headroom(?:\s|/|$)`),
			message:
				"chmod 600 strips execute bit from the ~/.headroom directory — use chmod 700 (incident: logs/failure-log-2026-08-15.md)",
		},
		{
			pattern: new RegExp(String.raw`chmod\s+(?:-R\s+)?600\s+${HOME_ALT}/\.local/pipx(?:\s|/|$)`),
			message: "chmod 600 strips execute bit from the pipx directory — use chmod 700",
		},
		{
			pattern: new RegExp(String.raw`rm\s+-rf\s+${HOME_ALT}/\.headroom(?:\s|/|$)`),
			message: "removing ~/.headroom destroys the headroom proxy state",
		},
		{
			// Anchored to the exact venv path (reviewer fix): an unanchored
			// `headroom-ai` match would false-positive on e.g. /tmp/headroom-ai.
			pattern: new RegExp(
				String.raw`rm\s+-rf\s+${HOME_ALT}/\.local/pipx/venvs/headroom-ai(?:\s|/|$)`,
			),
			message: "removing the headroom pipx venv destroys the proxy",
		},
		{
			pattern: /launchctl\s+bootout.*com\.headroom\.proxy/,
			message: "this would kill the headroom proxy",
		},
	];
}

/** Resolves null on timeout or rejection — fail-open by construction. */
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | null> {
	return new Promise((resolve) => {
		const timer = setTimeout(() => resolve(null), ms);
		p.then(
			(v) => {
				clearTimeout(timer);
				resolve(v);
			},
			() => {
				clearTimeout(timer);
				resolve(null);
			},
		);
	});
}

function defaultAppendLog(home: string): (text: string) => void {
	const logFile = join(home, ".agents", "logs", "headroom-learn.log");
	return (text) => {
		try {
			mkdirSync(dirname(logFile), { recursive: true });
			appendFileSync(logFile, text);
		} catch {
			// fail-open — logging must never break a session
		}
	};
}

interface ToolAfterInput {
	tool: string;
	sessionID: string;
	callID: string;
	args?: Record<string, unknown>;
}
interface ToolAfterOutput {
	title?: string;
	output?: string;
	metadata?: Record<string, unknown>;
}
interface ToolBeforeInput {
	tool: string;
	sessionID: string;
	callID: string;
}
interface ToolBeforeOutput {
	args?: Record<string, unknown>;
}
interface EventInput {
	event: { type: string; properties?: Record<string, unknown> };
}

export interface EnforceHooks {
	"tool.execute.after": (input: ToolAfterInput, output: ToolAfterOutput) => Promise<void>;
	"tool.execute.before": (input: ToolBeforeInput, output: ToolBeforeOutput) => Promise<void>;
	event: (input: EventInput) => Promise<void>;
}

type PluginContext = { $?: unknown };
type Plugin = (ctx: PluginContext) => Promise<PluginHooks>;
type PluginHooks = Record<string, unknown>;

export function createHooks(deps: EnforceDeps): EnforceHooks {
	const { home, env } = deps;
	const $ = deps.$ ?? defaultShellTag;
	const exists = deps.exists ?? existsSync;
	const appendLog = deps.appendLog ?? defaultAppendLog(home);
	const timeouts = {
		checkMs: 5000,
		learnMs: 10000,
		syncMs: 10000,
		...deps.timeouts,
	};

	// Hook 9 default runner: Bun.spawn so the opencode event loop is never
	// blocked while config-sync runs (reviewer fix). cwd is pinned to home so
	// the run is independent of opencode's process cwd. The runner OWNS its
	// timeout (proc.kill at syncMs); only INJECTED runners get the withTimeout
	// wrapper (single timeout owner — reviewer fix). Config-sync contract:
	// exit 0 ok/skip, 1 refusal (refusals[] JSON on stdout), 2 machinery —
	// see bin/src/config-sync.ts --help.
	const defaultRunConfigSync = async (): Promise<{
		status: number | null;
		stdout: string;
	} | null> =>
		new Promise((resolvePromise) => {
			const [cmd, ...args] = configSyncArgv(home);
			const proc = spawn(cmd, args, {
				cwd: home,
				stdio: ["ignore", "pipe", "pipe"],
			});
			let stdout = "";
			proc.stdout.on("data", (chunk) => {
				stdout += String(chunk);
			});
			proc.stderr.on("data", () => {});
			const timer = setTimeout(() => proc.kill(), timeouts.syncMs);
			proc.on("error", () => {
				clearTimeout(timer);
				resolvePromise(null);
			});
			proc.on("close", (code) => {
				clearTimeout(timer);
				resolvePromise({ status: code, stdout: stdout.trim() });
			});
		});
	const runConfigSync = deps.runConfigSync ?? defaultRunConfigSync;

	// Hook 10 (TASK-51): create-quality checker, lazily bound to the repo's
	// task-validate.ts when importable; otherwise the inline minimal copy
	// (inlineCreateIssueCheck — kept in sync with the module). v5: also runs
	// the create gate (labels vocabulary, harness-dev context, priority, deps)
	// imported from the module; the inline fallback keeps only the original
	// three quality checks (desc/AC/no-dod) to stay thin.
	const hookCwd = deps.cwd ?? process.cwd();
	type CreateGateOutcome = { refuse: string[]; warnings: string[] };
	let createQualityIssues: ((command: string) => CreateGateOutcome) | null = null;
	const enforceCreateQuality = async (command: string): Promise<void> => {
		if (createQualityIssues === null) {
			try {
				const mod = (await import(new URL("../task-validate.js", import.meta.url).href)) as {
					parseTaskCreateArgs: (input: string | string[]) => {
						hasDescription: boolean;
						acCount: number;
						hasNoDodDefaults: boolean;
						labels: string[];
						priority: string | null;
						deps: string[];
					};
					createGateCheck: (
						input: unknown,
						options: { isBacklogProject?: boolean; harnessDev?: boolean },
					) => { ok: boolean; errors: string[]; warnings: string[] };
					detectHarnessDevFromCwd: (cwd: string) => boolean;
				};
				createQualityIssues = (cmd: string): CreateGateOutcome => {
					const parsed = mod.parseTaskCreateArgs(cmd);
					const refuse: string[] = [];
					if (!parsed.hasDescription) refuse.push("missing description (-d/--description)");
					if (parsed.acCount === 0) refuse.push("zero acceptance criteria (--ac)");
					if (parsed.hasNoDodDefaults) refuse.push("--no-dod-defaults");
					const gate = mod.createGateCheck(parsed, {
						isBacklogProject:
							deps.isBacklogProject ?? existsSync(join(hookCwd, "backlog", "config.yml")),
						harnessDev: deps.harnessDev ?? mod.detectHarnessDevFromCwd(hookCwd),
					});
					return {
						refuse: [...refuse, ...gate.errors],
						warnings: gate.warnings,
					};
				};
			} catch {
				// module not importable (plugin copied outside the repo) — the
				// inline fallback still enforces the same three checks
				createQualityIssues = (cmd: string): CreateGateOutcome => ({
					refuse: inlineCreateIssueCheck(cmd),
					warnings: [],
				});
			}
		}
		const { refuse, warnings } = createQualityIssues(command);
		for (const w of warnings) {
			console.warn(`[enforce] Hook 10 warn: ${w}`);
		}
		if (refuse.length > 0) {
			throw new Error(
				`Blocked: backlog task create failed the TASK-51 create gate: ${refuse.join(", ")}. Fix: run it with -d "what & why", at least one EARS criterion --ac "WHEN ... THEN ...", drop --no-dod-defaults so the 4-point DoD checklist applies, use only labels from the closed vocabulary (reserved or general), and set a priority from the configured set.`,
			);
		}
	};

	/** sessionID from an event — session.idle carries properties.sessionID,
	 * session.created carries properties.info.id (EventSessionCreated). */
	function sessionIdFrom(event: {
		type: string;
		properties?: Record<string, unknown>;
	}): string | null {
		const props = event.properties;
		if (typeof props?.sessionID === "string") return props.sessionID;
		const info = props?.info as { id?: unknown } | undefined;
		return typeof info?.id === "string" ? info.id : null;
	}

	const gitBranch =
		deps.gitBranch ??
		((dir: string): string => {
			const r = spawnSync("git", ["-C", dir, "rev-parse", "--abbrev-ref", "HEAD"], {
				encoding: "utf-8",
				timeout: timeouts.checkMs,
			});
			if (r.status !== 0 || !r.stdout) return "";
			return r.stdout.trim();
		});

	const runCmd =
		deps.runCmd ??
		((
			cmd: string,
			args: string[],
			opts?: { cwd?: string; timeout?: number },
		): { status: number | null; stdout: string; stderr: string } => {
			const r = spawnSync(cmd, args, {
				encoding: "utf-8",
				timeout: opts?.timeout ?? timeouts.checkMs,
				cwd: opts?.cwd,
			});
			return {
				status: r.status,
				stdout: (r.stdout || "").trim(),
				stderr: (r.stderr || "").trim(),
			};
		});

	const RESEARCH_DIR = join(home, ".agents", "docs", "research");
	const PLANS_DIR = join(home, ".agents", "docs", "plans");
	const machineryScript = (base: string): { path: string; prefix: string[] } => {
		const js = fileURLToPath(new URL(`../${base}.js`, import.meta.url));
		if (existsSync(js)) return { path: js, prefix: [] };
		return {
			path: fileURLToPath(new URL(`../${base}.ts`, import.meta.url)),
			prefix: ["--import", "tsx"],
		};
	};
	const FM = machineryScript("frontmatter-check");
	const REVIEWER = machineryScript("reviewer-loop");
	const FRONTMATTER_CHECK = FM.path;
	const REVIEWER_LOOP = REVIEWER.path;
	const HEADROOM_BIN = join(home, ".local", "bin", "headroom");
	const LEARN_TARGET = join(home, ".agents", "docs", "learned-patterns.md");
	const DENYLIST = denylist(home);
	const HARNESS_ROOT = `${join(home, ".agents")}/`;
	// Hook 8: the live opencode harness dir — one-way config flow means edits go
	// to the tracked repo copy (~/.agents/config/**), never here. Canonicalized
	// so the prefix check matches canonical filePaths even when home (or any
	// ancestor) is reached through a symlink (reviewer fix).
	const LIVE_HARNESS_ROOT = `${canonicalPath(join(home, ".config", "opencode"))}/`;
	// Hook 9: forward-only materializer run at session start.
	const SYNC = machineryScript("config-sync");
	const CONFIG_SYNC = SYNC.path;

	// Kill switches (reviewer-mandated bypass flags — see the recovery runbook).
	// Read PER HOOK CALL so a runtime env change takes effect without a restart:
	// ENFORCE_DISABLED=true          -> every hook is a no-op (master switch)
	// ENFORCE_ALLOW_LIVE_EDIT=true   -> Hook 8 escape hatch for intentional
	//                                   one-off live-harness edits
	// HEADROOM_LEARN_ENABLE=true     -> Hook 4 (failure learning) runs. OFF by default:
	// opt-in per glm-5.2 adjudication 2026-08-16 (default-on paid LLM on idle is a
	// cost/consent hazard).
	const enforceDisabled = () => env.ENFORCE_DISABLED === "true";
	const allowLiveEdit = () => env.ENFORCE_ALLOW_LIVE_EDIT === "true";
	const learnEnabled = () => env.HEADROOM_LEARN_ENABLE === "true";

	// Debounce for Hook 4 — in-memory only (state-agnostic). Bounded LRU:
	// at the cap the OLDEST entry is evicted (Set iteration is insertion-ordered),
	// so recent sessions never re-trigger learning.
	const learnedSessions = new Set<string>();

	// Hook 9 — one sync attempt per session, and a pending refusal surfaced
	// exactly once via tool.execute.after (event hooks have no user-facing
	// output channel; tool metadata is the only loud channel we have).
	// Both structures are LRU-capped like learnedSessions (reviewer fix) —
	// the Map evicts its OLDEST key at the cap (dead sessions cannot leak).
	const MAX_TRACKED_SESSIONS = 100;
	const syncedSessions = new Set<string>();
	const pendingConfigWarnings = new Map<string, string>();

	function boundedRemember(store: Set<string>, key: string): void {
		if (store.size >= MAX_TRACKED_SESSIONS) {
			const oldest = store.values().next().value;
			if (oldest !== undefined) store.delete(oldest);
		}
		store.add(key);
	}

	function stashWarning(sessionID: string, warning: string): void {
		if (pendingConfigWarnings.size >= MAX_TRACKED_SESSIONS) {
			const oldest = pendingConfigWarnings.keys().next().value;
			if (oldest !== undefined) pendingConfigWarnings.delete(oldest);
		}
		pendingConfigWarnings.set(sessionID, warning);
	}

	/** Canonical (real) path for the Hook 8 prefix check — closes the
	 * relative/`..`/symlink bypass (reviewer fix). Falls back to a lexical
	 * resolve of the deepest existing ancestor when the target is missing;
	 * a DANGLING symlink is followed lexically (readlink) so writing through
	 * it cannot dodge the block either. Depth-guarded against symlink cycles;
	 * throws only if even the lexical fallback is impossible (never in practice). */
	function canonicalPath(p: string, depth = 0): string {
		const abs = resolve(p);
		if (depth > 5) return abs; // symlink-cycle guard: degrade to lexical
		try {
			return realpathSync(abs);
		} catch {
			try {
				const target = readlinkSync(abs);
				return canonicalPath(resolve(dirname(abs), target), depth + 1);
			} catch {
				// not a symlink (or unreadable) — climb to the deepest existing ancestor
			}
			let dir = dirname(abs);
			while (dir !== dirname(dir)) {
				try {
					return join(realpathSync(dir), abs.slice(dir.length + 1));
				} catch {
					dir = dirname(dir);
				}
			}
			return abs;
		}
	}

	/** Hook 8 predicate — canonical prefix match with a defensive fallback to
	 * the raw lexical check if canonicalization ever throws (fail-closed for
	 * anything lexically under the root, never blocks unrelated paths). */
	function isLiveHarnessPath(p: string): boolean {
		try {
			return canonicalPath(p).startsWith(LIVE_HARNESS_ROOT);
		} catch {
			return resolve(p).startsWith(LIVE_HARNESS_ROOT);
		}
	}

	/** Builds the loud refusal message Hook 9 surfaces after a failed sync. */
	function configSyncRefusalMessage(stdout: string): string {
		try {
			const report = JSON.parse(stdout) as {
				refusals?: Array<{ file?: string; reason?: string; fix?: string }>;
			};
			const refusals = Array.isArray(report.refusals) ? report.refusals : [];
			if (refusals.length === 0) throw new Error("no refusals");
			const lines = refusals
				.map((r) => `  ${r.file ?? "?"}: ${r.reason ?? "drift"} — ${r.fix ?? ""}`)
				.join("\n");
			return `config-sync refused (out-of-band live edit):\n${lines}\nNever adopted silently — resolve explicitly, then re-run.`;
		} catch {
			return "config-sync refused (out-of-band live edit) — run `weavelog sync` for the refusal report. Never adopted silently — resolve explicitly (--adopt / --force), then re-run.";
		}
	}

	return {
		// SINGLE tool.execute.after handler — JS object keys must be unique.
		// Merged Hook 1 (frontmatter) + Hook 5 (review SOP reminder).
		"tool.execute.after": async (input, output) => {
			if (enforceDisabled()) return;
			// Hook 9 follow-through: surface a session-start sync refusal exactly
			// once, on the first tool result of the offending session.
			const pending = pendingConfigWarnings.get(input.sessionID);
			if (pending !== undefined) {
				pendingConfigWarnings.delete(input.sessionID);
				output.metadata = { ...output.metadata, config_sync_warning: pending };
			}
			if (input.tool !== "edit") return;
			const filePath = input.args?.filePath;
			if (typeof filePath !== "string" || !filePath.endsWith(".md")) return;

			// Hook 1: frontmatter enforcement on research docs (report-only — the
			// edit already happened, so this never blocks).
			if (filePath.startsWith(`${RESEARCH_DIR}/`) && exists(FRONTMATTER_CHECK)) {
				// frontmatter-check takes DIRECTORIES (see its --help), not files —
				// validate the directory the edit touched.
				const dir = dirname(filePath);
				try {
					const result = await withTimeout(
						$`node ${FM.prefix} ${FM.path} ${dir}`.quiet().nothrow(),
						timeouts.checkMs,
					);
					if (result?.exitCode === 1) {
						output.metadata = {
							...output.metadata,
							frontmatter_warning: `⚠ frontmatter-check violations near ${filePath}:\n${result.text()}\nRun \`node ${FM.prefix.join(" ")} ${FM.path} --fix ${dir}\` to fix.`,
						};
					} else if (result?.exitCode === 0) {
						output.metadata = {
							...output.metadata,
							frontmatter_check: "✓ frontmatter valid",
						};
					}
					// exit 2 (checker error) or null (timeout/crash): fail-open, stay silent.
				} catch {
					// fail-open — a broken `$` shell tag that throws synchronously
					// must never break a session. Hook 5 below still gets to run.
				}
			}

			// Hook 5: review SOP reminder on plan docs (nudge, not a gate).
			if (filePath.startsWith(`${PLANS_DIR}/`) && exists(REVIEWER_LOOP)) {
				output.metadata = {
					...output.metadata,
					review_reminder: `Run \`bun ${REVIEWER_LOOP} --plan ${filePath} --models z-ai/glm-5.3-flash,moonshotai/kimi-k3\` for cross-model review (runbook SOP §6.3).`,
				};
			}
		},

		"tool.execute.before": async (input, output) => {
			if (enforceDisabled()) return;

			// Hook 8: live-harness write-block — one-way config flow. The repo
			// (~/.agents/config/**) is the single source of truth; live
			// (~/.config/opencode/**) is materialized by config-sync, never
			// hand-edited. Escape hatch: ENFORCE_ALLOW_LIVE_EDIT=true.
			// Best-effort scope: edit/write tools only; bash-path live edits are a
			// documented gap that the session-start drift check (Hook 9) surfaces.
			// The filePath is canonicalized (realpath, deepest-existing-ancestor
			// fallback) before the prefix check so relative paths, `..` segments,
			// and symlinks cannot dodge the block (reviewer fix).
			if (input.tool === "edit" || input.tool === "write") {
				const filePath = output.args?.filePath;
				if (typeof filePath === "string" && !allowLiveEdit()) {
					if (isLiveHarnessPath(filePath)) {
						throw new Error(
							`Blocked: ${filePath} is a live harness file — edit the tracked repo copy under ~/.agents/config/ instead, then materialize with \`bun ~/.agents/bin/src/config-sync.ts\`. Intentional one-off: set ENFORCE_ALLOW_LIVE_EDIT=true.`,
						);
					}
				}
			}

			// Hook 6: write-block — no file writes (edit/write) on the harness
			// repo's main/master branch. Complements the git pre-commit hook by
			// blocking writes BEFORE they land. Scope-limited to ~/.agents so the
			// global plugin never blocks work in other repos.
			// Uses gitBranch (spawnSync) instead of `$` because the `$` shell tag
			// throws synchronously in opencode 1.18.18 — withTimeout only catches
			// async rejections, so the catch would fire and fail open every time.
			if (input.tool === "edit" || input.tool === "write") {
				const filePath = output.args?.filePath;
				if (typeof filePath !== "string") return; // fail-open
				if (!filePath.startsWith(HARNESS_ROOT)) return; // not the harness repo
				// Climb to the nearest EXISTING ancestor directory before calling
				// `git -C`: the write/edit tool may target a file whose parent
				// directory does not exist yet. `git -C <nonexistent>` exits 128,
				// which would fail-open and let the write land on main — a bypass.
				let dir = dirname(filePath);
				while (!exists(dir)) {
					const up = dirname(dir);
					if (up === dir) break; // reached the filesystem root
					dir = up;
				}
				let name: string;
				try {
					name = gitBranch(dir);
				} catch {
					// fail-open on any machinery error (spawnSync failure, etc.)
					return;
				}
				if (!name) return; // git failure (non-zero exit, empty stdout): fail-open
				if (name === "main" || name === "master") {
					throw new Error(
						"Blocked: no file writes on main. Work in .worktrees/<task-id> (branch task/<task-id>). Rules: docs/architecture/worktree-discipline.md.",
					);
				}
				return; // task branch — allowed
			}

			if (input.tool !== "bash") return;
			const command = output.args?.command;
			if (typeof command !== "string") return;

			// Hook 3: dangerous command gate — runs first so a dangerous command
			// is blocked even when chained with git commit.
			for (const rule of DENYLIST) {
				if (rule.pattern.test(command)) {
					throw new Error(
						`Blocked: ${rule.message}. If this is intentional, explain why in the task and run it manually outside the agent.`,
					);
				}
			}

			// Hook 7: backlog task lifecycle gate — blocks `backlog task create` and
			// `backlog task edit --status` on main. The conductor must be in a worktree
			// to create tasks or change task status. Uses gitBranch (spawnSync) to
			// check the branch — same pattern as Hook 6.
			if (BACKLOG_CREATE_RE.test(command) || BACKLOG_STATUS_RE.test(command)) {
				const dir = process.cwd();
				let branchName: string;
				try {
					branchName = gitBranch(dir);
				} catch {
					return; // fail-open on machinery error
				}
				if (!branchName) return; // git failure: fail-open
				if (branchName === "main" || branchName === "master") {
					throw new Error(
						"Blocked: no backlog task creation or status changes on main. Create a worktree first with `bun ~/.agents/bin/src/worktree-create.ts --create <title>` (new task) or `bun ~/.agents/bin/src/worktree-create.ts <task-id>` (existing task). Rules: docs/architecture/worktree-discipline.md.",
					);
				}
				// Hook 10: quality nudge on ANY non-main branch — `backlog task create`
				// without a description, without --ac, or with --no-dod-defaults throws
				// with fix guidance. Runs only for create (status edits are not
				// creation); Hook 7's main-scope check ran first, so behavior on main
				// is unchanged.
				if (BACKLOG_CREATE_RE.test(command)) {
					await enforceCreateQuality(command);
				}
				return; // task branch — allowed
			}

			// Hook 2: commit gate — PHYSICS, not a prompt. Blocks the commit when
			// staged research docs have frontmatter violations.
			// Uses runCmd (spawnSync) instead of `$` because the `$` shell tag
			// throws synchronously in opencode 1.18.18 — withTimeout only catches
			// async rejections, so the catch would fire and fail open every time.
			if (COMMIT_RE.test(command) && exists(FRONTMATTER_CHECK)) {
				try {
					const staged = runCmd(
						"git",
						["diff", "--cached", "--name-only", "--", `${RESEARCH_DIR}/`],
						{ timeout: timeouts.checkMs },
					);
					if (staged.status !== 0) return; // git failure: fail-open
					if (!staged.stdout) return; // no staged research docs
					// frontmatter-check takes DIRECTORIES (see its --help) — validate the
					// research dir by absolute path (no dependence on the shell's cwd).
					const result = runCmd("node", [...FM.prefix, FM.path, RESEARCH_DIR], {
						timeout: timeouts.checkMs,
					});
					if (result.status === 1) {
						throw new FrontmatterViolationError(
							`frontmatter violations detected in staged research docs — fix before committing:\n${result.stdout}\nRun \`node ${FM.prefix.join(" ")} ${FM.path} --fix ${RESEARCH_DIR}\` to fix.`,
						);
					}
					// exit 0/2 or null: fail-open (a broken checker must not block commits).
				} catch (e) {
					// Re-throw the intentional block; fail-open on any machinery
					// error (including a broken spawnSync — though spawnSync is
					// synchronous and does not use the `$` shell tag).
					if (e instanceof FrontmatterViolationError) throw e;
					return;
				}
			}
		},

		event: async ({ event }) => {
			if (enforceDisabled()) return;

			// Hook 9: session-start auto-materialize — forward-only config-sync
			// (repo -> live) once per session, no rescue flags (never --adopt,
			// never --force: a refusal means a human decides). Runs through the
			// ASYNC runner (Bun.spawn) so the opencode event loop is never blocked
			// (reviewer fix); happy path is a sub-100ms all-skip. Fail-open on any
			// machinery error (missing script, crash, timeout, exit 2); a refusal
			// (exit 1) is stashed, logged, and surfaced loudly via tool.execute.after
			// metadata on the session's next tool call.
			// session.created shape per @opencode-ai/plugin + sdk dist types
			// (EventSessionCreated: properties.info.id, verified 2026-09-01).
			if (event?.type === "session.created") {
				const sessionID = sessionIdFrom(event);
				if (sessionID === null || syncedSessions.has(sessionID)) return;
				boundedRemember(syncedSessions, sessionID);
				if (!exists(CONFIG_SYNC)) return;
				try {
					// single timeout owner (reviewer fix): the DEFAULT runner kills
					// its own proc at syncMs; only an INJECTED runner gets wrapped
					const result = deps.runConfigSync
						? await withTimeout(runConfigSync(), timeouts.syncMs)
						: await runConfigSync();
					if (result !== null && result.status === 1) {
						const warning = configSyncRefusalMessage(result.stdout);
						stashWarning(sessionID, warning);
						appendLog(
							`${new Date().toISOString()} config-sync refused (session ${sessionID}):\n${warning}\n`,
						);
					}
					// null (crash/timeout), exit 0 (synced/skip), and exit 2
					// (machinery) stay silent.
				} catch {
					// fail-open — a broken spawn must never break session start
				}
				return;
			}

			// Hook 4: failure learning, debounced to at most once per session. Opt-in.
			// (enforceDisabled already checked at the top of the handler.)
			if (!learnEnabled()) return;
			if (event?.type !== "session.idle") return;
			const sessionID = event.properties?.sessionID;
			if (typeof sessionID !== "string" || learnedSessions.has(sessionID)) return;
			// Not attempted while headroom is absent — do NOT mark, so the session
			// retries after a later install. Marking happens once an attempt begins
			// (even a failed one) so a crashing headroom cannot stall every idle.
			if (!exists(HEADROOM_BIN)) return;
			if (learnedSessions.size >= MAX_LEARNED_SESSIONS) {
				const oldest = learnedSessions.values().next().value;
				if (oldest !== undefined) learnedSessions.delete(oldest);
			}
			learnedSessions.add(sessionID);

			// Dry-run by default; --apply is opt-in via env var (plan §2b.3).
			const apply = env.HEADROOM_LEARN_AUTO_APPLY === "true";
			try {
				const result = await withTimeout(
					(apply
						? $`${HEADROOM_BIN} learn --agent opencode --apply --target ${LEARN_TARGET} --model ${LEARN_MODEL}`
						: $`${HEADROOM_BIN} learn --agent opencode --target ${LEARN_TARGET} --model ${LEARN_MODEL}`
					)
						.quiet()
						.nothrow(),
					timeouts.learnMs,
				);
				const text = result?.text().trim();
				if (text) appendLog(`${new Date().toISOString()}\n${text}\n`);
			} catch {
				// fail-open — a broken `$` shell tag that throws synchronously
				// must never crash the idle handler.
				return;
			}
		},
	};
}

export const Enforce: Plugin = async ({ $ }) =>
	createHooks({
		$: $ as unknown as ShellTag,
		home: homedir(),
		env: process.env,
	}) as unknown as PluginHooks;
