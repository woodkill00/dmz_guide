// Feature032 independent browser acceptance. All stock and spending below is synthetic QA state.
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const PACK = "observed:upgrade-review-20261026";
const SOURCE =
  "https://detonated.com/which-items-should-you-keep-in-dmz-all-fob-upgrades-list/";
const route = (base, name) =>
  `${base}/${name}/?pack=${encodeURIComponent(PACK)}`;
const detail = (base, group, id) =>
  `${base}/${group}/${id.replace(":", "--")}/`;
async function ready(page) {
  await page.waitForFunction(
    () => document.querySelector("main")?.getAttribute("aria-busy") === "false",
  );
}
async function profile(page) {
  return page.evaluate(async () =>
    structuredClone(
      (await import("/assets/src/client/common.mjs")).state.profile,
    ),
  );
}
async function saved(page, revision) {
  await page.waitForFunction(
    async ({ id, revision }) =>
      (await (await import("/assets/src/storage/store.mjs")).loadProfile(id))
        ?.value?.revision > revision,
    { id: PACK, revision },
  );
  await page.waitForFunction(
    () => !document.querySelector("#pack-select")?.disabled,
  );
}
async function findProgress(page, query) {
  await page.locator("#progress-query").fill(query);
  await page
    .locator("#progress-filters")
    .getByRole("button", { name: "Filter", exact: true })
    .click();
}
async function noOverflow(page, label) {
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
    `${label}: no horizontal overflow`,
  );
}
export async function runSourcedCatalogJourneys({
  browser,
  base,
  captureScreenshots = true,
  prefix = browser.browserType().name(),
}) {
  const directory = "test-results/sourced032";
  await mkdir(directory, { recursive: true });
  const evidence = {
    browser: browser.version(),
    platform: process.platform,
    syntheticStateOnly: true,
    scenarios: [],
    screenshots: [],
    result: "NOT RUN",
  };
  const shot = async (page, name) => {
    if (!captureScreenshots) return;
    const path = `${directory}/${prefix}-${name}.png`;
    await page.screenshot({ path });
    evidence.screenshots.push(path);
  };
  try {
    for (const width of [1440, 390]) {
      const context = await browser.newContext({
        viewport: { width, height: 900 },
      });
      try {
        const page = await context.newPage();
        await page.goto(route(base, "catalog"));
        await page.locator("#catalog-search").fill("Bank Upgrade VII");
        const bank = page.locator("[data-record-card]:visible").filter({
          has: page.getByRole("link", {
            name: "Bank Upgrade VII",
            exact: true,
          }),
        });
        assert.equal(
          await bank.count(),
          1,
          "One source tier, not a duplicate of existing observations",
        );
        await bank
          .getByRole("link", { name: "Bank Upgrade VII", exact: true })
          .click();
        assert.equal(
          await page
            .getByRole("heading", { name: "Bank Upgrade VII", exact: true })
            .count(),
          1,
        );
        assert.match(
          await page.locator("main").innerText(),
          /Consumption unknown/,
        );
        assert.match(await page.locator("main").innerText(), /500000|500,000/);
        assert((await page.locator(`a[href="${SOURCE}"]`).count()) > 0);
        await noOverflow(page, `Bank VII/${width}`);
        await shot(page, `bank-vii-${width}`);
        await page.goto(detail(base, "items", "reported:gold-bar"));
        assert.equal(
          await page
            .getByRole("heading", { name: "Gold Bar", exact: true })
            .count(),
          1,
        );
        assert.match(
          await page.locator("main").innerText(),
          /sourceListedAllTiersMaterialCount: 5/,
        );
        assert((await page.locator(`a[href="${SOURCE}"]`).count()) > 0);
        await noOverflow(page, `Gold Bar/${width}`);
        await page.goto(detail(base, "objectives", "reported:unlock-uav"));
        const uavText = await page.locator("main").innerText();
        assert.match(uavText, /disputed/i);
        assert.match(uavText, /recipeUnlockRoute.level: 31/);
        assert.match(uavText, /recipeUnlockRoute.loot/);
        assert.match(uavText, /not combined prerequisites/);
        assert.match(
          uavText,
          /Craft ingredients and output batch yield are not provided/,
        );
        await noOverflow(page, `UAV/${width}`);
        await shot(page, `uav-routes-${width}`);
        await page.goto(
          detail(base, "objectives", "reported:unlock-night-vision-goggles"),
        );
        const closedText = await page.locator("main").innerText();
        assert(
          !closedText.includes("Shopping Hacks"),
          "Story route is not visible before disclosure",
        );
        assert(
          !closedText.includes("Underground 1/2"),
          "Alternative route claims inherit target spoiler protection",
        );
        const disclosure = page.locator("details.spoiler-content");
        assert.equal(await disclosure.count(), 1);
        await disclosure.locator("summary").click();
        assert.match(await disclosure.innerText(), /Shopping Hacks/);
        assert.match(await disclosure.innerText(), /Underground 1\/2/);
        await disclosure.locator("summary").click();
        assert(
          !(await page.locator("main").innerText()).includes("Shopping Hacks"),
        );
        await page.goto(detail(base, "items", "reported:night-vision-goggles"));
        assert(
          !(await page.locator("main").innerText()).includes("Shopping Hacks"),
          "Item page does not leak mission names",
        );
        await page.goto(detail(base, "objectives", "reported:level-40"));
        const levelText = await page.locator("main").innerText();
        assert.match(levelText, /3x Station Upgrades/);
        assert.match(levelText, /incomplete|unresolved/);
        assert.equal(await page.locator("[data-upgrade-spend]").count(), 0);
        await noOverflow(page, `Level40/${width}`);
        await shot(page, `level40-${width}`);
        await page.goto(detail(base, "objectives", "reported:level-42"));
        const kitClaims = page
          .locator(".claim")
          .filter({ hasText: "Trap Equipment Kit" });
        assert.equal(await kitClaims.count(), 1);
        for (const ingredient of [
          "Razor Wire Traps",
          "Trip Wires",
          "Proximity Mines",
          "Claymores",
          "Gun Store Weapons Locker Key",
        ])
          assert(
            (await kitClaims.innerText()).includes(ingredient),
            `Kit claim exposes ${ingredient}`,
          );
        await kitClaims.scrollIntoViewIfNeeded();
        await noOverflow(page, `Kit claim/${width}`);
        await shot(page, `kit-claim-${width}`);
        await page.goto(route(base, "progression"));
        await ready(page);
        await findProgress(page, "UAV recipe unlock");
        assert.equal(
          await page
            .locator('[data-progress-id="reported:unlock-uav"]')
            .count(),
          1,
        );
        assert.equal(
          await page
            .locator('[data-upgrade-spend="reported:unlock-uav"]')
            .count(),
          0,
        );
        await findProgress(page, "Shopping Hacks");
        assert(
          !(await page.locator("#progress-rows").innerText()).includes(
            "Shopping Hacks",
          ),
          "Hidden story claims are not exposed by progression search",
        );
        await findProgress(page, "DMZ Level 40");
        const before = await profile(page);
        const control = page.locator('[data-progress-id="reported:level-40"]');
        assert.equal(await control.count(), 1);
        assert.equal(
          await page
            .locator('[data-upgrade-spend="reported:level-40"]')
            .count(),
          0,
        );
        await control.selectOption("completed");
        await saved(page, before.revision);
        const after = await profile(page);
        assert.equal(after.completion["reported:level-40"], "completed");
        for (const field of [
          "inventory",
          "reserves",
          "spendHistory",
          "upgradeProgress",
        ])
          assert.deepEqual(
            after[field],
            before[field],
            `Manual milestone preserves ${field}`,
          );
        await page.reload();
        await ready(page);
        await findProgress(page, "DMZ Level 40");
        assert.equal(await control.inputValue(), "completed");
        await noOverflow(page, `Manual milestone/${width}`);
        if (width === 390) {
          await page.evaluate(
            () => (document.documentElement.style.fontSize = "200%"),
          );
          assert.equal(
            await page
              .locator("html")
              .evaluate((n) => parseFloat(getComputedStyle(n).fontSize)),
            32,
          );
          await noOverflow(page, "Manual milestone/390/200%");
          await control.scrollIntoViewIfNeeded();
          assert(
            await control.isVisible(),
            "Milestone control remains visible at 200% text",
          );
          const bounds = await control.boundingBox();
          assert(
            bounds && bounds.y >= 0 && bounds.y + bounds.height <= 900,
            "Milestone screenshot must include the saved completion control",
          );
          await shot(page, "milestone-390-200");
        }
      } finally {
        await context.close();
      }
    }
    evidence.scenarios.push(
      "Desktop1440/mobile390: catalog→upgrade, item source totals, UAV disputed routes, story disclosure/close, unspecified level40, manual milestone save/reload without inventory/history grants; mobile200% text.",
    );
    {
      const context = await browser.newContext();
      try {
        const page = await context.newPage();
        await page.goto(route(base, "progression"));
        await ready(page);
        // Synthetic adequate holdings ensure refusal is about missing evidence, not stock.
        await page.evaluate(async () => {
          const { state } = await import("/assets/src/client/common.mjs");
          const { saveProfile } = await import("/assets/src/storage/store.mjs");
          const p = structuredClone(state.profile);
          for (const i of state.pack.items)
            p.inventory[i.id] = i.kind === "currency" ? 2000000 : 1000;
          await saveProfile(p, p.revision);
        });
        await page.reload();
        await ready(page);
        for (const [id, name] of [
          ["observed:vendor-item-upgrade-i", "Vendor Item Upgrade I"],
          ["observed:mia-recovery-discount-iii", "MIA Recovery Discount III"],
        ]) {
          await findProgress(page, name);
          const before = await profile(page);
          await page.locator(`[data-upgrade-spend="${id}"]`).click();
          await page.locator("#error").waitFor({ state: "visible" });
          assert.match(
            await page.locator("#error").innerText(),
            /quantity\/consumption\/evidence is unknown or disputed/i,
          );
          assert.equal(
            await page.locator("#upgrade-spend-confirm[open]").count(),
            0,
          );
          assert.deepEqual(
            await profile(page),
            before,
            "Unknown price never deducts just known materials",
          );
        }
        await shot(page, "unknown-cash-refusal");
      } finally {
        await context.close();
      }
    }
    evidence.scenarios.push(
      "Both original VendorI/MIAIII reject new purchase with explicit unknown cash, adequate synthetic stock, no modal and no profile mutation.",
    );
    {
      const context = await browser.newContext();
      try {
        const page = await context.newPage();
        await page.goto(route(base, "progression"));
        await ready(page);
        const seeded = await page.evaluate(async () => {
          const { state } = await import("/assets/src/client/common.mjs");
          const { newProfile } = await import("/assets/src/domain/profile.mjs");
          const { recordUpgradePurchase } = await import(
            "/assets/src/domain/upgrade-spending.mjs"
          );
          const { saveProfile, commitRecord } = await import(
            "/assets/src/storage/store.mjs"
          );
          // Historical public definition, deliberately synthetic stock/history. No private data.
          const after = structuredClone(state.pack),
            before = structuredClone(state.pack);
          before.contentVersion = "2026.10.26.2";
          before.objectives = before.objectives.filter((o) =>
            o.id.startsWith("observed:"),
          );
          before.items = before.items.filter((i) =>
            i.id.startsWith("observed:"),
          );
          before.sources = before.sources.filter(
            (s) => s.type === "observation",
          );
          before.claims = [];
          before.guides = [];
          const sourceIds = new Set(before.sources.map((s) => s.id));
          for (const r of [...before.items, ...before.objectives])
            r.sourceIds = r.sourceIds.filter((id) => sourceIds.has(id));
          for (const o of before.objectives)
            o.requirements = o.requirements.filter((r) =>
              r.sourceIds.includes(
                "source:upgrade-consumption-confirmation-20261026",
              ),
            );
          const p = newProfile(before);
          for (const i of before.items)
            p.inventory[i.id] = i.kind === "currency" ? 2000000 : 1000;
          const purchase = recordUpgradePurchase(
            before,
            p,
            "observed:vendor-item-upgrade-i",
            {
              operationId: "qa032:historic-vendor",
              recordedAt: "2026-10-26T20:00:00.000Z",
            },
          );
          await commitRecord(
            "content",
            before.id,
            { pack: before, revision: 0 },
            0,
          );
          await commitRecord(
            "content",
            after.id,
            { pack: after, revision: 1 },
            1,
          );
          return saveProfile(purchase.candidate, 0);
        });
        await page.goto(route(base, "settings"));
        await ready(page);
        assert.match(
          await page.locator("#version-status").innerText(),
          /mismatch|differs|different|2026.10.26.2/i,
        );
        await page.click("#rebind-profile");
        await page.locator("#restore-preview").waitFor({ state: "visible" });
        assert.match(
          await page.locator("#restore-summary").innerText(),
          /Historical completion and stock are retained/,
        );
        await page.click("#cancel-restore");
        assert.deepEqual(
          await profile(page),
          seeded,
          "Cancelling rebind leaves historical state unchanged",
        );
        await page.click("#rebind-profile");
        await page.locator("#restore-preview").waitFor({ state: "visible" });
        await page.click("#apply-restore");
        await saved(page, seeded.revision);
        const rebound = await profile(page);
        assert.equal(rebound.contentVersion, "2026.10.28.1");
        assert.deepEqual(rebound.inventory, seeded.inventory);
        assert.deepEqual(
          rebound.spendHistory,
          seeded.spendHistory,
          "History snapshots are immutable across source expansion",
        );
        assert.equal(
          rebound.upgradeProgress["observed:vendor-item-upgrade-i"].completion,
          "completed",
        );
        await page.goto(route(base, "progression"));
        await ready(page);
        await findProgress(page, "Vendor Item Upgrade I");
        const prior = await profile(page);
        await page
          .locator('[data-upgrade-spend="observed:vendor-item-upgrade-i"]')
          .click();
        await page.locator("#error").waitFor({ state: "visible" });
        assert.match(
          await page.locator("#error").innerText(),
          /equivalent purchase is already recorded/i,
        );
        assert.deepEqual(
          await profile(page),
          prior,
          "Expansion cannot permit re-debiting an old purchase",
        );
        const reversal = await page.evaluate(async () => {
          const { state } = await import("/assets/src/client/common.mjs");
          const { recordSpendingReversal } = await import(
            "/assets/src/domain/upgrade-spending.mjs"
          );
          const p = structuredClone(state.profile),
            purchase = p.spendHistory[0];
          let guarded;
          try {
            recordSpendingReversal(p, purchase.id, {
              operationId: "qa032:reverse-check",
              recordedAt: "2026-10-28T22:00:00.000Z",
            });
            guarded = false;
          } catch (e) {
            guarded = /Progress changed/.test(e.message);
          }
          // Independent domain trial with exact recorded progress restored; not persisted or presented as game refund.
          p.upgradeProgress[purchase.upgradeId] = structuredClone(
            purchase.afterProgress,
          );
          const trial = recordSpendingReversal(p, purchase.id, {
            operationId: "qa032:reverse-trial",
            recordedAt: "2026-10-28T22:00:00.000Z",
          });
          return {
            guarded,
            costs: purchase.costs,
            inventory: trial.candidate.inventory,
            originalEvent: trial.candidate.spendHistory[0],
            event: purchase,
          };
        });
        assert.equal(
          reversal.guarded,
          true,
          "Rebind review flag retains changed-progress reversal safety gate",
        );
        assert.deepEqual(reversal.originalEvent, reversal.event);
        for (const cost of reversal.costs)
          assert.equal(reversal.inventory[cost.itemId], cost.before);
        await shot(page, "historical-rebind-no-redebit");
      } finally {
        await context.close();
      }
    }
    evidence.scenarios.push(
      "Historical public VendorI definition with synthetic purchase: rebind Cancel/Apply preserves stock/history, changed evidence flags review, duplicate debit blocked, reversal snapshot arithmetic remains valid only under unchanged-progress safeguard.",
    );
    evidence.result = "PASS";
  } catch (error) {
    evidence.result = "FAIL";
    evidence.failure = { message: error.message, stack: error.stack };
    throw error;
  } finally {
    await writeFile(
      `${directory}/${prefix}-journeys.json`,
      JSON.stringify(evidence, null, 2),
    );
  }
  console.log("Sourced catalog browser journeys passed", evidence.scenarios);
}
