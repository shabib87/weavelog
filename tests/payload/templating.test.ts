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
const agents = readFileSync(
	new URL("../../payload/AGENTS.md", import.meta.url),
	"utf8",
);

test("researcher.md uses FLIGHTLEAD_HOME placeholder and no absolute home paths", () => {
	assert.ok(researcher.includes("{{FLIGHTLEAD_HOME}}"));
	assert.ok(!researcher.includes("/Users/"));
});

test("implementer.md uses both home placeholders and no absolute home paths", () => {
	assert.ok(implementer.includes("{{FLIGHTLEAD_CONFIG_HOME}}"));
	assert.ok(implementer.includes("{{FLIGHTLEAD_HOME}}"));
	assert.ok(!implementer.includes("/Users/"));
});

test("payload AGENTS.md references flightlead sync and no runbook machinery", () => {
	assert.ok(agents.includes("flightlead sync"));
	assert.ok(!agents.includes("AGENT-STACK-RUNBOOK.md"));
	assert.ok(!agents.includes("config-sync.ts"));
});