import assert from "node:assert/strict";
import {
  emptyKeyWorkspace,
  keyBackup,
} from "../../src/domain/key-workspace.mjs";
const ready = (page) =>
  page.locator('main[data-key-workspace-ready="true"]').waitFor();
const saved = (page) =>
  page.waitForFunction(
    () =>
      document.querySelector("#key-save-status").textContent ===
      "Saved on this device.",
  );
async function record(page) {
  return page.evaluate(async () =>
    (
      await import("/assets/src/storage/key-store.mjs")
    ).readKeyWorkspaceRecord(),
  );
}
async function putRaw(page, main, history) {
  return page.evaluate(
    async ({ main, history }) => {
      const db = await new Promise((resolve, reject) => {
        const r = indexedDB.open("dmz-keys-local", 1);
        r.onupgradeneeded = () => r.result.createObjectStore("workspace");
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      });
      await new Promise((resolve, reject) => {
        const t = db.transaction("workspace", "readwrite"),
          s = t.objectStore("workspace");
        s.put(main, "main");
        if (history !== undefined) s.put(history, "quarantine");
        t.oncomplete = resolve;
        t.onabort = () => reject(t.error);
      });
      db.close();
    },
    { main, history },
  );
}
async function importBackup(page, state) {
  await page.locator("#key-backup-tools").evaluate((e) => (e.open = true));
  await page.locator("#key-import").setInputFiles({
    name: "keys.json",
    mimeType: "application/json",
    buffer: Buffer.from(keyBackup(state)),
  });
  await page.locator("#key-restore-preview:not([hidden])").waitFor();
}
export async function runKeyWorkspaceTests({ browser, base }) {
  const context = await browser.newContext({ acceptDownloads: true }),
    page = await context.newPage(),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  try {
    await page.goto(base + "/keys/hospital-chemical-lockers/");
    await ready(page);
    const q = page.locator('[data-private-field="quantity"]');
    await q.fill("2");
    await saved(page);
    await page.locator(".key-stock-extra summary").click();
    const uses = page.locator('[data-private-field="remainingUses"]');
    await uses.fill("4");
    await saved(page);
    await page
      .locator('[data-private-field="notes"]')
      .fill("Private synthetic note <img src=x>");
    await saved(page);
    await page.locator('[data-key-action="favorite"]').click();
    await saved(page);
    await page.locator("[data-target-use]").check();
    await saved(page);
    await page.locator("#key-toggle-trip").click();
    assert.match(
      await page.locator("#key-trip-content").innerText(),
      /2 key types · 1 missing/,
    );
    const order = await page
      .locator("#key-trip-content ol li")
      .allTextContents();
    assert.match(order[0], /Hospital Chemical Lab/);
    assert.match(order[1], /Hospital Chemical Lockers/);
    await page.locator('[data-pack-key="hospital-chemical-lockers"]').check();
    await saved(page);
    await page.locator("[data-opened-use]").check();
    await saved(page);
    assert.equal(
      (await record(page)).value.stock["hospital-chemical-lockers"].quantity,
      2,
    );
    const download = page.waitForEvent("download");
    await page.locator("#key-download-trip").click();
    const d = await download;
    const stream = await d.createReadStream();
    let text = "";
    for await (const c of stream) text += c;
    assert(!text.includes("Private synthetic"));
    assert(text.includes("Hospital Chemical Lab"));
    await page.reload();
    await ready(page);
    assert.equal(await q.inputValue(), "2");
    assert.equal(
      await page
        .locator('[data-key-action="favorite"]')
        .getAttribute("aria-pressed"),
      "true",
    );
    await page.locator(".key-stock-extra summary").click();
    assert.equal(await uses.inputValue(), "4");
    // Real native partial number buffer must never become a saved null.
    await uses.fill("1");
    await saved(page);
    await uses.press("End");
    await uses.pressSequentially("e");
    if (await uses.evaluate((e) => e.validity.badInput)) {
      assert.match(
        await page.locator("#key-save-status").innerText(),
        /invalid/,
      );
      assert.equal(
        (await record(page)).value.stock["hospital-chemical-lockers"]
          .remainingUses,
        1,
      );
      await page.locator("#key-backup-tools").evaluate((e) => (e.open = true));
      assert(await page.locator("#key-export").isDisabled());
    }
    await uses.fill("4");
    await saved(page);
    await q.fill("3");
    await saved(page);
    assert.equal(
      (await record(page)).value.stock["hospital-chemical-lockers"]
        .remainingUses,
      null,
    );
    await page.locator("#key-toggle-trip").click();
    await page.locator("[data-remove-target]").click();
    await saved(page);
    assert.equal((await record(page)).value.targetUseIds.length, 0);
    await page.locator("[data-target-use]").check();
    await saved(page);
    await page.locator('[data-pack-key="hospital-chemical-lockers"]').check();
    await saved(page);
    page.once("dialog", (dialog) => dialog.accept());
    await page.locator("#key-clear-trip").click();
    await saved(page);
    const cleared = (await record(page)).value;
    assert.deepEqual(cleared.targetUseIds, []);
    assert.deepEqual(cleared.packedKeyIds, []);
    assert.equal(cleared.stock["hospital-chemical-lockers"].quantity, 3);
    assert(cleared.favorites.includes("hospital-chemical-lockers"));
    assert.equal(cleared.openedUseIds.length, 1);
    const backup = changeFixture();
    await importBackup(page, backup);
    await page.locator("#key-restore-cancel").click();
    assert.equal(await q.inputValue(), "3");
    await importBackup(page, backup);
    await page.locator("#key-restore-review").check();
    await page.locator("#key-restore-apply").click();
    await saved(page);
    assert.equal(await q.inputValue(), "7");
    assert.equal(
      (await record(page)).previous.stock["hospital-chemical-lockers"].quantity,
      3,
    );
    // New edits invalidate an already visible replacement.
    await importBackup(page, backup);
    await q.fill("8");
    await saved(page);
    assert(await page.locator("#key-restore-preview").isHidden());
    // Two tabs retain the losing draft without replacing the winner.
    const other = await context.newPage();
    await other.goto(base + "/keys/hospital-chemical-lockers/");
    await ready(other);
    await q.fill("9");
    await saved(page);
    await other.locator('[data-private-field="quantity"]').fill("10");
    await other.waitForFunction(
      () =>
        document.querySelector("#key-workspace").dataset.dirty === "true" &&
        document
          .querySelector("#key-save-status")
          .textContent.includes("Unsaved draft"),
    );
    assert.equal(
      await other.locator('[data-private-field="quantity"]').inputValue(),
      "10",
    );
    assert.equal(
      (await record(page)).value.stock["hospital-chemical-lockers"].quantity,
      9,
    );
    other.on("dialog", (d) => d.accept());
    await other.close();
    await page.goto(base + "/keys/");
    await ready(page);
    await page.locator("#key-search").fill("Police");
    const duplicate = page.locator(
      '[data-private-field="quantity"][data-key-id="police-station-armory"]:visible',
    );
    assert.equal(await duplicate.count(), 4);
    await duplicate.first().fill("2");
    await saved(page);
    assert.deepEqual(
      await duplicate.evaluateAll((es) => es.map((e) => e.value)),
      ["2", "2", "2", "2"],
    );
    await page.locator("#key-view").selectOption("owned");
    assert.equal(await page.locator("[data-key-row]:visible").count(), 4);
    await page.locator("#key-search").fill("");
    await page.locator("#key-view").selectOption("favorites");
    assert.equal(await page.locator("[data-key-row]:visible").count(), 1);
    await page.locator("#key-view").selectOption("all");
    await page.locator("#key-density").selectOption("comfortable");
    await saved(page);
    await page.reload();
    await ready(page);
    assert.equal(
      await page.locator("#key-density").inputValue(),
      "comfortable",
    );
    for (const width of [320, 390, 768, 1440])
      for (const zoom of [false, true]) {
        await page.setViewportSize({ width, height: 1000 });
        await page.evaluate(
          (z) => (document.documentElement.style.fontSize = z ? "200%" : ""),
          zoom,
        );
        assert(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
          `${width}/${zoom}: ${JSON.stringify(
            await page.evaluate(() =>
              [...document.querySelectorAll("main *")]
                .filter((node) => {
                  const box = node.getBoundingClientRect();
                  return box.width > 0 && box.right > innerWidth + 1;
                })
                .slice(0, 8)
                .map((node) => ({
                  tag: node.tagName,
                  className: node.className,
                  text: node.textContent?.trim().slice(0, 45),
                  right: Math.round(node.getBoundingClientRect().right),
                })),
            ),
          )}`,
        );
      }
    await page.setViewportSize({ width: 390, height: 1000 });
    await page.evaluate(() => (document.documentElement.style.fontSize = ""));
    assert(
      await page
        .locator(".key-use-actions label:visible")
        .evaluateAll((es) =>
          es.every((e) => e.getBoundingClientRect().height >= 44),
        ),
    );
    assert.deepEqual(errors, []);
    console.log(
      "057 key workspace journey PASS: stash/notes/favorite/uses/readiness/trip/packing/no consumption/restore/cancel/stale preview/CAS/duplicates/filters/density/8 layouts",
    );
  } finally {
    page.on("dialog", (d) => d.accept());
    await context.close();
  }
  // Real IndexedDB transactions: previous snapshots, CAS, corrupt primitives, archive append and rollback.
  const c = await browser.newContext(),
    p = await c.newPage();
  try {
    await p.goto(base + "/keys/");
    await ready(p);
    const result = await p.evaluate(async () => {
      const m = await import("/assets/src/storage/key-store.mjs"),
        d = await import("/assets/src/domain/key-workspace.mjs"),
        a = d.changeKeyStock(d.emptyKeyWorkspace(), "test", 1),
        b = await m.saveKeyWorkspace(a, 0);
      let cas = false;
      try {
        await m.saveKeyWorkspace(a, 0);
      } catch {
        cas = true;
      }
      return {
        cas,
        revision: b.revision,
        previous: (await m.readKeyWorkspace()).previous.revision,
      };
    });
    assert.deepEqual(result, { cas: true, revision: 1, previous: 0 });
    await putRaw(p, null, [false]);
    const recovery = await p.evaluate(async () => {
      const m = await import("/assets/src/storage/key-store.mjs"),
        d = await import("/assets/src/domain/key-workspace.mjs");
      let corrupt = false;
      try {
        await m.readKeyWorkspace();
      } catch (e) {
        corrupt = e.code === "KEY_CORRUPT";
      }
      const v = await m.recoverKeyWorkspace(d.emptyKeyWorkspace(), "null");
      return {
        corrupt,
        revision: v.revision,
        history: await m.readKeyQuarantine(),
      };
    });
    assert.deepEqual(recovery, {
      corrupt: true,
      revision: 1,
      history: [false, null],
    });
    await putRaw(p, false, [false, null]);
    const rollback = await p.evaluate(async () => {
      const m = await import("/assets/src/storage/key-store.mjs"),
        d = await import("/assets/src/domain/key-workspace.mjs"),
        original = IDBObjectStore.prototype.put;
      IDBObjectStore.prototype.put = function (v, k) {
        if (k === "main") throw Error("synthetic write failure");
        return original.call(this, v, k);
      };
      let rejected = false;
      try {
        await m.recoverKeyWorkspace(d.emptyKeyWorkspace(), "false");
      } catch {
        rejected = true;
      } finally {
        IDBObjectStore.prototype.put = original;
      }
      return {
        rejected,
        main: await m.readKeyWorkspaceRecord(),
        history: await m.readKeyQuarantine(),
      };
    });
    assert.deepEqual(rollback, {
      rejected: true,
      main: false,
      history: [false, null],
    });
    await putRaw(p, false, Array(8).fill(null));
    assert(
      await p.evaluate(async () => {
        const m = await import("/assets/src/storage/key-store.mjs"),
          d = await import("/assets/src/domain/key-workspace.mjs");
        try {
          await m.recoverKeyWorkspace(d.emptyKeyWorkspace(), "false");
          return false;
        } catch {
          return (
            (await m.readKeyQuarantine()).length === 8 &&
            (await m.readKeyWorkspaceRecord()) === false
          );
        }
      }),
    );
    console.log(
      "057 IndexedDB PASS: revision CAS, previous snapshot, null corruption, append history, atomic rollback, full archive fails closed",
    );
  } finally {
    await c.close();
  }
  // The storage-unavailable path is explicit and remains exportable.
  const session = await browser.newContext();
  await session.addInitScript(() =>
    Object.defineProperty(globalThis, "indexedDB", { value: undefined }),
  );
  const sp = await session.newPage();
  try {
    await sp.goto(base + "/keys/hospital-chemical-lab/");
    await ready(sp);
    assert.match(
      await sp.locator("#key-save-status").innerText(),
      /Temporary session/,
    );
    await sp.locator('[data-private-field="quantity"]').fill("2");
    assert.match(await sp.locator("#key-save-status").innerText(), /not saved/);
  } finally {
    sp.on("dialog", (d) => d.accept());
    await session.close();
  }
  await runKeyFailureTests({ browser, base });
  // Hold an owned save to reproduce Reload racing a late commit.
  const held = await browser.newContext();
  await held.route("**/assets/src/storage/key-store.mjs", async (route) => {
    const response = await route.fetch();
    let source = await response.text();
    source = source.replace(
      "export async function saveKeyWorkspace(candidate, expectedRevision)",
      "async function originalSave(candidate, expectedRevision)",
    );
    source +=
      "\nexport async function saveKeyWorkspace(c,r){if(window.__holdSave)await new Promise(resolve=>window.__releaseSave=resolve);return originalSave(c,r)}";
    await route.fulfill({ response, body: source });
  });
  const hp = await held.newPage();
  try {
    await hp.goto(base + "/keys/hospital-chemical-lab/");
    await ready(hp);
    await hp.locator("#key-backup-tools").evaluate((e) => (e.open = true));
    await hp.evaluate(() => (window.__holdSave = true));
    await hp.locator('[data-private-field="quantity"]').fill("5");
    assert(await hp.locator("#key-reload").isDisabled());
    await hp.locator("#key-reload").evaluate((e) => e.click());
    await hp.evaluate(() => {
      window.__holdSave = false;
      window.__releaseSave();
    });
    await saved(hp);
    assert.equal(
      (await record(hp)).value.stock["hospital-chemical-lab"].quantity,
      5,
    );
    assert.equal(
      await hp.locator('[data-private-field="quantity"]').inputValue(),
      "5",
    );
    console.log("057 held-save Reload regression PASS");
  } finally {
    await held.close();
  }
}
function changeFixture() {
  const s = emptyKeyWorkspace();
  s.favorites = ["hospital-chemical-lockers"];
  s.stock["hospital-chemical-lockers"] = {
    quantity: 7,
    remainingUses: 8,
    notes: "Synthetic backup",
  };
  return s;
}

async function runKeyFailureTests({ browser, base }) {
  const context = await browser.newContext({ acceptDownloads: true }),
    page = await context.newPage();
  try {
    await page.goto(base + "/keys/hospital-chemical-lockers/");
    await ready(page);
    await putRaw(page, null, [{ damaged: "earlier synthetic record" }]);
    await page.reload();
    await ready(page);
    assert.equal(
      await page.locator("#key-workspace").getAttribute("data-storage-mode"),
      "corrupt",
    );
    assert(await page.locator('[data-private-field="quantity"]').isDisabled());
    await importBackup(page, changeFixture());
    await page.locator("#key-restore-review").check();
    assert(await page.locator("#key-restore-apply").isDisabled());
    const download = page.waitForEvent("download");
    await page.locator("#key-raw-export").click();
    const file = await download,
      stream = await file.createReadStream();
    let raw = "";
    for await (const c of stream) raw += c;
    const recovery = JSON.parse(raw);
    assert.equal(recovery.current, null);
    assert.equal(recovery.history[0].damaged, "earlier synthetic record");
    await page.locator("#key-restore-apply").click();
    await saved(page);
    assert.equal(
      await page.locator('[data-private-field="quantity"]').inputValue(),
      "7",
    );
    assert.deepEqual(
      await page.evaluate(async () =>
        (await import("/assets/src/storage/key-store.mjs")).readKeyQuarantine(),
      ),
      [{ damaged: "earlier synthetic record" }, null],
    );
    // Fail the next real transaction before it can replace the saved record.
    await page.evaluate(() => {
      window.__originalKeyPut = IDBObjectStore.prototype.put;
      IDBObjectStore.prototype.put = function (v, k) {
        if (k === "main")
          throw new DOMException(
            "Synthetic quota failure",
            "QuotaExceededError",
          );
        return window.__originalKeyPut.call(this, v, k);
      };
    });
    await page.locator('[data-private-field="quantity"]').fill("11");
    await page.waitForFunction(() =>
      document
        .querySelector("#key-save-status")
        .textContent.includes("Unsaved draft"),
    );
    assert.equal(
      (await record(page)).value.stock["hospital-chemical-lockers"].quantity,
      7,
    );
    const exported = page.waitForEvent("download");
    await page.locator("#key-export").click();
    const draft = await exported,
      ds = await draft.createReadStream();
    let payload = "";
    for await (const c of ds) payload += c;
    assert.equal(
      JSON.parse(payload).workspace.stock["hospital-chemical-lockers"].quantity,
      11,
    );
    await page.evaluate(
      () => (IDBObjectStore.prototype.put = window.__originalKeyPut),
    );
    page.once("dialog", (d) => d.accept());
    await page.locator("#key-reload").click();
    await saved(page);
    assert.equal(
      await page.locator('[data-private-field="quantity"]').inputValue(),
      "7",
    );
    // A delayed file parse must not resurrect a cancelled or superseded preview.
    await page.evaluate(() => {
      window.__originalKeyText = File.prototype.text;
      File.prototype.text = function () {
        const f = this;
        return new Promise(
          (resolve) =>
            (window.__releaseKeyText = () =>
              window.__originalKeyText.call(f).then(resolve)),
        );
      };
    });
    await page.locator("#key-import").setInputFiles({
      name: "delayed.json",
      mimeType: "application/json",
      buffer: Buffer.from(keyBackup(changeFixture())),
    });
    await page.waitForFunction(() => !!window.__releaseKeyText);
    await page.locator('[data-private-field="quantity"]').fill("12");
    await saved(page);
    await page.evaluate(() => window.__releaseKeyText());
    await page.waitForTimeout(100);
    assert(await page.locator("#key-restore-preview").isHidden());
    assert.equal(
      await page.locator('[data-private-field="quantity"]').inputValue(),
      "12",
    );
    await page.evaluate(() => (File.prototype.text = window.__originalKeyText));
    // Oversized/cyclic damaged records cannot be serialized or overwritten.
    assert(
      await page.evaluate(async () => {
        const m = await import("/assets/src/storage/key-store.mjs");
        let count = 0;
        const cyclic = {};
        cyclic.self = cyclic;
        for (const v of [cyclic, { data: "x".repeat(2097153) }])
          try {
            m.keyRecordText(v);
          } catch {
            count++;
          }
        return count === 2;
      }),
    );
    console.log(
      "057 failure journeys PASS: corrupt-null export/review/recovery, history retention, quota draft export/reload, stale file parse, oversized/cyclic refusal",
    );
  } finally {
    page.on("dialog", (d) => d.accept());
    await context.close();
  }
}
