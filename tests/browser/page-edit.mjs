import { observeBrowserAction } from "./action-observers.mjs";
import assert from "node:assert/strict";
import {
  cp,
  mkdtemp,
  mkdir,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { allRecords, recordUrl } from "../../src/ui/render.mjs";
import { guidancePath } from "../../src/ui/author-actions.mjs";
import {
  authorPath,
  previewPath,
  PUBLIC_GROUPS,
} from "../../src/content/author-target.mjs";

const run = promisify(execFile);
const build = (cwd) =>
  run(process.execPath, ["scripts/build.mjs"], {
    cwd,
    maxBuffer: 4 * 1024 * 1024,
  });

// Studio loads its working-tree summary after rendering the selected record.
// Observe both the actual response and its complete rendering before measuring.
export async function openStudioForEvidence(page, action) {
  const changes = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/changes") &&
      response.request().method() === "GET",
  );
  const [response] = await observeBrowserAction(action, [changes]);
  assert.equal(response.status(), 200);
  assert.equal(await response.finished(), null);
  const result = await response.json();
  assert(Array.isArray(result.files), "Studio changes response includes files");
  const expected = {
    files: result.files
      .slice(0, 100)
      .map((entry) => `${entry.status}: ${entry.path}`),
    note: `${result.gitAvailable ? "Git" : "Managed metadata"} summary · ${result.files.length} entries${result.truncated || result.files.length > 100 ? " (bounded/truncated)" : ""}. Unrelated files and private data are excluded.`,
  };
  await page.waitForFunction(
    ({ files, note }) =>
      document.querySelector("#changes-note")?.textContent === note &&
      JSON.stringify(
        [...document.querySelectorAll("#file-changes li")].map(
          (n) => n.textContent,
        ),
      ) === JSON.stringify(files),
    expected,
  );
}

export async function captureDocumentEvidence(page, path) {
  await page.evaluate(() => document.fonts.ready);
  const measure = () =>
    page.evaluate(() => ({
      width: Math.max(
        document.body.scrollWidth,
        document.documentElement.scrollWidth,
        document.body.offsetWidth,
        document.documentElement.offsetWidth,
        document.body.clientWidth,
        document.documentElement.clientWidth,
      ),
      height: Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight,
        document.body.offsetHeight,
        document.documentElement.offsetHeight,
        document.body.clientHeight,
        document.documentElement.clientHeight,
      ),
    }));
  const dimensions = await measure();
  assert(dimensions.width > 0 && dimensions.height > 0);
  const tiled = dimensions.width > 32000 || dimensions.height > 32000;
  const slices = [];
  const maxSlice = 12000;
  const widthStep = tiled ? maxSlice : dimensions.width;
  const heightStep = tiled ? maxSlice : dimensions.height;
  // Playwright 1.58 screenshotter trims fullPage+clip in DOCUMENT coordinates;
  // Firefox passes that documentRect directly to Page.screenshot. Keep the
  // original viewport/layout unchanged and bound each actual PNG, not the page.
  for (let y = 0; y < dimensions.height; y += heightStep) {
    for (let x = 0; x < dimensions.width; x += widthStep) {
      const clip = {
        x,
        y,
        width: Math.min(widthStep, dimensions.width - x),
        height: Math.min(heightStep, dimensions.height - y),
      };
      const file = tiled
        ? path.replace(
            /\.png$/,
            `-tile-${String(slices.length + 1).padStart(3, "0")}.png`,
          )
        : path;
      const png = await page.screenshot({
        path: file,
        fullPage: true,
        scale: "css",
        ...(tiled ? { clip } : {}),
      });
      assert.equal(png.subarray(1, 4).toString(), "PNG");
      assert.equal(
        png.readUInt32BE(16),
        clip.width,
        "Evidence PNG spans its full declared width",
      );
      assert.equal(
        png.readUInt32BE(20),
        clip.height,
        "Evidence PNG spans its full declared height",
      );
      slices.push({ file, clip });
    }
  }
  assert.deepEqual(
    await measure(),
    dimensions,
    "Document geometry stays stable across evidence tiles",
  );
  const coveredPixels = slices.reduce(
    (sum, { clip }) => sum + clip.width * clip.height,
    0,
  );
  assert.equal(
    coveredPixels,
    dimensions.width * dimensions.height,
    "Tiles cover the complete document without gaps or overlap",
  );
  await writeFile(
    path.replace(/\.png$/, "-coverage.json"),
    JSON.stringify(
      {
        url: page.url(),
        mode: tiled ? "document-tiles" : "full-page",
        coordinateSpace: "CSS document pixels",
        dimensions,
        maxTileHeight: tiled ? maxSlice : null,
        coveredPixels,
        complete: true,
        slices,
      },
      null,
      2,
    ),
  );
}

async function layoutEvidence(page, { prefix, label, captureScreenshots }) {
  if (label === "selected-editor") {
    // Test painted disclosure contents too: ignoring closed details must never
    // conceal wrapping failures that appear when a contributor opens them.
    const disclosures = [
      ...(await page
        .locator(
          '#new-catalog-panel, #new-catalog-panel details, #media-library details[data-media-action="where-used"]',
        )
        .all()),
      page.locator("details").filter({
        has: page.getByText("Advanced JSON draft", { exact: true }),
      }),
    ];
    for (const disclosure of disclosures) {
      if ((await disclosure.getAttribute("open")) !== null) continue;
      const summary = disclosure.locator(":scope > summary").first();
      await summary.focus();
      await page.keyboard.press("Enter");
      assert.notEqual(
        await disclosure.getAttribute("open"),
        null,
        "Keyboard opens evidence disclosure",
      );
    }
  }
  for (const theme of ["dark", "light"]) {
    if ((await page.locator("html").getAttribute("data-theme")) !== theme) {
      await page.locator("#theme-toggle").focus();
      assert.equal(
        await page
          .locator("#theme-toggle")
          .evaluate((node) => node === document.activeElement),
        true,
        "Theme keyboard activation starts on the actual toggle",
      );
      await page.keyboard.press("Enter");
    }
    await page.waitForFunction(
      (value) => document.documentElement.dataset.theme === value,
      theme,
    );
    for (const enlarged of [false, true]) {
      const css = new URL("/__test-page-edit-text200.css", page.url()).href;
      let style;
      const before = await page
        .locator("body")
        .evaluate((node) => parseFloat(getComputedStyle(node).fontSize));
      if (enlarged) {
        // Exact same-origin test-only CSS. Application responses and CSP stay unchanged.
        await page.route(css, (route) =>
          route.fulfill({
            status: 200,
            contentType: "text/css",
            body: ":root{font-size:200%}",
          }),
        );
        style = await page.addStyleTag({ url: css });
        assert.equal(
          await page
            .locator("html")
            .evaluate((node) => parseFloat(getComputedStyle(node).fontSize)),
          32,
        );
        assert.equal(
          await page
            .locator("body")
            .evaluate((node) => parseFloat(getComputedStyle(node).fontSize)),
          before * 2,
        );
      }
      for (const width of [1280, 390, 320]) {
        await page.setViewportSize({ width, height: 900 });
        const overflow = await page.evaluate(() => {
          const outside = (rect) =>
            rect.width > 0 && (rect.left < -1 || rect.right > innerWidth + 1);
          return {
            scrollWidth: document.documentElement.scrollWidth,
            text: [...document.querySelectorAll("main *")]
              .filter((node) => {
                if (
                  !node.getClientRects().length ||
                  node.children.length ||
                  !node.textContent.trim()
                )
                  return false;
                // Firefox can retain Range boxes for unpainted descendants of
                // closed details. Only the first direct summary is rendered;
                // inspect every ancestor so nested summaries stay hidden when
                // an outer disclosure is closed. Open disclosures remain tested.
                for (
                  let ancestor = node.parentElement;
                  ancestor;
                  ancestor = ancestor.parentElement
                ) {
                  if (ancestor.tagName !== "DETAILS" || ancestor.open) continue;
                  const summary = [...ancestor.children].find(
                    (child) => child.tagName === "SUMMARY",
                  );
                  if (!summary?.contains(node)) return false;
                }
                const range = document.createRange();
                range.selectNodeContents(node);
                return [...range.getClientRects()].some(outside);
              })
              .map((node) => {
                const range = document.createRange();
                range.selectNodeContents(node);
                return {
                  tag: node.tagName,
                  id: node.id,
                  text: node.textContent.slice(0, 160),
                  rects: [...range.getClientRects()].map(
                    ({ left, right, top, bottom }) => ({
                      left,
                      right,
                      top,
                      bottom,
                    }),
                  ),
                };
              }),
          };
        });
        assert(
          overflow.scrollWidth <= width + 1,
          `${label} ${theme} ${width} text200=${enlarged}: ${JSON.stringify(overflow)}`,
        );
        assert.deepEqual(
          overflow.text,
          [],
          `${label} ${theme} width=${width} text200=${enlarged}: visible text does not overflow`,
        );
        if (captureScreenshots) {
          // Cleared workbench placeholders remain mounted but intentionally hidden.
          // Capture only rendered images; do not exclude broken visible images by src
          // or completion state, which would conceal real media failures.
          const images = page.locator("main img:visible");
          if (label === "selected-editor")
            assert.equal(
              await page.locator("#media-library img:visible").count(),
              3,
              "All three authored library pictures remain visible for evidence",
            );
          for (const image of await images.all()) {
            assert(
              await image.getAttribute("src"),
              "Visible evidence image has a source",
            );
            await image.scrollIntoViewIfNeeded();
            const element = await image.elementHandle();
            assert(element, "Visible evidence image remains mounted");
            try {
              await page.waitForFunction(
                (image) =>
                  image.isConnected &&
                  image.currentSrc.length > 0 &&
                  image.complete &&
                  image.naturalWidth > 0 &&
                  image.naturalHeight > 0,
                element,
              );
            } finally {
              await element.dispose();
            }
            await image.evaluate((image) => image.decode());
          }
          await page.evaluate(() => scrollTo(0, 0));
          await captureDocumentEvidence(
            page,
            `test-results/${prefix}-page-edit-${label}-${theme}-${width}-${enlarged ? "text200" : "normal"}.png`,
          );
        }
      }
      if (style) {
        await style.evaluate((node) => node.remove());
        await page.unroute(css);
      }
    }
  }
}

async function pixel(image) {
  await image.scrollIntoViewIfNeeded();
  await image
    .page()
    .waitForFunction(
      (node) => node.complete && node.naturalWidth > 0,
      await image.elementHandle(),
    );
  return image.evaluate(async (node) => {
    await node.decode();
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    const drawing = canvas.getContext("2d");
    drawing.drawImage(node, 0, 0, 1, 1);
    return [...drawing.getImageData(0, 0, 1, 1).data];
  });
}

/** FR-001–009: real public-to-local actions, exact identity, pictures and persistence. */
export async function runPageEditTests({
  browser,
  repository,
  author,
  prefix,
  captureScreenshots,
  startReader,
}) {
  const temporary = await mkdtemp(join(tmpdir(), "dmz-page-edit-"));
  // studio.mjs installs monitorBrowser before invoking runStudioTests. Its
  // newContext wrapper attaches strict health checks to this isolated context too.
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    colorScheme: "dark",
  });
  let reader,
    freshReader,
    ownsPublicBuild = false,
    phase = "public detail targets";
  const page = await context.newPage();
  // Diagnostic-only listeners: strict global health monitoring remains unchanged.
  // Keep bounded recent events and explicit truncation counts, including aborted
  // requests, so a startup failure is distinguishable from a focus regression.
  const browserDiagnostics = {
    pageErrors: [],
    console: [],
    requestFailed: [],
    httpErrors: [],
    navigations: [],
    dropped: {},
  };
  const pendingRequests = new Map();
  const recordDiagnostic = (kind, data) => {
    const events = browserDiagnostics[kind];
    if (events.length === 100) {
      events.shift();
      browserDiagnostics.dropped[kind] =
        (browserDiagnostics.dropped[kind] || 0) + 1;
    }
    events.push({ at: new Date().toISOString(), ...data });
  };
  page.on("pageerror", (error) =>
    recordDiagnostic("pageErrors", {
      message: error.message,
      stack: error.stack,
    }),
  );
  page.on("console", (message) =>
    recordDiagnostic("console", {
      type: message.type(),
      text: message.text().slice(0, 4096),
      location: message.location(),
    }),
  );
  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame())
      recordDiagnostic("navigations", { url: frame.url() });
  });
  page.on("request", (request) => {
    if (pendingRequests.size === 100) {
      pendingRequests.delete(pendingRequests.keys().next().value);
      browserDiagnostics.dropped.pendingRequests =
        (browserDiagnostics.dropped.pendingRequests || 0) + 1;
    }
    pendingRequests.set(request, {
      at: new Date().toISOString(),
      url: request.url(),
      method: request.method(),
      resourceType: request.resourceType(),
    });
  });
  page.on("requestfinished", (request) => pendingRequests.delete(request));
  page.on("requestfailed", (request) => {
    pendingRequests.delete(request);
    recordDiagnostic("requestFailed", {
      url: request.url(),
      method: request.method(),
      resourceType: request.resourceType(),
      failure: request.failure(),
    });
  });
  page.on("response", (response) => {
    if (response.status() < 200 || response.status() >= 300)
      recordDiagnostic("httpErrors", {
        url: response.url(),
        status: response.status(),
        method: response.request().method(),
        resourceType: response.request().resourceType(),
      });
  });
  const snapshot = async () => {
    const response = await fetch(author.url + "/api/catalog");
    assert.equal(response.status, 200);
    return response.json();
  };
  const initial = await snapshot();
  let entry = initial.entries.find(
    (candidate) => candidate.key === "demo-training",
  );
  assert(entry, "Explicitly fictional existing acceptance catalog");
  const key = entry.key,
    packId = entry.pack.id;
  const target = (id, intent = "edit") => ({
    packKey: key,
    packId,
    id,
    intent,
  });
  const open = async (group, id, intent = "edit") => {
    await page.goto(author.url + authorPath(target(id, intent)));
    await page.waitForSelector("#entry-identity");
    await page.waitForFunction(
      ({ group, id }) => {
        const index = document.querySelector("#editor-record")?.value;
        return (
          document.querySelector("#editor-section")?.value === group &&
          document.querySelector(`[data-path="${group}.${index}.id"]`)
            ?.value === id
        );
      },
      { group, id },
    );
    assert.equal(await page.locator("#pack-select").inputValue(), key);
    assert((await page.locator("#entry-identity").textContent()).includes(id));
    assert.equal(
      await page.locator("#return-record").getAttribute("href"),
      previewPath(target(id)),
    );
    await page.waitForFunction(
      (id) => document.activeElement?.id === id,
      intent === "images" ? "picture-file" : "editor-record",
    );
  };
  let saveNumber = 0;
  const save = async () => {
    await page.selectOption("#editor-section", "metadata");
    await page
      .locator('[data-path="contentVersion"]')
      .fill(`page-edit-${++saveNumber}`);
    await page.click("#preview-content");
    await page.waitForSelector("#content-stage:not([hidden])");
    const response = page.waitForResponse(
      (response) =>
        response.url() === author.url + "/api/save" &&
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
    entry = data.entry;
    return data;
  };
  try {
    // The parent intentionally starts from a build-free isolated repository;
    // its later saved-preview regression must still prove no build is needed.
    // Never claim or remove a pre-existing caller-owned build directory.
    await assert.rejects(stat(join(repository, "dist")), { code: "ENOENT" });
    ownsPublicBuild = true;
    await build(repository);
    reader = await startReader(repository);
    const automaticLocalRequests = [];
    const recordRequest = (request) => {
      if (new URL(request.url()).origin !== reader.url)
        automaticLocalRequests.push(request.url());
    };
    page.on("request", recordRequest);
    for (const group of PUBLIC_GROUPS) {
      const record =
        entry.pack[group].find(
          (candidate) => candidate.spoilerLevel !== "major",
        ) || entry.pack[group][0];
      const rendered = allRecords([entry.pack]).find(
        (candidate) => candidate.id === record.id,
      );
      await page.goto(reader.url + recordUrl(rendered));
      for (const [selector, intent] of [
        ["[data-edit-record]", "edit"],
        ["[data-edit-images]", "images"],
      ]) {
        const action = page.locator(selector);
        assert.equal(await action.count(), 1);
        assert(await action.isVisible());
        assert.equal(
          await action.getAttribute("href"),
          `${guidancePath(key, record.id)}#${intent}`,
        );
      }
      await page.locator("[data-edit-record]").focus();
      await page.keyboard.press("Enter");
      await page.waitForURL(
        reader.url + guidancePath(key, record.id) + "#edit",
      );
      assert.match(await page.locator("main").textContent(), /Node\.js 22/);
      for (const intent of ["edit", "images"]) {
        const path = authorPath(target(record.id, intent));
        assert.equal(
          await page
            .locator(`[data-open-local="${intent}"]`)
            .getAttribute("href"),
          "http://127.0.0.1:4174" + path,
        );
        assert.equal(
          await page.locator(`#${intent} .author-destination`).textContent(),
          path,
        );
      }
    }
    await page.waitForLoadState("networkidle");
    assert.deepEqual(
      automaticLocalRequests,
      [],
      "Public details and instructions never contact/probe a local author server",
    );
    page.off("request", recordRequest);
    // The test author uses a random non-default port. Change only its link origin,
    // retaining the exact generated destination, then exercise a real anchor click.
    const lastId = entry.pack.locations[0].id;
    await page
      .locator('[data-open-local="images"]')
      .evaluate((anchor, origin) => {
        const url = new URL(anchor.href);
        anchor.href = origin + url.pathname + url.search;
      }, author.url);
    let chooserCount = 0;
    page.on("filechooser", () => chooserCount++);
    await page.locator('[data-open-local="images"]').focus();
    await page.keyboard.press("Enter");
    await page.waitForURL(author.url + authorPath(target(lastId, "images")));
    await page.waitForFunction(
      () => document.activeElement?.id === "picture-file",
    );
    assert.equal(
      chooserCount,
      0,
      "Image action focuses controls without opening a picker",
    );
    assert(
      (await page.locator("#entry-identity").textContent()).includes(lastId),
    );
    await page.goBack();
    assert(new URL(page.url()).pathname.startsWith("/contribute/"));
    await page.goForward();
    await page.waitForSelector("#entry-identity");
    for (const group of PUBLIC_GROUPS)
      for (const intent of ["edit", "images"])
        await open(group, entry.pack[group][0].id, intent);
    assert.equal(
      (await snapshot()).revision,
      initial.revision,
      "Actions, repeated navigation and focus never save",
    );

    phase = "invalid editor destinations";
    const valid = authorPath(target("demo:wire"));
    const invalid = [
      valid + "&id=demo:tool",
      valid + "&return=https%3A%2F%2Fevil.example",
      valid.replace("packKey=demo-training", "packKey=bundled-pictures"),
      valid.replace("id=demo%3Awire", "id=demo%3Amissing"),
      valid.replace("intent=edit", "intent=unknown"),
      "/?packKey=demo-training",
      valid.replace("id=demo%3Awire", "id=https%3A%2F%2Fevil.example"),
    ];
    for (const path of invalid) {
      // Real HTTP negative tests use the request client, not a broad browser-health exemption.
      const response = await context.request.get(author.url + path);
      assert.equal(response.status(), 400, path);
      const body = await response.text();
      assert.match(body, /INVALID_TARGET/);
      assert(
        !body.includes('id="editor-record"'),
        "Rejected target never mounts fallback editor",
      );
    }
    assert.equal((await snapshot()).revision, initial.revision);

    phase = "image workbench leave and discard cancellation";
    const wire = "demo:wire",
      tool = "demo:tool",
      location = entry.pack.locations[0].id;
    await page.goto(author.url + previewPath(target(wire)));
    await page.locator("[data-edit-images]").click();
    await page.waitForFunction(
      () => document.activeElement?.id === "picture-file",
    );
    const upload = async (color, filename, method = "primary") => {
      const data = await page.evaluate((color) => {
        const c = document.createElement("canvas");
        c.width = c.height = 48;
        const d = c.getContext("2d");
        d.fillStyle = color;
        d.fillRect(0, 0, 48, 48);
        return c.toDataURL("image/png").split(",")[1];
      }, color);
      await page.setInputFiles("#picture-file", {
        name: filename + ".png",
        mimeType: "image/png",
        buffer: Buffer.from(data, "base64"),
      });
      await page.waitForSelector("#picture-workbench:not([hidden])");
      await page.fill("#picture-holder", "Original fictional page-edit test");
      await page.fill("#picture-license", "CC0-1.0");
      await page.fill(
        "#picture-source",
        "https://example.com/original-page-edit-fixture",
      );
      await page.fill(
        "#picture-attribution",
        "Synthetic test pixels, not game art.",
      );
      await page.check("#picture-rights");
      await page.check("#picture-private");
      await page.selectOption("#picture-attachment", method);
      return page.locator("#picture-id").inputValue();
    };
    // A valid stage exists before picture preparation; neither validating again
    // nor clicking that earlier save may silently drop the unattached picture.
    await page.click("#preview-content");
    await page.waitForSelector("#content-stage:not([hidden])");
    const red = await upload("#ee0000", "page-edit-red");
    const workbenchSource = await page
      .locator("#picture-working")
      .getAttribute("src");
    const dialog = page.waitForEvent("dialog");
    const back = page
      .goBack({ waitUntil: "domcontentloaded" })
      .catch((error) =>
        assert.match(
          error.message,
          /aborted|interrupted|NS_BINDING_ABORTED|net::ERR_ABORTED|Navigation/i,
        ),
      );
    const warning = await dialog;
    assert.equal(warning.type(), "beforeunload");
    await warning.dismiss();
    await back;
    assert.equal(
      await page.locator("#picture-working").getAttribute("src"),
      workbenchSource,
    );
    for (const selector of ["#preview-content", "#save-repository"]) {
      await page.click(selector);
      await page.waitForSelector("#error:not([hidden])");
      assert.match(
        await page.locator("#error").textContent(),
        /Attach or cancel the prepared picture/,
      );
      assert.equal(
        await page.locator("#picture-working").getAttribute("src"),
        workbenchSource,
      );
    }
    for (const action of [
      () =>
        page.selectOption(
          "#pack-select",
          initial.entries.find((candidate) => candidate.key !== key).key,
        ),
      () => page.click("#reload-repository"),
    ]) {
      const pending = page.waitForEvent("dialog");
      const attempt = action();
      assert.equal((await pending).type(), "confirm");
      await (await pending).dismiss();
      await attempt;
      assert.equal(await page.locator("#pack-select").inputValue(), key);
      assert.equal(
        await page.locator("#picture-working").getAttribute("src"),
        workbenchSource,
      );
    }
    const discard = page.waitForEvent("dialog");
    const discardClick = page.click("#discard-draft");
    await (await discard).dismiss();
    await discardClick;
    assert.equal(
      await page.locator("#picture-working").getAttribute("src"),
      workbenchSource,
    );
    assert.equal(
      (await snapshot()).revision,
      initial.revision,
      "Canceling prepared-image navigation/discard leaves source unchanged",
    );
    await page.click("#attach-picture");
    await page.waitForSelector("#picture-workbench", { state: "hidden" });
    await save();

    phase = "shared primary replacement and additional/library attachments";
    await open("items", tool, "images");
    await page
      .locator(`[data-asset-id="${red}"] [data-media-action="primary"]`)
      .click();
    await save();
    const shared = structuredClone(
      entry.pack.items.find((record) => record.id === tool),
    );
    const redSource = entry.assetSources[red].sourcePath;
    const redBytes = await readFile(join(repository, redSource));
    await open("items", wire, "images");
    const blue = await upload("#0000ee", "page-edit-blue");
    await page.click("#attach-picture");
    await page.waitForSelector("#picture-workbench", { state: "hidden" });
    const green = await upload("#00cc00", "page-edit-green", "additional");
    await page.click("#attach-picture");
    await page.waitForSelector("#picture-workbench", { state: "hidden" });
    const wireIndex = await page.locator("#editor-record").inputValue();
    await page
      .locator(`[data-path="items.${wireIndex}.name"]`)
      .fill("Renamed fictional page-edit wire");
    await save();
    assert.equal(
      entry.pack.items.find((record) => record.id === wire).assetId,
      blue,
    );
    assert.deepEqual(
      entry.pack.items.find((record) => record.id === tool),
      shared,
      "Replacing a shared primary changes only the selected record",
    );
    assert.deepEqual(
      await readFile(join(repository, redSource)),
      redBytes,
      "Original shared bytes remain immutable",
    );
    await open("locations", location, "images");
    const assetCount = entry.pack.assets.length;
    await page
      .locator(`[data-asset-id="${red}"] [data-media-action="primary"]`)
      .click();
    await upload("#00cc00", "page-edit-location-green", "additional");
    await page.click("#attach-picture");
    await page.waitForSelector("#duplicate-stage:not([hidden])");
    assert(
      (await page.locator("#duplicate-note").textContent()).includes(green),
    );
    await page.click("#reuse-picture");
    await page.waitForSelector("#picture-workbench", { state: "hidden" });
    await save();
    assert.equal(
      entry.pack.assets.length,
      assetCount,
      "Library reuse creates no duplicate assets",
    );
    await open("locations", location, "images");
    const locationName = entry.pack.locations.find(
      (record) => record.id === location,
    ).name;
    const locationRevision = (await snapshot()).revision;
    // Both newly supported location attachment kinds participate in dependency
    // protection, even when their pixels are shared with other records.
    for (const assetId of [red, green]) {
      const card = page.locator(`[data-asset-id="${assetId}"]`);
      await card.locator('[data-media-action="where-used"] summary').click();
      assert(
        (
          await card.locator('[data-media-action="where-used"]').textContent()
        ).includes(locationName),
      );
      await card.locator('[data-media-action="remove"]').click();
      assert.equal(await page.locator("#confirm-remove").isDisabled(), true);
      assert.match(
        await page.locator("#remove-summary").textContent(),
        /Removal blocked/,
      );
      assert(
        (await page.locator("#remove-usage").textContent()).includes(
          locationName,
        ),
      );
      await page.click("#cancel-remove");
    }
    assert.equal(
      (await snapshot()).revision,
      locationRevision,
      "Blocked removal previews do not alter saved location or pictures",
    );
    await open("items", wire);
    assert.equal(
      await page
        .locator(
          `[data-path="items.${await page.locator("#editor-record").inputValue()}.name"]`,
        )
        .inputValue(),
      "Renamed fictional page-edit wire",
    );
    await page.locator("#return-record").click();
    assert.match(
      await page.locator("h1").textContent(),
      /Renamed fictional page-edit wire/,
    );
    assert.deepEqual(
      await pixel(page.locator("img[data-public-image]").nth(0)),
      [0, 0, 238, 255],
    );
    assert.deepEqual(
      await pixel(page.locator("img[data-public-image]").nth(1)),
      [0, 204, 0, 255],
    );
    await openStudioForEvidence(page, () =>
      page.locator("[data-edit-record]").click(),
    );
    await page.waitForSelector("#entry-identity");
    assert(
      (await page.locator("#entry-identity").textContent()).includes(wire),
    );

    phase = "dark/light action, guidance and target reflow evidence";
    await layoutEvidence(page, {
      prefix,
      label: "selected-editor",
      captureScreenshots,
    });
    await page.goto(
      reader.url +
        recordUrl(
          allRecords([entry.pack]).find((record) => record.id === wire),
        ),
    );
    await layoutEvidence(page, {
      prefix,
      label: "public-detail",
      captureScreenshots,
    });
    const guidanceLink = page.locator("[data-edit-images]");
    const guidanceURL = new URL(
      await guidanceLink.getAttribute("href"),
      page.url(),
    ).href;
    await Promise.all([
      page.waitForURL(guidanceURL, { waitUntil: "load" }),
      guidanceLink.click(),
    ]);
    await layoutEvidence(page, {
      prefix,
      label: "guidance",
      captureScreenshots,
    });

    phase = "fresh Git checkout rebuild of authored source and pixels";
    const staged = join(temporary, "staged"),
      fresh = join(temporary, "fresh");
    const git = (args, cwd = temporary) =>
      run(
        "git",
        ["-c", "core.hooksPath=" + join(temporary, "empty-hooks"), ...args],
        {
          cwd,
          maxBuffer: 4 * 1024 * 1024,
          env: {
            ...process.env,
            GIT_TERMINAL_PROMPT: "0",
            GIT_CONFIG_NOSYSTEM: "1",
          },
        },
      );
    await mkdir(join(temporary, "empty-hooks"));
    await git(["clone", "--no-local", repository, staged]);
    for (const path of ["content/catalog", "media"])
      await cp(join(repository, path), join(staged, path), { recursive: true });
    await git(["add", "content/catalog", "media"], staged);
    await git(
      [
        "-c",
        "user.name=Page edit fixture",
        "-c",
        "user.email=fixture@example.invalid",
        "-c",
        "commit.gpgSign=false",
        "commit",
        "-m",
        "Synthetic page-edit browser fixture",
      ],
      staged,
    );
    await git(["clone", "--no-local", staged, fresh]);
    await build(fresh);
    freshReader = await startReader(fresh);
    for (const [id, expected] of [
      [
        wire,
        [
          [0, 0, 238, 255],
          [0, 204, 0, 255],
        ],
      ],
      [tool, [[238, 0, 0, 255]]],
      [
        location,
        [
          [238, 0, 0, 255],
          [0, 204, 0, 255],
        ],
      ],
    ]) {
      const record = allRecords([entry.pack]).find(
        (record) => record.id === id,
      );
      await page.goto(freshReader.url + recordUrl(record));
      if (id === wire)
        assert.match(
          await page.locator("h1").textContent(),
          /Renamed fictional page-edit wire/,
        );
      const pictures = page.locator("img[data-public-image]");
      assert.equal(await pictures.count(), expected.length);
      for (let index = 0; index < expected.length; index++)
        assert.deepEqual(
          await pixel(pictures.nth(index)),
          expected[index],
          `${id} rebuilt picture ${index}`,
        );
    }
    assert.deepEqual(await readFile(join(fresh, redSource)), redBytes);
    assert.equal(
      (await git(["status", "--porcelain"], fresh)).stdout.trim(),
      "",
      "Fresh build never changes canonical source",
    );
    console.log(
      `${prefix}: page edit actions across six groups, explicit custom-port navigation, identity/invalid targets, unsaved-image cancel, shared primary replacement, location pictures, fresh-clone pixels and dark/light reflow passed.`,
    );
  } catch (error) {
    await writeFile(
      `test-results/${prefix}-page-edit-failure.json`,
      JSON.stringify(
        {
          phase,
          message: error.message,
          stack: error.stack,
          url: page.url(),
          browserDiagnostics,
          pendingRequests: [...pendingRequests.values()],
          layout: await page
            .evaluate(() => ({
              width: innerWidth,
              height: innerHeight,
              theme: document.documentElement.dataset.theme,
              rootFontSize: getComputedStyle(document.documentElement).fontSize,
              bodyFontSize: getComputedStyle(document.body).fontSize,
              scrollWidth: document.documentElement.scrollWidth,
              readyState: document.readyState,
              activeElement: {
                tag: document.activeElement?.tagName,
                id: document.activeElement?.id,
              },
              status: document.querySelector("#save-status")?.textContent,
              error: {
                hidden: document.querySelector("#error")?.hidden,
                text: document.querySelector("#error")?.textContent,
              },
              catalogOptionCount:
                document.querySelector("#pack-select")?.options.length,
              selectedIdentity:
                document.querySelector("#entry-identity")?.textContent,
              scripts: [...document.scripts].map((script) => ({
                src: script.src,
                type: script.type,
              })),
            }))
            .catch(() => null),
          state: await page
            .locator("body")
            .textContent()
            .catch(() => null),
        },
        null,
        2,
      ),
    );
    if (captureScreenshots) {
      try {
        await captureDocumentEvidence(
          page,
          `test-results/${prefix}-page-edit-failure.png`,
        );
      } catch (captureError) {
        throw new AggregateError(
          [error, captureError],
          `Page-edit acceptance failed during ${phase}; diagnostic capture also failed: ${captureError.message}`,
        );
      }
    }
    throw new Error(
      `Page-edit acceptance failed during ${phase}: ${error.message}`,
      { cause: error },
    );
  } finally {
    await context.close();
    await reader?.close();
    await freshReader?.close();
    if (ownsPublicBuild) {
      await rm(join(repository, "dist"), {
        recursive: true,
        force: true,
        maxRetries: 5,
        retryDelay: 100,
      });
      await assert.rejects(
        stat(join(repository, "dist")),
        { code: "ENOENT" },
        "Page-edit's owned public build is removed before the parent Studio journey resumes",
      );
    }
    await rm(temporary, {
      recursive: true,
      force: true,
      maxRetries: 5,
      retryDelay: 100,
    });
  }
}
