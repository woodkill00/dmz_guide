import assert from "node:assert/strict";
import { mkdtemp, cp, rm, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createAuthorServer } from "../../scripts/author.mjs";
import { monitorBrowser } from "./health.mjs";
import { captureDocumentEvidence } from "./page-edit.mjs";
const project = fileURLToPath(new URL("../../", import.meta.url));
const excluded = new Set([
  ".git",
  "node_modules",
  "dist",
  "release",
  "test-results",
  ".author-state",
  ".build-state",
  ".codex",
  ".agents",
]);
export async function runContributorWorkflows({
  browser,
  engineName,
  captureScreenshots = engineName !== "webkit",
}) {
  const root = await mkdtemp(join(tmpdir(), "dmz-contributor-"));
  let app;
  try {
    await cp(project, root, {
      recursive: true,
      filter: (path) => !excluded.has(basename(path)),
    });
    app = await createAuthorServer({ root, port: 0 });
    const context = await browser.newContext(),
      page = await context.newPage();
    page.on("dialog", (dialog) => dialog.accept());
    const exportRecovery = async () => {
      const [download] = await Promise.all([
        page.waitForEvent("download"),
        page.click("#export-draft"),
      ]);
      const stream = await download.createReadStream();
      assert(stream, "Recovery download has readable bytes");
      const chunks = [];
      for await (const chunk of stream) chunks.push(chunk);
      const exported = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      return {
        packKey: exported.packKey,
        pack: exported.pack,
        uploads: exported.uploads,
      };
    };
    const retainAcrossNavigation = async () => {
      for (const target of [
        "studio-pictures",
        "studio-review",
        "studio-recovery",
        "studio-authoring",
      ]) {
        await page.locator(`#studio-nav a[href="#${target}"]`).focus();
        await page.keyboard.press("Enter");
        assert(
          await page.evaluate(
            () =>
              window.retainedField ===
                document.querySelector("#new-record-name") &&
              window.retainedRawField ===
                document.querySelector("#advanced-json"),
          ),
          "Navigation preserves actual form nodes",
        );
        assert.equal(
          await page.inputValue("#new-record-name"),
          "Retained responsive name",
        );
        assert.equal(await page.inputValue("#advanced-json"), '{"retained":');
        assert.equal(
          await page.inputValue("#picture-holder"),
          "Retained responsive rights",
        );
        assert(await page.isChecked("#picture-rights"));
        assert(
          await page.locator("#import-stage").isVisible(),
          "Navigation preserves recovery preview",
        );
      }
    };

    await page.goto(app.url);
    await page
      .locator("#pack-select option")
      .first()
      .waitFor({ state: "attached" });
    await page.selectOption("#pack-select", "demo-training");
    await page
      .locator("#advanced-json")
      .evaluate((el) => (el.closest("details").open = true));
    await page.click("#refresh-json");
    const original = JSON.parse(await page.inputValue("#advanced-json"));
    await page.selectOption("#editor-section", "items");
    await page.fill("#new-record-name", "Retained unsaved control");
    // Retention fixture for the existing hidden media workbench; raster acceptance separately exercises attachment.
    await page.evaluate(() => {
      document.querySelector("#picture-holder").value =
        "Retained rights holder";
      document.querySelector("#picture-rights").checked = true;
    });
    await page.evaluate(() => {
      window.retainedField = document.querySelector("#new-record-name");
    });
    for (const target of [
      "studio-pictures",
      "studio-review",
      "studio-recovery",
      "studio-authoring",
    ]) {
      await page.locator(`#studio-nav a[href="#${target}"]`).focus();
      await page.keyboard.press("Enter");
      assert(
        await page.evaluate(
          () =>
            window.retainedField === document.querySelector("#new-record-name"),
        ),
      );
      assert.equal(
        await page.inputValue("#new-record-name"),
        "Retained unsaved control",
      );
      assert.equal(
        await page.inputValue("#picture-holder"),
        "Retained rights holder",
      );
      assert(await page.isChecked("#picture-rights"));
    }
    await page.fill("#review-version", "contributor-test-v2");
    await page.click("#apply-review-version");
    await page.click("#review-again");
    assert(await page.isVisible("#content-stage"));
    await page.fill("#review-version", "contributor-test-v3");
    await page.click("#apply-review-version");
    assert(!(await page.isVisible("#content-stage")));
    await page.click("#review-again");
    assert(await page.isVisible("#content-stage"));
    const catalog = await (
      await context.request.get(app.url + "/api/catalog")
    ).json();
    const candidate = structuredClone(original);
    candidate.title = "Recovered synthetic draft";
    candidate.contentVersion = "recovered-v1";
    const data = {
      format: "dmz-repository-draft-recovery",
      version: 1,
      warning: "Synthetic recovery fixture",
      packKey: "demo-training",
      expectedRevision: "a".repeat(64),
      pack: candidate,
      uploads: [],
    };
    const upload = () =>
      page.setInputFiles("#import-recovery", {
        name: "recovery.json",
        mimeType: "application/json",
        buffer: Buffer.from(JSON.stringify(data)),
      });
    await upload();
    await page.locator("#import-stage").waitFor({ state: "visible" });
    assert.match(
      await page.textContent("#import-summary"),
      /Historical revision/,
    );
    assert.deepEqual(
      (await (await context.request.get(app.url + "/api/catalog")).json())
        .revision,
      catalog.revision,
    );
    await page.click("#cancel-import");
    await page.click("#refresh-json");
    assert.notEqual(
      JSON.parse(await page.inputValue("#advanced-json")).title,
      candidate.title,
    );
    await upload();
    await page.locator("#import-stage").waitFor({ state: "visible" });
    await page.click("#apply-import");
    await page.click("#refresh-json");
    assert.equal(
      JSON.parse(await page.inputValue("#advanced-json")).title,
      candidate.title,
    );
    assert.equal(
      (await (await context.request.get(app.url + "/api/catalog")).json())
        .revision,
      catalog.revision,
    );
    assert.match(
      await page.textContent("#workflow-summary"),
      /not published by Studio/,
    );
    // Original synthetic pixels exercise the recovery path, not the portable importer.
    const raster = await page.evaluate(() => {
      const canvas = document.createElement("canvas");
      canvas.width = 2;
      canvas.height = 2;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#124578";
      ctx.fillRect(0, 0, 2, 2);
      return canvas.toDataURL("image/png").split(",")[1];
    });
    const { createHash } = await import("node:crypto");
    const bytes = Buffer.from(raster, "base64");
    const pictureData = structuredClone(data);
    pictureData.pack.assets = [
      {
        id: "demo:recovery-pixel",
        path: "assets/recovery-pixel.png",
        mime: "image/png",
        sha256: createHash("sha256").update(bytes).digest("hex"),
        bytes: bytes.length,
        width: 2,
        height: 2,
        rightsHolder: "Synthetic fixture author",
        license: "CC0-1.0",
        sourceUrl: "https://example.invalid/original",
        attribution: "Original synthetic test pixel",
        redistributionAllowed: true,
      },
    ];
    pictureData.pack.items[0].assetId = "demo:recovery-pixel";
    pictureData.uploads = [
      { assetId: "demo:recovery-pixel", base64: raster, category: "other" },
    ];
    const uploadPicture = (value) =>
      page.setInputFiles("#import-recovery", {
        name: "recovery-picture.json",
        mimeType: "application/json",
        buffer: Buffer.from(JSON.stringify(value)),
      });
    await uploadPicture(pictureData);
    await page.locator("#import-stage").waitFor({ state: "visible" });
    assert(!(await page.isChecked("#import-rights")));
    await page.click("#apply-import");
    await page.locator("#error").waitFor({ state: "visible" });
    assert.match(await page.textContent("#error"), /confirm permission/);
    await page.check("#import-rights");
    await page.click("#apply-import");
    await page.click("#refresh-json");
    const withPicture = JSON.parse(await page.inputValue("#advanced-json"));
    assert.equal(withPicture.assets.length, 1);
    const hostile = structuredClone(pictureData);
    hostile.pack.assets[0].sha256 = "0".repeat(64);
    await uploadPicture(hostile);
    await page.waitForFunction(() =>
      document.querySelector("#error").textContent.includes("hash mismatch"),
    );
    await page.click("#refresh-json");
    assert.deepEqual(
      JSON.parse(await page.inputValue("#advanced-json")),
      withPicture,
    );
    // Delay actual browser decode, then cancel/switch while it is in flight.
    await page.evaluate(() => {
      const original = globalThis.createImageBitmap.bind(globalThis);
      globalThis.createImageBitmap = async (...args) => {
        if (window.holdRecoveryDecode) {
          window.decodePending = true;
          await new Promise(
            (resolve) => (window.releaseRecoveryDecode = resolve),
          );
        }
        const bitmap = await original(...args);
        window.decodeCompleted = true;
        return bitmap;
      };
    });
    for (const mode of ["cancel", "switch"]) {
      let expectedRecovery = await exportRecovery();
      await page.evaluate(() => {
        window.holdRecoveryDecode = true;
        window.decodePending = false;
        window.decodeCompleted = false;
      });
      await uploadPicture(pictureData);
      await page.waitForFunction(() => window.decodePending === true);
      if (mode === "cancel") await page.click("#cancel-import");
      else {
        const other = await page
          .locator("#pack-select option")
          .evaluateAll((options) =>
            options
              .map((x) => x.value)
              .find((value) => value !== "demo-training"),
          );
        assert(
          other,
          "A second fixture catalog is required for switch cancellation",
        );
        await page.selectOption("#pack-select", other);
        expectedRecovery = await exportRecovery();
        assert.equal(expectedRecovery.packKey, other);
        assert.deepEqual(
          expectedRecovery.uploads,
          [],
          "Destination has no inherited uploads",
        );
      }
      await page.evaluate(() => {
        window.holdRecoveryDecode = false;
        window.releaseRecoveryDecode();
      });
      await page.waitForFunction(() => window.decodeCompleted === true);
      assert(!(await page.isVisible("#import-stage")));
      assert(!(await page.isVisible("#content-stage")));
      assert.deepEqual(
        await exportRecovery(),
        expectedRecovery,
        `${mode} during decode preserves exact destination draft and upload bytes`,
      );
      assert(!(await page.isVisible("#import-stage")));
      if (mode === "switch")
        await page.selectOption("#pack-select", "demo-training");
    }
    assert.equal(
      (await (await context.request.get(app.url + "/api/catalog")).json())
        .revision,
      catalog.revision,
    );
    await uploadPicture(pictureData);
    await page.locator("#import-stage").waitFor({ state: "visible" });
    await page.fill("#new-record-name", "Retained responsive name");
    await page.fill("#advanced-json", '{"retained":');
    await page.evaluate(() => {
      window.retainedField = document.querySelector("#new-record-name");
      window.retainedRawField = document.querySelector("#advanced-json");
      document.querySelector("#picture-holder").value =
        "Retained responsive rights";
      document.querySelector("#picture-rights").checked = true;
    });
    const zoomURL = new URL("/__contributor-text200.css", app.url).href;
    await page.route(zoomURL, (route) =>
      route.fulfill({ contentType: "text/css", body: ":root{font-size:200%}" }),
    );
    await mkdir("test-results", { recursive: true });
    const assertReflow = async (mode, width, theme) => {
      const geometry = await page.evaluate(() => ({
        url: location.href,
        viewport: { width: innerWidth, height: innerHeight },
        documentWidth: document.documentElement.scrollWidth,
        bodyWidth: document.body.scrollWidth,
        rootFontSize: getComputedStyle(document.documentElement).fontSize,
        bodyFontSize: getComputedStyle(document.body).fontSize,
        activeElement: document.activeElement?.id,
        rightsCheckbox: (() => {
          const node = document.querySelector("#import-rights");
          const rect = node.getBoundingClientRect();
          return {
            width: rect.width,
            height: rect.height,
            fontSize: parseFloat(getComputedStyle(node).fontSize),
          };
        })(),
        overflowing: [...document.querySelectorAll("body *")]
          .flatMap((node) => {
            const rect = node.getBoundingClientRect();
            if (
              !rect.width ||
              !rect.height ||
              (rect.left >= -1 && rect.right <= innerWidth + 1)
            )
              return [];
            const style = getComputedStyle(node);
            return [
              {
                tag: node.tagName,
                id: node.id,
                className: String(node.className),
                text: node.textContent?.slice(0, 120),
                left: rect.left,
                right: rect.right,
                width: rect.width,
                minWidth: style.minWidth,
                maxWidth: style.maxWidth,
                overflowX: style.overflowX,
                display: style.display,
                whiteSpace: style.whiteSpace,
              },
            ];
          })
          .slice(0, 100),
      }));
      const fits = geometry.documentWidth <= geometry.viewport.width + 1;
      const rightsVisible =
        geometry.rightsCheckbox.width >= geometry.rightsCheckbox.fontSize &&
        geometry.rightsCheckbox.height >= geometry.rightsCheckbox.fontSize;
      if (!fits || !rightsVisible) {
        const path = `test-results/${engineName}-contributor-${width}-${theme}-${mode}-failure`;
        await writeFile(
          path + ".json",
          JSON.stringify({ mode, width, theme, geometry }, null, 2),
        );
        if (captureScreenshots) {
          try {
            await captureDocumentEvidence(page, path + ".png");
          } catch (error) {
            await writeFile(
              path + "-capture-error.json",
              JSON.stringify({ message: error.message }, null, 2),
            );
          }
        }
      }
      assert(
        fits,
        `${mode} reflow: ${JSON.stringify({ width, theme, viewport: geometry.viewport.width, documentWidth: geometry.documentWidth, overflowing: geometry.overflowing })}`,
      );
      assert(
        rightsVisible,
        `${mode} rights checkbox remains discernible: ${JSON.stringify({ width, theme, ...geometry.rightsCheckbox })}`,
      );
    };
    for (const width of [320, 390, 1280])
      for (const theme of ["dark", "light"]) {
        await page.setViewportSize({ width, height: 900 });
        const themeToggle = page.locator("#theme-toggle");
        if ((await page.locator("html").getAttribute("data-theme")) !== theme) {
          await themeToggle.focus();
          assert(
            await themeToggle.evaluate(
              (node) => node === document.activeElement,
            ),
            "The actual theme control owns keyboard focus",
          );
          await page.keyboard.press("Enter");
        }
        await page.waitForFunction(
          (value) => document.documentElement.dataset.theme === value,
          theme,
        );
        assert.equal(
          await themeToggle.getAttribute("aria-label"),
          `Switch to ${theme === "dark" ? "light" : "dark"} theme`,
        );
        assert.equal(
          await themeToggle.textContent(),
          theme === "dark" ? "Light mode" : "Dark mode",
        );
        const baseline = await page
          .locator("body")
          .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
        await assertReflow("normal", width, theme);
        await retainAcrossNavigation();
        if (captureScreenshots)
          await captureDocumentEvidence(
            page,
            `test-results/${engineName}-contributor-${width}-${theme}-normal.png`,
          );
        const zoomStyle = await page.addStyleTag({ url: zoomURL });
        const actual = await page
          .locator("body")
          .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
        assert(actual >= baseline * 1.99, "Actual text size doubles");
        await assertReflow("200", width, theme);
        assert(await page.locator("#import-stage").isVisible());
        await retainAcrossNavigation();
        if (captureScreenshots)
          await captureDocumentEvidence(
            page,
            `test-results/${engineName}-contributor-${width}-${theme}-200.png`,
          );
        await zoomStyle.evaluate((el) => el.remove());
      }
    await context.close();
  } finally {
    await app?.close();
    await rm(root, { recursive: true, force: true });
  }
}
async function main() {
  const engines = await import("playwright");
  for (const name of process.argv.includes("--engines")
    ? ["firefox", "webkit"]
    : ["chrome"]) {
    const browser = await engines[name === "chrome" ? "chromium" : name].launch(
      {
        headless: true,
        ...(name === "chrome"
          ? { channel: "chrome", chromiumSandbox: true }
          : {}),
      },
    );
    const health = monitorBrowser(browser);
    try {
      await runContributorWorkflows({ browser, engineName: name });
      health();
      console.log(`${name}: contributor workflows passed`);
    } finally {
      await browser.close();
    }
  }
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  await main();
