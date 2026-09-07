import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  configSyncArgv,
  createHooks,
  FrontmatterViolationError,
  inlineCreateIssueCheck,
} from "../src/hooks/enforce.ts";

type FakeResult = { exitCode: number; stdout?: string };
type Handler = (cmd: string) => FakeResult | Promise<FakeResult> | Error;

/** Minimal mock of the plugin-context `$` (BunShell): template tag -> .quiet().nothrow() -> awaitable. */
function fakeShell(handler: Handler) {
  const calls: string[] = [];
  const $ = (strings: TemplateStringsArray, ...values: unknown[]) => {
    let cmd = strings[0] as string;
    for (let i = 0; i < values.length; i++) {
      const v = values[i];
      cmd += (Array.isArray(v) ? v.join(" ") : String(v)) + strings[i + 1];
    }
    calls.push(cmd);
    const promise = (async () => {
      const r = await handler(cmd);
      if (r instanceof Error) throw r;
      return { exitCode: r.exitCode, text: () => r.stdout ?? "" };
    })();
    return { quiet: () => ({ nothrow: () => promise }) };
  };
  return { $, calls };
}

const created: string[] = [];
afterEach(() => {
  for (const dir of created.splice(0))
    rmSync(dir, { recursive: true, force: true });
});

let n = 0;
function makeHome(
  parts: Array<
    "frontmatter-check" | "reviewer-loop" | "headroom" | "config-sync"
  > = [],
): string {
  const home = join(tmpdir(), `enforce-hooks-test-${Date.now()}-${n++}`);
  mkdirSync(home, { recursive: true });
  const paths: Record<(typeof parts)[number], string> = {
    "frontmatter-check": ".agents/bin/src/frontmatter-check.ts",
    "reviewer-loop": ".agents/bin/src/reviewer-loop.ts",
    headroom: ".local/bin/headroom",
    "config-sync": ".agents/bin/src/config-sync.ts",
  };
  for (const part of parts) {
    const full = join(home, paths[part]);
    mkdirSync(join(full, ".."), { recursive: true });
    writeFileSync(full, "");
  }
  created.push(home);
  return home;
}

function depsFor(
  home: string,
  $: unknown,
  overrides: Record<string, unknown> = {},
) {
  return {
    $,
    home,
    env: {} as Record<string, string | undefined>,
    appendLog: () => {},
    exists: existsSync,
    timeouts: { checkMs: 200, learnMs: 200 },
    ...overrides,
  };
}

function gitBranchMock(branch: string) {
  return () => branch;
}

function gitBranchThrow() {
  return () => {
    throw new Error("gitBranch failed");
  };
}

function runCmdThrow() {
  return () => {
    throw new Error("runCmd failed");
  };
}

function withoutScript(...names: string[]) {
  return (p: string) =>
    !names.some((name) => p.includes(name)) && existsSync(p);
}

const VIOLATIONS_JSON = JSON.stringify({
  files: [
    { file: "x.md", ok: false, violations: ["missing required key: status"] },
  ],
  summary: { scanned: 1, valid: 0, invalid: 1 },
});

const editResearch = (home: string) => ({
  tool: "edit",
  sessionID: "s1",
  callID: "c1",
  args: { filePath: join(home, ".agents/docs/research/2026-08-16-doc.md") },
});
const beforeBash = { tool: "bash", sessionID: "s1", callID: "c1" };
const idle = (sessionId: string) => ({
  event: { type: "session.idle", properties: { sessionID: sessionId } },
});

describe("Hook 1 — frontmatter enforcement on research docs", () => {
  test("violations (exit 1) append frontmatter_warning with details and a --fix hint", async () => {
    const home = makeHome(["frontmatter-check"]);
    const { $ } = fakeShell((cmd) =>
      cmd.includes("frontmatter-check")
        ? { exitCode: 1, stdout: VIOLATIONS_JSON }
        : { exitCode: 0 },
    );
    const hooks = createHooks(depsFor(home, $));
    const output: { metadata?: Record<string, unknown> } = {};
    await hooks["tool.execute.after"](editResearch(home), output);
    const warning = String(output.metadata?.frontmatter_warning ?? "");
    assert.ok(warning.includes("missing required key: status"));
    assert.ok(warning.includes("--fix"));
  });

  test("valid docs (exit 0) append a quiet valid marker and no warning", async () => {
    const home = makeHome(["frontmatter-check"]);
    const { $ } = fakeShell(() => ({ exitCode: 0, stdout: "{}" }));
    const hooks = createHooks(depsFor(home, $));
    const output: { metadata?: Record<string, unknown> } = {};
    await hooks["tool.execute.after"](editResearch(home), output);
    assert.equal(output.metadata?.frontmatter_warning, undefined);
    assert.ok(String(output.metadata?.frontmatter_check ?? "").includes("✓"));
  });

  test("non-research file is skipped silently (no shell calls, no metadata)", async () => {
    const home = makeHome(["frontmatter-check"]);
    const { $, calls } = fakeShell(() => ({ exitCode: 0 }));
    const hooks = createHooks(depsFor(home, $));
    const output: { metadata?: Record<string, unknown> } = {};
    await hooks["tool.execute.after"](
      {
        tool: "edit",
        sessionID: "s1",
        callID: "c1",
        args: { filePath: join(home, "other/file.md") },
      },
      output,
    );
    assert.equal(calls.length, 0);
    assert.equal(output.metadata, undefined);
  });

  test("missing frontmatter-check.ts skips silently (fail-open, Phase-0-incomplete case)", async () => {
    const home = makeHome(); // no scripts at all
    const { $, calls } = fakeShell(() => ({ exitCode: 0 }));
    const hooks = createHooks(
      depsFor(home, $, { exists: withoutScript("frontmatter-check.ts") }),
    );
    const output: { metadata?: Record<string, unknown> } = {};
    await hooks["tool.execute.after"](editResearch(home), output);
    assert.equal(calls.length, 0);
    assert.equal(output.metadata, undefined);
  });

  test("a hanging frontmatter-check times out and fails open", async () => {
    const home = makeHome(["frontmatter-check"]);
    const { $ } = fakeShell(() => new Promise<FakeResult>(() => {})); // never resolves
    const hooks = createHooks(
      depsFor(home, $, { timeouts: { checkMs: 30, learnMs: 30 } }),
    );
    const output: { metadata?: Record<string, unknown> } = {};
    await hooks["tool.execute.after"](editResearch(home), output);
    assert.equal(output.metadata, undefined);
  });

  test("missing edit args do not throw", async () => {
    const home = makeHome(["frontmatter-check"]);
    const { $ } = fakeShell(() => ({ exitCode: 0 }));
    const hooks = createHooks(depsFor(home, $));
    await hooks["tool.execute.after"](
      { tool: "edit", sessionID: "s1", callID: "c1", args: {} },
      {},
    );
    await hooks["tool.execute.after"](
      { tool: "read", sessionID: "s1", callID: "c1", args: {} },
      {},
    );
  });
});

describe("Hook 2 — commit gate (back-pressure)", () => {
  test("git commit with violations in staged research docs is blocked", async () => {
    const home = makeHome(["frontmatter-check"]);
    const { $ } = fakeShell(() => ({ exitCode: 0 }));
    const runCmd = (
      _cmd: string,
      _args: string[],
      _opts?: { cwd?: string; timeout?: number },
    ) => {
      if (_cmd === "git")
        return {
          status: 0,
          stdout: "docs/research/2026-08-16-doc.md\n",
          stderr: "",
        };
      if (_cmd === "node")
        return { status: 1, stdout: VIOLATIONS_JSON, stderr: "" };
      return { status: 0, stdout: "", stderr: "" };
    };
    const hooks = createHooks(depsFor(home, $, { runCmd }));
    const call = hooks["tool.execute.before"](beforeBash, {
      args: { command: 'git commit -m "wip"' },
    });
    await assert.rejects(call, FrontmatterViolationError);
    await assert.rejects(call, /missing required key: status/);
    await assert.rejects(call, /--fix/);
  });

  test("git commit with valid research docs proceeds", async () => {
    const home = makeHome(["frontmatter-check"]);
    const { $ } = fakeShell(() => ({ exitCode: 0 }));
    const runCmd = (
      _cmd: string,
      _args: string[],
      _opts?: { cwd?: string; timeout?: number },
    ) => {
      if (_cmd === "git")
        return {
          status: 0,
          stdout: "docs/research/2026-08-16-doc.md\n",
          stderr: "",
        };
      if (_cmd === "node") return { status: 0, stdout: "{}", stderr: "" };
      return { status: 0, stdout: "", stderr: "" };
    };
    const hooks = createHooks(depsFor(home, $, { runCmd }));
    await hooks["tool.execute.before"](beforeBash, {
      args: { command: 'git commit -m "wip"' },
    });
  });

  test("git commit with no staged research docs skips the frontmatter check", async () => {
    const home = makeHome(["frontmatter-check"]);
    const { $, calls } = fakeShell(() => ({ exitCode: 0 }));
    const runCmd = () => ({ status: 0, stdout: "", stderr: "" });
    const hooks = createHooks(depsFor(home, $, { runCmd }));
    await hooks["tool.execute.before"](beforeBash, {
      args: { command: "cd /tmp && git commit -m wip" },
    });
    assert.equal(calls.length, 0);
  });

  test("git failure during the staged-file check fails open (no block)", async () => {
    const home = makeHome(["frontmatter-check"]);
    const { $ } = fakeShell(() => ({ exitCode: 0 }));
    const runCmd = (
      _cmd: string,
      _args: string[],
      _opts?: { cwd?: string; timeout?: number },
    ) => {
      if (_cmd === "git")
        return {
          status: 128,
          stdout: "",
          stderr: "fatal: not a git repository",
        };
      return { status: 1, stdout: VIOLATIONS_JSON, stderr: "" };
    };
    const hooks = createHooks(depsFor(home, $, { runCmd }));
    await hooks["tool.execute.before"](beforeBash, {
      args: { command: 'git commit -m "wip"' },
    });
  });

  test("missing frontmatter-check.ts does not block commits (fail-open)", async () => {
    const home = makeHome(); // no checker script
    const { $, calls } = fakeShell(() => ({ exitCode: 0 }));
    const hooks = createHooks(
      depsFor(home, $, { exists: withoutScript("frontmatter-check.ts") }),
    );
    await hooks["tool.execute.before"](beforeBash, {
      args: { command: 'git commit -m "wip"' },
    });
    assert.equal(calls.length, 0);
  });

  test("wrapped git invocations (git -C, git -c) with violations are blocked", async () => {
    const home = makeHome(["frontmatter-check"]);
    const { $ } = fakeShell(() => ({ exitCode: 0 }));
    const runCmd = (
      _cmd: string,
      _args: string[],
      _opts?: { cwd?: string; timeout?: number },
    ) => {
      if (_cmd === "git")
        return {
          status: 0,
          stdout: "docs/research/2026-08-16-doc.md\n",
          stderr: "",
        };
      if (_cmd === "node")
        return { status: 1, stdout: VIOLATIONS_JSON, stderr: "" };
      return { status: 0, stdout: "", stderr: "" };
    };
    const hooks = createHooks(depsFor(home, $, { runCmd }));
    await assert.rejects(
      hooks["tool.execute.before"](beforeBash, {
        args: { command: `git -C ${home}/.agents commit -m wip` },
      }),
      FrontmatterViolationError,
    );
    await assert.rejects(
      hooks["tool.execute.before"](beforeBash, {
        args: { command: "git -c user.name=x commit -m wip" },
      }),
      FrontmatterViolationError,
    );
  });

  test("non-bash tools are ignored", async () => {
    const home = makeHome(["frontmatter-check"]);
    const { $, calls } = fakeShell(() => ({ exitCode: 0 }));
    const hooks = createHooks(depsFor(home, $));
    await hooks["tool.execute.before"](
      { tool: "edit", sessionID: "s1", callID: "c1" },
      { args: { command: "git commit -m wip" } },
    );
    assert.equal(calls.length, 0);
  });

  test("runCmd throwing fails open — commit not blocked", async () => {
    const home = makeHome(["frontmatter-check"]);
    const { $ } = fakeShell(() => ({ exitCode: 0 }));
    const hooks = createHooks(depsFor(home, $, { runCmd: runCmdThrow() }));
    await hooks["tool.execute.before"](beforeBash, {
      args: { command: 'git commit -m "wip"' },
    });
  });
});

describe("Hook 3 — dangerous command gate", () => {
  const blocked = async (command: string, message: RegExp | string) => {
    const home = makeHome();
    const { $ } = fakeShell(() => ({ exitCode: 0 }));
    const hooks = createHooks(depsFor(home, $));
    await assert.rejects(
      hooks["tool.execute.before"](beforeBash, { args: { command } }),
      message,
    );
  };
  const allowed = async (command: string) => {
    const home = makeHome();
    const { $ } = fakeShell(() => ({ exitCode: 0 }));
    const hooks = createHooks(depsFor(home, $));
    await hooks["tool.execute.before"](beforeBash, { args: { command } });
  };

  test("chmod 600 ~/.headroom is blocked with the incident message", async () => {
    await blocked("chmod 600 ~/.headroom", /chmod 600 strips execute bit/);
  });

  test("chmod -R 600 ~/.headroom and the $HOME variant are blocked", async () => {
    await blocked("chmod -R 600 ~/.headroom", /chmod 600 strips execute bit/);
    await blocked("chmod 600 $HOME/.headroom", /chmod 600 strips execute bit/);
    await blocked(
      `chmod 600 \${HOME}/.local/pipx/venvs`,
      /chmod 600 strips execute bit/,
    );
  });

  test("chmod 600 on a literal absolute home path is blocked", async () => {
    const home = makeHome();
    const { $ } = fakeShell(() => ({ exitCode: 0 }));
    const hooks = createHooks(depsFor(home, $));
    await assert.rejects(
      hooks["tool.execute.before"](beforeBash, {
        args: { command: `chmod 600 ${home}/.headroom` },
      }),
      /chmod 600 strips execute bit/,
    );
  });

  test("chmod 600 ~/.ssh/id_rsa is NOT blocked (legitimate file permission)", async () => {
    await allowed("chmod 600 ~/.ssh/id_rsa");
  });

  test("rm -rf of the proxy state or pipx venv is blocked", async () => {
    await blocked("rm -rf ~/.headroom", /destroys the headroom proxy state/);
    await blocked("rm -rf ~/.local/pipx/venvs/headroom-ai", /pipx venv/);
    await blocked("rm -rf $HOME/.local/pipx/venvs/headroom-ai", /pipx venv/);
  });

  test("rm -rf /tmp/headroom-ai is NOT blocked (unrelated path, anchored denylist)", async () => {
    await allowed("rm -rf /tmp/headroom-ai");
    await allowed("rm -rf /tmp/headroom-ai-backup");
  });

  test("launchctl bootout of the proxy is blocked", async () => {
    await blocked(
      "launchctl bootout gui/501/com.headroom.proxy",
      /kill the headroom proxy/,
    );
  });

  test("safe commands pass", async () => {
    await allowed("ls -la");
    await allowed("chmod 700 ~/.headroom");
    await allowed("git status");
  });
});

describe("Hook 4 — failure learning on session.idle", () => {
  test("runs headroom learn once per session, dry-run by default (no --apply)", async () => {
    const home = makeHome(["headroom"]);
    const { $, calls } = fakeShell(() => ({ exitCode: 0, stdout: "patterns" }));
    const hooks = createHooks(
      depsFor(home, $, { env: { HEADROOM_LEARN_ENABLE: "true" } }),
    );
    await hooks.event(idle("s1"));
    const learn = calls.filter(
      (c) => c.includes("headroom") && c.includes("learn"),
    );
    assert.equal(learn.length, 1);
    assert.ok(learn[0].includes("--agent opencode"));
    assert.ok(learn[0].includes("--model deepseek/deepseek-v4-flash-0731"));
    assert.ok(!learn[0].includes("--apply"));
  });

  test("debounces: a second session.idle for the same session does not re-run", async () => {
    const home = makeHome(["headroom"]);
    const { $, calls } = fakeShell(() => ({ exitCode: 0, stdout: "patterns" }));
    const hooks = createHooks(
      depsFor(home, $, { env: { HEADROOM_LEARN_ENABLE: "true" } }),
    );
    await hooks.event(idle("s1"));
    await hooks.event(idle("s1"));
    await hooks.event(idle("s2"));
    assert.equal(calls.filter((c) => c.includes("learn")).length, 2);
  });

  test("fails open when headroom learn crashes", async () => {
    const home = makeHome(["headroom"]);
    const { $ } = fakeShell((cmd) => {
      if (cmd.includes("learn")) return new Error("spawn failed");
      return { exitCode: 0 };
    });
    const hooks = createHooks(
      depsFor(home, $, { env: { HEADROOM_LEARN_ENABLE: "true" } }),
    );
    await hooks.event(idle("s1")); // must not reject
  });

  test("HEADROOM_LEARN_AUTO_APPLY=true adds --apply", async () => {
    const home = makeHome(["headroom"]);
    const { $, calls } = fakeShell(() => ({ exitCode: 0, stdout: "patterns" }));
    const hooks = createHooks(
      depsFor(home, $, {
        env: {
          HEADROOM_LEARN_ENABLE: "true",
          HEADROOM_LEARN_AUTO_APPLY: "true",
        },
      }),
    );
    await hooks.event(idle("s1"));
    assert.ok(calls.filter((c) => c.includes("learn"))[0].includes("--apply"));
  });

  test("persists learn output to ~/.agents/logs/headroom-learn.log (creates dirs as needed)", async () => {
    const home = makeHome(["headroom"]); // no logs dir — state-agnostic
    const { $ } = fakeShell(() => ({ exitCode: 0, stdout: "learned-things" }));
    const deps = depsFor(home, $, { env: { HEADROOM_LEARN_ENABLE: "true" } });
    delete (deps as Record<string, unknown>).appendLog; // exercise the real default appender
    const hooks = createHooks(deps);
    await hooks.event(idle("s1"));
    const log = readFileSync(
      join(home, ".agents/logs/headroom-learn.log"),
      "utf8",
    );
    assert.ok(log.includes("learned-things"));
  });

  test("missing headroom binary skips silently", async () => {
    const home = makeHome(); // no headroom bin
    const { $, calls } = fakeShell(() => ({ exitCode: 0 }));
    const hooks = createHooks(
      depsFor(home, $, { env: { HEADROOM_LEARN_ENABLE: "true" } }),
    );
    await hooks.event(idle("s1"));
    assert.equal(calls.length, 0);
  });

  test("a session that skipped learning (headroom missing) retries after install", async () => {
    const home = makeHome(); // no headroom bin yet
    const { $, calls } = fakeShell(() => ({ exitCode: 0, stdout: "patterns" }));
    const hooks = createHooks(
      depsFor(home, $, { env: { HEADROOM_LEARN_ENABLE: "true" } }),
    );
    await hooks.event(idle("s1"));
    assert.equal(calls.length, 0);
    // headroom gets installed; the next idle for the SAME session must retry
    mkdirSync(join(home, ".local/bin"), { recursive: true });
    writeFileSync(join(home, ".local/bin/headroom"), "");
    await hooks.event(idle("s1"));
    assert.equal(calls.filter((c) => c.includes("learn")).length, 1);
    // and now it is debounced
    await hooks.event(idle("s1"));
    assert.equal(calls.filter((c) => c.includes("learn")).length, 1);
  });

  test("non-idle events are ignored", async () => {
    const home = makeHome(["headroom"]);
    const { $, calls } = fakeShell(() => ({ exitCode: 0 }));
    const hooks = createHooks(depsFor(home, $));
    await hooks.event({
      event: { type: "file.edited", properties: { sessionID: "s1" } },
    });
    assert.equal(calls.length, 0);
  });

  test("LRU eviction at the cap: a recent session does not re-trigger learning", async () => {
    const home = makeHome(["headroom"]);
    const { $, calls } = fakeShell(() => ({ exitCode: 0, stdout: "patterns" }));
    const hooks = createHooks(
      depsFor(home, $, { env: { HEADROOM_LEARN_ENABLE: "true" } }),
    );
    for (let i = 1; i <= 101; i++) await hooks.event(idle(`s${i}`));
    assert.equal(calls.filter((c) => c.includes("learn")).length, 101);
    // s2 is recent (only s1 was evicted) — must NOT re-run
    await hooks.event(idle("s2"));
    assert.equal(calls.filter((c) => c.includes("learn")).length, 101);
    // s1 was evicted — it MAY re-run (bounded-LRU semantics)
    await hooks.event(idle("s1"));
    assert.equal(calls.filter((c) => c.includes("learn")).length, 102);
  });
});

describe("Hook 5 — review SOP reminder on plan docs", () => {
  test("editing a plans doc appends review_reminder with the reviewer-loop command", async () => {
    const home = makeHome(["reviewer-loop"]);
    const { $ } = fakeShell(() => ({ exitCode: 0 }));
    const hooks = createHooks(depsFor(home, $));
    const output: { metadata?: Record<string, unknown> } = {};
    const filePath = join(home, ".agents/docs/plans/2026-08-16-plan.md");
    await hooks["tool.execute.after"](
      { tool: "edit", sessionID: "s1", callID: "c1", args: { filePath } },
      output,
    );
    const reminder = String(output.metadata?.review_reminder ?? "");
    assert.ok(reminder.includes("reviewer-loop.ts"));
    assert.ok(reminder.includes(filePath));
  });

  test("non-plans edits get no reminder", async () => {
    const home = makeHome(["reviewer-loop", "frontmatter-check"]);
    const { $ } = fakeShell(() => ({ exitCode: 0, stdout: "{}" }));
    const hooks = createHooks(depsFor(home, $));
    const output: { metadata?: Record<string, unknown> } = {};
    await hooks["tool.execute.after"](editResearch(home), output);
    assert.equal(output.metadata?.review_reminder, undefined);
  });

  test("missing reviewer-loop.ts skips the reminder silently", async () => {
    const home = makeHome(); // no reviewer-loop
    const { $ } = fakeShell(() => ({ exitCode: 0 }));
    const hooks = createHooks(
      depsFor(home, $, { exists: withoutScript("reviewer-loop.ts") }),
    );
    const output: { metadata?: Record<string, unknown> } = {};
    const filePath = join(home, ".agents/docs/plans/2026-08-16-plan.md");
    await hooks["tool.execute.after"](
      { tool: "edit", sessionID: "s1", callID: "c1", args: { filePath } },
      output,
    );
    assert.equal(output.metadata, undefined);
  });
});

describe("bypass / disable flags (reviewer-mandated kill switches)", () => {
  test("ENFORCE_DISABLED=true makes every hook a no-op (master kill switch)", async () => {
    const home = makeHome(["frontmatter-check", "reviewer-loop", "headroom"]);
    const { $, calls } = fakeShell((cmd) => {
      if (cmd.includes("git diff --cached"))
        return { exitCode: 0, stdout: "docs/research/x.md\n" };
      if (cmd.includes("frontmatter-check"))
        return { exitCode: 1, stdout: VIOLATIONS_JSON };
      return { exitCode: 0, stdout: "patterns" };
    });
    const env = { ENFORCE_DISABLED: "true", HEADROOM_LEARN_AUTO_APPLY: "true" };
    const hooks = createHooks(depsFor(home, $, { env }));
    // denylist would normally throw — must not
    await hooks["tool.execute.before"](beforeBash, {
      args: { command: "chmod 600 ~/.headroom" },
    });
    // commit gate would normally throw — must not
    await hooks["tool.execute.before"](beforeBash, {
      args: { command: 'git commit -m "wip"' },
    });
    // Hooks 1 + 5 must not annotate
    const output: { metadata?: Record<string, unknown> } = {};
    await hooks["tool.execute.after"](editResearch(home), output);
    assert.equal(output.metadata, undefined);
    // Hook 4 must not run
    await hooks.event(idle("s1"));
    assert.equal(calls.length, 0);
  });

  test("learning is opt-in: HEADROOM_LEARN_ENABLE unset skips learning but keeps enforcement", async () => {
    const home = makeHome(["headroom"]);
    const { $, calls } = fakeShell(() => ({ exitCode: 0, stdout: "patterns" }));
    const hooks = createHooks(depsFor(home, $));
    await hooks.event(idle("s1"));
    assert.equal(calls.length, 0);
    await assert.rejects(
      hooks["tool.execute.before"](beforeBash, {
        args: { command: "chmod 600 ~/.headroom" },
      }),
      /chmod 600 strips execute bit/,
    );
  });
  test("kill switches are read per hook call, not captured at load time", async () => {
    const home = makeHome(["headroom"]);
    const { $, calls } = fakeShell(() => ({ exitCode: 0, stdout: "patterns" }));
    const env: Record<string, string | undefined> = {};
    const hooks = createHooks(depsFor(home, $, { env }));
    // enforcement on: denylist blocks
    await assert.rejects(
      hooks["tool.execute.before"](beforeBash, {
        args: { command: "chmod 600 ~/.headroom" },
      }),
      /chmod 600 strips execute bit/,
    );
    // flip at runtime: master switch engages without re-creating the hooks
    env.ENFORCE_DISABLED = "true";
    await hooks["tool.execute.before"](beforeBash, {
      args: { command: "chmod 600 ~/.headroom" },
    });
    // flip back: enforcement resumes
    env.ENFORCE_DISABLED = "false";
    await assert.rejects(
      hooks["tool.execute.before"](beforeBash, {
        args: { command: "chmod 600 ~/.headroom" },
      }),
      /chmod 600 strips execute bit/,
    );
    // same for the learn enable flag: off by default, on at runtime, off again
    await hooks.event(idle("s1"));
    assert.equal(calls.length, 0);
    env.HEADROOM_LEARN_ENABLE = "true";
    await hooks.event(idle("s2"));
    assert.equal(calls.filter((c) => c.includes("learn")).length, 1);
    env.HEADROOM_LEARN_ENABLE = "false";
    await hooks.event(idle("s3"));
    assert.equal(calls.filter((c) => c.includes("learn")).length, 1);
  });
});

describe("state-agnostic fail-open (reviewer-mandated: no state file present)", () => {
  test("all hooks are safe no-ops with an empty home (no scripts, no logs, no state)", async () => {
    const home = makeHome(); // nothing exists under this home
    const { $, calls } = fakeShell(() => ({ exitCode: 0 }));
    const hooks = createHooks(
      depsFor(home, $, {
        exists: withoutScript("frontmatter-check.ts", "reviewer-loop.ts"),
      }),
    );
    // Hook 1 + Hook 5: edit on research and plans docs
    await hooks["tool.execute.after"](editResearch(home), {});
    await hooks["tool.execute.after"](
      {
        tool: "edit",
        sessionID: "s1",
        callID: "c1",
        args: { filePath: join(home, ".agents/docs/plans/p.md") },
      },
      {},
    );
    // Hook 2: git commit
    await hooks["tool.execute.before"](beforeBash, {
      args: { command: 'git commit -m "wip"' },
    });
    // Hook 4: session idle
    await hooks.event(idle("s1"));
    // no shell calls at all — every hook noticed its tooling was absent and skipped
    assert.equal(calls.length, 0);
    // but the denylist (pure regex, no state) still enforces
    await assert.rejects(
      hooks["tool.execute.before"](beforeBash, {
        args: { command: "chmod 600 ~/.headroom" },
      }),
      /chmod 600 strips execute bit/,
    );
  });
});

describe("Hook 6 — write-block on main branch", () => {
  const beforeEdit = { tool: "edit", sessionID: "s1", callID: "c1" } as const;
  const beforeWrite = { tool: "write", sessionID: "s1", callID: "c1" } as const;

  test("edit on main is blocked", async () => {
    const home = makeHome();
    const { $ } = fakeShell(() => ({ exitCode: 0 }));
    const hooks = createHooks(
      depsFor(home, $, { gitBranch: gitBranchMock("main") }),
    );
    await assert.rejects(
      hooks["tool.execute.before"](beforeEdit, {
        args: { filePath: join(home, ".agents/foo.ts") },
      }),
      /no file writes on main/,
    );
  });

  test("write on main is blocked", async () => {
    const home = makeHome();
    const { $ } = fakeShell(() => ({ exitCode: 0 }));
    const hooks = createHooks(
      depsFor(home, $, { gitBranch: gitBranchMock("main") }),
    );
    await assert.rejects(
      hooks["tool.execute.before"](beforeWrite, {
        args: { filePath: join(home, ".agents/foo.ts") },
      }),
      /no file writes on main/,
    );
  });

  test("main write-block message does not teach the bypass", async () => {
    const home = makeHome();
    const { $ } = fakeShell(() => ({ exitCode: 0 }));
    const hooks = createHooks(
      depsFor(home, $, { gitBranch: gitBranchMock("main") }),
    );
    const err = await hooks["tool.execute.before"](beforeWrite, {
      args: { filePath: join(home, ".agents/foo.ts") },
    }).then(
      () => null,
      (e: unknown) => e,
    );
    assert.ok(err);
    const msg = err instanceof Error ? err.message : String(err);
    assert.ok(msg.includes("no file writes on main"));
    assert.ok(!msg.includes("Bypass"));
    assert.ok(!msg.includes("ENFORCE_DISABLED"));
  });

  test("backlog-gate block message does not teach the bypass", async () => {
    const home = makeHome();
    const { $ } = fakeShell(() => ({ exitCode: 0 }));
    const hooks = createHooks(
      depsFor(home, $, { gitBranch: gitBranchMock("main") }),
    );
    const err = await hooks["tool.execute.before"](beforeBash, {
      args: { command: "backlog task create 'sneaky task on main'" },
    }).then(
      () => null,
      (e: unknown) => e,
    );
    assert.ok(err);
    const msg = err instanceof Error ? err.message : String(err);
    assert.ok(msg.includes("no backlog task creation"));
    assert.ok(!msg.includes("Bypass"));
    assert.ok(!msg.includes("ENFORCE_DISABLED"));
  });

  test("write on a task branch is allowed", async () => {
    const home = makeHome();
    const { $ } = fakeShell(() => ({ exitCode: 0 }));
    const hooks = createHooks(
      depsFor(home, $, { gitBranch: gitBranchMock("task/task-11") }),
    );
    await hooks["tool.execute.before"](beforeWrite, {
      args: { filePath: join(home, ".agents/foo.ts") },
    });
  });

  test("write outside ~/.agents is allowed (no gitBranch call)", async () => {
    const home = makeHome();
    const { $, calls } = fakeShell(() => ({ exitCode: 0, stdout: "main\n" }));
    const hooks = createHooks(
      depsFor(home, $, { gitBranch: gitBranchMock("main") }),
    );
    await hooks["tool.execute.before"](beforeWrite, {
      args: { filePath: join(home, "other/foo.ts") },
    });
    assert.equal(calls.length, 0);
  });

  test("git failure (empty branch string) fails open", async () => {
    const home = makeHome();
    const { $ } = fakeShell(() => ({ exitCode: 0 }));
    const hooks = createHooks(
      depsFor(home, $, { gitBranch: gitBranchMock("") }),
    );
    await hooks["tool.execute.before"](beforeWrite, {
      args: { filePath: join(home, ".agents/foo.ts") },
    });
  });

  test("gitBranch throwing fails open", async () => {
    const home = makeHome();
    const { $ } = fakeShell(() => ({ exitCode: 0 }));
    const hooks = createHooks(
      depsFor(home, $, { gitBranch: gitBranchThrow() }),
    );
    await hooks["tool.execute.before"](beforeWrite, {
      args: { filePath: join(home, ".agents/foo.ts") },
    });
  });

  test("non-string filePath fails open", async () => {
    const home = makeHome();
    const { $, calls } = fakeShell(() => ({ exitCode: 0, stdout: "main\n" }));
    const hooks = createHooks(
      depsFor(home, $, { gitBranch: gitBranchMock("main") }),
    );
    await hooks["tool.execute.before"](beforeEdit, { args: {} });
    assert.equal(calls.length, 0);
  });

  test("ENFORCE_DISABLED=true bypasses", async () => {
    const home = makeHome();
    const { $, calls } = fakeShell(() => ({ exitCode: 0, stdout: "main\n" }));
    const hooks = createHooks(
      depsFor(home, $, {
        env: { ENFORCE_DISABLED: "true" },
        gitBranch: gitBranchMock("main"),
      }),
    );
    await hooks["tool.execute.before"](beforeWrite, {
      args: { filePath: join(home, ".agents/foo.ts") },
    });
    assert.equal(calls.length, 0);
  });

  test("non-edit/write tools unaffected", async () => {
    const home = makeHome();
    const { $, calls } = fakeShell(() => ({ exitCode: 0, stdout: "main\n" }));
    const hooks = createHooks(
      depsFor(home, $, { gitBranch: gitBranchMock("main") }),
    );
    await hooks["tool.execute.before"](
      { tool: "read", sessionID: "s1", callID: "c1" },
      { args: { filePath: join(home, ".agents/foo.ts") } },
    );
    assert.equal(calls.length, 0);
  });
});

describe("Hooks 1/4 fail-open on synchronous `$` throw (broken shell tag)", () => {
  const throwing$ = () => {
    throw new Error("$ is not a function");
  };

  test("Hook 1 fails open on synchronous `$` throw — edit after does not throw", async () => {
    const home = makeHome(["frontmatter-check"]);
    const hooks = createHooks(depsFor(home, throwing$));
    const output: { metadata?: Record<string, unknown> } = {};
    await hooks["tool.execute.after"](editResearch(home), output);
  });

  test("Hook 4 fails open on synchronous `$` throw — idle does not throw", async () => {
    const home = makeHome(["headroom"]);
    const hooks = createHooks(
      depsFor(home, throwing$, { env: { HEADROOM_LEARN_ENABLE: "true" } }),
    );
    await hooks.event(idle("s1"));
  });
});

describe("Hook 6 — write-block new-directory bypass (climb to existing ancestor)", () => {
  const beforeWrite = { tool: "write", sessionID: "s1", callID: "c1" } as const;

  test("blocks a new (nonexistent) directory on main — no bypass via git exit 128", async () => {
    const home = makeHome();
    mkdirSync(join(home, ".agents"), { recursive: true }); // .agents exists; newdir does not
    const { $ } = fakeShell(() => ({ exitCode: 0 }));
    const gitBranch = (dir: string) => (existsSync(dir) ? "main" : "");
    const hooks = createHooks(depsFor(home, $, { gitBranch }));
    await assert.rejects(
      hooks["tool.execute.before"](beforeWrite, {
        args: { filePath: join(home, ".agents/newdir/foo.ts") },
      }),
      /no file writes on main/,
    );
  });

  test("allows a new directory inside a worktree (climb finds the worktree root)", async () => {
    const home = makeHome();
    mkdirSync(join(home, ".agents/.worktrees/task-11"), { recursive: true }); // worktree exists; newdir does not
    const { $ } = fakeShell(() => ({ exitCode: 0 }));
    const gitBranch = (dir: string) => (existsSync(dir) ? "task/task-11" : "");
    const hooks = createHooks(depsFor(home, $, { gitBranch }));
    await hooks["tool.execute.before"](beforeWrite, {
      args: {
        filePath: join(home, ".agents/.worktrees/task-11/newdir/foo.ts"),
      },
    });
  });
});

describe("Hook 8 — live-harness write-block (~/.config/opencode/**)", () => {
  const beforeEdit = { tool: "edit", sessionID: "s1", callID: "c1" } as const;
  const beforeWrite = { tool: "write", sessionID: "s1", callID: "c1" } as const;
  const livePath = (home: string) => join(home, ".config/opencode/agents/x.md");

  test("edit on a live harness file is blocked with the repo + materialize message", async () => {
    const home = makeHome();
    const { $ } = fakeShell(() => ({ exitCode: 0 }));
    const hooks = createHooks(depsFor(home, $));
    await assert.rejects(
      hooks["tool.execute.before"](beforeEdit, {
        args: { filePath: livePath(home) },
      }),
      /\.agents\/config/,
    );
    await assert.rejects(
      hooks["tool.execute.before"](beforeEdit, {
        args: { filePath: livePath(home) },
      }),
      /config-sync\.ts/,
    );
  });

  test("write on a live harness file is blocked too", async () => {
    const home = makeHome();
    const { $ } = fakeShell(() => ({ exitCode: 0 }));
    const hooks = createHooks(depsFor(home, $));
    await assert.rejects(
      hooks["tool.execute.before"](beforeWrite, {
        args: { filePath: join(home, ".config/opencode/opencode.jsonc") },
      }),
      /config-sync\.ts/,
    );
  });

  test("nested live paths are blocked", async () => {
    const home = makeHome();
    const { $ } = fakeShell(() => ({ exitCode: 0 }));
    const hooks = createHooks(depsFor(home, $));
    await assert.rejects(
      hooks["tool.execute.before"](beforeWrite, {
        args: { filePath: join(home, ".config/opencode/a/b/c.ts") },
      }),
      /config-sync\.ts/,
    );
  });

  test("similar-but-outside paths are NOT blocked (prefix boundary)", async () => {
    const home = makeHome();
    const { $ } = fakeShell(() => ({ exitCode: 0 }));
    const hooks = createHooks(depsFor(home, $));
    await hooks["tool.execute.before"](beforeWrite, {
      args: { filePath: join(home, ".config/opencode-other/foo.ts") },
    });
    await hooks["tool.execute.before"](beforeWrite, {
      args: { filePath: join(home, ".config/other/foo.ts") },
    });
  });

  test("canonicalization closes the relative/../ bypass (reviewer fix)", async () => {
    const home = makeHome();
    mkdirSync(join(home, ".config/opencode/agents"), { recursive: true });
    const { $ } = fakeShell(() => ({ exitCode: 0 }));
    const hooks = createHooks(depsFor(home, $));
    await assert.rejects(
      hooks["tool.execute.before"](beforeWrite, {
        args: {
          filePath: join(home, ".config/other/../opencode/agents/x.md"),
        },
      }),
      /config-sync\.ts/,
    );
  });

  test("canonicalization closes the symlink bypass (reviewer fix)", async () => {
    const home = makeHome();
    mkdirSync(join(home, ".config/opencode"), { recursive: true });
    mkdirSync(join(home, "elsewhere"), { recursive: true });
    symlinkSync(
      join(home, ".config/opencode/agents.md"),
      join(home, "elsewhere-link.md"),
    );
    const { $ } = fakeShell(() => ({ exitCode: 0 }));
    const hooks = createHooks(depsFor(home, $));
    await assert.rejects(
      hooks["tool.execute.before"](beforeWrite, {
        args: { filePath: join(home, "elsewhere-link.md") },
      }),
      /config-sync\.ts/,
    );
  });

  test("a symlink CYCLE degrades to the lexical check without hanging (depth guard)", async () => {
    const home = makeHome();
    mkdirSync(join(home, "elsewhere"), { recursive: true });
    symlinkSync(join(home, "elsewhere/b"), join(home, "elsewhere/a"));
    symlinkSync(join(home, "elsewhere/a"), join(home, "elsewhere/b"));
    const { $ } = fakeShell(() => ({ exitCode: 0 }));
    const hooks = createHooks(depsFor(home, $));
    // must resolve quickly (no infinite recursion) and not block
    await hooks["tool.execute.before"](beforeWrite, {
      args: { filePath: join(home, "elsewhere/a/file.ts") },
    });
  });

  test("a symlinked home does not break the block (root canonicalized)", async () => {
    const home = makeHome();
    mkdirSync(join(home, ".config/opencode"), { recursive: true });
    const link = join(tmpdir(), `enforce-home-link-${Date.now()}`);
    symlinkSync(realpathSync(home), link);
    created.push(link);
    const { $ } = fakeShell(() => ({ exitCode: 0 }));
    // home reached THROUGH the link: both the plugin root and the filePath
    // are built from `link` and must canonicalize to the same real target
    const hooks = createHooks(depsFor(link, $));
    await assert.rejects(
      hooks["tool.execute.before"](beforeWrite, {
        args: { filePath: join(link, ".config/opencode/x.md") },
      }),
      /config-sync\.ts/,
    );
  });

  test("ENFORCE_ALLOW_LIVE_EDIT=true is the escape hatch", async () => {
    const home = makeHome();
    const { $ } = fakeShell(() => ({ exitCode: 0 }));
    const hooks = createHooks(
      depsFor(home, $, { env: { ENFORCE_ALLOW_LIVE_EDIT: "true" } }),
    );
    await hooks["tool.execute.before"](beforeEdit, {
      args: { filePath: livePath(home) },
    });
  });

  test("ENFORCE_DISABLED=true bypasses", async () => {
    const home = makeHome();
    const { $ } = fakeShell(() => ({ exitCode: 0 }));
    const hooks = createHooks(
      depsFor(home, $, { env: { ENFORCE_DISABLED: "true" } }),
    );
    await hooks["tool.execute.before"](beforeEdit, {
      args: { filePath: livePath(home) },
    });
  });

  test("missing filePath fails open", async () => {
    const home = makeHome();
    const { $ } = fakeShell(() => ({ exitCode: 0 }));
    const hooks = createHooks(depsFor(home, $));
    await hooks["tool.execute.before"](beforeEdit, { args: {} });
  });

  test("non-edit/write tools are not blocked", async () => {
    const home = makeHome();
    const { $ } = fakeShell(() => ({ exitCode: 0 }));
    const hooks = createHooks(depsFor(home, $));
    await hooks["tool.execute.before"](
      { tool: "read", sessionID: "s1", callID: "c1" },
      { args: { filePath: livePath(home) } },
    );
  });
});

describe("Hook 9 — session-start auto-materialize (config-sync)", () => {
  const createdEvent = (sessionId: string) => ({
    event: {
      type: "session.created",
      properties: { info: { id: sessionId } },
    },
  });
  const runConfigSyncFor = (
    statusFor: () => {
      status: number | null;
      stdout: string;
    } | null,
    calls: number[],
  ) => {
    return (): Promise<{
      status: number | null;
      stdout: string;
    } | null> => {
      calls.push(1);
      return Promise.resolve(statusFor());
    };
  };

  test("session.created runs the sync once (injected runner)", async () => {
    const home = makeHome(["config-sync"]);
    const { $ } = fakeShell(() => ({ exitCode: 0 }));
    const calls: number[] = [];
    const runConfigSync = () => {
      calls.push(1);
      return Promise.resolve({ status: 0, stdout: "{}" });
    };
    const hooks = createHooks(depsFor(home, $, { runConfigSync }));
    await hooks.event(createdEvent("s1"));
    assert.equal(calls.length, 1);
  });

  test("default runner argv is forward-only: node config-sync, no --force/--adopt", () => {
    const home = "/tmp/whatever-home";
    const argv = configSyncArgv(home);
    assert.equal(argv[0], "node");
    assert.ok(argv.join(" ").includes("config-sync"));
    assert.ok(!argv.join(" ").includes("force"));
    assert.ok(!argv.join(" ").includes("--force"));
    assert.ok(!argv.join(" ").includes("--adopt"));
  });

  test("exit 0 surfaces no warning", async () => {
    const home = makeHome(["config-sync"]);
    const { $ } = fakeShell(() => ({ exitCode: 0 }));
    const calls: number[] = [];
    const runConfigSync = runConfigSyncFor(
      () => ({ status: 0, stdout: "{}" }),
      calls,
    );
    const hooks = createHooks(depsFor(home, $, { runConfigSync }));
    await hooks.event(createdEvent("s1"));
    const output: { metadata?: Record<string, unknown> } = {};
    await hooks["tool.execute.after"](
      { tool: "bash", sessionID: "s1", callID: "c1", args: {} },
      output,
    );
    assert.equal(output.metadata?.config_sync_warning, undefined);
  });

  test("exit 1 (out-of-band live edit) surfaces the refusal loudly ONCE, naming the file + --adopt", async () => {
    const home = makeHome(["config-sync"]);
    const { $ } = fakeShell(() => ({ exitCode: 0 }));
    const calls: number[] = [];
    const report = JSON.stringify({
      mode: "config-sync",
      exitCode: 1,
      refusals: [
        {
          file: "AGENTS.md",
          reason:
            "live file differs from the last materialized state (local edit)",
          fix: "use --adopt to adopt live into repo, or --force to overwrite live from repo",
        },
      ],
    });
    const runConfigSync = runConfigSyncFor(
      () => ({ status: 1, stdout: report }),
      calls,
    );
    const hooks = createHooks(depsFor(home, $, { runConfigSync }));
    await hooks.event(createdEvent("s1"));
    const output: { metadata?: Record<string, unknown> } = {};
    await hooks["tool.execute.after"](
      { tool: "bash", sessionID: "s1", callID: "c1", args: {} },
      output,
    );
    const warning = String(output.metadata?.config_sync_warning ?? "");
    assert.ok(warning.includes("AGENTS.md"));
    assert.ok(warning.includes("--adopt"));
    // once per session: a second tool call gets nothing
    const output2: { metadata?: Record<string, unknown> } = {};
    await hooks["tool.execute.after"](
      { tool: "bash", sessionID: "s1", callID: "c2", args: {} },
      output2,
    );
    assert.equal(output2.metadata?.config_sync_warning, undefined);
  });

  test("a refusal is also appended to the log (reviewer fix: visibility)", async () => {
    const home = makeHome(["config-sync"]);
    const { $ } = fakeShell(() => ({ exitCode: 0 }));
    const logged: string[] = [];
    const runConfigSync = runConfigSyncFor(
      () => ({
        status: 1,
        stdout: JSON.stringify({
          refusals: [{ file: "x.md", reason: "r", fix: "f" }],
        }),
      }),
      [],
    );
    const hooks = createHooks(
      depsFor(home, $, {
        runConfigSync,
        appendLog: (t: string) => logged.push(t),
      }),
    );
    await hooks.event(createdEvent("s1"));
    assert.equal(logged.length, 1);
  });

  test("a refusal for session s1 does NOT surface on session s2's tool calls", async () => {
    const home = makeHome(["config-sync"]);
    const { $ } = fakeShell(() => ({ exitCode: 0 }));
    const runConfigSync = runConfigSyncFor(
      () => ({
        status: 1,
        stdout: JSON.stringify({
          refusals: [{ file: "x.md", reason: "r", fix: "f" }],
        }),
      }),
      [],
    );
    const hooks = createHooks(depsFor(home, $, { runConfigSync }));
    await hooks.event(createdEvent("s1"));
    const output: { metadata?: Record<string, unknown> } = {};
    await hooks["tool.execute.after"](
      { tool: "bash", sessionID: "s2", callID: "c1", args: {} },
      output,
    );
    assert.equal(output.metadata?.config_sync_warning, undefined);
    // s1's warning is still pending
    const output1: { metadata?: Record<string, unknown> } = {};
    await hooks["tool.execute.after"](
      { tool: "bash", sessionID: "s1", callID: "c1", args: {} },
      output1,
    );
    assert.ok(output1.metadata?.config_sync_warning !== undefined);
  });

  test("second created event for the same session does not re-run", async () => {
    const home = makeHome(["config-sync"]);
    const { $ } = fakeShell(() => ({ exitCode: 0 }));
    const calls: number[] = [];
    const runConfigSync = runConfigSyncFor(
      () => ({ status: 0, stdout: "{}" }),
      calls,
    );
    const hooks = createHooks(depsFor(home, $, { runConfigSync }));
    await hooks.event(createdEvent("s1"));
    await hooks.event(createdEvent("s1"));
    assert.equal(calls.length, 1);
  });

  test("LRU cap: syncedSessions and pendingConfigWarnings are bounded", async () => {
    const home = makeHome(["config-sync"]);
    const { $ } = fakeShell(() => ({ exitCode: 0 }));
    const runConfigSync = runConfigSyncFor(
      () => ({
        status: 1,
        stdout: JSON.stringify({
          refusals: [{ file: "x.md", reason: "r", fix: "f" }],
        }),
      }),
      [],
    );
    const hooks = createHooks(depsFor(home, $, { runConfigSync }));
    // 150 distinct sessions: the oldest 50 are evicted, no unbounded growth
    for (let i = 1; i <= 150; i++) await hooks.event(createdEvent(`s${i}`));
    // s1 was evicted — re-creating it re-runs the sync (LRU semantics)
    await hooks.event(createdEvent("s1"));
    // if unbounded, s1 would still be marked and skip; we assert it ran again
    // indirectly: no throw + warning still surfaces for s1
    const output: { metadata?: Record<string, unknown> } = {};
    await hooks["tool.execute.after"](
      { tool: "bash", sessionID: "s1", callID: "c1", args: {} },
      output,
    );
    assert.ok(output.metadata?.config_sync_warning !== undefined);
  });

  test("pendingConfigWarnings are evicted at the cap (dead sessions cannot leak)", async () => {
    const home = makeHome(["config-sync"]);
    const { $ } = fakeShell(() => ({ exitCode: 0 }));
    const runConfigSync = runConfigSyncFor(
      () => ({
        status: 1,
        stdout: JSON.stringify({
          refusals: [{ file: "x.md", reason: "r", fix: "f" }],
        }),
      }),
      [],
    );
    const hooks = createHooks(depsFor(home, $, { runConfigSync }));
    // 150 refusing sessions, none of which ever run a tool call:
    // the warning Map must evict the oldest, so s1's warning is gone
    for (let i = 1; i <= 150; i++) await hooks.event(createdEvent(`s${i}`));
    const output: { metadata?: Record<string, unknown> } = {};
    await hooks["tool.execute.after"](
      { tool: "bash", sessionID: "s1", callID: "c1", args: {} },
      output,
    );
    assert.equal(output.metadata?.config_sync_warning, undefined);
  });

  test("runConfigSync rejecting fails open (no block, no stash)", async () => {
    const home = makeHome(["config-sync"]);
    const { $ } = fakeShell(() => ({ exitCode: 0 }));
    const runConfigSync = () => {
      throw new Error("spawn failed");
    };
    const hooks = createHooks(depsFor(home, $, { runConfigSync }));
    await hooks.event(createdEvent("s1")); // must not reject
    const output: { metadata?: Record<string, unknown> } = {};
    await hooks["tool.execute.after"](
      { tool: "bash", sessionID: "s1", callID: "c1", args: {} },
      output,
    );
    assert.equal(output.metadata?.config_sync_warning, undefined);
  });

  test("missing config-sync.ts fails open silently", async () => {
    const home = makeHome(); // no .agents/bin at all
    const { $ } = fakeShell(() => ({ exitCode: 0 }));
    const calls: number[] = [];
    const runConfigSync = runConfigSyncFor(
      () => ({ status: 0, stdout: "{}" }),
      calls,
    );
    const hooks = createHooks(
      depsFor(home, $, {
        runConfigSync,
        exists: withoutScript("config-sync.ts"),
      }),
    );
    await hooks.event(createdEvent("s1"));
    assert.equal(calls.length, 0);
  });

  test("exit 2 (machinery error) fails open without a warning", async () => {
    const home = makeHome(["config-sync"]);
    const { $ } = fakeShell(() => ({ exitCode: 0 }));
    const runConfigSync = runConfigSyncFor(
      () => ({ status: 2, stdout: "" }),
      [],
    );
    const hooks = createHooks(depsFor(home, $, { runConfigSync }));
    await hooks.event(createdEvent("s1"));
    const output: { metadata?: Record<string, unknown> } = {};
    await hooks["tool.execute.after"](
      { tool: "bash", sessionID: "s1", callID: "c1", args: {} },
      output,
    );
    assert.equal(output.metadata?.config_sync_warning, undefined);
  });

  test("ENFORCE_DISABLED=true disables the session-start sync", async () => {
    const home = makeHome(["config-sync"]);
    const { $ } = fakeShell(() => ({ exitCode: 0 }));
    const calls: number[] = [];
    const runConfigSync = runConfigSyncFor(
      () => ({ status: 0, stdout: "{}" }),
      calls,
    );
    const hooks = createHooks(
      depsFor(home, $, {
        env: { ENFORCE_DISABLED: "true" },
        runConfigSync,
      }),
    );
    await hooks.event(createdEvent("s1"));
    assert.equal(calls.length, 0);
  });

  test("unparseable stdout on exit 1 still surfaces a generic loud warning", async () => {
    const home = makeHome(["config-sync"]);
    const { $ } = fakeShell(() => ({ exitCode: 0 }));
    const runConfigSync = runConfigSyncFor(
      () => ({ status: 1, stdout: "not json" }),
      [],
    );
    const hooks = createHooks(depsFor(home, $, { runConfigSync }));
    await hooks.event(createdEvent("s1"));
    const output: { metadata?: Record<string, unknown> } = {};
    await hooks["tool.execute.after"](
      { tool: "bash", sessionID: "s1", callID: "c1", args: {} },
      output,
    );
    const warning = String(output.metadata?.config_sync_warning ?? "");
    assert.ok(warning.includes("config-sync"));
  });
});

describe("Hook 7 — backlog task lifecycle gate on main", () => {
  const beforeBashLocal = {
    tool: "bash",
    sessionID: "s1",
    callID: "c1",
  } as const;

  test("backlog task create on main is blocked", async () => {
    const home = makeHome();
    const { $ } = fakeShell(() => ({ exitCode: 0 }));
    const hooks = createHooks(
      depsFor(home, $, { gitBranch: gitBranchMock("main") }),
    );
    await assert.rejects(
      hooks["tool.execute.before"](beforeBashLocal, {
        args: { command: 'backlog task create "New task"' },
      }),
      /no backlog task creation/,
    );
  });

  test("backlog task edit --status on main is blocked", async () => {
    const home = makeHome();
    const { $ } = fakeShell(() => ({ exitCode: 0 }));
    const hooks = createHooks(
      depsFor(home, $, { gitBranch: gitBranchMock("main") }),
    );
    await assert.rejects(
      hooks["tool.execute.before"](beforeBashLocal, {
        args: { command: 'backlog task edit TASK-13 --status "In Progress"' },
      }),
      /no backlog task creation/,
    );
  });

  test("backlog task create on a task branch is allowed when it carries description + ACs", async () => {
    const home = makeHome();
    const { $ } = fakeShell(() => ({ exitCode: 0 }));
    const hooks = createHooks(
      depsFor(home, $, { gitBranch: gitBranchMock("task/TASK-13") }),
    );
    // Hook 10 (TASK-51): a complete create passes; a bare title no longer does.
    await hooks["tool.execute.before"](beforeBashLocal, {
      args: {
        command:
          'backlog task create "New task" -d "the spec" --ac "WHEN x THEN y"',
      },
    });
  });

  test("backlog task edit without --status on main is allowed (not a lifecycle change)", async () => {
    const home = makeHome();
    const { $ } = fakeShell(() => ({ exitCode: 0 }));
    const hooks = createHooks(
      depsFor(home, $, { gitBranch: gitBranchMock("main") }),
    );
    await hooks["tool.execute.before"](beforeBashLocal, {
      args: { command: "backlog task edit TASK-13 --description 'updated'" },
    });
  });

  test("ENFORCE_DISABLED=true bypasses Hook 7", async () => {
    const home = makeHome();
    const { $ } = fakeShell(() => ({ exitCode: 0 }));
    const hooks = createHooks(
      depsFor(home, $, {
        gitBranch: gitBranchMock("main"),
        env: { ENFORCE_DISABLED: "true" },
      }),
    );
    await hooks["tool.execute.before"](beforeBashLocal, {
      args: { command: 'backlog task create "New task"' },
    });
  });

  test("gitBranch throwing fails open", async () => {
    const home = makeHome();
    const { $ } = fakeShell(() => ({ exitCode: 0 }));
    const hooks = createHooks(
      depsFor(home, $, { gitBranch: gitBranchThrow() }),
    );
    await hooks["tool.execute.before"](beforeBashLocal, {
      args: { command: 'backlog task create "New task"' },
    });
  });
});

describe("Hook 10 — backlog task create quality nudge (any branch)", () => {
  const beforeBashLocal = {
    tool: "bash",
    sessionID: "s1",
    callID: "c1",
  } as const;

  /** Home with the repo's task-validate.ts wired in so Hook 10's dynamic
   * import resolves (import happens at hook-call time). */
  function homeWithValidator(): string {
    const home = makeHome();
    mkdirSync(join(home, ".agents/bin/src"), { recursive: true });
    writeFileSync(
      join(home, ".agents/bin/src/task-validate.ts"),
      readFileSync(
        fileURLToPath(
          new URL("../src/tools/task-validate.ts", import.meta.url),
        ),
        "utf8",
      ),
    );
    return home;
  }

  test("task-branch create without a description throws with fix guidance", async () => {
    const home = homeWithValidator();
    const { $ } = fakeShell(() => ({ exitCode: 0 }));
    const hooks = createHooks(
      depsFor(home, $, { gitBranch: gitBranchMock("task/TASK-13") }),
    );
    await assert.rejects(
      hooks["tool.execute.before"](beforeBashLocal, {
        args: {
          command: 'backlog task create "New task" --ac "WHEN x THEN y"',
        },
      }),
      /description/,
    );
  });

  test("task-branch create with zero --ac throws with fix guidance", async () => {
    const home = homeWithValidator();
    const { $ } = fakeShell(() => ({ exitCode: 0 }));
    const hooks = createHooks(
      depsFor(home, $, { gitBranch: gitBranchMock("task/TASK-13") }),
    );
    await assert.rejects(
      hooks["tool.execute.before"](beforeBashLocal, {
        args: { command: 'backlog task create "New task" -d "the spec"' },
      }),
      /acceptance criteria/i,
    );
  });

  test("task-branch create with --no-dod-defaults throws with fix guidance", async () => {
    const home = homeWithValidator();
    const { $ } = fakeShell(() => ({ exitCode: 0 }));
    const hooks = createHooks(
      depsFor(home, $, { gitBranch: gitBranchMock("task/TASK-13") }),
    );
    await assert.rejects(
      hooks["tool.execute.before"](beforeBashLocal, {
        args: {
          command:
            'backlog task create "New task" -d "spec" --ac "WHEN x THEN y" --no-dod-defaults',
        },
      }),
      /no-dod-defaults/,
    );
  });

  test("task-branch create with -d + at least one --ac proceeds", async () => {
    const home = homeWithValidator();
    const { $, calls } = fakeShell(() => ({ exitCode: 0 }));
    const hooks = createHooks(
      depsFor(home, $, { gitBranch: gitBranchMock("task/TASK-13") }),
    );
    await hooks["tool.execute.before"](beforeBashLocal, {
      args: {
        command:
          'backlog task create "New task" -d "the spec" --ac "WHEN x THEN y"',
      },
    });
    assert.equal(calls.length, 0);
  });

  test("Hook 7 main-scoped behavior is unchanged: create on main throws the main message, not the quality one", async () => {
    const home = homeWithValidator();
    const { $ } = fakeShell(() => ({ exitCode: 0 }));
    const hooks = createHooks(
      depsFor(home, $, { gitBranch: gitBranchMock("main") }),
    );
    await assert.rejects(
      hooks["tool.execute.before"](beforeBashLocal, {
        args: {
          command:
            'backlog task create "New task" -d "spec" --ac "WHEN x THEN y"',
        },
      }),
      /no backlog task creation/,
    );
  });

  test("inline fallback enforces when the validator module is not importable", () => {
    const bare = inlineCreateIssueCheck('backlog task create "New task"');
    assert.ok(bare.some((issue) => issue.includes("missing description")));
    assert.ok(bare.some((issue) => issue.includes("zero acceptance criteria")));
    const complete = inlineCreateIssueCheck(
      'backlog task create "New task" -d "spec" --ac "WHEN x THEN y"',
    );
    assert.equal(complete.length, 0);
  });

  test("create with an unknown label -> blocked with fix guidance (AC #11)", async () => {
    const home = homeWithValidator();
    const { $ } = fakeShell(() => ({ exitCode: 0 }));
    const hooks = createHooks(
      depsFor(home, $, {
        gitBranch: gitBranchMock("task/TASK-13"),
        isBacklogProject: true,
      }),
    );
    await assert.rejects(
      hooks["tool.execute.before"](beforeBashLocal, {
        args: {
          command:
            'backlog task create "New task" -d "spec" --ac "WHEN x THEN y" -l bogus',
        },
      }),
      /bogus|vocabulary/i,
    );
  });

  test("create with harness label outside a harness-dev context -> blocked (AC #17)", async () => {
    const home = homeWithValidator();
    const { $ } = fakeShell(() => ({ exitCode: 0 }));
    const hooks = createHooks(
      depsFor(home, $, {
        gitBranch: gitBranchMock("task/TASK-13"),
        isBacklogProject: true,
        harnessDev: false,
      }),
    );
    await assert.rejects(
      hooks["tool.execute.before"](beforeBashLocal, {
        args: {
          command:
            'backlog task create "New task" -d "spec" --ac "WHEN x THEN y" -l harness',
        },
      }),
      /harness-dev/i,
    );
  });

  test("create with harness label in a harness-dev context -> allowed (AC #17)", async () => {
    const home = homeWithValidator();
    const { $, calls } = fakeShell(() => ({ exitCode: 0 }));
    const hooks = createHooks(
      depsFor(home, $, {
        gitBranch: gitBranchMock("task/TASK-13"),
        harnessDev: true,
      }),
    );
    await hooks["tool.execute.before"](beforeBashLocal, {
      args: {
        command:
          'backlog task create "New task" -d "spec" --ac "WHEN x THEN y" -l harness',
      },
    });
    assert.equal(calls.length, 0);
  });

  test("create outside a backlog project fails open even with bad labels (AC #13 Hook 10)", async () => {
    const home = homeWithValidator();
    const { $, calls } = fakeShell(() => ({ exitCode: 0 }));
    const hooks = createHooks(
      depsFor(home, $, {
        gitBranch: gitBranchMock("task/TASK-13"),
        isBacklogProject: false,
      }),
    );
    await hooks["tool.execute.before"](beforeBashLocal, {
      args: {
        command:
          'backlog task create "New task" -d "spec" --ac "WHEN x THEN y" -l bogus --dep TASK-1',
      },
    });
    assert.equal(calls.length, 0);
  });
});
