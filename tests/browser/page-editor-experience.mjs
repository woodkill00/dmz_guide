import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium, firefox, webkit } from "playwright";
import AxeBuilder from "../../tools/hajin-map/node_modules/@axe-core/playwright/dist/index.mjs";
import { pageEditorFixture } from "../helpers/page-editor.mjs";
await mkdir("test-results", { recursive: true });
for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
  if (process.env.PAGE_EDITOR_ENGINE && process.env.PAGE_EDITOR_ENGINE !== name)
    continue;
  let builds = 0;
  const runBuild = () => {
    const attempt = ++builds;
    let timer, rejectRun;
    const done = new Promise((resolve, reject) => {
      rejectRun = reject;
      timer = setTimeout(
        () =>
          attempt === 1
            ? reject(Error("Synthetic failed reader refresh"))
            : resolve(),
        60,
      );
    });
    return {
      pid: null,
      done,
      terminate: async () => {
        clearTimeout(timer);
        rejectRun(Error("Synthetic interrupted refresh"));
      },
    };
  };
  const f = await pageEditorFixture({ editorToolsOptions: { runBuild } }),
    browser = await engine.launch(),
    context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    }),
    page = await context.newPage(),
    errors = [];
  const watch = (p) => {
    p.on("pageerror", (e) => errors.push(e.message));
    p.on("dialog", (d) => d.accept());
  };
  watch(page);
  let other;
  try {
    await page.goto(f.url("test:order"));
    await page.locator("#pe-add-section:enabled").waitFor();
    assert.equal(
      await page.locator('#pe-sections input[type="checkbox"]').count(),
      await page.locator("#pe-sections button[data-section-id]").count(),
      "Exactly one selection checkbox per outline section after loading",
    );
    assert.equal(
      await page.locator(".pe-inspector").getAttribute("data-mode"),
      "content",
    );
    await page
      .getByLabel("Task 1", { exact: true })
      .fill("Changed synthetic mission task");
    assert.match(
      await page.locator("#pe-preview").innerText(),
      /Changed synthetic mission task/,
    );
    await page
      .getByRole("button", { name: "Add mission task", exact: true })
      .click();
    await page
      .getByLabel("Task 3", { exact: true })
      .fill("Added synthetic mission task");
    await page.locator("#pe-validate").click();
    await page.locator("#pe-errors").waitFor();
    await page.locator("#pe-errors button").first().click();
    assert.equal(
      await page.evaluate(() => document.activeElement.id),
      "pe-version",
    );
    await page.locator("#pe-next-version").click();
    await page.locator("#pe-add-section").click();
    await page
      .getByLabel("Section title", { exact: true })
      .fill("Synthetic route notes");
    await page
      .locator("#pe-fields")
      .getByLabel("Text", { exact: true })
      .fill("Select this synthetic preview note");
    await page
      .locator("#pe-preview")
      .getByText("Select this synthetic preview note", { exact: true })
      .click();
    assert.equal(
      await page.locator(".pe-inspector").getAttribute("data-mode"),
      "layout",
    );
    assert.equal(await page.locator("#pe-fields details[open]").count(), 1);
    await page.getByText("Section templates", { exact: true }).click();
    await page.locator("#pe-template").selectOption("tips");
    await page.locator("#pe-add-template").click();
    await page
      .getByLabel("Section title", { exact: true })
      .fill("Synthetic reusable tips");
    await page
      .locator("#pe-fields")
      .getByLabel("Text", { exact: true })
      .fill("Original synthetic tip");
    await page
      .getByLabel("Select section Synthetic reusable tips", { exact: true })
      .check();
    await page.getByText("Reusable layouts", { exact: true }).click();
    await page.locator("#pe-pattern-name").fill("Synthetic tips layout");
    await page.locator("#pe-pattern-save").click();
    await page.locator("#pe-pattern-insert").click();
    await page.locator("#pe-outline-search").fill("Synthetic reusable tips");
    await page.locator("#pe-select-all").click();
    await page.locator('[data-pe-batch="duplicate"]').click();
    await page.locator('[data-pe-batch="up"]').click();
    await page.locator('[data-pe-batch="remove"]').click();
    await page.locator("#pe-outline-search").fill("");
    const ids = await page
      .locator("#pe-preview .page-section")
      .evaluateAll((nodes) => nodes.map((n) => n.id));
    assert.equal(new Set(ids).size, ids.length);
    await page
      .locator("#pe-sections button[data-section-id]")
      .filter({ hasText: "Synthetic reusable tips" })
      .first()
      .click();
    await page.locator('[data-pe-mode="photos"]').click();
    const png = await page.evaluate(() => {
      const canvas = document.createElement("canvas");
      canvas.width = 320;
      canvas.height = 180;
      const c = canvas.getContext("2d");
      c.fillStyle = "#4b70be";
      c.fillRect(0, 0, 320, 180);
      c.fillStyle = "white";
      c.fillText("Synthetic editor fixture", 20, 30);
      return canvas.toDataURL("image/png").split(",")[1];
    });
    await page.locator("#pe-picture-file").setInputFiles({
      name: "synthetic.png",
      mimeType: "image/png",
      buffer: Buffer.from(png, "base64"),
    });
    await page.locator("#pe-crop-preview").waitFor();
    await page.getByText("Crop and output size", { exact: true }).click();
    for (const [key, value] of Object.entries({
      x: "10",
      y: "10",
      width: "160",
      height: "90",
    }))
      await page.locator("#pe-crop-" + key).fill(value);
    await page.locator("#pe-holder").fill("Software test");
    await page.locator("#pe-license").fill("Original synthetic test");
    await page.locator("#pe-source").fill("https://example.com/synthetic");
    await page.locator("#pe-attribution").fill("Original software test");
    await page.locator("#pe-rights").check();
    await page.locator("#pe-upload").click();
    await page
      .locator("#pe-picture-status")
      .filter({ hasText: /Picture added/ })
      .waitFor();
    await page
      .locator("#pe-fields")
      .getByLabel("Image description", { exact: true })
      .fill("Synthetic cropped reference");
    await page
      .locator("#pe-fields")
      .getByLabel("Caption", { exact: true })
      .fill("Original synthetic image");
    assert.equal(await page.locator("#pe-library button").count(), 1);
    await page.locator("#pe-show-history").click();
    await page.waitForFunction(() =>
      document
        .querySelector("#pe-disk-status")
        .textContent.includes("Disk checkpoint saved"),
    );
    other = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    });
    const recovered = await other.newPage();
    watch(recovered);
    await recovered.goto(f.url("test:order"));
    await recovered.locator("#pe-add-section:enabled").waitFor();
    await recovered.locator("#pe-show-history").click();
    await recovered.waitForFunction(() =>
      document
        .querySelector("#pe-disk-status")
        .textContent.includes("Another browser"),
    );
    await recovered
      .getByRole("button", { name: "Compare current checkpoint", exact: true })
      .click();
    await recovered.locator("#pe-restore-confirm").check();
    await recovered.locator("#pe-restore-apply").click();
    await recovered.locator('[data-pe-mode="content"]').click();
    assert.equal(
      await recovered.getByLabel("Task 3", { exact: true }).inputValue(),
      "Added synthetic mission task",
    );
    assert.equal((await f.get("test:order")).record.steps.length, 2);
    await recovered.locator("#pe-advanced > summary").click();
    await recovered.locator("#pe-next-version").click();
    await recovered.locator("#pe-validate").click();
    await recovered.locator("#pe-save-refresh:enabled").waitFor();
    assert(
      !(await recovered.locator("#pe-readable-diff").innerText()).includes(
        '{"',
      ),
    );
    let busyReads = 0;
    await recovered.route("**/api/page-edits/tools?**", async (route) => {
      if (
        new URL(route.request().url()).searchParams.get("action") ===
          "refresh" &&
        busyReads++ === 0
      )
        return route.fulfill({
          status: 409,
          contentType: "application/json",
          body: JSON.stringify({
            code: "REPOSITORY_BUSY",
            message: "Synthetic build snapshot holds repository lock",
          }),
        });
      return route.continue();
    });
    await recovered.locator("#pe-save-refresh").click();
    await recovered
      .locator("#pe-status")
      .filter({ hasText: /^Saved to repository/ })
      .waitFor();
    await recovered.waitForFunction(() =>
      document
        .querySelector("#pe-refresh-status")
        .textContent.includes("Synthetic failed"),
    );
    const saved = await f.get("test:order");
    assert(
      busyReads >= 2,
      "Refresh polling retries temporary snapshot lock contention",
    );
    assert.equal(saved.document.revision, 1);
    assert.equal(saved.record.steps.length, 3);
    const image = saved.pack.assets.find((a) => a.id === saved.record.assetId);
    assert.equal(image.width, 160);
    assert.equal(image.height, 90);
    await recovered.locator("#pe-refresh-retry").click();
    await recovered.waitForFunction(() =>
      document
        .querySelector("#pe-refresh-status")
        .textContent.includes("Local reader updated"),
    );
    assert.equal(builds, 2);
    assert.equal((await f.get("test:order")).document.revision, 1);
    await recovered.locator("#pe-history-refresh").click();
    await recovered
      .getByRole("button", { name: "Compare revision 0", exact: true })
      .click();
    await recovered.locator("#pe-restore-confirm").check();
    await recovered.locator("#pe-restore-apply").click();
    await recovered.locator('[data-pe-mode="content"]').click();
    assert.equal(
      await recovered.getByLabel("Task 1", { exact: true }).inputValue(),
      "Synthetic first step",
    );
    assert.equal((await f.get("test:order")).document.revision, 1);
    await recovered.locator("#pe-undo").click();
    assert.match(
      await recovered.locator("#pe-preview").innerText(),
      /Changed synthetic mission task/,
    );
    await recovered.locator("#pe-outline-width").evaluate((n) => {
      n.value = "300";
      n.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await recovered.locator("#pe-toggle-outline").click();
    assert.equal(await recovered.locator(".pe-outline").isVisible(), false);
    await recovered.locator("#pe-toggle-outline").click();
    for (const width of [320, 390, 768, 1440, 1920]) {
      await recovered.setViewportSize({ width, height: 1000 });
      assert.equal(
        await recovered.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        true,
        `${name} width${width}`,
      );
    }
    await recovered.setViewportSize({ width: 320, height: 900 });
    await recovered.evaluate(
      () => (document.documentElement.style.fontSize = "200%"),
    );
    await recovered.locator('[data-pe-tab="fields"]').click();
    if (
      !(await recovered.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ))
    )
      console.log(
        "094 overflow",
        await recovered.evaluate(() =>
          [...document.querySelectorAll("body *")]
            .filter((n) => {
              const r = n.getBoundingClientRect();
              return r.width > 0 && (r.right > innerWidth + 1 || r.left < -1);
            })
            .slice(0, 16)
            .map((n) => ({
              tag: n.tagName,
              id: n.id,
              class: n.className,
              width: n.getBoundingClientRect().width,
              text: n.textContent.slice(0, 80),
            })),
        ),
      );
    assert.equal(
      await recovered.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      true,
      `${name} 200%`,
    );
    await recovered.evaluate(
      () => (document.documentElement.style.fontSize = ""),
    );
    await recovered.setViewportSize({ width: 1440, height: 1000 });
    await recovered.screenshot({
      path: `test-results/page-editor-experience-${name}.png`,
      fullPage: true,
    });
    const axe = await new AxeBuilder({ page: recovered })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    assert.deepEqual(
      axe.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
      [],
    );
    await recovered.goto(f.url("test:material"));
    await recovered.locator("#pe-add-section:enabled").waitFor();
    await recovered.locator('[data-pe-mode="content"]').click();
    await recovered
      .getByLabel("Description", { exact: true })
      .fill("Synthetic edited item reference");
    await recovered.locator("#pe-advanced > summary").click();
    await recovered.locator("#pe-next-version").click();
    await recovered.locator('[data-pe-mode="photos"]').click();
    await recovered.locator("#pe-library button").first().click();
    await recovered
      .locator("#pe-fields")
      .getByLabel("Image description", { exact: true })
      .fill("Reused original synthetic item picture");
    await recovered.locator("#pe-validate").click();
    await recovered.locator("#pe-save:enabled").waitFor();
    await recovered.locator("#pe-save").click();
    await recovered
      .locator("#pe-status")
      .filter({ hasText: /^Saved to repository/ })
      .waitFor();
    const item = await f.get("test:material");
    assert.equal(item.record.description, "Synthetic edited item reference");
    assert.equal(item.pack.assets.length, 1);
    assert.equal(item.record.assetId, image.id);
    for (const theme of ["dark", "light"]) {
      await recovered.evaluate(
        (value) => (document.documentElement.dataset.theme = value),
        theme,
      );
      const report = await new AxeBuilder({ page: recovered })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      assert.deepEqual(
        report.violations.map((v) => ({
          id: v.id,
          nodes: v.nodes.map((n) => n.target),
        })),
        [],
      );
    }
    await recovered.screenshot({
      path: `test-results/page-editor-experience-item-${name}.png`,
      fullPage: true,
    });
    assert.deepEqual(errors, []);
    console.log(
      `094 ${name}:Order tasks/preview/templates/patterns/batch/media/cross-browser checkpoint/save-failed-refresh-retry/history-restore/undo/responsive/axe PASS`,
    );
  } catch (error) {
    const failed = other?.pages()[0] || page;
    console.log(
      "094 failure",
      await failed.locator("#pe-error").textContent(),
      await failed.locator("#pe-disk-status").textContent(),
    );
    await failed.screenshot({
      path: `test-results/page-editor-experience-failure-${name}.png`,
      fullPage: true,
    });
    throw error;
  } finally {
    await other?.close();
    await context.close();
    await browser.close();
    await f.close();
  }
}
