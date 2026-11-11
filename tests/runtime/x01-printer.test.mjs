import test from "node:test";
import assert from "node:assert/strict";
import { loadFixturePack } from "../helpers/catalog.mjs";
import {
  x01Printer,
  validateX01Printer,
  x01Uses,
} from "../../src/content/x01-printer.mjs";
import { renderX01Printer } from "../../src/ui/x01-printer-page.mjs";
import { upgradeBudget } from "../../src/domain/upgrade-budget.mjs";
import { newProfile } from "../../src/domain/profile.mjs";
const pack = loadFixturePack("official-starter");
const expected = {
  "3.5-Plate Armor Vest": [
    ["Specter Fabric Sample", 1],
    ["Power Regulator", 2],
    ["Structural Alloy", 5],
  ],
  "Survivor Box": [
    ["SR-16 Bio Agent Sample", 1],
    ["Ballistic Fabric", 2],
    ["High-Tenacity Fibers", 3],
  ],
  "Argonaut Armor": [
    ["Specter Fabric Sample", 1],
    ["Alloyed Plating", 2],
    ["High-Tenacity Fibers", 5],
  ],
  "Encodable Blank Keycard": [
    ["Printed Circuit Board", 6],
    ["Control Unit", 8],
  ],
  "Staff Emergency Exfil Keycard": [
    ["CPU", 2],
    ["Printed Circuit Board", 4],
    ["Control Unit", 8],
  ],
  "Experimental Compounds": [
    ["Volatile Explosives", 2],
    ["Binding Catalysts", 5],
  ],
  "Military Composites": [
    ["Nylon Laminate", 2],
    ["Nylon Cloth", 5],
  ],
  "Nano-Structured Alloy": [
    ["Turned Components", 2],
    ["Structural Alloy", 5],
  ],
  "Prototype RF Module": [
    ["Power Regulator", 2],
    ["CPU", 5],
  ],
};
test("all nine source recipes retain their exact reported material quantities and categories", () => {
  assert.equal(validateX01Printer(x01Printer, pack), x01Printer);
  assert.equal(x01Printer.recipes.length, 9);
  assert.deepEqual(
    x01Printer.recipes.map((r) => r.name).sort(),
    Object.keys(expected).sort(),
  );
  for (const r of x01Printer.recipes) {
    assert.deepEqual(
      r.materials.map((c) => [c.name, c.quantity]),
      expected[r.name],
    );
    assert(!Object.hasOwn(r, "yield"));
  }
  assert.equal(new Set(x01Printer.recipes.map((r) => r.category)).size, 5);
  assert.equal(x01Printer.inventoryContext, "carried-backpack");
});
test("existing Legendary items and explicit singular/plural catalyst identity are reused", () => {
  for (const [name, id] of [
    ["Experimental Compounds", "mw4:ingredient-experimental-compounds"],
    ["Military Composites", "mw4:ingredient-military-composites"],
    ["Nano-Structured Alloy", "mw4:ingredient-nano-structured-alloy"],
    ["Prototype RF Module", "mw4:ingredient-prototype-rf-module"],
  ]) {
    assert.equal(x01Printer.recipes.find((r) => r.name === name).itemId, id);
    assert.equal(pack.items.filter((i) => i.name === name).length, 1);
  }
  const r = x01Printer.recipes.find((r) => r.name === "Experimental Compounds");
  const c = r.materials.find((c) => c.name === "Binding Catalysts");
  assert.equal(c.itemId, "mw4:binding-catalyst");
  assert(
    pack.items
      .find((i) => i.id === c.itemId)
      .aliases.includes("Binding Catalysts"),
  );
});
test("X01 remains separate from 95 executable FOB records and upgrade forecasts", () => {
  assert.equal(pack.recipes.length, 95);
  const profile = newProfile(pack);
  for (const i of pack.items) profile.inventory[i.id] = 1000;
  for (const o of pack.objectives.filter(
    (o) => o.track === "dmz-upgrade" && o.name.includes("Ingredient Printing"),
  ))
    profile.upgradeProgress[o.id] = {
      completion: "completed",
      availability: "unknown",
      reviewRequired: false,
    };
  const before = JSON.stringify(profile);
  const b = upgradeBudget(pack, profile);
  assert.equal(b.status, "ok");
  for (const r of x01Printer.recipes) {
    assert(!pack.recipes.some((c) => c.output.itemId === r.itemId));
    const row = b.items.find((i) => i.id === r.itemId);
    if (row) {
      assert.equal(row.printable, 0);
      assert.match(row.printReason, /FOB/);
    }
  }
  assert.equal(JSON.stringify(profile), before);
});
for (const [name, edit] of [
  ["zero input", (r) => (r.recipes[0].materials[0].quantity = 0)],
  ["fractional input", (r) => (r.recipes[0].materials[0].quantity = 1.5)],
  ["duplicate output", (r) => r.recipes.push(structuredClone(r.recipes[0]))],
  ["missing item", (r) => (r.recipes[0].itemId = "missing:item")],
  ["unknown fields", (r) => (r.script = "alert(1)")],
  ["wrong station", (r) => (r.station = "3D Printer")],
  ["wrong inventory context", (r) => (r.inventoryContext = "FOB")],
  ["source scheme", (r) => (r.source.url = "javascript:alert(1)")],
  [
    "duplicate input",
    (r) =>
      r.recipes[0].materials.push(structuredClone(r.recipes[0].materials[0])),
  ],
])
  test("X01 reference rejects " + name, () => {
    const copy = structuredClone(x01Printer);
    edit(copy);
    assert.throws(() => validateX01Printer(copy, pack));
  });
test("X01 source and rendered views are read-only references with links, no false readiness or slot stats", () => {
  const text = renderX01Printer([pack]);
  assert.equal((text.match(/data-x01-recipe=/g) || []).length, 9);
  assert.match(text, /carried|backpack/);
  assert.match(text, /GameRant/);
  assert.match(text, /Production Assembly/);
  assert(!text.includes("data-craft-id"));
  assert(!text.includes("4 armor plates"));
  assert.equal(
    (renderX01Printer([pack], { embedded: true }).match(/<h2>/g) || []).length,
    1,
  );
  assert(x01Uses("mw4:binding-catalyst"));
  assert(!x01Uses("mw4:medkit"));
  assert.match(renderX01Printer([]), /not included/);
});
