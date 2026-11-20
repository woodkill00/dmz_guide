import assert from "node:assert/strict";
import { readFile, mkdir } from "node:fs/promises";
import { chromium, firefox, webkit } from "playwright";
import AxeBuilder from "../../tools/hajin-map/node_modules/@axe-core/playwright/dist/index.mjs";
import {
  pageEditorFixture,
  showEditorContent,
} from "../helpers/page-editor.mjs";
await mkdir("test-results", { recursive: true });
for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
  if (process.env.PAGE_EDITOR_ENGINE && process.env.PAGE_EDITOR_ENGINE !== name)
    continue;
  const f = await pageEditorFixture(),
    browser = await engine.launch(),
    context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    }),
    page = await context.newPage(),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("dialog", (d) => d.accept());
  const ready = () => page.locator("#pe-add-section:enabled").waitFor();
  const save = async () => {
    await page.locator("#pe-validate").click();
    await page.locator("#pe-save:enabled").waitFor();
    await page.locator("#pe-save").click();
    await page
      .locator("#pe-status")
      .filter({ hasText: /^Saved to repository/ })
      .waitFor();
  };
  try {
    await page.goto(f.url("test:x01-order"));
    await ready();
    await page.locator("#pe-add-section").click();
    await page
      .getByLabel("Section title", { exact: true })
      .fill("Synthetic illustrated guide");
    await page
      .locator("#pe-fields")
      .getByLabel("Text", { exact: true })
      .fill("Recovered synthetic note");
    await page.waitForFunction(() =>
      document
        .querySelector("#pe-status")
        .textContent.includes("Recovery draft stored"),
    );
    await page.reload();
    await ready();
    await page.locator("#pe-restore").click();
    assert.match(
      await page.locator("#pe-preview").innerText(),
      /Recovered synthetic note/,
    );
    await page.locator("#pe-undo").click();
    assert.doesNotMatch(
      await page.locator("#pe-preview").innerText(),
      /Recovered synthetic note/,
    );
    await page.locator("#pe-redo").click();
    const bytes = await page.evaluate(() => {
      const c = document.createElement("canvas");
      c.width = 320;
      c.height = 180;
      const x = c.getContext("2d");
      x.fillStyle = "#4b70be";
      x.fillRect(0, 0, 320, 180);
      x.fillStyle = "white";
      x.fillText("Original synthetic fixture", 20, 30);
      return c.toDataURL("image/png").split(",")[1];
    });
    await page.getByText("Add picture", { exact: true }).click();
    await page.locator("#pe-picture-file").setInputFiles({
      name: "synthetic.png",
      mimeType: "image/png",
      buffer: Buffer.from(bytes, "base64"),
    });
    await page.locator("#pe-holder").fill("Software test");
    await page.locator("#pe-license").fill("Original test fixture");
    await page
      .locator("#pe-source")
      .fill("https://example.com/synthetic-fixture");
    await page
      .locator("#pe-attribution")
      .fill("Original synthetic software test");
    await page.locator("#pe-rights").check();
    await page.locator("#pe-upload").click();
    await page
      .locator("#pe-picture-status")
      .filter({ hasText: /Picture added to draft/ })
      .waitFor();
    await page
      .locator("#pe-fields")
      .getByLabel("Image description", { exact: true })
      .fill("Synthetic blue reference");
    const insertion = page
      .locator("#pe-fields .pe-actions")
      .filter({ has: page.getByLabel("Block to insert", { exact: true }) })
      .last();
    await insertion
      .getByLabel("Block to insert", { exact: true })
      .selectOption("gallery");
    assert.equal(
      await insertion
        .getByLabel("Block to insert", { exact: true })
        .inputValue(),
      "gallery",
    );
    await insertion
      .getByRole("button", { name: "Insert here", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Add library picture", exact: true })
      .click();
    const gallery = page.locator("#pe-fields details.pe-block[open]");
    await gallery
      .getByLabel("Description", { exact: true })
      .fill("Synthetic gallery placement");
    await gallery.getByLabel(/^Fit/).selectOption("cover");
    await page
      .locator("#pe-preview")
      .getByText("Fill frame may crop or enlarge", { exact: true })
      .waitFor();
    await gallery.getByLabel("Focal X (0–1)", { exact: true }).fill("0.25");
    await showEditorContent(page, { advanced: true });
    await page.locator("#pe-version").fill("2");
    await save();
    const current = await f.get("test:x01-order");
    assert.equal(current.pack.assets.length, 1);
    assert.equal(current.record.assetId, current.pack.assets[0].id);
    await page.getByText("Backups & transfer", { exact: true }).click();
    const download = page.waitForEvent("download");
    await page.locator("#pe-export").click();
    const file = await download;
    const bundle = JSON.parse(await readFile(await file.path(), "utf8"));
    assert.equal(bundle.assets.length, 1);
    assert(bundle.assets[0].data);
    await page.locator("#pe-import").setInputFiles({
      name: "page.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(bundle)),
    });
    await page.locator("#pe-apply-import:enabled").waitFor();
    await page.locator("#pe-version").fill("2-staged");
    assert.equal(await page.locator("#pe-apply-import").isDisabled(), true);
    await page.locator("#pe-version").fill("2");
    await page.locator("#pe-import").setInputFiles({
      name: "page.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(bundle)),
    });
    await page.locator("#pe-apply-import:enabled").waitFor();
    await page.locator("#pe-apply-import").click();
    assert.match(
      await page.locator("#pe-preview").innerText(),
      /Recovered synthetic note/,
    );
    const oldBase = structuredClone(bundle);
    oldBase.base.semanticFingerprint = "0".repeat(64);
    oldBase.document.baseFingerprint = oldBase.base.semanticFingerprint;
    await page.locator("#pe-import").setInputFiles({
      name: "older-base.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(oldBase)),
    });
    await page.locator("#pe-apply-import:enabled").waitFor();
    await page.locator("#pe-apply-import").click();
    assert.equal(await page.locator("#pe-base-review-label").isVisible(), true);
    await page.locator("#pe-validate").click();
    await page
      .locator("#pe-error")
      .filter({ hasText: /check the baseline review/ })
      .waitFor();
    assert.equal(await page.locator("#pe-save").isDisabled(), true);
    await page.locator("#pe-base-review").check();
    await save();
    assert.equal((await f.get("test:x01-order")).document.revision, 2);
    await page
      .locator("#pe-data")
      .getByText("All structured record fields", { exact: true })
      .click();
    for (const width of [320, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.locator('[data-pe-tab="fields"]').evaluate((el) => el.click());
      for (const theme of ["dark", "light"]) {
        await page.evaluate(
          ({ theme, width }) => {
            document.documentElement.dataset.theme = theme;
            document.documentElement.style.fontSize =
              width === 320 ? "200%" : "";
          },
          { theme, width },
        );
        await page.evaluate(
          () =>
            new Promise((resolve) =>
              requestAnimationFrame(() => requestAnimationFrame(resolve)),
            ),
        );
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth + 1,
        );
        if (overflow)
          console.log(
            await page.evaluate(() =>
              [...document.querySelectorAll("body *")]
                .filter(
                  (el) =>
                    el.scrollWidth > el.clientWidth + 5 && el.scrollWidth > 320,
                )
                .map((el) => ({
                  id: el.id,
                  tag: el.tagName,
                  class: el.className,
                  width: el.clientWidth,
                  scroll: el.scrollWidth,
                  display: getComputedStyle(el).display,
                }))
                .slice(0, 35),
            ),
          );
        if (overflow) {
          await page.screenshot({
            path: `test-results/page-editor-overflow-${name}.png`,
            fullPage: true,
          });
          console.log(
            await page.evaluate(() => ({
              width: innerWidth,
              doc: document.documentElement.scrollWidth,
              body: document.body.scrollWidth,
              offenders: [...document.querySelectorAll("body *")]
                .filter((el) => {
                  const r = el.getBoundingClientRect();
                  return r.width && r.right > innerWidth + 1;
                })
                .slice(0, 20)
                .map((el) => ({
                  tag: el.tagName,
                  id: el.id,
                  class: el.className,
                  text: el.textContent.slice(0, 70),
                  right: el.getBoundingClientRect().right,
                })),
            })),
          );
        }
        assert(!overflow, `${name} overflow ${width} ${theme}`);
        const result = await new AxeBuilder({ page }).analyze();
        assert.deepEqual(
          result.violations.map((v) => ({
            id: v.id,
            nodes: v.nodes.map((n) => n.target),
          })),
          [],
          `${name} axe ${width} ${theme}`,
        );
      }
    }
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "";
      document.documentElement.dataset.theme = "dark";
    });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.screenshot({
      path: `test-results/page-editor-media-${name}.png`,
      fullPage: true,
    });
    await page.locator("#pe-return").click();
    const img = page.getByAltText("Synthetic blue reference");
    await img.waitFor();
    await img.evaluate((el) => el.decode());
    assert.equal(await img.evaluate((el) => el.naturalWidth), 320);
    for (const id of ["test:material", "test:upgrade"]) {
      await page.goto(f.url(id));
      await ready();
      await showEditorContent(page, { advanced: true });
      await page
        .locator("#pe-record-fields")
        .getByLabel("Name", { exact: true })
        .fill(id + " edited synthetic");
      await page
        .locator("#pe-version")
        .fill(id === "test:material" ? "3" : "4");
      await save();
      assert.equal((await f.get(id)).record.name, id + " edited synthetic");
      if (id === "test:material") {
        await page.locator("#pe-return").click();
        assert.equal(await page.locator("[data-item-workspace]").count(), 1);
        assert.equal(await page.locator("[data-item-collection]").count(), 1);
        assert.equal(await page.locator("[data-build-control]").count(), 1);
        assert.match(
          await page
            .getByRole("link", { name: "Inventory & blueprint", exact: true })
            .getAttribute("href"),
          /^http:\/\/127\.0\.0\.1:4173\/inventory\//,
        );
        for (const width of [320, 1440]) {
          await page.setViewportSize({ width, height: 1000 });
          await page.evaluate(
            () =>
              new Promise((resolve) =>
                requestAnimationFrame(() => requestAnimationFrame(resolve)),
              ),
          );
          assert(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth + 1,
            ),
            `${name} customized item overflow ${width}`,
          );
          const result = await new AxeBuilder({ page }).analyze();
          assert.deepEqual(
            result.violations.map((v) => v.id),
            [],
            `${name} customized item axe ${width}`,
          );
        }
      }
    }
    assert.deepEqual(errors, []);
    console.log(
      `093 ${name} recovery/undo/media/bundle/item/upgrade/mobile200%/dark-light/axe PASS`,
    );
  } catch (error) {
    console.log(
      "Editor media failure",
      await page.locator("#pe-error").textContent(),
      await page.locator("#pe-fields").innerText(),
    );
    await page.screenshot({
      path: `test-results/page-editor-media-failure-${name}.png`,
      fullPage: true,
    });
    throw error;
  } finally {
    await context.close();
    await browser.close();
    await f.close();
  }
}
