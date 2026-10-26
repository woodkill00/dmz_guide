import assert from "node:assert/strict";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { capacityUpgradeFixture } from "../helpers/upgrades-capacity.mjs";
import { validatePack } from "../../src/content/validate.mjs";
export async function runUpgradePerformance({
  browser,
  base,
  captureScreenshots = false,
}) {
  const schema = JSON.parse(await readFile("schemas/pack.schema.json"));
  let low = 1,
    high = 20000;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    try {
      validatePack(capacityUpgradeFixture(mid), schema);
      low = mid;
    } catch {
      high = mid - 1;
    }
  }
  const pack = capacityUpgradeFixture(low),
    context = await browser.newContext();
  try {
    const page = await context.newPage();
    await page.goto(base);
    const evidence = await page.evaluate(async (pack) => {
      const { upgradeAdvice } = await import(
          "/assets/src/domain/upgrade-advice.mjs"
        ),
        { newProfile } = await import("/assets/src/domain/profile.mjs");
      const profile = newProfile(pack);
      profile.inventory[pack.items[0].id] = 17;
      profile.reserves[pack.items[0].id] = 5;
      for (let i = 0; i < 5; i++) upgradeAdvice(pack, profile);
      const timings = [];
      for (let i = 0; i < 50; i++) {
        const start = performance.now();
        const result = upgradeAdvice(pack, profile);
        timings.push(performance.now() - start);
        if (
          result.status !== "ok" ||
          result.rows[0].search !== pack.objectives.length * 5 - 12
        )
          throw new Error("Capacity conservation mismatch");
      }
      timings.sort((a, b) => a - b);
      return {
        roots: pack.objectives.length,
        runs: 50,
        warmups: 5,
        p95ms: timings[Math.ceil(timings.length * 0.95) - 1],
        maxms: timings.at(-1),
        userAgent: navigator.userAgent,
        logicalCPUs: navigator.hardwareConcurrency,
        timings,
      };
    }, pack);
    assert(evidence.p95ms <= 250, `Browser p95 ${evidence.p95ms} exceeds250ms`);
    // Actual DOM paging proves >100 advisory roots do not enter the capped goal queue.
    const paged = capacityUpgradeFixture(121),
      item = paged.items[0];
    paged.id = "qa023:capacity-pages";
    paged.title = "FICTIONAL QA023 bounded material pages";
    paged.contentVersion = "synthetic-pages-1";
    paged.items = paged.objectives.map((objective, i) => {
      const id = `qa023:material-${i}`;
      objective.requirements[0].itemId = id;
      return { ...structuredClone(item), id, name: `Synthetic material ${i}` };
    });
    validatePack(paged, schema);
    await page.evaluate(async (pack) => {
      const { commitRecord, saveProfile } = await import(
        "/assets/src/storage/store.mjs"
      );
      const { newProfile } = await import("/assets/src/domain/profile.mjs");
      await commitRecord("content", pack.id, { pack, revision: 0 }, 0);
      const profile = newProfile(pack);
      for (const item of pack.items) profile.inventory[item.id] = 2;
      await saveProfile(profile, 0);
    }, paged);
    await page.goto(`${base}/planner/?pack=${encodeURIComponent(paged.id)}`);
    await page.waitForFunction(
      () =>
        document.querySelector("main")?.getAttribute("aria-busy") === "false",
    );
    const allIds = new Set();
    for (const [count, offset] of [
      [50, 0],
      [50, 50],
      [21, 100],
    ]) {
      assert.equal(await page.locator("[data-advice-item]").count(), count);
      assert.match(
        await page.locator("#upgrade-advice-output").textContent(),
        /121 included known objectives/,
      );
      for (const id of await page
        .locator("[data-advice-item]")
        .evaluateAll((nodes) => nodes.map((n) => n.dataset.adviceItem))) {
        assert(!allIds.has(id), `Duplicate material page ${id}`);
        allIds.add(id);
      }
      assert.equal(
        await page
          .locator("[data-advice-search]")
          .evaluateAll((nodes) =>
            nodes.every((n) => n.textContent.trim() === "3"),
          ),
        true,
      );
      if (offset < 100) {
        await page
          .getByRole("button", { name: "Next materials", exact: true })
          .focus();
        await page.keyboard.press("Enter");
      }
    }
    assert.equal(allIds.size, 121);
    assert.equal(
      await page
        .getByRole("button", { name: "Next materials", exact: true })
        .isDisabled(),
      true,
    );
    assert.equal(
      await page.evaluate(
        async () =>
          (await import("/assets/src/client/common.mjs")).state.profile.goals
            .length,
      ),
      0,
    );
    await page.selectOption("#upgrade-scope", "focused");
    assert.equal(await page.locator("[data-advice-item]").count(), 0);
    await page.selectOption("#upgrade-scope", "all-known-incomplete");
    assert.equal(await page.locator("[data-advice-item]").count(), 50);
    evidence.materialPaging = {
      roots: 121,
      uniqueMaterials: allIds.size,
      maxRows: 50,
      goalCount: 0,
      keyboard: true,
    };

    await mkdir("test-results/upgrade023-independent", { recursive: true });
    if (captureScreenshots) {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.screenshot({
        path: `test-results/upgrade023-independent/paging-${browser.browserType().name()}-390.png`,
        fullPage: false,
      });
    }
    await writeFile(
      `test-results/upgrade023-independent/performance-${browser.browserType().name()}.json`,
      JSON.stringify(
        { sourceHead: process.env.GITHUB_SHA || "local", ...evidence },
        null,
        2,
      ),
    );
  } finally {
    await context.close();
  }
}
