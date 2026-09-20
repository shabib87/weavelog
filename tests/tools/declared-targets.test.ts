import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, test } from "node:test";

import {
  excludedBy,
  expandHome,
  isSymlink,
  normalizeRel,
  readHarnessManifest,
  sha256File,
  sha256Of,
} from "../../src/tools/declared-targets.js";

const created: string[] = [];
afterEach(() => {
  for (const dir of created.splice(0))
    rmSync(dir, { recursive: true, force: true });
});

let n = 0;
function makeDir(prefix: string): string {
  const dir = join(tmpdir(), `declared-targets-${prefix}-${Date.now()}-${n++}`);
  mkdirSync(dir, { recursive: true });
  created.push(dir);
  return dir;
}

describe("declared-targets (normalizeRel)", () => {
  test("normalizes dot segments and returns the clean relative form", () => {
    assert.equal(normalizeRel("/a/b", "c"), "c");
    assert.equal(normalizeRel("/a/b", "./c"), "c");
    assert.equal(normalizeRel("/a/b", "c/../d"), "d");
  });
});

describe("declared-targets (excludedBy)", () => {
  test("returns the first exclusion prefix matching the normalized rel", () => {
    const exclusions = ["secrets/", "node_modules/"];
    assert.equal(excludedBy("secrets/x.json", exclusions), "secrets/");
    assert.equal(
      excludedBy("node_modules/pkg/index.js", exclusions),
      "node_modules/",
    );
  });

  test("returns null when no exclusion prefix matches", () => {
    assert.equal(
      excludedBy("agents/a.md", ["secrets/", "node_modules/"]),
      null,
    );
  });
});

describe("declared-targets (isSymlink)", () => {
  test("reports symlinks via lstat; regular and missing paths are not symlinks", () => {
    const dir = makeDir("symlink");
    const regular = join(dir, "regular.txt");
    const link = join(dir, "link.txt");
    writeFileSync(regular, "x");
    symlinkSync(regular, link);
    assert.equal(isSymlink(link), true);
    assert.equal(isSymlink(regular), false);
    assert.equal(isSymlink(join(dir, "missing.txt")), false);
  });
});

describe("declared-targets (sha256 helpers)", () => {
  test("sha256Of and sha256File produce the standard hex digest", () => {
    const text = "hello world\n";
    const expected = createHash("sha256").update(text).digest("hex");
    assert.equal(sha256Of(Buffer.from(text, "utf8")), expected);
    const dir = makeDir("sha");
    const p = join(dir, "f.txt");
    writeFileSync(p, text);
    assert.equal(sha256File(p), expected);
  });
});

describe("declared-targets (expandHome)", () => {
  test("expands ~ and ~/ to the home directory; leaves plain paths alone", () => {
    const home = homedir();
    assert.equal(expandHome("~"), home);
    assert.equal(expandHome("~/x/y"), join(home, "x", "y"));
    assert.equal(expandHome("/abs/path"), "/abs/path");
  });
});

describe("declared-targets (readHarnessManifest)", () => {
  test("parses a valid strict JSON manifest into the contract shape", () => {
    const dir = makeDir("manifest");
    const p = join(dir, "harness.json");
    writeFileSync(
      p,
      JSON.stringify({
        version: 1,
        harness: "opencode",
        liveRoot: "~/.config/opencode",
        trackedRoot: ".",
        files: {
          "AGENTS.md": "AGENTS.md",
          "opencode.jsonc": "config/opencode.jsonc",
        },
        exclusions: ["secrets/", "node_modules/"],
        pluginsDeferral: true,
      }),
    );
    const m = readHarnessManifest(p);
    assert.equal(m.version, 1);
    assert.equal(m.harness, "opencode");
    assert.equal(m.liveRoot, "~/.config/opencode");
    assert.equal(m.trackedRoot, ".");
    assert.deepEqual(m.files, {
      "AGENTS.md": "AGENTS.md",
      "opencode.jsonc": "config/opencode.jsonc",
    });
    assert.deepEqual(m.exclusions, ["secrets/", "node_modules/"]);
    assert.equal(m.pluginsDeferral, true);
  });
});
