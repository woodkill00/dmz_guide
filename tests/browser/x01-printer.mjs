import { revealTrackerControl } from "./tracker-controls.mjs";
import assert from "node:assert/strict";
import { chromium, firefox, webkit } from "playwright";
import { mkdir } from "node:fs/promises";
const engine = { chromium, firefox, webkit }[process.env.BROWSER || "chromium"],
  browser = await engine.launch(),
  context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  }),
  page = await context.newPage(),
  base = process.env.TEST_BASE || "http://127.0.0.1:4173";
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
const ready = () =>
  page.waitForFunction(
    () => document.querySelector("main")?.getAttribute("aria-busy") === "false",
  );
try {
  await mkdir(".local/x01/screenshots", { recursive: true });
  await page.goto(base + "/inventory/?pack=official%3Amw4-dmz-starter");
  await ready();
  await page.evaluate(async () => {
    const { state } = await import("/assets/src/client/common.mjs"),
      { newProfile } = await import("/assets/src/domain/profile.mjs"),
      { saveProfile } = await import("/assets/src/storage/store.mjs");
    const p = newProfile(state.pack);
    p.inventory["mw4:dmz-cash"] = 321;
    p.inventory["mw4:ingredient-military-composites"] = 7;
    await saveProfile(p, 0);
  });
  const saved = () =>
    page.evaluate(
      async () =>
        (
          await (
            await import("/assets/src/storage/store.mjs")
          ).loadProfile("official:mw4-dmz-starter")
        ).value,
    );
  const original = await saved();
  await page.goto(base + "/recipes/");
  await page
    .getByRole("link", { name: "X01 in-raid printer · separate recipes" })
    .click();
  await page.locator("#x01-printing").waitFor();
  assert.equal(new URL(page.url()).pathname, "/recipes/x01/");
  assert.equal(await page.locator("[data-x01-recipe]").count(), 9);
  assert.equal(await page.locator("#x01-printing button").count(), 0);
  assert.match(await page.locator("#x01-printing").innerText(), /backpack/);
  assert.match(
    await page.locator("#x01-printing").innerText(),
    /Separate from the FOB/,
  );
  assert.equal(await page.locator(".x01-recipe-group").count(), 5);
  const exp = page.locator(
    '[data-x01-recipe="mw4:ingredient-experimental-compounds"]',
  );
  assert.match(await exp.innerText(), /2.*Volatile Explosives/s);
  assert.match(await exp.innerText(), /5.*Binding Catalysts/s);
  await page.getByText("Printer location", { exact: true }).click();
  assert.match(
    await page.locator("#x01-printing").innerText(),
    /Production Assembly/,
  );
  assert.match(
    await page.locator("#x01-printing").innerText(),
    /north-side stairs/,
  );
  if (engine.name() !== "webkit")
    await page.screenshot({
      path: ".local/x01/screenshots/desktop-" + engine.name() + ".png",
      fullPage: true,
      caret: "initial",
    });
  const materialLink = exp.getByRole("link", {
    name: "Experimental Compounds",
    exact: true,
  });
  await materialLink.click();
  await page
    .getByRole("link", { name: "X01 printer recipes and uses" })
    .waitFor();
  await page
    .getByRole("link", { name: "X01 printer recipes and uses" })
    .click();
  assert.equal(await page.locator("[data-x01-recipe]").count(), 9);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  if (engine.name() !== "webkit")
    await page.screenshot({
      path: ".local/x01/screenshots/mobile-" + engine.name() + ".png",
      fullPage: true,
      caret: "initial",
    });
  assert.deepEqual(await saved(), original);
  await page.goto(
    base + "/collection/?pack=official%3Amw4-dmz-starter#x01-printing",
  );
  await ready();
  assert.equal(
    await page.locator("#x01-printing [data-x01-recipe]").count(),
    9,
  );
  assert.equal(await page.locator("#x01-printing [data-craft-id]").count(), 0);
  await page.waitForFunction(
    () =>
      document.querySelectorAll("#recipe-list [data-recipe-item]").length > 0,
  );
  assert.equal(
    await page.evaluate(
      async () =>
        (await import("/assets/src/client/common.mjs")).state.pack.recipes
          .length,
    ),
    95,
  );
  assert.equal(
    await page.locator('#recipe-list [data-recipe-item^="mw4:x01"]').count(),
    0,
  );
  assert.deepEqual(await saved(), original);
  await page.goto(base + "/needed/?pack=official%3Amw4-dmz-starter");
  await ready();
  await revealTrackerControl(page, 'a[href="/recipes/x01/"]');
  await page
    .getByRole("link", { name: "X01 in-raid printer", exact: true })
    .click();
  assert.equal(await page.locator("[data-x01-recipe]").count(), 9);
  assert.deepEqual(errors, []);
  console.log(
    "PASS: all nine X01 recipes, grouped costs/location/source links, related item navigation, Collection separation, no craft controls or FOB inclusion, unchanged saved inventory, 390px layout and clean browser console.",
  );
} finally {
  await context.close();
  await browser.close();
}
