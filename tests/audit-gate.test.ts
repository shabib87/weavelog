import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test } from "node:test";
import {
  auditGateForFiles,
  evaluateAuditGate,
  parseAuditReport,
  parseExceptions,
} from "../src/tools/audit-gate.js";

const NOW = new Date("2026-09-20T00:00:00Z");

function report(vulns: Array<{ name: string; severity: string }>): unknown {
  return {
    vulnerabilities: Object.fromEntries(
      vulns.map((v) => [v.name, { name: v.name, severity: v.severity }]),
    ),
  };
}

describe("evaluateAuditGate", () => {
  test("passes on an empty report", () => {
    const r = evaluateAuditGate(report([]), [], NOW);
    assert.equal(r.ok, true);
    assert.equal(r.examined, 0);
    assert.deepEqual(r.failures, []);
  });

  test("fails closed on an untriaged high production advisory", () => {
    const r = evaluateAuditGate(
      report([{ name: "foo", severity: "high" }]),
      [],
      NOW,
    );
    assert.equal(r.ok, false);
    assert.equal(r.failures.length, 1);
    assert.equal(r.failures[0].package, "foo");
    assert.equal(r.failures[0].reason, "untriaged");
  });

  test("fails closed on an untriaged critical production advisory", () => {
    const r = evaluateAuditGate(
      report([{ name: "bar", severity: "critical" }]),
      [],
      NOW,
    );
    assert.equal(r.ok, false);
    assert.equal(r.failures[0].reason, "untriaged");
  });

  test("ignores moderate and low advisories", () => {
    const r = evaluateAuditGate(
      report([
        { name: "a", severity: "moderate" },
        { name: "b", severity: "low" },
        { name: "c", severity: "info" },
      ]),
      [],
      NOW,
    );
    assert.equal(r.ok, true);
    assert.equal(r.examined, 0);
  });

  test("accepts a high advisory with a valid unexpired exception", () => {
    const r = evaluateAuditGate(
      report([{ name: "foo", severity: "high" }]),
      [
        {
          package: "foo",
          rationale: "no fix upstream yet",
          expires: "2026-12-31",
        },
      ],
      NOW,
    );
    assert.equal(r.ok, true);
    assert.deepEqual(r.covered, ["foo"]);
  });

  test("rejects an exception with no rationale", () => {
    const r = evaluateAuditGate(
      report([{ name: "foo", severity: "high" }]),
      [{ package: "foo", rationale: "  ", expires: "2026-12-31" }],
      NOW,
    );
    assert.equal(r.ok, false);
    assert.equal(r.failures[0].reason, "missing-rationale");
  });

  test("rejects an exception with a malformed expiry", () => {
    const r = evaluateAuditGate(
      report([{ name: "foo", severity: "high" }]),
      [{ package: "foo", rationale: "reason", expires: "soon" }],
      NOW,
    );
    assert.equal(r.ok, false);
    assert.equal(r.failures[0].reason, "invalid-expiry");
  });

  test("rejects an exception that has expired", () => {
    const r = evaluateAuditGate(
      report([{ name: "foo", severity: "high" }]),
      [{ package: "foo", rationale: "reason", expires: "2026-09-19" }],
      NOW,
    );
    assert.equal(r.ok, false);
    assert.equal(r.failures[0].reason, "expired");
  });

  test("treats expiring today as expired", () => {
    const r = evaluateAuditGate(
      report([{ name: "foo", severity: "high" }]),
      [{ package: "foo", rationale: "reason", expires: "2026-09-20" }],
      NOW,
    );
    assert.equal(r.ok, false);
    assert.equal(r.failures[0].reason, "expired");
  });

  test("matches exceptions case-insensitively by package name", () => {
    const r = evaluateAuditGate(
      report([{ name: "Foo", severity: "high" }]),
      [{ package: "foo", rationale: "reason", expires: "2026-12-31" }],
      NOW,
    );
    assert.equal(r.ok, true);
  });
});

describe("parseAuditReport", () => {
  test("parses a valid report", () => {
    const parsed = parseAuditReport(
      JSON.stringify({
        vulnerabilities: { foo: { name: "foo", severity: "high" } },
      }),
    );
    assert.equal(parsed.vulnerabilities?.foo.severity, "high");
  });

  test("throws on malformed JSON", () => {
    assert.throws(() => parseAuditReport("{ not json"));
  });

  test("throws on an npm audit error envelope (fail closed)", () => {
    assert.throws(() =>
      parseAuditReport(
        JSON.stringify({
          message: "registry unreachable",
          error: { code: "ENETUNREACH" },
        }),
      ),
    );
  });

  test("throws when the vulnerabilities key is missing (fail closed)", () => {
    assert.throws(() => parseAuditReport(JSON.stringify({ metadata: {} })));
  });
});

describe("parseExceptions", () => {
  test("parses an array of exceptions", () => {
    const parsed = parseExceptions(
      JSON.stringify([
        { package: "foo", rationale: "r", expires: "2026-12-31" },
      ]),
    );
    assert.equal(parsed.length, 1);
  });

  test("throws on malformed JSON", () => {
    assert.throws(() => parseExceptions("nope"));
  });
});

describe("auditGateForFiles", () => {
  test("fails closed when the report file is missing or malformed", () => {
    const r = auditGateForFiles(
      "/nonexistent/audit.json",
      "/nonexistent/exceptions.json",
      NOW,
    );
    assert.equal(r.ok, false);
    assert.ok(r.detail.length > 0);
  });

  test("fails closed when npm audit returned an error envelope", () => {
    const dir = mkdtempSync(join(tmpdir(), "audit-gate-"));
    const reportPath = join(dir, "audit.json");
    writeFileSync(
      reportPath,
      JSON.stringify({
        message: "registry unreachable",
        error: { code: "ENETUNREACH" },
      }),
    );
    const r = auditGateForFiles(reportPath, join(dir, "exceptions.json"), NOW);
    assert.equal(r.ok, false);
    assert.ok(r.detail.includes("cannot read report"));
  });
});
