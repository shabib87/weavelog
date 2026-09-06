import assert from "node:assert/strict";
import { lstatSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const TAXONOMY = "[blocker|major|minor]";
const LEGACY = "[critical|major|minor]";
const VERDICT = "VERDICT:";

/** Grep a directory tree (one level of subdirs is enough here) for files
 *  containing a severity alternation. Returns repo-relative paths. */
function findTaxonomyCopies(): string[] {
	const dirs = [
		join(ROOT, "payload", "config"),
		join(ROOT, "payload", "skills"),
		join(ROOT, "src"),
	];
	const files: string[] = [];
	for (const dir of dirs) {
		const entries = readdirSync(dir, { withFileTypes: true });
		for (const entry of entries) {
			const full = join(dir, entry.name);
			if (entry.isDirectory()) {
				for (const sub of readdirSync(full)) {
					files.push(join(full, sub));
				}
			} else {
				files.push(full);
			}
		}
	}
	// Any file that still declares a severity taxonomy.
	const pattern = /\[\w+\|major\|\w+\]/;
	return files
		.filter((f) => lstatSync(f).isFile() && pattern.test(readFileSync(f, "utf8")))
		.map((f) => relative(ROOT, f))
		.sort();
}

describe("canary: severity taxonomy stays load-bearing in every copy", () => {
	const copies = findTaxonomyCopies();

	test("copy list is derived, non-empty, and covers the known taxonomy surfaces", () => {
		assert.ok(copies.length > 0);
		for (const expected of [
			"payload/config/prompts/reviewer.md",
			"payload/config/agents/security.md",
			"payload/config/agents/qa.md",
			"payload/config/prompts/plan-reviewer.md",
			"payload/skills/verify-with-criteria/SKILL.md",
			"src/reviewer-loop.ts",
		]) {
			assert.ok(copies.includes(expected), `missing ${expected}`);
		}
	});

	for (const file of copies) {
		test(`${file} carries [blocker|major|minor] and VERDICT:`, () => {
			const text = readFileSync(join(ROOT, file), "utf8");
			assert.ok(text.includes(TAXONOMY));
			assert.ok(text.includes(VERDICT));
			assert.ok(!text.includes(LEGACY));
		});
	}
});
