import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
import { chromium, firefox, webkit } from "playwright";
import { startBrowserServer } from "./server.mjs";
const path = "/armory/camos/han-86/";
const tile = (p, id) => p.locator(`[data-camo-tile="${id}"]`);
const check = (p, id) => p.locator(`[data-camo-complete="${id}"]`);
async function ready(p) {
  await p.waitForFunction(
    () =>
      !document.querySelector('[data-camo-complete="military-camo-1"]')
        .disabled,
  );
}
async function tick(p, id, value = true) {
  if ((await tile(p, id).getAttribute("aria-expanded")) !== "true")
    await tile(p, id).click();
  await check(p, id).setChecked(value);
  await p.waitForFunction(
    ({ id, value }) => {
      const root = document.querySelector("#camo-tracker");
      return (
        root.dataset.busy === "false" &&
        document.querySelector(`[data-camo-tile="${id}"]`).dataset.state ===
          (value
            ? "completed"
            : document.querySelector(`[data-camo-tile="${id}"]`).dataset
                .state) &&
        document.querySelector(`[data-camo-complete="${id}"]`).checked === value
      );
    },
    { id, value },
  );
}
async function saved(p) {
  return p.evaluate(async () => {
    const { readArmory } = await import("/assets/src/storage/armory-store.mjs");
    return (await readArmory()).value;
  });
}
async function main(browser, base, name) {
  const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
    }),
    p = await context.newPage(),
    errors = [],
    external = [];
  p.on("pageerror", (e) => errors.push(e.message));
  await p.route("**/*", (route) => {
    if (new URL(route.request().url()).origin !== new URL(base).origin) {
      external.push(route.request().url());
      return route.abort();
    }
    return route.continue();
  });
  try {
    await p.goto(base + path);
    await ready(p);
    assert.equal(await p.locator("[data-camo-tier]:visible").count(), 4);
    assert.equal(await p.locator("[data-camo-tile]:visible").count(), 19);
    const databases = await p.evaluate(async () =>
      typeof indexedDB.databases === "function"
        ? (await indexedDB.databases()).map((d) => d.name)
        : [],
    );
    assert(!databases.includes("dmz-armory-local"));
    assert.equal(
      await tile(p, "military-camo-1").getAttribute("data-state"),
      "next",
    );
    assert.equal(await tile(p, "gold").getAttribute("data-state"), "remaining");
    await tile(p, "military-camo-1").focus();
    await p.keyboard.press("Enter");
    assert.equal(
      await tile(p, "military-camo-1").getAttribute("aria-expanded"),
      "true",
    );
    await check(p, "military-camo-1").scrollIntoViewIfNeeded();
    const before = await check(p, "military-camo-1").boundingBox(),
      scroll = await p.evaluate(() => scrollY);
    await tick(p, "military-camo-1");
    const after = await check(p, "military-camo-1").boundingBox();
    assert(Math.abs(before.y - after.y) <= 2, "checkbox movement");
    assert(
      Math.abs(scroll - (await p.evaluate(() => scrollY))) <= 2,
      "save scroll",
    );
    for (let i = 2; i <= 8; i++) await tick(p, `military-camo-${i}`);
    const specials = await p
      .locator('[data-camo-tier="special"] [data-camo-tile]')
      .evaluateAll((nodes) => nodes.map((n) => n.dataset.camoTile));
    for (const id of specials)
      assert.equal(await tile(p, id).getAttribute("data-state"), "next");
    assert.equal(await tile(p, "gold").getAttribute("data-state"), "remaining");
    await tick(p, specials[0]);
    await tick(p, specials[1]);
    assert.equal(await tile(p, "gold").getAttribute("data-state"), "remaining");
    await tick(p, specials[2]);
    assert.equal(await tile(p, "gold").getAttribute("data-state"), "next");
    await tick(p, "gold");
    await tick(p, specials[2], false);
    assert.equal(await tile(p, "gold").getAttribute("data-state"), "completed");
    await tick(p, "gold", false);
    assert.equal(await tile(p, "gold").getAttribute("data-state"), "remaining");
    await tick(p, specials[2]);
    assert.equal(await tile(p, "gold").getAttribute("data-state"), "next");
    await p.reload();
    await ready(p);
    assert.equal(
      await tile(p, "military-camo-1").getAttribute("data-state"),
      "completed",
    );
    await tick(p, "divergence");
    await p.locator('[data-camo-view="mastery"]').click();
    assert.equal(await p.locator("[data-camo-tile]:visible").count(), 6);
    await tick(p, "mercurial-drift");
    await p.goto(base + "/armory/camos/cronen-osprey/");
    await ready(p);
    assert.equal(
      await tile(p, "military-camo-1").getAttribute("data-state"),
      "next",
    );
    assert.equal(
      await tile(p, "divergence").getAttribute("data-state"),
      "completed",
    );
    await p.locator('[data-camo-view="mastery"]').click();
    assert.equal(
      await tile(p, "mercurial-drift").getAttribute("data-state"),
      "completed",
    );
    assert.equal(
      await tile(p, "polyatomic-reforged").getAttribute("data-state"),
      "next",
    );
    let record = await saved(p);
    assert.equal(
      record.camoCompletions.filter((k) => k === "shared:divergence").length,
      1,
    );
    const camoKeys = record.camoCompletions;
    await p.goto(base + "/armory/acquisition/?weapon=han-86#weapon-han-86");
    await p.waitForFunction(
      () => !document.querySelector('[data-manual="han-86"]').disabled,
    );
    await p.locator('[data-manual="han-86"]').check();
    await p.waitForFunction(
      () =>
        document.querySelector("#weapon-acquisition").dataset.busy === "false",
    );
    record = await saved(p);
    assert.deepEqual(record.camoCompletions, camoKeys);
    assert.equal(record.acquisition["han-86"].manual, true);
    // Exercise existing full-armory backup export and restore preview with new optional field.
    await p.goto(base + "/armory/workbench/#backups");
    await p.waitForFunction(
      () => !document.querySelector("#workspace-export").disabled,
    );
    const downloadEvent = p.waitForEvent("download");
    await p.locator("#workspace-export").click();
    const download = await downloadEvent,
      backup = JSON.parse(await readFile(await download.path(), "utf8"));
    assert.deepEqual(backup.workspace.camoCompletions, record.camoCompletions);
    await p.locator("#workspace-import").setInputFiles({
      name: "synthetic-camo-backup.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(backup)),
    });
    await p
      .locator("#workspace-preview")
      .filter({ hasText: "camo records" })
      .waitFor();
    assert.match(
      await p.locator("#workspace-preview").innerText(),
      /legacy backup without camo records clears/,
    );
    p.once("dialog", (d) => d.accept());
    await p.locator("#workspace-import-apply").click();
    await p.waitForFunction(
      (rev) =>
        document
          .querySelector("#armory-status")
          .textContent.includes(String(rev)),
      record.revision + 1,
    );
    const legacy = structuredClone(backup);
    delete legacy.workspace.camoCompletions;
    for (const [body, revision] of [
      [legacy, record.revision + 2],
      [backup, record.revision + 3],
    ]) {
      await p.locator("#workspace-import").setInputFiles({
        name: "synthetic-restore.json",
        mimeType: "application/json",
        buffer: Buffer.from(JSON.stringify(body)),
      });
      await p
        .locator("#workspace-preview")
        .filter({
          hasText:
            body === legacy
              ? "0 camo records"
              : camoKeys.length + " camo records",
        })
        .waitFor();
      p.once("dialog", (d) => d.accept());
      await p.locator("#workspace-import-apply").click();
      await p.waitForFunction(
        (rev) =>
          document
            .querySelector("#armory-status")
            .textContent.includes("revision " + rev),
        revision,
      );
      const stored = await saved(p);
      assert.equal(stored.acquisition["han-86"].manual, true);
      assert.deepEqual(
        stored.camoCompletions,
        body === legacy ? undefined : camoKeys,
      );
    }
    await p.goto(base + path);
    await ready(p);
    const variant = await p.evaluate(
      () =>
        document.querySelector("[data-ui-variant]")?.dataset.uiVariant ||
        "legacy",
    );
    for (const width of [320, 390, 768, 1280, 1920]) {
      await p.setViewportSize({ width, height: 900 });
      assert(
        await p.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        "overflow " + width,
      );
      const boxes = await p
        .locator('[data-camo-tier="military"] [data-camo-tile]')
        .evaluateAll((nodes) =>
          nodes.map((n) => ({
            x: n.getBoundingClientRect().x,
            y: n.getBoundingClientRect().y,
          })),
        );
      assert(
        Math.abs(boxes[0].y - boxes[3].y) < 2 && boxes[4].y > boxes[0].y,
        "Military2x4 " + width,
      );
      if (width === 320) {
        await p.screenshot({
          path: `test-results/camo-grid-${name}-${variant}-320.png`,
          fullPage: true,
        });
      }
    }
    await p.setViewportSize({ width: 320, height: 900 });
    await p.evaluate(() => (document.documentElement.style.fontSize = "200%"));
    assert(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      "200%overflow",
    );
    await p.evaluate(() => (document.documentElement.style.fontSize = ""));
    await p.setViewportSize({ width: 1280, height: 900 });
    await tile(p, "gold").click();
    const { default: AxeBuilder } = await import(
      "../../tools/hajin-map/node_modules/@axe-core/playwright/dist/index.mjs"
    );
    for (const theme of ["dark", "light"]) {
      await p.evaluate(
        (t) => (document.documentElement.dataset.theme = t),
        theme,
      );
      const contrast = await p
        .locator("[data-camo-tile]")
        .first()
        .evaluate((n) => {
          const css = getComputedStyle(n),
            rgb = (value) =>
              value
                .match(/[\d.]+/g)
                .slice(0, 3)
                .map(Number);
          const lum = (value) =>
            rgb(value)
              .map((v) => {
                v /= 255;
                return v <= 0.04045
                  ? v / 12.92
                  : Math.pow((v + 0.055) / 1.055, 2.4);
              })
              .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
          const fg = lum(css.color),
            bg = lum(css.backgroundColor);
          return (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05);
        });
      assert(
        contrast >= 4.5,
        name + " " + theme + " actual tile text contrast " + contrast,
      );
      const result = await new AxeBuilder({ page: p }).analyze();
      assert.deepEqual(
        result.violations.map((v) => ({
          id: v.id,
          targets: v.nodes.map((n) => n.target),
        })),
        [],
        name + " " + theme + " axe",
      );
      if (theme === "light")
        await p.screenshot({
          path: `test-results/camo-grid-${name}-${variant}-light.png`,
          fullPage: true,
        });
    }
    await p.evaluate(() => {
      document.documentElement.dataset.theme = "dark";
      scrollTo(0, 0);
    });
    await p.screenshot({
      path: `test-results/camo-grid-${name}-${variant}.png`,
      fullPage: true,
    });
    assert.deepEqual(errors, []);
    assert.deepEqual(external, []);
    console.log(
      `090 ${name}/${variant} fourtiers19+6,Military8/Specialparallel/Gold,undo,reload,shared,backup,stablecheckbox,5sizes,200%,dark/lightaxe PASS`,
    );
  } finally {
    await context.close();
  }
}
async function recovery(browser, base, name) {
  const context = await browser.newContext(),
    p = await context.newPage();
  try {
    await p.goto(base + path);
    await ready(p);
    await tile(p, "military-camo-1").click();
    await p.evaluate(() => {
      const original = IDBObjectStore.prototype.put;
      window.syntheticRestorePut = () =>
        (IDBObjectStore.prototype.put = original);
      IDBObjectStore.prototype.put = function (...args) {
        if (this.transaction.db.name === "dmz-armory-local")
          throw new DOMException("Synthetic quota", "QuotaExceededError");
        return original.apply(this, args);
      };
    });
    await check(p, "military-camo-1").click();
    await p
      .locator("#camo-save-error")
      .filter({ hasText: "Unsaved ticks retained" })
      .waitFor();
    assert.equal(
      await tile(p, "military-camo-1").getAttribute("data-state"),
      "next",
    );
    assert(!(await check(p, "military-camo-1").isChecked()));
    await p.evaluate(() => window.syntheticRestorePut());
    await p.locator("#camo-retry").click();
    await p.waitForFunction(
      () =>
        document.querySelector('[data-camo-tile="military-camo-1"]').dataset
          .state === "completed",
    );
    assert.equal((await saved(p)).revision, 1);
    // An external durable write makes this page stale without focusing another tab.
    await p.evaluate(async () => {
      const { readArmory, saveArmory } = await import(
        "/assets/src/storage/armory-store.mjs"
      );
      const w = (await readArmory()).value;
      w.acquisition["han-86"] = {
        manual: true,
        manualExtractions: 2,
        attachments: [],
        blueprints: ["Synthetic preserved"],
      };
      await saveArmory(w, w.revision);
    });
    await tile(p, "military-camo-2").click();
    await check(p, "military-camo-2").click();
    await p
      .locator("#camo-save-error")
      .filter({ hasText: "Another tab saved" })
      .waitFor();
    assert.equal((await saved(p)).revision, 2);
    assert(
      !(await saved(p)).camoCompletions.includes(
        "weapon:han-86:military-camo-2",
      ),
    );
    await p.locator("#camo-reload").click();
    await ready(p);
    await tick(p, "military-camo-2");
    assert.equal((await saved(p)).acquisition["han-86"].manualExtractions, 2);
    console.log(
      `090 ${name} quota retained/retry and staleCAS/reload preserves otherwriter PASS`,
    );
  } finally {
    await context.close();
  }
  const denied = await browser.newContext();
  await denied.addInitScript(() =>
    Object.defineProperty(window, "indexedDB", { value: undefined }),
  );
  try {
    const p = await denied.newPage();
    await p.goto(base + path);
    await p.locator("#camo-save-error").waitFor();
    await tile(p, "gold").click();
    assert(await check(p, "gold").isDisabled());
    assert.equal(await tile(p, "gold").getAttribute("data-state"), "unknown");
  } finally {
    await denied.close();
  }
  const corrupt = await browser.newContext();
  try {
    const p = await corrupt.newPage();
    await p.goto(base + "/armory/camos/");
    await p.evaluate(async () => {
      await new Promise((resolve, reject) => {
        const r = indexedDB.open("dmz-armory-local", 1);
        r.onupgradeneeded = () => r.result.createObjectStore("workspace");
        r.onsuccess = () => {
          const db = r.result,
            tx = db.transaction("workspace", "readwrite");
          tx.objectStore("workspace").put({ bad: "Synthetic corrupt" }, "main");
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      });
    });
    await p.goto(base + path);
    await p.locator("#camo-save-error").waitFor();
    assert(await check(p, "gold").isDisabled());
    const retained = await p.evaluate(async () => {
      const { readExistingRecord } = await import(
        "/assets/src/storage/summary-read.mjs"
      );
      return await readExistingRecord("dmz-armory-local", "workspace", "main");
    });
    assert.equal(retained.bad, "Synthetic corrupt");
  } finally {
    await corrupt.close();
  }
  console.log(
    `090 ${name} denied/corrupt remain readable and never reset PASS`,
  );
  const race = await browser.newContext();
  try {
    const p = await race.newPage();
    await p.goto(base + path);
    await ready(p);
    await p.evaluate(async () => {
      await new Promise((resolve, reject) => {
        const r = indexedDB.open("dmz-armory-local", 1);
        r.onupgradeneeded = () => r.result.createObjectStore("workspace");
        r.onsuccess = () => {
          const db = r.result,
            tx = db.transaction("workspace", "readwrite");
          tx.objectStore("workspace").put(
            { bad: "Synthetic corruption after clean discovery" },
            "main",
          );
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      });
    });
    await tile(p, "military-camo-1").click();
    await check(p, "military-camo-1").click();
    await p
      .locator("#camo-save-error")
      .filter({ hasText: "Invalid private armory envelope" })
      .waitFor();
    const retained = await p.evaluate(async () => {
      const { readExistingRecord } = await import(
        "/assets/src/storage/summary-read.mjs"
      );
      return await readExistingRecord("dmz-armory-local", "workspace", "main");
    });
    assert.equal(retained.bad, "Synthetic corruption after clean discovery");
    console.log(
      `090 ${name} corruption between clean read andsave never overwrites envelope PASS`,
    );
  } finally {
    await race.close();
  }
  const future = await browser.newContext();
  try {
    const p = await future.newPage();
    await p.goto(base + path);
    await ready(p);
    await p.evaluate(async () => {
      const { emptyArmory } = await import(
        "/assets/src/domain/armory-workspace.mjs"
      );
      const value = emptyArmory();
      value.version = 2;
      await new Promise((resolve) => {
        const r = indexedDB.open("dmz-armory-local", 1);
        r.onupgradeneeded = () => r.result.createObjectStore("workspace");
        r.onsuccess = () => {
          const db = r.result,
            tx = db.transaction("workspace", "readwrite");
          tx.objectStore("workspace").put({ value, previous: null }, "main");
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
        };
      });
    });
    await tile(p, "military-camo-1").click();
    await check(p, "military-camo-1").click();
    await p
      .locator("#camo-save-error")
      .filter({ hasText: "Invalid private workspace version" })
      .waitFor();
    const retained = await p.evaluate(async () => {
      const { readExistingRecord } = await import(
        "/assets/src/storage/summary-read.mjs"
      );
      return await readExistingRecord("dmz-armory-local", "workspace", "main");
    });
    assert.equal(retained.value.version, 2);
    console.log(
      "090 " +
        name +
        " unsupported same-revision record inserted before save retained PASS",
    );
  } finally {
    await future.close();
  }
}
async function lateAck(browser, base, name) {
  const context = await browser.newContext(),
    p = await context.newPage();
  try {
    await p.goto(base + path);
    await ready(p);
    await p.evaluate(() => {
      const d = Object.getOwnPropertyDescriptor(
        IDBTransaction.prototype,
        "oncomplete",
      );
      window.syntheticAckRestore = () =>
        Object.defineProperty(IDBTransaction.prototype, "oncomplete", d);
      window.syntheticHoldAck = true;
      Object.defineProperty(IDBTransaction.prototype, "oncomplete", {
        ...d,
        set(handler) {
          const tx = this;
          d.set.call(tx, function (event) {
            if (
              tx.db.name === "dmz-armory-local" &&
              tx.mode === "readwrite" &&
              window.syntheticHoldAck
            ) {
              window.syntheticHoldAck = false;
              window.syntheticReleaseAck = () => handler.call(tx, event);
            } else handler.call(tx, event);
          });
        },
      });
    });
    await tile(p, "military-camo-1").click();
    await check(p, "military-camo-1").check();
    await p.waitForFunction(
      () => typeof window.syntheticReleaseAck === "function",
    );
    assert.equal((await saved(p)).revision, 1);
    await p.evaluate(async () => {
      window.dispatchEvent(
        new PageTransitionEvent("pagehide", { persisted: true }),
      );
      const { readArmory, saveArmory } = await import(
        "/assets/src/storage/armory-store.mjs"
      );
      const w = (await readArmory()).value;
      w.camoCompletions = ["weapon:han-86:military-camo-2"];
      await saveArmory(w, w.revision);
      window.dispatchEvent(
        new PageTransitionEvent("pageshow", { persisted: true }),
      );
      window.syntheticReleaseAck();
    });
    await p.waitForFunction(
      () =>
        document.querySelector("#camo-tracker").dataset.revision === "2" &&
        document.querySelector("#camo-tracker").dataset.busy === "false",
    );
    assert.equal(
      await tile(p, "military-camo-1").getAttribute("data-state"),
      "next",
    );
    assert.equal(
      await tile(p, "military-camo-2").getAttribute("data-state"),
      "completed",
    );
    assert.equal((await saved(p)).revision, 2);
    await p.evaluate(() => window.syntheticAckRestore());
    console.log(
      `090 ${name} late durable save acknowledgement acrossresume rereads newerwriter with no replay PASS`,
    );
  } finally {
    await context.close();
  }
}
const server = await startBrowserServer();
await mkdir("test-results", { recursive: true });
try {
  for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
    const browser = await engine.launch();
    try {
      await main(browser, server.base, name);
      await recovery(browser, server.base, name);
      await lateAck(browser, server.base, name);
    } finally {
      await browser.close();
    }
  }
  const browser = await chromium.launch();
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const p = await context.newPage();
    await p.goto(server.base + path);
    assert.equal(await p.locator("noscript li").count(), 25);
    assert.equal(
      await p.locator('noscript a[href^="/local-camo-images/"]').count(),
      25,
    );
    assert.equal(await p.locator("[data-camo-complete]:enabled").count(), 0);
    const databases = await p.evaluate(async () =>
      typeof indexedDB.databases === "function"
        ? (await indexedDB.databases()).map((d) => d.name)
        : [],
    );
    assert(
      !databases.includes("dmz-armory-local"),
      "No-JS reference must not create an armory database",
    );
    console.log("090 noJS all25 requirements/localpicturelinks readable PASS");
  } finally {
    await context.close();
    await browser.close();
  }
} finally {
  await server.stop();
}
