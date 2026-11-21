import assert from "node:assert/strict";
import { chromium, firefox, webkit } from "playwright";
import { readWeaponCamos } from "../../src/content/weapon-camos.mjs";
import { readWeaponIntel } from "../../src/content/weapon-intel.mjs";
const base = process.env.DMZ_SITE_URL || "http://127.0.0.1:4173";
const catalog = await readWeaponCamos(),
  db = await readWeaponIntel();
const weapon = catalog.weapons.find((w) =>
  db.weapons.some((g) => g.id === w.id),
);
for (const [engine, type] of Object.entries({ chromium, firefox, webkit })) {
  const browser = await type.launch(),
    context = await browser.newContext(),
    page = await context.newPage();
  try {
    for (const path of [
      "/armory/acquisition/",
      "/armory/workbench/#acquisition",
    ]) {
      await page.goto(base + path);
      if (path.includes("workbench"))
        await page.waitForFunction(
          () => document.querySelector("main").dataset.armoryReady === "true",
        );
      else
        await page.waitForFunction(
          () =>
            document.querySelector("#weapon-acquisition").dataset.busy ===
              "false" && !document.querySelector("[data-manual]").disabled,
        );
      const expected = path.includes("workbench") ? db.weapons.length : 35;
      assert.equal(
        await page.locator("[data-acquisition-camos]").count(),
        expected,
      );
      assert.equal(
        await page.locator("[data-acq-camo]").count(),
        expected * 25,
      );
      const strip = page.locator(`[data-acquisition-camos="${weapon.id}"]`),
        panel = page.locator(`#acq-camo-panel-${weapon.id}`);
      const first = strip.locator(`[data-acq-camo="${weapon.rows[0].id}"]`);
      const snapshot = () =>
        page.evaluate(
          async () =>
            (
              await (
                await import("/assets/src/storage/armory-store.mjs")
              ).readArmory()
            ).value,
        );
      const before = await snapshot();
      await first.click();
      await panel.waitFor({ state: "visible" });
      assert.equal(
        await panel.locator("[data-acq-camo-requirement]").innerText(),
        weapon.rows[0].requirement,
      );
      assert.equal((await snapshot()).revision, before.revision);
      await strip.locator('[data-acq-camo="gold"]').focus();
      await page.keyboard.press("Enter");
      assert.equal(
        await panel.locator("[data-acq-camo-requirement]").innerText(),
        weapon.rows.find((r) => r.id === "gold").requirement,
      );
      await panel.locator("[data-acq-camo-close]").click();
      assert.equal(
        await strip
          .locator('[data-acq-camo="gold"]')
          .getAttribute("aria-expanded"),
        "false",
      );
      await page.evaluate(
        async ({ id, camo }) => {
          const { readArmory, saveArmory } = await import(
            "/assets/src/storage/armory-store.mjs"
          );
          const { value } = await readArmory();
          value.camoCompletions = [`weapon:${id}:${camo}`, "shared:divergence"];
          await saveArmory(value, value.revision);
        },
        { id: weapon.id, camo: weapon.rows[0].id },
      );
      await page.reload();
      await page.waitForFunction(
        ({ id, camo }) =>
          document.querySelector(
            `[data-acquisition-camos="${id}"] [data-acq-camo="${camo}"]`,
          )?.dataset.state === "completed",
        { id: weapon.id, camo: weapon.rows[0].id },
      );
      assert.equal(
        await strip
          .locator(`[data-acq-camo="${weapon.rows[1].id}"]`)
          .getAttribute("data-state"),
        "next",
      );
      assert.equal(
        await strip
          .locator('[data-acq-camo="gold"]')
          .getAttribute("data-state"),
        "remaining",
      );
      for (const [id, color] of [
        [weapon.rows[0].id, "rgb(97, 199, 115)"],
        [weapon.rows[1].id, "rgb(232, 189, 73)"],
        ["gold", "rgb(226, 102, 102)"],
      ]) {
        assert.equal(
          await strip
            .locator(`[data-acq-camo="${id}"]`)
            .evaluate((n) => getComputedStyle(n).borderColor),
          color,
        );
      }
      for (const tile of await page
        .locator('[data-acq-camo="divergence"]')
        .all())
        assert.equal(await tile.getAttribute("data-state"), "completed");
      await first.click();
      const checkbox = path.includes("workbench")
        ? page.locator(`[data-roster-manual="${weapon.id}"]`)
        : page.locator(`[data-manual="${weapon.id}"]`);
      const revision = (await snapshot()).revision;
      await checkbox.setChecked(!(await checkbox.isChecked()));
      await page.waitForFunction(
        async (rev) =>
          (
            await (
              await import("/assets/src/storage/armory-store.mjs")
            ).readArmory()
          ).value.revision > rev,
        revision,
      );
      await panel.waitFor({ state: "visible" });
      assert.equal(await first.getAttribute("data-state"), "completed");
      const query = page.locator(
        path.includes("workbench") ? "#acquisition-query" : "#acq-query",
      );
      await query.fill("no-such-weapon-099");
      await query.fill(weapon.name);
      await panel.waitFor({ state: "visible" });
      assert.equal(await first.getAttribute("aria-expanded"), "true");
      await page.setViewportSize({ width: 390, height: 844 });
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      );
      await first.scrollIntoViewIfNeeded();
      await page.screenshot({
        path: `test-results/099-${engine}-${path.includes("workbench") ? "workbench" : "acquisition"}-mobile.png`,
      });
      await page.setViewportSize({ width: 1280, height: 900 });
    }
    await page.route("**/local-camo-images/**", (route) =>
      route.fulfill({ status: 404, body: "" }),
    );
    await page.goto(base + "/armory/acquisition/");
    const missing = page.locator("[data-acq-camo]").first();
    await missing.scrollIntoViewIfNeeded();
    await missing
      .locator(".acquisition-camo-fallback")
      .waitFor({ state: "visible" });
    assert.ok(await missing.locator("img").isHidden());
    await missing.click();
    assert.ok(
      await page
        .locator(
          ".acquisition-camo-panel:not([hidden]) [data-acq-camo-requirement]",
        )
        .innerText(),
    );
    console.log(
      `${engine}: both acquisition surfaces; all icons/requirements; keyboard; no click writes; saved/shared states; manual save preserves panel; mobile PASS`,
    );
  } finally {
    await context.close();
    await browser.close();
  }
}
