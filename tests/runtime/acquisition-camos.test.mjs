import test from "node:test";
import assert from "node:assert/strict";
import { readWeaponCamos } from "../../src/content/weapon-camos.mjs";
import {
  acquisitionCamoIcons,
  acquisitionCamoPanel,
} from "../../src/ui/acquisition-camos.mjs";

test("FR01/03: every recorded weapon/camo has a compact scoped button and exact requirement", async () => {
  const catalog = await readWeaponCamos();
  let count = 0;
  for (const weapon of catalog.weapons) {
    const html = acquisitionCamoIcons(weapon);
    assert.equal((html.match(/data-acq-camo=/g) || []).length, 25);
    assert.equal((html.match(/acquisition-camo-tier-label/g) || []).length, 5);
    for (const row of weapon.rows) {
      assert.ok(html.includes(`data-acq-camo="${row.id}"`));
      assert.ok(html.includes(`aria-controls="acq-camo-panel-${weapon.id}"`));
    }
    assert.ok(
      acquisitionCamoPanel(weapon).includes(`id="acq-camo-panel-${weapon.id}"`),
    );
    count += weapon.rows.length;
  }
  assert.equal(count, 875);
  assert.equal(acquisitionCamoIcons(null), "");
});

test("FR03: imported names/requirements stay escaped and inert", () => {
  const html = acquisitionCamoIcons({
    id: "test",
    rows: [
      {
        id: "test",
        name: '<img onerror="bad">',
        requirement: "<script>bad</script>",
        group: "military",
      },
    ],
  });
  assert.ok(!html.includes("<script>"));
  assert.ok(html.includes("&lt;script&gt;bad&lt;/script&gt;"));
  assert.ok(html.includes("&lt;img onerror=&quot;bad&quot;&gt;"));
});
