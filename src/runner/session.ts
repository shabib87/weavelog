/**
 * Real AgentSessionFactory backed by the pinned @opencode-ai/sdk (TASK-3 proof).
 *
 * The SDK spawns `opencode serve` with no cwd option, so the process working
 * directory at createOpencode() time scopes the server (and its hooks) to the
 * task worktree. We chdir, start the server, and restore cwd on close.
 */

import { createOpencode } from "@opencode-ai/sdk";
import type {
  AgentModelIdentity,
  AgentResult,
  AgentSession,
  AgentSessionFactory,
} from "./types.js";

interface PromptInfo {
  providerID?: string;
  modelID?: string;
}

interface PromptPart {
  type?: string;
  text?: string;
}

function messageOf(error: unknown): string {
  if (!error) return "";
  if (typeof error === "string") return error;
  const e = error as { message?: string; data?: { message?: string } };
  return e.data?.message ?? e.message ?? JSON.stringify(error);
}

export const sdkSessionFactory: AgentSessionFactory = {
  async start({ cwd, title }): Promise<AgentSession> {
    const previous = process.cwd();
    process.chdir(cwd);
    let server: { close(): void } | undefined;
    try {
      const opened = await createOpencode({
        hostname: "127.0.0.1",
        timeout: 20_000,
      });
      server = opened.server;
      const client = opened.client;

      const created = (await client.session.create({
        body: { title },
      })) as { data?: { id?: string } };
      const id = String(created.data?.id ?? "");
      let closed = false;

      return {
        id,
        async prompt({ agent, text }): Promise<AgentResult> {
          const response = (await client.session.prompt({
            path: { id },
            body: { parts: [{ type: "text", text }], agent },
          })) as {
            data?: { info?: PromptInfo; parts?: PromptPart[] };
            error?: unknown;
          };
          const info = response.data?.info;
          const out = (response.data?.parts ?? [])
            .filter((part) => part.type === "text")
            .map((part) => part.text ?? "")
            .join("\n");
          const identity: AgentModelIdentity = {
            agent,
            providerID: info?.providerID,
            modelID: info?.modelID,
          };
          if (response.error) {
            return {
              text: out,
              error: {
                name: (response.error as { name?: string }).name ?? "Error",
                message: messageOf(response.error),
              },
              identity,
            };
          }
          return { text: out, identity };
        },
        async abort(): Promise<void> {
          try {
            await client.session.abort({ path: { id } });
          } catch {
            // abort is best-effort; close() still terminates the server
          }
        },
        close(): Promise<void> {
          if (closed) return Promise.resolve();
          closed = true;
          try {
            server?.close();
          } finally {
            process.chdir(previous);
          }
          return Promise.resolve();
        },
      };
    } catch (error) {
      server?.close();
      process.chdir(previous);
      throw error;
    }
  },
};
