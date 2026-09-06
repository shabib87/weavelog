import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
	chmodSync,
	existsSync,
	lstatSync,
	mkdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, test } from "node:test";
import { fileURLToPath } from "node:url";

const CLI = fileURLToPath(new URL("../../src/cli/index.ts", import.meta.url));
const DIST = fileURLToPath(new URL("../../dist/cli/index.js", import.meta.url));
const REPO = fileURLToPath(new URL("../..", import.meta.url));
const TSX_LOADER = fileURLToPath(
	new URL("../../node_modules/tsx/dist/loader.mjs", import.meta.url),
);

interface RunResult {
	status: number | null;
	stdout: string;
	stderr: string;
}

function run(args: string[], opts: { env?: Record<string, string>; cwd?: string } = {}): RunResult {
	return spawnSync(process.execPath, ["--import", "tsx", CLI, ...args], {
		encoding: "utf8",
		timeout: 120_000,
		env: { ...process.env, ...opts.env },
		cwd: opts.cwd,
	});
}

const created: string[] = [];
afterEach(() => {
	for (const dir of created.splice(0)) rmSync(dir, { recursive: true, force: true });
});

let n = 0;
function makeDir(prefix: string): string {
	const dir = join(tmpdir(), `flightlead-cli-${prefix}-${Date.now()}-${n++}`);
	mkdirSync(dir, { recursive: true });
	created.push(dir);
	return dir;
}

function write(path: string, content: string): void {
	mkdirSync(join(path, ".."), { recursive: true });
	writeFileSync(path, content);
}

function lastLedgerLine(stateDir: string): Record<string, unknown> {
	const ledger = readFileSync(join(stateDir, "ledger.jsonl"), "utf8").trim().split("\n");
	return JSON.parse(ledger[ledger.length - 1]);
}

const manifest = JSON.parse(readFileSync(join(REPO, "flightlead.json"), "utf8")) as {
	tools: Record<string, { version: string }>;
};

function fakeBin(dir: string, name: string, version: string): string {
	const p = join(dir, name);
	writeFileSync(p, `#!/bin/sh\nprintf '%s\\n' '${version}'\n`);
	chmodSync(p, 0o755);
	return p;
}

function versionEnv(dir: string): Record<string, string> {
	const bins = join(dir, "bins");
	mkdirSync(bins, { recursive: true });
	return {
		FLIGHTLEAD_HEADROOM_BIN: fakeBin(bins, "headroom", manifest.tools.headroom.version),
		FLIGHTLEAD_BACKLOG_BIN: fakeBin(bins, "backlog", manifest.tools.backlog.version),
		FLIGHTLEAD_MARKITDOWN_BIN: fakeBin(bins, "markitdown", manifest.tools.markitdown.version),
		FLIGHTLEAD_OPENCODE_BIN: fakeBin(bins, "opencode", manifest.tools.opencode.version),
		FLIGHTLEAD_PI_BIN: fakeBin(bins, "pi", manifest.tools.pi.version),
	};
}

const CHECK_PLIST = "com.flightlead.check.plist";

function fakePlist(path: string, nodePath: string): void {
	write(
		path,
		`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>Label</key><string>com.flightlead.check</string>
<key>ProgramArguments</key>
<array>
<string>${nodePath}</string>
<string>${DIST}</string>
<string>check</string>
<string>--stack-only</string>
</array>
</dict></plist>
`,
	);
}

function initFixture(
	withDiagramDesign: boolean,
	extraLiveFiles: Record<string, string> = {},
): {
	dir: string;
	live: string;
	config: string;
	state: string;
} {
	const dir = makeDir("init");
	const live = join(dir, "live");
	const config = join(dir, "config");
	const state = join(dir, "state");
	mkdirSync(live, { recursive: true });
	for (const [rel, content] of Object.entries(extraLiveFiles)) {
		write(join(live, rel), content);
	}
	write(join(live, ".env"), `FLIGHTLEAD_HOME=${live}\nFLIGHTLEAD_CONFIG_HOME=${config}\n`);
	if (withDiagramDesign) {
		mkdirSync(join(dir, "code", "diagram-design", "skills", "diagram-design"), { recursive: true });
	}
	return { dir, live, config, state };
}

describe("cli (--help)", () => {
	for (const cmd of ["init", "sync", "update", "check", "doctor", "scaffold", "stats"]) {
		test(`${cmd} --help exits 0 with usage text`, () => {
			const r = run([cmd, "--help"]);
			assert.equal(r.status, 0);
			assert.ok(r.stdout.includes("Usage"));
		});
	}
	test("bare --help exits 0 with the command list", () => {
		const r = run(["--help"]);
		assert.equal(r.status, 0);
		assert.ok(r.stdout.includes("init"));
		assert.ok(r.stdout.includes("scaffold"));
	});
});

describe("cli init", () => {
	test("materializes config + skills + AGENTS.md, resolves .env tokens, symlinks diagram-design, writes ledger", () => {
		const f = initFixture(true);
		const r = run(["init"], {
			env: { FLIGHTLEAD_LIVE_ROOT: f.live, FLIGHTLEAD_STATE_DIR: f.state },
		});
		assert.equal(r.status, 0);
		assert.ok(existsSync(join(f.config, "opencode.jsonc")), "opencode.jsonc materialized");
		assert.ok(existsSync(join(f.config, "AGENTS.md")), "live AGENTS.md written");
		assert.ok(existsSync(join(f.live, "skills", "as-tdd", "SKILL.md")), "skills materialized");
		const researcher = readFileSync(join(f.config, "agents", "researcher.md"), "utf8");
		assert.ok(researcher.includes(f.live), "FLIGHTLEAD_HOME token resolved from .env");
		const implementer = readFileSync(join(f.config, "agents", "implementer.md"), "utf8");
		assert.ok(implementer.includes(f.config), "FLIGHTLEAD_CONFIG_HOME token resolved from .env");
		assert.ok(!researcher.includes("{{"), "no unresolved tokens in researcher.md");
		assert.equal(
			lstatSync(join(f.live, "skills", "diagram-design")).isSymbolicLink(),
			true,
			"diagram-design symlink created when host target exists",
		);
		const entry = lastLedgerLine(f.state);
		assert.equal(entry.command, "init");
		assert.equal(entry.exitCode, 0);
		assert.ok(Array.isArray(entry.filesTouched) && entry.filesTouched.length > 0);
		assert.ok(entry.filesTouched.some((p: string) => p.endsWith("opencode.jsonc")));
		for (const key of [
			"ts",
			"command",
			"args",
			"filesTouched",
			"decisions",
			"errors",
			"exitCode",
		]) {
			assert.ok(key in entry, `ledger line has ${key}`);
		}
	});

	test("re-init on a materialized live root is a no-op exit 0 (managed files unchanged)", () => {
		const f = initFixture(true);
		const env = { FLIGHTLEAD_LIVE_ROOT: f.live, FLIGHTLEAD_STATE_DIR: f.state };
		assert.equal(run(["init"], { env }).status, 0);
		const r2 = run(["init"], { env });
		assert.equal(r2.status, 0);
	});

	test("diagram-design symlink skipped with a warning when the host target is absent", () => {
		const f = initFixture(false);
		const r = run(["init"], {
			env: { FLIGHTLEAD_LIVE_ROOT: f.live, FLIGHTLEAD_STATE_DIR: f.state },
		});
		assert.equal(r.status, 0);
		assert.equal(existsSync(join(f.live, "skills", "diagram-design")), false);
		assert.ok(r.stdout.includes("diagram-design"), "skip condition recorded in output");
		const entry = lastLedgerLine(f.state);
		assert.ok(
			entry.decisions.some((d: string) => d.includes("diagram-design")),
			"skip decision recorded in ledger",
		);
	});

	test("init refuses on an existing unversioned live file (non-zero + ledger), --force proceeds without deleting it", () => {
		const f = initFixture(false, { "notes.txt": "personal notes\n" });
		const env = { FLIGHTLEAD_LIVE_ROOT: f.live, FLIGHTLEAD_STATE_DIR: f.state };
		const r = run(["init"], { env });
		assert.equal(r.status, 3);
		assert.ok((r.stdout + r.stderr).includes("notes.txt"), "refusal names the file");
		assert.equal(lastLedgerLine(f.state).exitCode, 3);
		const force = run(["init", "--force"], { env });
		assert.equal(force.status, 0);
		assert.equal(readFileSync(join(f.live, "notes.txt"), "utf8"), "personal notes\n");
		assert.ok(existsSync(join(f.config, "opencode.jsonc")), "forced init materialized config");
	});
});

describe("cli sync", () => {
	test("first sync materializes repo payload to the live config dir; re-sync is a no-op exit 0", () => {
		const dir = makeDir("sync");
		const config = join(dir, "config");
		const state = join(dir, "state");
		const env = { FLIGHTLEAD_CONFIG_HOME: config, FLIGHTLEAD_STATE_DIR: state };
		const r = run(["sync"], { env });
		assert.equal(r.status, 0);
		assert.ok(existsSync(join(config, "opencode.jsonc")), "payload config materialized to live");
		assert.ok(existsSync(join(config, "AGENTS.md")), "payload AGENTS.md materialized");
		assert.equal(lastLedgerLine(state).command, "sync");
		assert.equal(lastLedgerLine(state).exitCode, 0);
		const r2 = run(["sync"], { env });
		assert.equal(r2.status, 0);
	});

	test("sync resolves template tokens from the live-root .env (AC#4 resolved-value assertions)", () => {
		const dir = makeDir("sync-resolved");
		const live = join(dir, "live");
		const config = join(dir, "config");
		const state = join(dir, "state");
		mkdirSync(live, { recursive: true });
		writeFileSync(
			join(live, ".env"),
			`FLIGHTLEAD_HOME=${live}\nFLIGHTLEAD_CONFIG_HOME=${config}\n`,
		);
		const r = run(["sync"], {
			env: {
				FLIGHTLEAD_LIVE_ROOT: live,
				FLIGHTLEAD_CONFIG_HOME: config,
				FLIGHTLEAD_STATE_DIR: state,
			},
		});
		assert.equal(r.status, 0);
		const researcher = readFileSync(join(config, "agents", "researcher.md"), "utf8");
		assert.ok(researcher.includes(`${live}/docs/research/**`), "FLIGHTLEAD_HOME resolved from .env");
		assert.ok(!researcher.includes("{{FLIGHTLEAD_HOME}}"), "no raw tokens in materialized file");
		const implementer = readFileSync(join(config, "agents", "implementer.md"), "utf8");
		assert.ok(implementer.includes(config), "FLIGHTLEAD_CONFIG_HOME resolved from .env");
		const agents = readFileSync(join(config, "AGENTS.md"), "utf8");
		assert.ok(agents.includes("flightlead sync"), "AGENTS.md template materialized");
	});
});

describe("cli doctor", () => {
	test("doctor on a clean fixture exits 0 (plist absent -> node-path guard skipped)", () => {
		const dir = makeDir("doctor");
		const bins = versionEnv(dir);
		const live = join(dir, "live");
		const config = join(dir, "config");
		const state = join(dir, "state");
		mkdirSync(live, { recursive: true });
		const env = {
			HOME: dir,
			FLIGHTLEAD_LIVE_ROOT: live,
			FLIGHTLEAD_CONFIG_HOME: config,
			FLIGHTLEAD_STATE_DIR: state,
			FLIGHTLEAD_CHECK_PLIST: join(dir, "no-plist.plist"),
			FLIGHTLEAD_SKILLS_DIR: join(dir, "skills"),
			...bins,
		};
		const r = run(["doctor"], { env });
		assert.equal(r.status, 0);
		assert.ok(r.stdout.includes("path-guard"), "guard subcheck reported");
	});

	test("doctor with a fake plist pinning a missing node path fails loudly", () => {
		const dir = makeDir("doctor-missing-node");
		const bins = versionEnv(dir);
		const missingNode = join(dir, "nvm", "node-missing", "bin", "node");
		fakePlist(join(dir, "Library", "LaunchAgents", CHECK_PLIST), missingNode);
		const env = {
			HOME: dir,
			FLIGHTLEAD_LIVE_ROOT: join(dir, "live"),
			FLIGHTLEAD_CONFIG_HOME: join(dir, "config"),
			FLIGHTLEAD_STATE_DIR: join(dir, "state"),
			FLIGHTLEAD_CHECK_PLIST: join(dir, "Library", "LaunchAgents", CHECK_PLIST),
			FLIGHTLEAD_SKILLS_DIR: join(dir, "skills"),
			...bins,
		};
		const r = run(["doctor"], { env });
		assert.notEqual(r.status, 0);
		assert.ok(
			(r.stdout + r.stderr).includes(missingNode),
			"loud message names the pinned node path",
		);
	});

	test("doctor with a fake plist pinning a valid current node path passes the guard", () => {
		const dir = makeDir("doctor-valid-node");
		const bins = versionEnv(dir);
		fakePlist(join(dir, "Library", "LaunchAgents", CHECK_PLIST), process.execPath);
		const env = {
			HOME: dir,
			FLIGHTLEAD_LIVE_ROOT: join(dir, "live"),
			FLIGHTLEAD_CONFIG_HOME: join(dir, "config"),
			FLIGHTLEAD_STATE_DIR: join(dir, "state"),
			FLIGHTLEAD_CHECK_PLIST: join(dir, "Library", "LaunchAgents", CHECK_PLIST),
			FLIGHTLEAD_SKILLS_DIR: join(dir, "skills"),
			...bins,
		};
		const r = run(["doctor"], { env });
		assert.equal(r.status, 0);
	});
});

describe("cli check", () => {
	test("check --stack-only exits 0 on a fixture with matching pinned versions", () => {
		const dir = makeDir("check");
		const skills = join(dir, "skills");
		mkdirSync(join(skills, "diagram-design"), { recursive: true });
		const env = {
			HOME: dir,
			FLIGHTLEAD_LIVE_ROOT: join(dir, "live"),
			FLIGHTLEAD_STATE_DIR: join(dir, "state"),
			FLIGHTLEAD_CHECK_PLIST: join(dir, "no-plist.plist"),
			FLIGHTLEAD_SKILLS_DIR: skills,
			...versionEnv(dir),
		};
		const r = run(["check", "--stack-only"], { env });
		assert.equal(r.status, 0);
	});

	test("check --stack-only exits 1 when a pinned version drifts", () => {
		const dir = makeDir("check-drift");
		const skills = join(dir, "skills");
		mkdirSync(join(skills, "diagram-design"), { recursive: true });
		const env = {
			HOME: dir,
			FLIGHTLEAD_LIVE_ROOT: join(dir, "live"),
			FLIGHTLEAD_STATE_DIR: join(dir, "state"),
			FLIGHTLEAD_CHECK_PLIST: join(dir, "no-plist.plist"),
			FLIGHTLEAD_SKILLS_DIR: skills,
			...versionEnv(dir),
		};
		const bins = join(dir, "bins");
		writeFileSync(join(bins, "headroom"), "#!/bin/sh\nprintf '%s\\n' '9.9.9'\n");
		chmodSync(join(bins, "headroom"), 0o755);
		const r = run(["check", "--stack-only"], { env });
		assert.notEqual(r.status, 0);
		assert.ok(r.stdout.includes("headroom"), "drift output names the tool");
	});
});

describe("cli scaffold", () => {
	test("scaffold --project creates dir + git repo + AGENTS.md stub + .env.example, exits 0", () => {
		const dir = makeDir("scaffold");
		const env = {
			FLIGHTLEAD_STATE_DIR: join(dir, "state"),
			FLIGHTLEAD_BACKLOG_BIN: join(dir, "no-backlog"),
		};
		const r = spawnSync(
			process.execPath,
			["--import", TSX_LOADER, CLI, "scaffold", "--project", "myproj"],
			{ encoding: "utf8", timeout: 120_000, env: { ...process.env, ...env }, cwd: dir },
		);
		assert.equal(r.status, 0);
		assert.ok(existsSync(join(dir, "myproj", ".git")), "git repo initialized");
		assert.ok(existsSync(join(dir, "myproj", "AGENTS.md")), "AGENTS.md stub written");
		assert.ok(existsSync(join(dir, "myproj", ".env.example")), ".env.example copied");
		assert.equal(lastLedgerLine(join(dir, "state")).exitCode, 0);
	});
});

describe("cli built artifact", () => {
	test("dist/cli/index.js runs under plain node --help", { skip: !existsSync(DIST) }, () => {
		const r = spawnSync(process.execPath, [DIST, "--help"], {
			encoding: "utf8",
			timeout: 60_000,
		});
		assert.equal(r.status, 0);
		assert.ok(r.stdout.includes("Usage"));
	});
});
