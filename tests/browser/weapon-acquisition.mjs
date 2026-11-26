import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runUnifiedWeaponsTests } from "./unified-weapons.mjs";
const ready = (page) =>
  page.waitForSelector(
    'main[data-armory-ready="true"][data-armory-busy="false"]',
  );
export async function runWeaponAcquisitionTests(options) {
  // The consolidated journey owns the former acquisition-page interactions.
  // Domain catalog/normalization/backup admission remains in runtime tests.
  await runUnifiedWeaponsTests(options);
  const { browser, base } = options;
  const context = await browser.newContext(),
    p = await context.newPage();
  try {
    await p.goto(base + "/armory/m4/");
    await ready(p);
    assert.equal(
      await p.locator("#weapon-extraction-count").textContent(),
      "Not recorded / 3",
    );
    for (const value of ["0", "9999"]) {
      await p.locator("#weapon-extractions [name=count]").fill(value);
      await p.locator("#weapon-extractions button[type=submit]").click();
      await p.waitForFunction(
        (v) =>
          document.querySelector("#weapon-extraction-count").textContent ===
            v + " / 3" &&
          document.querySelector("main").dataset.armoryBusy === "false",
        value,
      );
    }
    await p.locator('[data-extraction-step="1"]').click();
    await p.waitForFunction(() =>
      /0 to 9999/.test(document.querySelector("#armory-error").textContent),
    );
    const before = await p.evaluate(
      async () =>
        (
          await (
            await import("/assets/src/storage/armory-store.mjs")
          ).readArmory()
        ).value,
    );
    assert.equal(before.acquisition.m4.manualExtractions, 9999);
    await p.locator("#weapon-extractions [name=count]").fill("2");
    await p.locator("#tracker-manual").check();
    await p.waitForFunction(
      () => document.querySelector("main").dataset.armoryBusy === "false",
    );
    assert.equal(
      await p.locator("#weapon-extractions [name=count]").inputValue(),
      "2",
      "Auto-save retains the typed count correction",
    );
    await p.locator('[data-extraction-step="1"]').click();
    await p.waitForFunction(
      () =>
        document.querySelector("#weapon-extraction-count").textContent ===
        "3 / 3",
    );
    const current = await p.evaluate(
      async () =>
        (
          await (
            await import("/assets/src/storage/armory-store.mjs")
          ).readArmory()
        ).value,
    );
    assert.equal(current.acquisition.m4.manualExtractions, 3);
    await p.evaluate(async () => {
      await new Promise((resolve, reject) => {
        const request = indexedDB.open("dmz-armory-local", 1);
        request.onsuccess = () => {
          const db = request.result,
            tx = db.transaction("workspace", "readwrite");
          tx.objectStore("workspace").put(
            { bad: "Synthetic corrupt envelope" },
            "main",
          );
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      });
    });
    await p.reload();
    await p.waitForFunction(
      () => document.querySelector("#armory-error").textContent.length > 0,
    );
    assert(await p.locator("#tracker-manual").isDisabled());
    await p.locator('.weapon-workspace-tabs a[href="#backups"]').click();
    const [file] = await Promise.all([
      p.waitForEvent("download"),
      p.locator("#workspace-export").click(),
    ]);
    assert.equal(
      JSON.parse(await readFile(await file.path(), "utf8")).workspace.bad,
      "Synthetic corrupt envelope",
    );
    const raw = await p.evaluate(
      async () =>
        (
          await (
            await import("/assets/src/storage/summary-read.mjs")
          ).readExistingRecord("dmz-armory-local", "workspace", "main")
        ).bad,
    );
    assert.equal(raw, "Synthetic corrupt envelope");
    console.log(
      "108 acquisition boundary PASS: unknown/zero/9999, no replay, correction retention, corrupt record blocked and exportable",
    );
  } finally {
    await context.close();
  }
  const denied = await browser.newContext();
  try {
    await denied.addInitScript(() =>
      Object.defineProperty(window, "indexedDB", { value: undefined }),
    );
    const page = await denied.newPage();
    await page.goto(base + "/armory/m4/#reference");
    await page.waitForFunction(() =>
      /storage.*unavailable/i.test(
        document.querySelector("#armory-error").textContent,
      ),
    );
    assert(await page.locator("#tracker-manual").isDisabled());
    assert(await page.locator("#reference").isVisible());
    await page.locator("#weapon-intel").scrollIntoViewIfNeeded();
    assert.match(
      await page.locator("#reference").innerText(),
      /Official launch sheet/,
    );
    console.log(
      "108 denied storage PASS: public reference remains readable and all private writes disabled",
    );
  } finally {
    await denied.close();
  }
}
