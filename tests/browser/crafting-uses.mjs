import { chromium, firefox, webkit } from "playwright";
import assert from "node:assert/strict";
import { serviceOrigin } from "../../src/domain/local-services.mjs";
import { readFile } from "node:fs/promises";
import { loadFixturePack } from "../helpers/catalog.mjs";
import { recordUrl } from "../../src/ui/render.mjs";
import {
  buildCraftingUses,
  craftReferenceAnchor,
} from "../../src/domain/crafting-uses.mjs";
const catalog = loadFixturePack("official-starter"),
  index = buildCraftingUses(catalog),
  pages = new Map();
for (const item of catalog.items) {
  const html = await readFile(
    new URL(
      `../../dist${recordUrl({ ...item, recordType: "item" })}index.html`,
      import.meta.url,
    ),
    "utf8",
  );
  assert.equal((html.match(/data-crafting-uses/g) || []).length, 1, item.id);
  pages.set(item.id, html);
}
for (const edge of index.edges.filter((row) => !row.issue))
  assert.ok(
    pages.get(edge.itemId).includes(`data-craft-output="${edge.outputId}"`),
    `${edge.itemId}→${edge.outputId}`,
  );
for (const method of index.methods.filter((row) => !row.recipe))
  assert.ok(
    pages
      .get(method.output.id)
      .includes(`id="${craftReferenceAnchor(method.id)}"`),
    method.id,
  );
console.log(
  `Built-page audit: ${pages.size} item pages, ${index.edges.length} recorded ingredient edges and all source-only anchors PASS`,
);
const base =
  process.env.DMZ_SITE_URL || serviceOrigin("guide", "http://127.0.0.1");
const ingredient = "/items/mw4--ingredient-power-regulator/";
for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
  const browser = await engine.launch();
  try {
    const page = await browser.newPage({
      viewport: { width: 1280, height: 850 },
    });
    await page.goto(new URL(ingredient, base).href);
    const uses = page.locator("[data-crafting-uses]");
    assert.equal(await uses.locator("[data-craft-output]").count(), 5);
    const summary = uses.locator(":scope > summary");
    await summary.focus();
    await page.keyboard.press("Enter");
    assert.equal(await uses.getAttribute("open"), null);
    await page.keyboard.press("Enter");
    assert.notEqual(await uses.getAttribute("open"), null);
    for (const prefix of ["source:", "x01:"]) {
      await page.goto(new URL(ingredient, base).href);
      const method = page.locator(`[data-craft-method^="${prefix}"] a`).first();
      const href = await method.getAttribute("href");
      assert.ok(href.includes("#craft-reference-"));
      await method.click();
      await page.waitForURL((u) => u.hash.startsWith("#craft-reference-"));
      const target = page.locator(
        `[id="${decodeURIComponent(new URL(page.url()).hash.slice(1))}"]`,
      );
      await target.waitFor({ state: "visible" });
      assert.ok(
        (await target
          .getByRole("link", { name: "Power Regulator", exact: true })
          .count()) > 0,
      );
      await target
        .getByRole("link", { name: "Power Regulator", exact: true })
        .first()
        .click();
      await page.waitForURL((u) => u.pathname === ingredient);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(new URL(ingredient, base).href);
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      true,
    );
    await page.locator("#item-crafting").scrollIntoViewIfNeeded();
    await page.screenshot({
      path: `test-results/096-crafting-${name}-mobile.png`,
      fullPage: false,
    });
    await page.goto(
      new URL(
        "/local/?pack=official%3Amw4-dmz-starter&id=mw4%3Aingredient-power-regulator",
        base,
      ).href,
    );
    const privateUse = page
      .locator("[data-crafting-uses] [data-craft-output] strong a")
      .first();
    await privateUse.waitFor({ state: "visible", timeout: 45000 });
    assert.ok(
      (await privateUse.getAttribute("href")).startsWith(
        "/local/?pack=official%3Amw4-dmz-starter&id=",
      ),
    );
    await privateUse.click();
    await page.locator("[data-item-workspace]").waitFor();
    console.log(
      `${name}: ingredient products, keyboard disclosure, source blueprint and X01 anchors/return,390px overflow PASS`,
    );
  } finally {
    await browser.close();
  }
}
