import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";

/**
 * Publish gate (TASK-63 AC#6/AC#8): the deterministic boundary that keeps
 * publication human-controlled. Publishing is refused unless every task in
 * the release closure set is Done and the human-controlled
 * WEAVELOG_PUBLISH_APPROVED marker is present and well-formed. It fails
 * closed: a missing or malformed marker blocks the release.
 */

export const CLOSURE_SET = [
  "TASK-3",
  "TASK-4",
  "TASK-5",
  "TASK-7",
  "TASK-29",
  "TASK-30",
  "TASK-53",
  "TASK-54",
  "TASK-62",
  "TASK-63",
  "TASK-64",
  "TASK-66",
  "TASK-67",
  "TASK-68",
  "TASK-73",
  "TASK-55",
] as const;

const MARKER = /^TASK-67:\d{4}-\d{2}-\d{2}$/;

export interface PublishGateInput {
  statuses: Record<string, string>;
  marker: string | undefined;
}

export interface PublishGateResult {
  ok: boolean;
  failures: string[];
  detail: string;
}

export function evaluatePublishGate(
  input: PublishGateInput,
): PublishGateResult {
  const failures: string[] = [];
  const statuses = input.statuses ?? {};
  const open = CLOSURE_SET.filter(
    (id) => (statuses[id] ?? "").trim().toLowerCase() !== "done",
  );
  if (open.length > 0) {
    failures.push(`closure set not Done: ${open.join(", ")}`);
  }

  const marker = (input.marker ?? "").trim();
  if (marker === "") {
    failures.push("publish marker is unset (WEAVELOG_PUBLISH_APPROVED)");
  } else if (!MARKER.test(marker)) {
    failures.push(
      `publish marker malformed: expected TASK-67:YYYY-MM-DD, got "${marker}"`,
    );
  }

  const ok = failures.length === 0;
  return {
    ok,
    failures,
    detail: ok
      ? "publish-gate: closure set Done and human publish marker set"
      : `publish-gate: ${failures.join("; ")}`,
  };
}

export function parseTaskStatuses(
  files: Array<{ content: string }>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const { content } of files) {
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    if (!match) continue;
    try {
      const fm = parseYaml(match[1]) as { id?: unknown; status?: unknown };
      if (fm && typeof fm.id === "string" && typeof fm.status === "string") {
        out[fm.id] = fm.status;
      }
    } catch {
      // ignore malformed frontmatter; a missing status fails closed upstream
    }
  }
  return out;
}

export function readBacklogStatuses(dir: string): Record<string, string> {
  if (!existsSync(dir)) return {};
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => ({ content: readFileSync(join(dir, f), "utf8") }));
  return parseTaskStatuses(files);
}

function main(): void {
  const [dir = "backlog/tasks"] = process.argv.slice(2);
  const result = evaluatePublishGate({
    statuses: readBacklogStatuses(dir),
    marker: process.env.WEAVELOG_PUBLISH_APPROVED,
  });
  console.log(result.detail);
  process.exit(result.ok ? 0 : 1);
}

if (
  process.argv[1] &&
  basename(fileURLToPath(import.meta.url)) === basename(process.argv[1])
) {
  main();
}
