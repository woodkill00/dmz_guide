import { chromium, firefox, webkit } from "playwright";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const base = "http://127.0.0.1:4173",
  output = "test-results/095-browser";
await mkdir(output, { recursive: true });
const reports = [];
for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
  const browser = await engine.launch({ headless: true });
  const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    }),
    page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (r) => {
    if (r.status() >= 400) errors.push(r.status() + " " + r.url());
  });
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  try {
    const status = await (
      await page.request.get(base + "/local-site/status.json")
    ).json();
    assert.equal(status.maps, true);
    assert.equal(status.reason, "ready");
    for (const path of [
      "/",
      "/inventory/",
      "/upgrades/",
      "/missions/",
      "/map/",
      "/map/safes/",
      "/map/loot/",
      "/map/x01/",
      "/map/x01.html",
      "/map/x01-dmzhub.html",
    ]) {
      await page.goto(base + path);
      await page.waitForLoadState("networkidle");
      assert.equal(
        await page.locator('nav[aria-label="Main navigation"]').count(),
        1,
        path,
      );
      if (path.startsWith("/map/")) {
        assert.ok((await page.locator(".leaflet-container").count()) > 0, path);
        const markers = page.locator(".leaflet-marker-icon:visible");
        await markers.first().waitFor({ state: "visible", timeout: 30000 });
        assert.ok((await markers.count()) > 0, path);
        const all = page.locator(".leaflet-marker-icon");
        const index = await all.evaluateAll((nodes) =>
          nodes.findIndex((x) => {
            const r = x.getBoundingClientRect();
            return (
              document
                .elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)
                ?.closest(".leaflet-marker-icon") === x
            );
          }),
        );
        assert.ok(index >= 0, "a marker can receive a real pointer click");
        await all.nth(index).click();
        await page.waitForTimeout(1000);
        if (path === "/map/") {
          assert.ok(
            (await page.locator(".leaflet-popup:visible").count()) > 0,
            "marker popup stays open",
          );
          await page.waitForTimeout(2000);
          assert.ok(
            (await page.locator(".leaflet-popup:visible").count()) > 0,
            "popup survives settled layout",
          );
        }
        await page.screenshot({
          path: `${output}/${name}-${path.replaceAll("/", "_")}.png`,
        });
        if (path === "/map/x01/") {
          await page.locator('input[name="wb-floor"][value="2"]').check();
          await page.waitForTimeout(300);
          assert.equal(new URL(page.url()).searchParams.get("floor"), "2");
          await page.reload();
          await page.waitForLoadState("networkidle");
          assert.equal(
            await page.locator('input[name="wb-floor"][value="2"]').isChecked(),
            true,
          );
        }
      }
    }
    await page.goto(base + "/map/migrate/");
    await page.evaluate(() =>
      localStorage.setItem("synthetic-guide-preserve", "unchanged"),
    );
    const envelope = {
      kind: "dmz-map-preferences",
      version: 1,
      sourceOrigin: "http://127.0.0.1:5175",
      entries: { "hajin-coordinate-grid-v1": "0" },
    };
    await page.locator("#import").setInputFiles({
      name: "synthetic-map-settings.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(envelope)),
    });
    await page.locator("#review").click();
    await page.locator("#apply").click();
    assert.match(await page.locator("#status").innerText(), /Saved 1 settings/);
    assert.equal(
      await page.evaluate(() =>
        localStorage.getItem("synthetic-guide-preserve"),
      ),
      "unchanged",
    );
    await page.reload();
    assert.equal(
      await page.evaluate(() =>
        localStorage.getItem("hajin-coordinate-grid-v1"),
      ),
      "0",
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(base + "/map/");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: `${output}/${name}-mobile.png` });
    assert.deepEqual(errors, [], name + " browser diagnostics");
    reports.push({
      browser: name,
      status: "passed",
      routes: 11,
      migration: true,
      guideStatePreserved: true,
    });
    console.log(name + " unified map/guide/migration smoke passed");
  } finally {
    await context.close();
    await browser.close();
  }
}
await writeFile(
  output + "/report.json",
  JSON.stringify(reports, null, 2) + "\n",
);
