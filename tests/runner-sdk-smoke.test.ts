/**
 * Real SDK bootstrap smoke for TASK-4 AC1 (SDK invocation in the worktree).
 *
 * Skipped by default — it spawns a real `opencode serve` child. Run manually:
 *   RUNNER_SMOKE=1 node --import tsx --test tests/runner-sdk-smoke.test.ts
 * TASK-5 owns the full live agent run; this only proves session create/close.
 */

import assert from "node:assert/strict";
import { mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, test } from "node:test";
import { sdkSessionFactory } from "../src/runner/session.ts";

const enabled = process.env.RUNNER_SMOKE === "1";

describe("runner SDK bootstrap smoke", () => {
  let dir: string;
  let originalCwd: string;

  beforeEach(() => {
    originalCwd = process.cwd();
    dir = join(
      tmpdir(),
      `runner-smoke-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    mkdirSync(dir, { recursive: true });
  });

  afterEach(() => {
    process.chdir(originalCwd);
    rmSync(dir, { recursive: true, force: true });
  });

  test("creates a real session in the worktree cwd and closes cleanly", {
    skip: !enabled,
  }, async () => {
    const session = await sdkSessionFactory.start({
      cwd: dir,
      title: "runner smoke",
    });
    assert.ok(session.id.length > 0, "session id should be non-empty");
    await session.abort();
    await session.close();
    assert.equal(process.cwd(), originalCwd, "close restores cwd");
  });
});
