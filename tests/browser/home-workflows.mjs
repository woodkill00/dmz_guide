import assert from "node:assert/strict";
export async function runHomeWorkflowTests({ browser, base }) {
  const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    }),
    page = await context.newPage(),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const ready = () =>
    page.waitForFunction(
      () =>
        document.querySelector("#pack-select")?.value &&
        document.querySelector("#progress-rows")?.children.length,
    );
  try {
    await page.goto(base + "/");
    await page
      .locator('#hub-pack option[value="official:mw4-dmz-starter"]')
      .waitFor({ state: "attached" });
    assert.equal(
      await page.locator("#hub-pack").inputValue(),
      "official:mw4-dmz-starter",
    );
    assert(
      await page
        .getByRole("link", { name: "Open map ↗", exact: true })
        .isVisible(),
    );
    const empty = await page.evaluate(async () => {
      const { readExistingRecord } = await import(
        "/assets/src/storage/summary-read.mjs"
      );
      return readExistingRecord(
        "dmz-guide-local",
        "profiles",
        "official:mw4-dmz-starter",
      );
    });
    assert.equal(empty, undefined);
    await page.locator('[data-pin-feature="upgrades"]').click();
    await page.reload();
    await page.locator('#hub-pins a[href="/upgrades/"]').waitFor();
    await page.locator('#hub-pins a[href="/upgrades/"]').click();
    await ready();
    await page.locator(".catalog-context > summary").click();
    await page
      .locator("#pack-select")
      .selectOption("observed:upgrade-review-20261026");
    await page.waitForFunction(
      () =>
        document.querySelector("main")?.getAttribute("aria-busy") === "false",
    );
    await page.locator("[data-complete-upgrade]").first().waitFor();
    const before = await page.evaluate(async () => {
      const { state } = await import("/assets/src/client/common.mjs");
      return {
        inventory: state.profile.inventory,
        completion: state.profile.completion,
        goals: state.profile.goals,
      };
    });
    await page.locator(".tracker-more-filters > summary").click();
    await page.locator("#upgrade-layout").selectOption("flat");
    const checkbox = page.locator("[data-complete-upgrade]").first();
    const id = await checkbox.getAttribute("data-complete-upgrade");
    const article = checkbox.locator("xpath=ancestor::article[1]");
    await article.locator("details>summary").first().click();
    assert.match(await article.innerText(), /Listed requirements/);
    assert.match(await article.innerText(), /Evidence|sources/i);
    const material = article
      .locator('details[data-progress-detail] a[href^="/local/"]:not([target])')
      .first();
    if (await material.count()) {
      await material.click();
      await page.locator(".return-results").waitFor();
      await page.locator(".return-results").click();
      await ready();
      assert.equal(
        await page.locator("#pack-select").inputValue(),
        "observed:upgrade-review-20261026",
      );
    }
    await page.locator('[data-complete-upgrade="' + id + '"]').click();
    await page.locator("#upgrade-progress-apply").click();
    await page.waitForFunction(
      (id) =>
        document.querySelector('[data-complete-upgrade="' + id + '"]')?.checked,
      id,
    );
    const after = await page.evaluate(async () => {
      const { state } = await import("/assets/src/client/common.mjs");
      return {
        inventory: state.profile.inventory,
        completion: state.profile.completion,
        goals: state.profile.goals,
        done: Object.values(state.profile.upgradeProgress).filter(
          (x) => x.completion === "completed",
        ).length,
      };
    });
    assert.deepEqual(after.inventory, before.inventory);
    assert.deepEqual(after.goals, before.goals);
    assert.equal(after.done, 1);
    await page.goto(base + "/?pack=observed%3Aupgrade-review-20261026");
    await page.waitForFunction(() =>
      document.querySelector("#hub-progress").textContent.includes("1/28"),
    );
    assert.match(await page.locator("#hub-continue").innerText(), /Upgrades/);
    // Mission workflow deliberately uses the established clearly labeled fictional training catalog.
    await page.goto(base + "/missions/?pack=demo%3Atraining-pack");
    await ready();
    const mission = page.locator('[data-progress-id="demo:delivery-order"]');
    await mission.waitFor({ state: "attached" });
    const missionArticle = mission.locator("xpath=ancestor::article[1]");
    await missionArticle.locator("details>summary").click();
    assert.match(await missionArticle.innerText(), /Listed requirements/);
    assert.match(await missionArticle.innerText(), /Prerequisite chain/);
    assert.equal(await page.locator("[data-complete-upgrade]").count(), 0);
    const missionStock = await page.evaluate(async () => {
      const { state } = await import("/assets/src/client/common.mjs");
      return state.profile.inventory;
    });
    await mission.selectOption("completed");
    await page.waitForFunction(async () => {
      const { state } = await import("/assets/src/client/common.mjs");
      return (
        state.profile.completion["demo:delivery-order"] === "completed" &&
        !state.saving
      );
    });
    assert.deepEqual(
      await page.evaluate(async () => {
        const { state } = await import("/assets/src/client/common.mjs");
        return state.profile.inventory;
      }),
      missionStock,
    );
    await page.locator("#progress-query").fill("delivery");
    const detail = missionArticle.getByRole("link", {
      name: "Open selected private record",
    });
    await detail.click();
    await page.locator(".return-results").click();
    await ready();
    await page.waitForFunction(
      () => document.querySelector("#progress-query").value === "delivery",
    );
    assert.equal(
      await page.locator("#pack-select").inputValue(),
      "demo:training-pack",
    );
    await page.goto(base + "/?pack=demo%3Atraining-pack");
    await page.waitForFunction(() =>
      document.querySelector("#hub-progress").textContent.includes("1/1"),
    );
    // Search, record return and key/map journey.
    await page.locator("#hub-query").fill("Hospital Chemical Lockers");
    await page.locator(".hub-search button").click();
    await page.locator("#unified-results article").first().waitFor();
    await page.locator("#unified-type").selectOption("key");
    const keyResult = page.locator(".search-result").filter({
      has: page.getByRole("link", {
        name: "Hospital Chemical Lockers",
        exact: true,
      }),
    });
    await keyResult.getByRole("link", { name: "Open details" }).click();
    await page.locator('main[data-key-workspace-ready="true"]').waitFor();
    await page.locator('[data-key-action="add"]').click();
    await page.locator("[data-target-use]").check();
    await page.locator("#key-toggle-trip").click();
    assert.match(
      await page.locator("#key-trip-content").innerText(),
      /Hospital Chemical Lab/,
    );
    assert(
      await page
        .locator("a.key-map-link")
        .first()
        .getAttribute("href")
        .then((h) => h.includes("key-grid=F5")),
    );
    await page.locator(".return-results").click();
    await page.waitForFunction(
      () =>
        document.querySelector("#unified-query").value ===
        "Hospital Chemical Lockers",
    );
    await page.locator("#unified-query").fill("M4");
    await page.locator("#unified-type").selectOption("weapon");
    await page.locator(".search-result h3 a").first().click();
    await page.waitForURL("**/armory/**");
    assert.match(page.url(), /\/armory\//);
    assert(
      await page
        .getByRole("link", { name: "Attachment directory" })
        .isVisible(),
    );
    await page.keyboard.press("Control+k");
    await page.waitForURL("**/search/**");
    await page.goto(base + "/features/");
    await page.locator("#feature-query").fill("routes");
    assert((await page.locator("[data-feature-card]:visible").count()) >= 1);
    assert.equal(
      await page
        .locator("[data-feature-card]:visible")
        .first()
        .getByRole("link")
        .getAttribute("target"),
      "_blank",
    );
    for (const path of [
      "/",
      "/features/",
      "/search/",
      "/missions/",
      "/upgrades/",
    ])
      for (const width of [320, 390, 768, 1440]) {
        await page.setViewportSize({ width, height: 1000 });
        await page.goto(base + path);
        for (const enlarged of [false, true]) {
          await page.evaluate(
            (z) => (document.documentElement.style.fontSize = z ? "200%" : ""),
            enlarged,
          );
          assert(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth + 1,
            ),
            path + " " + width + " " + enlarged,
          );
        }
      }
    assert.deepEqual(errors, []);
    console.log(
      "058 journeys PASS: home/pins/recents, upgrade requirements/material/back/completion/nonconsumption/summary, synthetic mission requirements/progress/back/summary, key trip/map, weapon attachments, unified search/keyboard/features and40layouts",
    );
  } finally {
    await context.close();
  }
  const denied = await browser.newContext();
  await denied.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw Error("Synthetic denied storage");
      },
    });
    Object.defineProperty(window, "indexedDB", { value: undefined });
  });
  const dp = await denied.newPage();
  try {
    await dp.goto(base + "/");
    await dp.waitForFunction(() =>
      document
        .querySelector("#hub-preference-status")
        .textContent.includes("session"),
    );
    assert(
      await dp
        .getByRole("link", { name: "Open map ↗", exact: true })
        .isVisible(),
    );
  } finally {
    await denied.close();
  }
  await runHomeFailureTests({ browser, base });
  await runBackNavigationTests({ browser, base });
}

async function runHomeFailureTests({ browser, base }) {
  const held = await browser.newContext();
  await held.route("**/assets/src/storage/summary-read.mjs", async (route) => {
    const response = await route.fetch();
    let source = await response.text();
    source = source.replace(
      "export function readExistingRecord",
      "function originalRead",
    );
    source +=
      '\nexport function readExistingRecord(name,store,key,options){if(key==="observed:upgrade-review-20261026")return new Promise(resolve=>window.__releaseSummary=resolve);return originalRead(name,store,key,options)}';
    await route.fulfill({ response, body: source });
  });
  const p = await held.newPage();
  try {
    await p.goto(base + "/");
    await p
      .locator('#hub-pack option[value="observed:upgrade-review-20261026"]')
      .waitFor({ state: "attached" });
    const fixture = await p.evaluate(async () => {
      const pack = await (
        await fetch("/assets/content/packs/upgrade-observations.json")
      ).json();
      const { newProfile } = await import("/assets/src/domain/profile.mjs");
      return newProfile(pack);
    });
    await p
      .locator("#hub-pack")
      .selectOption("observed:upgrade-review-20261026");
    await p.waitForFunction(() => !!window.__releaseSummary);
    await p.locator("#hub-pack").selectOption("official:mw4-dmz-starter");
    await p.waitForFunction(() =>
      document
        .querySelector("#hub-progress")
        .textContent.includes("No saved profile"),
    );
    await p.evaluate(
      (value) => window.__releaseSummary({ value, previous: null }),
      fixture,
    );
    await p.waitForTimeout(30);
    assert.match(
      await p.locator("#hub-progress").innerText(),
      /No saved profile/,
    );
    assert.equal(
      await p.locator("#hub-pack").inputValue(),
      "official:mw4-dmz-starter",
    );
  } finally {
    await held.close();
  }
  const hung = await browser.newContext();
  await hung.addInitScript(() =>
    Object.defineProperty(globalThis, "indexedDB", {
      value: {
        open() {
          return {};
        },
      },
    }),
  );
  const h = await hung.newPage();
  try {
    await h.goto(base + "/");
    await h.waitForFunction(() =>
      document.querySelector("#hub-progress").textContent.includes("timed out"),
    );
    assert(
      await h
        .getByRole("link", { name: "Open map ↗", exact: true })
        .isVisible(),
    );
  } finally {
    await hung.close();
  }
  const service = await browser.newContext();
  await service.addInitScript(() => {
    const original = window.fetch;
    window.__servicePorts = [];
    window.fetch = (path, options) => {
      const u = new URL(path, location.href);
      if (
        u.hostname === "127.0.0.1" &&
        ["4173", "4174", "4176", "5175"].includes(u.port) &&
        u.pathname === "/"
      ) {
        window.__servicePorts.push(u.port);
        return u.port === "4176"
          ? Promise.reject(Error("Synthetic unavailable service"))
          : Promise.resolve(
              new Response("Synthetic reachable service", { status: 200 }),
            );
      }
      return original(path, options);
    };
  });
  const sp = await service.newPage();
  try {
    await sp.goto(base + "/");
    await sp.getByText("Local services", { exact: true }).click();
    await sp.locator("#hub-service-check").click();
    await sp.waitForFunction(
      () => !document.querySelector("#hub-service-check").disabled,
    );
    assert.deepEqual((await sp.evaluate(() => window.__servicePorts)).sort(), [
      "4173",
      "4174",
      "4176",
      "5175",
    ]);
    assert.match(
      await sp.locator("#hub-services").innerText(),
      /Update manager: unavailable/,
    );
    assert.match(
      await sp.locator("#hub-services").innerText(),
      /transport only/,
    );
  } finally {
    await service.close();
  }
  console.log(
    "058 failure journeys PASS: held summary cannot cross catalog selection, bounded hung storage, explicit four-service allowlist with unavailable service",
  );
}

async function runBackNavigationTests({ browser, base }) {
  for (const path of ["/", "/search/", "/missions/"]) {
    const context = await browser.newContext();
    await context.addInitScript(
      ({ path }) => {
        const original = window.fetch,
          key = "__058-hold-" + path;
        window.fetch = (url, options) => {
          const target = new URL(url, location.href);
          if (
            location.pathname === path &&
            target.pathname ===
              (path !== "/search/"
                ? "/assets/content/manifest.json"
                : "/assets/content/unified-search.json") &&
            !sessionStorage.getItem(key)
          ) {
            sessionStorage.setItem(key, "1");
            window.__heldPublicRead = true;
            return new Promise((_, reject) =>
              options.signal.addEventListener(
                "abort",
                () =>
                  reject(
                    new DOMException(
                      "Synthetic interrupted read",
                      "AbortError",
                    ),
                  ),
                { once: true },
              ),
            );
          }
          return original(url, options);
        };
      },
      { path },
    );
    const page = await context.newPage();
    try {
      await page.goto(base + path);
      await page.waitForFunction(() => window.__heldPublicRead);
      if (path === "/search/")
        await page.locator("#unified-query").fill("Hospital");
      await page.goto(base + "/features/");
      await page.goBack();
      if (path === "/") {
        await page
          .locator('#hub-pack option[value="official:mw4-dmz-starter"]')
          .waitFor({ state: "attached" });
      } else if (path === "/missions/") {
        await page.locator('main[aria-busy="false"]').waitFor();
        assert(await page.locator("#pack-select").isEnabled());
      } else {
        await page.waitForFunction(
          () =>
            document.querySelector("#unified-query").value === "Hospital" &&
            document.querySelectorAll(".search-result").length > 0,
        );
      }
      await page.goto(base + "/features/");
      await page.goBack();
      assert.equal(new URL(page.url()).pathname, path);
      if (path === "/search/") {
        await page.waitForFunction(
          () => document.querySelector("#unified-query").value === "Hospital",
        );
        assert.equal(
          await page.locator("#unified-query").inputValue(),
          "Hospital",
        );
      }
    } finally {
      await context.close();
    }
  }
  const context = await browser.newContext(),
    page = await context.newPage();
  try {
    await page.goto(base + "/missions/?pack=official%3Amw4-dmz-starter");
    await page.locator('main[aria-busy="false"]').waitFor();
    await page.locator("#progress-query").fill("synthetic no-match");
    await page.goto(base + "/features/");
    await page.goto(base + "/missions/?pack=official%3Amw4-dmz-starter");
    await page.waitForFunction(
      () =>
        document.querySelector("#progress-query").value ===
        "synthetic no-match",
    );
    assert.equal(await page.locator("[data-progress-id]").count(), 0);
    await page.goto(base + "/collection/?pack=demo%3Atraining-pack");
    await page.locator('main[aria-busy="false"]').waitFor();
    await page.evaluate(() => scrollTo(0, 400));
    const scroll = await page.evaluate(() => scrollY);
    await page.goto(base + "/features/");
    await page.goto(base + "/collection/?pack=demo%3Atraining-pack");
    await page.locator('main[aria-busy="false"]').waitFor();
    await page.waitForFunction((top) => Math.abs(scrollY - top) < 5, scroll);
    await page.goto(base + "/keys/hospital-chemical-lab/");
    await page.locator('main[data-key-workspace-ready="true"]').waitFor();
    await page.locator('[data-key-action="add"]').click();
    await page.waitForFunction(
      () =>
        document.querySelector("#key-save-status").textContent ===
        "Saved on this device.",
    );
    await page.goto(base + "/features/");
    await page.goBack();
    await page.locator('main[data-key-workspace-ready="true"]').waitFor();
    await page.locator('[data-key-action="add"]').click();
    await page.waitForFunction(
      () =>
        document.querySelector("#key-save-status").textContent ===
        "Saved on this device.",
    );
    assert.equal(
      await page.locator('[data-private-field="quantity"]').inputValue(),
      "2",
    );
  } finally {
    await context.close();
  }
  console.log(
    "058 back navigation PASS: interrupted Home/index resume, two departure/back cycles, empty missions filters, collection scroll, clean key workspace remains editable",
  );
}
