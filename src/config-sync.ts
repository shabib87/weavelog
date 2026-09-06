#!/usr/bin/env -S node --import tsx
/**
 * config-sync — materialize tracked harness config from the repo to live.
 *
 * Forward-only (repo -> live); live -> repo happens only via explicit --adopt.
 * Direct edits to live harness dirs are out-of-band by design; they are
 * surfaced loudly (never silently adopted).
 *
 * The mapping contract is read from a machine-readable harness manifest
 * (default config/harnesses/opencode.json) — adding a harness means adding a
 * manifest file, no code change.
 *
 * Exit codes: 0 = ok/skip, 1 = drift/refusal/conflict, 2 = usage error or
 * missing/unparseable manifest/tracked file.
 */
import { createHash } from "node:crypto";
import { existsSync, lstatSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HELP = `Usage: bun config-sync.ts [options]

Materialize tracked harness config (repo) -> live directories, per the mapping
contract in a machine-readable harness manifest. Forward-only: repo is the
source of truth; live -> repo happens only via explicit --adopt.

Options:
  --tracked-root <dir>     Tracked config root (default: <repo>/<manifest.trackedRoot>)
  --live-root <dir>        Live config root (default: <manifest.liveRoot>, homedir-expanded)
  --harness-manifest <p>   Harness manifest path (default: <repo>/config/harnesses/opencode.json)
  --state <p>              Materialize state path (default: ~/.agents/state/config-materialize.json)
  --force                  Overwrite a live file that differs from the last materialized
                           state (local-edit rescue). Does NOT rescue conflicts.
  --adopt                  Adopt a live file that differs from the last materialized state
                           into the repo (local-edit rescue, live -> repo). Does NOT rescue
                           conflicts, and cannot adopt a live-file deletion.
  --help                   Show this help

Exit codes:
  0 = ok/skip (all files synced or already in sync)
  1 = drift/refusal/conflict (a live file was edited out-of-band, or a conflict
      where both tracked and live changed since the last materialization)
  2 = usage error, or missing/unparseable harness manifest, or a tracked file
      listed in the manifest is missing from the repo

Per-file branches (tracked = repo copy, live = installed copy, manifest =
state of the last materialization):
  tracked == manifest && live == manifest  -> skip (no-op)
  tracked != manifest && live == manifest  -> copy tracked -> live, update manifest
  tracked == live (regardless of manifest) -> skip AND re-record the manifest entry
                                              (live already matches the repo — safe;
                                              this is the crash-recovery path, see below)
  live   != manifest && tracked == manifest-> LOCAL EDIT: refuse (exit 1) unless
                                              --force (overwrite live) or --adopt
                                              (adopt live into repo); escape: delete the
                                              state file to re-adopt the live baseline
  both differ                              -> CONFLICT: refuse always; no flag rescues;
                                              escape: delete the state file to re-adopt
                                              the live baseline (resolve manually)
  no prior state (first run)               -> record current live files as the baseline
                                              manifest WITHOUT copying or refusing, then
                                              apply the branches above against it
                                              (identical files -> no-op); excluded rels
                                              are skipped by the baseline adoption

Crash recovery: the state file is written atomically (<state>.tmp + rename)
after ALL copies, so a mid-run crash leaves the previous state intact. If the
crash happened after a copy, tracked == live while the manifest is stale — the
branch above re-records the manifest and continues instead of dead-ending in a
permanent CONFLICT. The all-or-nothing refusals exit leaves the state untouched
too.

State manifest (~/.agents/state/config-materialize.json):
  { "version": 1, "updatedAt": "<ISO>", "files": { "<live-relative path>": "<sha256>" } }
  The hash records the sha256 of the bytes written to live (AC #12), so a future
  personal-to-portable render layer can slot between repo-read and live-write
  without changing drift semantics.

Harness manifest schema (config/harnesses/<name>.json):
  { "version": 1,
    "harness": "<id>",
    "liveRoot": "~/.config/opencode",
    "trackedRoot": ".",
    "files": { "<live-relative path>": "<tracked-relative path>" },
    "exclusions": ["secrets/", "node_modules/"],
    "pluginsDeferral": true }
  files is an explicit live->tracked path map; the opencode harness maps
  live "AGENTS.md" directly to the repo-root tracked "AGENTS.md" (trackedRoot
  ".", so the default tracked root IS the repo root — the dir containing bin/)
  and the rest repo-relative ("config/opencode.jsonc", "config/agents/*.md").
  A file entry under an excluded prefix is refused. pluginsDeferral records
  that plugins/ materialization is deferred (plugins stay at repo plugins/).

The tool NEVER deletes untracked live files and never touches excluded dirs
(secrets/, node_modules/). Report is JSON on stdout: { mode: "config-sync",
harness, trackedRoot, liveRoot, state, adoptedBaseline, exitCode, files:
{ <live-relative>: { action, trackedSha256, liveSha256, manifestSha256 } },
refusals: [{ file, reason, fix }] }.

Security: manifest live/tracked rels are normalized (path.resolve) and must
stay under their roots — traversal ("../x", absolute paths) exits 2. Exclusion
checks run on the NORMALIZED rel. Symlinked live or tracked paths are refused
(exit 2) — nothing is ever read or written through a link.

Env overrides: none — all inputs are flags (paths are never env-dependent).`;

const KNOWN_FLAGS = new Set([
	"--help",
	"--force",
	"--adopt",
	"--tracked-root",
	"--live-root",
	"--harness-manifest",
	"--state",
]);

const HOME = homedir();
const repoRoot = fileURLToPath(new URL("..", import.meta.url));

function expandHome(p: string): string {
	if (p === "~") return HOME;
	if (p.startsWith("~/")) return join(HOME, p.slice(2));
	return p;
}

/** Normalize a manifest-relative path against a root; returns the clean relative form. */
export function normalizeRel(root: string, rel: string): string {
	return relative(root, resolve(root, rel));
}

/** First exclusion prefix matching the (normalized) rel, or null. */
export function excludedBy(rel: string, exclusions: string[]): string | null {
	return exclusions.find((ex) => rel.startsWith(ex)) ?? null;
}

function isSymlink(p: string): boolean {
	try {
		return lstatSync(p).isSymbolicLink();
	} catch {
		return false; // missing is not a symlink
	}
}

function sha256Of(buf: Buffer): string {
	return createHash("sha256").update(buf).digest("hex");
}

function sha256File(p: string): string {
	return sha256Of(readFileSync(p));
}

// --- harness manifest ------------------------------------------------------

interface HarnessManifest {
	version: number;
	harness: string;
	liveRoot: string;
	trackedRoot: string;
	files: Record<string, string>;
	exclusions: string[];
	pluginsDeferral: boolean;
}

function readHarnessManifest(path: string): HarnessManifest {
	if (!existsSync(path)) {
		console.error(`harness manifest missing: ${path} (see --help)`);
		process.exit(2);
	}
	let raw: unknown;
	try {
		raw = JSON.parse(readFileSync(path, "utf8"));
	} catch (err) {
		console.error(`harness manifest unparseable: ${path}: ${(err as Error).message}`);
		process.exit(2);
	}
	const errors: string[] = [];
	const o = raw as Record<string, unknown>;
	if (o.version !== 1) errors.push(`version must be 1 (got ${JSON.stringify(o.version)})`);
	if (typeof o.harness !== "string" || !o.harness.trim())
		errors.push("harness must be a non-empty string");
	if (typeof o.liveRoot !== "string" || !o.liveRoot.trim())
		errors.push("liveRoot must be a non-empty string");
	if (typeof o.trackedRoot !== "string" || !o.trackedRoot.trim())
		errors.push("trackedRoot must be a non-empty string");
	if (
		o.files === null ||
		typeof o.files !== "object" ||
		Array.isArray(o.files) ||
		Object.keys(o.files as Record<string, unknown>).length === 0
	) {
		errors.push("files must be a non-empty object mapping live-relative -> tracked-relative paths");
	} else {
		for (const [live, tracked] of Object.entries(o.files as Record<string, unknown>)) {
			if (typeof tracked !== "string" || !tracked.trim())
				errors.push(`files.${live} must be a non-empty tracked-relative path string`);
		}
	}
	if (!Array.isArray(o.exclusions) || !o.exclusions.every((x) => typeof x === "string"))
		errors.push("exclusions must be an array of strings");
	if (typeof o.pluginsDeferral !== "boolean") errors.push("pluginsDeferral must be a boolean");
	if (errors.length) {
		console.error(`harness manifest invalid: ${path}\n  ${errors.join("\n  ")}`);
		process.exit(2);
	}
	return {
		version: o.version as number,
		harness: o.harness as string,
		liveRoot: o.liveRoot as string,
		trackedRoot: o.trackedRoot as string,
		files: o.files as Record<string, string>,
		exclusions: o.exclusions as string[],
		pluginsDeferral: o.pluginsDeferral as boolean,
	};
}

// --- materialize state -----------------------------------------------------

interface MaterializeState {
	version: number;
	updatedAt: string;
	files: Record<string, string>;
}

function readState(path: string): MaterializeState | null {
	if (!existsSync(path)) return null;
	let raw: unknown;
	try {
		raw = JSON.parse(readFileSync(path, "utf8"));
	} catch (err) {
		console.error(`state file corrupt: ${path}: ${(err as Error).message} (see --help)`);
		process.exit(2);
	}
	const o = raw as Record<string, unknown>;
	if (
		o.version !== 1 ||
		o.files === null ||
		typeof o.files !== "object" ||
		Array.isArray(o.files)
	) {
		console.error(
			`state file invalid: ${path}: expected { version: 1, files: { <path>: <sha256> } }`,
		);
		process.exit(2);
	}
	return {
		version: 1,
		updatedAt: typeof o.updatedAt === "string" ? o.updatedAt : new Date().toISOString(),
		files: o.files as Record<string, string>,
	};
}

// --- per-file branch logic -------------------------------------------------

type Decision =
	| { kind: "skip" }
	| { kind: "copy" }
	| { kind: "force" }
	| { kind: "adopt" }
	| { kind: "local-edit" }
	| { kind: "conflict" }
	| { kind: "missing-tracked" };

function decide(
	trackedHash: string | null,
	liveHash: string | null,
	manifestHash: string | undefined,
	force: boolean,
	adopt: boolean,
): Decision {
	// both missing: nothing to sync (a stale manifest entry is left alone)
	if (trackedHash === null && liveHash === null) return { kind: "skip" };
	// tracked missing but live present: the repo is broken — never a silent copy
	if (trackedHash === null) return { kind: "missing-tracked" };
	// live missing
	if (liveHash === null) {
		if (manifestHash === undefined) return { kind: "copy" }; // never materialized -> forward-only copy
		if (trackedHash === manifestHash) {
			// live-side deletion is a local edit; only --force can restore
			if (force) return { kind: "force" };
			return { kind: "local-edit" };
		}
		return { kind: "conflict" }; // tracked changed AND live deleted
	}
	// both present
	// live already matches the repo (both hashes computed) — record the manifest
	// entry and continue, regardless of what the manifest says. This is the
	// crash-recovery path: a mid-run crash after a copy leaves tracked == live
	// with a stale manifest; without this branch every re-run would dead-end in
	// a permanent CONFLICT that no flag rescues.
	if (trackedHash === liveHash) return { kind: "skip" };
	if (manifestHash === undefined) return { kind: "copy" };
	if (trackedHash === manifestHash && liveHash === manifestHash) return { kind: "skip" };
	if (trackedHash !== manifestHash && liveHash === manifestHash) return { kind: "copy" };
	if (liveHash !== manifestHash && trackedHash === manifestHash) {
		if (adopt) return { kind: "adopt" };
		if (force) return { kind: "force" };
		return { kind: "local-edit" };
	}
	return { kind: "conflict" };
}

// --- main ------------------------------------------------------------------

interface FileOutcome {
	liveRel: string;
	trackedRel: string;
	action: string;
	trackedHash: string | null;
	liveHash: string | null;
	manifestHash: string | undefined;
}

function main(): void {
	const args = process.argv.slice(2);
	if (args.includes("--help")) {
		console.log(HELP);
		process.exit(0);
	}
	for (const a of args) {
		if (a.startsWith("--") && !KNOWN_FLAGS.has(a)) {
			console.error(`unknown flag: ${a} (see --help)`);
			process.exit(2);
		}
	}

	function flagValue(name: string): string | null {
		const i = args.indexOf(name);
		if (i < 0) return null;
		if (i + 1 >= args.length || args[i + 1].startsWith("--")) {
			console.error(`${name} requires a value`);
			process.exit(2);
		}
		return args[i + 1];
	}

	// parse ALL value flags before touching the harness manifest so a missing
	// flag value is a clean usage error (exit 2) in every invocation; every
	// path flag runs through expandHome() + resolve like the defaults
	const harnessManifestFlag = flagValue("--harness-manifest");
	const trackedRootFlag = flagValue("--tracked-root");
	const liveRootFlag = flagValue("--live-root");
	const statePathFlag = flagValue("--state");
	const force = args.includes("--force");
	const adopt = args.includes("--adopt");

	const harnessManifestPath = harnessManifestFlag
		? resolve(expandHome(harnessManifestFlag))
		: resolve(join(repoRoot, "config", "harnesses", "opencode.json"));

	const manifest = readHarnessManifest(harnessManifestPath);

	const trackedRoot = trackedRootFlag
		? resolve(expandHome(trackedRootFlag))
		: resolve(repoRoot, manifest.trackedRoot);
	const liveRoot = liveRootFlag
		? resolve(expandHome(liveRootFlag))
		: resolve(expandHome(manifest.liveRoot));
	const statePath = statePathFlag
		? resolve(expandHome(statePathFlag))
		: resolve(join(HOME, ".agents", "state", "config-materialize.json"));

	// Normalize + assert containment BEFORE anything else: manifest live/tracked
	// rels are resolved against their roots; a rel that escapes its root
	// ("../x", absolute paths) is a hard error (exit 2) — nothing is read or
	// written outside the roots. Exclusions are evaluated on the NORMALIZED rel
	// so "agents/../secrets/x" cannot dodge the "secrets/" prefix.
	function assertContained(root: string, rel: string, side: "live" | "tracked"): string {
		const normalized = normalizeRel(root, rel);
		if (normalized === "" || normalized.startsWith("..") || isAbsolute(normalized)) {
			console.error(
				`harness manifest invalid: ${side}-relative path '${rel}' escapes '${root}' — refusing to sync outside the ${side} root (see --help)`,
			);
			process.exit(2);
		}
		return normalized;
	}

	interface NormalizedEntry {
		liveRel: string;
		trackedRel: string;
		livePath: string;
		trackedPath: string;
		excluded: string | null;
	}
	const entries: NormalizedEntry[] = [];
	for (const [liveRelRaw, trackedRelRaw] of Object.entries(manifest.files)) {
		const liveRel = assertContained(liveRoot, liveRelRaw, "live");
		const trackedRel = assertContained(trackedRoot, trackedRelRaw, "tracked");
		entries.push({
			liveRel,
			trackedRel,
			livePath: join(liveRoot, liveRel),
			trackedPath: join(trackedRoot, trackedRel),
			excluded:
				excludedBy(liveRel, manifest.exclusions) ?? excludedBy(trackedRel, manifest.exclusions),
		});
	}

	let state = readState(statePath);
	let adoptedBaseline = false;
	let stateDirty = false;
	if (state === null) {
		// AC #3: no prior manifest -> record current live files as the baseline,
		// without copying or refusing. Excluded rels are SKIPPED (they are never
		// synced, so no baseline is recorded for them).
		state = { version: 1, updatedAt: new Date().toISOString(), files: {} };
		for (const e of entries) {
			if (e.excluded) continue;
			if (existsSync(e.livePath)) state.files[e.liveRel] = sha256File(e.livePath);
		}
		adoptedBaseline = true;
		stateDirty = true;
	}

	const outcomes: FileOutcome[] = [];
	const refusals: { file: string; reason: string; fix: string }[] = [];
	const missingTracked: string[] = [];

	for (const e of entries) {
		if (e.excluded) {
			refusals.push({
				file: e.liveRel,
				reason: `path is under an excluded prefix ('${e.excluded}') in the harness manifest`,
				fix: "remove it from the harness manifest; excluded dirs are never synced",
			});
			outcomes.push({
				liveRel: e.liveRel,
				trackedRel: e.trackedRel,
				action: "refused",
				trackedHash: null,
				liveHash: null,
				manifestHash: state.files[e.liveRel],
			});
			continue;
		}
		// symlink safety: refuse to read or write through a link (lstat)
		if (isSymlink(e.trackedPath) || isSymlink(e.livePath)) {
			const offender = isSymlink(e.livePath) ? `live ${e.livePath}` : `tracked ${e.trackedPath}`;
			console.error(
				`symlink refusal: ${offender} is a symlink — refusing to read or write through links (see --help)`,
			);
			process.exit(2);
		}
		const trackedHash = existsSync(e.trackedPath) ? sha256File(e.trackedPath) : null;
		const liveHash = existsSync(e.livePath) ? sha256File(e.livePath) : null;
		const manifestHash = state.files[e.liveRel];
		const d = decide(trackedHash, liveHash, manifestHash, force, adopt);

		switch (d.kind) {
			case "skip":
				outcomes.push({
					liveRel: e.liveRel,
					trackedRel: e.trackedRel,
					action: "skip",
					trackedHash,
					liveHash,
					manifestHash,
				});
				// record/refresh the baseline whenever live already matches the repo:
				// first-time baseline for previously untracked files AND the
				// crash-recovery re-record (tracked == live, stale manifest)
				if (
					trackedHash !== null &&
					trackedHash === liveHash &&
					state.files[e.liveRel] !== trackedHash
				) {
					state.files[e.liveRel] = trackedHash;
					stateDirty = true;
				}
				break;
			case "copy":
			case "force":
				outcomes.push({
					liveRel: e.liveRel,
					trackedRel: e.trackedRel,
					action: d.kind,
					trackedHash,
					liveHash,
					manifestHash,
				});
				break;
			case "adopt":
				outcomes.push({
					liveRel: e.liveRel,
					trackedRel: e.trackedRel,
					action: "adopt",
					trackedHash,
					liveHash,
					manifestHash,
				});
				break;
			case "local-edit": {
				const fix =
					liveHash === null
						? "live file was deleted — use --force to re-materialize from the repo (--adopt cannot adopt a deletion); escape: delete the state file to re-adopt the live baseline"
						: "use --adopt to adopt live into repo, or --force to overwrite live from repo; escape: delete the state file to re-adopt the live baseline";
				refusals.push({
					file: e.liveRel,
					reason: "live file differs from the last materialized state (local edit)",
					fix,
				});
				outcomes.push({
					liveRel: e.liveRel,
					trackedRel: e.trackedRel,
					action: "local-edit",
					trackedHash,
					liveHash,
					manifestHash,
				});
				break;
			}
			case "conflict":
				refusals.push({
					file: e.liveRel,
					reason: "both tracked and live changed since the last materialization",
					fix: "resolve manually — no flag rescues a conflict; escape: delete the state file to re-adopt the live baseline",
				});
				outcomes.push({
					liveRel: e.liveRel,
					trackedRel: e.trackedRel,
					action: "conflict",
					trackedHash,
					liveHash,
					manifestHash,
				});
				break;
			case "missing-tracked":
				missingTracked.push(`${e.liveRel} (tracked ${e.trackedRel} at ${e.trackedPath})`);
				outcomes.push({
					liveRel: e.liveRel,
					trackedRel: e.trackedRel,
					action: "missing-tracked",
					trackedHash,
					liveHash,
					manifestHash,
				});
				break;
		}
	}

	if (missingTracked.length > 0) {
		console.error(
			`missing tracked file(s) listed in ${harnessManifestPath} (nothing was synced):\n  ${missingTracked.join("\n  ")}\nfix: restore the file in the repo (or use --adopt after restoring), then re-run`,
		);
		process.exit(2);
	}

	if (refusals.length > 0) {
		// all-or-nothing: refuse everything, mutate nothing (state write included)
		const report = {
			mode: "config-sync",
			harness: manifest.harness,
			date: new Date().toISOString(),
			trackedRoot,
			liveRoot,
			state: statePath,
			adoptedBaseline,
			exitCode: 1,
			files: Object.fromEntries(outcomes.map((o) => [o.liveRel, fileEntry(o)])),
			refusals,
		};
		console.log(JSON.stringify(report, null, 2));
		process.exit(1);
	}

	// apply: copy/force write tracked bytes to live; adopt writes live bytes to repo
	for (const o of outcomes) {
		const trackedPath = join(trackedRoot, o.trackedRel);
		const livePath = join(liveRoot, o.liveRel);
		if (o.action === "copy" || o.action === "force") {
			const bytes = readFileSync(trackedPath);
			mkdirSync(dirname(livePath), { recursive: true });
			writeFileSync(livePath, bytes);
			state.files[o.liveRel] = sha256Of(bytes); // hash of the bytes written to live (AC #12)
			stateDirty = true;
		} else if (o.action === "adopt") {
			const bytes = readFileSync(livePath);
			mkdirSync(dirname(trackedPath), { recursive: true });
			writeFileSync(trackedPath, bytes);
			state.files[o.liveRel] = sha256Of(bytes); // live bytes adopted as the new baseline
			stateDirty = true;
		}
	}

	if (stateDirty) {
		state.updatedAt = new Date().toISOString();
		mkdirSync(dirname(statePath), { recursive: true });
		// atomic write: a crash mid-write leaves the previous state file intact,
		// never a truncated/partial JSON at the real path
		const tmpPath = `${statePath}.tmp`;
		writeFileSync(tmpPath, `${JSON.stringify(state, null, 2)}\n`);
		renameSync(tmpPath, statePath);
	}

	const report = {
		mode: "config-sync",
		harness: manifest.harness,
		date: new Date().toISOString(),
		trackedRoot,
		liveRoot,
		state: statePath,
		adoptedBaseline,
		exitCode: 0,
		files: Object.fromEntries(outcomes.map((o) => [o.liveRel, fileEntry(o)])),
		refusals,
	};
	console.log(JSON.stringify(report, null, 2));
	process.exit(0);
}

function fileEntry(o: FileOutcome): Record<string, unknown> {
	return {
		action: o.action,
		trackedSha256: o.trackedHash,
		liveSha256: o.liveHash,
		manifestSha256: o.manifestHash ?? null,
	};
}

if (
	process.argv[1] !== undefined &&
	import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
	main();
}
