import assert from "node:assert/strict";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, test } from "node:test";

import {
  defaultProfilesDir,
  profilePath,
  readProfile,
  resolveInputs,
  tokensFromProfile,
  validateProfile,
  validateProfileId,
  writeProfile,
} from "../../src/tools/profiles.js";

const created: string[] = [];
const savedProfilesDir = process.env.WEAVELOG_PROFILES_DIR;
afterEach(() => {
  for (const dir of created.splice(0))
    rmSync(dir, { recursive: true, force: true });
  if (savedProfilesDir !== undefined)
    process.env.WEAVELOG_PROFILES_DIR = savedProfilesDir;
  else delete process.env.WEAVELOG_PROFILES_DIR;
});

let n = 0;
function makeDir(prefix: string): string {
  const dir = join(tmpdir(), `profiles-${prefix}-${Date.now()}-${n++}`);
  mkdirSync(dir, { recursive: true });
  created.push(dir);
  return dir;
}

function fixtureProfile(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id: "personal",
    choices: { model: "claude-sonnet-4" },
    secretRefs: { ANTHROPIC_API_KEY: "env:ANTHROPIC_API_KEY" },
    ...overrides,
  };
}

describe("profiles (validateProfileId)", () => {
  test("accepts lowercase path-safe ids", () => {
    assert.equal(validateProfileId("a"), null);
    assert.equal(validateProfileId("a1"), null);
    assert.equal(validateProfileId("a-b-c"), null);
    assert.equal(validateProfileId("alpha-1"), null);
  });

  test("rejects empty, uppercase, dotted, underscored, and path ids", () => {
    assert.ok(validateProfileId("") !== null);
    assert.ok(validateProfileId("A") !== null);
    assert.ok(validateProfileId("a_b") !== null);
    assert.ok(validateProfileId("a/b") !== null);
    assert.ok(validateProfileId("a.b") !== null);
    assert.ok(validateProfileId("-a") !== null);
    assert.ok(validateProfileId("a b") !== null);
  });
});

describe("profiles (validateProfile)", () => {
  test("accepts the canonical profile shape and defaults missing maps", () => {
    const ok = validateProfile(fixtureProfile());
    assert.equal(ok.ok, true);
    if (!ok.ok) return;
    assert.deepEqual(ok.profile, {
      id: "personal",
      choices: { model: "claude-sonnet-4" },
      secretRefs: { ANTHROPIC_API_KEY: "env:ANTHROPIC_API_KEY" },
    });
    const minimal = validateProfile({ id: "minimal" });
    assert.equal(minimal.ok, true);
    if (!minimal.ok) return;
    assert.deepEqual(minimal.profile.choices, {});
    assert.deepEqual(minimal.profile.secretRefs, {});
  });

  test("rejects non-string map entries in choices and secretRefs", () => {
    const badChoices = validateProfile(
      fixtureProfile({ choices: { model: 7 } }),
    );
    const badRefs = validateProfile(
      fixtureProfile({ secretRefs: { ANTHROPIC_API_KEY: ["env:X"] } }),
    );
    assert.equal(badChoices.ok, false);
    assert.equal(badRefs.ok, false);
  });

  test("rejects a secret-looking value assigned under a secret-pattern key", () => {
    const assigned = validateProfile(
      fixtureProfile({
        choices: { apiKey: "sk-ant-assigned-secret" },
        secretRefs: {},
      }),
    );
    assert.equal(assigned.ok, false);
    const assignedToken = validateProfile(
      fixtureProfile({ choices: { GITHUB_TOKEN: "ghp_abc" }, secretRefs: {} }),
    );
    assert.equal(assignedToken.ok, false);
    const assignedPass = validateProfile(
      fixtureProfile({ choices: { password: "hunter2" }, secretRefs: {} }),
    );
    assert.equal(assignedPass.ok, false);
  });

  test("allows a reference value under a secret-pattern choice key", () => {
    const ok = validateProfile(
      fixtureProfile({
        choices: { apiKey: "env:ANTHROPIC_API_KEY" },
        secretRefs: {},
      }),
    );
    assert.equal(ok.ok, true);
  });

  test("requires secretRefs values to be references, never stored values", () => {
    const stored = validateProfile(
      fixtureProfile({ secretRefs: { ANTHROPIC_API_KEY: "sk-ant-stored" } }),
    );
    assert.equal(stored.ok, false);
    const notReference = validateProfile(
      fixtureProfile({ secretRefs: { ANTHROPIC_API_KEY: "just-a-string" } }),
    );
    assert.equal(notReference.ok, false);
  });

  test("tolerates an optional updatedAt timestamp", () => {
    const ok = validateProfile(
      fixtureProfile({ updatedAt: "2026-09-18T00:00:00.000Z" }),
    );
    assert.equal(ok.ok, true);
  });
});

describe("profiles (readProfile / writeProfile)", () => {
  test("roundtrips a profile through the profiles dir", () => {
    const dir = makeDir("roundtrip");
    const profile = {
      id: "personal",
      choices: { model: "claude-sonnet-4" },
      secretRefs: { ANTHROPIC_API_KEY: "env:ANTHROPIC_API_KEY" },
    };
    const w = writeProfile(dir, profile);
    assert.equal(w.ok, true);
    if (!w.ok) return;
    assert.equal(w.value.path, profilePath(dir, "personal"));
    const r = readProfile(dir, "personal");
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.deepEqual(r.value, profile);
  });

  test("readProfile returns null for a missing profile", () => {
    const dir = makeDir("missing");
    const r = readProfile(dir, "nope");
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.value, null);
  });

  test("readProfile surfaces corrupt JSON as a typed error, not a throw", () => {
    const dir = makeDir("corrupt");
    const p = profilePath(dir, "personal");
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, "{ not json");
    const r = readProfile(dir, "personal");
    assert.equal(r.ok, false);
    if (r.ok) return;
    assert.equal(r.error.code, "invalid");
  });

  test("readProfile rejects a profile whose id does not match the file name", () => {
    const dir = makeDir("id-mismatch");
    const p = profilePath(dir, "other");
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(
      p,
      JSON.stringify({
        id: "personal",
        choices: {},
        secretRefs: {},
      }),
    );
    const r = readProfile(dir, "other");
    assert.equal(r.ok, false);
    if (r.ok) return;
    assert.equal(r.error.code, "invalid");
  });

  test("writeProfile refuses an invalid profile without writing", () => {
    const dir = makeDir("invalid-write");
    const w = writeProfile(dir, {
      id: "Bad_ID",
      choices: { apiKey: "sk-assigned" },
      secretRefs: {},
    });
    assert.equal(w.ok, false);
    assert.equal(existsSync(profilePath(dir, "Bad_ID")), false);
  });

  test("refuses to read or write through a symlinked profile file", () => {
    const dir = makeDir("symlink");
    const outside = join(makeDir("outside"), "personal.json");
    writeFileSync(outside, "{}");
    const p = profilePath(dir, "personal");
    mkdirSync(dirname(p), { recursive: true });
    symlinkSync(outside, p);
    const r = readProfile(dir, "personal");
    assert.equal(r.ok, false);
    if (r.ok) return;
    assert.equal(r.error.code, "symlink-refusal");
    const w = writeProfile(dir, {
      id: "personal",
      choices: {},
      secretRefs: {},
    });
    assert.equal(w.ok, false);
  });

  test("writes the profile file with mode 0600", () => {
    const dir = makeDir("mode");
    const w = writeProfile(dir, fixtureProfile());
    assert.equal(w.ok, true);
    if (!w.ok) return;
    assert.equal(lstatSync(w.value.path).mode & 0o777, 0o600);
  });
});

describe("profiles (defaultProfilesDir)", () => {
  test("uses the WEAVELOG_PROFILES_DIR seam when set", () => {
    const dir = makeDir("seam");
    process.env.WEAVELOG_PROFILES_DIR = dir;
    assert.equal(defaultProfilesDir(), dir);
  });

  test("falls back to ~/.config/weavelog/profiles", () => {
    delete process.env.WEAVELOG_PROFILES_DIR;
    assert.equal(
      defaultProfilesDir(),
      join(homedir(), ".config", "weavelog", "profiles"),
    );
  });
});

describe("profiles (resolveInputs)", () => {
  const defaults = { model: "default-model", port: "11434" };
  const profile = {
    id: "personal",
    choices: { model: "claude-sonnet-4" },
    secretRefs: { ANTHROPIC_API_KEY: "env:ANTHROPIC_API_KEY" },
  };

  test("applies the full precedence: flags > answers > profile > defaults", () => {
    const r = resolveInputs({
      flags: { model: "opus" },
      answers: { model: "sonnet" },
      profile,
      defaults,
    });
    assert.equal(r.values.model, "opus");
    assert.equal(r.values.port, "11434");
  });

  test("each higher tier wins only on keys it provides", () => {
    const r = resolveInputs({
      flags: { port: "8080" },
      answers: { model: "sonnet" },
      profile,
      defaults,
    });
    assert.equal(r.values.model, "sonnet");
    assert.equal(r.values.port, "8080");
  });

  test("empty tiers yield defaults only", () => {
    const r = resolveInputs({
      flags: {},
      answers: {},
      profile: { id: "p", choices: {}, secretRefs: {} },
      defaults,
    });
    assert.deepEqual(r.values, defaults);
    assert.deepEqual(r.secretRefs, {});
  });

  test("returns secret references, never resolved values, and excludes their keys from values", () => {
    const r = resolveInputs({
      flags: { ANTHROPIC_API_KEY: "sk-flag-secret" },
      answers: {},
      profile,
      defaults,
    });
    assert.equal(Object.hasOwn(r.values, "ANTHROPIC_API_KEY"), false);
    assert.deepEqual(r.secretRefs, {
      ANTHROPIC_API_KEY: "env:ANTHROPIC_API_KEY",
    });
    const joined = JSON.stringify(r);
    assert.ok(!joined.includes("sk-flag-secret"));
  });
});

describe("profiles (tokensFromProfile)", () => {
  test("returns {{TOKEN}} candidates as uppercase-underscore of choice keys", () => {
    const tokens = tokensFromProfile({
      id: "personal",
      choices: { model: "claude", "anthropic-model": "opus", "a.b c": "x" },
      secretRefs: {},
    });
    assert.deepEqual(tokens, {
      MODEL: "claude",
      ANTHROPIC_MODEL: "opus",
      A_B_C: "x",
    });
  });
});
