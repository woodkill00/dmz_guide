import assert from "node:assert/strict";
import { chromium, firefox, webkit } from "playwright";
import { mkdir } from "node:fs/promises";
const engine = process.env.BROWSER || "chromium",
  b = await { chromium, firefox, webkit }[engine].launch(),
  p = await b.newPage(),
  errors = [];
p.on("pageerror", (e) => errors.push(e.message));
try {
  await p.goto("http://127.0.0.1:4173/items/mw4--ingredient-ballistic-fabric/");
  await p
    .locator(".loot-type-buttons")
    .getByRole("link", { name: "Duffel bags", exact: true })
    .click();
  assert.equal(
    new URL(p.url()).pathname,
    "/guides/mw4--loot-type-duffel-bags/",
  );
  await p.getByRole("heading", { name: "Duffel bags", exact: true }).waitFor();
  assert(
    await p
      .getByRole("heading", { name: "Duffel bags", exact: true })
      .isVisible(),
  );
  assert(
    await p
      .getByRole("heading", { name: "Items reported in this loot type" })
      .isVisible(),
  );
  const photos = p.getByRole("link", { name: "Add photos", exact: true });
  assert(await photos.isVisible());
  for (const width of [1440, 390, 320]) {
    await p.setViewportSize({ width, height: 1000 });
    assert(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    );
  }
  await mkdir(".local/item-icons/loot-types", { recursive: true });
  await p.screenshot({
    path: `.local/item-icons/loot-types/${engine}-320.png`,
    fullPage: false,
  });
  await photos.click();
  const studio = p.locator('[data-open-local="images"]');
  const href = new URL(await studio.getAttribute("href"));
  assert.equal(href.searchParams.get("id"), "mw4:loot-type-duffel-bags");
  assert.equal(href.searchParams.get("intent"), "images");
  await p.goBack();
  await p.getByRole("link", { name: "Loot source types", exact: true }).click();
  await p
    .getByRole("heading", { name: "Browse loot source types", exact: true })
    .waitFor();
  assert.equal(await p.locator(".loot-type-buttons li").count(), 20);
  assert.deepEqual(errors, []);
  console.log(
    "PASS loot-type buttons, pages, 20-type directory, exact edit/photo destinations, 320–1440px: " +
      engine,
  );
} finally {
  await b.close();
}
