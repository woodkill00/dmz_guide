import { revealTrackerControl } from "./tracker-controls.mjs";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
export async function runRefinedInventoryTests({
  browser,
  base,
  captureScreenshots = true,
}) {
  const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    }),
    page = await context.newPage();
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const ready = async () => {
    await page.waitForFunction(
      () =>
        document.querySelector("main")?.getAttribute("aria-busy") === "false" &&
        document.querySelector("[data-inventory-item],.compact-progress"),
    );
    assert.equal(
      await page.evaluate(async () => {
        const { state } = await import("/assets/src/client/common.mjs");
        return !!state.pack && !state.loading;
      }),
      true,
    );
  };
  const stock = (id) =>
    page.locator(`[data-id="${id}"][data-field="inventory"]`);
  const reserve = (id) =>
    page.locator(`[data-id="${id}"][data-field="reserves"]`);
  const evidence = {
    engine: browser.browserType().name(),
    syntheticStateOnly: true,
    checks: [],
    measurements: [],
  };
  try {
    await page.goto(`${base}/inventory/?pack=demo%3Atraining-pack`);
    await ready();
    const first = await page
      .locator("[data-inventory-item]")
      .first()
      .getAttribute("data-inventory-item");
    await stock(first).fill("7");
    await revealTrackerControl(
      page,
      `[data-id="${first}"][data-field="reserves"]`,
    );
    await reserve(first).fill("9");
    const before = await stock(first).boundingBox();
    await stock(first).fill("8");
    assert.deepEqual(
      await stock(first).boundingBox(),
      before,
      "quantity changes keep control geometry",
    );
    await page.locator("#inventory-collapse").click();
    assert.equal(await stock(first).isVisible(), false);
    await page.locator("#inventory-expand").click();
    assert.equal(await stock(first).inputValue(), "8");
    await page.locator("#inventory-query").fill("no synthetic match");
    await page.locator("#inventory-query").fill("");
    assert.equal(await stock(first).inputValue(), "8");
    await page.locator("#inventory-form button[type=submit]").click();
    await page.waitForFunction(() =>
      document.querySelector("#save-status").textContent.includes("Saved"),
    );
    await page.reload();
    await ready();
    assert.equal(await stock(first).inputValue(), "8");
    assert.equal(await reserve(first).inputValue(), "9");
    await stock(first).fill("2");
    await page.locator("#cancel-inventory").click();
    await page.waitForFunction(() =>
      document.querySelector("#save-status").textContent.includes("canceled"),
    );
    assert.equal(await stock(first).inputValue(), "8");
    evidence.checks.push(
      "stable input geometry; collapse/search retain raw drafts; save/reload; reserve above stock; explicit Cancel",
    );
    await page.locator(`[data-show-use="${first}"][aria-expanded]`).click();
    await page.locator(`[data-clear-stock="${first}"]`).click();
    assert.equal(await stock(first).inputValue(), "");
    await page.locator("#inventory-form button[type=submit]").click();
    await page.waitForFunction(() =>
      document.querySelector("#save-status").textContent.includes("Saved"),
    );
    await page.reload();
    await ready();
    assert.equal(await stock(first).inputValue(), "");
    evidence.checks.push("clear stock preserves unknown rather than zero");
    await stock(first).fill("3");
    const recipeItem = page.locator('[data-inventory-item="demo:board"]');
    await recipeItem.locator("[data-show-use][aria-expanded]").click();
    const recipes = recipeItem.locator('[data-uses-kind="recipes"] a');
    assert((await recipes.count()) > 0);
    const href = await recipes.first().getAttribute("href");
    assert.match(href, /pack=demo%3Atraining-pack&id=/);
    assert.equal(await recipes.first().getAttribute("target"), "_blank");
    const [reference] = await Promise.all([
      context.waitForEvent("page"),
      recipes.first().click(),
    ]);
    await reference.waitForLoadState();
    assert(reference.url().includes("/local/?pack=demo%3Atraining-pack&id="));
    await reference.close();
    assert.equal(await stock(first).inputValue(), "3");
    await page.locator("#cancel-inventory").click();
    await page.waitForFunction(() =>
      document.querySelector("#save-status").textContent.includes("canceled"),
    );
    evidence.checks.push(
      "real exact-recipe reference opens owning pack in another tab and preserves dirty inventory draft",
    );
    await stock(first).fill("10");
    await page.locator("#inventory-form button[type=submit]").click();
    await page.waitForFunction(() =>
      document.querySelector("#save-status").textContent.includes("Saved"),
    );
    await stock(first).focus();
    await page.keyboard.press("ControlOrMeta+A");
    await page.keyboard.type("1e");
    assert.equal(
      await stock(first).evaluate((node) => node.validity.badInput),
      true,
    );
    await page.locator("#inventory-query").fill(first);
    await page.locator("#inventory-query").fill("");
    assert.equal(
      await stock(first).evaluate((node) => node.validity.customError),
      true,
      "remount retains incomplete number as invalid",
    );
    await page.locator("#inventory-form button[type=submit]").click();
    await page.waitForFunction(() =>
      document
        .querySelector("#error")
        .textContent.includes("focused inventory"),
    );
    assert.equal(
      await stock(first).evaluate((node) => node === document.activeElement),
      true,
    );
    assert.equal(
      await page.evaluate(async (id) => {
        const { state } = await import("/assets/src/client/common.mjs");
        const { loadProfile } = await import("/assets/src/storage/store.mjs");
        return (await loadProfile(state.pack.id)).value.inventory[id];
      }, first),
      10,
      "invalid draft never overwrites prior durable stock",
    );
    await stock(first).fill("4");
    assert.equal(
      await stock(first).evaluate((node) => node.validity.valid),
      true,
    );
    await page.locator("#inventory-form button[type=submit]").click();
    await page.waitForFunction(() =>
      document.querySelector("#save-status").textContent.includes("Saved"),
    );
    assert.equal(
      await page.locator("#error").isVisible(),
      false,
      "Successful correction clears stale inventory validation notice",
    );
    await stock(first).fill("99");
    await page.locator("#cancel-inventory").click();
    await page.waitForFunction(() =>
      document.querySelector("#save-status").textContent.includes("canceled"),
    );
    evidence.checks.push(
      "actual keyboard partial exponent retained invalid across filter remount; Save blocked and focused; correction recovers without losing durable stock",
    );
    assert.equal(
      await page.locator("#error").isVisible(),
      false,
      "Cancel clears stale inventory validation notice",
    );
    // Extend a valid admitted synthetic pack to cover group/page invalid recovery.
    await page.evaluate(async () => {
      const { state } = await import("/assets/src/client/common.mjs");
      const { validatePack } = await import("/assets/src/content/validate.mjs");
      const p = structuredClone(state.pack),
        template = p.items[0];
      const extraItems = 5000 - p.items.length;
      for (let i = 0; i < extraItems; i++)
        p.items.push({
          ...template,
          id: `demo:window-${i}`,
          name: `Fictional window ${i}`,
          category:
            i < 60 ? "First synthetic section" : "Second synthetic section",
        });
      for (let i = 0; i < 60; i++)
        p.recipes.push({
          ...p.recipes[0],
          id: `demo:reference-${i}`,
          name: `Fictional recipe ${i}`,
          inputs: [{ itemId: "demo:board", quantity: 1, consumed: true }],
        });
      const mission = structuredClone(
        p.objectives.find((row) => row.track === "campaign"),
      );
      Object.assign(mission, {
        id: "demo:usage-mission",
        name: "Fictional usage mission",
        spoiler: false,
        track: "dmz-order",
        requirements: [{ itemId: "demo:board", quantity: 1, consumed: true }],
        scope: { ...mission.scope, mode: p.game.mode },
      });
      p.objectives.push(mission);
      validatePack(
        p,
        await (await fetch("/assets/schemas/pack.schema.json")).json(),
      );
      const { commitRecord } = await import("/assets/src/storage/store.mjs");
      // Use the admitted-content store rather than a second UI data source.
      await commitRecord("content", p.id, { pack: p, revision: 0 }, 0);
    });
    await page.reload();
    await ready();
    await page.waitForFunction(
      () => document.querySelectorAll("[data-inventory-item]").length === 50,
    );
    assert.equal(
      await page.evaluate(
        async () =>
          (await import("/assets/src/client/common.mjs")).state.pack.items
            .length,
      ),
      5000,
    );
    assert.equal(await page.locator("[data-inventory-item]").count(), 50);
    // This scale journey exercises catalog-order rows; the product now defaults to name/rarity.
    await revealTrackerControl(page, "#inventory-sort");
    await page.locator("#inventory-sort").selectOption("source");
    await page.locator('[data-show-use="demo:board"][aria-expanded]').click();
    assert(
      !(
        await page
          .locator('[data-uses-item="demo:board"][data-uses-kind="missions"]')
          .textContent()
      ).includes("Recorded completed"),
    );
    await page
      .locator("details")
      .filter({ has: page.locator("#completion-fields") })
      .locator(":scope > summary")
      .click();
    await page
      .locator('[data-completion="demo:usage-mission"]')
      .selectOption("completed");
    await page.waitForFunction(() => {
      const control = document.querySelector(
        '[data-completion="demo:usage-mission"]',
      );
      return (
        control &&
        !control.disabled &&
        control.value === "completed" &&
        document.activeElement === control
      );
    });
    assert.equal(
      await page.evaluate(async () => {
        const { state } = await import("/assets/src/client/common.mjs");
        return (
          !state.saving &&
          state.profile.completion["demo:usage-mission"] === "completed"
        );
      }),
      true,
    );
    await page.locator('[data-show-use="demo:board"][aria-expanded]').click();
    assert.match(
      await page
        .locator('[data-uses-item="demo:board"][data-uses-kind="missions"]')
        .textContent(),
      /Recorded completed/,
    );
    evidence.checks.push(
      "successful legacy mission correction reprojects use-completion badge immediately and restores the replacement control focus",
    );
    await page
      .locator("#inventory-section")
      .selectOption("Second synthetic section");
    const sectionItem = await page
      .locator("[data-inventory-item]")
      .first()
      .getAttribute("data-inventory-item");
    await stock(sectionItem).fill("7");
    assert(
      await page
        .locator(".inventory-group > h3")
        .allTextContents()
        .then((names) =>
          names.every((name) => name.includes("Second synthetic section")),
        ),
    );
    await page.locator("#inventory-section").selectOption("");
    await revealTrackerControl(page, "#inventory-sort");
    await page.locator("#inventory-sort").selectOption("name");
    await page.locator("#inventory-query").fill(sectionItem);
    assert.equal(await stock(sectionItem).inputValue(), "7");
    await page.locator("#inventory-query").fill("");
    await revealTrackerControl(page, "#inventory-sort");
    await page.locator("#inventory-sort").selectOption("source");
    await revealTrackerControl(page, "#inventory-use-filter");
    await page.locator("#inventory-use-filter").selectOption("recipes");
    assert(
      (await page.locator('[data-inventory-item="demo:board"]').count()) > 0,
    );
    await revealTrackerControl(page, "#inventory-use-filter");
    await page.locator("#inventory-use-filter").selectOption("");
    evidence.checks.push(
      "section and recipe-use filters, source/name sort and search preserve independent offpage drafts",
    );
    await revealTrackerControl(
      page,
      '[data-show-use="demo:board"][data-kind="recipes"]',
    );
    await page
      .locator('[data-show-use="demo:board"][data-kind="recipes"]')
      .click();
    const recipeList = page.locator(
      '[data-uses-item="demo:board"][data-uses-kind="recipes"]',
    );
    assert.equal(await recipeList.locator("li").count(), 50);
    await recipeList.getByRole("button", { name: "Next uses" }).click();
    assert((await recipeList.locator("li").count()) < 50);
    await recipeList.getByRole("button", { name: "Previous uses" }).click();
    assert.equal(await recipeList.locator("li").count(), 50);
    evidence.checks.push(
      "named +N recipe disclosure and bounded50 reference pages next/previous work without changing stock",
    );
    const original = await page
      .locator("[data-inventory-item]")
      .first()
      .getAttribute("data-inventory-item");
    await stock(original).fill("-1");
    await page.locator("#inventory-next").click();
    const second = await page
      .locator("[data-inventory-item]")
      .first()
      .getAttribute("data-inventory-item");
    await stock(second).fill("12");
    await page.locator("#inventory-collapse").click();
    await page.locator("#inventory-query").fill("no match");
    await page.locator("#inventory-form button[type=submit]").click();
    await stock(original).waitFor({ state: "visible" });
    assert.equal(await stock(original).inputValue(), "-1");
    assert.equal(
      await stock(original).evaluate((n) => n === document.activeElement),
      true,
    );
    await stock(original).fill("1");
    await page.locator("#inventory-next").click();
    assert.equal(await stock(second).inputValue(), "12");
    evidence.checks.push(
      "admitted 5000-item catalog mounts only50 rows across sections; offpage invalid Save opens correct group/page and focuses raw invalid field; other page raw draft retained",
    );
    await page.locator("#inventory-expand").click();
    // Position a lower row just behind the sticky Save bar, then reach it by Tab.
    await page.setViewportSize({ width: 1440, height: 1000 });
    const lower = page.locator('[data-field="inventory"]').nth(12);
    await lower.evaluate((node) => {
      const rect = node.getBoundingClientRect();
      scrollBy(0, rect.bottom - innerHeight + 5);
      node
        .closest(".inventory-entry")
        .previousElementSibling.querySelector("[data-show-use][aria-expanded]")
        .focus({ preventScroll: true });
    });
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press("Tab");
      if (await lower.evaluate((node) => node === document.activeElement))
        break;
    }
    assert.equal(
      await lower.evaluate((node) => node === document.activeElement),
      true,
    );
    const visibleFocus = await lower.evaluate((node) => {
      const r = node.getBoundingClientRect(),
        bar = document
          .querySelector(".inventory-save-bar")
          .getBoundingClientRect();
      return r.bottom <= bar.top && r.top >= 0;
    });
    assert(visibleFocus, "keyboard focus remains above sticky Save bar");
    evidence.checks.push(
      "actual lower-row Tab focus is revealed above sticky Save bar without remounting quantity controls; Cancel clears stale validation",
    );
    await page.locator("#cancel-inventory").click();
    await page.waitForFunction(() =>
      document.querySelector("#save-status").textContent.includes("canceled"),
    );
    assert.equal(
      await page.locator("#error").isVisible(),
      false,
      "Cancel clears stale invalid-field message",
    );
    await page.locator("#inventory-expand").click();
    for (const width of [1440, 1024, 390, 320])
      for (const theme of ["dark", "light"]) {
        await page.setViewportSize({ width, height: 1000 });
        await page.evaluate(
          (theme) => (document.documentElement.dataset.theme = theme),
          theme,
        );
        const measure = await page
          .locator(".inventory-entry:visible")
          .first()
          .evaluate((n) => ({
            height: n.getBoundingClientRect().height,
            overflow: document.documentElement.scrollWidth > innerWidth,
          }));
        assert.equal(
          measure.overflow,
          false,
          `inventory overflow ${width}/${theme}`,
        );
        evidence.measurements.push({
          view: "inventory",
          width,
          theme,
          ...measure,
        });
        if (captureScreenshots && [1440, 390].includes(width)) {
          await mkdir("test-results/refined043", { recursive: true });
          await page
            .locator(".inventory-entry:visible")
            .first()
            .scrollIntoViewIfNeeded();
          await page.screenshot({
            path: `test-results/refined043/${evidence.engine}-inventory-${width}-${theme}.png`,
          });
        }
      }
    await writeFile("dist/__refined043-zoom.css", ":root{font-size:200%}");
    const zoomStyle = await page.addStyleTag({
      url: base + "/__refined043-zoom.css",
    });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
      "inventory 320px real 200% text overflow",
    );
    await zoomStyle.evaluate((node) => node.remove());
    await page.goto(
      `${base}/upgrades/?pack=observed%3Aupgrade-review-20261026`,
    );
    await ready();
    assert.equal(
      await page.locator("#progress-track").inputValue(),
      "dmz-upgrade",
    );
    await revealTrackerControl(page, "#upgrade-layout");
    await page.locator("#upgrade-layout").selectOption("flat");
    assert.equal(await page.locator("#progress-track").isDisabled(), true);
    assert.equal(
      await page.locator("details[data-progress-detail][open]").count(),
      0,
    );
    await page.locator("#progress-clear").click();
    assert.equal(
      await page.locator("#progress-track").inputValue(),
      "dmz-upgrade",
    );
    await page.locator("[data-track-upgrade]").first().click();
    await page.waitForFunction(
      () =>
        document.querySelector("[data-track-upgrade]")?.textContent ===
        "Tracked",
    );
    const entries = page.locator("details[data-progress-detail]");
    await entries.nth(0).locator(":scope > summary").click();
    await entries.nth(1).locator(":scope > summary").click();
    await page.waitForFunction(
      () => !document.querySelectorAll("details[data-progress-detail]")[0].open,
    );
    assert.equal(await entries.nth(0).evaluate((n) => n.open), false);
    assert.equal(await entries.nth(1).evaluate((n) => n.open), true);
    const control = entries.nth(1).locator('[data-upgrade-field="completion"]');
    await control.selectOption("completed");
    await page
      .locator("#upgrade-progress-confirm")
      .waitFor({ state: "visible" });
    await page.locator("#upgrade-progress-cancel").click();
    assert.notEqual(await control.inputValue(), "completed");
    await entries.nth(1).locator(":scope > summary").click();
    evidence.checks.push(
      "dedicated Upgrades locked track and clear filters; canonical goal Track; one detail at a time; native progress confirmation Cancel leaves committed state",
    );
    for (const width of [1440, 1024, 390, 320])
      for (const theme of ["dark", "light"]) {
        await page.setViewportSize({ width, height: 1000 });
        await page.evaluate(
          (theme) => (document.documentElement.dataset.theme = theme),
          theme,
        );
        const measure = await page
          .locator(".compact-progress")
          .first()
          .evaluate((n) => ({
            height: n.getBoundingClientRect().height,
            overflow: document.documentElement.scrollWidth > innerWidth,
          }));
        assert.equal(
          measure.overflow,
          false,
          `upgrades overflow ${width}/${theme}`,
        );
        evidence.measurements.push({
          view: "upgrades",
          width,
          theme,
          ...measure,
        });
        if (captureScreenshots && [1440, 390].includes(width)) {
          await page
            .locator(".compact-progress")
            .first()
            .scrollIntoViewIfNeeded();
          await page.screenshot({
            path: `test-results/refined043/${evidence.engine}-upgrades-${width}-${theme}.png`,
          });
        }
      }
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      const check = async () => {
        for (const row of [
          page.locator(".compact-progress").nth(0),
          page.locator(".compact-progress").nth(1),
        ]) {
          const button = await row
              .locator("[data-track-upgrade]")
              .boundingBox(),
            summary = await row
              .locator(":scope > details > summary")
              .boundingBox();
          assert(button && summary);
          assert(
            button.y + button.height <= summary.y ||
              summary.y + summary.height <= button.y ||
              button.x + button.width <= summary.x ||
              summary.x + summary.width <= button.x,
            `Track/Tracked and Details must not overlap at ${width}`,
          );
        }
      };
      await check();
      const enlarged = await page.addStyleTag({
        url: base + "/__refined043-zoom.css",
      });
      await check();
      await enlarged.evaluate((node) => node.remove());
    }
    evidence.checks.push(
      "Track and Tracked action bounds never intersect Details at320/390 and200%text",
    );
    const zoomStyleUpgrade = await page.addStyleTag({
      url: base + "/__refined043-zoom.css",
    });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
      "upgrades 320px real 200% text overflow",
    );
    await zoomStyleUpgrade.evaluate((node) => node.remove());
    evidence.checks.push(
      "both views retain document bounds at 320px / 200% actual root text size",
    );
    assert.deepEqual(errors, []);
  } catch (error) {
    console.error(
      "Refined failure state",
      await page.evaluate(async () => ({
        query: document.querySelector("#inventory-query")?.value,
        fields: document
          .querySelector("#inventory-fields")
          ?.innerHTML.slice(0, 150),
        count: (await import("/assets/src/client/common.mjs")).state.pack?.items
          .length,
      })),
      await page.locator("#save-status").textContent(),
      await page.locator("#error").textContent(),
    );
    throw error;
  } finally {
    await mkdir("test-results/refined043", { recursive: true });
    await writeFile(
      `test-results/refined043/${evidence.engine}.json`,
      JSON.stringify(evidence, null, 2),
    );
    await context.close();
  }
}
