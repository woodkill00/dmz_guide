import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";

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
export async function runDraftSafetyTests({ browser, base, baseline = false }) {
  const evidence = { baseline, scenarios: [] };
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
  await writeFile(
    `test-results/draft-safety-${baseline ? "baseline-reproduction" : "acceptance"}.json`,
    JSON.stringify(evidence, null, 2),
  );
  console.log(
    baseline
      ? "Draft-safety baseline defects reproduced (not release acceptance)"
      : "Draft-safety focused acceptance passed",
    evidence.scenarios,
  );
}
