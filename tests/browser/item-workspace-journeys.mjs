import assert from "node:assert/strict";
import { chromium } from "playwright";
const browser = await chromium.launch(),
  page = await browser.newPage();
const base = "http://127.0.0.1:4173";
try {
  await page.goto(
    base +
      "/local/?pack=official%3Amw4-dmz-starter&id=mw4%3Aingredient-ballistic-fabric",
  );
  await page.locator(".item-workspace").waitFor();
  await page.waitForLoadState("networkidle");
  const group = page
    .locator(".item-use-group")
    .filter({ has: page.locator("summary", { hasText: /^Upgrades/ }) });
  await group.locator("summary").click();
  await group.locator("li a").first().click();
  await page.waitForFunction(
    () => document.querySelector("main")?.getAttribute("aria-busy") === "false",
  );
  assert.equal(await page.locator("h1:visible").count(), 1);
  assert(
    await page
      .getByRole("heading", { name: "Requirements", exact: true })
      .isVisible(),
  );
  await page
    .locator('.requirements a[href*="id=mw4%3Aingredient-ballistic-fabric"]')
    .click();
  await page.locator(".item-workspace").waitFor();
  await page.waitForLoadState("networkidle");
  assert.match(
    await page.locator("h1:visible").innerText(),
    /Ballistic Fabric/,
  );
  await page
    .locator(".tcno-item-intel .loot-type-buttons")
    .getByRole("link", { name: "Duffel bags", exact: true })
    .click();
  await page.waitForFunction(
    () => document.querySelector("main")?.getAttribute("aria-busy") === "false",
  );
  assert.equal(await page.locator("h1:visible").count(), 1);
  assert.match(
    new URL(page.url()).searchParams.get("id"),
    /loot-type-duffel-bags/,
  );
  assert(
    await page
      .getByRole("heading", {
        name: "Items reported in this loot type",
        exact: true,
      })
      .isVisible(),
  );
  console.log(
    "PASS actual upgrade detail → item workspace → loot-type reference journey; exact pack and single non-item page heading retained",
  );
} finally {
  await browser.close();
}
