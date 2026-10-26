import assert from "node:assert/strict";
import { readFile, writeFile, mkdir } from "node:fs/promises";
/** Actual Studio v1/v2 guided→JSON→save→restart→export/import; isolated repository only. */
export async function runUpgradeStudioRoundtrip({
  browser,
  repository,
  author,
  createAuthorServer,
}) {
  const context = await browser.newContext(),
    page = await context.newPage(),
    evidence = [];
  const snapshot = async () => {
    const response = await fetch(author.url + "/api/catalog");
    assert.equal(response.status, 200);
    return response.json();
  };
  const open = async (key) => {
    const changes = page.waitForResponse(
      (r) => r.url().endsWith("/api/changes") && r.request().method() === "GET",
    );
    await page.goto(author.url);
    const response = await changes;
    assert.equal(response.status(), 200);
    assert.equal(await response.finished(), null);
    await page.waitForSelector('[data-path="contentVersion"]');
    await page.selectOption("#pack-select", key);
    await page.waitForSelector('[data-path="contentVersion"]');
  };
  const exportDraft = async () => {
    const download = page.waitForEvent("download");
    await page.click("#export-draft");
    const file = await download;
    return JSON.parse(await readFile(await file.path(), "utf8")).pack;
  };
  const jsonEdit = async (pack) => {
    const panel = page
      .locator("#advanced-json")
      .locator("xpath=ancestor::details");
    if (!(await panel.evaluate((n) => n.open)))
      await panel.locator("summary").click();
    await page.fill("#advanced-json", JSON.stringify(pack));
    await page.click("#load-json");
  };
  const save = async () => {
    await page.click("#preview-content");
    await page.waitForSelector("#content-stage:not([hidden])");
    const pending = page.waitForResponse(
      (r) => r.url().endsWith("/api/save") && r.request().method() === "POST",
    );
    const changes = page.waitForResponse(
      (r) => r.url().endsWith("/api/changes") && r.request().method() === "GET",
    );
    await page.click("#save-repository");
    const response = await pending;
    assert.equal(response.status(), 200, await response.text());
    // Studio refreshes its change summary after controls re-enable. Await the
    // real post-save request before restarting its server; health stays strict.
    const summary = await changes;
    assert.equal(summary.status(), 200);
    assert.equal(await summary.finished(), null);
    await page.waitForFunction(
      () => !document.querySelector("#save-repository").disabled,
    );
  };
  try {
    for (const key of ["demo-training", "upgrade-observations"]) {
      const original = (await snapshot()).entries.find(
        (e) => e.key === key,
      ).pack;
      await open(key);
      await page.selectOption("#editor-section", "objectives");
      await page.selectOption("#editor-record", "0");
      await page
        .locator('[data-path="objectives.0.description"]')
        .fill(
          original.objectives[0].description + " Synthetic Studio roundtrip.",
        );
      if (original.schemaVersion === 2) {
        assert.equal(
          await page
            .locator('[data-path="objectives.0.upgrade.prerequisiteStatus"]')
            .inputValue(),
          "unknown",
        );
        assert.equal(
          await page
            .locator('[data-path="objectives.0.requirements.0.consumption"]')
            .inputValue(),
          "unknown",
        );
      }
      const expected = await exportDraft();
      expected.contentVersion = "synthetic-studio-v" + original.schemaVersion;
      expected.description += " Synthetic advanced edit.";
      await jsonEdit(expected);
      await save();
      assert.deepEqual(
        (await snapshot()).entries.find((e) => e.key === key).pack,
        expected,
      );
      await page.goto("about:blank");
      await author.close();
      author = await createAuthorServer({ root: repository, port: 0 });
      await open(key);
      assert.deepEqual(await exportDraft(), expected);
      await page.selectOption("#import-destination", "existing");
      await page.setInputFiles("#import-content", {
        name: "synthetic-v" + original.schemaVersion + ".json",
        mimeType: "application/json",
        buffer: Buffer.from(JSON.stringify(expected)),
      });
      await page.waitForSelector("#import-stage:not([hidden])");
      if (expected.assets.length) await page.check("#import-rights");
      else
        assert.equal(await page.locator("#import-rights").isVisible(), false);
      await page.click("#apply-import");
      assert.deepEqual(await exportDraft(), expected);
      // Restore only our isolated synthetic edits so unrelated existing acceptance remains unchanged.
      await jsonEdit(original);
      await save();
      assert.deepEqual(
        (await snapshot()).entries.find((e) => e.key === key).pack,
        original,
      );
      evidence.push({
        schemaVersion: original.schemaVersion,
        key,
        guided: true,
        advanced: true,
        save: true,
        restart: true,
        exportImport: true,
        noFieldLoss: true,
      });
    }
    await mkdir("test-results/upgrade023-independent", { recursive: true });
    await writeFile(
      `test-results/upgrade023-independent/studio-${browser.browserType().name()}.json`,
      JSON.stringify(
        { sourceHead: process.env.GITHUB_SHA || "local", evidence },
        null,
        2,
      ),
    );
    return author;
  } finally {
    await context.close();
  }
}
