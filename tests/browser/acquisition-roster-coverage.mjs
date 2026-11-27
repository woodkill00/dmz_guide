import assert from "node:assert/strict";
import { chromium, firefox, webkit } from "playwright";
import { readWeaponAcquisition } from "../../src/content/weapon-acquisition.mjs";
const base = process.env.DMZ_SITE_URL || "http://127.0.0.1:4173";
const expected = (await readWeaponAcquisition()).weapons
  .map((w) => w.id)
  .sort();
const stock = (page) =>
  page.evaluate(
    async () =>
      (
        await (
          await import("/assets/src/storage/armory-store.mjs")
        ).readArmory()
      ).value,
  );
async function committed(page, revision) {
  await page.waitForFunction(
    (revision) =>
      document.querySelector("main").dataset.armoryRevision ===
        String(revision) &&
      document.querySelector("main").dataset.armoryBusy === "false",
    revision,
  );
}
for (const [name, type] of Object.entries({ chromium, firefox, webkit })) {
  const browser = await type.launch(),
    context = await browser.newContext(),
    page = await context.newPage();
  try {
    await page.goto(base + "/armory/workbench/#acquisition");
    await page.waitForFunction(
      () => document.querySelector("main").dataset.armoryReady === "true",
    );
    await page.evaluate(async () => {
      const { readArmory, saveArmory } = await import(
        "/assets/src/storage/armory-store.mjs"
      );
      const { value } = await readArmory();
      value.acquisition["cronen-osprey"] = {
        manual: true,
        manualExtractions: 2,
        attachments: [],
        blueprints: ["Synthetic saved blueprint"],
      };
      value.acquisition.m4 = {
        manual: true,
        manualExtractions: 3,
        attachments: [],
        blueprints: [],
      };
      value.camoCompletions = ["weapon:cronen-osprey:military-camo-1"];
      await saveArmory(value, value.revision);
    });
    await page.reload();
    await page.waitForFunction(
      () => document.querySelector("main").dataset.armoryReady === "true",
    );
    assert.deepEqual(
      await page
        .locator("[data-acquisition-weapon]")
        .evaluateAll((nodes) =>
          nodes.map((n) => n.dataset.acquisitionWeapon).sort(),
        ),
      expected,
    );
    assert.equal(await page.locator("#tracker-weapon option").count(), 35);
    for (const id of ["cronen-osprey", "csg-35"]) {
      assert.equal(
        await page.locator(`#build-weapon option[value="${id}"]`).count(),
        0,
      );
      assert.equal(
        await page.locator(`#comparison-weapons input[value="${id}"]`).count(),
        0,
      );
      assert.equal(
        await page
          .locator(`[data-acquisition-camos="${id}"] [data-acq-camo]`)
          .count(),
        25,
      );
    }
    await page.locator("#acquisition-query").fill("Cronen Osprey");
    await page.locator("#acquisition-class").selectOption("assault-rifle");
    const row = page.locator('[data-acquisition-weapon="cronen-osprey"]'),
      manual = row.locator("[data-roster-manual]");
    assert.ok(await row.isVisible());
    assert.ok(await manual.isChecked());
    assert.equal(
      await row
        .locator('[data-acq-camo="military-camo-1"]')
        .getAttribute("data-state"),
      "completed",
    );
    const link = new URL(
      await row.locator(":scope > a").getAttribute("href"),
      base,
    );
    assert.equal(link.pathname, "/armory/acquisition/");
    assert.equal(link.searchParams.get("weapon"), "cronen-osprey");
    assert.equal(link.hash, "#weapon-cronen-osprey");
    assert.ok((await page.request.get(link.href)).ok());
    let revision = (await stock(page)).revision;
    await manual.uncheck();
    await committed(page, ++revision);
    await manual.check();
    await committed(page, ++revision);
    await row.locator("[data-inspect-acquisition]").click();
    assert.equal(
      await page.locator("#tracker-weapon").inputValue(),
      "cronen-osprey",
    );
    assert.ok(
      !(await page.locator("#archived-references").innerText()).includes(
        "cronen-osprey",
      ),
    );
    await row.locator('[data-acq-camo="military-camo-2"]').click();
    await page
      .locator("#acq-camo-panel-cronen-osprey [data-acq-camo-complete]")
      .check();
    await committed(page, ++revision);
    const value = await stock(page);
    assert.equal(value.acquisition["cronen-osprey"].manualExtractions, 2);
    assert.deepEqual(value.acquisition["cronen-osprey"].blueprints, [
      "Synthetic saved blueprint",
    ]);
    assert.equal(value.acquisition.m4.manualExtractions, 3);
    await page.reload();
    await page.waitForFunction(
      () =>
        document.querySelector(
          '[data-acquisition-camos="cronen-osprey"] [data-acq-camo="military-camo-2"]',
        )?.dataset.state === "completed",
    );
    assert.ok(await manual.isChecked());
    await page.goto(link.href);
    await page.waitForFunction(
      () =>
        document.querySelector("#weapon-acquisition").dataset.busy === "false",
    );
    const dedicated = page.locator("#weapon-cronen-osprey");
    assert.ok(await dedicated.locator("[data-manual]").isChecked());
    assert.equal(await dedicated.locator("[name=count]").inputValue(), "2");
    assert.equal(
      await dedicated
        .locator('[data-acq-camo="military-camo-2"]')
        .getAttribute("data-state"),
      "completed",
    );
    console.log(
      `${name}: exact35 acquisition/33 combat boundary; Cronen search/manual/25camos/save/reload/detail parity and existing extraction/blueprint/unrelated data retained PASS`,
    );
  } finally {
    await context.close();
    await browser.close();
  }
}
