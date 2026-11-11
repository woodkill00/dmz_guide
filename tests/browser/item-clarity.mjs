import assert from "node:assert/strict";
import { chromium, firefox, webkit } from "playwright";
import { mkdir } from "node:fs/promises";
const engine = process.env.BROWSER || "chromium",
  b = await { chromium, firefox, webkit }[engine].launch(),
  p = await b.newPage(),
  errors = [];
p.on("pageerror", (e) => errors.push(e.message));
try {
  for (const path of [
    "/items/mw4--ingredient-ballistic-fabric/",
    "/local/?pack=official%3Amw4-dmz-starter&id=mw4%3Aingredient-ballistic-fabric",
  ]) {
    await p.goto("http://127.0.0.1:4173" + path);
    await p.locator(".item-overview").waitFor();
    assert.equal(
      await p.getByRole("heading", { name: "Overview", exact: true }).count(),
      1,
    );
    assert.equal(
      await p.getByRole("heading", { name: "Item uses", exact: true }).count(),
      1,
    );
    assert.equal(
      await p
        .getByRole("heading", { name: "Known upgrade uses", exact: true })
        .count(),
      0,
    );
    assert.equal(
      await p
        .getByRole("heading", {
          name: "Statistics & measurement context",
          exact: true,
        })
        .count(),
      0,
    );
    const notes = p.locator(".item-source-notes");
    assert(!(await notes.evaluate((n) => n.open)));
    await notes.locator("summary").click();
    assert((await notes.innerText()).includes("GameRant"));
    await notes.locator("summary").click();
    const evidence = p.locator(".provenance > details");
    assert(!(await evidence.evaluate((n) => n.open)));
    await evidence.locator("summary").click();
    assert(
      await evidence
        .getByRole("heading", { name: "Evidence & scope" })
        .isVisible(),
    );
    await evidence.locator("summary").click();
    const upgrade = p
      .locator(".item-use-group")
      .filter({ has: p.locator("summary", { hasText: /^Upgrades/ }) });
    assert.equal(await upgrade.count(), 1);
    await upgrade.locator("summary").click();
    assert((await upgrade.locator("li a").count()) > 0);
    assert(
      (await p
        .locator(".loot-type-buttons")
        .getByRole("link", { name: "Duffel bags", exact: true })
        .count()) > 0,
    );
    for (const width of [1440, 390, 320]) {
      await p.setViewportSize({ width, height: 1000 });
      assert(
        await p.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      );
    }
    await mkdir(".local/item-icons/item-clarity", { recursive: true });
    await p.screenshot({
      path: `.local/item-icons/item-clarity/${engine}-${path.startsWith("/items") ? "native" : "private"}.png`,
    });
  }
  assert.deepEqual(errors, []);
  console.log(
    "PASS concise native/private item pages, disclosures, loot links, uses, 320–1440px: " +
      engine,
  );
} finally {
  await b.close();
}
