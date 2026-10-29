import assert from "node:assert/strict";
import { readFile, mkdir } from "node:fs/promises";
const packId = "demo:training-pack";
const progressURL = "/progression/?pack=demo%3Atraining-pack";
const upgradeControl = (field) =>
  `[data-upgrade-id="demo:bench-unlock"][data-upgrade-field="${field}"]`;
// These explicit v2 mechanics belong only to the fictional training fixture.
// This is fixture construction, not an implicit migration of a user's profile.
function syntheticUpgradePack(input) {
  const pack = structuredClone(input);
  assert.equal(pack.id, packId);
  assert.equal(pack.schemaVersion, 1);
  pack.schemaVersion = 2;
  pack.sources = pack.sources.map((source, index) => ({
    ...source,
    provenance: {
      kind: "web",
      observationKey: `synthetic-progression-${index}`,
      lineageKey: `synthetic-progression-${index}`,
      captureDate: null,
      buildStatus: "known",
    },
  }));
  const requirements = (rows, sourceIds) =>
    rows.map(({ consumed, ...row }) => ({
      ...row,
      consumption: consumed ? "consumed" : "retained",
      status: "fictional",
      sourceIds: [...sourceIds],
    }));
  for (const recipe of pack.recipes)
    recipe.inputs = requirements(recipe.inputs, recipe.sourceIds);
  for (const objective of pack.objectives) {
    objective.requirements = requirements(
      objective.requirements,
      objective.sourceIds,
    );
    if (objective.track === "dmz-upgrade")
      objective.upgrade = {
        tierLabel: null,
        prerequisiteStatus: "known",
        observationKeys: ["synthetic-progression-upgrade"],
      };
  }
  return pack;
}
async function installUpgradeFixture(context) {
  await context.route(
    "**/assets/content/packs/demo-training.json",
    async (route) => {
      const response = await route.fetch();
      assert(response.ok(), "The training fixture must load successfully");
      await route.fulfill({
        response,
        json: syntheticUpgradePack(await response.json()),
      });
    },
  );
}
async function confirmUpgrade(page, field, value) {
  await page.selectOption(upgradeControl(field), value);
  await page.waitForSelector("#upgrade-progress-confirm[open]");
  assert.match(
    await page.locator("#upgrade-progress-confirm").textContent(),
    /Status-only correction: no stock deduction, refund or spending record/,
  );
  await page.click("#upgrade-progress-apply");
}
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
  await installUpgradeFixture(context);
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
      next.watchPins = ["demo:wire"];
      await saveProfile(next, 0);
    });
    await page.reload();
    await page.waitForSelector("#progress-rows article");
    const inventoryBaseline = (await profile(page)).value;
    assert.equal(inventoryBaseline.schemaVersion, 3);
    assert.deepEqual(inventoryBaseline.upgradeProgress, {});
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
      await page.locator(upgradeControl("completion")).inputValue(),
      "unknown",
    );
    revision = (await profile(page)).value.revision;
    await confirmUpgrade(page, "completion", "completed");
    await waitRevision(page, revision);
    assert.equal(
      (await profile(page)).value.upgradeProgress["demo:bench-unlock"]
        .completion,
      "completed",
    );
    assert.equal(
      Object.hasOwn(
        (await profile(page)).value.completion,
        "demo:bench-unlock",
      ),
      false,
    );
    await page.selectOption("#progress-state", "completed");
    assert.equal(await page.locator("#progress-rows article").count(), 2);
    await page.click("#progress-clear");
    const beforeReset = (await profile(page)).value;
    for (const field of [
      "inventory",
      "reserves",
      "goals",
      "routes",
      "watchPins",
    ])
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
    assert.deepEqual(afterReset.value.upgradeProgress, {});
    assert.deepEqual(afterReset.previous, beforeReset);
    for (const field of [
      "inventory",
      "reserves",
      "goals",
      "routes",
      "watchPins",
    ])
      assert.deepEqual(afterReset.value[field], beforeReset[field]);
    assert.equal(
      await page
        .locator("#progress-reset")
        .evaluate((n) => n === document.activeElement),
      true,
    );
    // Same-tab mutation invalidates a captured reset revision.
    await page.click("#progress-reset");
    await confirmUpgrade(page, "availability", "locked");
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
    await confirmUpgrade(page, "completion", "completed");
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
      await stale.locator(upgradeControl("availability")).inputValue(),
      "locked",
    );
    assert.equal(
      await stale.locator(upgradeControl("completion")).inputValue(),
      "unknown",
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
    await page.waitForSelector(upgradeControl("completion"));
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
  await installUpgradeFixture(denied);
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
      '[data-progress-id="demo:campaign-chapter"]',
      "completed",
    );
    await page.waitForFunction(
      () => !document.querySelector("[data-progress-id]").disabled,
    );
    const beforeUpgrade = await downloadProfile(page);
    assert.equal(
      beforeUpgrade.completion["demo:campaign-chapter"],
      "completed",
    );
    assert.deepEqual(beforeUpgrade.upgradeProgress, {});
    await confirmUpgrade(page, "completion", "completed");
    await page.waitForSelector("#upgrade-progress-export:not([hidden])");
    assert.match(
      await page.locator("#upgrade-progress-result").textContent(),
      /Not saved.*committed progress has not changed/,
    );
    assert.equal(
      await page.locator(upgradeControl("completion")).inputValue(),
      "unknown",
    );
    const pendingCandidate = page.waitForEvent("download");
    await page.click("#upgrade-progress-export");
    const candidateDownload = await pendingCandidate;
    const candidate = JSON.parse(
      await readFile(await candidateDownload.path(), "utf8"),
    );
    assert.equal(
      candidate.upgradeProgress["demo:bench-unlock"].completion,
      "completed",
    );
    assert.deepEqual(candidate.completion, beforeUpgrade.completion);
    for (const field of [
      "inventory",
      "reserves",
      "goals",
      "routes",
      "watchPins",
    ])
      assert.deepEqual(candidate[field], beforeUpgrade[field]);
    await page.click("#upgrade-progress-cancel");
    assert.deepEqual(await downloadProfile(page), beforeUpgrade);
    await page.click("#progress-reset");
    await page.click("#progress-reset-yes");
    await page.waitForSelector("#error:not([hidden])");
    assert.equal(
      await page
        .locator('[data-progress-id="demo:campaign-chapter"]')
        .inputValue(),
      "completed",
    );
    assert.equal(
      (await downloadProfile(page)).completion["demo:campaign-chapter"],
      "completed",
    );
    assert.deepEqual((await downloadProfile(page)).upgradeProgress, {});
  } finally {
    await denied.close();
  }
  console.log(
    "Progression acceptance passed: v2 upgrade controls/confirmation, separate campaign progress, filters, scoped links, source provenance, spoiler masking/persistence/focus, reset/cancel/snapshot/tab conflict, failed candidate export recovery and 320/390px.",
  );
}
