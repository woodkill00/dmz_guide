import test from "node:test";
import assert from "node:assert/strict";
import { loadFixturePack } from "../helpers/catalog.mjs";
import { newProfile } from "../../src/domain/profile.mjs";
import { upgradeNeeds } from "../../src/domain/upgrade-needs.mjs";
import { inventoryReviewReasons } from "../../src/domain/inventory-review.mjs";
import {
  collectionNeedsValues,
  upgradeNeedsDetail,
} from "../../src/client/upgrade-needs-view.mjs";
for (const key of ["official-starter", "upgrade-observations"]) {
  test(
    "all actual catalog review states have actionable reasons: " + key,
    () => {
      const pack = loadFixturePack(key);
      for (const stock of [undefined, 0, 1000000]) {
        const p = newProfile(pack);
        if (stock !== undefined)
          for (const i of pack.items) p.inventory[i.id] = stock;
        const before = structuredClone(p),
          n = upgradeNeeds(pack, p);
        for (const r of n.listedCollection.values()) {
          if (r.state !== "review") continue;
          const reasons = inventoryReviewReasons(
            pack,
            p,
            n.listedCollection,
            r,
          );
          assert(reasons.length, r.id);
          assert.equal(
            reasons.some((r) => r.code === "stock"),
            stock === undefined,
          );
          assert.match(
            upgradeNeedsDetail(pack, n, r.id, p),
            /Why this needs attention/,
          );
        }
        assert.deepEqual(p, before);
      }
    },
  );
}
test("historical reference cash gaps identify exact records and stay minimums; entering stock only resolves stock reason", () => {
  const pack = loadFixturePack("upgrade-observations"),
    p = newProfile(pack),
    id = "observed:cash";
  let n = upgradeNeeds(pack, p),
    r = n.listedCollection.get(id);
  const reasons = inventoryReviewReasons(pack, p, n.listedCollection, r);
  assert(
    reasons.some(
      (r) => r.code === "quantity" && /Vendor Item Upgrade I/.test(r.text),
    ),
  );
  assert.equal(
    collectionNeedsValues(n.listedCollection, id).required,
    "At least 2,840,000",
  );
  p.inventory[id] = 100;
  n = upgradeNeeds(pack, p);
  r = n.listedCollection.get(id);
  assert(
    !inventoryReviewReasons(pack, p, n.listedCollection, r).some(
      (r) => r.code === "stock",
    ),
  );
  assert.equal(
    collectionNeedsValues(n.listedCollection, id).missing,
    "At least 2,839,900",
  );
  n.listedCollection.blocked = true;
  assert(
    inventoryReviewReasons(pack, p, n.listedCollection, r).some(
      (r) => r.code === "binding",
    ),
  );
});
test("review prose escapes external record names", () => {
  const pack = loadFixturePack("official-starter"),
    p = newProfile(pack);
  pack.objectives.find(
    (o) => o.id === "mw4:upgrade-vendor-item-upgrade-ii",
  ).name = "<img src=x onerror=alert(1)>";
  const n = upgradeNeeds(pack, p),
    html = upgradeNeedsDetail(pack, n, "mw4:ingredient-control-unit", p);
  assert(!html.includes("<img"));
  assert(html.includes("&lt;img"));
});
