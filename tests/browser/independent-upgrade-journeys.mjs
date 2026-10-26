// Independent reviewer-owned feature023 browser journeys.
// All holdings below are deliberately synthetic, never values from observations.
// Integration owner may copy this file into tests/browser/ and import its export.
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";

const PACK = "observed:upgrade-review-20261026";
const ITEM = "observed:power-regulator";
const UPGRADE = "observed:dog-tag-case-upgrade-ii";
const stock = `[data-field="inventory"][data-id="${ITEM}"]`;
const reserve = `[data-field="reserves"][data-id="${ITEM}"]`;
const upgrade = (field, id = UPGRADE) =>
  `[data-upgrade-id="${id}"][data-upgrade-field="${field}"]`;
const url = (base, route) =>
  `${base}/${route}/?pack=${encodeURIComponent(PACK)}`;
const expected = [
  [
    "Dog Tag Case Upgrade II",
    "II",
    "Increases Dog Tag Case storage capacity by 20.",
    [
      ["Cash", 50000],
      ["Detonators", 20],
      ["Nylon Cloth", 10],
      ["Power Regulator", 5],
    ],
  ],
  [
    "Stash Weapon Upgrade I",
    "I",
    "Increases Stash weapon capacity by 6.",
    [
      ["Cash", 50000],
      ["Reactive Metals", 20],
      ["Stock Rod", 10],
      ["Comms Module", 5],
    ],
  ],
  [
    "Vendor Item Upgrade I",
    "I",
    "Unlocks additional purchase options at the vendor.",
    [
      ["Electronic Sensors", 20],
      ["CPU", 10],
      ["Printed Circuit Board", 10],
      ["Prototype RF Module", 2],
    ],
  ],
  [
    "Bank Upgrade IV",
    "IV",
    "Increases the amount of cash your bank can hold to 2 Million.",
    [
      ["Cash", 200000],
      ["Ballistic Flight Logs", 5],
      ["Regional Combat Notes", 5],
    ],
  ],
  [
    "MIA Recovery Discount III",
    "III",
    "Reduces the cost of recovering an operator who is Missing In Action by 5%.",
    [
      ["W.M.D. Manifest", 5],
      ["Foreign Intelligence Targets", 5],
      ["Power Regulator", 10],
      ["Comms Module", 10],
    ],
  ],
  [
    "Gunsmith Upgrade II",
    "II",
    "Reduces the cost of Gunsmith purchases by 5%.",
    [
      ["Cash", 100000],
      ["Nitro Compounds", 20],
      ["Comms Module", 10],
      ["Military Composites", 10],
    ],
  ],
  [
    "Stash Item Upgrade III",
    "III",
    "Increases Stash item capacity by 18.",
    [
      ["Cash", 100000],
      ["Binding Catalyst", 20],
      ["Stock Rod", 20],
      ["Alloyed Plating", 10],
    ],
  ],
  [
    "Stash Weapon Upgrade II",
    "II",
    "Increases Stash weapon capacity by 6.",
    [
      ["Cash", 100000],
      ["Structural Alloy", 20],
      ["High-Tenacity Fibers", 20],
      ["Turned Components", 10],
    ],
  ],
];
async function ready(page) {
  await page.waitForFunction(
    () => document.querySelector("main")?.getAttribute("aria-busy") === "false",
  );
}
async function active(page) {
  return page.evaluate(async () =>
    structuredClone(
      (await import("/assets/src/client/common.mjs")).state.profile,
    ),
  );
}
async function durable(page) {
  return page.evaluate(
    async (id) =>
      (await import("/assets/src/storage/store.mjs")).loadProfile(id),
    PACK,
  );
}
async function waitSaved(page, revision) {
  await page.waitForFunction(
    async ({ id, revision }) =>
      (await (await import("/assets/src/storage/store.mjs")).loadProfile(id))
        ?.value?.revision > revision,
    { id: PACK, revision },
  );
  await page.waitForFunction(
    () =>
      document.querySelector("main")?.getAttribute("aria-busy") !== "true" &&
      !document.querySelector("#pack-select")?.disabled,
  );
}
function untouched(profile) {
  const p = structuredClone(profile);
  delete p.revision;
  delete p.upgradeProgress;
  delete p.completion;
  return p;
}
async function saveInventory(page) {
  const before = (await active(page)).revision;
  await page
    .getByRole("button", { name: "Save inventory", exact: true })
    .click();
  await waitSaved(page, before);
  return (await durable(page)).value;
}
// Temporary diagnostic instrumentation: forward focus exactly, never wait or retry.
async function installFocusTrace(page, selector) {
  await page.evaluate((selector) => {
    window.__qaUpgradeFocusTrace?.restore();
    const events = [],
      identities = new WeakMap();
    let nextIdentity = 0;
    const describe = (node) => {
      if (!node) return null;
      if (!identities.has(node)) identities.set(node, ++nextIdentity);
      return {
        identity: identities.get(node),
        tag: node.tagName,
        id: node.id,
        dataset: { ...node.dataset },
        connected: node.isConnected,
        disabled: node.disabled,
      };
    };
    const record = (type, target, detail = {}) => {
      if (events.length < 200)
        events.push({
          at: performance.now(),
          type,
          target: describe(target),
          active: describe(document.activeElement),
          selected: describe(document.querySelector(selector)),
          dialogOpen: document.querySelector("#upgrade-progress-confirm")?.open,
          ...detail,
        });
    };
    const types = [
      "focus",
      "blur",
      "focusin",
      "focusout",
      "keydown",
      "keyup",
      "close",
    ];
    const listener = (event) =>
      record(event.type, event.target, {
        key: event.key,
        trusted: event.isTrusted,
      });
    for (const type of types) document.addEventListener(type, listener, true);
    const original = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      "focus",
    );
    Object.defineProperty(HTMLElement.prototype, "focus", {
      ...original,
      value: function (...args) {
        record("focus-call", this, {
          stack: new Error().stack?.split("\n").slice(1, 6),
        });
        try {
          return Reflect.apply(original.value, this, args);
        } finally {
          record("focus-return", this);
        }
      },
    });
    let selected = document.querySelector(selector);
    const observer = new MutationObserver((mutations) => {
      if (mutations.some((m) => m.target.id === "progress-rows"))
        record(
          "progress-rows-replaced",
          document.querySelector("#progress-rows"),
        );
      const current = document.querySelector(selector);
      if (current !== selected) {
        selected = current;
        record("selected-node-replaced", current);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    window.__qaUpgradeFocusTrace = {
      events,
      mark: (type) => record(type, document.activeElement),
      restore() {
        observer.disconnect();
        for (const type of types)
          document.removeEventListener(type, listener, true);
        Object.defineProperty(HTMLElement.prototype, "focus", original);
        delete window.__qaUpgradeFocusTrace;
      },
    };
    record("trace-start", selected);
  }, selector);
}
async function setProgress(
  page,
  field,
  value,
  { double = false, cancel = false } = {},
) {
  const before = await active(page);
  await installFocusTrace(page, upgrade(field));
  try {
    await page.locator(upgrade(field)).selectOption(value);
    await page
      .locator("#upgrade-progress-confirm")
      .waitFor({ state: "visible" });
    assert.match(
      await page.locator("#upgrade-progress-confirm").textContent(),
      /Recording progress only; update inventory after an in-game purchase\./,
    );
    if (cancel) {
      await page.locator("#upgrade-progress-cancel").focus();
      await page.keyboard.press("Enter");
      await page
        .locator("#upgrade-progress-confirm")
        .waitFor({ state: "hidden" });
      assert.deepEqual(
        await active(page),
        before,
        "Cancel leaves the active profile unchanged",
      );
      return before;
    }
    if (double) {
      const pendingControls = await page
        .locator("#upgrade-progress-apply")
        .evaluate((button) => {
          button.click();
          const locked = {
            apply: button.disabled,
            cancel: document.querySelector("#upgrade-progress-cancel").disabled,
          };
          button.click();
          return locked;
        });
      assert.deepEqual(
        pendingControls,
        { apply: true, cancel: true },
        "Pending progress save disables repeated Apply and misleading Cancel",
      );
    } else {
      await page.locator("#upgrade-progress-apply").focus();
      await page.keyboard.press("Enter");
    }
    await waitSaved(page, before.revision);
    await page
      .locator("#upgrade-progress-confirm")
      .waitFor({ state: "hidden" });
    const after = (await durable(page)).value;
    assert.deepEqual(
      untouched(after),
      untouched(before),
      "Progress saves never change stock, reserves, goals, routes or pins",
    );
    assert.equal(
      after.revision,
      before.revision + 1,
      "One explicit confirmation commits once",
    );
    assert.equal(after.upgradeProgress[UPGRADE][field], value);
    const focusState = await page.locator(upgrade(field)).evaluate((n) => ({
      at: performance.now(),
      focused: n === document.activeElement,
      selected: {
        tag: n.tagName,
        id: n.id,
        dataset: { ...n.dataset },
        disabled: n.disabled,
        connected: n.isConnected,
      },
      active: document.activeElement
        ? {
            tag: document.activeElement.tagName,
            id: document.activeElement.id,
            dataset: { ...document.activeElement.dataset },
          }
        : null,
      dialogOpen: document.querySelector("#upgrade-progress-confirm")?.open,
      timeline: window.__qaUpgradeFocusTrace?.events,
    }));
    if (!focusState.focused) {
      // Diagnostic only: retain the original false result even if native focus arrives later.
      await page.evaluate(() =>
        window.__qaUpgradeFocusTrace?.mark("failed-snapshot-probe-start"),
      );
      const started = Date.now();
      try {
        await page.waitForFunction(
          (selector) =>
            document.querySelector(selector) === document.activeElement,
          upgrade(field),
          { timeout: 1000 },
        );
        focusState.eventualFocus = {
          observed: true,
          elapsedMs: Date.now() - started,
        };
      } catch (reason) {
        focusState.eventualFocus = {
          observed: false,
          elapsedMs: Date.now() - started,
          error: reason.name,
        };
      }
      await page.evaluate(() =>
        window.__qaUpgradeFocusTrace?.mark("failed-snapshot-probe-end"),
      );
      focusState.timeline = await page.evaluate(
        () => window.__qaUpgradeFocusTrace?.events,
      );
    }
    assert.equal(
      focusState.focused,
      true,
      `Progress save restores initiating control focus: ${JSON.stringify(focusState)}`,
    );
    return after;
  } finally {
    await page.evaluate(() => window.__qaUpgradeFocusTrace?.restore());
  }
}
async function exportCurrent(page) {
  const next = page.waitForEvent("download");
  await page.click("#export-current-profile");
  const download = await next;
  return JSON.parse(await readFile(await download.path(), "utf8"));
}
async function capture(page, path) {
  const dimensions = await page.evaluate(() => ({
    document: {
      width: Math.max(
        document.body.scrollWidth,
        document.documentElement.scrollWidth,
        document.body.offsetWidth,
        document.documentElement.offsetWidth,
        document.documentElement.clientWidth,
      ),
      height: Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight,
        document.body.offsetHeight,
        document.documentElement.offsetHeight,
        document.documentElement.clientHeight,
      ),
    },
    viewport: { width: innerWidth, height: innerHeight },
    scroll: { x: scrollX, y: scrollY },
    rootFontSize: getComputedStyle(document.documentElement).fontSize,
    devicePixelRatio,
  }));
  // Firefox rejects a single image dimension above32767. Clip the *same full
  // document* in bounded CSS-pixel tiles without changing viewport, text or DOM.
  const tileHeight = 8192,
    overlap = 256,
    tiles = [],
    paths = [];
  assert(dimensions.document.width <= 8192, "Screenshot width remains bounded");
  let y = 0;
  for (let index = 0; y < dimensions.document.height; index++) {
    const height = Math.min(tileHeight, dimensions.document.height - y);
    const imagePath =
      dimensions.document.height <= tileHeight
        ? path
        : path.replace(
            /\.png$/,
            `-tile${String(index + 1).padStart(2, "0")}.png`,
          );
    const clip = { x: 0, y, width: dimensions.document.width, height };
    const scrollBefore = await page.evaluate(() => ({
      x: scrollX,
      y: scrollY,
    }));
    await page.screenshot({
      path: imagePath,
      fullPage: true,
      clip,
      scale: "css",
    });
    const scrollAfter = await page.evaluate(() => ({ x: scrollX, y: scrollY }));
    tiles.push({ path: imagePath, clip, scrollBefore, scrollAfter });
    paths.push(imagePath);
    if (y + height === dimensions.document.height) break;
    y += height - overlap;
  }
  assert.equal(tiles[0].clip.y, 0);
  for (let i = 1; i < tiles.length; i++)
    assert(
      tiles[i].clip.y <= tiles[i - 1].clip.y + tiles[i - 1].clip.height,
      "No vertical evidence gap",
    );
  assert.equal(
    tiles.at(-1).clip.y + tiles.at(-1).clip.height,
    dimensions.document.height,
  );
  const after = await page.evaluate(() => ({
    width: innerWidth,
    height: innerHeight,
    rootFontSize: getComputedStyle(document.documentElement).fontSize,
  }));
  assert.deepEqual(
    after,
    { ...dimensions.viewport, rootFontSize: dimensions.rootFontSize },
    "Capture never changes viewport or text zoom",
  );
  await writeFile(
    path.replace(/\.png$/, "-capture.json"),
    JSON.stringify(
      {
        method: "full-document-clipped-css-pixel-tiles",
        ...dimensions,
        tileHeight,
        overlap,
        fullVerticalCoverage: true,
        tiles,
      },
      null,
      2,
    ),
  );
  return paths;
}

export async function runIndependentUpgradeJourneys({
  browser,
  base,
  captureScreenshots = true,
  prefix = browser.browserType().name(),
}) {
  await mkdir("test-results/upgrade023-independent", { recursive: true });
  const source = (() => {
    try {
      return execFileSync("git", ["rev-parse", "HEAD"], {
        encoding: "utf8",
      }).trim();
    } catch {
      return process.env.GITHUB_SHA || "unavailable";
    }
  })();
  const evidence = {
    owner: "verify_upgrade_player_journeys",
    source,
    node: process.version,
    platform: process.platform,
    browser: browser.version(),
    syntheticStateOnly: true,
    scenarios: [],
    screenshots: [],
  };
  let failure;
  try {
    await freshDefinitions();
    await draftAndProgress();
    await staleAndQuota();
    await failedProgressCandidates();
    await migrationAndRestore();
    await responsive();
  } catch (error) {
    failure = error;
    evidence.failure = { message: error.message, stack: error.stack };
    throw error;
  } finally {
    evidence.result = failure ? "FAIL" : "PASS";
    await writeFile(
      `test-results/upgrade023-independent/${prefix}-journeys.json`,
      JSON.stringify(evidence, null, 2),
    );
  }
  console.log(
    "Independent upgrade browser journeys passed",
    evidence.scenarios,
  );

  async function freshDefinitions() {
    const context = await browser.newContext();
    try {
      const page = await context.newPage();
      await page.goto(url(base, "progression"));
      await ready(page);
      const actual = await page.evaluate(async () => {
        const { state } = await import("/assets/src/client/common.mjs");
        const items = new Map(state.pack.items.map((i) => [i.id, i.name]));
        return {
          profile: structuredClone(state.profile),
          rows: state.pack.objectives
            .filter((o) => o.track === "dmz-upgrade")
            .map((o) => [
              o.name,
              o.upgrade.tierLabel,
              o.description,
              o.requirements.map((r) => [items.get(r.itemId), r.quantity]),
            ]),
          requirements: state.pack.objectives.flatMap((o) => o.requirements),
          sources: state.pack.sources,
        };
      });
      assert.deepEqual(
        actual.rows,
        expected,
        "All eight definitions and all31 exact sanitized requirement rows",
      );
      assert.equal(actual.requirements.length, 31);
      assert.equal(
        new Set(actual.rows.flatMap((r) => r[3].map((row) => row[0]))).size,
        22,
      );
      assert(
        actual.requirements.every((r) => r.consumption === "unknown"),
        "Observed consumption stays unknown",
      );
      assert.deepEqual(actual.profile.inventory, {});
      assert.deepEqual(actual.profile.reserves, {});
      assert.deepEqual(actual.profile.upgradeProgress, {});
      for (const [name, , description, rows] of expected) {
        const article = page
          .locator("#progress-rows article")
          .filter({ has: page.getByRole("heading", { name, exact: true }) });
        assert.equal(
          await article.count(),
          1,
          `One displayed definition for ${name}`,
        );
        const text = await article.textContent();
        assert(
          text.includes(description),
          `Exact observed effect shown for ${name}`,
        );
        for (const [item, quantity] of rows) {
          assert(text.includes(item), `${name}: displayed material ${item}`);
          const compact = text.replaceAll(",", "");
          assert(
            compact.includes(String(quantity)),
            `${name}: displayed required amount ${quantity}`,
          );
        }
      }
      assert.equal(
        await page.locator(upgrade("completion")).inputValue(),
        "unknown",
      );
      assert.equal(
        await page.locator(upgrade("availability")).inputValue(),
        "unknown",
      );
      await page.goto(url(base, "inventory"));
      await ready(page);
      assert.equal(await page.locator(stock).inputValue(), "");
      assert.match(
        (await page.locator(`[data-inventory-item="${ITEM}"]`).textContent()) +
          " " +
          ((await page.locator(stock).getAttribute("placeholder")) || ""),
        /Not entered/i,
      );
      evidence.scenarios.push(
        "Fresh observed pack:8 exact definitions/31 rows/22 labels, unknown mechanics/progress and empty holdings; requirements visibly rendered",
      );
    } finally {
      await context.close();
    }
  }

  async function draftAndProgress() {
    const context = await browser.newContext();
    try {
      const page = await context.newPage();
      await page.goto(url(base, "inventory"));
      await ready(page);
      const initial = await durable(page);
      await page.locator(stock).fill("0");
      const planner = page.locator('a[href*="/planner/"]').first();
      await planner.click();
      await page.locator("#draft-navigation").waitFor({ state: "visible" });
      await page.click("#draft-stay");
      assert.equal(await page.locator(stock).inputValue(), "0");
      assert.deepEqual(
        await durable(page),
        initial,
        "Explicit0 from absence is dirty, not silently committed",
      );
      await page.locator(reserve).fill("9");
      let saved = await saveInventory(page);
      assert(Object.hasOwn(saved.inventory, ITEM));
      assert.equal(saved.inventory[ITEM], 0);
      assert.equal(saved.reserves[ITEM], 9);
      await page.reload();
      await ready(page);
      assert.equal(await page.locator(stock).inputValue(), "0");
      await page.locator(`[data-clear-stock="${ITEM}"]`).focus();
      await page.keyboard.press("Enter");
      assert.equal(await page.locator(stock).inputValue(), "");
      await planner.click();
      await page.locator("#draft-navigation").waitFor({ state: "visible" });
      await page.keyboard.press("Escape");
      assert.equal(await page.locator(stock).inputValue(), "");
      assert.equal(await page.locator(reserve).inputValue(), "9");
      assert.equal((await durable(page)).value.inventory[ITEM], 0);
      saved = await saveInventory(page);
      assert(!Object.hasOwn(saved.inventory, ITEM));
      assert.equal(saved.reserves[ITEM], 9);
      await page.reload();
      await ready(page);
      assert.equal(await page.locator(stock).inputValue(), "");
      await page.locator(stock).fill("23");
      const committed = await durable(page),
        progressBefore = structuredClone((await active(page)).upgradeProgress);
      await page.locator(upgrade("completion")).selectOption("completed");
      assert.equal(
        await page.locator("#upgrade-progress-confirm:visible").count(),
        0,
        "Dirty stock must block progress-only confirmation",
      );
      assert.deepEqual(
        await durable(page),
        committed,
        "Progress action never saves unsaved inventory",
      );
      assert.deepEqual(
        (await active(page)).upgradeProgress,
        progressBefore,
        "Blocked action does not mutate progress candidate",
      );
      assert.equal(await page.locator(stock).inputValue(), "23");
      assert.match(
        (await page.locator("#error").textContent()) +
          " " +
          (await page.locator("#save-status").textContent()),
        /save|cancel|unsaved/i,
      );
      await saveInventory(page);
      await setProgress(page, "availability", "available", { double: true });
      assert.notEqual(
        (await active(page)).upgradeProgress[UPGRADE].completion,
        "completed",
      );
      await page.goto(url(base, "progression"));
      await ready(page);
      assert.equal(
        await page.locator(upgrade("availability")).inputValue(),
        "available",
      );
      assert.equal(
        await page.locator(upgrade("completion")).inputValue(),
        "unknown",
      );
      await setProgress(page, "completion", "completed", { cancel: true });
      const completed = await setProgress(page, "completion", "completed", {
        double: true,
      });
      assert.equal(completed.inventory[ITEM], 23);
      assert.equal(completed.reserves[ITEM], 9);
      await page.reload();
      await ready(page);
      assert.equal(
        await page.locator(upgrade("completion")).inputValue(),
        "completed",
      );
      const undone = await setProgress(page, "completion", "incomplete");
      assert.equal(undone.inventory[ITEM], 23);
      assert.equal(undone.reserves[ITEM], 9);
      await page.goto(url(base, "inventory"));
      await ready(page);
      assert.equal(
        await page.locator(upgrade("completion")).inputValue(),
        "incomplete",
      );
      assert.equal(
        await page.locator(upgrade("availability")).inputValue(),
        "available",
      );
      const backup = await exportCurrent(page);
      assert.deepEqual(backup, (await durable(page)).value);
      evidence.scenarios.push(
        "Absent→explicit0→clear/cancel/save/reload preserves key presence and reserve; unsaved inventory cannot hitchhike on progress; bidirectional availability/completion, Cancel/double click/reload/Undo preserve stock and focus",
      );
    } finally {
      await context.close();
    }
  }

  async function staleAndQuota() {
    const context = await browser.newContext();
    await context.addInitScript(() => {
      const put = IDBObjectStore.prototype.put;
      IDBObjectStore.prototype.put = function (...args) {
        if (window.failUpgradeQuota)
          throw new DOMException(
            "Synthetic upgrade quota",
            "QuotaExceededError",
          );
        return put.apply(this, args);
      };
    });
    try {
      const first = await context.newPage(),
        second = await context.newPage();
      await first.goto(url(base, "inventory"));
      await ready(first);
      await first.locator(stock).fill("6");
      await saveInventory(first);
      await second.goto(url(base, "inventory"));
      await ready(second);
      const stale = await active(second);
      await first.locator(stock).fill("7");
      await saveInventory(first);
      const current = await durable(first);
      await second.locator(stock).fill("99");
      await second
        .getByRole("button", { name: "Save inventory", exact: true })
        .click();
      await second.locator("#error:not([hidden])").waitFor();
      assert.match(await second.locator("#error").textContent(), /Another tab/);
      assert.deepEqual(await durable(second), current, "Stale save is atomic");
      assert.equal(
        (await active(second)).revision,
        stale.revision,
        "No automatic retry against latest revision",
      );
      assert.equal(await second.locator(stock).inputValue(), "99");
      assert.equal(
        (await exportCurrent(second)).inventory[ITEM],
        99,
        "Failed draft remains exportable",
      );
      await first.locator(stock).fill("31");
      await first.evaluate(() => {
        window.failUpgradeQuota = true;
      });
      await first
        .getByRole("button", { name: "Save inventory", exact: true })
        .click();
      await first.locator("#error:not([hidden])").waitFor();
      assert.deepEqual(
        await durable(first),
        current,
        "Quota failure preserves both durable and previous snapshot",
      );
      assert.equal(await first.locator(stock).inputValue(), "31");
      assert.equal((await exportCurrent(first)).inventory[ITEM], 31);
      evidence.scenarios.push(
        "Two-tab CAS and injected quota failures preserve durable+previous state, exact unsaved draft, export and old revision; no automatic retry",
      );
    } finally {
      await context.close();
    }
  }

  async function failedProgressCandidates() {
    for (const routeName of ["inventory", "progression"])
      for (const mode of ["quota", "cas"]) {
        const context = await browser.newContext();
        await context.addInitScript(() => {
          const put = IDBObjectStore.prototype.put;
          IDBObjectStore.prototype.put = function (...args) {
            if (window.failUpgradeCandidateQuota)
              throw new DOMException(
                "Synthetic progress candidate quota",
                "QuotaExceededError",
              );
            return put.apply(this, args);
          };
        });
        try {
          const page = await context.newPage();
          await page.goto(url(base, "inventory"));
          await ready(page);
          await page.locator(stock).fill("6");
          await saveInventory(page);
          await page.goto(url(base, routeName));
          await ready(page);
          const before = await active(page);
          if (mode === "cas") {
            const newer = await context.newPage();
            await newer.goto(url(base, "inventory"));
            await ready(newer);
            await newer.locator(stock).fill("7");
            await saveInventory(newer);
          } else
            await page.evaluate(() => {
              window.failUpgradeCandidateQuota = true;
            });
          const durableBefore = await durable(page);
          await page.locator(upgrade("completion")).selectOption("completed");
          await page.click("#upgrade-progress-apply");
          await page
            .locator("#upgrade-progress-export")
            .waitFor({ state: "visible" });
          assert.equal(
            await page.locator("#upgrade-progress-confirm").isVisible(),
            true,
            `${routeName}/${mode}: failed candidate remains reviewable`,
          );
          assert.match(
            await page.locator("#upgrade-progress-confirm").textContent(),
            /not saved|unsaved|could not save/i,
          );
          assert.deepEqual(
            await durable(page),
            durableBefore,
            `${routeName}/${mode}: failed save never changes durable or previous snapshot`,
          );
          assert.deepEqual(
            await active(page),
            before,
            `${routeName}/${mode}: committed view remains unchanged`,
          );
          const download = page.waitForEvent("download");
          await page.click("#upgrade-progress-export");
          const candidate = JSON.parse(
            await readFile(await (await download).path(), "utf8"),
          );
          assert.equal(
            candidate.upgradeProgress[UPGRADE].completion,
            "completed",
            `${routeName}/${mode}: requested candidate is exportable, not silently lost`,
          );
          assert.deepEqual(
            untouched(candidate),
            untouched(before),
            `${routeName}/${mode}: exported candidate remains progress-only`,
          );
          assert.equal(
            candidate.revision,
            before.revision,
            `${routeName}/${mode}: no automatic newer-revision retry`,
          );
          await page.click("#upgrade-progress-cancel");
          assert.deepEqual(await active(page), before);
          assert.deepEqual(await durable(page), durableBefore);
          assert.equal(
            await page.locator(upgrade("completion")).inputValue(),
            "unknown",
          );
        } finally {
          await context.close();
        }
      }
    evidence.scenarios.push(
      "Both inventory and progression completion failures (quota/CAS) retain explicit exportable progress-only candidate and committed view; Cancel discards only candidate, no newer-revision retry",
    );
  }

  async function migrationAndRestore() {
    const context = await browser.newContext();
    try {
      const page = await context.newPage();
      await page.goto(url(base, "settings"));
      await ready(page);
      const original = await page.evaluate(async () => {
        const { state } = await import("/assets/src/client/common.mjs");
        const { saveProfile } = await import("/assets/src/storage/store.mjs");
        const p = structuredClone(state.profile);
        p.schemaVersion = 1;
        delete p.upgradeProgress;
        delete p.watchPins;
        p.inventory["observed:power-regulator"] = 6;
        p.inventory["observed:cash"] = 0;
        p.reserves["observed:power-regulator"] = 9;
        const ids = state.pack.objectives.slice(0, 4).map((o) => o.id);
        for (const [i, value] of [
          "completed",
          "locked",
          "unknown",
          "unlocked",
        ].entries())
          p.completion[ids[i]] = value;
        p.completion["legacy:unresolved"] = "unlocked";
        return { value: await saveProfile(p, state.revision), ids };
      });
      await page.reload();
      await ready(page);
      assert.deepEqual(
        (await durable(page)).value,
        original.value,
        "Opening v1 never silently migrates stored bytes",
      );
      assert.equal(
        (await active(page)).schemaVersion,
        1,
        "Opening v1 is review-required, not silently normalized as completed",
      );
      assert.deepEqual(
        await exportCurrent(page),
        original.value,
        "Original v1 backup remains exportable",
      );
      await page.click("#migrate-upgrade-profile");
      await page.locator("#restore-preview").waitFor({ state: "visible" });
      assert.match(
        await page.locator("#restore-preview").textContent(),
        /review|ambig|unlocked/i,
      );
      await page.click("#cancel-restore");
      assert.deepEqual(
        (await durable(page)).value,
        original.value,
        "Cancelled migration changes nothing",
      );
      await page.click("#migrate-upgrade-profile");
      await page.click("#apply-restore");
      await waitSaved(page, original.value.revision);
      const migrated = await durable(page);
      assert.equal(migrated.value.schemaVersion, 2);
      assert.deepEqual(
        migrated.previous,
        original.value,
        "Migration retains exact recoverable v1 snapshot",
      );
      const mapping = [
        ["completed", "unknown", false],
        ["unknown", "locked", false],
        ["unknown", "unknown", false],
        ["unknown", "unknown", true],
      ];
      for (const [i, id] of original.ids.entries()) {
        const entry = migrated.value.upgradeProgress[id];
        assert.deepEqual(
          [entry.completion, entry.availability, entry.reviewRequired],
          mapping[i],
        );
        assert.equal(entry.legacyState, original.value.completion[id]);
        assert(
          !Object.hasOwn(migrated.value.completion, id),
          "Resolved upgrade leaves generic map",
        );
      }
      assert.equal(migrated.value.completion["legacy:unresolved"], "unlocked");
      assert.deepEqual(migrated.value.inventory, original.value.inventory);
      assert.deepEqual(migrated.value.reserves, original.value.reserves);
      const exported = await exportCurrent(page);
      assert.deepEqual(exported, migrated.value);
      // Public guidance must not silently reinterpret the original recovered v1.
      await page.click("#recover-profile");
      await page.locator("#restore-preview").waitFor({ state: "visible" });
      await page.click("#cancel-restore");
      assert.deepEqual(await durable(page), migrated);
      await page.click("#recover-profile");
      await page.click("#apply-restore");
      await waitSaved(page, migrated.value.revision);
      const recovered = (await durable(page)).value;
      assert.equal(
        recovered.schemaVersion,
        1,
        "Original v1 recovery is not silently remigrated",
      );
      const restoredOriginal = {
        ...recovered,
        revision: original.value.revision,
      };
      assert.deepEqual(restoredOriginal, original.value);
      // Import uses a real file-input boundary; wrong pack is never a migration shortcut.
      const invalid = {
        ...exported,
        packId: "official:mw4-dmz-starter",
        id: "official:mw4-dmz-starter",
      };
      const beforeBad = await durable(page);
      await page.setInputFiles("#import-profile", {
        name: "synthetic-cross-pack.json",
        mimeType: "application/json",
        buffer: Buffer.from(JSON.stringify(invalid)),
      });
      await page.locator("#error:not([hidden])").waitFor();
      assert.match(
        await page.locator("#error").textContent(),
        /different pack|cross.pack|belongs/i,
      );
      assert.deepEqual(
        await durable(page),
        beforeBad,
        "Cross-pack import rejected atomically",
      );
      await page.setInputFiles("#import-profile", {
        name: "synthetic-v2-roundtrip.json",
        mimeType: "application/json",
        buffer: Buffer.from(JSON.stringify(exported)),
      });
      await page.locator("#restore-preview").waitFor({ state: "visible" });
      await page.click("#apply-restore");
      await waitSaved(page, recovered.revision);
      const roundtrip = (await durable(page)).value;
      assert.deepEqual(
        { ...roundtrip, revision: exported.revision },
        exported,
        "Real backup/restore preserves complete v2 state and missing versus0",
      );
      evidence.scenarios.push(
        "Real v1 preview/cancel/commit mapping+original snapshot recovery; legacy ambiguity/unresolved references preserved; actual backup v2 restore and cross-pack rejection",
      );
    } finally {
      await context.close();
    }
  }

  async function responsive() {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      reducedMotion: "reduce",
    });
    try {
      const page = await context.newPage();
      for (const width of [320, 390])
        for (const route of ["inventory", "progression", "planner"]) {
          await page.setViewportSize({ width, height: 844 });
          await page.goto(url(base, route));
          await ready(page);
          for (const theme of ["dark", "light"]) {
            if (
              (await page.locator("html").getAttribute("data-theme")) !== theme
            )
              await page.click("#theme-toggle");
            for (const zoom of [100, 200]) {
              await page.evaluate((zoom) => {
                document.documentElement.style.fontSize = `${zoom}%`;
              }, zoom);
              assert.equal(
                await page
                  .locator("html")
                  .evaluate((n) => parseFloat(getComputedStyle(n).fontSize)),
                zoom === 200 ? 32 : 16,
                "200% actually doubles root text",
              );
              assert(
                await page.evaluate(
                  () => document.documentElement.scrollWidth <= innerWidth + 1,
                ),
                `${route}/${width}/${theme}/${zoom}: no page overflow`,
              );
              const controls = await page
                .locator(
                  "main input:visible, main select:visible, main button:visible",
                )
                .evaluateAll((nodes) =>
                  nodes.map((n) => {
                    const r = n.getBoundingClientRect();
                    return {
                      tag: n.tagName,
                      id: n.id,
                      left: r.left,
                      right: r.right,
                      width: r.width,
                      client: n.clientWidth,
                      scroll: n.scrollWidth,
                    };
                  }),
                );
              for (const c of controls)
                assert(
                  c.width > 0 && c.left >= -1 && c.right <= width + 1,
                  `${route}/${width}/${zoom}: control in viewport ${JSON.stringify(c)}`,
                );
              if (
                captureScreenshots &&
                ((theme === "dark" && zoom === 100) ||
                  (theme === "light" && zoom === 200))
              )
                evidence.screenshots.push(
                  ...(await capture(
                    page,
                    `test-results/upgrade023-independent/${prefix}-${route}-${width}-${theme}-${zoom}.png`,
                  )),
                );
            }
          }
        }
      await page.goto(url(base, "progression"));
      await ready(page);
      const control = page.locator(upgrade("completion"));
      await control.focus();
      assert.equal(
        await control.evaluate((n) => n === document.activeElement),
        true,
      );
      const style = await control.evaluate((n) => {
        const s = getComputedStyle(n);
        return {
          outline: s.outlineStyle,
          width: parseFloat(s.outlineWidth),
          shadow: s.boxShadow,
        };
      });
      assert(
        (style.outline !== "none" && style.width > 0) ||
          style.shadow !== "none",
        "Keyboard focus has visible styling",
      );
      evidence.scenarios.push(
        "320/390px, dark/light, actual200% text and reduced motion: controls in viewport and no overflow; focus styling; synthetic/fresh screenshots captured for independent pixel review",
      );
    } finally {
      await context.close();
    }
  }
}
