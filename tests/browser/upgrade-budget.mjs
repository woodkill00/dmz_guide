import { revealTrackerControl } from "./tracker-controls.mjs";
import assert from "node:assert/strict";
import { chromium, firefox, webkit } from "playwright";
import { mkdir } from "node:fs/promises";
const engine = { chromium, firefox, webkit }[process.env.BROWSER || "chromium"];
const browser = await engine.launch();
const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  }),
  page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
const base = process.env.TEST_BASE || "http://127.0.0.1:4173",
  pack = "official:mw4-dmz-starter";
const url = (path) => `${base}/${path}/?pack=${encodeURIComponent(pack)}`;
const ready = () =>
  page.waitForFunction(
    () => document.querySelector("main")?.getAttribute("aria-busy") === "false",
  );
const saved = () =>
  page.evaluate(
    async () =>
      await (
        await import("/assets/src/storage/store.mjs")
      ).loadProfile("official:mw4-dmz-starter"),
  );
const row = (id) => page.locator(`[data-needed-item="${id}"]`);
const cell = async (id, key) =>
  Number(
    (
      await row(id)
        .locator("[data-needed-" + key + "]")
        .evaluate((node) => node.firstChild.textContent)
    ).replaceAll(",", ""),
  );
try {
  await mkdir(".local/upgrades-printer/screenshots", { recursive: true });
  await page.goto(url("upgrades"));
  await ready();
  assert.match(await page.locator("#upgrade-budget-summary").innerText(), /34/);
  await page.evaluate(async () => {
    const { state } = await import("/assets/src/client/common.mjs"),
      { newProfile } = await import("/assets/src/domain/profile.mjs"),
      { saveProfile } = await import("/assets/src/storage/store.mjs");
    const p = newProfile({ ...state.pack, schemaVersion: 1 });
    p.contentVersion = "2026.11.06.1";
    p.inventory["mw4:dmz-cash"] = 123;
    p.completion["mw4:printer-access"] = "completed";
    await saveProfile(p, 0);
  });
  await page.reload();
  await ready();
  await page.locator("#budget-setup").click();
  await page.locator("#budget-setup-dialog").waitFor({ state: "visible" });
  await page.locator("#budget-setup-cancel").click();
  assert.equal((await saved()).value.schemaVersion, 1);
  assert.equal((await saved()).value.inventory["mw4:dmz-cash"], 123);
  await page.locator("#budget-setup").click();
  await page.locator("#budget-setup-dialog").waitFor({ state: "visible" });
  await page.evaluate(async () => {
    (await import("/assets/src/client/common.mjs")).state.revision++;
  });
  await page.locator("#budget-setup-confirm").click();
  await page.locator("#budget-setup-dialog").waitFor({ state: "detached" });
  assert.equal((await saved()).value.schemaVersion, 1);
  await page.evaluate(async () => {
    (await import("/assets/src/client/common.mjs")).state.revision--;
  });
  await page.locator("#budget-setup").click();
  await page.locator("#budget-setup-confirm").click();
  await page.waitForFunction(
    async () =>
      (
        await (
          await import("/assets/src/storage/store.mjs")
        ).loadProfile("official:mw4-dmz-starter")
      )?.value.schemaVersion === 3,
  );
  await ready();
  let record = await saved();
  assert.equal(record.value.inventory["mw4:dmz-cash"], 123);
  assert.equal(record.value.completion["mw4:printer-access"], "completed");
  assert.equal(record.previous.schemaVersion, 1);
  assert.equal(await page.locator("#budget-setup").isVisible(), false);
  const ids = await page.evaluate(async () => {
    const { state } = await import("/assets/src/client/common.mjs"),
      { newProfile } = await import("/assets/src/domain/profile.mjs"),
      { saveProfile } = await import("/assets/src/storage/store.mjs");
    const p = newProfile(state.pack),
      lookup = {};
    for (const i of state.pack.items) {
      p.inventory[i.id] = 0;
      lookup[i.name] = i.id;
    }
    for (const o of state.pack.objectives.filter(
      (o) => o.track === "dmz-upgrade",
    ))
      p.upgradeProgress[o.id] = {
        completion: [
          "Stash Weapon Upgrade I",
          "Uncommon Ingredient Printing",
          "Epic Ingredient Printing",
        ].includes(o.name)
          ? "incomplete"
          : "completed",
        availability: "unknown",
        reviewRequired: false,
      };
    for (const [name, q] of Object.entries({
      "DMZ Cash": 50000,
      "Reactive Metals": 2,
      "Stock Rod": 10,
      CPU: 15,
      Electronics: 500,
      Chemicals: 400,
      Metals: 400,
    })) {
      const id =
        name === "DMZ Cash"
          ? state.pack.items.find((i) => i.kind === "currency").id
          : lookup[name];
      if (!id) throw Error("QA seed " + name);
      p.inventory[id] = q;
    }
    p.reserves[lookup["Reactive Metals"]] = 1;
    await saveProfile(p, state.revision);
    return {
      reactive: lookup["Reactive Metals"],
      comms: lookup["Comms Module"],
      cpu: lookup.CPU,
      common: state.pack.objectives.find(
        (o) => o.name === "Uncommon Ingredient Printing",
      ).id,
      epic: state.pack.objectives.find(
        (o) => o.name === "Epic Ingredient Printing",
      ).id,
      stash: state.pack.objectives.find(
        (o) => o.name === "Stash Weapon Upgrade I",
      ).id,
    };
  });
  const complete = async (id, expected = true) => {
    await page.goto(url("upgrades"));
    await ready();
    await revealTrackerControl(page, "#upgrade-layout");
    await page.locator("#upgrade-layout").selectOption("flat");
    await page.locator(`[data-complete-upgrade="${id}"]`).click();
    await page
      .locator("#upgrade-progress-confirm")
      .waitFor({ state: "visible" });
    await page.locator("#upgrade-progress-apply").click();
    await page.waitForFunction(
      async ({ id, expected }) =>
        (
          await (
            await import("/assets/src/storage/store.mjs")
          ).loadProfile("official:mw4-dmz-starter")
        ).value.upgradeProgress[id].completion ===
        (expected ? "completed" : "incomplete"),
      { id, expected },
    );
    await ready();
  };
  await page.goto(url("needed"));
  await ready();
  await page.locator("#needed-query").fill("Reactive Metals");
  assert.equal(await cell(ids.reactive, "required"), 20);
  assert.equal(await cell(ids.reactive, "held"), 2);
  assert.equal(await cell(ids.reactive, "missing"), 19);
  assert.equal(
    await row(ids.reactive)
      .locator("[data-needed-missing] [data-needed-number]")
      .getAttribute("data-needed-number"),
    "short",
  );
  assert.equal(
    await row(ids.reactive)
      .locator("[data-needed-missing] [data-needed-number]")
      .evaluate((n) => getComputedStyle(n).color),
    "rgb(255, 180, 180)",
  );
  assert.equal(await cell(ids.reactive, "printable"), 0);
  await row(ids.reactive)
    .getByText("Calculation / printing", { exact: true })
    .click();
  assert.match(await row(ids.reactive).innerText(), /not completed/);
  await complete(ids.common);
  await page.goto(url("needed"));
  await ready();
  await page.locator("#needed-query").fill("Reactive Metals");
  assert.equal(await cell(ids.reactive, "printable"), 19);
  assert.equal(await cell(ids.reactive, "after"), 0);
  const green = row(ids.reactive).locator(
    "[data-needed-after] [data-needed-number]",
  );
  const red = row(ids.reactive).locator(
    "[data-needed-held] [data-needed-number]",
  );
  assert.equal(await green.getAttribute("data-needed-number"), "covered");
  assert.equal(
    await green.evaluate((n) => getComputedStyle(n).color),
    "rgb(188, 245, 204)",
  );
  await page.locator("#theme-toggle").click();
  assert.equal(
    await green.evaluate((n) => getComputedStyle(n).color),
    "rgb(20, 84, 44)",
  );
  assert.equal(
    await red.evaluate((n) => getComputedStyle(n).color),
    "rgb(133, 22, 36)",
  );
  await page.locator("#theme-toggle").click();
  await page.locator("#needed-query").fill("Comms Module");
  assert.equal(await cell(ids.comms, "printable"), 0);
  await complete(ids.epic);
  await page.goto(url("needed"));
  await ready();
  await page.locator("#needed-query").fill("Comms Module");
  assert.equal(await cell(ids.comms, "required"), 5);
  assert.equal(await cell(ids.comms, "missing"), 5);
  assert.equal(await cell(ids.comms, "printable"), 5);
  assert.equal(await cell(ids.comms, "after"), 0);
  assert.equal(
    await page.locator(`[data-needed-print-input="${ids.cpu}"]`).count(),
    1,
  );
  assert.equal(
    await page
      .locator(`[data-needed-print-input="${ids.cpu}"] [data-needed-number]`)
      .first()
      .getAttribute("data-needed-number"),
    "covered",
  );
  record = await saved();
  assert.equal(record.value.inventory[ids.reactive], 2);
  assert.equal(record.value.inventory[ids.cpu], 15);
  assert.equal(record.value.inventory["mw4:dmz-cash"], 50000);
  await page.locator("#needed-query").fill("");
  if (engine.name() !== "webkit")
    await page.screenshot({
      path:
        ".local/upgrades-printer/screenshots/needed-" + engine.name() + ".png",
      fullPage: true,
      caret: "initial",
    });
  await page.setViewportSize({ width: 390, height: 844 });
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  assert.equal(
    await page
      .locator("#needed-list table, #needed-print-inputs table")
      .count(),
    0,
  );
  assert(
    (await page.locator("#needed-list [data-needed-category]").count()) > 0,
  );
  const groupHeader = await page
    .locator("#needed-list [data-needed-category] > summary")
    .first()
    .boundingBox();
  assert(groupHeader.height >= 44, "Grouped header keeps its touch target");
  assert(
    (await page
      .locator("#needed-list .needed-metric-label")
      .filter({ hasText: "Missing" })
      .count()) > 0,
  );
  if (engine.name() !== "webkit")
    await page.screenshot({
      path:
        ".local/upgrades-printer/screenshots/needed-mobile-" +
        engine.name() +
        ".png",
      caret: "initial",
    });
  await complete(ids.stash);
  await page.goto(url("needed"));
  await ready();
  assert.equal(await page.locator("[data-needed-item]").count(), 0);
  await complete(ids.stash, false);
  await page.goto(url("needed"));
  await ready();
  await page.locator("#needed-query").fill("Comms Module");
  assert.equal(await cell(ids.comms, "missing"), 5);
  await page.evaluate(async (id) => {
    const store = await import("/assets/src/storage/store.mjs"),
      r = await store.loadProfile("official:mw4-dmz-starter");
    r.value.inventory[id] = 5;
    await store.saveProfile(r.value, r.value.revision);
  }, ids.comms);
  await revealTrackerControl(page, "#needed-refresh");
  await page.locator("#needed-refresh").click();
  await page.waitForFunction(
    () => document.querySelectorAll("[data-needed-item]").length === 0,
  );
  await page.locator("#needed-hide-covered").uncheck();
  assert.equal(await cell(ids.comms, "missing"), 0);
  assert.equal(
    await row(ids.comms)
      .locator("[data-needed-held] [data-needed-number]")
      .getAttribute("data-needed-number"),
    "covered",
  );
  await revealTrackerControl(page, "#pack-select");
  await page
    .locator("#pack-select")
    .selectOption("observed:upgrade-review-20261026");
  await ready();
  assert.match(
    await page.locator("[data-needed-held]").first().innerText(),
    /Not entered/,
  );
  assert.equal(
    await page
      .locator("[data-needed-held] [data-needed-number]")
      .first()
      .getAttribute("data-needed-number"),
    "review",
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS: starter checklist and quantities, explicit legacy setup/cancel/stale/recovery, completion/uncheck/reload, saved inventory/reserves, gated Uncommon/Epic print forecasts, no spending, remaining totals, refresh, pack isolation, mobile/grouped layout and clean console.",
  );
} finally {
  await context.close();
  await browser.close();
}
