import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const researcher = readFileSync(
	new URL("../../payload/config/agents/researcher.md", import.meta.url),
	"utf8",
);
const implementer = readFileSync(
	new URL("../../payload/config/agents/implementer.md", import.meta.url),
	"utf8",
);
const agents = readFileSync(new URL("../../payload/AGENTS.md", import.meta.url), "utf8");

test("researcher.md uses WEAVELOG_HOME placeholder and no absolute home paths", () => {
	assert.ok(researcher.includes("{{WEAVELOG_HOME}}"));
	assert.ok(!researcher.includes("/Users/"));
});

test("implementer.md uses both home placeholders and no absolute home paths", () => {
	assert.ok(implementer.includes("{{WEAVELOG_CONFIG_HOME}}"));
	assert.ok(implementer.includes("{{WEAVELOG_HOME}}"));
	assert.ok(!implementer.includes("/Users/"));
});

test("payload AGENTS.md references weavelog sync and no runbook machinery", () => {
	assert.ok(agents.includes("weavelog sync"));
	assert.ok(!agents.includes("AGENT-STACK-RUNBOOK.md"));
	assert.ok(!agents.includes("config-sync.ts"));
});
