import test from "node:test";
import assert from "node:assert/strict";
import { upgradeFixture } from "../helpers/upgrades.mjs";
import {
  newProfile,
  validateProfile,
  parseProfile,
  previewUpgradeMigration,
} from "../../src/domain/profile.mjs";
import { setUpgradeProgress } from "../../src/domain/upgrade-progress.mjs";
import { resetProgress } from "../../src/domain/progression.mjs";
import {
  recordUpgradePurchase,
  recordSpendingReversal,
  spendingView,
} from "../../src/domain/upgrade-spending.mjs";
import { spendingTotals } from "../../src/domain/spend-history.mjs";
const when = "2026-10-26T20:00:00.000Z";
const op = (id = "one", revision = 0) => ({
  operationId: `spend:${id}`,
  recordedAt: when,
  expectedRevision: revision,
});
function fixture() {
  const pack = upgradeFixture(),
    profile = newProfile(pack);
  profile.inventory[pack.items[0].id] = 8;
  const cash = {
    ...structuredClone(pack.items[0]),
    id: "test:cash",
    name: "Synthetic cash",
    kind: "currency",
    unit: "dmz-cash",
  };
  pack.items.push(cash);
  pack.objectives[0].requirements.push({
    ...structuredClone(pack.objectives[0].requirements[0]),
    itemId: cash.id,
    quantity: 100,
  });
  profile.inventory[cash.id] = 150;
  return { pack, profile, item: pack.items[0].id, cash: cash.id };
}
test("B01/B02 pure atomic purchase snapshots and operation replay conserve stock", () => {
  const { pack, profile, item, cash } = fixture(),
    original = structuredClone(profile);
  const first = recordUpgradePurchase(pack, profile, "test:first", op());
  assert.deepEqual(profile, original);
  assert.equal(first.candidate.inventory[item], 3);
  assert.equal(first.candidate.inventory[cash], 50);
  assert.equal(
    first.candidate.upgradeProgress["test:first"].completion,
    "completed",
  );
  assert.equal(first.candidate.spendHistory.length, 1);
  assert.deepEqual(spendingTotals(first.candidate).materials, {
    gross: 5,
    reversed: 0,
    net: 5,
  });
  assert.equal(spendingTotals(first.candidate).currencies[0].net, 100);
  const replay = recordUpgradePurchase(
    pack,
    first.candidate,
    "test:first",
    op(),
  );
  assert.equal(replay.changed, false);
  assert.deepEqual(replay.candidate, first.candidate);
  assert.throws(
    () => recordUpgradePurchase(pack, first.candidate, "test:second", op()),
    /operation/i,
  );
});
test("B03 correction/reset never erase history or re-enable a debit", () => {
  const { pack, profile } = fixture(),
    p = recordUpgradePurchase(pack, profile, "test:first", op()).candidate;
  for (const q of [
    setUpgradeProgress(pack, p, "test:first", { completion: "incomplete" }),
    resetProgress(p),
  ]) {
    assert.deepEqual(q.spendHistory, p.spendHistory);
    assert.throws(
      () => recordUpgradePurchase(pack, q, "test:first", op("two")),
      /recorded/i,
    );
    assert.deepEqual(q.inventory, p.inventory);
  }
});
test("B04 missing, zero, insufficient/reserved stock refuse without mutation", () => {
  for (const mutate of [
    (p, i) => delete p.inventory[i],
    (p, i) => (p.inventory[i] = 0),
    (p, i) => (p.inventory[i] = 4),
    (p, i) => (p.reserves[i] = 4),
  ]) {
    const { pack, profile, item } = fixture();
    mutate(profile, item);
    const before = structuredClone(profile);
    assert.throws(() =>
      recordUpgradePurchase(pack, profile, "test:first", op()),
    );
    assert.deepEqual(profile, before);
  }
});
test("B05 unknown costs refuse but unknown build/prerequisites do not block recorded accounting", () => {
  const { pack, profile } = fixture();
  pack.objectives[0].upgrade.prerequisiteStatus = "unknown";
  pack.objectives[0].status = "observed";
  pack.sources[0].provenance.buildStatus = "unknown";
  const good = recordUpgradePurchase(pack, profile, "test:first", op());
  assert(good.warnings.some((s) => /unknown/.test(s)));
  for (const c of [
    (p) => (p.objectives[0].requirements[0].consumption = "unknown"),
    (p) => (p.objectives[0].requirements[0].quantity = null),
    (p) => (p.objectives[0].requirements[0].status = "disputed"),
  ]) {
    const copy = structuredClone(pack);
    c(copy);
    assert.throws(() =>
      recordUpgradePurchase(copy, profile, "test:first", op()),
    );
  }
});
test("B06 reversal restores snapshot once and retains gross audit", () => {
  const { pack, profile, item } = fixture(),
    p = recordUpgradePurchase(pack, profile, "test:first", op()).candidate;
  const reversed = recordSpendingReversal(
    p,
    "spend:one",
    op("reverse"),
  ).candidate;
  assert.deepEqual(reversed.inventory, profile.inventory);
  assert.equal(Object.hasOwn(reversed.upgradeProgress, "test:first"), false);
  assert.equal(reversed.spendHistory.length, 2);
  assert.deepEqual(spendingTotals(reversed).materials, {
    gross: 5,
    reversed: 5,
    net: 0,
  });
  assert.equal(
    recordSpendingReversal(reversed, "spend:one", op("reverse")).changed,
    false,
  );
  assert.throws(() =>
    recordSpendingReversal(reversed, "spend:one", op("other")),
  );
  const changed = structuredClone(p);
  changed.inventory[item]++;
  assert.throws(
    () => recordSpendingReversal(changed, "spend:one", op("reverse")),
    /changed|match/i,
  );
});
test("B07 historical snapshots survive costs/units/retired IDs and exact backup restore", () => {
  const { pack, profile } = fixture(),
    p = recordUpgradePurchase(pack, profile, "test:first", op()).candidate;
  pack.objectives = [];
  pack.items = [];
  pack.contentVersion = "later";
  assert.deepEqual(parseProfile(JSON.stringify(p)), p);
  assert.equal(spendingTotals(p).materials.net, 5);
  assert.deepEqual(
    recordSpendingReversal(p, "spend:one", op("reverse")).candidate.inventory,
    profile.inventory,
  );
  assert.equal(spendingView(pack, p).partial, true);
  assert.equal(spendingView(pack, p).materials.net, 0);
  p.spoilers = true;
  assert.equal(spendingView(pack, p).materials.net, 5);
});
test("B08 v2 migration has no invented spending and malformed sequences refuse", () => {
  const { pack, profile } = fixture();
  const v2 = structuredClone(profile);
  v2.schemaVersion = 2;
  delete v2.spendHistory;
  v2.upgradeProgress["test:first"] = {
    completion: "completed",
    availability: "unknown",
    reviewRequired: false,
  };
  const upgraded = previewUpgradeMigration(v2, pack).candidate;
  assert.equal(upgraded.schemaVersion, 3);
  assert.deepEqual(upgraded.spendHistory, []);
  assert.equal(upgraded.upgradeProgress["test:first"].completion, "completed");
  const p = recordUpgradePurchase(pack, profile, "test:first", op()).candidate;
  for (const mutate of [
    (q) => q.spendHistory.push({ ...q.spendHistory[0], id: "spend:duplicate" }),
    (q) => q.spendHistory[0].costs[0].after++,
    (q) =>
      q.spendHistory.push({
        id: "spend:reverse",
        kind: "reversal",
        recordedAt: when,
        purchaseId: "spend:missing",
      }),
    (q) => (q.spendHistory[0].costs[0].unit = "resource-unit"),
  ]) {
    const q = structuredClone(p);
    mutate(q);
    assert.throws(() => validateProfile(q));
  }
});
test("B10 hidden cost blocks preview without revealing its label", () => {
  const { pack, profile } = fixture();
  pack.items[0].spoiler = true;
  pack.items[0].name = "Secret identity";
  assert.throws(
    () => recordUpgradePurchase(pack, profile, "test:first", op()),
    (e) => /spoiler/i.test(e.message) && !e.message.includes("Secret"),
  );
});

test("B05/B11 actual admitted observed catalog records all eight known direct costs despite incomplete readiness metadata", async () => {
  const { loadFixturePack } = await import("../helpers/catalog.mjs");
  const pack = loadFixturePack("upgrade-observations");
  for (const objective of pack.objectives) {
    const p = newProfile(pack);
    for (const item of pack.items)
      p.inventory[item.id] = item.kind === "currency" ? 2000000 : 1000000;
    const result = recordUpgradePurchase(pack, p, objective.id, op());
    assert(
      result.warnings.some((message) =>
        /partial|listed|incomplete/i.test(message),
      ),
    );
    assert(
      result.warnings.some((message) => /build|prerequisite/i.test(message)),
    );
    assert.equal(result.candidate.spendHistory.length, 1);
    for (const cost of result.event.costs) {
      assert.equal(
        cost.consumed,
        objective.requirements
          .filter((r) => r.itemId === cost.itemId)
          .reduce((sum, r) => sum + r.quantity, 0),
      );
      assert.equal(
        result.candidate.inventory[cost.itemId],
        p.inventory[cost.itemId] - cost.consumed,
      );
    }
    const restored = recordSpendingReversal(
      result.candidate,
      result.event.id,
      op("undo"),
    ).candidate;
    assert.deepEqual(restored.inventory, p.inventory);
    assert.deepEqual(restored.upgradeProgress, p.upgradeProgress);
  }
});
test("B11 v3 cash stock and protected reserve support 2M; costs, noncurrency and legacy bounds stay 1M", async () => {
  const { validateInventoryForPack, previewProfile } = await import(
    "../../src/domain/profile.mjs"
  );
  const { pack, profile, item, cash } = fixture();
  profile.inventory[cash] = 2000000;
  profile.reserves[cash] = 1999900;
  validateProfile(profile);
  previewProfile(profile, pack);
  const bought = recordUpgradePurchase(
    pack,
    profile,
    "test:first",
    op(),
  ).candidate;
  const cost = bought.spendHistory[0].costs.find((r) => r.itemId === cash);
  assert.deepEqual(
    [cost.before, cost.after, cost.reserve],
    [2000000, 1999900, 1999900],
  );
  assert.equal(
    recordSpendingReversal(bought, "spend:one", op("undo")).candidate.inventory[
      cash
    ],
    2000000,
  );
  const tooMuch = structuredClone(profile);
  tooMuch.inventory[cash]++;
  assert.throws(() => validateProfile(tooMuch));
  for (const field of ["inventory", "reserves"]) {
    const material = structuredClone(profile);
    material[field][item] = 1000001;
    validateProfile(material); // generic map admits unresolved kind, selected pack does not
    assert.throws(() => validateInventoryForPack(material, pack), /bound/);
    assert.throws(
      () => recordUpgradePurchase(pack, material, "test:first", op()),
      /bound/,
    );
  }
  const unresolved = structuredClone(profile);
  unresolved.inventory["retired:currency"] = 2000000;
  assert.equal(
    previewProfile(unresolved, pack).unresolved.includes("retired:currency"),
    true,
  );
  for (const version of [1, 2]) {
    const legacy = structuredClone(profile);
    legacy.schemaVersion = version;
    delete legacy.spendHistory;
    if (version === 1) {
      delete legacy.upgradeProgress;
      delete legacy.watchPins;
    }
    assert.throws(() => validateProfile(legacy), /1000000/);
  }
  const expensive = structuredClone(pack);
  expensive.objectives[0].requirements.find((r) => r.itemId === cash).quantity =
    1000001;
  assert.throws(() =>
    recordUpgradePurchase(expensive, profile, "test:first", op()),
  );
});

test("B03/B07 reset retains audit; restore summaries withhold hidden amounts and counts", async () => {
  const { resetProfile } = await import("../../src/domain/profile.mjs");
  const { profileChangeSummary } = await import(
    "../../src/domain/profile-preview.mjs"
  );
  const { pack, profile, item } = fixture();
  const bought = recordUpgradePurchase(
    pack,
    profile,
    "test:first",
    op(),
  ).candidate;
  const reset = resetProfile(bought, pack);
  assert.deepEqual(reset.spendHistory, bought.spendHistory);
  assert.deepEqual(reset.inventory, {});
  assert.throws(
    () => recordUpgradePurchase(pack, reset, "test:first", op("again")),
    /recorded/,
  );
  const summary = profileChangeSummary(profile, bought, pack);
  assert(summary.historyChanged);
  assert(JSON.stringify(summary).includes("gross 5"));
  pack.items[0].spoiler = true;
  pack.items[0].name = "Secret cost";
  profile.inventory[item] = 92341;
  const hidden = profileChangeSummary(profile, bought, pack);
  const text = JSON.stringify(hidden);
  for (const withheld of ["Secret cost", "92341", "gross 5", "spend:one"])
    assert(!text.includes(withheld), withheld);
  assert(hidden.historyPartial);
  assert.match(text, /withheld|protected/i);
});
test("B12 selected rebind rejects newly known noncurrency overflow but retains unresolved cash references", async () => {
  const { previewContentRebind } = await import(
    "../../src/domain/profile-preview.mjs"
  );
  const { previewProfile } = await import("../../src/domain/profile.mjs");
  const { pack, profile, item } = fixture();
  profile.contentVersion = "previous-version";
  profile.inventory[item] = 2000000;
  previewProfile(profile, pack); // mismatched content retains historical values pending explicit rebind
  assert.throws(() => previewContentRebind(profile, pack), /bound/);
  delete profile.inventory[item];
  profile.inventory["retired:currency"] = 2000000;
  const next = previewContentRebind(profile, pack).candidate;
  assert.equal(next.inventory["retired:currency"], 2000000);
});

test("B12 purchase reserves both actual CAS revisions for an immediate reversal", () => {
  const { pack, profile } = fixture();
  profile.revision = Number.MAX_SAFE_INTEGER - 1;
  assert.throws(
    () =>
      recordUpgradePurchase(
        pack,
        profile,
        "test:first",
        op("near-limit", profile.revision),
      ),
    /revision/i,
  );
  assert.deepEqual(profile.spendHistory, []);
  profile.revision--;
  const bought = recordUpgradePurchase(
    pack,
    profile,
    "test:first",
    op("within-limit", profile.revision),
  ).candidate;
  bought.revision++;
  const reversed = recordSpendingReversal(
    bought,
    "spend:within-limit",
    op("undo-limit", bought.revision),
  ).candidate;
  reversed.revision++;
  assert.equal(reversed.revision, Number.MAX_SAFE_INTEGER);
  validateProfile(reversed);
});

test("B08/B12 history limits reserve event500 for the immediate safe reversal", () => {
  const { pack, profile } = fixture();
  const seed = recordUpgradePurchase(pack, profile, "test:first", op()).event;
  const large = structuredClone(profile);
  large.spendHistory = Array.from({ length: 498 }, (_, i) => ({
    ...structuredClone(seed),
    id: `spend:historic-${i}`,
    upgradeId: `old:upgrade-${i}`,
    observationKeys: [`historic-${i}`],
  }));
  validateProfile(large);
  const original = structuredClone(large);
  const bought = recordUpgradePurchase(
    pack,
    large,
    "test:first",
    op("boundary"),
  ).candidate;
  assert.equal(bought.spendHistory.length, 499);
  assert.deepEqual(large, original);
  assert.throws(
    () => recordUpgradePurchase(pack, bought, "test:second", op("full")),
    /full|limit/,
  );
  const reversed = recordSpendingReversal(
    bought,
    "spend:boundary",
    op("boundary-undo"),
  ).candidate;
  assert.equal(reversed.spendHistory.length, 500);
  validateProfile(reversed);
  assert.throws(
    () => recordUpgradePurchase(pack, reversed, "test:first", op("after-undo")),
    /full|limit/,
  );
  const overflow = structuredClone(reversed);
  overflow.spendHistory.push({
    ...structuredClone(seed),
    id: "spend:overflow",
    upgradeId: "old:overflow",
    observationKeys: ["overflow"],
  });
  assert.throws(() => validateProfile(overflow), /limit/);
});
test("B10 recorded totals keep mixed material units and currency identities separate", () => {
  const { pack, profile } = fixture();
  for (const [id, kind, unit, quantity] of [
    ["test:resource", "resource", "resource-unit", 7],
    ["test:other-cash", "currency", "dmz-cash", 11],
  ]) {
    pack.items.push({
      ...structuredClone(pack.items[0]),
      id,
      name: `Synthetic ${id}`,
      kind,
      unit,
    });
    pack.objectives[0].requirements.push({
      ...structuredClone(pack.objectives[0].requirements[0]),
      itemId: id,
      quantity,
    });
    profile.inventory[id] = 100;
  }
  const result = recordUpgradePurchase(
    pack,
    profile,
    "test:first",
    op(),
  ).candidate;
  const totals = spendingTotals(result);
  assert.equal(totals.materials.net, 5);
  assert.equal(totals.items.find((r) => r.itemId === "test:resource").net, 7);
  assert.deepEqual(totals.currencies.map((r) => [r.itemId, r.net]).sort(), [
    ["test:cash", 100],
    ["test:other-cash", 11],
  ]);
  const reversed = spendingTotals(
    recordSpendingReversal(result, "spend:one", op("undo")).candidate,
  );
  assert.deepEqual(reversed.materials, { gross: 5, reversed: 5, net: 0 });
  assert(reversed.items.every((r) => r.net === 0));
  assert(reversed.currencies.every((r) => r.net === 0));
});

test("B12 focused planners and advice accept 2M currency but reject known oversized noncurrency", async () => {
  const { planSingle } = await import("../../src/domain/planner.mjs");
  const { planShared } = await import("../../src/domain/shared-plan.mjs");
  const { upgradeAdvice } = await import("../../src/domain/upgrade-advice.mjs");
  const { pack, profile, item, cash } = fixture();
  profile.inventory[cash] = 2000000;
  profile.goals = [{ id: "test:first", quantity: 1 }];
  for (const calculate of [planSingle, planShared, upgradeAdvice])
    assert.doesNotThrow(() => calculate(pack, profile));
  assert.equal(upgradeAdvice(pack, profile).status, "ok");
  profile.inventory[item] = 1000001;
  for (const calculate of [planSingle, planShared])
    assert.throws(() => calculate(pack, profile), /bound/);
  assert.equal(upgradeAdvice(pack, profile).status, "blocked");
});
