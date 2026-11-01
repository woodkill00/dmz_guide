import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import {
  createWeaponManager,
  runWeaponJob,
} from "../../scripts/weapon-manager.mjs";

export async function runWeaponManagerTests({ browser }) {
  const root = await mkdtemp(join(tmpdir(), "dmz049-ui-"));
  await mkdir(join(root, "content"));
  await mkdir(join(root, ".local"));
  const original = await readFile(
    new URL("../../content/weapon-intel.json", import.meta.url),
  );
  await writeFile(join(root, "content/weapon-intel.json"), original);
  const calls = [];
  const app = await createWeaponManager({
    root,
    port: 0,
    runner: async (repo, action, fields) => {
      if (action !== "status") calls.push(action);
      if (action === "check") {
        const db = JSON.parse(original);
        await writeFile(
          join(repo, ".local/weapon-patch-proposal.json"),
          JSON.stringify({
            version: 1,
            baseRevision: createHash("sha256").update(original).digest("hex"),
            articles: [db.patches[0].sourceURL],
            observations: [
              { ...db.patches[0], after: "Synthetic browser QA correction" },
            ],
            warnings: ["Synthetic browser QA only"],
          }),
        );
        return {};
      }
      if (action === "build") return { built: true };
      return runWeaponJob(repo, action, fields);
    },
  });
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await page.goto(app.url);
    await page.waitForSelector('main[data-manager-ready="true"]');
    assert.deepEqual(calls, []);
    assert(await page.locator("#manager-apply").isDisabled());
    await page.locator("#manager-check").click();
    await page.waitForFunction(() =>
      document
        .querySelector("#manager-proposal")
        .textContent.includes("Synthetic browser QA correction"),
    );
    assert(await page.locator("#manager-apply").isDisabled());
    await page.locator("#manager-review").check();
    await page.locator("#manager-apply").click();
    await page.waitForFunction(() =>
      document
        .querySelector("#manager-summary")
        .textContent.includes("apply · success"),
    );
    assert.equal(
      JSON.parse(
        await readFile(join(root, "content/weapon-intel.json")),
      ).patches.find((p) => p.id === JSON.parse(original).patches[0].id).after,
      "Synthetic browser QA correction",
    );
    await page.locator("#manager-rollback-review").check();
    await page.locator("#manager-rollback").click();
    await page.waitForFunction(() =>
      document
        .querySelector("#manager-summary")
        .textContent.includes("rollback · success"),
    );
    assert.deepEqual(
      await readFile(join(root, "content/weapon-intel.json")),
      original,
    );
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const size of ["", "200%"]) {
        await page.evaluate(
          (size) => (document.documentElement.style.fontSize = size),
          size,
        );
        assert(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
          `manager width ${width} text ${size}`,
        );
      }
    }
    assert.deepEqual(calls, ["check", "apply", "rollback"]);
    console.log(
      "049 manager browser PASS: opt-in check, reviewed real Python apply/rollback on disposable data, eight layouts",
    );
  } finally {
    await context.close();
    await app.close();
    await rm(root, { recursive: true, force: true });
  }
}
