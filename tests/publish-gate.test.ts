import assert from "node:assert/strict";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, test } from "node:test";
import {
  CLOSURE_SET,
  evaluatePublishGate,
  parseTaskStatuses,
  readBacklogStatuses,
} from "../src/tools/publish-gate.js";

const created: string[] = [];
afterEach(() => {
  for (const dir of created.splice(0))
    rmSync(dir, { recursive: true, force: true });
});

function makeDir(prefix: string): string {
  const dir = join(
    tmpdir(),
    `publish-gate-${prefix}-${Date.now()}-${Math.random()}`,
  );
  mkdirSync(dir, { recursive: true });
  created.push(dir);
  return dir;
}

function taskFile(dir: string, id: string, status: string): void {
  writeFileSync(
    join(dir, `task-${id.replace("TASK-", "")} - something.md`),
    `---\nid: ${id}\nstatus: ${status}\n---\n\nbody\n`,
  );
}

function allDone(): Record<string, string> {
  return Object.fromEntries(CLOSURE_SET.map((id) => [id, "Done"]));
}

const MARKER = "TASK-67:2026-09-20";

describe("evaluatePublishGate", () => {
  test("passes when the closure set is Done and the marker is valid", () => {
    const r = evaluatePublishGate({
      statuses: allDone(),
      marker: MARKER,
    });
    assert.equal(r.ok, true);
    assert.deepEqual(r.failures, []);
  });

  test("fails when any closure-set task is not Done", () => {
    const statuses = { ...allDone(), "TASK-67": "In Progress" };
    const r = evaluatePublishGate({ statuses, marker: MARKER });
    assert.equal(r.ok, false);
    assert.ok(r.failures.some((f) => f.includes("TASK-67")));
  });

  test("fails when a closure-set task is missing entirely", () => {
    const statuses = allDone();
    delete statuses["TASK-30"];
    const r = evaluatePublishGate({ statuses, marker: MARKER });
    assert.equal(r.ok, false);
    assert.ok(r.failures.some((f) => f.includes("TASK-30")));
  });

  test("fails closed when the marker is undefined", () => {
    const r = evaluatePublishGate({ statuses: allDone(), marker: undefined });
    assert.equal(r.ok, false);
    assert.ok(r.failures.some((f) => f.toLowerCase().includes("marker")));
  });

  test("fails closed when the marker is empty", () => {
    const r = evaluatePublishGate({ statuses: allDone(), marker: "   " });
    assert.equal(r.ok, false);
  });

  test("fails closed when the marker is malformed", () => {
    const r = evaluatePublishGate({ statuses: allDone(), marker: "yes" });
    assert.equal(r.ok, false);
    assert.ok(r.failures.some((f) => f.toLowerCase().includes("marker")));
  });

  test("captures all failures, not just the first", () => {
    const statuses = { ...allDone(), "TASK-3": "To Do", "TASK-7": "To Do" };
    const r = evaluatePublishGate({ statuses, marker: undefined });
    assert.equal(r.ok, false);
    assert.ok(r.failures.length >= 2);
  });
});

describe("parseTaskStatuses", () => {
  test("extracts id and status from bundled task files", () => {
    const statuses = parseTaskStatuses([
      { content: "---\nid: TASK-3\nstatus: Done\n---\n\nx\n" },
      { content: "---\nid: TASK-7\nstatus: To Do\n---\n\nx\n" },
    ]);
    assert.deepEqual(statuses, { "TASK-3": "Done", "TASK-7": "To Do" });
  });

  test("ignores files without frontmatter", () => {
    const statuses = parseTaskStatuses([{ content: "no frontmatter" }]);
    assert.deepEqual(statuses, {});
  });
});

describe("readBacklogStatuses", () => {
  test("reads status for every task file in a backlog dir", () => {
    const dir = makeDir("read");
    taskFile(dir, "TASK-3", "Done");
    taskFile(dir, "TASK-67", "In Progress");
    const statuses = readBacklogStatuses(dir);
    assert.equal(statuses["TASK-3"], "Done");
    assert.equal(statuses["TASK-67"], "In Progress");
  });
});
