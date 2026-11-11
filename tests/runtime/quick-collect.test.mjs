import test from "node:test";
import assert from "node:assert/strict";
import { loadFixturePack } from "../helpers/catalog.mjs";
import { newProfile } from "../../src/domain/profile.mjs";
import { quickCollect, addFound } from "../../src/domain/quick-collect.mjs";
import { upgradeNeeds } from "../../src/domain/upgrade-needs.mjs";
const pack = loadFixturePack("official-starter"),
  id = "mw4:ingredient-control-unit";
test("direct remaining list deduplicates unfinished costs and exposes crafting only as alternatives", () => {
  const p = newProfile(pack),
    before = structuredClone(p),
    list = quickCollect(pack, p);
  assert.equal(list.status, "ok");
  assert.equal(list.items.length, 45);
  assert.equal(new Set(list.items.map((r) => r.id)).size, 45);
  assert.equal(list.items.find((r) => r.id === id).remaining, 30);
  assert(list.items.find((r) => r.id === id).assumedZero);
  assert(!list.items.some((r) => r.id === "mw4:synthetics"));
  assert(
    quickCollect(pack, p, { crafting: true }).items.some(
      (r) => r.id === "mw4:synthetics" && r.alternative,
    ),
  );
  assert.deepEqual(p, before);
  p.inventory[id] = 7;
  p.reserves[id] = 2;
  assert.equal(
    quickCollect(pack, p).items.find((r) => r.id === id).remaining,
    25,
  );
  p.contentVersion = "old";
  assert.equal(quickCollect(pack, p).status, "blocked");
});
test("add-found is bounded, immutable, preserves progress and feeds the existing totals", () => {
  const p = newProfile(pack),
    old = structuredClone(p),
    first = addFound(pack, p, id, "3");
  assert.equal(first.before, undefined);
  assert.equal(first.after, 3);
  assert.deepEqual(p, old);
  const next = addFound(pack, first.candidate, id, "4");
  assert.equal(next.after, 7);
  assert.deepEqual(next.candidate.completion, p.completion);
  assert.deepEqual(next.candidate.upgradeProgress, p.upgradeProgress);
  assert.deepEqual(next.candidate.spendHistory, p.spendHistory);
  assert.equal(
    upgradeNeeds(pack, next.candidate).listedCollection.get(id).missing,
    23,
  );
  for (const raw of ["", "0", "-1", "1.5", "1e3", "1000001"])
    assert.throws(() => addFound(pack, p, id, raw));
  p.inventory[id] = 1000000;
  assert.throws(() => addFound(pack, p, id, "1"));
  p.contentVersion = "old";
  assert.throws(() => addFound(pack, p, id, "1"));
});
test("completing all upgrades removes their demands without modifying inventory", () => {
  const p = newProfile(pack);
  for (const o of pack.objectives.filter((o) => o.track === "dmz-upgrade"))
    p.upgradeProgress[o.id] = {
      completion: "completed",
      availability: "unknown",
      reviewRequired: false,
    };
  assert(!quickCollect(pack, p).items.some((r) => r.id === id));
  assert.equal(p.inventory[id], undefined);
});
test("synthetic unknown additional cost stays under review even when its known subtotal is covered", () => {
  const copy = structuredClone(pack),
    p = newProfile(copy),
    root = copy.objectives.find((o) => o.name === "Stash Item Upgrade I");
  root.requirementsKnown = false;
  root.requirements.push({
    itemId: id,
    quantity: null,
    consumption: "unknown",
    status: "unknown",
    sourceIds: root.sourceIds,
  });
  p.inventory[id] = 1000;
  const row = quickCollect(copy, p).items.find((r) => r.id === id);
  assert(row.minimum);
  assert.equal(row.remaining, null);
});
