// Synthetic profiles only. Never accesses the owner's browser session.
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium, firefox, webkit } from "playwright";
import { openParentDetails } from "./reviewer-disclosures.mjs";
const base = process.env.TEST_BASE || "http://127.0.0.1:4173";
await mkdir("test-results", { recursive: true });
for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
  const browser = await engine.launch(),
    context = await browser.newContext(),
    page = await context.newPage(),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const ready = () =>
    page.waitForFunction(
      () =>
        document.querySelector("main")?.getAttribute("aria-busy") === "false",
    );
  try {
    await page.goto(base + "/keys/");
    await page.locator("#key-region").waitFor();
    await page.locator("#key-region").selectOption("x01");
    assert.equal(await page.locator("[data-key-row]:visible").count(), 14);
    assert(await page.locator("#keys-hajin").isHidden());
    await page.locator("#key-search").fill("Engineering Access");
    assert.equal(await page.locator("[data-key-row]:visible").count(), 1);
    assert.equal(
      await page.locator("[data-key-row]:visible").getAttribute("data-key-id"),
      "x01-small-test-chamber",
    );
    await page.getByRole("button", { name: "Clear filters" }).click();
    await page.locator("#key-region").selectOption("hajin");
    assert.equal(await page.locator("#keys-x01").isVisible(), false);
    assert.match(
      await page.locator("#key-count").innerText(),
      /^66 of 80 keys/,
    );
    await page.getByRole("button", { name: "Clear filters" }).click();
    await page.locator("#key-map-coverage > summary").click();
    assert.equal(
      await page.locator("#key-map-coverage a[href^='/keys/']").count(),
      16,
    );
    await page.setViewportSize({ width: 390, height: 900 });
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    );
    await page.screenshot({
      path: `test-results/106-${name}-key-regions.png`,
      fullPage: true,
    });
    await page.goto(base + "/keys/x01-archive-closet/");
    assert.match(
      await page.locator("main").innerText(),
      /No matching marker in current capture/,
    );
    assert.equal(
      await page.locator('main a[href^="/map/?key-grid="]').count(),
      0,
    );
    await page.goto(base + "/keys/x01-audit-room/");
    const mapLink = page.locator('main a[href*="marker=dmzhub-727"]').first();
    assert.equal(
      await mapLink.getAttribute("href"),
      "/map/x01/?floor=2&marker=dmzhub-727",
    );
    if (name === "chromium") {
      const p = await context.newPage();
      await p.goto(base + (await mapLink.getAttribute("href")));
      await p.locator("#wb-detail").filter({ hasText: "Audit Room" }).waitFor();
      assert(await p.locator('input[name="wb-floor"][value="2"]').isChecked());
      await p.close();
      await page.goto(base + "/keys/counting-room-vault/");
      const hajinLink = await page
        .locator('main a[href*="key-marker=key-counting-room-vault"]')
        .first()
        .getAttribute("href");
      assert.equal(
        hajinLink,
        "/map/?key-source=codcentral&key-marker=key-counting-room-vault",
      );
      const mapPage = await context.newPage();
      await mapPage.goto(base + hajinLink);
      await mapPage.locator("[data-search-highlight]").waitFor();
      assert.match(
        await mapPage
          .locator("[data-search-highlight]")
          .getAttribute("data-search-highlight"),
        /codcentral.*key-counting-room-vault/,
      );
      await mapPage.waitForTimeout(1600);
      assert(await mapPage.locator("[data-search-highlight]").isVisible());
      assert(
        await mapPage
          .locator("#ui-selection-detail,.leaflet-popup")
          .filter({ hasText: "Counting Room Vault" })
          .first()
          .isVisible(),
      );
      await mapPage.close();
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(base + "/inventory/?pack=official%3Amw4-dmz-starter");
    await ready();
    const seed = await page.evaluate(async () => {
      const { state } = await import("/assets/src/client/common.mjs");
      const { saveProfile } = await import("/assets/src/storage/store.mjs");
      const cash = state.pack.items.find((i) => i.kind === "currency").id;
      state.profile.inventory[cash] = 6209662;
      state.profile.inventory["mw4:tcno-key-shopping-drc-locker"] = 4;
      await saveProfile(state.profile, state.profile.revision);
      return { cash, pack: state.pack };
    });
    await page.reload();
    await ready();
    await page.locator("#inventory-section").selectOption("Keys · X01");
    assert.equal(await page.locator("[data-inventory-item]").count(), 14);
    const ref = page.locator('[data-key-reference="x01-archive-closet"]');
    await openParentDetails(ref);
    assert.equal(await ref.getAttribute("href"), "/keys/x01-archive-closet/");
    const stock = page.locator(
      '[data-field="inventory"][data-id="mw4:key-x01-archive-closet"]',
    );
    await stock.fill("2");
    await page
      .getByRole("button", { name: "Save inventory", exact: true })
      .click();
    await page.waitForFunction(
      () =>
        document.querySelector(".inventory-save-bar")?.dataset.dirty ===
        "false",
    );
    assert.deepEqual(
      await page.evaluate(async (cash) => {
        const { loadProfile } = await import("/assets/src/storage/store.mjs");
        const v = (await loadProfile("official:mw4-dmz-starter")).value;
        return [
          v.inventory[cash],
          v.inventory["mw4:tcno-key-shopping-drc-locker"],
          v.inventory["mw4:key-x01-archive-closet"],
        ];
      }, seed.cash),
      [6209662, 4, 2],
    );
    // A stored older/custom overlay must not be replaced merely by visiting Inventory.
    await page.evaluate(async ({ pack, cash }) => {
      const { newProfile } = await import("/assets/src/domain/profile.mjs");
      const { commitRecord, loadProfile, saveProfile } = await import(
        "/assets/src/storage/store.mjs"
      );
      const old = structuredClone(pack);
      old.contentVersion = "2026.11.14.4";
      old.items = old.items.filter((i) => !i.id.startsWith("mw4:key-"));
      await commitRecord("content", old.id, { pack: old, revision: 0 }, 0);
      const previous = await loadProfile(old.id),
        p = newProfile(old);
      p.inventory[cash] = 6209662;
      p.inventory["mw4:tcno-key-shopping-drc-locker"] = 4;
      await saveProfile(p, previous.value.revision);
    }, seed);
    await page.reload();
    await ready();
    const directoryURL = new URL(
      await page.locator("[data-inventory-key-directory]").getAttribute("href"),
      base,
    );
    assert.equal(directoryURL.pathname, "/keys/");
    assert.equal(
      directoryURL.searchParams.get("pack"),
      "official:mw4-dmz-starter",
    );
    assert.deepEqual(
      await page.evaluate(async (cash) => {
        const { readRecord, loadProfile } = await import(
          "/assets/src/storage/store.mjs"
        );
        const old = (await readRecord("content", "official:mw4-dmz-starter"))
            .value.pack,
          v = (await loadProfile(old.id)).value;
        return [
          old.contentVersion,
          v.inventory[cash],
          v.inventory["mw4:tcno-key-shopping-drc-locker"],
          old.items.some((i) => i.id === "mw4:key-x01-archive-closet"),
        ];
      }, seed.cash),
      ["2026.11.14.4", 6209662, 4, false],
    );
    await page.goto(
      base +
        "/local/?pack=official%3Amw4-dmz-starter&id=mw4%3Ax01-staff-emergency-exfil-keycard",
    );
    await ready();
    const guideURL = new URL(
      await page
        .locator('[data-key-reference="x01-staff-emergency-exfil-keycard"]')
        .getAttribute("href"),
      base,
    );
    assert.equal(guideURL.pathname, "/keys/x01-staff-emergency-exfil-keycard/");
    assert.deepEqual(errors, []);
    console.log(
      `${name}:80 keys,66/14 region filters+encoder alias,16 unmapped,390px,correct X01 floor/marker,inventory links+save,old overlay/cash/stock preserved PASS`,
    );
  } finally {
    await context.close();
    await browser.close();
  }
}
