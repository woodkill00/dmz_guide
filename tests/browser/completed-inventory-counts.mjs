import assert from "node:assert/strict";
import { chromium, firefox, webkit } from "playwright";
import { revealTrackerControl } from "./tracker-controls.mjs";
import { mkdir } from "node:fs/promises";
const engine = process.env.BROWSER || "chromium",
  browser = await { chromium, firefox, webkit }[engine].launch(),
  page = await browser.newPage({ viewport: { width: 1440, height: 1000 } }),
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const base = "http://127.0.0.1:4173",
  pack = "official:mw4-dmz-starter",
  id = "mw4:ingredient-detonators",
  url = (path) => base + "/" + path + "/?pack=" + encodeURIComponent(pack),
  ready = () =>
    page.waitForFunction(
      () =>
        document.querySelector("main")?.getAttribute("aria-busy") === "false",
    );
try {
  await page.goto(url("inventory"));
  await ready();
  await page.waitForLoadState("networkidle");
  const linked = await page.evaluate(async (id) => {
    const { state } = await import("/assets/src/client/common.mjs"),
      { newProfile } = await import("/assets/src/domain/profile.mjs"),
      { saveProfile } = await import("/assets/src/storage/store.mjs");
    const p = newProfile(state.pack),
      linked = state.pack.objectives.filter(
        (o) =>
          o.track === "dmz-upgrade" &&
          o.requirements.some((r) => r.itemId === id),
      );
    for (const o of linked)
      p.upgradeProgress[o.id] = {
        completion: "completed",
        availability: "unknown",
        reviewRequired: false,
      };
    p.inventory[id] = 5;
    await saveProfile(p, 0);
    return linked.map((o) => ({
      id: o.id,
      quantity: o.requirements
        .filter((r) => r.itemId === id)
        .reduce((n, r) => n + r.quantity, 0),
    }));
  }, id);
  assert.equal(linked.length, 2);
  await page.reload();
  await ready();
  await page.waitForLoadState("networkidle");
  await page.locator("#inventory-query").fill("Detonators");
  const cell = () =>
    page
      .locator('[data-upgrade-need="collection"][data-item="' + id + '"]')
      .first();
  assert(await cell().locator("[data-tier-required]").isVisible());
  assert.equal(await cell().locator("[data-tier-required]").innerText(), "0");
  assert.equal(await cell().locator("[data-tier-missing]").innerText(), "0");
  assert.match(await cell().innerText(), /All listed requirements completed/);
  assert.match(
    await page.locator(".inventory-upgrade-use").first().innerText(),
    /Upgrade use completed/,
  );
  await mkdir(".local/item-icons/completed-counts", { recursive: true });
  if (engine !== "webkit")
    await page.screenshot({
      path: ".local/item-icons/completed-counts/" + engine + ".png",
    });
  await page.goto(url("upgrades"));
  await ready();
  await revealTrackerControl(page, "#upgrade-layout");
  await page.locator("#upgrade-layout").selectOption("flat");
  await page.locator('[data-complete-upgrade="' + linked[0].id + '"]').click();
  await page.locator("#upgrade-progress-confirm").waitFor({ state: "visible" });
  await page.locator("#upgrade-progress-apply").click();
  await page.waitForFunction(
    async (id) =>
      (
        await (
          await import("/assets/src/storage/store.mjs")
        ).loadProfile("official:mw4-dmz-starter")
      ).value.upgradeProgress[id].completion === "incomplete",
    linked[0].id,
  );
  await page.goto(url("inventory"));
  await ready();
  await page.waitForLoadState("networkidle");
  await page.locator("#inventory-query").fill("Detonators");
  assert.equal(
    await cell().locator("[data-tier-required]").innerText(),
    String(linked[0].quantity),
  );
  assert.equal(
    await cell().locator("[data-tier-missing]").innerText(),
    String(Math.max(0, linked[0].quantity - 5)),
  );
  assert.match(
    await page.locator(".inventory-upgrade-use").first().innerText(),
    /unfinished/,
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS actual Detonators completed-use state shows visible0/0 and explanation; unchecking one real upgrade through confirmation restores its requirement and shortage against saved stock5.",
  );
} finally {
  await browser.close();
}
