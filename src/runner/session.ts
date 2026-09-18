/**
 * Real AgentSessionFactory backed by the pinned @opencode-ai/sdk (TASK-3 proof).
 *
 * The SDK spawns `opencode serve` with no cwd option, so the process working
 * directory at createOpencode() time scopes the server (and its hooks) to the
 * task worktree. We chdir, start the server, and restore cwd on close.
 */

import type {
  Message,
  Part,
  SessionMessagesError,
  SessionPromptAsyncError,
} from "@opencode-ai/sdk";
import { createOpencode } from "@opencode-ai/sdk";
import { watchPermissionRequests } from "./permissions.js";
import { sessionStatusStateOf } from "./status.js";
import type {
  AgentModelIdentity,
  AgentResult,
  AgentSession,
  AgentSessionFactory,
} from "./types.js";
import { setTmpDir } from "./workspace.js";

interface SessionMessage {
  info: Message;
  parts: Part[];
}

type MessageResponse =
  | { data: SessionMessage[]; error: undefined }
  | { data: undefined; error: SessionMessagesError };

type PromptAsyncResponse =
  | { error: undefined }
  | { error: SessionPromptAsyncError };

function messageOf(error: unknown): string {
  if (!error) return "";
  if (typeof error === "string") return error;
  if (typeof error === "object") {
    if ("message" in error && typeof error.message === "string") {
      return error.message;
    }
    if (
      "data" in error &&
      typeof error.data === "object" &&
      error.data !== null &&
      "message" in error.data &&
      typeof error.data.message === "string"
    ) {
      return error.data.message;
    }
  }
  return String(error);
}

function isIdleForSession(event: unknown, sessionId: string): boolean {
  if (!event || typeof event !== "object") return false;
  if (
    !("type" in event) ||
    event.type !== "session.idle" ||
    !("properties" in event)
  ) {
    return false;
  }
  const properties = event.properties;
  return (
    !!properties &&
    typeof properties === "object" &&
    "sessionID" in properties &&
    properties.sessionID === sessionId
  );
}

export interface SessionCompletion {
  waitForIdle: () => Promise<void>;
  events: AsyncIterable<unknown>;
}

/** Observe completion without competing with the permission watcher for events. */
export function observeSessionCompletion(
  events: AsyncIterable<unknown>,
  sessionId: string,
  onEvent?: (event: unknown) => void,
): SessionCompletion {
  let armed = false;
  let resolveIdle: () => void = () => {};
  const idle = new Promise<void>((resolve) => {
    resolveIdle = resolve;
  });
  return {
    waitForIdle: () => {
      armed = true;
      return idle;
    },
    events: (async function* () {
      for await (const event of events) {
        onEvent?.(event);
        if (armed && isIdleForSession(event, sessionId)) resolveIdle();
        yield event;
      }
    })(),
  };
}

export interface AsyncPromptOptions {
  agent: string;
  submit: () => Promise<PromptAsyncResponse>;
  waitForIdle: () => Promise<void>;
  refusal: Promise<string>;
  readMessages: () => Promise<MessageResponse>;
}

/** Submit immediately, then collect the last assistant message after this session is idle. */
export async function promptAsyncUntilComplete(
  options: AsyncPromptOptions,
): Promise<AgentResult> {
  const submitted = await options.submit();
  if (submitted.error) {
    return {
      text: "",
      error: { name: "Error", message: messageOf(submitted.error) },
      identity: { agent: options.agent },
    };
  }
  const completion = await Promise.race([
    options.waitForIdle(),
    options.refusal,
  ]);
  if (typeof completion === "string") {
    return {
      text: completion,
      error: { name: "PermissionRefused", message: completion },
      identity: { agent: options.agent },
    };
  }

  const response = await options.readMessages();
  if (response.error) {
    return {
      text: "",
      error: { name: "Error", message: messageOf(response.error) },
      identity: { agent: options.agent },
    };
  }
  const assistant = response.data
    .filter((message) => message.info.role === "assistant")
    .at(-1);
  if (assistant?.info.role !== "assistant") {
    return {
      text: "",
      error: {
        name: "Error",
        message: "session became idle without an assistant message",
      },
      identity: { agent: options.agent },
    };
  }
  if (assistant.info.error) {
    return {
      text: "",
      error: { name: "Error", message: messageOf(assistant.info.error) },
      identity: { agent: options.agent },
    };
  }
  const identity: AgentModelIdentity = {
    agent: options.agent,
    providerID: assistant.info.providerID,
    modelID: assistant.info.modelID,
  };
  return {
    text: assistant.parts
      .filter((part) => part.type === "text")
      .map((part) => part.text ?? "")
      .join("\n"),
    identity,
  };
}

export interface EventSubscriptionCloseOptions {
  events: AbortController;
  watching: Promise<void>;
  closeServer: () => void;
  restoreCwd: () => void;
  restoreTmpDir?: () => void;
}

/** Stop the SSE request before waiting for its watcher to finish. */
export async function closeEventSubscription(
  options: EventSubscriptionCloseOptions,
): Promise<void> {
  try {
    options.events.abort();
    await options.watching;
  } finally {
    try {
      options.closeServer();
    } finally {
      try {
        options.restoreCwd();
      } finally {
        options.restoreTmpDir?.();
      }
    }
  }
}

export const sdkSessionFactory: AgentSessionFactory = {
  async start({ cwd, title, tmpDir, onStatus }): Promise<AgentSession> {
    const previous = process.cwd();
    process.chdir(cwd);
    const restoreTmpDir = tmpDir ? setTmpDir(tmpDir) : undefined;
    let server: { close(): void } | undefined;
    try {
      const opened = await createOpencode({
        hostname: "127.0.0.1",
        timeout: 20_000,
      });
      server = opened.server;
      const client = opened.client;

      const created = await client.session.create({
        body: { title },
      });
      const id = created.data?.id ?? "";
      let closed = false;
      let resolveRefusal: (message: string) => void = () => {};
      const refusal = new Promise<string>((resolve) => {
        resolveRefusal = resolve;
      });
      const eventAbort = new AbortController();
      const events = await client.event.subscribe({
        signal: eventAbort.signal,
      });
      const completion = observeSessionCompletion(
        events.stream,
        id,
        (event) => {
          const update = sessionStatusStateOf(event, id);
          if (update) onStatus?.(update);
        },
      );
      const watching = watchPermissionRequests({
        events: completion.events,
        worktreePath: cwd,
        reject: async (request) => {
          await client.postSessionIdPermissionsPermissionId({
            path: { id: request.sessionID, permissionID: request.permissionID },
            body: { response: "reject" },
          });
        },
        onRefusal: resolveRefusal,
      });

      return {
        id,
        prompt({ agent, text }): Promise<AgentResult> {
          return promptAsyncUntilComplete({
            agent,
            submit: () =>
              client.session.promptAsync({
                path: { id },
                body: { parts: [{ type: "text", text }], agent },
              }),
            waitForIdle: completion.waitForIdle,
            refusal,
            readMessages: () => client.session.messages({ path: { id } }),
          });
        },
        async abort(): Promise<void> {
          try {
            await client.session.abort({ path: { id } });
          } catch {
            // abort is best-effort; close() still terminates the server
          }
        },
        async close(): Promise<void> {
          if (closed) return Promise.resolve();
          closed = true;
          await closeEventSubscription({
            events: eventAbort,
            watching,
            closeServer: () => server?.close(),
            restoreCwd: () => process.chdir(previous),
            restoreTmpDir,
          });
        },
      };
    } catch (error) {
      server?.close();
      process.chdir(previous);
      restoreTmpDir?.();
      throw error;
    }
  },
};
