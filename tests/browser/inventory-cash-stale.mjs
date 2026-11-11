import assert from "node:assert/strict";
import { chromium, firefox, webkit } from "playwright";
const engine = { chromium, firefox, webkit }[process.env.BROWSER || "chromium"];
assert(engine, "Unsupported test browser");
const browser = await engine.launch();
const context = await browser.newContext();
const page = await context.newPage();
const base = process.env.TEST_BASE || "http://127.0.0.1:4173",
  cash = "mw4:dmz-cash",
  id = "official:mw4-dmz-starter";
const ready = () =>
  page.waitForFunction(
    () => document.querySelector("main")?.getAttribute("aria-busy") === "false",
  );
try {
  await page.goto(base + "/inventory/?pack=" + encodeURIComponent(id));
  await ready();
  await page.evaluate(async () => {
    const { state } = await import("/assets/src/client/common.mjs"),
      { newProfile } = await import("/assets/src/domain/profile.mjs"),
      { saveProfile } = await import("/assets/src/storage/store.mjs");
    const p = newProfile({ ...state.pack, schemaVersion: 1 });
    p.inventory["mw4:dmz-cash"] = 42;
    await saveProfile(p, 0);
  });
  await page.reload();
  await ready();
  await page.locator("#inventory-query").fill("cash");
  const input = page.locator(`[data-field="inventory"][data-id="${cash}"]`);
  await input.fill("1333601");
  await page
    .getByRole("button", { name: "Save inventory", exact: true })
    .click();
  await page.locator("#currency-format-confirm").waitFor({ state: "visible" });
  // A superseding in-memory revision invalidates the staged candidate before persistence.
  await page.evaluate(async () => {
    const { state } = await import("/assets/src/client/common.mjs");
    state.revision++;
  });
  await page.locator("#confirm-currency-format").click();
  await page.locator("#currency-format-confirm").waitFor({ state: "detached" });
  assert.match(await page.locator("#error").innerText(), /changed/);
  assert.equal(await input.inputValue(), "1333601");
  await page.evaluate(async () => {
    const { state } = await import("/assets/src/client/common.mjs");
    state.revision--;
  });
  await page
    .getByRole("button", { name: "Save inventory", exact: true })
    .click();
  await page.locator("#currency-format-confirm").waitFor({ state: "visible" });
  // A separate durable save wins CAS. Confirmation must preserve the draft, not overwrite it.
  await page.evaluate(async () => {
    const store = await import("/assets/src/storage/store.mjs");
    const record = await store.loadProfile("official:mw4-dmz-starter");
    record.value.inventory["mw4:dmz-cash"] = 99;
    await store.saveProfile(record.value, record.value.revision);
  });
  await page.locator("#confirm-currency-format").click();
  await page.waitForFunction(() =>
    document
      .querySelector('#currency-format-confirm [role="alert"]')
      ?.textContent.includes("not confirmed"),
  );
  assert.equal(await input.inputValue(), "1333601");
  assert.equal(
    await page.evaluate(
      async () =>
        (
          await (
            await import("/assets/src/storage/store.mjs")
          ).loadProfile("official:mw4-dmz-starter")
        ).value.inventory["mw4:dmz-cash"],
    ),
    99,
  );
  await page.locator("#cancel-currency-format").click();
  assert.equal(await input.inputValue(), "1333601");
  console.log(
    "PASS: staged-revision invalidation and durable CAS conflict do not overwrite newer stock or discard cash draft.",
  );
} finally {
  await context.close();
  await browser.close();
}
