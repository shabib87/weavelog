import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, test } from "node:test";
import {
  type ControllerDeps,
  type ControllerInput,
  runController,
} from "../src/runner/controller.ts";
import {
  type CommandResult,
  type ExecRunner,
  isRefusalCommand,
  isRefusalText,
  parseReviewVerdict,
} from "../src/runner/evidence.ts";
import type { RunRecord } from "../src/runner/record.ts";
import { evaluateStage, nextStage, STAGE_ORDER } from "../src/runner/stages.ts";
import type { RunnerTask } from "../src/runner/task.ts";
import type { AgentResult, AgentSessionFactory } from "../src/runner/types.ts";

const IDENTITY = {
  agent: "implementer",
  providerID: "openrouter",
  modelID: "test/model",
};

function makeTask(overrides: Partial<RunnerTask> = {}): RunnerTask {
  return {
    id: "TASK-9",
    title: "Bounded controller task",
    status: "In Progress",
    labels: ["spec-approved"],
    priority: "high",
    type: "task",
    dependencies: [],
    description:
      "Implement one bounded workflow with a concrete outcome and why.",
    acceptanceCriteria: [
      {
        index: 1,
        text: "WHEN the controller runs THEN it advances",
        checked: false,
      },
    ],
    ...overrides,
  };
}

const okExec: ExecRunner = {
  run: (command, args): CommandResult => ({
    command,
    args,
    exitCode: 0,
    stdout: "ok",
    stderr: "",
  }),
};

const failExec: ExecRunner = {
  run: (command, args): CommandResult => ({
    command,
    args,
    exitCode: 1,
    stdout: "",
    stderr: "1 failing test",
  }),
};

interface FakeSessions {
  factory: AgentSessionFactory;
  calls: { agent: string; text: string; cwd: string }[];
  closed: number;
}

function fakeSessions(
  handler: (call: {
    agent: string;
    text: string;
    cwd: string;
    n: number;
  }) => AgentResult | Error,
): FakeSessions {
  const calls: FakeSessions["calls"] = [];
  const state = { closed: 0 };
  const factory: AgentSessionFactory = {
    start({ cwd }) {
      return Promise.resolve({
        id: `session-${calls.length + 1}`,
        prompt(opts) {
          calls.push({ agent: opts.agent, text: opts.text, cwd });
          const out = handler({ ...opts, cwd, n: calls.length });
          if (out instanceof Error) return Promise.reject(out);
          return Promise.resolve(out);
        },
        abort() {
          return Promise.resolve();
        },
        close() {
          state.closed += 1;
          return Promise.resolve();
        },
      });
    },
  };
  return {
    factory,
    calls,
    get closed() {
      return state.closed;
    },
  };
}

function approve(
  text = "reviewed\nVERDICT: APPROVE\nFINDINGS: none",
): AgentResult {
  return { text, identity: IDENTITY };
}

describe("runner stage machine", () => {
  test("stage order is implement -> verify -> review -> human-gate", () => {
    assert.deepEqual(
      [...STAGE_ORDER],
      ["implement", "verify", "review", "human-gate"],
    );
  });

  test("nextStage terminates after the human gate", () => {
    assert.equal(nextStage("implement"), "verify");
    assert.equal(nextStage("verify"), "review");
    assert.equal(nextStage("review"), "human-gate");
    assert.equal(nextStage("human-gate"), null);
  });

  test("implement advances only with completed, non-refused evidence", () => {
    assert.equal(
      evaluateStage("implement", {
        implement: { agentCompleted: true, refused: false },
      }).ok,
      true,
    );
    assert.equal(evaluateStage("implement", {}).ok, false);
    assert.equal(
      evaluateStage("implement", {
        implement: {
          agentCompleted: false,
          refused: true,
          error: "Blocked: x",
        },
      }).ok,
      false,
    );
  });

  test("verify requires command evidence and all-zero exit codes", () => {
    const mk = (exitCode: number): CommandResult => ({
      command: "npm",
      args: ["test"],
      exitCode,
      stdout: "",
      stderr: "",
    });
    assert.equal(
      evaluateStage("verify", { verify: { commands: [mk(0)] } }).ok,
      true,
    );
    assert.equal(
      evaluateStage("verify", { verify: { commands: [] } }).ok,
      false,
    );
    assert.equal(
      evaluateStage("verify", { verify: { commands: [mk(1)] } }).ok,
      false,
    );
    assert.equal(evaluateStage("verify", {}).ok, false);
  });

  test("review advances only on APPROVE", () => {
    assert.equal(
      evaluateStage("review", {
        review: { verdict: "APPROVE", text: "", identity: IDENTITY },
      }).ok,
      true,
    );
    assert.equal(
      evaluateStage("review", {
        review: { verdict: "APPROVE-WITH-FIXES", text: "", identity: IDENTITY },
      }).ok,
      false,
    );
    assert.equal(
      evaluateStage("review", {
        review: { verdict: "REJECT", text: "", identity: IDENTITY },
      }).ok,
      false,
    );
  });

  test("human-gate never auto-advances (human approval required)", () => {
    const check = evaluateStage("human-gate", {});
    assert.equal(check.ok, false);
    assert.match(check.reason, /human/i);
  });
});

describe("runner evidence parsing", () => {
  test("parseReviewVerdict reads the VERDICT line", () => {
    assert.equal(parseReviewVerdict("VERDICT: APPROVE"), "APPROVE");
    assert.equal(
      parseReviewVerdict("verdict: approve-with-fixes"),
      "APPROVE-WITH-FIXES",
    );
    assert.equal(parseReviewVerdict("VERDICT: REJECT"), "REJECT");
    assert.equal(parseReviewVerdict("no verdict here"), "UNKNOWN");
    assert.equal(
      parseReviewVerdict("VERDICT: APPROVE\nthen the final VERDICT: REJECT"),
      "REJECT",
    );
  });

  test("isRefusalText detects hooks and permission refusals", () => {
    assert.equal(isRefusalText("Blocked: /tmp/x is a live harness file"), true);
    assert.equal(isRefusalText("STATUS: BLOCKED"), true);
    assert.equal(isRefusalText("all good"), false);
  });

  test("isRefusalCommand detects a gate refusal in stderr", () => {
    assert.equal(
      isRefusalCommand({
        command: "git",
        args: ["commit"],
        exitCode: 1,
        stdout: "",
        stderr: "Blocked: no commits on main",
      }),
      true,
    );
    assert.equal(
      isRefusalCommand({
        command: "npm",
        args: ["test"],
        exitCode: 1,
        stdout: "",
        stderr: "1 failing test",
      }),
      false,
    );
    assert.equal(
      isRefusalCommand({
        command: "npm",
        args: ["test"],
        exitCode: 0,
        stdout: "Blocked: text in passing output",
        stderr: "",
      }),
      false,
    );
  });
});

describe("runner controller", () => {
  let dir: string;

  beforeEach(() => {
    dir = join(
      tmpdir(),
      `runner-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    mkdirSync(dir, { recursive: true });
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  function deps(
    sessions: AgentSessionFactory,
    exec: ExecRunner = okExec,
  ): ControllerDeps {
    return { exec, sessions, stateDir: dir };
  }

  function input(overrides: Partial<ControllerInput> = {}): ControllerInput {
    return {
      task: makeTask(),
      dependencies: [],
      worktreePath: dir,
      harnessDev: true,
      maxRework: 1,
      ...overrides,
    };
  }

  test("AC1: reads the task, runs in the worktree, and invokes the SDK (fresh session)", async () => {
    const f = fakeSessions(({ n }) =>
      n === 1 ? approve("implemented") : approve(),
    );
    const rec = await runController(deps(f.factory), input());
    assert.equal(rec.outcome, "awaiting-human");
    assert.ok(f.calls.length >= 1);
    assert.equal(f.calls[0].cwd, dir);
    assert.ok(f.calls[0].text.includes("TASK-9"));
    assert.ok(f.calls[0].text.includes("Bounded controller task"));
    assert.ok(f.closed >= 1);
  });

  test("AC2: records task identity, outcome and evidence location without marking Done", async () => {
    const f = fakeSessions(({ n }) => (n === 1 ? approve("done") : approve()));
    const rec = await runController(deps(f.factory), input());
    assert.equal(rec.taskId, "TASK-9");
    assert.ok(rec.recordPath);
    assert.ok(existsSync(rec.recordPath));
    const onDisk = JSON.parse(
      readFileSync(rec.recordPath, "utf8"),
    ) as RunRecord;
    assert.equal(onDisk.taskId, "TASK-9");
    assert.equal(onDisk.outcome, "awaiting-human");
    assert.equal(onDisk.worktreePath, dir);
    assert.ok(!JSON.stringify(onDisk).includes('"Done"'));
  });

  test("AC2: a failing verify records failure without claiming success", async () => {
    const f = fakeSessions(({ n }) =>
      n === 1 ? approve("implemented") : approve(),
    );
    const rec = await runController(
      deps(f.factory, failExec),
      input({ maxRework: 0 }),
    );
    assert.equal(rec.outcome, "failed");
    assert.ok(rec.reasons.some((r) => /verify failed/i.test(r)));
  });

  test("AC3: a hook/permission refusal is preserved and stops the run", async () => {
    const refusal =
      "Blocked: /tmp/x is a live harness file — edit the repo copy";
    const f = fakeSessions(() => ({
      text: refusal,
      identity: IDENTITY,
    }));
    const rec = await runController(deps(f.factory), input());
    assert.equal(rec.outcome, "refused");
    assert.ok(rec.reasons.some((r) => r.includes(refusal)));
    assert.equal(f.calls.length, 1);
  });

  test("AC3: a command refusal in verify is preserved, not bypassed", async () => {
    const refusalExec: ExecRunner = {
      run: (command, args) => ({
        command,
        args,
        exitCode: 1,
        stdout: "",
        stderr: "Blocked: no commits on main. Rules: worktree-discipline.md",
      }),
    };
    const f = fakeSessions(() => approve("implemented"));
    const rec = await runController(deps(f.factory, refusalExec), input());
    assert.equal(rec.outcome, "refused");
    assert.ok(rec.commands.some((c) => c.stderr.includes("Blocked:")));
  });

  test("AC4: stops at the human gate and never commits, merges or pushes", async () => {
    const seen: string[] = [];
    const trackingExec: ExecRunner = {
      run: (command, args) => {
        seen.push([command, ...args].join(" "));
        return { command, args, exitCode: 0, stdout: "", stderr: "" };
      },
    };
    const f = fakeSessions(({ n }) =>
      n === 1 ? approve("implemented") : approve(),
    );
    const rec = await runController(deps(f.factory, trackingExec), input());
    assert.equal(rec.outcome, "awaiting-human");
    assert.equal(rec.finalStage, "human-gate");
    assert.ok(!seen.some((c) => /\b(commit|merge|push)\b/.test(c)));
  });

  test("AC5: a REJECT review is rejected and triggers one bounded rework", async () => {
    let reviews = 0;
    const f = fakeSessions(({ n }) => {
      if (n === 1 || n === 3) return approve("implemented");
      reviews += 1;
      return reviews === 1
        ? approve("VERDICT: REJECT\nFINDINGS: 1. [major] fix it")
        : approve("VERDICT: APPROVE\nFINDINGS: none");
    });
    const rec = await runController(deps(f.factory), input({ maxRework: 1 }));
    assert.equal(rec.outcome, "awaiting-human");
    assert.equal(rec.rework, 1);
  });

  test("AC5: missing evidence is rejected and cannot be advanced by prose alone", async () => {
    const f = fakeSessions(({ n }) =>
      n === 1
        ? approve("I totally finished and everything passes, trust me")
        : approve("looks good, no verdict line"),
    );
    const rec = await runController(deps(f.factory), input({ maxRework: 0 }));
    assert.equal(rec.outcome, "failed");
    assert.ok(rec.reasons.some((r) => /review verdict/i.test(r)));
  });

  test("ineligible task is refused before any session starts", async () => {
    const f = fakeSessions(() => approve());
    const rec = await runController(
      deps(f.factory),
      input({ task: makeTask({ labels: [] }) }),
    );
    assert.equal(rec.outcome, "refused");
    assert.ok(rec.reasons.some((r) => /spec-approved/i.test(r)));
    assert.equal(f.calls.length, 0);
  });

  test("AC2: a stage timeout aborts and records failure, not success", async () => {
    const hang: AgentSessionFactory = {
      start: () =>
        Promise.resolve({
          id: "hang",
          prompt: () => new Promise<AgentResult>(() => {}),
          abort: () => Promise.resolve(),
          close: () => Promise.resolve(),
        }),
    };
    const rec = await runController(
      { exec: okExec, sessions: hang, stateDir: dir },
      input({ stageTimeoutMs: 25, maxRework: 0 }),
    );
    assert.equal(rec.outcome, "failed");
    assert.ok(rec.reasons.some((r) => /timed out/i.test(r)));
  });

  test("AC2: an abort signal is recorded as a cancelled failure", async () => {
    const abort = new AbortController();
    abort.abort();
    const f = fakeSessions(() => approve());
    const rec = await runController(
      deps(f.factory),
      input({ signal: abort.signal }),
    );
    assert.equal(rec.outcome, "failed");
    assert.ok(rec.reasons.some((r) => /cancel/i.test(r)));
    assert.equal(f.calls.length, 0);
  });

  test("AC2: a session-start failure is recorded, not thrown", async () => {
    const failing: AgentSessionFactory = {
      start: () => Promise.reject(new Error("server did not start")),
    };
    const rec = await runController(deps(failing), input());
    assert.equal(rec.outcome, "failed");
    assert.ok(rec.reasons.some((r) => /server did not start/.test(r)));
    assert.ok(rec.recordPath);
    assert.ok(existsSync(rec.recordPath));
  });
});
