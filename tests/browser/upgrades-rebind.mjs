import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
import { upgradeFixture } from "../helpers/upgrades.mjs";
import { newProfile, validateProfile } from "../../src/domain/profile.mjs";
import { validatePack } from "../../src/content/validate.mjs";

const PACK = "test:upgrade-rebind";
const ids = {
  cost: "test:rebind-cost",
  objectiveSource: "test:rebind-objective-source",
  requirementSource: "test:rebind-requirement-source",
  retired: "test:rebind-retired",
  unchanged: "test:rebind-unchanged",
  added: "test:rebind-new-tier",
  order: "test:rebind-order",
};
const control = (id, field = "completion") =>
  `[data-upgrade-id="${id}"][data-upgrade-field="${field}"]`;
const route = (base, page = "settings") =>
  `${base}/${page}/?pack=${encodeURIComponent(PACK)}`;

// Every definition, quantity, completion and evidence change here is fictional.
// The replacement deliberately shares a name with a retired ID: names are not identity.
function rebindFixtures() {
  const before = upgradeFixture();
  before.id = PACK;
  before.title = "SYNTHETIC UPGRADE REBIND — NOT GAME FACTS";
  before.contentVersion = "synthetic-before";
  const template = before.objectives[0];
  before.sources = ["stable", "objective", "requirement"].map((key) => ({
    ...structuredClone(before.sources[0]),
    id: `test:rebind-source-${key}`,
    title: `Synthetic ${key} evidence`,
    supports: "Fictional browser recovery fixture only; not gameplay evidence.",
    provenance: {
      kind: "web",
      observationKey: `synthetic-rebind-${key}`,
      lineageKey: `synthetic-rebind-${key}`,
      captureDate: null,
      buildStatus: "known",
    },
  }));
  const stableSource = before.sources[0].id;
  for (const item of before.items) item.sourceIds = [stableSource];
  before.objectives = [
    [ids.cost, "Synthetic changed cost"],
    [ids.objectiveSource, "Synthetic changed objective evidence"],
    [ids.requirementSource, "Synthetic changed requirement evidence"],
    [ids.retired, "Synthetic shared display title"],
    [ids.unchanged, "Synthetic unchanged upgrade"],
  ].map(([id, name]) => ({
    ...structuredClone(template),
    id,
    name,
    sourceIds: [
      id === ids.objectiveSource ? before.sources[1].id : stableSource,
    ],
    requirements: [
      {
        itemId: before.items[0].id,
        quantity: 5,
        consumption: "consumed",
        status: "fictional",
        sourceIds: [
          id === ids.requirementSource ? before.sources[2].id : stableSource,
        ],
      },
    ],
    upgrade: {
      tierLabel: id === ids.retired ? "III" : "I",
      prerequisiteStatus: "known",
      observationKeys: [id.replace(":", "-")],
    },
  }));
  const order = {
    ...structuredClone(template),
    id: ids.order,
    name: "Synthetic unchanged order",
    track: "dmz-order",
    requirements: [],
    sourceIds: [stableSource],
  };
  delete order.upgrade;
  before.objectives.push(order);
  before.items.push({
    ...structuredClone(before.items[1]),
    id: "test:rebind-unentered",
    name: "Synthetic unentered material",
  });
  const profile = newProfile(before);
  profile.inventory[before.items[0].id] = 6;
  profile.inventory[before.items[1].id] = 0;
  profile.reserves[before.items[0].id] = 9;
  profile.goals = [{ id: ids.cost, quantity: 1 }];
  profile.watchPins = [before.items[0].id, "test:rebind-unentered"];
  profile.completion[ids.order] = "completed";
  for (const id of Object.values(ids).filter(
    (id) => ![ids.added, ids.order].includes(id),
  ))
    profile.upgradeProgress[id] = {
      completion: "completed",
      availability: "available",
      reviewRequired: false,
      legacyState: "completed",
    };
  const after = structuredClone(before);
  after.contentVersion = "synthetic-after";
  after.objectives.find((row) => row.id === ids.cost).requirements[0].quantity =
    9;
  after.sources[1].provenance.buildStatus = "unknown";
  after.sources[2].supports =
    "Changed fictional requirement-only evidence; not gameplay evidence.";
  const added = structuredClone(
    after.objectives.find((row) => row.id === ids.retired),
  );
  added.id = ids.added;
  added.upgrade.tierLabel = "IV";
  added.upgrade.observationKeys = [ids.added.replace(":", "-")];
  after.objectives = after.objectives.filter((row) => row.id !== ids.retired);
  after.objectives.push(added);
  return { before, after, profile };
}
async function ready(page) {
  await page.waitForFunction(
    () => document.querySelector("main")?.getAttribute("aria-busy") === "false",
  );
}
async function durable(page) {
  return page.evaluate(
    async (id) =>
      (await import("/assets/src/storage/store.mjs")).loadProfile(id),
    PACK,
  );
}
async function active(page) {
  return page.evaluate(async () =>
    structuredClone(
      (await import("/assets/src/client/common.mjs")).state.profile,
    ),
  );
}
async function content(page) {
  return page.evaluate(
    async (id) =>
      (await import("/assets/src/storage/store.mjs")).readRecord("content", id),
    PACK,
  );
}
function withoutRevision(profile) {
  const result = structuredClone(profile);
  delete result.revision;
  return result;
}
function assertPlayerState(after, before) {
  for (const field of [
    "inventory",
    "reserves",
    "goals",
    "routes",
    "watchPins",
    "completion",
    "spoilers",
  ])
    assert.deepEqual(after[field], before[field], `${field} remains unchanged`);
}
async function stage(page, selector = "#rebind-profile") {
  await page.click(selector);
  await page.locator("#restore-preview").waitFor({ state: "visible" });
}
async function apply(page, previous) {
  await page.click("#apply-restore");
  await page.waitForFunction(
    async ({ id, revision }) =>
      (await (await import("/assets/src/storage/store.mjs")).loadProfile(id))
        ?.value?.revision > revision,
    { id: PACK, revision: previous.revision },
  );
  await page.locator("#restore-preview").waitFor({ state: "hidden" });
  const record = await durable(page);
  assert.equal(
    record.value.revision,
    previous.revision + 1,
    "A confirmation commits exactly once",
  );
  assert.deepEqual(
    record.previous,
    previous,
    "The exact prior profile remains recoverable",
  );
  return record;
}
async function cancel(page, previous) {
  await page.click("#cancel-restore");
  await page.locator("#restore-preview").waitFor({ state: "hidden" });
  assert.deepEqual(
    await durable(page),
    previous,
    "Cancelling leaves both saved value and prior snapshot unchanged",
  );
  assert.deepEqual(await active(page), previous.value);
}
async function backup(page) {
  const pending = page.waitForEvent("download");
  await page.click("#export-current-profile");
  const download = await pending;
  return JSON.parse(await readFile(await download.path(), "utf8"));
}
async function upload(page, profile, name) {
  await page.setInputFiles("#import-profile", {
    name,
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(profile)),
  });
}
async function seed(page, base, fixtures, retainPrior = true) {
  await page.goto(base);
  return page.evaluate(
    async ({ before, after, profile, retainPrior }) => {
      const { commitRecord, saveProfile } = await import(
        "/assets/src/storage/store.mjs"
      );
      const { validatePack } = await import("/assets/src/content/validate.mjs");
      const schema = await (
        await fetch("/assets/schemas/pack.schema.json")
      ).json();
      validatePack(before, schema);
      validatePack(after, schema);
      if (retainPrior)
        await commitRecord(
          "content",
          before.id,
          { pack: before, revision: 0 },
          0,
        );
      await commitRecord(
        "content",
        after.id,
        { pack: after, revision: retainPrior ? 1 : 0 },
        retainPrior ? 1 : 0,
      );
      return saveProfile(profile, 0);
    },
    { ...fixtures, retainPrior },
  );
}

export async function runUpgradeRebindTests({
  browser,
  base,
  captureScreenshots = false,
}) {
  const fixtures = rebindFixtures();
  const schema = JSON.parse(
    await readFile(
      new URL("../../schemas/pack.schema.json", import.meta.url),
      "utf8",
    ),
  );
  validatePack(fixtures.before, schema);
  validatePack(fixtures.after, schema);
  validateProfile(fixtures.profile);
  const context = await browser.newContext();
  const errors = [];
  context.on("page", (page) =>
    page.on("pageerror", (error) => errors.push(error.message)),
  );
  try {
    const page = await context.newPage();
    const original = await seed(page, base, fixtures);
    await page.goto(route(base));
    await ready(page);
    const originalRecord = await durable(page),
      originalContent = await content(page);
    assert.deepEqual(originalRecord.value, original);
    assert.deepEqual(originalContent.previous.pack, fixtures.before);
    assert.match(
      await page.locator("#version-status").textContent(),
      /Planning blocked until explicit rebind/,
    );
    await stage(page);
    const summary = await page.locator("#restore-summary").textContent();
    assert.match(summary, /3 saved records require review/);
    assert.match(summary, /1 retired references remain recoverable/);
    assert.match(summary, /1 new definitions have no inferred progress/);
    assert.match(summary, /Compared with the retained prior content snapshot/);
    assert.deepEqual(
      await active(page),
      original,
      "Rebind preview does not mutate active state",
    );
    if (captureScreenshots) {
      await mkdir("test-results/upgrade023-independent", { recursive: true });
      await page.screenshot({
        path: `test-results/upgrade023-independent/rebind-preview-${browser.browserType().name()}.png`,
        fullPage: true,
      });
    }
    await cancel(page, originalRecord);

    // A second tab captures the old revision before the first commits a rebind.
    const stale = await context.newPage();
    await stale.goto(route(base));
    await ready(stale);
    await stage(stale);
    await stage(page);
    const rebound = await apply(page, original);
    assert.equal(rebound.value.contentVersion, fixtures.after.contentVersion);
    assertPlayerState(rebound.value, original);
    for (const id of [
      ids.cost,
      ids.objectiveSource,
      ids.requirementSource,
      ids.retired,
    ]) {
      assert.deepEqual(
        rebound.value.upgradeProgress[id],
        { ...original.upgradeProgress[id], reviewRequired: true },
        `${id}: only review status changes, not historical completion`,
      );
    }
    assert.deepEqual(
      rebound.value.upgradeProgress[ids.unchanged],
      original.upgradeProgress[ids.unchanged],
    );
    assert(
      !Object.hasOwn(rebound.value.upgradeProgress, ids.added),
      "A new ID never inherits same-name or higher-tier completion",
    );
    assert.deepEqual(
      await content(page),
      originalContent,
      "Progress rebind never rewrites public content or its retained snapshot",
    );
    assert.deepEqual(await backup(page), rebound.value);
    await stale.click("#apply-restore");
    await stale.locator("#error:not([hidden])").waitFor();
    assert.match(await stale.locator("#error").textContent(), /Another tab/);
    assert.equal(
      await stale.locator("#restore-preview").isVisible(),
      true,
      "Failed stale preview remains available for review",
    );
    assert.deepEqual(
      await active(stale),
      original,
      "CAS failure leaves the stale active profile unchanged",
    );
    assert.deepEqual(
      await durable(stale),
      rebound,
      "CAS failure preserves newer value and snapshot without retry",
    );
    assert.deepEqual(
      await backup(stale),
      original,
      "The stale original remains exportable for reconciliation",
    );
    await stale.click("#cancel-restore");
    await stale.reload();
    await ready(stale);
    assert.deepEqual(await active(stale), rebound.value);
    await stale.close();

    await page.goto(route(base, "progression"));
    await ready(page);
    for (const id of [
      ids.cost,
      ids.objectiveSource,
      ids.requirementSource,
      ids.unchanged,
    ])
      assert.equal(await page.locator(control(id)).inputValue(), "completed");
    assert.equal(
      await page.locator(control(ids.added)).inputValue(),
      "unknown",
    );
    assert.equal(
      await page.locator(control(ids.added, "availability")).inputValue(),
      "unknown",
    );
    assert.equal(await page.locator(control(ids.retired)).count(), 0);
    for (const id of [ids.cost, ids.objectiveSource, ids.requirementSource])
      assert.match(
        await page
          .locator(control(id))
          .locator("xpath=ancestor::article")
          .textContent(),
        /Review required/i,
      );
    await page.goto(route(base));
    await ready(page);
    assert.match(
      await page.locator("#version-status").textContent(),
      /Versions match.*Unresolved references: Withheld while private details are protected/,
    );
    const v3Backup = await backup(page);
    assert.deepEqual(v3Backup, rebound.value);

    // Recovery restores the old binding, not imaginary inventory or a silent rebind.
    await stage(page, "#recover-profile");
    assert.match(
      await page.locator("#restore-summary").textContent(),
      /Different content version: planning remains blocked/,
    );
    await cancel(page, rebound);
    await stage(page, "#recover-profile");
    const recovered = await apply(page, rebound.value);
    assert.deepEqual(
      withoutRevision(recovered.value),
      withoutRevision(original),
    );
    assert.match(
      await page.locator("#version-status").textContent(),
      /Planning blocked until explicit rebind/,
    );
    await stage(page, "#recover-profile");
    const restoredV3 = await apply(page, recovered.value);
    assert.deepEqual(
      withoutRevision(restoredV3.value),
      withoutRevision(v3Backup),
    );

    // Real file-input v1 replacement is explicit and recoverable; no migration on load.
    const v1Backup = structuredClone(restoredV3.value);
    v1Backup.schemaVersion = 1;
    delete v1Backup.upgradeProgress;
    delete v1Backup.watchPins;
    delete v1Backup.spendHistory;
    v1Backup.completion = {
      [ids.order]: "completed",
      [ids.cost]: "unlocked",
      [ids.requirementSource]: "completed",
      [ids.retired]: "completed",
    };
    validateProfile(v1Backup);
    await upload(page, v1Backup, "synthetic-rebind-v1-cancel.json");
    await page.locator("#restore-preview").waitFor({ state: "visible" });
    assert.match(
      await page.locator("#restore-summary").textContent(),
      /Schema version.*3.*1/,
    );
    await cancel(page, restoredV3);
    await upload(page, v1Backup, "synthetic-rebind-v1-restore.json");
    await page.locator("#restore-preview").waitFor({ state: "visible" });
    const acceptedV1 = await apply(page, restoredV3.value);
    assert.deepEqual(
      withoutRevision(acceptedV1.value),
      withoutRevision(v1Backup),
    );
    await page.reload();
    await ready(page);
    assert.equal((await active(page)).schemaVersion, 1);
    assert.deepEqual(await backup(page), acceptedV1.value);
    await stage(page, "#migrate-upgrade-profile");
    assert.match(
      await page.locator("#restore-summary").textContent(),
      /1 ambiguous legacy unlocked entries require review/,
    );
    await cancel(page, acceptedV1);
    await stage(page, "#migrate-upgrade-profile");
    const migrated = await apply(page, acceptedV1.value);
    assert.deepEqual(migrated.value.upgradeProgress[ids.cost], {
      completion: "unknown",
      availability: "unknown",
      reviewRequired: true,
      legacyState: "unlocked",
    });
    assert.equal(
      migrated.value.upgradeProgress[ids.requirementSource].completion,
      "completed",
    );
    assert.equal(
      migrated.value.completion[ids.retired],
      "completed",
      "Unresolved retired v1 IDs remain archival, not reassigned by name",
    );
    assert(!Object.hasOwn(migrated.value.upgradeProgress, ids.added));
    assert.deepEqual(migrated.value.inventory, acceptedV1.value.inventory);
    assert.deepEqual(migrated.value.reserves, acceptedV1.value.reserves);

    // Invalid replacements cannot erase the recovered history or silently drop v3 fields.
    const malformed = structuredClone(v3Backup);
    delete malformed.watchPins;
    for (const [name, value, pattern] of [
      ["synthetic-missing-v3-field.json", malformed, /Invalid profile fields/],
      [
        "synthetic-cross-pack.json",
        { ...v3Backup, id: "test:other-pack", packId: "test:other-pack" },
        /different pack/,
      ],
    ]) {
      await upload(page, value, name);
      await page.waitForFunction(
        ({ source, flags }) => {
          const error = document.querySelector("#error");
          return (
            error &&
            !error.hidden &&
            new RegExp(source, flags).test(error.textContent)
          );
        },
        { source: pattern.source, flags: pattern.flags },
      );
      assert.match(await page.locator("#error").textContent(), pattern);
      assert.equal(await page.locator("#restore-preview").isVisible(), false);
      assert.deepEqual(await durable(page), migrated);
      assert.deepEqual(await active(page), migrated.value);
    }
    await upload(page, v3Backup, "synthetic-rebind-v3-cancel.json");
    await page.locator("#restore-preview").waitFor({ state: "visible" });
    await cancel(page, migrated);
    await upload(page, v3Backup, "synthetic-rebind-v3-restore.json");
    await page.locator("#restore-preview").waitFor({ state: "visible" });
    const roundtrip = await apply(page, migrated.value);
    assert.deepEqual(
      withoutRevision(roundtrip.value),
      withoutRevision(v3Backup),
      "v3 restore retains review flags, completion history, pins and explicit zero versus missing stock",
    );
    assert.deepEqual(await content(page), originalContent);
    await page.reload();
    await ready(page);
    assert.deepEqual(await backup(page), roundtrip.value);
    assert.deepEqual(errors, []);
  } finally {
    await context.close();
  }

  // Without a matching prior content snapshot, even apparently unchanged history
  // needs review; the UI must not claim that its cost comparison is complete.
  const unknownContext = await browser.newContext();
  unknownContext.on("page", (page) =>
    page.on("pageerror", (error) => errors.push(error.message)),
  );
  try {
    const page = await unknownContext.newPage();
    const original = await seed(page, base, fixtures, false);
    await page.goto(route(base));
    await ready(page);
    const before = await durable(page);
    await stage(page);
    assert.match(
      await page.locator("#restore-summary").textContent(),
      /Prior content facts unavailable/,
    );
    assert.match(
      await page.locator("#restore-summary").textContent(),
      /4 saved records require review/,
    );
    assert.match(
      await page.locator("#restore-summary").textContent(),
      /0 new definitions have no inferred progress/,
    );
    await cancel(page, before);
    await stage(page);
    const rebound = await apply(page, original);
    assertPlayerState(rebound.value, original);
    assert.equal(
      rebound.value.upgradeProgress[ids.unchanged].reviewRequired,
      true,
    );
    assert.equal(
      rebound.value.upgradeProgress[ids.retired].completion,
      "completed",
    );
    assert(!Object.hasOwn(rebound.value.upgradeProgress, ids.added));
    assert.deepEqual(errors, []);
  } finally {
    await unknownContext.close();
  }
  console.log(
    "Upgrade rebind browser acceptance passed: changed cost/objective/requirement evidence, retained completion/pins, retired/new IDs, cancel/CAS/recovery, v1/v3 file restore and unavailable prior content.",
  );
}
