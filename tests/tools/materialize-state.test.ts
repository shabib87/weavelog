import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, test } from "node:test";

import {
  readActiveProfile,
  readSnapshot,
  redactInputs,
  targetIdOf,
  writeActiveProfile,
  writeSnapshot,
} from "../../src/tools/materialize-state.js";

const created: string[] = [];
afterEach(() => {
  for (const dir of created.splice(0))
    rmSync(dir, { recursive: true, force: true });
});

let n = 0;
function makeDir(prefix: string): string {
  const dir = join(
    tmpdir(),
    `materialize-state-${prefix}-${Date.now()}-${n++}`,
  );
  mkdirSync(dir, { recursive: true });
  created.push(dir);
  return dir;
}

/** A fresh state root that does not exist yet; the module creates it 0700. */
function freshRoot(prefix: string): string {
  return join(makeDir(prefix), "weavelog-state");
}

const TARGET = join(homedir(), ".agents", "AGENTS.md");
const HARNESS = "opencode";
const PROFILE = "personal";

function snapshotPath(
  root: string,
  harness: string,
  tid: string,
  profileId: string,
  sha: string,
): string {
  return join(
    root,
    "materialize",
    harness,
    tid,
    "snapshots",
    profileId,
    `${sha}.json`,
  );
}

function walk(stateRoot: string): { dirs: string[]; files: string[] } {
  const dirs: string[] = [];
  const files: string[] = [];
  const visit = (d: string): void => {
    dirs.push(d);
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const full = join(d, entry.name);
      if (entry.isDirectory()) visit(full);
      else files.push(full);
    }
  };
  visit(stateRoot);
  return { dirs, files };
}

describe("materialize-state (targetIdOf)", () => {
  test("is a stable opaque sha256 hex digest of the canonical path", () => {
    const id = targetIdOf(TARGET);
    assert.match(id, /^[0-9a-f]{64}$/);
    assert.equal(targetIdOf(TARGET), id);
    assert.notEqual(targetIdOf(join(homedir(), ".agents")), id);
    assert.ok(!id.includes(homedir()));
    assert.ok(!id.includes("AGENTS.md"));
  });
});

describe("materialize-state (redactInputs)", () => {
  test("persists non-path, non-secret values verbatim", () => {
    const redacted = redactInputs({ MODEL: "claude-sonnet-4", PORT: "8080" });
    assert.deepEqual(redacted, { MODEL: "claude-sonnet-4", PORT: "8080" });
  });

  test("opaque-encodes path-valued values as sha256 digests, never the raw path", () => {
    const homePath = join(homedir(), ".agents");
    const redacted = redactInputs({ WEAVELOG_HOME: homePath });
    const expected = createHash("sha256").update(homePath).digest("hex");
    assert.equal(redacted.WEAVELOG_HOME, expected);
    assert.ok(!redacted.WEAVELOG_HOME.includes(homedir()));
    assert.ok(!redacted.WEAVELOG_HOME.includes(".agents"));
  });

  test("replaces secret-ish key values with the redaction marker in every form", () => {
    const redacted = redactInputs({
      ANTHROPIC_API_KEY: "sk-ant-supersecret123",
      password: "hunter2",
      GITHUB_TOKEN: "ghp_secret",
    });
    assert.equal(redacted.ANTHROPIC_API_KEY, "[redacted]");
    assert.equal(redacted.password, "[redacted]");
    assert.equal(redacted.GITHUB_TOKEN, "[redacted]");
    const joined = JSON.stringify(redacted);
    assert.ok(!joined.includes("sk-ant-supersecret123"));
    assert.ok(!joined.includes("hunter2"));
    assert.ok(!joined.includes("ghp_secret"));
  });
});

describe("materialize-state (writeSnapshot)", () => {
  test("writes the content-addressed snapshot at materialize/<harness>/<target-id>/snapshots/<profile-id>/", () => {
    const root = freshRoot("layout");
    const tid = targetIdOf(TARGET);
    const res = writeSnapshot(root, HARNESS, tid, PROFILE, {
      MODEL: "claude-sonnet-4",
      WEAVELOG_HOME: TARGET,
    });
    assert.equal(res.ok, true);
    if (!res.ok) return;
    const file = snapshotPath(
      root,
      HARNESS,
      tid,
      PROFILE,
      res.value.snapshotSha256,
    );
    assert.equal(readFileSync(file, "utf8") === "", false);
    // the stored file content hashes to its own name
    const stored = readFileSync(file, "utf8");
    assert.equal(
      createHash("sha256").update(stored).digest("hex"),
      res.value.snapshotSha256,
    );
    // the raw home path never lands in the snapshot content
    assert.ok(!stored.includes(homedir()));
    assert.ok(!stored.includes(".agents"));
  });

  test("is immutable: writing an existing hash is a no-op and never rewrites", () => {
    const root = freshRoot("immutable");
    const tid = targetIdOf(TARGET);
    const inputs = { MODEL: "claude-sonnet-4" };
    const first = writeSnapshot(root, HARNESS, tid, PROFILE, inputs);
    assert.equal(first.ok, true);
    if (!first.ok) return;
    const file = snapshotPath(
      root,
      HARNESS,
      tid,
      PROFILE,
      first.value.snapshotSha256,
    );
    const before = readFileSync(file, "utf8");
    const second = writeSnapshot(root, HARNESS, tid, PROFILE, inputs);
    assert.equal(second.ok, true);
    if (!second.ok) return;
    assert.equal(second.value.snapshotSha256, first.value.snapshotSha256);
    assert.equal(second.value.written, false);
    assert.equal(readFileSync(file, "utf8"), before);
    assert.equal(
      readdirSync(join(root, "materialize", HARNESS, tid, "snapshots", PROFILE))
        .length,
      1,
    );
  });

  test("content-addresses by redacted inputs and profile id", () => {
    const root = freshRoot("content-address");
    const tid = targetIdOf(TARGET);
    const a = writeSnapshot(root, HARNESS, tid, PROFILE, { MODEL: "opus" });
    const b = writeSnapshot(root, HARNESS, tid, PROFILE, { MODEL: "sonnet" });
    const c = writeSnapshot(root, HARNESS, tid, "work", { MODEL: "opus" });
    assert.equal(a.ok && b.ok && c.ok, true);
    if (!a.ok || !b.ok || !c.ok) return;
    assert.notEqual(b.value.snapshotSha256, a.value.snapshotSha256);
    assert.notEqual(c.value.snapshotSha256, a.value.snapshotSha256);
  });

  test("produces the same hash regardless of input key order", () => {
    const root = freshRoot("determinism");
    const tid = targetIdOf(TARGET);
    const a = writeSnapshot(root, HARNESS, tid, PROFILE, { a: "1", b: "2" });
    const b = writeSnapshot(root, HARNESS, tid, PROFILE, { b: "2", a: "1" });
    assert.equal(a.ok && b.ok, true);
    if (!a.ok || !b.ok) return;
    assert.equal(b.value.snapshotSha256, a.value.snapshotSha256);
  });

  test("refuses a symlink anywhere in the state path chain", () => {
    const root = freshRoot("symlink-dir");
    const tid = targetIdOf(TARGET);
    mkdirSync(join(root, "materialize"), { recursive: true });
    symlinkSync(makeDir("outside"), join(root, "materialize", HARNESS));
    const res = writeSnapshot(root, HARNESS, tid, PROFILE, { MODEL: "x" });
    assert.equal(res.ok, false);
    if (res.ok) return;
    assert.equal(res.error.code, "symlink-refusal");
  });

  test("refuses an existing non-directory where a directory is expected", () => {
    const root = freshRoot("not-dir");
    const tid = targetIdOf(TARGET);
    mkdirSync(join(root, "materialize"), { recursive: true });
    writeFileSync(join(root, "materialize", HARNESS), "a regular file");
    const res = writeSnapshot(root, HARNESS, tid, PROFILE, { MODEL: "x" });
    assert.equal(res.ok, false);
    if (res.ok) return;
    assert.equal(res.error.code, "not-directory");
  });

  test("refuses to write a snapshot through a symlinked snapshot file", () => {
    const root = freshRoot("symlink-snapshot");
    const tid = targetIdOf(TARGET);
    const first = writeSnapshot(root, HARNESS, tid, PROFILE, { MODEL: "x" });
    assert.equal(first.ok, true);
    if (!first.ok) return;
    const file = snapshotPath(
      root,
      HARNESS,
      tid,
      PROFILE,
      first.value.snapshotSha256,
    );
    rmSync(file, { force: true });
    const outside = join(makeDir("outside"), "snapshot.json");
    writeFileSync(outside, "{}");
    symlinkSync(outside, file);
    const second = writeSnapshot(root, HARNESS, tid, PROFILE, { MODEL: "x" });
    assert.equal(second.ok, false);
    if (second.ok) return;
    assert.equal(second.error.code, "symlink-refusal");
  });

  test("refuses a harness or target id that is not a safe path segment", () => {
    const root = freshRoot("unsafe-id");
    const tid = targetIdOf(TARGET);
    const badHarness = writeSnapshot(root, "../../etc", tid, PROFILE, {
      MODEL: "x",
    });
    const badTarget = writeSnapshot(
      root,
      HARNESS,
      "not-a-hex-digest",
      PROFILE,
      { MODEL: "x" },
    );
    const badProfile = writeSnapshot(root, HARNESS, tid, "Up Per", {
      MODEL: "x",
    });
    assert.equal(badHarness.ok && badTarget.ok && badProfile.ok, false);
    if (badHarness.ok || badTarget.ok || badProfile.ok) return;
    assert.match(badHarness.error.message, /harness/i);
    assert.match(badTarget.error.message, /target/i);
    assert.match(badProfile.error.message, /profile/i);
  });
});

describe("materialize-state (active-profile record)", () => {
  test("writeActiveProfile then readActiveProfile roundtrip", () => {
    const root = freshRoot("active");
    const tid = targetIdOf(TARGET);
    const record = {
      profileId: PROFILE,
      snapshotSha256: "a".repeat(64),
      updatedAt: "2026-09-18T00:00:00.000Z",
    };
    const w = writeActiveProfile(root, HARNESS, tid, record);
    assert.equal(w.ok, true);
    if (!w.ok) return;
    assert.equal(
      w.value.path.includes(join("materialize", HARNESS, tid)),
      true,
    );
    const r = readActiveProfile(root, HARNESS, tid);
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.deepEqual(r.value, record);
  });

  test("readActiveProfile returns null for missing state", () => {
    const root = freshRoot("active-missing");
    const r = readActiveProfile(root, HARNESS, targetIdOf(TARGET));
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.value, null);
  });

  test("readActiveProfile surfaces corrupt records as a typed error, not a throw", () => {
    const root = freshRoot("active-corrupt");
    const tid = targetIdOf(TARGET);
    const w = writeActiveProfile(root, HARNESS, tid, {
      profileId: PROFILE,
      snapshotSha256: "a".repeat(64),
      updatedAt: "2026-09-18T00:00:00.000Z",
    });
    assert.equal(w.ok, true);
    if (!w.ok) return;
    writeFileSync(
      join(root, "materialize", HARNESS, tid, "active-profile"),
      "{ not json",
    );
    const r = readActiveProfile(root, HARNESS, tid);
    assert.equal(r.ok, false);
    if (r.ok) return;
    assert.equal(r.error.code, "invalid");
  });

  test("readActiveProfile refuses to read through a symlinked record", () => {
    const root = freshRoot("active-symlink");
    const tid = targetIdOf(TARGET);
    const w = writeActiveProfile(root, HARNESS, tid, {
      profileId: PROFILE,
      snapshotSha256: "a".repeat(64),
      updatedAt: "2026-09-18T00:00:00.000Z",
    });
    assert.equal(w.ok, true);
    if (!w.ok) return;
    const file = join(root, "materialize", HARNESS, tid, "active-profile");
    rmSync(file, { force: true });
    const outside = join(makeDir("outside"), "record.json");
    writeFileSync(outside, "{}");
    symlinkSync(outside, file);
    const r = readActiveProfile(root, HARNESS, tid);
    assert.equal(r.ok, false);
    if (r.ok) return;
    assert.equal(r.error.code, "symlink-refusal");
  });
});

describe("materialize-state (readSnapshot)", () => {
  test("roundtrips a written snapshot; missing hash reads as null", () => {
    const root = freshRoot("read-snapshot");
    const tid = targetIdOf(TARGET);
    const inputs = { MODEL: "claude-sonnet-4" };
    const w = writeSnapshot(root, HARNESS, tid, PROFILE, inputs);
    assert.equal(w.ok, true);
    if (!w.ok) return;
    const r = readSnapshot(root, HARNESS, tid, PROFILE, w.value.snapshotSha256);
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.value?.snapshotSha256, w.value.snapshotSha256);
    assert.deepEqual(r.value?.inputs, inputs);
    const missing = readSnapshot(root, HARNESS, tid, PROFILE, "f".repeat(64));
    assert.equal(missing.ok, true);
    if (!missing.ok) return;
    assert.equal(missing.value, null);
  });

  test("refuses to read a snapshot through a symlink", () => {
    const root = freshRoot("read-snapshot-symlink");
    const tid = targetIdOf(TARGET);
    const outside = join(makeDir("outside"), "snapshot.json");
    writeFileSync(outside, "{}");
    const file = snapshotPath(root, HARNESS, tid, PROFILE, "c".repeat(64));
    mkdirSync(dirname(file), { recursive: true });
    symlinkSync(outside, file);
    const r = readSnapshot(root, HARNESS, tid, PROFILE, "c".repeat(64));
    assert.equal(r.ok, false);
    if (r.ok) return;
    assert.equal(r.error.code, "symlink-refusal");
  });
});

describe("materialize-state (state hygiene)", () => {
  test("every directory under the state root is 0700 and every file 0600", () => {
    const root = freshRoot("modes");
    const tid = targetIdOf(TARGET);
    const w = writeSnapshot(root, HARNESS, tid, PROFILE, { MODEL: "x" });
    const a = writeActiveProfile(root, HARNESS, tid, {
      profileId: PROFILE,
      snapshotSha256: w.ok ? w.value.snapshotSha256 : "a".repeat(64),
      updatedAt: "2026-09-18T00:00:00.000Z",
    });
    assert.equal(w.ok && a.ok, true);
    if (!w.ok || !a.ok) return;
    const { dirs, files } = walk(root);
    assert.ok(
      dirs.length >= 5,
      `expected a real tree, got ${dirs.length} dirs`,
    );
    for (const d of dirs) {
      assert.equal(lstatSync(d).mode & 0o777, 0o700, `dir mode: ${d}`);
    }
    for (const f of files) {
      assert.equal(lstatSync(f).mode & 0o777, 0o600, `file mode: ${f}`);
    }
  });

  test("no persisted state file contains a home path or a secret value", () => {
    const root = freshRoot("privacy");
    const tid = targetIdOf(TARGET);
    const home = homedir();
    const secret = "sk-ant-supersecret123";
    const w = writeSnapshot(root, HARNESS, tid, PROFILE, {
      WEAVELOG_HOME: join(home, ".agents"),
      WEAVELOG_CONFIG_HOME: join(home, ".config", "opencode"),
      ANTHROPIC_API_KEY: secret,
      MODEL: "claude-sonnet-4",
    });
    const a = writeActiveProfile(root, HARNESS, tid, {
      profileId: PROFILE,
      snapshotSha256: w.ok ? w.value.snapshotSha256 : "a".repeat(64),
      updatedAt: "2026-09-18T00:00:00.000Z",
    });
    assert.equal(w.ok && a.ok, true);
    if (!w.ok || !a.ok) return;
    // the snapshot file carries the redacted inputs; active-profile only the
    // ownership receipt (profileId/hash/updatedAt) — the safe value belongs
    // in the snapshot alone
    const snapshot = snapshotPath(
      root,
      HARNESS,
      tid,
      PROFILE,
      w.value.snapshotSha256,
    );
    for (const file of walk(root).files) {
      const content = readFileSync(file, "utf8");
      assert.ok(!content.includes(home), `home path leaked in ${file}`);
      assert.ok(!content.includes(".agents"), `home subpath leaked in ${file}`);
      assert.ok(!content.includes(".config"), `config path leaked in ${file}`);
      assert.ok(!content.includes(secret), `secret value leaked in ${file}`);
    }
    // redaction is selective: the safe value is still persisted in the snapshot
    assert.ok(
      readFileSync(snapshot, "utf8").includes("claude-sonnet-4"),
      "safe value lost in snapshot",
    );
  });
});
