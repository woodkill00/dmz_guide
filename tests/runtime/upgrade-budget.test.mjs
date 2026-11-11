import { readPublicJSON } from "../../src/client/public-data.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { upgradeFixture } from "../helpers/upgrades.mjs";
import { loadFixturePack } from "../helpers/catalog.mjs";
import { newProfile } from "../../src/domain/profile.mjs";
import { upgradeBudget } from "../../src/domain/upgrade-budget.mjs";
import {
  buildSiteTopology,
  TOPOLOGY_JSON_NODES,
} from "../../src/domain/site-topology.mjs";
const setup = () => {
  const pack = upgradeFixture(),
    profile = newProfile(pack);
  return { pack, profile };
};
const done = (p, id) => {
  p.upgradeProgress[id] = {
    completion: "completed",
    availability: "unknown",
    reviewRequired: false,
  };
};
test("saved stock is shared across unfinished upgrades; independent rows and reserves remain separate", () => {
  const { pack, profile } = setup(),
    id = pack.items[0].id;
  profile.inventory[id] = 8;
  profile.reserves[id] = 3;
  const before = JSON.stringify([pack, profile]),
    m = upgradeBudget(pack, profile);
  assert.equal(m.status, "ok");
  assert.equal(m.rows.get("test:first").materials[0].missing, 0);
  assert.equal(m.rows.get("test:second").materials[0].missing, 5);
  assert.equal(m.items.find((r) => r.id === id).required, 15);
  assert.equal(m.items.find((r) => r.id === id).missing, 10);
  assert.equal(JSON.stringify([pack, profile]), before);
  done(profile, "test:first");
  assert.equal(
    upgradeBudget(pack, profile).items.find((r) => r.id === id).required,
    10,
  );
  done(profile, "test:second");
  assert.equal(upgradeBudget(pack, profile).items.length, 0);
});
test("blank stock differs from zero; unknown cost and consumption remain provisional; mismatches block", () => {
  const { pack, profile } = setup(),
    id = pack.items[0].id;
  assert.equal(upgradeBudget(pack, profile).items[0].missing, null);
  profile.inventory[id] = 0;
  assert.equal(upgradeBudget(pack, profile).items[0].missing, 15);
  pack.objectives[0].requirements[0].quantity = null;
  pack.objectives[0].requirements[0].status = "unknown";
  let m = upgradeBudget(pack, profile);
  assert.equal(m.items[0].unknown, true);
  assert.equal(m.partial, true);
  assert(m.items[0].required === 10);
  profile.contentVersion = "old";
  assert.equal(upgradeBudget(pack, profile).status, "blocked");
});
test("shared observation aliases do not double-count costs and completion excludes the alias group", () => {
  const { pack, profile } = setup();
  const alias = structuredClone(pack.objectives[0]);
  alias.id = "test:alias";
  alias.name = "Synthetic alias";
  pack.objectives.push(alias);
  profile.inventory[pack.items[0].id] = 0;
  let m = upgradeBudget(pack, profile);
  assert.equal(m.items[0].required, 15);
  done(profile, "test:alias");
  m = upgradeBudget(pack, profile);
  assert.equal(m.items[0].required, 10);
  assert.equal(m.rows.get("test:first").completed, true);
});
function printing() {
  const { pack, profile } = setup();
  const sample = pack.items[0];
  pack.items = [
    {
      ...sample,
      id: "test:raw",
      name: "Synthetic raw",
      kind: "resource",
      unit: "resource-unit",
      category: "Resources",
    },
    { ...sample, id: "test:rare", name: "Synthetic rare" },
    { ...sample, id: "test:a", name: "A synthetic ingredient" },
    { ...sample, id: "test:b", name: "B synthetic ingredient" },
  ];
  const line = (id, q) => ({
    itemId: id,
    quantity: q,
    consumption: "consumed",
    status: "fictional",
    sourceIds: [pack.sources[0].id],
  });
  const goal = structuredClone(pack.objectives[0]);
  goal.requirements = [
    line("test:a", 3),
    line("test:b", 3),
    line("test:raw", 2),
  ];
  const gate = structuredClone(pack.objectives[1]);
  gate.id = "test:printer";
  gate.name = "Synthetic ingredient printing";
  gate.requirements = [];
  pack.objectives = [goal, gate];
  pack.recipes = ["a", "b"].map((id) => ({
    id: "test:print-" + id,
    name: "Synthetic print " + id,
    status: "fictional",
    sourceIds: [pack.sources[0].id],
    station: "3D Printer",
    inputs: [line("test:raw", 2), line("test:rare", 1)],
    output: { itemId: "test:" + id, quantity: 1 },
    prerequisites: [gate.id],
    ingredientsKnown: true,
    eligibility: "unknown",
  }));
  for (const i of pack.items) profile.inventory[i.id] = 0;
  profile.inventory["test:raw"] = 10;
  profile.inventory["test:rare"] = 4;
  return { pack, profile };
}
test("printing requires its completed upgrade and shares excess stock after protecting direct requirements", () => {
  const { pack, profile } = printing();
  let m = upgradeBudget(pack, profile);
  assert(
    m.items
      .filter((r) => r.recipeId)
      .every((r) => r.printable === 0 && !r.printUnlocked),
  );
  done(profile, "test:printer");
  const before = JSON.stringify(profile);
  m = upgradeBudget(pack, profile);
  assert.equal(m.items.find((r) => r.id === "test:a").printable, 3);
  assert.equal(m.items.find((r) => r.id === "test:b").printable, 1);
  assert.equal(m.items.find((r) => r.id === "test:b").afterPrint, 2);
  assert.equal(m.printInputs.find((r) => r.id === "test:raw").required, 12);
  assert.equal(m.printInputs.find((r) => r.id === "test:raw").available, 8);
  assert.equal(m.printInputs.find((r) => r.id === "test:raw").missing, 4);
  assert.equal(JSON.stringify(profile), before);
  profile.reserves["test:raw"] = 4;
  m = upgradeBudget(pack, profile);
  assert.equal(
    m.items
      .filter((r) => r.recipeId)
      .reduce((n, r) => n + (r.printable || 0), 0),
    2,
  );
  profile.upgradeProgress["test:printer"].reviewRequired = true;
  assert(
    upgradeBudget(pack, profile)
      .items.filter((r) => r.recipeId)
      .every((r) => !r.printUnlocked),
  );
});
test("unknown input stock cannot become a free print; multiple routes require selection; cycles stay blocked", () => {
  const { pack, profile } = printing();
  done(profile, "test:printer");
  delete profile.inventory["test:rare"];
  let m = upgradeBudget(pack, profile);
  assert.equal(m.items.find((r) => r.id === "test:a").printable, null);
  pack.recipes.push({
    ...structuredClone(pack.recipes[0]),
    id: "test:other-route",
  });
  assert.match(
    upgradeBudget(pack, profile).items.find((r) => r.id === "test:a")
      .printReason,
    /Multiple/,
  );
  pack.objectives[1].prerequisites = ["test:printer"];
  const cyclic = upgradeBudget(pack, profile).items.find(
    (r) => r.id === "test:b",
  );
  assert.equal(cyclic.printable, 0);
  assert.equal(cyclic.printUnlocked, undefined);
});
const source = JSON.parse(
  await readFile("content/references/printer-gameboost-20261030.json"),
);
const real = loadFixturePack("official-starter");
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
test("all 107 factual source rows are represented: 95 recipes, 12 upgrade reports, 34 current upgrades; no duplicated outputs", () => {
  assert.equal(source.rows.length, 107);
  assert.equal(real.recipes.length, 95);
  assert.equal(new Set(real.recipes.map((r) => r.output.itemId)).size, 95);
  assert.equal(
    real.objectives.filter((r) => r.track === "dmz-upgrade").length,
    34,
  );
  const sid = "source:gameboost-printer-20261030";
  assert(real.sources.find((s) => s.id === sid).url === source.source);
  for (const f of source.rows) {
    const record =
      f.category === "Upgrade"
        ? real.objectives.find(
            (o) => o.track === "dmz-upgrade" && norm(o.name) === norm(f.name),
          )
        : real.recipes.find(
            (r) =>
              norm(real.items.find((i) => i.id === r.output.itemId).name) ===
              norm(f.name),
          );
    assert(record, f.name);
    assert(record.sourceIds.includes(sid), f.name);
    const lines =
      f.category === "Upgrade" ? record.requirements : record.inputs;
    let text = f.cost;
    const cash = text.match(/^\$([\d,]+)(?:, |$)/);
    if (cash) {
      assert(
        lines.some(
          (l) =>
            real.items.find((i) => i.id === l.itemId).kind === "currency" &&
            l.quantity === Number(cash[1].replaceAll(",", "")),
        ),
        f.name,
      );
      text = text.slice(cash[0].length);
    }
    for (const cost of text.split(", ").filter(Boolean)) {
      const [, q, name] = cost.match(/^(\d+) (.+)$/);
      assert(
        lines.some(
          (l) =>
            norm(real.items.find((i) => i.id === l.itemId).name) ===
              norm(name) && l.quantity === Number(q),
        ),
        f.name + " " + cost,
      );
    }
  }
});
test("six existing recipe IDs are retained, rare ingredients are not fabricated as printable, and each ingredient print has its correct gate", () => {
  for (const id of [
    "mw4:recipe-medkit",
    "mw4:recipe-bandage",
    "mw4:recipe-one-plate-armor-vest",
    "mw4:recipe-two-plate-armor-vest",
    "mw4:recipe-small-backpack",
    "mw4:recipe-medium-backpack",
  ])
    assert(real.recipes.some((r) => r.id === id));
  const ingredients = real.recipes.filter(
    (r) =>
      real.items.find((i) => i.id === r.output.itemId).category ===
      "Ingredients",
  );
  assert.equal(ingredients.length, 14);
  for (const r of ingredients) {
    const item = real.items.find((i) => i.id === r.output.itemId);
    assert.equal(r.prerequisites.length, 1);
    assert.equal(
      real.objectives.find((o) => o.id === r.prerequisites[0]).name,
      item.rarity === "Epic"
        ? "Epic Ingredient Printing"
        : "Uncommon Ingredient Printing",
    );
  }
  assert.equal(
    real.recipes.filter(
      (r) =>
        real.items.find((i) => i.id === r.output.itemId).name ===
        "Binding Catalyst",
    ).length,
    0,
  );
  const revive = real.recipes.find((r) => r.name === "Print Revive Pistol");
  assert.equal(
    real.objectives.find((o) => o.id === revive.prerequisites[0]).status,
    "disputed",
  );
});
test("expanded recipe topology fits its bounded value budget while graph and byte admission remain constrained", () => {
  assert.equal(TOPOLOGY_JSON_NODES, 300000);
  const pages = Array.from({ length: 900 }, (_, i) => ({
    path: i === 0 ? "/" : "/capacity-" + i + "/",
    title: "Synthetic capacity " + i,
    page: "synthetic",
    body: Array.from(
      { length: 30 },
      (_, j) =>
        `<a href="/capacity-${1 + ((i + j) % 899)}/">Synthetic link ${j}</a>`,
    ).join(""),
  }));
  const rendered = new Map(pages.map((p) => [p.path, p.body]));
  const g = buildSiteTopology(pages, rendered);
  assert(g.edges.length >= 26000);
  assert(g.nodes.length < 6000);
  assert(g.edges.length < 150000);
});

test("expanded topology reader has an explicit bounded override; ordinary JSON retains default limits", async () => {
  const previous = globalThis.fetch;
  let payload = "[" + "0,".repeat(150000) + "0]";
  globalThis.fetch = async () => new Response(payload);
  try {
    await assert.rejects(readPublicJSON("/synthetic"), /node limit/);
    assert.equal(
      (
        await readPublicJSON("/synthetic", 2097152, undefined, {
          nodes: TOPOLOGY_JSON_NODES,
        })
      ).length,
      150001,
    );
    await assert.rejects(
      readPublicJSON("/synthetic", 2097152, undefined, {
        nodes: TOPOLOGY_JSON_NODES + 1,
      }),
      /node budget/,
    );
    payload = "[" + "0,".repeat(300000) + "0]";
    await assert.rejects(
      readPublicJSON("/synthetic", 2097152, undefined, {
        nodes: TOPOLOGY_JSON_NODES,
      }),
      /node limit/,
    );
  } finally {
    globalThis.fetch = previous;
  }
});
