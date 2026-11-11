import assert from "node:assert/strict";
import { chromium, firefox, webkit } from "playwright";
import { mkdir } from "node:fs/promises";
const engine = process.env.BROWSER || "chromium";
const browser = await { chromium, firefox, webkit }[engine].launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage();
const base = "http://127.0.0.1:4173";
const pack = "official:mw4-dmz-starter";
const errors = [];
page.on("pageerror", (reason) =>
  errors.push(page.url() + " | " + reason.message),
);
const local = (id) =>
  `${base}/local/?pack=${encodeURIComponent(pack)}&id=${encodeURIComponent(id)}`;
const ready = async () => {
  await page.locator("[data-item-workspace]").waitFor();
  await page.waitForLoadState("networkidle");
};
const bounds = async () =>
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
    `overflow: ${engine} ${page.url()}`,
  );
try {
  await page.goto(local("mw4:bandage"));
  await ready();
  await page.evaluate(async () => {
    const { state } = await import("/assets/src/client/common.mjs");
    const { saveProfile } = await import("/assets/src/storage/store.mjs");
    const profile = structuredClone(state.profile);
    profile.inventory["mw4:bandage"] = 7;
    await saveProfile(profile, state.revision);
  });
  await page.reload();
  await ready();
  assert.equal(await page.locator("h1:visible").count(), 1);
  assert.equal(
    await page.locator("[data-local-library-heading]").isVisible(),
    false,
  );
  assert.match(
    await page.locator("[data-item-collection]").innerText(),
    /Owned: 7/,
  );
  await page.locator("[data-build-select]").check();
  await page.waitForFunction(
    () =>
      document.querySelector("[data-build-status]")?.textContent ===
      "Saved locally",
  );
  await page.locator("[data-build-quantity]").fill("2");
  await page.locator("[data-build-quantity]").press("Tab");
  await page.waitForFunction(async () => {
    const { state } = await import("/assets/src/client/common.mjs");
    return state.profile.buildTargets?.["mw4:bandage"] === 2;
  });
  await page.reload();
  await ready();
  assert.equal(await page.locator("[data-build-quantity]").inputValue(), "2");
  assert.match(
    await page.locator("[data-item-collection]").innerText(),
    /Owned: 7/,
  );
  const itemCounts = await page
    .locator(".item-collection-counts dd")
    .allTextContents();
  await page
    .getByRole("link", { name: "Inventory & blueprint", exact: true })
    .click();
  await page.waitForFunction(
    () => document.querySelector("main")?.getAttribute("aria-busy") === "false",
  );
  assert.equal(await page.locator("#inventory-query").inputValue(), "Bandage");
  assert.deepEqual(
    await page
      .locator(
        '[data-upgrade-need="collection"][data-item="mw4:bandage"] [data-tier-required], [data-upgrade-need="collection"][data-item="mw4:bandage"] [data-tier-missing]',
      )
      .allTextContents(),
    itemCounts,
  );
  await page.goto(`${base}/quick-collect/?pack=${encodeURIComponent(pack)}`);
  await page.locator('[data-build-group="mw4:bandage"]').waitFor();
  assert(
    (await page
      .locator('[data-build-group="mw4:bandage"] [data-collect-row]')
      .count()) > 0,
  );

  for (const path of [
    "/items/mw4--ingredient-ballistic-fabric/",
    local("mw4:ingredient-ballistic-fabric").slice(base.length),
  ]) {
    await page.goto(base + path);
    await ready();
    for (const key of ["overview", "find", "crafting", "uses", "sources"]) {
      await page.locator(`.item-section-nav a[href="#item-${key}"]`).click();
      assert.equal(await page.locator(`#item-${key}`).count(), 1);
      assert.equal(new URL(page.url()).hash, `#item-${key}`);
    }
    const areas = page.locator("[data-item-map-area]");
    assert((await areas.count()) >= 2);
    assert.match(
      await areas.first().getAttribute("href"),
      /tool=explore.*area=/,
    );
    await page.getByText("Area references & map help", { exact: true }).click();
    const fallback = page.locator(".item-map-areas li a").first();
    const fallbackURL = await fallback.getAttribute("href");
    const reference = await page.context().newPage();
    await reference.goto(base + fallbackURL);
    await reference.waitForFunction(
      () =>
        document.querySelector("main")?.getAttribute("aria-busy") === "false",
    );
    assert.match(
      await reference.locator("#location-detail").innerText(),
      /Chang-san Air Base|Songdo Wharf/,
    );
    await reference.close();
    await page.getByText("Area references & map help", { exact: true }).click();
    assert.equal(
      await page.locator(".item-action-card [data-build-control]").count(),
      1,
    );
    const source = page.locator(".provenance > details");
    assert.equal(await source.evaluate((n) => n.open), false);
    await source.locator("summary").click();
    assert(
      await source
        .getByRole("heading", { name: "Evidence & scope" })
        .isVisible(),
    );
    await source.locator("summary").click();
    for (const theme of ["dark", "light"]) {
      await page.evaluate(
        (theme) => (document.documentElement.dataset.theme = theme),
        theme,
      );
      for (const width of [320, 390, 768, 1024, 1440, 1920]) {
        await page.setViewportSize({ width, height: 1000 });
        await bounds();
      }
    }
    const originalName = await page.locator(".item-workspace h1").textContent();
    await page
      .locator(".item-workspace h1")
      .evaluate(
        (node) =>
          (node.textContent = "Very long synthetic item identification ".repeat(
            8,
          )),
      );
    await page.setViewportSize({ width: 320, height: 1000 });
    await bounds();
    await page
      .locator(".item-workspace h1")
      .evaluate((node, text) => (node.textContent = text), originalName);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.evaluate(() => (document.documentElement.style.zoom = "2"));
    await bounds();
    await page.evaluate(() => (document.documentElement.style.zoom = ""));
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.evaluate(
      () => (document.documentElement.dataset.theme = "dark"),
    );
    await page.evaluate(() => scrollTo(0, 0));
    await mkdir(".local/item-icons/item-workspace", { recursive: true });
    await page.screenshot({
      path: `.local/item-icons/item-workspace/${engine}-${path.startsWith("/items") ? "native" : "private"}-desktop.png`,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      path: `.local/item-icons/item-workspace/${engine}-${path.startsWith("/items") ? "native" : "private"}-mobile.png`,
      fullPage: true,
    });
  }
  await page.goto(`${base}/items/`);
  await page.waitForLoadState("networkidle");
  const categories = await page
    .locator('#catalog-type option[value^="category:"]')
    .evaluateAll((nodes) => nodes.map((n) => n.value));
  assert(categories.length > 3);
  await page.selectOption("#catalog-type", categories[0]);
  assert((await page.locator(".item-row:visible").count()) > 0);
  assert(
    await page
      .locator(".item-row:visible")
      .evaluateAll(
        (rows, category) =>
          rows.every((row) => row.dataset.category === category),
        categories[0].slice(9),
      ),
  );
  await bounds();
  await page.selectOption("#catalog-type", "");
  await page.locator("#catalog-search").fill("Ballistic Fabric");
  await page.locator(".item-row:visible h3 a").first().click();
  await ready();
  assert.match(await page.locator("h1").innerText(), /Ballistic Fabric/);
  await page.locator(".item-edit-actions summary").click();
  const edit = page.locator("[data-edit-record]");
  assert.match(
    await edit.getAttribute("href"),
    /official-starter\/mw4--ingredient-ballistic-fabric\/#edit/,
  );
  await edit.click();
  assert.match(
    await page.locator('[data-open-local="edit"]').getAttribute("href"),
    /id=mw4%3Aingredient-ballistic-fabric/,
  );
  await page.goto(base + "/local/?pack=demo%3Atraining-pack");
  await page.waitForFunction(
    () => document.querySelector("main")?.getAttribute("aria-busy") === "false",
  );
  const fixtureItem = await page.evaluate(async () => {
    const { state } = await import("/assets/src/client/common.mjs");
    return state.pack.items.find((item) => !item.spoiler).id;
  });
  await page.goto(
    base +
      "/editor/?pack=demo%3Atraining-pack&record=" +
      encodeURIComponent(fixtureItem),
  );
  await page.waitForFunction(
    () => document.querySelector("main")?.getAttribute("aria-busy") === "false",
  );
  assert.equal(await page.locator("#editor-section").inputValue(), "items");
  const editorIdentity = await page
    .locator('#editor-fields [data-path$=".id"]')
    .first()
    .inputValue();
  assert.equal(editorIdentity, fixtureItem);
  assert.deepEqual(errors, []);
  console.log(
    `PASS item workspace ${engine}: native/private parity, saved stock/build/Quick collect, category search, exact edit, 320–1920px/light/dark/200%/reduced motion`,
  );
} finally {
  await browser.close();
}
