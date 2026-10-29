import { observeBrowserAction } from "./action-observers.mjs";
import assert from "node:assert/strict";
import { readFile, writeFile, mkdir } from "node:fs/promises";
/** Actual Studio v1/v2 guided→JSON→save→restart→export/import; isolated repository only. */
export async function runUpgradeStudioRoundtrip({
  browser,
  repository,
  author,
  createAuthorServer,
}) {
  let context, page, failure;
  const evidence = [];
  let phase = "initializing",
    keyInFlight = null;
  const diagnostics = {
    requests: [],
    responses: [],
    requestFailures: [],
    console: [],
    pageErrors: [],
  };
  const record = (kind, value) => {
    diagnostics[kind].push(value);
    if (diagnostics[kind].length > 80) diagnostics[kind].shift();
  };
  const closeOwnedAuthor = async () => {
    const owned = author;
    author = null;
    await owned?.close();
  };
  const combine = (first, cleanup) =>
    first
      ? new AggregateError(
          [first, cleanup],
          `${first.message}; cleanup also failed: ${cleanup.message}`,
          { cause: first },
        )
      : cleanup;
  const snapshot = async () => {
    const response = await fetch(author.url + "/api/catalog");
    assert.equal(response.status, 200);
    return response.json();
  };
  const open = async (key) => {
    const changes = page.waitForResponse(
      (r) => r.url().endsWith("/api/changes") && r.request().method() === "GET",
    );
    const [response] = await observeBrowserAction(
      () => page.goto(author.url),
      [changes],
    );
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
    const [response, summary] = await observeBrowserAction(
      () => page.click("#save-repository"),
      [pending, changes],
    );
    assert.equal(response.status(), 200, await response.text());
    // Studio refreshes its change summary after controls re-enable. Await the
    // real post-save request before restarting its server; health stays strict.
    assert.equal(summary.status(), 200);
    assert.equal(await summary.finished(), null);
    await page.waitForFunction(
      () => !document.querySelector("#save-repository").disabled,
    );
  };
  try {
    context = await browser.newContext();
    page = await context.newPage();
    page.on("request", (request) =>
      record("requests", { url: request.url(), method: request.method() }),
    );
    page.on("response", (response) =>
      record("responses", {
        url: response.url(),
        status: response.status(),
        method: response.request().method(),
      }),
    );
    page.on("requestfailed", (request) =>
      record("requestFailures", {
        url: request.url(),
        error: request.failure()?.errorText,
      }),
    );
    page.on("pageerror", (error) =>
      record("pageErrors", error.message.slice(0, 4096)),
    );
    page.on("console", (message) => {
      if (message.type() === "error")
        record("console", {
          text: message.text().slice(0, 4096),
          location: message.location(),
        });
    });
    for (const key of ["demo-training", "upgrade-observations"]) {
      keyInFlight = key;
      phase = "load original catalog";
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
          original.objectives[0].requirements[0].consumption,
          "consumed",
          "The separately confirmed observed source remains consumed",
        );
        const consumption = page.locator(
          '[data-path="objectives.0.requirements.0.consumption"]',
        );
        assert.equal(
          await consumption.inputValue(),
          original.objectives[0].requirements[0].consumption,
          "Guided Studio preserves the admitted source's consumption value",
        );
        // A deliberately fictional edit keeps unknown-mechanics coverage even
        // though the separately confirmed observed costs are now consumed.
        await consumption.selectOption("unknown");
      }
      const expected = await exportDraft();
      if (original.schemaVersion === 2)
        assert.equal(
          expected.objectives[0].requirements[0].consumption,
          "unknown",
        );
      expected.contentVersion = "synthetic-studio-v" + original.schemaVersion;
      expected.description += " Synthetic advanced edit.";
      await jsonEdit(expected);
      phase = "save synthetic guided and JSON edits";
      await save();
      assert.deepEqual(
        (await snapshot()).entries.find((e) => e.key === key).pack,
        expected,
      );
      await page.goto("about:blank");
      await closeOwnedAuthor();
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
      phase = "restore original isolated catalog";
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
  } catch (error) {
    failure = error;
    try {
      let diagnosticTimer;
      const state = await Promise.race([
        page
          ?.evaluate(() => ({
            url: location.href,
            status: document.querySelector("#save-status")?.textContent,
            error: document.querySelector("#error")?.textContent,
            busy: document
              .querySelector("#workspace")
              ?.getAttribute("aria-busy"),
            saveDisabled: document.querySelector("#save-repository")?.disabled,
            previewHidden: document.querySelector("#content-stage")?.hidden,
            activeElement: document.activeElement?.id,
            selectedCatalog: document.querySelector("#pack-select")?.value,
          }))
          .catch((reason) => ({ unavailable: reason.message })),
        new Promise((resolve) => {
          diagnosticTimer = setTimeout(
            () =>
              resolve({
                unavailable: "Diagnostic page snapshot exceeded 2000ms",
              }),
            2000,
          );
        }),
      ]).finally(() => clearTimeout(diagnosticTimer));
      await mkdir("test-results/upgrade023-independent", { recursive: true });
      await writeFile(
        `test-results/upgrade023-independent/studio-${browser.browserType().name()}-failure.json`,
        JSON.stringify(
          {
            sourceHead: process.env.GITHUB_SHA || "local",
            phase,
            key: keyInFlight,
            message: error.message,
            stack: error.stack,
            state,
            diagnostics,
            completed: evidence,
          },
          null,
          2,
        ),
      );
    } catch (diagnosticError) {
      failure = combine(failure, diagnosticError);
    }
  }
  try {
    await context?.close();
  } catch (error) {
    failure = combine(failure, error);
  }
  if (failure) {
    try {
      await closeOwnedAuthor();
    } catch (error) {
      failure = combine(failure, error);
    }
    throw failure;
  }
  return author;
}
