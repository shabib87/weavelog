import assert from "node:assert/strict";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { basename, join, relative } from "node:path";
import { afterEach, test } from "node:test";
import { WeavelogTmp } from "../../payload/config/plugins/opencode-tmp.ts";

const worktree = join(process.cwd(), `.weavelog-tmp-test-${process.pid}`);

afterEach(() => {
  rmSync(worktree, { recursive: true, force: true });
});

test("shell.env creates a session directory under the worktree", async () => {
  mkdirSync(worktree, { recursive: true });
  const output = { env: {} as Record<string, string> };

  await (await WeavelogTmp())["shell.env"](
    { cwd: worktree, sessionID: "session-123" },
    output,
  );

  assert.equal(
    output.env.TMPDIR,
    join(worktree, ".weavelog-tmp", "session-123"),
  );
  assert.equal(existsSync(output.env.TMPDIR), true);
});

test("shell.env uses a deterministic safe fallback without a session ID", async () => {
  mkdirSync(worktree, { recursive: true });
  const output = { env: {} as Record<string, string> };

  await (await WeavelogTmp())["shell.env"]({ cwd: worktree }, output);

  assert.equal(output.env.TMPDIR, join(worktree, ".weavelog-tmp", "session"));
  assert.equal(existsSync(output.env.TMPDIR), true);
});

test("shell.env sanitizes session IDs so traversal cannot escape the worktree", async () => {
  mkdirSync(worktree, { recursive: true });
  const output = { env: {} as Record<string, string> };

  await (await WeavelogTmp())["shell.env"](
    { cwd: worktree, sessionID: "../../outside" },
    output,
  );

  assert.equal(
    relative(join(worktree, ".weavelog-tmp"), output.env.TMPDIR).startsWith(
      "..",
    ),
    false,
  );
  assert.equal(basename(output.env.TMPDIR), "______outside");
  assert.equal(existsSync(output.env.TMPDIR), true);
});

test("the OpenCode manifest materializes the temporary-directory plugin", async () => {
  const manifest = await import(
    "../../payload/config/harnesses/opencode.json",
    {
      with: { type: "json" },
    }
  );

  assert.equal(
    manifest.default.files["plugins/opencode-tmp.ts"],
    "config/plugins/opencode-tmp.ts",
  );
});
