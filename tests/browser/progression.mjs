import assert from "node:assert/strict";
import { readFile, mkdir } from "node:fs/promises";
const packId = "demo:training-pack";
const progressURL = "/progression/?pack=demo%3Atraining-pack";
async function profile(page) {
  return page.evaluate(
    async (id) =>
      await (await import("/assets/src/storage/store.mjs")).loadProfile(id),
    packId,
  );
}
async function downloadProfile(page) {
  const pending = page.waitForEvent("download");
  await page.click("#export-current-profile");
  const download = await pending;
  return JSON.parse(await readFile(await download.path(), "utf8"));
}
async function waitRevision(page, previous) {
  await page.waitForFunction((previous) => {
    const match = document
      .querySelector("#save-status")
      ?.textContent.match(/revision (\d+)/);
    return match && Number(match[1]) > previous;
  }, previous);
}
export async function runProgressionTests({ browser, base }) {
  await mkdir("test-results", { recursive: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage(),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  try {
    await page.goto(base + progressURL);
    await page.waitForSelector("#progress-rows article");
    // A validated, explicitly fictional local overlay exercises leaks across records.
    await page.evaluate(async () => {
      const { state } = await import("/assets/src/client/common.mjs");
      const { commitRecord, saveProfile } = await import(
        "/assets/src/storage/store.mjs"
      );
      const { validatePack } = await import("/assets/src/content/validate.mjs");
      const pack = structuredClone(state.pack),
        secret = {
          ...structuredClone(pack.objectives[0]),
          id: "demo:hidden-relay",
          name: "Hidden relay activation",
          description: "Secret relay instructions.",
          spoiler: true,
          prerequisites: [],
          effects: [],
        };
      pack.objectives.push(secret);
      pack.objectives[0].description = `Start with ${secret.name}.`;
      pack.objectives[0].prerequisites = [secret.id];
      pack.objectives[0].effects = [
        { type: "categoryUnlock", target: secret.id, value: secret.name },
      ];
      pack.guides[0].relatedIds = [secret.id];
      pack.maps.push({
        ...structuredClone(pack.maps[0]),
        id: "demo:hidden-map",
        name: "Hidden relay activation annex",
        spoiler: true,
      });
      pack.locations.push(
        {
          ...structuredClone(pack.locations[0]),
          id: "demo:hidden-location",
          name: "Concealed relay cache",
          coordinates: { x: 11, y: 19, floor: "ground" },
          spoiler: true,
        },
        {
          ...structuredClone(pack.locations[0]),
          id: "demo:hidden-map-child",
          name: "Hidden-parent landing",
          mapId: "demo:hidden-map",
          coordinates: { x: 31, y: 47, floor: "ground" },
        },
      );
      pack.locations[0].description = `Start with ${secret.name}.`;
      pack.sources.push({
        ...pack.sources[0],
        id: "source:public-fixture",
        title: "Fictional public reference",
        url: "https://example.com/fictional-reference",
      });
      pack.objectives[1].sourceIds = ["source:public-fixture"];
      validatePack(
        pack,
        await (await fetch("/assets/schemas/pack.schema.json")).json(),
      );
      await commitRecord("content", pack.id, { pack, revision: 0 }, 0);
      const next = structuredClone(state.profile);
      next.inventory["demo:wire"] = 17;
      next.reserves["demo:wire"] = 3;
      next.goals = [{ id: "demo:board-batch", quantity: 2 }];
      await saveProfile(next, 0);
    });
    await page.reload();
    await page.waitForSelector("#progress-rows article");
    const inventoryBaseline = (await profile(page)).value;
    // Exercise the real private reader and map UI, not only pure projections.
    const probe = await context.newPage();
    probe.on("pageerror", (e) => errors.push(e.message));
    await probe.goto(base + "/local/?pack=demo%3Atraining-pack");
    await probe.waitForSelector("#local-query");
    assert(
      !(await probe.locator("#local-records").innerHTML()).includes(
        "Hidden relay activation",
      ),
    );
    await probe.fill("#local-query", "Hidden relay activation");
    assert.equal(await probe.locator("[data-local-search]:visible").count(), 0);
    await probe.fill("#local-query", "Unlock training bench");
    assert.equal(await probe.locator("[data-local-search]:visible").count(), 1);
    await probe.goto(
      base + "/local/?pack=demo%3Atraining-pack&id=demo%3Abench-unlock",
    );
    await probe.waitForSelector("#local-records .detail-grid");
    assert(
      !(await probe.locator("#local-records").innerHTML()).includes(
        "Hidden relay activation",
      ),
    );
    await probe.goto(base + "/maps/?pack=demo%3Atraining-pack");
    await probe.waitForSelector("#location-list button");
    assert.equal(await probe.locator("#map-select option").count(), 1);
    assert.equal(
      await probe
        .locator('#map-select option[value="demo:hidden-map"]')
        .count(),
      0,
    );
    assert.equal(await probe.locator("#location-list button").count(), 3);
    assert.equal(
      await probe.locator("#map-markers [data-location-id]").count(),
      3,
    );
    assert.match(
      await probe.locator("#location-count").textContent(),
      /^3 matching locations/,
    );
    assert.equal(
      await probe.locator('[data-location-id="demo:hidden-location"]').count(),
      0,
    );
    assert.equal(
      await probe.locator('[data-location-id="demo:hidden-map-child"]').count(),
      0,
    );
    assert(
      !(await probe.locator("main").innerHTML()).includes(
        "Hidden relay activation",
      ),
    );
    await probe
      .locator('#location-list [data-location-id="demo:supply-shed"]')
      .click();
    assert.match(
      await probe.locator("#location-detail").textContent(),
      /Spoiler-protected content/,
    );
    for (const query of [
      "Hidden relay activation",
      "Concealed relay cache",
      "Hidden-parent landing",
    ]) {
      await probe.fill("#location-search", query);
      assert.equal(
        await probe.locator("#location-list button").count(),
        0,
        query,
      );
      assert.equal(
        await probe.locator("#map-markers [data-location-id]").count(),
        0,
        query,
      );
    }
    await probe.close();
    assert(
      !(await page.locator("#progress-rows").innerHTML()).includes(
        "Hidden relay",
      ),
    );
    assert(
      !(await page.locator("#progress-rows").innerHTML()).includes(
        "demo%3Ahidden-relay",
      ),
    );
    assert.match(
      await page.locator("#progress-rows").textContent(),
      /Spoiler-protected prerequisite/,
    );
    assert.match(
      await page.locator("#progress-rows").textContent(),
      /Reviewed 2026-10-21/,
    );
    assert.equal(
      await page
        .locator(
          '#progress-rows a[href="https://example.com/fictional-reference"]',
        )
        .count(),
      1,
    );
    assert.equal(
      await page
        .locator(
          '#progress-rows a[href="/local/?pack=demo%3Atraining-pack&id=demo%3Abench-unlock"]',
        )
        .count(),
      2,
    );
    await page.selectOption("#progress-source", "source:public-fixture");
    assert.equal(await page.locator("#progress-rows article").count(), 1);
    assert.match(
      await page.locator("#progress-rows").textContent(),
      /Training delivery order/,
    );
    await page.selectOption("#progress-status", "verified");
    assert.match(
      await page.locator("#progress-rows").textContent(),
      /No matching/,
    );
    await page.click("#progress-clear");
    await page.selectOption("#progress-track", "dmz-order");
    assert.equal(await page.locator("#progress-rows article").count(), 1);
    await page.click("#progress-clear");
    for (const query of [
      "Hidden relay activation",
      "demo:hidden-relay",
      "end of the exercise",
    ]) {
      await page.fill("#progress-query", query);
      assert.match(
        await page.locator("#progress-rows").textContent(),
        /No matching/,
      );
    }
    let revision = (await profile(page)).value.revision;
    await page.locator("#spoiler-toggle").focus();
    await page.keyboard.press("Enter");
    await waitRevision(page, revision);
    assert.equal(
      await page
        .locator("#spoiler-toggle")
        .evaluate((n) => n === document.activeElement),
      true,
    );
    assert.match(
      await page.locator("#progress-rows").textContent(),
      /end of the exercise/,
    );
    await page.reload();
    await page.waitForFunction(
      () =>
        document.querySelector("#spoiler-toggle").textContent ===
        "Hide spoilers",
    );
    assert.match(
      await page.locator("#progress-rows").textContent(),
      /Hidden relay activation/,
    );
    const revealedMap = await context.newPage();
    revealedMap.on("pageerror", (e) => errors.push(e.message));
    await revealedMap.goto(base + "/maps/?pack=demo%3Atraining-pack");
    await revealedMap.waitForSelector("#location-list button");
    assert.equal(await revealedMap.locator("#map-select option").count(), 2);
    assert.equal(await revealedMap.locator("#location-list button").count(), 4);
    assert.equal(
      await revealedMap.locator("#map-markers [data-location-id]").count(),
      4,
    );
    await revealedMap.fill("#location-search", "Concealed relay cache");
    assert.equal(await revealedMap.locator("#location-list button").count(), 1);
    await revealedMap
      .locator('#location-list [data-location-id="demo:hidden-location"]')
      .click();
    assert.match(
      await revealedMap.locator("#location-detail").textContent(),
      /11, 19/,
    );
    await revealedMap.fill("#location-search", "");
    await revealedMap.selectOption("#map-select", "demo:hidden-map");
    assert.equal(await revealedMap.locator("#location-list button").count(), 1);
    await revealedMap
      .locator('#location-list [data-location-id="demo:hidden-map-child"]')
      .click();
    assert.match(
      await revealedMap.locator("#location-detail").textContent(),
      /31, 47/,
    );
    await revealedMap.close();
    await page.selectOption(
      '[data-progress-id="demo:campaign-chapter"]',
      "completed",
    );
    await waitRevision(page, ++revision);
    assert.equal(
      await page.locator('[data-progress-id="demo:bench-unlock"]').inputValue(),
      "unknown",
    );
    revision = (await profile(page)).value.revision;
    await page.selectOption(
      '[data-progress-id="demo:bench-unlock"]',
      "completed",
    );
    await waitRevision(page, revision);
    await page.selectOption("#progress-state", "completed");
    assert.equal(await page.locator("#progress-rows article").count(), 2);
    await page.click("#progress-clear");
    const beforeReset = (await profile(page)).value;
    for (const field of ["inventory", "reserves", "goals"])
      assert.deepEqual(beforeReset[field], inventoryBaseline[field]);
    await page.locator("#progress-reset").focus();
    await page.keyboard.press("Enter");
    assert.equal(
      await page
        .locator("#progress-reset-yes")
        .evaluate((n) => n === document.activeElement),
      true,
    );
    assert.match(
      await page.locator("#progress-reset-target").textContent(),
      /FICTIONAL TRAINING DATA.*revision/,
    );
    await page.keyboard.press("Tab");
    assert.equal(
      await page
        .locator("#progress-reset-no")
        .evaluate((n) => n === document.activeElement),
      true,
    );
    await page.keyboard.press("Enter");
    assert.equal(
      await page
        .locator("#progress-reset")
        .evaluate((n) => n === document.activeElement),
      true,
    );
    assert.deepEqual((await profile(page)).value, beforeReset);
    await page.click("#progress-reset");
    await page.click("#progress-reset-yes");
    await waitRevision(page, beforeReset.revision);
    const afterReset = await profile(page);
    assert.deepEqual(afterReset.value.completion, {});
    assert.deepEqual(afterReset.previous, beforeReset);
    for (const field of ["inventory", "reserves", "goals"])
      assert.deepEqual(afterReset.value[field], beforeReset[field]);
    assert.equal(
      await page
        .locator("#progress-reset")
        .evaluate((n) => n === document.activeElement),
      true,
    );
    // Same-tab mutation invalidates a captured reset revision.
    await page.click("#progress-reset");
    await page.selectOption('[data-progress-id="demo:bench-unlock"]', "locked");
    await waitRevision(page, afterReset.value.revision);
    await page.click("#progress-reset-yes");
    assert.match(await page.locator("#error").textContent(), /expired/);
    await page.click("#progress-reset-no");
    // Real stale-tab failure: newer data and its previous snapshot cannot be changed.
    const stale = await context.newPage();
    await stale.goto(base + progressURL);
    await stale.waitForSelector("#progress-rows article");
    await stale.click("#progress-reset");
    const staleCopy = await downloadProfile(stale);
    revision = (await profile(page)).value.revision;
    await page.selectOption(
      '[data-progress-id="demo:bench-unlock"]',
      "completed",
    );
    await waitRevision(page, revision);
    const savedNewer = await profile(page);
    await stale.click("#progress-reset-yes");
    await stale.waitForSelector("#error:not([hidden])");
    assert.match(await stale.locator("#error").textContent(), /Another tab/);
    assert.match(
      await stale.locator("#save-status").textContent(),
      /Export before reload/,
    );
    assert.equal(
      await stale
        .locator('[data-progress-id="demo:bench-unlock"]')
        .inputValue(),
      "locked",
    );
    assert.equal(
      await stale
        .locator("#error")
        .evaluate((n) => n === document.activeElement),
      true,
    );
    assert.deepEqual(await downloadProfile(stale), staleCopy);
    assert.deepEqual(await profile(page), savedNewer);
    await stale.close();
    // A pack change cancels the reset, and never clears the other pack.
    await page.click("#progress-reset");
    await page.selectOption("#pack-select", "official:mw4-dmz-starter");
    await page.waitForFunction(() =>
      document.querySelector("#pack-note").textContent.includes("MW4"),
    );
    assert.equal(
      await page.locator("#progress-reset-confirm").isVisible(),
      false,
    );
    await page.selectOption("#pack-select", packId);
    await page.waitForSelector('[data-progress-id="demo:bench-unlock"]');
    assert.deepEqual(await profile(page), savedNewer);
    revision = savedNewer.value.revision;
    await page.locator("#spoiler-toggle").focus();
    await page.keyboard.press("Enter");
    await waitRevision(page, revision);
    assert.equal(
      await page
        .locator("#spoiler-toggle")
        .evaluate((n) => n === document.activeElement),
      true,
    );
    assert(
      !(await page.locator("#progress-rows").innerHTML()).includes(
        "Hidden relay",
      ),
    );
    assert(
      !(await page.locator("#progress-rows").innerHTML()).includes(
        "end of the exercise",
      ),
    );
    await page.reload();
    await page.waitForSelector("#progress-rows article");
    assert.equal(
      await page.locator("#spoiler-toggle").textContent(),
      "Reveal spoilers",
    );
    for (const width of [320, 390]) {
      await page.setViewportSize({ width, height: 844 });
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        `progression overflow at ${width}`,
      );
      await page.screenshot({
        path: `test-results/progression-${width}.png`,
        fullPage: true,
      });
    }
    assert.deepEqual(errors, []);
  } finally {
    await context.close();
  }
  // Storage failure still keeps explicit spoiler choice and manual edits exportable.
  const denied = await browser.newContext();
  await denied.addInitScript(() =>
    Object.defineProperty(window, "indexedDB", {
      get() {
        throw new Error("Storage denied by progression test");
      },
    }),
  );
  try {
    const page = await denied.newPage();
    await page.goto(base + progressURL);
    await page.waitForSelector("#progress-rows article");
    await page.click("#spoiler-toggle");
    await page.waitForFunction(
      () =>
        document.querySelector("#spoiler-toggle").textContent ===
          "Hide spoilers" &&
        !document.querySelector("#spoiler-toggle").disabled,
    );
    await page.selectOption(
      '[data-progress-id="demo:bench-unlock"]',
      "completed",
    );
    await page.waitForFunction(
      () => !document.querySelector("[data-progress-id]").disabled,
    );
    await page.click("#progress-reset");
    await page.click("#progress-reset-yes");
    await page.waitForSelector("#error:not([hidden])");
    assert.equal(
      await page.locator('[data-progress-id="demo:bench-unlock"]').inputValue(),
      "completed",
    );
    assert.equal(
      (await downloadProfile(page)).completion["demo:bench-unlock"],
      "completed",
    );
  } finally {
    await denied.close();
  }
  console.log(
    "Progression acceptance passed: filters, scoped links, source provenance, spoiler masking/persistence/focus, reset/cancel/snapshot/tab conflict, export recovery and 320/390px.",
  );
}
