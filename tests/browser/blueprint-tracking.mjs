import assert from "node:assert/strict";
import { chromium, firefox, webkit } from "playwright";
import { monitorBrowser } from "./health.mjs";
const base = "http://127.0.0.1:4173",
  packId = "official:mw4-dmz-starter";
for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
  const browser = await engine.launch(),
    health = monitorBrowser(browser);
  try {
    const context = await browser.newContext();
    await context.route(
      "**/assets/src/client/collection-action.mjs",
      async (route) => {
        const response = await route.fetch();
        let s = await response.text();
        s = s
          .replace(
            "export async function commitFoundOperation",
            "async function originalCommitFoundOperation",
          )
          .replace(
            "export async function verifyFoundOperation",
            "async function originalVerifyFoundOperation",
          );
        s +=
          '\nexport async function commitFoundOperation(op,options){const saved=await originalCommitFoundOperation(op,options);if(op.kind==="blueprint"&&window.holdBlueprintAck)await new Promise(resolve=>window.releaseBlueprintAck=()=>resolve());return saved} export async function verifyFoundOperation(op,options){if(op.kind==="blueprint"&&window.failBlueprintRead){window.failBlueprintRead=false;throw Error("Synthetic read failure")}return originalVerifyFoundOperation(op,options)}';
        await route.fulfill({ response, body: s });
      },
    );
    await context.route("**/assets/src/client/common.mjs", async (route) => {
      const response = await route.fetch();
      let body = await response.text();
      body = body.replace(
        "onCommitted?.(saved);",
        "if(window.holdBuildAck)await new Promise(resolve=>window.releaseBuildAck=()=>resolve());\n    onCommitted?.(saved);",
      );
      await route.fulfill({ response, body });
    });
    const page = await context.newPage();
    await page.goto(base + "/");
    await page.waitForSelector('[data-weapon-save-state="ready"]');
    const rare = await page.evaluate(async () => {
      const { newProfile } = await import("/assets/src/domain/profile.mjs");
      const { saveProfile } = await import("/assets/src/storage/store.mjs");
      const pack = await (
        await fetch("/assets/content/packs/official-starter.json")
      ).json();
      const p = newProfile(pack);
      p.inventory["mw4:bandage"] = 7;
      await saveProfile(p, 0);
      return pack.items.find(
        (r) => r.rarity?.toLowerCase() === "rare" && !r.spoiler,
      );
    });
    const read = () =>
      page.evaluate(
        async () =>
          (
            await (
              await import("/assets/src/storage/store.mjs")
            ).readRecord("profiles", "official:mw4-dmz-starter")
          ).value,
      );
    const rev = async (n) => {
      await page.waitForFunction(
        async (r) =>
          (
            await (
              await import("/assets/src/storage/store.mjs")
            ).readRecord("profiles", "official:mw4-dmz-starter")
          ).value.revision === r,
        n,
      );
    };
    const local = (id) =>
      base +
      "/local/?pack=" +
      encodeURIComponent(packId) +
      "&id=" +
      encodeURIComponent(id);
    await page.locator("#hub-refresh").click();
    await page.waitForSelector('[data-dash-blueprint-owned="mw4:bandage"]');
    const card = page.locator('[data-blueprint-id="mw4:bandage"]');
    assert.equal(await card.locator("[data-inventory-icon]").count(), 1);
    assert.equal(await card.locator("a").count(), 1);
    await page.locator('[data-dash-blueprint-owned="mw4:bandage"]').click();
    await rev(2);
    await page.waitForFunction(() =>
      document
        .querySelector("#hub-progress")
        ?.textContent.includes("revision 2"),
    );
    assert.equal(
      await page.locator('[data-blueprint-id="mw4:bandage"]').isVisible(),
      false,
    );
    await page
      .locator(
        '[data-blueprint-group="Consumables"] > .blueprint-owned > summary',
      )
      .click();
    assert.equal(
      await page
        .locator('[data-dash-blueprint-owned="mw4:bandage"]')
        .isChecked(),
      true,
    );
    await page.goto(local("mw4:bandage"));
    const edit = page.locator('[data-item-blueprint-edit="mw4:bandage"]');
    await edit.waitFor();
    await page.waitForFunction(
      () => !document.querySelector("[data-item-blueprint-edit]")?.disabled,
    );
    assert.equal(await edit.isChecked(), true);
    // Raw invalid build input is preserved and blocks a blueprint operation.
    const build = page.locator("[data-build-auto]").first(),
      quantity = build.locator("[data-build-quantity]");
    await page.waitForFunction(() =>
      document
        .querySelector("[data-build-status]")
        ?.textContent.includes("Saved locally"),
    );
    await quantity.evaluate((n) => {
      n.disabled = false;
      n.value = "";
    });
    await edit.click();
    assert.equal((await read()).revision, 2);
    assert.equal(await quantity.inputValue(), "");
    assert.match(
      await page.locator("[data-blueprint-save-status]").innerText(),
      /Finish or clear/,
    );
    await page.reload();
    await edit.waitFor();
    await page.waitForFunction(
      () => !document.querySelector("[data-item-blueprint-edit]")?.disabled,
    );
    // Selected private-picture upload drafts also block, without being cleared.
    await page.evaluate(() => {
      const input = document.createElement("input");
      input.type = "file";
      input.id = "synthetic-photo-draft";
      document.querySelector("#private-picture").append(input);
    });
    await page.locator("#synthetic-photo-draft").setInputFiles({
      name: "synthetic.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("synthetic fixture"),
    });
    await edit.click();
    assert.equal((await read()).revision, 2);
    assert.equal(
      await page
        .locator("#synthetic-photo-draft")
        .evaluate((n) => n.files.length),
      1,
    );
    await page.locator("#synthetic-photo-draft").evaluate((n) => n.remove());
    await edit.click();
    await rev(3);
    await page.waitForFunction(
      () => !document.querySelector("[data-item-blueprint-edit]")?.checked,
    );
    // Held blueprint write locks build controls and preserves stock.
    await page.evaluate(() => (window.holdBlueprintAck = true));
    await edit.click();
    await rev(4);
    await page.waitForFunction(
      () => typeof window.releaseBlueprintAck === "function",
    );
    assert.equal(
      await page.locator("[data-build-select]").first().isEnabled(),
      false,
    );
    await page.evaluate(() => {
      window.holdBlueprintAck = false;
      window.releaseBlueprintAck();
    });
    await page.waitForFunction(() =>
      document
        .querySelector("[data-blueprint-save-status]")
        ?.textContent.includes("Blueprint saved."),
    );
    // Actual transaction abort retains exact candidate for explicit retry.
    await page.evaluate(() => {
      const old = IDBObjectStore.prototype.put;
      window.restorePut = () => (IDBObjectStore.prototype.put = old);
      IDBObjectStore.prototype.put = function (...args) {
        if (this.name === "profiles")
          throw new DOMException("Synthetic quota", "QuotaExceededError");
        return old.apply(this, args);
      };
    });
    await edit.click();
    await page
      .locator('[data-blueprint-recovery-action="retry"]:enabled')
      .waitFor();
    assert.equal((await read()).revision, 4);
    assert.equal(await edit.isChecked(), true);
    await page.evaluate(() => window.restorePut());
    await page.locator('[data-blueprint-recovery-action="retry"]').click();
    await rev(5);
    await page.waitForFunction(
      () => !document.querySelector("[data-item-blueprint-edit]")?.checked,
    );
    await page.evaluate(() => (window.failBlueprintRead = true));
    await edit.click();
    await rev(6);
    await page
      .locator('[data-blueprint-recovery-action="verify"]:enabled')
      .waitFor();
    assert.equal(
      await page.locator('[data-blueprint-recovery-action="retry"]').count(),
      0,
    );
    await page.locator('[data-blueprint-recovery-action="verify"]').click();
    await page.waitForFunction(() =>
      document
        .querySelector("[data-blueprint-save-status]")
        ?.textContent.includes("Blueprint saved."),
    );
    assert.equal((await read()).revision, 6);
    assert.deepEqual((await read()).inventory, { "mw4:bandage": 7 });
    await page.goto(base + "/inventory/?pack=" + encodeURIComponent(packId));
    await page.locator('[data-item-blueprint="mw4:bandage"]').waitFor();
    assert.equal(
      await page.locator('[data-item-blueprint="mw4:bandage"]').isChecked(),
      true,
    );
    await page.goto(local(rare.id));
    await page.locator(".item-blueprint-state").waitFor();
    assert.equal(await page.locator("[data-item-blueprint-edit]").count(), 0);
    assert.match(
      await page.locator(".item-blueprint-state").innerText(),
      /No blueprint/,
    );
    await page.goto(base + "/items/mw4--bandage/");
    await page.waitForFunction(
      () =>
        document.querySelector("[data-item-blueprint-edit]")?.disabled ===
        false,
    );
    assert.equal(
      await page.locator("[data-item-blueprint-edit]").isChecked(),
      true,
    );
    await page.locator("[data-item-blueprint-edit]").click();
    await rev(7);
    await page.waitForFunction(() =>
      document
        .querySelector("[data-blueprint-save-status]")
        ?.textContent.includes("Blueprint saved."),
    );

    // A durable acknowledgement while hidden must remain a read-only pending operation.
    await page.evaluate(() => {
      window.holdBlueprintAck = true;
      window.releaseBlueprintAck = null;
    });
    await page.locator("[data-item-blueprint-edit]").click();
    await rev(8);
    await page.waitForFunction(
      () => typeof window.releaseBlueprintAck === "function",
    );
    await page.evaluate(async () => {
      window.dispatchEvent(
        new PageTransitionEvent("pagehide", { persisted: true }),
      );
      const store = await import("/assets/src/storage/store.mjs");
      const current = (
        await store.readRecord("profiles", "official:mw4-dmz-starter")
      ).value;
      delete current.itemBlueprints["mw4:bandage"];
      await store.saveProfile(current, current.revision);
      window.holdBlueprintAck = false;
      window.releaseBlueprintAck();
    });
    await page.waitForTimeout(150);
    assert.equal((await read()).revision, 9);
    assert.equal(
      await page.locator("[data-item-blueprint-edit]").isDisabled(),
      true,
    );
    await page.evaluate(() =>
      window.dispatchEvent(
        new PageTransitionEvent("pageshow", { persisted: true }),
      ),
    );
    await page.waitForFunction(
      () => !document.querySelector("[data-item-blueprint-edit]")?.disabled,
    );
    assert.equal(
      await page.locator("[data-item-blueprint-edit]").isChecked(),
      false,
    );
    assert.equal((await read()).revision, 9);

    await page.goto(local("mw4:bandage"));
    await page.waitForFunction(
      () =>
        document
          .querySelector("[data-build-status]")
          ?.textContent.includes("Saved locally") &&
        document.querySelector("[data-item-blueprint-edit]")?.disabled ===
          false,
    );
    await page.evaluate(() => (window.holdBuildAck = true));
    await page.locator("[data-build-select]").first().click();
    await rev(10);
    await page.waitForFunction(
      () => typeof window.releaseBuildAck === "function",
    );
    await page.locator("[data-item-blueprint-edit]").evaluate((n) => {
      n.checked = true;
      n.dispatchEvent(new Event("change", { bubbles: true }));
    });
    assert.equal((await read()).revision, 10);
    assert.equal((await read()).itemBlueprints?.["mw4:bandage"], undefined);
    await page.evaluate(() => {
      window.holdBuildAck = false;
      window.releaseBuildAck();
    });
    await page.waitForFunction(async () => {
      const { state } = await import("/assets/src/client/common.mjs");
      return state.revision === 10 && !state.saving;
    });
    assert.equal(
      await page.locator("[data-build-quantity]").first().inputValue(),
      "1",
    );
    await page.evaluate(async () => {
      const store = await import("/assets/src/storage/store.mjs");
      const { setUpgradeProgress } = await import(
        "/assets/src/domain/upgrade-progress.mjs"
      );
      const pack = await (
        await fetch("/assets/content/packs/official-starter.json")
      ).json();
      const current = (
        await store.readRecord("profiles", "official:mw4-dmz-starter")
      ).value;
      const candidate = setUpgradeProgress(
        pack,
        current,
        "mw4:upgrade-epic-ingredient-printing",
        { completion: "completed" },
        current.revision,
      );
      await store.saveProfile(candidate, current.revision);
    });
    await page.goto(local("mw4:ingredient-ballistic-fabric"));
    await page.waitForFunction(
      () =>
        document.querySelector("[data-item-blueprint-edit]")?.checked === true,
    );
    assert.equal(
      await page.locator("[data-item-blueprint-edit]").isDisabled(),
      true,
    );
    await page.goto(base + "/");
    await page.waitForSelector("[data-blueprint-group]");
    for (const width of [320, 390, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      );
    }
    if (name === "chromium")
      await page
        .locator("#dashboard-recipes")
        .screenshot({ path: "test-results/blueprints-dashboard.png" });
    health();
    console.log(
      name +
        ": grouped icon cards, manual owned/reopen, local+published+Inventory parity, Rare no blueprint, raw build/photo draft admission, held lock, quota retry, Verify/no replay and stock/mobile PASS",
    );
  } finally {
    await browser.close();
  }
}
