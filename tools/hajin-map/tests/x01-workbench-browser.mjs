import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";

export async function runX01WorkbenchBrowser(browser, base) {
  const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    }),
    page = await context.newPage(),
    errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  try {
    await page.goto(`${base}/x01-workspace.html?floor=1&marker=x01-3d-printer`);
    await page.locator("#wb-results button").first().waitFor();
    assert.match(
      await page.locator("#wb-count").textContent(),
      /106 visible markers/,
    );
    assert.match(
      await page.locator("#wb-alignment").textContent(),
      /13 named anchors/,
    );
    assert.match(await page.locator("#wb-detail").textContent(), /3D Printer/);
    await page.locator("#wb-fit").click();
    const a11y = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    assert.deepEqual(
      a11y.violations.map((row) => row.id),
      [],
    );
    const missing = await context.newPage();
    missing.on("pageerror", (error) => errors.push(error.message));
    await missing.route("**/maps/x01/dmzhub/tiles/**", (route) =>
      route.fulfill({ status: 404, body: "Missing tile" }),
    );
    await missing.goto(`${base}/x01-workspace.html`);
    await missing.waitForFunction(() =>
      document
        .querySelector("#wb-message")
        ?.textContent.includes("floor image is missing"),
    );
    assert.match(
      await missing.locator("#wb-count").textContent(),
      /106 visible markers/,
    );
    await missing.close();
    const nearbyIndex = await page.evaluate(() => {
      const nodes = [
          ...document.querySelectorAll("#wb-map .leaflet-marker-icon"),
        ],
        centers = nodes.map((node) => {
          const r = node.getBoundingClientRect();
          return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
        });
      for (let i = 0; i < nodes.length; i++)
        for (let j = i + 1; j < nodes.length; j++)
          if (
            Math.hypot(
              centers[i].x - centers[j].x,
              centers[i].y - centers[j].y,
            ) < 20
          )
            return i;
      return -1;
    });
    assert.ok(
      nearbyIndex >= 0,
      "At least two reported markers overlap at fit view",
    );
    await page
      .locator("#wb-map .leaflet-marker-icon")
      .nth(nearbyIndex)
      .dispatchEvent("click");
    assert.equal(await page.locator("#wb-nearby").isVisible(), true);
    assert.ok((await page.locator("#wb-nearby-list button").count()) > 1);
    await page.locator("#wb-nearby-list button").first().click();
    assert.equal(await page.locator("#wb-nearby").isVisible(), false);
    await page.goto(`${base}/x01-workspace.html?floor=1&marker=x01-3d-printer`);
    await page.locator("#wb-results button").first().waitFor();
    await page
      .locator("#wb-review-panel")
      .evaluate((element) => (element.open = true));
    assert.ok(
      (await page.locator("#wb-candidates .wb-review-row").count()) > 0,
    );
    const candidate = page.locator("#wb-candidates .wb-review-row").first();
    await candidate.getByRole("button", { name: "Same" }).click();
    await page.waitForFunction(
      () =>
        document
          .querySelector("#wb-candidates .wb-review-row button")
          ?.getAttribute("aria-pressed") === "true",
    );
    assert.equal(
      await candidate
        .getByRole("button", { name: "Same" })
        .getAttribute("aria-pressed"),
      "true",
    );
    assert.ok((await page.locator(".wb-cod-pin.is-reviewed").count()) > 0);
    await page
      .locator("#wb-route-panel")
      .evaluate((element) => (element.open = true));
    await page.locator("#wb-route-add").click();
    await page.waitForFunction(() =>
      document
        .querySelector("#wb-route-list")
        ?.textContent.includes("3D Printer"),
    );
    assert.match(
      await page.locator("#wb-route-list").textContent(),
      /3D Printer/,
    );
    await page.locator("#wb-search").fill("safe");
    await page.locator("#wb-results button").first().click();
    await page.locator("#wb-route-add").click();
    await page.waitForFunction(() =>
      document
        .querySelector("#wb-route-legs")
        ?.textContent.includes("schematic"),
    );
    assert.match(
      await page.locator("#wb-route-legs").textContent(),
      /schematic/,
    );
    const secondName = await page
      .locator("#wb-route-list .wb-route-row")
      .nth(1)
      .textContent();
    await page
      .locator("#wb-route-list .wb-route-row")
      .nth(1)
      .getByRole("button", { name: "↑" })
      .click();
    await page.waitForFunction(
      (name) =>
        document
          .querySelector("#wb-route-list .wb-route-row")
          ?.textContent.includes(name),
      secondName.split(" · ")[0].replace(/^2\. /, ""),
    );
    await page.locator("#wb-route-list button").last().click();
    await page.waitForFunction(
      () =>
        document.querySelectorAll("#wb-route-list .wb-route-row").length === 1,
    );
    assert.equal(await page.locator("#wb-route-list .wb-route-row").count(), 1);
    await page.locator("#wb-add").click();
    await page.locator("#wb-point-name").fill("Private test point");
    await page.locator("#wb-point-x").fill("0.5");
    await page.locator("#wb-point-y").fill("0.5");
    await page
      .locator("#wb-point-photo")
      .setInputFiles({
        name: "test.png",
        mimeType: "image/png",
        buffer: Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==",
          "base64",
        ),
      });
    await page.locator("#wb-point-form button[type=submit]").click();
    await page.waitForFunction(() =>
      document
        .querySelector("#wb-detail")
        ?.textContent.includes("Private test point"),
    );
    assert.equal(await page.locator("#wb-detail img").count(), 1);
    await page.reload();
    await page.locator("#wb-results button").first().waitFor();
    await page.locator("#wb-search").fill("Private test point");
    assert.equal(await page.locator("#wb-results button").count(), 1);
    await page.locator("#wb-results button").click();
    await page
      .locator("#wb-observe-panel")
      .evaluate((element) => (element.open = true));
    await page.locator("#wb-observe-notes").fill("Synthetic browser test only");
    await page.locator("#wb-observe-form button").click();
    await page.waitForFunction(() =>
      document
        .querySelector("#wb-observations")
        ?.textContent.includes("Synthetic browser test only"),
    );
    await page
      .locator("#wb-backup-panel")
      .evaluate((element) => (element.open = true));
    const downloadPromise = page.waitForEvent("download");
    await page.locator("#wb-export").click();
    const download = await downloadPromise;
    const backup = readFileSync(await download.path());
    await page
      .locator("#wb-import-file")
      .setInputFiles({
        name: "backup.json",
        mimeType: "application/json",
        buffer: backup,
      });
    await page.locator("#wb-import-review").click();
    await page.waitForFunction(
      () =>
        !!document.querySelector("#wb-import-preview")?.textContent ||
        document.querySelector("#wb-message")?.classList.contains("wb-error"),
    );
    assert.match(
      await page.locator("#wb-import-preview").textContent(),
      /1 POIs, 1 photos, 1 observations/,
    );
    await page.locator("#wb-import-apply").click();
    await page.waitForFunction(() =>
      document.querySelector("#wb-message")?.textContent.includes("restored"),
    );
    await page
      .locator("#wb-update-panel")
      .evaluate((element) => (element.open = true));
    await page
      .locator("#wb-update-file")
      .setInputFiles({
        name: "snapshot.json",
        mimeType: "application/json",
        buffer: readFileSync(
          new URL("../src/x01/dmzhub-snapshot.json", import.meta.url),
        ),
      });
    await page.locator("#wb-update-review").click();
    await page.waitForFunction(
      () =>
        !!document.querySelector("#wb-update-preview")?.textContent ||
        document.querySelector("#wb-message")?.classList.contains("wb-error"),
    );
    assert.match(
      await page.locator("#wb-update-preview").textContent(),
      /0 changes/,
    );
    await page.locator("#wb-update-apply").click();
    await page.waitForFunction(() =>
      document
        .querySelector("#wb-message")
        ?.textContent.includes("Source snapshot refreshed"),
    );
    const changed = JSON.parse(
      readFileSync(
        new URL("../src/x01/dmzhub-snapshot.json", import.meta.url),
        "utf8",
      ),
    );
    changed.markers.push({
      ...changed.markers[0],
      id: "dmzhub-99999",
      sourceId: 99999,
      title: "Synthetic update marker",
      floor: 1,
      x: 0.5,
      y: 0.5,
    });
    await page
      .locator("#wb-update-file")
      .setInputFiles({
        name: "changed.json",
        mimeType: "application/json",
        buffer: Buffer.from(JSON.stringify(changed)),
      });
    await page.locator("#wb-update-review").click();
    await page.waitForFunction(() =>
      document
        .querySelector("#wb-update-preview")
        ?.textContent.includes("1 changes"),
    );
    assert.match(
      await page.locator("#wb-update-preview").textContent(),
      /1 added/,
    );
    await page.locator("#wb-update-apply").click();
    await page.waitForFunction(() =>
      document
        .querySelector("#wb-message")
        ?.textContent.includes("Source update applied"),
    );
    await page
      .locator("#wb-update-file")
      .setInputFiles({
        name: "bad.json",
        mimeType: "application/json",
        buffer: Buffer.from("{bad"),
      });
    await page.locator("#wb-update-review").click();
    assert.equal(await page.locator("#wb-update-apply").isDisabled(), true);
    await page.locator("#wb-compare").check();
    assert.equal(
      await page.locator("#wb-maps").getAttribute("class"),
      "wb-maps compare",
    );
    await page.locator('input[name="wb-floor"][value="2"]').check();
    assert.match(
      await page.locator("#wb-alignment").textContent(),
      /10 named anchors/,
    );
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      true,
    );
    await page.locator("#wb-compare").uncheck();
    await page.locator("#wb-fit").click();
    await page.setViewportSize({ width: 320, height: 700 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      true,
    );
    assert.deepEqual(errors, []);
    return [
      "X01 workbench deep link, alignment, duplicate review, route, private POI, observation, reload, comparison and mobile passed",
    ];
  } finally {
    await context.close();
  }
}
