/**
 * Per-run temp workspace for one controller run (TASK-5).
 *
 * The controller creates `.weavelog-tmp/<run-id>` inside the target worktree.
 * The SDK session points TMPDIR at that directory for the server lifetime and
 * restores the previous value when it closes, so a worker never writes scratch
 * files to the shared `/tmp`.
 */

import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";

export const RUN_TMP_ROOT = ".weavelog-tmp";

/** A run id must be a single path segment with no traversal. */
export function assertSafeRunId(runId: string): void {
  if (runId === "" || runId.includes("/") || runId.includes("..")) {
    throw new Error(`invalid run id: ${JSON.stringify(runId)}`);
  }
}

/** Absolute per-run temp dir inside the worktree. */
export function runTmpDir(worktreePath: string, runId: string): string {
  assertSafeRunId(runId);
  return join(resolve(worktreePath), RUN_TMP_ROOT, runId);
}

/** Create the per-run temp dir and return its absolute path. */
export function createRunTmpDir(worktreePath: string, runId: string): string {
  const dir = runTmpDir(worktreePath, runId);
  mkdirSync(dir, { recursive: true });
  return dir;
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
