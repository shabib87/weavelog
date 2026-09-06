#!/usr/bin/env -S node --import tsx
/**
 * agents-install — loop-engineering installer.
 * --check is READ-ONLY: it reports manifest, prerequisites, phases, and state.
 * It NEVER mutates the host (no installs, no writes, no state creation).
 * --apply applies a single phase; only phase 4 (opencode-config) is
 * implemented (it spawns config-sync.ts without --force). Applying any other
 * phase exits 2 (not implemented).
 *
 * Exit codes: 0 = healthy, 1 = failed (checks did not pass, or a phase apply
 * failed), 2 = not-implemented or error (unknown flag, --apply for an
 * unimplemented phase, missing/unparseable manifest). --apply 4 maps the
 * spawned config-sync exit through unchanged: 0 -> 0, 1 -> 1, 2 -> 2 (any
 * other/null status becomes 1).
 */
import { spawnSync } from "node:child_process";
import { accessSync, constants, existsSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HELP = `Usage: bun agents-install.ts [options]

Loop-engineering installer. --check is READ-ONLY: it reports manifest,
prerequisites, per-phase readiness, and installer state. It never installs
anything and never writes to the host. --apply applies one phase by id; only
phase 4 (opencode-config) is implemented and it never touches the host config
directly — it spawns config-sync.ts (no --force) which does the materialization.

Modes:
  --check          Run all read-only checks (default when no mode is given)
  --apply <phase>  Apply a single phase. Only "4" (opencode-config) is
                   implemented: spawns config-sync.ts WITHOUT --force; the
                   phase fails (exit 1) if the sync fails. Any other phase
                   exits 2 (not implemented). Bare --apply (apply-all) also
                   exits 2 (not implemented).
  --help           Show this help

Options:
  --manifest <p>  Manifest path (default: ~/.agents/stack-versions.json)
  --state <p>     State file path (default: ~/.agents/state/install-state.json);
                  the lockfile is the same path with .json -> .lock
  --python <p>    python3.13 path to check (default: /opt/homebrew/bin/python3.13)

Env overrides (phase 4; flags take precedence where they exist):
  AGENTS_INSTALL_CONFIG_SYNC        config-sync.ts path (default: <repo>/bin/src/config-sync.ts)
  AGENTS_INSTALL_HARNESS_MANIFEST   harness manifest path (default: <repo>/config/harnesses/opencode.json)
  AGENTS_INSTALL_STATE              install state path (same default as --state)

Exit codes: 0 = healthy, 1 = failed (a check did not pass, or --apply phase 4
sync failed), 2 = not-implemented (--apply for other phases, or apply-all) or
error (unknown flag, missing/unparseable manifest).

Prerequisites and per-phase mapping (a phase is ready only if all of its
prerequisites resolve):
  bun          all phases (scripts run under bun)
  pipx         phase 3 (headroom proxy install)
  python3.13   phase 3 (pipx --python interpreter; absolute path check)
  op           phase 2 (secrets via 1Password CLI)
  opencode     phases 4, 5a, 6 (config, script tests, self-test)

Phases: 1 runbook-frontmatter, 2 secrets, 3 headroom-proxy, 4 opencode-config,
5a scripts, 5b stack-check-launchagent, 6 self-test. Phase 4 reports
implemented=true when config-sync.ts exists AND the harness manifest parses;
all other phases report implemented=false (not implemented yet).

State file (defined here, written by --apply in later phases):
  Location: ~/.agents/state/install-state.json
  Lockfile: ~/.agents/state/install-state.lock — created exclusively by --apply
    before any mutation and removed on completion. A lockfile found by --check
    is stale (a crashed --apply) and fails the check; remove it manually after
    inspection.
  idempotent-skip: a phase whose state status is "complete" is skipped by
    --apply, making a re-run after a partial failure safe.
  Schema:
    version: 1 (integer, required)
    phases: object keyed by phase id ("1".."6", incl. "5a"/"5b"), each:
      status:      "pending" | "complete" | "skipped" (required)
      completedAt: ISO 8601 timestamp (required when complete/skipped)
      created:     array of paths the phase created (plain rm on rollback)
      backups:     array of { original, backup } for pre-existing files
                   (restored from the state-recorded backup path on rollback)
      provenance:  optional object of non-secret metadata (NEVER secret material)

Runbook frontmatter schema (installer-consumed sections, added in Phase 1;
verify/rollback strings live here as the single source — TS phase logic reads
them, one source two consumers):
  id          phase id the section documents (e.g. "3")
  title       section title
  depends_on  array of phase ids that must be complete first
  artifacts   array of paths the phase creates or changes
  verify      verify command string
  rollback    rollback command string

--check output: one JSON report on stdout
  { ok, manifest: {path, ok, errors}, prerequisites: {name: {ok, path, version}},
    phases: [{id, name, implemented, state, prerequisites, prereqsOk}],
    state: {path, exists, ok, errors, lockPath, lockPresent} }`;

const KNOWN_FLAGS = new Set(["--help", "--check", "--apply", "--manifest", "--state", "--python"]);
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
// --apply <phase>: only "4" (opencode-config) is implemented. Bare --apply
// (apply-all) and any other phase id are not implemented (exit 2).
const applyPhase = args.includes("--apply")
	? (() => {
			const i = args.indexOf("--apply");
			const v = args[i + 1];
			if (v === undefined || v.startsWith("--")) {
				console.error(
					"--apply (apply-all) is not implemented — only phase 4 (opencode-config) is implemented; use --apply 4 (see --help)",
				);
				process.exit(2);
			}
			return v;
		})()
	: null;
if (applyPhase !== null && applyPhase !== "4") {
	console.error(
		`--apply ${applyPhase} is not implemented — only phase 4 (opencode-config) is implemented (see --help)`,
	);
	process.exit(2);
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

const HOME = homedir();
const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const manifestPath = flagValue("--manifest") ?? join(HOME, ".agents", "stack-versions.json");
const statePath =
	flagValue("--state") ??
	process.env.AGENTS_INSTALL_STATE ??
	join(HOME, ".agents", "state", "install-state.json");
const lockPath = /\.json$/.test(statePath)
	? statePath.replace(/\.json$/, ".lock")
	: `${statePath}.lock`;
const pythonPath = flagValue("--python") ?? join("/opt/homebrew/bin/python3.13");

// --- phase 4 (opencode-config) ----------------------------------------------

const configSyncPath =
	process.env.AGENTS_INSTALL_CONFIG_SYNC ?? join(repoRoot, "bin", "src", "config-sync.ts");
const harnessManifestPath =
	process.env.AGENTS_INSTALL_HARNESS_MANIFEST ??
	join(repoRoot, "config", "harnesses", "opencode.json");

// phase 4 is implemented iff config-sync.ts exists AND the harness manifest
// validates the way config-sync itself validates it before running: non-empty
// harness/liveRoot/trackedRoot strings + a non-empty files object
function harnessManifestParses(path: string): boolean {
	if (!existsSync(path)) return false;
	try {
		const raw = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
		return (
			typeof raw.harness === "string" &&
			raw.harness.trim() !== "" &&
			typeof raw.liveRoot === "string" &&
			raw.liveRoot.trim() !== "" &&
			typeof raw.trackedRoot === "string" &&
			raw.trackedRoot.trim() !== "" &&
			raw.files !== null &&
			typeof raw.files === "object" &&
			!Array.isArray(raw.files) &&
			Object.keys(raw.files as Record<string, unknown>).length > 0
		);
	} catch {
		return false;
	}
}

// --apply 4: spawn config-sync.ts WITHOUT --force. The config-sync state file
// is derived from the install state dir (same dir, config-materialize.json) so
// a hermetic AGENTS_INSTALL_STATE keeps the whole apply off the real host.
if (applyPhase === "4") {
	if (!existsSync(configSyncPath)) {
		console.error(
			`phase 4 apply failed: config-sync missing at ${configSyncPath} — fix: restore bin/src/config-sync.ts`,
		);
		process.exit(1);
	}
	const syncState = join(dirname(statePath), "config-materialize.json");
	const r = spawnSync(
		process.execPath,
		[configSyncPath, "--harness-manifest", harnessManifestPath, "--state", syncState],
		{ encoding: "utf8", timeout: 120_000 },
	);
	if (r.error) {
		console.error(`phase 4 apply failed: could not spawn config-sync: ${r.error.message}`);
		process.exit(1);
	}
	if (r.stdout) console.log(r.stdout);
	if (r.stderr) console.error(r.stderr);
	// map config-sync exit codes through, preserving the error class:
	// 0 -> 0 (ok/skip), 1 -> 1 (drift/refusal/conflict), 2 -> 2 (usage/error);
	// any other/null status (spawn failure is handled above) -> 1
	if (r.status === 0) process.exit(0);
	if (r.status === 1 || r.status === 2) {
		console.error(
			`phase 4 apply failed: config-sync exited ${String(r.status)} (see output above)`,
		);
		process.exit(r.status);
	}
	console.error(`phase 4 apply failed: config-sync exited ${String(r.status)} (see output above)`);
	process.exit(1);
}

// --- manifest -------------------------------------------------------------

const MANIFEST_STRING_KEYS = ["headroom", "backlogMd", "opencodeApp", "updatedAt"] as const;
const MANIFEST_URL_KEYS = ["openaiApiUrl", "anthropicApiUrl"] as const;

function validateManifest(m: unknown): string[] {
	const errors: string[] = [];
	if (m === null || typeof m !== "object" || Array.isArray(m))
		return ["manifest is not a JSON object"];
	const o = m as Record<string, unknown>;
	for (const k of MANIFEST_STRING_KEYS) {
		if (typeof o[k] !== "string" || !(o[k] as string).trim())
			errors.push(`${k} must be a non-empty string`);
	}
	if (typeof o.updatedAt === "string" && !/^\d{4}-\d{2}-\d{2}$/.test(o.updatedAt)) {
		errors.push(`updatedAt must be a YYYY-MM-DD date (got ${JSON.stringify(o.updatedAt)})`);
	}
	if (
		!Array.isArray(o.models) ||
		o.models.length === 0 ||
		!o.models.every((x) => typeof x === "string")
	) {
		errors.push("models must be a non-empty array of strings");
	}
	if (
		!Number.isInteger(o.proxyPort) ||
		(o.proxyPort as number) < 1 ||
		(o.proxyPort as number) > 65535
	) {
		errors.push("proxyPort must be an integer between 1 and 65535");
	}
	for (const k of MANIFEST_URL_KEYS) {
		if (typeof o[k] !== "string" || !(o[k] as string).startsWith("https://")) {
			errors.push(`${k} must be an https:// URL string`);
		}
	}
	const labels = o.labels;
	if (labels === null || typeof labels !== "object" || Array.isArray(labels)) {
		errors.push("labels must be an object with headroomProxy and stackCheck");
	} else {
		const l = labels as Record<string, unknown>;
		for (const k of ["headroomProxy", "stackCheck"] as const) {
			if (typeof l[k] !== "string" || !(l[k] as string).trim())
				errors.push(`labels.${k} must be a non-empty string`);
		}
	}
	return errors;
}

// --- prerequisites --------------------------------------------------------

interface PrereqResult {
	ok: boolean;
	path: string | null;
	version: string | null;
}

function isExecutable(p: string): boolean {
	try {
		if (!statSync(p).isFile()) return false; // executable directories must not resolve as binaries
		accessSync(p, constants.X_OK);
		return true;
	} catch {
		return false;
	}
}

function versionOf(p: string): string | null {
	const r = spawnSync(p, ["--version"], { encoding: "utf8", timeout: 15_000 });
	if (r.error || r.status !== 0) return null;
	return (r.stdout || r.stderr || "").trim().split("\n")[0] || null;
}

function checkPathBinary(name: string): PrereqResult {
	for (const dir of (process.env.PATH ?? "").split(":")) {
		if (!dir) continue;
		const p = join(dir, name);
		if (isExecutable(p)) return { ok: true, path: p, version: versionOf(p) };
	}
	return { ok: false, path: null, version: null };
}

function checkFixedBinary(p: string): PrereqResult {
	// the attempted path is always reported so failures name what was expected
	if (!isExecutable(p)) return { ok: false, path: p, version: null };
	return { ok: true, path: p, version: versionOf(p) };
}

// --- phases ---------------------------------------------------------------

const PHASES: { id: string; name: string; prerequisites: string[] }[] = [
	{ id: "1", name: "runbook-frontmatter", prerequisites: ["bun"] },
	{ id: "2", name: "secrets", prerequisites: ["bun", "op"] },
	{
		id: "3",
		name: "headroom-proxy",
		prerequisites: ["bun", "pipx", "python3.13"],
	},
	{ id: "4", name: "opencode-config", prerequisites: ["bun", "opencode"] },
	{ id: "5a", name: "scripts", prerequisites: ["bun", "opencode"] },
	{ id: "5b", name: "stack-check-launchagent", prerequisites: ["bun"] },
	{ id: "6", name: "self-test", prerequisites: ["bun", "opencode"] },
];
const PHASE_IDS = new Set(PHASES.map((p) => p.id));

// --- state file -----------------------------------------------------------

const STATE_STATUSES = ["pending", "complete", "skipped"] as const;

function validateState(s: unknown): string[] {
	const errors: string[] = [];
	if (s === null || typeof s !== "object" || Array.isArray(s))
		return ["state is not a JSON object"];
	const o = s as Record<string, unknown>;
	if (o.version !== 1) errors.push(`version must be 1 (got ${JSON.stringify(o.version)})`);
	if (o.phases === null || typeof o.phases !== "object" || Array.isArray(o.phases)) {
		errors.push("phases must be an object keyed by phase id");
		return errors;
	}
	for (const [id, entry] of Object.entries(o.phases as Record<string, unknown>)) {
		if (!PHASE_IDS.has(id)) {
			errors.push(`unknown phase id in state: ${id}`);
			continue;
		}
		if (entry === null || typeof entry !== "object" || Array.isArray(entry)) {
			errors.push(`phase ${id}: entry must be an object`);
			continue;
		}
		const e = entry as Record<string, unknown>;
		if (!STATE_STATUSES.includes(e.status as (typeof STATE_STATUSES)[number])) {
			errors.push(
				`phase ${id}: status must be one of ${STATE_STATUSES.join(" | ")} (got ${JSON.stringify(e.status)})`,
			);
		}
		if ((e.status === "complete" || e.status === "skipped") && typeof e.completedAt !== "string") {
			errors.push(
				`phase ${id}: completedAt (ISO 8601 string) is required when status is ${String(e.status)}`,
			);
		}
		if (
			typeof e.completedAt === "string" &&
			!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})?$/.test(e.completedAt)
		) {
			errors.push(
				`phase ${id}: completedAt is not an ISO 8601 timestamp: ${JSON.stringify(e.completedAt)}`,
			);
		}
		if (
			"created" in e &&
			(!Array.isArray(e.created) || !e.created.every((x) => typeof x === "string" && x.trim()))
		) {
			errors.push(`phase ${id}: created must be an array of non-empty path strings`);
		}
		if ("backups" in e) {
			const ok =
				Array.isArray(e.backups) &&
				e.backups.every(
					(b) =>
						b !== null &&
						typeof b === "object" &&
						typeof (b as Record<string, unknown>).original === "string" &&
						((b as Record<string, unknown>).original as string).trim() !== "" &&
						typeof (b as Record<string, unknown>).backup === "string" &&
						((b as Record<string, unknown>).backup as string).trim() !== "",
				);
			if (!ok)
				errors.push(
					`phase ${id}: backups must be an array of { original, backup } non-empty path pairs`,
				);
		}
		if (
			"provenance" in e &&
			(e.provenance === null || typeof e.provenance !== "object" || Array.isArray(e.provenance))
		) {
			errors.push(`phase ${id}: provenance must be an object (non-secret metadata only)`);
		}
	}
	return errors;
}

// --- main -----------------------------------------------------------------

function main() {
	// manifest: missing/unparseable file is an error (2); schema violations are failures (1)
	if (!existsSync(manifestPath)) {
		console.error(`manifest missing: ${manifestPath}`);
		process.exit(2);
	}
	let manifestRaw: unknown;
	try {
		manifestRaw = JSON.parse(readFileSync(manifestPath, "utf8"));
	} catch (err) {
		console.error(`manifest unparseable: ${manifestPath}: ${(err as Error).message}`);
		process.exit(2);
	}
	const manifestErrors = validateManifest(manifestRaw);

	const prerequisites: Record<string, PrereqResult> = {
		bun: checkPathBinary("bun"),
		pipx: checkPathBinary("pipx"),
		op: checkPathBinary("op"),
		opencode: checkPathBinary("opencode"),
		"python3.13": checkFixedBinary(pythonPath),
	};

	// state file: never created here — read-only inspection only
	const stateErrors: string[] = [];
	const stateExists = existsSync(statePath);
	let statePhases: Record<string, { status?: string }> = {};
	if (stateExists) {
		let parsed: unknown;
		try {
			parsed = JSON.parse(readFileSync(statePath, "utf8"));
		} catch (err) {
			stateErrors.push(`state file corrupt: ${statePath}: ${(err as Error).message}`);
		}
		if (parsed !== undefined) {
			const errs = validateState(parsed);
			stateErrors.push(...errs.map((e) => `${statePath}: ${e}`));
			if (errs.length === 0) {
				statePhases = (parsed as { phases: Record<string, { status?: string }> }).phases;
			}
		}
	}
	const lockPresent = existsSync(lockPath);
	if (lockPresent) {
		stateErrors.push(
			`stale lockfile present: ${lockPath} — a previous --apply may have crashed; remove after inspection`,
		);
	}

	const phases = PHASES.map((p) => ({
		id: p.id,
		name: p.name,
		implemented:
			p.id === "4"
				? existsSync(configSyncPath) && harnessManifestParses(harnessManifestPath)
				: false,
		state: statePhases[p.id]?.status ?? "pending",
		prerequisites: p.prerequisites,
		prereqsOk: p.prerequisites.every((name) => prerequisites[name]?.ok === true),
	}));

	const ok =
		manifestErrors.length === 0 &&
		stateErrors.length === 0 &&
		Object.values(prerequisites).every((p) => p.ok);

	const report = {
		ok,
		manifest: {
			path: manifestPath,
			ok: manifestErrors.length === 0,
			errors: manifestErrors,
		},
		prerequisites,
		phases,
		state: {
			path: statePath,
			exists: stateExists,
			ok: stateErrors.length === 0,
			errors: stateErrors,
			lockPath,
			lockPresent,
		},
	};
	console.log(JSON.stringify(report, null, 2));
	process.exit(ok ? 0 : 1);
}

main();
