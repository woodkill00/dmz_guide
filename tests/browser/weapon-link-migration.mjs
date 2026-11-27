import { chromium, firefox, webkit } from "playwright";
import assert from "node:assert/strict";
import { readWeaponIntel } from "../../src/content/weapon-intel.mjs";
import { monitorBrowser } from "./health.mjs";
import { startBrowserServer } from "./server.mjs";
const server = process.env.DMZ_SITE_URL ? null : await startBrowserServer();
const base = process.env.DMZ_SITE_URL || server.base;
const db = await readWeaponIntel();
const attachment = db.attachments.find((a) => !a.weapons.includes("han-86"));
assert(attachment, "Exercise a result outside the main page's initial weapon");
let failure;
try {
  for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
    const browser = await engine.launch(),
      health = monitorBrowser(browser);
    const context = await browser.newContext(),
      page = await context.newPage();
    const ready = () =>
      page.waitForSelector(
        'main[data-armory-ready="true"][data-armory-busy="false"]',
      );
    try {
      for (const [entry, weapon, section] of [
        ["/weapons/", "", "reference"],
        ["/dmz-weapons/", "", "acquisition"],
        ["/armory/workbench/?weapon=m4#builder", "m4", "builder"],
        [
          "/armory/acquisition/?weapon=cronen-osprey#weapon-cronen-osprey",
          "cronen-osprey",
          "acquisition",
        ],
        ["/armory/camos/m4/#helio", "m4", "camos"],
      ]) {
        await page.goto(base + entry);
        await ready();
        assert.equal(
          new URL(page.url()).pathname,
          weapon ? `/armory/${weapon}/` : "/armory/",
        );
        assert(await page.locator("#" + section).isVisible());
        if (entry.endsWith("#helio"))
          assert(await page.locator('[data-camo-detail="helio"]').isVisible());
      }
      await page.goto(
        base +
          "/search/?type=attachment&q=" +
          encodeURIComponent(attachment.name),
      );
      const result = page
        .locator("#unified-results")
        .getByRole("link", { name: attachment.name, exact: true });
      await result.waitFor();
      const href = await result.getAttribute("href");
      assert(
        attachment.weapons.includes(new URL(href, base).pathname.split("/")[2]),
      );
      await result.click();
      await ready();
      assert(await page.locator("#reference").isVisible());
      assert(await page.locator("#attachment-" + attachment.id).isVisible());
      for (const [section, adapter] of [
        ["acquisition", "weapon-acquisition"],
        ["camos", "weapon-camos"],
        ["reference", "weapon-intel"],
      ]) {
        await page.goto(base + "/armory/m4/#" + section);
        await ready();
        const editor = page.locator(`[data-compose-source="${adapter}"]`);
        const notes = editor.locator("xpath=ancestor::details[1]");
        await notes.locator("summary").click();
        assert(await editor.isVisible());
        assert.equal(
          await editor
            .locator("xpath=ancestor::section[@data-workbench-panel][1]")
            .getAttribute("id"),
          section,
        );
        assert(
          new URL(await editor.getAttribute("href"), base).pathname.startsWith(
            "/local-services/author/",
          ),
        );
      }
      await page.goto(base + "/armory/m4/#acquisition");
      await ready();
      await page.locator("#tracker-manual").check();
      await page.waitForSelector(
        'main[data-armory-revision="1"][data-armory-busy="false"]',
      );
      await page.goto(base + "/weapons/?weapon=m4#acquisition");
      await ready();
      assert(await page.locator("#tracker-manual").isChecked());
      assert.equal(new URL(page.url()).pathname, "/armory/m4/");
      health();
      server?.assertAlive();
      console.log(
        `${name} R7 PASS: five legacy entries, exact compatible attachment search click, three source-editor tabs, saved progress through old index; clean browser health`,
      );
    } finally {
      await context.close();
      await browser.close();
    }
  }
} catch (error) {
  failure = error;
  throw error;
} finally {
  await server?.stop(failure);
}
