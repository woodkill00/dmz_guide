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
test("observed catalog preserves 8/31/22 facts with separate scoped consumption confirmation, not verified prerequisites", () => {
  const p = loadFixturePack("upgrade-observations");
  validatePack(p, schema);
  assert.equal(p.schemaVersion, 2);
  const original = p.objectives.filter((o) => o.id.startsWith("observed:"));
  assert.equal(original.length, 8);
  assert.equal(p.items.filter((i) => i.id.startsWith("observed:")).length, 22);
  assert.equal(
    original.reduce(
      (n, o) =>
        n +
        o.requirements.filter((r) =>
          r.sourceIds.includes(
            "source:upgrade-consumption-confirmation-20261026",
          ),
        ).length,
      0,
    ),
    31,
  );
  assert(
    original.every(
      (o) =>
        o.prerequisites.length === 0 &&
        o.upgrade.prerequisiteStatus === "unknown" &&
        o.requirements
          .filter((r) =>
            r.sourceIds.includes(
              "source:upgrade-consumption-confirmation-20261026",
            ),
          )
          .every(
            (r) =>
              r.consumption === "consumed" &&
              r.sourceIds.includes(
                "source:upgrade-consumption-confirmation-20261026",
              ),
          ),
    ),
  );
  assert(
    p.sources
      .filter((s) => s.type === "observation")
      .every(
        (s) =>
          s.url === null &&
          s.provenance.captureDate === null &&
          s.provenance.buildStatus === "unknown",
      ),
  );
});

test("consumption amendment preserves original amounts/effects and observation identity", async () => {
  const pack = loadFixturePack("upgrade-observations");
  const seed = JSON.parse(
    await readFile(
      new URL(
        "../../specs/023-character-upgrade-planner/evidence/upgrade-observations.json",
        import.meta.url,
      ),
    ),
  );
  assert.equal(pack.contentVersion, "2026.10.28.1");
  assert.equal(pack.sources.filter((s) => s.type === "observation").length, 9);
  for (const old of seed.upgrades) {
    const current = pack.objectives.find((r) => r.id === `observed:${old.id}`);
    assert.equal(current.name, old.name);
    assert.equal(current.description, old.description);
    assert.deepEqual(current.upgrade.observationKeys, [old.evidenceKey]);
    assert.deepEqual(
      current.requirements
        .filter((r) =>
          r.sourceIds.includes(
            "source:upgrade-consumption-confirmation-20261026",
          ),
        )
        .map((c) => [
          pack.items.find((i) => i.id === c.itemId).name,
          c.quantity,
        ]),
      old.requirements.map((c) => [c.itemName, c.required]),
    );
  }
  const confirmation = pack.sources.find(
    (s) => s.id === "source:upgrade-consumption-confirmation-20261026",
  );
  assert.match(confirmation.supports, /owner reports/);
  assert.match(confirmation.supports, /not independent gameplay corroboration/);
});
