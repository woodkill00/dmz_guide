import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
const ready = (page) =>
  page.waitForFunction(
    () => document.querySelector("main")?.getAttribute("aria-busy") === "false",
  );
/** The initial branch runs explicit baseline probes, never release acceptance. */
export async function runRecoveryTruthfulnessTests({
  browser,
  base,
  baseline = false,
}) {
  assert(baseline, "Fixed-mode acceptance must be implemented before release");
  const evidence = { baseline: true, scenarios: [] };
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await page.goto(`${base}/settings/?pack=demo%3Atraining-pack`);
    await ready(page);
    const backup = await page.evaluate(async () => {
      const { state } = await import("/assets/src/client/common.mjs");
      const p = structuredClone(state.profile);
      p.spoilers = !p.spoilers;
      return p;
    });
    await page.locator("#import-profile").setInputFiles({
      name: "spoilers-only.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(backup)),
    });
    await page.locator("#restore-preview").waitFor({ state: "visible" });
    const summary = JSON.parse(
      await page.locator("#restore-summary").textContent(),
    );
    assert.deepEqual(
      summary.changes,
      {},
      "Baseline omits sole spoiler preference change",
    );
    evidence.scenarios.push(
      "REPRODUCED C4: spoiler-only restore has empty changes summary",
    );
    await page.evaluate(async () => {
      const { commitRecord } = await import("/assets/src/storage/store.mjs");
      await commitRecord(
        "content",
        "local:invalid-probe",
        { pack: { id: "local:invalid-probe" } },
        0,
      );
    });
    await page.reload();
    await ready(page);
    assert.match(
      await page.locator("#save-status").textContent(),
      /storage unavailable/i,
    );
    assert.equal(
      await page.evaluate(
        async () =>
          !!(await (
            await import("/assets/src/storage/store.mjs")
          ).readRecord("content", "local:invalid-probe")),
      ),
      true,
    );
    evidence.scenarios.push(
      "REPRODUCED C2: invalid local content labels functioning storage unavailable",
    );
    const guided = await page.evaluate(async () => {
      const { createGuidedEditor } = await import(
        "/assets/src/client/guided-editor.mjs"
      );
      const root = document.createElement("section");
      root.innerHTML =
        '<select id="editor-section"><option value="metadata">Metadata</option></select><label id="record-picker-label"></label><button id="add-record"></button><button id="remove-record"></button><div id="editor-fields"></div>';
      document.body.append(root);
      const draft = { notes: ["kept"] };
      let hostError = null;
      let thrown = null;
      createGuidedEditor({
        root,
        schema: {
          properties: {
            notes: { type: "array", maxItems: 1, items: { type: "string" } },
          },
        },
        getDraft: () => draft,
        mutateDraft: (f) => f(draft),
        onError: (e) => {
          hostError = e.message;
        },
      }).renderFields();
      const add = [...root.querySelectorAll("button")].find(
        (n) => n.textContent === "Add Notes entry",
      );
      try {
        add.onclick();
      } catch (e) {
        thrown = e.message;
      }
      root.remove();
      return { hostError, thrown, draft };
    });
    assert.equal(guided.thrown, "Entry limit reached");
    assert.equal(guided.hostError, null);
    assert.deepEqual(guided.draft.notes, ["kept"]);
    evidence.scenarios.push(
      "REPRODUCED C6: real nested add handler throws at limit instead of host error callback; draft unchanged",
    );
    await page.goto(`${base}/planner/?pack=demo%3Atraining-pack`);
    await ready(page);
    const option = await page
      .locator('#goal-select option[value]:not([value=""])')
      .first()
      .getAttribute("value");
    await page.locator("#goal-select").selectOption(option);
    await page.locator("#goal-form button[type=submit]").click();
    const remove = page.locator("[data-remove]").first();
    await remove.waitFor();
    await remove.focus();
    await remove.click();
    await page.waitForFunction(() => !document.querySelector("[data-remove]"));
    assert.equal(
      await page.evaluate(() => document.activeElement.tagName),
      "BODY",
    );
    evidence.scenarios.push(
      "REPRODUCED C7: successful goal removal loses keyboard focus to body",
    );
  } finally {
    await context.close();
  }
  for (const scenario of evidence.scenarios) console.log(scenario);
  await writeFile(
    `test-results/${browser.browserType().name()}-recovery-baseline.json`,
    JSON.stringify(evidence, null, 2),
  );
}
