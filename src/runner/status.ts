/**
 * Persisted per-run controller status (TASK-5).
 *
 * Each controller run writes `.weavelog/runs/<run-id>/status.json` inside the
 * target worktree, which the existing `.weavelog/` gitignore entry covers.
 * OpenCode `session.status` and `session.idle` events update the live state;
 * the controller records the terminal states. Reading the file tells whether
 * the active stage is busy, retrying, idle, refused, failed, or awaiting human.
 */

import { mkdirSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { runRootDir } from "./workspace.js";

export type RunStatusState =
  | "busy"
  | "retrying"
  | "idle"
  | "refused"
  | "failed"
  | "awaiting-human";

export interface RunStatus {
  taskId: string;
  runId: string;
  stage: string;
  state: RunStatusState;
  attempt?: number;
  message?: string;
  startedAt: string;
  updatedAt: string;
}

/** One captured transition for the durable run record's status history. */
export interface RunStatusSnapshot extends RunStatus {
  /** Wall-clock time the controller captured this snapshot. */
  at: string;
}

/** Live update derived from one OpenCode session event. */
export interface SessionStatusUpdate {
  state: Extract<RunStatusState, "busy" | "retrying" | "idle">;
  attempt?: number;
  message?: string;
}

export const RUN_STATUS_FILE = "status.json";

/** Absolute path of the per-run status file inside the worktree. */
export function runStatusPath(worktreePath: string, runId: string): string {
  return join(runRootDir(worktreePath, runId), RUN_STATUS_FILE);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

/**
 * Map an OpenCode `session.status` or `session.idle` event to a persisted
 * state. Returns null for other sessions or unrelated events.
 */
export function sessionStatusStateOf(
  event: unknown,
  sessionId: string,
): SessionStatusUpdate | null {
  const e = asRecord(event);
  const props = asRecord(e?.properties);
  if (!e || !props || props.sessionID !== sessionId) return null;
  if (e.type === "session.idle") return { state: "idle" };
  if (e.type !== "session.status") return null;
  const status = asRecord(props.status);
  if (!status) return null;
  if (status.type === "busy") return { state: "busy" };
  if (status.type === "idle") return { state: "idle" };
  if (status.type === "retry") {
    return {
      state: "retrying",
      attempt: typeof status.attempt === "number" ? status.attempt : undefined,
      message: typeof status.message === "string" ? status.message : undefined,
    };
  }
  return null;
}

/** Write the status atomically so a concurrent reader never sees a partial file. */
export function writeRunStatus(path: string, status: RunStatus): void {
  mkdirSync(dirname(path), { recursive: true });
  const temp = `${path}.tmp`;
  writeFileSync(temp, `${JSON.stringify(status, null, 2)}\n`);
  renameSync(temp, path);
}
