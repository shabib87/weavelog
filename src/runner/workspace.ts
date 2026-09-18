/**
 * Per-run workspace for one controller run (TASK-5).
 *
 * The controller creates `<worktree>/.weavelog/runs/<run-id>/` inside the target
 * worktree. The SDK session points TMPDIR at the run's `tmp` child for the
 * server lifetime and restores the previous value when it closes, so a worker
 * never writes scratch files to the shared `/tmp`.
 */

import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";

export const RUN_ROOT = ".weavelog/runs";
export const RUN_TMP_DIR = "tmp";

/** A run id must be a single path segment with no traversal. */
export function assertSafeRunId(runId: string): void {
  if (runId === "" || runId.includes("/") || runId.includes("..")) {
    throw new Error(`invalid run id: ${JSON.stringify(runId)}`);
  }
}

/** Absolute per-run root inside the worktree: `<worktree>/.weavelog/runs/<run-id>`. */
export function runRootDir(worktreePath: string, runId: string): string {
  assertSafeRunId(runId);
  return join(resolve(worktreePath), RUN_ROOT, runId);
}

/** Absolute TMPDIR for a run: the `tmp` child of the run root. */
export function runTmpDir(worktreePath: string, runId: string): string {
  return join(runRootDir(worktreePath, runId), RUN_TMP_DIR);
}

/** Create the per-run root and its tmp child; return both absolute paths. */
export function createRunRoot(
  worktreePath: string,
  runId: string,
): { root: string; tmp: string } {
  const root = runRootDir(worktreePath, runId);
  const tmp = join(root, RUN_TMP_DIR);
  mkdirSync(tmp, { recursive: true });
  return { root, tmp };
}

/**
 * Set TMPDIR and return a restore function that puts the previous value back
 * (or deletes it when it was unset).
 */
export function setTmpDir(
  tmpDir: string,
  env: Record<string, string | undefined> = process.env,
): () => void {
  const previous = env.TMPDIR;
  env.TMPDIR = tmpDir;
  return () => {
    if (previous === undefined) delete env.TMPDIR;
    else env.TMPDIR = previous;
  };
}
