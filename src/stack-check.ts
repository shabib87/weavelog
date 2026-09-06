#!/usr/bin/env -S node --import tsx
/**
 * stack-check — weekly version-drift checker for the agentic stack.
 * Report-only: NEVER applies updates. See AGENT-STACK-RUNBOOK.md for the
 * per-dependency "safe update procedure".
 *
 * Checks: headroom release, backlog.md version, markitdown version,
 * opencode app version,
 * diagram-design skill commit, OpenRouter expiration dates for the
 * configured models, config drift (tracked config/ vs live per the harness
 * manifest), and pointer targets in the live global AGENTS.md.
 *
 * Exit codes: 0 = no drift, 1 = drift found (check report), 2 = error.
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { excludedBy, normalizeRel } from "./config-sync.js";

const HELP = `Usage: bun stack-check.ts [options]

Options:
  --json <path>   Write report JSON here (default: ~/.local/state/weavelog/stack-check/stack-check-<date>.json,
                  or stack-check-proxy-<date>.json with --proxy)
  --no-notify     Skip the macOS notification
  --proxy         Run ONLY the proxy-wiring doctor (AC #4/#5): checks headroom
                  proxy health + cache mode, pi models.json, opencode baseURL,
                  the headroom extension dir, and headroom thresholds. Exit 0
                  when all pass, 1 when any check fails (each error names the fix).
  --help          Show this help

Report-only. Updates are applied manually via the runbook procedures.

Env overrides (proxy doctor):
  STACK_CHECK_PROXY_BASE           proxy host (default http://127.0.0.1:8788)
  STACK_CHECK_PI_DIR                pi agent dir (default ~/.pi/agent)
  STACK_CHECK_PI_BASE_URL           expected pi models.json baseUrl (default $STACK_CHECK_PROXY_BASE/v1)
  STACK_CHECK_OPENCODE_BASE_URL     expected opencode baseURL (default http://localhost:8788/v1)
  STACK_CHECK_OPENCODE_CONFIG       opencode config path (default ~/.config/opencode/opencode.jsonc)
  STACK_CHECK_HEADROOM_EXT         headroom extension dir (default $STACK_CHECK_PI_DIR/extensions/headroom)
  STACK_CHECK_HEADROOM_SETTINGS     headroom thresholds path (default $STACK_CHECK_PI_DIR/headroom/settings.json)
  STACK_CHECK_NPM_REGISTRY_URL      backlog.md latest-version endpoint (default https://registry.npmjs.org/backlog.md/latest)
  STACK_CHECK_OPENROUTER_MODELS_URL OpenRouter models catalog endpoint (default https://openrouter.ai/api/v1/models)

Env overrides (config drift + pointer checks):
  STACK_CHECK_CONFIG_DIR           tracked config root (default <repo>/config)
  STACK_CHECK_CONFIG_LIVE_DIR      live config root (default ~/.config/opencode)

Note: STACK_CHECK_PI_BASE_URL and STACK_CHECK_OPENCODE_BASE_URL track independently; set both when overriding STACK_CHECK_PROXY_BASE.`;

const HOME = homedir();
const manifestPath = join(HOME, ".agents", "stack-versions.json");
const reportsDir = join(HOME, ".local", "state", "weavelog", "stack-check");
const authPath = join(HOME, ".local", "share", "opencode", "auth.json");
const repoRoot = fileURLToPath(new URL("..", import.meta.url));

interface Manifest {
	headroom: string;
	backlogMd: string;
	markitdown: string;
	opencodeApp: string;
	piApp: string;
	diagramDesignCommit: string;
	diagramDesignRepo: string;
	models: string[];
	updatedAt: string;
}

function readManifest(): Manifest {
	if (!existsSync(manifestPath)) {
		console.error(`manifest missing: ${manifestPath} — run the runbook bootstrap first`);
		process.exit(2);
	}
	return JSON.parse(readFileSync(manifestPath, "utf8")) as Manifest;
}

function readOpenRouterKey(): string {
	const auth = JSON.parse(readFileSync(authPath, "utf8")) as {
		openrouter?: { key?: string };
	};
	if (!auth.openrouter?.key) {
		console.error(`no openrouter key in ${authPath}`);
		process.exit(2);
	}
	return auth.openrouter.key;
}

function run(cmd: string, cmdArgs: string[]): string {
	const r = spawnSync(cmd, cmdArgs, { encoding: "utf8", timeout: 60_000 });
	return (r.stdout || "").trim();
}

function sha256File(p: string): string {
	return createHash("sha256").update(readFileSync(p)).digest("hex");
}

// ---------------------------------------------------------------------------
// Config drift + pointer checks (TASK-23 ACs #5 and #10)
//
// checkConfigDrift: byte-compares every file in the harness manifest's
// explicit live->tracked map (trackedRoot <-> liveRoot). Every drift line
// names the file AND both fixes (re-materialize via config-sync OR commit
// the change). Exclusion prefixes and containment checks SHARE the
// config-sync helpers (excludedBy/normalizeRel) so stack-check flags exactly
// what config-sync would refuse. Report-only — nothing is written.
// checkPointerTargets: extracts backtick-quoted absolute-ish paths (starting
// with ~/ or /) from the thin global AGENTS.md, homedir-expands them, and
// verifies each target exists. Missing targets are drift with both fixes.
// ---------------------------------------------------------------------------

export interface ConfigDriftOptions {
	trackedRoot: string;
	liveRoot: string;
	harnessManifestPath: string;
}

const CONFIG_FIXES = `fixes: re-materialize via weavelog sync OR commit the change`;

export function checkConfigDrift(opts: ConfigDriftOptions): {
	check: Record<string, unknown>;
	drift: string[];
} {
	const files: Record<string, { tracked: string | null; live: string | null; manifest: null }> = {};
	if (!existsSync(opts.harnessManifestPath)) {
		return {
			check: { present: false, manifestPath: opts.harnessManifestPath, files },
			drift: [`harness manifest missing at ${opts.harnessManifestPath} — ${CONFIG_FIXES}`],
		};
	}
	let manifest: { files?: Record<string, string>; exclusions?: string[] };
	try {
		manifest = JSON.parse(readFileSync(opts.harnessManifestPath, "utf8")) as {
			files?: Record<string, string>;
			exclusions?: string[];
		};
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		return {
			check: {
				present: true,
				parseError: true,
				manifestPath: opts.harnessManifestPath,
				files,
			},
			drift: [
				`harness manifest unparseable at ${opts.harnessManifestPath} (${msg}) — ${CONFIG_FIXES}`,
			],
		};
	}
	const drift: string[] = [];
	const exclusions = manifest.exclusions ?? [];
	for (const [liveRel, trackedRel] of Object.entries(manifest.files ?? {})) {
		// containment: a rel that escapes its root after normalization is drift
		// (config-sync would refuse to sync it); exclusions run on the
		// NORMALIZED rel so "agents/../secrets/x" cannot dodge the prefix
		const liveNorm = normalizeRel(opts.liveRoot, liveRel);
		const trackedNorm = normalizeRel(opts.trackedRoot, trackedRel);
		if (
			liveNorm === "" ||
			trackedNorm === "" ||
			liveNorm.startsWith("..") ||
			trackedNorm.startsWith("..") ||
			isAbsolute(liveNorm) ||
			isAbsolute(trackedNorm)
		) {
			files[liveRel] = { tracked: null, live: null, manifest: null };
			const offender =
				liveNorm.startsWith("..") || liveNorm === "" || isAbsolute(liveNorm) ? liveRel : trackedRel;
			drift.push(
				`config drift: '${offender}' escapes its root in ${opts.harnessManifestPath}; ${CONFIG_FIXES}`,
			);
			continue;
		}
		const excluded = excludedBy(liveNorm, exclusions) ?? excludedBy(trackedNorm, exclusions);
		if (excluded) {
			files[liveRel] = { tracked: null, live: null, manifest: null };
			continue; // excluded rels are never synced by config-sync -> no drift
		}
		const trackedPath = join(opts.trackedRoot, trackedNorm);
		const livePath = join(opts.liveRoot, liveNorm);
		const trackedHash = existsSync(trackedPath) ? sha256File(trackedPath) : null;
		const liveHash = existsSync(livePath) ? sha256File(livePath) : null;
		files[liveRel] = { tracked: trackedHash, live: liveHash, manifest: null };
		if (trackedHash === null) {
			drift.push(
				`config drift: ${liveRel} — tracked file missing at ${trackedPath}; ${CONFIG_FIXES}`,
			);
		} else if (liveHash === null) {
			drift.push(`config drift: ${liveRel} — live file missing at ${livePath}; ${CONFIG_FIXES}`);
		} else if (trackedHash !== liveHash) {
			drift.push(
				`config drift: ${liveRel} — tracked ${trackedHash.slice(0, 8)} differs from live ${liveHash.slice(0, 8)}; ${CONFIG_FIXES}`,
			);
		}
	}
	return {
		check: { present: true, manifestPath: opts.harnessManifestPath, files },
		drift,
	};
}

export interface PointerEntry {
	raw: string;
	expanded: string;
	exists: boolean;
}

export function checkPointerTargets(
	content: string,
	sourcePath: string,
	home: string,
): { check: Record<string, unknown>; drift: string[] } {
	const pointers: PointerEntry[] = [];
	const drift: string[] = [];
	const re = /`([^`]+)`/g;
	for (const m of content.matchAll(re)) {
		const raw = m[1];
		if (!raw.startsWith("~/") && !raw.startsWith("/")) continue;
		const expanded = raw.startsWith("~/") ? join(home, raw.slice(2)) : raw;
		const exists = existsSync(expanded);
		pointers.push({ raw, expanded, exists });
		if (!exists) {
			drift.push(
				`pointer target missing: ${sourcePath} references \`${raw}\` (expanded ${expanded}) — ${CONFIG_FIXES}`,
			);
		}
	}
	return { check: { source: sourcePath, pointers }, drift };
}

export function checkDiagramDesign(
	pinned: string,
	repoDir: string,
): { check: Record<string, unknown>; drift: string[] } {
	if (!pinned) {
		return {
			check: {
				installed: false,
				current: null,
				pinned: "",
				localPath: repoDir,
			},
			drift: ["diagram-design pinned commit empty in manifest"],
		};
	}
	if (!existsSync(repoDir)) {
		return {
			check: { installed: false, current: null, pinned, localPath: repoDir },
			drift: [`diagram-design skill missing at ${repoDir}`],
		};
	}
	const current = run("git", ["-C", repoDir, "rev-parse", "HEAD"]);
	const check: Record<string, unknown> = {
		installed: true,
		current: current || null,
		pinned,
		localPath: repoDir,
	};
	if (!current) {
		return {
			check,
			drift: [`diagram-design git metadata unavailable at ${repoDir} (pinned ${pinned})`],
		};
	}
	if (!current.startsWith(pinned)) {
		return {
			check,
			drift: [`diagram-design skill ${current} != pinned ${pinned}`],
		};
	}
	return { check, drift: [] };
}

export function checkMarkitdown(
	binPath: string,
	manifestVersion: string,
): { check: Record<string, unknown>; drift: string[] } {
	const keySet = manifestVersion !== "";
	if (!existsSync(binPath)) {
		return {
			check: {
				current: "(missing)",
				manifest: keySet ? manifestVersion : "(unset)",
				binary: binPath,
			},
			drift: keySet
				? [`markitdown binary missing at ${binPath} (manifest ${manifestVersion})`]
				: [`markitdown manifest key missing and binary missing at ${binPath}`],
		};
	}
	const current = run(binPath, ["--version"]).replace(/^markitdown /, "");
	if (!keySet) {
		return {
			check: { current, manifest: "(unset)" },
			drift: [`markitdown manifest key missing (installed ${current})`],
		};
	}
	const check: Record<string, unknown> = { current, manifest: manifestVersion };
	if (current !== manifestVersion) {
		return { check, drift: [`markitdown ${manifestVersion} -> ${current}`] };
	}
	return { check, drift: [] };
}

async function fetchJson(url: string, headers: Record<string, string>): Promise<any> {
	const res = await fetch(url, {
		headers,
		signal: AbortSignal.timeout(60_000),
	});
	if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
	return res.json();
}

// ---------------------------------------------------------------------------
// Proxy doctor (TASK-20 ACs #4 and #5)
//
// Verifies the headroom stack is wired correctly: proxy healthy + cache mode,
// pi models.json + opencode config point at the proxy, the local headroom
// extension is present, and the headroom thresholds are set high enough.
// Each failing check names the fix, not just the problem (AC #5).
// ---------------------------------------------------------------------------

/** Strip line (//) and block comments from JSONC, preserving string contents. */
export function stripJsoncComments(text: string): string {
	let out = "";
	let i = 0;
	let inString = false;
	let stringQuote = "";
	while (i < text.length) {
		const c = text[i];
		const next = text[i + 1];
		if (inString) {
			out += c;
			if (c === "\\") {
				// escaped char — copy the escape + next char verbatim
				out += next ?? "";
				i += 2;
				continue;
			}
			if (c === stringQuote) inString = false;
			i += 1;
			continue;
		}
		// not in a string
		if (c === '"' || c === "'") {
			inString = true;
			stringQuote = c;
			out += c;
			i += 1;
			continue;
		}
		if (c === "/" && next === "/") {
			// line comment — skip to end of line
			const nl = text.indexOf("\n", i);
			i = nl === -1 ? text.length : nl;
			continue;
		}
		if (c === "/" && next === "*") {
			// block comment — skip to closing */
			const close = text.indexOf("*/", i + 2);
			i = close === -1 ? text.length : close + 2;
			continue;
		}
		out += c;
		i += 1;
	}
	return out;
}

/** Parse JSONC (JSON with comments) to a value. Throws on parse failure. */
export function parseJsonc(text: string): unknown {
	return JSON.parse(stripJsoncComments(text));
}

export interface CheckResult {
	check: Record<string, unknown>;
	drift: string[];
}

/** (a) Proxy healthy: ready === true OR status === "healthy". */
export function checkProxyHealth(health: unknown, baseUrl: string): CheckResult {
	const h = (health ?? {}) as { status?: string; ready?: boolean };
	const isHealthy = h.ready === true || h.status === "healthy";
	const check: Record<string, unknown> = {
		baseUrl,
		healthy: isHealthy,
		status: h.status ?? null,
		ready: h.ready ?? null,
	};
	if (isHealthy) return { check, drift: [] };
	return {
		check,
		drift: [
			`headroom proxy not healthy at ${baseUrl} — start it: launchctl load ~/Library/LaunchAgents/com.headroom.proxy.plist (or check: launchctl print gui/$(id -u)/com.headroom.proxy)`,
		],
	};
}

/** (b) Proxy mode via /stats summary.mode. */
export function checkProxyMode(stats: unknown, expectedMode: string, baseUrl: string): CheckResult {
	const s = (stats ?? {}) as { summary?: { mode?: string } };
	const mode = s?.summary?.mode;
	const check: Record<string, unknown> = {
		baseUrl,
		mode: mode ?? null,
		expected: expectedMode,
	};
	if (!mode) {
		return {
			check,
			drift: [
				`headroom proxy /stats missing summary.mode — expected mode '${expectedMode}'; upgrade or restart headroom: launchctl kickstart -k gui/$(id -u)/com.headroom.proxy`,
			],
		};
	}
	if (mode !== expectedMode) {
		return {
			check,
			drift: [
				`headroom proxy mode is '${mode}', expected '${expectedMode}' — fix: the launchd plist must pass --mode cache (cache mode is non-negotiable, see research doc §2)`,
			],
		};
	}
	return { check, drift: [] };
}

/** (c) pi models.json providers.openrouter.baseUrl === expected. */
export function checkPiModelsConfig(models: unknown, expectedBaseUrl: string): CheckResult {
	const m = (models ?? {}) as {
		providers?: { openrouter?: { baseUrl?: string } };
	};
	const actual = m?.providers?.openrouter?.baseUrl;
	const check: Record<string, unknown> = {
		expectedBaseUrl,
		actualBaseUrl: actual ?? null,
	};
	if (!actual) {
		return {
			check,
			drift: [
				`pi models.json providers.openrouter.baseUrl is missing — set it to '${expectedBaseUrl}'`,
			],
		};
	}
	if (actual !== expectedBaseUrl) {
		return {
			check,
			drift: [
				`pi models.json providers.openrouter.baseUrl is '${actual}', expected '${expectedBaseUrl}' — set providers.openrouter.baseUrl in that file`,
			],
		};
	}
	return { check, drift: [] };
}

/** (d) opencode config provider.openrouter.options.baseURL === expected. */
export function checkOpencodeConfig(config: unknown, expectedBaseUrl: string): CheckResult {
	const c = (config ?? {}) as {
		provider?: { openrouter?: { options?: { baseURL?: string } } };
	};
	const actual = c?.provider?.openrouter?.options?.baseURL;
	const check: Record<string, unknown> = {
		expectedBaseUrl,
		actualBaseUrl: actual ?? null,
	};
	if (!actual) {
		return {
			check,
			drift: [
				`opencode provider.openrouter.options.baseURL is missing — set it to '${expectedBaseUrl}'`,
			],
		};
	}
	if (actual !== expectedBaseUrl) {
		return {
			check,
			drift: [
				`opencode provider.openrouter.options.baseURL is '${actual}', expected '${expectedBaseUrl}' — set it in the opencode config`,
			],
		};
	}
	return { check, drift: [] };
}

/** (e) headroom extension present at the given dir. */
export function checkExtensionPresent(extDir: string): CheckResult {
	const present = existsSync(extDir);
	const check: Record<string, unknown> = { path: extDir, present };
	if (present) return { check, drift: [] };
	return {
		check,
		drift: [
			`headroom extension missing at ${extDir} — restore the local extension (see research doc §4: never use @ryan_nookpi/pi-extension-headroom)`,
		],
	};
}

/** (f) headroom thresholds set high enough (minContextTokens, minMessageChars). */
export function checkThresholds(
	settings: unknown,
	minContext: number,
	minMessage: number,
): CheckResult {
	const s = (settings ?? {}) as {
		minContextTokens?: number;
		minMessageChars?: number;
	};
	const ctx = typeof s?.minContextTokens === "number" ? s.minContextTokens : undefined;
	const msg = typeof s?.minMessageChars === "number" ? s.minMessageChars : undefined;
	const check: Record<string, unknown> = {
		minContextTokens: ctx ?? null,
		minMessageChars: msg ?? null,
		requiredMinContext: minContext,
		requiredMinMessage: minMessage,
	};
	const drift: string[] = [];
	if (ctx === undefined) {
		drift.push(
			`minContextTokens is missing, must be >= ${minContext} — set it in the headroom settings`,
		);
	} else if (ctx < minContext) {
		drift.push(
			`minContextTokens is ${ctx}, must be >= ${minContext} — raise it (see research doc §5 for the data-backed threshold)`,
		);
	}
	if (msg === undefined) {
		drift.push(
			`minMessageChars is missing, must be >= ${minMessage} — set it in the headroom settings`,
		);
	} else if (msg < minMessage) {
		drift.push(
			`minMessageChars is ${msg}, must be >= ${minMessage} — raise it (see research doc §5)`,
		);
	}
	return { check, drift };
}

export interface ProxyFetchResult {
	ok: boolean;
	status: number;
	json: () => Promise<unknown>;
}
export type ProxyFetch = (url: string) => Promise<ProxyFetchResult>;

export interface ProxyChecksOptions {
	proxyBaseUrl: string;
	expectedMode: string;
	piExpectedBaseUrl: string;
	opencodeExpectedBaseUrl: string;
	piModelsPath: string;
	opencodeConfigPath: string;
	extDir: string;
	settingsPath: string;
	minContextTokens: number;
	minMessageChars: number;
	fetchFn: ProxyFetch;
}

/** Sentinel for "no value fetched/parsed yet" — distinct from JSON null. */
const UNSET = Symbol("unset");

/**
 * Run all proxy-wiring checks. File reads use the real filesystem
 * (like checkDiagramDesign); the proxy fetch is dependency-injected so
 * tests can stub it. Each drift line names the fix (AC #5).
 */
export async function runProxyChecks(
	opts: ProxyChecksOptions,
): Promise<{ checks: Record<string, unknown>; drift: string[] }> {
	const checks: Record<string, unknown> = {};
	const drift: string[] = [];

	// (a) proxy health
	let healthData: unknown = UNSET;
	try {
		const res = await opts.fetchFn(`${opts.proxyBaseUrl}/health`);
		if (!res.ok) {
			checks.proxyHealth = {
				baseUrl: opts.proxyBaseUrl,
				reachable: true,
				httpStatus: res.status,
			};
			drift.push(
				`headroom proxy returned HTTP ${res.status} at ${opts.proxyBaseUrl}/health — check proxy logs and verify this headroom version exposes /health and /stats (launchctl print gui/$(id -u)/com.headroom.proxy)`,
			);
		} else {
			healthData = await res.json();
		}
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		checks.proxyHealth = { baseUrl: opts.proxyBaseUrl, reachable: false };
		drift.push(
			`cannot reach headroom proxy at ${opts.proxyBaseUrl}/health — is the proxy running? start: launchctl load ~/Library/LaunchAgents/com.headroom.proxy.plist (${msg})`,
		);
	}
	if (healthData !== UNSET) {
		if (healthData === null) {
			checks.proxyHealth = {
				baseUrl: opts.proxyBaseUrl,
				reachable: true,
				healthy: false,
			};
			drift.push(
				`invalid structure — expected an object at ${opts.proxyBaseUrl}/health (got null)`,
			);
		} else {
			const h = checkProxyHealth(healthData, opts.proxyBaseUrl);
			checks.proxyHealth = h.check;
			drift.push(...h.drift);
		}
	}

	// (b) proxy mode
	let statsData: unknown = UNSET;
	try {
		const res = await opts.fetchFn(`${opts.proxyBaseUrl}/stats`);
		if (!res.ok) {
			checks.proxyMode = {
				baseUrl: opts.proxyBaseUrl,
				reachable: true,
				httpStatus: res.status,
			};
			drift.push(
				`headroom proxy returned HTTP ${res.status} at ${opts.proxyBaseUrl}/stats — check proxy logs and verify this headroom version exposes /health and /stats (launchctl print gui/$(id -u)/com.headroom.proxy)`,
			);
		} else {
			statsData = await res.json();
		}
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		checks.proxyMode = { baseUrl: opts.proxyBaseUrl, reachable: false };
		drift.push(
			`cannot reach headroom proxy at ${opts.proxyBaseUrl}/stats — is the proxy running? start: launchctl load ~/Library/LaunchAgents/com.headroom.proxy.plist (${msg})`,
		);
	}
	if (statsData !== UNSET) {
		if (statsData === null) {
			checks.proxyMode = {
				baseUrl: opts.proxyBaseUrl,
				reachable: true,
				mode: null,
			};
			drift.push(`invalid structure — expected an object at ${opts.proxyBaseUrl}/stats (got null)`);
		} else {
			const m = checkProxyMode(statsData, opts.expectedMode, opts.proxyBaseUrl);
			checks.proxyMode = m.check;
			drift.push(...m.drift);
		}
	}

	// (c) pi models.json
	if (!existsSync(opts.piModelsPath)) {
		checks.piModels = { path: opts.piModelsPath, present: false };
		drift.push(
			`pi models.json missing at ${opts.piModelsPath} — create it with providers.openrouter.baseUrl = ${opts.piExpectedBaseUrl}`,
		);
	} else {
		let parsed: unknown = UNSET;
		try {
			parsed = JSON.parse(readFileSync(opts.piModelsPath, "utf8"));
		} catch (e) {
			const msg = e instanceof Error ? e.message : String(e);
			checks.piModels = {
				path: opts.piModelsPath,
				present: true,
				parseError: true,
			};
			drift.push(
				`cannot parse ${opts.piModelsPath} as JSON — fix the JSON syntax and retry (${msg})`,
			);
		}
		if (parsed !== UNSET) {
			if (parsed === null) {
				checks.piModels = {
					path: opts.piModelsPath,
					present: true,
					parseError: true,
				};
				drift.push(`invalid structure — expected an object at ${opts.piModelsPath} (got null)`);
			} else {
				const c = checkPiModelsConfig(parsed, opts.piExpectedBaseUrl);
				checks.piModels = { path: opts.piModelsPath, ...c.check };
				drift.push(...c.drift);
			}
		}
	}

	// (d) opencode config (JSONC)
	if (!existsSync(opts.opencodeConfigPath)) {
		checks.opencode = { path: opts.opencodeConfigPath, present: false };
		drift.push(
			`opencode config missing at ${opts.opencodeConfigPath} — create it with provider.openrouter.options.baseURL = ${opts.opencodeExpectedBaseUrl}`,
		);
	} else {
		let parsed: unknown = UNSET;
		try {
			parsed = parseJsonc(readFileSync(opts.opencodeConfigPath, "utf8"));
		} catch (e) {
			const msg = e instanceof Error ? e.message : String(e);
			checks.opencode = {
				path: opts.opencodeConfigPath,
				present: true,
				parseError: true,
			};
			drift.push(
				`cannot parse ${opts.opencodeConfigPath} as JSON (JSONC) — fix the syntax and retry (${msg})`,
			);
		}
		if (parsed !== UNSET) {
			if (parsed === null) {
				checks.opencode = {
					path: opts.opencodeConfigPath,
					present: true,
					parseError: true,
				};
				drift.push(
					`invalid structure — expected an object at ${opts.opencodeConfigPath} (got null)`,
				);
			} else {
				const c = checkOpencodeConfig(parsed, opts.opencodeExpectedBaseUrl);
				checks.opencode = { path: opts.opencodeConfigPath, ...c.check };
				drift.push(...c.drift);
			}
		}
	}

	// (e) extension dir
	const ext = checkExtensionPresent(opts.extDir);
	checks.headroomExtension = ext.check;
	drift.push(...ext.drift);

	// (f) thresholds
	if (!existsSync(opts.settingsPath)) {
		checks.thresholds = { path: opts.settingsPath, present: false };
		drift.push(
			`headroom settings missing at ${opts.settingsPath} — create it with minContextTokens >= ${opts.minContextTokens} and minMessageChars >= ${opts.minMessageChars}`,
		);
	} else {
		let parsed: unknown = UNSET;
		try {
			parsed = JSON.parse(readFileSync(opts.settingsPath, "utf8"));
		} catch (e) {
			const msg = e instanceof Error ? e.message : String(e);
			checks.thresholds = {
				path: opts.settingsPath,
				present: true,
				parseError: true,
			};
			drift.push(
				`cannot parse ${opts.settingsPath} as JSON — fix the JSON syntax and retry (${msg})`,
			);
		}
		if (parsed !== UNSET) {
			if (parsed === null) {
				checks.thresholds = {
					path: opts.settingsPath,
					present: true,
					parseError: true,
				};
				drift.push(`invalid structure — expected an object at ${opts.settingsPath} (got null)`);
			} else {
				const t = checkThresholds(parsed, opts.minContextTokens, opts.minMessageChars);
				checks.thresholds = { path: opts.settingsPath, ...t.check };
				drift.push(...t.drift);
			}
		}
	}

	return { checks, drift };
}

async function proxyMain(reportPath: string, notify: boolean) {
	const proxyBaseUrl = process.env.STACK_CHECK_PROXY_BASE ?? "http://127.0.0.1:8788";
	const piDir = process.env.STACK_CHECK_PI_DIR ?? join(HOME, ".pi", "agent");
	const opencodeConfigPath =
		process.env.STACK_CHECK_OPENCODE_CONFIG ?? join(HOME, ".config", "opencode", "opencode.jsonc");
	const extDir = process.env.STACK_CHECK_HEADROOM_EXT ?? join(piDir, "extensions", "headroom");
	const settingsPath =
		process.env.STACK_CHECK_HEADROOM_SETTINGS ?? join(piDir, "headroom", "settings.json");
	const piModelsPath = join(piDir, "models.json");
	const expectedMode = "cache";
	const piExpectedBaseUrl = process.env.STACK_CHECK_PI_BASE_URL ?? `${proxyBaseUrl}/v1`;
	const opencodeExpectedBaseUrl =
		process.env.STACK_CHECK_OPENCODE_BASE_URL ?? "http://localhost:8788/v1";

	const { checks, drift } = await runProxyChecks({
		proxyBaseUrl,
		expectedMode,
		piExpectedBaseUrl,
		opencodeExpectedBaseUrl,
		piModelsPath,
		opencodeConfigPath,
		extDir,
		settingsPath,
		minContextTokens: 100000,
		minMessageChars: 10000,
		fetchFn: async (url: string) => {
			const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
			return {
				ok: res.ok,
				status: res.status,
				json: () => res.json(),
			};
		},
	});

	const report: Record<string, unknown> = {
		date: new Date().toISOString(),
		mode: "proxy-doctor",
		drift,
		checks,
	};

	mkdirSync(reportsDir, { recursive: true });
	writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
	console.log(`report: ${reportPath}`);
	console.log(drift.length ? `PROXY DRIFT:\n  ${drift.join("\n  ")}` : "proxy wiring OK");

	if (drift.length && notify) {
		spawnSync("osascript", [
			"-e",
			`display notification "${drift.length} proxy wiring checks failed — see stack-check --proxy" with title "stack-check proxy doctor"`,
		]);
	}
	process.exit(drift.length ? 1 : 0);
}

async function main(reportPath: string, notify: boolean) {
	const manifest = readManifest();
	const key = readOpenRouterKey();
	const drift: string[] = [];
	const report: Record<string, unknown> = {
		date: new Date().toISOString(),
		drift: drift,
		checks: {},
	};
	const checks = report.checks as Record<string, unknown>;

	// 1. headroom
	const currentHeadroom = run(`${HOME}/.local/bin/headroom`, ["--version"]).replace(
		/^headroom, version /,
		"",
	);
	const updateCheck = run(`${HOME}/.local/bin/headroom`, ["update", "--check"]);
	const latestHeadroom = (updateCheck.match(/(\d+\.\d+\.\d+)/g) || []).pop() ?? currentHeadroom;
	checks.headroom = { current: currentHeadroom, latest: latestHeadroom };
	if (latestHeadroom !== currentHeadroom) {
		drift.push(`headroom ${currentHeadroom} -> ${latestHeadroom}`);
	}

	// 2. backlog.md (bun-global binary vs npm registry latest)
	const backlogBin = process.env.STACK_CHECK_BACKLOG_BIN ?? `${HOME}/.bun/bin/backlog`;
	if (!existsSync(backlogBin)) {
		checks.backlogMd = {
			current: "(missing)",
			latest: "(unknown)",
			binary: backlogBin,
		};
		drift.push(`backlog.md binary missing at ${backlogBin} (manifest ${manifest.backlogMd})`);
	} else {
		const currentBacklog = run(backlogBin, ["--version"]);
		let latestBacklog = "(unknown)";
		try {
			latestBacklog = (
				(await fetchJson(
					process.env.STACK_CHECK_NPM_REGISTRY_URL ??
						"https://registry.npmjs.org/backlog.md/latest",
					{},
				)) as { version: string }
			).version;
		} catch {
			// network failure is not drift — record and move on
		}
		checks.backlogMd = { current: currentBacklog, latest: latestBacklog };
		if (currentBacklog !== manifest.backlogMd) {
			drift.push(`backlog.md binary ${currentBacklog} != manifest ${manifest.backlogMd}`);
		} else if (latestBacklog !== "(unknown)" && latestBacklog !== manifest.backlogMd) {
			drift.push(`backlog.md ${manifest.backlogMd} -> ${latestBacklog}`);
		}
	}

	// 3. opencode app
	const appVersion = run("defaults", [
		"read",
		"/Applications/OpenCode.app/Contents/Info.plist",
		"CFBundleShortVersionString",
	]);
	checks.opencode = { app: appVersion, manifestApp: manifest.opencodeApp };
	if (appVersion !== manifest.opencodeApp)
		drift.push(`opencode app ${manifest.opencodeApp} -> ${appVersion}`);

	// 4. diagram-design skill (pinned commit drift)
	const skillsDir = process.env.STACK_CHECK_SKILLS_DIR ?? join(HOME, ".agents", "skills");
	const dd = checkDiagramDesign(manifest.diagramDesignCommit, join(skillsDir, "diagram-design"));
	checks.diagramDesign = {
		...dd.check,
		repo: manifest.diagramDesignRepo,
	};
	drift.push(...dd.drift);

	// 5. model expiry sweep
	const models = (await fetchJson(
		process.env.STACK_CHECK_OPENROUTER_MODELS_URL ?? "https://openrouter.ai/api/v1/models",
		{
			Authorization: `Bearer ${key}`,
		},
	)) as { data: { id: string; expiration_date?: string }[] };
	const byId = new Map(models.data.map((m) => [m.id, m.expiration_date]));
	checks.models = {};
	for (const id of manifest.models) {
		const expiry = byId.get(id);
		const entry = { present: byId.has(id), expirationDate: expiry ?? null };
		(checks.models as Record<string, unknown>)[id] = entry;
		if (!byId.has(id)) drift.push(`model missing from OpenRouter: ${id}`);
		else if (expiry && new Date(expiry).getTime() - Date.now() < 30 * 86_400_000) {
			drift.push(`model expiring soon: ${id} at ${expiry}`);
		}
	}

	// 6. pricing drift: litellm DB must hold live prices for manifest models
	// (headroom/litellm upgrades WIPE injected entries -> rerun sync-model-pricing --apply)
	const pricingBin =
		process.env.STACK_CHECK_PRICING_BIN ??
		(existsSync(new URL("../sync-model-pricing.js", import.meta.url))
			? fileURLToPath(new URL("../sync-model-pricing.js", import.meta.url))
			: fileURLToPath(new URL("../sync-model-pricing.ts", import.meta.url)));
	const pricing = spawnSync(process.execPath, [pricingBin, "--check"], {
		encoding: "utf8",
		timeout: 120_000,
	});
	checks.pricingSync = {
		exitCode: pricing.status,
		summary: (pricing.stdout || pricing.stderr || "").trim().split("\n")[0],
	};
	if (pricing.status === 1) {
		for (const line of (pricing.stdout || "").split("\n")) {
			const t = line.trim();
			if (t && !t.startsWith("PRICING DRIFT")) drift.push(`pricing: ${t}`);
		}
	} else if (pricing.status !== 0) {
		drift.push(`pricing check errored (exit ${pricing.status})`);
	}

	// 7. config drift: tracked config/ vs live per the harness manifest (AC #5)
	// Manifest paths are repo-root-relative (trackedRoot "."); the env override
	// replaces the whole tracked root (tests).
	const configDir = process.env.STACK_CHECK_CONFIG_DIR ?? repoRoot;
	const configLiveDir =
		process.env.STACK_CHECK_CONFIG_LIVE_DIR ?? join(HOME, ".config", "opencode");
	const manifestPath = join(configDir, "config", "harnesses", "opencode.json");
	const manifestForRoot = (() => {
		try {
			return JSON.parse(readFileSync(manifestPath, "utf8")) as {
				trackedRoot?: string;
			};
		} catch {
			return null;
		}
	})();
	const trackedRoot = manifestForRoot?.trackedRoot
		? resolve(configDir, manifestForRoot.trackedRoot)
		: configDir;
	const cfg = checkConfigDrift({
		trackedRoot,
		liveRoot: configLiveDir,
		harnessManifestPath: manifestPath,
	});
	checks.configSync = { ...cfg.check, trackedRoot, liveRoot: configLiveDir };
	drift.push(...cfg.drift);

	// 8. pointer targets in the live global AGENTS.md (AC #10)
	const liveAgentsMd = join(configLiveDir, "AGENTS.md");
	if (existsSync(liveAgentsMd)) {
		const ptr = checkPointerTargets(readFileSync(liveAgentsMd, "utf8"), liveAgentsMd, HOME);
		checks.pointerTargets = ptr.check;
		drift.push(...ptr.drift);
	} else {
		checks.pointerTargets = { present: false, path: liveAgentsMd };
		drift.push(`config drift: live global AGENTS.md missing at ${liveAgentsMd}; ${CONFIG_FIXES}`);
	}

	// 9. markitdown version drift (mirrors the headroom/backlogMd binary checks)
	const mi = checkMarkitdown(join(HOME, ".local", "bin", "markitdown"), manifest.markitdown ?? "");
	checks.markitdown = mi.check;
	drift.push(...mi.drift);

	mkdirSync(reportsDir, { recursive: true });
	writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
	console.log(`report: ${reportPath}`);
	console.log(drift.length ? `DRIFT:\n  ${drift.join("\n  ")}` : "no drift");

	if (drift.length && notify) {
		spawnSync("osascript", [
			"-e",
			`display notification "${drift.length} updates pending — see AGENT-STACK-RUNBOOK.md" with title "stack-check"`,
		]);
	}
	process.exit(drift.length ? 1 : 0);
}

if (
	process.argv[1] !== undefined &&
	import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
	const args = process.argv.slice(2);
	if (args.includes("--help")) {
		console.log(HELP);
		process.exit(0);
	}
	const jsonFlag = args.indexOf("--json");
	const proxyMode = args.includes("--proxy");
	const defaultName = proxyMode
		? `stack-check-proxy-${new Date().toISOString().slice(0, 10)}.json`
		: `stack-check-${new Date().toISOString().slice(0, 10)}.json`;
	const reportPath = jsonFlag >= 0 ? args[jsonFlag + 1] : join(reportsDir, defaultName);
	const notify = !args.includes("--no-notify");
	const runner = proxyMode ? proxyMain : main;
	runner(reportPath, notify).catch((err) => {
		console.error("stack-check error:", err?.message ?? err);
		process.exit(2);
	});
}
