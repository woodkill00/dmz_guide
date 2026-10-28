import assert from "node:assert/strict";
export async function runUsabilityBrowser(parent, base, fixture) {
  const context = await parent
      .context()
      .browser()
      .newContext({ viewport: { width: 1440, height: 1000 } }),
    errors = [],
    external = [];
  await context.route("**/*", (route) => {
    const u = new URL(route.request().url());
    if (u.origin !== base) {
      external.push(u.href);
      return route.abort();
    }
    if (u.pathname.endsWith("/official/markers.json"))
      return route.fulfill({ json: fixture.snapshot });
    if (
      u.pathname.endsWith("/background.webp") ||
      u.pathname.startsWith("/maps/hajin/official/icons/")
    )
      return route.fulfill({ body: fixture.image, contentType: "image/png" });
    return route.continue();
  });
  const page = await context.newPage(),
    checks = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const read = () =>
    page.evaluate(async () => {
      const { openWorkspace } = await import("/src/workspace/store.ts");
      const db = await openWorkspace();
      try {
        return (await db.read()).current?.data;
      } finally {
        db.close();
      }
    });
  const explore = async (section) => {
    if (await page.locator("#workspace-dialog").evaluate((d) => d.open)) {
      await page.locator("#workspace-tab-explore").click();
    } else await page.locator("#find-locations").click();
    await page.locator("#explore-" + section).click();
  };
  try {
    await page.goto(base);
    await page.locator("#workspace-open:enabled").waitFor();
    await page.evaluate(async (raw) => {
      const { openWorkspace } = await import("/src/workspace/store.ts"),
        { emptyWorkspace } = await import("/src/workspace/model.ts"),
        { adaptOfficial } = await import("/src/workspace/import.ts"),
        { applySnapshot } = await import("/src/workspace/refresh.ts"),
        { identityRegistration } = await import(
          "/src/workspace/registration.ts"
        ),
        { makeAnnotation } = await import("/src/workspace/annotations.ts"),
        { emptyUsability } = await import("/src/workspace/usability.ts");
      const s = emptyWorkspace(),
        r = structuredClone(raw);
      r.sourcePage = "https://codcentral.net/blog/mw4-dmz-map/";
      r.records = [
        r.records[0],
        {
          ...r.records[4],
          id: "provider-only",
          name: "SYNTHETIC provider-only shelter",
          x: 0.9,
          y: 0.9,
        },
        {
          ...r.records[4],
          id: "provider-conflict",
          name: "SYNTHETIC nearby different name",
        },
      ];
      const snapshot = adaptOfficial(r, "codcentral");
      applySnapshot(
        s,
        snapshot,
        "b".repeat(64),
        identityRegistration(snapshot.frame),
      );
      s.annotations.push(
        makeAnnotation({ title: "SYNTHETIC My lookout", x: 500, y: 600 }),
      );
      s.usability = emptyUsability();
      s.usability.edits = 21;
      const db = await openWorkspace();
      try {
        await db.commit(s, 0);
      } finally {
        db.close();
      }
    }, fixture.snapshot);
    await page.reload();
    await page.locator("#workspace-open:enabled").waitFor();
    await page.locator("#zoom-in:enabled").waitFor();
    assert.equal(
      await page.locator("#backup-reminder").evaluate((e) => e.hidden),
      false,
    );
    await page.locator("#find-locations").click();
    await page.locator("#explorer-search").fill("My lookout");
    const own = page
      .locator("#explorer-results [data-explorer-record]")
      .first();
    await own.getByRole("button", { name: "Jump", exact: true }).click();
    assert.equal(
      await page.locator("#workspace-dialog").evaluate((d) => d.open),
      false,
    );
    await page
      .locator(".leaflet-popup-content")
      .getByRole("button", { name: "Details / edit point" })
      .click();
    await page.locator("#edit-explorer-point").click();
    assert.equal(
      await page.locator("#point-title").inputValue(),
      "SYNTHETIC My lookout",
    );
    await page.locator("#point-x").fill("650");
    await page.locator("#save-point").click();
    await page.waitForFunction(
      () =>
        document.querySelector("#workspace-message")?.textContent ===
        "Point updated",
    );
    assert.equal(await page.locator("[data-search-highlight]").count(), 0);
    await page.locator("#cancel-point").click();
    await page.locator("#close-workspace").click();
    await page.locator("#key-loaded-source-master-official").uncheck();
    await page.waitForFunction(
      () =>
        document.querySelector("#workspace-toast")?.textContent ===
        "Source visibility saved",
    );
    await page.locator("#find-locations").click();
    await page.locator("#explorer-search").fill("Synthetic location 0");
    await page
      .locator("#explorer-results [data-explorer-record]")
      .filter({ hasText: "Call of Duty" })
      .getByRole("button", { name: "Jump", exact: true })
      .click();
    assert.equal((await read()).visibility.sourceEnabled.official, false);
    assert.ok(
      await page
        .locator(".leaflet-popup-content")
        .filter({ hasText: "Synthetic location 0" })
        .textContent(),
    );
    await page.evaluate(() =>
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
          writeText: () =>
            Promise.reject(new Error("SYNTHETIC clipboard unavailable")),
        },
      }),
    );
    await page
      .locator(".leaflet-popup-content")
      .filter({ hasText: "Synthetic location 0" })
      .getByRole("button", { name: "Copy coordinates", exact: true })
      .click();
    assert.ok(
      (
        await page
          .getByRole("textbox", { name: "Coordinates to copy", exact: true })
          .inputValue()
      ).includes("819.20"),
    );
    await page.locator("#key-loaded-source-master-official").check();
    checks.push(
      "Explore searches all locations, jumps/highlights hidden results without changing masks, and edits own points",
    );
    await page
      .locator("#workspace-key-layers")
      .getByRole("button", { name: "* 1 matching", exact: true })
      .click();
    assert.ok(
      (await page.locator("#explore-panel").textContent()).includes("distance"),
    );
    await page
      .getByRole("button", {
        name: "Keep CODCentral location separate",
        exact: true,
      })
      .click();
    await page.waitForFunction(
      () =>
        document.querySelector("#workspace-message")?.textContent ===
        "Locations kept separate",
    );
    assert.equal((await read()).usability.separate.length, 1);
    await page.reload();
    await page.locator("#workspace-open:enabled").waitFor();
    await page.waitForFunction(() =>
      document
        .querySelector("#key-summary")
        ?.textContent.startsWith("9 / 9 raw"),
    );
    await explore("duplicates");
    await page
      .getByRole("button", { name: "Allow matching again", exact: true })
      .click();
    await page.waitForFunction(
      () =>
        document.querySelector("#workspace-message")?.textContent ===
        "Separate decision removed",
    );
    assert.equal((await read()).usability.separate.length, 0);
    checks.push(
      "clickable duplicate details explain source distance and persist/reverse capture-bound separate decisions",
    );
    const editCount = (await read()).usability.edits;
    await page.locator("#close-workspace").click();
    await page.locator("#key-source-show-codcentral").click();
    await page.waitForFunction(
      () =>
        document.querySelector("#workspace-message")?.textContent ===
        "All source categories shown",
    );
    assert.equal((await read()).usability.edits, editCount);
    await explore("presets");
    await page.locator("#saved-view-name").fill("SYNTHETIC complete view");
    await page.locator("#save-map-view").click();
    await page.waitForFunction(
      () =>
        document.querySelector("#workspace-message")?.textContent ===
        "Saved view saved",
    );
    await page.locator("#close-workspace").click();
    await page.locator("#key-hide-all").click();
    await page.waitForFunction(
      () =>
        document.querySelector("#workspace-toast")?.textContent ===
        "All layers hidden",
    );
    await explore("presets");
    await page.getByRole("button", { name: "Apply view", exact: true }).click();
    await page.waitForFunction(
      () =>
        document.querySelector("#workspace-message")?.textContent ===
        "Saved view visibility applied",
    );
    assert.equal((await read()).visibility.sourceEnabled.official, true);
    assert.equal((await read()).visibility.customEnabled, true);
    checks.push(
      "named visibility presets save/apply after other filters and preserve exact private mask state",
    );
    await explore("search");
    await page.locator("#explorer-search").fill("provider-only shelter");
    await page
      .locator("#explorer-results")
      .getByRole("button", { name: "Details", exact: true })
      .click();
    await page
      .locator("#discrepancy-notes")
      .fill("SYNTHETIC my own route check <img onerror=alert(1)>");
    await page.locator("#discrepancy-owned").check();
    await page.locator("#save-discrepancy").click();
    await explore("flags");
    await page
      .getByRole("button", { name: "Open observation", exact: true })
      .click();
    const originalNote = (await read()).usability.flags[0].notes;
    await page
      .locator("#discrepancy-notes")
      .fill("SYNTHETIC unsaved revised note <img onerror=alert(1)>");
    await page.locator("#toggle-discrepancy").click();
    await page.locator("#delete-discrepancy").click();
    assert.equal(
      await page.locator("#discrepancy-notes").inputValue(),
      "SYNTHETIC unsaved revised note <img onerror=alert(1)>",
    );
    assert.equal((await read()).usability.flags[0].notes, originalNote);
    assert.equal((await read()).usability.flags[0].status, "open");
    await page.locator("#save-discrepancy").click();
    await explore("flags");
    assert.ok(
      (await page.locator("#explore-panel").textContent()).includes(
        "unsaved revised note",
      ),
    );
    await page
      .getByRole("button", { name: "Mark resolved", exact: true })
      .click();
    await page.waitForFunction(
      () =>
        document.querySelector("#workspace-message")?.textContent ===
        "Source discrepancy status saved",
    );
    assert.equal((await read()).usability.flags[0].status, "resolved");
    await page.getByRole("button", { name: "Reopen", exact: true }).click();
    await page.waitForFunction(
      () =>
        document.querySelector("#workspace-message")?.textContent ===
        "Source discrepancy status saved",
    );
    assert.equal((await read()).usability.flags[0].status, "open");
    assert.equal(await page.locator("img[onerror]").count(), 0);
    checks.push(
      "private source discrepancy notes are inert, authored, editable and resolvable without external submission",
    );
    await explore("coverage");
    await page.locator("#coverage-filter").selectOption("not-found");
    assert.ok(
      (await page.locator("#explore-panel").textContent()).includes(
        "provider-only shelter",
      ),
    );
    await page.locator("#coverage-filter").selectOption("uncertain");
    assert.ok(
      (await page.locator("#explore-panel").textContent()).includes(
        "nearby different name",
      ),
    );
    checks.push(
      "completeness separates provider-only records from uncertain conflicts using loaded official data",
    );
    await explore("backup");
    const countBeforeSnooze = (await read()).usability.edits;
    await page.locator("#snooze-backup").click();
    assert.equal(
      await page.locator("#backup-reminder").evaluate((e) => e.hidden),
      true,
    );
    assert.equal((await read()).usability.edits, countBeforeSnooze);
    assert.ok(
      (await page.locator("#explore-panel").textContent()).includes(
        "No backup download",
      ),
    );
    const download = page.waitForEvent("download");
    await page.locator("#explorer-backup").click();
    const file = await download;
    await page.waitForFunction(() =>
      document
        .querySelector("#workspace-message")
        ?.textContent.includes("download started"),
    );
    const fs = await import("node:fs/promises"),
      backup = await fs.readFile(await file.path(), "utf8");
    assert.ok(JSON.parse(backup).workspace.usability.presets.length);
    assert.equal(JSON.parse(backup).workspace.usability.flags.length, 1);
    await page.reload();
    await page.locator("#workspace-open:enabled").waitFor();
    await explore("backup");
    assert.ok(
      (await page.locator("#explore-panel").textContent()).includes(
        "Last backup download started",
      ),
    );
    await page.setViewportSize({ width: 360, height: 800 });
    await explore("search");
    await page.locator("#explorer-search").focus();
    await page.keyboard.type("My lookout");
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    await page.screenshot({
      path: ".local/browser-checks/synthetic-explore-mobile.png",
    });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.screenshot({
      path: ".local/browser-checks/synthetic-explore-desktop.png",
    });
    checks.push(
      "backup initiation receipt survives reload and Explore is keyboard usable at360px without overflow",
    );
    await page.locator("#workspace-tab-backup").click();
    await page.locator("#workspace-backup-file").setInputFiles({
      name: "synthetic-backup.json",
      mimeType: "application/json",
      buffer: Buffer.from(backup),
    });
    await page
      .getByRole("button", { name: "Preview backup restore", exact: true })
      .click();
    const currentDownload = page.waitForEvent("download");
    await page.locator("#backup-before-restore").click();
    await currentDownload;
    await page.locator("#confirm-restore-workspace").click();
    await page.waitForFunction(() =>
      document
        .querySelector("#workspace-message")
        ?.textContent.includes("Backup restored"),
    );
    assert.equal((await read()).usability.flags.length, 1);
    assert.equal((await read()).usability.presets.length, 1);
    assert.equal((await read()).snapshots.length, 0);
    assert.equal(await page.locator("[data-search-highlight]").count(), 0);
    await explore("flags");
    assert.ok(
      (await page.locator("#explore-panel").textContent()).includes("inactive"),
    );
    checks.push(
      "new usability metadata round-trips private backup while omitted source references become inactive",
    );
    await page
      .getByRole("button", { name: "Edit observation", exact: true })
      .click();
    await page
      .locator("#discrepancy-notes")
      .fill("SYNTHETIC corrected note without source capture");
    await page.locator("#save-discrepancy").click();
    await page.waitForFunction(
      () =>
        document.querySelector("#workspace-message")?.textContent ===
        "Source discrepancy saved",
    );
    assert.equal(
      (await read()).usability.flags[0].notes,
      "SYNTHETIC corrected note without source capture",
    );
    await page
      .getByRole("button", { name: "Delete observation", exact: true })
      .click();
    await page.waitForFunction(
      () =>
        document.querySelector("#workspace-message")?.textContent ===
        "Source discrepancy deleted",
    );
    assert.equal((await read()).usability.flags.length, 0);
    await explore("presets");
    await page
      .getByRole("button", { name: "Delete view", exact: true })
      .click();
    await page.waitForFunction(
      () =>
        document.querySelector("#workspace-message")?.textContent ===
        "Saved view deleted",
    );
    assert.equal((await read()).usability.presets.length, 0);
    await page.evaluate(() =>
      Object.defineProperty(window, "localStorage", {
        configurable: true,
        get() {
          throw new DOMException("SYNTHETIC blocked storage", "SecurityError");
        },
      }),
    );
    await explore("backup");
    assert.ok(
      (await page.locator("#explore-panel").textContent()).includes(
        "No backup download",
      ),
    );
    await page.locator("#snooze-backup").click();
    await explore("presets");
    await page.locator("#saved-view-name").fill("SYNTHETIC storage blocked");
    await page.locator("#save-map-view").click();
    await page.waitForFunction(
      () =>
        document.querySelector("#workspace-message")?.textContent ===
        "Saved view saved",
    );
    assert.equal((await read()).usability.presets.length, 1);
    assert.deepEqual(errors, []);
    assert.deepEqual(external, []);
    return checks;
  } finally {
    await context.close();
  }
}
