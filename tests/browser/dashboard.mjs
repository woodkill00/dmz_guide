import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
export async function runDashboardTests({
  browser,
  base,
  name = "chromium",
  captureScreenshots = true,
}) {
  const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
    }),
    page = await context.newPage(),
    errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(base + "/?pack=official%3Amw4-dmz-starter");
  await page.waitForFunction(() =>
    document
      .querySelector("#hub-progress")
      ?.textContent.includes("No saved profile"),
  );
  assert.equal(await page.locator("[data-dashboard-section]").count(), 6);
  assert.equal(await page.locator("[data-dash-item]").count(), 0);
  const databases = await page.evaluate(async () =>
    typeof indexedDB.databases === "function"
      ? (await indexedDB.databases()).map((d) => d.name)
      : [],
  );
  assert(!databases.includes("dmz-guide-local"));
  assert(!databases.includes("dmz-armory-local"));
  await page.evaluate(async () => {
    const { newProfile } = await import("/assets/src/domain/profile.mjs");
    const { saveProfile } = await import("/assets/src/storage/store.mjs");
    const pack = await (
      await fetch("/assets/content/packs/official-starter.json")
    ).json();
    const profile = newProfile(pack);
    profile.buildTargets = { "mw4:bandage": 2, "mw4:pain-killers": 1 };
    profile.inventory["mw4:synthetics"] = 5;
    await saveProfile(profile, 0);
  });
  await page.locator("#hub-refresh").click();
  await page
    .locator('[data-dash-item="mw4:synthetics"][data-dash-owner="builds"]')
    .first()
    .waitFor();
  assert((await page.locator("#dashboard-builds").boundingBox()).y < 900);
  await page
    .locator('[data-dash-item="mw4:synthetics"][data-dash-owner="builds"]')
    .first()
    .focus();
  await page.keyboard.press("Enter");
  const panel = page.locator('[data-dash-detail="builds"]');
  await panel.locator("input").fill("3");
  await panel.locator("button[type=submit]").click();
  await page.waitForFunction(() =>
    document
      .querySelector("#dashboard-action-status")
      ?.textContent.includes("Found items saved"),
  );
  const saved = await page.evaluate(async () => {
    const { readDashboardProfile } = await import(
      "/assets/src/storage/dashboard-context.mjs"
    );
    return readDashboardProfile("official:mw4-dmz-starter");
  });
  assert.equal(saved.inventory["mw4:synthetics"], 8);
  assert.equal(
    saved.fieldOps.history.filter((r) =>
      r.changes.some((c) => c.itemId === "mw4:synthetics" && c.after === 8),
    ).length,
    1,
  );
  assert.equal(await panel.locator("input").inputValue(), "");
  assert.equal(
    await panel
      .locator("input")
      .evaluate((el) => el === document.activeElement),
    true,
  );
  await panel.locator("[data-dash-close]").click();
  await page.locator('[data-dash-collapse="orders"]').click();
  await page.locator('[data-dash-collapse="recipes"]').click();
  assert(await page.locator("#dash-body-orders").isHidden());
  assert(await page.locator("#dash-body-recipes").isHidden());
  await page.reload();
  await page.locator("[data-dash-item]").first().waitFor();
  assert(await page.locator("#dash-body-orders").isHidden());
  await page.locator("#dashboard-reset").click();
  assert(await page.locator("#dash-body-orders").isVisible());
  assert.equal(
    (
      await page.evaluate(async () => {
        const { readDashboardProfile } = await import(
          "/assets/src/storage/dashboard-context.mjs"
        );
        return readDashboardProfile("official:mw4-dmz-starter");
      })
    ).revision,
    saved.revision,
  );
  for (const width of [320, 390, 768, 1280, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForFunction((w) => innerWidth === w, width);
    await page.waitForFunction(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
      {},
      { timeout: 1500 },
    );
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      `overflow at ${width}`,
    );
  }
  await page.setViewportSize({ width: 390, height: 900 });
  await page.waitForFunction(() => innerWidth === 390);
  await page.evaluate(() => (document.documentElement.style.fontSize = "200%"));
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
    "overflow at text zoom",
  );
  await page.evaluate(() => (document.documentElement.style.fontSize = ""));
  if (process.argv.includes("--a11y")) {
    const { default: AxeBuilder } = await import(
      "../../tools/hajin-map/node_modules/@axe-core/playwright/dist/index.mjs"
    );
    for (const width of [1280, 320])
      for (const theme of ["dark", "light"]) {
        await page.setViewportSize({ width, height: 900 });
        await page.waitForFunction((w) => innerWidth === w, width);
        await page.evaluate(
          ({ theme, zoom }) => {
            document.documentElement.dataset.theme = theme;
            document.documentElement.style.fontSize = zoom ? "200%" : "";
          },
          { theme, zoom: width === 320 },
        );
        const result = await new AxeBuilder({ page }).analyze();
        assert.deepEqual(
          result.violations.map((v) => ({
            id: v.id,
            nodes: v.nodes.map((n) => n.target),
          })),
          [],
        );
      }
    await page.evaluate(() => {
      document.documentElement.dataset.theme = "dark";
      document.documentElement.style.fontSize = "";
    });
    await page.setViewportSize({ width: 1280, height: 900 });
  }
  await mkdir("test-results", { recursive: true });
  await page.setViewportSize({ width: 390, height: 900 });
  await page.waitForFunction(
    () => innerWidth === 390 && document.documentElement.scrollWidth <= 391,
  );
  if (captureScreenshots)
    await page.screenshot({
      path: `test-results/dashboard-${name}-mobile.png`,
      fullPage: true,
    });
  await page.setViewportSize({ width: 1280, height: 900 });
  if (captureScreenshots)
    await page.screenshot({
      path: `test-results/dashboard-${name}-desktop.png`,
      fullPage: true,
    });
  await page.evaluate(async () => {
    const { readDashboardProfile } = await import(
      "/assets/src/storage/dashboard-context.mjs"
    );
    const { saveProfile } = await import("/assets/src/storage/store.mjs");
    const p = await readDashboardProfile("official:mw4-dmz-starter");
    p.buildTargets = { "mw4:printer-item-3-plate-armor-vest": 1 };
    await saveProfile(p, p.revision);
  });
  await page.locator("#hub-refresh").click();
  const fabric = "mw4:ingredient-ballistic-fabric";
  await page
    .locator(`[data-dash-item="${fabric}"][data-dash-owner="builds"]`)
    .first()
    .click();
  await page
    .locator(`[data-dash-item="${fabric}"][data-dash-owner="needed"]`)
    .first()
    .click();
  const buildPanel = page.locator('[data-dash-detail="builds"]'),
    needPanel = page.locator('[data-dash-detail="needed"]');
  await needPanel.locator("input").fill("7");
  await buildPanel.locator("input").fill("2");
  await buildPanel.locator("button[type=submit]").click();
  await page.waitForFunction(
    () =>
      document.querySelector('[data-dash-detail="builds"] input')?.value === "",
  );
  assert.equal(await needPanel.locator("input").inputValue(), "7");
  assert.match(
    await needPanel.locator("[data-dash-facts]").innerText(),
    /Owned 2/,
  );
  assert.match(
    await buildPanel.locator("[data-dash-facts]").innerText(),
    /Owned 2/,
  );
  await needPanel.locator("input").fill("");
  await buildPanel.locator("[data-dash-close]").click();
  await needPanel.locator("[data-dash-close]").click();
  const parity = await page.evaluate(async () => {
    const { readDashboardProfile } = await import(
      "/assets/src/storage/dashboard-context.mjs"
    );
    const { saveProfile } = await import("/assets/src/storage/store.mjs");
    const { saveArmory } = await import("/assets/src/storage/armory-store.mjs");
    const { emptyArmory } = await import(
      "/assets/src/domain/armory-workspace.mjs"
    );
    const p = await readDashboardProfile("official:mw4-dmz-starter");
    const pack = await (
      await fetch("/assets/content/packs/official-starter.json")
    ).json();
    const bank = pack.objectives.find((r) => r.name === "Bank Upgrade I");
    p.upgradeProgress[bank.id] = {
      completion: "completed",
      availability: "unknown",
      reviewRequired: false,
    };
    p.completion["mw4:order-gear-up"] = "completed";
    p.itemBlueprints = { "mw4:printer-item-3-plate-armor-vest": true };
    const saved = await saveProfile(p, p.revision);
    const armory = emptyArmory();
    armory.acquisition = {
      m4: {
        manual: true,
        attachments: [],
        blueprints: ["Synthetic saved blueprint"],
        manualExtractions: 1,
      },
    };
    await saveArmory(armory, 0);
    return { revision: saved.revision, bankId: bank.id };
  });
  await page.locator("#hub-refresh").click();
  await page.waitForFunction(
    (revision) =>
      document
        .querySelector("#hub-progress")
        ?.textContent.includes("revision " + revision),
    parity.revision,
  );
  await page.locator('#dashboard-weapons [data-dash-more="weapons"]').waitFor();
  await page.locator('[data-dash-more="weapons"]').click();
  await page
    .locator('[data-dashboard-manual="m4"]')
    .filter({ hasText: "2 more manual extractions" })
    .waitFor();
  assert(
    !(await page.locator("#dashboard-weapons").innerText()).includes(
      "Synthetic saved blueprint",
    ),
  );
  assert.match(await page.locator("#dashboard-orders").innerText(), /1\/66/);
  assert.match(await page.locator("#dashboard-recipes").innerText(), /1\/116/);
  const upgradeLink = page
    .locator("#dashboard-upgrades .dash-progress-list a")
    .first();
  const upgradeHref = await upgradeLink.getAttribute("href");
  assert(upgradeHref.includes("upgrade="));
  await page.goto(base + upgradeHref);
  await page.waitForFunction(
    () => !!document.querySelector("#progress-query")?.value,
  );
  assert.match(
    await page.locator("#progress-query").inputValue(),
    /Bank Upgrade II/,
  );
  await page.goto(base + "/?pack=official%3Amw4-dmz-starter");
  await page.waitForFunction(() =>
    document.querySelector("#hub-progress")?.textContent.includes("revision"),
  );
  await page.evaluate(async () => {
    const { readDashboardProfile } = await import(
      "/assets/src/storage/dashboard-context.mjs"
    );
    const { saveProfile } = await import("/assets/src/storage/store.mjs");
    const { spoilerGuard } = await import("/assets/src/domain/progression.mjs");
    const pack = await (
        await fetch("/assets/content/packs/official-starter.json")
      ).json(),
      p = await readDashboardProfile(pack.id),
      guard = spoilerGuard(pack);
    p.buildTargets = Object.fromEntries(
      pack.items
        .filter(
          (i) => !i.spoiler && !guard.contains(i.name) && !guard.contains(i.id),
        )
        .slice(0, 100)
        .map((i) => [i.id, 1]),
    );
    await saveProfile(p, p.revision);
  });
  await page.locator("#hub-refresh").click();
  await page.locator('[data-dash-more="builds"]').click();
  assert(
    (await page.locator("#dashboard-builds [data-dash-item]").count()) <= 50,
  );
  assert((await page.locator("#dashboard-builds .dash-group").count()) <= 5);
  await page.locator("#dashboard-builds [data-dash-item]").first().click();
  const largePanel = page.locator('[data-dash-detail="builds"]');
  await largePanel.locator("input").fill("1");
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.locator('[data-dash-page="builds"][data-step="1"]').click();
  assert.match(
    await page.locator("#dashboard-builds .dash-pager").innerText(),
    /Page 1\//,
  );
  await largePanel.locator("input").fill("");
  await page.locator('[data-dash-more="needed"]').click();
  assert.match(
    await page.locator("#dashboard-builds .dash-pager").innerText(),
    /Page 1\//,
  );
  assert((await page.locator("#dashboard [data-dash-item]").count()) <= 100);
  assert.deepEqual(errors, []);
  await context.close();
  console.log(
    `087 dashboard ${name}: no-write load, Add found/history, layout persistence, five widths and text zoom PASS`,
  );
  await runDashboardFailureTests({ browser, base });
  await runDashboardStartupTests({ browser, base });
  await runDashboardOverlayTests({ browser, base });
  await runDashboardModuleFailureTests({ browser, base });
  await runDashboardManualTests({ browser, base });
}

async function runDashboardManualTests({ browser, base }) {
  const context = await browser.newContext(),
    page = await context.newPage();
  try {
    await page.goto(base + "/");
    await page.locator("[data-dashboard-manual]").first().waitFor();
    const heading = page.locator("#dashboard-weapons h2 a");
    assert.equal(await heading.innerText(), "Weapons");
    assert.equal(await heading.getAttribute("href"), "/dmz-weapons/");
    await heading.click();
    await page.waitForURL("**/dmz-weapons/");
    await page
      .getByRole("heading", { name: "DMZ Weapons", level: 1 })
      .waitFor({ state: "visible" });
    await page.goto(base + "/");
    await page.locator("[data-dashboard-manual]").first().waitFor();
    assert.match(
      await page.locator("#dashboard-weapons").innerText(),
      /3 to record/,
    );
    await page.evaluate(async () => {
      const { emptyArmory } = await import(
        "/assets/src/domain/armory-workspace.mjs"
      );
      const { saveArmory } = await import(
        "/assets/src/storage/armory-store.mjs"
      );
      const weapons = await (
          await fetch("/assets/content/dashboard-weapons.json")
        ).json(),
        value = emptyArmory();
      for (const w of weapons)
        value.acquisition[w.id] = {
          manual: true,
          manualExtractions: 3,
          blueprints: ["Synthetic must not show"],
          attachments: [],
        };
      value.acquisition.m4.manual = false;
      value.acquisition.m4.manualExtractions = 1;
      value.acquisition["han-86"].manualExtractions = 2;
      delete value.acquisition["csg-35"].manualExtractions;
      value.acquisition["cronen-osprey"].manual = false;
      value.acquisition.retired = {
        manual: false,
        manualExtractions: 0,
        blueprints: [],
        attachments: [],
      };
      await saveArmory(value, 0);
    });
    await page.locator("#hub-refresh").click();
    await page.waitForFunction(
      () => document.querySelectorAll("[data-dashboard-manual]").length === 4,
    );
    assert.match(
      await page.locator('[data-dashboard-manual="m4"]').innerText(),
      /2 more manual extractions/,
    );
    assert.match(
      await page.locator('[data-dashboard-manual="han-86"]').innerText(),
      /1 more manual extraction/,
    );
    assert.match(
      await page.locator('[data-dashboard-manual="csg-35"]').innerText(),
      /3 to record.*not entered/,
    );
    assert.match(
      await page.locator('[data-dashboard-manual="cronen-osprey"]').innerText(),
      /0 more manual extractions/,
    );
    assert.equal(
      await page
        .locator(
          '[data-dashboard-manual="axion"],[data-dashboard-manual="retired"]',
        )
        .count(),
      0,
    );
    assert(
      !(await page.locator("#dashboard-weapons").innerText()).includes(
        "Synthetic must not show",
      ),
    );
    await page.evaluate(async () => {
      const { readArmory, saveArmory } = await import(
        "/assets/src/storage/armory-store.mjs"
      );
      const { value } = await readArmory();
      for (const id of ["m4", "han-86", "csg-35", "cronen-osprey"]) {
        value.acquisition[id].manual = true;
        value.acquisition[id].manualExtractions = 3;
      }
      await saveArmory(value, value.revision);
    });
    await page.locator("#hub-refresh").click();
    await page
      .locator("#dashboard-weapons")
      .filter({ hasText: "All listed manuals marked collected" })
      .waitFor();
    assert.equal(await page.locator("[data-dashboard-manual]").count(), 0);
    console.log(
      "088 Weapons dashboard: missing/legacy/remaining/complete/absent and heading navigation PASS",
    );
  } finally {
    await context.close();
  }
  const empty = await browser.newContext(),
    emptyPage = await empty.newPage();
  try {
    await empty.route("**/assets/content/dashboard-weapons.json", (r) =>
      r.fulfill({ contentType: "application/json", body: "[]" }),
    );
    await emptyPage.goto(base + "/");
    await emptyPage
      .locator("#dashboard-weapons")
      .filter({ hasText: "Weapon list unavailable" })
      .waitFor();
    assert(
      !(await emptyPage.locator("#dashboard-weapons").innerText()).includes(
        "All listed manuals",
      ),
    );
  } finally {
    await empty.close();
  }
  const denied = await browser.newContext();
  await denied.addInitScript(() =>
    Object.defineProperty(window, "indexedDB", { value: undefined }),
  );
  const deniedPage = await denied.newPage();
  try {
    await deniedPage.goto(base + "/");
    await deniedPage
      .locator("#dashboard-weapons")
      .filter({ hasText: "Armory unavailable" })
      .waitFor();
    assert.equal(
      await deniedPage.locator("[data-dashboard-manual]").count(),
      0,
    );
  } finally {
    await denied.close();
  }
}

async function runDashboardModuleFailureTests({ browser, base }) {
  const context = await browser.newContext();
  const page = await context.newPage(),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await context.route("**/assets/src/client/dashboard.mjs", async (route) => {
    await page.evaluate(() => {
      dispatchEvent(new PageTransitionEvent("pagehide", { persisted: true }));
      dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true }));
    });
    await route.abort();
  });
  try {
    await page.goto(base + "/");
    await page
      .locator("#dashboard-action-status")
      .filter({ hasText: "Reload to retry" })
      .waitFor();
    assert(
      await page.locator('.hub-personal a[href="/features/"]').isVisible(),
    );
    assert.deepEqual(errors, []);
    console.log(
      "087 interrupted dashboard module reports reload recovery with links retained PASS",
    );
  } finally {
    await context.close();
  }
}

async function runDashboardOverlayTests({ browser, base }) {
  const context = await browser.newContext(),
    page = await context.newPage();
  try {
    await page.goto(base + "/");
    await page.waitForFunction(() =>
      document
        .querySelector("#hub-progress")
        ?.textContent.includes("No saved profile"),
    );
    await page.evaluate(async () => {
      const { newProfile } = await import("/assets/src/domain/profile.mjs");
      const { saveProfile, commitRecord } = await import(
        "/assets/src/storage/store.mjs"
      );
      const pack = await (
        await fetch("/assets/content/packs/official-starter.json")
      ).json();
      const item = pack.items.find((i) => i.id === "mw4:synthetics");
      item.name = "Synthetic private resource";
      item.kind = "currency";
      item.unit = "dmz-cash";
      const recipe = pack.recipes.find(
        (r) => r.output.itemId === "mw4:bandage",
      );
      recipe.inputs.find((i) => i.itemId === item.id).quantity = 99;
      await commitRecord("content", pack.id, { pack, assets: {} }, 0);
      const p = newProfile(pack);
      p.buildTargets = { "mw4:bandage": 2 };
      p.inventory[item.id] = 8;
      await saveProfile(p, 0);
    });
    await page.locator("#hub-refresh").click();
    const tile = page
      .locator('[data-dash-owner="builds"][data-dash-item="mw4:synthetics"]')
      .first();
    await tile.filter({ hasText: "Synthetic private resource" }).waitFor();
    assert.equal(await tile.locator("strong").innerText(), "190");
    await tile.click();
    const panel = page.locator('[data-dash-detail="builds"]');
    await panel.locator("input").fill("1300001");
    await panel.locator("button[type=submit]").click();
    await page.waitForFunction(() =>
      document
        .querySelector("#dashboard-action-status")
        ?.textContent.includes("Found items saved"),
    );
    await panel.locator("[data-dash-close]").click();
    await page.goto(base + "/quick-collect/?pack=official%3Amw4-dmz-starter");
    await page.waitForFunction(
      () =>
        document.querySelector("main")?.getAttribute("aria-busy") === "false",
    );
    const owner = await page.evaluate(async () => {
      const { state } = await import("/assets/src/client/common.mjs");
      const { buildTargetNeeds } = await import(
        "/assets/src/domain/build-targets.mjs"
      );
      return {
        name: state.pack.items.find((i) => i.id === "mw4:synthetics").name,
        held: state.profile.inventory["mw4:synthetics"],
        remaining: buildTargetNeeds(
          state.pack,
          state.profile,
        ).groups[0].direct.find((r) => r.id === "mw4:synthetics").remaining,
      };
    });
    assert.deepEqual(owner, {
      name: "Synthetic private resource",
      held: 1300009,
      remaining: 0,
    });
    console.log(
      "087 private same-version catalog names, recipes, currency bounds and Quick collect parity PASS",
    );
  } finally {
    await context.close();
  }
}

async function runDashboardStartupTests({ browser, base }) {
  const context = await browser.newContext();
  await context.route("**/assets/src/client/public-data.mjs", async (route) => {
    const response = await route.fetch();
    let source = await response.text();
    source = source.replace(
      "export async function readPublicJSON",
      "async function originalReadPublicJSON",
    );
    source += `\nexport async function readPublicJSON(path,...args){if(path==='/assets/content/manifest.json'&&!window.__manifestHeld){window.__manifestHeld=true;return new Promise((resolve,reject)=>window.__releaseManifest=()=>originalReadPublicJSON(path,...args).then(resolve,reject));}return originalReadPublicJSON(path,...args)}\n`;
    await route.fulfill({ response, body: source });
  });
  const page = await context.newPage();
  try {
    await page.goto(base + "/");
    await page.waitForFunction(() => !!window.__releaseManifest);
    await page.evaluate(() => {
      dispatchEvent(new PageTransitionEvent("pagehide", { persisted: true }));
      dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true }));
      window.__releaseManifest();
    });
    await page.waitForFunction(() =>
      document
        .querySelector("#hub-progress")
        ?.textContent.includes("No saved profile"),
    );
    assert.equal(
      await page.locator("#hub-pack").inputValue(),
      "official:mw4-dmz-starter",
    );
    console.log(
      "087 aborted initial catalog load resumes on bfcache return PASS",
    );
  } finally {
    await context.close();
  }
}

async function runDashboardFailureTests({ browser, base }) {
  const context = await browser.newContext();
  await context.route(
    "**/assets/src/client/collection-action.mjs",
    async (route) => {
      const response = await route.fetch();
      let source = await response.text();
      source = source.replace(
        "export async function verifyFoundOperation",
        "async function originalVerifyFoundOperation",
      );
      source = source.replace(
        "export async function commitFoundOperation",
        "async function originalCommitFoundOperation",
      );
      source += `\nexport async function commitFoundOperation(op,options){if(window.__failCommit)return originalCommitFoundOperation(op,{save:async()=>{throw Error('Synthetic quota failure')}});return originalCommitFoundOperation(op,options)}\nexport async function verifyFoundOperation(op,options){window.__verifyCalls=(window.__verifyCalls||0)+1;if(window.__failVerify){window.__failVerify=false;throw Error('Synthetic failed reread')}if(window.__holdVerify)return new Promise((resolve,reject)=>window.__releaseVerify=()=>originalVerifyFoundOperation(op,options).then(resolve,reject));return originalVerifyFoundOperation(op,options)}\n`;
      await route.fulfill({ response, body: source });
    },
  );
  const page = await context.newPage();
  try {
    await page.goto(base + "/?pack=official%3Amw4-dmz-starter");
    await page.waitForFunction(() =>
      document
        .querySelector("#hub-progress")
        ?.textContent.includes("No saved profile"),
    );
    await page.evaluate(async () => {
      const { newProfile } = await import("/assets/src/domain/profile.mjs");
      const { saveProfile } = await import("/assets/src/storage/store.mjs");
      const p = await (
          await fetch("/assets/content/packs/official-starter.json")
        ).json(),
        v = newProfile(p);
      v.buildTargets = { "mw4:bandage": 2 };
      await saveProfile(v, 0);
    });
    await page.locator("#hub-refresh").click();
    await page.locator('[data-dash-item="mw4:synthetics"]').first().click();
    const panel = page.locator('[data-dash-detail="builds"]'),
      input = panel.locator("input");
    await input.fill("3");
    await page.evaluate(() => (window.__failCommit = true));
    await panel.locator("button[type=submit]").click();
    await panel
      .locator("[data-dash-error]")
      .filter({ hasText: "quota" })
      .waitFor();
    assert.equal(await input.inputValue(), "3");
    await page.evaluate(() => {
      window.__failCommit = false;
      window.__failVerify = true;
    });
    await panel.locator("button[type=submit]").click();
    await page
      .getByRole("button", { name: "Verify saved update", exact: true })
      .waitFor();
    assert(await panel.locator("button[type=submit]").isDisabled());
    const stock = () =>
      page.evaluate(async () => {
        const { readDashboardProfile } = await import(
          "/assets/src/storage/dashboard-context.mjs"
        );
        return (await readDashboardProfile("official:mw4-dmz-starter"))
          .inventory["mw4:synthetics"];
      });
    assert.equal(await stock(), 3);
    await page.evaluate(() => (window.__holdVerify = true));
    await page
      .getByRole("button", { name: "Verify saved update", exact: true })
      .click();
    await page.waitForFunction(() => !!window.__releaseVerify);
    await page.evaluate(() => {
      dispatchEvent(new Event("focus"));
      document.dispatchEvent(new Event("visibilitychange"));
    });
    assert.equal(await page.evaluate(() => window.__verifyCalls), 2);
    await page.evaluate(() => {
      dispatchEvent(new PageTransitionEvent("pagehide", { persisted: true }));
      dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true }));
      window.__releaseVerify();
    });
    await page.waitForFunction(
      () =>
        document.querySelector('[data-dash-detail="builds"] input')?.value ===
        "",
    );
    await page.waitForFunction(() =>
      document
        .querySelector("#hub-progress")
        ?.textContent.includes("revision 2"),
    );
    assert.equal(await stock(), 3);
    await page.evaluate(() => (window.__holdVerify = false));
    await input.fill("2");
    await panel.locator("button[type=submit]").click();
    await page.waitForFunction(() =>
      document
        .querySelector("#dashboard-action-status")
        ?.textContent.includes("Found items saved"),
    );
    assert.equal(await stock(), 5);
    console.log(
      "087 dashboard quota, committed/read-failure, single-flight verification and pagehide reconciliation PASS",
    );
  } finally {
    await context.close();
  }
}
