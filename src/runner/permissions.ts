/**
 * Refuse external-directory permission requests (TASK-5).
 *
 * The live OpenCode server emits `permission.asked` and waits for a human.
 * In the bounded controller there is no human, so a request that reaches
 * outside the task worktree is rejected immediately and recorded as refusal
 * evidence. Broad external access is never auto-approved.
 */

import { isAbsolute, relative, resolve } from "node:path";

export interface PermissionRequest {
  sessionID: string;
  permissionID: string;
  type: string;
  patterns: string[];
}

interface RawPermissionEvent {
  type?: unknown;
  properties?: {
    id?: unknown;
    sessionID?: unknown;
    permission?: unknown;
    patterns?: unknown;
    type?: unknown;
    pattern?: unknown;
  };
}

/** Both the live spelling and the SDK-declared spelling are accepted. */
const PERMISSION_EVENT_TYPES = new Set([
  "permission.asked",
  "permission.updated",
]);

function text(value: unknown): string {
  return typeof value === "string" ? value : String(value);
}

/** Normalize a permission event; returns null for anything else. */
export function permissionRequestOf(event: unknown): PermissionRequest | null {
  if (!event || typeof event !== "object") return null;
  const e = event as RawPermissionEvent;
  if (typeof e.type !== "string" || !PERMISSION_EVENT_TYPES.has(e.type)) {
    return null;
  }
  const props = e.properties;
  if (
    !props ||
    typeof props.id !== "string" ||
    typeof props.sessionID !== "string"
  ) {
    return null;
  }
  const rawPattern = props.patterns ?? props.pattern;
  const patterns =
    rawPattern === undefined
      ? []
      : Array.isArray(rawPattern)
        ? rawPattern.map(text)
        : [text(rawPattern)];
  return {
    sessionID: props.sessionID,
    permissionID: props.id,
    type:
      typeof props.permission === "string"
        ? props.permission
        : typeof props.type === "string"
          ? props.type
          : "unknown",
    patterns,
  };
}

function isInside(child: string, root: string): boolean {
  const rel = relative(resolve(root), resolve(child));
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

/**
 * True when the request declares `external_directory` or names any path
 * outside the worktree.
 */
export function isExternalDirectoryRequest(
  request: PermissionRequest,
  worktreePath: string,
): boolean {
  if (request.type === "external_directory") return true;
  return request.patterns.some((pattern) => !isInside(pattern, worktreePath));
}

export interface PermissionWatchOptions {
  events: AsyncIterable<unknown>;
  worktreePath: string;
  reject: (request: PermissionRequest) => Promise<void>;
  onRefusal: (message: string) => void;
  signal?: AbortSignal;
}

/**
 * Consume the server event stream and reject every external-directory request.
 * Each rejection (or failed rejection) appends refusal evidence.
 */
export async function watchPermissionRequests(
  opts: PermissionWatchOptions,
): Promise<void> {
  try {
    for await (const event of opts.events) {
      if (opts.signal?.aborted) return;
      const request = permissionRequestOf(event);
      if (!request) continue;
      if (!isExternalDirectoryRequest(request, opts.worktreePath)) continue;
      const detail =
        request.patterns.length > 0
          ? request.patterns.join(", ")
          : request.type;
      try {
        await opts.reject(request);
        opts.onRefusal(
          `Blocked: external-directory permission rejected (${detail})`,
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        opts.onRefusal(
          `Blocked: external-directory permission rejected (${detail}): ${message}`,
        );
      }
    }
  } catch {
    // Stream aborted or errored: stop watching; session close still runs.
  }
}
