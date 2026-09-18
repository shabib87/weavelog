/**
 * Managed OpenCode adapter that keeps shell scratch files inside the worktree
 * (TASK-5).
 *
 * `weavelog init` emits this hook as a managed adapter into the normal OpenCode
 * config, alongside enforce and verify-gate, so it never replaces the user's
 * agents or other configuration. The controller points process TMPDIR at
 * `<worktree>/.weavelog/runs/<run-id>/tmp`; this hook honors that path only when
 * it exists inside the worktree's `.weavelog/runs` root. Any other session gets
 * the safe per-session fallback under `.weavelog/runs/<session-id>/tmp`.
 */

import { existsSync, mkdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";

interface ShellEnvInput {
  cwd: string;
  sessionID?: string;
}

interface ShellEnvOutput {
  env: Record<string, string>;
}

const RUN_ROOT = ".weavelog/runs";

function safeSessionSegment(sessionId: string | undefined): string {
  return sessionId ? sessionId.replace(/[^A-Za-z0-9_-]/g, "_") : "session";
}

/** True when `candidate` is a non-empty path inside `<worktree>/.weavelog/runs`. */
function insideRunRoot(worktree: string, candidate: string): boolean {
  const root = resolve(worktree, RUN_ROOT);
  const rel = relative(root, resolve(candidate));
  return rel !== "" && !rel.startsWith("..") && !rel.includes("../");
}

export const WeavelogTmp = () => {
  return {
    "shell.env": (input: ShellEnvInput, output: ShellEnvOutput) => {
      const provided = process.env.TMPDIR;
      if (
        provided &&
        insideRunRoot(input.cwd, provided) &&
        existsSync(provided)
      ) {
        output.env.TMPDIR = provided;
        return;
      }
      const fallback = join(
        resolve(input.cwd),
        RUN_ROOT,
        safeSessionSegment(input.sessionID),
        "tmp",
      );
      mkdirSync(fallback, { recursive: true });
      output.env.TMPDIR = fallback;
    },
  };
};
