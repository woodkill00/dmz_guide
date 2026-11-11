import assert from "node:assert/strict";
import { chromium, firefox, webkit } from "playwright";
import { mkdir, readFile } from "node:fs/promises";
const engine = process.env.BROWSER || "chromium",
  b = await { chromium, firefox, webkit }[engine].launch(),
  p = await b.newPage(),
  errors = [];
p.on("pageerror", (e) => errors.push(e.message));
const ready = async () => {
  await p.waitForFunction(
    () => document.querySelector("main")?.getAttribute("aria-busy") === "false",
  );
  await p.waitForLoadState("networkidle");
};
try {
  for (const path of [
    "local/?pack=official%3Amw4-dmz-starter&id=mw4%3Aingredient-ballistic-fabric",
    "inventory/?pack=official%3Amw4-dmz-starter",
    "settings/?pack=official%3Amw4-dmz-starter",
    "quick-collect/?pack=official%3Amw4-dmz-starter",
  ]) {
    await p.goto("http://127.0.0.1:4173/" + path);
    await ready();
    const context = p.locator(".catalog-context");
    assert.equal(await context.count(), 1);
    assert(!(await context.evaluate((n) => n.open)));
    assert.equal(
      await context.locator(":scope > summary").innerText(),
      "Data & backup",
    );
    assert(!(await p.locator("#pack-note").isVisible()));
    assert(!(await p.locator("#pack-select").isVisible()));
    await p.waitForFunction(
      () =>
        document.querySelector("#save-status")?.dataset.catalogClean === "true",
    );
    assert((await p.locator("#save-status").boundingBox()).width <= 1);
    await p.evaluate(async () => {
      const { status } = await import("/assets/src/client/common.mjs");
      status("Unsaved test changes remain. Export before reload.");
    });
    await p.waitForFunction(
      () =>
        document.querySelector("#save-status")?.dataset.catalogClean ===
        "false",
    );
    assert((await p.locator("#save-status").boundingBox()).width > 100);
    await p.evaluate(async () => {
      const { status } = await import("/assets/src/client/common.mjs");
      status("Saved locally · no account or sync");
    });
    await context.locator(":scope > summary").click();
    assert(await p.locator("#pack-select").isVisible());
    const coverage = p
      .locator("#pack-note")
      .locator("xpath=ancestor::details[1]");
    await coverage.locator(":scope > summary").click();
    assert(await p.locator("#pack-note").isVisible());
    const backup = p.locator("#export-current-profile");
    if (await backup.count()) {
      const downloaded = p.waitForEvent("download");
      await backup.click();
      const file = await downloaded;
      const profile = JSON.parse(await readFile(await file.path(), "utf8"));
      assert.equal(profile.packId, "official:mw4-dmz-starter");
    }
    for (const width of [1440, 390, 320]) {
      await p.setViewportSize({ width, height: 1000 });
      const box = await context.boundingBox();
      assert(
        box.width <= 514 && box.height <= 322,
        "Advanced context stays bounded",
      );
      assert(
        await p.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      );
    }
  }
  await p.goto(
    "http://127.0.0.1:4173/inventory/?pack=official%3Amw4-dmz-starter",
  );
  await ready();
  const context = p.locator(".catalog-context");
  await context.locator(":scope > summary").click();
  await p.locator("#inventory-query").fill("Bandage");
  const owned = p.locator(
    '[data-inventory-item="mw4:bandage"] input[data-field="inventory"]',
  );
  await owned.scrollIntoViewIfNeeded();
  const originalValue = await owned.inputValue();
  const beforeEdit = await owned.boundingBox();
  await owned.fill("2");
  await p.waitForFunction(() =>
    document
      .querySelector("[data-tracker-context-label]")
      ?.textContent.includes("Unsaved edits"),
  );
  const afterEdit = await owned.boundingBox();
  assert(
    Math.abs(afterEdit.y - beforeEdit.y) <= 1,
    "Typing must not shift the inventory control",
  );
  const fixture = await p
    .locator("#pack-select option")
    .evaluateAll(
      (options) => options.find((o) => /FICTIONAL/.test(o.textContent)).value,
    );
  for (const value of ["3", originalValue, "2"]) {
    await owned.fill(value);
    await p.waitForFunction(
      () =>
        document.querySelector("#save-status")?.dataset.catalogQuiet === "true",
    );
    assert(
      Math.abs((await owned.boundingBox()).y - beforeEdit.y) <= 1,
      "Repeated edits and reverting to saved values must stay in place",
    );
  }
  await p.locator("#pack-select").selectOption(fixture);
  await p.locator("#draft-navigation:visible").waitFor();
  await p.locator("#draft-stay").click();
  assert.equal(
    await p.locator("#pack-select").inputValue(),
    "official:mw4-dmz-starter",
  );
  assert.equal(await owned.inputValue(), "2");
  await p
    .getByRole("button", { name: "Cancel inventory edits", exact: true })
    .click();
  await p.waitForFunction(
    () =>
      document.querySelector(".inventory-save-bar")?.dataset.dirty === "false",
  );
  await p.waitForLoadState("networkidle");
  await p.locator("#pack-select").selectOption(fixture);
  await ready();
  await p.waitForFunction(() =>
    document
      .querySelector("[data-tracker-context-label]")
      ?.textContent.includes("not game facts"),
  );
  await context.locator(":scope > summary").click();
  assert(!(await context.evaluate((n) => n.open)));
  assert(
    (await context.locator(":scope > summary").innerText()).includes(
      "Test data",
    ),
  );
  await mkdir(".local/item-icons/catalog-context", { recursive: true });
  await p.screenshot({
    path: `.local/item-icons/catalog-context/${engine}.png`,
  });
  await p.goto(
    "http://127.0.0.1:4173/local/?pack=missing%3Aunavailable&id=mw4%3Abandage",
  );
  await ready();
  assert(await p.locator("#error").isVisible());
  assert(await p.locator(".catalog-context").evaluate((n) => n.open));
  assert.equal(await p.locator("#pack-select").inputValue(), "");
  assert.deepEqual(errors, []);
  console.log(
    "PASS compact context on local/inventory/settings/quick collect; advanced coverage, visible unsaved status, dirty switch protection, fixture label and 320–1440px: " +
      engine,
  );
} finally {
  await b.close();
}
