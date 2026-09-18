/**
 * Unit tests for the persisted per-run controller status (TASK-5).
 *
 * The controller writes `.weavelog/runs/<run-id>/status.json` inside the target
 * worktree. OpenCode session status/idle events update the live state; the
 * controller records the terminal states.
 */

import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, test } from "node:test";
import {
  RUN_STATUS_FILE,
  type RunStatus,
  runStatusPath,
  sessionStatusStateOf,
  writeRunStatus,
} from "../src/runner/status.ts";
import { RUN_ROOT } from "../src/runner/workspace.ts";

describe("runner run status", () => {
  let dir: string;

  beforeEach(() => {
    dir = join(
      tmpdir(),
      `runner-status-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    mkdirSync(dir, { recursive: true });
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  test("runStatusPath keeps the status file inside the gitignored run dir", () => {
    assert.equal(
      runStatusPath(dir, "run-1"),
      join(dir, RUN_ROOT, "run-1", RUN_STATUS_FILE),
    );
    assert.throws(() => runStatusPath(dir, "../escape"), /run id/i);
  });

  test("sessionStatusStateOf maps session.status busy, retry and idle", () => {
    assert.deepEqual(
      sessionStatusStateOf(
        {
          type: "session.status",
          properties: { sessionID: "s1", status: { type: "busy" } },
        },
        "s1",
      ),
      { state: "busy" },
    );
    assert.deepEqual(
      sessionStatusStateOf(
        {
          type: "session.status",
          properties: {
            sessionID: "s1",
            status: {
              type: "retry",
              attempt: 3,
              message: "rate limited",
              next: 0,
            },
          },
        },
        "s1",
      ),
      { state: "retrying", attempt: 3, message: "rate limited" },
    );
    assert.deepEqual(
      sessionStatusStateOf(
        {
          type: "session.status",
          properties: { sessionID: "s1", status: { type: "idle" } },
        },
        "s1",
      ),
      { state: "idle" },
    );
  });

  test("sessionStatusStateOf maps session.idle to idle", () => {
    assert.deepEqual(
      sessionStatusStateOf(
        { type: "session.idle", properties: { sessionID: "s1" } },
        "s1",
      ),
      { state: "idle" },
    );
  });

  test("sessionStatusStateOf ignores other sessions and unrelated events", () => {
    assert.equal(
      sessionStatusStateOf(
        {
          type: "session.status",
          properties: { sessionID: "other", status: { type: "busy" } },
        },
        "s1",
      ),
      null,
    );
    assert.equal(
      sessionStatusStateOf(
        { type: "message.updated", properties: { sessionID: "s1" } },
        "s1",
      ),
      null,
    );
    assert.equal(sessionStatusStateOf(null, "s1"), null);
    assert.equal(sessionStatusStateOf("nope", "s1"), null);
  });

  test("writeRunStatus persists the full state as JSON atomically", () => {
    const path = runStatusPath(dir, "run-2");
    const status: RunStatus = {
      taskId: "TASK-9",
      runId: "run-2",
      stage: "implement",
      state: "busy",
      startedAt: "2026-09-18T00:00:00.000Z",
      updatedAt: "2026-09-18T00:00:01.000Z",
    };

    writeRunStatus(path, status);

    assert.ok(statSync(path).isFile());
    assert.deepEqual(JSON.parse(readFileSync(path, "utf8")), status);
    assert.equal(existsSync(`${path}.tmp`), false);
  });
});
