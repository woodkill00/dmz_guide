import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium, firefox, webkit } from "playwright";
import { startBrowserServer } from "./server.mjs";
const path = "/armory/camos/";
async function main(browser, base, name) {
  const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
    }),
    page = await context.newPage(),
    errors = [],
    external = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/*", (route) => {
    if (new URL(route.request().url()).origin !== new URL(base).origin) {
      external.push(route.request().url());
      return route.abort();
    }
    return route.continue();
  });
  const weapon = page.locator('[data-overview-weapon="han-86"]'),
    ar = page.locator('[data-overview-class="assault-rifle"]'),
    smg = page.locator('[data-overview-class="smg"]');
  const dot = (id) => weapon.locator(`[data-overview-camo="${id}"]`);
  const metric = (id) =>
    page.locator(`[data-camo-metric="${id}"][data-scope="all"]`);
  try {
    await page.goto(base + path);
    await page.waitForFunction(
      () => document.querySelector("#camo-overview").dataset.busy === "false",
    );
    assert.equal(await page.locator(".camo-class").count(), 9);
    assert.equal(await page.locator("[data-camo-weapon]").count(), 35);
    assert.equal(await page.locator(".camo-class[open]").count(), 0);
    assert.equal(await metric("gold").textContent(), "0 / 35");
    assert.equal(await metric("divergence").textContent(), "0 / 1");
    await ar.locator("summary").click();
    await smg.locator("summary").click();
    assert.equal(await page.locator(".camo-class[open]").count(), 2);
    assert.equal(
      await weapon.locator("[data-overview-camo]:visible").count(),
      15,
    );
    await dot("military-camo-1").focus();
    await page.keyboard.press("Enter");
    assert.equal(
      await dot("military-camo-1").getAttribute("aria-expanded"),
      "true",
    );
    assert.match(
      await weapon.locator(".camo-detail-panel").innerText(),
      /Completed/,
    );
    await weapon.locator("[data-camo-complete]").check();
    await page.waitForFunction(
      () => document.querySelector("#camo-overview").dataset.revision === "1",
    );
    assert.equal(
      await dot("military-camo-1").getAttribute("data-state"),
      "completed",
    );
    assert.match(
      await weapon.locator("[data-overview-weapon-count]").innerText(),
      /^1 \/ 18/,
    );
    await page.reload();
    await page.waitForFunction(
      () => document.querySelector("#camo-overview").dataset.busy === "false",
    );
    await ar.locator("summary").click();
    assert.equal(
      await dot("military-camo-1").getAttribute("data-state"),
      "completed",
    );
    await page.locator("[data-camo-query]").fill("osprey");
    assert.equal(await page.locator("[data-camo-weapon]:visible").count(), 1);
    assert.equal(await metric("gold").textContent(), "0 / 35");
    await page.locator("[data-camo-class]").selectOption("shotgun");
    assert(await page.locator("[data-camo-empty]").isVisible());
    await page.locator('.camo-search button[type="reset"]').click();
    await page.waitForFunction(
      () =>
        document.querySelector("[data-camo-count]").textContent ===
        "35 weapons",
    );
    assert.equal(await ar.getAttribute("open"), "");
    assert.equal(await smg.getAttribute("open"), null);
    const circle = await dot("gold").evaluate((n) => ({
      radius: getComputedStyle(n).borderRadius,
      padding: getComputedStyle(n).padding,
      art: n.querySelector(".camo-tile-image").getBoundingClientRect().width,
    }));
    assert.equal(
      circle.radius,
      "50%",
      "Camo controls must render as circles, not inherited square buttons",
    );
    assert(
      circle.art >= 32 && circle.art <= 42,
      `Camo art must fill its compact control: ${circle.art}`,
    );
    await page.locator('[data-overview-view="prestige"]').click();
    assert.equal(
      await weapon.locator("[data-overview-camo]:visible").count(),
      4,
    );
    await page.locator('[data-overview-view="mastery"]').click();
    assert.equal(
      await weapon.locator("[data-overview-camo]:visible").count(),
      6,
    );
    await page.locator('[data-overview-view="challenges"]').click();
    await dot("divergence").click();
    await weapon.locator("[data-camo-complete]").check();
    await page.waitForFunction(
      () => document.querySelector("#camo-overview").dataset.revision === "2",
    );
    assert.equal(await metric("divergence").textContent(), "1 / 1");
    assert.equal(
      await page
        .locator('[data-overview-camo="divergence"][data-state="completed"]')
        .count(),
      35,
    );
    await page.locator('[data-camo-weapon="han-86"]').click();
    await page.waitForFunction(
      () =>
        document.querySelector('[data-camo-tile="divergence"]').dataset
          .state === "completed",
    );
    await page.locator('[data-camo-tile="divergence"]').click();
    await page.locator('[data-camo-complete="divergence"]').uncheck();
    await page.waitForFunction(
      () => document.querySelector("#camo-tracker").dataset.revision === "3",
    );
    await page.goto(base + path);
    await page.waitForFunction(
      () => document.querySelector("#camo-overview").dataset.busy === "false",
    );
    assert.equal(await metric("divergence").textContent(), "0 / 1");
    await ar.locator("summary").click();
    await dot("gold").click();
    const { default: AxeBuilder } = await import(
      "../../tools/hajin-map/node_modules/@axe-core/playwright/dist/index.mjs"
    );
    for (const theme of ["dark", "light"]) {
      await page.evaluate(
        (t) => (document.documentElement.dataset.theme = t),
        theme,
      );
      const result = await new AxeBuilder({ page }).analyze();
      assert.deepEqual(
        result.violations.map((v) => ({
          id: v.id,
          targets: v.nodes.map((n) => n.target),
        })),
        [],
        `${name} ${theme} axe`,
      );
    }
    await page.evaluate(
      () => (document.documentElement.dataset.theme = "dark"),
    );
    for (const width of [320, 390, 768, 1280, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        `${name} overflow${width}`,
      );
      const sizes = await weapon
        .locator(".camo-dot:visible")
        .evaluateAll((nodes) =>
          nodes.map((n) => n.getBoundingClientRect().width),
        );
      assert(
        sizes.every((s) => s >= 24 && s <= 48),
        `${name} dot sizing${width}`,
      );
    }
    await page.setViewportSize({ width: 768, height: 900 });
    await page.evaluate(
      () => (document.documentElement.style.fontSize = "200%"),
    );
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      "200% overflow",
    );
    await page.evaluate(() => (document.documentElement.style.fontSize = ""));
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.screenshot({
      path: `test-results/camo-overview-${name}.png`,
      fullPage: true,
    });
    assert.deepEqual(errors, []);
    assert.deepEqual(external, []);
    console.log(
      `092 ${name} classes/search15-4-6/shared35vs1/save/reload/detail-sync/geometry/axe PASS`,
    );
  } finally {
    await context.close();
  }
  // Catalog failures must never fabricate an empty private workspace or enable editing.
  for (const kind of ["bad", "large", "stream-large", "drift"]) {
    const c = await browser.newContext(),
      p = await c.newPage();
    try {
      await p.route("**/assets/src/ui/weapon-camos.json", async (route) => {
        if (kind === "bad")
          return route.fulfill({ body: "{}", contentType: "application/json" });
        if (kind === "large")
          return route.fulfill({
            body: "{}",
            headers: { "content-length": "2097153" },
            contentType: "application/json",
          });
        if (kind === "stream-large")
          return route.fulfill({
            body: " ".repeat(2097153),
            contentType: "application/json",
          });
        const response = await route.fetch(),
          json = await response.json();
        json.weapons[0].rows[0].id = "wrong-camo";
        return route.fulfill({ json });
      });
      await p.goto(base + path);
      await p.locator("#camo-save-error").waitFor({ state: "visible" });
      assert.equal(await p.locator("[data-overview-camo]:enabled").count(), 0);
      await p.locator(".camo-class summary").first().click();
      assert(await p.locator("[data-camo-weapon]").first().isVisible());
      const dbs = await p.evaluate(async () =>
        typeof indexedDB.databases === "function"
          ? (await indexedDB.databases()).map((d) => d.name)
          : [],
      );
      assert(!dbs.includes("dmz-armory-local"));
    } finally {
      await c.close();
    }
  }
  const failure = await browser.newContext(),
    fp = await failure.newPage();
  try {
    await fp.goto(base + path);
    await fp.waitForFunction(
      () => document.querySelector("#camo-overview").dataset.busy === "false",
    );
    const section = fp.locator('[data-overview-class="assault-rifle"]'),
      row = fp.locator('[data-overview-weapon="han-86"]');
    await section.locator("summary").click();
    await row.locator('[data-overview-camo="military-camo-1"]').click();
    await fp.evaluate(() => {
      const original = IDBObjectStore.prototype.put;
      window.syntheticRestorePut = () =>
        (IDBObjectStore.prototype.put = original);
      IDBObjectStore.prototype.put = function (...args) {
        if (this.transaction.db.name === "dmz-armory-local")
          throw new DOMException("Synthetic quota", "QuotaExceededError");
        return original.apply(this, args);
      };
    });
    await row.locator("[data-camo-complete]").check();
    await fp
      .locator("#camo-save-error")
      .filter({ hasText: "Unsaved ticks retained" })
      .waitFor();
    assert(!(await row.locator("[data-camo-complete]").isChecked()));
    await fp.evaluate(() => window.syntheticRestorePut());
    await fp.locator("#camo-retry").click();
    await fp.waitForFunction(
      () => document.querySelector("#camo-overview").dataset.revision === "1",
    );
    // Hold a real durable transaction acknowledgement while the user collapses its class.
    await fp.evaluate(() => {
      const d = Object.getOwnPropertyDescriptor(
        IDBTransaction.prototype,
        "oncomplete",
      );
      window.syntheticHold = true;
      window.syntheticRestoreAck = () =>
        Object.defineProperty(IDBTransaction.prototype, "oncomplete", d);
      Object.defineProperty(IDBTransaction.prototype, "oncomplete", {
        ...d,
        set(handler) {
          const tx = this;
          d.set.call(tx, function (event) {
            if (
              tx.db.name === "dmz-armory-local" &&
              tx.mode === "readwrite" &&
              window.syntheticHold
            ) {
              window.syntheticHold = false;
              window.syntheticReleaseAck = () => handler.call(tx, event);
            } else handler.call(tx, event);
          });
        },
      });
    });
    await row.locator('[data-overview-camo="military-camo-2"]').click();
    await row.locator("[data-camo-complete]").check();
    await fp.waitForFunction(
      () => typeof window.syntheticReleaseAck === "function",
    );
    await section.locator("summary").click();
    await fp.evaluate(() => window.syntheticReleaseAck());
    await fp.waitForFunction(
      () => document.querySelector("#camo-overview").dataset.revision === "2",
    );
    assert.equal(await section.getAttribute("open"), null);
    assert(
      await section
        .locator("summary")
        .evaluate((n) => document.activeElement === n),
      "Late save must preserve collapsed-summary focus",
    );
    await fp.evaluate(() => window.syntheticRestoreAck());
    console.log(
      `092 ${name} overview quota rollback/retry and late-ack collapsed focus PASS`,
    );
  } finally {
    await failure.close();
  }
  const nojs = await browser.newContext({ javaScriptEnabled: false });
  try {
    const p = await nojs.newPage();
    await p.goto(base + path);
    await p.locator(".camo-class summary").first().click();
    assert(await p.locator("[data-camo-weapon]").first().isVisible());
    assert.equal(await p.locator("[data-camo-weapon]").count(), 35);
  } finally {
    await nojs.close();
  }
  console.log(
    `092 ${name} malformed/oversize/drift failclosed and noJS links PASS`,
  );
}
await mkdir("test-results", { recursive: true });
const server = await startBrowserServer();
try {
  for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
    const b = await engine.launch();
    try {
      await main(b, server.base, name);
    } finally {
      await b.close();
    }
  }
} finally {
  await server.stop();
}
