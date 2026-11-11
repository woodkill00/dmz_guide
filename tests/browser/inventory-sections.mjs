import { revealTrackerControl } from "./tracker-controls.mjs";
import assert from "node:assert/strict";
import { chromium, firefox, webkit } from "playwright";
const engine = { chromium, firefox, webkit }[process.env.BROWSER || "chromium"];
const browser = await engine.launch();
const context = await browser.newContext({
  viewport: { width: 1280, height: 900 },
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
const ready = () =>
  page.waitForFunction(
    () => document.querySelector("main")?.getAttribute("aria-busy") === "false",
  );
const family = (name) => page.locator(`[data-inventory-category="${name}"]`);
const type = (name) => page.locator(`[data-inventory-group="${name}"]`);
const field = (id) => page.locator(`[data-field="inventory"][data-id="${id}"]`);
try {
  await page.goto(
    (process.env.TEST_BASE || "http://127.0.0.1:4173") +
      "/inventory/?pack=official%3Amw4-dmz-starter",
  );
  await ready();
  assert.equal(await type("smg").count(), 1);
  assert.equal(await type("Resources").count(), 1);
  const smgs = page.locator(".inventory-group").filter({ has: type("smg") });
  assert.equal(await smgs.locator("[data-inventory-item]").count(), 0);
  await smgs.locator("[data-inventory-page-for]").click();
  assert((await smgs.locator("[data-inventory-item]").count()) > 0);
  assert((await page.locator("[data-inventory-item]").count()) <= 50);
  await page.locator("#inventory-query").fill("M4");
  await family("Weapons").waitFor({ state: "visible" });
  assert.equal(
    await type("assault-rifle")
      .innerText()
      .then((s) => s.startsWith("Assault rifles")),
    true,
  );
  await field("mw4:m4").fill("0007");
  const original = await field("mw4:m4").elementHandle();
  await type("assault-rifle").click();
  assert.equal(await field("mw4:m4").isVisible(), false);
  await family("Weapons").click();
  assert.equal(await type("assault-rifle").isVisible(), false);
  await family("Weapons").focus();
  await page.keyboard.press("Enter");
  assert.equal(
    await type("assault-rifle").getAttribute("aria-expanded"),
    "false",
  );
  await type("assault-rifle").click();
  assert.equal(await field("mw4:m4").inputValue(), "0007");
  assert(await original.evaluate((n) => n.isConnected));
  await page.locator("#inventory-collapse").click();
  assert.equal(await family("Weapons").getAttribute("aria-expanded"), "false");
  await page.locator("#inventory-expand").click();
  assert.equal(
    await type("assault-rifle").getAttribute("aria-expanded"),
    "true",
  );
  assert.equal(await field("mw4:m4").inputValue(), "0007");
  await page.locator("#inventory-query").fill("");
  await page.locator("#inventory-section").selectOption("Ingredients");
  assert.equal(await page.locator(".inventory-category").count(), 1);
  assert.equal(await family("Materials").count(), 1);
  assert.equal(await type("Ingredients").count(), 1);
  assert.equal(await page.locator("[data-inventory-item]").count(), 31);
  assert.equal(await field("mw4:x01-specter-fabric-sample").count(), 1);
  assert.equal(await field("mw4:x01-sr-16-bio-agent-sample").count(), 1);
  const item = await page
    .locator("[data-inventory-item]")
    .first()
    .getAttribute("data-inventory-item");
  await field(item).fill("-1");
  await type("Ingredients").click();
  await family("Materials").click();
  await page
    .getByRole("button", { name: "Save inventory", exact: true })
    .click();
  await page.waitForFunction(
    (id) => document.activeElement?.dataset.id === id,
    item,
  );
  assert.equal(await family("Materials").getAttribute("aria-expanded"), "true");
  assert.equal(await type("Ingredients").getAttribute("aria-expanded"), "true");
  assert.equal(await field(item).inputValue(), "-1");
  await field(item).fill("3");
  await page.locator("#inventory-query").fill("M4");
  assert.equal(await field("mw4:m4").inputValue(), "0007");
  await page.locator("#inventory-query").fill("");
  await page.setViewportSize({ width: 390, height: 844 });
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.locator("#inventory-collapse").click();
  const buttons = await page.locator("[data-inventory-category]").all();
  for (const button of buttons) {
    const r = await button.boundingBox();
    assert(r.width > 0 && r.height >= 44);
  }
  await page.locator("#inventory-expand").click();
  // Distinct kinds with the same type label must never share a subgroup identity.
  await page.locator("#cancel-inventory").click();
  await page.waitForFunction(
    async () =>
      !(await import("/assets/src/client/common.mjs")).hasUnsavedDraft(),
  );
  await revealTrackerControl(page, "#pack-select");
  await page.locator("#pack-select").selectOption("demo:training-pack");
  await ready();
  await page.evaluate(async () => {
    const { state } = await import("/assets/src/client/common.mjs"),
      { commitRecord } = await import("/assets/src/storage/store.mjs");
    const p = structuredClone(state.pack);
    const weapon = p.items.find((i) => i.kind === "weapon"),
      item = p.items.find((i) => i.kind === "item");
    weapon.category = item.category = "Equipment";
    p.contentVersion += "-nested-qa";
    await commitRecord("content", p.id, { pack: p, revision: 0 }, 0);
  });
  await page.reload();
  await ready();
  const copies = page.locator('[data-inventory-group="Equipment"]');
  assert.equal(await copies.count(), 2);
  assert.notEqual(
    await copies.nth(0).getAttribute("data-inventory-group-key"),
    await copies.nth(1).getAttribute("data-inventory-group-key"),
  );
  await copies.nth(0).click();
  assert.equal(await copies.nth(1).getAttribute("aria-expanded"), "true");
  assert.deepEqual(errors, []);
  console.log(
    "PASS: nested categories/types, weapon labels, independent collapse, same DOM/raw quantity preservation, expand/collapse all, filter retention, hidden-invalid recovery, keyboard, mobile targets/overflow and identical-label isolation.",
  );
} finally {
  await context.close();
  await browser.close();
}
