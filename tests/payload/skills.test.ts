import assert from "node:assert/strict";
import { lstatSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const SKILLS_ROOT = new URL("../../payload/skills/", import.meta.url);
const SKILLS_DIR = fileURLToPath(SKILLS_ROOT);

function walkSymlinks(dir: string): string[] {
  const links: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = lstatSync(full);
    if (stat.isSymbolicLink()) {
      links.push(full);
    } else if (stat.isDirectory()) {
      links.push(...walkSymlinks(full));
    }
  }
  return links;
}

test("payload/skills contains no symlinks", () => {
  assert.deepEqual(walkSymlinks(SKILLS_DIR), []);
});

test("every payload skill declares license and upstream", () => {
  const skills = readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
  assert.ok(skills.length > 0);
  for (const skill of skills) {
    const content = readFileSync(
      new URL(`${skill}/SKILL.md`, SKILLS_ROOT),
      "utf8",
    );
    assert.ok(
      /^license: /m.test(content),
      `${skill}/SKILL.md missing license line`,
    );
    assert.ok(
      /^upstream:/m.test(content),
      `${skill}/SKILL.md missing upstream line`,
    );
  }
});

test("payload/skills excludes diagram-design and in-my-voice", () => {
  const skills = readdirSync(SKILLS_DIR);
  assert.ok(!skills.includes("diagram-design"));
  assert.ok(!skills.includes("in-my-voice"));
});
