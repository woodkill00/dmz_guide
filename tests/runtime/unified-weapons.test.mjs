import test from "node:test";
import assert from "node:assert/strict";
import { unifiedFeaturePages } from "../../src/ui/armory-page.mjs";
import { unifiedFeaturePages as legacyCamos } from "../../src/ui/weapon-camos-page.mjs";
import { readWeaponAcquisition } from "../../src/content/weapon-acquisition.mjs";
import {
  resolveWeaponEntry,
  weaponURL,
  weaponSections,
} from "../../src/domain/weapon-routes.mjs";
import { featureURL, features } from "../../src/ui/feature-registry.mjs";
const catalog = await readWeaponAcquisition(),
  ids = catalog.weapons.map((w) => w.id);
test("108 R1/R2 all weapon identities have full tools without duplicate controls or invented combat", async () => {
  const pages = await unifiedFeaturePages([]);
  assert.equal(pages.length, ids.length + 2);
  for (const page of pages.filter((p) => p.path !== "/armory/updates/")) {
    for (const section of Object.keys(weaponSections))
      assert(page.body.includes(`id="${section}" data-workbench-panel`));
    const htmlIds = [...page.body.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    assert.equal(new Set(htmlIds).size, htmlIds.length, page.path);
    assert(page.body.includes('id="weapon-extractions"'));
    assert(page.body.includes('id="weapon-known-blueprints"'));
    assert(page.body.includes('id="tracker-attachments"'));
    assert.equal(
      page.scripts.filter((s) => /workbench\.mjs$/.test(s)).length,
      1,
    );
    assert(
      !page.scripts.some((s) => /camo-tracker|weapon-acquisition/.test(s)),
    );
    const context = JSON.parse(
      page.body.match(/id="unified-weapon-context">(.*?)<\/script>/)[1],
    );
    assert(ids.includes(context.weapon));
    assert.equal((page.body.match(/data-camo-tile="/g) || []).length, 25);
    if (!context.combat)
      assert(
        page.body.includes(
          "Combat statistics and attachment compatibility have not been catalogued",
        ),
      );
    assert(!page.body.includes("undefined"));
  }
  for (const id of ids) assert(pages.some((p) => p.path === `/armory/${id}/`));
});
test("108 R5 aliases are bounded native fallbacks with matching weapon context", async () => {
  const aliases = await legacyCamos();
  assert.equal(aliases.length, ids.length + 1);
  for (const id of ids) {
    const page = aliases.find((p) => p.path === `/armory/camos/${id}/`);
    assert(page.body.includes(`href="/armory/${id}/#camos"`));
    assert(!page.body.includes('id="camo-tracker"'));
  }
});
test("108 R5 route contract covers old tabs, camo/shared anchors, reference anchors and selectors", () => {
  const samples = [
    ["/armory/workbench/?weapon=m4#builder", "/armory/m4/#builder"],
    ["/armory/acquisition/?weapon=m4#weapon-m4", "/armory/m4/#acquisition"],
    ["/armory/acquisition/#weapon-m4", "/armory/m4/#acquisition"],
    ["/armory/camos/m4/#divergence", "/armory/m4/#camo:divergence"],
    ["/armory/camos/#camos", "/armory/#camos"],
    ["/armory/m4/#attachments", "/armory/m4/#attachments"],
    ["/armory/m4/#owned-attachments", "/armory/m4/#owned-attachments"],
    [
      "/armory/?pack=official%3Amw4-dmz-starter#compare",
      "/armory/?pack=official%3Amw4-dmz-starter#compare",
    ],
  ];
  for (const [url, result] of samples)
    assert.equal(resolveWeaponEntry(url, ids).href, result);
  for (const query of [
    "weapon=no-such-weapon",
    "weapon=m4&weapon=m4",
    "weapon=https://bad.invalid/",
  ]) {
    const entry = resolveWeaponEntry("/armory/acquisition/?" + query, ids);
    assert(entry.notice);
    assert.equal(entry.href, "/armory/#acquisition");
  }
  assert.throws(() => weaponURL("../escape"));
  for (const id of [
    "dmz-weapons",
    "armory-workbench",
    "weapon-acquisition",
    "weapon-camos",
    "weapons",
  ])
    assert(
      featureURL(features.find((f) => f.id === id)).startsWith("/armory/"),
    );
});
