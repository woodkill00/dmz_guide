import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import { chromium } from "playwright";

process.env.DMZ_UI_VARIANT = "modern";
const server = await createServer({
  root: fileURLToPath(new URL("../", import.meta.url)),
  cacheDir: ".local/coverage-vite",
  server: { host: "127.0.0.1", port: 0, strictPort: true, hmr: false },
});
await server.listen();
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(
    `http://127.0.0.1:${server.httpServer.address().port}/?tool=health`,
  );
  await page.locator("#workspace-health").waitFor({ timeout: 20000 });
  assert.match(
    await page.locator("#workspace-health").textContent(),
    /Map coverage/,
  );
  assert.match(
    await page.locator("#workspace-health").textContent(),
    /Guide key uses have a grid reference only/,
  );
  assert.deepEqual(errors, []);
  console.log("Map coverage browser journey PASS");
} finally {
  await browser.close();
  await server.close();
}
