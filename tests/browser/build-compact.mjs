import assert from "node:assert/strict";
import { chromium, firefox, webkit } from "playwright";
import { mkdir } from "node:fs/promises";
const engine = process.env.BROWSER || "chromium",
  b = await { chromium, firefox, webkit }[engine].launch(),
  p = await b.newPage({ viewport: { width: 1440, height: 1000 } }),
  errors = [];
p.on("pageerror", (e) => errors.push(e.message));
const ready = async () => {
  await p.waitForFunction(
    () => document.querySelector("main")?.getAttribute("aria-busy") === "false",
  );
  await p.waitForLoadState("networkidle");
};
try {
  await p.goto(
    "http://127.0.0.1:4173/quick-collect/?pack=official%3Amw4-dmz-starter",
  );
  await ready();
  assert.equal(
    await p.locator("#build-ingredients-summary [data-build-peek]").count(),
    0,
  );
  assert(
    (await p.locator("#outstanding-items-summary [data-build-peek]").count()) >
      0,
  );
  const energy = await p.evaluate(async () => {
    const { state } = await import("/assets/src/client/common.mjs"),
      { newProfile } = await import("/assets/src/domain/profile.mjs"),
      { saveProfile } = await import("/assets/src/storage/store.mjs");
    const v = newProfile(state.pack),
      energy = state.pack.items.find((i) => i.name === "Energy Drink").id;
    v.buildTargets = { "mw4:bandage": 2, [energy]: 2 };
    v.inventory["mw4:chemicals"] = 40;
    for (const name of [
      "3-Plate Armor Vest",
      "3-Plate Ballistic Gel Vest",
      "Large Backpack",
      "Large Secure Backpack",
    ]) {
      const item = state.pack.items.find((i) => i.name === name);
      v.buildTargets[item.id] = 1;
      v.inventory[item.id] = 5;
      v.routes[item.id] = "retired:recipe";
    }
    await saveProfile(v, 0);
    return energy;
  });
  await p.reload();
  await ready();
  const targets = await p.evaluate(async () => {
    const { state } = await import("/assets/src/client/common.mjs");
    return [
      "3-Plate Armor Vest",
      "3-Plate Ballistic Gel Vest",
      "Large Backpack",
      "Large Secure Backpack",
    ].map((name) => {
      const item = state.pack.items.find((i) => i.name === name);
      const recipe = state.pack.recipes.find(
        (r) => r.output.itemId === item.id,
      );
      return { id: item.id, inputs: recipe.inputs.map((i) => i.itemId) };
    });
  });
  for (const target of targets) {
    const group = p.locator(`[data-build-group="${target.id}"]`);
    assert(await group.evaluate((n) => n.open));
    for (const id of target.inputs)
      assert(await group.locator(`[data-collect-row="${id}"]`).isVisible());
    assert.equal(
      await group.locator(`[data-collect-row="${target.id}"]`).count(),
      0,
    );
  }
  const band = p.locator('[data-build-group="mw4:bandage"]'),
    drink = p.locator(`[data-build-group="${energy}"]`);
  assert(await band.evaluate((n) => n.open));
  assert(await drink.evaluate((n) => n.open));
  assert(
    await band
      .getByRole("link", { name: "Synthetics", exact: true })
      .isVisible(),
  );
  assert(
    await band
      .getByRole("link", { name: "Chemicals", exact: true })
      .isVisible(),
  );
  assert(
    await drink.getByRole("link", { name: "Metals", exact: true }).isVisible(),
  );
  assert.equal(
    await band.locator('[data-collect-row="mw4:bandage"]').count(),
    0,
  );
  assert(!(await band.locator("[data-build-count]").isVisible()));
  assert(
    !(await p.locator('[data-build-group="all"]').evaluate((n) => n.open)),
  );
  const summary = p.locator("#build-ingredients-summary"),
    other = p.locator("#outstanding-items-summary");
  assert(
    await p.evaluate(() => {
      const a = document.getElementById("build-ingredients-summary"),
        b = document.getElementById("outstanding-items-summary"),
        c = document.getElementById("build-collect");
      return (
        !!(a.compareDocumentPosition(b) & 4) &&
        !!(b.compareDocumentPosition(c) & 4) &&
        !c.contains(a)
      );
    }),
  );
  assert((await other.locator("[data-build-peek]").count()) > 0);
  for (const button of await p.locator(".build-summary-tile").all())
    assert(
      (await button.locator(".build-summary-name").innerText()).length > 0,
    );
  assert(
    await p.evaluate(() => {
      const ids = [...document.querySelectorAll("[id]")].map((n) => n.id);
      return ids.length === new Set(ids).size;
    }),
  );
  const bandSummary = summary.locator(
    '[data-build-summary-group="mw4:bandage"]',
  );
  assert.equal(await summary.locator("[data-build-summary-group]").count(), 6);
  for (const target of targets) {
    const group = summary.locator(`[data-build-summary-group="${target.id}"]`);
    assert.equal(
      await group.locator("[data-build-peek]").count(),
      target.inputs.length,
    );
    for (const id of target.inputs)
      assert.equal(await group.locator(`[data-build-peek="${id}"]`).count(), 1);
  }
  const tile = bandSummary.locator('[data-build-peek="mw4:synthetics"]'),
    peek = bandSummary.locator('[data-build-info="mw4:synthetics"]');
  assert.equal(await tile.count(), 1);
  const expected = await p.evaluate(async () => {
    const { state } = await import("/assets/src/client/common.mjs");
    const { buildTargetNeeds } = await import(
      "/assets/src/domain/build-targets.mjs"
    );
    return Object.fromEntries(
      buildTargetNeeds(state.pack, state.profile)
        .groups.find((g) => g.id === "mw4:bandage")
        .direct.map((r) => [r.id, r.required]),
    );
  });
  assert.equal(
    await bandSummary
      .locator('[data-build-peek="mw4:chemicals"] strong')
      .innerText(),
    expected["mw4:chemicals"].toLocaleString("en-US"),
  );
  const covered = bandSummary.locator('[data-build-peek="mw4:chemicals"]');
  assert.equal(await covered.locator("strong").innerText(), "30");
  assert.equal(
    await covered.locator(".build-summary-missing").innerText(),
    "0 missing",
  );
  assert.equal(await covered.getAttribute("data-covered"), "true");
  await tile.hover();
  assert(await peek.isVisible());
  await tile.click();
  await p.locator("#collect-query").hover();
  assert(await peek.isVisible(), "click pins hover details");
  const syn = band.locator('[data-collect-row="mw4:synthetics"]');
  assert.equal(
    await p
      .locator(
        "#build-collect .build-ingredient input, #build-collect .build-ingredient button",
      )
      .count(),
    0,
  );
  await band.locator("[data-build-options] > summary").click();
  await band.locator("[data-build-count]").fill("3");
  await band.locator("[data-build-count]").press("Tab");
  await p.waitForFunction(
    () =>
      document.querySelector(
        '[data-build-group="mw4:bandage"] [data-collect-row="mw4:synthetics"] [data-collect-remaining]',
      )?.textContent === "45",
  );
  assert(await band.evaluate((n) => n.open));
  assert(await drink.evaluate((n) => n.open));
  assert.equal(await covered.locator("strong").innerText(), "45");
  assert.equal(
    await covered.locator(".build-summary-missing").innerText(),
    "5 missing",
  );
  assert.equal(
    await tile.locator("strong").innerText(),
    (expected["mw4:synthetics"] + 15).toLocaleString("en-US"),
  );
  assert(
    await peek.isVisible(),
    "pinned ingredient survives automatic target recalculation",
  );
  await tile.focus();
  await p.keyboard.press("Escape");
  assert(!(await peek.isVisible()));
  await tile.press("Enter");
  assert(await peek.isVisible());
  await peek.getByRole("button", { name: "Close ingredient details" }).click();
  assert(!(await peek.isVisible()));
  await p.waitForFunction(() =>
    document.querySelector(
      '#build-ingredients-summary [data-build-peek="mw4:synthetics"] img',
    ),
  );
  assert.equal(
    await summary
      .locator('[data-build-peek="mw4:biomaterials"]')
      .getAttribute("data-rarity"),
    "uncommon",
  );
  const outstanding = await p.evaluate(async () => {
    const { state } = await import("/assets/src/client/common.mjs");
    const { quickCollect } = await import(
      "/assets/src/domain/quick-collect.mjs"
    );
    return quickCollect(state.pack, state.profile)
      .items.filter((r) => r.remaining !== 0)
      .map((r) => ({ id: r.id, remaining: r.remaining }));
  });
  assert.equal(
    await other.locator("[data-build-peek]").count(),
    outstanding.length,
  );
  const found = outstanding.find((r) => r.remaining > 1),
    otherTile = other.locator(`[data-build-peek="${found.id}"]`);
  await otherTile.click();
  assert(await other.locator(`[data-build-info="${found.id}"]`).isVisible());
  const foundRow = p.locator(`#collect-list [data-collect-row="${found.id}"]`);
  await foundRow.locator("input").fill("1");
  await foundRow.locator("button").click();
  await p.waitForFunction(
    ({ id, expected }) => {
      const button = [
        ...document.querySelectorAll(
          "#outstanding-items-summary [data-build-peek]",
        ),
      ].find((b) => b.dataset.buildPeek === id);
      return button?.querySelector("strong").textContent === expected;
    },
    { id: found.id, expected: (found.remaining - 1).toLocaleString("en-US") },
  );
  await otherTile.press("Escape");
  await mkdir(".local/item-icons/build-compact", { recursive: true });
  for (const width of [1440, 900, 390, 320]) {
    await p.setViewportSize({ width, height: 1000 });
    assert(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    );
    for (const row of await p
      .locator("#build-collect .build-ingredient")
      .all()) {
      if (await row.isVisible()) {
        const box = await row.boundingBox();
        assert(
          box.height <= 64,
          `${width}: ingredient row stays compact (${box.height})`,
        );
      }
    }
    const lastTile = summary.locator("[data-build-peek]").last();
    await lastTile.click();
    assert.equal(
      await summary.locator(".build-summary-info:visible").count(),
      1,
    );
    assert(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    );
    await lastTile.press("Escape");
    if (width === 1440 || width === 390) {
      await summary.screenshot({
        path: `.local/item-icons/build-compact/${engine}-${width}.png`,
      });
      await other.screenshot({
        path: `.local/item-icons/build-compact/${engine}-outstanding-${width}.png`,
      });
    }
  }
  await p.setViewportSize({ width: 1440, height: 1000 });
  await p.locator("#theme-toggle").click();
  await p.setViewportSize({ width: 320, height: 1000 });
  assert(
    await p.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS compact ingredient rows visible for multiple targets, output excluded, collapsed options, shared totals, Add persistence/open state, 320–1440px and light theme: " +
      engine,
  );
} finally {
  await b.close();
}
