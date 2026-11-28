import test from "node:test";
import assert from "node:assert/strict";
import { featurePages } from "../../src/ui/armory-workbench-page.mjs";
import { readWeaponAcquisition } from "../../src/content/weapon-acquisition.mjs";
import { readWeaponIntel } from "../../src/content/weapon-intel.mjs";

test("104 workbench admits every acquisition identity without inventing combat coverage", async () => {
  const [page] = await featurePages([]);
  const data = JSON.parse(
    page.body.match(/id="armory-public-data">([\s\S]*?)<\/script>/)[1],
  );
  const expected = await readWeaponAcquisition(),
    combat = await readWeaponIntel();
  assert.deepEqual(data.acquisitionWeapons, expected.weapons);
  assert.equal(new Set(data.acquisitionWeapons.map((w) => w.id)).size, 35);
  assert.deepEqual(data.db.weapons, combat.weapons);
  assert.equal(data.db.weapons.length, 35);
  const picker = page.body.match(/id="tracker-weapon">([\s\S]*?)<\/select>/)[1];
  const builder = page.body.match(/id="build-weapon">([\s\S]*?)<\/select>/)[1];
  assert.equal((picker.match(/<option/g) || []).length, 35);
  assert.equal((builder.match(/<option/g) || []).length, 35);
  for (const id of ["cronen-osprey", "csg-35"]) {
    assert.ok(picker.includes(`value="${id}"`));
    assert.ok(builder.includes(`value="${id}"`));
    const weapon = data.db.weapons.find((w) => w.id === id);
    for (const stat of Object.values(weapon.official)) {
      assert.equal(stat.value, null);
      assert.equal(stat.applicability, "unknown");
    }
    assert.equal(data.camoWeapons.find((w) => w.id === id).rows.length, 25);
  }
});
