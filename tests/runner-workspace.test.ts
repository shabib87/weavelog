/**
 * Unit tests for the per-run temp workspace and TMPDIR lifecycle (TASK-5).
 *
 * The controller creates `.weavelog-tmp/<run-id>` inside the target worktree
 * and the SDK session points TMPDIR at it for the server lifetime, restoring
 * the previous value on close.
 */

import assert from "node:assert/strict";
import { existsSync, mkdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, test } from "node:test";
import {
  createRunTmpDir,
  RUN_TMP_ROOT,
  runTmpDir,
  setTmpDir,
} from "../src/runner/workspace.ts";

describe("runner run workspace", () => {
  let dir: string;

  beforeEach(() => {
    dir = join(
      tmpdir(),
      `runner-ws-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    mkdirSync(dir, { recursive: true });
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  test("runTmpDir nests the run id under .weavelog-tmp in the worktree", () => {
    assert.equal(runTmpDir(dir, "run-1"), join(dir, RUN_TMP_ROOT, "run-1"));
  });

  test("createRunTmpDir creates the directory inside the worktree", () => {
    const created = createRunTmpDir(dir, "run-2");
    assert.ok(existsSync(created), "temp dir should exist");
    assert.ok(statSync(created).isDirectory(), "temp path should be a dir");
    assert.ok(
      created.startsWith(join(dir, RUN_TMP_ROOT)),
      "temp dir should live under .weavelog-tmp",
    );
  });

  test("createRunTmpDir refuses a run id that escapes the worktree", () => {
    assert.throws(() => createRunTmpDir(dir, "../escape"), /run id/i);
    assert.throws(() => createRunTmpDir(dir, "nested/../escape"), /run id/i);
  });

  test("setTmpDir sets TMPDIR and restore replaces the previous value", () => {
    const env: Record<string, string | undefined> = { TMPDIR: "/previous" };
    const restore = setTmpDir("/run/tmp", env);
    assert.equal(env.TMPDIR, "/run/tmp");
    restore();
    assert.equal(env.TMPDIR, "/previous");
  });

  test("setTmpDir restore deletes TMPDIR when it was unset", () => {
    const env: Record<string, string | undefined> = {};
    const restore = setTmpDir("/run/tmp", env);
    assert.equal(env.TMPDIR, "/run/tmp");
    restore();
    assert.equal("TMPDIR" in env, false);
  });
});
