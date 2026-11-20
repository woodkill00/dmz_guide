import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium, firefox, webkit } from "playwright";
import { startBrowserServer } from "./server.mjs";
import {
  pageEditorFixture,
  showEditorContent,
} from "../helpers/page-editor.mjs";

const server = await startBrowserServer();
await mkdir("test-results", { recursive: true });
try {
  for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
    if (
      process.env.PAGE_EDITOR_ENGINE &&
      process.env.PAGE_EDITOR_ENGINE !== name
    )
      continue;
    const f = await pageEditorFixture(),
      browser = await engine.launch(),
      context = await browser.newContext({
        viewport: { width: 390, height: 844 },
      }),
      page = await context.newPage(),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    // Preserve the published Edit href and actual click, redirect transport only
    // into this disposable author checkout; never save into the owner's repo.
    await page.route("**/local-services/author/**", async (route) => {
      // Verify the real directory response, then keep authoring inside the
      // disposable fixture instead of following a redirect to an owner tool.
      const response = await route.fetch({ maxRedirects: 0 });
      assert.equal(response.status(), 302);
      const url = new URL(response.headers().location);
      assert.equal(url.hostname, "127.0.0.1");
      const destination = (f.app.url + url.pathname + url.search)
        .replaceAll("&", "&amp;")
        .replaceAll('"', "&quot;");
      return route.fulfill({
        status: 200,
        contentType: "text/html",
        body: `<!doctype html><html><head><meta http-equiv="refresh" content="0;url=${destination}"></head><body>Opening disposable test editor.</body></html>`,
      });
    });
    try {
      const directory =
        server.base + "/missions/?pack=official%3Amw4-dmz-starter";
      await page.goto(directory);
      await page.locator("#hajin-page-1 h4 a").waitFor();
      const links = await page
        .locator(".mission-page-card h4 a")
        .evaluateAll((nodes) => nodes.map((n) => n.getAttribute("href")));
      assert.equal(links.length, 29);
      assert.equal(new Set(links).size, 29);
      for (const href of links) {
        assert.match(href, /^\/missions\/(hajin|x01)\/\d+\/$/);
        const response = await page.request.get(server.base + href);
        assert.equal(response.status(), 200, href);
        assert.match(
          await response.text(),
          /data-compose-source="mission-chapter"/,
        );
      }
      for (const set of ["hajin", "x01"]) {
        await page.goto(directory);
        await page.locator(`#${set}-page-1 h4 a`).click();
        assert.equal(new URL(page.url()).pathname, `/missions/${set}/1/`);
        assert.equal(
          await page.locator("main h1").innerText(),
          `${set === "hajin" ? "Hajin" : "X01"} · Page 1`,
        );
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
          true,
        );
        const edit = page.locator('[data-compose-source="mission-chapter"]');
        assert.equal(
          new URL(
            new URL(
              await edit.getAttribute("href"),
              page.url(),
            ).searchParams.get("destination"),
            page.url(),
          ).searchParams.get("id"),
          `${set}-1`,
        );
        await page.screenshot({
          path: `test-results/page-editor-chapter-${set}-${name}.png`,
          fullPage: true,
        });
        await edit.click();
        await page.waitForFunction(() => {
          const button = document.querySelector("#pe-add-section");
          return button && !button.disabled;
        });
        assert.match(
          await page.locator("#pe-title").innerText(),
          new RegExp(`${set}-1`),
        );
        await page.locator('[data-pe-tab="fields"]').click();
        await showEditorContent(page);
        await page
          .locator("#pe-record-fields")
          .getByLabel("Notes", { exact: true })
          .fill("Synthetic chapter browser note; not game data");
        await page.locator("#pe-data > summary").click();
        await page.locator('[data-pe-tab="outline"]').click();
        await page.locator("#pe-add-section").click();
        await page.locator('[data-pe-tab="fields"]').click();
        await page
          .getByLabel("Section title", { exact: true })
          .fill("Synthetic chapter navigation test");
        await page
          .locator("#pe-fields")
          .getByLabel("Text", { exact: true })
          .fill("Synthetic chapter browser section");
        await page.locator("#pe-validate").click();
        await page.locator("#pe-save:enabled").waitFor();
        await page.locator("#pe-save").click();
        await page
          .locator("#pe-status")
          .filter({ hasText: /^Saved to repository/ })
          .waitFor();
        await page.reload();
        await page.waitForFunction(() => {
          const button = document.querySelector("#pe-add-section");
          return button && !button.disabled;
        });
        await page.locator('[data-pe-tab="fields"]').click();
        await showEditorContent(page);
        assert.equal(
          await page
            .locator("#pe-record-fields")
            .getByLabel("Notes", { exact: true })
            .inputValue(),
          "Synthetic chapter browser note; not game data",
        );
      }
      await page.goto(directory);
      await page.locator("#hajin-page-1 h4 a").click();
      await page.getByRole("link", { name: "Gear Up", exact: true }).click();
      assert.equal(
        new URL(page.url()).pathname,
        "/objectives/mw4--order-gear-up/",
      );
      const missionBridge = new URL(
        await page.locator("[data-compose-record]").getAttribute("href"),
        page.url(),
      );
      assert.equal(missionBridge.pathname, "/local-services/author/");
      const missionEdit = new URL(
        missionBridge.searchParams.get("destination"),
        page.url(),
      );
      assert.equal(missionEdit.searchParams.get("id"), "mw4:order-gear-up");
      assert.equal(
        missionEdit.searchParams.get("packId"),
        "official:mw4-dmz-starter",
      );
      assert.equal(missionEdit.searchParams.get("intent"), "compose");
      assert.deepEqual(errors, []);
      console.log(
        `093 T024 ${name}:29 chapter links/routes, Hajin+X01 click→editor→notes/layout save/reload,390px and exact mission Edit identity PASS`,
      );
    } finally {
      await context.close();
      await browser.close();
      await f.close();
    }
  }
} finally {
  await server.stop();
}
