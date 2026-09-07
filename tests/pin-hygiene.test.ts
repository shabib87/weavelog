import assert from "node:assert/strict";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, test } from "node:test";
import {
  checkDifitPointer,
  checkPinHygiene,
  isExactVersion,
  pinHygieneForDir,
} from "../src/tools/pin-hygiene.js";

const created: string[] = [];
afterEach(() => {
  for (const dir of created.splice(0))
    rmSync(dir, { recursive: true, force: true });
});

let n = 0;
function makeDir(prefix: string): string {
  const dir = join(tmpdir(), `pin-hygiene-${prefix}-${Date.now()}-${n++}`);
  mkdirSync(dir, { recursive: true });
  created.push(dir);
  return dir;
}

function write(path: string, content: string): void {
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, content);
}

describe("isExactVersion", () => {
  test("accepts full semver including prerelease and build metadata", () => {
    assert.equal(isExactVersion("2.5.5"), true);
    assert.equal(isExactVersion("22.20.1"), true);
    assert.equal(isExactVersion("1.2.3-beta.1"), true);
    assert.equal(isExactVersion("1.2.3+build.7"), true);
  });

  test("rejects ranges, wildcards, and shorthand", () => {
    assert.equal(isExactVersion("^2.5.5"), false);
    assert.equal(isExactVersion("~4.23.1"), false);
    assert.equal(isExactVersion("*"), false);
    assert.equal(isExactVersion(">=20"), false);
    assert.equal(isExactVersion("next"), false);
    assert.equal(isExactVersion(""), false);
  });
});

describe("checkPinHygiene", () => {
  test("passes on exact pins with a lockfile", () => {
    const r = checkPinHygiene(
      {
        dependencies: { yaml: "2.9.0" },
        devDependencies: { typescript: "5.9.3" },
      },
      true,
    );
    assert.equal(r.status, "pass");
    assert.deepEqual(r.offenders, []);
  });

  test("fails naming every offending dep with its section and spec", () => {
    const r = checkPinHygiene(
      {
        dependencies: { yaml: "^2.9.0" },
        devDependencies: { tsx: "~4.23.1", typescript: "5.9.3" },
      },
      true,
    );
    assert.equal(r.status, "fail");
    assert.deepEqual(
      r.offenders.map((o) => `${o.name}@${o.spec} (${o.section})`).sort(),
      ["tsx@~4.23.1 (devDependencies)", "yaml@^2.9.0 (dependencies)"],
    );
    assert.ok(r.detail.includes("yaml@^2.9.0"));
    assert.ok(r.detail.includes("tsx@~4.23.1"));
  });

  test("fails on a missing lockfile even with exact pins", () => {
    const r = checkPinHygiene({ dependencies: { yaml: "2.9.0" } }, false);
    assert.equal(r.status, "fail");
    assert.deepEqual(r.offenders, []);
    assert.ok(r.detail.includes("package-lock.json missing"));
  });

  test("skips when there is no package.json", () => {
    const r = checkPinHygiene(null, false);
    assert.equal(r.status, "skip");
  });

  test("treats missing sections as clean", () => {
    const r = checkPinHygiene({}, true);
    assert.equal(r.status, "pass");
  });

  test("scans optionalDependencies too", () => {
    const r = checkPinHygiene(
      { optionalDependencies: { fsevents: "^2.3.3" } },
      true,
    );
    assert.equal(r.status, "fail");
    assert.ok(r.detail.includes("fsevents@^2.3.3 (optionalDependencies)"));
  });

  test("fails closed on non-string specs instead of throwing", () => {
    const r = checkPinHygiene(
      { dependencies: { broken: 123 } as unknown as Record<string, string> },
      true,
    );
    assert.equal(r.status, "fail");
    assert.ok(r.detail.includes("broken@123 (dependencies)"));
  });
});

describe("pinHygieneForDir", () => {
  test("skips a foreign repo (no weavelog.json) when requireManifest is true", () => {
    const dir = makeDir("foreign");
    write(
      join(dir, "package.json"),
      JSON.stringify({ dependencies: { left_pad: "^1.0.0" } }),
    );
    const r = pinHygieneForDir(dir, true);
    assert.equal(r.status, "skip");
    assert.ok(r.detail.includes("not a weavelog-managed repo"));
  });

  test("enforces on a managed repo and names the offender", () => {
    const dir = makeDir("managed");
    write(join(dir, "weavelog.json"), JSON.stringify({ tools: {} }));
    write(
      join(dir, "package.json"),
      JSON.stringify({ devDependencies: { "@biomejs/biome": "^2.5.5" } }),
    );
    write(join(dir, "package-lock.json"), "{}");
    const r = pinHygieneForDir(dir, true);
    assert.equal(r.status, "fail");
    assert.ok(r.detail.includes("@biomejs/biome@^2.5.5"));
  });

  test("passes on a managed repo with exact pins and a lockfile", () => {
    const dir = makeDir("managed-clean");
    write(join(dir, "weavelog.json"), JSON.stringify({ tools: {} }));
    write(
      join(dir, "package.json"),
      JSON.stringify({ dependencies: { yaml: "2.9.0" } }),
    );
    write(join(dir, "package-lock.json"), "{}");
    const r = pinHygieneForDir(dir, true);
    assert.equal(r.status, "pass");
  });

  test("fails on an unparseable package.json in a managed repo", () => {
    const dir = makeDir("managed-broken");
    write(join(dir, "weavelog.json"), JSON.stringify({ tools: {} }));
    write(join(dir, "package.json"), "{ not json");
    const r = pinHygieneForDir(dir, true);
    assert.equal(r.status, "fail");
    assert.ok(r.detail.includes("unparseable"));
  });
});

describe("checkDifitPointer", () => {
  test("passes when the doc invokes the pinned version", () => {
    const r = checkDifitPointer(
      "5.0.12",
      "run `npx difit@5.0.12 --background` for the server",
    );
    assert.equal(r.ok, true);
  });

  test("fails on a bare unpinned invocation", () => {
    const r = checkDifitPointer("5.0.12", "run `npx difit --background`");
    assert.equal(r.ok, false);
    assert.ok(r.detail.includes("npx difit@5.0.12"));
    assert.ok(r.detail.includes("npx difit"));
  });

  test("fails on a wrong pinned version", () => {
    const r = checkDifitPointer("5.0.12", "run `npx difit@4.0.0 --background`");
    assert.equal(r.ok, false);
    assert.ok(r.detail.includes("npx difit@4.0.0"));
  });

  test("does not false-pass on a version prefix collision", () => {
    const r = checkDifitPointer(
      "5.0.12",
      "run `npx difit@5.0.123 --background`",
    );
    assert.equal(r.ok, false);
    assert.ok(r.detail.includes("npx difit@5.0.123"));
  });

  test("accepts the pin at end-of-string or before a quote", () => {
    assert.equal(checkDifitPointer("5.0.12", "run npx difit@5.0.12").ok, true);
    assert.equal(
      checkDifitPointer("5.0.12", "run `npx difit@5.0.12` --background").ok,
      true,
    );
  });

  test("fails on a missing doc", () => {
    const r = checkDifitPointer("5.0.12", null);
    assert.equal(r.ok, false);
    assert.ok(r.detail.includes("missing"));
  });

  test("fails on an empty pinned version", () => {
    const r = checkDifitPointer("", "anything");
    assert.equal(r.ok, false);
    assert.ok(r.detail.includes("empty"));
  });
});
