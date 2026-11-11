import assert from "node:assert/strict";
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
const b = await chromium.launch(),
  p = await b.newPage(),
  errors = [];
p.on("pageerror", (e) => errors.push(e.message));
try {
  const r = await p.goto("http://127.0.0.1:4180/");
  assert(r.headers()["content-type"].startsWith("text/html"));
  await p.getByRole("tab", { name: "Where to find", exact: true }).click();
  assert(await p.locator("#where").isVisible());
  await p.keyboard.press("ArrowRight");
  assert(await p.locator("#crafting").isVisible());
  await p.getByRole("button", { name: "Increase preview target" }).click();
  await p.getByRole("button", { name: "Preview build selection" }).click();
  assert(
    (await p.locator("#preview-status").innerText()).includes("nothing saved"),
  );
  await p.getByRole("button", { name: "Item list", exact: true }).click();
  await p.locator("#item-search").fill("synthetics");
  assert.equal(await p.locator(".list-row:visible").count(), 1);
  await p.getByRole("button", { name: "Item page", exact: true }).click();
  await mkdir(".local/item-icons/item-experience-preview", { recursive: true });
  for (const width of [1440, 768, 390, 320]) {
    await p.setViewportSize({ width, height: 1000 });
    assert(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    );
    await p.screenshot({
      path: `.local/item-icons/item-experience-preview/${width}.png`,
    });
  }
  assert.deepEqual(errors, []);
  console.log(
    "PASS HTML design preview, sections, keyboard tabs, directory search, preview-only actions and 320–1440px",
  );
} finally {
  await b.close();
}
