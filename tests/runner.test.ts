import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, test } from "node:test";
import { fileURLToPath } from "node:url";

const BIN = fileURLToPath(new URL("../src/tools/runner.ts", import.meta.url));

let dir: string;
let repoDir: string;
let fakeBacklog: string;
let viewFile: string;
let stateDir: string;
let callsLog: string;

const FAKE = `#!/bin/bash
echo "$PWD\t$@" >> "${"CALLSLOG"}"
if [ "$1" = "task" ] && [ "$2" = "view" ]; then
  cat "${"VIEWFILE"}"
  exit 0
fi
exit 0
`;

const VALID_TASK = {
  schemaVersion: 1,
  kind: "task-view",
  task: {
    id: "TASK-1",
    status: "In Progress",
    assignees: ["@conductor"],
    description: "Implement one bounded workflow with a concrete outcome.",
    type: "task",
    labels: ["spec-approved"],
    priority: "high",
    dependencies: [],
    acceptanceCriteria: [
      {
        index: 1,
        text: "WHEN the controller runs THEN it advances",
        checked: false,
      },
    ],
  },
};

beforeEach(() => {
  dir = join(
    tmpdir(),
    `runner-cli-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  repoDir = join(dir, "repo");
  stateDir = join(dir, "state");
  callsLog = join(dir, "calls.log");
  fakeBacklog = join(dir, "backlog");
  viewFile = join(dir, "view.json");

  mkdirSync(repoDir, { recursive: true });
  mkdirSync(stateDir, { recursive: true });
  mkdirSync(join(repoDir, ".worktrees", "TASK-1"), { recursive: true });
  writeFileSync(callsLog, "");
  writeFileSync(viewFile, JSON.stringify(VALID_TASK));
  writeFileSync(
    fakeBacklog,
    FAKE.replaceAll("CALLSLOG", callsLog).replaceAll("VIEWFILE", viewFile),
  );
  chmodSync(fakeBacklog, 0o755);
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function run(args: string[], extraEnv: Record<string, string> = {}) {
  return spawnSync(process.execPath, ["--import", "tsx", BIN, ...args], {
    encoding: "utf8",
    env: {
      ...process.env,
      RUNNER_BACKLOG: fakeBacklog,
      RUNNER_REPO_ROOT: repoDir,
      RUNNER_STATE_DIR: stateDir,
      ...extraEnv,
    },
    timeout: 30_000,
  });
}

describe("runner CLI", () => {
  test("--help exits 0 and documents usage + env", () => {
    const r = run(["--help"]);
    assert.equal(r.status, 0);
    assert.ok(r.stdout.includes("--max-rework"));
    assert.ok(r.stdout.includes("RUNNER_BACKLOG"));
  });

  test("unknown task exits 1", () => {
    writeFileSync(
      viewFile,
      '{"schemaVersion":1,"kind":"task-view","task":null}',
    );
    const r = run(["TASK-404"]);
    assert.equal(r.status, 1);
    assert.match(r.stdout + r.stderr, /not found/i);
  });

  test("missing worktree exits 1 naming the task", () => {
    rmSync(join(repoDir, ".worktrees", "TASK-1"), {
      recursive: true,
      force: true,
    });
    const r = run(["TASK-1"]);
    assert.equal(r.status, 1);
    assert.match(r.stdout + r.stderr, /worktree/i);
  });

  test("--dry-run reports the plan and starts no session", () => {
    const r = run(["TASK-1", "--dry-run"]);
    assert.equal(r.status, 0);
    assert.match(r.stdout, /DRY-RUN/i);
    assert.match(r.stdout, /implement/);
    assert.ok(!r.stdout.includes("CLAIMED"));
    assert.match(
      readFileSync(callsLog, "utf8"),
      new RegExp(
        `${repoDir.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/\\.worktrees/TASK-1\\ttask view TASK-1 --json`,
      ),
    );
  });

  test("--implementation-ready dry-run skips implement and disables rework", () => {
    const r = run(["TASK-1", "--implementation-ready", "--dry-run"]);
    assert.equal(r.status, 0);
    assert.match(r.stdout, /stages=verify -> review -> human-gate/);
    assert.match(r.stdout, /maxRework=0/);
    assert.doesNotMatch(r.stdout, /stages=implement/);
  });

  test("--max-rework N value is not miscounted as a positional", () => {
    const r = run(["TASK-1", "--max-rework", "2", "--dry-run"]);
    assert.equal(r.status, 0);
    assert.match(r.stdout, /maxRework=2/);
  });

  test("--max-rework=N inline form is accepted", () => {
    const r = run(["TASK-1", "--max-rework=3", "--dry-run"]);
    assert.equal(r.status, 0);
    assert.match(r.stdout, /maxRework=3/);
  });

  test("--stage-timeout-ms value is accepted", () => {
    const r = run(["TASK-1", "--stage-timeout-ms", "5000", "--dry-run"]);
    assert.equal(r.status, 0);
  });

  test("--max-rework with no value exits 2", () => {
    const r = run(["TASK-1", "--dry-run", "--max-rework"]);
    assert.equal(r.status, 2);
    assert.match(r.stderr, /--max-rework/);
  });

  test("ineligible task (no spec-approved) exits 1 before running", () => {
    writeFileSync(
      viewFile,
      JSON.stringify({
        ...VALID_TASK,
        task: { ...VALID_TASK.task, labels: [] },
      }),
    );
    const r = run(["TASK-1", "--dry-run"]);
    assert.equal(r.status, 1);
    assert.match(r.stdout + r.stderr, /spec-approved/i);
  });

  test("usage error exits 2", () => {
    const r = run(["--max-rework", "x"]);
    assert.equal(r.status, 2);
  });
});
