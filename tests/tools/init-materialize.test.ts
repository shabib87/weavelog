import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  decideTargetAction,
  type TargetPreflightState,
} from "../../src/tools/init-materialize.js";

const OPTS = {
  force: false,
  eligibleForForce: true,
  runId: "unit-run",
  targetId: "a".repeat(64),
};

function decide(
  state: Partial<TargetPreflightState>,
  opts: Partial<typeof OPTS> = {},
) {
  const base: TargetPreflightState = {
    exists: true,
    isSymlink: false,
    isFile: true,
    hash: "live-hash",
    owned: true,
    ownershipAmbiguous: false,
    recordedHash: "recorded-hash",
    interrupted: false,
    interruptNote: null,
  };
  return decideTargetAction({ ...base, ...state }, { ...OPTS, ...opts });
}

describe("decideTargetAction (edge branches pinned by review)", () => {
  test("interrupted + absent target refuses instead of creating (interrupted checked FIRST)", () => {
    const d = decide({
      exists: false,
      hash: null,
      interrupted: true,
      interruptNote: "ledger.jsonl (intent at t), backup r/x.bak",
    });
    assert.equal(d.action, "refuse");
    assert.match((d as { reason: string }).reason, /interrupted replacement/);
  });

  test("interrupted + --force refuses (interrupted beats force)", () => {
    const d = decide({ interrupted: true, hash: "changed" }, { force: true });
    assert.equal(d.action, "refuse");
    assert.match((d as { reason: string }).reason, /interrupted replacement/);
  });

  test("ambiguous ownership receipt refuses", () => {
    const d = decide({ ownershipAmbiguous: true });
    assert.equal(d.action, "refuse");
    assert.match((d as { reason: string }).reason, /ownership state ambiguous/);
  });

  test("absent + no dangling intent creates (create only after interrupted is cleared)", () => {
    const d = decide({ exists: false, hash: null });
    assert.deepEqual(d, { action: "create" });
  });
});
