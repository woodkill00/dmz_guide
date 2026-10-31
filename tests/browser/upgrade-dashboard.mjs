import assert from "node:assert/strict";
import { chromium, firefox, webkit } from "playwright";
import { pathToFileURL } from "node:url";
export async function runUpgradeDashboardTests({ browser, base }) {
  const context = await browser.newContext();
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const ready = () => page.locator("[data-complete-upgrade]").first().waitFor();
  const snapshot = () =>
    page.evaluate(async () => {
      const { state } = await import("/assets/src/client/common.mjs");
      const { upgradeProgress, revision, updatedAt, ...rest } = state.profile;
      return rest;
    });
  try {
    await page.goto(
      `${base}/upgrades/?pack=observed%3Aupgrade-review-20261026`,
    );
    await ready();
    assert(
      (await page.locator("#upgrade-catalog-summary").textContent()).includes(
        "28 visible upgrades",
      ),
    );
    await page.locator("#upgrade-quick").selectOption("tracked");
    assert.equal(await page.locator(".compact-progress").count(), 0);
    await page.locator("#upgrade-quick").selectOption("all");
    await page.locator("[data-track-upgrade]").first().click();
    await page.waitForFunction(
      () =>
        document.querySelector("[data-track-upgrade]")?.textContent ===
        "Tracked",
    );
    await page.locator("#upgrade-quick").selectOption("tracked");
    assert.equal(await page.locator(".compact-progress").count(), 1);
    await page.reload();
    await ready();
    assert.equal(await page.locator("#upgrade-quick").inputValue(), "tracked");
    assert.equal(await page.locator(".compact-progress").count(), 1);
    await page.locator("#upgrade-quick").selectOption("all");
    await page.locator("#upgrade-density").selectOption("comfortable");
    assert(
      (await page.getByText("Visible columns", { exact: true }).boundingBox())
        .height >= 43.9,
    );
    await page.getByText("Visible columns", { exact: true }).click();
    for (const column of ["materials", "readiness", "evidence"])
      await page.locator("#upgrade-show-" + column).uncheck();
    assert.equal(
      await page
        .locator('.upgrade-summary [data-upgrade-column="evidence"]')
        .first()
        .isVisible(),
      false,
    );
    assert.equal(
      await page.locator(".upgrade-critical").first().isVisible(),
      true,
    );
    await page.reload();
    await ready();
    assert.equal(
      await page.locator("#upgrade-density").inputValue(),
      "comfortable",
    );
    assert.equal(
      await page.locator("#upgrade-show-materials").isChecked(),
      false,
    );
    await page.getByText("Visible columns", { exact: true }).click();
    for (const column of ["materials", "readiness", "evidence"])
      await page.locator("#upgrade-show-" + column).check();
    await page.locator("#upgrade-density").selectOption("compact");
    const baselineProfile = await snapshot();
    await page.locator("[data-complete-upgrade]").first().click();
    await page.locator("#upgrade-progress-apply").click();
    await page.waitForFunction(
      () => document.querySelector("[data-complete-upgrade]")?.checked === true,
    );
    assert(
      (await page.locator("#upgrade-catalog-summary").textContent()).startsWith(
        "1 recorded",
      ),
    );
    assert(await page.locator(".upgrade-is-completed").first().isVisible());
    assert(await page.locator("#upgrade-undo").isVisible());
    await page.locator("#upgrade-quick").selectOption("incomplete");
    assert.equal(await page.locator(".compact-progress").count(), 27);
    await page.locator("#upgrade-undo").click();
    await page.locator("#upgrade-progress-cancel").click();
    assert.equal(await page.locator(".compact-progress").count(), 27);
    await page.locator("#upgrade-undo").click();
    await page.locator("#upgrade-progress-apply").click();
    await page.waitForFunction(
      () => document.querySelectorAll(".compact-progress").length === 28,
    );
    assert.deepEqual(await snapshot(), baselineProfile);
    await page.locator("#upgrade-quick").selectOption("all");
    // Undo expires after any newer successful profile save, including Track.
    await page.locator("[data-complete-upgrade]").first().click();
    await page.locator("#upgrade-progress-apply").click();
    await page.locator("#upgrade-undo").waitFor();
    await page.locator("[data-track-upgrade]:not([disabled])").first().click();
    await page.locator("#upgrade-undo").waitFor({ state: "hidden" });
    await page.locator("[data-complete-upgrade]").first().click();
    await page.locator("#upgrade-progress-apply").click();
    await page.locator("#upgrade-undo").waitFor();
    await page.locator("#spoiler-toggle").click();
    await page.locator("#upgrade-undo").waitFor({ state: "hidden" });
    assert.equal(await page.locator("#upgrade-feedback").textContent(), "");
    await page.waitForFunction(
      () => !document.querySelector("#spoiler-toggle").disabled,
    );
    await page.locator("#spoiler-toggle").click();
    await page.waitForFunction(
      () => !document.querySelector("#spoiler-toggle").disabled,
    );

    await page
      .locator(".compact-progress:not(.upgrade-is-completed) .upgrade-blocker")
      .first()
      .click();
    await page
      .locator("details[data-progress-detail][open] .upgrade-material-panel")
      .waitFor();
    await page.locator("details[data-progress-detail][open] > summary").click();
    await page
      .locator(
        ".compact-progress:not(.upgrade-is-completed) [data-open-upgrade]",
      )
      .first()
      .click();
    const panel = page.locator("details[data-progress-detail][open]");
    await panel.locator(".upgrade-material-panel").waitFor();
    assert(
      await panel
        .locator("h3", { hasText: "Direct materials for this upgrade" })
        .isVisible(),
    );
    const shortcuts = panel
      .getByText("Recipes, uses & locations", { exact: true })
      .first();
    await shortcuts.click();
    assert(
      await panel
        .getByText("Producing recipes:", { exact: false })
        .first()
        .isVisible(),
    );
    assert(
      (
        await panel.locator(".upgrade-material-card").first().textContent()
      ).includes("Missing"),
    );
    await page.evaluate(async () => {
      const { state, persist } = await import("/assets/src/client/common.mjs");
      const p = structuredClone(state.profile);
      for (const item of state.pack.items) p.inventory[item.id] = 0;
      await persist(p);
    });
    await page.reload();
    await ready();
    assert.equal(await page.locator("#upgrade-undo").isVisible(), false);
    await page.locator("#upgrade-quick").selectOption("missing");
    const expected = await page.evaluate(async () => {
      const { state } = await import("/assets/src/client/common.mjs");
      const { upgradeOverview } = await import(
        "/assets/src/domain/upgrade-overview.mjs"
      );
      return [
        ...upgradeOverview(state.pack, state.profile).rows.values(),
      ].filter((r) => r.missing).length;
    });
    assert.equal(await page.locator(".compact-progress").count(), expected);
    await page.locator("#upgrade-quick").selectOption("review");
    assert((await page.locator(".compact-progress").count()) > 0);
    await page.locator("#progress-clear").click();
    assert.equal(await page.locator("#upgrade-quick").inputValue(), "all");
    for (const width of [320, 390, 768, 1440])
      for (const theme of ["dark", "light"]) {
        await page.setViewportSize({ width, height: 1000 });
        await page.evaluate(
          (t) => (document.documentElement.dataset.theme = t),
          theme,
        );
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          ),
          false,
          `${width}/${theme} overflow`,
        );
      }
    await page.setViewportSize({ width: 320, height: 1000 });
    await page.evaluate(
      () => (document.documentElement.style.fontSize = "200%"),
    );
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
      "200% overflow",
    );
    // Give the second pack a source ID also present in the first pack. This is
    // synthetic content in this disposable context, never repository content.
    await page.evaluate(() => (document.documentElement.style.fontSize = ""));
    const shared = await page.evaluate(async () => {
      const { state } = await import("/assets/src/client/common.mjs");
      return state.pack.sources[0];
    });
    await page.locator("#upgrade-density").selectOption("comfortable");
    await page.locator("#progress-source").selectOption(shared.id);
    await page.locator("#pack-select").selectOption("demo:training-pack");
    await page.waitForFunction(
      () =>
        document.querySelector("#pack-select")?.value ===
          "demo:training-pack" &&
        document.querySelector("main")?.getAttribute("aria-busy") === "false",
    );
    await page.evaluate(async (source) => {
      const { state } = await import("/assets/src/client/common.mjs");
      const pack = structuredClone(state.pack);
      pack.sources.push({
        ...pack.sources[0],
        id: source.id,
        title: "Synthetic shared source for preference isolation",
      });
      pack.objectives.forEach((o) => o.sourceIds.push(source.id));
      const { validatePack } = await import("/assets/src/content/validate.mjs");
      validatePack(
        pack,
        await (await fetch("/assets/schemas/pack.schema.json")).json(),
      );
      const { commitRecord } = await import("/assets/src/storage/store.mjs");
      await commitRecord("content", pack.id, { pack, revision: 0 }, 0);
    }, shared);
    await page.reload();
    await page.waitForFunction(
      () =>
        document.querySelector("#pack-select")?.value ===
          "demo:training-pack" &&
        document.querySelector("main")?.getAttribute("aria-busy") === "false",
    );
    assert.equal(
      await page.locator("#upgrade-density").inputValue(),
      "compact",
    );
    await page
      .locator("#pack-select")
      .selectOption("observed:upgrade-review-20261026");
    await page.waitForFunction(
      () =>
        document.querySelector("#pack-select")?.value ===
          "observed:upgrade-review-20261026" &&
        document.querySelector("main")?.getAttribute("aria-busy") === "false",
    );
    await page.waitForFunction(
      (id) =>
        document.querySelector("#progress-source")?.value === id &&
        document.querySelector("#pack-select")?.value ===
          "observed:upgrade-review-20261026",
      shared.id,
    );
    assert.equal(
      await page.locator("#progress-source").inputValue(),
      shared.id,
    );
    assert.equal(
      await page.locator("#upgrade-density").inputValue(),
      "comfortable",
    );
    await page.locator("#pack-select").selectOption("demo:training-pack");
    await page.waitForFunction(
      () =>
        document.querySelector("#pack-select")?.value ===
          "demo:training-pack" &&
        document.querySelector("main")?.getAttribute("aria-busy") === "false",
    );
    await page.waitForFunction(
      () =>
        document.querySelector("#pack-select")?.value ===
          "demo:training-pack" &&
        document.querySelector("#progress-source")?.value === "" &&
        document.querySelector(".upgrade-list-shell")?.dataset.density ===
          "compact",
    );
    assert.equal(
      await page.locator("#progress-source").inputValue(),
      "",
      "source preference does not cross catalogs even with same source ID",
    );
    assert.equal(
      await page.locator("[data-complete-upgrade]").first().isDisabled(),
      true,
      "legacy upgrade profile remains read-only",
    );
    // Saved feedback must disappear immediately when its upgrade becomes hidden.
    await page
      .locator("#pack-select")
      .selectOption("observed:upgrade-review-20261026");
    await page.waitForFunction(
      () =>
        document.querySelector("#pack-select")?.value ===
          "observed:upgrade-review-20261026" &&
        document.querySelector("main")?.getAttribute("aria-busy") === "false",
    );
    const secretName = await page.evaluate(async () => {
      const { state } = await import("/assets/src/client/common.mjs");
      const pack = structuredClone(state.pack),
        row = pack.objectives.find((r) => r.id === "reported:bank-upgrade-ii");
      row.spoiler = true;
      const { validatePack } = await import("/assets/src/content/validate.mjs");
      validatePack(
        pack,
        await (await fetch("/assets/schemas/pack.schema.json")).json(),
      );
      const { commitRecord } = await import("/assets/src/storage/store.mjs");
      await commitRecord("content", pack.id, { pack, revision: 0 }, 0);
      return row.name;
    });
    await page.reload();
    await page.locator("#spoiler-toggle").waitFor();
    await page.waitForFunction(
      () =>
        document.querySelector("main")?.getAttribute("aria-busy") === "false",
    );
    await page.locator("#progress-clear").click();
    await page.locator("#spoiler-toggle").click();
    await page
      .locator('[data-complete-upgrade="reported:bank-upgrade-ii"]')
      .waitFor();
    await page
      .locator('[data-complete-upgrade="reported:bank-upgrade-ii"]')
      .click();
    await page.locator("#upgrade-progress-apply").click();
    await page.waitForFunction(() =>
      document
        .querySelector("#upgrade-feedback")
        ?.textContent.includes("saved completion"),
    );
    assert(
      (await page.locator("#upgrade-feedback").textContent()).includes(
        secretName,
      ),
    );
    await page.locator("#spoiler-toggle").click();
    assert.equal(await page.locator("#upgrade-feedback").textContent(), "");
    assert.equal(await page.locator("#upgrade-undo").isVisible(), false);
    assert.deepEqual(errors, []);
    console.log(
      browser.browserType().name(),
      "dashboard filters/preferences/summary/undo/panel/shortcuts/missing/themes PASS",
    );
  } catch (failure) {
    console.error("Dashboard failure", String(failure), "at", page.url());
    throw failure;
  } finally {
    await context.close();
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  for (const engine of [chromium, firefox, webkit]) {
    const browser = await engine.launch();
    try {
      await runUpgradeDashboardTests({
        browser,
        base: process.env.TEST_BASE || "http://127.0.0.1:4173",
      });
    } finally {
      await browser.close();
    }
  }
}
