/**
 * Unit tests for the per-run workspace and TMPDIR lifecycle (TASK-5).
 *
 * The controller creates `<worktree>/.weavelog/runs/<run-id>/` and points the
 * SDK session TMPDIR at its `tmp` child for the server lifetime, restoring the
 * previous value on close.
 */

import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, test } from "node:test";
import {
  createRunRoot,
  RUN_ROOT,
  RUN_TMP_DIR,
  runRootDir,
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

  test("the worktree-local runtime root is gitignored", () => {
    assert.match(
      readFileSync(join(process.cwd(), ".gitignore"), "utf8"),
      /^\.weavelog\/$/m,
    );
  });

  test("runRootDir nests the run id under .weavelog/runs in the worktree", () => {
    assert.equal(runRootDir(dir, "run-1"), join(dir, RUN_ROOT, "run-1"));
  });

  test("runTmpDir is the tmp child of the run root", () => {
    assert.equal(
      runTmpDir(dir, "run-1"),
      join(dir, RUN_ROOT, "run-1", RUN_TMP_DIR),
    );
  });

  test("createRunRoot creates the run root and its tmp child inside the worktree", () => {
    const created = createRunRoot(dir, "run-2");
    assert.equal(created.root, join(dir, RUN_ROOT, "run-2"));
    assert.equal(created.tmp, join(created.root, RUN_TMP_DIR));
    assert.ok(existsSync(created.root), "run root should exist");
    assert.ok(statSync(created.root).isDirectory(), "run root should be a dir");
    assert.ok(existsSync(created.tmp), "run tmp dir should exist");
    assert.ok(statSync(created.tmp).isDirectory(), "run tmp should be a dir");
    assert.ok(
      created.root.startsWith(join(dir, RUN_ROOT)),
      "run root should live under .weavelog/runs",
    );
  });

  test("createRunRoot refuses a run id that escapes the worktree", () => {
    assert.throws(() => createRunRoot(dir, "../escape"), /run id/i);
    assert.throws(() => createRunRoot(dir, "nested/../escape"), /run id/i);
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
