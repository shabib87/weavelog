import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
	accessSync,
	chmodSync,
	constants,
	existsSync,
	mkdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, test } from "node:test";
import { fileURLToPath } from "node:url";

const BIN = fileURLToPath(new URL("../src/worktree-create.ts", import.meta.url));
const TASK_VALIDATE_SRC = fileURLToPath(new URL("../src/task-validate.ts", import.meta.url));

let dir: string;
let repoDir: string;
let fakeBacklog: string;
let callsLog: string;
let listFile: string;
let viewFile: string;
let createFile: string;

// Fake backlog CLI: logs every call, emits canned JSON from files the test controls.
// task list [--json]        -> listFile
// task view <id> --json     -> viewFile
// task create <title> --plain -> createFile (with cwd from the caller)
const FAKE = `#!/bin/bash
echo "$@" >> "CALLSLOG"
if [ "$1" = "task" ] && [ "$2" = "list" ]; then
  cat "LISTFILE"
  exit 0
fi
if [ "$1" = "task" ] && [ "$2" = "view" ]; then
  cat "VIEWFILE"
  exit 0
fi
if [ "$1" = "task" ] && [ "$2" = "create" ]; then
  cat "CREATEFILE"
  exit 0
fi
exit 0
`;

function initRepo(d: string) {
	spawnSync("git", ["init"], { cwd: d, encoding: "utf8" });
	spawnSync("git", ["config", "user.email", "test@test.com"], {
		cwd: d,
		encoding: "utf8",
	});
	spawnSync("git", ["config", "user.name", "Test"], {
		cwd: d,
		encoding: "utf8",
	});
	writeFileSync(join(d, "README.md"), "# test\n");
	spawnSync("git", ["add", "."], { cwd: d, encoding: "utf8" });
	spawnSync("git", ["commit", "-m", "init"], { cwd: d, encoding: "utf8" });
}

beforeEach(() => {
	dir = join(tmpdir(), `wt-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
	mkdirSync(dir, { recursive: true });
	repoDir = join(dir, "repo");
	callsLog = join(dir, "calls.log");
	listFile = join(dir, "list.json");
	viewFile = join(dir, "view.json");
	createFile = join(dir, "create.txt");
	fakeBacklog = join(dir, "backlog");

	writeFileSync(callsLog, "");
	writeFileSync(
		fakeBacklog,
		FAKE.replaceAll("CALLSLOG", callsLog)
			.replaceAll("LISTFILE", listFile)
			.replaceAll("VIEWFILE", viewFile)
			.replaceAll("CREATEFILE", createFile),
	);
	chmodSync(fakeBacklog, 0o755);

	mkdirSync(repoDir, { recursive: true });
	initRepo(repoDir);
});

afterEach(() => {
	rmSync(dir, { recursive: true, force: true });
});

function run(args: string[], extraEnv: Record<string, string> = {}) {
	const tsxUrl = import.meta.resolve("tsx");
	return spawnSync(process.execPath, ["--import", tsxUrl, BIN, ...args], {
		encoding: "utf8",
		cwd: repoDir,
		env: { ...process.env, WORKTREE_BACKLOG: fakeBacklog, ...extraEnv },
		timeout: 30_000,
	});
}

function setList(tasks: object[]) {
	writeFileSync(listFile, JSON.stringify({ schemaVersion: 1, kind: "task-list", tasks }));
}

function setView(task: object) {
	writeFileSync(viewFile, JSON.stringify({ schemaVersion: 1, kind: "task-view", task }));
}

function setCreate(taskId: string) {
	writeFileSync(createFile, `Task ${taskId} - New Task\n`);
}

const SAMPLE_TASK = {
	id: "task-42",
	title: "Do the thing",
	description: "A test description with details.",
	acceptanceCriteria: [
		{ index: 1, text: "First AC is done", checked: false },
		{ index: 2, text: "Second AC is done", checked: false },
	],
};

// Pre-fix hook: carries the ours-marker plus the retired bypass recipe.
const STALE_HOOK = `#!/bin/sh
# Block commits on main. Bypass: ENFORCE_DISABLED=true or git commit --no-verify.
if [ "$ENFORCE_DISABLED" = "true" ]; then
  exit 0
fi
exit 0
`;

describe("worktree-create (happy paths)", () => {
	test("--help exits 0 and documents modes + env var", () => {
		const r = run(["--help"]);
		assert.equal(r.status, 0);
		assert.ok(r.stdout.includes("--ready"));
		assert.ok(r.stdout.includes("--dry-run"));
		assert.ok(r.stdout.includes("WORKTREE_BACKLOG"));
	});

	test("--ready creates worktree, writes TASK.md, installs hook", () => {
		setList([{ id: SAMPLE_TASK.id, title: SAMPLE_TASK.title }]);
		setView(SAMPLE_TASK);
		const r = run(["--ready"]);
		assert.equal(r.status, 0);

		const wtDir = join(repoDir, ".worktrees", SAMPLE_TASK.id);
		assert.equal(existsSync(wtDir), true);

		const taskMd = join(wtDir, "TASK.md");
		assert.equal(existsSync(taskMd), true);
		const content = readFileSync(taskMd, "utf8");
		assert.ok(content.includes(SAMPLE_TASK.title));
		assert.ok(content.includes(SAMPLE_TASK.description));
		assert.ok(content.includes("Source of truth"));
		assert.ok(content.includes(`backlog task view ${SAMPLE_TASK.id}`));
		assert.ok(content.includes("- [ ] First AC is done"));
		assert.ok(content.includes("- [ ] Second AC is done"));

		const hook = join(repoDir, ".git", "hooks", "pre-commit");
		assert.equal(existsSync(hook), true);
		assert.doesNotThrow(() => accessSync(hook, constants.X_OK));
	});

	test("<task-id> mode creates worktree for that specific task", () => {
		setView({ ...SAMPLE_TASK, id: "task-7", title: "Specific task" });
		const r = run(["task-7"]);
		assert.equal(r.status, 0);
		const wtDir = join(repoDir, ".worktrees", "task-7");
		assert.equal(existsSync(wtDir), true);
		const content = readFileSync(join(wtDir, "TASK.md"), "utf8");
		assert.ok(content.includes("Specific task"));
	});

	test("--dry-run makes no changes but exits 0", () => {
		setList([{ id: SAMPLE_TASK.id, title: SAMPLE_TASK.title }]);
		setView(SAMPLE_TASK);
		const r = run(["--ready", "--dry-run"]);
		assert.equal(r.status, 0);
		assert.ok(r.stdout.includes(SAMPLE_TASK.id));
		assert.equal(existsSync(join(repoDir, ".worktrees", SAMPLE_TASK.id)), false);
		assert.equal(existsSync(join(repoDir, ".git", "hooks", "pre-commit")), false);
	});

	test("idempotent: second run skips existing worktree", () => {
		setList([{ id: SAMPLE_TASK.id, title: SAMPLE_TASK.title }]);
		setView(SAMPLE_TASK);
		const r1 = run(["--ready"]);
		assert.equal(r1.status, 0);

		const r2 = run(["--ready"]);
		assert.equal(r2.status, 0);
		assert.ok(r2.stdout.includes("skipped"));
	});

	test("hook install is idempotent: current HOOK_CONTENT not rewritten", () => {
		setList([{ id: SAMPLE_TASK.id, title: SAMPLE_TASK.title }]);
		setView(SAMPLE_TASK);
		const r1 = run(["--ready"]);
		assert.equal(r1.status, 0);
		const hook = join(repoDir, ".git", "hooks", "pre-commit");
		const installed = readFileSync(hook, "utf8");

		const r2 = run(["--ready"]);
		assert.equal(r2.status, 0);
		assert.ok(r2.stdout.includes("hook present"));
		assert.equal(readFileSync(hook, "utf8"), installed);
	});
});

describe("worktree-create (unhappy paths)", () => {
	test("--ready with empty task list -> exit 1", () => {
		setList([]);
		const r = run(["--ready"]);
		assert.equal(r.status, 1);
		assert.ok(r.stdout.includes("no ready tasks"));
	});

	test("<task-id> not found -> exit 1", () => {
		writeFileSync(
			fakeBacklog,
			`#!/bin/bash
if [ "$1" = "task" ] && [ "$2" = "view" ]; then
  exit 1
fi
exit 0
`,
		);
		chmodSync(fakeBacklog, 0o755);
		const r = run(["task-missing"]);
		assert.equal(r.status, 1);
		assert.ok(r.stdout.includes("task not found"));
	});

	test("missing backlog binary -> exit 2 naming the path", () => {
		const r = run(["task-1"], {
			WORKTREE_BACKLOG: join(dir, "no-such-binary"),
		});
		assert.equal(r.status, 2);
		assert.ok(r.stderr.includes("no-such-binary"));
	});
});

describe("worktree-create (review fixes)", () => {
	test("invalid task id rejected with exit 2", () => {
		const r = run(["../../evil"]);
		assert.equal(r.status, 2);
		assert.ok(r.stderr.includes("invalid task id"));
	});

	test("unknown flag rejected with exit 2", () => {
		const r = run(["--bogus"]);
		assert.equal(r.status, 2);
	});

	test("more than one positional arg rejected with exit 2", () => {
		setView(SAMPLE_TASK);
		const r = run(["task-42", "task-43"]);
		assert.equal(r.status, 2);
	});

	test("existing branch reused when worktree dir absent", () => {
		setView(SAMPLE_TASK);
		spawnSync("git", ["branch", `task/${SAMPLE_TASK.id}`], {
			cwd: repoDir,
			encoding: "utf8",
		});
		const r = run([SAMPLE_TASK.id]);
		assert.equal(r.status, 0);
		assert.equal(existsSync(join(repoDir, ".worktrees", SAMPLE_TASK.id)), true);
		assert.ok(!r.stderr.includes("branch already exists"));
	});

	test("foreign hook detected and reported", () => {
		const hook = join(repoDir, ".git", "hooks", "pre-commit");
		const foreign = "#!/bin/sh\necho custom\nexit 0\n";
		writeFileSync(hook, foreign);
		chmodSync(hook, 0o755);
		setList([{ id: SAMPLE_TASK.id, title: SAMPLE_TASK.title }]);
		setView(SAMPLE_TASK);
		const r = run(["--ready"]);
		assert.equal(r.status, 0);
		assert.ok(r.stdout.includes("FOREIGN"));
		assert.equal(readFileSync(hook, "utf8"), foreign);
	});

	test("checked AC renders - [x]", () => {
		setView({
			...SAMPLE_TASK,
			acceptanceCriteria: [{ index: 1, text: "done", checked: true }],
		});
		const r = run([SAMPLE_TASK.id]);
		assert.equal(r.status, 0);
		const content = readFileSync(join(repoDir, ".worktrees", SAMPLE_TASK.id, "TASK.md"), "utf8");
		assert.ok(content.includes("- [x] done"));
	});

	test("hook blocks commits on main and bypasses with ENFORCE_DISABLED", () => {
		setList([{ id: SAMPLE_TASK.id, title: SAMPLE_TASK.title }]);
		setView(SAMPLE_TASK);
		const r = run(["--ready"]);
		assert.equal(r.status, 0);
		const hookPath = join(repoDir, ".git", "hooks", "pre-commit");
		const blocked = spawnSync("sh", [hookPath], {
			cwd: repoDir,
			env: { ...process.env },
			encoding: "utf8",
		});
		assert.equal(blocked.status, 1);
		const bypassed = spawnSync("sh", [hookPath], {
			cwd: repoDir,
			env: { ...process.env, ENFORCE_DISABLED: "true" },
			encoding: "utf8",
		});
		assert.equal(bypassed.status, 0);
	});

	test("hook content carries the marker but no bypass recipe", () => {
		setList([{ id: SAMPLE_TASK.id, title: SAMPLE_TASK.title }]);
		setView(SAMPLE_TASK);
		const r = run(["--ready"]);
		assert.equal(r.status, 0);
		const hookPath = join(repoDir, ".git", "hooks", "pre-commit");
		const content = readFileSync(hookPath, "utf8");
		assert.ok(content.includes("# Block commits on main."));
		assert.ok(!content.includes("Bypass"));
		assert.ok(!content.includes("--no-verify"));
	});

	test("stale ours-hook is rewritten to current content", () => {
		setList([{ id: SAMPLE_TASK.id, title: SAMPLE_TASK.title }]);
		setView(SAMPLE_TASK);
		const hookPath = join(repoDir, ".git", "hooks", "pre-commit");
		mkdirSync(join(repoDir, ".git", "hooks"), { recursive: true });
		writeFileSync(hookPath, STALE_HOOK);
		chmodSync(hookPath, 0o755);
		const r = run([SAMPLE_TASK.id]);
		assert.equal(r.status, 0);
		assert.ok(r.stdout.includes("rewritten"));
		const content = readFileSync(hookPath, "utf8");
		assert.ok(!content.includes("Bypass"));
		assert.ok(content.includes("# Block commits on main."));
	});

	test("dry-run reports stale hook but does not rewrite it", () => {
		setList([{ id: SAMPLE_TASK.id, title: SAMPLE_TASK.title }]);
		setView(SAMPLE_TASK);
		const hookPath = join(repoDir, ".git", "hooks", "pre-commit");
		mkdirSync(join(repoDir, ".git", "hooks"), { recursive: true });
		writeFileSync(hookPath, STALE_HOOK);
		chmodSync(hookPath, 0o755);
		const r = run(["--ready", "--dry-run"]);
		assert.equal(r.status, 0);
		assert.ok(r.stdout.includes("would-rewrite"));
		assert.equal(readFileSync(hookPath, "utf8"), STALE_HOOK);
	});

	test("case normalization: canonical id from backlog used for dir/branch", () => {
		setView({ ...SAMPLE_TASK, id: "TASK-42" });
		const r = run(["task-42"]);
		assert.equal(r.status, 0);
		// canonical id (from backlog) used for the branch name, not the raw arg
		assert.ok(r.stdout.includes("branch=task/TASK-42"));
	});
});

describe("worktree-create --create mode", () => {
	test("--create creates worktree + task, task file lands in worktree not main", () => {
		setList([{ id: "TASK-17" }]);
		setCreate("TASK-18");
		const r = run(["--create", "Fix the thing"]);
		assert.equal(r.status, 0);

		const wtDir = join(repoDir, ".worktrees", "TASK-18");
		assert.equal(existsSync(wtDir), true);

		const taskMd = join(wtDir, "TASK.md");
		assert.equal(existsSync(taskMd), true);
		const content = readFileSync(taskMd, "utf8");
		assert.ok(content.includes("TASK-18"));
		assert.ok(content.includes("Fix the thing"));

		const calls = readFileSync(callsLog, "utf8");
		const createCall = calls.split("\n").find((c) => c.includes("create"));
		assert.notEqual(createCall, undefined);
		assert.ok(createCall!.includes("Fix the thing"));

		assert.ok(r.stdout.includes("TASK-18"));
		assert.ok(r.stdout.includes("branch=task/TASK-18"));
	});

	test("--create infers next ID from max numeric suffix", () => {
		setList([{ id: "TASK-5" }, { id: "TASK-17" }, { id: "TASK-3" }]);
		setCreate("TASK-18");
		const r = run(["--create", "Another task"]);
		assert.equal(r.status, 0);
		assert.ok(r.stdout.includes("TASK-18"));
	});

	test("--create with empty task list starts at TASK-1", () => {
		setList([]);
		setCreate("TASK-1");
		const r = run(["--create", "First task"]);
		assert.equal(r.status, 0);
		assert.ok(r.stdout.includes("TASK-1"));
	});

	test("--create --dry-run exits 0, creates nothing", () => {
		setList([{ id: "TASK-17" }]);
		setCreate("TASK-18");
		const r = run(["--create", "Dry run task", "--dry-run"]);
		assert.equal(r.status, 0);
		assert.ok(r.stdout.includes("DRY-RUN"));
		assert.ok(r.stdout.includes("TASK-18"));
		assert.equal(existsSync(join(repoDir, ".worktrees", "TASK-18")), false);
	});

	test("--create without title -> exit 2", () => {
		setList([{ id: "TASK-17" }]);
		setCreate("TASK-18");
		const r = run(["--create"]);
		assert.equal(r.status, 2);
		assert.ok(r.stderr.includes("requires a <title>"));
	});

	test("--create --help exits 0 and documents --create", () => {
		const r = run(["--help"]);
		assert.equal(r.status, 0);
		assert.ok(r.stdout.includes("--create"));
	});
});

describe("worktree-create pre-commit hook (TASK-51 AC-gutting gate)", () => {
	/** A spec-approved (or labelled) task file with n EARS ACs in the AC section. */
	function taskFile(acCount: number, label = "spec-approved"): string {
		const acs = Array.from(
			{ length: acCount },
			(_, i) => `- [ ] #${i + 1} WHEN condition ${i + 1} THEN outcome ${i + 1}`,
		).join("\n");
		return `---
id: TASK-9
title: Task 9
labels:
  - ${label}
---

## Acceptance Criteria
<!-- AC:BEGIN -->
${acs}
<!-- AC:END -->
`;
	}

	const TASK_PATH = "backlog/tasks/task-9 - Do thing.md";

	/** Install hook + valiator into the repo, commit a task file on a task branch. */
	function setupRepoWithTaskFile(acCount: number, label = "spec-approved") {
		setList([{ id: SAMPLE_TASK.id, title: SAMPLE_TASK.title }]);
		setView(SAMPLE_TASK);
		const r = run(["--ready"]);
		assert.equal(r.status, 0);

		mkdirSync(join(repoDir, "bin", "src"), { recursive: true });
		writeFileSync(
			join(repoDir, "bin", "src", "task-validate.ts"),
			readFileSync(TASK_VALIDATE_SRC, "utf8"),
		);

		spawnSync("git", ["checkout", "-b", "task/TASK-9"], {
			cwd: repoDir,
			encoding: "utf8",
		});
		mkdirSync(join(repoDir, "backlog", "tasks"), { recursive: true });
		writeFileSync(join(repoDir, TASK_PATH), taskFile(acCount, label));
		spawnSync("git", ["add", TASK_PATH], { cwd: repoDir, encoding: "utf8" });
		const setup = spawnSync("git", ["commit", "-m", "setup task-9"], {
			cwd: repoDir,
			encoding: "utf8",
		});
		assert.equal(setup.status, 0);
	}

	function fakeFlightleadShim(): string {
		const bin = join(
			tmpdir(),
			`fake-flightlead-${Date.now()}-${Math.random().toString(36).slice(2)}`,
		);
		mkdirSync(bin, { recursive: true });
		const cli = fileURLToPath(new URL("../src/cli/index.ts", import.meta.url));
		const tsxUrl = String(import.meta.resolve("tsx"));
		writeFileSync(
			join(bin, "flightlead"),
			`#!/bin/sh\nexec ${process.execPath} --import ${tsxUrl} ${cli} check --pre-commit "$@"\n`,
		);
		chmodSync(join(bin, "flightlead"), 0o755);
		return bin;
	}

	function runHook(opts: { withFlightlead?: boolean } = {}) {
		const path =
			opts.withFlightlead === false
				? process.env.PATH
				: `${fakeFlightleadShim()}:${process.env.PATH}`;
		return spawnSync("sh", [join(repoDir, ".git", "hooks", "pre-commit")], {
			cwd: repoDir,
			env: { ...process.env, PATH: path },
			encoding: "utf8",
		});
	}

	test("generated hook calls flightlead check --pre-commit behind a command-presence guard", () => {
		setList([{ id: SAMPLE_TASK.id, title: SAMPLE_TASK.title }]);
		setView(SAMPLE_TASK);
		const r = run(["--ready"]);
		assert.equal(r.status, 0);
		const content = readFileSync(join(repoDir, ".git", "hooks", "pre-commit"), "utf8");
		assert.ok(content.includes("flightlead check --pre-commit"));
		assert.ok(content.includes("command -v flightlead"));
	});

	test("end-to-end: hook blocks a commit that guts a spec-approved task's ACs", () => {
		setupRepoWithTaskFile(2);
		// Gut: drop from 2 ACs to 1 in working tree + index (as --clear-ac would)
		writeFileSync(join(repoDir, TASK_PATH), taskFile(1));
		spawnSync("git", ["add", TASK_PATH], { cwd: repoDir, encoding: "utf8" });
		const blocked = runHook();
		assert.equal(blocked.status, 1);
		assert.ok(blocked.stderr.includes("AC count dropped"));
		assert.ok(blocked.stderr.includes(TASK_PATH));
	});

	test("end-to-end: hook passes when ACs are unchanged", () => {
		setupRepoWithTaskFile(2);
		// Re-stage identical content: index == HEAD, no diff to evaluate
		writeFileSync(join(repoDir, TASK_PATH), taskFile(2));
		spawnSync("git", ["add", TASK_PATH], { cwd: repoDir, encoding: "utf8" });
		const ok = runHook();
		assert.equal(ok.status, 0);
	});

	test("end-to-end: hook passes when a non-spec-approved task's ACs are gutted", () => {
		setupRepoWithTaskFile(2, "deferred");
		writeFileSync(join(repoDir, TASK_PATH), taskFile(1, "deferred"));
		spawnSync("git", ["add", TASK_PATH], { cwd: repoDir, encoding: "utf8" });
		const ok = runHook();
		assert.equal(ok.status, 0);
	});

	test("fail-open: repo without flightlead on PATH never blocks", () => {
		setList([{ id: SAMPLE_TASK.id, title: SAMPLE_TASK.title }]);
		setView(SAMPLE_TASK);
		const r = run(["--ready"]);
		assert.equal(r.status, 0);
		// No flightlead on PATH — the guard skips the validator entirely
		spawnSync("git", ["checkout", "-b", "task/TASK-9"], {
			cwd: repoDir,
			encoding: "utf8",
		});
		writeFileSync(join(repoDir, "README.md"), "# changed\n");
		spawnSync("git", ["add", "README.md"], { cwd: repoDir, encoding: "utf8" });
		const ok = runHook({ withFlightlead: false });
		assert.equal(ok.status, 0);
	});
});
