import assert from "node:assert/strict";
export async function runAuthoringBrowser(parent, base) {
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
  const title = "SYNTHETIC owned point <img onerror=alert(1)>";
  await page.locator("#point-title").fill(title);
  await page.locator("#point-x").fill("750");
  await page.locator("#point-y").fill("1000");
  await page.locator("#point-category").fill("Synthetic category");
  await page.locator("#point-notes").fill("My synthetic observation");
  await page.locator("#point-owned").check();
  await page.locator("#save-point").click();
  await page.getByRole("heading", { name: title, exact: true }).waitFor();
  assert.equal((await read()).annotations[0].x, 750);
  assert.equal(await page.locator("img[onerror]").count(), 0);
  await page
    .getByRole("button", { name: "Edit point", exact: true })
    .first()
    .click();
  await page.locator("#point-x").fill("900");
  await page.locator("#workspace-tab-sources").click();
  assert.equal(await page.locator("#point-x").inputValue(), "900");
  await page.locator("#undo-workspace").click();
  assert.equal(await page.locator("#point-x").inputValue(), "900");
  await page.locator("#cancel-point").click();
  await page
    .getByRole("button", { name: "Edit point", exact: true })
    .first()
    .click();
  await page.locator("#point-x").fill("900");
  await page.locator("#save-point").click();
  await page.waitForFunction(() =>
    document
      .querySelector("#custom-point-list")
      ?.textContent.includes("900.00"),
  );
  await page.reload();
  await page.locator("#workspace-open:enabled").waitFor();
  await page.locator("#workspace-open").click();
  await page.getByRole("heading", { name: title, exact: true }).waitFor();
  assert.equal((await read()).annotations[0].x, 900);
  await page
    .getByRole("button", { name: "Delete point", exact: true })
    .first()
    .click();
  await page.locator("#confirm-delete-point").click();
  await page.waitForFunction(
    () => !document.querySelector("[data-annotation]"),
  );
  await page.locator("#undo-workspace").click();
  await page.getByRole("heading", { name: title, exact: true }).waitFor();
  checks.push(
    "private point numeric CRUD, inert text, dirty-draft guards, reload, delete and undo",
  );
  const image = Buffer.from(
    await page.evaluate(() => {
      const c = document.createElement("canvas");
      c.width = c.height = 32;
      const x = c.getContext("2d");
      x.fillStyle = "#739b52";
      x.fillRect(0, 0, 32, 32);
      return c.toDataURL("image/png").split(",")[1];
    }),
    "base64",
  );
  await page.locator("#workspace-tab-icons").click();
  await page
    .locator("#custom-icon-file")
    .setInputFiles({ name: "owned.png", mimeType: "image/png", buffer: image });
  await page
    .locator("#custom-icon-description")
    .fill("SYNTHETIC owned green icon");
  await page
    .locator("#custom-icon-rights")
    .fill("I created these synthetic pixels.");
  await page.locator("#custom-icon-owned").check();
  await page.locator("#preview-custom-icon").click();
  await page.locator("#commit-custom-icon").click();
  await page
    .getByRole("heading", { name: "SYNTHETIC owned green icon", exact: true })
    .waitFor();
  let state = await read();
  assert.equal(state.icons.length, 1);
  await page.locator("#workspace-tab-points").click();
  await page.locator("#point-title").fill("SYNTHETIC icon point");
  await page.locator("#point-icon").selectOption(state.icons[0].id);
  await page.locator("#point-owned").check();
  await page.locator("#save-point").click();
  await page
    .getByRole("heading", { name: "SYNTHETIC icon point", exact: true })
    .waitFor();
  await page.locator("#workspace-tab-icons").click();
  await page
    .getByRole("button", { name: "Delete this icon", exact: true })
    .click();
  await page.waitForFunction(() =>
    document
      .querySelector("#workspace-message")
      ?.textContent.includes("references"),
  );
  assert.equal((await read()).icons.length, 1);
  await page.locator("#custom-icon-file").setInputFiles({
    name: "bad.png",
    mimeType: "image/png",
    buffer: Buffer.from('<svg onload="alert(1)"/>'),
  });
  await page.locator("#custom-icon-description").fill("Bad synthetic image");
  await page.locator("#custom-icon-rights").fill("Owned synthetic test");
  await page.locator("#custom-icon-owned").check();
  await page.locator("#preview-custom-icon").click();
  await page.waitForFunction(
    () =>
      document
        .querySelector("#workspace-message")
        ?.textContent.includes("Raster") ||
      document
        .querySelector("#workspace-message")
        ?.textContent.includes("Unsupported"),
  );
  assert.equal((await read()).icons.length, 1);
  await page.locator("#cancel-workspace-draft").click();
  checks.push(
    "custom icon sanitation, referenced-delete rejection and invalid image rollback",
  );
  await page.locator("#workspace-tab-sources").click();
  await page.locator("#snapshot-source").selectOption("wzstats");
  assert.equal(await page.locator("#preview-snapshot").isDisabled(), true);
  await page.locator("#snapshot-source").selectOption("official");
  await page.locator("#preview-loaded-official").click();
  await page.locator("#snapshot-preview").waitFor();
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
  assert.equal(state.snapshots.length, 1);
  assert.equal(state.snapshots[0].snapshot.records.length, 6);
  await page.locator("#workspace-tab-review").click();
  await page.locator("[data-review-record]").nth(1).check();
  await page.locator("[data-review-record]").nth(2).check();
  await page.locator("#review-selected").click();
  await page.getByLabel("Title from", { exact: true }).selectOption("authored");
  await page
    .locator("#review-authored-title")
    .fill("SYNTHETIC authored canonical correction");
  await page
    .locator("#review-authored-evidence")
    .fill("My synthetic correction evidence");
  await page
    .locator("#review-authored-declaration")
    .fill("I authored this correction.");
  await page.locator("#accept-review").click();
  await page
    .getByRole("heading", {
      name: "SYNTHETIC authored canonical correction",
      exact: true,
    })
    .waitFor();
  state = await read();
  assert.equal(
    state.entities.filter((e) => e.acceptance === "accepted").length,
    1,
  );
  assert.equal(state.entities[0].independentLineages, 1);
  await page
    .getByRole("button", { name: "Split into source entities", exact: true })
    .click();
  await page.waitForFunction(
    () =>
      document.querySelector("#workspace-message")?.textContent ===
      "Merged entity split",
  );
  assert.equal(
    (await read()).entities.filter((e) => e.acceptance === "accepted").length,
    2,
  );
  await page.locator("#undo-review").click();
  await page.waitForFunction(
    () =>
      document.querySelector("#workspace-message")?.textContent ===
      "Review decision undone",
  );
  assert.equal(
    (await read()).entities.filter((e) => e.acceptance === "accepted").length,
    1,
  );
  checks.push(
    "permission-gated sources, official compatibility, authored canonical fields, lineage, split and undo",
  );
  await page.locator("#workspace-tab-backup").click();
  const download = page.waitForEvent("download");
  await page.locator("#export-workspace").click();
  const handle = await download,
    stream = await handle.createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  const bytes = Buffer.concat(chunks),
    backup = JSON.parse(bytes.toString("utf8"));
  assert.equal(backup.workspace.snapshots.length, 0);
  assert.equal(backup.workspace.annotations.length, 2);
  assert.equal(backup.workspace.icons.length, 1);
  assert.equal(
    backup.workspace.ownedCorrections[0].title,
    "SYNTHETIC authored canonical correction",
  );
  assert.ok(
    backup.workspace.decisions.every(
      (d) => d.redacted && d.before.length === 0 && d.after.length === 0,
    ),
  );
  await page.locator("#workspace-backup-file").setInputFiles({
    name: "private.json",
    mimeType: "application/json",
    buffer: bytes,
  });
  await page.locator("#preview-restore-workspace").click();
  await page.locator("#restore-preview").waitFor();
  assert.equal(
    await page.locator("#confirm-restore-workspace").isDisabled(),
    true,
  );
  const oldDownload = page.waitForEvent("download");
  await page.locator("#backup-before-restore").click();
  await oldDownload;
  await page.locator("#confirm-restore-workspace").click();
  await page.waitForFunction(() =>
    document
      .querySelector("#workspace-message")
      ?.textContent.includes("Backup restored"),
  );
  state = await read();
  assert.equal(state.annotations.length, 2);
  assert.equal(state.snapshots.length, 0);
  assert.ok(state.omittedDependencies.length > 0);
  checks.push(
    "compact private backup, derived-field redaction, owned correction preservation and transactional replacement restore",
  );
  await page.setViewportSize({ width: 360, height: 800 });
  await page.locator("#workspace-tab-points").click();
  await page.locator("#point-title").focus();
  await page.keyboard.type("SYNTHETIC keyboard draft");
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  await page.screenshot({
    path: ".local/browser-checks/synthetic-workspace-mobile.png",
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({
    path: ".local/browser-checks/synthetic-workspace-desktop.png",
  });
  await page.locator("#cancel-point").click();
  await page.locator("#close-workspace").click();
  await page.locator("#toggle-key").click();
  await page.locator("#key-customEnabled").uncheck();
  await page.waitForFunction(
    () =>
      document.querySelector("#workspace-toast")?.textContent ===
      "Layer visibility saved",
  );
  assert.equal((await read()).visibility.customEnabled, false);
  const revision = await page
    .locator("#workspace-dialog")
    .getAttribute("data-revision");
  await page.locator("#key-customEnabled").check();
  await page.waitForFunction(
    (old) =>
      document
        .querySelector("#workspace-dialog")
        ?.getAttribute("data-revision") !== old,
    revision,
  );
  checks.push(
    "360px keyboard form, no overflow and direct map-key custom-layer selection",
  );
  await page.close();
  return checks;
}
