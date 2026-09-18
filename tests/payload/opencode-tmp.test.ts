import assert from "node:assert/strict";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { basename, join, relative } from "node:path";
import { afterEach, test } from "node:test";
import { WeavelogTmp } from "../../src/hooks/opencode-tmp.ts";

const worktree = join(process.cwd(), `.weavelog-tmp-test-${process.pid}`);
const originalTmpDir = process.env.TMPDIR;

function setProcessTmpDir(value: string | undefined): void {
  if (value === undefined) delete process.env.TMPDIR;
  else process.env.TMPDIR = value;
}

afterEach(() => {
  setProcessTmpDir(originalTmpDir);
  rmSync(worktree, { recursive: true, force: true });
});

test("shell.env creates a session tmp directory under .weavelog/runs", async () => {
  mkdirSync(worktree, { recursive: true });
  setProcessTmpDir(undefined);
  const output = { env: {} as Record<string, string> };

  await (await WeavelogTmp())["shell.env"](
    { cwd: worktree, sessionID: "session-123" },
    output,
  );

  assert.equal(
    output.env.TMPDIR,
    join(worktree, ".weavelog", "runs", "session-123", "tmp"),
  );
  assert.equal(existsSync(output.env.TMPDIR), true);
});

test("shell.env uses a deterministic safe fallback without a session ID", async () => {
  mkdirSync(worktree, { recursive: true });
  setProcessTmpDir(undefined);
  const output = { env: {} as Record<string, string> };

  await (await WeavelogTmp())["shell.env"]({ cwd: worktree }, output);

  assert.equal(
    output.env.TMPDIR,
    join(worktree, ".weavelog", "runs", "session", "tmp"),
  );
  assert.equal(existsSync(output.env.TMPDIR), true);
});

test("shell.env sanitizes session IDs so traversal cannot escape the worktree", async () => {
  mkdirSync(worktree, { recursive: true });
  setProcessTmpDir(undefined);
  const output = { env: {} as Record<string, string> };

  await (await WeavelogTmp())["shell.env"](
    { cwd: worktree, sessionID: "../../outside" },
    output,
  );

  assert.equal(
    relative(join(worktree, ".weavelog", "runs"), output.env.TMPDIR).startsWith(
      "..",
    ),
    false,
  );
  assert.equal(basename(output.env.TMPDIR), "tmp");
  assert.equal(existsSync(output.env.TMPDIR), true);
});

test("shell.env honors a controller TMPDIR inside the worktree's .weavelog/runs root", async () => {
  mkdirSync(worktree, { recursive: true });
  const runTmp = join(worktree, ".weavelog", "runs", "run-42", "tmp");
  mkdirSync(runTmp, { recursive: true });
  setProcessTmpDir(runTmp);
  const output = { env: {} as Record<string, string> };

  await (await WeavelogTmp())["shell.env"](
    { cwd: worktree, sessionID: "session-123" },
    output,
  );

  assert.equal(output.env.TMPDIR, runTmp);
});

test("shell.env ignores a controller TMPDIR outside the worktree's .weavelog/runs root", async () => {
  mkdirSync(worktree, { recursive: true });
  const outside = join(worktree, "outside-tmp");
  mkdirSync(outside, { recursive: true });
  setProcessTmpDir(outside);
  const output = { env: {} as Record<string, string> };

  await (await WeavelogTmp())["shell.env"](
    { cwd: worktree, sessionID: "session-123" },
    output,
  );

  assert.equal(
    output.env.TMPDIR,
    join(worktree, ".weavelog", "runs", "session-123", "tmp"),
  );
  assert.equal(existsSync(output.env.TMPDIR), true);
});

test("shell.env ignores a controller TMPDIR inside .weavelog/runs that does not exist", async () => {
  mkdirSync(worktree, { recursive: true });
  setProcessTmpDir(join(worktree, ".weavelog", "runs", "missing-run", "tmp"));
  const output = { env: {} as Record<string, string> };

  await (await WeavelogTmp())["shell.env"](
    { cwd: worktree, sessionID: "session-123" },
    output,
  );

  assert.equal(
    output.env.TMPDIR,
    join(worktree, ".weavelog", "runs", "session-123", "tmp"),
  );
  assert.equal(existsSync(output.env.TMPDIR), true);
});

test("the OpenCode manifest no longer materializes the temporary-directory plugin", async () => {
  const manifest = await import(
    "../../payload/config/harnesses/opencode.json",
    {
      with: { type: "json" },
    }
  );

  assert.equal(manifest.default.files["plugins/opencode-tmp.ts"], undefined);
});
