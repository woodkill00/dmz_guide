import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { validatePack } from "../../src/content/validate.mjs";
import { parseTransfer, exportContent } from "../../src/content/portable.mjs";
import { upgradeFixture } from "../helpers/upgrades.mjs";
import { loadFixturePack } from "../helpers/catalog.mjs";
const schema = JSON.parse(
  await readFile(new URL("../../schemas/pack.schema.json", import.meta.url)),
);
test("v1 remains readable and v2 unknown facts survive portable roundtrip", async () => {
  validatePack(loadFixturePack("demo-training"), schema);
  const p = upgradeFixture();
  p.objectives[0].requirements[0].quantity = null;
  p.objectives[0].requirements[0].consumption = "unknown";
  p.sources[0].url = null;
  p.sources[0].provenance.kind = "private-observation";
  p.sources[0].type = "observation";
  validatePack(p, schema);
  assert.deepEqual(
    (await parseTransfer(exportContent(p, schema), schema)).pack,
    p,
  );
});
test("private URL exception is typed and strict; quantities and evidence bounded", () => {
  for (const mutate of [
    (p) => (p.sources[0].url = null),
    (p) => (p.sources[0].url = "javascript:alert(1)"),
    (p) => (p.objectives[0].requirements[0].quantity = 1000001),
    (p) => (p.objectives[0].requirements[0].consumption = "maybe"),
    (p) => (p.objectives[0].upgrade.tierLabel = "x".repeat(21)),
    (p) => (p.sources[0].provenance.captureDate = "2026-02-30"),
  ]) {
    const p = upgradeFixture();
    mutate(p);
    assert.throws(() => validatePack(p, schema));
  }
});
test("v1 does not silently accept v2 facts or nullable source", () => {
  const p = upgradeFixture();
  p.schemaVersion = 1;
  assert.throws(() => validatePack(p, schema));
});
test("observed catalog has exactly admitted public facts, no invented consumption or prerequisites", () => {
  const p = loadFixturePack("upgrade-observations");
  validatePack(p, schema);
  assert.equal(p.schemaVersion, 2);
  assert.equal(p.objectives.length, 8);
  assert.equal(p.items.length, 22);
  assert.equal(
    p.objectives.reduce((n, o) => n + o.requirements.length, 0),
    31,
  );
  assert(
    p.objectives.every(
      (o) =>
        o.prerequisites.length === 0 &&
        o.upgrade.prerequisiteStatus === "unknown" &&
        o.requirements.every((r) => r.consumption === "unknown"),
    ),
  );
  assert(
    p.sources.every(
      (s) =>
        s.url === null &&
        s.provenance.captureDate === null &&
        s.provenance.buildStatus === "unknown",
    ),
  );
});
