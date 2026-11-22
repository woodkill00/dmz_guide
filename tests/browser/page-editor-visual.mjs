import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium, firefox, webkit } from "playwright";
import { pageEditorFixture } from "../helpers/page-editor.mjs";
import { servicePath } from "../../src/domain/local-services.mjs";
await mkdir("test-results", { recursive: true });
for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
  const f = await pageEditorFixture(),
    browser = await engine.launch(),
    context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    }),
    page = await context.newPage(),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  try {
    await page.goto(f.url("test:order"));
    await page.locator("#pe-add-section:enabled").waitFor();
    assert.equal(
      await page.locator("#pe-title").innerText(),
      "Edit Synthetic Order",
    );
    await page.locator("#pe-add-section").click();
    await page
      .getByLabel("Section title", { exact: true })
      .fill("Synthetic route notes");
    await page
      .locator("#pe-fields")
      .getByLabel("Text", { exact: true })
      .fill("Original synthetic editor test notes");
    assert.match(
      await page.locator("#pe-preview").innerText(),
      /Original synthetic editor test notes/,
    );
    const beforeOrder = await page
      .locator("#pe-sections button")
      .allTextContents();
    await page.getByRole("button", { name: "Section up", exact: true }).focus();
    await page.keyboard.press("Enter");
    const afterOrder = await page
      .locator("#pe-sections button")
      .allTextContents();
    assert.equal(
      afterOrder.indexOf("Synthetic route notes"),
      beforeOrder.indexOf("Synthetic route notes") - 1,
    );
    assert.equal(
      await page.evaluate(() => document.activeElement.textContent),
      "Section up",
    );
    await page.locator("#pe-validate").click();
    await page.locator("#pe-save:enabled").waitFor();
    await page.locator("#pe-save").click();
    await page
      .locator("#pe-status")
      .filter({ hasText: /^Saved to repository/ })
      .waitFor();
    const r = await f.get("test:order");
    assert.equal(r.document.revision, 1);
    assert(
      r.document.sections.some((s) => s.title === "Synthetic route notes"),
    );
    await page.reload();
    await page.locator("#pe-add-section:enabled").waitFor();
    assert.match(
      await page.locator("#pe-preview").innerText(),
      /Synthetic route notes/,
    );
    await page.locator("#pe-add-section").click();
    await page.getByLabel("Section title", { exact: true }).fill("Second save");
    await page.locator("#pe-validate").click();
    await page.locator("#pe-save:enabled").waitFor();
    await page.locator("#pe-save").click();
    await page
      .locator("#pe-status")
      .filter({ hasText: /^Saved to repository/ })
      .waitFor();
    assert.equal((await f.get("test:order")).document.revision, 2);
    for (const width of [320, 390, 768, 1024, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        `${name} overflow${width}`,
      );
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.screenshot({
      path: `test-results/page-editor-${name}.png`,
      fullPage: true,
    });
    assert.deepEqual(errors, []);
    await page.locator("#pe-return").click();
    assert.match(
      await page.locator("main").innerText(),
      /Synthetic route notes/,
    );
    assert.equal(
      await page
        .getByRole("link", { name: /^All missions/ })
        .getAttribute("href"),
      servicePath("guide", "/missions/"),
    );
    console.log(
      `093 ${name} Orders edit/preview/twosaves/reopen/responsive/source-preservation PASS`,
    );
  } finally {
    await context.close();
    await browser.close();
    await f.close();
  }
}
