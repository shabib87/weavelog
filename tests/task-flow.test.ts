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

const BIN = fileURLToPath(
  new URL("../src/tools/task-flow.ts", import.meta.url),
);

let dir: string;
let fakeBacklog: string;
let stateFile: string;
let callsLog: string;

// Fake backlog CLI: logs every call, maintains a tiny state file so the
// claim verify-loop reads back what edit wrote. view emits JSON. The task
// carries the TASK-51 spec-gate fields (description, type, labels) so claim
// exercises the gate against a realistic task.
const FAKE = `#!/bin/bash
echo "$@" >> "${"CALLSLOG"}"
if [ "$1" = "task" ] && [ "$2" = "view" ]; then
  cat "${"STATEFILE"}"
  exit 0
fi
if [ "$1" = "task" ] && [ "$2" = "edit" ]; then
  status=""; assignee=""
  prev=""
  for a in "$@"; do
    if [ "$prev" = "-s" ]; then status="$a"; fi
    if [ "$prev" = "-a" ]; then assignee="$a"; fi
    prev="$a"
  done
  acs=""
  prev=""
  for a in "$@"; do
    if [ "$prev" = "--check-ac" ]; then acs="$acs{\\"index\\":$a,\\"checked\\":true},"; fi
    prev="$a"
  done
  if [ -n "$acs" ]; then
    acs="[\${acs%,}]"
  else
    acs="[{\\"index\\":1,\\"text\\":\\"WHEN the claim gate runs THEN the task passes\\",\\"checked\\":false}]"
  fi
  cat > "${"STATEFILE"}" <<EOF
{"schemaVersion":1,"kind":"task-view","task":{"id":"TASK-1","status":"\${status:-To Do}","assignees":["\${assignee}"],"description":"A real spec description with concrete outcome and context.","type":"task","labels":["spec-approved"],"priority":"high","dependencies":[],"acceptanceCriteria":$acs}}
EOF
  exit 0
fi
exit 0
`;

beforeEach(() => {
  dir = join(
    tmpdir(),
    `task-flow-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  mkdirSync(dir, { recursive: true });
  stateFile = join(dir, "state.json");
  callsLog = join(dir, "calls.log");
  fakeBacklog = join(dir, "backlog");
  writeFileSync(
    stateFile,
    JSON.stringify({
      schemaVersion: 1,
      kind: "task-view",
      task: {
        id: "TASK-1",
        status: "To Do",
        assignees: [],
        description:
          "A real spec description with concrete outcome and context.",
        type: "task",
        labels: ["spec-approved"],
        priority: "high",
        dependencies: [],
        acceptanceCriteria: [
          {
            index: 1,
            text: "WHEN the claim gate runs THEN the task passes",
            checked: false,
          },
        ],
      },
    }),
  );
  writeFileSync(callsLog, "");
  writeFileSync(
    fakeBacklog,
    FAKE.replaceAll("CALLSLOG", callsLog).replaceAll("STATEFILE", stateFile),
  );
  chmodSync(fakeBacklog, 0o755);
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function run(args: string[], extraEnv: Record<string, string> = {}) {
  return spawnSync(process.execPath, ["--import", "tsx", BIN, ...args], {
    encoding: "utf8",
    env: { ...process.env, TASK_FLOW_BACKLOG: fakeBacklog, ...extraEnv },
    timeout: 30_000,
  });
}

function writeTaskState(task: Record<string, unknown>) {
  writeFileSync(
    stateFile,
    JSON.stringify({ schemaVersion: 1, kind: "task-view", task }),
  );
}

const VALID_TASK = {
  id: "TASK-1",
  status: "To Do",
  assignees: [],
  description: "A real spec description with concrete outcome and context.",
  type: "task",
  labels: ["spec-approved"],
  priority: "high",
  dependencies: [],
  acceptanceCriteria: [
    {
      index: 1,
      text: "WHEN the claim gate runs THEN the task passes",
      checked: false,
    },
  ],
};

describe("task-flow (happy paths)", () => {
  test("--help exits 0 and documents subcommands + env", () => {
    const r = run(["--help"]);
    assert.equal(r.status, 0);
    assert.ok(r.stdout.includes("claim"));
    assert.ok(r.stdout.includes("close"));
    assert.ok(r.stdout.includes("TASK_FLOW_BACKLOG"));
  });

  test("claim sets In Progress + assignee and verifies the read-back", () => {
    const r = run(["claim", "task-1", "--assignee", "@ses-test"]);
    assert.equal(r.status, 0);
    assert.ok(r.stdout.includes("CLAIMED task-1"));
    const calls = readFileSync(callsLog, "utf8");
    assert.ok(calls.includes("task edit task-1 -s In Progress -a @ses-test"));
  });

  test("note appends via --append-notes", () => {
    const r = run(["note", "task-1", "resumed at step 3"]);
    assert.equal(r.status, 0);
    assert.ok(
      readFileSync(callsLog, "utf8").includes(
        "task edit task-1 --append-notes",
      ),
    );
  });

  test("close applies note, AC checks, and status in one edit call", () => {
    const r = run([
      "close",
      "task-1",
      "--note",
      "evidence: 34/34 pass",
      "--check-ac",
      "1,2",
      "--status",
      "In Review",
    ]);
    assert.equal(r.status, 0);
    assert.ok(r.stdout.includes("CLOSED task-1"));
    const calls = readFileSync(callsLog, "utf8");
    assert.ok(calls.includes("--append-notes"));
    assert.ok(calls.includes("--check-ac 1 --check-ac 2"));
    assert.ok(calls.includes("-s In Review"));
  });
});

describe("task-flow (unhappy paths)", () => {
  test("claim conflict: status changed underneath -> exit 1", () => {
    // Fake edit writes a different status than requested (simulates a race)
    writeFileSync(
      fakeBacklog,
      `#!/bin/bash
echo "$@" >> "${callsLog}"
if [ "$1" = "task" ] && [ "$2" = "view" ]; then
  echo '{"schemaVersion":1,"kind":"task-view","task":{"id":"TASK-1","status":"In Progress","assignees":["@other-session"],"description":"A real spec description with concrete outcome and context.","type":"task","labels":["spec-approved"],"priority":"high","dependencies":[],"acceptanceCriteria":[{"index":1,"text":"WHEN the claim gate runs THEN the task passes","checked":false}]}}'
  exit 0
fi
exit 0
`,
    );
    chmodSync(fakeBacklog, 0o755);
    const r = run(["claim", "task-1", "--assignee", "@ses-test"]);
    assert.equal(r.status, 1);
    assert.ok(r.stdout.includes("CONFLICT"));
  });

  test("missing subcommand args -> exit 2 with usage", () => {
    const r = run(["claim"]);
    assert.equal(r.status, 2);
  });

  test("missing backlog binary -> exit 2 naming the path", () => {
    const r = run(["claim", "task-1"], {
      TASK_FLOW_BACKLOG: join(dir, "no-such-binary"),
    });
    assert.equal(r.status, 2);
    assert.ok(r.stderr.includes("no-such-binary"));
  });

  test("close with no operations -> exit 2", () => {
    const r = run(["close", "task-1"]);
    assert.equal(r.status, 2);
  });
});

describe("task-flow claim gate (TASK-51 spec-quality gate)", () => {
  test("claim on a fully valid task proceeds (gate passes)", () => {
    const r = run(["claim", "task-1", "--assignee", "@ses-test"]);
    assert.equal(r.status, 0);
    assert.ok(r.stdout.includes("CLAIMED task-1"));
  });

  test("claim on a task with empty description -> exit 1 naming the missing piece", () => {
    writeTaskState({ ...VALID_TASK, description: "   " });
    const r = run(["claim", "task-1"]);
    assert.equal(r.status, 1);
    assert.ok(r.stdout.includes("REFUSED"));
    assert.match(r.stdout, /description/i);
  });

  test("claim on a task with the creation-mode placeholder description -> exit 1", () => {
    writeTaskState({
      ...VALID_TASK,
      description: "(created by --create mode — fill in during execution)",
    });
    const r = run(["claim", "task-1"]);
    assert.equal(r.status, 1);
    assert.match(r.stdout, /placeholder/i);
  });

  test("claim on a task with zero acceptance criteria -> exit 1", () => {
    writeTaskState({ ...VALID_TASK, acceptanceCriteria: [] });
    const r = run(["claim", "task-1"]);
    assert.equal(r.status, 1);
    assert.ok(r.stdout.includes("REFUSED"));
    assert.match(r.stdout, /acceptance criteria/i);
  });

  test("claim on a task without the spec-approved label -> exit 1 (HITL marker)", () => {
    writeTaskState({ ...VALID_TASK, labels: ["v1"] });
    const r = run(["claim", "task-1"]);
    assert.equal(r.status, 1);
    assert.ok(r.stdout.includes("REFUSED"));
    assert.match(r.stdout, /spec-approved/i);
  });

  test("claim on a regular task with an EARS-violating AC -> exit 1", () => {
    writeTaskState({
      ...VALID_TASK,
      acceptanceCriteria: [
        { index: 1, text: "The system must be fast", checked: false },
      ],
    });
    const r = run(["claim", "task-1"]);
    assert.equal(r.status, 1);
    assert.match(r.stdout, /EARS/);
  });

  test("claim on a chore task with an EARS-violating AC -> warns but proceeds", () => {
    writeTaskState({
      ...VALID_TASK,
      type: "chore",
      acceptanceCriteria: [
        { index: 1, text: "Reorganize the docs folder", checked: false },
      ],
    });
    const r = run(["claim", "task-1"]);
    assert.equal(r.status, 0);
    assert.ok(r.stdout.includes("WARN"));
    assert.ok(r.stdout.includes("CLAIMED task-1"));
  });

  test("claim on a task without a priority -> exit 1 (AC #14)", () => {
    writeTaskState({ ...VALID_TASK, priority: null });
    const r = run(["claim", "task-1"]);
    assert.equal(r.status, 1);
    assert.ok(r.stdout.includes("REFUSED"));
    assert.match(r.stdout, /priority/i);
  });

  test("claim on a task with a priority outside the configured set -> exit 1 (AC #14)", () => {
    writeTaskState({ ...VALID_TASK, priority: "Urgent" });
    const r = run(["claim", "task-1"]);
    assert.equal(r.status, 1);
    assert.match(r.stdout, /priority/i);
  });

  test("claim with harness label outside a harness-dev context -> exit 1 (AC #17)", () => {
    writeTaskState({ ...VALID_TASK, labels: ["spec-approved", "harness"] });
    const r = run(["claim", "task-1"], { TASK_FLOW_HARNESS_DEV: "0" });
    assert.equal(r.status, 1);
    assert.ok(r.stdout.includes("REFUSED"));
    assert.match(r.stdout, /harness-dev/i);
  });

  test("claim with dogfood label outside a harness-dev context -> exit 1 (AC #17)", () => {
    writeTaskState({ ...VALID_TASK, labels: ["spec-approved", "dogfood"] });
    const r = run(["claim", "task-1"], { TASK_FLOW_HARNESS_DEV: "0" });
    assert.equal(r.status, 1);
    assert.match(r.stdout, /dogfood/i);
  });

  test("claim with harness label passes when TASK_FLOW_HARNESS_DEV=1 (AC #17)", () => {
    writeTaskState({ ...VALID_TASK, labels: ["spec-approved", "harness"] });
    const r = run(["claim", "task-1"], { TASK_FLOW_HARNESS_DEV: "1" });
    assert.equal(r.status, 0);
    assert.ok(r.stdout.includes("CLAIMED task-1"));
  });

  test("claim with a non-Done dependency -> exit 1 (AC #13)", () => {
    // Hermetic: point TASK_FLOW_BACKLOG_DIR at a fixture backlog whose
    // task-2 file is "To Do" (unmet dep refuses the claim).
    const fixtureRoot = join(dir, "fixture-backlog");
    mkdirSync(join(fixtureRoot, "backlog", "tasks"), { recursive: true });
    writeFileSync(
      join(fixtureRoot, "backlog", "tasks", "task-2 - pending.md"),
      "---\nid: TASK-2\nstatus: To Do\n---\n",
    );
    writeTaskState({ ...VALID_TASK, dependencies: ["TASK-2"] });
    const r = run(["claim", "task-1"], { TASK_FLOW_BACKLOG_DIR: fixtureRoot });
    assert.equal(r.status, 1);
    assert.match(r.stdout, /TASK-2/);
    assert.match(r.stdout, /Done/i);
  });

  test("claim with a Done dependency -> proceeds (AC #13 satisfied)", () => {
    // Fixture backlog with task-3 as Done — a Done dep is satisfied.
    const fixtureRoot = join(dir, "fixture-backlog-done");
    mkdirSync(join(fixtureRoot, "backlog", "tasks"), { recursive: true });
    writeFileSync(
      join(fixtureRoot, "backlog", "tasks", "task-3 - done.md"),
      "---\nid: TASK-3\nstatus: Done\n---\n",
    );
    writeTaskState({ ...VALID_TASK, dependencies: ["TASK-3"] });
    const r = run(["claim", "task-1"], { TASK_FLOW_BACKLOG_DIR: fixtureRoot });
    assert.equal(r.status, 0);
    assert.ok(r.stdout.includes("CLAIMED task-1"));
  });

  test("claim with an unknown label -> exit 1 (AC #11)", () => {
    writeTaskState({ ...VALID_TASK, labels: ["spec-approved", "bogus"] });
    const r = run(["claim", "task-1"]);
    assert.equal(r.status, 1);
    assert.match(r.stdout, /bogus/);
  });
});
