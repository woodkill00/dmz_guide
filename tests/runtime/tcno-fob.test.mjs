import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { loadFixturePack } from "../helpers/catalog.mjs";
import { newProfile } from "../../src/domain/profile.mjs";
import { upgradeBudget } from "../../src/domain/upgrade-budget.mjs";
import { upgradeNeeds } from "../../src/domain/upgrade-needs.mjs";
import { previewContentRebind } from "../../src/domain/profile-preview.mjs";
const facts = JSON.parse(
  await readFile("content/references/tcno-fob-20261110.json"),
);
const p = loadFixturePack("official-starter"),
  sid = "source:tcno-fob-20261110";
const roman = [
  "",
  "I",
  "II",
  "III",
  "IV",
  "V",
  "VI",
  "VII",
  "VIII",
  "IX",
  "X",
  "XI",
  "XII",
  "XIII",
];
const name = (n) => n.replace(/ (\d+)$/, (_, v) => " " + roman[Number(v)]);
const aliases = { Cash: "DMZ Cash", "Fulton Marker": "Fulton Drop Marker" };
test("all34 source costs and prerequisite edges imported exactly with stable identities", () => {
  const upgrades = p.objectives.filter((o) => o.track === "dmz-upgrade");
  assert.equal(upgrades.length, 34);
  assert.equal(p.items.length, 303);
  assert.equal(p.contentVersion, "2026.11.14.1");
  assert.equal(new Set(upgrades.map((o) => o.name)).size, 34);
  const bySource = new Map(
    facts.rows.map((f) => [
      f.id,
      upgrades.find((o) => o.name === name(f.name)),
    ]),
  );
  const totals = new Map();
  for (const f of facts.rows) {
    const o = bySource.get(f.id);
    assert(o, f.name);
    assert(o.description.includes(f.description));
    assert(o.sourceIds.includes(sid));
    assert.equal(o.status, "observed");
    assert.equal(o.requirementsKnown, true);
    assert.equal(o.upgrade.prerequisiteStatus, "known");
    assert.equal(o.requirements.length, f.requirements.length);
    assert.equal(
      new Set(o.requirements.map((r) => r.itemId)).size,
      o.requirements.length,
    );
    assert.deepEqual(
      o.prerequisites,
      f.prerequisites.map((r) => bySource.get(r.href.split("#")[1]).id),
    );
    for (const line of f.requirements) {
      const candidates = p.items.filter(
        (i) => i.name === (aliases[line.name] || line.name),
      );
      assert.equal(candidates.length, 1, line.name);
      const r = o.requirements.find((r) => r.itemId === candidates[0].id);
      assert.equal(r.quantity, line.quantity);
      assert(r.sourceIds.includes(sid));
      totals.set(r.itemId, (totals.get(r.itemId) || 0) + r.quantity);
    }
  }
  assert.equal(totals.size, 45);
  assert.equal(totals.get("mw4:dmz-cash"), 4840000);
  const budget = upgradeBudget(p, newProfile(p));
  assert.equal(budget.total, 34);
  for (const [id, total] of totals)
    assert.equal(budget.items.find((r) => r.id === id).required, total, id);
  assert(
    upgrades.flatMap((o) => o.requirements).every((r) => r.quantity !== null),
  );
  assert(
    p.sources.find((s) => s.id === sid).provenance.buildStatus === "unknown",
  );
  // Collection counters do not establish consumption. Keep unknown, rather than manufacture proof.
  assert.equal(
    upgrades.find((o) => o.name === "Bank Upgrade VIII").requirements[0]
      .consumption,
    "unknown",
  );
  assert.equal(
    upgrades
      .find((o) => o.name === "Stash Weapon Upgrade I")
      .requirements.find((r) => r.itemId === "mw4:reactive-metals").consumption,
    "consumed",
  );
});
test("historical reference stays intact, explicit rebind retains saved values and marks changed completion for review", () => {
  const historic = loadFixturePack("upgrade-observations");
  assert.equal(
    historic.objectives.filter((o) => o.track === "dmz-upgrade").length,
    28,
  );
  const old = newProfile(p);
  old.contentVersion = "2026.11.09.1";
  old.inventory["mw4:dmz-cash"] = 1333601;
  old.reserves["mw4:dmz-cash"] = 100;
  old.upgradeProgress["mw4:upgrade-bank-upgrade-i"] = {
    completion: "completed",
    availability: "available",
    reviewRequired: false,
  };
  const before = structuredClone(old);
  assert.equal(upgradeBudget(p, old).status, "blocked");
  const result = previewContentRebind(old, p),
    next = result.candidate;
  assert.deepEqual(old, before);
  assert.deepEqual(next.inventory, old.inventory);
  assert.deepEqual(next.reserves, old.reserves);
  assert.deepEqual(next.spendHistory, old.spendHistory);
  assert.equal(
    next.upgradeProgress["mw4:upgrade-bank-upgrade-i"].completion,
    "completed",
  );
  assert.equal(
    next.upgradeProgress["mw4:upgrade-bank-upgrade-i"].reviewRequired,
    true,
  );
  assert.equal(next.contentVersion, p.contentVersion);
  const needs = upgradeNeeds(p, next);
  assert.equal(needs.listedCollection.get("mw4:dmz-cash").required, 4820000);
});
