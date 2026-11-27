import test from "node:test";
import assert from "node:assert/strict";
import { readWeaponCamos } from "../../src/content/weapon-camos.mjs";
import { readWeaponAcquisition } from "../../src/content/weapon-acquisition.mjs";
import { emptyArmory } from "../../src/domain/armory-workspace.mjs";
import {
  progressCatalog,
  editCamoCompletion,
} from "../../src/domain/camo-progress.mjs";
import {
  pickerCamo,
  parsePickerChoices,
} from "../../src/domain/weapon-picker.mjs";
import { renderWeaponPicker } from "../../src/ui/weapon-picker-view.mjs";
import { weaponClasses } from "../../src/ui/gunsmith-presentation.mjs";
const full = await readWeaponCamos(),
  catalog = progressCatalog(full),
  weapon = full.weapons.find((w) => w.id === "m4");
const complete = (value, row) =>
  editCamoCompletion(value, catalog, weapon.id, row.id, true);
test("R8 saved Military→parallel Specials→Gold advances without erasing independent progress", () => {
  let workspace = emptyArmory();
  assert.equal(
    pickerCamo(catalog, weapon, workspace).current.id,
    weapon.rows[0].id,
  );
  for (const row of weapon.rows.filter((r) => r.group === "military"))
    workspace = complete(workspace, row);
  const specials = weapon.rows.filter((r) => r.group === "special");
  assert.equal(
    pickerCamo(catalog, weapon, workspace).current.id,
    specials[0].id,
  );
  assert.equal(
    pickerCamo(catalog, weapon, workspace, specials[2].id).current.id,
    specials[2].id,
  );
  workspace = complete(workspace, specials[2]);
  assert.equal(
    pickerCamo(catalog, weapon, workspace, specials[2].id).current.id,
    specials[0].id,
  );
  for (const row of specials.slice(0, 2)) workspace = complete(workspace, row);
  const before = structuredClone(workspace);
  assert.equal(pickerCamo(catalog, weapon, workspace).current.id, "gold");
  assert.deepEqual(workspace, before);
});
test("R8 Prestige never precedes outstanding non-Prestige camos, including gated challenges and saved choices", () => {
  for (const gun of full.weapons) {
    let workspace = emptyArmory();
    const prestige = gun.rows.find((row) => row.group === "prestige");
    for (const row of gun.rows.filter((row) => row.group !== "prestige")) {
      const view = pickerCamo(catalog, gun, workspace, prestige?.id);
      assert.notEqual(view.current.group, "prestige", gun.id);
      workspace = editCamoCompletion(workspace, catalog, gun.id, row.id, true);
    }
    assert.equal(pickerCamo(catalog, gun, workspace).current, null);
    assert.equal(
      pickerCamo(catalog, gun, workspace, "", true).current.group,
      "prestige",
    );
  }
});
test("R8 shared completions refresh every weapon and completed rosters have no fake next goal", () => {
  let workspace = complete(
    emptyArmory(),
    weapon.rows.find((r) => r.id === "helio"),
  );
  for (const w of full.weapons)
    assert.equal(pickerCamo(catalog, w, workspace).completed, 1);
  for (const row of weapon.rows) workspace = complete(workspace, row);
  const view = pickerCamo(catalog, weapon, workspace);
  assert.equal(view.completed, 21);
  assert.equal(view.current, null);
  assert.deepEqual(view.remaining, []);
});
test("R8 bounded UI selections reject malformed, foreign, duplicate and excessive choices", () => {
  assert.equal(
    parsePickerChoices(
      JSON.stringify([[weapon.id, weapon.rows[0].id]]),
      full.weapons,
    ).get(weapon.id),
    weapon.rows[0].id,
  );
  for (const raw of [
    null,
    "{",
    JSON.stringify({ version: 1 }),
    "x".repeat(8193),
    JSON.stringify([[weapon.id, "unknown"]]),
    JSON.stringify([["unknown", weapon.rows[0].id]]),
    JSON.stringify([
      [weapon.id, weapon.rows[0].id],
      [weapon.id, weapon.rows[1].id],
    ]),
  ])
    assert.equal(parsePickerChoices(raw, full.weapons).size, 0);
});
test("R8 picker groups every identity once in source class order with distinct interactive controls", async () => {
  const acquisition = await readWeaponAcquisition();
  const html = renderWeaponPicker(acquisition, "m4");
  assert.equal((html.match(/data-weapon-card=/g) || []).length, 35);
  assert.equal((html.match(/data-picker-manual /g) || []).length, 35);
  assert.equal((html.match(/data-picker-prestiged /g) || []).length, 35);
  assert.equal((html.match(/data-picker-camo-select /g) || []).length, 35);
  assert.equal((html.match(/data-picker-complete /g) || []).length, 35);
  assert.equal(
    (html.match(/data-picker-category=/g) || []).length,
    weaponClasses.length,
  );
  assert(
    [...html.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/g)].every(
      (match) => !/<(?:input|select|button)\b/.test(match[1]),
    ),
  );
  assert(!html.includes("onclick="));
  assert.equal(
    (html.match(/class="weapon-picker-group"[^>]* open><summary>/g) || [])
      .length,
    weaponClasses.length,
  );
  for (const [category] of weaponClasses) {
    const group = html
      .split(`data-picker-category="${category}"`)[1]
      .split("</details>")[0];
    const rows = acquisition.weapons
      .filter((w) => w.category === category)
      .sort((a, b) => a.name.localeCompare(b.name));
    assert.deepEqual(
      [...group.matchAll(/data-weapon-card="([^"]+)"/g)].map((m) => m[1]),
      rows.map((w) => w.id),
    );
  }
});
