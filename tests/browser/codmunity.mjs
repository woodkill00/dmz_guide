import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  createWeaponManager,
  runWeaponJob,
} from "../../scripts/weapon-manager.mjs";
import { checkCodmunity, monitorCodmunity } from "../../scripts/codmunity.mjs";
import { codFixture } from "../helpers/codmunity.mjs";
import { readCodmunity } from "../../src/content/codmunity.mjs";
const accepted = (await readCodmunity()).value;
export async function runCodmunityTests({ browser, base }) {
  const context = await browser.newContext(),
    page = await context.newPage();
  try {
    await page.goto(base + "/armory/han-86/");
    assert.match(await page.locator(".gs-detail-footer").innerText(), /\*WZ/);
    assert.match(
      await page.locator("#codmunity-data").innerText(),
      /not Warzone mode/,
    );
    const summary = page.locator("#codmunity-data details summary").last();
    await summary.click();
    assert.match(
      await page.locator("#codmunity-data").innerText(),
      /NOT TESTED YET IN GAME/,
    );
    const chest =
      accepted.modes.mw4?.weapons["han-86"]?.damage[0]?.values.chest;
    if (chest !== undefined)
      assert(
        (
          await page
            .locator("#codmunity-data .armory-table")
            .first()
            .innerText()
        ).includes(chest + " *WZ"),
      );
    await page.goto(base + "/armory/workbench/");
    await page.waitForSelector('main[data-armory-ready="true"]');
    assert.equal(await page.locator("#compare-mode").inputValue(), "codmunity");
    assert.match(
      await page.locator("#comparison-result").innerText(),
      /not tested in DMZ/,
    );
    let layouts = 0;
    for (const route of ["/armory/", "/armory/han-86/", "/armory/pila/"]) {
      await page.goto(base + route);
      await page.waitForSelector('[data-armory-filter][data-enhanced="true"]');
      for (const width of [320, 390, 768, 1440])
        for (const zoom of [false, true]) {
          await page.setViewportSize({ width, height: 1000 });
          await page.evaluate(
            (zoom) =>
              (document.documentElement.style.fontSize = zoom ? "200%" : ""),
            zoom,
          );
          assert(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth + 1,
            ),
            route + " " + width + " " + zoom,
          );
          layouts++;
        }
    }
    console.log(
      `051 source UI PASS: preferred summaries/damage badge/DMZ warning/compare default and ${layouts} layouts`,
    );
  } finally {
    await context.close();
  }
  const root = await mkdtemp(join(tmpdir(), "dmz051-browser-"));
  await mkdir(join(root, "content"));
  const original = await readFile(
    new URL("../../content/weapon-intel.json", import.meta.url),
  );
  await writeFile(join(root, "content/weapon-intel.json"), original);
  let checks = 0;
  const app = await createWeaponManager({
    root,
    port: 0,
    runner: async (repo, action, fields) => {
      if (action === "status")
        return {
          revision: "0".repeat(64),
          sourceDates: {},
          weapons: 33,
          attachments: 643,
          reports: 65,
          backupAvailable: false,
          pendingRollback: false,
          locked: false,
          proposal: null,
        };
      if (action === "codmunity-check") {
        checks++;
        return checkCodmunity(repo, {
          fetcher: async (mode) => codFixture(mode),
        });
      }
      if (action === "codmunity-monitor")
        return monitorCodmunity(repo, {
          fetcher: async (mode) => codFixture(mode),
        });
      return runWeaponJob(repo, action, fields);
    },
  });
  const managerContext = await browser.newContext(),
    manager = await managerContext.newPage();
  try {
    await manager.goto(app.url);
    await manager.waitForSelector('main[data-manager-ready="true"]');
    assert.equal(checks, 0);
    assert(await manager.locator("#codmunity-apply").isDisabled());
    await manager.locator("#codmunity-check").click();
    await manager.waitForFunction(() =>
      document
        .querySelector("#codmunity-proposal")
        .textContent.includes("Changes require review."),
    );
    assert.equal(await manager.locator("#codmunity-proposal pre").count(), 0);
    assert.match(
      await manager.locator("#codmunity-proposal").innerText(),
      /Weapons with damage profiles/,
    );
    const added = manager.locator(".cod-weapon-review").first();
    await added.locator("summary").click();
    assert.match(await added.innerText(), /Current[\s\S]*Proposed/);
    assert.match(await added.innerText(), /Damage band 1/);
    assert(await manager.locator("#codmunity-apply").isDisabled());
    await manager.locator("#codmunity-review").check();
    await manager.locator("#codmunity-apply").click();
    await manager.waitForFunction(() =>
      document
        .querySelector("#codmunity-status")
        .textContent.includes("Accepted MW4: 1/33"),
    );
    const before = await readFile(join(root, "content/codmunity-stats.json"));
    await manager.locator("#codmunity-check").click();
    await manager.waitForFunction(() =>
      document
        .querySelector("#codmunity-proposal")
        .textContent.includes("No normalized fact changes"),
    );
    assert(await manager.locator("#codmunity-apply").isDisabled());
    assert.deepEqual(
      await readFile(join(root, "content/codmunity-stats.json")),
      before,
    );
    assert.deepEqual(
      await readFile(join(root, "content/weapon-intel.json")),
      original,
    );
    await manager.locator("#codmunity-probe").click();
    await manager.waitForFunction(() =>
      document
        .querySelector("#codmunity-status")
        .textContent.includes("reachable-untested"),
    );
    for (const width of [320, 390, 768, 1440])
      for (const zoom of [false, true]) {
        await manager.setViewportSize({ width, height: 1000 });
        await manager.evaluate(
          (zoom) =>
            (document.documentElement.style.fontSize = zoom ? "200%" : ""),
          zoom,
        );
        assert(
          await manager.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
        );
      }
    console.log(
      "051 manager PASS: explicit source check/review/real apply, no-op repeat/no legacy mutation, probe status, eight layouts",
    );
  } finally {
    await managerContext.close();
    await app.close();
    await rm(root, { recursive: true, force: true });
  }
}
