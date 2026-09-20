import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

const WORKFLOWS_DIR = fileURLToPath(
  new URL("../.github/workflows/", import.meta.url),
);

function readWorkflow(name: string): string {
  return readFileSync(join(WORKFLOWS_DIR, name), "utf8");
}

function workflowFiles(): string[] {
  return readdirSync(WORKFLOWS_DIR).filter((f) => f.endsWith(".yml"));
}

const SHA = /^[0-9a-f]{40}$/;

function usesEntries(text: string): Array<{ ref: string; line: string }> {
  const out: Array<{ ref: string; line: string }> = [];
  for (const line of text.split("\n")) {
    const m = line.match(/uses:\s*([^\s#]+)/);
    if (!m) continue;
    const spec = m[1];
    if (spec.startsWith("./")) continue;
    const at = spec.lastIndexOf("@");
    out.push({ ref: at >= 0 ? spec.slice(at + 1) : "", line: line.trim() });
  }
  return out;
}

describe("workflow supply-chain hardening", () => {
  test("every third-party action is pinned to a full commit SHA with a version comment", () => {
    const offenders: string[] = [];
    for (const file of workflowFiles()) {
      for (const { ref, line } of usesEntries(readWorkflow(file))) {
        if (!SHA.test(ref) || !/#\s*v?\d/.test(line)) {
          offenders.push(`${file}: ${line}`);
        }
      }
    }
    assert.deepEqual(offenders, []);
  });

  test("no workflow references pipx", () => {
    for (const file of workflowFiles()) {
      assert.equal(
        readWorkflow(file).includes("pipx"),
        false,
        `${file} references pipx`,
      );
    }
  });
});

describe("ci.yml", () => {
  test("runs on push, pull_request, and a scheduled cadence", () => {
    const doc = parse(readWorkflow("ci.yml")) as {
      on?: Record<string, unknown>;
    };
    const triggers = doc.on ?? {};
    assert.ok(triggers.push, "missing push trigger");
    assert.ok(triggers.pull_request, "missing pull_request trigger");
    assert.ok(triggers.schedule, "missing schedule trigger");
    assert.match(readWorkflow("ci.yml"), /cron:/);
  });

  test("uses least-privilege top-level permissions", () => {
    const doc = parse(readWorkflow("ci.yml")) as {
      permissions?: Record<string, string>;
    };
    assert.equal(doc.permissions?.contents, "read");
    assert.equal(JSON.stringify(doc.permissions).includes("write-all"), false);
  });

  test("checkout does not persist credentials", () => {
    assert.match(readWorkflow("ci.yml"), /persist-credentials:\s*false/);
  });

  test("runs the reproducible install", () => {
    assert.match(readWorkflow("ci.yml"), /npm ci/);
  });

  test("semgrep is uv-installed at an exact version with metrics off and error mode", () => {
    const text = readWorkflow("ci.yml");
    assert.match(text, /setup-uv@[0-9a-f]{40}/);
    assert.match(text, /semgrep==\d+\.\d+\.\d+/);
    assert.match(text, /--metrics=off/);
    assert.match(text, /--error/);
    assert.doesNotMatch(text, /pipx/);
  });

  test("pins the semgrep ruleset to a full commit SHA", () => {
    const text = readWorkflow("ci.yml");
    assert.match(text, /semgrep-rules/);
    assert.match(text, /semgrep-rules[\s\S]{0,200}[0-9a-f]{40}/);
  });

  test("runs the audit gate and the pack check", () => {
    const text = readWorkflow("ci.yml");
    assert.match(text, /audit-gate/);
    assert.match(text, /pack-check/);
  });
});

describe("publish.yml", () => {
  test("gates publishing behind the npm-publish environment", () => {
    const doc = parse(readWorkflow("publish.yml")) as {
      jobs?: Record<string, { environment?: unknown }>;
    };
    const text = readWorkflow("publish.yml");
    const envs = Object.values(doc.jobs ?? {}).map((j) => j.environment);
    assert.ok(
      envs.some((e) =>
        typeof e === "string"
          ? e === "npm-publish"
          : JSON.stringify(e).includes("npm-publish"),
      ),
      "no job uses the npm-publish environment",
    );
    assert.match(text, /npm-publish/);
  });

  test("uses OIDC id-token:write and least-privilege contents:read", () => {
    const doc = parse(readWorkflow("publish.yml")) as {
      permissions?: Record<string, string>;
    };
    assert.equal(doc.permissions?.["id-token"], "write");
    assert.equal(doc.permissions?.contents, "read");
  });

  test("runs the publish gate and publishes with provenance", () => {
    const text = readWorkflow("publish.yml");
    assert.match(text, /publish-gate/);
    assert.match(text, /npm publish/);
    assert.match(text, /--provenance/);
  });

  test("checkout does not persist credentials", () => {
    assert.match(readWorkflow("publish.yml"), /persist-credentials:\s*false/);
  });

  test("runs a provenance-capable npm", () => {
    const m = readWorkflow("publish.yml").match(/npm@(\d+)\.(\d+)\.(\d+)/);
    assert.ok(m, "publish.yml must pin an npm version");
    const major = Number(m[1]);
    const minor = Number(m[2]);
    assert.ok(
      major > 11 || (major === 11 && minor >= 5),
      "npm must support trusted publishing (>=11.5.1)",
    );
  });
});

describe("package metadata", () => {
  test("pins the package manager that produced the lockfile", () => {
    const pkg = JSON.parse(
      readFileSync(
        fileURLToPath(new URL("../package.json", import.meta.url)),
        "utf8",
      ),
    ) as { packageManager?: string; scripts?: Record<string, string> };
    assert.match(pkg.packageManager ?? "", /^npm@\d+\.\d+\.\d+$/);
    assert.match(pkg.scripts?.prepack ?? "", /build/);
  });
});

describe("release-please.yml", () => {
  test("prepares releases without creating a tag and gates the github release", () => {
    const text = readWorkflow("release-please.yml");
    assert.match(text, /skip-github-release:\s*true/);
    assert.match(text, /skip-github-pull-request:\s*true/);
    assert.match(text, /publish-gate/);
    assert.match(text, /gh workflow run publish\.yml/);
  });
});
