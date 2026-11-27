import { chromium, firefox, webkit } from "playwright";
import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
import { readWeaponCamos } from "../../src/content/weapon-camos.mjs";
import { monitorBrowser } from "./health.mjs";
import { startBrowserServer } from "./server.mjs";
const server = process.env.DMZ_SITE_URL ? null : await startBrowserServer(),
  base = process.env.DMZ_SITE_URL || server.base;
const catalog = await readWeaponCamos(),
  weapon = catalog.weapons.find((w) => w.id === "m4"),
  specials = weapon.rows.filter((r) => r.group === "special");
const ready = (page) =>
  page.waitForSelector(
    'main[data-armory-ready="true"][data-armory-busy="false"]',
  );
const revision = (page, value) =>
  page.waitForSelector(
    `main[data-armory-revision="${value}"][data-armory-busy="false"]`,
  );
const saved = (page) =>
  page.evaluate(
    async () =>
      (
        await (
          await import("/assets/src/storage/armory-store.mjs")
        ).readArmory()
      ).value,
  );
const open = async (page) => {
  if (!(await page.locator("#weapon-picker").evaluate((node) => node.open)))
    await page.locator("#weapon-picker > summary").click();
};
async function chooseCamo(card, id) {
  if (!(await card.locator("[data-picker-camo-detail]").isVisible()))
    await card.locator("[data-picker-camo-open]").click();
  await card.locator("[data-picker-camo-select]").selectOption(id);
}
async function focusCases(browser) {
  const context = await browser.newContext(),
    page = await context.newPage();
  try {
    await page.goto(base + "/armory/");
    await ready(page);
    await open(page);
    await page.locator("#weapon-context-filter").selectOption("missing");
    await page.locator('[data-weapon-card="m4"] [data-picker-manual]').focus();
    await page.keyboard.press("Space");
    await revision(page, 1);
    await page.waitForFunction(
      () => document.activeElement?.id === "weapon-context-filter",
    );
    assert(await page.locator('[data-weapon-card="m4"]').isHidden());
    await page.evaluate(() => {
      const native = IDBDatabase.prototype.transaction;
      IDBDatabase.prototype.transaction = function (...args) {
        const tx = native.apply(this, args);
        if (args[1] === "readwrite" && this.name === "dmz-armory-local") {
          IDBDatabase.prototype.transaction = native;
          tx.addEventListener(
            "complete",
            (event) => {
              event.stopImmediatePropagation();
              window.releasePickerFocusSave = () =>
                tx.dispatchEvent(new Event("complete"));
            },
            { capture: true, once: true },
          );
        }
        return tx;
      };
    });
    await page
      .locator('[data-weapon-card="han-86"] [data-picker-manual]')
      .focus();
    await page.keyboard.press("Space");
    await page.waitForFunction(
      () => typeof window.releasePickerFocusSave === "function",
    );
    await page.locator("#weapon-context-search").fill("M4");
    await page.evaluate(() => window.releasePickerFocusSave());
    await revision(page, 2);
    assert(
      await page
        .locator("#weapon-context-search")
        .evaluate((node) => node === document.activeElement),
      "A newer focus target must not be stolen",
    );
    const lastPrestige = weapon.rows
      .filter((row) => row.group === "prestige")
      .at(-1).id;
    await page.evaluate(async (outstanding) => {
      const { readArmory, saveArmory } = await import(
        "/assets/src/storage/armory-store.mjs"
      );
      const { editCamoCompletion } = await import(
        "/assets/src/domain/camo-progress.mjs"
      );
      const data = JSON.parse(
        document.querySelector("#armory-public-data").textContent,
      );
      let workspace = (await readArmory()).value;
      const revision = workspace.revision;
      for (const row of data.camoWeapons
        .find((w) => w.id === "m4")
        .rows.filter((row) => row.id !== outstanding))
        workspace = editCamoCompletion(
          workspace,
          data.camoProgress,
          "m4",
          row.id,
          true,
        );
      await saveArmory(workspace, revision);
    }, lastPrestige);
    await page.reload();
    await ready(page);
    await open(page);
    const card = page.locator('[data-weapon-card="m4"]');
    assert.equal(
      await card.locator("[data-prestige-name]").textContent(),
      weapon.rows.find((row) => row.id === lastPrestige).name,
    );
    await card.locator("[data-prestige-complete]").focus();
    await page.keyboard.press("Space");
    await revision(page, 4);
    await page.waitForFunction(() =>
      document.activeElement?.matches(
        '[data-weapon-card="m4"] [data-prestige-open]',
      ),
    );
    await page.keyboard.press("Enter");
    assert(await card.locator("[data-prestige-link]").isVisible());
  } finally {
    await context.close();
  }
}
async function prestigeCases(browser) {
  const context = await browser.newContext(),
    page = await context.newPage();
  try {
    await page.goto(base + "/armory/");
    await ready(page);
    await open(page);
    const card = page.locator('[data-weapon-card="m4"]');
    const rows = weapon.rows.filter((row) => row.group === "prestige");
    assert.equal(await page.locator("[data-prestige-name]").count(), 35);
    for (const gun of catalog.weapons) {
      const item = page.locator(`[data-weapon-card="${gun.id}"]`);
      for (const prestige of [false, true]) {
        const prefix = prestige ? "prestige" : "picker-camo";
        const row = gun.rows.find((r) => (r.group === "prestige") === prestige);
        const button = item.locator(`[data-${prefix}-open]`);
        const accessible = await button.ariaSnapshot();
        assert(
          accessible.includes(row.name) && accessible.includes("How to unlock"),
        );
        const done = item.locator(
          prestige ? "[data-prestige-complete]" : "[data-picker-complete]",
        );
        assert((await done.ariaSnapshot()).includes("Done"));
        await button
          .locator(prestige ? "[data-prestige-name]" : ".picker-swatch")
          .click();
        assert(await item.locator(`[data-${prefix}-detail]`).isVisible());
        if (!prestige)
          assert(
            (
              await item.locator("[data-picker-camo-select]").ariaSnapshot()
            ).includes("Track another camo"),
          );
        assert.equal(
          await item.locator(`[data-${prefix}-requirement]`).textContent(),
          row.requirement,
        );
        assert.equal(
          await item.locator(`[data-${prefix}-source]`).getAttribute("href"),
          row.sourceURL,
        );
        assert.equal(await button.getAttribute("aria-expanded"), "true");
        await button.click();
      }
    }
    assert.equal(
      await card.locator("[data-prestige-name]").textContent(),
      rows[0].name,
    );
    assert.equal(
      await card.locator("[data-picker-camo-select] option").count(),
      21,
    );
    await card.locator("[data-prestige-open]").click();
    assert.equal(
      await card.locator("[data-prestige-requirement]").textContent(),
      rows[0].requirement,
    );
    await card.locator("[data-prestige-complete]").click();
    await revision(page, 1);
    assert.equal(
      await card.locator("[data-prestige-name]").textContent(),
      rows[1].name,
    );
    assert.equal(
      await card.locator("[data-picker-camo-select]").inputValue(),
      weapon.rows[0].id,
    );
    assert.match(
      await card.locator("[data-picker-camo-count]").textContent(),
      /^0\/21/,
    );
    assert.equal((await saved(page)).acquisition.m4?.manual || false, false);
    await page.reload();
    await ready(page);
    await open(page);
    assert.equal(
      await card.locator("[data-prestige-count]").textContent(),
      "1/4",
    );
    assert.equal(
      await card.locator("[data-prestige-name]").textContent(),
      rows[1].name,
    );
    await card.locator("[data-picker-complete]").click();
    await revision(page, 2);
    assert.equal(
      await card.locator("[data-prestige-name]").textContent(),
      rows[1].name,
    );
    await card.locator("[data-prestige-open]").click();
    await card.locator("[data-prestige-link]").click();
    await ready(page);
    assert.equal(new URL(page.url()).hash, "#camo:" + rows[1].id);
  } finally {
    await context.close();
  }
}
let failure;
try {
  for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
    const browser = await engine.launch(),
      health = monitorBrowser(browser);
    const context = await browser.newContext(),
      page = await context.newPage();
    try {
      await page.goto(base + "/armory/");
      await ready(page);
      await open(page);
      assert.equal(
        await page.locator("[data-picker-category]:visible").count(),
        9,
      );
      assert.equal(
        await page.locator("[data-weapon-card]:visible").count(),
        35,
      );
      const card = page.locator('[data-weapon-card="m4"]'),
        han = page.locator('[data-weapon-card="han-86"]');
      const choice = card.locator("[data-picker-camo-select]"),
        done = card.locator("[data-picker-complete]");
      assert.equal(await choice.inputValue(), weapon.rows[0].id);
      await card.locator("[data-picker-manual]").check();
      await revision(page, 1);
      assert.equal((await saved(page)).acquisition.m4.manual, true);
      assert.equal(
        (await saved(page)).acquisition.m4.manualExtractions,
        undefined,
      );
      assert(
        !(await page.locator("#tracker-manual").isChecked()),
        "Editing another card must not change the selected weapon's manual",
      );
      await card.locator("[data-picker-camo-open]").click();
      assert.match(
        await card.locator("[data-picker-camo-requirement]").innerText(),
        new RegExp(
          weapon.rows[0].requirement.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        ),
      );
      await done.focus();
      await page.keyboard.press("Space");
      await revision(page, 2);
      assert.equal(await choice.inputValue(), weapon.rows[1].id);
      await page.waitForFunction(() =>
        document.activeElement?.matches(
          '[data-weapon-card="m4"] [data-picker-complete]',
        ),
      );
      await page.keyboard.press("Space");
      await revision(page, 3);
      assert.equal(await choice.inputValue(), weapon.rows[2].id);
      await chooseCamo(card, specials[0].id);
      await page.reload();
      await ready(page);
      await open(page);
      assert.equal(
        await choice.inputValue(),
        specials[0].id,
        "A session choice survives reload",
      );
      await card.locator("[data-picker-camo-open]").click();
      await card.locator("[data-picker-camo-link]").click();
      await ready(page);
      assert.equal(new URL(page.url()).pathname, "/armory/m4/");
      assert(
        await page
          .locator(`[data-camo-detail="${specials[0].id}"]`)
          .isVisible(),
      );
      await page.locator(`[data-camo-complete="${specials[0].id}"]`).check();
      await revision(page, 4);
      await open(page);
      assert.equal(
        await choice.inputValue(),
        weapon.rows[2].id,
        "Full tracker completion also advances the picker",
      );
      await chooseCamo(card, "helio");
      await chooseCamo(han, "helio");
      await done.click();
      await revision(page, 5);
      assert.notEqual(await choice.inputValue(), "helio");
      assert.notEqual(
        await han.locator("[data-picker-camo-select]").inputValue(),
        "helio",
      );
      assert.match(
        await han.locator("[data-picker-camo-count]").textContent(),
        /^1\/21/,
      );
      await page.locator("#weapon-context-filter").selectOption("owned");
      assert.equal(await page.locator("[data-weapon-card]:visible").count(), 1);
      assert.equal(
        await page.locator("[data-picker-category]:visible").count(),
        1,
      );
      await page
        .locator("#weapon-context-search")
        .fill("Synthetic no matching weapon");
      assert(await page.locator("#weapon-context-empty").isVisible());
      assert.equal(
        await page.locator("[data-picker-category]:visible").count(),
        0,
      );
      await page.locator("#weapon-context-search").fill("");
      await page.locator("#weapon-context-filter").selectOption("all");

      await chooseCamo(card, specials[1].id);
      await page.evaluate(() => {
        const native = IDBObjectStore.prototype.put;
        IDBObjectStore.prototype.put = function (...args) {
          if (this.name === "workspace") {
            IDBObjectStore.prototype.put = native;
            throw new DOMException(
              "Synthetic picker quota",
              "QuotaExceededError",
            );
          }
          return native.apply(this, args);
        };
      });
      await done.click();
      await card.locator("[data-picker-error]:not([hidden])").waitFor();
      assert.equal(
        await choice.inputValue(),
        specials[1].id,
        "Failed save must not advance the goal",
      );
      assert.equal((await saved(page)).revision, 5);
      assert(await done.isDisabled());
      assert(await han.locator("[data-picker-manual]").isDisabled());
      await card.locator(".picker-save-recovery").click();
      const [download] = await Promise.all([
        page.waitForEvent("download"),
        page.locator("#workspace-unsaved").click(),
      ]);
      const draft = JSON.parse(await readFile(await download.path(), "utf8"));
      assert(
        draft.workspace.camoCompletions.includes(`weapon:m4:${specials[1].id}`),
      );
      await page.locator("#workspace-retry").click();
      await revision(page, 6);
      assert.notEqual(await choice.inputValue(), specials[1].id);
      assert(await card.locator("[data-picker-error]").isHidden());
      const other = await context.newPage();
      await other.goto(base + "/armory/");
      await ready(other);
      await open(other);
      await other
        .locator('[data-weapon-card="han-86"] [data-picker-manual]')
        .check();
      await revision(other, 7);
      const pendingGoal = await choice.inputValue();
      await done.click();
      await card.locator("[data-picker-error]:not([hidden])").waitFor();
      assert.match(
        await card.locator("[data-picker-error]").textContent(),
        /Another tab/,
      );
      assert.equal(await choice.inputValue(), pendingGoal);
      assert.equal((await saved(page)).revision, 7);
      page.once("dialog", (dialog) => dialog.accept());
      await page.locator("#workspace-reload").click();
      await revision(page, 7);
      assert(await han.locator("[data-picker-manual]").isChecked());
      assert.equal(await choice.inputValue(), pendingGoal);
      await done.click();
      await revision(page, 8);
      await other.close();
      await page.evaluate(async () => {
        const { readArmory, saveArmory } = await import(
          "/assets/src/storage/armory-store.mjs"
        );
        const { editCamoCompletion } = await import(
          "/assets/src/domain/camo-progress.mjs"
        );
        const data = JSON.parse(
          document.querySelector("#armory-public-data").textContent,
        );
        let workspace = (await readArmory()).value;
        const revision = workspace.revision;
        for (const row of data.camoWeapons.find((w) => w.id === "m4").rows)
          workspace = editCamoCompletion(
            workspace,
            data.camoProgress,
            "m4",
            row.id,
            true,
          );
        await saveArmory(workspace, revision);
      });
      page.once("dialog", (dialog) => dialog.accept());
      await page.locator("#workspace-reload").click();
      await revision(page, 9);
      assert.equal(await choice.inputValue(), "");
      assert(await done.isDisabled());
      assert(!(await card.locator("[data-picker-manual]").isDisabled()));
      assert.match(
        await card.locator("[data-picker-camo-status]").textContent(),
        /All recorded camos completed/,
      );

      let layouts = 0;
      for (const width of [320, 390, 768, 1440])
        for (const zoom of [1, 2])
          for (const theme of ["dark", "light"]) {
            await page.setViewportSize({ width, height: 900 });
            await page.evaluate(
              ({ zoom, theme }) => {
                document.documentElement.style.fontSize =
                  zoom === 2 ? "200%" : "";
                document.documentElement.dataset.theme = theme;
              },
              { zoom, theme },
            );
            assert(
              await page.evaluate(
                () => document.documentElement.scrollWidth <= innerWidth + 1,
              ),
              `${width} ${zoom} ${theme}`,
            );
            layouts++;
          }
      if (name === "chromium") {
        await mkdir("test-results", { recursive: true });
        await page.evaluate(() => {
          document.documentElement.style.fontSize = "";
          document.documentElement.dataset.theme = "dark";
        });
        for (const width of [1440, 390]) {
          await page.setViewportSize({ width, height: 1000 });
          await page
            .locator("[data-weapon-card]")
            .first()
            .evaluate((node) => node.scrollIntoView({ block: "start" }));
          await page.screenshot({
            path: `test-results/weapon-picker-${width}.png`,
          });
        }
      }
      console.log(
        `${name} R8 PASS:35 cards/9 types, manual independence, keyboard next, selected camo/session/detail sync, shared goal refresh, filters, quota export/retry, stale CAS/reload, completed state and ${layouts} expanded-picker layouts`,
      );
    } finally {
      await context.close();
    }
    await focusCases(browser);
    await prestigeCases(browser);
    const denied = await browser.newContext();
    try {
      await denied.addInitScript(() =>
        Object.defineProperty(window, "indexedDB", { value: undefined }),
      );
      const page = await denied.newPage();
      await page.goto(base + "/armory/");
      await page.waitForFunction(() =>
        /unavailable/i.test(
          document.querySelector("#armory-error").textContent,
        ),
      );
      await open(page);
      const card = page.locator("[data-weapon-card]").first();
      assert(await card.locator("[data-picker-manual]").isDisabled());
      assert(
        await card
          .locator("[data-picker-manual]")
          .evaluate((node) => node.indeterminate),
      );
      assert.match(
        await card.locator("[data-picker-camo-count]").textContent(),
        /unavailable/,
      );
      assert(await card.locator("[data-picker-complete]").isDisabled());
    } finally {
      await denied.close();
    }
    const preferencesDenied = await browser.newContext();
    try {
      await preferencesDenied.addInitScript(() => {
        const get = Storage.prototype.getItem,
          set = Storage.prototype.setItem;
        Storage.prototype.getItem = function (key) {
          if (key === "dmz-weapon-picker-choices-v1")
            throw new DOMException(
              "Synthetic picker preference denial",
              "SecurityError",
            );
          return get.call(this, key);
        };
        Storage.prototype.setItem = function (key, value) {
          if (key === "dmz-weapon-picker-choices-v1")
            throw new DOMException(
              "Synthetic picker preference quota",
              "QuotaExceededError",
            );
          return set.call(this, key, value);
        };
      });
      const page = await preferencesDenied.newPage();
      await page.goto(base + "/armory/");
      await ready(page);
      await open(page);
      const card = page.locator('[data-weapon-card="m4"]');
      await chooseCamo(card, specials[0].id);
      assert.equal(
        await card.locator("[data-picker-camo-select]").inputValue(),
        specials[0].id,
      );
      await card.locator("[data-picker-complete]").click();
      await revision(page, 1);
      await page.reload();
      await ready(page);
      await open(page);
      assert.match(
        await card.locator("[data-picker-camo-count]").textContent(),
        /^1\/21/,
      );
      assert(
        (await saved(page)).camoCompletions.includes(
          `weapon:m4:${specials[0].id}`,
        ),
      );
    } finally {
      await preferencesDenied.close();
    }
    health();
    server?.assertAlive();
    await browser.close();
  }
} catch (error) {
  failure = error;
  throw error;
} finally {
  await server?.stop(failure);
}
