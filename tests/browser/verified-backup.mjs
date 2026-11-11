import assert from "node:assert/strict";
import { chromium } from "playwright";
import { startBrowserServer } from "./server.mjs";

const server = await startBrowserServer();
const browser = await chromium.launch();
let failure;
try {
  const page = await browser.newPage();
  await page.addInitScript(() => {
    window.__backupWrite = { content: null, closed: false };
    window.showSaveFilePicker = async () => ({
      createWritable: async () => ({
        write: async (content) => {
          window.__backupWrite.content = content;
        },
        close: async () => {
          window.__backupWrite.closed = true;
        },
        abort: async () => {},
      }),
    });
  });
  await page.goto(`${server.base}/settings/?pack=official%3Amw4-dmz-starter`);
  await page.waitForFunction(
    () => document.querySelector("#save-verified-profile")?.disabled === false,
  );
  assert.match(
    await page.locator("#backup-scope-status").textContent(),
    /No confirmed profile file write/,
  );
  await page.locator("#save-verified-profile").click();
  await page.waitForFunction(() =>
    document
      .querySelector("#backup-scope-status")
      ?.textContent?.includes("Last confirmed profile file write"),
  );
  const result = await page.evaluate(() => window.__backupWrite);
  assert.equal(result.closed, true);
  assert.equal(JSON.parse(result.content).packId, "official:mw4-dmz-starter");
  assert.match(
    await page.locator("#backup-scope-status").textContent(),
    /Excludes:.*Map workspace/,
  );
  console.log("Verified profile backup browser journey PASS");
} catch (error) {
  failure = error;
  throw error;
} finally {
  await browser.close();
  await server.stop(failure);
}
