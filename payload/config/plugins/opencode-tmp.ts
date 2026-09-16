import { mkdirSync } from "node:fs";
import { join } from "node:path";

interface ShellEnvInput {
  cwd: string;
  sessionID?: string;
}

interface ShellEnvOutput {
  env: Record<string, string>;
}

function safeSessionSegment(sessionID: string | undefined): string {
  return sessionID ? sessionID.replace(/[^A-Za-z0-9_-]/g, "_") : "session";
}

export const WeavelogTmp = async () => {
  return {
    "shell.env": async (input: ShellEnvInput, output: ShellEnvOutput) => {
      const tmpdir = join(
        input.cwd,
        ".weavelog-tmp",
        safeSessionSegment(input.sessionID),
      );
      mkdirSync(tmpdir, { recursive: true });
      output.env.TMPDIR = tmpdir;
    },
  };
};
