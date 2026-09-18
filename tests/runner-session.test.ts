import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { watchPermissionRequests } from "../src/runner/permissions.ts";
import {
  closeEventSubscription,
  observeSessionCompletion,
  promptAsyncUntilComplete,
} from "../src/runner/session.ts";

async function* streamOf(events: unknown[]): AsyncGenerator<unknown> {
  yield* events;
}

describe("runner SDK session cleanup", () => {
  test("aborts an idle event subscription before waiting for its watcher", async () => {
    const events = new AbortController();
    let serverClosed = false;
    let cwdRestored = false;
    let tmpDirRestored = false;
    const watching = new Promise<void>((resolve) => {
      events.signal.addEventListener("abort", resolve, { once: true });
    });

    await closeEventSubscription({
      events,
      watching,
      closeServer: () => {
        serverClosed = true;
      },
      restoreCwd: () => {
        cwdRestored = true;
      },
      restoreTmpDir: () => {
        tmpDirRestored = true;
      },
    });

    assert.equal(events.signal.aborted, true);
    assert.equal(serverClosed, true);
    assert.equal(cwdRestored, true);
    assert.equal(tmpDirRestored, true);
  });
});

describe("runner SDK session status", () => {
  test("forwards subscribed SDK events to the status observer", async () => {
    const events = [
      {
        type: "session.status",
        properties: { sessionID: "session-1", status: { type: "busy" } },
      },
      { type: "session.idle", properties: { sessionID: "session-1" } },
    ];
    const observed: unknown[] = [];
    const completion = observeSessionCompletion(
      streamOf(events),
      "session-1",
      (event) => observed.push(event),
    );

    for await (const _event of completion.events) {
      // Consuming the shared event stream drives both status and permission observers.
    }

    assert.deepEqual(observed, events);
  });
});

describe("runner SDK async prompt", () => {
  test("returns a promptAsync result error without waiting for session idle", async () => {
    let idleWaited = false;
    let messagesRead = false;

    const result = await promptAsyncUntilComplete({
      agent: "implementer",
      submit: async () => ({
        error: {
          name: "BadRequestError",
          data: { message: "prompt rejected" },
        },
      }),
      waitForIdle: () => {
        idleWaited = true;
        return Promise.resolve();
      },
      refusal: new Promise<string>(() => {}),
      readMessages: () => {
        messagesRead = true;
        return Promise.resolve({ data: [] });
      },
    });

    assert.deepEqual(result, {
      text: "",
      error: { name: "Error", message: "prompt rejected" },
      identity: { agent: "implementer" },
    });
    assert.equal(idleWaited, false);
    assert.equal(messagesRead, false);
  });

  test("returns the final assistant message error", async () => {
    const result = await promptAsyncUntilComplete({
      agent: "implementer",
      submit: async () => ({ error: undefined }),
      waitForIdle: async () => {},
      refusal: new Promise<string>(() => {}),
      readMessages: async () => ({
        data: [
          {
            info: {
              role: "assistant",
              error: {
                name: "UnknownError",
                data: { message: "model failed" },
              },
            },
            parts: [],
          },
        ],
      }),
    });

    assert.deepEqual(result.error, { name: "Error", message: "model failed" });
    assert.equal(result.identity.agent, "implementer");
  });

  test("submits asynchronously, ignores other session idle events, then reads the assistant reply", async () => {
    let promptSubmitted: () => void = () => {};
    const submittedPrompt = new Promise<void>((resolve) => {
      promptSubmitted = resolve;
    });
    const completion = observeSessionCompletion(
      (async function* () {
        await submittedPrompt;
        yield {
          type: "session.idle",
          properties: { sessionID: "other-session" },
        };
        yield { type: "session.idle", properties: { sessionID: "session-1" } };
      })(),
      "session-1",
    );
    const submitted: string[] = [];
    const watching = watchPermissionRequests({
      events: completion.events,
      worktreePath: "/work/task",
      reject: async () => {},
      onRefusal: () => {},
    });

    const result = await promptAsyncUntilComplete({
      agent: "implementer",
      submit: () => {
        submitted.push("promptAsync");
        promptSubmitted();
        return Promise.resolve({ error: undefined });
      },
      waitForIdle: completion.waitForIdle,
      refusal: new Promise<string>(() => {}),
      readMessages: async () => ({
        data: [
          {
            info: { role: "user", agent: "implementer" },
            parts: [{ type: "text", text: "do work" }],
          },
          {
            info: {
              role: "assistant",
              agent: "implementer",
              providerID: "openai",
              modelID: "gpt-5.6",
            },
            parts: [{ type: "text", text: "completed" }],
          },
        ],
      }),
    });

    await watching;
    assert.deepEqual(submitted, ["promptAsync"]);
    assert.deepEqual(result, {
      text: "completed",
      identity: {
        agent: "implementer",
        providerID: "openai",
        modelID: "gpt-5.6",
      },
    });
  });

  test("returns permission refusal evidence without waiting for session idle", async () => {
    let rejectPermission: (message: string) => void = () => {};
    const refusal = new Promise<string>((resolve) => {
      rejectPermission = resolve;
    });
    const completion = observeSessionCompletion(
      streamOf([
        {
          type: "permission.asked",
          properties: {
            id: "permission-1",
            sessionID: "session-1",
            type: "external_directory",
            pattern: "/outside/task",
          },
        },
      ]),
      "session-1",
    );
    const watching = watchPermissionRequests({
      events: completion.events,
      worktreePath: "/work/task",
      reject: async () => {},
      onRefusal: rejectPermission,
    });

    const result = await promptAsyncUntilComplete({
      agent: "implementer",
      submit: async () => ({ error: undefined }),
      waitForIdle: completion.waitForIdle,
      refusal,
      readMessages: () =>
        Promise.reject(
          new Error("messages must not be read after a permission refusal"),
        ),
    });

    await watching;
    assert.match(
      result.text,
      /^Blocked: external-directory permission rejected/,
    );
    assert.equal(result.error?.name, "PermissionRefused");
  });

  test("ignores an idle event emitted before promptAsync submission", async () => {
    let oldIdleObserved: () => void = () => {};
    const oldIdle = new Promise<void>((resolve) => {
      oldIdleObserved = resolve;
    });
    let releaseCurrentIdle: () => void = () => {};
    const currentIdle = new Promise<void>((resolve) => {
      releaseCurrentIdle = resolve;
    });
    const completion = observeSessionCompletion(
      (async function* () {
        yield { type: "session.idle", properties: { sessionID: "session-1" } };
        oldIdleObserved();
        await currentIdle;
        yield { type: "session.idle", properties: { sessionID: "session-1" } };
      })(),
      "session-1",
    );
    const watching = watchPermissionRequests({
      events: completion.events,
      worktreePath: "/work/task",
      reject: async () => {},
      onRefusal: () => {},
    });
    await oldIdle;
    let messagesRead = false;
    const result = promptAsyncUntilComplete({
      agent: "implementer",
      submit: async () => ({ error: undefined }),
      waitForIdle: completion.waitForIdle,
      refusal: new Promise<string>(() => {}),
      readMessages: () => {
        messagesRead = true;
        return Promise.resolve({
          data: [
            {
              info: { role: "assistant", agent: "implementer" },
              parts: [{ type: "text", text: "completed" }],
            },
          ],
        });
      },
    });

    await Promise.resolve();
    assert.equal(messagesRead, false);
    releaseCurrentIdle();
    await result;
    await watching;
  });
});
