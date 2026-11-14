import assert from "node:assert/strict";
import { openCatalogContext } from "./open-catalog-context.mjs";
import { readFile } from "node:fs/promises";
import { chromium, firefox, webkit } from "playwright";
import { pathToFileURL } from "node:url";
import {
  workbenchFixture,
  largeWorkbenchFixture,
} from "../helpers/collection-workbench.mjs";
export async function runWorkbenchTests({ browser, base }) {
  const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    }),
    page = await context.newPage();
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const ready = () =>
    page.waitForFunction(
      () =>
        document.querySelector("main")?.getAttribute("aria-busy") === "false",
    );
  const go = async (path = "collection", pack = "qa045:workbench") => {
    await page.goto(`${base}/${path}/?pack=${encodeURIComponent(pack)}`);
    await ready();
  };
  const durable = () =>
    page.evaluate(
      async () =>
        await (
          await import("/assets/src/storage/store.mjs")
        ).readRecord("profiles", "qa045:workbench"),
    );
  const closeWhy = async () => {
    await page.locator("#why-close").click();
    await page.waitForFunction(
      () => !document.querySelector("#collection-why").open,
    );
  };
  const preview = async (id = "craft:output-recipe") => {
    await page.locator(`[data-craft-id="${id}"]`).click();
    await page.waitForFunction(
      () => document.querySelector("#craft-dialog").open,
    );
  };
  const confirm = async () => {
    await page.locator("#craft-ack").check();
    await page.locator("#craft-apply").click();
    await page.waitForFunction(
      () => !document.querySelector("#craft-dialog").open,
    );
  };
  try {
    await go("inventory", "demo:training-pack");
    await page.evaluate(async (pack) => {
      const { validatePack } = await import("/assets/src/content/validate.mjs");
      validatePack(
        pack,
        await (await fetch("/assets/schemas/pack.schema.json")).json(),
      );
      const { commitRecord, saveProfile } = await import(
        "/assets/src/storage/store.mjs"
      );
      const { newProfile } = await import("/assets/src/domain/profile.mjs");
      await commitRecord("content", pack.id, { pack, revision: 0 }, 0);
      const profile = newProfile(pack);
      for (const i of pack.items) profile.inventory[i.id] = 0;
      Object.assign(profile.inventory, {
        "craft:wire": 20,
        "craft:part": 4,
        "craft:tool": 1,
      });
      profile.goals = [{ id: "craft:mission", quantity: 1 }];
      await saveProfile(profile, 0);
    }, workbenchFixture());
    await go();
    assert.equal(
      await page
        .locator('.site-nav [data-feature-id="collection"]')
        .getAttribute("aria-current"),
      "page",
    );
    assert.equal(await page.locator("#craft-undo").isDisabled(), true);
    assert.ok(await page.locator("#connected-actions-list li").count());
    assert.match(
      await page.locator("#connected-actions-list").textContent(),
      /Areas:/,
    );
    await page.locator("[data-next-why-item]").first().click();
    assert.equal(
      await page.locator("#collection-why").evaluate((node) => node.open),
      true,
    );
    await closeWhy();
    await page.locator('[data-why-item="craft:wire"]').click();
    assert.match(
      await page.locator("#why-body").textContent(),
      /Fictional collection mission/,
    );
    assert.match(
      await page.locator("#why-body").textContent(),
      /Fictional upgrade I/,
    );
    assert.match(
      await page.locator("#why-body").textContent(),
      /Fictional part-recipe/,
    );
    await closeWhy();
    await page.locator('[data-compare-item="craft:output"]').first().click();
    await page.locator("#why-route").selectOption("craft:output-recipe");
    await page.locator("#why-save-route").click();
    await page.waitForFunction(() =>
      document
        .querySelector("#save-status")
        .textContent.includes("Saved locally"),
    );
    await closeWhy();
    await page.locator("#shopping-hide-covered").uncheck();
    await page.locator("#shopping-state").selectOption("covered");
    assert(await page.locator('[data-shopping-item="craft:wire"]').count());
    await page.locator("#shopping-state").selectOption("all");
    await page.locator("#shopping-sort").selectOption("tracked");
    assert.equal(
      await page
        .locator("[data-shopping-item]")
        .first()
        .getAttribute("data-shopping-item"),
      "craft:wire",
    );
    const before = await durable();
    await preview();
    await page.locator("#craft-apply").click();
    assert.match(await page.locator("#craft-result").textContent(), /Confirm/);
    await page.locator("#craft-cancel").click();
    assert.deepEqual(await durable(), before);
    await preview();
    const input = await page.locator("#craft-batches").elementHandle();
    await page.locator("#craft-batches").fill("");
    assert(await page.locator("#craft-apply").isDisabled());
    await page.locator("#craft-batches").fill("2");
    assert(
      await page
        .locator("#craft-batches")
        .evaluate((el, old) => el === old, input),
    );
    await page.locator("#craft-ack").check();
    await page.locator("#craft-apply").evaluate((b) => {
      b.click();
      b.click();
    });
    await page.waitForFunction(
      () => !document.querySelector("#craft-dialog").open,
    );
    const crafted = await durable();
    assert.equal(crafted.value.revision, before.value.revision + 1);
    assert.equal(crafted.value.inventory["craft:part"], 0);
    assert.equal(crafted.value.inventory["craft:output"], 4);
    assert.equal(crafted.value.inventory["craft:tool"], 1);
    assert.deepEqual(crafted.value.goals, before.value.goals);
    assert.deepEqual(crafted.value.completion, before.value.completion);
    assert.deepEqual(
      crafted.value.upgradeProgress,
      before.value.upgradeProgress,
    );
    assert.deepEqual(crafted.value.spendHistory, before.value.spendHistory);
    await page.locator("#craft-undo").click();
    await page.locator("#craft-apply").click();
    await page.waitForFunction(
      () => !document.querySelector("#craft-dialog").open,
    );
    assert.deepEqual((await durable()).value.inventory, before.value.inventory);
    await page.reload();
    await ready();
    assert(await page.locator("#craft-undo").isDisabled());
    await preview("craft:unknown-recipe");
    assert(await page.locator("#craft-apply").isDisabled());
    assert.match(await page.locator("#craft-preview").textContent(), /unknown/);
    await page.locator("#craft-cancel").click();
    for (const width of [320, 390, 900, 1440, 1920])
      for (const theme of ["dark", "light"]) {
        await page.setViewportSize({ width, height: 1000 });
        await page.evaluate(
          (t) => (document.documentElement.dataset.theme = t),
          theme,
        );
        assert(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
        );
        await page.evaluate(
          () => (document.documentElement.style.fontSize = "200%"),
        );
        assert(
          await page.evaluate(
            () =>
              parseFloat(getComputedStyle(document.documentElement).fontSize) >=
              32,
          ),
        );
        assert(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
        );
        if (width <= 390)
          assert(
            await page
              .locator("[data-shopping-item] .actions button")
              .evaluateAll((buttons) =>
                buttons.every((b) => {
                  const text = b.firstChild;
                  if (!text || text.nodeType !== Node.TEXT_NODE) return false;
                  for (const match of text.textContent.matchAll(/[A-Za-z]+/g)) {
                    const range = document.createRange();
                    range.setStart(text, match.index);
                    range.setEnd(text, match.index + match[0].length);
                    if (
                      [...range.getClientRects()].filter(
                        (r) => r.width && r.height,
                      ).length !== 1
                    )
                      return false;
                  }
                  return b.getBoundingClientRect().height >= 44;
                }),
              ),
            `${width}/${theme}/200% action words remain whole`,
          );
        await page.evaluate(
          () => (document.documentElement.style.fontSize = ""),
        );
      }
    for (const width of [320, 1440])
      for (const theme of ["dark", "light"])
        for (const zoom of ["", "200%"]) {
          await page.setViewportSize({ width, height: 1000 });
          await page.evaluate(
            ({ theme, zoom }) => {
              document.documentElement.dataset.theme = theme;
              document.documentElement.style.fontSize = zoom;
            },
            { theme, zoom },
          );
          await preview();
          await page.locator("#craft-batches").scrollIntoViewIfNeeded();
          await page.locator("#craft-batches").focus();
          await page.evaluate(() => new Promise(requestAnimationFrame));
          const box = await page.locator("#craft-batches").boundingBox();
          await page.locator("#craft-batches").fill("");
          assert(await page.locator("#craft-apply").isDisabled());
          assert.deepEqual(
            await page.locator("#craft-batches").boundingBox(),
            box,
            `${width}/${theme}/${zoom} blank batch geometry`,
          );
          await page.locator("#craft-batches").fill("2");
          assert.deepEqual(
            await page.locator("#craft-batches").boundingBox(),
            box,
            `${width}/${theme}/${zoom} valid batch geometry`,
          );
          await page.locator("#craft-cancel").click();
        }
    await page.evaluate(() => (document.documentElement.style.fontSize = ""));
    await page.setViewportSize({ width: 1440, height: 1000 });
    // Determinate quota failure retains candidate, durable value and previous snapshot.
    const failureBefore = await durable();
    await page.evaluate(() => {
      const put = IDBObjectStore.prototype.put;
      window.__restorePut = () => (IDBObjectStore.prototype.put = put);
      IDBObjectStore.prototype.put = function (...args) {
        if (this.name === "profiles")
          throw new DOMException("Synthetic craft quota", "QuotaExceededError");
        return put.apply(this, args);
      };
    });
    await preview();
    await page.locator("#craft-ack").check();
    await page.locator("#craft-apply").click();
    await page.waitForFunction(
      () => !document.querySelector("#craft-export").hidden,
    );
    assert.deepEqual(await durable(), failureBefore);
    const [candidateDownload] = await Promise.all([
      page.waitForEvent("download"),
      page.locator("#craft-export").click(),
    ]);
    const candidate = JSON.parse(
      await readFile(await candidateDownload.path(), "utf8"),
    );
    assert.equal(candidate.inventory["craft:output"], 2);
    await page.locator("#craft-cancel").click();
    assert(await page.locator("#craft-recovery").isVisible());
    await openCatalogContext(page);
    await page.locator("#pack-select").selectOption("demo:training-pack");
    assert.equal(
      await page.locator("#pack-select").inputValue(),
      "qa045:workbench",
    );
    const url = page.url();
    if (!(await page.locator(".nav-more").evaluate((n) => n.open)))
      await page.locator(".nav-more > summary").click();
    await page.locator('.site-nav [data-feature-id="inventory"]').click();
    assert.equal(page.url(), url);
    assert(await page.locator("#craft-recovery").isVisible());
    page.once("dialog", (d) => d.accept());
    await page.locator("#candidate-discard").click();
    await page.evaluate(() => window.__restorePut());
    assert.deepEqual(await durable(), failureBefore);
    // Real CAS: a separate writer saves while this preview keeps its original revision.
    await preview();
    await page.evaluate(async () => {
      const { state } = await import("/assets/src/client/common.mjs");
      const { saveProfile } = await import("/assets/src/storage/store.mjs");
      const p = structuredClone(state.profile);
      p.reserves["craft:wire"] = 1;
      await saveProfile(p, state.revision);
    });
    const foreignSaved = await durable();
    await page.locator("#craft-ack").check();
    await page.locator("#craft-apply").click();
    await page.waitForFunction(
      () => !document.querySelector("#craft-export").hidden,
    );
    assert.deepEqual(await durable(), foreignSaved);
    await page.locator("#craft-cancel").click();
    page.once("dialog", (d) => d.accept());
    await page.locator("#candidate-discard").click();
    await page.reload();
    await ready();
    await page.locator("#shopping-hide-covered").uncheck();
    await page.locator("#shopping-state").selectOption("all");
    await page.locator('[data-why-item="craft:wire"]').click();
    const locations = workbenchFixture().locations;
    for (const l of locations) {
      await page.locator(`[data-route-add="${l.id}"]`).click();
      await page.waitForFunction(
        (id) => document.querySelector(`[data-route-add="${id}"]`)?.disabled,
        l.id,
      );
    }
    await closeWhy();
    assert.equal(await page.locator("[data-route-remove]").count(), 2);
    await page.locator('[data-route-move="0"][data-delta="1"]').click();
    await page.waitForFunction(
      (name) =>
        document
          .querySelector("#collection-route-stops li")
          ?.textContent.includes(name),
      locations[1].name,
    );
    await page.reload();
    await ready();
    assert.match(
      await page.locator("#collection-route-stops li").first().textContent(),
      new RegExp(locations[1].name),
    );
    await page.locator("#collection-route-open").click();
    await page.waitForURL("**/maps/**");
    await ready();
    assert(await page.locator("#collection-route-panel").isVisible());
    assert.match(
      await page.locator("#collection-route-panel").textContent(),
      /not roads/,
    );
    assert.equal(
      await page.locator("#collection-route-layer polyline").count(),
      1,
    );
    assert.equal(await page.locator("[data-collection-stop]").count(), 2);
    await page.locator('[data-collection-stop="0"]').click();
    assert.equal(
      await page.locator("#location-detail h2").textContent(),
      locations[1].name,
    );
    const mappedURL = page.url();
    await openCatalogContext(page);
    await page.locator("#pack-select").selectOption("demo:training-pack");
    await ready();
    assert(await page.locator("#collection-route-panel").isHidden());
    assert(!new URL(page.url()).searchParams.has("collectionRoute"));
    await page.reload();
    await ready();
    assert(await page.locator("#error").isHidden());
    await page.goto(mappedURL);
    await ready();
    await page
      .getByRole("link", { name: "Edit collection route", exact: true })
      .click();
    await ready();
    page.once("dialog", (d) => d.accept());
    await page.locator("#collection-route-clear").click();
    await page.waitForFunction(
      () => document.querySelector("#collection-route-open").disabled,
    );
    assert.equal(await page.locator("[data-route-remove]").count(), 0);
    // Hold the real SHA256 digest: navigation and map painting must reject stale work.
    const routeURL = await page.evaluate(
      async (ids) => {
        const { state } = await import("/assets/src/client/common.mjs");
        const { saveCollectionRoute, createCollectionRouteContext } =
          await import("/assets/src/domain/collection-route.mjs");
        await saveCollectionRoute(state.pack, state.profile, ids);
        return createCollectionRouteContext(state.pack, state.profile, ids);
      },
      locations.map((l) => l.id),
    );
    await page.reload();
    await ready();
    await page.evaluate(() => {
      const original = SubtleCrypto.prototype.digest;
      let once = true;
      SubtleCrypto.prototype.digest = function (...args) {
        if (
          once &&
          new TextDecoder().decode(args[1]).startsWith('["qa045:workbench"')
        ) {
          once = false;
          window.__qaHeld = true;
          const receiver = this;
          return new Promise(
            (resolve, reject) =>
              (window.__qaRelease = () => {
                SubtleCrypto.prototype.digest = original;
                return original
                  .apply(receiver, args)
                  .then((v) => resolve(v), reject);
              }),
          );
        }
        return original.apply(this, args);
      };
    });
    await page.locator("#collection-route-open").click();
    await page.waitForFunction(() => window.__qaHeld === true);
    await page.locator('[data-route-move="0"][data-delta="1"]').click();
    assert.equal(await page.locator("[data-route-remove]").count(), 2);
    await openCatalogContext(page);
    await page.locator("#pack-select").selectOption("demo:training-pack");
    await ready();
    await page.evaluate(() => window.__qaRelease());
    await page.waitForFunction(() =>
      document.querySelector("#error").textContent.includes("changed"),
    );
    assert.equal(new URL(page.url()).pathname, "/collection/");
    assert.equal(
      await page.locator("#pack-select").inputValue(),
      "demo:training-pack",
    );
    assert(await page.locator("#collection-route-open").isDisabled());
    assert.equal(await page.locator("[data-route-remove]").count(), 0);
    await go();
    await context.addInitScript(() => {
      if (
        location.pathname !== "/maps/" ||
        sessionStorage.getItem("qa045-hold-map") !== "1"
      )
        return;
      sessionStorage.removeItem("qa045-hold-map");
      const original = SubtleCrypto.prototype.digest;
      let once = true;
      SubtleCrypto.prototype.digest = function (...args) {
        if (
          once &&
          new TextDecoder().decode(args[1]).startsWith('["qa045:workbench"')
        ) {
          once = false;
          window.__qaHeld = true;
          const receiver = this;
          return new Promise(
            (resolve, reject) =>
              (window.__qaRelease = () => {
                SubtleCrypto.prototype.digest = original;
                return original
                  .apply(receiver, args)
                  .then((v) => resolve(v), reject);
              }),
          );
        }
        return original.apply(this, args);
      };
    });
    await page.evaluate(() => sessionStorage.setItem("qa045-hold-map", "1"));
    await page.goto(base + routeURL);
    await page.waitForFunction(() => window.__qaHeld === true);
    await page.evaluate(async () => {
      const { state, getCatalog } = await import(
        "/assets/src/client/common.mjs"
      );
      const pack = await getCatalog("demo:training-pack");
      const { newProfile } = await import("/assets/src/domain/profile.mjs");
      document.dispatchEvent(new Event("pack-changing"));
      state.pack = pack;
      state.profile = newProfile(pack);
      state.revision = 0;
      await window.__qaRelease();
    });
    await ready();
    assert(await page.locator("#collection-route-panel").isHidden());
    assert.equal(
      await page.locator("#collection-route-layer polyline").count(),
      0,
    );
    assert.equal(await page.locator("#location-list button").count(), 0);
    await go();
    await page.evaluate((url) => {
      const token = new URL(url, location.href).searchParams.get(
          "collectionRoute",
        ),
        key = `dmz-collection-context:${token}`,
        data = JSON.parse(sessionStorage.getItem(key));
      data.createdAt = Date.now() - 7200001;
      sessionStorage.setItem(key, JSON.stringify(data));
    }, routeURL);
    await page.goto(base + routeURL);
    await ready();
    assert.match(await page.locator("#error").textContent(), /expired/);
    assert.equal(
      await page.locator("#collection-route-layer polyline").count(),
      0,
    );
    assert(!new URL(page.url()).searchParams.has("collectionRoute"));
    await openCatalogContext(page);
    await page.locator("#pack-select").selectOption("demo:training-pack");
    await ready();
    assert((await page.locator("#location-list button").count()) > 0);
    // Exact5000-item fixture, bounded mounted rows and full filtered export.
    await page.evaluate(async (pack) => {
      const { validatePack } = await import("/assets/src/content/validate.mjs");
      validatePack(
        pack,
        await (await fetch("/assets/schemas/pack.schema.json")).json(),
      );
      const { commitRecord, saveProfile } = await import(
        "/assets/src/storage/store.mjs"
      );
      const { newProfile } = await import("/assets/src/domain/profile.mjs");
      await commitRecord("content", pack.id, { pack, revision: 0 }, 0);
      const p = newProfile(pack);
      for (const i of pack.items) p.inventory[i.id] = 0;
      await saveProfile(p, 0);
    }, largeWorkbenchFixture());
    await go("collection", "qa045:large");
    assert.equal(await page.locator("[data-shopping-item]").count(), 50);
    assert.match(
      await page.locator("#shopping-count").textContent(),
      /5000 matching/,
    );
    assert.equal(
      await page.locator("#coverage-list .collection-item").count(),
      50,
    );
    await page.locator('[data-shopping-page="1"]').click();
    assert.equal(await page.locator("[data-shopping-item]").count(), 50);
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.locator("#shopping-export").click(),
    ]);
    const text = await readFile(await download.path(), "utf8");
    assert.match(text, /Fictional item 0000/);
    assert.match(text, /Fictional item 4999/);
    await page.locator("#shopping-query").fill("Fictional item 4999");
    assert.equal(await page.locator("[data-shopping-item]").count(), 1);
    assert.match(await page.locator("#shopping-list").textContent(), /4999/);
    await go();
    await page.evaluate(async () => {
      const { readRecord, commitRecord, saveProfile } = await import(
        "/assets/src/storage/store.mjs"
      );
      const { newProfile } = await import("/assets/src/domain/profile.mjs");
      const original = await readRecord("content", "qa045:workbench");
      const pack = structuredClone(original.value.pack);
      pack.id = "qa045:bounded-readiness";
      const seed = pack.objectives[0];
      for (let i = 0; i < 500; i++) {
        const r = {
          ...structuredClone(seed),
          id: `dag:n${i}`,
          name: `Fictional DAG ${i}`,
          track: "dmz-order",
          prerequisites: Array.from(
            { length: Math.min(i, 50) },
            (_, j) => `dag:n${i - j - 1}`,
          ),
        };
        delete r.upgrade;
        pack.objectives.push(r);
      }
      pack.recipes[0].prerequisites = ["dag:n499"];
      for (let i = 0; i < 20; i++)
        pack.recipes.push({
          ...structuredClone(pack.recipes[0]),
          id: `craft:dense-alternate-${i}`,
        });
      const { validatePack } = await import("/assets/src/content/validate.mjs");
      validatePack(
        pack,
        await (await fetch("/assets/schemas/pack.schema.json")).json(),
      );
      await commitRecord("content", pack.id, { pack, revision: 0 }, 0);
      const p = newProfile(pack);
      for (const i of pack.items) p.inventory[i.id] = 100;
      for (const r of pack.objectives) p.completion[r.id] = "completed";
      await saveProfile(p, 0);
    });
    await go("collection", "qa045:bounded-readiness");
    for (const filter of ["all", "ready", "covered"]) {
      await page.locator("#recipe-state").selectOption(filter);
      assert.match(
        await page.locator("#recipe-count").textContent(),
        /Readiness review is incomplete/,
      );
    }
    assert.deepEqual(errors, []);
    console.log(
      `${browser.browserType().name()} 045 why/routes/filters/priorities/craftCancelApplyUndo/quotaCAS/unknown/themes200/5000/export PASS`,
    );
  } finally {
    await context.close();
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  for (const engine of [chromium, firefox, webkit]) {
    const browser = await engine.launch();
    try {
      await runWorkbenchTests({
        browser,
        base: process.env.TEST_BASE || "http://127.0.0.1:4173",
      });
    } finally {
      await browser.close();
    }
  }
