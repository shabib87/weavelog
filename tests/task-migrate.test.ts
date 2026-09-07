import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { planMigration, type TaskPlan } from "../src/tools/task-migrate.ts";

const BIN = fileURLToPath(
  new URL("../src/tools/task-migrate.ts", import.meta.url),
);

let root: string;
let tasksDir: string;
let callsLog: string;
let fakeBin: string;

// Fake backlog CLI: logs every call line to the calls log (mirrors the
// task-flow.test.ts fake pattern). The migration must NEVER touch the real
// backlog in tests.
const FAKE = `#!/bin/bash
echo "$@" >> "${"CALLSLOG"}"
exit 0
`;

function taskMd(
  id: string,
  status: string,
  labels: string[],
  milestone?: string,
): string {
  const labelBlock = labels.length
    ? labels.map((l) => `  - ${l}`).join("\n")
    : "  []";
  const milestoneLine = milestone ? `milestone: ${milestone}\n` : "";
  return `---
id: ${id}
status: ${status}
${milestoneLine}labels:
${labelBlock}
---
`;
}

function loadCallLines(): string[] {
  return readFileSync(callsLog, "utf8").trim().split("\n").filter(Boolean);
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "task-migrate-test-"));
  tasksDir = join(root, "backlog", "tasks");
  mkdirSync(tasksDir, { recursive: true });
  callsLog = join(root, "calls.log");
  writeFileSync(callsLog, "");
  fakeBin = join(root, "backlog-bin");
  writeFileSync(fakeBin, FAKE.replaceAll("CALLSLOG", callsLog));
  chmodSync(fakeBin, 0o755);

  // Open tasks (To Do / In Progress / In Review) — the migration subject.
  writeFileSync(
    join(tasksDir, "task-1 - v2-harness.md"),
    taskMd("TASK-1", "To Do", ["v2", "harness"]),
  );
  writeFileSync(
    join(tasksDir, "task-2 - infra-tooling.md"),
    taskMd("TASK-2", "In Progress", ["infra", "tooling", "spec-approved"]),
  );
  writeFileSync(
    join(tasksDir, "task-3 - immediate.md"),
    taskMd("TASK-3", "To Do", ["immediate"]),
  );
  writeFileSync(
    join(tasksDir, "task-4 - bugfix.md"),
    taskMd("TASK-4", "To Do", ["bugfix"]),
  );
  writeFileSync(
    join(tasksDir, "task-5 - maintenance.md"),
    taskMd("TASK-5", "In Review", ["maintenance"]),
  );
  writeFileSync(
    join(tasksDir, "task-6 - case-mix.md"),
    taskMd("TASK-6", "To Do", ["HARNESS", "INFRA", "deferred"]),
  );
  writeFileSync(
    join(tasksDir, "task-7 - vocab-only.md"),
    taskMd("TASK-7", "To Do", [
      "spec-approved",
      "housekeeping",
      "merged",
      "wayfinder:map",
      "dogfood",
    ]),
  );
  writeFileSync(
    join(tasksDir, "task-8 - bogus-v1.md"),
    taskMd("TASK-8", "To Do", ["bogusstuff", "v1"]),
  );
  writeFileSync(
    join(tasksDir, "task-9 - empty.md"),
    taskMd("TASK-9", "To Do", []),
  );
  // Open v2 task already carrying a human-assigned milestone (m-4): the
  // migration drops v2 but MUST NOT override the human's milestone.
  writeFileSync(
    join(tasksDir, "task-12 - v2-with-milestone.md"),
    taskMd("TASK-12", "To Do", ["v2", "harness"], "m-4"),
  );
  // Done tasks — untouched by the migration.
  writeFileSync(
    join(tasksDir, "task-10 - done-v1.md"),
    taskMd("TASK-10", "Done", ["v1", "infra"]),
  );
  writeFileSync(
    join(tasksDir, "task-11 - done-empty.md"),
    taskMd("TASK-11", "Done", []),
  );
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

function run(args: string[], extraEnv: Record<string, string> = {}) {
  return spawnSync(process.execPath, ["--import", "tsx", BIN, ...args], {
    encoding: "utf8",
    env: {
      ...process.env,
      TASK_MIGRATE_BACKLOG: fakeBin,
      TASK_MIGRATE_DIR: root,
      ...extraEnv,
    },
    timeout: 30_000,
  });
}

describe("planMigration (AC #16 remap computation)", () => {
  const planOf = (plans: TaskPlan[], id: string): TaskPlan => {
    const p = plans.find((x) => x.id === id);
    if (!p) throw new Error(`no plan for ${id}`);
    return p;
  };

  test("summary counts: open/changed/noop/warnings over fixture", () => {
    const { plans, summary } = planMigration(root);
    assert.equal(summary.open, 10);
    assert.equal(summary.changed, 8);
    assert.equal(summary.noop, 2);
    assert.equal(summary.warnings, 1);
    assert.equal(plans.length, 10); // Done tasks excluded
  });

  test("v1/v2 task with a human-assigned milestone keeps it (AC #18 wins over migration assignment)", () => {
    const plan = planOf(planMigration(root).plans, "TASK-12");
    assert.deepEqual(plan.newLabels, ["harness"]); // v2 dropped, harness kept
    assert.equal(plan.milestone, null); // m-4 untouched
    assert.equal(plan.noop, false);
  });

  test("v2 dropped, harness kept, version milestone added in the same pass", () => {
    const plan = planOf(planMigration(root).plans, "TASK-1");
    assert.deepEqual(plan.newLabels, ["harness"]);
    assert.equal(plan.milestone, "m-6");
    assert.equal(plan.priority, null);
    assert.equal(plan.type, null);
    assert.equal(plan.noop, false);
  });

  test("infra/tooling absorbed into harness, reserved spec-approved carried", () => {
    const plan = planOf(planMigration(root).plans, "TASK-2");
    assert.deepEqual(plan.newLabels, ["harness", "spec-approved"]);
    assert.equal(plan.noop, false);
  });

  test("immediate dropped from labels and becomes --priority High", () => {
    const plan = planOf(planMigration(root).plans, "TASK-3");
    assert.deepEqual(plan.newLabels, []);
    assert.equal(plan.priority, "High");
  });

  test("bugfix dropped and becomes --type bug", () => {
    const plan = planOf(planMigration(root).plans, "TASK-4");
    assert.deepEqual(plan.newLabels, []);
    assert.equal(plan.type, "bug");
  });

  test("maintenance dropped and becomes --type chore", () => {
    const plan = planOf(planMigration(root).plans, "TASK-5");
    assert.deepEqual(plan.newLabels, []);
    assert.equal(plan.type, "chore");
  });

  test("case-insensitive matching with dedupe + canonical casing (HARNESS/INFRA)", () => {
    const plan = planOf(planMigration(root).plans, "TASK-6");
    assert.deepEqual(plan.newLabels, ["harness", "deferred"]);
  });

  test("all-vocabulary task with no flags -> noop (labels preserved)", () => {
    const plan = planOf(planMigration(root).plans, "TASK-7");
    assert.deepEqual(plan.newLabels, [
      "spec-approved",
      "housekeeping",
      "merged",
      "wayfinder:map",
      "dogfood",
    ]);
    assert.equal(plan.noop, true);
  });

  test("unknown label dropped with a recorded warning; v1 still yields milestone", () => {
    const plan = planOf(planMigration(root).plans, "TASK-8");
    assert.deepEqual(plan.newLabels, []);
    assert.equal(plan.milestone, "m-6");
    assert.match(plan.warnings.join(" "), /bogusstuff/);
  });

  test("empty-label task -> noop", () => {
    const plan = planOf(planMigration(root).plans, "TASK-9");
    assert.deepEqual(plan.newLabels, []);
    assert.equal(plan.noop, true);
  });

  test("Done tasks never appear in the plan", () => {
    const ids = planMigration(root).plans.map((p) => p.id);
    assert.ok(!ids.includes("TASK-10"));
    assert.ok(!ids.includes("TASK-11"));
  });
});

describe("task-migrate CLI", () => {
  test("--help exits 0 and documents modes + exit codes", () => {
    const r = run(["--help"]);
    assert.equal(r.status, 0);
    assert.ok(r.stdout.includes("--execute"));
    assert.ok(r.stdout.includes("dry-run"));
  });

  test("no arguments runs the default dry-run (exit 0, structured plan, no backlog calls)", () => {
    const r = run([]);
    assert.equal(r.status, 0);
    assert.ok(r.stdout.includes("PLAN TASK-1"));
    assert.ok(r.stdout.includes("SUMMARY"));
    assert.equal(loadCallLines().length, 0);
  });

  test("unknown flag exits 2", () => {
    const r = run(["--frobnicate"]);
    assert.equal(r.status, 2);
  });

  test("dry-run (default) prints a structured plan and never invokes backlog", () => {
    const r = run([]);
    assert.equal(r.status, 0);
    assert.ok(r.stdout.includes("PLAN TASK-1"));
    assert.ok(r.stdout.includes("harness"));
    assert.ok(r.stdout.includes("m-6"));
    assert.ok(r.stdout.includes("NOOP TASK-7"));
    assert.ok(r.stdout.includes("WARN TASK-8"));
    assert.ok(r.stdout.includes("SUMMARY"));
    assert.equal(loadCallLines().length, 0); // no backlog calls in dry-run
  });

  test("--execute applies exactly one replace-semantics edit per changed open task", () => {
    const r = run(["--execute"]);
    assert.equal(r.status, 0);
    const calls = loadCallLines();
    assert.equal(calls.length, 8); // changed tasks only; noops + Done untouched
  });

  test("--execute TASK-12 edit drops v2 but carries NO -m (human milestone wins)", () => {
    run(["--execute"]);
    const line = loadCallLines().find((c) => c.includes("TASK-12"));
    assert.ok(line!.includes("task edit TASK-12 --label harness"));
    assert.ok(!line!.includes("-m"));
  });

  test("--execute TASK-1 edit carries --label harness -m m-6 (replace semantics)", () => {
    run(["--execute"]);
    const calls = loadCallLines();
    const t1 = calls.find((c) => c.includes("TASK-1"));
    assert.ok(t1!.includes("task edit TASK-1 --label harness -m m-6"));
  });

  test("--execute TASK-2 edit --label harness,spec-approved", () => {
    run(["--execute"]);
    const line = loadCallLines().find((c) => c.includes("TASK-2"));
    assert.ok(line!.includes("task edit TASK-2 --label harness,spec-approved"));
  });

  test("--execute TASK-3 edit carries --priority High", () => {
    run(["--execute"]);
    const line = loadCallLines().find((c) => c.includes("TASK-3"));
    assert.ok(line!.includes("TASK-3"));
    assert.ok(line!.includes("--priority High"));
    // Empty remapped label set must use --clear-labels (backlog's --label ""
    // exits 0 but does NOT clear the labels).
    assert.ok(line!.includes("--clear-labels"));
    assert.ok(!line!.includes("--label "));
  });

  test("--execute TASK-4 edit carries --type bug", () => {
    run(["--execute"]);
    const line = loadCallLines().find((c) => c.includes("TASK-4"));
    assert.ok(line!.includes("--type bug"));
  });

  test("--execute TASK-5 edit carries --type chore", () => {
    run(["--execute"]);
    const line = loadCallLines().find((c) => c.includes("TASK-5"));
    assert.ok(line!.includes("--type chore"));
  });

  test("--execute leaves noop + Done tasks untouched (no TASK-7/9/10/11 calls)", () => {
    run(["--execute"]);
    const joined = loadCallLines().join("\n");
    assert.ok(!joined.includes("TASK-7"));
    assert.ok(!joined.includes("TASK-9"));
    assert.ok(!joined.includes("TASK-10"));
    assert.ok(!joined.includes("TASK-11"));
  });
});
