import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const manifest = JSON.parse(
  readFileSync(new URL("../../weavelog.json", import.meta.url), "utf8"),
);

test("weavelog.json declares at least six models", () => {
  assert.ok(manifest.models.length >= 6);
});

test("weavelog.json proxy port is 8788", () => {
  assert.equal(manifest.proxyPort, 8788);
});

test("every tool entry declares channel, version and check", () => {
  for (const [name, spec] of Object.entries(manifest.tools)) {
    assert.ok(spec.channel, `${name} missing channel`);
    assert.ok(spec.version, `${name} missing version`);
    assert.ok(spec.check, `${name} missing check`);
  }
});
