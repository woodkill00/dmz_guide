import assert from "node:assert/strict";
import { chromium, firefox, webkit } from "playwright";
const engine = process.env.BROWSER || "chromium",
  browser = await { chromium, firefox, webkit }[engine].launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } }),
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const base = "http://127.0.0.1:4173",
  key = "official:mw4-dmz-starter",
  url = (p) => `${base}/${p}/?pack=${encodeURIComponent(key)}`;
const ready = async () => {
  await page.waitForFunction(
    () => document.querySelector("main")?.getAttribute("aria-busy") === "false",
  );
  await page.waitForLoadState("networkidle");
};
try {
  await page.goto(url("upgrades"));
  await ready();
  assert.match(
    await page.locator("#upgrade-budget-summary").innerText(),
    /34 listed upgrades/,
  );
  const family = page.locator(
    '[data-upgrade-family-id][data-total-tiers="13"]',
  );
  assert(await family.isVisible());
  await family.locator("[data-toggle-tier-family]").click();
  assert.match(await family.innerText(), /Bank Upgrade XIII/);
  await page.evaluate(async () => {
    const { state } = await import("/assets/src/client/common.mjs"),
      { newProfile } = await import("/assets/src/domain/profile.mjs"),
      { saveProfile } = await import("/assets/src/storage/store.mjs");
    const p = newProfile(state.pack);
    p.contentVersion = "2026.11.09.1";
    p.inventory["mw4:dmz-cash"] = 1333601;
    p.reserves["mw4:dmz-cash"] = 100;
    p.upgradeProgress["mw4:upgrade-bank-upgrade-i"] = {
      completion: "completed",
      availability: "available",
      reviewRequired: false,
    };
    await saveProfile(p, 0);
  });
  await page.reload();
  await ready();
  await page.locator("#budget-setup").click();
  await page.locator("#budget-setup-confirm").click();
  await page.waitForFunction(async () => {
    const { loadProfile } = await import("/assets/src/storage/store.mjs");
    return (
      (await loadProfile("official:mw4-dmz-starter"))?.value.contentVersion ===
      "2026.11.10.1"
    );
  });
  const saved = await page.evaluate(
    async () =>
      (
        await (
          await import("/assets/src/storage/store.mjs")
        ).loadProfile("official:mw4-dmz-starter")
      ).value,
  );
  assert.equal(saved.inventory["mw4:dmz-cash"], 1333601);
  assert.equal(saved.reserves["mw4:dmz-cash"], 100);
  assert.equal(
    saved.upgradeProgress["mw4:upgrade-bank-upgrade-i"].completion,
    "completed",
  );
  assert.equal(
    saved.upgradeProgress["mw4:upgrade-bank-upgrade-i"].reviewRequired,
    true,
  );
  await page.goto(url("needed"));
  await ready();
  await page.locator("#needed-query").fill("Cash");
  const cash = page.locator('[data-needed-item="mw4:dmz-cash"]');
  assert.equal(
    await cash.locator("[data-needed-required] .needed-number").innerText(),
    "4,820,000",
  );
  assert.equal(
    await cash.locator("[data-needed-missing] .needed-number").innerText(),
    "3,486,499",
  );
  await page.goto(url("inventory"));
  await ready();
  await page.locator("#inventory-query").fill("Cipher Code Ledger");
  assert(
    await page
      .getByRole("link", { name: "Cipher Code Ledger", exact: true })
      .first()
      .isVisible(),
  );
  const required = page
    .locator(
      '[data-upgrade-need="collection"][data-item="mw4:tcno-cipher-code-ledger"] [data-tier-required]',
    )
    .first();
  assert.equal(await required.innerText(), "10");
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    );
  }
  assert.deepEqual(errors, []);
  console.log(
    "PASS TroubleChute34 upgrades,13 Bank tiers, explicit old-profile rebind preserving cash/reserve/completion, Needed agreement and new item UI: " +
      engine,
  );
} finally {
  await browser.close();
}
