import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { chromium, firefox, webkit } from "playwright";
import { runRecoveryTruthfulnessTests } from "./recovery-truthfulness.mjs";
import { monitorBrowser } from "./health.mjs";
import { startBrowserServer } from "./server.mjs";

export async function runUIRecoveryTests({
  browser,
  base,
  includeProtocolPreservation = true,
}) {
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    await page.goto(base + "/local/?pack=demo%3Atraining-pack");
    await page.waitForFunction(
      () =>
        document.querySelector("main")?.getAttribute("aria-busy") === "false",
    );
    assert.equal(
      await page.locator("html").getAttribute("data-ui-variant"),
      "modern",
    );
    assert(
      await page
        .getByRole("region", { name: "Saved private content" })
        .isVisible(),
    );
    assert.match(await page.locator("main").innerText(), /private|published/i);
    const profileBackup = page.getByRole("link", {
      name: "Profile backups & recovery",
      exact: true,
    });
    const backupURL = new URL(
      await profileBackup.getAttribute("href"),
      page.url(),
    );
    assert.equal(backupURL.pathname, "/settings/");
    assert.equal(backupURL.searchParams.get("pack"), "demo:training-pack");
    await profileBackup.click();
    await page.waitForURL("**/settings/**");
    await page.waitForFunction(
      () =>
        document.querySelector("main")?.getAttribute("aria-busy") === "false",
    );
    assert.equal(await page.locator("#import-profile").count(), 1);
  } finally {
    await context.close();
  }
  // Existing fixtures retain exact profile identity/revisions, failed/unknown outcomes,
  // raw draft recovery, rebind/import, denied storage and cancellation semantics.
  if (includeProtocolPreservation)
    await runRecoveryTruthfulnessTests({
      browser,
      base,
      captureScreenshots: false,
    });
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const server = await startBrowserServer();
  try {
    for (const [name, engine] of Object.entries({
      chromium,
      firefox,
      webkit,
    })) {
      const browser = await engine.launch(),
        health = monitorBrowser(browser);
      try {
        await runUIRecoveryTests({ browser, base: server.base });
        health();
        console.log(
          name +
            "071 scoped recovery links and existing truthfulness protocol PASS",
        );
      } finally {
        await browser.close();
      }
    }
  } finally {
    await server.stop();
  }
}
