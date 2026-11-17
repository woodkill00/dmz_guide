import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
const route = "/armory/acquisition/";
const ready = (page) =>
  page.waitForFunction(
    () =>
      document.querySelector("#weapon-acquisition")?.dataset.busy === "false" &&
      /No saved armory|Saved on this browser|Saved privately/.test(
        document.querySelector("#acq-status")?.textContent,
      ),
  );
const stock = (page) =>
  page.evaluate(async () => {
    const { readArmory } = await import("/assets/src/storage/armory-store.mjs");
    return (await readArmory()).value;
  });
const count = async (page, id, n) => {
  await page.waitForFunction(
    ({ id, n }) =>
      document.querySelector(
        `[data-acquisition-weapon="${id}"] [data-acq-counter]`,
      )?.textContent === `${n.toLocaleString()} / 3` &&
      document.querySelector("#weapon-acquisition").dataset.busy === "false",
    { id, n },
  );
};
export async function runWeaponAcquisitionTests({
  browser,
  base,
  name = "chromium",
  captureScreenshots = true,
}) {
  const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
    }),
    page = await context.newPage(),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  try {
    await page.goto(base + route);
    await ready(page);
    assert.equal(await page.locator("[data-acquisition-weapon]").count(), 35);
    assert.equal(await page.locator("[data-known-blueprint]").count(), 85);
    const dbs = await page.evaluate(async () =>
      typeof indexedDB.databases === "function"
        ? (await indexedDB.databases()).map((d) => d.name)
        : [],
    );
    assert(!dbs.includes("dmz-armory-local"));
    for (const invalid of ["missing-weapon", "x".repeat(101)]) {
      await page.goto(base + route + "?weapon=" + invalid);
      await ready(page);
      assert.equal(
        await page.locator(".acq-weapon[open]").count(),
        0,
        "unknown/oversized weapon query is ignored",
      );
    }
    await page.evaluate(async () => {
      const { emptyArmory } = await import(
        "/assets/src/domain/armory-workspace.mjs"
      );
      const { saveArmory } = await import(
        "/assets/src/storage/armory-store.mjs"
      );
      const v = emptyArmory();
      v.acquisition.m4 = {
        manual: true,
        attachments: ["archived-attachment"],
        blueprints: [" inner   circuit ", "Synthetic custom"],
      };
      v.acquisition["archived-gun"] = {
        manual: true,
        attachments: [],
        blueprints: ["Archived"],
      };
      await saveArmory(v, 0);
    });
    await page.locator("#acq-refresh").click();
    await page.waitForFunction(
      () =>
        document.querySelector("#weapon-acquisition").dataset.revision === "1",
    );
    const m4 = page.locator("#weapon-m4");
    await m4.locator("summary").first().focus();
    await page.keyboard.press("Enter");
    assert(await m4.locator("[data-manual]").isChecked());
    assert.match(
      await m4.locator("[data-acq-counter]").innerText(),
      /Not recorded/,
    );
    const inner = m4
      .locator(".acq-blueprint")
      .filter({ hasText: "Inner Circuit" })
      .locator("input");
    assert(await inner.isChecked());
    const input = m4.locator("[name=count]");
    await input.fill("0");
    await m4.locator("[data-count-form] button").first().click();
    await count(page, "m4", 0);
    const plus = m4.locator('[data-count-step="1"]');
    for (let n = 1; n <= 3; n++) {
      await plus.click();
      await count(page, "m4", n);
    }
    await m4.scrollIntoViewIfNeeded();
    await plus.focus();
    const before = await plus.boundingBox(),
      y = await page.evaluate(() => scrollY);
    await page.keyboard.press("Enter");
    await count(page, "m4", 4);
    assert(await plus.evaluate((el) => document.activeElement === el));
    assert(Math.abs((await plus.boundingBox()).y - before.y) <= 2);
    assert(Math.abs((await page.evaluate(() => scrollY)) - y) <= 2);
    await m4.locator('[data-count-step="-1"]').click();
    await count(page, "m4", 3);
    await page.reload();
    await ready(page);
    await m4.locator("summary").first().click();
    await count(page, "m4", 3);
    assert.match(
      await m4.locator("[data-acq-goal]").innerText(),
      /goal recorded/,
    );
    await input.fill("2");
    await m4.locator("[data-count-form] button").first().click();
    await count(page, "m4", 2);
    await plus.click();
    await count(page, "m4", 3);
    const existing = await stock(page);
    const known = m4
      .locator(".acq-blueprint")
      .filter({ hasText: "Perimeter Lance" })
      .locator("input");
    await known.check();
    await page.waitForFunction(
      () =>
        document.querySelector("#weapon-acquisition").dataset.busy === "false",
    );
    assert.equal((await stock(page)).acquisition.m4.manualExtractions, 3);
    await m4.locator(".acq-custom>summary").click();
    const custom = m4.locator("[data-custom-form]");
    await custom.locator("input").fill("INNER CIRCUIT");
    await custom.locator("button").click();
    await page.waitForFunction(
      () =>
        document.querySelector('[data-custom-form="m4"] input').value === "",
    );
    const saved = await stock(page);
    assert.equal(
      saved.acquisition.m4.blueprints.filter((n) => /inner\s+circuit/i.test(n))
        .length,
      1,
    );
    assert.deepEqual(
      saved.acquisition["archived-gun"],
      existing.acquisition["archived-gun"],
    );
    assert.deepEqual(saved.acquisition.m4.attachments, ["archived-attachment"]);
    await page.locator("#acq-query").fill("Synthetic custom");
    await m4.locator('[data-remove-blueprint="Synthetic custom"]').click();
    await page.waitForFunction(
      () =>
        document.querySelector("#weapon-m4").hidden &&
        document.querySelector("#weapon-acquisition").dataset.busy === "false",
    );
    assert(
      await page
        .locator("#acq-query")
        .evaluate((el) => document.activeElement === el),
      "removing a filtered custom name returns focus to visible search",
    );
    await page.locator("#acq-query").fill("Perimeter Lance");
    assert.equal(
      await page.locator("[data-acquisition-weapon]:visible").count(),
      1,
    );
    await page.locator("#acq-query").fill("synthetic no result");
    assert(await page.locator("#acq-empty").isVisible());
    await page.locator("#acq-reset").click();
    assert(await m4.locator("[data-acq-counter]").isVisible());
    for (const id of ["csg-35", "cronen-osprey"]) {
      await page.goto(base + route + "?weapon=" + id);
      await ready(page);
      const r = page.locator("#weapon-" + id);
      assert(await r.evaluate((el) => el.open));
      assert.match(await r.innerText(), /Combat data not yet catalogued/);
      assert.equal(await r.locator(`a[href="/armory/${id}/"]`).count(), 0);
      await r.locator("[name=count]").fill("3");
      await r.locator("[data-count-form] button").first().click();
      await count(page, id, 3);
    }
    await page.goto(base + "/");
    await page.waitForFunction(() =>
      document
        .querySelector("#dashboard-weapons")
        ?.textContent.includes("CSG-35"),
    );
    assert.match(
      await page.locator("#dashboard-weapons").innerText(),
      /3 \/ 3 manual extractions/,
    );
    for (const id of ["csg-35", "cronen-osprey"]) {
      await page.locator(`#dashboard-weapons a[href*="weapon=${id}"]`).click();
      await ready(page);
      assert(await page.locator("#weapon-" + id).evaluate((el) => el.open));
      await page.goto(base + "/");
      await page.waitForFunction(() =>
        document
          .querySelector("#dashboard-weapons")
          ?.textContent.includes("CSG-35"),
      );
    }
    await page.goto(base + "/armory/workbench/#acquisition");
    await page.locator('.armory-tabs a[href="#acquisition"]').click();
    await page.waitForFunction(
      () =>
        document.querySelector("main").dataset.armoryBusy === "false" &&
        document.querySelector('[data-roster-manual="m4"]'),
    );
    const oldManual = page.locator('[data-roster-manual="m4"]');
    await oldManual.uncheck();
    await page.waitForFunction(
      () => document.querySelector("main").dataset.armoryBusy === "false",
    );
    const afterWorkbench = await stock(page);
    assert.equal(afterWorkbench.acquisition.m4.manualExtractions, 3);
    assert.equal(afterWorkbench.acquisition["csg-35"].manualExtractions, 3);
    assert.equal(
      afterWorkbench.acquisition["cronen-osprey"].manualExtractions,
      3,
    );
    await page.goto(base + route + "?weapon=m4");
    await ready(page);
    assert(!(await m4.locator("[data-manual]").isChecked()));
    await count(page, "m4", 3);
    await input.fill("77");
    await page.evaluate(() => {
      dispatchEvent(new Event("focus"));
      document.dispatchEvent(new Event("visibilitychange"));
    });
    assert.equal(await input.inputValue(), "77");
    await m4.locator("[data-cancel-count]").click();
    assert.equal(await input.inputValue(), "3");
    const download = page.waitForEvent("download");
    await page.locator("#acq-export").click();
    const file = await download;
    const backup = JSON.parse(await readFile(await file.path(), "utf8"));
    assert.equal(backup.workspace.acquisition.m4.manualExtractions, 3);
    assert.equal(backup.format, "dmz-armory-backup");
    for (const width of [320, 390, 768, 1280, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      await page.waitForFunction((w) => innerWidth === w, width);
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        "overflow " + width,
      );
    }
    await page.setViewportSize({ width: 320, height: 900 });
    await page.waitForFunction(() => innerWidth === 320);
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
    if (process.argv.includes("--a11y")) {
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
        );
      }
    }
    if (captureScreenshots) {
      await mkdir("test-results", { recursive: true });
      await page.setViewportSize({ width: 390, height: 900 });
      await page.waitForFunction(() => innerWidth === 390);
      await page.screenshot({
        path: `test-results/acquisition-${name}-mobile.png`,
        fullPage: true,
      });
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.waitForFunction(() => innerWidth === 1280);
      await page.screenshot({
        path: `test-results/acquisition-${name}-desktop.png`,
        fullPage: true,
      });
    }
    assert.deepEqual(errors, []);
    console.log(
      `088 ${name} roster85/35, manual counters, duplicate names, workbench/dashboard/backup parity, keyboard/stability/layout PASS`,
    );
  } finally {
    await context.close();
  }
  await failureTests({ browser, base });
}
async function failureTests({ browser, base }) {
  const context = await browser.newContext();
  await context.route(
    "**/assets/src/storage/armory-store.mjs",
    async (route) => {
      const r = await route.fetch();
      let source = await r.text();
      source = source.replace(
        "export async function saveArmory",
        "async function originalSaveArmory",
      );
      source +=
        '\nexport async function saveArmory(v,r){if(window.__holdSave)await new Promise(resolve=>window.__releaseSave=resolve);if(window.__quota)throw Error("Synthetic quota failure");return originalSaveArmory(v,r)}';
      await route.fulfill({ response: r, body: source });
    },
  );
  const page = await context.newPage();
  try {
    await page.goto(base + route + "?weapon=m4");
    await ready(page);
    const row = page.locator("#weapon-m4");
    await page.evaluate(() => (window.__quota = true));
    await row.locator('[data-count-step="1"]').click();
    await page.locator("#acq-error").filter({ hasText: "quota" }).waitFor();
    assert.match(
      await row.locator("[data-acq-counter]").innerText(),
      /Not recorded/,
    );
    assert(!(await page.locator("#acq-export-draft").isDisabled()));
    await page.evaluate(() => (window.__quota = false));
    await page.locator("#acq-retry").click();
    await count(page, "m4", 1);
    assert.equal((await stock(page)).acquisition.m4.manualExtractions, 1);
    for (const failing of [false, true]) {
      await page.evaluate((f) => {
        window.__holdSave = true;
        window.__releaseSave = null;
        window.__quota = f;
      }, failing);
      await row.locator('[data-count-step="1"]').click();
      await page.waitForFunction(
        () => typeof window.__releaseSave === "function",
      );
      assert(await row.locator('[data-count-step="1"]').isDisabled());
      await page.locator("#acq-query").focus();
      await page.locator("#acq-query").fill("M4");
      await page.evaluate(() => {
        window.__holdSave = false;
        window.__releaseSave();
      });
      if (failing)
        await page.locator("#acq-error").filter({ hasText: "quota" }).waitFor();
      else await count(page, "m4", 2);
      assert(
        await page
          .locator("#acq-query")
          .evaluate((el) => document.activeElement === el),
        "late save must respect newer search focus",
      );
      assert.equal((await stock(page)).acquisition.m4.manualExtractions, 2);
      if (failing) {
        await page.evaluate(() => (window.__quota = false));
        page.once("dialog", (d) => d.accept());
        await page.locator("#acq-reload").click();
        await count(page, "m4", 2);
      }
    }
    await page.evaluate(async () => {
      const { saveArmory, readArmory } = await import(
        "/assets/src/storage/armory-store.mjs"
      );
      const v = (await readArmory()).value;
      v.acquisition.m4.manualExtractions = 8;
      await saveArmory(v, v.revision);
    });
    await row.locator('[data-count-step="1"]').click();
    await page
      .locator("#acq-error")
      .filter({ hasText: "Another tab" })
      .waitFor();
    assert.equal((await stock(page)).acquisition.m4.manualExtractions, 8);
    page.once("dialog", (d) => d.accept());
    await page.locator("#acq-reload").click();
    await count(page, "m4", 8);
    assert(await page.locator("#acq-export-draft").isDisabled());
    console.log(
      "088 quota retained candidate/retry, stale CAS rejection/reload and no increment replay PASS",
    );
  } finally {
    await context.close();
  }
  const corrupt = await browser.newContext(),
    p = await corrupt.newPage();
  try {
    await p.goto(base + route);
    await ready(p);
    await p.evaluate(async () => {
      const { readArmory } = await import(
        "/assets/src/storage/armory-store.mjs"
      );
      await readArmory();
      await new Promise((resolve, reject) => {
        const r = indexedDB.open("dmz-armory-local", 1);
        r.onsuccess = () => {
          const db = r.result,
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
    await p
      .locator("#acq-error")
      .filter({ hasText: "Invalid private armory envelope" })
      .waitFor();
    assert(await p.locator("#weapon-m4 [data-manual]").isDisabled());
    assert.equal(
      await p.evaluate(async () => {
        const { readExistingRecord } = await import(
          "/assets/src/storage/summary-read.mjs"
        );
        return (
          await readExistingRecord("dmz-armory-local", "workspace", "main")
        ).bad;
      }),
      "Synthetic corrupt envelope",
    );
    console.log("088 corrupt envelope preserved and mutations blocked PASS");
  } finally {
    await corrupt.close();
  }
  const denied = await browser.newContext();
  await denied.addInitScript(() =>
    Object.defineProperty(window, "indexedDB", { value: undefined }),
  );
  const deniedPage = await denied.newPage();
  try {
    await deniedPage.goto(base + route);
    await deniedPage
      .locator("#acq-error")
      .filter({ hasText: "storage unavailable" })
      .waitFor();
    assert(await deniedPage.locator("#weapon-m4 [data-manual]").isDisabled());
    assert.equal(
      await deniedPage.locator("[data-acquisition-weapon]").count(),
      35,
    );
    console.log(
      "088 denied storage leaves readable references and disabled edits PASS",
    );
  } finally {
    await denied.close();
  }
}
