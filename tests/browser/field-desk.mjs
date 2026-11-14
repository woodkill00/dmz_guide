import assert from "node:assert/strict";
import { readFile, mkdir } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { chromium, firefox, webkit } from "playwright";
const engine = process.env.BROWSER || "chromium",
  browser = await { chromium, firefox, webkit }[engine].launch(),
  context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  }),
  page = await context.newPage();
const base = "http://127.0.0.1:4173",
  pack = "official:mw4-dmz-starter",
  url = base + "/field-desk/?pack=" + encodeURIComponent(pack),
  errors = [],
  external = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("request", (request) => {
  if (!request.url().startsWith(base) && /^https?:/.test(request.url()))
    external.push(request.url());
});
if (process.env.FIELD_TEST_SOURCE === "1")
  await context.route("**/assets/src/**/*.mjs", async (route) => {
    const path = resolve(
      decodeURIComponent(new URL(route.request().url()).pathname).slice(
        "/assets/".length,
      ),
    );
    if (!path.startsWith(resolve("src") + sep))
      throw Error("Source test path escaped src");
    await route.fulfill({
      contentType: "text/javascript",
      body: await readFile(path, "utf8"),
    });
  });
const ready = async () => {
  await page.waitForFunction(
    () => document.querySelector("main")?.getAttribute("aria-busy") === "false",
  );
  await page.waitForLoadState("networkidle");
  assert(
    await page.locator("#error").isHidden(),
    await page.locator("#error").textContent(),
  );
};
const profile = () =>
  page.evaluate(async () => {
    const { state } = await import("/assets/src/client/common.mjs");
    return structuredClone(state.profile);
  });
const confirm = async () => {
  await page.locator("#field-confirm").click();
  await page.waitForFunction(
    () => document.querySelector("#field-review")?.hidden === true,
  );
  await page.waitForLoadState("networkidle");
  assert(
    await page.locator("#error").isHidden(),
    await page.locator("#error").textContent(),
  );
};
let png;
try {
  await page.goto(url);
  await ready();
  png = Buffer.from(
    await page.evaluate(() => {
      const canvas = document.createElement("canvas");
      canvas.width = 700;
      canvas.height = 230;
      const c = canvas.getContext("2d");
      c.fillStyle = "white";
      c.fillRect(0, 0, 700, 230);
      c.fillStyle = "black";
      c.font = "36px Arial";
      c.fillText("Bandage 12", 40, 80);
      c.fillText("Biomaterials 8", 40, 160);
      return canvas.toDataURL().split(",")[1];
    }),
    "base64",
  );
  if (engine === "chromium" || process.env.FIELD_TEST_OCR === "1") {
    await page.locator("#scan-files").setInputFiles({
      name: "synthetic-stash.png",
      mimeType: "image/png",
      buffer: png,
    });
    await page.waitForFunction(
      () =>
        document
          .querySelector("#scan-progress")
          ?.textContent.includes("complete"),
      {},
      { timeout: 100000 },
    );
    assert.equal(
      await page.locator('[data-scan-item="0"]').inputValue(),
      "mw4:bandage",
    );
    assert.equal(
      await page.locator('[data-scan-count="0"]').inputValue(),
      "12",
    );
    assert.equal(await page.locator('[data-scan-count="1"]').inputValue(), "8");
  } else {
    await page
      .getByText("Recognized text / manual text import", { exact: true })
      .click();
    await page.locator("#scan-text").fill("Bandage 12\nBiomaterials 8");
    await page.locator("#scan-parse").click();
  }
  assert.equal((await profile()).inventory["mw4:bandage"], undefined);
  await page.locator("#scan-preview").click();
  await page.locator('[data-scan-count="0"]').fill("13");
  assert(await page.locator("#field-review").isHidden());
  await page.locator('[data-scan-count="0"]').fill("12");
  await page.locator("#scan-preview").click();
  assert.match(await page.locator("#field-review").innerText(), /12/);
  await confirm();
  assert.equal((await profile()).inventory["mw4:bandage"], 12);
  assert.equal((await profile()).fieldOps.history.length, 1);
  await page.reload();
  await ready();
  await page.locator("#field-query").fill("Bandage");
  await page.locator('[data-transfer-count="mw4:bandage"]').fill("3");
  await page.locator('[data-transfer-out="mw4:bandage"]').click();
  await confirm();
  assert.equal((await profile()).inventory["mw4:bandage"], 9);
  assert.equal((await profile()).fieldOps.carried["mw4:bandage"], 3);
  await page.goto(base + "/run-plan/?pack=" + encodeURIComponent(pack));
  await ready();
  await page.locator("#run-plan-name").fill("Synthetic prep plan");
  await page.locator("#run-plan-create button").click();
  await page.getByRole("heading", { name: "Synthetic prep plan" }).waitFor();
  await page.goto(url);
  await ready();
  await page
    .locator("#match-plan option")
    .filter({ hasText: "Synthetic prep plan" })
    .waitFor({ state: "attached" });
  await page
    .locator("#match-plan")
    .selectOption({ label: "Synthetic prep plan" });
  await page.locator("#match-name").fill("Synthetic Hajin run");
  await page.locator("#match-start").click();
  const objectiveId = "mw4:order-gear-up";
  await page.selectOption("#match-objective", objectiveId);
  await page.locator("#match-add-objective").click();
  await page.locator("#match-stop").fill("Synthetic safe stop");
  await page.locator("#match-add-stop").click();
  await page.selectOption("#run-item", "mw4:bandage");
  await page.selectOption("#run-pool", "carried");
  await page.selectOption("#run-action", "lost");
  await page.locator("#run-quantity").fill("1");
  await page.locator("#run-form button").click();
  await page.selectOption("#run-pool", "stash");
  await page.selectOption("#run-action", "extracted");
  await page.locator("#run-quantity").fill("4");
  await page.locator("#run-form button").click();
  await page.locator("#run-preview").click();
  assert.match(
    await page.locator("#field-review").innerText(),
    /Synthetic Hajin run/,
    await page.locator("#field-status").innerText(),
  );
  await confirm();
  assert.equal((await profile()).inventory["mw4:bandage"], 13);
  assert.equal((await profile()).fieldOps.carried["mw4:bandage"], 2);
  assert.equal((await profile()).completion[objectiveId], "completed");
  assert.equal((await profile()).fieldOps.matches[0].planRevision, 1);
  assert.equal(
    (await profile()).fieldOps.matches[0].stops[0],
    "Synthetic safe stop",
  );
  await page.locator("#match-history > details > summary").click();
  await page.locator("#match-history li details > summary").click();
  assert.match(
    await page.locator("#match-history").innerText(),
    /Synthetic safe stop/,
  );
  await page.locator("[data-undo-match]").click();
  await confirm();
  assert.equal((await profile()).inventory["mw4:bandage"], 9);
  assert.equal((await profile()).fieldOps.carried["mw4:bandage"], 3);
  assert.equal((await profile()).completion[objectiveId], "unknown");
  await page.selectOption("#discovery-item", "mw4:bandage");
  await page.locator("#discovery-place").fill("Synthetic warehouse");
  await page.locator("#discovery-container").fill("Synthetic locker");
  await page
    .locator("#discovery-notes")
    .fill("Original test observation, not game facts");
  await page.locator("#discovery-quantity").fill("2");
  await page.locator("#discovery-photo").setInputFiles({
    name: "synthetic-photo.png",
    mimeType: "image/png",
    buffer: png,
  });
  await page.locator("#discovery-form button").click();
  await page.locator("#field-review img").waitFor();
  await confirm();
  const discovered = await profile();
  assert.equal(discovered.fieldOps.discoveries.length, 1);
  assert.equal(discovered.inventory["mw4:bandage"], 9);
  await page.locator("#discovery-list summary").first().click();
  await page.locator("[data-show-photo]").click();
  await page.locator("#discovery-list img").evaluate((image) => image.decode());
  await page.locator("[data-edit-discovery]").click();
  await page.locator("#discovery-place").fill("Synthetic corrected place");
  await page.locator("#discovery-form button").click();
  await confirm();
  assert.equal(
    (await profile()).fieldOps.discoveries[0].place,
    "Synthetic corrected place",
  );
  assert.equal((await profile()).fieldOps.discoveries.length, 1);
  const downloaded = page.waitForEvent("download");
  await page.locator("#field-export").click();
  const backup = JSON.parse(
    await readFile(await (await downloaded).path(), "utf8"),
  );
  assert.equal(backup.photos.length, 1);
  assert.equal(backup.profile.fieldOps.carried["mw4:bandage"], 3);
  const photoId = backup.photos[0].id;
  await page.evaluate(async () => {
    const { state } = await import("/assets/src/client/common.mjs"),
      { saveProfile } = await import("/assets/src/storage/store.mjs");
    const candidate = structuredClone(state.profile);
    candidate.inventory["mw4:bandage"] = 20;
    await saveProfile(candidate, state.revision, {
      label: "Synthetic external inventory edit",
    });
  });
  await page.reload();
  await ready();
  assert.equal((await profile()).inventory["mw4:bandage"], 20);
  assert(
    (await profile()).fieldOps.history.some(
      (entry) => entry.label === "Synthetic external inventory edit",
    ),
  );
  await page.locator("#field-import").setInputFiles({
    name: "field-backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  await page.locator("#field-review").waitFor();
  await confirm();
  assert.equal((await profile()).inventory["mw4:bandage"], 9);
  assert.equal((await profile()).fieldOps.discoveries[0].photoId, photoId);
  if (!(await page.locator("#scan-text").isVisible()))
    await page
      .getByText("Recognized text / manual text import", { exact: true })
      .click();
  await page
    .locator("#scan-text")
    .fill(
      engine === "chromium"
        ? "Bandage 12\nBiomaterials 8"
        : "Bandage 12\nBiomaterials 8",
    );
  if (engine === "chromium" || process.env.FIELD_TEST_OCR === "1") {
    await page.locator("#scan-files").setInputFiles({
      name: "synthetic-stash.png",
      mimeType: "image/png",
      buffer: png,
    });
    await page.waitForFunction(() =>
      document
        .querySelector("#field-status")
        ?.textContent.includes("already imported"),
    );
    assert.equal(await page.locator("[data-scan-row]").count(), 0);
  } else {
    await page.locator("#scan-parse").click();
    await page.locator("#scan-preview").click();
    assert.match(await page.locator("#error").textContent(), /already applied/);
  }
  await page.locator("#field-discard").click();
  await page.reload();
  await ready();
  for (const theme of ["dark", "light"]) {
    await page.evaluate(
      (theme) => (document.documentElement.dataset.theme = theme),
      theme,
    );
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        `${theme} ${width}`,
      );
    }
  }
  await mkdir(".local/item-icons/field-desk", { recursive: true });
  await page.screenshot({
    path: `.local/item-icons/field-desk/${engine}.png`,
    fullPage: true,
  });
  assert.deepEqual(errors, []);
  assert.deepEqual(external, []);
  console.log(
    `PASS Field desk ${engine}: ${engine === "chromium" || process.env.FIELD_TEST_OCR === "1" ? "real local OCR" : "text review"}, absolute scans, transfers, run batch, undo, journal, editable discovery/photo, complete backup restore, duplicate rejection, responsive themes and no external requests`,
  );
} finally {
  await browser.close();
}
