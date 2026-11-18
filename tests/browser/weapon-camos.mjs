import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, firefox, webkit } from "playwright";
import { startBrowserServer } from "./server.mjs";
export async function runWeaponCamoTests({ browser, base, name = "chromium" }) {
  const localArtwork = await readFile(
    new URL(
      "../../.local/camo-images/han-86--military-camo-1.webp",
      import.meta.url,
    ),
  ).then(
    () => true,
    () => false,
  );
  const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
    }),
    page = await context.newPage(),
    errors = [],
    external = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/*", (route) => {
    if (new URL(route.request().url()).origin !== new URL(base).origin) {
      external.push(route.request().url());
      return route.abort();
    }
    return route.continue();
  });
  try {
    await page.goto(base + "/dmz-weapons/");
    await page.locator('main a[href="/armory/camos/"]').click();
    assert.equal(await page.locator("[data-camo-weapon]").count(), 35);
    await page.locator("[data-camo-query]").fill("osprey");
    await page.waitForFunction(
      () =>
        document.querySelector("[data-camo-count]").textContent === "1 weapons",
    );
    assert.equal(await page.locator("[data-camo-weapon]:visible").count(), 1);
    await page.locator("[data-camo-class]").selectOption("shotgun");
    await page.waitForFunction(
      () => !document.querySelector("[data-camo-empty]").hidden,
    );
    assert(await page.locator("[data-camo-empty]").isVisible());
    await page.locator('.camo-search button[type="reset"]').click();
    await page.waitForFunction(
      () =>
        document.querySelector("[data-camo-count]").textContent ===
        "35 weapons",
    );
    assert.equal(await page.locator("[data-camo-weapon]:visible").count(), 35);
    const saved = await page.evaluate(async () => {
      localStorage.setItem(
        "camo-preservation-fixture",
        "Synthetic private preference",
      );
      const { emptyArmory } = await import(
        "/assets/src/domain/armory-workspace.mjs"
      );
      const { saveArmory, readArmory } = await import(
        "/assets/src/storage/armory-store.mjs"
      );
      const workspace = emptyArmory();
      workspace.acquisition = {
        "han-86": {
          manual: true,
          manualExtractions: 2,
          attachments: [],
          blueprints: ["Synthetic test blueprint"],
        },
      };
      await saveArmory(workspace, 0);
      return JSON.stringify((await readArmory()).value);
    });
    await page.locator('[data-camo-weapon="han-86"]').click();
    await page.locator("[data-camo-row]").first().waitFor();
    const variant = await page.evaluate(
      () =>
        document
          .querySelector("[data-ui-variant]")
          ?.getAttribute("data-ui-variant") || "classic",
    );
    await page.screenshot({
      path: `test-results/camos-${name}-${variant}-top.png`,
    });
    assert.equal(await page.locator("[data-camo-row]").count(), 25);
    assert.equal(await page.locator(".camo-group").count(), 5);
    await page.locator(".camo-guidance").first().locator("summary").click();
    assert.match(await page.locator("main").innerText(), /33 Platinum/);
    assert.match(await page.locator("#gold").innerText(), /100 Enemy Kills/);
    const firstGroup = page.locator(".camo-group").first();
    await firstGroup.locator("summary").focus();
    await page.keyboard.press("Enter");
    assert.equal(await page.locator(".camo-group[open]").count(), 4);
    await page.keyboard.press("Enter");
    assert.equal(await page.locator(".camo-group[open]").count(), 5);
    if (localArtwork)
      await page.waitForFunction(() => {
        const img = document.querySelector("[data-camo-image]");
        return img.complete && img.naturalWidth === 128;
      });
    else
      await page.waitForFunction(() =>
        document
          .querySelector(".camo-swatch")
          .classList.contains("camo-art-missing"),
      );
    if (
      localArtwork &&
      name === "chromium" &&
      process.argv.includes("--all-images")
    ) {
      const catalog = JSON.parse(
        await readFile(
          new URL("../../src/ui/weapon-camos.json", import.meta.url),
          "utf8",
        ),
      );
      const urls = catalog.weapons.flatMap((w) =>
        w.rows.map((r) => `/local-camo-images/${w.id}/${r.id}.webp`),
      );
      const decoded = await page.evaluate(async (urls) => {
        const queue = [...urls];
        let count = 0;
        await Promise.all(
          Array.from({ length: 4 }, async () => {
            while (queue.length) {
              const url = queue.shift(),
                image = new Image();
              image.src = url;
              await image.decode();
              if (image.naturalWidth !== 128 || image.naturalHeight !== 128)
                throw Error("Bad dimensions " + url);
              count++;
            }
          }),
        );
        return count;
      }, urls);
      assert.equal(decoded, 875);
      console.log("089 decoded875 real local camo swatches PASS");
    }
    for (const width of [320, 390, 768, 1280, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        name + " overflow " + width,
      );
    }
    await page.setViewportSize({ width: 320, height: 900 });
    await page.evaluate(
      () => (document.documentElement.style.fontSize = "200%"),
    );
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      name + " 200% overflow",
    );
    await page.evaluate(() => (document.documentElement.style.fontSize = ""));
    await page.setViewportSize({ width: 1280, height: 900 });
    const military = page.locator(".camo-group").nth(0),
      special = page.locator(".camo-group").nth(1);
    await military.locator("summary").focus();
    await page.keyboard.press("Enter");
    assert(
      !(await military.getAttribute("open")) &&
        (await special.getAttribute("open")) !== null,
    );
    await page.keyboard.press("Enter");
    const cached =
      (await readFile(
        new URL(
          "../../.local/camo-images/han-86--military-camo-1.webp",
          import.meta.url,
        ),
      ).catch(() => null)) !== null;
    if (cached) {
      const img = page.locator('[data-camo-row="military-camo-1"] img');
      await img.scrollIntoViewIfNeeded();
      await page.waitForFunction(
        () =>
          document.querySelector('[data-camo-row="military-camo-1"] img')
            .naturalWidth === 128,
      );
      const response = await context.request.get(
        base + "/local-camo-images/han-86/military-camo-1.webp",
      );
      assert.equal(response.status(), 200);
      assert.equal(response.headers()["x-content-type-options"], "nosniff");
    }
    for (const width of [320, 390, 768, 1280, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        "camo overflow " + width,
      );
    }
    await page.setViewportSize({ width: 320, height: 900 });
    await page.evaluate(
      () => (document.documentElement.style.fontSize = "200%"),
    );
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      "200% camo overflow",
    );
    await page.evaluate(() => (document.documentElement.style.fontSize = ""));
    await page.setViewportSize({ width: 1280, height: 900 });
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
        name + " " + theme + " axe",
      );
    }
    await page.evaluate(
      () => (document.documentElement.dataset.theme = "dark"),
    );
    await page.screenshot({
      path: `test-results/camos-${name}-${variant}.png`,
      fullPage: false,
    });
    await page.route("**/local-camo-images/**", (route) =>
      route.fulfill({ status: 404, body: "Synthetic missing image" }),
    );
    await page.reload();
    await page
      .locator(".camo-swatch")
      .first()
      .scrollIntoViewIfNeeded()
      .catch(() => {});
    await page.waitForFunction(() =>
      document
        .querySelector(".camo-swatch")
        .classList.contains("camo-art-missing"),
    );
    assert(await page.locator(".camo-image-fallback").first().isVisible());
    assert.equal(await page.locator("[data-camo-row]").count(), 25);
    await page.locator('main a[href="/armory/han-86/"]').click();
    await page.locator('main a[href="/armory/camos/han-86/"]').click();
    await page.goto(base + "/armory/camos/cronen-osprey/");
    assert.equal(await page.locator("[data-camo-row]").count(), 25);
    assert.equal(
      await page.locator('main a[href="/armory/cronen-osprey/"]').count(),
      0,
    );
    const after = await page.evaluate(async () => {
      const { readArmory } = await import(
        "/assets/src/storage/armory-store.mjs"
      );
      return {
        saved: JSON.stringify((await readArmory()).value),
        preference: localStorage.getItem("camo-preservation-fixture"),
      };
    });
    assert.equal(after.saved, saved);
    assert.equal(after.preference, "Synthetic private preference");
    assert.deepEqual(errors, []);
    assert.deepEqual(external, []);
    console.log(
      `089 ${name}:35directory/25detail,filters,keyboard,5sizes,200%text,dark/light axe,localart/fallback,navigation,private preservation PASS; artwork ${cached ? "verified" : "absent fallback"}`,
    );
  } finally {
    await context.close();
  }
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  await mkdir("test-results", { recursive: true });
  const server = await startBrowserServer();
  try {
    for (const [name, engine] of Object.entries({
      chromium,
      firefox,
      webkit,
    })) {
      const browser = await engine.launch();
      try {
        await runWeaponCamoTests({ browser, base: server.base, name });
      } finally {
        await browser.close();
      }
    }
  } finally {
    await server.stop();
  }
}
