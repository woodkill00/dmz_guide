import assert from "node:assert/strict";
export async function runAdvancedBrowser(parent, base) {
  const page = await parent.context().newPage(),
    checks = [];
  const read = () =>
    page.evaluate(async (base) => {
      const { openWorkspace } = await import(`${base}/src/workspace/store.ts`);
      const db = await openWorkspace();
      try {
        return (await db.read()).current?.data;
      } finally {
        db.close();
      }
    }, base);
  await page.goto(base);
  await page.locator("#workspace-open:enabled").waitFor();
  await page.locator("#zoom-in:enabled").waitFor();
  await page.locator("#workspace-open").click();
  await page.locator("#workspace-tab-backup").click();
  await page.locator("#preview-mask-migration").click();
  const oldRaw = await page.evaluate(() =>
    localStorage.getItem("hajin.source-filters.v1.official"),
  );
  await page.locator("#commit-mask-migration").click();
  await page.waitForFunction(
    () =>
      document.querySelector("#workspace-message")?.textContent ===
      "Legacy source masks migrated",
  );
  assert.ok((await read()).migrations.includes("source-masks-v1"));
  assert.equal(
    await page.evaluate(() =>
      localStorage.getItem("hajin.source-filters.v1.official"),
    ),
    oldRaw,
  );
  await page.locator("#workspace-tab-sources").click();
  await page.locator("#preview-loaded-official").click();
  await page
    .getByLabel(
      "I reviewed the exact official frame identity and want to accept that registration.",
    )
    .check();
  await page.locator("#commit-snapshot").click();
  await page.waitForFunction(
    () =>
      document.querySelector("#workspace-message")?.textContent ===
      "Snapshot imported",
  );
  await page.locator("#close-workspace").click();
  await page.locator("#layers").click();
  await page.locator("#layers-key-source-master-official").focus();
  await page.keyboard.press("Space");
  await page.waitForFunction(
    () =>
      document.querySelector("#workspace-toast")?.textContent ===
      "Source visibility saved",
  );
  assert.equal(
    await page.evaluate(() => document.activeElement?.id),
    "layers-key-source-master-official",
  );
  assert.equal(
    await page.locator("#key-source-master-official").isChecked(),
    false,
  );
  await page.keyboard.press("Space");
  await page.waitForFunction(
    () =>
      document.querySelector("#key-source-master-official")?.checked === true,
  );
  await page.locator("#close-layers").click();
  assert.equal(
    await page.evaluate(() =>
      localStorage.getItem("hajin.source-filters.v1.official"),
    ),
    oldRaw,
  );
  checks.push(
    "one-time migration with frozen legacy bytes, Layers/key synchronization and keyboard focus",
  );
  await page.locator("#workspace-open").click();
  await page.locator("#workspace-tab-review").click();
  await page.locator("[data-review-record]").nth(1).check();
  await page.locator("#review-selected").click();
  await page.locator("#accept-review").click();
  await page.waitForFunction(
    () =>
      document.querySelector("#workspace-message")?.textContent ===
      "Review decision accepted",
  );
  let state = await read();
  const changed = structuredClone(state.snapshots[0].snapshot);
  changed.snapshotId = "synthetic-refresh-browser";
  changed.records[1].title = "SYNTHETIC changed source record";
  await page.locator("#workspace-tab-sources").click();
  await page.locator("#snapshot-file").setInputFiles({
    name: "source-refresh.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(changed)),
  });
  await page.locator("#preview-snapshot").click();
  await page
    .getByLabel(
      "I reviewed the exact official frame identity and want to accept that registration.",
    )
    .check();
  await page.locator("#commit-snapshot").click();
  await page.waitForFunction(
    () =>
      document.querySelector("#workspace-message")?.textContent ===
      "Snapshot imported",
  );
  state = await read();
  assert.equal(state.snapshots.length, 2);
  assert.ok(
    state.entities.some(
      (e) => e.acceptance === "accepted" && e.freshness === "stale",
    ),
  );
  await page
    .getByRole("button", { name: "Inspect all raw records", exact: true })
    .last()
    .click();
  await page
    .getByLabel("Search all raw records", { exact: true })
    .fill("changed source");
  await page
    .getByRole("heading", {
      name: "SYNTHETIC changed source record",
      exact: true,
    })
    .waitFor();
  await page
    .getByRole("button", { name: "Close raw inspection", exact: true })
    .click();
  checks.push(
    "refresh diff/stale review and complete unplotted/raw evidence inspection",
  );
  // Cancel a deliberately stalled decoder. Nothing may be committed after cancellation.
  await page.locator("#workspace-tab-icons").click();
  const image = Buffer.from(
    await page.evaluate(() => {
      const c = document.createElement("canvas");
      c.width = c.height = 32;
      const x = c.getContext("2d");
      x.fillStyle = "#7296bc";
      x.fillRect(0, 0, 32, 32);
      return c.toDataURL("image/png").split(",")[1];
    }),
    "base64",
  );
  await page.locator("#custom-icon-file").setInputFiles({
    name: "cancel.png",
    mimeType: "image/png",
    buffer: image,
  });
  await page
    .locator("#custom-icon-description")
    .fill("SYNTHETIC cancelled icon");
  await page.locator("#custom-icon-rights").fill("Owned synthetic pixels");
  await page.locator("#custom-icon-owned").check();
  const beforeIcons = (await read()).icons.length;
  await page.evaluate(() => {
    window.__originalBitmap = createImageBitmap;
    window.createImageBitmap = () => new Promise(() => {});
  });
  await page.locator("#preview-custom-icon").click();
  await page
    .locator("#cancel-workspace-processing")
    .waitFor({ state: "visible" });
  await page.locator("#cancel-workspace-processing").click();
  await page.waitForFunction(() =>
    document
      .querySelector("#workspace-message")
      ?.textContent.includes("cancelled"),
  );
  await page.evaluate(() => {
    window.createImageBitmap = window.__originalBitmap;
    delete window.__originalBitmap;
  });
  assert.equal((await read()).icons.length, beforeIcons);
  await page.locator("#cancel-workspace-draft").click();
  checks.push("cancellable bounded icon decode with no late commit");
  await page.locator("#workspace-tab-sources").click();
  await page.locator("#background-file").setInputFiles({
    name: "owned-background.png",
    mimeType: "image/png",
    buffer: image,
  });
  await page
    .locator("#background-description")
    .fill("SYNTHETIC owned comparison background");
  await page.locator("#background-owned").check();
  await page.locator("#preview-background").click();
  await page.locator("#commit-background").click();
  await page.waitForFunction(
    () =>
      document.querySelector("#workspace-message")?.textContent ===
      "Background saved",
  );
  state = await read();
  assert.equal(state.basemaps[0].sourceId, "owned");
  await page
    .getByRole("button", { name: "Calibrate background", exact: true })
    .click();
  await page
    .locator("#registration-fit")
    .fill(
      "0,0,0,0,synthetic top left\n32,0,4096,0,synthetic top right\n0,32,0,4096,synthetic bottom left",
    );
  await page
    .locator("#registration-holdout")
    .fill(
      "30,30,3840,3840,synthetic held-out edge\n2,2,256,256,synthetic held-out independent",
    );
  await page.locator("#registration-axes").check();
  await page.locator("#validate-registration").click();
  assert.equal(await page.locator("#accept-registration").isEnabled(), true);
  await page
    .locator(".registration-images img")
    .first()
    .click({ position: { x: 5, y: 5 } });
  assert.equal(await page.locator("#accept-registration").isDisabled(), true);
  await page.locator("#validate-registration").click();
  await page.locator("#accept-registration").click();
  await page.waitForFunction(
    () =>
      document.querySelector("#workspace-message")?.textContent ===
      "Background registration accepted",
  );
  await page.locator("#close-workspace").click();
  await page.locator("#toggle-key").click();
  state = await read();
  await page
    .locator("#comparison-background")
    .selectOption(state.basemaps[0].id);
  await page.waitForFunction(
    () => document.querySelectorAll(".leaflet-image-layer").length === 2,
  );
  await page.locator("#comparison-opacity").focus();
  await page.keyboard.press("End");
  await page
    .locator("#key-customEnabled")
    .setChecked(!(await page.locator("#key-customEnabled").isChecked()));
  await page.waitForFunction(
    () =>
      document.querySelector("#workspace-toast")?.textContent ===
      "Layer visibility saved",
  );
  assert.equal(
    await page.locator("#comparison-background").inputValue(),
    state.basemaps[0].id,
  );
  assert.equal(await page.locator("#comparison-opacity").inputValue(), "100");
  assert.equal(
    await page
      .locator(".leaflet-image-layer")
      .last()
      .evaluate((e) => e.style.opacity),
    "1",
  );
  checks.push(
    "owned background provenance, calibration validation/pick invalidation, canonical warp and persistent overlay controls",
  );
  const layering = await page.evaluate(() => ({
    base: Number(
      getComputedStyle(document.querySelector(".leaflet-hajin-basemaps-pane"))
        .zIndex,
    ),
    markers: Number(
      getComputedStyle(document.querySelector(".leaflet-overlay-pane")).zIndex,
    ),
  }));
  assert.ok(
    layering.markers > layering.base,
    "Opaque comparison imagery must stay below all circle markers",
  );
  await page.locator("#layers").click();
  await page.locator("#layers-comparison-background").selectOption("");
  assert.equal(await page.locator("#comparison-background").inputValue(), "");
  assert.equal(await page.locator(".leaflet-image-layer").count(), 1);
  await page.locator("#close-layers").click();
  await page
    .locator("#comparison-background")
    .selectOption(state.basemaps[0].id);
  await page.waitForFunction(
    () => document.querySelectorAll(".leaflet-image-layer").length === 2,
  );
  checks.push(
    "mirrored canonical-background selection clears both controls and keeps markers above imagery",
  );
  await page.locator("#comparison-background").selectOption("");
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.get;
    IDBObjectStore.prototype.get = function (...args) {
      if (this.name === "resources") {
        IDBObjectStore.prototype.get = original;
        const tx = this.transaction;
        tx.addEventListener(
          "complete",
          (event) => {
            event.stopImmediatePropagation();
            window.releaseSyntheticResourceRead = () =>
              tx.dispatchEvent(new Event("complete"));
          },
          { once: true },
        );
      }
      return original.apply(this, args);
    };
  });
  await page
    .locator("#comparison-background")
    .selectOption(state.basemaps[0].id);
  await page.waitForFunction(
    () => typeof window.releaseSyntheticResourceRead === "function",
  );
  await page.locator("#layers").click();
  await page.locator("#layers-comparison-background").selectOption("");
  await page.evaluate(() => window.releaseSyntheticResourceRead());
  await page.waitForTimeout(200);
  assert.equal(await page.locator("#comparison-background").inputValue(), "");
  assert.equal(await page.locator(".leaflet-image-layer").count(), 1);
  await page.locator("#close-layers").click();
  checks.push(
    "superseded delayed background storage read cannot override Canonical selection",
  );
  // A stale tab must retain its draft instead of overwriting the newer saved state.
  const other = await parent.context().newPage();
  await other.goto(base);
  await other.locator("#workspace-open:enabled").waitFor();
  await page.locator("#close-key").click();
  await page.locator("#workspace-open").click();
  await page.locator("#workspace-tab-points").click();
  await page.locator("#point-title").fill("SYNTHETIC newer tab save");
  await page.locator("#point-owned").check();
  await page.locator("#save-point").click();
  await page
    .getByRole("heading", { name: "SYNTHETIC newer tab save", exact: true })
    .waitFor();
  await other.locator("#workspace-open").click();
  await other.locator("#point-title").fill("SYNTHETIC stale-tab draft");
  await other.locator("#point-owned").check();
  await other.locator("#save-point").click();
  await other.waitForFunction(() =>
    document
      .querySelector("#workspace-message")
      ?.textContent.includes("another tab"),
  );
  assert.equal(
    await other.locator("#point-title").inputValue(),
    "SYNTHETIC stale-tab draft",
  );
  assert.equal(
    (await read()).annotations.some(
      (a) => a.title === "SYNTHETIC stale-tab draft",
    ),
    false,
  );
  await other.locator("#cancel-workspace-draft").click();
  await other.locator("#workspace-tab-backup").click();
  const draftDownload = other.waitForEvent("download");
  await other.locator("#export-workspace-draft").click();
  await draftDownload;
  await other.close();
  checks.push(
    "actual application multitab CAS failure retains and exports the unsaved private draft",
  );
  await page.locator("#workspace-tab-backup").click();
  await page.locator("#new-empty-workspace").click();
  assert.equal(await page.locator("#confirm-new-workspace").isDisabled(), true);
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", {
      name: "Back up current workspace before clearing",
      exact: true,
    })
    .click();
  await download;
  await page.locator("#confirm-new-workspace").click();
  await page.waitForFunction(
    () =>
      document.querySelector("#workspace-message")?.textContent ===
      "New empty workspace created",
  );
  assert.equal((await read()).annotations.length, 0);
  assert.equal(await page.locator("#comparison-background").inputValue(), "");
  assert.equal(await page.locator(".leaflet-image-layer").count(), 1);
  checks.push(
    "backed-up new-workspace recovery path clears stale comparison imagery",
  );
  await page.close();
  return checks;
}
