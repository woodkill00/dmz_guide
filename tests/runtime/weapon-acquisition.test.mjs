import test from "node:test";
import assert from "node:assert/strict";
import { readWeaponAcquisition } from "../../src/content/weapon-acquisition.mjs";
import {
  validateAcquisitionCatalog,
  editAcquisition,
  acquisitionRows,
  blueprintOwnedName,
  extractionCount,
  normalizeBlueprintName,
} from "../../src/domain/weapon-acquisition.mjs";
import {
  emptyArmory,
  validateArmory,
  parseArmoryBackup,
} from "../../src/domain/armory-workspace.mjs";
const catalog = await readWeaponAcquisition();
const exportArmory = (workspace) =>
  JSON.stringify({ format: "dmz-armory-backup", version: 1, workspace });
test("088 released roster and named blueprint snapshot are source-backed and collision-free", () => {
  assert.equal(catalog.weapons.length, 35);
  assert.equal(catalog.blueprints.length, 85);
  assert(catalog.weapons.some((w) => w.id === "cronen-osprey"));
  assert(catalog.weapons.some((w) => w.id === "csg-35"));
  assert(
    !catalog.weapons.some((w) => w.id === "jak-12" || w.id === "talonhawk"),
  );
  assert.equal(catalog.weapons.filter((w) => w.category === "melee").length, 1);
  assert.match(catalog.coverage, /incomplete/);
  assert(catalog.blueprints.some((b) => b.variant === "BlackCell"));
  assert(catalog.sources.some((s) => s.status === "reported"));
  assert.equal(
    new Set(
      catalog.blueprints.map(
        (b) => b.weapon + "|" + normalizeBlueprintName(blueprintOwnedName(b)),
      ),
    ).size,
    85,
  );
});
test("088 public admission rejects malformed, oversized, unsafe, dangling and colliding facts", () => {
  const reject = (fn, pattern) => {
    const c = structuredClone(catalog);
    fn(c);
    assert.throws(() => validateAcquisitionCatalog(c), pattern);
  };
  reject((c) => (c.sources[0].url = "https://evil.example/data"), /Unsafe/);
  reject(
    (c) => (c.sources[0].url = "https://user:secret@www.callofduty.com/data"),
    /Unsafe/,
  );
  reject((c) => (c.sources[0].date = "2026-02-30"), /date/);
  reject((c) => (c.weapons[0].name = "a".repeat(101)), /text/);
  reject((c) => (c.blueprints[0].method = "a".repeat(501)), /text/);
  reject((c) => (c.weapons[0].category = "invented"), /category/);
  reject((c) => {
    c.weapons[0].id = "constructor";
  }, /Invalid acquisition ID/);
  reject((c) => (c.blueprints[0].sourceIds = ["missing"]), /source/);
  reject((c) => (c.blueprints[0].weapon = "missing"), /weapon/);
  reject((c) => c.weapons.push(c.weapons[0]), /Duplicate/);
  reject((c) => {
    const b = c.blueprints[0];
    c.blueprints.push({
      ...b,
      id: "collision",
      name: b.name + " · BlackCell",
      variant: "",
    });
    b.variant = "BlackCell";
  }, /Duplicate/);
  reject(
    (c) =>
      c.blueprints.push({
        ...c.blueprints[0],
        id: "case-dupe",
        name: "  " + c.blueprints[0].name.toUpperCase() + "  ",
      }),
    /Duplicate/,
  );
  reject((c) => (c.coverage = "a".repeat(1001)), /limit|text/);
  reject((c) => (c.blueprints = Array(513).fill(c.blueprints[0])), /limit/);
  reject((c) => {
    c.blueprints = Array.from({ length: 512 }, (_, i) => ({
      ...c.blueprints[0],
      id: "budget-" + i,
      method: "猫".repeat(500),
    }));
  }, /byte limit/);
  reject((c) => {
    c.injected = Array(25001).fill(0);
  }, /node limit/);
  reject(
    (c) =>
      (c.coverage = {
        a: { a: { a: { a: { a: { a: { a: { a: { a: "nested" } } } } } } } },
      }),
    /nesting/i,
  );
});
test("088 manual ownership and extracted count remain independent, immutable and bounded", () => {
  const old = emptyArmory();
  old.acquisition.m4 = {
    manual: true,
    attachments: ["archived-attachment"],
    blueprints: ["User custom"],
  };
  old.acquisition["archived-gun"] = {
    manual: true,
    attachments: [],
    blueprints: ["Archived"],
  };
  const before = JSON.stringify(old);
  assert.throws(
    () => editAcquisition(old, "constructor", { kind: "count", value: 1 }),
    /Invalid weapon ID/,
  );
  assert.equal(extractionCount(old.acquisition.m4), null);
  validateArmory(old);
  let next = old;
  for (const n of [0, 1, 2, 3, 2, 19]) {
    next = editAcquisition(next, "m4", { kind: "count", value: n });
    assert.equal(next.acquisition.m4.manualExtractions, n);
    assert.equal(next.acquisition.m4.manual, true);
  }
  assert.deepEqual(
    next.acquisition["archived-gun"],
    old.acquisition["archived-gun"],
  );
  assert.equal(JSON.stringify(old), before);
  assert.deepEqual(next.acquisition.m4.attachments, ["archived-attachment"]);
  assert.deepEqual(next.acquisition.m4.blueprints, ["User custom"]);
  next = editAcquisition(next, "m4", { kind: "manual", value: false });
  assert.equal(next.acquisition.m4.manualExtractions, 19);
  for (const n of [-1, 1.5, 10000, NaN, Infinity, null, "3"])
    assert.throws(
      () => editAcquisition(old, "m4", { kind: "count", value: n }),
      /count/,
    );
  assert.throws(
    () =>
      validateArmory({
        ...next,
        acquisition: { m4: { ...next.acquisition.m4, unknownField: true } },
      }),
    /fields/,
  );
});
test("088 normalized blueprint ownership preserves custom names and distinct variants", () => {
  let p = emptyArmory();
  p = editAcquisition(p, "m4", {
    kind: "blueprint",
    name: " Inner   Circuit ",
    owned: true,
  });
  p = editAcquisition(p, "m4", {
    kind: "blueprint",
    name: "inner circuit",
    owned: true,
  });
  assert.equal(p.acquisition.m4.blueprints.length, 1);
  assert.equal(extractionCount(p.acquisition.m4), null);
  assert.equal(p.acquisition.m4.manual, false);
  p = editAcquisition(p, "m4", {
    kind: "blueprint",
    name: "Inner Circuit · BlackCell",
    owned: true,
  });
  p = editAcquisition(p, "m4", {
    kind: "blueprint",
    name: "Custom unknown",
    owned: true,
  });
  let r = acquisitionRows(catalog, p).find((w) => w.id === "m4");
  assert.equal(r.ownedKnown, 1);
  assert(r.custom.includes("Custom unknown"));
  p = editAcquisition(p, "m4", {
    kind: "blueprint",
    name: "inner circuit",
    owned: false,
  });
  assert.equal(p.acquisition.m4.blueprints.length, 2);
  assert(p.acquisition.m4.blueprints.includes("Inner Circuit · BlackCell"));
});
test("088 legacy and extended armory backup round trips retain count and unrelated records", () => {
  const old = emptyArmory();
  validateArmory(old);
  const next = editAcquisition(old, "csg-35", { kind: "count", value: 3 });
  assert.deepEqual(parseArmoryBackup(exportArmory(next)), next);
  assert.deepEqual(parseArmoryBackup(exportArmory(old)), old);
  const row = acquisitionRows(catalog, next).find((w) => w.id === "csg-35");
  assert.equal(row.reached, true);
  assert.equal(row.entry.manual, false);
});
