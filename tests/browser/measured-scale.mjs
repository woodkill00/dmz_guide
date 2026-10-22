import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { cpus, platform, release, totalmem } from "node:os";
import { loadFixturePack } from "../helpers/catalog.mjs";
import { validatePack } from "../../src/content/validate.mjs";
import { parseBounded } from "../../src/content/limits.mjs";

const training = "demo:training-pack";
const selectedPath = "/assets/content/packs/demo-training.json";
const unrelatedPath = "/assets/content/packs/official-starter.json";
const schema = JSON.parse(await readFile("schemas/pack.schema.json", "utf8"));
const median = (values) =>
  [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const ready = (page) =>
  page.waitForFunction(
    () => document.querySelector("main")?.getAttribute("aria-busy") === "false",
  );

/** Independent valid fictional inventory and native-option populations avoid changing limits. */
export function measuredFixture(count, kind = "inventory") {
  const pack = loadFixturePack("demo-training");
  for (const group of [
    "items",
    "recipes",
    "objectives",
    "guides",
    "maps",
    "locations",
    "claims",
    "assets",
  ])
    pack[group] = [];
  const original = loadFixturePack("demo-training");
  if (kind === "inventory") {
    pack.items = Array.from({ length: count }, (_, i) => ({
      ...original.items[0],
      id: `demo:scale-item-${i}`,
      name: `FICTIONAL item ${String(i).padStart(5, "0")}`,
    }));
  } else {
    pack.objectives = Array.from({ length: count }, (_, i) => ({
      ...original.objectives[0],
      id: `demo:scale-goal-${i}`,
      name: `FICTIONAL goal ${String(i).padStart(5, "0")}`,
      requirements: [],
      prerequisites: [],
      effects: [],
    }));
  }
  const body = JSON.stringify(pack);
  validatePack(parseBounded(body), schema, { profile: "published" });
  return {
    pack,
    body,
    bytes: Buffer.byteLength(body),
    count,
    kind,
    validation:
      "parseBounded and validatePack published passed; unchanged limits",
  };
}

async function isolation({ browser, base, baseline, evidence }) {
  const context = await browser.newContext();
  let releaseGate,
    signalRequested,
    requested = false;
  const requestedGate = new Promise((resolve) => {
    signalRequested = resolve;
  });
  const gate = new Promise((resolve) => {
    releaseGate = resolve;
  });
  await context.route(`**${unrelatedPath}`, async (route) => {
    requested = true;
    signalRequested();
    await gate;
    await route.continue();
  });
  const page = await context.newPage();
  try {
    const selected = page.waitForResponse(
      (response) => new URL(response.url()).pathname === selectedPath,
    );
    await page.goto(`${base}/inventory/?pack=${encodeURIComponent(training)}`, {
      waitUntil: "domcontentloaded",
    });
    await (await selected).finished();
    if (baseline) {
      await Promise.race([
        requestedGate,
        new Promise((_, reject) => {
          const timer = setTimeout(
            () =>
              reject(
                new Error(
                  "Baseline did not request unrelated payload within 10s",
                ),
              ),
            10000,
          );
          requestedGate.then(() => clearTimeout(timer));
        }),
      ]);
      assert.equal(
        await page.locator("main").getAttribute("aria-busy"),
        "true",
      );
      assert.equal(await page.locator("[data-inventory-item]").count(), 0);
      releaseGate();
      await ready(page);
      evidence.push(
        "REPRODUCED: selected payload completed but initialization waited for controlled unrelated payload release",
      );
    } else {
      await ready(page);
      assert.equal(
        requested,
        false,
        "Selected readiness must not request unrelated payload",
      );
      evidence.push("Selected readiness independent of unrelated payload");
    }
  } finally {
    releaseGate();
    await context.close();
  }
  const malformed = await browser.newContext();
  let malformedRequests = 0;
  await malformed.route(`**${unrelatedPath}`, (route) => {
    malformedRequests++;
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: '{"schemaVersion":1}',
    });
  });
  try {
    const p = await malformed.newPage();
    await p.goto(`${base}/inventory/?pack=${encodeURIComponent(training)}`);
    if (baseline) {
      await p.waitForSelector("#error:not([hidden])");
      assert.equal(malformedRequests, 1);
      assert.equal(await p.locator("[data-inventory-item]").count(), 0);
      evidence.push(
        "REPRODUCED: HTTP200 malformed unrelated content blocks healthy selected catalog",
      );
    } else {
      await ready(p);
      assert.equal(malformedRequests, 0);
    }
  } finally {
    await malformed.close();
  }
  const unknown = await browser.newContext();
  try {
    const p = await unknown.newPage();
    await p.goto(`${base}/inventory/?pack=demo%3Aunknown-scale-catalog`);
    if (baseline) {
      await ready(p);
      assert.equal(
        await p.locator("#pack-select").inputValue(),
        "official:mw4-dmz-starter",
      );
      evidence.push(
        "REPRODUCED: unknown requested ID silently opens official catalog",
      );
    } else {
      await p.waitForSelector("#error:not([hidden])");
      assert.equal(await p.locator("[data-inventory-item]").count(), 0);
      assert.equal(
        await p.locator("#export-current-profile").isDisabled(),
        true,
      );
      await p.selectOption("#pack-select", training);
      await ready(p);
      assert.equal(await p.locator("#pack-select").inputValue(), training);
    }
  } finally {
    await unknown.close();
  }
}

async function preservedDrafts({ browser, base, evidence }) {
  const context = await browser.newContext();
  await context.addInitScript(() => {
    const put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (...args) {
      if (window.scaleFailSave)
        throw new DOMException("Injected scale quota", "QuotaExceededError");
      return put.apply(this, args);
    };
  });
  let failCatalog = true;
  await context.route(`**${unrelatedPath}`, (route) =>
    failCatalog
      ? route.fulfill({
          status: 200,
          contentType: "application/json",
          body: '{"schemaVersion":1}',
        })
      : route.continue(),
  );
  const page = await context.newPage();
  const wire = page.locator('[data-field="inventory"][data-id="demo:wire"]');
  const reserve = page.locator('[data-field="reserves"][data-id="demo:wire"]');
  try {
    await page.goto(`${base}/inventory/?pack=${encodeURIComponent(training)}`);
    await ready(page);
    await wire.fill("");
    await reserve.fill("4");
    await page.fill("#inventory-query", "cell");
    assert.equal(await wire.isVisible(), false);
    await page.selectOption("#pack-select", "official:mw4-dmz-starter");
    await page.click("#draft-discard");
    await page.waitForFunction(() =>
      document
        .querySelector("#save-status")
        .textContent.includes("switch failed"),
    );
    assert.equal(await page.locator("#pack-select").inputValue(), training);
    assert.equal(await wire.inputValue(), "");
    assert.equal(await reserve.inputValue(), "4");
    await page.selectOption("#pack-select", "official:mw4-dmz-starter");
    await page.click("#draft-stay");
    assert.equal(await wire.inputValue(), "");
    // Re-show only to enter a valid value; hiding it again must not change its checkpoint.
    await page.fill("#inventory-query", "");
    await wire.fill("29");
    await page.fill("#inventory-query", "cell");
    await page.evaluate(() => {
      window.scaleFailSave = true;
      document.querySelector("#error").hidden = true;
    });
    await page.selectOption("#pack-select", "official:mw4-dmz-starter");
    await page.click("#draft-save");
    await page.waitForSelector("#error:not([hidden])");
    assert.equal(await wire.inputValue(), "29");
    assert.equal(await reserve.inputValue(), "4");
    assert.equal(await page.locator("#pack-select").inputValue(), training);
    await page.evaluate(() => {
      window.scaleFailSave = false;
    });
    failCatalog = false;
    await page.selectOption("#pack-select", "official:mw4-dmz-starter");
    await page.click("#draft-save");
    await page.waitForFunction(
      () =>
        document.querySelector("#pack-select").value ===
          "official:mw4-dmz-starter" &&
        document.querySelector("main").getAttribute("aria-busy") === "false",
    );
    await page.selectOption("#pack-select", training);
    await page.waitForSelector(
      '[data-field="inventory"][data-id="demo:wire"]',
      { state: "attached" },
    );
    await ready(page);
    assert.equal(await wire.inputValue(), "29");
    assert.equal(await reserve.inputValue(), "4");
    await page.reload();
    await ready(page);
    assert.equal(
      await wire.inputValue(),
      "29",
      "Hidden saved value is durable after reload",
    );
    assert.equal(await reserve.inputValue(), "4");
    await wire.fill("");
    await page.fill("#inventory-query", "cell");
    await page.selectOption("#pack-select", "official:mw4-dmz-starter");
    await page.click("#draft-discard");
    await page.waitForFunction(
      () =>
        document.querySelector("#pack-select").value ===
          "official:mw4-dmz-starter" &&
        document.querySelector("main").getAttribute("aria-busy") === "false",
    );
    await page.selectOption("#pack-select", training);
    await page.waitForSelector(
      '[data-field="inventory"][data-id="demo:wire"]',
      { state: "attached" },
    );
    await ready(page);
    assert.equal(
      await wire.inputValue(),
      "29",
      "Successful Discard restores durable hidden entry",
    );
    assert.equal(await reserve.inputValue(), "4");
    evidence.push(
      "Failed Discard switch retains hidden invalid raw draft/checkpoint; Stay and failed Save retain values; successful full Save survives reload and includes hidden entries; successful Discard restores durable values; explicit catalog retry recovers",
    );
  } finally {
    await context.close();
  }
}

async function measure({ browser, base, count, kind }) {
  const fixture = measuredFixture(count, kind);
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  const manifest = {
    packs: [selectedPath],
    catalogs: [{ id: training, title: fixture.pack.title, path: selectedPath }],
  };
  await context.route("**/assets/content/manifest.json", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(manifest),
    }),
  );
  await context.route(`**${selectedPath}`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: fixture.body,
    }),
  );
  await context.addInitScript(() => {
    const observer = new MutationObserver(() => {
      if (
        document.querySelector("main")?.getAttribute("aria-busy") === "false"
      ) {
        observer.disconnect();
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            window.scaleReadyMs = performance.now();
          }),
        );
      }
    });
    observer.observe(document, {
      subtree: true,
      attributes: true,
      childList: true,
    });
  });
  const initialization = [],
    interactions = [],
    synchronous = [];
  try {
    const page = await context.newPage();
    // One untimed warmup followed by five complete navigation/interaction samples.
    for (let sample = -1; sample < 5; sample++) {
      await page.goto(
        `${base}/${kind === "inventory" ? "inventory" : "planner"}/?pack=${encodeURIComponent(training)}`,
      );
      await page.waitForFunction(() => Number.isFinite(window.scaleReadyMs));
      const init = await page.evaluate(() => window.scaleReadyMs);
      let result;
      if (kind === "inventory") {
        assert.equal(
          await page.locator("[data-inventory-item]").count(),
          count,
        );
        result = await page.evaluate(async () => {
          const input = document.querySelector("#inventory-query");
          const start = performance.now();
          input.value = "item 00001";
          input.dispatchEvent(new Event("input", { bubbles: true }));
          const sync = performance.now() - start;
          await new Promise((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(resolve)),
          );
          return {
            sync,
            painted: performance.now() - start,
            visible: [
              ...document.querySelectorAll("[data-inventory-item]"),
            ].filter((node) => !node.hidden).length,
          };
        });
        assert.equal(result.visible, 1, "Stable exact fixture filter result");
      } else {
        assert.equal(
          await page.locator("#goal-select option").count(),
          count + 1,
        );
        await page.locator("#goal-select").focus();
        await page.evaluate(() => {
          document.querySelector("#goal-select").addEventListener(
            "keydown",
            () => {
              const start = performance.now();
              requestAnimationFrame(() =>
                requestAnimationFrame(() => {
                  window.scaleKeyMs = performance.now() - start;
                }),
              );
            },
            { once: true },
          );
        });
        await page.keyboard.press("ArrowDown");
        await page.waitForFunction(() => Number.isFinite(window.scaleKeyMs));
        assert.equal(
          await page.locator("#goal-select").inputValue(),
          "demo:scale-goal-0",
        );
        result = {
          painted: await page.evaluate(() => window.scaleKeyMs),
          sync: null,
        };
      }
      if (sample >= 0) {
        initialization.push(init);
        interactions.push(result.painted);
        if (result.sync !== null) synchronous.push(result.sync);
      }
    }
    return {
      count,
      kind,
      bytes: fixture.bytes,
      validation: fixture.validation,
      warmups: 1,
      samples: 5,
      initializationMs: initialization,
      interactionToPaintMs: interactions,
      synchronousFilterMs: synchronous,
      medianInitializationMs: median(initialization),
      medianInteractionMs: median(interactions),
    };
  } finally {
    await context.close();
  }
}

/** Baseline output is reproduction/measurement evidence, never release acceptance. */
export async function runMeasuredScaleTests({
  browser,
  base,
  baseline = false,
  prefix = browser.browserType().name(),
}) {
  const evidence = {
    baseline,
    status: baseline
      ? "baseline reproduction, not acceptance"
      : "focused checks, broader release gates remain",
    environment: {
      browser: browser.browserType().name(),
      version: browser.version(),
      os: platform(),
      osRelease: release(),
      node: process.version,
      cpu: cpus()[0]?.model,
      logicalCpus: cpus().length,
      memoryBytes: totalmem(),
      runner: process.env.RUNNER_NAME || "local",
      runnerOS: process.env.RUNNER_OS || platform(),
    },
    method:
      "One warmup and five samples per valid fixture. Initialization uses navigation time origin to ready plus double animation frame. Filter dispatch measures synchronous work and next painted frame; native keydown measures next painted frame and verifies selected option. Routed HTTP200 fixture payloads isolate browser work from network variability. Warm process/context; no universal latency claims, native popup opening or user study claims. No timing pass/fail assertions.",
    budgetsMs: { initialization: 1000, filter: 100, nativeSelection: 100 },
    scenarios: [],
    measurements: [],
  };
  evidence.complete = false;
  const checkpoint = () =>
    writeFile(
      `test-results/${prefix}-measured-scale-${baseline ? "baseline-reproduction" : "acceptance"}.json`,
      JSON.stringify(evidence, null, 2),
    );
  await checkpoint();
  try {
    await isolation({ browser, base, baseline, evidence: evidence.scenarios });
    await checkpoint();
    if (!baseline) {
      await preservedDrafts({ browser, base, evidence: evidence.scenarios });
      await checkpoint();
    }
    for (const kind of ["inventory", "native-selector"])
      for (const count of [100, 1000, 5000]) {
        evidence.measurements.push(
          await measure({ browser, base, count, kind }),
        );
        await checkpoint();
      }
    evidence.complete = true;
    await checkpoint();
    return evidence;
  } catch (reason) {
    evidence.failure = { name: reason.name, message: reason.message };
    await checkpoint();
    throw reason;
  }
}
