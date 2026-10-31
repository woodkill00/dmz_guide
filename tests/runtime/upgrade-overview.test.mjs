import test from "node:test";
import assert from "node:assert/strict";
import { upgradeFixture } from "../helpers/upgrades.mjs";
import { newProfile } from "../../src/domain/profile.mjs";
import {
  upgradeOverview,
  overviewMatches,
} from "../../src/domain/upgrade-overview.mjs";
import { progressRows } from "../../src/domain/progression.mjs";
import {
  cleanUpgradeView,
  readUpgradeView,
  writeUpgradeView,
  materialPanel,
} from "../../src/client/upgrade-dashboard.mjs";
function fixture() {
  const pack = upgradeFixture(),
    profile = newProfile(pack);
  return { pack, profile };
}
test("independent direct missing uses canonical reserve/retained accounting rather than shared shortage", () => {
  const { pack, profile } = fixture();
  profile.inventory[pack.items[0].id] = 6;
  let view = upgradeOverview(pack, profile);
  assert.equal(view.rows.get("test:first").materials[0].missing, 0);
  assert.equal(view.rows.get("test:second").materials[0].missing, 4);
  profile.reserves[pack.items[0].id] = 3;
  view = upgradeOverview(pack, profile);
  assert.equal(view.rows.get("test:first").materials[0].missing, 2);
  pack.objectives[0].requirements.push({
    ...pack.objectives[0].requirements[0],
    quantity: 4,
    consumption: "retained",
  });
  assert.equal(
    upgradeOverview(pack, profile).rows.get("test:first").materials[0].missing,
    6,
  );
});
test("unknown stock, zero, consumption, partial costs and blocked bindings stay explicit and immutable", () => {
  const { pack, profile } = fixture();
  const before = JSON.stringify([pack, profile]);
  let row = upgradeOverview(pack, profile).rows.get("test:first");
  assert.equal(row.materials[0].missing, null);
  assert.equal(row.unknown, true);
  assert.equal(overviewMatches(row, "missing"), false);
  assert.equal(overviewMatches(row, "review"), true);
  assert.equal(JSON.stringify([pack, profile]), before);
  profile.inventory[pack.items[0].id] = 0;
  row = upgradeOverview(pack, profile).rows.get("test:first");
  assert.equal(row.materials[0].missing, 5);
  assert.equal(overviewMatches(row, "missing"), true);
  pack.objectives[0].requirements[0].consumption = "unknown";
  assert.equal(
    upgradeOverview(pack, profile).rows.get("test:first").materials[0].missing,
    null,
  );
  profile.contentVersion = "wrong";
  assert.equal(upgradeOverview(pack, profile).blocked, true);
});
test("visible catalog summary/completion/tracked filters and prepage filtering preserve privacy", () => {
  const { pack, profile } = fixture();
  profile.goals = [{ id: "test:second", quantity: 1 }];
  profile.upgradeProgress["test:first"] = {
    completion: "completed",
    availability: "unknown",
    reviewRequired: false,
  };
  let view = upgradeOverview(pack, profile);
  assert.equal(view.completed, 1);
  assert.equal(view.total, 2);
  assert.equal(
    overviewMatches(view.rows.get("test:first"), "incomplete"),
    false,
  );
  assert.equal(overviewMatches(view.rows.get("test:second"), "tracked"), true);
  const allowedIds = new Set(
    [...view.rows.values()]
      .filter((r) => overviewMatches(r, "tracked"))
      .map((r) => r.id),
  );
  assert.deepEqual(
    progressRows(pack, profile, {
      track: "dmz-upgrade",
      allowedIds,
      limit: 1,
    }).map((r) => r.id),
    ["test:second"],
  );
  pack.objectives[1].spoiler = true;
  view = upgradeOverview(pack, profile);
  assert.equal(view.total, 1);
  assert.equal(view.rows.has("test:second"), false);
});
test("preference allowlists, caps, malformed and denied storage fail safely without storing query", () => {
  assert.equal(
    cleanUpgradeView({
      quick: "evil",
      density: "tiny",
      materials: "false",
      query: "private",
    }).quick,
    "all",
  );
  assert.equal(cleanUpgradeView({ source: "x".repeat(101) }).source, "");
  const values = new Map();
  const storage = {
    getItem: (k) => values.get(k),
    setItem: (k, v) => values.set(k, v),
  };
  assert.equal(
    writeUpgradeView(
      "one",
      {
        quick: "tracked",
        density: "comfortable",
        materials: false,
        query: "private",
      },
      storage,
    ),
    true,
  );
  assert.equal(readUpgradeView("one", storage).quick, "tracked");
  assert.equal(readUpgradeView("two", storage).quick, "all");
  assert(![...values.values()][0].includes("private"));
  values.set(
    "dmz-upgrade-view-v1:one",
    JSON.stringify({ quick: "tracked", extra: "x".repeat(2001) }),
  );
  assert.equal(readUpgradeView("one", storage).quick, "all");
  values.set("dmz-upgrade-view-v1:one", "badjson");
  assert.equal(readUpgradeView("one", storage).density, "compact");
  const denied = {
    getItem() {
      throw Error("denied");
    },
    setItem() {
      throw Error("quota");
    },
  };
  assert.equal(readUpgradeView("one", denied).quick, "all");
  assert.equal(writeUpgradeView("one", {}, denied), false);
});
test("material shortcuts omit hidden recipes and locations, escape text and bound groups", () => {
  const { pack, profile } = fixture();
  profile.inventory[pack.items[0].id] = 0;
  const overview = upgradeOverview(pack, profile);
  const html = materialPanel(pack, profile, overview.rows.get("test:first"));
  assert(html.includes("Direct materials for this upgrade"));
  assert(html.includes("Producing recipes"));
  assert(html.includes("Missing"));
  assert(html.includes("None verified in this catalog"));
  assert(!html.includes("<script>"));
});

test("actual shortcut fixtures omit hidden records/maps, escape labels and cap each reference group", () => {
  const { pack, profile } = fixture();
  const item = pack.items[0];
  item.name = "<script>hostile</script>";
  profile.inventory[item.id] = 0;
  pack.maps = [
    { id: "test:visible-map", name: "Visible map", spoiler: false },
    { id: "test:hidden-map", name: "Secret map", spoiler: true },
  ];
  pack.locations = Array.from({ length: 56 }, (_, i) => ({
    id: `test:loc-${i}`,
    name: `Location ${i}`,
    itemIds: [item.id],
    mapId: "test:visible-map",
    status: "observed",
    sourceIds: [pack.sources[0].id],
    spoiler: false,
  }));
  pack.locations.unshift(
    {
      ...pack.locations[0],
      id: "test:hidden-location",
      name: "Hidden place",
      spoiler: true,
    },
    {
      ...pack.locations[0],
      id: "test:hidden-map-location",
      name: "Hidden map place",
      mapId: "test:hidden-map",
    },
  );
  pack.recipes = Array.from({ length: 56 }, (_, i) => ({
    id: `test:recipe-${i}`,
    name: `Recipe ${i}`,
    spoiler: false,
    inputs: [{ itemId: pack.items[1].id, quantity: 1, consumed: true }],
    output: { itemId: item.id, quantity: 1 },
  }));
  pack.recipes.unshift({
    ...pack.recipes[0],
    id: "test:hidden-recipe",
    name: "Hidden recipe",
    spoiler: true,
  });
  const html = materialPanel(
    pack,
    profile,
    upgradeOverview(pack, profile).rows.get("test:first"),
  );
  assert(!html.includes("Hidden place"));
  assert(!html.includes("Hidden map place"));
  assert(!html.includes("Hidden recipe"));
  assert(html.includes("&lt;script&gt;hostile&lt;/script&gt;"));
  assert(!html.includes("<script>"));
  assert(html.includes(">Location 49</a>"));
  assert(!html.includes(">Location 50</a>"));
  assert(html.includes(">Recipe 49</a>"));
  assert(!html.includes(">Recipe 50</a>"));
});

test("5000 admitted upgrade identities have bounded direct previews and prepage filters", () => {
  const { pack, profile } = fixture();
  const seed = pack.objectives[0];
  pack.objectives = Array.from({ length: 5000 }, (_, i) => ({
    ...seed,
    id: `test:scale-${i}`,
    name: `Synthetic upgrade ${i}`,
    upgrade: { ...seed.upgrade, observationKeys: [`scale-${i}`] },
  }));
  profile.inventory[pack.items[0].id] = 0;
  const view = upgradeOverview(pack, profile);
  assert.equal(view.total, 5000);
  assert.equal(view.rows.get("test:scale-4999").materials[0].missing, 5);
  const allowedIds = new Set(
    [...view.rows.values()]
      .filter((r) => overviewMatches(r, "missing"))
      .map((r) => r.id),
  );
  const page = progressRows(pack, profile, {
    track: "dmz-upgrade",
    allowedIds,
    offset: 4950,
  });
  assert.equal(page.total, 5000);
  assert.equal(page.length, 50);
  assert.equal(page.more, false);
});

test("shortcut use labels preserve campaign and DMZ namespaces", () => {
  const { pack, profile } = fixture();
  profile.inventory[pack.items[0].id] = 0;
  pack.objectives.push({
    ...pack.objectives[0],
    id: "test:campaign-use",
    name: "Synthetic campaign use",
    track: "campaign",
  });
  const html = materialPanel(
    pack,
    profile,
    upgradeOverview(pack, profile).rows.get("test:first"),
  );
  assert(html.includes("Synthetic campaign use</a> (Campaign)"));
  assert(html.includes("(DMZ upgrade)"));
  assert(html.includes("Crafted outputs:"));
});
