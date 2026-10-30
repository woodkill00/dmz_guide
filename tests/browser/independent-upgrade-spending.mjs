// Independent reviewer-owned purchase/spending UI acceptance.
// Every quantity, identity and mechanic in the fixture is fictional QA data.
import assert from "node:assert/strict";
import { installPickerFocusDiagnostics } from "./picker-focus-diagnostics.mjs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";

const PACK = "qa023:spending";
const A = "qa023:part-a",
  B = "qa023:part-b",
  CASH = "qa023:cash";
const TOOL = "qa023:tool",
  OTHER = "qa023:other-cash",
  RESOURCE = "qa023:resource";
const FIRST = "qa023:purchase-first",
  SECOND = "qa023:purchase-second";
const MIXED = "qa023:purchase-mixed",
  UNKNOWN = "qa023:purchase-unknown";
const HIDDEN = "qa023:purchase-hidden-cost",
  SECRET = "qa023:secret-item";
const ALIAS = "qa023:purchase-alias";
const purchaseInitiators = new WeakMap();
const pathFor = (base, page) =>
  `${base}/${page}/?pack=${encodeURIComponent(PACK)}`;
const spend = (id) => `[data-upgrade-spend="${id}"]`;
const reverse = (id) => `[data-upgrade-reverse="${id}"]`;
const progress = (id) =>
  `[data-upgrade-id="${id}"][data-upgrade-field="completion"]`;
const owned = (id) => `[data-field="inventory"][data-id="${id}"]`;
const reserved = (id) => `[data-field="reserves"][data-id="${id}"]`;

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
async function durable(page, packId = PACK) {
  return page.evaluate(
    async (id) =>
      (await import("/assets/src/storage/store.mjs")).loadProfile(id),
    packId,
  );
}
async function saved(page, revision, packId = PACK) {
  await page.waitForFunction(
    async ({ id, revision }) =>
      (await (await import("/assets/src/storage/store.mjs")).loadProfile(id))
        ?.value?.revision > revision,
    { id: packId, revision },
  );
  await page.waitForFunction(
    () =>
      !document.querySelector("#pack-select")?.disabled &&
      document.querySelector("main")?.getAttribute("aria-busy") !== "true",
  );
}
async function downloadJSON(page, selector) {
  const pending = page.waitForEvent("download");
  await page.click(selector);
  return JSON.parse(await readFile(await (await pending).path(), "utf8"));
}
function numberText(value) {
  const text = value.trim().replaceAll(",", "");
  assert.match(
    text,
    /^\d+$/,
    `A numeric metric must contain only its explicit quantity: ${text}`,
  );
  return Number(text);
}
async function metric(page, name) {
  return numberText(
    await page.locator(`[data-spend-metric="materials-${name}"]`).textContent(),
  );
}
async function breakdown(page, id, kind, expected) {
  const row = page.locator(`[data-spend-${kind}="${id}"]`);
  assert.equal(await row.count(), 1, `One ${kind} breakdown for ${id}`);
  for (const [name, value] of Object.entries(expected))
    assert.equal(
      numberText(
        await row.locator(`[data-spend-amount="${name}"]`).textContent(),
      ),
      value,
      `${id} ${name}`,
    );
}
async function totals(page, { net, gross, reversed, cash }) {
  assert.equal(await metric(page, "net"), net);
  assert.equal(await metric(page, "gross"), gross);
  assert.equal(await metric(page, "reversed"), reversed);
  if (cash) await breakdown(page, CASH, "currency", cash);
  assert.match(
    await page.locator("#upgrade-spending-summary").textContent(),
    /recorded/i,
  );
}
async function focusIs(page, selector) {
  // Native dialog cleanup may post one cancellable restoration task. Observe
  // its exact completion target; do not mistake a closed DOM for completed focus.
  let failure;
  try {
    await page.waitForFunction(
      (selector) => document.querySelector(selector) === document.activeElement,
      selector,
      { timeout: 2000 },
    );
  } catch (error) {
    failure = error.message;
  }
  const result = await page.locator(selector).evaluate((n) => ({
    focused: n === document.activeElement,
    connected: n.isConnected,
    disabled: n.disabled,
    active: document.activeElement
      ? {
          tag: document.activeElement.tagName,
          id: document.activeElement.id,
          dataset: { ...document.activeElement.dataset },
        }
      : null,
    dialogs: [...document.querySelectorAll("dialog")].map((n) => ({
      id: n.id,
      open: n.open,
    })),
  }));
  assert.equal(
    failure,
    undefined,
    `Exact focus endpoint did not arrive within 2000ms: ${JSON.stringify({ selector, ...result, failure })}`,
  );
  assert.equal(
    result.focused,
    true,
    `Spending modal returns focus: ${JSON.stringify(result)}`,
  );
}
async function previewEntry(page) {
  await page.locator("#upgrade-spend-confirm").waitFor({ state: "visible" });
  await focusIs(page, "#upgrade-spend-title");
  const entry = await page
    .locator("#upgrade-spend-confirm")
    .evaluate((dialog) => {
      const box = dialog.getBoundingClientRect(),
        title = dialog
          .querySelector("#upgrade-spend-title")
          .getBoundingClientRect();
      const purposeNode = dialog.querySelector("#upgrade-spend-purpose"),
        purpose = purposeNode.getBoundingClientRect();
      return {
        scrollTop: dialog.scrollTop,
        top: box.top + dialog.clientTop,
        bottom: box.top + dialog.clientTop + dialog.clientHeight,
        title: { top: title.top, bottom: title.bottom },
        purpose: {
          top: purpose.top,
          height: purpose.height,
          lineHeight: parseFloat(getComputedStyle(purposeNode).lineHeight),
        },
      };
    });
  assert.equal(
    entry.scrollTop,
    0,
    "A long purchase/reversal preview opens at its beginning, not at footer confirmation",
  );
  assert(
    entry.title.top >= entry.top - 1 && entry.title.bottom <= entry.bottom + 1,
    `Preview heading is fully visible at entry: ${JSON.stringify(entry)}`,
  );
  assert(
    entry.purpose.top >= entry.top - 1 &&
      entry.purpose.top +
        Math.min(entry.purpose.height, entry.purpose.lineHeight) <=
        entry.bottom + 1,
    `Preview purpose begins visibly before any scrolling at entry: ${JSON.stringify(entry)}`,
  );
}
async function openPurchase(page, id = FIRST) {
  await page.locator(spend(id)).focus();
  await page.keyboard.press("Enter");
  await previewEntry(page);
  assert.equal(
    await page.locator("#upgrade-spend-ack").isChecked(),
    false,
    "Pre-purchase stock acknowledgement is never prechecked",
  );
  assert.match(
    await page.locator("#upgrade-spend-confirm").textContent(),
    /before this purchase.*not already been deducted/is,
  );
  purchaseInitiators.set(page, spend(id));
}
async function cancelPurchase(page) {
  const target = purchaseInitiators.get(page);
  assert(target, "Cancelled preview has an exact recorded initiating control");
  await page.click("#upgrade-spend-cancel");
  await page.locator("#upgrade-spend-confirm").waitFor({ state: "hidden" });
  await focusIs(page, target);
}
async function apply(
  page,
  { purchase = true, double = false, packId = PACK } = {},
) {
  const before = await active(page);
  if (purchase) await page.locator("#upgrade-spend-ack").check();
  if (double) {
    const pending = await page
      .locator("#upgrade-spend-apply")
      .evaluate((button) => {
        button.click();
        const dialog = document.querySelector("#upgrade-spend-confirm");
        const state = {
          apply: button.disabled,
          cancel: document.querySelector("#upgrade-spend-cancel").disabled,
        };
        button.click();
        document.querySelector("#upgrade-spend-cancel").click();
        const cancellation = new Event("cancel", { cancelable: true });
        dialog.dispatchEvent(cancellation);
        return {
          ...state,
          open: dialog.open,
          prevented: cancellation.defaultPrevented,
        };
      });
    assert.deepEqual(
      pending,
      { apply: true, cancel: true, open: true, prevented: true },
      "Pending save blocks double Apply, misleading Cancel and Escape cancellation",
    );
  } else {
    await page.locator("#upgrade-spend-apply").focus();
    await page.keyboard.press("Enter");
  }
  await saved(page, before.revision, packId);
  await page.locator("#upgrade-spend-confirm").waitFor({ state: "hidden" });
  const after = (await durable(page, packId)).value;
  assert.equal(
    after.revision,
    before.revision + 1,
    "Exactly one successful atomic revision",
  );
  const target = purchase
    ? purchaseInitiators.get(page)
    : "#upgrade-spending-title";
  assert(target, "Successful transition has an exact recorded focus endpoint");
  await focusIs(page, target);
  return after;
}
async function saveInventory(page, packId = PACK) {
  const before = await active(page);
  await page
    .getByRole("button", { name: "Save inventory", exact: true })
    .click();
  await saved(page, before.revision, packId);
}
async function correct(page, id, completion) {
  const before = await active(page);
  await page.locator(progress(id)).selectOption(completion);
  await page.click("#upgrade-progress-apply");
  await saved(page, before.revision);
  await page.locator("#upgrade-progress-confirm").waitFor({ state: "hidden" });
  // Completion includes native-close focus restoration, not just hidden DOM.
  // Observe that documented endpoint before the next synthetic focus/Enter.
  await focusIs(page, progress(id));
  const after = await active(page);
  assert.deepEqual(
    after.inventory,
    before.inventory,
    "Historical status correction does not spend/refund",
  );
  assert.deepEqual(
    after.spendHistory,
    before.spendHistory,
    "Historical correction does not invent or erase spending",
  );
}
async function refused(page, selector, explanation, packId = PACK) {
  const before = await durable(page, packId);
  const control = page.locator(selector);
  if ((await control.count()) && (await control.isEnabled())) {
    await control.click();
    await page.locator("#error:not([hidden])").waitFor();
    assert.match(await page.locator("#error").textContent(), explanation);
  }
  assert.equal(
    await page.locator("#upgrade-spend-confirm[open]").count(),
    0,
    "Blocked transition cannot expose an actionable purchase/reversal preview",
  );
  assert.deepEqual(
    await durable(page, packId),
    before,
    "Refusal preserves committed and previous snapshots",
  );
}
async function seed(page, base, { legacyVersion = 3, many = false } = {}) {
  await page.goto(
    `${base}/progression/?pack=observed%3Aupgrade-review-20261026`,
  );
  await ready(page);
  await page.evaluate(
    async (ids) => {
      const { state } = await import("/assets/src/client/common.mjs");
      const { newProfile } = await import("/assets/src/domain/profile.mjs");
      const { validatePack } = await import("/assets/src/content/validate.mjs");
      const { commitRecord, saveProfile } = await import(
        "/assets/src/storage/store.mjs"
      );
      const p = structuredClone(state.pack),
        item = structuredClone(p.items.find((x) => x.unit === "count")),
        objective = structuredClone(p.objectives[0]);
      p.id = ids.PACK;
      p.title = "FICTIONAL purchase and spending QA";
      p.description =
        "Synthetic quantities and mechanics, not player holdings or gameplay evidence.";
      p.contentVersion = "spending.synthetic.1";
      p.game = {
        id: "qa023-fictional",
        mode: "dmz",
        build: "synthetic-spending",
      };
      p.coverage = {
        expectedTotal: null,
        note: "Fictional browser test scope only.",
      };
      const source = structuredClone(p.sources[0]);
      source.id = "source:qa023-spending";
      source.title = "FICTIONAL spending mechanics";
      source.type = "original-fixture";
      source.url = "https://example.com/fictional-spending";
      source.supports = "Synthetic test quantities only.";
      source.provenance = {
        kind: "web",
        observationKey: "qa023-spending",
        lineageKey: "qa023-spending",
        captureDate: null,
        buildStatus: "known",
      };
      p.sources = [source];
      const material = (id, name, kind = "item", unit = "count") => {
        const r = {
          ...structuredClone(item),
          id,
          name,
          kind,
          unit,
          aliases: [],
          sourceIds: [source.id],
          status: "fictional",
          description: "Fictional test material",
        };
        delete r.scope;
        return r;
      };
      p.items = [
        material(ids.A, "Fictional part A"),
        material(ids.B, "Fictional part B"),
        material(ids.CASH, "Fictional cash", "currency", "dmz-cash"),
        material(ids.TOOL, "Fictional retained tool"),
        material(ids.OTHER, "Fictional alternate cash", "currency", "dmz-cash"),
        material(
          ids.RESOURCE,
          "Fictional resource units",
          "resource",
          "resource-unit",
        ),
        material(ids.SECRET, "Hidden spending vault core", "item", "count"),
      ];
      const cost = (itemId, quantity, consumption = "consumed") => ({
        itemId,
        quantity,
        consumption,
        status: "fictional",
        sourceIds: [source.id],
      });
      const upgrade = (id, name, costs) => {
        const o = {
          ...structuredClone(objective),
          id,
          name,
          description: "Fictional upgrade for browser tests",
          sourceIds: [source.id],
          status: "fictional",
          prerequisites: [],
          effects: [],
          requirementsKnown: true,
          oneTime: true,
          spoiler: false,
          requirements: costs,
          upgrade: {
            tierLabel: null,
            prerequisiteStatus: "known",
            observationKeys: [id.replace(":", "-")],
          },
        };
        delete o.scope;
        return o;
      };
      p.objectives = [
        upgrade(ids.FIRST, "Fictional first upgrade", [
          cost(ids.A, 3),
          cost(ids.B, 2),
          cost(ids.CASH, 100),
          cost(ids.TOOL, 1, "retained"),
        ]),
        upgrade(ids.SECOND, "Fictional second upgrade", [
          cost(ids.A, 4),
          cost(ids.CASH, 40),
        ]),
        upgrade(ids.MIXED, "Fictional mixed units upgrade", [
          cost(ids.A, 1),
          cost(ids.OTHER, 7),
          cost(ids.RESOURCE, 2),
        ]),
        upgrade(ids.UNKNOWN, "Fictional unknown consumption", [
          cost(ids.A, 1, "unknown"),
        ]),
        upgrade(ids.HIDDEN, "Visible upgrade with a protected requirement", [
          cost(ids.SECRET, 747),
        ]),
      ];
      const secret = upgrade("qa023:secret", "Hidden spending vault", [
        cost(ids.SECRET, 1),
      ]);
      secret.spoiler = true;
      secret.description =
        "Fictional private spoiler sentinel for spending tests";
      p.objectives.push(secret);
      const alias = structuredClone(p.objectives[0]);
      alias.id = ids.ALIAS;
      alias.name = "Fictional equivalent upgrade observation";
      p.objectives.push(alias);
      for (const group of [
        "recipes",
        "guides",
        "maps",
        "locations",
        "claims",
        "assets",
      ])
        p[group] = [];
      if (ids.many) {
        p.items = [];
        p.objectives = [];
        for (let i = 0; i < 61; i++) {
          const id = `qa023:paged-item-${i}`;
          p.items.push(
            material(
              id,
              `Fictional paged material ${String(i).padStart(2, "0")}`,
            ),
          );
          p.objectives.push(
            upgrade(
              `qa023:paged-upgrade-${i}`,
              `Fictional paged upgrade ${String(i).padStart(2, "0")}`,
              [cost(id, 1)],
            ),
          );
        }
      }
      validatePack(
        p,
        await (await fetch("/assets/schemas/pack.schema.json")).json(),
      );
      await commitRecord("content", p.id, { pack: p, revision: 0 }, 0);
      let f = newProfile(p);
      if (ids.many) {
        const { recordUpgradePurchase } = await import(
          "/assets/src/domain/upgrade-spending.mjs"
        );
        for (const i of p.items) f.inventory[i.id] = 100;
        for (const [i, o] of p.objectives.entries())
          f = recordUpgradePurchase(p, f, o.id, {
            operationId: `spend:qa-page-${i}`,
            recordedAt: new Date(Date.UTC(2026, 9, 26, 0, 0, i)).toISOString(),
            expectedRevision: f.revision,
          }).candidate;
      } else {
        f.inventory = {
          [ids.A]: 10,
          [ids.B]: 6,
          [ids.CASH]: 500,
          [ids.TOOL]: 1,
          [ids.OTHER]: 20,
          [ids.RESOURCE]: 8,
          [ids.SECRET]: 1000,
        };
        f.reserves = { [ids.A]: 2, [ids.B]: 1, [ids.CASH]: 50 };
        f.goals = [{ id: ids.SECOND, quantity: 1 }];
        f.watchPins = [ids.A];
        f.upgradeProgress[ids.SECOND] = {
          completion: "incomplete",
          availability: "available",
          reviewRequired: false,
        };
      }
      if (ids.legacyVersion === 2) {
        f.schemaVersion = 2;
        delete f.spendHistory;
        f.upgradeProgress[ids.FIRST] = {
          completion: "completed",
          availability: "unknown",
          reviewRequired: false,
        };
      }
      await saveProfile(f, 0);
    },
    {
      PACK,
      A,
      B,
      CASH,
      TOOL,
      OTHER,
      RESOURCE,
      FIRST,
      SECOND,
      MIXED,
      UNKNOWN,
      HIDDEN,
      SECRET,
      ALIAS,
      legacyVersion,
      many,
    },
  );
  await page.goto(pathFor(base, "progression"));
  await ready(page);
  return await active(page);
}

export async function runIndependentUpgradeSpending({
  browser,
  base,
  captureScreenshots = true,
  focusedCancellationOnly = false,
  prefix = browser.browserType().name(),
}) {
  assert.equal(typeof focusedCancellationOnly, "boolean");
  await mkdir("test-results/upgrade023-spending", { recursive: true });
  const evidence = {
    owner: "verify_upgrade_player_journeys",
    source: execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim(),
    node: process.version,
    platform: process.platform,
    browser: browser.version(),
    syntheticStateOnly: true,
    mode: focusedCancellationOnly ? "focused-cancellation" : "full-suite",
    requestedCancellationContexts: focusedCancellationOnly ? 20 : 5,
    scenarios: [],
    screenshots: [],
  };
  let failure;
  try {
    if (focusedCancellationOnly) {
      // Each exact existing scenario owns a fresh context. Failures propagate
      // immediately: this loop is coverage, never a retry-until-pass policy.
      for (let attempt = 1; attempt <= 20; attempt++)
        await cancelledNavigation(attempt);
    } else {
      for (const surface of ["progression", "inventory"])
        await transactionJourney(surface);
      for (const surface of ["progression", "inventory"])
        for (const mode of ["quota", "cas"])
          await failedPurchase(surface, mode);
      await inventoryGuards();
      for (const surface of ["progression", "inventory"])
        await failedNavigation(surface);
      for (let attempt = 1; attempt <= 5; attempt++)
        await cancelledNavigation(attempt);
      await observedCurrencyBoundary();
      await migrationAndSnapshots();
      await protectedMigration();
      await privateDisplayAndPaging();
      await responsive();
    }
  } catch (error) {
    failure = error;
    evidence.failure = { message: error.message, stack: error.stack };
    throw error;
  } finally {
    evidence.result = failure ? "FAIL" : "PASS";
    await writeFile(
      `test-results/upgrade023-spending/${prefix}-spending.json`,
      JSON.stringify(evidence, null, 2),
    );
  }
  console.log(
    "Independent upgrade spending browser journeys passed",
    evidence.scenarios,
  );

  async function transactionJourney(surface) {
    const context = await browser.newContext();
    try {
      const page = await context.newPage(),
        initial = await seed(page, base);
      await page.goto(pathFor(base, surface));
      await ready(page);
      await totals(page, { net: 0, gross: 0, reversed: 0 });
      await openPurchase(page);
      assert.deepEqual(await active(page), initial);
      const preview = await page
        .locator("#upgrade-spend-details")
        .textContent();
      for (const label of [
        "Fictional part A",
        "Fictional part B",
        "Fictional cash",
        "Fictional retained tool",
      ])
        assert(preview.includes(label));
      assert.match(preview, /reserve/i);
      assert.match(preview, /retain/i);
      await page.locator("#upgrade-spend-cancel").focus();
      await page.keyboard.press("Enter");
      await page.locator("#upgrade-spend-confirm").waitFor({ state: "hidden" });
      assert.deepEqual(await active(page), initial);
      await focusIs(page, spend(FIRST));
      await openPurchase(page);
      await page.keyboard.press("Escape");
      await page.locator("#upgrade-spend-confirm").waitFor({ state: "hidden" });
      assert.deepEqual(await active(page), initial);
      await focusIs(page, spend(FIRST));
      await openPurchase(page);
      const first = await apply(page, { double: true });
      assert.equal(first.spendHistory.length, 1);
      const event = first.spendHistory[0];
      assert.equal(event.kind, "purchase");
      assert.equal(event.upgradeId, FIRST);
      assert.equal(event.beforeProgress, null);
      assert.equal(first.upgradeProgress[FIRST].completion, "completed");
      assert.deepEqual(event.afterProgress, first.upgradeProgress[FIRST]);
      assert.deepEqual(
        event.costs.map(
          ({ itemId, consumed, retained, before, after, reserve }) => ({
            itemId,
            consumed,
            retained,
            before,
            after,
            reserve,
          }),
        ),
        [
          {
            itemId: CASH,
            consumed: 100,
            retained: 0,
            before: 500,
            after: 400,
            reserve: 50,
          },
          {
            itemId: A,
            consumed: 3,
            retained: 0,
            before: 10,
            after: 7,
            reserve: 2,
          },
          {
            itemId: B,
            consumed: 2,
            retained: 0,
            before: 6,
            after: 4,
            reserve: 1,
          },
          {
            itemId: TOOL,
            consumed: 0,
            retained: 1,
            before: 1,
            after: 1,
            reserve: 0,
          },
        ].sort((a, b) => a.itemId.localeCompare(b.itemId)),
      );
      assert.deepEqual(first.inventory, {
        ...initial.inventory,
        [A]: 7,
        [B]: 4,
        [CASH]: 400,
      });
      for (const key of [
        "reserves",
        "goals",
        "watchPins",
        "routes",
        "completion",
      ])
        assert.deepEqual(first[key], initial[key]);
      await focusIs(page, spend(FIRST));
      await totals(page, {
        net: 5,
        gross: 5,
        reversed: 0,
        cash: { net: 100, gross: 100, reversed: 0 },
      });
      await breakdown(page, A, "item", { net: 3, gross: 3, reversed: 0 });
      await breakdown(page, B, "item", { net: 2, gross: 2, reversed: 0 });
      await page.reload();
      await ready(page);
      assert.deepEqual(await active(page), first);
      await refused(page, spend(FIRST), /completed|already|recorded|purchase/i);
      await correct(page, FIRST, "incomplete");
      await refused(page, spend(FIRST), /already|recorded|purchase/i);
      await refused(
        page,
        spend(ALIAS),
        /already|recorded|purchase|equivalent/i,
      );
      await refused(
        page,
        reverse(event.id),
        /progress|changed|match|reconcil/i,
      );
      await correct(page, FIRST, "completed");
      await openPurchase(page, SECOND);
      const second = await apply(page);
      const secondId = second.spendHistory[1].id;
      assert.deepEqual(second.inventory, {
        ...first.inventory,
        [A]: 3,
        [CASH]: 360,
      });
      await totals(page, {
        net: 9,
        gross: 9,
        reversed: 0,
        cash: { net: 140, gross: 140, reversed: 0 },
      });
      await refused(page, reverse(event.id), /latest|recent|last/i);
      await page.click(reverse(secondId));
      await previewEntry(page);
      assert.match(
        await page.locator("#upgrade-spend-confirm").textContent(),
        /not.*game.*refund|bookkeeping|guide.*correction/i,
      );
      const reversedSecond = await apply(page, {
        purchase: false,
        double: true,
      });
      await focusIs(page, "#upgrade-spending-title");
      assert.deepEqual(reversedSecond.inventory, first.inventory);
      assert.deepEqual(
        reversedSecond.upgradeProgress[SECOND],
        initial.upgradeProgress[SECOND],
      );
      assert.deepEqual(
        reversedSecond.spendHistory.slice(0, 2),
        second.spendHistory,
      );
      assert.equal(reversedSecond.spendHistory[2].purchaseId, secondId);
      await totals(page, {
        net: 5,
        gross: 9,
        reversed: 4,
        cash: { net: 100, gross: 140, reversed: 40 },
      });
      await refused(page, reverse(secondId), /already|reversed|latest/i);
      await page.click(reverse(event.id));
      await previewEntry(page);
      const reversedFirst = await apply(page, { purchase: false });
      await focusIs(page, "#upgrade-spending-title");
      assert.deepEqual(reversedFirst.inventory, initial.inventory);
      assert.equal(
        Object.hasOwn(reversedFirst.upgradeProgress, FIRST),
        false,
        "Safe undo restores genuine prior absence",
      );
      assert.equal(reversedFirst.spendHistory.length, 4);
      await totals(page, {
        net: 0,
        gross: 9,
        reversed: 9,
        cash: { net: 0, gross: 140, reversed: 140 },
      });
      await refused(page, reverse(event.id), /already|reversed|latest/i);
      await openPurchase(page);
      await cancelPurchase(page);
      assert.deepEqual(
        await active(page),
        reversedFirst,
        "Reversed purchase needs a fresh explicit confirmation, not automatic re-debit",
      );
      evidence.scenarios.push(
        `${surface}: preview/Cancel/Escape, one atomic debit+completion+snapshot, double activation, reload, status correction guard, two purchases and LIFO reversals reconcile exact stock/material/cash totals`,
      );
    } finally {
      await context.close();
    }
  }

  async function failedPurchase(surface, mode) {
    const context = await browser.newContext();
    await context.addInitScript(() => {
      const put = IDBObjectStore.prototype.put;
      IDBObjectStore.prototype.put = function (...args) {
        if (window.failSpendingQuota)
          throw new DOMException(
            "Synthetic spending quota",
            "QuotaExceededError",
          );
        return put.apply(this, args);
      };
    });
    try {
      const page = await context.newPage();
      await seed(page, base);
      await page.goto(pathFor(base, surface));
      await ready(page);
      const before = await active(page);
      await openPurchase(page);
      await page.locator("#upgrade-spend-ack").check();
      if (mode === "cas") {
        const other = await context.newPage();
        await other.goto(pathFor(base, "inventory"));
        await ready(other);
        await other.locator(owned(A)).fill("11");
        await saveInventory(other);
      } else
        await page.evaluate(() => {
          window.failSpendingQuota = true;
        });
      const storedBefore = await durable(page);
      await page.click("#upgrade-spend-apply");
      await page.locator("#upgrade-spend-export").waitFor({ state: "visible" });
      assert.deepEqual(await active(page), before);
      assert.deepEqual(await durable(page), storedBefore);
      const candidate = await downloadJSON(page, "#upgrade-spend-export");
      assert.equal(candidate.revision, before.revision);
      assert.equal(candidate.spendHistory.length, 1);
      assert.equal(candidate.inventory[A], 7);
      assert.equal(candidate.inventory[B], 4);
      assert.equal(candidate.inventory[CASH], 400);
      assert.equal(candidate.upgradeProgress[FIRST].completion, "completed");
      assert.deepEqual(
        await downloadJSON(page, "#upgrade-spend-export"),
        candidate,
        "Failure export preserves stable operation ID and snapshot",
      );
      if (mode === "quota") {
        await page.evaluate(() => {
          window.failSpendingQuota = false;
        });
        const after = await apply(page);
        assert.deepEqual(
          after.spendHistory,
          candidate.spendHistory,
          "Explicit quota retry commits the same operation exactly once",
        );
        assert.deepEqual(after.inventory, candidate.inventory);
      } else {
        await page.click("#upgrade-spend-apply");
        await page.waitForFunction(
          async () =>
            !(await import("/assets/src/client/common.mjs")).state.saving,
        );
        await page
          .locator("#upgrade-spend-export")
          .waitFor({ state: "visible" });
        assert.deepEqual(
          await durable(page),
          storedBefore,
          "Explicit stale retry never rebases silently",
        );
        await cancelPurchase(page);
        await page.reload();
        await ready(page);
        await openPurchase(page);
        const after = await apply(page);
        assert.equal(after.inventory[A], 8);
        assert.equal(after.spendHistory.length, 1);
        assert.notEqual(
          after.spendHistory[0].id,
          candidate.spendHistory[0].id,
          "New explicit preview gets new identity after reconciliation",
        );
      }
      await page.reload();
      await ready(page);
      assert.equal((await active(page)).spendHistory.length, 1);
      await refused(page, spend(FIRST), /already|completed|recorded/i);
      evidence.scenarios.push(
        `${surface}/${mode}: no partial committed/previous mutation; stable failed candidate export; explicit retry semantics and reload prevent double debit`,
      );
    } finally {
      await context.close();
    }
  }

  async function inventoryGuards() {
    const context = await browser.newContext();
    try {
      const page = await context.newPage(),
        initial = await seed(page, base);
      await page.goto(pathFor(base, "inventory"));
      await ready(page);
      const initialDurable = await durable(page);
      await page.locator(owned(A)).fill("77");
      await refused(page, spend(FIRST), /save|cancel|unsaved/i);
      assert.equal(await page.locator(owned(A)).inputValue(), "77");
      assert.deepEqual(
        await active(page),
        { ...initial, inventory: { ...initial.inventory, [A]: 77 } },
        "Blocked purchase preserves the active unsaved stock draft without any other change",
      );
      assert.deepEqual(
        await durable(page),
        initialDurable,
        "Purchase never hitchhikes the unsaved draft into committed or previous storage",
      );
      await page.click("#cancel-inventory");
      await page.waitForFunction(
        (selector) => document.querySelector(selector)?.value === "10",
        owned(A),
      );
      assert.equal(await page.locator(owned(A)).inputValue(), "10");
      assert.deepEqual(
        await active(page),
        initial,
        "Explicit draft Cancel restores the initial active state",
      );
      assert.deepEqual(await durable(page), initialDurable);
      await page.click(`[data-clear-stock="${B}"]`);
      await saveInventory(page);
      assert.equal(Object.hasOwn((await active(page)).inventory, B), false);
      await refused(page, spend(FIRST), /not entered|missing|enter.*stock/i);
      await page.locator(owned(B)).fill("0");
      await saveInventory(page);
      assert.equal((await active(page)).inventory[B], 0);
      await refused(
        page,
        spend(FIRST),
        /insufficient|not enough|stock|reserve/i,
      );
      await page.locator(owned(B)).fill("2");
      await saveInventory(page);
      await refused(page, spend(FIRST), /reserve|insufficient|stock/i);
      await page.locator(owned(B)).fill("6");
      await page.locator(owned(TOOL)).fill("0");
      await saveInventory(page);
      await refused(page, spend(FIRST), /retain|insufficient|stock/i);
      await page.locator(owned(TOOL)).fill("1");
      await saveInventory(page);
      await refused(page, spend(UNKNOWN), /unknown|consumption|confirmed/i);
      await refused(page, spend(HIDDEN), /spoiler|reveal|protected/i);
      const hiddenError = await page.locator("#error").textContent();
      assert(
        !hiddenError.includes("Hidden spending vault core") &&
          !hiddenError.includes("747"),
        "Hidden requirement refusal exposes no secret name or amount",
      );
      await page.locator(reserved(A)).fill("4");
      await saveInventory(page);
      await openPurchase(page);
      const bought = await apply(page);
      await refused(page, spend(SECOND), /reserve|insufficient|stock/i);
      await page.locator(reserved(A)).fill("3");
      await saveInventory(page);
      await openPurchase(page, SECOND);
      await cancelPurchase(page);
      await page.locator(owned(A)).fill("8");
      await saveInventory(page);
      await refused(
        page,
        reverse(bought.spendHistory[0].id),
        /changed|stock|match|reconcil/i,
      );
      await page.locator(owned(A)).fill("7");
      await saveInventory(page);
      await page.click(reverse(bought.spendHistory[0].id));
      await previewEntry(page);
      const undone = await apply(page, { purchase: false });
      assert.deepEqual(undone.inventory, initial.inventory);
      assert.equal(
        undone.reserves[A],
        3,
        "Reversal preserves separately edited current reserves",
      );
      assert.equal(undone.spendHistory.length, 2);
      await openPurchase(page);
      await page.click("#upgrade-spend-status-only");
      await page.locator("#upgrade-spend-confirm").waitFor({ state: "hidden" });
      await focusIs(page, progress(FIRST));
      const beforeCorrection = await active(page);
      await correct(page, FIRST, "completed");
      assert.deepEqual(
        (await active(page)).spendHistory,
        beforeCorrection.spendHistory,
      );
      await refused(page, spend(FIRST), /completed|already/i);
      evidence.scenarios.push(
        "Missing versus zero/insufficient/retained/reserved stock refuse atomically; dirty inventory remains separate; explicit reserve edits, safe undo stock guard and status-only fallback preserve exact accounting",
      );
    } finally {
      await context.close();
    }
    // Whole-profile reset is deliberately not an erasure of tracked spending.
    const resetContext = await browser.newContext();
    try {
      const page = await resetContext.newPage();
      await seed(page, base);
      await openPurchase(page);
      const bought = await apply(page);
      await page.goto(pathFor(base, "settings"));
      await ready(page);
      await page.click("#reset-profile");
      assert.match(
        await page.locator("#reset-confirm").textContent(),
        /spending.*retain|retain.*spending|history.*retain|retain.*history/is,
      );
      const revision = (await active(page)).revision;
      await page.click("#confirm-reset");
      await saved(page, revision);
      assert.deepEqual((await active(page)).spendHistory, bought.spendHistory);
      await page.goto(pathFor(base, "inventory"));
      await ready(page);
      for (const [id, value] of Object.entries(
        bought.spendHistory[0].costs.reduce(
          (a, r) => ({ ...a, [r.itemId]: r.before }),
          {},
        ),
      ))
        await page.locator(owned(id)).fill(String(value));
      await saveInventory(page);
      await refused(page, spend(FIRST), /already|recorded|purchase/i);
      assert.equal((await active(page)).spendHistory.length, 1);
      evidence.scenarios.push(
        "Whole-profile reset preserves recorded history and active-purchase duplicate guard; refilling stock after reset cannot silently buy again",
      );
    } finally {
      await resetContext.close();
    }
  }
  async function migrationAndSnapshots() {
    const context = await browser.newContext();
    try {
      const page = await context.newPage();
      await seed(page, base, { legacyVersion: 2 });
      const original = (await durable(page)).value;
      assert.equal(original.schemaVersion, 2);
      await page.goto(pathFor(base, "settings"));
      await ready(page);
      assert.deepEqual(
        await active(page),
        original,
        "Old v2 is not auto-rewritten",
      );
      await page.click("#migrate-upgrade-profile");
      await page.locator("#restore-preview").waitFor({ state: "visible" });
      assert.match(
        await page.locator("#restore-preview").textContent(),
        /spending|history/i,
      );
      await page.click("#cancel-restore");
      assert.deepEqual((await durable(page)).value, original);
      await page.click("#migrate-upgrade-profile");
      await page.click("#apply-restore");
      await saved(page, original.revision);
      const migrated = await durable(page);
      assert.equal(migrated.value.schemaVersion, 3);
      assert.deepEqual(migrated.value.spendHistory, []);
      assert.deepEqual(migrated.previous, original);
      assert.deepEqual(
        {
          ...migrated.value,
          schemaVersion: 2,
          revision: original.revision,
          spendHistory: undefined,
        },
        { ...original, spendHistory: undefined },
      );
      await page.goto(pathFor(base, "progression"));
      await ready(page);
      await totals(page, { net: 0, gross: 0, reversed: 0 });
      const migratedSummary = await page
        .locator("#upgrade-spending-summary")
        .textContent();
      assert.match(migratedSummary, /not.*lifetime/i);
      assert.match(migratedSummary, /Earlier spending is not recorded\./);
      await refused(page, spend(FIRST), /completed|already/i);
      await openPurchase(page, SECOND);
      const purchased = await apply(page);
      await page.goto(pathFor(base, "settings"));
      await ready(page);
      const backup = await downloadJSON(page, "#export-current-profile");
      assert.deepEqual(backup, purchased);
      const beforeBad = await durable(page),
        malformed = structuredClone(backup);
      malformed.spendHistory[0].costs[0].after++;
      await page.setInputFiles("#import-profile", {
        name: "fictional-invalid-spending.json",
        mimeType: "application/json",
        buffer: Buffer.from(JSON.stringify(malformed)),
      });
      await page.locator("#error:not([hidden])").waitFor();
      assert.deepEqual(await durable(page), beforeBad);
      assert.match(
        await page.locator("#error").textContent(),
        /spend|cost|arithmetic|stock|snapshot/i,
      );
      await page.setInputFiles("#import-profile", {
        name: "fictional-v2-history-gap.json",
        mimeType: "application/json",
        buffer: Buffer.from(JSON.stringify(original)),
      });
      await page.locator("#restore-preview").waitFor({ state: "visible" });
      assert.match(
        await page.locator("#restore-preview").textContent(),
        /history|spending/i,
      );
      await page.click("#cancel-restore");
      assert.deepEqual(await durable(page), beforeBad);
      await page.setInputFiles("#import-profile", {
        name: "fictional-v2-history-gap-confirmed.json",
        mimeType: "application/json",
        buffer: Buffer.from(JSON.stringify(original)),
      });
      await page.locator("#restore-preview").waitFor({ state: "visible" });
      await page.click("#apply-restore");
      await saved(page, purchased.revision);
      const restoredOld = await durable(page);
      assert.equal(restoredOld.value.schemaVersion, 2);
      assert.equal(Object.hasOwn(restoredOld.value, "spendHistory"), false);
      assert.deepEqual(restoredOld.previous, purchased);
      await page.click("#recover-profile");
      await page.locator("#restore-preview").waitFor({ state: "visible" });
      await page.click("#apply-restore");
      await saved(page, restoredOld.value.revision);
      const recovered = (await durable(page)).value;
      assert.deepEqual(
        { ...recovered, revision: purchased.revision },
        purchased,
        "Recovery restores snapshots rather than replaying costs",
      );
      await page.setInputFiles("#import-profile", {
        name: "fictional-v3-spending-roundtrip.json",
        mimeType: "application/json",
        buffer: Buffer.from(JSON.stringify(backup)),
      });
      await page.locator("#restore-preview").waitFor({ state: "visible" });
      await page.click("#apply-restore");
      await saved(page, recovered.revision);
      const roundtrip = (await durable(page)).value;
      assert.deepEqual({ ...roundtrip, revision: backup.revision }, backup);
      await page.goto(pathFor(base, "progression"));
      await ready(page);
      await totals(page, {
        net: 4,
        gross: 4,
        reversed: 0,
        cash: { net: 40, gross: 40, reversed: 0 },
      });
      evidence.scenarios.push(
        "Explicit v2→v3 preview/Cancel/migration preserves exact original and invents no old spend; malformed snapshot rejected; actual v2 history replacement warning and v3 file restore/recovery never replay deductions",
      );
    } finally {
      await context.close();
    }
    for (const mode of ["changed-cost", "retired-upgrade", "rebind-progress"]) {
      const isolated = await browser.newContext();
      try {
        const page = await isolated.newPage(),
          initial = await seed(page, base);
        await openPurchase(page);
        const bought = await apply(page),
          purchase = bought.spendHistory[0];
        await page.evaluate(
          async ({ mode, FIRST, A }) => {
            const { state } = await import("/assets/src/client/common.mjs");
            const { commitRecord, readRecord } = await import(
              "/assets/src/storage/store.mjs"
            );
            const { validatePack } = await import(
              "/assets/src/content/validate.mjs"
            );
            const p = structuredClone(state.pack);
            p.contentVersion = "spending.synthetic.2";
            const item = p.items.find((i) => i.id === A);
            item.name = "Changed current resource name";
            item.kind = "resource";
            item.unit = "resource-unit";
            const first = p.objectives.find((o) => o.id === FIRST);
            first.name = "Changed current upgrade name";
            first.requirements.find((r) => r.itemId === A).quantity = 99;
            if (mode === "retired-upgrade")
              p.objectives = p.objectives.filter((o) => o.id !== FIRST);
            validatePack(
              p,
              await (await fetch("/assets/schemas/pack.schema.json")).json(),
            );
            const record = await readRecord("content", p.id);
            await commitRecord(
              "content",
              p.id,
              { pack: p, revision: record.value.revision },
              record.value.revision,
            );
          },
          { mode, FIRST, A },
        );
        await page.reload();
        await ready(page);
        if (mode === "retired-upgrade") {
          await totals(page, { net: 0, gross: 0, reversed: 0 });
          assert.match(
            await page.locator("#upgrade-spending-summary").textContent(),
            /omitted|visible records|spoiler/i,
          );
          const rev = (await active(page)).revision;
          await page.click("#spoiler-toggle");
          await saved(page, rev);
        }
        if (mode === "rebind-progress") {
          await page.goto(pathFor(base, "settings"));
          await ready(page);
          const before = await active(page);
          await page.click("#rebind-profile");
          await page.locator("#restore-preview").waitFor({ state: "visible" });
          await page.click("#apply-restore");
          await saved(page, before.revision);
          assert.equal(
            (await active(page)).upgradeProgress[FIRST].reviewRequired,
            true,
          );
          assert.deepEqual(
            (await active(page)).spendHistory,
            bought.spendHistory,
          );
          await page.goto(pathFor(base, "progression"));
          await ready(page);
          await refused(
            page,
            reverse(purchase.id),
            /progress|changed|match|reconcil/i,
          );
          await page.goto(pathFor(base, "settings"));
          await ready(page);
          const rev = (await active(page)).revision;
          await page.click("#recover-profile");
          await page.locator("#restore-preview").waitFor({ state: "visible" });
          await page.click("#apply-restore");
          await saved(page, rev);
          await page.goto(pathFor(base, "progression"));
          await ready(page);
        }
        await totals(page, {
          net: 5,
          gross: 5,
          reversed: 0,
          cash: { net: 100, gross: 100, reversed: 0 },
        });
        const oldRow = page.locator(`[data-spend-item="${A}"]`);
        assert.match(await oldRow.textContent(), /Fictional part A/);
        assert.match(await oldRow.textContent(), /count/);
        assert(
          !(await oldRow.textContent()).includes(
            "Changed current resource name",
          ),
        );
        await page.click(reverse(purchase.id));
        await previewEntry(page);
        assert.match(
          await page.locator("#upgrade-spend-details").textContent(),
          /current catalog costs are not used/i,
        );
        const preview = page.locator(`[data-spend-preview-item="${A}"]`);
        assert.match(await preview.textContent(), /Fictional part A/);
        assert.equal(
          (
            await preview
              .locator("dt", { hasText: "Restore in the guide only" })
              .evaluate((n) => n.nextElementSibling.textContent)
          ).trim(),
          "3",
        );
        const restored = await apply(page, { purchase: false });
        assert.deepEqual(restored.inventory, initial.inventory);
        assert.deepEqual(
          restored.spendHistory[0],
          purchase,
          "Catalog changes never rewrite the cost/unit/name snapshot",
        );
        await totals(page, { net: 0, gross: 5, reversed: 5 });
      } finally {
        await isolated.close();
      }
    }
    evidence.scenarios.push(
      "Changed cost/unit/name and retired upgrade snapshots remain original; hidden retired history requires reveal; rebind review mutation blocks undo until exact prior recovery, then snapshot-only reversal restores original stock",
    );
  }
  async function protectedMigration() {
    const context = await browser.newContext();
    try {
      const page = await context.newPage();
      await seed(page, base);
      await page.evaluate(
        async ({ FIRST }) => {
          const { state } = await import("/assets/src/client/common.mjs");
          const { saveProfile } = await import("/assets/src/storage/store.mjs");
          const f = structuredClone(state.profile);
          f.schemaVersion = 1;
          delete f.upgradeProgress;
          delete f.watchPins;
          delete f.spendHistory;
          f.completion = { [FIRST]: "completed", "qa023:secret": "unlocked" };
          await saveProfile(f, state.revision);
        },
        { FIRST },
      );
      await page.goto(pathFor(base, "settings"));
      await ready(page);
      const before = await durable(page);
      await page.click("#migrate-upgrade-profile");
      await page.locator("#restore-preview").waitFor({ state: "visible" });
      const text = await page.locator("#restore-preview").textContent();
      assert(
        !/2 resolved entries|1 ambiguous legacy/.test(text),
        "Migration does not disclose protected legacy entry counts",
      );
      assert(
        !text.includes("Hidden spending vault"),
        "Migration hides protected legacy names",
      );
      assert.match(text, /protect|withheld|visible/i);
      await page.click("#cancel-restore");
      assert.deepEqual(await durable(page), before);
      await page.click("#migrate-upgrade-profile");
      await page.click("#apply-restore");
      await saved(page, before.value.revision);
      const migrated = await durable(page);
      assert.deepEqual(migrated.previous, before.value);
      assert.deepEqual(migrated.value.spendHistory, []);
      assert.equal(
        migrated.value.upgradeProgress[FIRST].completion,
        "completed",
      );
      assert.equal(
        migrated.value.upgradeProgress["qa023:secret"].reviewRequired,
        true,
      );
      assert.equal(
        migrated.value.upgradeProgress["qa023:secret"].legacyState,
        "unlocked",
      );
      evidence.scenarios.push(
        "V1 hidden legacy migration preview withholds protected entry counts/names; Cancel is exact and confirmed v3 migration preserves private ambiguity and original snapshot without invented spend",
      );
    } finally {
      await context.close();
    }
  }

  async function privateDisplayAndPaging() {
    const context = await browser.newContext();
    try {
      const page = await context.newPage();
      await seed(page, base);
      await openPurchase(page);
      await apply(page);
      await openPurchase(page, MIXED);
      await apply(page);
      await totals(page, {
        net: 6,
        gross: 6,
        reversed: 0,
        cash: { net: 100, gross: 100, reversed: 0 },
      });
      await breakdown(page, OTHER, "currency", {
        net: 7,
        gross: 7,
        reversed: 0,
      });
      await breakdown(page, RESOURCE, "item", {
        net: 2,
        gross: 2,
        reversed: 0,
      });
      assert.match(
        await page.locator(`[data-spend-item="${RESOURCE}"]`).textContent(),
        /resource-unit/,
      );
      let revision = (await active(page)).revision;
      await page.click("#spoiler-toggle");
      await saved(page, revision);
      await openPurchase(page, HIDDEN);
      const full = await apply(page);
      assert.equal(
        await metric(page, "net"),
        753,
        "Full private count sums only the consumed count units",
      );
      revision = full.revision;
      await page.click("#spoiler-toggle");
      await saved(page, revision);
      await totals(page, { net: 6, gross: 6, reversed: 0 });
      const summary = await page
        .locator("#upgrade-spending-summary")
        .innerHTML();
      const summaryText = await page
        .locator("#upgrade-spending-summary")
        .textContent();
      assert(
        !summary.includes("Hidden spending vault core"),
        "Protected history does not expose the hidden material name in any markup",
      );
      assert(
        !/\b(?:747|753)\b/.test(summaryText),
        "Protected history does not expose hidden cost or full-private total amounts",
      );
      // Numeric boundaries avoid arbitrary substrings inside UUID segments while
      // retaining every DOM attribute/metadata value in the privacy assertion.
      assert(
        !/\b(?:747|753)\b/.test(summary),
        "Protected quantities are absent from all summary markup, not merely visible text",
      );
      assert(
        !summary.includes(full.spendHistory[2].id),
        "Protected history omits the complete hidden event identity from DOM attributes",
      );
      assert.match(summary, /omitted|visible records|spoiler/i);
      assert.equal(
        await page
          .locator("#upgrade-spending-summary [data-upgrade-reverse]")
          .count(),
        0,
        "Hidden newest purchase must not make an older visible purchase reversible",
      );
      await page.goto(pathFor(base, "settings"));
      await ready(page);
      const exported = await downloadJSON(page, "#export-current-profile");
      assert.equal(
        exported.spendHistory.length,
        3,
        "Private backup retains protected full history",
      );
      assert.equal(exported.spendHistory[2].costs[0].consumed, 747);
      const withoutHidden = structuredClone(exported);
      withoutHidden.spendHistory.pop();
      await page.setInputFiles("#import-profile", {
        name: "fictional-protected-history-replacement.json",
        mimeType: "application/json",
        buffer: Buffer.from(JSON.stringify(withoutHidden)),
      });
      await page.locator("#restore-preview").waitFor({ state: "visible" });
      const replacementText = await page
        .locator("#restore-preview")
        .textContent();
      assert.match(replacementText, /history|spending/i);
      for (const hidden of ["Hidden spending vault core", "747", "753"])
        assert(
          !replacementText.includes(hidden),
          "Restore summary shares no-hidden-cost projection",
        );
      assert(
        !/3 (?:history|spending|purchase|recorded).*2/i.test(replacementText),
        "Protected replacement does not reveal raw hidden event count",
      );
      await page.click("#cancel-restore");
      assert.deepEqual((await durable(page)).value, exported);
      evidence.scenarios.push(
        "Net/gross/reversed count units exclude resource units and separate currencies; hidden purchase is wholly omitted from display/undo and restore summaries, while explicit private backup retains full history",
      );
    } finally {
      await context.close();
    }
    const pagingContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    try {
      const page = await pagingContext.newPage();
      await seed(page, base, { many: true });
      const initial = await active(page);
      assert.equal(initial.spendHistory.length, 61);
      assert.equal(await metric(page, "net"), 61);
      for (const [kind, selector] of [
        ["history", "[data-spend-event]"],
        ["items", "[data-spend-item], [data-spend-currency]"],
      ]) {
        assert.equal(
          await page.locator(`#upgrade-spending-summary ${selector}`).count(),
          50,
        );
        const firstPage = await page
          .locator(`#upgrade-spending-summary ${selector}`)
          .evaluateAll((nodes) =>
            nodes.map(
              (n) =>
                n.getAttribute("data-spend-event") ||
                n.getAttribute("data-spend-item") ||
                n.getAttribute("data-spend-currency"),
            ),
          );
        await page.locator(`#spend-${kind}-next`).focus();
        await page.keyboard.press("Enter");
        assert.equal(
          await page.locator(`#upgrade-spending-summary ${selector}`).count(),
          11,
        );
        await focusIs(page, `#spend-${kind}-status`);
        const secondPage = await page
          .locator(`#upgrade-spending-summary ${selector}`)
          .evaluateAll((nodes) =>
            nodes.map(
              (n) =>
                n.getAttribute("data-spend-event") ||
                n.getAttribute("data-spend-item") ||
                n.getAttribute("data-spend-currency"),
            ),
          );
        assert.equal(new Set([...firstPage, ...secondPage]).size, 61);
        assert.equal(
          await page.locator(`#spend-${kind}-next`).isDisabled(),
          true,
        );
        await page.locator(`#spend-${kind}-previous`).focus();
        await page.keyboard.press("Enter");
        assert.equal(
          await page.locator(`#upgrade-spending-summary ${selector}`).count(),
          50,
        );
      }
      assert.deepEqual(
        await active(page),
        initial,
        "History/item paging changes no inventory, ledger or goals",
      );
      evidence.scenarios.push(
        "61 independently seeded one-unit purchases render 50/11 keyboard pages for history and per-item breakdown, with status focus and no persistent mutation",
      );
    } finally {
      await pagingContext.close();
    }
  }

  async function failedNavigation(surface) {
    const context = await browser.newContext();
    await context.addInitScript(() => {
      const put = IDBObjectStore.prototype.put;
      IDBObjectStore.prototype.put = function (...args) {
        if (window.failSpendingQuota)
          throw new DOMException(
            "Synthetic spending quota",
            "QuotaExceededError",
          );
        return put.apply(this, args);
      };
    });
    try {
      const page = await context.newPage();
      await seed(page, base);
      await page.goto(pathFor(base, surface));
      await ready(page);
      const before = await durable(page);
      await openPurchase(page);
      await page.locator("#upgrade-spend-ack").check();
      await page.evaluate(() => {
        window.failSpendingQuota = true;
      });
      await page.click("#upgrade-spend-apply");
      await page.locator("#upgrade-spend-export").waitFor({ state: "visible" });
      const candidate = await downloadJSON(page, "#upgrade-spend-export");
      await page.evaluate(() => {
        window.failSpendingQuota = false;
        const picker = document.querySelector("#pack-select");
        picker.value = "official:mw4-dmz-starter";
        picker.dispatchEvent(new Event("change", { bubbles: true }));
      });
      await page.waitForFunction(async () => {
        const { state } = await import("/assets/src/client/common.mjs");
        return state.pack?.id === "official:mw4-dmz-starter" && !state.loading;
      });
      await page
        .locator("#upgrade-spend-recovery")
        .waitFor({ state: "visible" });
      assert.equal(
        await page.locator("#upgrade-spend-confirm[open]").count(),
        0,
      );
      assert.match(
        await page.locator("#upgrade-spend-recovery").textContent(),
        /reconcil|not.*retried|already.*committed/i,
      );
      assert.deepEqual(
        await downloadJSON(page, "[data-spend-recovery-export]"),
        candidate,
      );
      assert.deepEqual(
        await durable(page),
        before,
        "Failed navigation does not persist the old candidate",
      );
      const other = await active(page);
      await page.evaluate((id) => {
        const picker = document.querySelector("#pack-select");
        picker.value = id;
        picker.dispatchEvent(new Event("change", { bubbles: true }));
      }, PACK);
      await page.waitForFunction(async (id) => {
        const { state } = await import("/assets/src/client/common.mjs");
        return state.pack?.id === id && !state.loading;
      }, PACK);
      await refused(page, spend(FIRST), /candidate|reconcil|discard|export/i);
      assert.deepEqual(
        await downloadJSON(page, "[data-spend-recovery-export]"),
        candidate,
      );
      await page.click("[data-spend-recovery-discard]");
      assert.equal(await page.locator("#upgrade-spend-recovery").count(), 0);
      await focusIs(page, "#upgrade-spending-title");
      assert.deepEqual(await durable(page), before);
      const otherDurable = await durable(page, "official:mw4-dmz-starter");
      assert(
        !otherDurable ||
          JSON.stringify(otherDurable.value) === JSON.stringify(other),
        "Changing packs never writes the failed candidate into the other pack",
      );
      await openPurchase(page);
      await cancelPurchase(page);
      assert.deepEqual(await durable(page), before);
      evidence.scenarios.push(
        `${surface}: failed candidate survives same-page pack navigation for explicit export/reconciliation; no automatic replay, no other-pack mutation, pending recovery blocks a new operation until explicit discard`,
      );
    } finally {
      await context.close();
    }
  }

  async function cancelledNavigation(attempt) {
    const context = await browser.newContext();
    let page;
    try {
      page = await context.newPage();
      const initial = await seed(page, base);
      await openPurchase(page);
      await page.goto(pathFor(base, "inventory"));
      await ready(page);
      assert.deepEqual(
        await active(page),
        initial,
        "Navigating away from an unconfirmed preview never commits it",
      );
      assert.equal(
        await page.locator("#upgrade-spend-confirm[open]").count(),
        0,
      );
      await page.evaluate(installPickerFocusDiagnostics, { traceCalls: true });
      await openPurchase(page);
      // Simulate a legitimate selected-pack change from the application's picker.
      // Native modal inertness prevents pointer interaction outside; the common
      // change handler must still invalidate stale staging when selection changes.
      await page.evaluate(() => {
        const select = document.querySelector("#pack-select");
        select.value = "official:mw4-dmz-starter";
        select.dispatchEvent(new Event("change", { bubbles: true }));
      });
      await page.waitForFunction(async () => {
        const { state } = await import("/assets/src/client/common.mjs");
        return state.pack?.id === "official:mw4-dmz-starter" && !state.loading;
      });
      assert.equal(
        await page.locator("#upgrade-spend-confirm[open]").count(),
        0,
      );
      await page.locator("#pack-select").focus();
      assert.deepEqual((await durable(page)).value, initial);
      await focusIs(page, "#pack-select");
      evidence.scenarios.push(
        "Unconfirmed document navigation and selected-pack change discard stale preview without any debit/event; old modal focus cannot steal focus from the new pack",
      );
    } finally {
      evidence.cancelledNavigationFocus ||= [];
      try {
        evidence.cancelledNavigationFocus.push({
          attempt,
          events: await page?.evaluate(
            () => window.__dmzPickerFocusEvidence?.stop() ?? [],
          ),
        });
      } catch (error) {
        evidence.cancelledNavigationFocus.push({
          attempt,
          unavailable: error.message.slice(0, 2048),
        });
      }
      await context.close();
    }
  }

  async function observedCurrencyBoundary() {
    const context = await browser.newContext();
    try {
      const page = await context.newPage(),
        observedPack = "observed:upgrade-review-20261026",
        cash = "observed:cash",
        bank = "observed:bank-upgrade-iv";
      await page.goto(
        `${base}/inventory/?pack=${encodeURIComponent(observedPack)}`,
      );
      await ready(page);
      assert.equal((await active(page)).schemaVersion, 3);
      assert.equal(
        await page.locator(owned(cash)).getAttribute("max"),
        "2000000",
      );
      assert.equal(
        await page.locator(reserved(cash)).getAttribute("max"),
        "2000000",
      );
      assert.equal(
        await page
          .locator(owned("observed:ballistic-flight-logs"))
          .getAttribute("max"),
        "1000000",
      );
      await page.locator(owned(cash)).fill("2000000");
      await page.locator(reserved(cash)).fill("2000000");
      await page.locator(owned("observed:ballistic-flight-logs")).fill("5");
      await page.locator(owned("observed:regional-combat-notes")).fill("5");
      await saveInventory(page, observedPack);
      await refused(
        page,
        spend(bank),
        /reserve|insufficient|stock/i,
        observedPack,
      );
      await page.locator(reserved(cash)).fill("1800000");
      await saveInventory(page, observedPack);
      const before = await active(page);
      await openPurchase(page, bank);
      assert.match(
        await page.locator("#upgrade-spend-details").textContent(),
        /unknown|unverified|not verified|partial/i,
      );
      const after = await apply(page, { packId: observedPack });
      assert.equal(after.inventory[cash], 1800000);
      assert.equal(after.reserves[cash], 1800000);
      assert.equal(after.inventory["observed:ballistic-flight-logs"], 0);
      assert.equal(after.inventory["observed:regional-combat-notes"], 0);
      await totals(page, { net: 10, gross: 10, reversed: 0 });
      await breakdown(page, cash, "currency", {
        net: 200000,
        gross: 200000,
        reversed: 0,
      });
      await page.click(reverse(after.spendHistory[0].id));
      await previewEntry(page);
      const restored = await apply(page, {
        purchase: false,
        packId: observedPack,
      });
      assert.deepEqual(restored.inventory, before.inventory);
      assert.deepEqual(restored.reserves, before.reserves);
      assert.equal(restored.inventory[cash], 2000000);
      evidence.scenarios.push(
        "Actual observed Bank IV with synthetic 2,000,000 cash respects protected reserve, records known partial listed costs despite unverified build/prerequisites, separates 10 material units from 200,000 cash and reverses to 2,000,000; non-currency input cap remains 1,000,000",
      );
    } finally {
      await context.close();
    }
  }
  async function responsive() {
    for (const surface of ["inventory", "progression"])
      for (const width of [320, 390])
        for (const [theme, zoom] of [
          ["dark", 100],
          ["light", 200],
        ]) {
          const context = await browser.newContext({
            viewport: { width, height: 844 },
            reducedMotion: "reduce",
          });
          try {
            const page = await context.newPage();
            await seed(page, base);
            await page.goto(pathFor(base, surface));
            await ready(page);
            if (
              (await page.locator("html").getAttribute("data-theme")) !== theme
            )
              await page.click("#theme-toggle");
            await page.evaluate((zoom) => {
              document.documentElement.style.fontSize = `${zoom}%`;
            }, zoom);
            assert.equal(
              await page
                .locator("html")
                .evaluate((n) => parseFloat(getComputedStyle(n).fontSize)),
              zoom === 200 ? 32 : 16,
            );
            await totals(page, { net: 0, gross: 0, reversed: 0 });
            const empty = page.locator("#upgrade-spending-summary");
            const emptyText = await empty.textContent();
            assert.match(emptyText, /not.*lifetime/i);
            assert.match(
              emptyText,
              /unrecorded|not recorded|prior|earlier|past|history/i,
            );
            assert.equal(
              await empty
                .locator('[id^="spend-items-"], [id^="spend-history-"]')
                .count(),
              0,
              "Fresh empty history omits nonfunctional breakdown/history pager scaffolding",
            );
            assert.equal(
              await empty
                .locator(
                  "[data-spend-item], [data-spend-currency], [data-spend-event]",
                )
                .count(),
              0,
            );
            const emptyBounds = await empty.evaluate((n) => ({
              height: n.getBoundingClientRect().height,
              width: n.getBoundingClientRect().width,
              clientWidth: n.clientWidth,
              scrollWidth: n.scrollWidth,
            }));
            assert(
              emptyBounds.height <= 3 * 844 &&
                emptyBounds.width <= width &&
                emptyBounds.scrollWidth <= emptyBounds.clientWidth + 1,
              `Compact empty spending summary stays within three enlarged viewport heights: ${JSON.stringify(emptyBounds)}`,
            );
            if (captureScreenshots) {
              const path = `test-results/upgrade023-spending/${prefix}-empty-summary-${surface}-${width}-${theme}-${zoom}.png`;
              await empty.screenshot({ path });
              evidence.screenshots.push(path);
            }
            await openPurchase(page);
            assert.equal(
              await page.locator("#upgrade-spend-apply").isDisabled(),
              true,
            );
            const bounds = await page
              .locator("#upgrade-spend-confirm")
              .evaluate((n) => {
                const r = n.getBoundingClientRect();
                return {
                  left: r.left,
                  right: r.right,
                  top: r.top,
                  bottom: r.bottom,
                  clientWidth: n.clientWidth,
                  scrollWidth: n.scrollWidth,
                  clientHeight: n.clientHeight,
                  scrollHeight: n.scrollHeight,
                };
              });
            assert(
              bounds.left >= -1 && bounds.right <= width + 1,
              `Dialog horizontal bounds ${JSON.stringify(bounds)}`,
            );
            assert(
              bounds.top >= -1 && bounds.bottom <= 845,
              `Dialog remains vertically scrollable within viewport ${JSON.stringify(bounds)}`,
            );
            assert(
              bounds.scrollWidth <= bounds.clientWidth + 1,
              "Purchase preview has no internal horizontal overflow",
            );
            assert(
              await page.evaluate(
                () => document.documentElement.scrollWidth <= innerWidth + 1,
              ),
              "Page has no horizontal overflow at enlarged text",
            );
            const visibleControls = await page
              .locator(
                "#upgrade-spend-confirm button:visible, #upgrade-spend-confirm input:visible",
              )
              .evaluateAll((nodes) =>
                nodes.map((n) => {
                  const r = n.getBoundingClientRect();
                  return {
                    id: n.id,
                    left: r.left,
                    right: r.right,
                    width: r.width,
                  };
                }),
              );
            for (const c of visibleControls)
              assert(
                c.width > 0 && c.left >= -1 && c.right <= width + 1,
                `Dialog control horizontal bounds ${JSON.stringify(c)}`,
              );
            if (captureScreenshots)
              await captureDialog(
                page,
                `${prefix}-purchase-${surface}-${width}-${theme}-${zoom}`,
              );
            await page.locator("#upgrade-spend-ack").focus();
            await page.keyboard.press("Space");
            assert.equal(
              await page.locator("#upgrade-spend-ack").isChecked(),
              true,
            );
            const ackPosition = await page
              .locator("#upgrade-spend-ack")
              .evaluate((n) => {
                const r = n.getBoundingClientRect();
                return {
                  top: r.top,
                  bottom: r.bottom,
                  active: n === document.activeElement,
                };
              });
            assert(
              ackPosition.active &&
                ackPosition.top >= 0 &&
                ackPosition.bottom <= 844,
              "Keyboard reaches the acknowledgement in the scrollable preview",
            );
            await apply(page);
            await focusIs(page, spend(FIRST));
            await totals(page, {
              net: 5,
              gross: 5,
              reversed: 0,
              cash: { net: 100, gross: 100, reversed: 0 },
            });
            const summary = page.locator("#upgrade-spending-summary");
            const size = await summary.evaluate((n) => ({
              width: n.getBoundingClientRect().width,
              height: n.getBoundingClientRect().height,
              clientWidth: n.clientWidth,
              scrollWidth: n.scrollWidth,
            }));
            assert(
              size.width > 0 &&
                size.width <= width &&
                size.height > 0 &&
                size.scrollWidth <= size.clientWidth + 1,
            );
            if (captureScreenshots) {
              await captureSummary(
                page,
                summary,
                `${prefix}-summary-${surface}-${width}-${theme}-${zoom}`,
              );
            }
          } finally {
            await context.close();
          }
        }
    evidence.scenarios.push(
      "Purchase acknowledgement/confirmation and visible counters exercised by keyboard at 320/390px, dark100/light200 actual text, reduced motion and scrollable non-overflowing native dialogs; " +
        (captureScreenshots
          ? "compact empty-state, bounded full-dialog scroll tiles and populated summary pixels captured"
          : "functional/computed-layout only; WebKit pixels not captured under existing pinned-tool/CSP policy"),
    );
  }

  async function captureSummary(page, summary, name) {
    const original = await summary.evaluate((n) => {
      const r = n.getBoundingClientRect();
      const x = Math.floor(r.left + scrollX),
        y = Math.floor(r.top + scrollY);
      return {
        box: {
          x,
          y,
          width: Math.ceil(r.right + scrollX) - x,
          height: Math.ceil(r.bottom + scrollY) - y,
        },
        viewport: { width: innerWidth, height: innerHeight },
        rootFontSize: getComputedStyle(document.documentElement).fontSize,
      };
    });
    const tileHeight = 8192,
      overlap = 256,
      tiles = [];
    let y = 0;
    for (let i = 0; y < original.box.height; i++) {
      const height = Math.min(tileHeight, original.box.height - y);
      const clip = {
        x: original.box.x,
        y: original.box.y + y,
        width: original.box.width,
        height,
      };
      const path = `test-results/upgrade023-spending/${name}-tile${String(i + 1).padStart(2, "0")}.png`;
      const scrollBefore = await page.evaluate(() => ({
        x: scrollX,
        y: scrollY,
      }));
      await page.screenshot({ path, fullPage: true, clip, scale: "css" });
      const scrollAfter = await page.evaluate(() => ({
        x: scrollX,
        y: scrollY,
      }));
      evidence.screenshots.push(path);
      tiles.push({ path, clip, offsetY: y, scrollBefore, scrollAfter });
      if (y + height === original.box.height) break;
      y += height - overlap;
    }
    assert.equal(tiles[0].offsetY, 0);
    for (let i = 1; i < tiles.length; i++)
      assert(
        tiles[i].offsetY <= tiles[i - 1].offsetY + tiles[i - 1].clip.height,
      );
    assert.equal(
      tiles.at(-1).offsetY + tiles.at(-1).clip.height,
      original.box.height,
    );
    const after = await page.evaluate(() => ({
      viewport: { width: innerWidth, height: innerHeight },
      rootFontSize: getComputedStyle(document.documentElement).fontSize,
    }));
    assert.deepEqual(after, {
      viewport: original.viewport,
      rootFontSize: original.rootFontSize,
    });
    await writeFile(
      `test-results/upgrade023-spending/${name}-summary-capture.json`,
      JSON.stringify(
        {
          method: "full-summary-clipped-css-pixel-tiles",
          fullSummaryVerticalCoverage: true,
          ...original,
          tileHeight,
          overlap,
          tiles,
        },
        null,
        2,
      ),
    );
  }

  async function captureDialog(page, name) {
    const dialog = page.locator("#upgrade-spend-confirm"),
      overlap = 128;
    const initial = await dialog.evaluate((n) => ({
      scrollTop: n.scrollTop,
      clientHeight: n.clientHeight,
      scrollHeight: n.scrollHeight,
      viewport: { width: innerWidth, height: innerHeight },
      rootFontSize: getComputedStyle(document.documentElement).fontSize,
    }));
    assert(
      initial.clientHeight > overlap,
      "Dialog has a useful scrollable viewport",
    );
    const tiles = [];
    let target = 0;
    for (let index = 0; ; index++) {
      const position = await dialog.evaluate((n, target) => {
        n.scrollTop = target;
        const r = n.getBoundingClientRect();
        return {
          scrollTop: n.scrollTop,
          clientHeight: n.clientHeight,
          scrollHeight: n.scrollHeight,
          box: { x: r.x, y: r.y, width: r.width, height: r.height },
        };
      }, target);
      if (tiles.length)
        assert(
          position.scrollTop > tiles.at(-1).scrollTop,
          "Dialog evidence scroll makes progress",
        );
      const path = `test-results/upgrade023-spending/${name}-modal-tile${String(index + 1).padStart(2, "0")}.png`;
      await page.screenshot({ path, fullPage: false, scale: "css" });
      evidence.screenshots.push(path);
      tiles.push({ ...position, path });
      if (
        position.scrollTop + position.clientHeight >=
        position.scrollHeight - 1
      )
        break;
      target = position.scrollTop + position.clientHeight - overlap;
    }
    assert.equal(tiles[0].scrollTop, 0);
    for (let i = 1; i < tiles.length; i++)
      assert(
        tiles[i].scrollTop <=
          tiles[i - 1].scrollTop + tiles[i - 1].clientHeight,
        "No missing dialog content between captures",
      );
    await dialog.evaluate((n, scroll) => {
      n.scrollTop = scroll;
    }, initial.scrollTop);
    const after = await page.evaluate(() => ({
      viewport: { width: innerWidth, height: innerHeight },
      rootFontSize: getComputedStyle(document.documentElement).fontSize,
    }));
    assert.deepEqual(after, {
      viewport: initial.viewport,
      rootFontSize: initial.rootFontSize,
    });
    await writeFile(
      `test-results/upgrade023-spending/${name}-dialog-capture.json`,
      JSON.stringify(
        {
          method: "scrollable-native-dialog-viewport-tiles",
          fullDialogVerticalCoverage: true,
          overlap,
          ...initial,
          tiles,
        },
        null,
        2,
      ),
    );
  }
}
