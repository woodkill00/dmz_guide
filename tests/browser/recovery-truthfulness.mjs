import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { captureDocumentEvidence } from "./page-edit.mjs";
const ready = (page) =>
  page.waitForFunction(
    () => document.querySelector("main")?.getAttribute("aria-busy") === "false",
  );
/** The initial branch runs explicit baseline probes, never release acceptance. */
export async function runRecoveryTruthfulnessTests({
  browser,
  base,
  baseline = false,
  captureScreenshots = true,
}) {
  if (!baseline) return fixedJourneys({ browser, base, captureScreenshots });
  const evidence = { baseline: true, scenarios: [] };
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await page.goto(`${base}/settings/?pack=demo%3Atraining-pack`);
    await ready(page);
    const backup = await page.evaluate(async () => {
      const { state } = await import("/assets/src/client/common.mjs");
      const p = structuredClone(state.profile);
      p.spoilers = !p.spoilers;
      return p;
    });
    await page.locator("#import-profile").setInputFiles({
      name: "spoilers-only.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(backup)),
    });
    await page.locator("#restore-preview").waitFor({ state: "visible" });
    const summary = JSON.parse(
      await page.locator("#restore-summary").textContent(),
    );
    assert.deepEqual(
      summary.changes,
      {},
      "Baseline omits sole spoiler preference change",
    );
    evidence.scenarios.push(
      "REPRODUCED C4: spoiler-only restore has empty changes summary",
    );
    await page.evaluate(async () => {
      const { commitRecord } = await import("/assets/src/storage/store.mjs");
      await commitRecord(
        "content",
        "local:invalid-probe",
        { pack: { id: "local:invalid-probe" } },
        0,
      );
    });
    await page.reload();
    await ready(page);
    assert.match(
      await page.locator("#save-status").textContent(),
      /storage unavailable/i,
    );
    assert.equal(
      await page.evaluate(
        async () =>
          !!(await (
            await import("/assets/src/storage/store.mjs")
          ).readRecord("content", "local:invalid-probe")),
      ),
      true,
    );
    evidence.scenarios.push(
      "REPRODUCED C2: invalid local content labels functioning storage unavailable",
    );
    const guided = await page.evaluate(async () => {
      const { createGuidedEditor } = await import(
        "/assets/src/client/guided-editor.mjs"
      );
      const root = document.createElement("section");
      root.innerHTML =
        '<select id="editor-section"><option value="metadata">Metadata</option></select><label id="record-picker-label"></label><button id="add-record"></button><button id="remove-record"></button><div id="editor-fields"></div>';
      document.body.append(root);
      const draft = { notes: ["kept"] };
      let hostError = null;
      let thrown = null;
      createGuidedEditor({
        root,
        schema: {
          properties: {
            notes: { type: "array", maxItems: 1, items: { type: "string" } },
          },
        },
        getDraft: () => draft,
        mutateDraft: (f) => f(draft),
        onError: (e) => {
          hostError = e.message;
        },
      }).renderFields();
      const add = [...root.querySelectorAll("button")].find(
        (n) => n.textContent === "Add Notes entry",
      );
      try {
        add.onclick();
      } catch (e) {
        thrown = e.message;
      }
      root.remove();
      return { hostError, thrown, draft };
    });
    assert.equal(guided.thrown, "Entry limit reached");
    assert.equal(guided.hostError, null);
    assert.deepEqual(guided.draft.notes, ["kept"]);
    evidence.scenarios.push(
      "REPRODUCED C6: real nested add handler throws at limit instead of host error callback; draft unchanged",
    );
    await page.goto(`${base}/planner/?pack=demo%3Atraining-pack`);
    await ready(page);
    const option = await page
      .locator('#goal-select option[value]:not([value=""])')
      .first()
      .getAttribute("value");
    await page.locator("#goal-select").selectOption(option);
    await page.locator("#goal-form button[type=submit]").click();
    const remove = page.locator("[data-remove]").first();
    await remove.waitFor();
    await remove.focus();
    await remove.click();
    await page.waitForFunction(() => !document.querySelector("[data-remove]"));
    assert.equal(
      await page.evaluate(() => document.activeElement.tagName),
      "BODY",
    );
    evidence.scenarios.push(
      "REPRODUCED C7: successful goal removal loses keyboard focus to body",
    );
  } finally {
    await context.close();
  }
  for (const scenario of evidence.scenarios) console.log(scenario);
  await writeFile(
    `test-results/${browser.browserType().name()}-recovery-baseline.json`,
    JSON.stringify(evidence, null, 2),
  );
}

async function fixedJourneys({ browser, base, captureScreenshots }) {
  const recovered = await browser.newContext();
  await recovered.addInitScript(() => {
    const open = indexedDB.open.bind(indexedDB);
    let failed = false;
    indexedDB.open = (...args) => {
      if (!failed) {
        failed = true;
        const r = {};
        queueMicrotask(() => {
          r.error = new Error("Injected catalog-list open failure");
          r.onerror();
        });
        return r;
      }
      return open(...args);
    };
  });
  try {
    const recoveredPage = await recovered.newPage();
    await recoveredPage.goto(`${base}/inventory/?pack=demo%3Atraining-pack`);
    await ready(recoveredPage);
    assert.match(
      await recoveredPage.locator("#save-status").textContent(),
      /storage available/i,
    );
    await recoveredPage.locator('[data-field="inventory"]').first().fill("3");
    await recoveredPage
      .locator('#inventory-form button[type="submit"]')
      .click();
    await recoveredPage.waitForFunction(() =>
      /Saved locally.*revision/.test(
        document.querySelector("#save-status").textContent,
      ),
    );
    await recoveredPage.selectOption(
      "#pack-select",
      "official:mw4-dmz-starter",
    );
    await ready(recoveredPage);
    assert(
      !/storage unavailable/i.test(
        await recoveredPage.locator("#save-status").textContent(),
      ),
    );
  } finally {
    await recovered.close();
  }
  const context = await browser.newContext();
  await context.addInitScript(() => {
    const put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (...args) {
      if (window.failRecoverySave)
        throw new DOMException("Injected recovery quota", "QuotaExceededError");
      return put.apply(this, args);
    };
  });
  const page = await context.newPage();
  const evidence = { baseline: false, scenarios: [] };
  try {
    await page.goto(`${base}/settings/?pack=demo%3Atraining-pack`);
    await ready(page);
    const source = await page.evaluate(async () => {
      const { state } = await import("/assets/src/client/common.mjs");
      const { loadProfile } = await import("/assets/src/storage/store.mjs");
      return {
        profile: state.profile,
        pack: state.pack,
        durable: await loadProfile(state.pack.id),
      };
    });
    const importBackup = async (backup) => {
      await page.locator("#import-profile").setInputFiles({
        name: "recovery.json",
        mimeType: "application/json",
        buffer: Buffer.from(JSON.stringify(backup)),
      });
      await page.locator("#restore-preview").waitFor({ state: "visible" });
    };
    await importBackup({ ...source.profile, spoilers: true });
    assert.match(
      await page.locator("#restore-summary").textContent(),
      /Spoiler preference.*Off → On/s,
    );
    await page.click("#apply-restore");
    await page.locator("#restore-preview").waitFor({ state: "hidden" });
    await page.reload();
    await ready(page);
    assert.equal(
      await page.evaluate(
        async () =>
          (await import("/assets/src/client/common.mjs")).state.profile
            .spoilers,
      ),
      true,
    );
    await importBackup(source.profile);
    await page.click("#apply-restore");
    await page.locator("#restore-preview").waitFor({ state: "hidden" });
    await page.reload();
    await ready(page);
    source.durable = await page.evaluate(
      async (id) =>
        (await import("/assets/src/storage/store.mjs")).loadProfile(id),
      source.pack.id,
    );
    const backup = structuredClone(source.profile);
    backup.inventory[source.pack.items[0].id] = 12;
    backup.reserves[source.pack.items[0].id] = 3;
    backup.goals = [{ id: source.pack.recipes[0].id, quantity: 2 }];
    backup.routes[source.pack.items[0].id] = source.pack.recipes[0].id;
    backup.completion[source.pack.objectives[0].id] = "completed";
    backup.inventory["unknown:private-secret"] = 9;
    backup.contentVersion = "unknown-private-version";
    await importBackup(backup);
    for (const heading of [
      "Inventory",
      "Protected reserves",
      "Progress",
      "Goals in priority order",
      "Crafting routes",
      "Catalog and version",
      "Spoiler preference",
    ])
      assert(
        await page
          .getByRole("heading", { name: heading, exact: true })
          .isVisible(),
      );
    const safeDetail = JSON.parse(
      await page.locator("#restore-detail").textContent(),
    );
    const changes = (title) =>
      safeDetail.sections.find((s) => s.title === title).changes;
    assert(
      changes("Inventory").some(
        (c) =>
          c.label === source.pack.items[0].name &&
          c.before === "Not set" &&
          c.after === "12",
      ),
    );
    assert(changes("Protected reserves").some((c) => c.after === "3"));
    assert(
      changes("Goals in priority order").some((c) =>
        c.after.includes("additional quantity 2"),
      ),
    );
    assert(changes("Progress").some((c) => c.after === "completed"));
    assert(
      changes("Crafting routes").some(
        (c) => c.after === source.pack.recipes[0].name,
      ),
    );
    const visible = await page.locator("#restore-preview").textContent();
    assert.match(visible, new RegExp(source.pack.items[0].name));
    assert(!visible.includes("unknown:private-secret"));
    assert(!visible.includes("unknown-private-version"));
    assert.deepEqual(
      await page.evaluate(
        async (id) =>
          (await import("/assets/src/storage/store.mjs")).loadProfile(id),
        source.pack.id,
      ),
      source.durable,
      "Preview performs no durable replacement",
    );
    await page.click("#cancel-restore");
    assert.deepEqual(
      await page.evaluate(
        async (id) =>
          (await import("/assets/src/storage/store.mjs")).loadProfile(id),
        source.pack.id,
      ),
      source.durable,
    );
    await page.click("#rebind-profile");
    await page.locator("#restore-preview").waitFor({ state: "visible" });
    assert.match(
      await page.locator("#restore-summary").textContent(),
      /Replace this profile/,
    );
    await page.click("#cancel-restore");
    evidence.scenarios.push(
      "Complete named, masked, non-mutating restore/rebind preview including spoiler-only change",
    );
    await page.evaluate(async () =>
      (await import("/assets/src/storage/store.mjs")).commitRecord(
        "content",
        "local:invalid-probe",
        { pack: { id: "local:invalid-probe" } },
        0,
      ),
    );
    await page.reload();
    await ready(page);
    assert.match(
      await page.locator("#save-status").textContent(),
      /storage available.*content warning/i,
    );
    assert(
      !/storage unavailable/i.test(
        await page.locator("#save-status").textContent(),
      ),
    );
    evidence.scenarios.push(
      "Content validation warning never claims healthy storage unavailable",
    );
    const lifecycle = await page.evaluate(async () => {
      const open = indexedDB.open.bind(indexedDB);
      let first = true;
      const connections = [];
      indexedDB.open = (...args) => {
        if (first) {
          first = false;
          const r = {};
          queueMicrotask(() => {
            r.error = new Error("Injected first open");
            r.onerror();
          });
          return r;
        }
        const r = open(...args);
        r.addEventListener("success", () => connections.push(r.result));
        return r;
      };
      try {
        const store = await import(
          "/assets/src/storage/store.mjs?real-lifecycle=1"
        );
        let failed = false;
        try {
          await store.readRecord("profiles", "demo:training-pack");
        } catch (e) {
          failed = /Injected first open/.test(e.message);
        }
        await store.readRecord("profiles", "demo:training-pack");
        connections[0].dispatchEvent(new Event("versionchange"));
        await store.readRecord("profiles", "demo:training-pack");
        connections[1].close();
        let closedFailed = false;
        try {
          await store.readRecord("profiles", "demo:training-pack");
        } catch (e) {
          closedFailed = e.name === "InvalidStateError";
        }
        await store.readRecord("profiles", "demo:training-pack");
        return { failed, closedFailed, opened: connections.length };
      } finally {
        indexedDB.open = open;
        for (const db of connections) db.close();
      }
    });
    assert.deepEqual(lifecycle, {
      failed: true,
      closedFailed: true,
      opened: 3,
    });
    evidence.scenarios.push(
      "Real IndexedDB later-read reconnection after failed open, dispatched versionchange and native close; failed operation not replayed",
    );
    await page.goto(`${base}/planner/?pack=demo%3Atraining-pack`);
    await ready(page);
    const goals = await page
      .locator('#goal-select option[value]:not([value=""])')
      .evaluateAll((nodes) => nodes.slice(0, 2).map((n) => n.value));
    await page.selectOption("#goal-select", goals[0]);
    await page.evaluate(() => {
      window.failRecoverySave = true;
    });
    await page.click('#goal-form button[type="submit"]');
    await page.locator("#error:not([hidden])").waitFor();
    assert.equal(await page.locator("[data-remove]").count(), 0);
    assert.deepEqual(
      await page.evaluate(
        async () =>
          (await import("/assets/src/client/common.mjs")).state.profile.goals,
      ),
      [],
    );
    await page.evaluate(() => {
      window.failRecoverySave = false;
    });
    for (const goal of goals) {
      await page.selectOption("#goal-select", goal);
      await page.click('#goal-form button[type="submit"]');
      await page.waitForFunction(
        (id) => document.activeElement?.dataset.goalQuantity === id,
        goal,
      );
    }
    const savedGoals = await page.evaluate(
      async () =>
        (await import("/assets/src/client/common.mjs")).state.profile.goals,
    );
    await page.evaluate(() => {
      window.failRecoverySave = true;
    });
    for (const selector of [
      '[data-move="0"][data-delta="1"]',
      `[data-remove="${goals[0]}"]`,
    ]) {
      await page.click(selector);
      await page.locator("#error:not([hidden])").waitFor();
      assert.deepEqual(
        await page.evaluate(
          async () =>
            (await import("/assets/src/client/common.mjs")).state.profile.goals,
        ),
        savedGoals,
      );
      assert.deepEqual(
        await page
          .locator("[data-goal-quantity]")
          .evaluateAll((nodes) => nodes.map((n) => n.dataset.goalQuantity)),
        goals,
      );
      assert.equal(
        await page
          .locator("#error")
          .evaluate((n) => n === document.activeElement),
        true,
      );
    }
    await page.evaluate(() => {
      window.failRecoverySave = false;
    });
    const quantity = page.locator(`[data-goal-quantity="${goals[0]}"]`);
    await quantity.fill("2");
    await quantity.press("Tab");
    await page.waitForFunction(
      () =>
        document.activeElement?.dataset.move === "0" &&
        document.activeElement?.dataset.delta === "1",
    );
    await quantity.fill("3");
    await quantity.press("Shift+Tab");
    await page.waitForFunction(
      () =>
        document.activeElement ===
        document.querySelector('#goal-form button[type="submit"]'),
    );
    await quantity.fill("4");
    await page.locator("#goal-select").click();
    await page.waitForFunction(
      () => document.activeElement?.id === "goal-select",
    );
    await quantity.focus();
    await quantity.press("Tab");
    await quantity.fill("5");
    await page.locator("#goal-select").click();
    await page.waitForFunction(
      () => document.activeElement?.id === "goal-select",
    );
    assert.deepEqual(
      await page.evaluate(async () =>
        (
          await (
            await import("/assets/src/storage/store.mjs")
          ).loadProfile("demo:training-pack")
        ).value.goals.map((goal) => goal.id),
      ),
      goals,
      "Unrelated successful quantity save cannot persist failed hidden add/remove/reorder",
    );
    const row = quantity.locator("..").locator("..");
    await row.locator('[data-delta="1"]').click();
    await page.waitForFunction(
      (id) =>
        document.activeElement
          ?.closest("li")
          ?.querySelector("[data-goal-quantity]")?.dataset.goalQuantity === id,
      goals[0],
    );
    await page.locator(`[data-remove="${goals[0]}"]`).click();
    await page.waitForFunction(
      (id) => document.activeElement?.dataset.remove === id,
      goals[1],
    );
    await page.locator(`[data-remove="${goals[1]}"]`).click();
    await page.waitForFunction(
      () => document.activeElement?.id === "goal-select",
    );
    evidence.scenarios.push(
      "Goal add/quantity/reorder/remove restore stable logical focus and empty chooser",
    );
    await page.goto(`${base}/editor/?pack=demo%3Atraining-pack`);
    await ready(page);
    await runGuidedLimitAcceptance(page);
    evidence.scenarios.push(
      "Private editor exact8 asset-reference limit visibly caught without draft loss",
    );
    if (captureScreenshots) {
      await page.route("**/__recovery-text-zoom.css", (route) =>
        route.fulfill({
          contentType: "text/css",
          body: ":root{font-size:200%}",
        }),
      );
      for (const theme of ["dark", "light"])
        for (const width of [320, 390, 1280])
          for (const enlarged of [false, true]) {
            await page.setViewportSize({ width, height: 900 });
            await page.goto(`${base}/settings/?pack=demo%3Atraining-pack`);
            await ready(page);
            if (
              (await page.locator("html").getAttribute("data-theme")) !== theme
            )
              await page.click("#theme-toggle");
            const font = await page
              .locator("body")
              .evaluate((n) => parseFloat(getComputedStyle(n).fontSize));
            if (enlarged) {
              await page.addStyleTag({
                url: `${base}/__recovery-text-zoom.css`,
              });
              assert.equal(
                await page
                  .locator("body")
                  .evaluate((n) => parseFloat(getComputedStyle(n).fontSize)),
                font * 2,
              );
            }
            await importBackup(backup);
            assert(
              await page.evaluate(
                () => document.documentElement.scrollWidth <= innerWidth + 1,
              ),
            );
            await captureDocumentEvidence(
              page,
              `test-results/${browser.browserType().name()}-recovery-${theme}-${width}-${enlarged ? "text200" : "normal"}.png`,
            );
          }
    }
  } finally {
    await context.close();
  }
  await writeFile(
    `test-results/${browser.browserType().name()}-recovery-acceptance.json`,
    JSON.stringify(evidence, null, 2),
  );
  console.log("012 recovery acceptance", evidence.scenarios);
}

export async function runGuidedLimitAcceptance(page) {
  await page.selectOption("#editor-section", "items");
  await page.selectOption("#editor-record", "0");
  const included = page.locator('[data-path="items.0.assetIds.included"]');
  if ((await included.count()) && !(await included.isChecked()))
    await included.check();
  const entry = page.locator(
    'input[data-path^="items.0.assetIds."]:not([type="checkbox"])',
  );
  const add = page.getByRole("button", {
    name: "Add Asset Ids entry",
    exact: true,
  });
  while ((await entry.count()) < 8) await add.click();
  const before = await entry.evaluateAll((nodes) => nodes.map((n) => n.value));
  await add.click();
  await page.locator("#error:not([hidden])").waitFor();
  assert.match(
    await page.locator("#error").textContent(),
    /Entry limit reached/,
  );
  assert.deepEqual(
    await entry.evaluateAll((nodes) => nodes.map((n) => n.value)),
    before,
  );
  assert.equal(
    await page.locator("#error").evaluate((n) => n === document.activeElement),
    true,
  );
}
