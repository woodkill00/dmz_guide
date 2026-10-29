import assert from "node:assert/strict";
import { authorPath } from "../../src/content/author-target.mjs";

export async function runNavigationDirectoryTests({
  browser,
  base,
  captureScreenshots = true,
}) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  try {
    await page.goto(base + "/items/");
    await page.waitForFunction(() =>
      document.querySelector("#catalog-count").textContent.includes("matching"),
    );
    assert.equal(
      await page.locator('.site-nav a[aria-current="page"]').textContent(),
      "Items",
    );
    await page.selectOption("#catalog-pack", "");
    assert.equal(
      await page.locator(".item-row:visible").count(),
      await page.locator(".item-row").count(),
    );
    const directoryGroups = await page
      .locator(".item-directory")
      .evaluateAll((groups) =>
        groups.map((group) =>
          [...group.querySelectorAll(".item-row")].map((row) => ({
            href: row.querySelector("h3 a").getAttribute("href"),
            name: row.dataset.name,
            type: row.dataset.type,
            status: row.dataset.status,
            pack: row.dataset.pack,
          })),
        ),
      );
    assert(
      directoryGroups.some((rows) =>
        rows.some((row) => row.pack === "demo:training-pack"),
      ),
      "Synthetic fixture remains available for sorting checks",
    );
    // Start with type/status so the final name check must restore name order.
    for (const sortKey of ["type", "status", "name"]) {
      await page.selectOption("#catalog-sort", sortKey);
      const displayedGroups = await page
        .locator(".item-directory")
        .evaluateAll((groups) =>
          groups.map((group) =>
            [...group.querySelectorAll(".item-row:not([hidden]) h3 a")].map(
              (link) => link.getAttribute("href"),
            ),
          ),
        );
      const expectedGroups = directoryGroups.map((rows) =>
        [...rows]
          .sort(
            (a, b) =>
              a[sortKey].localeCompare(b[sortKey]) ||
              a.name.localeCompare(b.name),
          )
          .map((row) => row.href),
      );
      assert.deepEqual(
        displayedGroups,
        expectedGroups,
        `${sortKey} sorting must produce the exact displayed item sequence within every catalog`,
      );
      assert.equal(
        await page.locator(".item-row:visible").count(),
        directoryGroups.flat().length,
        "Sorting cannot remove, duplicate or mix catalog rows",
      );
    }
    await page.selectOption("#catalog-pack", "demo:training-pack");
    await page.fill("#catalog-search", "wire");
    assert((await page.locator(".item-row:visible").count()) > 0);
    assert(!page.url().includes("wire"));
    assert(
      (
        await page
          .locator(".site-nav")
          .getByRole("link", { name: "Inventory", exact: true })
          .getAttribute("href")
      ).includes("pack=demo%3Atraining-pack"),
    );
    await page.selectOption("#catalog-sort", "type");
    const row = page.locator(".item-row:visible").first();
    const detail = await row.locator("h3 a").getAttribute("href");
    const remove = await row
      .locator("[data-directory-remove]")
      .getAttribute("href");
    // Native link clicks begin document navigation; observe its exact destination
    // before reading page.url(), rather than snapshotting the departing page.
    await Promise.all([
      page.waitForURL((url) => url.pathname === detail, {
        waitUntil: "domcontentloaded",
      }),
      row.locator("h3 a").click(),
    ]);
    assert.equal(new URL(page.url()).pathname, detail);
    assert.equal(
      await page.locator("body").getAttribute("data-nav-pack"),
      "demo:training-pack",
    );
    await page.goto(base + detail + "?pack=official%3Amw4-dmz-starter");
    await page.waitForFunction(
      () =>
        document.body.dataset.navPack === "demo:training-pack" &&
        [...document.querySelectorAll(".site-nav a")]
          .find((a) => a.textContent === "Inventory")
          .href.includes("pack=demo%3Atraining-pack"),
    );
    await page.goto(base + remove);
    assert.equal(await page.locator('[data-open-local="remove"]').count(), 1);
    assert(
      (
        await page.locator('[data-open-local="remove"]').getAttribute("href")
      ).includes("intent=remove"),
    );
    await page.goto(base + "/items/");
    await page.fill("#catalog-search", "no-such-item-zzzz");
    await page.waitForSelector("#catalog-empty", { state: "visible" });
    await page.fill("#catalog-search", "");
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      await page.addStyleTag({ url: base + "/__test-text-zoom.css" });
      await page.locator(".nav-more summary").focus();
      await page.keyboard.press("Enter");
      assert(await page.locator(".nav-more").evaluate((n) => n.open));
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      );
      await page.locator(".nav-more summary").press("Enter");
      if (captureScreenshots)
        await page.screenshot({
          path: `test-results/${browser.browserType().name()}-items-${width}.png`,
          fullPage: true,
        });
    }
    await page.goto(base + "/sitemap/?pack=demo%3Atraining-pack");
    await page.waitForFunction(() =>
      document
        .querySelector('[data-workspace-link][href*="/inventory/"]')
        .href.includes("pack=demo%3Atraining-pack"),
    );
    assert(
      (await page.locator('.sitemap-links a[href*="/items/"]').count()) > 0,
    );
    await page.locator(".sitemap-pack summary").first().click();
    assert((await page.locator(".sitemap-pack a:visible").count()) > 0);
    await page.goto(base + "/map-workspace/?pack=demo%3Atraining-pack");
    await page.waitForFunction(() =>
      [...document.querySelectorAll(".site-nav a")]
        .find((a) => a.textContent === "Items")
        .href.includes("pack=demo%3Atraining-pack"),
    );
    assert.equal(
      await page.locator('a[href="http://127.0.0.1:5175/"]').count(),
      1,
    );
    assert(
      (await page.locator("main").textContent()).includes("not live game GPS"),
    );
    const noScript = await browser.newContext({ javaScriptEnabled: false });
    try {
      const reader = await noScript.newPage();
      await reader.goto(base + "/items/");
      assert((await reader.locator(".item-row:visible").count()) > 0);
      assert.equal(
        await reader.locator(".item-row:visible").count(),
        await reader.locator(".item-row").count(),
      );
    } finally {
      await noScript.close();
    }
  } finally {
    await context.close();
  }
}

export async function runDirectoryRemovalTests({ browser, author }) {
  const context = await browser.newContext(),
    page = await context.newPage();
  const initial = await (await fetch(author.url + "/api/catalog")).json();
  const entry = initial.entries.find((e) => e.key === "demo-training");
  const item =
    entry.pack.items.find((i) => i.id === "demo:wire") || entry.pack.items[0];
  const target = {
    packKey: entry.key,
    packId: entry.pack.id,
    id: item.id,
    intent: "remove",
  };
  try {
    await page.goto(author.url + authorPath(target));
    await page.waitForSelector("#remove-stage", { state: "visible" });
    assert(
      (await page.locator("#entry-identity").textContent()).includes(item.id),
    );
    assert(await page.locator("#confirm-remove").isDisabled());
    assert.equal(
      await page.evaluate(() => document.activeElement.id),
      "cancel-remove",
    );
    await page.click("#cancel-remove");
    assert(await page.locator("#remove-stage").isHidden());
    assert.equal(
      await page.evaluate(() => document.activeElement.id),
      "remove-record",
    );
    // Make a harmless unsaved fixture edit; declining a pack switch must retain it.
    const field = page.locator('[data-path$=".name"]').first();
    const old = await field.inputValue();
    await field.fill(old + " private draft");
    page.once("dialog", (dialog) => dialog.dismiss());
    const other = initial.entries.find((e) => e.key !== entry.key);
    await page.selectOption("#pack-select", other.key);
    assert.equal(await page.locator("#pack-select").inputValue(), entry.key);
    assert.equal(await field.inputValue(), old + " private draft");
    // An unreferenced new fixture can be removed from the draft, never saved automatically.
    await page.fill("#new-record-name", "Synthetic directory removal fixture");
    await page.click("#add-record");
    await page.click("#remove-record");
    assert.equal(await page.locator("#confirm-remove").isDisabled(), false);
    await page.click("#confirm-remove");
    assert(
      (await page.locator("#save-status").textContent()).includes(
        "unsaved draft",
      ),
    );
    assert(
      !(await page.locator("#editor-record").textContent()).includes(
        "Synthetic directory removal fixture",
      ),
    );
    const after = await (await fetch(author.url + "/api/catalog")).json();
    assert.deepEqual(
      after.entries,
      initial.entries,
      "Preview/cancel/dirty draft never saves repository changes",
    );
  } finally {
    await context.close();
  }
}
