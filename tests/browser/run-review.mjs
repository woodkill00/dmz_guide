import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { createServer } from "../../tools/hajin-map/node_modules/vite/dist/node/index.js";
import { startBrowserServer } from "./server.mjs";

const guide = await startBrowserServer();
const map = await createServer({
  root: fileURLToPath(new URL("../../tools/hajin-map/", import.meta.url)),
  cacheDir: ".local/run-review-vite",
  server: { host: "127.0.0.1", port: 0, strictPort: true, hmr: false },
  define: { "import.meta.env.VITE_LOCAL_PROVIDER_SNAPSHOTS": '"0"' },
});
await map.listen();
const actualMap = `http://127.0.0.1:${map.httpServer.address().port}`;
const mapBase = "http://127.0.0.1:5175";
const guideBase = "http://127.0.0.1:4173";
const browser = await chromium.launch();
let failure;
try {
  const context = await browser.newContext();
  const errors = [];
  context.on("page", (page) => page.on("pageerror", (reason) => errors.push(reason.message)));
  await context.route("http://127.0.0.1:4173/**", async (route) => {
    const upstream = await route.fetch({ url: guide.base + new URL(route.request().url()).pathname + new URL(route.request().url()).search });
    await route.fulfill({ response: upstream });
  });
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==", "base64");
  await context.route("http://127.0.0.1:5175/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/official/markers.json"))
      return route.fulfill({ json: { schemaVersion: 1, sourcePage: "https://www.callofduty.com/guides/modernwarfare4/dmz-maps/hajin", capturedAt: "2026-11-05T00:00:00Z", categories: [], markers: [] } });
    if (url.pathname.startsWith("/maps/")) return route.fulfill({ body: png, contentType: "image/png" });
    const upstream = await route.fetch({ url: actualMap + url.pathname + url.search });
    return route.fulfill({ response: upstream });
  });
  const seed = await context.newPage();
  await seed.goto(`${mapBase}/?tool=boss-checklist`);
  await seed.locator("#workspace-open:enabled").waitFor();
  await seed.evaluate(async () => {
    const { openWorkspace } = await import("/src/workspace/store.ts");
    const { emptyWorkspace } = await import("/src/workspace/model.ts");
    const { emptyFieldGuide } = await import("/src/workspace/field-guide.ts");
    const db = await openWorkspace();
    try {
      const old = await db.read();
      const workspace = emptyWorkspace();
      workspace.fieldGuide = emptyFieldGuide();
      workspace.fieldGuide.checklists = { version: 1, entries: [{ id: "ltA", name: "SYNTHETIC Lieutenant", type: "lieutenant", goal: 5, starting: 0, notes: "", pinned: false, waypoint: null, source: null }], kills: [], dogTags: [], attempts: [] };
      await db.commit(workspace, old.current?.revision ?? 0);
    } finally { db.close(); }
  });
  await seed.close();
  const page = await context.newPage();
  await page.goto(`${guideBase}/field-desk/?pack=demo%3Atraining-pack`);
  await page.waitForFunction(() => document.querySelector("main")?.getAttribute("aria-busy") === "false");
  await page.getByText("Stage stock report", { exact: true }).click();
  await page.locator("[data-review-form='inventory'] [name='itemId']").selectOption("demo:wire");
  await page.locator("[data-review-form='inventory'] [name='quantity']").fill("2");
  await page.locator("[data-review-form='inventory'] button").click();
  await page.waitForFunction(() => document.querySelectorAll("#review-queue-list li").length === 1);
  await page.getByText("Stage progress report", { exact: true }).click();
  const objectiveId = await page.locator("[data-review-objectives] option").nth(1).getAttribute("value");
  assert(objectiveId);
  await page.locator("[data-review-objectives]").selectOption(objectiveId);
  await page.locator("[data-review-form='progression'] button").click();
  await page.waitForFunction(() => document.querySelectorAll("#review-queue-list li").length === 2);
  await page.getByText("Stage item discovery", { exact: true }).click();
  await page.locator("[data-review-form='observation'] [name='itemId']").selectOption("demo:wire");
  await page.locator("[data-review-form='observation'] [name='place']").fill("Synthetic crate");
  await page.locator("[data-review-form='observation'] button").click();
  await page.waitForFunction(() => document.querySelectorAll("#review-queue-list li").length === 3);
  await page.getByText("Stage boss event for map", { exact: true }).click();
  await page.locator("[data-review-form='boss'] [name='bossId']").fill("ltA");
  await page.locator("[data-review-form='boss'] [name='date']").fill("2026-11-11");
  await page.locator("[data-review-form='boss'] [name='event']").selectOption("attempt");
  await page.locator("[data-review-form='boss'] button").click();
  await page.waitForFunction(() => document.querySelectorAll("#review-queue-list li").length === 4);
  await page.reload();
  await page.waitForFunction(() => document.querySelectorAll("#review-queue-list li").length === 4);
  const inventory = page.locator("#review-queue-list li").filter({ hasText: "inventory" });
  await inventory.locator("[data-review-preview]").click();
  assert.match(await page.locator("#review-queue-preview").textContent(), /Unknown → 2/);
  await page.locator("[data-review-confirm]").click();
  await page.waitForFunction(() => document.querySelector("#review-queue-list")?.textContent.includes("saved"));
  const saved = await page.evaluate(async () => (await (await import("/assets/src/storage/store.mjs")).loadProfile("demo:training-pack")).value);
  assert.equal(saved.inventory["demo:wire"], 2);
  assert.equal(saved.fieldOps.history.length, 1);
  assert.equal(await inventory.locator("[data-review-preview]").count(), 0);
  const progression = page.locator("#review-queue-list li").filter({ hasText: "progression" });
  await progression.locator("[data-review-preview]").click();
  await page.locator("[data-review-confirm]").click();
  await page.waitForFunction(() => document.querySelector("#review-queue-list")?.textContent.includes("progression · saved"));
  const progressed = await page.evaluate(async () => (await (await import("/assets/src/storage/store.mjs")).loadProfile("demo:training-pack")).value);
  assert.equal(progressed.completion[objectiveId], "completed");
  const observation = page.locator("#review-queue-list li").filter({ hasText: "observation" });
  await observation.locator("[data-review-preview]").click();
  const other = await context.newPage();
  await other.goto(`${guideBase}/inventory/?pack=demo%3Atraining-pack`);
  await other.waitForSelector('[data-field="inventory"][data-id="demo:wire"]');
  await other.locator('[data-field="inventory"][data-id="demo:wire"]').fill("4");
  await other.getByRole("button", { name: "Save inventory", exact: true }).click();
  await other.waitForFunction(() => document.querySelector("#save-status")?.textContent.includes("revision"));
  await other.close();
  await page.locator("[data-review-confirm]").click();
  await page.waitForFunction(() => document.querySelector("#review-queue-list")?.textContent.includes("uncertain"));
  await page.reload();
  await page.waitForFunction(() => document.querySelector("#review-queue-list")?.textContent.includes("uncertain"));
  assert.equal(await observation.locator("[data-review-preview]").count(), 0);
  await observation.locator("[data-review-check]").click();
  await page.waitForFunction(() => document.querySelector("#review-queue-preview")?.textContent.includes("cannot be replayed automatically"));
  assert.match(await page.locator("#review-queue-preview").textContent(), /cannot be replayed automatically/i);
  await page.locator("[data-review-cancel]").click();
  await page.getByText("Stage item discovery", { exact: true }).click();
  await page.locator("[data-review-form='observation'] [name='itemId']").selectOption("demo:wire");
  await page.locator("[data-review-form='observation'] [name='place']").fill("Synthetic second crate");
  await page.locator("[data-review-form='observation'] button").click();
  await page.waitForFunction(() => document.querySelectorAll("#review-queue-list li").length === 5);
  const secondObservation = page.locator("#review-queue-list li").filter({ hasText: "observation · staged" });
  await secondObservation.locator("[data-review-preview]").click();
  await page.locator("[data-review-confirm]").click();
  await page.waitForFunction(() => document.querySelector("#review-queue-list")?.textContent.includes("observation · saved"));
  const observed = await page.evaluate(async () => (await (await import("/assets/src/storage/store.mjs")).loadProfile("demo:training-pack")).value);
  assert.equal(observed.fieldOps.discoveries.length, 1);
  assert.equal(observed.fieldOps.discoveries[0].place, "Synthetic second crate");
  const boss = page.locator("#review-queue-list li").filter({ hasText: "boss" });
  await boss.locator("[data-review-preview]").click();
  const opened = page.waitForEvent("popup");
  await page.locator("[data-review-confirm]").click();
  const mapPage = await opened;
  await mapPage.locator("#boss-review-handoff").waitFor();
  assert.match(await mapPage.locator("#boss-review-handoff").textContent(), /SYNTHETIC Lieutenant.*attempt/);
  await mapPage.locator("#boss-review-confirm").click();
  await page.waitForFunction(() => document.querySelector("#review-queue-list")?.textContent.includes("boss · saved"));
  const logs = await mapPage.evaluate(async () => {
    const db = await (await import("/src/workspace/store.ts")).openWorkspace();
    try { return (await db.read()).current.data.fieldGuide.checklists; } finally { db.close(); }
  });
  assert.equal(logs.attempts.length, 1);
  assert.equal(logs.kills.length, 0);
  await page.reload();
  await page.waitForFunction(() => document.querySelector("#review-queue-list")?.textContent.includes("boss · saved"));
  assert.equal(await boss.locator("[data-review-map]").count(), 0);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("#run-review-queue").scrollIntoViewIfNeeded();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
  assert.deepEqual(errors, []);
  await context.close();
  console.log("After-run review browser journey PASS");
} catch (reason) { failure = reason; throw reason; }
finally { await browser.close(); await map.close(); await guide.stop(failure); }
