#!/usr/bin/env -S node --import tsx
/**
 * runner — bounded TypeScript-controlled OpenCode workflow for one Backlog task.
 *
 * Reads the task through the Backlog CLI JSON interface, runs it in the task
 * worktree through the pinned OpenCode SDK, and advances through
 * implement -> verify -> review -> human-gate only when TypeScript checks the
 * preceding stage's evidence. It never commits, merges, publishes, marks work
 * Done, or bypasses a hook/permission refusal.
 *
 * Usage:
 *   runner <task-id> [--max-rework N] [--implementation-ready] [--dry-run]
 *
 * Exit codes: 0 awaiting human gate / success, 1 failed or refused, 2 usage.
 * Env: RUNNER_BACKLOG — backlog binary (default ~/.bun/bin/backlog). Tests only.
 * Env: RUNNER_REPO_ROOT — repo root holding .worktrees/ (tests only).
 * Env: RUNNER_STATE_DIR — state dir for the run record + ledger (tests only).
 */

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import {
  DEFAULT_AGENTS,
  DEFAULT_COMMANDS,
  runController,
} from "../runner/controller.js";
import type { ExecRunner } from "../runner/evidence.js";
import { outcomeExitCode } from "../runner/record.js";
import { sdkSessionFactory } from "../runner/session.js";
import {
  detectHarnessDevFromCwd,
  eligibilityErrors,
  parseTaskView,
} from "../runner/task.js";
import { resolveDependencyStatuses } from "./task-validate.js";

const HELP = `Usage: runner <task-id> [--max-rework N] [--stage-timeout-ms N] [--implementation-ready] [--dry-run]

Runs one claimed Backlog task through one bounded OpenCode workflow:
  implement -> verify -> review -> [HUMAN GATE: merge approval]

Options:
  --max-rework N         Bounded rework attempts after a failed verify/review (default 1)
  --stage-timeout-ms N   Abort an agent stage after N ms (default 1800000; 0 disables)
  --implementation-ready Skip implement and disable rework; verify/review an existing diff
  --dry-run              Print the plan and exit; starts no session
  --help                 Show this help

Exit codes: 0 awaiting human gate, 1 failed or refused, 2 usage error.
Env: RUNNER_BACKLOG    backlog binary path (default ~/.bun/bin/backlog); tests only
Env: RUNNER_REPO_ROOT  repo root containing .worktrees/; tests only
Env: RUNNER_STATE_DIR  state dir for the run record + ledger; tests only`;

const BACKLOG =
  process.env.RUNNER_BACKLOG ?? join(homedir(), ".bun", "bin", "backlog");
const STATE_DIR =
  process.env.RUNNER_STATE_DIR ??
  process.env.WEAVELOG_STATE_DIR ??
  join(homedir(), ".local", "state", "weavelog");

function fail2(message: string): never {
  console.error(`runner: ${message}`);
  process.exit(2);
}

/** Main worktree root, even when invoked from a linked worktree. */
function resolveRepoRoot(): string {
  if (process.env.RUNNER_REPO_ROOT) return process.env.RUNNER_REPO_ROOT;
  const common = spawnSync(
    "git",
    ["rev-parse", "--path-format=absolute", "--git-common-dir"],
    { encoding: "utf8", timeout: 10_000 },
  );
  if (common.status === 0 && common.stdout.trim()) {
    const gitDir = common.stdout.trim();
    return dirname(gitDir);
  }
  return process.cwd();
}

const realExec: ExecRunner = {
  run(command, args, options) {
    const result = spawnSync(command, args, {
      cwd: options?.cwd,
      encoding: "utf8",
      timeout: 600_000,
    });
    return {
      command,
      args,
      exitCode: result.status ?? 1,
      stdout: result.stdout || "",
      stderr: result.stderr || "",
    };
  },
};

const VALUE_FLAGS = ["--max-rework", "--stage-timeout-ms"];

/** Read `--flag value` or `--flag=value`. */
function flagValue(args: string[], name: string): string | undefined {
  const inline = args.find((a) => a.startsWith(`${name}=`));
  if (inline) return inline.slice(name.length + 1);
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

/** Positionals, excluding known value flags and their values. */
function positionalsOf(args: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (VALUE_FLAGS.includes(arg)) {
      i += 1;
      continue;
    }
    if (VALUE_FLAGS.some((flag) => arg.startsWith(`${flag}=`))) continue;
    if (arg.startsWith("--")) continue;
    out.push(arg);
  }
  return out;
}

function numberFlag(
  args: string[],
  name: string,
  fallback: number | undefined,
): number | undefined {
  const present =
    args.includes(name) || args.some((a) => a.startsWith(`${name}=`));
  if (!present) return fallback;
  const raw = flagValue(args, name);
  const value = Number(raw);
  if (raw === undefined || raw === "" || Number.isNaN(value) || value < 0) {
    fail2(`${name} requires a non-negative number`);
  }
  return value;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.includes("--help")) {
    console.log(HELP);
    process.exit(0);
  }
  if (args.length === 0) fail2(`missing <task-id> — see --help`);

  const requestedMaxRework = numberFlag(args, "--max-rework", 1) ?? 1;
  const implementationReady = args.includes("--implementation-ready");
  const maxRework = implementationReady ? 0 : requestedMaxRework;
  const stageTimeoutMs = numberFlag(args, "--stage-timeout-ms", undefined);
  const dryRun = args.includes("--dry-run");
  const positionals = positionalsOf(args);
  if (positionals.length !== 1) {
    fail2("expected exactly one <task-id> argument");
  }
  const taskId = positionals[0];
  if (!existsSync(BACKLOG)) fail2(`backlog binary not found: ${BACKLOG}`);

  const repoRoot = resolveRepoRoot();
  // The selected task's Backlog record may not exist on this controller branch.
  // Read it from the target worktree, where its task branch owns the record.
  const worktreePath = join(repoRoot, ".worktrees", taskId);
  const view = spawnSync(BACKLOG, ["task", "view", taskId, "--json"], {
    cwd: existsSync(worktreePath) ? worktreePath : undefined,
    encoding: "utf8",
    timeout: 30_000,
  });
  const task = view.status === 0 ? parseTaskView(view.stdout || "") : null;
  if (!task) {
    console.log(`task ${taskId} not found`);
    process.exit(1);
  }

  const dependencies = resolveDependencyStatuses(task.dependencies, {
    baseDir: repoRoot,
  });
  const harnessDev = detectHarnessDevFromCwd(repoRoot);
  const eligibility = eligibilityErrors(task, dependencies, harnessDev);
  for (const warning of eligibility.warnings) {
    console.log(`WARN ${task.id}: ${warning}`);
  }
  if (!eligibility.ok) {
    console.log(`REFUSED ${task.id}: not eligible to run`);
    for (const error of eligibility.errors) console.log(`  - ${error}`);
    process.exit(1);
  }

  if (!existsSync(worktreePath)) {
    console.log(
      `worktree not found: ${worktreePath} — create it with \`worktree-create ${task.id}\``,
    );
    process.exit(1);
  }

  const stages = (
    implementationReady
      ? ["verify", "review", "human-gate"]
      : ["implement", "verify", "review", "human-gate"]
  ).join(" -> ");
  if (dryRun) {
    console.log(
      `DRY-RUN ${task.id} worktree=${worktreePath} stages=${stages} maxRework=${maxRework}`,
    );
    process.exit(0);
  }

  // Cancellation: the controller stops, aborts the active stage, and records
  // the run instead of dying silently on Ctrl-C.
  const abort = new AbortController();
  process.once("SIGINT", () => abort.abort());
  process.once("SIGTERM", () => abort.abort());

  const record = await runController(
    { exec: realExec, sessions: sdkSessionFactory, stateDir: STATE_DIR },
    {
      task,
      dependencies,
      worktreePath,
      harnessDev,
      maxRework,
      implementationReady,
      stageTimeoutMs,
      signal: abort.signal,
      commands: DEFAULT_COMMANDS,
      agents: DEFAULT_AGENTS,
    },
  );
  console.log(
    `RUN ${record.outcome} task=${record.taskId} stage=${record.finalStage} rework=${record.rework} record=${record.recordPath}`,
  );
  for (const reason of record.reasons) console.log(`  - ${reason}`);
  process.exit(outcomeExitCode(record.outcome));
}

main().catch((error: unknown) => {
  fail2(error instanceof Error ? error.message : String(error));
});
