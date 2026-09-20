import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  checkPackContents,
  packCheckForFile,
  parsePackJson,
} from "../src/tools/pack-check.js";

const GOOD = [
  "package.json",
  "README.md",
  "dist/cli/index.js",
  "dist/cli/index.d.ts",
  "payload/AGENTS.md",
  "payload/skills/as-tdd/SKILL.md",
  "docs/cli.md",
];

describe("checkPackContents", () => {
  test("passes on a tarball with a fresh dist, payload, and no backlog", () => {
    const r = checkPackContents(GOOD);
    assert.equal(r.ok, true);
    assert.deepEqual(r.failures, []);
  });

  test("fails when dist/cli/index.js is absent", () => {
    const r = checkPackContents(GOOD.filter((f) => f !== "dist/cli/index.js"));
    assert.equal(r.ok, false);
    assert.ok(r.failures.some((f) => f.includes("dist/cli/index.js")));
  });

  test("fails when payload is absent", () => {
    const r = checkPackContents(GOOD.filter((f) => !f.startsWith("payload/")));
    assert.equal(r.ok, false);
    assert.ok(r.failures.some((f) => f.includes("payload/")));
  });

  test("fails when any backlog file is present", () => {
    const r = checkPackContents([...GOOD, "backlog/tasks/task-63.md"]);
    assert.equal(r.ok, false);
    assert.ok(r.failures.some((f) => f.includes("backlog/")));
  });

  test("fails on an empty file list", () => {
    const r = checkPackContents([]);
    assert.equal(r.ok, false);
  });
});

describe("parsePackJson", () => {
  test("parses the npm pack --dry-run --json array shape", () => {
    const files = parsePackJson(
      JSON.stringify([
        { files: [{ path: "package.json" }, { path: "dist/cli/index.js" }] },
      ]),
    );
    assert.deepEqual(files, ["package.json", "dist/cli/index.js"]);
  });

  test("throws on malformed JSON", () => {
    assert.throws(() => parsePackJson("{ not json"));
  });
});

describe("packCheckForFile", () => {
  test("fails closed when the manifest file is missing", () => {
    const r = packCheckForFile("/nonexistent/pack.json");
    assert.equal(r.ok, false);
    assert.ok(r.detail.length > 0);
  });
});
