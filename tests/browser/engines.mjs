import { firefox, webkit } from "playwright";
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import assert from "node:assert/strict";
import { runEditorTests } from "./editor.mjs";
import { runLocalNetworkTests } from "./offline.mjs";
import { monitorBrowser } from "./health.mjs";
const port = "4176",
  base = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ["scripts/serve.mjs"], {
  env: { ...process.env, PORT: port },
  stdio: "pipe",
});
try {
  for (let n = 0; n < 100; n++) {
    try {
      if ((await fetch(base)).ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  await mkdir("test-results", { recursive: true });
  for (const [name, engine] of Object.entries({ firefox, webkit })) {
    const browser = await engine.launch({ headless: true });
    const health = monitorBrowser(browser);
    try {
      const context = await browser.newContext({
          viewport: { width: 390, height: 844 },
        }),
        page = await context.newPage();
      await page.goto(base);
      await page.locator(".nav-more summary").focus();
      await page.keyboard.press("Enter");
      assert(await page.locator(".nav-more").evaluate((n) => n.open));
      await page.getByRole("link", { name: "Maps", exact: true }).click();
      await page.waitForSelector("#location-list button");
      assert.match(
        await page.locator("#location-count").textContent(),
        /0 plotted/,
      );
      await page.screenshot({
        path: `test-results/${name}-maps-390.png`,
        fullPage: true,
      });
      await context.close();
      await runEditorTests({ browser, base });
      await runLocalNetworkTests({ browser, base });
      health();
      console.log(
        `${name}: native navigation, narrow maps, IndexedDB portable raster roundtrip and local-network tests passed`,
      );
    } finally {
      await browser.close();
    }
  }
} finally {
  server.kill();
}
