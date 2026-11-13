import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { chromium } from "playwright";
import { startBrowserServer } from "./server.mjs";

await writeFile("dist/__test-text-zoom.css", ":root{font-size:200%}");
const server = await startBrowserServer();
const browser = await chromium.launch();
try {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (reason) => errors.push(reason.message));
  await page.goto(
    `${server.base}/missions/audit/?pack=official%3Amw4-dmz-starter`,
  );
  await page.locator("#mission-audit-pages button").first().waitFor();
  assert.equal(await page.locator("#mission-audit-pages button").count(), 24);
  assert.match(
    await page.locator("#mission-audit-summary").textContent(),
    /24 unrecorded/,
  );
  assert.match(
    await page.locator("#mission-audit-missions").textContent(),
    /No Order or Story Mission records/,
  );
  await page.locator("#mission-audit-pages button").first().click();
  await page.locator("#mission-audit-state").selectOption("fill-later");
  await page.locator("#mission-audit-note").fill("Check page roster later");
  await page.locator("#mission-audit-save").click();
  assert.match(
    await page.locator("#save-status").textContent(),
    /saved on this device/,
  );
  await page.reload();
  await page.locator("#mission-audit-pages button").first().waitFor();
  assert.match(
    await page.locator("#mission-audit-summary").textContent(),
    /1 sections to fill later/,
  );
  await page.locator("#mission-audit-filter").selectOption("fill-later");
  assert.equal(await page.locator("#mission-audit-pages button").count(), 1);
  await page.locator("#mission-audit-pages button").first().click();
  assert.equal(
    await page.locator("#mission-audit-note").inputValue(),
    "Check page roster later",
  );
  assert.equal(
    await page.locator("#mission-audit-state").inputValue(),
    "fill-later",
  );
  await page.locator("#mission-audit-pages button").first().focus();
  await page.keyboard.press("Enter");
  assert.equal(await page.locator("#mission-audit-editor").isVisible(), true);
  await page.addStyleTag({ url: `${server.base}/__test-text-zoom.css` });
  assert.equal(errors.length, 0, errors.join("; "));
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth + 2,
    ),
    false,
  );
  await context.close();
  console.log(
    "Mission audit empty coverage, status persistence, filtering, keyboard and 390px/200% layout PASS",
  );
} finally {
  await browser.close();
  await server.stop();
}
