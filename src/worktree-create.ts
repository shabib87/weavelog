#!/usr/bin/env -S node --import tsx
/**
 * worktree-create — create git worktrees for backlog tasks + install a pre-commit
 * hook that blocks commits on main.
 *
 * Modes:
 *   <task-id>        Create a worktree for one task.
 *   --ready          Create worktrees for all ready tasks (deps satisfied).
 *   --create <title>    Infer next task ID, create worktree, then create the task
 *                    from within the worktree so the task file lands on the
 *                    task branch — not on main.
 *
 * Exit codes: 0 ok, 1 no eligible tasks / task not found, 2 usage or error.
 * Env: WORKTREE_BACKLOG — backlog binary path (default ~/.bun/bin/backlog). Tests only.
 */
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { isAbsolute, join } from "node:path";

const HELP = `Usage: bun worktree-create.ts <task-id> [--dry-run]
       bun worktree-create.ts --ready [--dry-run]
       bun worktree-create.ts --create <title> [--dry-run]
       bun worktree-create.ts --help

Modes:
  <task-id>          Create a worktree for one task
  --ready            Create worktrees for all ready tasks (deps satisfied)
  --create <title>      Infer next task ID, create worktree, then create the
                     backlog task from within the worktree (cwd=worktree) so
                     the task file lands on the task branch, not on main

Options:
  --dry-run          Print what would be created, make no changes
  --help             Show this help

Exit codes:
  0  ok (worktree(s) created, or dry-run report)
  1  no eligible tasks (--ready with empty list) / task not found
  2  usage or error (missing backlog binary, git failure, etc.)

Env: WORKTREE_BACKLOG — backlog binary path (default ~/.bun/bin/backlog). Tests only.

Run from the repo root (cwd = the repo you want worktrees in). The repo root is
resolved from cwd via \`git rev-parse --show-toplevel\`; running from a
subdirectory or an unrelated repo creates worktrees + installs the hook THERE.`;

const HOOK_CONTENT = `#!/bin/sh
# Block commits on main. Rules: docs/architecture/worktree-discipline.md.
if [ "$ENFORCE_DISABLED" = "true" ]; then
  exit 0
fi
branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null)"
if [ "$branch" = "main" ] || [ "$branch" = "master" ]; then
  echo "Blocked: no commits on $branch. Work in .worktrees/<task-id> (branch task/<task-id>)." >&2
  echo "Rules: docs/architecture/worktree-discipline.md (approved task-branch merges only)." >&2
  exit 1
fi
# TASK-51: block AC-gutting on spec-approved tasks (backlog/tasks/task-*.md).
# Presence-guarded so foreign repos (no harness bin) are never blocked.
if command -v weavelog >/dev/null 2>&1; then
  if ! weavelog check --pre-commit; then
    exit 1
  fi
fi
exit 0
`;

const BACKLOG = process.env.WORKTREE_BACKLOG ?? join(homedir(), ".bun", "bin", "backlog");

function backlog(
	args: string[],
	opts?: { cwd?: string },
): { ok: boolean; out: string; err: string } {
	const r = spawnSync(BACKLOG, args, {
		encoding: "utf8",
		timeout: 30_000,
		cwd: opts?.cwd,
	});
	return {
		ok: r.status === 0,
		out: (r.stdout || "").trim(),
		err: (r.stderr || "").trim(),
	};
}

function fail2(msg: string): never {
	console.error(`worktree-create: ${msg}`);
	process.exit(2);
}

interface TaskInfo {
	id: string;
	title: string;
	description: string;
	acceptanceCriteria: { index: number; text: string; checked: boolean }[];
}

function formatTaskMd(task: TaskInfo): string {
	const acLines = (task.acceptanceCriteria ?? [])
		.map((ac) => `- [${ac.checked ? "x" : " "}] ${ac.text}`)
		.join("\n");
	return `# ${task.id} — ${task.title}

> Source of truth: \`backlog task view ${task.id}\`. This snapshot is stale on arrival —
> run \`backlog task view ${task.id}\` before starting work.

## Description

${task.description ?? ""}

## Acceptance Criteria

${acLines}
`;
}

function resolveRepoRoot(): string {
	const r = spawnSync("git", ["rev-parse", "--show-toplevel"], {
		encoding: "utf8",
	});
	if (r.status !== 0) fail2(`git rev-parse --show-toplevel failed: ${r.stderr || r.stdout}`);
	return (r.stdout || "").trim();
}

function resolveHookPath(repoRoot: string): string {
	const r = spawnSync("git", ["rev-parse", "--git-path", "hooks/pre-commit"], {
		cwd: repoRoot,
		encoding: "utf8",
	});
	if (r.status !== 0) fail2(`git rev-parse --git-path failed: ${r.stderr || r.stdout}`);
	const raw = (r.stdout || "").trim();
	return isAbsolute(raw) ? raw : join(repoRoot, raw);
}

function handleHook(repoRoot: string, dryRun: boolean): string {
	const hookPath = resolveHookPath(repoRoot);
	const hookExists = existsSync(hookPath);
	if (hookExists) {
		const content = readFileSync(hookPath, "utf8");
		const isOurs = content.includes("# Block commits on main.");
		if (!isOurs) return "hook=FOREIGN — main-block NOT installed, reconcile manually";
		if (content !== HOOK_CONTENT) {
			if (dryRun) return "hook=stale — would-rewrite";
			writeFileSync(hookPath, HOOK_CONTENT);
			chmodSync(hookPath, 0o755);
			return "hook=stale — rewritten";
		}
		return "hook present";
	}
	if (dryRun) return "hook=would-install";
	writeFileSync(hookPath, HOOK_CONTENT);
	chmodSync(hookPath, 0o755);
	return "hook=installed";
}

function fetchTaskDetails(taskId: string): TaskInfo {
	const vr = backlog(["task", "view", taskId, "--json"]);
	if (!vr.ok) fail2(`backlog task view failed for ${taskId}: ${vr.err || vr.out}`);
	try {
		const task = JSON.parse(vr.out).task as TaskInfo | undefined;
		if (!task) fail2(`no task in view output for ${taskId}`);
		return task;
	} catch {
		fail2(`failed to parse task view JSON for ${taskId}: ${vr.out}`);
	}
}

function processTaskId(
	taskId: string,
	repoRoot: string,
	dryRun: boolean,
	hookStatus: string,
	preloadedTask?: TaskInfo,
): void {
	const wtPath = join(repoRoot, ".worktrees", taskId);
	const branch = `task/${taskId}`;

	if (dryRun) {
		console.log(`DRY-RUN ${taskId} ${wtPath} branch=${branch} task.md=would-write ${hookStatus}`);
		return;
	}
	if (existsSync(wtPath)) {
		console.log(`WORKTREE ${taskId} ${wtPath} skipped=(exists) ${hookStatus}`);
		return;
	}

	const task = preloadedTask ?? fetchTaskDetails(taskId);

	const branchExists =
		spawnSync("git", ["show-ref", "--verify", `refs/heads/${branch}`], {
			cwd: repoRoot,
		}).status === 0;
	const wtAdd = spawnSync(
		"git",
		branchExists ? ["worktree", "add", wtPath, branch] : ["worktree", "add", wtPath, "-b", branch],
		{
			cwd: repoRoot,
			encoding: "utf8",
		},
	);
	if (wtAdd.status !== 0)
		fail2(`git worktree add failed for ${taskId}: ${wtAdd.stderr || wtAdd.stdout}`);

	writeFileSync(join(wtPath, "TASK.md"), formatTaskMd(task));
	console.log(`WORKTREE ${taskId} ${wtPath} branch=${branch} task.md=written ${hookStatus}`);
}

function inferNextTaskId(): string {
	const r = backlog(["task", "list", "--json"]);
	if (!r.ok) fail2(`backlog task list failed: ${r.err || r.out}`);
	let tasks: { id: string }[];
	try {
		tasks = (JSON.parse(r.out).tasks ?? []) as { id: string }[];
	} catch {
		fail2(`failed to parse task list JSON: ${r.out}`);
	}
	let maxNum = 0;
	for (const t of tasks) {
		const m = t.id.match(/(\d+)$/);
		if (m) maxNum = Math.max(maxNum, Number(m[1]));
	}
	return `TASK-${maxNum + 1}`;
}

function createTaskFromWorktree(
	title: string,
	wtPath: string,
	dryRun: boolean,
): { ok: boolean; id: string; raw: string } {
	if (dryRun) {
		return { ok: true, id: "(dry-run)", raw: "" };
	}
	const r = backlog(["task", "create", title, "--plain"], { cwd: wtPath });
	if (!r.ok) fail2(`backlog task create failed: ${r.err || r.out}`);
	const m = r.out.match(/TASK-\d+/);
	if (!m) fail2(`could not parse task id from: ${r.out}`);
	return { ok: true, id: m[0], raw: r.out };
}

function main(): void {
	const args = process.argv.slice(2);
	if (args.includes("--help")) {
		console.log(HELP);
		process.exit(0);
	}
	if (args.length === 0) {
		console.log(HELP);
		process.exit(2);
	}

	const KNOWN_FLAGS = new Set(["--ready", "--dry-run", "--help", "--create"]);
	for (const a of args) {
		if (a.startsWith("--") && !KNOWN_FLAGS.has(a)) fail2(`unknown flag: ${a}`);
	}

	if (!existsSync(BACKLOG)) fail2(`backlog binary not found: ${BACKLOG}`);

	const dryRun = args.includes("--dry-run");
	const positionals = args.filter((a) => !a.startsWith("--"));
	const repoRoot = resolveRepoRoot();

	if (args.includes("--create")) {
		const titleArgs = args.slice(args.indexOf("--create") + 1).filter((a) => a !== "--dry-run");
		const title = titleArgs.join(" ");
		if (!title) fail2("--create requires a <title> argument");
		const inferredId = inferNextTaskId();
		const hookStatus = handleHook(repoRoot, dryRun);
		const wtPath = join(repoRoot, ".worktrees", inferredId);
		const branch = `task/${inferredId}`;

		if (dryRun) {
			console.log(
				`DRY-RUN ${inferredId} ${wtPath} branch=${branch} task=create(dry-run) ${hookStatus}`,
			);
			process.exit(0);
		}
		if (existsSync(wtPath)) {
			console.log(`WORKTREE ${inferredId} ${wtPath} skipped=(exists) ${hookStatus}`);
			process.exit(0);
		}

		const branchExists =
			spawnSync("git", ["show-ref", "--verify", `refs/heads/${branch}`], {
				cwd: repoRoot,
			}).status === 0;
		const wtAdd = spawnSync(
			"git",
			branchExists
				? ["worktree", "add", wtPath, branch]
				: ["worktree", "add", wtPath, "-b", branch],
			{ cwd: repoRoot, encoding: "utf8" },
		);
		if (wtAdd.status !== 0)
			fail2(`git worktree add failed for ${inferredId}: ${wtAdd.stderr || wtAdd.stdout}`);

		const taskResult = createTaskFromWorktree(title, wtPath, dryRun);
		const taskId = taskResult.id;
		const taskBranch = `task/${taskId}`;
		writeFileSync(
			join(wtPath, "TASK.md"),
			formatTaskMd({
				id: taskId,
				title,
				description: "(created by --create mode — fill in during execution)",
				acceptanceCriteria: [],
			}),
		);
		console.log(`WORKTREE ${taskId} ${wtPath} branch=${taskBranch} task.md=written ${hookStatus}`);
		process.exit(0);
	}

	if (args.includes("--ready")) {
		if (positionals.length > 0) fail2("--ready takes no positional arguments");
		const r = backlog(["task", "list", "--ready", "--json"]);
		if (!r.ok) fail2(`backlog task list failed: ${r.err || r.out}`);
		let tasks: { id: string }[];
		try {
			tasks = (JSON.parse(r.out).tasks ?? []) as { id: string }[];
		} catch {
			fail2(`failed to parse task list JSON: ${r.out}`);
		}
		if (tasks.length === 0) {
			console.log("no ready tasks");
			process.exit(1);
		}
		const hookStatus = handleHook(repoRoot, dryRun);
		for (const t of tasks) {
			processTaskId(t.id, repoRoot, dryRun, hookStatus);
		}
		process.exit(0);
	}

	// <task-id> mode
	if (positionals.length !== 1) fail2("expected exactly one <task-id> argument");
	const taskId = positionals[0];
	if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(taskId)) fail2(`invalid task id: ${taskId}`);

	const vr = backlog(["task", "view", taskId, "--json"]);
	if (!vr.ok) {
		console.log("task not found");
		process.exit(1);
	}
	let preloadedTask: TaskInfo | undefined;
	try {
		preloadedTask = (JSON.parse(vr.out).task ?? undefined) as TaskInfo | undefined;
	} catch {
		// fall through to not-found below
	}
	if (!preloadedTask) {
		console.log("task not found");
		process.exit(1);
	}
	const hookStatus = handleHook(repoRoot, dryRun);
	// Use the canonical id from backlog (Fix 5: case normalization) for dir/branch.
	processTaskId(preloadedTask.id, repoRoot, dryRun, hookStatus, preloadedTask);
	process.exit(0);
}

main();
