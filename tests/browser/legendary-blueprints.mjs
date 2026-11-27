import assert from "node:assert/strict";
import { chromium, firefox, webkit } from "playwright";
import { monitorBrowser } from "./health.mjs";
const base = process.env.DMZ_SITE_URL || "http://127.0.0.1:4173";
for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
  const b = await engine.launch(),
    health = monitorBrowser(b);
  try {
    const p = await b.newPage();
    await p.goto(base + "/");
    await p.waitForSelector('[data-weapon-save-state="ready"]');
    const data = await p.evaluate(async () => {
      const { newProfile } = await import("/assets/src/domain/profile.mjs");
      const { saveProfile } = await import("/assets/src/storage/store.mjs");
      const { itemSection } = await import(
        "/assets/src/domain/inventory-items.mjs"
      );
      const pack = await (
        await fetch("/assets/content/packs/official-starter.json")
      ).json();
      const item = pack.items.find(
        (r) =>
          r.rarity?.toLowerCase() === "legendary" &&
          itemSection(r) === "Ingredients" &&
          !r.spoiler,
      );
      const profile = newProfile(pack);
      profile.inventory[item.id] = 9;
      profile.itemBlueprints = { [item.id]: true };
      await saveProfile(profile, 0);
      return item;
    });
    await p.locator("#hub-refresh").click();
    await p.waitForFunction(() =>
      document
        .querySelector("#hub-progress")
        ?.textContent.includes("revision 1"),
    );
    assert.equal(
      await p.locator('[data-dash-blueprint-owned="' + data.id + '"]').count(),
      0,
    );
    await p.goto(base + "/inventory/?pack=official%3Amw4-dmz-starter");
    await p.locator("#inventory-query").fill(data.name);
    const row = p.locator('[data-inventory-item="' + data.id + '"]').first();
    await row.waitFor();
    assert.equal(await row.locator("[data-item-blueprint]").count(), 0);
    assert.equal(
      await row.locator(".inventory-blueprint").innerText(),
      "No blueprint",
    );
    assert.equal(
      await row.locator('input[data-field="inventory"]').inputValue(),
      "9",
    );
    await p.goto(
      base +
        "/local/?pack=official%3Amw4-dmz-starter&id=" +
        encodeURIComponent(data.id),
    );
    await p.locator(".item-blueprint-state").waitFor();
    assert.match(
      await p.locator(".item-blueprint-state").innerText(),
      /No blueprint/,
    );
    assert.equal(await p.locator("[data-item-blueprint-edit]").count(), 0);
    assert.match(await p.locator(".item-owned").innerText(), /9/);
    await p.waitForFunction(() =>
      document
        .querySelector("[data-build-status]")
        ?.textContent.includes("Saved locally"),
    );
    await p.locator("[data-build-select]").first().check();
    await p.waitForFunction(
      async (id) =>
        (
          await (
            await import("/assets/src/storage/store.mjs")
          ).readRecord("profiles", "official:mw4-dmz-starter")
        ).value.buildTargets?.[id] === 1,
      data.id,
    );
    const saved = await p.evaluate(
      async () =>
        (
          await (
            await import("/assets/src/storage/store.mjs")
          ).readRecord("profiles", "official:mw4-dmz-starter")
        ).value,
    );
    assert.equal(saved.inventory[data.id], 9);
    assert.equal(saved.itemBlueprints[data.id], true);
    await p.goto(
      base +
        "/items/" +
        encodeURIComponent(data.id).replace(/%3A/gi, "--") +
        "/",
    );
    await p.locator(".item-blueprint-state").waitFor();
    assert.match(
      await p.locator(".item-blueprint-state").innerText(),
      /No blueprint/,
    );
    assert.equal(await p.locator("[data-item-blueprint-edit]").count(), 0);
    health();
    console.log(
      name +
        ": Legendary ingredient excluded from checklist, Inventory/local/published No blueprint, stock+historical flag intact and Want to build still saves PASS",
    );
  } finally {
    await b.close();
  }
}
