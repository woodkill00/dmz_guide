import test from "node:test";
import assert from "node:assert/strict";
import { loadFixturePack } from "../helpers/catalog.mjs";
import { hajinOrderSequence } from "../../src/content/hajin-order-sequence.mjs";
import { ordersPageCoverage } from "../../src/domain/progression.mjs";
import { orderPageLabel } from "../../src/domain/order-progress.mjs";
import { newProfile } from "../../src/domain/profile.mjs";
import { projectDashboard } from "../../src/domain/dashboard.mjs";
import { dashboardOrderCards } from "../../src/ui/order-cards.mjs";
const pack = loadFixturePack("official-starter");
test("every canonical Hajin and X01 page is present with existing unique mission references", () => {
  assert.deepEqual(
    hajinOrderSequence.pages.map((p) => p.page),
    Array.from({ length: 24 }, (_, i) => i + 1),
  );
  const x01 = ordersPageCoverage(pack, 5, "x01");
  assert.deepEqual(
    x01.map((p) => p.page),
    [1, 2, 3, 4, 5],
  );
  const ids = [...hajinOrderSequence.pages, ...x01].flatMap(
    (p) => p.objectiveIds,
  );
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids)
    assert(
      pack.objectives.some((r) => r.id === id),
      id,
    );
  for (const p of [...hajinOrderSequence.pages, ...x01])
    assert(p.objectiveIds.length > 0);
});
test("page numbers precede chapter titles, without duplicating simple Page labels", () => {
  assert.equal(
    orderPageLabel(3, "Human Intel 2/2"),
    "Page 3 · Human Intel 2/2",
  );
  assert.equal(orderPageLabel(1, "Page 1"), "Page 1");
  assert.equal(orderPageLabel(2, "X01 2/5", "x01"), "Page 2 of 5");
  const model = projectDashboard(pack, newProfile(pack));
  assert.equal(model.orders.length, 29);
  for (const page of model.orders)
    assert(page.label.startsWith("Page " + page.page));
  const html = dashboardOrderCards(model, pack);
  assert(html.includes("All 24 pages"));
  assert(html.includes("All 5 pages"));
  for (const page of model.orders)
    assert(html.includes("&amp;page=" + page.set + "-" + page.page + '"'));
  assert(html.includes("Showing 3 of 24 unfinished pages"));
});
