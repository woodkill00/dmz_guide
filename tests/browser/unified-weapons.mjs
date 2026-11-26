import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
const ready = (page) =>
  page.waitForSelector(
    'main[data-armory-ready="true"][data-armory-busy="false"]',
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
const tab = async (page, id) => {
  await page.locator(`.weapon-workspace-tabs a[href="#${id}"]`).click();
  await page.waitForFunction((id) => !document.getElementById(id).hidden, id);
};
const revision = async (page, n) => {
  await page.waitForFunction(
    (n) =>
      document.querySelector("main").dataset.armoryRevision === String(n) &&
      document.querySelector("main").dataset.armoryBusy === "false",
    n,
  );
};
export async function runUnifiedWeaponsTests({
  browser,
  base,
  name = "browser",
}) {
  const context = await browser.newContext(),
    page = await context.newPage();
  try {
    await page.goto(base + "/armory/");
    await ready(page);
    assert.equal(await page.locator("[data-weapon-context]").count(), 35);
    assert.equal(
      await page.locator("[data-workbench-panel]:visible").getAttribute("id"),
      "acquisition",
    );
    await page.locator("#tracker-manual").check();
    await revision(page, 1);
    assert.equal(
      (await saved(page)).acquisition["han-86"].manualExtractions,
      undefined,
    );
    await page.locator('[data-extraction-step="1"]').click();
    await revision(page, 2);
    assert.equal(
      (await saved(page)).acquisition["han-86"].manualExtractions,
      1,
    );
    await page.locator("[data-unified-blueprint]").first().check();
    await revision(page, 3);
    assert.equal(
      await page.locator("#blueprint-list button").count(),
      0,
      "Known ownership is not repeated as custom data",
    );
    await page
      .locator('#blueprint-form [name="blueprint"]')
      .fill("Synthetic private blueprint");
    await page.locator("#blueprint-form button").click();
    await revision(page, 4);
    await tab(page, "owned-attachments");
    await page.locator("#tracker-search").fill("FSS IS300");
    await page.locator("[data-owned-attachment]").check();
    await revision(page, 5);
    await tab(page, "camos");
    const camo = page
      .locator('[data-camo-tier="military"] [data-camo-tile]')
      .first();
    const camoId = await camo.getAttribute("data-camo-tile");
    await camo.click();
    await page.locator(`[data-camo-complete="${camoId}"]`).check();
    await revision(page, 6);
    assert.equal(await camo.getAttribute("data-state"), "completed");
    await page.goto(base + "/armory/han-86/#camos");
    await ready(page);
    assert.equal(
      await page
        .locator(`[data-camo-tile="${camoId}"]`)
        .getAttribute("data-state"),
      "completed",
    );
    await tab(page, "acquisition");
    assert(await page.locator("#tracker-manual").isChecked());
    assert.equal(
      await page.locator("#weapon-extraction-count").textContent(),
      "1 / 3",
    );
    assert(await page.locator("[data-unified-blueprint]").first().isChecked());
    await tab(page, "owned-attachments");
    assert(
      await page.locator('[data-owned-attachment="fss-is300"]').isChecked(),
    );

    // Shared camo key survives navigation to another weapon, using the same owner.
    await tab(page, "camos");
    await page.locator('[data-camo-tile="divergence"]').click();
    await page.locator('[data-camo-complete="divergence"]').check();
    await revision(page, 7);
    await page.goto(base + "/armory/m4/#camo:divergence");
    await ready(page);
    assert.equal(
      await page
        .locator('[data-camo-tile="divergence"]')
        .getAttribute("data-state"),
      "completed",
    );
    assert(await page.locator('[data-camo-detail="divergence"]').isVisible());

    // Switching tabs keeps build/evidence drafts; native weapon navigation guards them.
    await tab(page, "builder");
    await page
      .locator('#build-form [name="name"]')
      .fill("Synthetic retained draft");
    await tab(page, "evidence");
    await page
      .locator('#evidence-form [name="method"]')
      .fill("Synthetic unsaved method");
    await tab(page, "camos");
    await tab(page, "builder");
    assert.equal(
      await page.locator('#build-form [name="name"]').inputValue(),
      "Synthetic retained draft",
    );
    page.once("dialog", (dialog) => dialog.dismiss());
    await page.locator(".weapon-picker summary").click();
    await page
      .locator('[data-weapon-context="han-86"]')
      .click({ noWaitAfter: true });
    await page.waitForTimeout(200);
    assert.equal(new URL(page.url()).pathname, "/armory/m4/");
    assert.equal(
      await page.locator('#build-form [name="name"]').inputValue(),
      "Synthetic retained draft",
    );
    await tab(page, "evidence");
    assert.equal(
      await page.locator('#evidence-form [name="method"]').inputValue(),
      "Synthetic unsaved method",
    );
    await tab(page, "backups");
    page.once("dialog", (dialog) => dialog.accept());
    await page.locator("#workspace-reload").click();
    await ready(page);

    // Hold completion notification after a real IDB commit: every embedded writer locks.
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
              window.releaseWeaponSave = () =>
                tx.dispatchEvent(new Event("complete"));
            },
            { once: true, capture: true },
          );
        }
        return tx;
      };
    });
    await tab(page, "acquisition");
    await page.locator('[data-extraction-step="1"]').click();
    await page.waitForFunction(
      () => typeof window.releaseWeaponSave === "function",
    );
    assert(await page.locator("#tracker-manual").isDisabled());
    assert(await page.locator("[data-camo-complete]").first().isDisabled());
    assert(await page.locator("[data-owned-attachment]").first().isDisabled());
    await page.evaluate(() => window.releaseWeaponSave());
    await revision(page, 8);

    // Quota failure retains the exact candidate and makes cross-tab controls read-only.
    await page.evaluate(() => {
      const native = IDBObjectStore.prototype.put;
      IDBObjectStore.prototype.put = function (...args) {
        if (this.name === "workspace") {
          IDBObjectStore.prototype.put = native;
          throw new DOMException("Synthetic quota test", "QuotaExceededError");
        }
        return native.apply(this, args);
      };
    });
    await page.locator('[data-extraction-step="1"]').click();
    await page.waitForFunction(() =>
      document
        .querySelector("#armory-error")
        .textContent.includes("Synthetic quota"),
    );
    assert.equal((await saved(page)).revision, 8);
    await tab(page, "camos");
    assert(await page.locator("[data-camo-complete]").first().isDisabled());
    await tab(page, "backups");
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.locator("#workspace-unsaved").click(),
    ]);
    const candidate = JSON.parse(await readFile(await download.path(), "utf8"));
    assert.equal(candidate.workspace.acquisition.m4.manualExtractions, 2);
    await page.locator("#workspace-retry").click();
    await revision(page, 9);

    // Concurrent-tab write is rejected by the existing compare-and-swap boundary.
    const other = await context.newPage();
    await other.goto(base + "/armory/m4/");
    await ready(other);
    await other.locator("#tracker-manual").check();
    await revision(other, 10);
    await tab(page, "acquisition");
    await page.locator('[data-extraction-step="1"]').click();
    await page.waitForFunction(() =>
      /Another tab/.test(document.querySelector("#armory-error").textContent),
    );
    assert.equal((await saved(page)).acquisition.m4.manualExtractions, 2);
    assert(await page.locator("#tracker-manual").isDisabled());
    await tab(page, "backups");
    page.once("dialog", (dialog) => dialog.accept());
    await page.locator("#workspace-reload").click();
    await revision(page, 10);
    await other.close();

    for (const [route, pathname, section] of [
      ["/armory/workbench/?weapon=m4#builder", "/armory/m4/", "builder"],
      [
        "/armory/acquisition/?weapon=han-86#weapon-han-86",
        "/armory/han-86/",
        "acquisition",
      ],
      ["/armory/camos/m4/#divergence", "/armory/m4/", "camos"],
      ["/armory/camos/m4/#helio", "/armory/m4/", "camos"],
    ]) {
      await page.goto(base + route);
      await ready(page);
      assert.equal(new URL(page.url()).pathname, pathname);
      assert(await page.locator("#" + section).isVisible());
      if (route.endsWith("#helio"))
        assert(await page.locator('[data-camo-detail="helio"]').isVisible());
    }
    await page.goto(base + "/armory/cronen-osprey/#builder");
    await ready(page);
    assert.match(await page.locator("#builder").innerText(), /not catalogued/);
    assert(await page.locator("#build-form button[type=submit]").isDisabled());
    await tab(page, "camos");
    assert.equal(await page.locator("[data-camo-tile]").count(), 25);
    await tab(page, "reference");
    assert.match(
      await page.locator("#reference").innerText(),
      /no substitute weapon/,
    );

    await page.goto(base + "/armory/?weapon=m4#acquisition");
    await ready(page);
    assert.equal(new URL(page.url()).pathname, "/armory/m4/");
    await page.goto(base + "/armory/m4/?weapon=unknown#acquisition");
    await ready(page);
    assert.match(
      await page.locator("#armory-status").innerText(),
      /Unknown or repeated weapon selection ignored/,
    );
    await page.goto(base + "/armory/han-86/");
    await ready(page);
    let layouts = 0;
    for (const width of [320, 390, 768, 1440])
      for (const theme of ["dark", "light"])
        for (const zoom of [1, 2]) {
          await page.setViewportSize({ width, height: 900 });
          await page.evaluate(
            ({ theme, zoom }) => {
              document.documentElement.dataset.theme = theme;
              document.documentElement.style.fontSize =
                zoom === 2 ? "200%" : "";
            },
            { theme, zoom },
          );
          for (const section of [
            "acquisition",
            "owned-attachments",
            "camos",
            "builder",
            "compare",
            "evidence",
            "reference",
            "backups",
          ]) {
            await tab(page, section);
            assert(
              await page.evaluate(
                () => document.documentElement.scrollWidth <= innerWidth + 1,
              ),
              `${section} ${width} ${theme} ${zoom}`,
            );
            layouts++;
          }
        }
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "";
      document.documentElement.dataset.theme = "dark";
    });
    await mkdir("test-results", { recursive: true });
    // WebKit's screenshot tool inserts an animation-sync stylesheet. Isolate
    // captures from acceptance: every interaction above used the normal CSP,
    // and its console/request checks have no allowances.
    const captureContext =
      browser.browserType().name() === "webkit"
        ? await browser.newContext({ bypassCSP: true })
        : null;
    try {
      const capturePage = captureContext
        ? await captureContext.newPage()
        : page;
      if (captureContext) {
        await capturePage.goto(base + "/armory/han-86/#camos");
        await ready(capturePage);
      }
      for (const [label, width] of [
        ["desktop", 1440],
        ["mobile", 390],
      ]) {
        await capturePage.setViewportSize({ width, height: 900 });
        await tab(capturePage, "camos");
        await capturePage.screenshot({
          path: `test-results/weapons108-${name}-${label}.png`,
          caret: "initial",
        });
      }
    } finally {
      await captureContext?.close();
    }
    console.log(
      `108 ${name} PASS: root/detail and shared progress, manual/count/blueprint/attachment/camo saves, retained drafts, held write, quota export/retry, stale CAS, legacy aliases, unsupported stats, ${layouts} layouts`,
    );
  } finally {
    await context.close();
  }
  const native = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await native.newPage();
    await page.goto(base + "/armory/camos/m4/");
    await page.locator("#weapon-alias").click();
    assert.equal(new URL(page.url()).pathname, "/armory/m4/");
    await page.locator("#weapon-intel").scrollIntoViewIfNeeded();
    assert.match(
      await page.locator("#reference").innerText(),
      /Official launch sheet/,
    );
    const requirements = page.getByRole("heading", {
      name: "All camo requirements",
      exact: true,
    });
    await requirements.scrollIntoViewIfNeeded();
    assert(await requirements.isVisible());
  } finally {
    await native.close();
  }
}
