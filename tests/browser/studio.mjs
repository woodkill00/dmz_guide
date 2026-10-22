import assert from "node:assert/strict";
import {
  cp,
  mkdtemp,
  mkdir,
  readFile,
  writeFile,
  rm,
  stat as fsStat,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, join, basename, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import { createServer } from "node:net";
import { createHash } from "node:crypto";
import { createAuthorServer } from "../../scripts/author.mjs";
import { allRecords, recordUrl } from "../../src/ui/render.mjs";
import { serializeCatalog, catalogAssetPath } from "../../scripts/catalog.mjs";
import { GROUPS } from "../../src/content/portable.mjs";
import { monitorBrowser, expectResponseErrors } from "./health.mjs";
import { runRasterEditorTests } from "./raster-editor.mjs";
import { runPageEditTests } from "./page-edit.mjs";

const run = promisify(execFile);
const project = fileURLToPath(new URL("../../", import.meta.url));
const excluded = new Set([
  ".git",
  "node_modules",
  "dist",
  "release",
  "test-results",
  ".author-state",
  ".codex",
  ".agents",
]);

async function unusedPort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}

async function startReader(root) {
  const port = await unusedPort();
  const url = `http://127.0.0.1:${port}`;
  const process = spawn(
    globalThis.process.execPath,
    ["scripts/serve.mjs", "--port", String(port)],
    {
      cwd: root,
      env: { ...globalThis.process.env, PORT: String(port), HOST: "127.0.0.1" },
      stdio: "pipe",
    },
  );
  let output = "";
  const exited = new Promise((resolveExit, reject) => {
    process.once("error", reject);
    process.once("exit", (code, signal) => resolveExit({ code, signal }));
  });
  const close = async () => {
    if (process.exitCode !== null || process.signalCode !== null) return exited;
    process.kill();
    let timer;
    try {
      await Promise.race([
        exited,
        new Promise((_, reject) => {
          timer = setTimeout(
            () => reject(new Error("Reader did not exit after shutdown")),
            10000,
          );
        }),
      ]);
    } finally {
      clearTimeout(timer);
    }
  };
  process.stderr.on("data", (chunk) => {
    output += chunk;
  });
  for (let attempt = 0; attempt < 150; attempt++) {
    if (process.exitCode !== null) throw new Error(`Reader exited: ${output}`);
    try {
      if ((await fetch(url)).ok) return { url, close };
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  await close();
  throw new Error(`Reader did not start: ${output}`);
}

async function prepareMediaScreenshot(page) {
  // Native lazy images must actually enter the viewport before evidence capture.
  // Only mounted cards are visited; this never loads the rest of the catalog.
  for (const image of await page.locator("#media-library img").all()) {
    await image.scrollIntoViewIfNeeded();
    // Firefox can defer selecting a native lazy image's request until after
    // scrolling has completed. decode() rejects when no current request exists;
    // first require real loaded pixels, without hiding broken image requests.
    const element = await image.elementHandle();
    assert(element, "Displayed media image remains mounted");
    try {
      await page.waitForFunction(
        (image) =>
          image.isConnected &&
          image.currentSrc.length > 0 &&
          image.complete &&
          image.naturalWidth > 0 &&
          image.naturalHeight > 0,
        element,
        { timeout: 30000 },
      );
    } finally {
      await element.dispose();
    }
    const decoded = await image.evaluate(async (element) => {
      await element.decode();
      return element.complete && element.naturalWidth > 0;
    });
    assert(decoded, "Every displayed media card has decoded pixels");
  }
  await page.evaluate(() => window.scrollTo(0, 0));
}

async function checkStudioThemes(page, { prefix, captureScreenshots }) {
  const assertTheme = async (theme) => {
    await page.waitForFunction(
      (expected) => document.documentElement.dataset.theme === expected,
      theme,
    );
    assert.equal(
      await page.locator("#theme-toggle").getAttribute("aria-label"),
      `Switch to ${theme === "dark" ? "light" : "dark"} theme`,
    );
    const contrast = await page.locator("#pack-select").evaluate((element) => {
      const style = getComputedStyle(element);
      const luminance = (color) => {
        const rgb = color
          .match(/[\d.]+/g)
          .slice(0, 3)
          .map(Number)
          .map((value) => {
            value /= 255;
            return value <= 0.04045
              ? value / 12.92
              : ((value + 0.055) / 1.055) ** 2.4;
          });
        return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
      };
      const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      const background = luminance(style.backgroundColor);
      return {
        boundary: ratio(luminance(style.borderTopColor), background),
        text: ratio(luminance(style.color), background),
        rootBackground: getComputedStyle(document.documentElement)
          .backgroundColor,
      };
    });
    assert(
      contrast.boundary >= 3,
      `${theme} input boundary contrast: ${contrast.boundary}`,
    );
    assert(
      contrast.text >= 4.5,
      `${theme} input text contrast: ${contrast.text}`,
    );
    return contrast;
  };
  assert.equal(
    await page.evaluate(
      () => matchMedia("(prefers-color-scheme: light)").matches,
    ),
    true,
    "Test OS preference is light",
  );
  const dark = await assertTheme("dark");
  assert.equal(
    await page.evaluate(() => localStorage.getItem("dmz-theme")),
    null,
    "Fresh Studio defaults dark without a stored preference",
  );
  await page.locator("#theme-toggle").focus();
  await page.keyboard.press("Enter");
  const light = await assertTheme("light");
  assert.notEqual(
    light.rootBackground,
    dark.rootBackground,
    "Theme control changes the actual rendered palette",
  );
  assert.equal(
    await page.evaluate(() => localStorage.getItem("dmz-theme")),
    "light",
  );
  await page.reload();
  await page.waitForSelector('[data-path="contentVersion"]');
  await assertTheme("light");
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      `Light Studio reflows at ${width}`,
    );
    if (captureScreenshots) {
      await prepareMediaScreenshot(page);
      await page.screenshot({
        path: `test-results/${prefix}-studio-light-${width}.png`,
        fullPage: true,
      });
    }
  }
  await page.locator("#theme-toggle").focus();
  await page.keyboard.press("Enter");
  await assertTheme("dark");
  await page.reload();
  await page.waitForSelector('[data-path="contentVersion"]');
  await assertTheme("dark");
  assert.deepEqual(
    await page.evaluate(() => Object.keys(localStorage)),
    ["dmz-theme"],
    "Theme persistence creates no private profile or player-state storage",
  );
}

async function captureLayout(page, { base, prefix, captureScreenshots }) {
  const layout = async (width, suffix) => {
    await page.setViewportSize({ width, height: 900 });
    if (captureScreenshots) await prepareMediaScreenshot(page);
    await page.evaluate(() => window.scrollTo(0, 0));
    const diagnostics = await page.evaluate(() => {
      const bounds = (element) => {
        const { left, right, top, bottom, width, height } =
          element.getBoundingClientRect();
        return { left, right, top, bottom, width, height };
      };
      const textBounds = (element) => {
        const range = document.createRange();
        range.selectNodeContents(element);
        return [...range.getClientRects()].map(
          ({ left, right, top, bottom, width, height }) => ({
            left,
            right,
            top,
            bottom,
            width,
            height,
          }),
        );
      };
      const outside = (rect) =>
        rect.width > 0 && (rect.left < -1 || rect.right > innerWidth + 1);
      const visible = [...document.querySelectorAll("body *")].filter(
        (element) => element.getClientRects().length > 0,
      );
      return {
        innerWidth,
        innerHeight,
        scrollY,
        scrollWidth: document.documentElement.scrollWidth,
        rootFontSize: getComputedStyle(document.documentElement).fontSize,
        activeElement:
          document.activeElement?.id || document.activeElement?.className,
        controls: [
          "#pack-select",
          "#preview-content",
          "#export-draft",
          "#picture-file",
          "#media-search",
        ].map((selector) => ({
          selector,
          ...bounds(document.querySelector(selector)),
        })),
        headings: [...document.querySelectorAll("#media-library h3")].map(
          (element) => ({
            text: element.textContent,
            ...bounds(element),
            textRects: textBounds(element),
          }),
        ),
        skipLink: {
          ...bounds(document.querySelector(".skip-link")),
          focused:
            document.activeElement === document.querySelector(".skip-link"),
        },
        offenders: visible
          .filter((element) => outside(bounds(element)))
          .slice(0, 40)
          .map((element) => ({
            tag: element.tagName,
            id: element.id,
            className: element.className,
            text: element.textContent.slice(0, 160),
            ...bounds(element),
          })),
        textOffenders: visible
          .filter(
            (element) =>
              element.childElementCount === 0 &&
              element.textContent.trim() &&
              textBounds(element).some(outside),
          )
          .slice(0, 40)
          .map((element) => ({
            tag: element.tagName,
            id: element.id,
            text: element.textContent.slice(0, 160),
            textRects: textBounds(element),
          })),
      };
    });
    const problems = [];
    if (diagnostics.scrollWidth > width + 1)
      problems.push(`document scrollWidth ${diagnostics.scrollWidth}`);
    for (const control of diagnostics.controls)
      if (!control.width || control.left < -1 || control.right > width + 1)
        problems.push(`${control.selector} exceeds viewport`);
    if (!diagnostics.headings.length)
      problems.push("No media headings were exercised");
    for (const heading of diagnostics.headings)
      if (
        heading.left < -1 ||
        heading.right > width + 1 ||
        heading.textRects.some(
          (rect) =>
            rect.left < heading.left - 1 || rect.right > heading.right + 1,
        )
      )
        problems.push(`Media heading text exceeds its bounds: ${heading.text}`);
    if (diagnostics.skipLink.focused || diagnostics.skipLink.bottom > 0)
      problems.push("Unfocused skip link is not fully above the viewport");
    if (problems.length)
      await writeFile(
        `test-results/${prefix}-studio-${width}-${suffix}-overflow.json`,
        JSON.stringify({ problems, ...diagnostics }, null, 2),
      );
    assert.deepEqual(
      problems,
      [],
      `Studio reflow at ${width} ${suffix}; see overflow diagnostics`,
    );

    // The skip link immediately precedes the theme control in keyboard order.
    await page.locator("#theme-toggle").focus();
    await page.keyboard.press("Shift+Tab");
    const focusedSkip = await page.locator(".skip-link").evaluate((element) => {
      const { left, right, top, bottom } = element.getBoundingClientRect();
      return {
        focused: document.activeElement === element,
        left,
        right,
        top,
        bottom,
        innerWidth,
        innerHeight,
      };
    });
    const skipVisible =
      focusedSkip.focused &&
      focusedSkip.left >= 0 &&
      focusedSkip.right <= width + 1 &&
      focusedSkip.top >= 0 &&
      focusedSkip.bottom <= focusedSkip.innerHeight;
    if (!skipVisible)
      await writeFile(
        `test-results/${prefix}-studio-${width}-${suffix}-skip-link.json`,
        JSON.stringify({ focusedSkip, ...diagnostics }, null, 2),
      );
    assert(skipVisible, `Keyboard-focused skip link fits ${width} ${suffix}`);
    await page.keyboard.press("Tab");
    assert(
      await page
        .locator(".skip-link")
        .evaluate(
          (element) =>
            document.activeElement !== element &&
            element.getBoundingClientRect().bottom <= 0,
        ),
      "Skip link hides completely after keyboard focus leaves",
    );
    if (captureScreenshots)
      await page.screenshot({
        path: `test-results/${prefix}-studio-${width}-${suffix}.png`,
        fullPage: true,
      });
  };
  for (const width of [320, 390, 1280]) await layout(width, "saved");
  const bodyBefore = await page
    .locator("body")
    .evaluate((element) => parseFloat(getComputedStyle(element).fontSize));
  const zoomURL = base + "/__test-studio-text200.css";
  // A same-origin external stylesheet exercises the unchanged style-src 'self' CSP.
  // Only this test resource is fulfilled; application responses are never masked.
  await page.route(zoomURL, (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/css",
      body: ":root{font-size:200%}",
    }),
  );
  const style = await page.addStyleTag({ url: zoomURL });
  assert.equal(
    await page
      .locator("html")
      .evaluate((element) => parseFloat(getComputedStyle(element).fontSize)),
    32,
    "Actual 200% root text, not a scaled screenshot",
  );
  assert.equal(
    await page
      .locator("body")
      .evaluate((element) => parseFloat(getComputedStyle(element).fontSize)),
    bodyBefore * 2,
    "Actual body text doubles",
  );
  for (const width of [320, 390, 1280]) await layout(width, "text200");
  await style.evaluate((element) => element.remove());
  await page.unroute(zoomURL);
}

async function createLargeLibraryFixture(root, template, pixelBytes) {
  const schema = JSON.parse(
    await readFile(join(project, "schemas/pack.schema.json"), "utf8"),
  );
  const key = "synthetic-large-library";
  const pack = {
    ...structuredClone(template),
    id: "studio-large:catalog",
    title: "Synthetic 1,000-picture acceptance library",
    ...Object.fromEntries(GROUPS.map((group) => [group, []])),
  };
  const hash = createHash("sha256").update(pixelBytes).digest("hex");
  const assetSources = {};
  for (let index = 0; index < 1000; index++) {
    const suffix = String(index).padStart(4, "0"),
      id = `studio-large:picture-${suffix}`;
    pack.assets.push({
      ...template.assets[0],
      id,
      path: `assets/synthetic-${suffix}.png`,
      width: 1,
      height: 1,
      bytes: pixelBytes.length,
      sha256: hash,
      attribution: `Original synthetic one-pixel library fixture ${suffix}, not game artwork.`,
    });
    assetSources[id] = {
      sourcePath: catalogAssetPath(key, "other", id, "image/png"),
      category: "other",
    };
  }
  const files = serializeCatalog({
    entries: [{ key, pack, assetSources }],
    schema,
  });
  files.set("schemas/pack.schema.json", Buffer.from(JSON.stringify(schema)));
  for (const source of Object.values(assetSources))
    files.set(source.sourcePath, pixelBytes);
  for (const [path, bytes] of files) {
    await mkdir(dirname(join(root, path)), { recursive: true });
    await writeFile(join(root, path), bytes);
  }
  return { key, pack };
}

/** Tests write only to a temporary repository, never the developer checkout. */
export async function runStudioTests({
  browser,
  captureScreenshots = true,
  engineName = "chromium",
}) {
  const sandbox = await mkdtemp(join(tmpdir(), "dmz-studio-browser-"));
  const repository = join(sandbox, "repository"),
    clone = join(sandbox, "fresh-clone");
  let author, reader, context, activePage;
  let phase = "prepare isolated repository";
  const prefix = engineName.replace(/[^a-z0-9-]/gi, "-");
  const git = (args, cwd = repository) =>
    run(
      "git",
      ["-c", "core.hooksPath=" + join(sandbox, "empty-hooks"), ...args],
      {
        cwd,
        maxBuffer: 2 * 1024 * 1024,
        env: {
          ...process.env,
          GIT_TERMINAL_PROMPT: "0",
          GIT_CONFIG_NOSYSTEM: "1",
        },
      },
    );
  try {
    await mkdir("test-results", { recursive: true });
    await mkdir(join(sandbox, "empty-hooks"));
    await cp(project, repository, {
      recursive: true,
      filter: (path) =>
        !excluded.has(basename(path)) && !basename(path).startsWith(".env"),
    });
    await git(["init", "-b", "main"]);
    await git(["add", "."]);
    const commit = (message) =>
      git([
        "-c",
        "user.name=DMZ browser fixture",
        "-c",
        "user.email=fixture@example.invalid",
        "-c",
        "commit.gpgSign=false",
        "commit",
        "-m",
        message,
      ]);
    await commit("Synthetic acceptance baseline");
    const initialHead = (await git(["rev-parse", "HEAD"])).stdout.trim();
    await writeFile(
      join(repository, "private-acceptance-only.txt"),
      "Synthetic unrelated file. Never show in managed change review.\n",
    );
    author = await createAuthorServer({ root: repository, port: 0 });
    await runPageEditTests({
      browser,
      repository,
      author,
      prefix,
      captureScreenshots,
      startReader,
    });
    context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      colorScheme: "light",
    });
    const page = await context.newPage();
    activePage = page;
    phase = "guided catalog and sourced typed records";
    const field = (path) => page.locator(`[data-path="${path}"]`);
    const section = async (group, index) => {
      await page.selectOption("#editor-section", group);
      if (index !== undefined)
        await page.selectOption("#editor-record", String(index));
    };
    const add = async (group, name) => {
      await section(group);
      await page.fill("#new-record-name", name);
      await page.click("#add-record");
      return Number(await page.locator("#editor-record").inputValue());
    };
    const reference = async (path, query, id) => {
      await page.locator(`[data-ref-search="${path}"]`).fill(query);
      const picker = page.locator(`[data-ref-picker="${path}"]`);
      assert((await picker.locator("option").count()) <= 51);
      await picker.selectOption(id);
      assert.equal(await field(path).inputValue(), id);
    };
    const snapshot = async () => {
      const response = await fetch(author.url + "/api/catalog");
      assert.equal(response.status, 200);
      return response.json();
    };
    const preview = async () => {
      await page.click("#preview-content");
      await page.waitForSelector("#content-stage:not([hidden])");
    };
    const save = async () => {
      const response = page.waitForResponse(
        (response) =>
          response.url().endsWith("/api/save") &&
          response.request().method() === "POST",
      );
      await page.click("#save-repository");
      const result = await response;
      const data = await result.json();
      assert.equal(result.status(), 200, JSON.stringify(data));
      assert.equal(data.ok, true);
      await page.waitForFunction(
        () => !document.querySelector("#save-repository")?.disabled,
      );
      return data;
    };
    // Establish a real preceding document for the dirty browser-back test.
    const historyEntry = (await snapshot()).entries.find(
      (candidate) => allRecords([candidate.pack]).length > 0,
    );
    assert(historyEntry, "A saved record establishes real navigation history");
    const historyUrl = new URL("/preview", author.url);
    historyUrl.searchParams.set("packKey", historyEntry.key);
    historyUrl.searchParams.set("id", allRecords([historyEntry.pack])[0].id);
    const historyResponse = await page.goto(historyUrl.href);
    assert.equal(historyResponse.status(), 200);
    await page.goto(author.url);
    await page.waitForSelector('[data-path="contentVersion"]');
    phase = "dark-default palette and accessible persistent light toggle";
    await checkStudioThemes(page, { prefix, captureScreenshots });
    phase = "guided catalog and sourced typed records";
    await page.locator("#new-catalog-panel summary").first().click();
    await page.fill("#new-catalog-title", "Studio Acceptance Fixture");
    await page.fill("#new-catalog-game", "fictional-training");
    await page.fill("#new-catalog-mode", "demo");
    await page.fill("#new-catalog-build", "test-only-v1");
    await page.fill("#new-catalog-version", "studio-1");
    await page.check("#new-catalog-fictional");
    await page.click("#create-catalog");
    const packId = await field("id").inputValue();
    assert.match(packId, /^[a-z][a-z0-9-]*:[a-z0-9][a-z0-9-]*$/);

    const sourceIndex = await add("sources", "Original Studio test evidence");
    const sourceId = await field(`sources.${sourceIndex}.id`).inputValue();
    await field(`sources.${sourceIndex}.url`).fill(
      "https://example.com/original-studio-fixture",
    );
    await field(`sources.${sourceIndex}.type`).selectOption("original-fixture");
    await field(`sources.${sourceIndex}.publishedAt`).fill("2026-10-21");
    await field(`sources.${sourceIndex}.reviewedAt`).fill("2026-10-21");
    await field(`sources.${sourceIndex}.supports`).fill(
      "Original fictional software test, not gameplay facts.",
    );
    const itemIndex = await add("items", "Studio Alloy Part");
    const itemId = await field(`items.${itemIndex}.id`).inputValue();
    await field(`items.${itemIndex}.category`).fill("fictional-resource");
    await field(`items.${itemIndex}.kind`).selectOption("resource");
    await field(`items.${itemIndex}.unit`).selectOption("resource-unit");
    const weaponIndex = await add("items", "Studio Test Rifle");
    const weaponId = await field(`items.${weaponIndex}.id`).inputValue();
    await field(`items.${weaponIndex}.kind`).selectOption("weapon");
    await field(`items.${weaponIndex}.category`).fill("fictional-weapon");
    await page
      .getByRole("button", { name: "Add Stats entry", exact: true })
      .click();
    const stat = `items.${weaponIndex}.stats.0`;
    await field(stat + ".label").fill("Original fixture reload time");
    await field(stat + ".metric").selectOption("reload-time");
    await field(stat + ".unit").selectOption("ms");
    await field(stat + ".value.type").selectOption("0");
    await field(stat + ".value").fill("17.5");
    await field(stat + ".status").selectOption("fictional");
    await field(stat + ".context.method").fill(
      "Synthetic acceptance fixture, not measured gameplay.",
    );
    await field(stat + ".reviewedAt").fill("2026-10-21");
    await page
      .getByRole("button", { name: "Add Source Ids entry", exact: true })
      .last()
      .click();
    await reference(stat + ".sourceIds.0", "Original Studio", sourceId);

    const original = await page.evaluate(() => {
      const canvas = document.createElement("canvas");
      canvas.width = 1024;
      canvas.height = 768;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#e4c16d";
      ctx.fillRect(0, 0, 512, 768);
      ctx.fillStyle = "#99cc66";
      ctx.fillRect(512, 0, 512, 768);
      return canvas.toDataURL("image/png").split(",")[1];
    });
    await page.setInputFiles("#picture-file", {
      name: "original-fixture.png",
      mimeType: "image/png",
      buffer: Buffer.from(original, "base64"),
    });
    await page.waitForSelector("#picture-workbench:not([hidden])");
    await page.fill("#crop-x", "0");
    await page.fill("#crop-y", "0");
    await page.fill("#crop-width", "512");
    await page.fill("#crop-height", "512");
    await page.fill("#picture-max", "384");
    await page.click("#apply-crop");
    await page.waitForFunction(() => {
      const image = document.querySelector("#picture-working");
      return (
        image?.complete &&
        image.naturalWidth === 384 &&
        image.naturalHeight === 384
      );
    });
    await page.fill("#picture-holder", "Original software fixture");
    await page.fill("#picture-license", "CC0-1.0");
    await page.fill(
      "#picture-source",
      "https://example.com/original-studio-fixture",
    );
    await page.fill(
      "#picture-attribution",
      "Original generated test pixels, not game art.",
    );
    await page.check("#picture-rights");
    await page.check("#picture-private");
    await page.check("#picture-thumbnail");
    await page.selectOption("#picture-attachment", "primary");
    const pictureId = await page.locator("#picture-id").inputValue();
    await page.click("#attach-picture");
    await page.waitForSelector(`#media-library [data-asset-id="${pictureId}"]`);
    const assertWorkbenchCleared = async () => {
      for (const selector of ["#picture-original", "#picture-working"])
        assert.equal(
          await page.locator(selector).getAttribute("src"),
          null,
          "Canceled or attached workbench images release their old source",
        );
    };
    await assertWorkbenchCleared();
    const uploadedImage = page.locator(
      `#media-library [data-asset-id="${pictureId}"] img`,
    );
    const uploadPreviewUrl = await uploadedImage.getAttribute("src");
    assert.match(uploadPreviewUrl, /^blob:/);
    for (let repeat = 0; repeat < 3; repeat++) {
      await section("metadata");
      await field("description").fill(
        "Original synthetic Studio acceptance catalog.",
      );
      await section("items", weaponIndex);
      assert.equal(
        await uploadedImage.getAttribute("src"),
        uploadPreviewUrl,
        "Ordinary metadata and section renders retain the pending upload URL",
      );
    }
    await uploadedImage.scrollIntoViewIfNeeded();
    await uploadedImage.evaluate((image) => image.decode());

    phase = "additional pictures, duplicate reuse and where-used removal";
    const preparePicture = async (x, name, attachment) => {
      await page.setInputFiles("#picture-file", {
        name,
        mimeType: "image/png",
        buffer: Buffer.from(original, "base64"),
      });
      await page.waitForSelector("#picture-workbench:not([hidden])");
      await page.fill("#crop-x", String(x));
      await page.fill("#crop-y", "0");
      await page.fill("#crop-width", "512");
      await page.fill("#crop-height", "512");
      await page.fill("#picture-max", "384");
      await page.click("#apply-crop");
      await page.waitForFunction(() =>
        document
          .querySelector("#picture-size")
          ?.textContent.includes("draft 384 × 384"),
      );
      await page.fill("#picture-holder", "Original software fixture");
      await page.fill("#picture-license", "CC0-1.0");
      await page.fill(
        "#picture-source",
        "https://example.com/original-studio-fixture",
      );
      await page.fill(
        "#picture-attribution",
        "Original generated test pixels, not game art.",
      );
      await page.check("#picture-rights");
      await page.check("#picture-private");
      await page.selectOption("#picture-attachment", attachment);
      return page.locator("#picture-id").inputValue();
    };
    const additionalId = await preparePicture(
      512,
      "original-green-fixture.png",
      "additional",
    );
    await page.click("#attach-picture");
    await page.waitForSelector(
      `#media-library [data-asset-id="${additionalId}"]`,
    );
    assert.equal(
      await page.locator("#media-library .media-card").count(),
      3,
      "Primary, thumbnail and additional image are distinct assets",
    );
    assert.match(
      await page.locator("#picture-target").textContent(),
      new RegExp(additionalId),
    );
    await section("items", itemIndex);
    await preparePicture(0, "same-gold-pixels.png", "primary");
    await page.click("#attach-picture");
    await page.waitForSelector("#duplicate-stage:not([hidden])");
    assert.match(
      await page.locator("#duplicate-note").textContent(),
      new RegExp(pictureId),
    );
    assert.equal(
      await page.locator("#media-library .media-card").count(),
      3,
      "Duplicate requires an explicit reuse decision",
    );
    await page.click("#reuse-picture");
    await page.waitForSelector("#picture-workbench", { state: "hidden" });
    assert.equal(
      await page.locator("#media-library .media-card").count(),
      3,
      "Reuse adds no duplicate metadata or payload",
    );
    assert.match(
      await page.locator("#picture-target").textContent(),
      new RegExp(`Primary: ${pictureId}`),
    );
    const primaryCard = page.locator(`[data-asset-id="${pictureId}"]`);
    await primaryCard
      .locator('[data-media-action="where-used"] summary')
      .click();
    assert.match(
      await primaryCard
        .locator('[data-media-action="where-used"]')
        .textContent(),
      /Studio Alloy Part/,
    );
    assert.match(
      await primaryCard
        .locator('[data-media-action="where-used"]')
        .textContent(),
      /Studio Test Rifle/,
    );
    await primaryCard.locator('[data-media-action="remove"]').click();
    assert.equal(await page.locator("#confirm-remove").isDisabled(), true);
    assert.match(
      await page.locator("#remove-summary").textContent(),
      /Removal blocked/,
    );
    assert.match(
      await page.locator("#remove-usage").textContent(),
      /thumbnail parent relationship/,
    );
    await page.click("#cancel-remove");
    await preparePicture(512, "cancel-picture.png", "library");
    await page.click("#cancel-picture");
    await assertWorkbenchCleared();
    let previousWorkbenchUrl;
    for (let repeat = 0; repeat < 2; repeat++) {
      await page.setInputFiles("#picture-file", {
        name: "rapid-reselect.png",
        mimeType: "image/png",
        buffer: Buffer.from(original, "base64"),
      });
      await page.waitForSelector("#picture-workbench:not([hidden])");
      const current = await page
        .locator("#picture-working")
        .getAttribute("src");
      assert.match(current, /^blob:/);
      assert.notEqual(current, previousWorkbenchUrl);
      previousWorkbenchUrl = current;
      await page.click("#cancel-picture");
      await assertWorkbenchCleared();
      assert.equal(await uploadedImage.getAttribute("src"), uploadPreviewUrl);
    }
    assert.equal(
      await page.locator("#media-library .media-card").count(),
      3,
      "Canceling a prepared picture retains the existing draft",
    );

    const recipeIndex = await add("recipes", "Assemble Studio Rifle");
    const recipeId = await field(`recipes.${recipeIndex}.id`).inputValue();
    await reference(
      `recipes.${recipeIndex}.output.itemId`,
      "Studio Test Rifle",
      weaponId,
    );
    await field(`recipes.${recipeIndex}.station`).fill(
      "Fictional studio bench",
    );
    await field(`recipes.${recipeIndex}.ingredientsKnown`).check();
    await field(`recipes.${recipeIndex}.eligibility`).selectOption("stash");
    await page
      .getByRole("button", { name: "Add Inputs entry", exact: true })
      .click();
    await reference(
      `recipes.${recipeIndex}.inputs.0.itemId`,
      "Studio Alloy",
      itemId,
    );
    await field(`recipes.${recipeIndex}.inputs.0.quantity`).fill("2");
    await field(`recipes.${recipeIndex}.inputs.0.consumed`).check();
    await section("items", itemIndex);
    await page.click("#remove-record");
    assert.equal(await page.locator("#confirm-remove").isDisabled(), true);
    assert.match(
      await page.locator("#remove-usage").textContent(),
      /Assemble Studio Rifle/,
    );
    await page.click("#cancel-remove");
    await section("recipes", recipeIndex);
    phase = "validated repository save and unchanged Git HEAD";
    const before = await snapshot();
    assert(
      !before.entries.some((entry) => entry.pack.id === packId),
      "Draft does not write before explicit Save",
    );
    await preview();
    await page.click("#cancel-content");
    assert.equal(
      (await snapshot()).revision,
      before.revision,
      "Cancel preview never writes",
    );
    await preview();
    const saved = await save();
    assert(
      saved.paths.some(
        (path) =>
          path.startsWith("content/catalog/") && path.includes("/weapons/"),
      ),
    );
    assert(
      saved.paths.some(
        (path) => path.startsWith("media/") && path.endsWith(".png"),
      ),
    );
    assert.equal(
      (await git(["rev-parse", "HEAD"])).stdout.trim(),
      initialHead,
      "Studio never commits",
    );
    let entry = (await snapshot()).entries.find(
      (entry) => entry.pack.id === packId,
    );
    assert(entry);
    assert.match(
      await page.locator("#saved-paths").textContent(),
      /content\/catalog\//,
    );
    await page.waitForFunction(() =>
      document.querySelector("#changes-note")?.textContent.includes("summary"),
    );
    assert(
      !(await page.locator("#file-changes").textContent()).includes(
        "private-acceptance-only",
      ),
      "Managed change review excludes unrelated files",
    );
    const weapon = entry.pack.items.find((item) => item.id === weaponId);
    assert.equal(weapon.stats[0].value, 17.5);
    assert.equal(weapon.stats[0].metric, "reload-time");
    assert.equal(weapon.stats[0].unit, "ms");
    assert.deepEqual(weapon.stats[0].sourceIds, [sourceId]);
    assert.equal(weapon.assetId, pictureId);
    assert.deepEqual(weapon.assetIds, [additionalId]);
    assert.equal(
      entry.pack.items.find((item) => item.id === itemId).assetId,
      pictureId,
    );
    const thumbnail = entry.pack.assets.find(
      (asset) => entry.assetSources[asset.id]?.variant === "thumbnail",
    );
    assert(
      thumbnail,
      "A separate thumbnail has source-only derivative metadata",
    );
    assert.equal(thumbnail.width, 256);
    assert.equal(thumbnail.height, 256);
    assert.equal(entry.assetSources[thumbnail.id].parentAssetId, pictureId);
    assert.equal(
      entry.pack.recipes.find((recipe) => recipe.id === recipeId).inputs[0]
        .itemId,
      itemId,
    );
    assert(
      entry.pack.assets.length >= 2,
      "Primary and separate thumbnail persist",
    );
    const asset = entry.pack.assets.find((asset) => asset.id === pictureId);
    assert.equal(asset.width, 384);
    assert.equal(asset.height, 384);
    for (const path of saved.paths.filter((path) => path.endsWith(".json"))) {
      const text = await readFile(join(repository, path), "utf8");
      assert(
        !text.includes("data:image/") && !text.includes('"base64"'),
        "Canonical JSON has no encoded image bytes",
      );
    }
    phase = "saved record preview without a build";
    await section("items", weaponIndex);
    await page.waitForSelector("#saved-preview:not([hidden])");
    const savedPreviewURL = await page
      .locator("#saved-preview")
      .getAttribute("href");
    assert(savedPreviewURL?.includes("/preview?"));
    const openedPreview = context.waitForEvent("page");
    await page.click("#saved-preview");
    const savedPreview = await openedPreview;
    await savedPreview.waitForLoadState("domcontentloaded");
    assert.match(
      await savedPreview.locator("h1").textContent(),
      /Studio Test Rifle/,
    );
    assert.match(
      await savedPreview.locator("main").textContent(),
      /17\.5\s+ms/,
    );
    await savedPreview
      .locator("main img")
      .first()
      .evaluate(async (image) => {
        await image.decode();
        if (image.naturalWidth !== 384)
          throw new Error("Saved preview image width mismatch");
      });
    await savedPreview.close();
    await assert.rejects(
      fsStat(join(repository, "dist")),
      { code: "ENOENT" },
      "Saved preview does not build or write dist",
    );
    phase = "repeat-save and import preview/apply/cancel";
    const savedRevision = (await snapshot()).revision;
    await preview();
    const repeated = await save();
    assert.equal(
      repeated.revision,
      savedRevision,
      "A safe unchanged repeat-save is idempotent",
    );
    assert.equal((await git(["rev-parse", "HEAD"])).stdout.trim(), initialHead);
    const exportDraft = async (targetPage = page) => {
      const download = targetPage.waitForEvent("download");
      await targetPage.click("#export-draft");
      const file = await download;
      return JSON.parse(await readFile(await file.path(), "utf8"));
    };
    const imported = structuredClone(entry.pack);
    imported.title = "Imported original studio fixture";
    imported.contentVersion = "studio-import-2";
    const uploadImport = async () => {
      await page.selectOption("#import-destination", "existing");
      await page.setInputFiles("#import-content", {
        name: "portable-studio.json",
        mimeType: "application/json",
        buffer: Buffer.from(JSON.stringify(imported)),
      });
      await page.waitForSelector("#import-stage:not([hidden])");
      assert.match(
        await page.locator("#import-summary").textContent(),
        /Imported original studio fixture/,
      );
    };
    await uploadImport();
    assert.deepEqual(
      (await exportDraft()).pack,
      entry.pack,
      "Import preview does not replace the draft",
    );
    await page.click("#cancel-import");
    assert.deepEqual(
      (await exportDraft()).pack,
      entry.pack,
      "Cancel import preserves the draft",
    );
    assert.equal(
      (await snapshot()).revision,
      savedRevision,
      "Cancel import never writes source",
    );
    await uploadImport();
    await page.check("#import-rights");
    await page.click("#apply-import");
    assert.deepEqual(
      (await exportDraft()).pack,
      imported,
      "Explicit apply replaces only the draft",
    );
    assert.equal(
      (await snapshot()).revision,
      savedRevision,
      "Applied import still requires an explicit save",
    );
    const unchangedPreview = await context.newPage();
    await unchangedPreview.goto(new URL(savedPreviewURL, author.url).href);
    assert.match(
      await unchangedPreview.locator("main").textContent(),
      /Studio Test Rifle/,
    );
    assert.match(
      await unchangedPreview.locator("body").textContent(),
      /Content version: studio-1\./,
      "An applied but unsaved import cannot change the saved preview",
    );
    await unchangedPreview.close();

    phase = "dirty catalog switch and actual browser back navigation";
    const key = entry.key;
    const anotherKey = (await snapshot()).entries.find(
      (candidate) => candidate.key !== key,
    ).key;
    const switchDialog = page.waitForEvent("dialog");
    const switchAction = page.selectOption("#pack-select", anotherKey);
    const warning = await switchDialog;
    assert.equal(warning.type(), "confirm");
    assert.match(warning.message(), /Discard the unsaved draft/);
    await warning.dismiss();
    await switchAction;
    assert.equal(await page.locator("#pack-select").inputValue(), key);
    assert.deepEqual(
      (await exportDraft()).pack,
      imported,
      "Canceling a catalog switch retains imported edits",
    );
    const backDialog = page.waitForEvent("dialog");
    const backAction = page
      .goBack({ waitUntil: "domcontentloaded" })
      .catch((error) => {
        assert.match(
          error.message,
          /aborted|interrupted|NS_BINDING_ABORTED|net::ERR_ABORTED|Navigation/i,
        );
      });
    const backWarning = await backDialog;
    assert.equal(
      backWarning.type(),
      "beforeunload",
      "Browser back warns on real unsaved document navigation",
    );
    await backWarning.dismiss();
    await backAction;
    assert.equal(page.url(), author.url + "/");
    assert.deepEqual(
      (await exportDraft()).pack,
      imported,
      "Canceled browser back retains the full draft",
    );
    assert.equal((await snapshot()).revision, savedRevision);
    const discardDialog = page.waitForEvent("dialog");
    const discardAction = page.click("#discard-draft");
    await (await discardDialog).accept();
    await discardAction;
    assert.deepEqual((await exportDraft()).pack, entry.pack);

    phase = "explicitly save applied portable import to one canonical catalog";
    await uploadImport();
    await page.check("#import-rights");
    await page.click("#apply-import");
    await preview();
    const importedSave = await save();
    entry = importedSave.entry;
    assert.equal(entry.pack.contentVersion, imported.contentVersion);
    assert.deepEqual(entry.pack, imported);
    assert.equal(
      (await snapshot()).entries.filter(
        (candidate) => candidate.pack.id === packId,
      ).length,
      1,
      "Saving an imported replacement does not create a second editable catalog",
    );
    assert.equal(
      (await git(["rev-parse", "HEAD"])).stdout.trim(),
      initialHead,
      "Import save never commits",
    );

    phase = "desktop, mobile and actual 200 percent text reflow";
    await section("metadata");
    await captureLayout(page, { base: author.url, prefix, captureScreenshots });
    await context.close();
    context = null;
    await author.close();
    author = await createAuthorServer({ root: repository, port: 0 });
    assert.deepEqual(
      (await snapshot()).entries.find((entry) => entry.pack.id === packId).pack,
      entry.pack,
      "Restart reads source, not browser storage",
    );
    phase = "genuine stale-save conflict and draft recovery export";
    context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    const verifyConflict = expectResponseErrors(context, {
      label: "Studio stale-save conflict",
      method: "POST",
      url: author.url + "/api/save",
      status: 409,
      count: 1,
    });
    const stalePage = await context.newPage();
    activePage = stalePage;
    const initialChanges = stalePage.waitForResponse(
      (response) => new URL(response.url()).pathname === "/api/changes",
    );
    await stalePage.goto(author.url);
    const initialChangeResult = await initialChanges;
    assert.equal(initialChangeResult.status(), 200);
    await initialChangeResult.finished();
    await stalePage.waitForSelector('[data-path="contentVersion"]');
    await stalePage.selectOption("#pack-select", entry.key);
    await stalePage
      .locator('[data-path="contentVersion"]')
      .fill("studio-unsaved-conflict");
    await stalePage
      .locator('[data-path="description"]')
      .fill("Recover this local draft, not the external edit.");
    await stalePage.click("#preview-content");
    await stalePage.waitForSelector("#content-stage:not([hidden])");
    const headerPath = join(
      repository,
      "content/catalog",
      entry.key,
      "pack.json",
    );
    const originalHeader = await readFile(headerPath);
    try {
      const external = JSON.parse(originalHeader);
      external.pack.description = "Independent external repository edit.";
      external.pack.contentVersion = "studio-external-change";
      await writeFile(headerPath, JSON.stringify(external, null, 2) + "\n");
      const externallyChanged = await snapshot();
      const response = stalePage.waitForResponse(
        (response) =>
          response.url() === author.url + "/api/save" &&
          response.request().method() === "POST",
      );
      await stalePage.click("#save-repository");
      const conflict = await response;
      assert.equal(conflict.status(), 409);
      assert.equal((await conflict.json()).code, "STALE_REVISION");
      await stalePage.waitForSelector("#error:not([hidden])");
      assert.match(
        await stalePage.locator("#error").textContent(),
        /STALE_REVISION/,
      );
      assert.equal(
        await stalePage
          .locator("#error")
          .evaluate((element) => document.activeElement === element),
        true,
        "Conflict summary receives keyboard focus",
      );
      const recovery = await exportDraft(stalePage);
      assert.equal(recovery.format, "dmz-repository-draft-recovery");
      assert.equal(recovery.pack.contentVersion, "studio-unsaved-conflict");
      assert.equal(
        recovery.pack.description,
        "Recover this local draft, not the external edit.",
      );
      assert.deepEqual(
        recovery.pack.items,
        entry.pack.items,
        "Conflict export retains typed facts and picture references",
      );
      assert.equal(
        (await snapshot()).revision,
        externallyChanged.revision,
        "Stale save never overwrites the external edit",
      );
      if (captureScreenshots) {
        await prepareMediaScreenshot(stalePage);
        await stalePage.screenshot({
          path: `test-results/${prefix}-studio-conflict-390.png`,
          fullPage: true,
        });
      }
      const cancelReload = stalePage.waitForEvent("dialog");
      const reloadAction = stalePage.click("#reload-repository");
      assert.match((await cancelReload).message(), /discard this draft/i);
      await (await cancelReload).dismiss();
      await reloadAction;
      assert.equal(
        (await exportDraft(stalePage)).pack.contentVersion,
        "studio-unsaved-conflict",
      );
      const acceptReload = stalePage.waitForEvent("dialog");
      const acceptedReload = stalePage.click("#reload-repository");
      await (await acceptReload).accept();
      await acceptedReload;
      await stalePage.waitForFunction(
        () =>
          document.querySelector('[data-path="contentVersion"]')?.value ===
          "studio-external-change",
      );
      assert.equal(
        (await exportDraft(stalePage)).pack.description,
        "Independent external repository edit.",
      );
      verifyConflict();
    } finally {
      await context.close();
      context = null;
      // Only the synthetic concurrent edit is restored, not an application write.
      await writeFile(headerPath, originalHeader);
    }
    await runRasterEditorTests({ browser, base: author.url });
    await author.close();
    author = null;

    phase = "fresh isolated Git clone and public rendering";
    await git(["add", "content/catalog", "media"]);
    await commit("Synthetic pictured weapon authored through real UI");
    await git(["clone", "--no-local", repository, clone], sandbox);
    await run(process.execPath, ["scripts/build.mjs"], {
      cwd: clone,
      maxBuffer: 4 * 1024 * 1024,
    });
    reader = await startReader(clone);
    context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    const publicPage = await context.newPage();
    activePage = publicPage;
    const record = allRecords([entry.pack]).find(
      (record) => record.id === weaponId,
    );
    await publicPage.goto(reader.url + recordUrl(record));
    assert.match(
      await publicPage.locator("h1").textContent(),
      /Studio Test Rifle/,
    );
    assert.match(
      await publicPage.locator(".stat-row").textContent(),
      /17\.5\s+ms/,
    );
    assert.match(
      await publicPage.locator(".stat-row").textContent(),
      /Original Studio test evidence/,
    );
    await publicPage.locator("main img").first().waitFor();
    const pixels = await publicPage
      .locator("main img")
      .first()
      .evaluate(async (image) => {
        await image.decode();
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 1;
        canvas.getContext("2d").drawImage(image, 0, 0, 1, 1);
        return {
          width: image.naturalWidth,
          height: image.naturalHeight,
          pixel: [...canvas.getContext("2d").getImageData(0, 0, 1, 1).data],
        };
      });
    assert.equal(pixels.width, 384);
    assert.equal(pixels.height, 384);
    assert.deepEqual(
      pixels.pixel,
      [228, 193, 109, 255],
      "Actual cropped pixels survive fresh clone and rebuild",
    );
    const publicPictures = publicPage.locator("main img[data-public-image]");
    assert.equal(
      await publicPictures.count(),
      2,
      "Fresh-clone record includes the additional picture gallery",
    );
    assert.equal(await publicPictures.nth(1).getAttribute("loading"), "lazy");
    await publicPictures.nth(1).scrollIntoViewIfNeeded();
    const additionalPixel = await publicPictures
      .nth(1)
      .evaluate(async (image) => {
        await image.decode();
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 1;
        const drawing = canvas.getContext("2d");
        drawing.drawImage(image, 0, 0, 1, 1);
        return [...drawing.getImageData(0, 0, 1, 1).data];
      });
    assert.deepEqual(
      additionalPixel,
      [153, 204, 102, 255],
      "Additional picture pixels survive fresh clone and build",
    );
    const readOnlyBefore = (await git(["status", "--porcelain"], clone)).stdout;
    const denied = await fetch(reader.url + "/api/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    assert.equal(denied.status, 405, "Normal public server stays read-only");
    assert.equal(
      (await git(["status", "--porcelain"], clone)).stdout,
      readOnlyBefore,
      "Public write attempt changes no repository files",
    );
    if (captureScreenshots)
      await publicPage.screenshot({
        path: `test-results/${prefix}-studio-fresh-clone-weapon-390.png`,
        fullPage: true,
      });
    const onePixel = Buffer.from(
      await publicPage.evaluate(() => {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 1;
        const drawing = canvas.getContext("2d");
        drawing.fillStyle = "#e4c16d";
        drawing.fillRect(0, 0, 1, 1);
        return canvas.toDataURL("image/png").split(",")[1];
      }),
      "base64",
    );
    await context.close();
    context = null;
    await reader.close();
    reader = null;

    phase = "1,000-picture metadata and bounded lazy library paging";
    const largeRoot = join(sandbox, "large-library");
    await createLargeLibraryFixture(largeRoot, entry.pack, onePixel);
    author = await createAuthorServer({ root: largeRoot, port: 0 });
    context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
    });
    context.setDefaultTimeout(60000);
    const libraryPage = await context.newPage();
    activePage = libraryPage;
    const mediaRequests = [];
    libraryPage.on("request", (request) => {
      if (new URL(request.url()).pathname === "/api/media")
        mediaRequests.push(request.url());
    });
    const catalogResponse = libraryPage.waitForResponse(
      (response) => response.url() === author.url + "/api/catalog",
    );
    await libraryPage.goto(author.url);
    const metadata = await (await catalogResponse).json();
    assert.equal(metadata.entries[0].pack.assets.length, 1000);
    assert(
      !JSON.stringify(metadata).includes("base64") &&
        !JSON.stringify(metadata).includes("data:image/"),
      "Opening 1,000 assets transfers metadata, not inline image payloads",
    );
    await libraryPage.waitForSelector(
      '#media-library [data-asset-id="studio-large:picture-0000"]',
    );
    await libraryPage.waitForLoadState("networkidle");
    assert.equal(
      await libraryPage.locator("#media-library .media-card").count(),
      24,
    );
    assert.equal(
      await libraryPage
        .locator('#media-library img:not([loading="lazy"])')
        .count(),
      0,
    );
    assert(
      mediaRequests.length <= 24,
      `Opening the library requested ${mediaRequests.length} pictures, not a bounded first page`,
    );
    await libraryPage.click("#media-next");
    await libraryPage.waitForSelector(
      '#media-library [data-asset-id="studio-large:picture-0024"]',
    );
    await libraryPage.waitForLoadState("networkidle");
    assert.equal(
      await libraryPage.locator("#media-library .media-card").count(),
      24,
    );
    assert.equal(
      await libraryPage
        .locator('[data-asset-id="studio-large:picture-0000"]')
        .count(),
      0,
      "Previous page entries leave the DOM",
    );
    const firstTwoPages = new Set(
      Array.from(
        { length: 48 },
        (_, index) => `studio-large:picture-${String(index).padStart(4, "0")}`,
      ),
    );
    assert(
      mediaRequests.length <= 48 &&
        mediaRequests.every((url) =>
          firstTwoPages.has(new URL(url).searchParams.get("assetId")),
        ),
      "Only displayed library pages request image payloads",
    );
    await libraryPage.fill("#media-search", "picture-0999");
    await libraryPage.waitForSelector(
      '#media-library [data-asset-id="studio-large:picture-0999"]',
    );
    assert.equal(
      await libraryPage.locator("#media-library .media-card").count(),
      1,
    );
    assert.match(
      await libraryPage.locator("#media-count").textContent(),
      /1 pictures/,
    );
    await libraryPage.locator("#media-library img").scrollIntoViewIfNeeded();
    await libraryPage.locator("#media-library img").evaluate(async (image) => {
      await image.decode();
      if (image.naturalWidth !== 1)
        throw new Error(
          "Large-library preview did not load its actual one-pixel asset",
        );
    });
    assert(
      mediaRequests.length <= 49,
      "Searching the final asset does not fetch the other 951 payloads",
    );
    if (captureScreenshots) {
      await prepareMediaScreenshot(libraryPage);
      await libraryPage.screenshot({
        path: `test-results/${prefix}-studio-large-library-search.png`,
        fullPage: true,
      });
    }
    console.log(
      `${engineName}: Studio guided records, sourced units, crop/thumbnail/additional pixels, duplicate reuse, blocked removal, import/cancel/back, real stale conflict/export, saved preview, repeat-save, restart/fresh Git clone, read-only serving, 1,000-asset paging and mobile/200% reflow passed.`,
    );
  } catch (error) {
    const details = {
      phase,
      message: error.message,
      stack: error.stack,
      browserState: await activePage
        ?.evaluate(() => ({
          url: location.href,
          status: document.querySelector("#save-status")?.textContent,
          error: document.querySelector("#error")?.textContent,
          activeElement: document.activeElement?.id,
          viewport: { width: innerWidth, height: innerHeight },
          scrollWidth: document.documentElement.scrollWidth,
        }))
        .catch(() => null),
    };
    await writeFile(
      `test-results/${prefix}-studio-failure.json`,
      JSON.stringify(details, null, 2),
    );
    if (captureScreenshots && activePage && !activePage.isClosed())
      await activePage
        .screenshot({
          path: `test-results/${prefix}-studio-failure.png`,
          fullPage: true,
        })
        .catch(() => {});
    throw new Error(
      `Studio acceptance failed during ${phase}: ${error.message}`,
      { cause: error },
    );
  } finally {
    await context?.close();
    await author?.close();
    await reader?.close();
    await rm(sandbox, {
      recursive: true,
      force: true,
      maxRetries: 5,
      retryDelay: 100,
    });
  }
}

async function main() {
  const args = process.argv.slice(2);
  assert(
    args.length === 0 || (args.length === 1 && args[0] === "--engines"),
    "Usage: npm run test:studio -- [--engines]",
  );
  const { chromium, firefox, webkit } = await import("playwright");
  const engines = args.includes("--engines")
    ? { firefox, webkit }
    : { chrome: chromium };
  for (const [engineName, engine] of Object.entries(engines)) {
    const browser = await engine.launch({
      headless: true,
      ...(engineName === "chrome"
        ? { channel: "chrome", chromiumSandbox: true }
        : {}),
    });
    const health = monitorBrowser(browser);
    try {
      await runStudioTests({
        browser,
        engineName,
        captureScreenshots: engineName !== "webkit",
      });
      health();
    } catch (error) {
      await mkdir("test-results", { recursive: true });
      await writeFile(
        `test-results/${engineName}-studio-health.json`,
        JSON.stringify(
          {
            message: error.message,
            stack: error.stack,
            ...(await health.diagnostics()),
          },
          null,
          2,
        ),
      );
      throw error;
    } finally {
      await browser.close();
    }
  }
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
