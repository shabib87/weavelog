import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, test } from "node:test";
import { fileURLToPath } from "node:url";

const BIN = fileURLToPath(new URL("../src/agents-install.ts", import.meta.url));

const created: string[] = [];
afterEach(() => {
	for (const dir of created.splice(0)) rmSync(dir, { recursive: true, force: true });
});

let n = 0;
function makeDir(prefix: string): string {
	const dir = join(tmpdir(), `agents-install-test-${prefix}-${Date.now()}-${n++}`);
	mkdirSync(dir, { recursive: true });
	created.push(dir);
	return dir;
}

function makeFakeBin(names: string[]): string {
	const dir = makeDir("bin");
	for (const name of names) {
		const p = join(dir, name);
		writeFileSync(p, `#!/bin/sh\necho "${name} 0.0.0-test"\n`);
		chmodSync(p, 0o755);
	}
	return dir;
}

function makePythonStub(): string {
	const dir = makeDir("python");
	const p = join(dir, "python3.13");
	writeFileSync(p, '#!/bin/sh\necho "Python 3.13.0-test"\n');
	chmodSync(p, 0o755);
	return p;
}

const ALL_PREREQS = ["bun", "pipx", "op", "opencode"];

const MANIFEST = `${JSON.stringify(
	{
		headroom: "0.35.0",
		backlogMd: "1.50.1",
		opencodeApp: "1.18.18",
		models: ["z-ai/glm-5.3-flash"],
		updatedAt: "2026-08-16",
		proxyPort: 8788,
		openaiApiUrl: "https://openrouter.ai/api/v1",
		anthropicApiUrl: "https://openrouter.ai/api/v1",
		labels: {
			headroomProxy: "com.headroom.proxy",
			stackCheck: "com.agents.stack-check",
		},
	},
	null,
	2,
)}\n`;

function makeManifest(content = MANIFEST): string {
	const dir = makeDir("manifest");
	const p = join(dir, "stack-versions.json");
	writeFileSync(p, content);
	return p;
}

const VALID_STATE = `${JSON.stringify(
	{
		version: 1,
		phases: {
			"2": {
				status: "complete",
				completedAt: "2026-08-16T00:00:00.000Z",
				created: ["/tmp/fake-home/.local/share/opencode/auth.json"],
				backups: [],
				provenance: { source: "1password-cli" },
			},
		},
	},
	null,
	2,
)}\n`;

interface RunResult {
	status: number | null;
	stdout: string;
	stderr: string;
}

function run(args: string[], path: string, env: Record<string, string> = {}): RunResult {
	return spawnSync(process.execPath, ["--import", "tsx", BIN, ...args], {
		encoding: "utf8",
		timeout: 60_000,
		env: { ...process.env, PATH: path, ...env },
	});
}

function happyRun(
	extraArgs: string[] = [],
	prereqs = ALL_PREREQS,
	env: Record<string, string> = {},
) {
	const bin = makeFakeBin(prereqs);
	const python = makePythonStub();
	const manifest = makeManifest();
	const stateDir = makeDir("state");
	const state = join(stateDir, "install-state.json");
	const r = run(
		["--check", "--manifest", manifest, "--state", state, "--python", python, ...extraArgs],
		bin,
		env,
	);
	return { r, bin, python, manifest, state, stateDir };
}

const CONFIG_SYNC = fileURLToPath(new URL("../src/config-sync.ts", import.meta.url));

function makeHarnessManifest(liveRoot: string): string {
	const trackedRoot = makeDir("tracked");
	writeFileSync(join(trackedRoot, "AGENTS.md"), "# tracked agents md\n");
	writeFileSync(join(trackedRoot, "opencode.jsonc"), "{}\n");
	const dir = makeDir("harness");
	const p = join(dir, "opencode.json");
	writeFileSync(
		p,
		`${JSON.stringify(
			{
				version: 1,
				harness: "opencode",
				liveRoot,
				trackedRoot,
				files: {
					"AGENTS.md": "AGENTS.md",
					"opencode.jsonc": "opencode.jsonc",
				},
				exclusions: ["secrets/", "node_modules/"],
				pluginsDeferral: true,
			},
			null,
			2,
		)}\n`,
	);
	return p;
}

function makeFakeConfigSync(): string {
	const dir = makeDir("config-sync");
	const p = join(dir, "config-sync.ts");
	writeFileSync(p, "// hermetic stand-in\n");
	return p;
}

describe("agents-install (--help)", () => {
	test("--help exits 0 and documents usage, exit codes, state schema, and frontmatter schema", () => {
		const r = run(["--help"], "/usr/bin");
		assert.equal(r.status, 0);
		assert.ok(r.stdout.includes("Usage: bun agents-install.ts"));
		assert.ok(r.stdout.includes("--check"));
		assert.ok(r.stdout.includes("0 = healthy"));
		assert.ok(r.stdout.includes("1 = failed"));
		assert.ok(r.stdout.includes("2 = not-implemented"));
		assert.ok(r.stdout.includes("install-state.json"));
		assert.ok(r.stdout.includes("install-state.lock"));
		assert.ok(r.stdout.includes("idempotent"));
		assert.ok(r.stdout.includes("backups"));
		assert.ok(r.stdout.includes("depends_on"));
		assert.ok(r.stdout.includes("artifacts"));
		assert.ok(r.stdout.includes("verify"));
		assert.ok(r.stdout.includes("rollback"));
		assert.ok(r.stdout.includes("python3.13"));
		assert.ok(r.stdout.includes("pipx"));
	});
});

describe("agents-install --check (happy paths)", () => {
	test("all prereqs present, valid manifest, no state: exit 0 with JSON report", () => {
		const missing = makeDir("missing");
		const { r, state } = happyRun([], ALL_PREREQS, {
			AGENTS_INSTALL_CONFIG_SYNC: join(missing, "config-sync.ts"),
			AGENTS_INSTALL_HARNESS_MANIFEST: join(missing, "opencode.json"),
		});
		assert.equal(r.status, 0);
		const report = JSON.parse(r.stdout);
		assert.equal(report.ok, true);
		for (const name of [...ALL_PREREQS, "python3.13"]) {
			assert.equal(report.prerequisites[name].ok, true);
			assert.ok(report.prerequisites[name].path);
		}
		assert.equal(report.phases.length, 7);
		for (const phase of report.phases) {
			assert.equal(phase.implemented, false);
			assert.equal(phase.prereqsOk, true);
		}
		assert.equal(existsSync(state), false);
		assert.equal(existsSync(state.replace(/\.json$/, ".lock")), false);
	});

	test("per-phase prerequisite mapping: pipx+python3.13 gate phase 3, op gates phase 2", () => {
		const { r } = happyRun();
		assert.equal(r.status, 0);
		const report = JSON.parse(r.stdout);
		const byId = new Map(report.phases.map((p: { id: string }) => [p.id, p]));
		assert.deepEqual(byId.get("3").prerequisites, ["bun", "pipx", "python3.13"]);
		assert.deepEqual(byId.get("2").prerequisites, ["bun", "op"]);
		assert.deepEqual(byId.get("4").prerequisites, ["bun", "opencode"]);
	});

	test("valid existing state file is parsed and reflected per phase", () => {
		const bin = makeFakeBin(ALL_PREREQS);
		const python = makePythonStub();
		const manifest = makeManifest();
		const stateDir = makeDir("state");
		const state = join(stateDir, "install-state.json");
		writeFileSync(state, VALID_STATE);
		const r = run(["--check", "--manifest", manifest, "--state", state, "--python", python], bin);
		assert.equal(r.status, 0);
		const report = JSON.parse(r.stdout);
		assert.equal(report.state.exists, true);
		assert.equal(report.state.ok, true);
		const phase2 = report.phases.find((p: { id: string }) => p.id === "2");
		assert.equal(phase2.state, "complete");
		assert.equal(JSON.parse(r.stdout).ok, true);
	});
});

describe("agents-install --check (unhappy paths)", () => {
	test("missing prereq binary: exit 1, names the binary, marks dependent phases not-ready", () => {
		const { r } = happyRun([], ["bun", "op", "opencode"]);
		assert.equal(r.status, 1);
		const report = JSON.parse(r.stdout);
		assert.equal(report.ok, false);
		assert.equal(report.prerequisites.pipx.ok, false);
		const phase3 = report.phases.find((p: { id: string }) => p.id === "3");
		assert.equal(phase3.prereqsOk, false);
		const phase2 = report.phases.find((p: { id: string }) => p.id === "2");
		assert.equal(phase2.prereqsOk, true);
	});

	test("missing python3.13: exit 1 naming the expected path", () => {
		const bin = makeFakeBin(ALL_PREREQS);
		const manifest = makeManifest();
		const stateDir = makeDir("state");
		const r = run(
			[
				"--check",
				"--manifest",
				manifest,
				"--state",
				join(stateDir, "install-state.json"),
				"--python",
				join(stateDir, "no-such-python"),
			],
			bin,
		);
		assert.equal(r.status, 1);
		assert.ok(r.stdout.includes("no-such-python"));
		const report = JSON.parse(r.stdout);
		assert.equal(report.prerequisites["python3.13"].ok, false);
	});

	test("missing manifest: exit 2 (error), path named", () => {
		const bin = makeFakeBin(ALL_PREREQS);
		const python = makePythonStub();
		const stateDir = makeDir("state");
		const r = run(
			[
				"--check",
				"--manifest",
				join(stateDir, "no-such-manifest.json"),
				"--state",
				join(stateDir, "install-state.json"),
				"--python",
				python,
			],
			bin,
		);
		assert.equal(r.status, 2);
		assert.ok(r.stderr.includes("no-such-manifest.json"));
	});

	test("manifest with schema violations: exit 1 naming the bad keys", () => {
		const bad = JSON.parse(MANIFEST);
		bad.proxyPort = "eight-seven-eight-eight";
		delete bad.labels;
		const { r } = happyRun([], ALL_PREREQS);
		void r;
		const bin = makeFakeBin(ALL_PREREQS);
		const python = makePythonStub();
		const manifest = makeManifest(`${JSON.stringify(bad, null, 2)}\n`);
		const stateDir = makeDir("state");
		const r2 = run(
			[
				"--check",
				"--manifest",
				manifest,
				"--state",
				join(stateDir, "install-state.json"),
				"--python",
				python,
			],
			bin,
		);
		assert.equal(r2.status, 1);
		assert.ok(r2.stdout.includes("proxyPort"));
		assert.ok(r2.stdout.includes("labels"));
	});

	test("unparseable manifest: exit 2 (error)", () => {
		const bin = makeFakeBin(ALL_PREREQS);
		const python = makePythonStub();
		const manifest = makeManifest("{ not json\n");
		const stateDir = makeDir("state");
		const r = run(
			[
				"--check",
				"--manifest",
				manifest,
				"--state",
				join(stateDir, "install-state.json"),
				"--python",
				python,
			],
			bin,
		);
		assert.equal(r.status, 2);
	});

	test("corrupt state file (invalid JSON): exit 1 naming the state path", () => {
		const bin = makeFakeBin(ALL_PREREQS);
		const python = makePythonStub();
		const manifest = makeManifest();
		const stateDir = makeDir("state");
		const state = join(stateDir, "install-state.json");
		writeFileSync(state, "{ corrupt\n");
		const r = run(["--check", "--manifest", manifest, "--state", state, "--python", python], bin);
		assert.equal(r.status, 1);
		const report = JSON.parse(r.stdout);
		assert.equal(report.state.ok, false);
		assert.ok(report.state.errors.join("\n").includes(state));
	});

	test("state file with invalid schema: exit 1 naming the violations", () => {
		const bin = makeFakeBin(ALL_PREREQS);
		const python = makePythonStub();
		const manifest = makeManifest();
		const stateDir = makeDir("state");
		const state = join(stateDir, "install-state.json");
		writeFileSync(
			state,
			JSON.stringify({
				version: 2,
				phases: { "3": { status: "banana" }, "99": { status: "complete" } },
			}),
		);
		const r = run(["--check", "--manifest", manifest, "--state", state, "--python", python], bin);
		assert.equal(r.status, 1);
		const report = JSON.parse(r.stdout);
		const errs = report.state.errors.join("\n");
		assert.ok(errs.includes("version"));
		assert.ok(errs.includes("banana"));
		assert.ok(errs.includes("99"));
	});

	test("stale lockfile present: exit 1 with a clear stale-lock message", () => {
		const bin = makeFakeBin(ALL_PREREQS);
		const python = makePythonStub();
		const manifest = makeManifest();
		const stateDir = makeDir("state");
		const state = join(stateDir, "install-state.json");
		writeFileSync(join(stateDir, "install-state.lock"), "pid 1234\n");
		const r = run(["--check", "--manifest", manifest, "--state", state, "--python", python], bin);
		assert.equal(r.status, 1);
		const report = JSON.parse(r.stdout);
		assert.equal(report.state.lockPresent, true);
		assert.ok(report.state.errors.join("\n").includes("lock"));
	});
});

describe("agents-install (reviewer fix round)", () => {
	test("lockfile derives correctly when --state has no .json suffix", () => {
		const bin = makeFakeBin(ALL_PREREQS);
		const python = makePythonStub();
		const manifest = makeManifest();
		const stateDir = makeDir("state");
		const state = join(stateDir, "install-state");
		writeFileSync(state, VALID_STATE);
		const r = run(["--check", "--manifest", manifest, "--state", state, "--python", python], bin);
		assert.equal(r.status, 0);
		const report = JSON.parse(r.stdout);
		assert.equal(report.state.lockPath, `${state}.lock`);
		assert.notEqual(report.state.lockPath, report.state.path);
		assert.equal(report.state.lockPresent, false);
	});

	test("state with empty path strings in created/backups fails schema validation", () => {
		const bin = makeFakeBin(ALL_PREREQS);
		const python = makePythonStub();
		const manifest = makeManifest();
		const stateDir = makeDir("state");
		const state = join(stateDir, "install-state.json");
		writeFileSync(
			state,
			JSON.stringify({
				version: 1,
				phases: {
					"2": {
						status: "complete",
						completedAt: "2026-08-16T00:00:00.000Z",
						created: [""],
						backups: [{ original: "", backup: "/tmp/x.bak" }],
					},
				},
			}),
		);
		const r = run(["--check", "--manifest", manifest, "--state", state, "--python", python], bin);
		assert.equal(r.status, 1);
		const errs = JSON.parse(r.stdout).state.errors.join("\n");
		assert.ok(errs.includes("created"));
		assert.ok(errs.includes("backups"));
	});

	test("an executable directory on PATH is not accepted as a binary", () => {
		const dirBin = makeDir("dirbin");
		mkdirSync(join(dirBin, "bun"));
		const realBin = makeFakeBin(["bun", "pipx", "op", "opencode"]);
		const python = makePythonStub();
		const manifest = makeManifest();
		const stateDir = makeDir("state");
		const state = join(stateDir, "install-state.json");
		const r = run(
			["--check", "--manifest", manifest, "--state", state, "--python", python],
			`${dirBin}:${realBin}`,
		);
		assert.equal(r.status, 0);
		assert.equal(JSON.parse(r.stdout).prerequisites.bun.path, join(realBin, "bun"));
		const r2 = run(
			["--check", "--manifest", manifest, "--state", state, "--python", python],
			dirBin,
		);
		assert.equal(r2.status, 1);
		assert.equal(JSON.parse(r2.stdout).prerequisites.bun.ok, false);
	});

	test("completedAt must be an ISO 8601 timestamp, not an arbitrary string", () => {
		const bin = makeFakeBin(ALL_PREREQS);
		const python = makePythonStub();
		const manifest = makeManifest();
		const stateDir = makeDir("state");
		const state = join(stateDir, "install-state.json");
		writeFileSync(
			state,
			JSON.stringify({
				version: 1,
				phases: { "2": { status: "complete", completedAt: "yesterday" } },
			}),
		);
		const r = run(["--check", "--manifest", manifest, "--state", state, "--python", python], bin);
		assert.equal(r.status, 1);
		assert.ok(JSON.parse(r.stdout).state.errors.join("\n").includes("completedAt"));
	});

	test("manifest updatedAt must be a YYYY-MM-DD date", () => {
		const bad = JSON.parse(MANIFEST);
		bad.updatedAt = "Aug 16 2026";
		const bin = makeFakeBin(ALL_PREREQS);
		const python = makePythonStub();
		const manifest = makeManifest(`${JSON.stringify(bad, null, 2)}\n`);
		const stateDir = makeDir("state");
		const r = run(
			[
				"--check",
				"--manifest",
				manifest,
				"--state",
				join(stateDir, "install-state.json"),
				"--python",
				python,
			],
			bin,
		);
		assert.equal(r.status, 1);
		assert.ok(r.stdout.includes("updatedAt"));
	});
});

describe("agents-install (not-implemented modes and flags)", () => {
	test("--apply exits 2 as not implemented", () => {
		const r = run(["--apply"], "/usr/bin");
		assert.equal(r.status, 2);
		assert.ok(r.stderr.includes("not implemented"));
	});

	test("unknown flags exit 2 with the flag named", () => {
		const r = run(["--chek"], "/usr/bin");
		assert.equal(r.status, 2);
		assert.ok(r.stderr.includes("--chek"));
	});

	test("--manifest with no value exits 2", () => {
		const r = run(["--check", "--manifest"], "/usr/bin");
		assert.equal(r.status, 2);
		assert.ok(r.stderr.includes("--manifest"));
	});
});

describe("agents-install phase 4 (opencode-config) --check", () => {
	test("implemented=true when config-sync.ts exists AND harness manifest parses", () => {
		const cs = makeFakeConfigSync();
		const harness = makeHarnessManifest(makeDir("live"));
		const { r } = happyRun([], ALL_PREREQS, {
			AGENTS_INSTALL_CONFIG_SYNC: cs,
			AGENTS_INSTALL_HARNESS_MANIFEST: harness,
		});
		assert.equal(r.status, 0);
		const report = JSON.parse(r.stdout);
		const phase4 = report.phases.find((p: { id: string }) => p.id === "4");
		assert.equal(phase4.implemented, true);
		for (const p of report.phases.filter((x: { id: string }) => x.id !== "4")) {
			assert.equal(p.implemented, false);
		}
	});

	test("implemented=false when config-sync.ts is missing", () => {
		const missing = makeDir("missing");
		const harness = makeHarnessManifest(makeDir("live"));
		const { r } = happyRun([], ALL_PREREQS, {
			AGENTS_INSTALL_CONFIG_SYNC: join(missing, "config-sync.ts"),
			AGENTS_INSTALL_HARNESS_MANIFEST: harness,
		});
		assert.equal(r.status, 0);
		const phase4 = JSON.parse(r.stdout).phases.find((p: { id: string }) => p.id === "4");
		assert.equal(phase4.implemented, false);
	});

	test("implemented=false when harness manifest is missing", () => {
		const cs = makeFakeConfigSync();
		const missing = makeDir("missing");
		const { r } = happyRun([], ALL_PREREQS, {
			AGENTS_INSTALL_CONFIG_SYNC: cs,
			AGENTS_INSTALL_HARNESS_MANIFEST: join(missing, "opencode.json"),
		});
		assert.equal(r.status, 0);
		const phase4 = JSON.parse(r.stdout).phases.find((p: { id: string }) => p.id === "4");
		assert.equal(phase4.implemented, false);
	});

	test("implemented=false when harness manifest does not parse", () => {
		const cs = makeFakeConfigSync();
		const harness = makeHarnessManifest(makeDir("live"));
		writeFileSync(harness, "{ not json\n");
		const { r } = happyRun([], ALL_PREREQS, {
			AGENTS_INSTALL_CONFIG_SYNC: cs,
			AGENTS_INSTALL_HARNESS_MANIFEST: harness,
		});
		assert.equal(r.status, 0);
		const phase4 = JSON.parse(r.stdout).phases.find((p: { id: string }) => p.id === "4");
		assert.equal(phase4.implemented, false);
	});

	test("implemented=false when harness manifest is minimal-but-invalid (missing harness/liveRoot/trackedRoot)", () => {
		const cs = makeFakeConfigSync();
		const dir = makeDir("harness-min");
		const harness = join(dir, "opencode.json");
		writeFileSync(
			harness,
			JSON.stringify({ version: 1, files: { "AGENTS.md": "opencode-AGENTS.md" } }),
		);
		const { r } = happyRun([], ALL_PREREQS, {
			AGENTS_INSTALL_CONFIG_SYNC: cs,
			AGENTS_INSTALL_HARNESS_MANIFEST: harness,
		});
		assert.equal(r.status, 0);
		const phase4 = JSON.parse(r.stdout).phases.find((p: { id: string }) => p.id === "4");
		assert.equal(phase4.implemented, false);
	});

	test("implemented=false when harness manifest files is an empty object", () => {
		const cs = makeFakeConfigSync();
		const dir = makeDir("harness-empty");
		const harness = join(dir, "opencode.json");
		writeFileSync(
			harness,
			JSON.stringify({
				version: 1,
				harness: "opencode",
				liveRoot: "~/.config/opencode",
				trackedRoot: "config",
				files: {},
			}),
		);
		const { r } = happyRun([], ALL_PREREQS, {
			AGENTS_INSTALL_CONFIG_SYNC: cs,
			AGENTS_INSTALL_HARNESS_MANIFEST: harness,
		});
		assert.equal(r.status, 0);
		const phase4 = JSON.parse(r.stdout).phases.find((p: { id: string }) => p.id === "4");
		assert.equal(phase4.implemented, false);
	});
});

describe("agents-install phase 4 (opencode-config) --apply", () => {
	function applyFixture() {
		const liveRoot = makeDir("live");
		const harness = makeHarnessManifest(liveRoot);
		const manifest = JSON.parse(readFileSync(harness, "utf8")) as { trackedRoot: string };
		const trackedAgentsMd = join(manifest.trackedRoot, "AGENTS.md");
		const stateDir = makeDir("state");
		const installState = join(stateDir, "install-state.json");
		const syncState = join(stateDir, "config-materialize.json");
		return { liveRoot, harness, trackedAgentsMd, stateDir, installState, syncState };
	}

	function applyRun(f: ReturnType<typeof applyFixture>) {
		return run(["--apply", "4"], "/usr/bin", {
			AGENTS_INSTALL_CONFIG_SYNC: CONFIG_SYNC,
			AGENTS_INSTALL_HARNESS_MANIFEST: f.harness,
			AGENTS_INSTALL_STATE: f.installState,
		});
	}

	test("spawns config-sync (no --force) and exits 0 on sync success, materializing into the temp live dir", () => {
		const f = applyFixture();
		const r = applyRun(f);
		assert.equal(r.status, 0);
		assert.equal(existsSync(f.syncState), true);
		assert.equal(existsSync(join(f.liveRoot, "AGENTS.md")), true);
		assert.equal(existsSync(join(f.liveRoot, "opencode.jsonc")), true);
		assert.equal(
			readFileSync(join(f.liveRoot, "AGENTS.md"), "utf8"),
			readFileSync(f.trackedAgentsMd, "utf8"),
		);
		assert.equal(existsSync(join(f.stateDir, "install-state.json")), false);
	});

	test("does NOT pass --force: a live edit after sync is refused with exit 1 naming the file", () => {
		const f = applyFixture();
		assert.equal(applyRun(f).status, 0);
		writeFileSync(
			join(f.liveRoot, "AGENTS.md"),
			readFileSync(join(f.liveRoot, "AGENTS.md"), "utf8") + "\nDRIFT SENTINEL\n",
		);
		const r = applyRun(f);
		assert.equal(r.status, 1);
		assert.ok(r.stdout.includes("AGENTS.md"));
		assert.ok(r.stdout.includes("local edit"));
	});

	test("passes config-sync exit 2 through as exit 2 (unparseable harness manifest)", () => {
		const f = applyFixture();
		writeFileSync(f.harness, "{ not json\n");
		const r = applyRun(f);
		assert.equal(r.status, 2);
		assert.ok(r.stderr.includes("config-sync"));
	});

	test("maps an unexpected config-sync exit (3) to exit 1", () => {
		const f = applyFixture();
		const fake = makeDir("cs-fake");
		const fakeSync = join(fake, "config-sync.ts");
		writeFileSync(fakeSync, '#!/usr/bin/env bun\nconsole.error("boom");\nprocess.exit(3);\n');
		const r = run(["--apply", "4"], "/usr/bin", {
			AGENTS_INSTALL_CONFIG_SYNC: fakeSync,
			AGENTS_INSTALL_HARNESS_MANIFEST: f.harness,
			AGENTS_INSTALL_STATE: f.installState,
		});
		assert.equal(r.status, 1);
		assert.ok(r.stderr.includes("config-sync"));
	});

	test("--apply for an unimplemented phase still exits 2 as not implemented", () => {
		const f = applyFixture();
		const r = run(["--apply", "3"], "/usr/bin", {
			AGENTS_INSTALL_CONFIG_SYNC: CONFIG_SYNC,
			AGENTS_INSTALL_HARNESS_MANIFEST: f.harness,
			AGENTS_INSTALL_STATE: f.installState,
		});
		assert.equal(r.status, 2);
		assert.ok(r.stderr.includes("not implemented"));
	});
});
