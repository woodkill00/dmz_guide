import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { readWeaponIntel } from "../../src/content/weapon-intel.mjs";
const db = await readWeaponIntel();
async function revision(page) {
  return page.evaluate(
    async () =>
      (
        await (
          await import("/assets/src/storage/armory-store.mjs")
        ).readArmory()
      ).value.revision,
  );
}
async function waitRevision(page, value) {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    const saved = await revision(page);
    const ui = await page.locator("main").evaluate((el) => ({
      busy: el.dataset.armoryBusy,
      revision: Number(el.dataset.armoryRevision),
    }));
    if (saved === value && ui.busy === "false" && ui.revision === value) return;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  assert.equal(
    await revision(page),
    value,
    "Expected committed private revision",
  );
  assert.fail("Private UI did not finish rendering the committed revision");
}
async function backup(page) {
  return page.evaluate(
    async () =>
      (
        await (
          await import("/assets/src/storage/armory-store.mjs")
        ).readArmory()
      ).value,
  );
}
async function tab(page, id) {
  await page.locator(`.armory-tabs a[href="#${id}"]`).click();
  await page.waitForFunction((id) => !document.getElementById(id).hidden, id);
}
export async function runArmoryWorkbenchTests({
  browser,
  base,
  captureScreenshots = false,
}) {
  const context = await browser.newContext(),
    page = await context.newPage();
  try {
    await page.goto(base + "/armory/workbench/");
    await page.waitForFunction(
      () => document.querySelector("main").dataset.armoryReady === "true",
    );
    await page.locator("#compare-mode").selectOption("launch");
    assert.match(await page.locator("#comparison-result").innerText(), /740/);
    await tab(page, "builder");
    assert.match(
      await page.locator("#build-validation").innerText(),
      /Legal planning template/,
    );
    await page.locator("#build-form [name=name]").fill("Synthetic QA build");
    await page.locator('[data-build-slot="muzzle"]').selectOption("fss-is300");
    assert.match(await page.locator("#build-advice").innerText(), /tradeoff/);
    await page.getByRole("button", { name: "Save build", exact: true }).click();
    await waitRevision(page, 1);
    assert.match(
      await page.locator("#build-validation").innerText(),
      /Legal planning template/,
    );
    assert.equal((await backup(page)).builds[0].attachments[0], "fss-is300");
    await page
      .locator("#saved-builds")
      .getByRole("button", { name: "Load / rename", exact: true })
      .click();
    await page
      .locator("#build-form [name=name]")
      .fill("Renamed synthetic build");
    await page.getByRole("button", { name: "Save build", exact: true }).click();
    await waitRevision(page, 2);
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page
        .getByRole("button", { name: "Export this build", exact: true })
        .click(),
    ]);
    const shared = JSON.parse(await readFile(await download.path(), "utf8"));
    assert.equal(shared.format, "dmz-armory-build");
    assert.equal(shared.build.name, "Renamed synthetic build");
    assert(!("observations" in shared));
    // A superseded malformed read must not clear a newer valid shared-build preview.
    await page.evaluate(() => {
      const native = File.prototype.text;
      File.prototype.text = function () {
        if (this.name === "held-invalid.json")
          return new Promise((resolve) => {
            window.releaseOldBuild = () => resolve("invalid old JSON");
          });
        return native.call(this);
      };
    });
    await page.locator("#build-import").setInputFiles({
      name: "held-invalid.json",
      mimeType: "application/json",
      buffer: Buffer.from("invalid"),
    });
    await page.waitForFunction(
      () => typeof window.releaseOldBuild === "function",
    );
    await page.locator("#build-import").setInputFiles({
      name: "valid.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(shared)),
    });
    await page.waitForSelector("#build-import-use:visible");
    await page.evaluate(() => window.releaseOldBuild());
    await page
      .getByRole("button", { name: "Use imported build as draft", exact: true })
      .click();
    assert.equal(
      await page.locator("#build-form [name=name]").inputValue(),
      shared.build.name,
    );
    const optic = db.attachments.find(
      (a) => a.slot === "optic" && a.weapons.includes("han-86"),
    );
    await page.locator('[data-build-slot="optic"]').selectOption(optic.id);
    await page.locator('[data-build-slot="apex"]').selectOption("apex-han-86");
    await page.getByRole("button", { name: "Save build", exact: true }).click();
    await page.waitForFunction(() =>
      document.querySelector("#armory-error").textContent.includes("blocks"),
    );
    assert.equal(await revision(page), 2);
    await page.locator('[data-build-slot="optic"]').selectOption("");
    await page.locator('[data-build-slot="apex"]').selectOption("");
    await tab(page, "acquisition");
    await page.locator("#tracker-weapon").selectOption("han-86");
    await page.locator("#tracker-manual").check();
    await waitRevision(page, 3);
    await page.locator("#tracker-search").fill("FSS IS300");
    await page.locator('[data-owned-attachment="fss-is300"]').check();
    await waitRevision(page, 4);
    await page
      .locator("#blueprint-form [name=blueprint]")
      .fill("Synthetic owned blueprint");
    await page
      .locator("#blueprint-form")
      .getByRole("button", { name: "Add blueprint", exact: true })
      .click();
    await waitRevision(page, 5);
    assert.equal((await backup(page)).acquisition["han-86"].manual, true);
    await tab(page, "evidence");
    const f = page.locator("#evidence-form");
    await f.locator("[name=metric]").selectOption("ads");
    for (const [key, value] of Object.entries({
      value: "250",
      build: "synthetic-build",
      date: "2026-11-01",
      target: "synthetic-target",
      armor: "none",
      rangeMeters: "10",
      method: "synthetic frame count",
      firingMode: "auto",
      loadoutContext: "base/no attachments",
    }))
      await f.locator(`[name=${key}]`).fill(value);
    const png = await page.evaluate(() => {
      const c = document.createElement("canvas");
      c.width = c.height = 16;
      const x = c.getContext("2d");
      x.fillStyle = "#da3322";
      x.fillRect(0, 0, 16, 16);
      return c.toDataURL("image/png").split(",")[1];
    });
    await f.locator("[name=picture]").setInputFiles({
      name: "synthetic.png",
      mimeType: "image/png",
      buffer: Buffer.from(png, "base64"),
    });
    await f
      .getByRole("button", { name: "Save observation privately", exact: true })
      .click();
    await waitRevision(page, 6);
    assert.equal((await backup(page)).observations[0].image.width, 16);
    await f.locator("[name=weapon]").selectOption("m4");
    await f.locator("[name=value]").fill("240");
    await f
      .getByRole("button", { name: "Save observation privately", exact: true })
      .click();
    await waitRevision(page, 7);
    const captured = await backup(page);
    assert.equal(captured.observations.length, 2);
    await tab(page, "compare");
    await page.locator("#compare-mode").selectOption("dmz");
    await page.locator("#compare-metric").selectOption("ads");
    await page
      .locator('[data-observation-choice="han-86"]')
      .selectOption(captured.observations[0].id);
    await page
      .locator('[data-observation-choice="m4"]')
      .selectOption(captured.observations[1].id);
    assert.match(
      await page.locator("#comparison-result").innerText(),
      /Matched user-reported context/,
    );
    await tab(page, "backups");
    const [privateDownload] = await Promise.all([
      page.waitForEvent("download"),
      page.locator("#workspace-export").click(),
    ]);
    const exported = JSON.parse(
      await readFile(await privateDownload.path(), "utf8"),
    );
    assert.equal(exported.workspace.observations.length, 2);
    assert(exported.workspace.observations[0].image.base64);
    await page.locator("#workspace-import").setInputFiles({
      name: "backup.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(exported)),
    });
    await page.waitForFunction(
      () => !document.querySelector("#workspace-import-apply").hidden,
    );
    await page.locator("#workspace-import-cancel").click();
    assert.equal(await revision(page), 7);
    // The file read is held before image preparation. Cancel must invalidate it.
    await page.evaluate((raw) => {
      const native = File.prototype.text;
      window.__restoreFileText = native;
      File.prototype.text = function () {
        if (this.name === "held-backup.json")
          return new Promise((resolve) => {
            window.__releaseBackup = () => resolve(raw);
          });
        return native.call(this);
      };
    }, JSON.stringify(exported));
    await page.locator("#workspace-import").setInputFiles({
      name: "held-backup.json",
      mimeType: "application/json",
      buffer: Buffer.from("{}"),
    });
    await page.waitForFunction(
      () => typeof window.__releaseBackup === "function",
    );
    await page.locator("#workspace-import-cancel").click();
    await page.evaluate(() => {
      window.__releaseBackup();
      File.prototype.text = window.__restoreFileText;
    });
    await page.evaluate(() => new Promise(requestAnimationFrame));
    assert.equal(
      await page.locator("#workspace-import-apply").isVisible(),
      false,
    );
    assert.equal(await revision(page), 7);
    // A newer restore selection supersedes the held read, including its contents.
    await page.evaluate((raw) => {
      const native = File.prototype.text;
      window.__restoreFileText = native;
      File.prototype.text = function () {
        if (this.name === "held-backup.json")
          return new Promise((resolve) => {
            window.__releaseBackup = () => resolve(raw);
          });
        return native.call(this);
      };
    }, JSON.stringify(exported));
    await page.locator("#workspace-import").setInputFiles({
      name: "held-backup.json",
      mimeType: "application/json",
      buffer: Buffer.from("{}"),
    });
    await page.waitForFunction(
      () => typeof window.__releaseBackup === "function",
    );
    const empty = {
      format: "dmz-armory-backup",
      version: 1,
      workspace: {
        version: 1,
        revision: 999,
        builds: [],
        observations: [],
        acquisition: {},
      },
    };
    await page.locator("#workspace-import").setInputFiles({
      name: "newer-backup.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(empty)),
    });
    await page.waitForFunction(
      () => !document.querySelector("#workspace-import-apply").hidden,
    );
    await page.evaluate(() => {
      window.__releaseBackup();
      File.prototype.text = window.__restoreFileText;
    });
    await page.evaluate(() => new Promise(requestAnimationFrame));
    assert.match(
      await page.locator("#workspace-preview").innerText(),
      /0 builds, 0 observations/,
    );
    await page.locator("#workspace-import-cancel").click();
    // Preview is bound to the captured revision; another tab may not be overwritten.
    await page.locator("#workspace-import").setInputFiles({
      name: "backup.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(exported)),
    });
    await page.waitForFunction(
      () => !document.querySelector("#workspace-import-apply").hidden,
    );
    const other = await context.newPage();
    await other.goto(base + "/armory/workbench/");
    await other.waitForFunction(
      () => document.querySelector("main").dataset.armoryReady === "true",
    );
    await other.evaluate(async () => {
      const { readArmory, saveArmory } = await import(
        "/assets/src/storage/armory-store.mjs"
      );
      const r = await readArmory();
      r.value.acquisition["m4"] = {
        manual: true,
        attachments: [],
        blueprints: [],
      };
      await saveArmory(r.value, r.value.revision);
    });
    await other.close();
    await page.locator("#workspace-import-apply").click();
    await page.waitForFunction(() =>
      document
        .querySelector("#armory-error")
        .textContent.includes("Another tab"),
    );
    assert.equal(await revision(page), 8);
    assert.equal((await backup(page)).acquisition.m4.manual, true);
    const [unsavedDownload] = await Promise.all([
      page.waitForEvent("download"),
      page.locator("#workspace-unsaved").click(),
    ]);
    const unsaved = JSON.parse(
      await readFile(await unsavedDownload.path(), "utf8"),
    );
    assert.equal(unsaved.workspace.observations.length, 2);
    page.once("dialog", (d) => d.accept());
    await page.locator("#workspace-reload").click();
    await page.waitForFunction(() =>
      document
        .querySelector("#armory-status")
        .textContent.includes("revision 8"),
    );
    // A failed save stays available and blocks a different mutation from replacing it.
    await tab(page, "builder");
    await page
      .locator("#build-form [name=name]")
      .fill("Retained quota-failure draft");
    await page.evaluate(() => {
      const native = IDBObjectStore.prototype.put;
      IDBObjectStore.prototype.put = function (...args) {
        if (this.name === "workspace") {
          IDBObjectStore.prototype.put = native;
          throw new DOMException(
            "Synthetic quota failure",
            "QuotaExceededError",
          );
        }
        return native.apply(this, args);
      };
    });
    await page.getByRole("button", { name: "Save build", exact: true }).click();
    await page.waitForFunction(() =>
      document
        .querySelector("#armory-error")
        .textContent.includes("Synthetic quota"),
    );
    await tab(page, "acquisition");
    await page.locator("#tracker-weapon").selectOption("m4");
    await page.locator("#tracker-manual").click();
    await page.waitForFunction(() =>
      document
        .querySelector("#armory-error")
        .textContent.includes("unsaved candidate"),
    );
    assert.equal(await revision(page), 8);
    assert.equal(
      await page.evaluate(() => {
        const event = new Event("beforeunload", { cancelable: true });
        window.dispatchEvent(event);
        return event.defaultPrevented;
      }),
      true,
    );
    await tab(page, "backups");
    const [retainedDownload] = await Promise.all([
      page.waitForEvent("download"),
      page.locator("#workspace-unsaved").click(),
    ]);
    const retained = JSON.parse(
      await readFile(await retainedDownload.path(), "utf8"),
    );
    assert(
      retained.workspace.builds.some(
        (b) => b.name === "Retained quota-failure draft",
      ),
    );
    page.once("dialog", (d) => d.accept());
    await page.locator("#workspace-reload").click();
    await page.waitForFunction(() =>
      document
        .querySelector("#armory-status")
        .textContent.includes("revision 8"),
    );
    await page.reload();
    await page.waitForFunction(
      () => document.querySelector("main").dataset.armoryReady === "true",
    );
    assert.equal(
      (await backup(page)).acquisition["han-86"].blueprints[0],
      "Synthetic owned blueprint",
    );
    assert.equal((await backup(page)).observations[0].image.width, 16);
    await tab(page, "builder");
    await page
      .locator("#build-form [name=name]")
      .fill("Draft retained across stale reload");
    await tab(page, "backups");
    await page.evaluate(() => {
      const native = IDBObjectStore.prototype.get;
      IDBObjectStore.prototype.get = function (...args) {
        const request = native.apply(this, args);
        if (this.name !== "workspace") return request;
        IDBObjectStore.prototype.get = native;
        return {
          get result() {
            return request.result;
          },
          get error() {
            return request.error;
          },
          set onsuccess(handler) {
            request.onsuccess = (event) => {
              window.releaseReload = () => handler(event);
            };
          },
          set onerror(handler) {
            request.onerror = handler;
          },
        };
      };
    });
    page.once("dialog", (d) => d.accept());
    await page.locator("#workspace-reload").click();
    await page.waitForFunction(
      () => typeof window.releaseReload === "function",
    );
    // Navigation invalidates preparation while the actual storage read is held.
    await tab(page, "builder");
    await page.evaluate(() => window.releaseReload());
    await page.waitForFunction(() =>
      document
        .querySelector("#armory-error")
        .textContent.includes("Reload became stale"),
    );
    assert.equal(
      await page.locator("#build-form [name=name]").inputValue(),
      "Draft retained across stale reload",
    );
    assert.equal(await revision(page), 8);
    await tab(page, "backups");
    const badHash = structuredClone(exported);
    badHash.workspace.observations[0].image.sha256 = "0".repeat(64);
    await page.locator("#workspace-import").setInputFiles({
      name: "bad-hash.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(badHash)),
    });
    await page.waitForFunction(() =>
      document
        .querySelector("#armory-error")
        .textContent.includes("hash mismatch"),
    );
    assert(await page.locator("#workspace-import-apply").isHidden());
    assert.equal(await revision(page), 8);
    await page.evaluate(() => {
      const native = window.createImageBitmap;
      window.createImageBitmap = async (...args) => {
        const bitmap = await native(...args);
        window.restoreBitmapClosed = false;
        return new Promise((resolve) => {
          window.releaseRestoreBitmap = () =>
            resolve({
              width: bitmap.width,
              height: bitmap.height,
              close() {
                bitmap.close();
                window.restoreBitmapClosed = true;
              },
            });
        });
      };
      window.restoreNativeBitmap = () => {
        window.createImageBitmap = native;
      };
    });
    await page.locator("#workspace-import").setInputFiles({
      name: "held-pixels.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(exported)),
    });
    await page.waitForFunction(
      () => typeof window.releaseRestoreBitmap === "function",
    );
    await page.locator("#workspace-import-cancel").click();
    await page.evaluate(() => {
      window.releaseRestoreBitmap();
      window.restoreNativeBitmap();
    });
    await page.waitForFunction(() => window.restoreBitmapClosed === true);
    assert(await page.locator("#workspace-import-apply").isHidden());
    assert.equal(await revision(page), 8);
    let layouts = 0;
    for (const id of [
      "compare",
      "builder",
      "evidence",
      "acquisition",
      "backups",
    ]) {
      await tab(page, id);
      for (const width of [320, 390, 768, 1440])
        for (const zoom of [false, true]) {
          await page.setViewportSize({ width, height: 900 });
          await page.evaluate((zoom) => {
            document.documentElement.style.fontSize = zoom ? "200%" : "";
          }, zoom);
          assert.equal(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth + 1,
            ),
            true,
            `${id} ${width} ${zoom}`,
          );
          layouts++;
        }
    }
    if (captureScreenshots) {
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.evaluate(() => (document.documentElement.style.fontSize = ""));
      await tab(page, "builder");
      await page.screenshot({
        path: "test-results/armory049-workbench-desktop.png",
      });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.screenshot({
        path: "test-results/armory049-workbench-mobile.png",
      });
    }
    console.log(
      `049 workbench PASS: saved/renamed/shared builds, legality, tracker, real screenshot pixels, explicit matched comparison, backups/cancel/superseding read, stale CAS, quota retention/reload and ${layouts} responsive/text layouts`,
    );
  } catch (error) {
    await writeFile(
      "test-results/armory049-failure.json",
      JSON.stringify(
        {
          message: error.message,
          workspace: await backup(page),
          status: await page.locator("#armory-status").textContent(),
          error: await page.locator("#armory-error").textContent(),
        },
        null,
        2,
      ),
    );
    throw error;
  } finally {
    await context.close();
  }
}
