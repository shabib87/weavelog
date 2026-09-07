import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, test } from "node:test";
import {
  countTrailingFailures,
  detectRiskSignals,
  firstChangedLine,
  matchesProtectedPath,
  PROTECTED_PATH_CLASSES,
  readRetryFailures,
} from "../src/tools/risk-signals.ts";

afterEach(() => {
  // per-test temp dirs are removed inline; nothing global to clean
});

describe("matchesProtectedPath (ADR-004 protected classes)", () => {
  test("matches auth/crypto/secret/persist/permission classes per segment", () => {
    assert.equal(matchesProtectedPath("src/auth/login.ts"), "auth");
    assert.equal(matchesProtectedPath("src/service/Auth.ts"), "auth");
    assert.equal(
      matchesProtectedPath("lib/util/my-crypto-helper.rs"),
      "crypto",
    );
    assert.equal(matchesProtectedPath("config/secrets.json"), "secret");
    assert.equal(matchesProtectedPath("src/persist/store.ts"), "persist");
    assert.equal(matchesProtectedPath("src/permissions/acl.ts"), "permission");
  });

  test("non-protected paths return null", () => {
    assert.equal(matchesProtectedPath("src/util/math.ts"), null);
    assert.equal(matchesProtectedPath("docs/README.md"), null);
    assert.equal(matchesProtectedPath("tests/stack-check.test.ts"), null);
  });

  test("keyword inside a single segment counts (plain path matching)", () => {
    assert.equal(matchesProtectedPath("src/login.auth.helper.ts"), "auth");
    assert.equal(matchesProtectedPath("src/unauthorized.ts"), "auth");
  });

  test("covers exactly the five ADR-004 classes", () => {
    assert.deepEqual([...PROTECTED_PATH_CLASSES].sort(), [
      "auth",
      "crypto",
      "permission",
      "persist",
      "secret",
    ]);
  });
});

describe("firstChangedLine (diff @@ header parse)", () => {
  test("returns the first new-file line from the first hunk", () => {
    const diff = [
      "diff --git a/src/auth/login.ts b/src/auth/login.ts",
      "--- a/src/auth/login.ts",
      "+++ b/src/auth/login.ts",
      "@@ -10,3 +42,4 @@ import x",
      " context",
      "+added",
    ].join("\n");
    assert.equal(firstChangedLine(diff), 42);
  });

  test("returns null when there are no hunks", () => {
    assert.equal(firstChangedLine("diff --git a/x b/x\n"), null);
  });
});

describe("countTrailingFailures (run-ledger retry signal)", () => {
  const ledger = [
    JSON.stringify({ ts: "t1", command: "check", exitCode: 0 }),
    JSON.stringify({ ts: "t2", command: "check", exitCode: 1 }),
    JSON.stringify({ ts: "t3", command: "check", exitCode: 1 }),
    JSON.stringify({ ts: "t4", command: "sync", exitCode: 1 }),
    JSON.stringify({ ts: "t5", command: "check", exitCode: 1 }),
    "not json at all",
    "",
  ].join("\n");

  test("interleaved other-command failures do not break the retry streak", () => {
    assert.equal(countTrailingFailures(ledger, "check"), 3);
  });

  test("stops at the last success", () => {
    const text = [
      JSON.stringify({ command: "check", exitCode: 1 }),
      JSON.stringify({ command: "check", exitCode: 0 }),
      JSON.stringify({ command: "check", exitCode: 1 }),
    ].join("\n");
    assert.equal(countTrailingFailures(text, "check"), 1);
  });

  test("all failures -> full count", () => {
    const text = [
      JSON.stringify({ command: "check", exitCode: 1 }),
      JSON.stringify({ command: "check", exitCode: 2 }),
    ].join("\n");
    assert.equal(countTrailingFailures(text, "check"), 2);
  });

  test("no entries for the command -> 0", () => {
    assert.equal(countTrailingFailures(ledger, "update"), 0);
    assert.equal(countTrailingFailures("", "check"), 0);
  });

  test("self-inflicted gate failures are neutral (TASK-77/78 loop fix)", () => {
    // A failure caused ONLY by the risk-signals gate itself must neither
    // count nor break the streak — otherwise the gate feeds its own input
    // and escalation never clears.
    const text = [
      JSON.stringify({ command: "check", exitCode: 0 }),
      JSON.stringify({
        command: "check",
        exitCode: 1,
        errors: ["risk-signals: L1:protected-path — escalate ..."],
      }),
      JSON.stringify({
        command: "check",
        exitCode: 1,
        errors: ["risk-signals: L1:retry-failures — escalate ..."],
      }),
    ].join("\n");
    assert.equal(countTrailingFailures(text, "check", "risk-signals:"), 0);
  });

  test("mixed failures (gate + real) still count", () => {
    const text = [
      JSON.stringify({ command: "check", exitCode: 0 }),
      JSON.stringify({
        command: "check",
        exitCode: 1,
        errors: ["risk-signals: L1:...", "proxy.health: unhealthy"],
      }),
    ].join("\n");
    assert.equal(countTrailingFailures(text, "check", "risk-signals:"), 1);
  });

  test("without the prefix argument, legacy behavior (all failures count)", () => {
    const text = [
      JSON.stringify({ command: "check", exitCode: 1, errors: ["anything"] }),
      JSON.stringify({
        command: "check",
        exitCode: 1,
        errors: ["risk-signals: x"],
      }),
    ].join("\n");
    assert.equal(countTrailingFailures(text, "check"), 2);
  });
});

describe("readRetryFailures (ledger file access)", () => {
  test("returns null when the ledger file is absent (fail-closed input)", () => {
    const missing = join(tmpdir(), `no-ledger-${Date.now()}.jsonl`);
    assert.equal(readRetryFailures(missing, "check"), null);
  });

  test("reads counts from a real ledger file", () => {
    const dir = mkdtempSync(join(tmpdir(), "ledger-"));
    const path = join(dir, "ledger.jsonl");
    writeFileSync(
      path,
      `${JSON.stringify({ command: "check", exitCode: 0 })}\n${JSON.stringify({ command: "check", exitCode: 1 })}\n`,
    );
    assert.equal(readRetryFailures(path, "check"), 1);
    rmSync(dir, { recursive: true, force: true });
  });
});

describe("detectRiskSignals (L0->L1 escalation decision)", () => {
  const base = { changedFiles: [], failingTests: null, retryFailures: null };

  test("clean input stays L0 with the explicit reason code", () => {
    const r = detectRiskSignals(base);
    assert.equal(r.escalate, false);
    assert.equal(r.level, "L0");
    assert.equal(r.reasonCode, "L0:no-risk-signals");
  });

  test("failing tests fire the failing-tests signal", () => {
    const r = detectRiskSignals({ ...base, failingTests: 3 });
    assert.equal(r.escalate, true);
    assert.equal(r.level, "L1");
    assert.equal(r.reasonCode, "L1:failing-tests");
    assert.equal(r.signals[0]?.detail.includes("3"), true);
  });

  test("protected-path hits carry file:line evidence", () => {
    const r = detectRiskSignals({
      ...base,
      changedFiles: [
        { path: "src/util/math.ts", firstLine: 1 },
        { path: "src/auth/login.ts", firstLine: 42 },
        { path: "config/secrets.json", firstLine: null },
      ],
    });
    assert.equal(r.escalate, true);
    assert.equal(r.reasonCode, "L1:protected-path");
    assert.deepEqual(
      r.signals.map((s) => s.evidence),
      ["src/auth/login.ts:42", "config/secrets.json"],
    );
  });

  test("retry failures fire at the threshold (default 2, ADR: consecutive rework cycles)", () => {
    assert.equal(
      detectRiskSignals({ ...base, retryFailures: 1 }).escalate,
      false,
    );
    const r = detectRiskSignals({ ...base, retryFailures: 2 });
    assert.equal(r.escalate, true);
    assert.equal(r.reasonCode, "L1:retry-failures");
  });

  test("custom threshold is honored", () => {
    const r = detectRiskSignals({
      ...base,
      retryFailures: 2,
      retryFailuresThreshold: 3,
    });
    assert.equal(r.escalate, false);
  });

  test("multiple signals join sorted in the reason code", () => {
    const r = detectRiskSignals({
      changedFiles: [{ path: "src/permissions/x.ts" }],
      failingTests: 1,
      retryFailures: 5,
    });
    assert.equal(
      r.reasonCode,
      "L1:failing-tests+protected-path+retry-failures",
    );
    assert.equal(r.signals.length, 3);
  });

  test("null signal inputs never fire (fail-closed inputs handled upstream)", () => {
    const r = detectRiskSignals({
      changedFiles: [],
      failingTests: null,
      retryFailures: null,
    });
    assert.equal(r.escalate, false);
  });
});
