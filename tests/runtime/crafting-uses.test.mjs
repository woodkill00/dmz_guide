import { test } from "node:test";
import assert from "node:assert/strict";
import { loadFixturePack } from "../helpers/catalog.mjs";
import intel from "../../src/content/tcno-item-intel.json" with { type: "json" };
import { x01Printer } from "../../src/content/x01-printer.mjs";
import {
  buildCraftingUses,
  visibleCraftingMethods,
  craftingInputAmounts,
  craftReferenceAnchor,
} from "../../src/domain/crafting-uses.mjs";
import {
  renderCraftingUses,
  craftingItemLink,
} from "../../src/ui/crafting-uses.mjs";
import { itemUses } from "../../src/domain/item-uses.mjs";
import { renderTcnoItemIntel } from "../../src/ui/tcno-item-intel.mjs";
import { recordUrl, allRecords, renderDetail } from "../../src/ui/render.mjs";
const fixture = () => ({
  id: "fixture:craft",
  contentVersion: "1",
  items: [
    { id: "a", name: "A" },
    { id: "b", name: "B" },
    { id: "c", name: "C" },
  ],
  recipes: [],
  objectives: [],
  guides: [],
  locations: [],
  maps: [],
});
const recipe = (id, quantity = 2) => ({
  id,
  name: id,
  inputs: [{ itemId: "a", quantity, consumption: "consumed" }],
  output: { itemId: "c", quantity: 1 },
  station: "Fixture station",
  prerequisites: [],
});

test("crafting layout has one production section and one output button, without duplicate source recipes", () => {
  const pack = loadFixturePack("official-starter");
  const item = allRecords([pack]).find((r) => r.id === "mw4:medkit");
  const html = renderDetail(item, [pack]);
  assert.equal((html.match(/<h3>Make this item<\/h3>/g) || []).length, 1);
  assert.ok(!html.includes("Recipes making this item"));
  assert.ok(!html.includes("Source crafting &amp; unlock references"));
  const p = fixture();
  p.recipes = [recipe("one"), recipe("two", 3)];
  const uses = renderCraftingUses(p.items[0], p, recordUrl);
  assert.equal(
    (uses.match(/class="item-craft-button(?: [^"\n]*)?"/g) || []).length,
    1,
  );
  assert.equal((uses.match(/data-craft-method=/g) || []).length, 2);
  assert.ok(uses.includes('<details class="item-craft-methods">'));
});
test("consolidation retains blueprint collectible references that have a different output", () => {
  const pack = loadFixturePack("official-starter");
  const unlock = intel.unlocks.find(
    (u) =>
      u.kind === "blueprint" &&
      intel.mapping[u.id] &&
      intel.mapping[u.outputItemId] &&
      intel.mapping[u.id] !== intel.mapping[u.outputItemId],
  );
  assert.ok(unlock);
  const item = pack.items.find((i) => i.id === intel.mapping[unlock.id]);
  const html = renderTcnoItemIntel(
    item,
    pack,
    (id) => `<a href="/local/?id=${id}">${id}</a>`,
    { omitCoveredRecipes: true },
  );
  assert.ok(html.includes(unlock.name));
});

test("crafting buttons use output-item icons for recipes and preserve accessible names and private links", () => {
  const p = fixture(),
    r = recipe("r");
  p.recipes = [r];
  const html = craftingItemLink(
    { ...r, recordType: "recipe" },
    p,
    (row) => `/local/?id=${row.id}`,
  );
  assert.ok(/class="item-craft-button(?: [^"\n]*)?"/.test(html));
  assert.ok(html.includes('data-inventory-icon="c"'));
  assert.ok(!html.includes('data-inventory-icon="r"'));
  assert.ok(html.includes('aria-hidden="true"'));
  assert.ok(html.includes('href="/local/?id=r"'));
  assert.match(html, /<span class="item-card__name[^"]*">r<\/span>/);
});

test("exact methods merge; differing costs, contexts, other inputs and prerequisites remain distinct", () => {
  const p = fixture();
  p.recipes = [
    recipe("r1"),
    recipe("r2"),
    recipe("r3", 3),
    { ...recipe("r4"), station: "Other station" },
    {
      ...recipe("r5"),
      inputs: [
        { itemId: "a", quantity: 2 },
        { itemId: "b", quantity: 1 },
      ],
    },
    { ...recipe("r6"), prerequisites: ["b"] },
  ];
  const i = buildCraftingUses(p);
  assert.equal(i.methods.length, 5);
  assert.equal(i.methods[0].references.length, 2);
  assert.equal(i.uses.get("a").length, 5);
  assert.equal(
    i.methods.some((m) => m.inputs.some((x) => x.quantity === 3)),
    true,
  );
});
test("unknown amounts remain unknown, repeated inputs total per consumption role", () => {
  const p = fixture();
  p.recipes = [
    {
      ...recipe("r"),
      inputs: [
        { itemId: "a", quantity: 2, consumed: true },
        { itemId: "a", quantity: 3, consumed: true },
        { itemId: "a", quantity: 1, consumed: false },
        { itemId: "a", quantity: 2, consumed: false },
        { itemId: "a", quantity: null },
      ],
    },
  ];
  const i = buildCraftingUses(p);
  assert.deepEqual(craftingInputAmounts(i.methods[0], "a"), [
    { role: "consumed", quantity: 5 },
    { role: "retained", quantity: 2 },
    { role: "unknown", quantity: null },
  ]);
  assert.equal(i.uses.get("a").length, 1);
});
test("source edges stay pack scoped; manuals excluded and missing references diagnosed", () => {
  const p = fixture(),
    source = {
      packId: p.id,
      source: "https://example.invalid/fixture",
      mapping: { one: "a", out: "c" },
      upgradeMap: {},
      unlocks: [
        {
          id: "u",
          kind: "blueprint",
          name: "Fixture blueprint",
          outputItemId: "out",
          requirements: [{ itemId: "one", amount: 3 }],
        },
        {
          id: "m",
          kind: "manual",
          requirements: [{ itemId: "one", amount: 4 }],
        },
        {
          id: "bad",
          kind: "crafting",
          outputItemId: "no",
          requirements: [{ itemId: "one", amount: 1 }],
        },
      ],
    };
  const i = buildCraftingUses(p, { intel: source, x01: null });
  assert.equal(i.methods.length, 1);
  assert.equal(i.edges.length, 2);
  assert.equal(i.issues[0].code, "unmapped-output");
  assert.equal(
    buildCraftingUses({ ...p, id: "other" }, { intel: source, x01: null })
      .methods.length,
    0,
  );
  p.recipes = [
    { ...recipe("broken"), inputs: [{ itemId: "missing", quantity: 1 }] },
  ];
  assert.equal(
    buildCraftingUses(p, { intel: null, x01: null }).issues[0].code,
    "unmapped-input",
  );
});
test("spoilers on outputs, other ingredients, prerequisites and equivalent recipes never leak", () => {
  for (const target of ["output", "input", "prerequisite", "recipe"]) {
    const p = fixture();
    p.recipes = [recipe("visible")];
    if (target === "output") p.items[2].spoiler = true;
    if (target === "input") {
      p.items[1].spoiler = true;
      p.recipes[0].inputs.push({ itemId: "b", quantity: 1 });
    }
    if (target === "prerequisite") {
      p.items[1].spoiler = true;
      p.recipes[0].prerequisites = ["b"];
    }
    if (target === "recipe")
      p.recipes.push({ ...recipe("secret"), spoiler: true });
    const i = buildCraftingUses(p);
    assert.equal(visibleCraftingMethods(p, i.methods).length, 0, target);
    assert.ok(visibleCraftingMethods(p, i.methods, true).length > 0);
  }
});
test("all captured ingredient edges have linked outputs and method targets; no catalog mutation", () => {
  const p = loadFixturePack("official-starter"),
    before = JSON.stringify(p),
    i = buildCraftingUses(p),
    items = new Map(p.items.map((r) => [r.id, r]));
  const expected = [
    ...p.recipes.flatMap((r) =>
      r.inputs.map((x) => [x.itemId, r.output.itemId]),
    ),
    ...intel.unlocks
      .filter((r) => ["crafting", "blueprint"].includes(r.kind))
      .flatMap((r) =>
        r.requirements.map((x) => [
          intel.mapping[x.itemId],
          intel.mapping[r.outputItemId],
        ]),
      ),
    ...x01Printer.recipes.flatMap((r) =>
      r.materials.map((x) => [x.itemId, r.itemId]),
    ),
  ];
  assert.equal(i.edges.length, expected.length);
  assert.deepEqual(
    i.issues.filter((row) => row.code !== "identity-only"),
    [],
  );
  assert.equal(
    i.issues.filter((row) => row.code === "identity-only").length,
    19,
  );
  for (const [input, output] of expected) {
    assert.ok(
      i.uses.get(input)?.some((m) => m.output.id === output),
      `${input}→${output}`,
    );
    assert.ok(items.has(output));
  }
  const htmlById = new Map(
    p.items.map((r) => [r.id, renderCraftingUses(r, p, recordUrl)]),
  );
  const inventoryUses = itemUses(p, {
    schemaVersion: 3,
    inventory: {},
    reserves: {},
    completion: {},
    upgradeProgress: {},
    spoilers: false,
  });
  for (const [input, output] of expected)
    assert.ok(
      inventoryUses.get(input).crafts.some((row) => row.id === output),
      `inventory ${input}→${output}`,
    );
  for (const [input, output] of expected) {
    assert.ok(htmlById.get(input).includes(`data-craft-output="${output}"`));
    assert.ok(
      htmlById
        .get(input)
        .includes(
          `href="${recordUrl({ ...items.get(output), recordType: "item" })}"`,
        ),
    );
  }
  for (const method of i.methods.filter((m) => !m.recipe)) {
    assert.ok(
      htmlById
        .get(method.output.id)
        .includes(`id="${craftReferenceAnchor(method.id)}"`),
    );
    if (
      ["blueprint", "crafting"].includes(method.kind) &&
      method.access != null
    )
      assert.ok(
        htmlById
          .get(method.output.id)
          .includes(`Reported DMZ level ${method.access}`),
      );
  }
  assert.equal(JSON.stringify(p), before);
  console.log(
    JSON.stringify({
      items: p.items.length,
      methods: i.methods.length,
      edges: i.edges.length,
      bySource: Object.fromEntries(
        ["catalog", "crafting", "blueprint", "x01"].map((k) => [
          k,
          i.edges.filter((e) => e.source === k).length,
        ]),
      ),
      unresolved: i.issues.filter((row) => row.code !== "identity-only").length,
      identityOnly: i.issues.filter((row) => row.code === "identity-only")
        .length,
    }),
  );
});
test("hostile labels escape and item/recipe links use current private/preview callback", () => {
  const p = fixture();
  p.items[2].name = "<img src=x onerror=bad>";
  p.recipes = [recipe("r")];
  const html = renderCraftingUses(
    p.items[0],
    p,
    (r) => `/local/?pack=fixture&id=${r.id}`,
  );
  assert.ok(html.includes('href="/local/?pack=fixture&amp;id=c"'));
  assert.ok(html.includes('href="/local/?pack=fixture&amp;id=r"'));
  assert.ok(html.includes("&lt;img"));
  assert.ok(!html.includes("<img src=x"));
});

test("producing recipe buttons preserve protected-title masking", () => {
  const pack = loadFixturePack("official-starter");
  pack.items.push({
    ...pack.items[0],
    id: "fixture:hidden",
    name: "Hidden Pattern",
    spoiler: true,
  });
  pack.recipes[0].name = "Print Hidden Pattern";
  const item = allRecords([pack]).find(
    (r) => r.id === pack.recipes[0].output.itemId,
  );
  const html = renderDetail(item, [pack]);
  assert.ok(html.includes("item-craft-button"));
  assert.ok(!html.includes("Hidden Pattern"));
});
