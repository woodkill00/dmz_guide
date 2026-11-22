import assert from "node:assert/strict";
import { chromium, firefox, webkit } from "playwright";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { features, featureURL } from "../../src/ui/feature-registry.mjs";
import { siteTopics, mapWorkflows } from "../../src/domain/site-workflows.mjs";
const base = process.env.DMZ_SITE_URL || "http://127.0.0.1:4173",
  results = [];
await mkdir("test-results", { recursive: true });
const databases = (page) =>
  page.evaluate(async () =>
    typeof indexedDB.databases === "function"
      ? (await indexedDB.databases()).map((d) => d.name)
      : [],
  );
async function readyQuality(page) {
  await page.waitForFunction(
    () => document.querySelector("#quality-rows select")?.disabled === false,
  );
}
async function menu(page) {
  const d = page.locator("[data-workspace-tools]").first();
  if (!(await d.evaluate((n) => n.open)))
    await d.locator(":scope > summary").click();
  return d;
}
async function noOverflow(page) {
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
    "page must not overflow horizontally",
  );
}
for (const [engine, type] of Object.entries({ chromium, firefox, webkit })) {
  const browser = await type.launch(),
    context = await browser.newContext({
      viewport: { width: 1366, height: 900 },
    }),
    page = await context.newPage(),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  context.on("page", (p) => p.on("pageerror", (e) => errors.push(e.message)));
  const measurements = { engine, routes: [], searchMs: null };
  try {
    // Public help/quality/search/recovery discovery is not a profile initializer.
    const started = Date.now();
    await page.goto(base + "/help/");
    await page.locator("#help-search:not([hidden])").waitFor();
    measurements.routes.push({ path: "/help/", readyMs: Date.now() - started });
    assert.equal(await page.locator("[data-help-topic]").count(), 14);
    for (const topic of siteTopics)
      assert.equal(await page.locator(`#${topic.id} > summary`).count(), 1);
    await page.locator("#help-query").fill("backup");
    assert.ok(await page.locator('[data-help-topic="recovery"]').isVisible());
    assert.ok(
      (await page.locator("[data-help-topic]:not([hidden])").count()) < 14,
    );
    await page.locator('#help-search button[type="reset"]').click();
    await page.waitForFunction(
      () =>
        document.querySelectorAll("[data-help-topic]:not([hidden])").length ===
        14,
    );
    await page.goto(base + "/help/#editing");
    await page.waitForFunction(() => document.querySelector("#editing").open);
    for (const width of [390, 1366]) {
      await page.setViewportSize({ width, height: 900 });
      const d = await menu(page),
        panel = d.locator(".workspace-tools-panel");
      const box = await panel.boundingBox();
      assert.ok(box.x >= 0 && box.x + box.width <= width + 1);
      assert.ok(box.height <= 900 * 0.71);
      await page.keyboard.press("Escape");
      assert.equal(await d.evaluate((n) => n.open), false);
      assert.ok(
        await d
          .locator(":scope > summary")
          .evaluate((n) => document.activeElement === n),
      );
      await noOverflow(page);
    }
    let d = await menu(page);
    await d.locator("[data-workspace-density]").click();
    const density = await page
      .locator("html")
      .getAttribute("data-workspace-density");
    await page.reload();
    await page.waitForFunction(
      (density) =>
        document.documentElement.dataset.workspaceDensity === density,
      density,
    );
    await page.locator("#theme-toggle").click();
    await page.evaluate(
      () => (document.documentElement.style.fontSize = "200%"),
    );
    await page.setViewportSize({ width: 390, height: 900 });
    await menu(page);
    await noOverflow(page);
    await page.screenshot({ path: `test-results/105-${engine}-help-zoom.png` });
    await page.evaluate(() => (document.documentElement.style.fontSize = ""));
    await page.setViewportSize({ width: 1366, height: 900 });
    await page.goto(base + "/quality/");
    await readyQuality(page);
    assert.ok((await page.locator("#quality-rows tr").count()) <= 100);
    await page.locator("#quality-type").selectOption("weapon");
    assert.ok(
      (await page.locator("#quality-rows").innerText()).includes(
        "Cronen Osprey",
      ),
    );
    const editor = new URL(
      await page
        .locator("#quality-rows tr")
        .first()
        .locator("td:last-child a")
        .getAttribute("href"),
      base,
    );
    assert.equal(editor.pathname, "/local-services/author/");
    const target = new URL(editor.searchParams.get("destination"), base);
    assert.equal(target.searchParams.get("adapter"), "weapon-acquisition");
    await page.locator('#quality-filters button[type="reset"]').click();
    await page.waitForFunction(
      () =>
        document.querySelector("#quality-type").value === "" &&
        document.querySelectorAll("#quality-rows tr").length === 100,
    );
    const first = page.locator("#quality-rows tr").first(),
      firstId = await first.getAttribute("data-quality-id");
    assert.ok(!(await databases(page)).includes("dmz-editorial-local"));
    await first.locator("select").selectOption("later");
    await page.waitForFunction(async (id) => {
      const { readQualityReviews } = await import(
        "/assets/src/storage/quality-review-store.mjs"
      );
      return (await readQualityReviews())?.value.entries.some(
        (r) => r.id === id && r.state === "later",
      );
    }, firstId);
    await page.reload();
    await readyQuality(page);
    await page.locator("#quality-filter").selectOption("later");
    assert.equal(await page.locator("#quality-rows tr").count(), 1);
    assert.equal(
      await page.locator("#quality-rows tr").getAttribute("data-quality-id"),
      firstId,
    );
    // Held cross-tab lock: only the first candidate may commit from a shared baseline.
    await page.locator("#quality-filter").selectOption("");
    const other = await context.newPage();
    await other.goto(base + "/quality/");
    await readyQuality(other);
    const held = page.evaluate(() =>
      navigator.locks.request(
        "dmz-quality-reviews-v1",
        () =>
          new Promise((resolve) => {
            window.__releaseQuality = resolve;
          }),
      ),
    );
    await page.waitForFunction(
      () => typeof window.__releaseQuality === "function",
    );
    const ownId = await page
        .locator("#quality-rows tr")
        .nth(1)
        .getAttribute("data-quality-id"),
      otherId = await other
        .locator("#quality-rows tr")
        .nth(2)
        .getAttribute("data-quality-id");
    await page
      .locator("#quality-rows tr")
      .nth(1)
      .locator("select")
      .selectOption("checked");
    await other
      .locator("#quality-rows tr")
      .nth(2)
      .locator("select")
      .selectOption("checked");
    await page.evaluate(() => window.__releaseQuality());
    await held;
    await other
      .locator("#quality-error")
      .filter({ hasText: "Another tab" })
      .waitFor();
    const log = await page.evaluate(
      async () =>
        (
          await (
            await import("/assets/src/storage/quality-review-store.mjs")
          ).readQualityReviews()
        ).value,
    );
    assert.ok(log.entries.some((r) => r.id === ownId));
    assert.ok(!log.entries.some((r) => r.id === otherId));
    assert.ok(log.entries.some((r) => r.id === firstId));
    await other.close();
    const beforeImport = await page.evaluate(async () =>
      JSON.stringify(
        await (
          await import("/assets/src/storage/quality-review-store.mjs")
        ).readQualityReviews(),
      ),
    );
    await page.locator("#quality-import").setInputFiles({
      name: "bad.json",
      mimeType: "application/json",
      buffer: Buffer.from('{"version":1,"entries":[{"bad":true}]}'),
    });
    await page.locator("#quality-error").waitFor({ state: "visible" });
    assert.equal(
      await page.evaluate(async () =>
        JSON.stringify(
          await (
            await import("/assets/src/storage/quality-review-store.mjs")
          ).readQualityReviews(),
        ),
      ),
      beforeImport,
    );
    await page.setViewportSize({ width: 390, height: 900 });
    await noOverflow(page);
    await page.screenshot({
      path: `test-results/105-${engine}-quality-mobile.png`,
    });
    await page.setViewportSize({ width: 1366, height: 900 });
    await page.goto(base + "/workspace-backup/");
    await page.locator("#saved-backup-preview").click();
    await page
      .locator("#saved-backup-status")
      .filter({ hasText: "No saved records" })
      .waitFor();
    assert.ok(await page.locator("#saved-backup-download").isHidden());
    assert.ok(!(await databases(page)).includes("dmz-guide-local"));
    assert.ok(!(await databases(page)).includes("dmz-armory-local"));
    await page.goto(base + "/search/");
    await page.waitForFunction(
      () => document.querySelectorAll(".search-result").length > 0,
    );
    await page.locator("#unified-more").click();
    assert.equal(new URL(page.url()).searchParams.get("page"), "2");
    await page.goBack();
    assert.equal(new URL(page.url()).searchParams.get("page"), null);
    const searchStart = Date.now();
    await page.locator("#unified-query").fill("Cronen Osprey");
    await page.locator("#unified-type").selectOption("weapon");
    await page.waitForFunction(() =>
      document
        .querySelector("#unified-results")
        ?.textContent.includes("Cronen Osprey"),
    );
    measurements.searchMs = Date.now() - searchStart;
    assert.equal(new URL(page.url()).searchParams.get("q"), "Cronen Osprey");
    assert.equal(await page.locator(".search-result").count(), 1);
    assert.ok(
      (
        await page.locator(".search-result h3 a").getAttribute("href")
      ).startsWith("/armory/acquisition/"),
    );
    await page.locator("#unified-clear").click();
    await page.waitForFunction(
      () => document.querySelectorAll(".search-result").length === 100,
    );
    // Existing owners: actual transactions issue notices, failure issues none, no draft reload.
    const notice = await context.newPage();
    await notice.goto(base + "/help/");
    await notice.locator("[data-workspace-tools][data-ready]").waitFor();
    await page.goto(base + "/inventory/?pack=official%3Amw4-dmz-starter");
    await page.waitForFunction(
      () =>
        document.querySelector("main").getAttribute("aria-busy") === "false",
    );
    await page.evaluate(async () => {
      const { state } = await import("/assets/src/client/common.mjs"),
        { newProfile } = await import("/assets/src/domain/profile.mjs"),
        { saveProfile } = await import("/assets/src/storage/store.mjs"),
        { emptyArmory } = await import(
          "/assets/src/domain/armory-workspace.mjs"
        ),
        { saveArmory } = await import("/assets/src/storage/armory-store.mjs");
      const profile = newProfile({ ...state.pack, schemaVersion: 2 });
      profile.inventory["mw4:dmz-cash"] = 7000000000;
      await saveProfile(profile, state.revision);
      const armory = emptyArmory();
      armory.acquisition["cronen-osprey"] = {
        manual: true,
        manualExtractions: 2,
        attachments: [],
        blueprints: [],
      };
      await saveArmory(armory, 0);
    });
    await page.reload();
    await page.waitForFunction(
      () =>
        document.querySelector("main").getAttribute("aria-busy") === "false",
    );
    await page.locator("#inventory-query").fill("cash");
    const amount = page.locator(
      '[data-field="inventory"][data-id="mw4:dmz-cash"]',
    );
    await amount.fill("6,209,662");
    await page
      .getByRole("button", { name: "Save inventory", exact: true })
      .click();
    await notice.waitForFunction(() => {
      const r = JSON.parse(
        localStorage.getItem("dmz-save-receipt-v1") || "null",
      );
      return r?.owner === "profile" && r.revision >= 2;
    });
    await notice.waitForFunction(
      () => !document.querySelector("[data-workspace-remote]").hidden,
    );
    d = await menu(notice);
    assert.ok((await d.innerText()).includes("Another tab saved"));
    await amount.fill("6209663"); // Leave a real unsaved inventory edit in place.
    const weaponPage = await context.newPage();
    await weaponPage.goto(base + "/armory/acquisition/?weapon=cronen-osprey");
    await weaponPage.waitForFunction(
      () =>
        document.querySelector("#weapon-acquisition").dataset.busy === "false",
    );
    await weaponPage.locator("#weapon-cronen-osprey [data-manual]").uncheck();
    await page.waitForFunction(
      () => !document.querySelector("[data-workspace-remote]").hidden,
    );
    assert.equal(await amount.inputValue(), "6209663");
    await weaponPage.evaluate(() => {
      window.__events = 0;
      window.addEventListener("workspace-saved", () => window.__events++);
      window.__originalPut = IDBObjectStore.prototype.put;
      IDBObjectStore.prototype.put = function () {
        throw new DOMException("Synthetic quota", "QuotaExceededError");
      };
    });
    const good = await weaponPage.evaluate(() =>
      localStorage.getItem("dmz-save-receipt-v1"),
    );
    await weaponPage.locator("#weapon-cronen-osprey [data-manual]").click();
    await weaponPage
      .locator("#acq-error")
      .filter({ hasText: "quota" })
      .waitFor();
    assert.equal(await weaponPage.evaluate(() => window.__events), 0);
    assert.equal(
      await weaponPage.evaluate(() =>
        localStorage.getItem("dmz-save-receipt-v1"),
      ),
      good,
    );
    await weaponPage.evaluate(
      () => (IDBObjectStore.prototype.put = window.__originalPut),
    );
    await weaponPage.locator("#acq-retry").click();
    await weaponPage.waitForFunction(() => window.__events === 1);
    assert.equal(await amount.inputValue(), "6209663");
    await weaponPage.close();
    // Cancel only this disposable draft; owner context remains intact.
    await page.locator("#cancel-inventory").click();
    await page.goto(base + "/workspace-backup/");
    await page.locator("#saved-backup-preview").click();
    await page
      .locator("#saved-backup-status")
      .filter({ hasText: "Preview ready" })
      .waitFor();
    assert.ok(
      (await page.locator("#saved-backup-details").innerText()).includes(
        "Map private workspace",
      ) ||
        (await page.locator("#saved-backup-details").innerText()).includes(
          "Map private",
        ),
    );
    let downloadPromise = page.waitForEvent("download");
    await page.locator("#saved-backup-download").click();
    let download = await downloadPromise;
    let bundle = JSON.parse(await readFile(await download.path(), "utf8"));
    assert.equal(bundle.modules.length, 2);
    const savedProfile = JSON.parse(
      bundle.modules.find((m) => m.id === "profile").text,
    );
    assert.equal(savedProfile.inventory["mw4:dmz-cash"], 6209662);
    assert.equal(
      JSON.parse(bundle.modules.find((m) => m.id === "armory").text).workspace
        .acquisition["cronen-osprey"].manualExtractions,
      2,
    );
    await page.locator("#saved-backup-snapshot").selectOption("previous");
    assert.ok(await page.locator("#saved-backup-download").isHidden());
    await page.locator("#saved-backup-preview").click();
    await page
      .locator("#saved-backup-status")
      .filter({ hasText: "Preview ready" })
      .waitFor();
    downloadPromise = page.waitForEvent("download");
    await page.locator("#saved-backup-download").click();
    download = await downloadPromise;
    bundle = JSON.parse(await readFile(await download.path(), "utf8"));
    assert.equal(
      JSON.parse(bundle.modules.find((m) => m.id === "profile").text).inventory[
        "mw4:dmz-cash"
      ],
      7000000000,
    );
    await notice.close();
    assert.deepEqual(
      errors,
      [],
      "new guide surfaces must not throw page errors",
    );
    if (engine === "chromium") {
      // Native map owners retain their own state; exercise shared navigation on all four.
      for (const id of mapWorkflows) {
        const path = featureURL(features.find((f) => f.id === id));
        const start = Date.now();
        await page.goto(base + path);
        await page
          .locator("[data-workspace-tools][data-ready]")
          .waitFor({ timeout: 30000 });
        const m = await menu(page);
        for (const target of mapWorkflows)
          assert.equal(
            await m.locator(`[data-workspace-feature="${target}"]`).count(),
            1,
          );
        await page.keyboard.press("Escape");
        measurements.routes.push({ path, readyMs: Date.now() - start });
      }
    }
    results.push(measurements);
    console.log(
      `${engine}:14-topic help/navigation/keyboard/theme/zoom, quality filters+locked reviews, readonly discovery, search history, confirmed save/stale-tab draft protection/quota, current+previous checked backups PASS`,
    );
  } finally {
    await context.close();
    await browser.close();
  }
}
await writeFile(
  "test-results/105-performance.json",
  JSON.stringify(
    { kind: "local-sitewide-browser-measurements", measurements: results },
    null,
    2,
  ),
);
console.log(
  "Local route/search measurements written to test-results/105-performance.json; not a universal timing guarantee.",
);

await import("./sitewide-review-adverse.mjs");
