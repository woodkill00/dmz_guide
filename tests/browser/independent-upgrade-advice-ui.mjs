// Independent browser advisory UX. All data/mechanics/holdings are fictional QA.
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
const PACK = "qa023:synthetic-upgrades",
  ITEM = "qa023:regulator",
  SPARE = "qa023:spare";
const route = (base, path) =>
  `${base}/${path}/?pack=${encodeURIComponent(PACK)}`;
async function ready(page) {
  await page.waitForFunction(
    () => document.querySelector("main")?.getAttribute("aria-busy") === "false",
  );
}
async function profile(page) {
  return page.evaluate(
    async (id) =>
      (await (await import("/assets/src/storage/store.mjs")).loadProfile(id))
        .value,
    PACK,
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
const row = (page, id = ITEM) => page.locator(`[data-advice-item="${id}"]`);
async function number(page, label, id = ITEM) {
  return row(page, id)
    .locator("dt", { hasText: new RegExp(`^${label}$`) })
    .evaluate((n) => n.nextElementSibling.textContent.trim());
}
async function amounts(
  page,
  { required, keep, search, upgradeGap, reserveGap },
) {
  assert.equal(
    await number(page, "Known direct requirement"),
    String(required),
  );
  assert.equal(
    (await row(page).locator("[data-advice-keep]").textContent()).trim(),
    String(keep),
  );
  assert.equal(
    (await row(page).locator("[data-advice-search]").textContent()).trim(),
    String(search),
  );
  if (upgradeGap !== undefined)
    assert.equal(await number(page, "Upgrade gap"), String(upgradeGap));
  if (reserveGap !== undefined)
    assert.equal(
      await number(page, "Unfilled reserve gap"),
      String(reserveGap),
    );
}

export async function runIndependentUpgradeAdviceUI({
  browser,
  base,
  captureScreenshots = true,
  prefix = browser.browserType().name(),
}) {
  await mkdir("test-results/upgrade023-independent", { recursive: true });
  const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    }),
    evidence = { syntheticStateOnly: true, scenarios: [], screenshots: [] };
  let failure;
  try {
    const page = await context.newPage();
    await page.goto(`${base}/planner/?pack=observed%3Aupgrade-review-20261026`);
    await ready(page);
    const observedRow = page.locator(
      '[data-advice-item="observed:power-regulator"]',
    );
    assert.match(await observedRow.textContent(), /Not entered/);
    assert.equal(
      (await observedRow.locator("[data-advice-keep]").textContent()).trim(),
      "Not known",
    );
    assert.equal(
      (await observedRow.locator("[data-advice-search]").textContent()).trim(),
      "Not known",
    );
    // Entered stock cannot certify consumption for newly added source-only tiers.
    await page.evaluate(async () => {
      const { state } = await import("/assets/src/client/common.mjs");
      const { saveProfile } = await import("/assets/src/storage/store.mjs");
      const p = structuredClone(state.profile);
      p.inventory["observed:power-regulator"] = 6;
      await saveProfile(p, state.revision);
    });
    await page.reload();
    await ready(page);
    assert.equal(
      await page.locator("#upgrade-scope").inputValue(),
      "all-known-incomplete",
    );
    for (const field of ["keep", "search"])
      assert.equal(
        (
          await observedRow.locator(`[data-advice-${field}]`).textContent()
        ).trim(),
        "Not known",
      );
    assert.match(await observedRow.textContent(), /Consumption not confirmed/);
    evidence.scenarios.push(
      "Expanded all-known scope with synthetic stock6 withholds Keep/Search because source-only consumption is unconfirmed",
    );
    // Focus only the two original owner-confirmed material rows (5 + 10).
    // MIA III's new unknown cash cost must not invalidate known material arithmetic.
    await page.evaluate(async () => {
      const { state } = await import("/assets/src/client/common.mjs");
      const { saveProfile } = await import("/assets/src/storage/store.mjs");
      const p = structuredClone(state.profile);
      p.goals = [
        { id: "observed:dog-tag-case-upgrade-ii", quantity: 1 },
        { id: "observed:mia-recovery-discount-iii", quantity: 1 },
      ];
      await saveProfile(p, state.revision);
    });
    await page.reload();
    await ready(page);
    await page.selectOption("#upgrade-scope", "focused");
    assert.equal(
      (await observedRow.locator("[data-advice-keep]").textContent()).trim(),
      "6",
    );
    assert.equal(
      (await observedRow.locator("[data-advice-search]").textContent()).trim(),
      "9",
    );
    assert.match(
      await page.locator("#upgrade-advice-output").textContent(),
      /Known requirements only.*additional costs may exist/s,
    );
    assert.match(
      await page.locator("#upgrade-advice-output").textContent(),
      /not current-build|not.*current.*build/i,
    );
    assert(!/Consumption not confirmed/.test(await observedRow.textContent()));
    evidence.scenarios.push(
      "Focused original Dog Tag II + MIA III owner-confirmed material rows preserve known-direct Keep6/Search9; absent stock remains unknown and build/prerequisite completeness stays unverified",
    );
    // Create a validated *separate* local pack; never relabel real observations as confirmed mechanics.
    await page.evaluate(
      async ({ PACK, ITEM, SPARE }) => {
        const { state } = await import("/assets/src/client/common.mjs");
        const { validatePack } = await import(
          "/assets/src/content/validate.mjs"
        );
        const { newProfile } = await import("/assets/src/domain/profile.mjs");
        const { commitRecord, saveProfile } = await import(
          "/assets/src/storage/store.mjs"
        );
        const p = structuredClone(state.pack),
          source = structuredClone(p.sources[0]),
          item = structuredClone(p.items[3]),
          objective = structuredClone(p.objectives[0]);
        p.id = PACK;
        p.title = "FICTIONAL QA023 upgrade accounting";
        p.description =
          "Synthetic browser acceptance only. Not gameplay evidence.";
        p.contentVersion = "synthetic.1";
        p.game = { id: "qa023-fictional", mode: "dmz", build: "synthetic-1" };
        p.coverage = {
          expectedTotal: null,
          note: "Synthetic test scope, not game data.",
        };
        source.id = "source:qa023";
        source.title = "Fictional QA mechanics";
        source.type = "original-fixture";
        source.supports = "Synthetic costs and mechanics solely for tests.";
        source.url = "https://example.com/fictional-qa023";
        source.provenance = {
          kind: "web",
          observationKey: "qa023-synthetic",
          lineageKey: "qa023-synthetic",
          captureDate: null,
          buildStatus: "known",
        };
        p.sources = [source];
        const makeItem = (id, name) => ({
          ...structuredClone(item),
          id,
          name,
          description: "Fictional QA material",
          aliases: [],
          sourceIds: [source.id],
          status: "fictional",
        });
        p.items = [
          makeItem(ITEM, "Synthetic Power Regulator"),
          makeItem(
            SPARE,
            "Synthetic spare material for Hidden reactor authorization",
          ),
          makeItem("qa023:other", "Synthetic unrelated material"),
        ];
        const makeObjective = (
          id,
          name,
          amount,
          itemId = ITEM,
          spoiler = false,
        ) => ({
          ...structuredClone(objective),
          id,
          name,
          description: "Fictional browser acceptance upgrade",
          status: "fictional",
          sourceIds: [source.id],
          requirementsKnown: true,
          spoiler,
          requirements: [
            {
              itemId,
              quantity: amount,
              consumption: "consumed",
              status: "fictional",
              sourceIds: [source.id],
            },
          ],
          upgrade: {
            tierLabel: null,
            prerequisiteStatus: "known",
            observationKeys: [id.replace(":", "-")],
          },
        });
        p.objectives = [
          makeObjective("qa023:first", "Synthetic first upgrade", 5),
          makeObjective("qa023:second", "Synthetic second upgrade", 10),
          makeObjective(
            "qa023:hidden-upgrade",
            "Hidden reactor authorization",
            99,
            "qa023:other",
            true,
          ),
        ];
        for (const group of [
          "recipes",
          "guides",
          "maps",
          "locations",
          "claims",
          "assets",
        ])
          p[group] = [];
        // The location is visible by itself but its parent map is spoiler-protected.
        p.maps = [
          {
            id: "qa023:hidden-map",
            name: "Hidden reactor authorization annex",
            axis: "x-right-y-down",
            coordinateSpace: "qa023-unit-square",
            coordinateVersion: "1",
            extent: [0, 0, 100, 100],
            floors: ["ground"],
            origin: "top-left",
            sourceIds: [source.id],
            status: "fictional",
            spoiler: true,
          },
        ];
        p.locations = [
          {
            id: "qa023:child-location",
            name: "Synthetic child of protected map",
            category: "supply",
            coordinates: { floor: "ground", x: 20, y: 30 },
            description: "Fictional QA location only; not gameplay evidence.",
            grid: null,
            itemIds: [ITEM],
            mapId: "qa023:hidden-map",
            sourceIds: [source.id],
            spawnKind: "possible",
            status: "observed",
          },
        ];
        validatePack(
          p,
          await (await fetch("/assets/schemas/pack.schema.json")).json(),
        );
        await commitRecord("content", p.id, { pack: p, revision: 0 }, 0);
        const f = newProfile(p);
        f.inventory[ITEM] = 6;
        f.goals = [{ id: "qa023:first", quantity: 1 }];
        f.upgradeProgress = {
          "qa023:first": {
            completion: "incomplete",
            availability: "available",
            reviewRequired: false,
          },
          "qa023:second": {
            completion: "incomplete",
            availability: "available",
            reviewRequired: false,
          },
        };
        await saveProfile(f, 0);
      },
      { PACK, ITEM, SPARE },
    );
    await page.goto(route(base, "planner"));
    await ready(page);
    const original = await profile(page);
    assert.equal(
      await page.locator("#upgrade-scope").inputValue(),
      "all-known-incomplete",
    );
    await amounts(page, {
      required: 15,
      keep: 6,
      search: 9,
      upgradeGap: 9,
      reserveGap: 0,
    });
    await page.selectOption("#upgrade-scope", "focused");
    await amounts(page, { required: 5, keep: 5, search: 0 });
    assert(
      await row(page).isVisible(),
      "Fully stocked unfinished requirement stays in Keep",
    );
    assert.deepEqual(
      await profile(page),
      original,
      "Scope toggle is transient and never changes goals or stock",
    );
    await page.selectOption("#upgrade-scope", "all-known-incomplete");
    assert.equal(
      await row(page).locator("details li").count(),
      2,
      "Shared row explains two contributing upgrades",
    );
    for (const href of await row(page)
      .locator("details li a")
      .evaluateAll((nodes) => nodes.map((n) => n.getAttribute("href"))))
      assert(new URL(href, base).searchParams.get("pack") === PACK);
    const html = await page.locator("main").innerHTML();
    assert(
      !html.includes("Hidden reactor authorization") &&
        !html.includes("qa023:hidden-upgrade"),
      "Hidden upgrade does not leak through DOM names/count reasons or controls",
    );
    assert.match(
      await page.locator("#upgrade-advice-output").textContent(),
      /spoiler|protect|omitted/i,
    );
    assert.equal(
      await row(page).locator("[data-advice-location]").count(),
      0,
      "A protected parent map cannot expose a location-reference action",
    );
    await page.fill("#watch-query", "Hidden reactor authorization");
    assert.equal(
      await page.locator("#watch-item option").count(),
      0,
      "Watch search must not match protected terms embedded in a public item name",
    );
    await page.fill("#watch-query", "");

    assert(
      !/safe to sell|always keep/i.test(
        await page.locator("#upgrade-advice-output").textContent(),
      ),
    );
    evidence.scenarios.push(
      "All-known15/6/9 versus Focused5/5/0, fully stocked Keep, unchanged goals/profile, two contributor links in correct pack, hidden uses omitted",
    );

    await stockAndReserve(18, 5);
    await amounts(page, {
      required: 15,
      keep: 13,
      search: 2,
      upgradeGap: 2,
      reserveGap: 0,
    });
    await stockAndReserve(6, 9);
    await amounts(page, {
      required: 15,
      keep: 0,
      search: 18,
      upgradeGap: 15,
      reserveGap: 3,
    });
    if (captureScreenshots) await snapshot("reserve-above-stock");
    await stockAndReserve(24, 9);
    await amounts(page, {
      required: 15,
      keep: 15,
      search: 0,
      upgradeGap: 0,
      reserveGap: 0,
    });
    evidence.scenarios.push(
      "Real inventory UI A05/A06 + collect-to-target invariant: reserve/upgrade gaps separated, H6R9 needs18 and H24 clears both",
    );

    await page.selectOption("#watch-item", SPARE);
    let revision = (await profile(page)).revision;
    await page.locator("#watch-add").focus();
    await page.keyboard.press("Enter");
    await saved(page, revision);
    assert.equal((await profile(page)).watchPins.includes(SPARE), true);
    assert.match(
      await row(page, SPARE).textContent(),
      /No known need in this scope/,
    );
    assert.match(await row(page, SPARE).textContent(), /Your watch pin/);
    assert.equal(await number(page, "Held", SPARE), "Not entered");
    assert.equal(
      (
        await row(page, SPARE).locator("[data-advice-search]").textContent()
      ).trim(),
      "Not known",
    );
    await page.selectOption("#upgrade-scope", "focused");
    assert((await profile(page)).watchPins.includes(SPARE));
    await page.selectOption("#upgrade-scope", "all-known-incomplete");
    await row(page).locator("[data-advice-detail]").click();
    await page.waitForURL("**/local/**");
    await ready(page);
    assert.equal((await profile(page)).packId, PACK);
    assert.match(
      await page.locator("#item-upgrade-advice").textContent(),
      /Synthetic first upgrade/,
    );
    assert.match(
      await page.locator("#item-upgrade-advice").textContent(),
      /Synthetic second upgrade/,
    );
    assert.match(
      await page.locator("#item-upgrade-advice").textContent(),
      /Locations not verified/,
    );
    if (captureScreenshots) await snapshot("item-known-uses");
    evidence.scenarios.push(
      "Keyboard watch pin survives scope changes without inventing held quantity; item-detail selected-pack links show both unfinished uses and unknown locations",
    );

    await page.goto(route(base, "progression"));
    await ready(page);
    for (const id of ["qa023:first", "qa023:second"]) {
      revision = (await profile(page)).revision;
      await page
        .locator(`[data-upgrade-id="${id}"][data-upgrade-field="completion"]`)
        .selectOption("completed");
      await page.click("#upgrade-progress-apply");
      await saved(page, revision);
    }
    await page.goto(route(base, "planner"));
    await ready(page);
    const completed = await profile(page);
    assert.equal(completed.inventory[ITEM], 24);
    assert.equal(completed.reserves[ITEM], 9);
    assert(completed.watchPins.includes(SPARE));
    assert.deepEqual(completed.goals, original.goals);
    await amounts(page, {
      required: 0,
      keep: 0,
      search: 0,
      upgradeGap: 0,
      reserveGap: 0,
    });
    assert.match(await row(page).textContent(), /No known need in this scope/);
    assert.match(await row(page).textContent(), /Your protected reserve/);
    assert.match(await row(page, SPARE).textContent(), /Your watch pin/);
    if (captureScreenshots) await snapshot("completed-user-rules");
    evidence.scenarios.push(
      "Completing both upgrades removes demand only; stock24/reserve9/focus/pin retained with separate no-known-need and user-rule reasons",
    );

    await failedWatchPinRecovery();
    // Preserve the old unknown-consumption gate on a separate explicitly fictional pack.
    const unknownPack = "qa023:unknown-consumption";
    await page.evaluate(
      async ({ unknownPack, ITEM }) => {
        const { state } = await import("/assets/src/client/common.mjs");
        const { validatePack } = await import(
          "/assets/src/content/validate.mjs"
        );
        const { newProfile } = await import("/assets/src/domain/profile.mjs");
        const { commitRecord, saveProfile } = await import(
          "/assets/src/storage/store.mjs"
        );
        const p = structuredClone(state.pack);
        p.id = unknownPack;
        p.title = "FICTIONAL unknown-consumption gate";
        p.objectives = p.objectives.filter((o) => o.id === "qa023:first");
        p.objectives[0].requirements[0].consumption = "unknown";
        validatePack(
          p,
          await (await fetch("/assets/schemas/pack.schema.json")).json(),
        );
        await commitRecord("content", p.id, { pack: p, revision: 0 }, 0);
        const f = newProfile(p);
        f.inventory[ITEM] = 6;
        await saveProfile(f, 0);
      },
      { unknownPack, ITEM },
    );
    await page.goto(`${base}/planner/?pack=${encodeURIComponent(unknownPack)}`);
    await ready(page);
    assert.equal(
      (await row(page).locator("[data-advice-keep]").textContent()).trim(),
      "Not known",
    );
    assert.equal(
      (await row(page).locator("[data-advice-search]").textContent()).trim(),
      "Not known",
    );
    assert.match(await row(page).textContent(), /Consumption not confirmed/);
    evidence.scenarios.push(
      "A separate fictional unknown-consumption fixture remains numeric-gated despite entered stock; scoped owner confirmation never certifies other packs",
    );

    async function failedWatchPinRecovery() {
      const observedPack = "observed:upgrade-review-20261026",
        observedItem = "observed:power-regulator";
      for (const surface of ["planner", "local"])
        for (const mode of ["quota", "cas"]) {
          const isolated = await browser.newContext();
          await isolated.addInitScript(() => {
            const put = IDBObjectStore.prototype.put;
            IDBObjectStore.prototype.put = function (...args) {
              if (window.failPinQuota)
                throw new DOMException(
                  "Synthetic pin quota",
                  "QuotaExceededError",
                );
              return put.apply(this, args);
            };
          });
          try {
            const p = await isolated.newPage();
            const target = `${base}/${surface}/?pack=${encodeURIComponent(observedPack)}${surface === "local" ? "&id=" + encodeURIComponent(observedItem) : ""}`;
            await p.goto(target);
            await ready(p);
            await p.evaluate(async (item) => {
              const { state } = await import("/assets/src/client/common.mjs");
              const next = structuredClone(state.profile);
              next.inventory[item] = 6;
              await (
                await import("/assets/src/storage/store.mjs")
              ).saveProfile(next, state.revision);
            }, observedItem);
            await p.reload();
            await ready(p);
            const activeBefore = await p.evaluate(async () =>
              structuredClone(
                (await import("/assets/src/client/common.mjs")).state.profile,
              ),
            );
            if (mode === "cas") {
              const newer = await isolated.newPage();
              await newer.goto(
                `${base}/inventory/?pack=${encodeURIComponent(observedPack)}`,
              );
              await ready(newer);
              await newer.evaluate(async (item) => {
                const { state } = await import("/assets/src/client/common.mjs");
                const next = structuredClone(state.profile);
                next.inventory[item] = 7;
                await (
                  await import("/assets/src/storage/store.mjs")
                ).saveProfile(next, state.revision);
              }, observedItem);
            } else
              await p.evaluate(() => {
                window.failPinQuota = true;
              });
            const stored = () =>
              p.evaluate(
                async (id) =>
                  (await import("/assets/src/storage/store.mjs")).loadProfile(
                    id,
                  ),
                observedPack,
              );
            const durableBefore = await stored();
            const pin =
              surface === "local"
                ? p.locator(`[data-item-pin="${observedItem}"]`)
                : p.locator(
                    `[data-advice-item="${observedItem}"] [data-watch-pin]`,
                  );
            await pin.focus();
            await p.keyboard.press("Enter");
            await p
              .locator("#watch-pin-recovery")
              .waitFor({ state: "visible" });
            assert.deepEqual(
              await stored(),
              durableBefore,
              `${surface}/${mode}: failed pin leaves durable/previous unchanged`,
            );
            assert.deepEqual(
              await p.evaluate(async () =>
                structuredClone(
                  (await import("/assets/src/client/common.mjs")).state.profile,
                ),
              ),
              activeBefore,
              `${surface}/${mode}: committed pin state not falsely changed`,
            );
            const pending = p.waitForEvent("download");
            await p.click("#watch-pin-export");
            const download = await pending;
            const candidate = JSON.parse(
              await readFile(await download.path(), "utf8"),
            );
            assert(
              candidate.watchPins.includes(observedItem),
              `${surface}/${mode}: failed pin intent survives in explicit candidate export`,
            );
            assert.deepEqual(
              { ...candidate, watchPins: activeBefore.watchPins },
              activeBefore,
              `${surface}/${mode}: pin candidate changes no inventory/progress/revision`,
            );
            await p.click("#watch-pin-discard");
            await p.locator("#watch-pin-recovery").waitFor({ state: "hidden" });
            assert.deepEqual(await stored(), durableBefore);
          } finally {
            await isolated.close();
          }
        }
      evidence.scenarios.push(
        "Planner and item-detail watch pin × quota/CAS retain explicit export candidate while active/durable unchanged; explicit discard does not save or retry",
      );
    }

    async function stockAndReserve(held, reserved) {
      await page.goto(route(base, "inventory"));
      await ready(page);
      const old = (await profile(page)).revision;
      await page
        .locator(`[data-field="inventory"][data-id="${ITEM}"]`)
        .fill(String(held));
      await page
        .locator(`[data-field="reserves"][data-id="${ITEM}"]`)
        .fill(String(reserved));
      await page
        .getByRole("button", { name: "Save inventory", exact: true })
        .click();
      await saved(page, old);
      await page.goto(route(base, "planner"));
      await ready(page);
    }
    async function snapshot(name) {
      const path = `test-results/upgrade023-independent/${prefix}-synthetic-${name}-390.png`;
      await page.screenshot({ path, fullPage: true });
      evidence.screenshots.push(path);
    }
  } catch (error) {
    failure = error;
    evidence.failure = { message: error.message, stack: error.stack };
    throw error;
  } finally {
    evidence.result = failure ? "FAIL" : "PASS";
    await writeFile(
      `test-results/upgrade023-independent/${prefix}-advice-ui.json`,
      JSON.stringify(evidence, null, 2),
    );
    await context.close();
  }
  console.log(
    "Independent synthetic Keep/Search UI passed",
    evidence.scenarios,
  );
}
