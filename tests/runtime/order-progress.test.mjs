import { orderCompletionCheck } from "../../src/ui/order-progress.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { loadFixturePack } from "../helpers/catalog.mjs";
import { newProfile } from "../../src/domain/profile.mjs";
import {
  orderProgress,
  setOrderCompletion,
} from "../../src/domain/order-progress.mjs";
import { projectDashboard } from "../../src/domain/dashboard.mjs";
import { dashboardOrderCards } from "../../src/ui/order-cards.mjs";
import {
  createOrderOperation,
  commitFoundOperation,
  verifyFoundOperation,
} from "../../src/client/collection-action.mjs";
const pack = loadFixturePack("official-starter");
const page = projectDashboard(pack, newProfile(pack)).orders.find(
  (r) => r.set === "hajin" && r.total > 1,
);
const ids = page.rows.map((r) => r.id);
test("order page derives mixed/complete from exact mission states and preserves stock/other fields", () => {
  const profile = newProfile(pack);
  profile.inventory["mw4:synthetics"] = 100;
  const before = structuredClone(profile);
  let next = setOrderCompletion(pack, profile, [ids[0]], true);
  assert.equal(orderProgress(pack, next, ids).partial, true);
  next = setOrderCompletion(pack, next, ids, true);
  assert.equal(orderProgress(pack, next, ids).complete, true);
  assert.deepEqual(next.inventory, before.inventory);
  assert.deepEqual(profile, before);
  next = setOrderCompletion(pack, next, [ids[0]], false);
  assert.equal(next.completion[ids[0]], "unknown");
  assert.equal(next.completion[ids[1]], "completed");
  assert.equal(orderProgress(pack, next, []).complete, false);
});
test("orders reject stale, missing, nonmission and protected writes", () => {
  const p = newProfile(pack);
  for (const args of [
    [[], true],
    [["absent"], true],
    [[pack.items[0].id], true],
    [ids, "completed"],
  ])
    assert.throws(() => setOrderCompletion(pack, p, ...args));
  assert.throws(() =>
    setOrderCompletion(pack, { ...p, contentVersion: "old" }, ids, true),
  );
  const changed = structuredClone(pack);
  changed.objectives.find((r) => r.id === ids[0]).spoiler = true;
  assert.throws(() => setOrderCompletion(changed, p, ids, true));
  assert.equal(orderProgress(changed, p, ids).total, ids.length - 1);
  assert.equal(
    setOrderCompletion(changed, { ...p, spoilers: true }, ids, true).completion[
      ids[0]
    ],
    "completed",
  );
});
test("dashboard hides completed orders by default and permits explicit completed view", () => {
  const p = setOrderCompletion(pack, newProfile(pack), ids, true);
  const model = projectDashboard(pack, p);
  const key = page.set + "-" + page.page;
  assert(
    !dashboardOrderCards(model, pack, { expanded: true }).includes(
      'data-order-key="' + key + '"',
    ),
  );
  assert(
    dashboardOrderCards(model, pack, {
      expanded: true,
      showCompleted: true,
    }).includes('data-order-key="' + key + '"'),
  );
  const partial = projectDashboard(
    pack,
    setOrderCompletion(pack, newProfile(pack), [ids[0]], true),
  );
  assert(
    dashboardOrderCards(partial, pack).includes('data-order-partial="true"'),
  );
});
test("status operation uses durable receipt, exact roster and canonical newer state without inventory journal", async () => {
  const p = newProfile(pack);
  const op = createOrderOperation(pack, p, ids, true, { key: "hajin-1" });
  const stock = structuredClone(p.inventory);
  let writes = 0;
  const saved = { ...op.candidate, revision: p.revision + 1 };
  await commitFoundOperation(op, {
    save: async () => {
      writes++;
      return saved;
    },
  });
  assert.deepEqual(
    (await verifyFoundOperation(op, { read: async () => saved })).inventory,
    stock,
  );
  await assert.rejects(
    verifyFoundOperation(op, {
      read: async () => {
        throw Error("read fail");
      },
    }),
  );
  const newer = { ...saved, revision: saved.revision + 1, completion: {} };
  assert.equal(
    await verifyFoundOperation(op, { read: async () => newer }),
    newer,
  );
  assert.equal(writes, 1);
  assert.deepEqual(op.orderIds, ids);
});

test("completion labels include visible Done/Partly done and empty rosters remain disabled", () => {
  assert.match(
    orderCompletionCheck("page", "Page1"),
    /aria-label="Done: Page1"/,
  );
  assert.match(
    orderCompletionCheck("page", "Page1", { partial: true }),
    /aria-label="Partly done: Page1"/,
  );
  assert.match(
    orderCompletionCheck("page", "Page1", { total: 0 }),
    /disabled data-order-readonly/,
  );
});
