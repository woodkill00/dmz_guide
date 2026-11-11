import test from "node:test";
import assert from "node:assert/strict";
import { loadFixturePack } from "../helpers/catalog.mjs";
import { newProfile } from "../../src/domain/profile.mjs";
import { progressRows } from "../../src/domain/progression.mjs";
import { upgradeBudget } from "../../src/domain/upgrade-budget.mjs";
import {
  fobUpgradeMaterials,
  parseUpgradeStock,
} from "../../src/client/fob-upgrade-card.mjs";
const pack = loadFixturePack("official-starter");
test("all34 real upgrade cards show listed costs, global stock, progress and independent completion note", () => {
  const profile = newProfile(pack),
    before = structuredClone(profile),
    budget = upgradeBudget(pack, profile),
    rows = progressRows(pack, profile, { track: "dmz-upgrade", limit: 50 });
  assert.equal(rows.length, 34);
  for (const row of rows) {
    const html = fobUpgradeMaterials(
      pack,
      profile,
      row,
      budget.rows.get(row.id),
    );
    assert(html.includes("Shared global stock"));
    assert(html.includes("completion is separate"));
    assert(html.includes("progress"));
    for (const m of budget.rows.get(row.id).materials)
      assert(html.includes(`data-fob-owned="${m.id}"`), m.name);
  }
  assert.deepEqual(profile, before);
});
test("stock input keeps blank distinct from zero and validates grouped currency, counts and limits", () => {
  const p = newProfile(pack),
    cash = pack.items.find((i) => i.kind === "currency"),
    item = pack.items.find((i) => i.id === "mw4:rigid-synthetics");
  assert.equal(parseUpgradeStock("", item, p), undefined);
  assert.equal(parseUpgradeStock("0", item, p), 0);
  assert.equal(parseUpgradeStock("1,333,601", cash, p), 1333601);
  assert.equal(parseUpgradeStock("1,000", item, p), 1000);
  for (const raw of ["-1", "1.2", "1e3", "Infinity", "1,00", "1000001"])
    assert.throws(() => parseUpgradeStock(raw, item, p));
  assert.throws(() => parseUpgradeStock("2000001", cash, p));
});
test("untrusted names/descriptions are escaped and stale profile stock controls are readonly", () => {
  const p = newProfile(pack),
    row = progressRows(pack, p, { track: "dmz-upgrade", limit: 50 })[0],
    budget = upgradeBudget(pack, p).rows.get(row.id);
  row.description = "<img src=x onerror=alert(1)>";
  const html = fobUpgradeMaterials(
    pack,
    { ...p, contentVersion: "old" },
    row,
    budget,
  );
  assert(!html.includes("<img src=x"));
  assert(html.includes("&lt;img"));
  assert(html.includes("disabled data-upgrade-readonly"));
  assert.equal(
    fobUpgradeMaterials(pack, p, { ...row, hidden: true }, budget),
    "",
  );
});
