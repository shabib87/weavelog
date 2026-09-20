import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, test } from "node:test";
import { pathToFileURL } from "node:url";

import {
  findPathShadows,
  hashPayloadFiles,
  resolveInstalledPackage,
  stalePayloadFiles,
} from "../../src/tools/install-resolver.js";

const created: string[] = [];
const savedTmpdir = process.env.TMPDIR;
afterEach(() => {
  for (const dir of created.splice(0))
    rmSync(dir, { recursive: true, force: true });
  if (process.env.WEAVELOG_PACKAGE_ROOT !== undefined)
    delete process.env.WEAVELOG_PACKAGE_ROOT;
  if (savedTmpdir !== undefined) process.env.TMPDIR = savedTmpdir;
  else delete process.env.TMPDIR;
});

let n = 0;
function makeDir(prefix: string): string {
  const dir = join(tmpdir(), `install-resolver-${prefix}-${Date.now()}-${n++}`);
  mkdirSync(dir, { recursive: true });
  created.push(dir);
  return dir;
}

function write(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

/** A weavelog package fixture: package.json (name weavelog), payload/, dist/cli/index.js. */
function makePackage(
  dir: string,
  opts: { payloadFiles?: Record<string, string>; withBin?: boolean } = {},
): void {
  write(
    join(dir, "package.json"),
    JSON.stringify(
      {
        name: "weavelog",
        version: "0.1.0",
        bin: { weavelog: "./dist/cli/index.js" },
      },
      null,
      2,
    ),
  );
  for (const [rel, content] of Object.entries(
    opts.payloadFiles ?? { "AGENTS.md": "# payload\n" },
  )) {
    write(join(dir, "payload", rel), content);
  }
  if (opts.withBin !== false)
    write(join(dir, "dist", "cli", "index.js"), "#!/usr/bin/env node\n");
}

function entryHref(dir: string, ...rel: string[]): string {
  return pathToFileURL(join(dir, ...rel)).href;
}

describe("resolveInstalledPackage", () => {
  test("walks up from a nested entry to the nearest weavelog package", () => {
    const pkg = makeDir("pkg");
    makePackage(pkg);
    write(join(pkg, "src", "cli", "index.ts"), "// entry\n");
    const got = resolveInstalledPackage(
      entryHref(pkg, "src", "cli", "index.ts"),
    );
    assert.ok(got);
    assert.equal(got.packageRoot, pkg);
    assert.equal(got.payloadRoot, join(pkg, "payload"));
    assert.equal(got.binPath, join(pkg, "dist", "cli", "index.js"));
  });

  test("returns null when no weavelog package.json is an ancestor", () => {
    // The harness sets TMPDIR inside the worktree (itself a weavelog package),
    // so a fixture there would walk up to the repo's own package.json. Point
    // the fixture at the system temp to exercise the no-package null path.
    delete process.env.TMPDIR;
    const dir = makeDir("nopkg");
    write(join(dir, "script.ts"), "// not a package\n");
    assert.equal(resolveInstalledPackage(entryHref(dir, "script.ts")), null);
  });

  test("returns null when the package has no payload directory", () => {
    const dir = makeDir("nopayload");
    write(
      join(dir, "package.json"),
      JSON.stringify({ name: "weavelog", version: "0.1.0" }),
    );
    write(join(dir, "dist", "cli", "index.js"), "#!/usr/bin/env node\n");
    assert.equal(
      resolveInstalledPackage(entryHref(dir, "dist", "cli", "index.js")),
      null,
    );
  });

  test("skips ancestor package.json files that are not named weavelog", () => {
    const outer = makeDir("outer");
    write(
      join(outer, "package.json"),
      JSON.stringify({ name: "other-tool", version: "1.0.0" }),
    );
    const inner = join(outer, "vendor", "weavelog");
    makePackage(inner);
    const got = resolveInstalledPackage(
      entryHref(inner, "dist", "cli", "index.js"),
    );
    assert.ok(got);
    assert.equal(got.packageRoot, inner);
  });

  test("WEAVELOG_PACKAGE_ROOT seam points at an explicit package", () => {
    const pkg = makeDir("seam");
    makePackage(pkg, { payloadFiles: { "AGENTS.md": "# seam payload\n" } });
    process.env.WEAVELOG_PACKAGE_ROOT = pkg;
    const got = resolveInstalledPackage(
      entryHref(join(makeDir("elsewhere"), "x.ts")),
    );
    assert.ok(got);
    assert.equal(got.packageRoot, pkg);
  });
});

describe("findPathShadows", () => {
  test("returns PATH candidates that resolve to a different package root", () => {
    const running = makeDir("running");
    makePackage(running);
    const other = makeDir("other");
    makePackage(other);
    const binPath = join(running, "dist", "cli", "index.js");
    const shadowBin = join(other, "bin");
    mkdirSync(shadowBin, { recursive: true });
    write(join(shadowBin, "weavelog"), "#!/usr/bin/env node\n");
    const shadows = findPathShadows(binPath, `${shadowBin}:/usr/bin:/bin`);
    assert.deepEqual(shadows, [join(shadowBin, "weavelog")]);
  });

  test("detects an npm-style symlinked bin as a shadow", () => {
    const running = makeDir("running");
    makePackage(running);
    const other = makeDir("other");
    makePackage(other);
    const binPath = join(running, "dist", "cli", "index.js");
    const linkBin = join(other, "linked-bin");
    mkdirSync(linkBin, { recursive: true });
    symlinkSync(
      join(other, "dist", "cli", "index.js"),
      join(linkBin, "weavelog"),
    );
    const shadows = findPathShadows(binPath, linkBin);
    assert.deepEqual(shadows, [join(linkBin, "weavelog")]);
  });

  test("does not report the running bin reached through another name in the same package", () => {
    const pkg = makeDir("same");
    makePackage(pkg);
    const binPath = join(pkg, "dist", "cli", "index.js");
    const linkBin = join(pkg, "bin");
    mkdirSync(linkBin, { recursive: true });
    symlinkSync(
      join(pkg, "dist", "cli", "index.js"),
      join(linkBin, "weavelog"),
    );
    assert.deepEqual(findPathShadows(binPath, linkBin), []);
  });

  test("reports a stray weavelog script without a package context as a shadow", () => {
    const running = makeDir("running");
    makePackage(running);
    const binPath = join(running, "dist", "cli", "index.js");
    const stray = makeDir("stray");
    write(join(stray, "weavelog"), "#!/usr/bin/env node\n");
    assert.deepEqual(findPathShadows(binPath, stray), [
      join(stray, "weavelog"),
    ]);
  });

  test("skips PATH dirs without a weavelog executable and dedupes repeated dirs", () => {
    const running = makeDir("running");
    makePackage(running);
    const other = makeDir("other");
    makePackage(other);
    const binPath = join(running, "dist", "cli", "index.js");
    const shadowBin = join(other, "bin");
    mkdirSync(shadowBin, { recursive: true });
    write(join(shadowBin, "weavelog"), "#!/usr/bin/env node\n");
    const empty = join(makeDir("empty"), "nope");
    mkdirSync(empty, { recursive: true });
    const shadows = findPathShadows(
      binPath,
      `${shadowBin}:${empty}:${shadowBin}`,
    );
    assert.deepEqual(shadows, [join(shadowBin, "weavelog")]);
  });

  test("returns [] when the running bin has no package context", () => {
    const dir = makeDir("nopkg");
    const binPath = join(dir, "dist", "cli", "index.js");
    write(binPath, "#!/usr/bin/env node\n");
    assert.deepEqual(findPathShadows(binPath, dir), []);
  });
});

describe("stalePayloadFiles", () => {
  test("returns [] when installed and repo hashes agree", () => {
    assert.deepEqual(
      stalePayloadFiles({ "AGENTS.md": "a" }, { "AGENTS.md": "a" }),
      [],
    );
  });

  test("returns repo rels whose installed hash differs or is missing", () => {
    assert.deepEqual(
      stalePayloadFiles(
        { "AGENTS.md": "a", "config/x.json": "same" },
        {
          "AGENTS.md": "b",
          "config/x.json": "same",
          "skills/s/SKILL.md": "c",
        },
      ),
      ["AGENTS.md", "skills/s/SKILL.md"],
    );
  });
});

describe("hashPayloadFiles", () => {
  test("hashes regular files by relative path, skipping symlinks and .DS_Store", () => {
    const dir = makeDir("hash");
    write(join(dir, "AGENTS.md"), "hello\n");
    write(join(dir, "config", "opencode.jsonc"), "{}\n");
    write(join(dir, ".DS_Store"), "junk");
    write(join(dir, "skills", "s", "SKILL.md"), "meta\n");
    const target = join(makeDir("hash-outside"), "outside.txt");
    write(target, "outside\n");
    symlinkSync(target, join(dir, "linked.txt"));
    const hashes = hashPayloadFiles(dir);
    assert.deepEqual(Object.keys(hashes).sort(), [
      "AGENTS.md",
      "config/opencode.jsonc",
      "skills/s/SKILL.md",
    ]);
    assert.equal(
      hashes["AGENTS.md"],
      createHash("sha256").update("hello\n").digest("hex"),
    );
  });

  test("returns an empty map for a missing payload root", () => {
    const dir = makeDir("missing");
    assert.deepEqual(hashPayloadFiles(join(dir, "nope")), {});
  });
});
