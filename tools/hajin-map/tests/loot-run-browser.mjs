// Synthetic map capture; no provider or private workspace data is read.
import assert from "node:assert/strict";
import { createServer } from "vite";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";

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
    ].map(([id, name, category, x, y]) => ({ id, name, category, x, y, notes: id === "safe-b" ? "Inside locked room." : "", mapId: "hajin", coordinateSpaceVersion: "hajin-official-v1-4096" })),
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
  await page.locator("#avoid-restricted").check();
  await page.waitForFunction(() => document.querySelector("#route-scope")?.textContent?.includes("2 eligible"));
  assert.equal(await page.locator('[data-safe="official:safe-b"]').isChecked(), true);
  await page.locator("#avoid-restricted").uncheck();
  await page.locator("#clinics-first").check();
  await page.waitForFunction(() => document.querySelector("#planned-order li")?.textContent?.includes("Clinic"));
  await page.locator("#max-stops").selectOption("2");
  await page.waitForFunction(() => document.querySelector("#route-scope")?.textContent?.includes("2 in suggested route"));
  assert.equal(await page.locator("#visit-order li").count(), 3);
  assert.equal(await page.locator("#planned-order li").count(), 2);
  await page.locator("#observation-stop").selectOption("official:clinic-a");
  await page.locator("#observation-date").fill("2026-11-13");
  await page.locator("#observation-build").fill("SYNTHETIC build");
  await page.locator("#observation-note").fill("SYNTHETIC test observation");
  await page.locator("#save-observation").click();
  assert.match(await page.locator("#observation-list").textContent(), /SYNTHETIC test observation/);
  const journal = JSON.parse(await page.evaluate(() => localStorage.getItem("hajin-loot-run-observations-v1")));
  assert.equal(journal.observations[0].key, "official:clinic-a");
  assert.equal(journal.observations[0].gameBuild, "SYNTHETIC build");
  const [download] = await Promise.all([page.waitForEvent("download"), page.locator("#export-observations").click()]);
  assert.equal(download.suggestedFilename(), "hajin-loot-run-gameplay-checks.json");
  const roads = { kind: "dmz-road-network", version: 1, mapId: "hajin", coordinateSpaceVersion: "hajin-official-v1-4096", name: "SYNTHETIC test roads", attribution: "Synthetic fixture", verification: "unverified", nodes: [], edges: [] };
  await page.locator("#loot-options summary").click();
  await page.locator("#loot-road-file").setInputFiles({ name: "roads.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(roads)) });
  await page.locator("#import-loot-roads").click();
  await page.waitForFunction(() => document.querySelector("#road-status")?.textContent?.includes("imported road segments"));
  assert.equal(JSON.parse(await page.evaluate(() => localStorage.getItem("hajin-loot-run-roads-v1"))).name, roads.name);
  await page.locator("#route-mode").selectOption("roads");
  await page.waitForFunction(() => document.querySelector("#route-status")?.textContent?.includes("Missing leg"));
  assert.match(await page.locator("#route-status").textContent(), /connected distance only/);
  await page.locator("#loot-road-file").setInputFiles({ name: "bad.json", mimeType: "application/json", buffer: Buffer.from('{"wrong":true}') });
  await page.locator("#import-loot-roads").click();
  await page.waitForFunction(() => document.querySelector("#road-status")?.textContent?.includes("Current network retained"));
  assert.match(await page.locator("#road-status").textContent(), /Current network retained/);
  assert.equal(JSON.parse(await page.evaluate(() => localStorage.getItem("hajin-loot-run-roads-v1"))).name, roads.name);
  await page.reload();
  await page.locator("#safe-settings:not([disabled])").waitFor();
  assert.equal(await page.locator("#clinics-first").isChecked(), true);
  assert.equal(await page.locator("#max-stops").inputValue(), "2");
  assert.match(await page.locator("#observation-list").textContent(), /SYNTHETIC test observation/);
  assert.match(await page.locator("#road-status").textContent(), /imported road segments/);
  const axe = await new AxeBuilder({ page }).analyze();
  assert.deepEqual(axe.violations.map((violation) => ({ id: violation.id, nodes: violation.nodes.length })), []);
  await page.evaluate(() => localStorage.setItem("hajin-loot-run-observations-v1", "{bad"));
  await page.reload();
  await page.locator("#safe-settings:not([disabled])").waitFor();
  assert.equal(await page.locator("#save-observation").isDisabled(), true);
  assert.match(await page.locator("#observation-status").textContent(), /could not be read/);
  assert.equal(JSON.parse(await page.evaluate(() => localStorage.getItem("hajin-loot-run-v1"))).order.length, 3);

  await page.goto(base + "/safes.html");
  await page.locator("#safe-settings:not([disabled])").waitFor();
  assert.equal(await page.locator("#safe-map .safe-number-marker").count(), 2);
  assert.equal(await page.locator("#safe-map .clinic-number-marker").count(), 0);
  assert.equal(await page.locator("#select-clinics").count(), 0);
  assert.equal(await page.locator("#loot-observations").count(), 0);
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
  console.log("Loot Run browser PASS: mixed markers, access filter, clinic priority, short route, observation save/export/corruption, road import/gaps, axe, Safe Run isolation, toolbar entry and mobile views");
} finally {
  await browser?.close();
  await server.close();
}
