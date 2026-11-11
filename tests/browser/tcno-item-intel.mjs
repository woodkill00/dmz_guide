import assert from "node:assert/strict";
import { chromium, firefox, webkit } from "playwright";
import { mkdir } from "node:fs/promises";
const engine = process.env.BROWSER || "chromium",
  b = await { chromium, firefox, webkit }[engine].launch(),
  p = await b.newPage(),
  errors = [];
p.on("pageerror", (e) => errors.push(e.message));
try {
  const id = "mw4:ingredient-ballistic-fabric";
  for (const path of [
    `/items/${id.replace(":", "--")}/`,
    `/local/?pack=official%3Amw4-dmz-starter&id=${encodeURIComponent(id)}`,
  ]) {
    await p.goto("http://127.0.0.1:4173" + path);
    const section = p.locator("[data-item-source-intel]");
    await section.waitFor();
    assert(
      (await p.locator("main").innerText()).includes("Chang-san Air Base"),
    );
    assert(
      await section
        .getByRole("heading", { name: "Where it can be looted" })
        .isVisible(),
    );
    await section.locator(".item-unlock-references > summary").click();
    await section
      .locator(".item-unlock-references details > summary")
      .first()
      .click();
    const links = section.locator(".item-unlock-references details[open] li a");
    assert((await links.count()) > 0);
    const href = await links.first().getAttribute("href");
    assert(href.startsWith("/"));
    for (const width of [1440, 390, 320]) {
      await p.setViewportSize({ width, height: 1000 });
      assert(
        await p.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      );
    }
    await mkdir(".local/item-icons/tcno-intel", { recursive: true });
    await section.screenshot({
      path: `.local/item-icons/tcno-intel/${engine}-${path.startsWith("/items") ? "native" : "private"}.png`,
    });
    await p.goto("http://127.0.0.1:4173" + href);
    assert((await p.title()).length > 0);
  }
  assert.deepEqual(errors, []);
  console.log(
    "PASS sourced loot/unlock details, native/private routes, links, 320–1440px: " +
      engine,
  );
} finally {
  await b.close();
}
