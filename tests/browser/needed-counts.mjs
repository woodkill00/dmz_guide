import assert from "node:assert/strict";
import { chromium, firefox, webkit } from "playwright";
import { collectionFixture } from "../helpers/collection-needs.mjs";
import { revealTrackerControl } from "./tracker-controls.mjs";
const engine = process.env.BROWSER || "chromium",
  browser = await { chromium, firefox, webkit }[engine].launch(),
  context = await browser.newContext(),
  page = await context.newPage(),
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const base = "http://127.0.0.1:4173",
  pack = collectionFixture(),
  ready = (p) =>
    p.waitForFunction(
      () =>
        document.querySelector("main")?.getAttribute("aria-busy") === "false",
    ),
  url = (path) => base + "/" + path + "/?pack=" + encodeURIComponent(pack.id);
const mission = {
  ...structuredClone(pack.objectives[0]),
  id: "craft:mission",
  name: "Fictional story mission",
  track: "dmz-story",
};
delete mission.upgrade;
pack.objectives.push(mission);
const cell = () =>
    page.locator('[data-upgrade-need="collection"][data-item="craft:wire"]'),
  stock = () => page.locator('[data-field="inventory"][data-id="craft:wire"]');
try {
  await page.goto(base + "/inventory/?pack=demo%3Atraining-pack");
  await ready(page);
  await page.evaluate(async (pack) => {
    const { validatePack } = await import("/assets/src/content/validate.mjs");
    validatePack(
      pack,
      await (await fetch("/assets/schemas/pack.schema.json")).json(),
    );
    const { commitRecord, saveProfile } = await import(
        "/assets/src/storage/store.mjs"
      ),
      { newProfile } = await import("/assets/src/domain/profile.mjs");
    await commitRecord("content", pack.id, { pack, revision: 0 }, 0);
    const p = newProfile(pack);
    for (const i of pack.items) p.inventory[i.id] = 0;
    p.reserves["craft:wire"] = 2;
    await saveProfile(p, 0);
  }, pack);
  await page.goto(url("inventory"));
  await ready(page);
  await page.locator("#inventory-query").fill("Fictional wire");
  assert(await cell().isVisible());
  assert.deepEqual(
    await cell().locator(".inventory-count-column > small").allTextContents(),
    ["Needed", "Missing"],
  );
  assert(await cell().locator("[data-tier-required]").isVisible());
  assert(await cell().locator("[data-tier-missing]").isVisible());
  assert.equal(await cell().locator("[data-tier-required]").innerText(), "18");
  assert.equal(await cell().locator("[data-tier-missing]").innerText(), "20");
  assert.equal(
    await cell()
      .locator("[data-tier-missing]")
      .getAttribute("data-needed-number"),
    "short",
  );
  await stock().fill("20");
  assert.equal(await cell().locator("[data-tier-missing]").innerText(), "0");
  assert.equal(
    await cell()
      .locator("[data-tier-missing]")
      .getAttribute("data-needed-number"),
    "covered",
  );
  const needed = await context.newPage();
  needed.on("pageerror", (e) => errors.push(e.message));
  await needed.goto(url("needed"));
  await ready(needed);
  await needed.locator("#needed-scope").selectOption("collection");
  await needed.locator("#needed-query").fill("Fictional wire");
  await revealTrackerControl(needed, "#needed-hide-covered");
  await needed.locator("#needed-hide-covered").uncheck();
  const row = () => needed.locator('[data-needed-item="craft:wire"]'),
    value = (key) =>
      row()
        .locator("[data-needed-" + key + "] .needed-number")
        .innerText();
  assert(
    await row().locator("[data-needed-required]").isVisible(),
    "Needed must appear without opening calculations",
  );
  assert(
    await row().locator("[data-needed-missing]").isVisible(),
    "Missing must appear without opening calculations",
  );
  assert.deepEqual(
    await row().locator(".needed-metric-label").allTextContents(),
    ["Needed", "Owned", "Missing"],
  );
  assert.equal(await value("required"), "18");
  assert.equal(await value("missing"), "20");
  await page
    .getByRole("button", { name: "Save inventory", exact: true })
    .click();
  await page.waitForFunction(
    () =>
      document.querySelector(".inventory-save-bar")?.dataset.dirty === "false",
  );
  await revealTrackerControl(needed, "#needed-refresh");
  await needed.locator("#needed-refresh").click();
  await needed.waitForFunction(
    () =>
      document.querySelector(
        '[data-needed-item="craft:wire"] [data-needed-missing] .needed-number',
      )?.textContent === "0",
  );
  assert.equal(await value("missing"), "0");
  await stock().fill("");
  assert.equal(
    await cell().locator("[data-tier-missing]").innerText(),
    "Enter owned",
  );
  assert.equal(
    await cell()
      .locator("[data-tier-missing]")
      .getAttribute("data-needed-number"),
    "review",
  );
  await stock().fill("0");
  assert.equal(await cell().locator("[data-tier-missing]").innerText(), "20");
  await stock().fill("-1");
  assert.equal(
    await cell().locator("[data-tier-missing]").innerText(),
    "Unknown",
  );
  await page.locator("#cancel-inventory").click();
  await page.waitForFunction(
    () =>
      document.querySelector(".inventory-save-bar")?.dataset.dirty === "false",
  );
  assert.equal(await stock().inputValue(), "20");
  await needed.locator("#needed-scope").selectOption("upgrades");
  assert.equal(
    await needed.locator('[data-needed-item="craft:wire"]').count(),
    0,
  );
  await needed.locator("#needed-query").fill("");
  assert.equal(
    await needed
      .locator(
        '[data-needed-item="craft:output"] [data-needed-required] .needed-number',
      )
      .innerText(),
    "3",
  );
  await needed.evaluate(async () => {
    const { state } = await import("/assets/src/client/common.mjs"),
      { loadProfile, saveProfile } = await import(
        "/assets/src/storage/store.mjs"
      );
    const row = await loadProfile(state.pack.id);
    row.value.completion["craft:mission"] = "completed";
    await saveProfile(row.value, row.value.revision);
  });
  await revealTrackerControl(needed, "#needed-refresh");
  await needed.locator("#needed-refresh").click();
  await needed.locator("#needed-scope").selectOption("collection");
  await needed.locator("#needed-query").fill("Fictional wire");
  assert.equal(await value("required"), "12");
  assert.equal(await value("missing"), "0");
  await needed.evaluate(async () => {
    const { state } = await import("/assets/src/client/common.mjs"),
      { loadProfile, saveProfile } = await import(
        "/assets/src/storage/store.mjs"
      );
    const row = await loadProfile(state.pack.id);
    row.value.upgradeProgress["craft:upgrade"] = {
      completion: "completed",
      availability: "unknown",
      reviewRequired: false,
    };
    await saveProfile(row.value, row.value.revision);
  });
  await revealTrackerControl(needed, "#needed-refresh");
  await needed.locator("#needed-refresh").click();
  await needed.waitForFunction(
    () => !document.querySelector('[data-needed-item="craft:wire"]'),
  );
  assert.equal(await row().count(), 0);
  for (const width of [320, 390, 900, 1440]) {
    await needed.setViewportSize({ width, height: 900 });
    assert(
      await needed.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    );
  }
  assert.deepEqual(errors, []);
  console.log(
    "PASS upgrade/mission shared recipe requirements; live draft shortage colors and blank/zero/invalid distinction; saved Needed scope agrees after save/refresh; consumed/retained/yield/reserve accounting; completion removes demands; explicit scopes and mobile.",
  );
  await needed.close();
} finally {
  await browser.close();
}
