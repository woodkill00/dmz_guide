import assert from "node:assert/strict";
import { chromium, firefox, webkit } from "playwright";
import { startBrowserServer } from "./server.mjs";
import { fixtureCatalog } from "../helpers/catalog.mjs";
import { allRecords, recordUrl } from "../../src/ui/render.mjs";
const records = allRecords(fixtureCatalog.packs).filter((r) => !r.spoiler),
  samples = [];
for (const type of [
  "item",
  "recipe",
  "objective",
  "guide",
  "map",
  "location",
]) {
  const record =
    records.find(
      (r) => r.recordType === type && r.pack.id === "official:mw4-dmz-starter",
    ) || records.find((r) => r.recordType === type);
  samples.push(record);
}
samples.push(
  records.find((r) => r.recordType === "item" && r.kind === "weapon"),
);
const server = await startBrowserServer();
async function revealEditing(page) {
  const action = page.locator("[data-compose-record]");
  await action.waitFor({ state: "attached" });
  if (!(await action.isVisible()))
    await page.locator(".item-edit-actions > summary").click();
  await action.waitFor();
  return action;
}
try {
  for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
    const browser = await engine.launch(),
      page = await browser.newPage({ viewport: { width: 1280, height: 900 } }),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    try {
      for (const record of samples) {
        const entry = fixtureCatalog.entries.find(
          (e) => e.pack.id === record.pack.id,
        );
        await page.goto(server.base + recordUrl(record));
        const published = await revealEditing(page);
        const target = new URL(await published.getAttribute("href"));
        assert.equal(target.searchParams.get("id"), record.id);
        assert.equal(target.searchParams.get("packKey"), entry.key);
        assert.equal(target.searchParams.get("intent"), "compose");
        await page.goto(
          server.base +
            "/local/?" +
            new URLSearchParams({ pack: record.pack.id, id: record.id }),
        );
        await revealEditing(page);
        assert.equal(
          await page
            .locator("#local-records [data-compose-record]")
            .getAttribute("href"),
          target.href,
        );
        const privateLink = new URL(
          await page.locator("[data-private-edit]").getAttribute("href"),
          server.base,
        );
        assert.equal(privateLink.searchParams.get("record"), record.id);
        const reference = page.locator("[data-repository-reference]");
        assert.equal(await reference.getAttribute("href"), recordUrl(record));
        if (!(await reference.isVisible()))
          await page.locator(".item-edit-actions > summary").click();
        await reference.click();
        assert.equal(new URL(page.url()).pathname, recordUrl(record));
        assert(await page.locator("[data-compose-record]").count());
      }
      await page.goto(server.base + "/items/manage/");
      const row = page.locator("tbody tr").first();
      await row.locator("th a").evaluate((a) => {
        for (let p = a.parentElement; p; p = p.parentElement)
          if (p.tagName === "DETAILS") p.open = true;
      });
      const maintenanceDetail = await row.locator("th a").getAttribute("href"),
        maintenanceEdit = new URL(
          await row.locator("[data-edit-item]").getAttribute("href"),
        );
      assert.equal(maintenanceEdit.searchParams.get("intent"), "compose");
      await row.locator("th a").click();
      assert.equal(new URL(page.url()).pathname, maintenanceDetail);
      assert.equal(
        new URL(
          await page.locator("[data-compose-record]").getAttribute("href"),
        ).searchParams.get("id"),
        maintenanceEdit.searchParams.get("id"),
      );
      await page.goto(
        server.base + "/upgrades/?pack=official%3Amw4-dmz-starter",
      );
      const upgrade = page.locator("[data-full-record]").first();
      await upgrade.waitFor();
      const upgradeTarget = new URL(
        await upgrade.getAttribute("href"),
        server.base,
      );
      await upgrade.click();
      const upgradeEditor = await revealEditing(page);
      assert.equal(
        new URL(await upgradeEditor.getAttribute("href")).searchParams.get(
          "id",
        ),
        upgradeTarget.searchParams.get("id"),
      );
      for (const [path, adapter] of [
        ["/armory/han-86/", "weapon-intel"],
        ["/armory/camos/han-86/", "weapon-camos"],
        ["/keys/hospital-chemical-lab/", "key-reference"],
      ]) {
        await page.goto(server.base + path);
        const action = page.locator(`[data-compose-source="${adapter}"]`);
        assert.equal(
          new URL(await action.getAttribute("href")).searchParams.get(
            "adapter",
          ),
          adapter,
        );
      }
      assert.deepEqual(errors, []);
      console.log(
        `093 T025 ${name}:six saved record types+weapon public/detail/edit identities, private-copy separation, maintenance and weapon/key/camo entrypoints PASS`,
      );
    } finally {
      await browser.close();
    }
  }
} finally {
  await server.stop();
}
