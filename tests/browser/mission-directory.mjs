import assert from "node:assert/strict";
import { chromium } from "playwright";
import { startBrowserServer } from "./server.mjs";

const server = await startBrowserServer();
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${server.base}/missions/?pack=official%3Amw4-dmz-starter`);
  await page
    .locator("#mission-directory-x01 .mission-page-card")
    .first()
    .waitFor();
  assert.equal(
    await page.locator("#mission-directory-hajin .mission-page-card").count(),
    24,
  );
  assert.equal(
    await page.locator("#mission-directory-x01 .mission-page-card").count(),
    5,
  );
  assert.equal(
    await page.locator("#mission-directory-x01 ol li a").count(),
    15,
  );
  assert.match(
    await page
      .locator("#mission-directory-hajin .mission-page-card")
      .nth(1)
      .innerText(),
    /page may vary/i,
  );
  const sourceCode = page.locator(
    '#mission-directory-x01 a[href="/objectives/mw4--x01-order-source-code/"]',
  );
  assert.equal(await sourceCode.count(), 1);
  await sourceCode.click();
  assert.match(await page.locator("main").innerText(), /Source Code/);
  const editor = page.locator('a[href^="http://127.0.0.1:4174/"]', {
    hasText: "Edit mission content",
  });
  assert.equal(await editor.count(), 1);
  assert.match(
    await editor.getAttribute("href"),
    /mw4%3Ax01-order-source-code|mw4:x01-order-source-code/,
  );
  const auditLink = page.getByRole("link", { name: "Audit this mission" });
  assert.equal(
    new URL(await auditLink.getAttribute("href"), server.base).searchParams.get(
      "pack",
    ),
    "official:mw4-dmz-starter",
  );
  await auditLink.click();
  await page.locator("#mission-audit-target").waitFor({ state: "visible" });
  assert.match(
    await page.locator("#mission-audit-target").innerText(),
    /Source Code/,
  );
  assert.equal(
    await page
      .locator(
        '#mission-audit-links a[href="/local/?pack=official%3Amw4-dmz-starter&id=mw4%3Ax01-order-source-code"]',
      )
      .count(),
    1,
  );
  assert.deepEqual(errors, []);
  console.log("Mission directory, edit and audit handoff PASS");
} finally {
  await browser.close();
  await server.stop();
}
