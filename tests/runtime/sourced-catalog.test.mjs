import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { loadFixturePack } from "../helpers/catalog.mjs";
import { validatePack } from "../../src/content/validate.mjs";
import { exportContent, parseTransfer } from "../../src/content/portable.mjs";
import { newProfile, parseProfile } from "../../src/domain/profile.mjs";
import { previewContentRebind } from "../../src/domain/profile-preview.mjs";
import { setUpgradeProgress } from "../../src/domain/upgrade-progress.mjs";
import { setCompletion, progressRows } from "../../src/domain/progression.mjs";
import { upgradeAdvice } from "../../src/domain/upgrade-advice.mjs";
import {
  recordUpgradePurchase,
  recordSpendingReversal,
} from "../../src/domain/upgrade-spending.mjs";
const pack = loadFixturePack("upgrade-observations");
const schema = JSON.parse(
  await readFile(new URL("../../schemas/pack.schema.json", import.meta.url)),
);
const facts = JSON.parse(
  await readFile(
    new URL(
      "../../specs/032-sourced-unlocks-catalog/evidence/source-facts.json",
      import.meta.url,
    ),
  ),
);
const seed = JSON.parse(
  await readFile(
    new URL(
      "../../specs/023-character-upgrade-planner/evidence/upgrade-observations.json",
      import.meta.url,
    ),
  ),
);
const confirmation = "source:upgrade-consumption-confirmation-20261026";
const originalRows = (o) =>
  o.requirements.filter((r) => r.sourceIds.includes(confirmation));
const op = (id) => ({
  operationId: `spend:${id}`,
  recordedAt: "2026-10-28T22:00:00.000Z",
  expectedRevision: 0,
});
const stocked = (p) => {
  const v = newProfile(p);
  for (const i of p.items)
    v.inventory[i.id] = i.kind === "currency" ? 2000000 : 1000000;
  return v;
};

test("032 FR001/002 source FOB coverage has no duplicated tiers and recomputed reference totals", () => {
  validatePack(pack, schema);
  const upgrades = pack.objectives.filter((o) => o.track === "dmz-upgrade");
  assert.equal(upgrades.length, 28);
  assert.equal(new Set(upgrades.map((o) => o.name)).size, 28);
  assert.equal(upgrades.flatMap((o) => o.requirements).length, 103);
  assert.equal(
    upgrades.flatMap((o) => o.requirements).filter((r) => r.quantity === null)
      .length,
    8,
  );
  const totals = {},
    cash = [];
  for (const f of facts.fob) {
    const o = upgrades.find((o) => o.id === f.id);
    assert(o);
    assert.deepEqual(
      Object.fromEntries(
        o.requirements
          .filter((r) => r.itemId !== "observed:cash")
          .map((r) => [r.itemId, r.quantity]),
      ),
      f.materials,
    );
    assert.equal(
      o.requirements.find((r) => r.itemId === "observed:cash").quantity,
      f.cash,
    );
    for (const [id, n] of Object.entries(f.materials))
      totals[id] = (totals[id] || 0) + n;
    cash.push(f.cash);
  }
  assert.deepEqual(totals, facts.materialTotals);
  assert.equal(Object.keys(totals).length, 37);
  assert.equal(
    Object.values(totals).reduce((a, b) => a + b),
    889,
  );
  assert.equal(cash.filter((n) => n !== null).length, 20);
  assert.equal(
    cash.reduce((a, b) => a + (b ?? 0), 0),
    2840000,
  );
});

test("032 FR001/003 original observations, identities and row evidence survive expansion", () => {
  assert.equal(pack.id, "observed:upgrade-review-20261026");
  assert.deepEqual(pack.game, {
    build: "unknown-observed-snapshot-20261026",
    id: "mw4-user-context-unverified",
    mode: "dmz",
  });
  assert.equal(pack.contentVersion, "2026.10.28.1");
  let count = 0;
  for (const old of seed.upgrades) {
    const o = pack.objectives.find((o) => o.id === `observed:${old.id}`);
    assert.equal(o.name, old.name);
    assert.equal(o.description, old.description);
    assert.deepEqual(o.upgrade.observationKeys, [old.evidenceKey]);
    const rows = originalRows(o);
    count += rows.length;
    assert.deepEqual(
      rows.map((r) => [
        pack.items.find((i) => i.id === r.itemId).name,
        r.quantity,
      ]),
      old.requirements.map((r) => [r.itemName, r.required]),
    );
    assert(
      rows.every(
        (r) => r.status === "observed" && r.consumption === "consumed",
      ),
    );
  }
  assert.equal(count, 31);
  const added = pack.objectives.filter(
    (o) => o.track === "dmz-upgrade" && o.id.startsWith("reported:"),
  );
  assert.equal(added.length, 20);
  assert(
    added.every(
      (o) =>
        o.status === "unverified" &&
        o.requirements.every((r) => r.consumption === "unknown"),
    ),
  );
});

test("032 FR004/005 recipe alternatives and level rewards are reference-only, not free crafts or automatic grants", () => {
  assert.equal(pack.recipes.length, 0);
  const unlocks = pack.objectives.filter((o) =>
    o.id.startsWith("reported:unlock-"),
  );
  assert.equal(unlocks.length, 75);
  assert.equal(
    facts.recipeUnlocks.reduce((n, r) => n + r.routes.length, 0),
    77,
  );
  const routes = pack.claims.filter((c) =>
    c.field.startsWith("recipeUnlockRoute."),
  );
  assert.equal(routes.length, 77);
  assert.deepEqual(
    Object.fromEntries(
      ["level", "story", "order", "loot"].map((k) => [
        k,
        routes.filter((c) => c.field === `recipeUnlockRoute.${k}`).length,
      ]),
    ),
    { level: 25, story: 2, order: 4, loot: 46 },
  );
  for (const o of unlocks) {
    assert.equal(o.track, "progression");
    assert.deepEqual(o.prerequisites, []);
    assert.deepEqual(o.effects, []);
    assert.equal(o.requirementsKnown, false);
  }
  const uav = unlocks.find((o) => o.id === "reported:unlock-uav");
  assert.equal(uav.status, "disputed");
  assert.equal(
    routes.filter((c) => c.entityId === uav.id && c.status === "disputed")
      .length,
    2,
  );
  const nvg = unlocks.find(
    (o) => o.id === "reported:unlock-night-vision-goggles",
  );
  assert.equal(nvg.spoiler, true);
  assert.equal(routes.filter((c) => c.entityId === nvg.id).length, 2);
  const levels = pack.objectives.filter((o) =>
    o.id.startsWith("reported:level-"),
  );
  assert.equal(levels.length, 69);
  assert.equal(
    pack.claims.filter((c) => c.field.startsWith("reward.")).length,
    90,
  );
  assert.deepEqual(
    facts.levels.map((l) => l.level),
    Array.from({ length: 69 }, (_, i) => i + 2),
  );
  assert(
    facts.levels
      .find((l) => l.level === 40)
      .rewards.every((r) => r.uncertainty),
  );
  assert(
    facts.levels
      .find((l) => l.level === 54)
      .rewards.every((r) => r.uncertainty),
  );
  assert.equal(
    facts.levels.find((l) => l.level === 15).rewards[0].type,
    "unknown",
  );
  assert.equal(
    facts.levels.find((l) => l.level === 2).rewards[1].label,
    "1-Plate Armor Vest — Recipe",
  );
  assert(
    facts.levels
      .find((l) => l.level === 6)
      .rewards[1].contents.includes("2-Plate Carrier"),
  );
  assert.equal(
    facts.levels.find((l) => l.level === 10).rewards[0].details
      .purchaseCondition,
    "Corresponding weapon manual",
  );
  const p = newProfile(pack),
    next = setCompletion(pack, p, "reported:level-70", "completed");
  assert.deepEqual(next.inventory, {});
  assert.deepEqual(next.spendHistory, []);
  assert.deepEqual(next.upgradeProgress, {});
  assert.throws(
    () => recordUpgradePurchase(pack, p, "reported:level-70", op("level")),
    /Unknown upgrade/,
  );
});

test("032 FR003 unknown cash or consumption cannot record partial purchase, and source arithmetic is not personal advice", () => {
  for (const o of pack.objectives.filter(
    (o) =>
      o.track === "dmz-upgrade" &&
      (o.id.startsWith("reported:") ||
        o.requirements.some((r) => r.quantity === null)),
  )) {
    const p = stocked(pack),
      before = JSON.stringify(p);
    assert.throws(
      () => recordUpgradePurchase(pack, p, o.id, op("blocked")),
      /unknown|disputed/i,
    );
    assert.equal(JSON.stringify(p), before);
  }
  const p = newProfile(pack);
  p.inventory["observed:power-regulator"] = 0;
  const advice = upgradeAdvice(pack, p);
  const row = advice.rows.find(
    (r) =>
      r.itemId === "observed:power-regulator" ||
      r.id === "observed:power-regulator",
  );
  assert(row);
  assert.equal(row.search, null);
});

test("032 FR007 legacy purchase survives rebind, cannot be re-debited and guarded reversal needs explicit review", () => {
  for (const id of [
    "observed:vendor-item-upgrade-i",
    "observed:mia-recovery-discount-iii",
  ]) {
    const old = structuredClone(pack);
    old.contentVersion = "2026.10.26.2";
    old.objectives = old.objectives.filter((o) => o.id.startsWith("observed:"));
    for (const o of old.objectives) {
      o.requirements = originalRows(o);
      o.sourceIds = o.sourceIds.filter(
        (s) => s !== "source:detonated-fob-20261025",
      );
    }
    const p = stocked(old),
      spent = recordUpgradePurchase(old, p, id, op("old")).candidate;
    const before = JSON.stringify(spent),
      preview = previewContentRebind(spent, pack, old),
      rebound = preview.candidate;
    assert.equal(JSON.stringify(spent), before);
    assert.deepEqual(rebound.spendHistory, spent.spendHistory);
    assert.deepEqual(rebound.inventory, spent.inventory);
    assert(rebound.upgradeProgress[id].reviewRequired);
    assert.deepEqual(
      parseProfile(JSON.stringify(rebound)).spendHistory,
      spent.spendHistory,
    );
    const cleared = setUpgradeProgress(pack, rebound, id, {
      completion: "incomplete",
    });
    assert.throws(
      () => recordUpgradePurchase(pack, cleared, id, op("new")),
      /equivalent purchase/,
    );
    assert.throws(
      () => recordSpendingReversal(rebound, "spend:old", op("reverse")),
      /progress/i,
    );
    const reviewed = setUpgradeProgress(pack, rebound, id, {
      completion: "completed",
    });
    const reversed = recordSpendingReversal(
      reviewed,
      "spend:old",
      op("reverse"),
    ).candidate;
    assert.deepEqual(reversed.inventory, p.inventory);
    assert.equal(reversed.spendHistory.length, 2);
    assert.deepEqual(reversed.spendHistory[0], spent.spendHistory[0]);
  }
});

test("032 FR006/008 portable source evidence and spoiler-safe progress projection", async () => {
  const sources = pack.sources.filter((s) => s.type === "community");
  assert.equal(sources.length, 3);
  assert(
    sources.every(
      (s) =>
        s.url.startsWith("https://detonated.com/") &&
        s.reviewedAt === "2026-10-28" &&
        s.provenance.buildStatus === "unknown",
    ),
  );
  assert.deepEqual(
    (await parseTransfer(exportContent(pack, schema), schema)).pack,
    pack,
  );
  assert(
    pack.items.every(
      (i) =>
        !i.description.includes("Shopping Hacks") &&
        !i.description.includes("Critical Extraction"),
    ),
  );
  const hidden = progressRows(pack, newProfile(pack), { limit: 500 });
  assert(!JSON.stringify(hidden).includes("Shopping Hacks"));
  assert(!JSON.stringify(hidden).includes("Critical Extraction"));
});
