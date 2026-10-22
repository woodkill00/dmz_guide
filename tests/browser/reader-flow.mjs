import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";

async function probeReloadSemantics({ browser, base }) {
  const results = [];
  const engine = browser.browserType().name();
  for (const scenario of ["static", "reader"])
    for (const method of ["playwright", "native"]) {
      const context = await browser.newContext();
      const page = await context.newPage();
      try {
        if (scenario === "static") {
          await page.route("**/__reader-reload-control.html", (route) =>
            route.fulfill({
              status: 200,
              contentType: "text/html",
              body: "<!doctype html><html><head><title>Reload control</title></head><body><h1>Static reload control</h1></body></html>",
            }),
          );
          await page.goto(base + "/__reader-reload-control.html");
        } else {
          await page.goto(base + "/planner/?pack=demo%3Atraining-pack");
          await page.waitForFunction(
            () =>
              document.querySelector("main")?.getAttribute("aria-busy") ===
              "false",
          );
          await page.selectOption("#goal-select", "demo:board-batch");
          await page.locator("#goal-quantity").fill("3");
          await page.locator('#goal-form button[type="submit"]').click();
          const control = page
            .locator(
              '[data-need-item="demo:wire"][data-need-destination="local"]',
            )
            .first();
          await control.focus();
          await control.press("Enter");
          await page.waitForURL(/\/local\/\?context=/);
          await page.waitForSelector("#local-records h2");
        }
        const snapshot = () =>
          page.evaluate(() => ({
            url: location.href,
            historyLength: history.length,
            readyState: document.readyState,
            navigation: performance
              .getEntriesByType("navigation")
              .map(({ type, name }) => ({ type, name })),
          }));
        const before = await snapshot();
        if (method === "playwright") await page.reload();
        else
          await Promise.all([
            page.waitForNavigation({ waitUntil: "load" }),
            page.evaluate(() => {
              setTimeout(() => location.reload(), 0);
            }),
          ]);
        let reader = null;
        if (scenario === "reader") {
          await page.waitForSelector("#local-records h2");
          reader = await page.evaluate(async () => {
            const { state } = await import("/assets/src/client/common.mjs");
            return {
              packId: state.pack?.id,
              goals: state.profile?.goals,
              revision: state.revision,
              target: document.querySelector("#local-records h2")?.textContent,
              error: document.querySelector("#error")?.textContent,
            };
          });
        }
        const after = await snapshot();
        results.push({ engine, scenario, method, before, after, reader });
        console.log(
          "Reader reload controlled experiment",
          JSON.stringify(results.at(-1)),
        );
        await writeFile(
          `test-results/reader-reload-controls-${engine}.json`,
          JSON.stringify(results, null, 2),
        );
      } finally {
        await context.close();
      }
    }
  for (const result of results) {
    assert.equal(result.after.url, result.before.url);
    assert.equal(result.after.readyState, "complete");
    if (result.method === "native") {
      assert.equal(
        result.after.historyLength,
        result.before.historyLength,
        "Native refresh must not add history",
      );
      assert.equal(
        result.after.navigation[0]?.type,
        "reload",
        "Native refresh must really reload",
      );
    }
    if (result.reader) {
      assert.equal(result.reader.packId, "demo:training-pack");
      assert.equal(result.reader.revision, 1);
      assert.deepEqual(result.reader.goals, [
        { id: "demo:board-batch", quantity: 3 },
      ]);
      assert.match(result.reader.target, /wire/i);
      assert.equal(result.reader.error, "");
    }
  }
}

export async function runReaderFlowTests({
  browser,
  base,
  captureScreenshots = true,
}) {
  await mkdir("test-results", { recursive: true });
  await probeReloadSemantics({ browser, base });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const navigationEvents = [];
  const recordNavigation = (event) => {
    navigationEvents.push({ timestamp: Date.now(), ...event });
    if (navigationEvents.length > 100) navigationEvents.shift();
  };
  await context.addInitScript(() => {
    for (const type of ["pageshow", "pagehide"])
      window.addEventListener(type, (event) =>
        console.info(
          "reader-lifecycle " +
            JSON.stringify({
              type,
              persisted: event.persisted,
              url: location.href,
            }),
        ),
      );
  });
  const page = await context.newPage();
  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame())
      recordNavigation({ type: "navigation", url: frame.url() });
  });
  page.on("console", (message) => {
    if (message.text().startsWith("reader-lifecycle "))
      recordNavigation(JSON.parse(message.text().slice(17)));
  });
  const checkpoint = async (stage) =>
    recordNavigation(
      await page.evaluate(
        (stage) => ({
          type: "checkpoint",
          stage,
          url: location.href,
          historyLength: history.length,
          readyState: document.readyState,
          navigation: performance
            .getEntriesByType("navigation")
            .slice(-10)
            .map(({ type, name }) => ({ type, name })),
        }),
        stage,
      ),
    );
  const ready = () =>
    page.waitForFunction(
      () =>
        document.querySelector("main")?.getAttribute("aria-busy") !== "true" &&
        document.querySelector("#save-status")?.textContent.includes("Saved"),
    );
  await mkdir("test-results", { recursive: true });
  try {
    await page.goto(`${base}/planner/?pack=demo%3Atraining-pack`);
    await ready();
    assert(await page.locator("#add-first-goal").isVisible());
    assert(
      (
        await page
          .locator('#plan-output a[href*="/inventory/"]')
          .getAttribute("href")
      ).includes("pack=demo%3Atraining-pack"),
    );
    await page.locator("#add-first-goal").click();
    assert.equal(
      await page
        .locator("#goal-select")
        .evaluate((n) => n === document.activeElement),
      true,
    );
    assert(
      !(await page.locator("#plan-output").textContent()).includes(
        "Executable-now trial schedule",
      ),
    );
    await page.selectOption("#goal-select", "demo:board-batch");
    await page.locator("#goal-quantity").fill("3");
    await page.locator('#goal-form button[type="submit"]').click();
    await page.waitForSelector('[data-need-item="demo:wire"]');
    assert.match(
      await page.locator("#goal-form").textContent(),
      /Additional output quantity/,
    );
    const itemControl = page
      .locator('[data-need-item="demo:wire"][data-need-destination="local"]')
      .first();
    assert.equal(await itemControl.evaluate((node) => node.tagName), "BUTTON");
    const targetSize = await itemControl.boundingBox();
    assert(targetSize.width >= 44 && targetSize.height >= 44);
    await itemControl.focus();
    await checkpoint("before-item-activation");
    await itemControl.press("Enter");
    await page.waitForURL(/\/local\/\?context=/);
    await page.waitForSelector("#local-records h2");
    assert(!page.url().includes("wire") && !page.url().includes("pack="));
    assert.match(await page.locator("#local-records").textContent(), /wire/i);
    const itemURL = page.url();
    await checkpoint("before-local-reload");
    const historyBeforeRefresh = await page.evaluate(() => history.length);
    // Hosted static and reader controls prove Firefox's automation reload adds
    // history; exercise the actual user-equivalent browser refresh instead.
    await Promise.all([
      page.waitForNavigation({ waitUntil: "load" }),
      page.evaluate(() => {
        setTimeout(() => location.reload(), 0);
      }),
    ]);
    await page.waitForSelector("#local-records h2");
    assert.equal(page.url(), itemURL);
    assert.equal(
      await page.evaluate(() => history.length),
      historyBeforeRefresh,
    );
    assert.equal(
      await page.evaluate(
        () => performance.getEntriesByType("navigation")[0]?.type,
      ),
      "reload",
    );
    await checkpoint("after-local-reload");
    await page.goBack();
    await checkpoint("after-back");
    try {
      await page.waitForSelector('[data-need-item="demo:wire"]');
    } catch (failure) {
      const state = await page
        .evaluate(async () => {
          const { state } = await import("/assets/src/client/common.mjs");
          return {
            url: location.href,
            title: document.title,
            error: document.querySelector("#error")?.textContent,
            status: document.querySelector("#save-status")?.textContent,
            output: document
              .querySelector("#plan-output")
              ?.textContent?.slice(0, 4000),
            controls: [
              ...document.querySelectorAll('[data-need-item="demo:wire"]'),
            ].map((n) => ({
              visible: !!n.getClientRects().length,
              disabled: n.disabled,
            })),
            packId: state.pack?.id,
            goals: state.profile?.goals,
            revision: state.revision,
            loading: state.loading,
            saving: state.saving,
          };
        })
        .catch((error) => ({
          diagnosticError: error.message,
          url: page.url(),
        }));
      const evidence = { navigationEvents, state };
      console.log("Reader Back failure evidence", JSON.stringify(evidence));
      await writeFile(
        "test-results/reader-back-failure.json",
        JSON.stringify(evidence, null, 2),
      );
      if (captureScreenshots)
        await page.screenshot({
          path: "test-results/reader-back-failure.png",
          fullPage: true,
        });
      throw failure;
    }
    const locationControl = page
      .locator('[data-need-item="demo:wire"][data-need-destination="maps"]')
      .first();
    await locationControl.focus();
    await locationControl.press("Space");
    await page.waitForURL(/\/maps\/\?context=/);
    await page.waitForFunction(() =>
      document
        .querySelector("#location-count")
        ?.textContent.includes("matching"),
    );
    assert(!page.url().includes("pack="));
    assert.match(
      await page.locator("#goal-context").textContent(),
      /exact catalog/,
    );
    assert(await page.locator("#location-list button").count());
    // Token destination mismatch fails before any record is rendered.
    await page.goto(page.url().replace("/maps/", "/local/"));
    await page.waitForSelector("#error:not([hidden])");
    assert.equal(await page.locator("#local-records h2").count(), 0);
    assert.match(await page.locator("#error").textContent(), /unavailable/);
    // Same-version private override must not silently resolve the previous context.
    await page.goto(`${base}/planner/?pack=demo%3Atraining-pack`);
    await ready();
    const staleURL = await page.evaluate(async () => {
      const { state } = await import("/assets/src/client/common.mjs");
      const { createReaderContext } = await import(
        "/assets/src/domain/reader-flow.mjs"
      );
      const url = await createReaderContext(state.pack, "demo:wire", "local");
      const { commitRecord } = await import("/assets/src/storage/store.mjs");
      const changed = structuredClone(state.pack);
      changed.items.find((r) => r.id === "demo:wire").name =
        "Synthetic private changed wire";
      await commitRecord(
        "content",
        changed.id,
        { pack: changed, payloads: [] },
        0,
      );
      return url;
    });
    await page.goto(base + staleURL);
    await page.waitForSelector("#error:not([hidden])");
    assert.equal(await page.locator("#local-records h2").count(), 0);
    assert.match(await page.locator("#error").textContent(), /changed/);
    await page.goto(`${base}/planner/?pack=demo%3Atraining-pack`);
    await ready();
    await page
      .locator('[data-need-item="demo:wire"][data-need-destination="local"]')
      .first()
      .click();
    await page.waitForSelector("#local-records h2");
    assert.match(
      await page.locator("#local-records").textContent(),
      /Synthetic private changed wire/,
    );
    assert(!page.url().includes("pack=") && !page.url().includes("wire"));
    await page.selectOption("#pack-select", "official:mw4-dmz-starter");
    await page.waitForSelector("#error:not([hidden])");
    assert.equal(await page.locator("#local-records h2").count(), 0);
    assert(!page.url().includes("pack="));
    // Expiry and session-storage denial are explicit failures, never a default record.
    await page.goto(`${base}/planner/?pack=demo%3Atraining-pack`);
    await ready();
    const expiredURL = await page.evaluate(async () => {
      const { state } = await import("/assets/src/client/common.mjs");
      const { createReaderContext } = await import(
        "/assets/src/domain/reader-flow.mjs"
      );
      // Preserve the real clock for existing entries; age only this synthetic token.
      const url = await createReaderContext(state.pack, "demo:wire", "local");
      const token = new URL(url, location.origin).searchParams.get("context");
      const entries = JSON.parse(
        sessionStorage.getItem("dmz-reader-context-v1"),
      );
      entries[token].expiresAt = Date.now() - 60_000;
      sessionStorage.setItem("dmz-reader-context-v1", JSON.stringify(entries));
      return url;
    });
    await page.goto(base + expiredURL);
    await page.waitForSelector("#error:not([hidden])");
    assert.equal(await page.locator("#local-records h2").count(), 0);
    const denied = await browser.newContext();
    try {
      await denied.addInitScript(() =>
        Object.defineProperty(window, "sessionStorage", {
          get() {
            throw new DOMException(
              "Synthetic denied session storage",
              "SecurityError",
            );
          },
        }),
      );
      const deniedPage = await denied.newPage();
      await deniedPage.goto(base + staleURL);
      await deniedPage.waitForSelector("#error:not([hidden])");
      assert.match(
        await deniedPage.locator("#error").textContent(),
        /unavailable/,
      );
      assert.equal(await deniedPage.locator("#local-records h2").count(), 0);
      await deniedPage.goto(base + "/planner/?pack=demo%3Atraining-pack");
      await deniedPage.waitForFunction(
        () => document.querySelector("#goal-select")?.options.length > 1,
      );
      await deniedPage.selectOption("#goal-select", "demo:board-batch");
      await deniedPage.locator('#goal-form button[type="submit"]').click();
      const origin = deniedPage.url();
      await deniedPage.locator('[data-need-item="demo:wire"]').first().click();
      await deniedPage.waitForSelector("#error:not([hidden])");
      assert.match(
        await deniedPage.locator("#error").textContent(),
        /unavailable/,
      );
      assert.equal(deniedPage.url(), origin);
    } finally {
      await denied.close();
    }
    // Catalog matches separated visible tokens and never writes arbitrary query.
    await page.goto(`${base}/catalog/?pack=demo%3Atraining-pack`);
    await page.locator("#catalog-search").fill("wire training");
    await page.waitForFunction(
      () =>
        !document
          .querySelector("#catalog-count")
          ?.textContent.includes("records. Coverage"),
    );
    const expected = await page
      .locator("[data-record-card]")
      .evaluateAll((cards) =>
        cards
          .filter(
            (c) =>
              c.dataset.pack === "demo:training-pack" &&
              ["wire", "training"].every((t) => c.dataset.search.includes(t)),
          )
          .map((c) => c.dataset.search),
      );
    const actual = await page
      .locator("[data-record-card]:visible")
      .evaluateAll((cards) => cards.map((c) => c.dataset.search));
    assert.deepEqual(actual, expected);
    assert(!page.url().includes("q=") && !page.url().includes("wire"));
    await page.goto(`${base}/`);
    await page.locator("#home-search").fill("wire training");
    await page.locator(".home-search button").click();
    await page.waitForURL(/\/catalog\//);
    await page.waitForFunction(
      () =>
        document.querySelector("#catalog-search")?.value === "wire training",
    );
    assert(!page.url().includes("wire") && !page.url().includes("search="));
    await page.reload();
    assert.equal(await page.locator("#catalog-search").inputValue(), "");
    // Globally unplottable real starter vs calibrated synthetic filtered-empty.
    await page.goto(`${base}/maps/?pack=official%3Amw4-dmz-starter`);
    await ready();
    assert(!(await page.locator("#map-visual").isVisible()));
    assert(await page.locator("#map-unavailable").isVisible());
    assert(await page.locator("#location-list button").count());
    await page.goto(`${base}/maps/?pack=demo%3Atraining-pack`);
    await ready();
    assert(await page.locator("#map-visual").isVisible());
    await page.locator("#location-search").fill("no synthetic match");
    assert.equal(await page.locator("#location-list button").count(), 0);
    assert(await page.locator("#map-visual").isVisible());
    await page.locator("#location-search").fill("");
    await page.locator('[data-camera="in"]').click();
    assert.notEqual(
      await page.locator("#location-map").getAttribute("viewBox"),
      "0 0 100 100",
    );
    assert.match(await page.locator(".nav-more summary").textContent(), /Maps/);
    await page.goto(`${base}/catalog/`);
    const detailRoute = await page
      .locator("[data-record-card]:visible h3 a")
      .first()
      .getAttribute("href");
    const measurements = [];
    for (const width of [320, 390, 1280])
      for (const theme of ["dark", "light"])
        for (const route of [
          "/",
          "/catalog/",
          "/maps/?pack=official%3Amw4-dmz-starter",
          detailRoute,
        ]) {
          await page.setViewportSize({ width, height: 844 });
          await page.goto(base + route);
          if (route.startsWith("/maps")) await ready();
          await page.evaluate(
            (value) => (document.documentElement.dataset.theme = value),
            theme,
          );
          if (route === detailRoute)
            assert(await page.locator(".evidence-caveat").isVisible());
          const normal = await page.evaluate(() => {
            const card = document.querySelector(".record-card"),
              radar = document.querySelector(".radar-art"),
              meta = document.querySelector(".card-meta");
            return {
              cardPadding: card
                ? parseFloat(getComputedStyle(card).padding)
                : null,
              radarWidth: radar ? radar.getBoundingClientRect().width : null,
              metadataSize: meta
                ? parseFloat(getComputedStyle(meta).fontSize)
                : null,
              overflow: document.documentElement.scrollWidth > innerWidth + 1,
            };
          });
          assert(!normal.overflow);
          if (normal.cardPadding !== null) assert.equal(normal.cardPadding, 16);
          if (normal.metadataSize !== null) assert(normal.metadataSize >= 14);
          if (width <= 390 && normal.radarWidth !== null)
            assert(normal.radarWidth <= 200);
          if (captureScreenshots)
            await page.screenshot({
              path: `test-results/reader-normal-${width}-${theme}-${route === "/" ? "home" : route === detailRoute ? "detail" : route.startsWith("/maps") ? "maps" : "catalog"}.png`,
              fullPage: true,
            });
          const before = await page
            .locator("body")
            .evaluate((n) => parseFloat(getComputedStyle(n).fontSize));
          await page.addStyleTag({ url: base + "/__test-text-zoom.css" });
          assert.equal(
            await page
              .locator("body")
              .evaluate((n) => parseFloat(getComputedStyle(n).fontSize)),
            before * 2,
          );
          assert(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth + 1,
            ),
          );
          const label = `reader-${route.startsWith("/maps") ? "maps" : route === "/" ? "home" : route === detailRoute ? "detail" : "catalog"}-${width}-${theme}-text200`;
          if (captureScreenshots)
            await page.screenshot({
              path: `test-results/${label}.png`,
              fullPage: true,
            });
          const height = await page.evaluate(
            () => document.documentElement.scrollHeight,
          );
          for (
            let top = 0, tile = 0;
            captureScreenshots && top < height;
            top += 844, tile++
          ) {
            await page.evaluate((y) => scrollTo(0, y), top);
            await page.screenshot({
              path: `test-results/${label}-tile-${tile}.png`,
            });
          }
          const dimensions = await page.evaluate(() => {
            const card = document.querySelector(".record-card"),
              radar = document.querySelector(".radar-art");
            return {
              cardPadding: card ? getComputedStyle(card).padding : null,
              radarWidth: radar ? radar.getBoundingClientRect().width : null,
            };
          });
          measurements.push({
            width,
            theme,
            route,
            height,
            normal,
            ...dimensions,
          });
        }
    await writeFile(
      "test-results/reader-flow-measurements.json",
      JSON.stringify(measurements, null, 2),
    );
  } finally {
    await context.close();
  }
}
