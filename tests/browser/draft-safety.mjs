import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { captureDocumentEvidence } from "./page-edit.mjs";

const training = "demo:training-pack";
const official = "official:mw4-dmz-starter";
const wire = '[data-field="inventory"][data-id="demo:wire"]';
const reserve = '[data-field="reserves"][data-id="demo:wire"]';
async function ready(page) {
  await page.waitForFunction(
    () => document.querySelector("main")?.getAttribute("aria-busy") === "false",
  );
}

/** Baseline mode records reproduced defects, never a release acceptance pass. */
export async function runDraftSafetyTests({
  browser,
  base,
  baseline = false,
  captureScreenshots = true,
  prefix = browser.browserType().name(),
}) {
  const evidence = { baseline, scenarios: [] };
  if (!baseline) {
    const staticContext = await browser.newContext({
      javaScriptEnabled: false,
    });
    try {
      const staticPage = await staticContext.newPage();
      await staticPage.goto(`${base}/settings/`);
      for (const id of [
        "export-profile",
        "export-current-profile",
        "reset-profile",
        "rebind-profile",
        "recover-profile",
        "import-profile",
      ])
        assert.equal(
          await staticPage.locator(`#${id}`).isDisabled(),
          true,
          `${id} disabled in initial HTML without client execution`,
        );
    } finally {
      await staticContext.close();
    }
  }
  const startup = await browser.newContext();
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  await startup.route("**/assets/schemas/pack.schema.json", async (route) => {
    await gate;
    await route.continue();
  });
  const early = await startup.newPage();
  const downloads = [];
  early.on("download", (download) => downloads.push(download));
  try {
    await early.goto(`${base}/settings/?pack=${encodeURIComponent(training)}`, {
      waitUntil: "domcontentloaded",
    });
    if (baseline) {
      assert.equal(await early.locator("#export-profile").isEnabled(), true);
      const event = early.waitForEvent("download");
      await early.click("#export-profile");
      const download = await event;
      assert.equal(
        JSON.parse(await readFile(await download.path(), "utf8")),
        null,
      );
      evidence.scenarios.push(
        "REPRODUCED C3: delayed initialization permits a null profile download",
      );
    } else {
      for (const id of [
        "export-profile",
        "export-current-profile",
        "reset-profile",
        "rebind-profile",
        "recover-profile",
        "import-profile",
      ])
        assert.equal(
          await early.locator(`#${id}`).isDisabled(),
          true,
          `${id} disabled during initialization`,
        );
      assert.equal(downloads.length, 0);
      evidence.scenarios.push("Startup mutations and both exports disabled");
    }
  } finally {
    release();
    await ready(early);
    await startup.close();
  }
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await page.goto(`${base}/inventory/?pack=${encodeURIComponent(training)}`);
    await ready(page);
    await page.locator(wire).fill("17");
    await page.locator(reserve).fill("4");
    await page.selectOption("#pack-select", official);
    if (baseline) {
      await page.waitForFunction(() =>
        document.querySelector("#pack-note").textContent.includes("MW4"),
      );
      assert.equal(await page.locator("#draft-navigation:visible").count(), 0);
      await page.selectOption("#pack-select", training);
      await page.waitForSelector(wire);
      assert.equal(await page.locator(wire).inputValue(), "0");
      assert.equal(await page.locator(reserve).inputValue(), "0");
      evidence.scenarios.push(
        "REPRODUCED C1: pack change silently loses inventory 17 and reserve 4",
      );
    } else {
      await page.waitForSelector("#draft-navigation:visible");
      await page.click("#draft-stay");
      assert.equal(await page.locator("#pack-select").inputValue(), training);
      assert.equal(await page.locator(wire).inputValue(), "17");
      assert.equal(await page.locator(reserve).inputValue(), "4");
      await page.selectOption("#pack-select", official);
      await page.click("#draft-save");
      await page.waitForFunction(() =>
        document.querySelector("#pack-note").textContent.includes("MW4"),
      );
      await page.selectOption("#pack-select", training);
      await page.waitForSelector(wire);
      assert.equal(await page.locator(wire).inputValue(), "17");
      assert.equal(await page.locator(reserve).inputValue(), "4");
      await page.locator(wire).fill("31");
      await page.selectOption("#pack-select", official);
      await page.click("#draft-discard");
      await page.waitForFunction(() =>
        document.querySelector("#pack-note").textContent.includes("MW4"),
      );
      await page.selectOption("#pack-select", training);
      await page.waitForSelector(wire);
      assert.equal(await page.locator(wire).inputValue(), "17");
      evidence.scenarios.push(
        "Pack switch Stay/Save/Discard preserve exact draft or durable values",
      );
    }
  } finally {
    await context.close();
  }
  if (!baseline)
    await extendedJourneys({ browser, base, captureScreenshots, prefix });
  await writeFile(
    `test-results/${prefix}-draft-safety-${baseline ? "baseline-reproduction" : "acceptance"}.json`,
    JSON.stringify(evidence, null, 2),
  );
  console.log(
    baseline
      ? "Draft-safety baseline defects reproduced (not release acceptance)"
      : "Draft-safety focused acceptance passed",
    evidence.scenarios,
  );
}

async function exportBackup(page, selector) {
  const event = page.waitForEvent("download");
  await page.click(selector);
  const download = await event;
  const filename = download.suggestedFilename();
  assert.match(filename, /^[a-zA-Z0-9_.-]+\.json$/);
  assert(filename.length <= 200, "Backup filename bounded");
  assert.match(filename, /training-pack/);
  assert.match(filename, /\d{4}/, "Backup identifies date/time");
  const backup = JSON.parse(await readFile(await download.path(), "utf8"));
  assert.equal(backup.packId, training);
  assert(
    filename.includes(
      String(backup.contentVersion).replace(/[^a-zA-Z0-9_.-]/g, "-"),
    ),
    "Filename identifies content version",
  );
  assert.match(
    await page.locator("#save-status").textContent(),
    /request|initiat/i,
  );
  return backup;
}

async function extendedJourneys({ browser, base, captureScreenshots, prefix }) {
  const context = await browser.newContext();
  await context.addInitScript(() => {
    const put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (...args) {
      if (window.failDraftSave)
        throw new DOMException("Injected draft quota", "QuotaExceededError");
      return put.apply(this, args);
    };
  });
  const page = await context.newPage();
  const inventoryUrl = `${base}/inventory/?pack=${encodeURIComponent(training)}`;
  const plannerLink = () => page.locator('a[href*="/planner/"]').first();
  try {
    await page.goto(inventoryUrl);
    await ready(page);
    // A reverted quantity and unrelated search text do not create dirty work.
    await page.locator(wire).fill("9");
    await page.locator(wire).fill("0");
    await page.fill("#inventory-query", "wire");
    await plannerLink().click();
    await page.waitForURL("**/planner/**");
    await ready(page);
    assert.equal(await page.locator("#draft-navigation:visible").count(), 0);
    await page.goto(inventoryUrl);
    await ready(page);
    await page.locator(wire).fill("23");
    await page.locator(reserve).fill("5");
    await plannerLink().click();
    await page.waitForSelector("#draft-navigation:visible");
    await page.keyboard.press("Escape");
    assert.equal(await page.locator(wire).inputValue(), "23");
    assert.equal(await page.locator(reserve).inputValue(), "5");
    assert.equal(new URL(page.url()).pathname, "/inventory/");
    assert(
      await plannerLink().evaluate((n) => document.activeElement === n),
      "Escape restores initiating link focus",
    );
    // A full current-page link is a real reload, not a fragment-only no-op.
    const selfLink = page.getByRole("link", { name: "Inventory", exact: true });
    assert.equal(
      new URL(await selfLink.getAttribute("href"), page.url()).hash,
      "",
      "Self-link regression targets a full navigation, not skip-to-content",
    );
    await selfLink.click();
    await page.waitForSelector("#draft-navigation:visible");
    await page.click("#draft-stay");
    assert.equal(await page.locator(wire).inputValue(), "23");
    assert.equal(await page.locator(reserve).inputValue(), "5");
    if (browser.browserType().name() === "chromium") {
      // Simulate a second unload participant cancelling an explicitly approved
      // departure. It must not permanently disable this app's next guard.
      await page.evaluate(() => {
        window.cancelTestDeparture = (event) => {
          event.preventDefault();
          event.returnValue = "";
        };
        window.addEventListener("beforeunload", window.cancelTestDeparture);
      });
      let cancelled = false;
      page.once("dialog", async (dialog) => {
        assert.equal(dialog.type(), "beforeunload");
        cancelled = true;
        await dialog.dismiss();
      });
      await plannerLink().click();
      await page.click("#draft-discard");
      assert(
        cancelled,
        "Synthetic second unload participant actually cancels navigation",
      );
      assert.equal(new URL(page.url()).pathname, "/inventory/");
      assert.equal(await page.locator(wire).inputValue(), "23");
      await page.evaluate(() => {
        window.removeEventListener("beforeunload", window.cancelTestDeparture);
        delete window.cancelTestDeparture;
      });
      await plannerLink().click();
      await page.waitForSelector("#draft-navigation:visible");
      await page.click("#draft-stay");
    }
    // Export does not save the draft or clear departure protection.
    const backup = await exportBackup(page, "#export-current-profile");
    assert.equal(backup.inventory["demo:wire"], 23);
    assert.equal(backup.reserves["demo:wire"], 5);
    await plannerLink().click();
    await page.click("#draft-stay");
    // Chromium supports a native beforeunload prompt in this headless harness.
    // Other engines retain the full custom-navigation and persistence journeys.
    if (browser.browserType().name() === "chromium") {
      let observed = false;
      page.once("dialog", async (dialog) => {
        assert.equal(dialog.type(), "beforeunload");
        observed = true;
        await dialog.dismiss();
      });
      await page.reload({ timeout: 5000 }).catch((reason) => {
        assert.match(reason.message, /ERR_ABORTED|Timeout|cancel/i);
      });
      assert(observed, "Dirty refresh invokes native unload protection");
      assert.equal(await page.locator(wire).inputValue(), "23");
      assert.equal(await page.locator(reserve).inputValue(), "5");
    }
    // Invalid raw input remains empty, never coerced to zero by failed Save.
    await page.locator(wire).fill("");
    const downloads = [];
    page.on("download", (value) => downloads.push(value));
    await page.click("#export-current-profile");
    await page.waitForSelector("#error:not([hidden])");
    assert.equal(downloads.length, 0, "Invalid draft cannot download");
    await page.evaluate(() => {
      document.querySelector("#error").hidden = true;
    });
    await plannerLink().click();
    await page.click("#draft-save");
    await page.waitForSelector("#error:not([hidden])");
    assert.equal(await page.locator(wire).inputValue(), "");
    assert.equal(await page.locator(reserve).inputValue(), "5");
    assert.equal(new URL(page.url()).pathname, "/inventory/");
    if (await page.locator("#draft-navigation:visible").count())
      await page.click("#draft-stay");
    // A determinate quota failure cannot complete navigation or erase valid input.
    await page.locator(wire).fill("29");
    await page.evaluate(() => {
      window.failDraftSave = true;
    });
    await page.evaluate(() => {
      document.querySelector("#error").hidden = true;
    });
    await plannerLink().click();
    await page.click("#draft-save");
    await page.waitForSelector("#error:not([hidden])");
    assert.equal(new URL(page.url()).pathname, "/inventory/");
    assert.equal(await page.locator(wire).inputValue(), "29");
    assert.equal(await page.locator(reserve).inputValue(), "5");
    if (await page.locator("#draft-navigation:visible").count())
      await page.click("#draft-stay");
    await page.evaluate(() => {
      window.failDraftSave = false;
    });
    await plannerLink().click();
    await page.click("#draft-save");
    await page.waitForURL("**/planner/**");
    await ready(page);
    await page.goto(inventoryUrl);
    await ready(page);
    assert.equal(await page.locator(wire).inputValue(), "29");
    await page.locator(wire).fill("41");
    await plannerLink().click();
    await page.click("#draft-discard");
    await page.waitForURL("**/planner/**");
    await ready(page);
    await page.goto(inventoryUrl);
    await ready(page);
    assert.equal(await page.locator(wire).inputValue(), "29");
    // Both settings-page controls export the exact same validated durable state.
    await page.goto(`${base}/settings/?pack=${encodeURIComponent(training)}`);
    await ready(page);
    const first = await exportBackup(page, "#export-current-profile");
    const second = await exportBackup(page, "#export-profile");
    assert.deepEqual(first, second);
    assert.equal(first.inventory["demo:wire"], 29);
    if (captureScreenshots) await visualJourneys({ page, base, prefix });
  } finally {
    await context.close();
  }
}

async function visualJourneys({ page, base, prefix }) {
  await page.route("**/__draft-text-zoom.css", (route) =>
    route.fulfill({ contentType: "text/css", body: ":root{font-size:200%}" }),
  );
  for (const theme of ["dark", "light"])
    for (const width of [320, 390, 1280])
      for (const enlarged of [false, true]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(
          `${base}/inventory/?pack=${encodeURIComponent(training)}`,
        );
        await ready(page);
        if ((await page.locator("html").getAttribute("data-theme")) !== theme)
          await page.click("#theme-toggle");
        await page.waitForFunction(
          (value) => document.documentElement.dataset.theme === value,
          theme,
        );
        const before = await page
          .locator("body")
          .evaluate((n) => parseFloat(getComputedStyle(n).fontSize));
        if (enlarged) {
          await page.addStyleTag({ url: `${base}/__draft-text-zoom.css` });
          assert.equal(
            await page
              .locator("html")
              .evaluate((n) => parseFloat(getComputedStyle(n).fontSize)),
            32,
          );
          assert.equal(
            await page
              .locator("body")
              .evaluate((n) => parseFloat(getComputedStyle(n).fontSize)),
            before * 2,
          );
        }
        await page.locator(wire).fill("73");
        await page.selectOption("#pack-select", official);
        await page.waitForSelector("#draft-navigation:visible");
        assert(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
          "Dirty dialog has no horizontal page overflow",
        );
        const titleGeometry = await page
          .locator("#draft-navigation-title")
          .evaluate((heading) => {
            const dialogNode = heading.closest("dialog");
            const rect = (node) => {
              const r = node.getBoundingClientRect();
              return {
                top: r.top,
                bottom: r.bottom,
                left: r.left,
                right: r.right,
                width: r.width,
                height: r.height,
              };
            };
            return {
              title: rect(heading),
              dialog: rect(dialogNode),
              scrollTop: dialogNode.scrollTop,
              scrollHeight: dialogNode.scrollHeight,
              clientHeight: dialogNode.clientHeight,
              viewport: { width: innerWidth, height: innerHeight },
              focused: document.activeElement?.id,
            };
          });
        const titleEvidence = { theme, width, enlarged, ...titleGeometry };
        await writeFile(
          `test-results/${prefix}-draft-dialog-${theme}-${width}-${enlarged ? "text200" : "normal"}-geometry.json`,
          JSON.stringify(titleEvidence, null, 2),
        );
        await captureDocumentEvidence(
          page,
          `test-results/${prefix}-draft-dialog-${theme}-${width}-${enlarged ? "text200" : "normal"}.png`,
        );
        assert(
          titleGeometry.title.top >= titleGeometry.dialog.top &&
            titleGeometry.title.bottom <= titleGeometry.dialog.bottom &&
            titleGeometry.title.top >= 0 &&
            titleGeometry.title.bottom <= titleGeometry.viewport.height,
          `The complete dirty-dialog title is visible on opening: ${JSON.stringify(titleEvidence)}`,
        );
        for (const id of ["draft-save", "draft-discard", "draft-stay"]) {
          const button = page.locator(`#${id}`);
          assert(await button.isVisible());
          assert(
            await button.evaluate((n) => {
              const r = n.getBoundingClientRect();
              return (
                r.width >= 44 &&
                r.height >= 44 &&
                r.left >= 0 &&
                r.right <= innerWidth + 1
              );
            }),
            "Decision controls retain touch target and fit viewport",
          );
        }
        await page.click("#draft-stay");
        assert.equal(await page.locator(wire).inputValue(), "73");
        await page.selectOption("#pack-select", official);
        await page.click("#draft-discard");
        await ready(page);
      }
}
