/**
 * Tests for refusing external-directory permission requests (TASK-5).
 *
 * The live server emitted `permission.asked` and waited for a human, stalling
 * the controller. TypeScript must recognise the request, reply `reject`
 * immediately, and record the refusal as evidence. Broad external access is
 * never auto-approved.
 */

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  isExternalDirectoryRequest,
  type PermissionRequest,
  permissionRequestOf,
  watchPermissionRequests,
} from "../src/runner/permissions.ts";

const ASKED = {
  type: "permission.asked",
  properties: {
    id: "perm-1",
    sessionID: "ses-1",
    permission: "external_directory",
    patterns: ["/outside-worktree"],
    metadata: {},
    always: false,
    tool: "read",
  },
};

async function* streamOf(
  events: unknown[],
): AsyncGenerator<unknown, void, unknown> {
  for (const event of events) {
    yield event;
    await Promise.resolve();
  }
}

describe("permission request parsing", () => {
  test("parses a live permission.asked event", () => {
    assert.deepEqual(permissionRequestOf(ASKED), {
      sessionID: "ses-1",
      permissionID: "perm-1",
      type: "external_directory",
      patterns: ["/outside-worktree"],
    });
  });

  test("accepts the SDK declared permission.updated spelling", () => {
    const updated = { ...ASKED, type: "permission.updated" };
    assert.equal(permissionRequestOf(updated)?.permissionID, "perm-1");
  });

  test("ignores non-permission events and malformed payloads", () => {
    assert.equal(
      permissionRequestOf({ type: "session.idle", properties: {} }),
      null,
    );
    assert.equal(
      permissionRequestOf({ type: "permission.asked", properties: {} }),
      null,
    );
    assert.equal(permissionRequestOf(null), null);
    assert.equal(permissionRequestOf("permission.asked"), null);
  });

  test("retains compatibility with the stale SDK permission fields", () => {
    const single = {
      type: "permission.asked",
      properties: { id: "p", sessionID: "s", type: "edit", pattern: "/tmp/x" },
    };
    assert.deepEqual(permissionRequestOf(single)?.patterns, ["/tmp/x"]);
    const none = {
      type: "permission.asked",
      properties: { id: "p", sessionID: "s", type: "edit" },
    };
    assert.deepEqual(permissionRequestOf(none)?.patterns, []);
  });
});

describe("external directory detection", () => {
  const root = "/work/task";

  test("flags the external_directory permission type", () => {
    const req = permissionRequestOf(ASKED) as PermissionRequest;
    assert.equal(isExternalDirectoryRequest(req, root), true);
  });

  test("flags a path outside the worktree", () => {
    const req = permissionRequestOf({
      type: "permission.asked",
      properties: {
        id: "p",
        sessionID: "s",
        type: "edit",
        pattern: "/etc/passwd",
      },
    }) as PermissionRequest;
    assert.equal(isExternalDirectoryRequest(req, root), true);
  });

  test("does not flag a path inside the worktree", () => {
    const req = permissionRequestOf({
      type: "permission.asked",
      properties: {
        id: "p",
        sessionID: "s",
        type: "edit",
        pattern: `${root}/src/a.ts`,
      },
    }) as PermissionRequest;
    assert.equal(isExternalDirectoryRequest(req, root), false);
  });
});

describe("permission watcher", () => {
  test("rejects an external-directory request and records refusal evidence", async () => {
    const rejected: PermissionRequest[] = [];
    const refusals: string[] = [];
    await watchPermissionRequests({
      events: streamOf([ASKED, { type: "session.idle", properties: {} }]),
      worktreePath: "/work/task",
      reject: (req) => {
        rejected.push(req);
        return Promise.resolve();
      },
      onRefusal: (message) => refusals.push(message),
    });
    assert.equal(rejected.length, 1);
    assert.equal(rejected[0].permissionID, "perm-1");
    assert.equal(refusals.length, 1);
    assert.match(refusals[0], /^Blocked:.*external/i);
  });

  test("does not reply to in-worktree requests", async () => {
    const inside = {
      type: "permission.asked",
      properties: {
        id: "perm-2",
        sessionID: "ses-1",
        type: "edit",
        pattern: "/work/task/src/a.ts",
      },
    };
    const rejected: PermissionRequest[] = [];
    const refusals: string[] = [];
    await watchPermissionRequests({
      events: streamOf([inside]),
      worktreePath: "/work/task",
      reject: (req) => {
        rejected.push(req);
        return Promise.resolve();
      },
      onRefusal: (message) => refusals.push(message),
    });
    assert.equal(rejected.length, 0);
    assert.equal(refusals.length, 0);
  });

  test("records a refusal when the reject reply itself fails", async () => {
    const refusals: string[] = [];
    await watchPermissionRequests({
      events: streamOf([ASKED]),
      worktreePath: "/work/task",
      reject: () => Promise.reject(new Error("server gone")),
      onRefusal: (message) => refusals.push(message),
    });
    assert.equal(refusals.length, 1);
    assert.match(refusals[0], /^Blocked:.*external/i);
  });
});
