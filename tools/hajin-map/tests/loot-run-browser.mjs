// Synthetic map capture; no provider or private workspace data is read.
import assert from "node:assert/strict";
import { createServer } from "vite";
import { chromium } from "playwright";

process.env.DMZ_UI_VARIANT = "modern";
const server = await createServer({
  server: { host: "127.0.0.1", port: 0, hmr: false },
  define: { "import.meta.env.VITE_LOCAL_PROVIDER_SNAPSHOTS": '"0"' },
});
await server.listen();
const base = `http://127.0.0.1:${server.httpServer.address().port}`;
let browser;
try {
  browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const png = Buffer.from(await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 2;
    canvas.getContext("2d").fillRect(0, 0, 2, 2);
    return canvas.toDataURL("image/png").split(",")[1];
  }), "base64");
  await context.route("**/background.webp", (route) => route.fulfill({ contentType: "image/png", body: png }));
  await context.route("**/current-captures.local.json", (route) => route.fulfill({ status: 404 }));
  await context.route("**/providers.local.json", (route) => route.fulfill({ status: 404 }));
  await context.route("**/roads.local.json", (route) => route.fulfill({ status: 404 }));
  await context.route("**/official/markers.json", (route) => route.fulfill({ json: {
    schemaVersion: 1,
    sourcePage: "https://www.callofduty.com/guides/modernwarfare4/dmz-maps/hajin",
    capturedAt: "2026-11-13T00:00:00Z",
    categories: [
      { id: "safe", name: "Safes", group: "Loot", icon: "/maps/hajin/official/icons/safe.png" },
      { id: "dmz_clinic", name: "Clinics", group: "Facilities", icon: "/maps/hajin/official/icons/clinic.png" },
      { id: "spawn", name: "Spawn Point", group: "Start", icon: "/maps/hajin/official/icons/spawn.png" },
    ],
    records: [
      ["safe-a", "SYNTHETIC Alpha Safe", "safe", .15, .2],
      ["safe-b", "SYNTHETIC Bravo Safe", "safe", .8, .7],
      ["clinic-a", "SYNTHETIC Clinic", "dmz_clinic", .45, .35],
      ["start", "SYNTHETIC Spawn", "spawn", .1, .1],
    ].map(([id, name, category, x, y]) => ({ id, name, category, x, y, mapId: "hajin", coordinateSpaceVersion: "hajin-official-v1-4096" })),
  } }));

  await page.goto(base + "/loot.html");
  await page.locator("#safe-settings:not([disabled])").waitFor();
  assert.equal(await page.locator("h1").textContent(), "Loot Run map");
  assert.equal(await page.locator("#safe-map .safe-number-marker").count(), 3);
  assert.equal(await page.locator("#safe-map .clinic-number-marker").count(), 1);
  assert.match(await page.locator("#selection-count").textContent(), /2 safes · 1 clinics/);
  await page.locator("#spawn-select").selectOption("official:start");
  await page.waitForFunction(() => document.querySelector("#route-status")?.textContent?.includes("3 stops"));
  await page.locator('[data-safe="official:clinic-a"]').uncheck();
  await page.waitForFunction(() => document.querySelector("#route-status")?.textContent?.includes("2 stops"));
  const lootSaved = await page.evaluate(() => localStorage.getItem("hajin-loot-run-v1"));
  assert.equal(JSON.parse(lootSaved).order.length, 2);
  assert.equal(await page.evaluate(() => localStorage.getItem("hajin-safe-run-v1")), null);
  await page.reload();
  await page.locator("#safe-settings:not([disabled])").waitFor();
  assert.equal(await page.locator('[data-safe="official:clinic-a"]').isChecked(), false);
  await page.locator("#select-clinics").click();
  await page.waitForFunction(() => document.querySelector("#route-status")?.textContent?.includes("3 stops"));

  await page.goto(base + "/safes.html");
  await page.locator("#safe-settings:not([disabled])").waitFor();
  assert.equal(await page.locator("#safe-map .safe-number-marker").count(), 2);
  assert.equal(await page.locator("#safe-map .clinic-number-marker").count(), 0);
  assert.equal(await page.locator("#select-clinics").count(), 0);
  assert.equal(JSON.parse(await page.evaluate(() => localStorage.getItem("hajin-loot-run-v1"))).order.length, 3);
  await page.goto(base + "/");
  const toolbarLink = page.getByRole("link", { name: "Loot Run map (opens in a new tab)" });
  await toolbarLink.waitFor();
  const [opened] = await Promise.all([page.waitForEvent("popup"), toolbarLink.click()]);
  await opened.locator("#safe-settings:not([disabled])").waitFor();
  assert.equal(new URL(opened.url()).pathname, "/loot.html");
  await opened.setViewportSize({ width: 390, height: 844 });
  await opened.getByRole("button", { name: "Map view" }).click();
  assert(await opened.locator("#safe-map").isVisible());
  await opened.getByRole("button", { name: "Plan loot run" }).click();
  assert(await opened.locator("#safe-controls").isVisible());
  await opened.close();
  assert.deepEqual(errors, []);
  console.log("Loot Run browser PASS: mixed markers, spawn route, clinic selection, persistence, Safe Run isolation, toolbar entry and mobile views");
} finally {
  await browser?.close();
  await server.close();
}
