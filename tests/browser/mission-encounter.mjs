import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { createServer } from "../../tools/hajin-map/node_modules/vite/dist/node/index.js";
import { startBrowserServer } from "./server.mjs";
import { collectionFixture } from "../helpers/collection-needs.mjs";

process.env.DMZ_UI_VARIANT = "modern";
const guide = await startBrowserServer();
const map = await createServer({
  root: fileURLToPath(new URL("../../tools/hajin-map/", import.meta.url)),
  cacheDir: ".local/mission-encounter-vite",
  server: { host: "127.0.0.1", port: 0, strictPort: true, hmr: false },
  define: { "import.meta.env.VITE_LOCAL_PROVIDER_SNAPSHOTS": '"0"' },
});
await map.listen();
const mapBase = `http://127.0.0.1:${map.httpServer.address().port}`;
const browser = await chromium.launch();
let failure;
try {
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (reason) => errors.push(reason.message));
  await page.goto(`${guide.base}/missions/?pack=official%3Amw4-dmz-starter`);
  await page.waitForFunction(() => document.querySelector("main")?.getAttribute("aria-busy") === "false");
  assert.equal(await page.locator("#orders-coverage .unrecorded").count(), 24);
  const pack = collectionFixture();
  const story = {
    ...structuredClone(pack.objectives[0]),
    id: "craft:story-encounter",
    name: "Fictional story encounter",
    track: "dmz-story",
    steps: ["Reach the fictional site", "Complete the fictional objective"],
    spoiler: false,
  };
  delete story.upgrade;
  pack.objectives.push(story);
  await page.evaluate(async (candidate) => {
    const { validatePack } = await import("/assets/src/content/validate.mjs");
    const { commitRecord } = await import("/assets/src/storage/store.mjs");
    validatePack(candidate, await (await fetch("/assets/schemas/pack.schema.json")).json());
    await commitRecord("content", candidate.id, { pack: candidate, revision: 0 }, 0);
  }, pack);
  await page.goto(`${guide.base}/missions/?pack=${encodeURIComponent(pack.id)}`);
  await page.waitForFunction(() => document.querySelector("main")?.getAttribute("aria-busy") === "false");
  await page.locator("#show-story-missions").click();
  await page.locator('[data-progress-detail="craft:story-encounter"] > summary').click();
  assert.match(await page.locator(".story-mission-steps").textContent(), /Reach the fictional site/);
  const mapPage = await context.newPage();
  mapPage.on("pageerror", (reason) => errors.push(reason.message));
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==", "base64");
  await mapPage.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== mapBase) return route.abort();
    if (url.pathname.endsWith("/official/markers.json"))
      return route.fulfill({ json: { schemaVersion: 1, sourcePage: "https://www.callofduty.com/guides/modernwarfare4/dmz-maps/hajin", capturedAt: "2026-11-05T00:00:00Z", categories: [], markers: [] } });
    if (url.pathname.startsWith("/maps/")) return route.fulfill({ body: png, contentType: "image/png" });
    return route.continue();
  });
  await mapPage.goto(`${mapBase}/?tool=map`);
  await mapPage.locator("#workspace-open:enabled").waitFor();
  await mapPage.evaluate(async () => {
    const { openWorkspace } = await import("/src/workspace/store.ts");
    const { emptyWorkspace } = await import("/src/workspace/model.ts");
    const { emptyFieldGuide } = await import("/src/workspace/field-guide.ts");
    const db = await openWorkspace();
    try {
      const old = await db.read();
      const workspace = emptyWorkspace();
      workspace.fieldGuide = emptyFieldGuide();
      workspace.fieldGuide.checklists = {
        version: 1,
        entries: [{ id: "ltA", name: "SYNTHETIC Lieutenant", type: "lieutenant", goal: 5, starting: 0, notes: "", pinned: false, waypoint: null, source: null }],
        kills: [], dogTags: [],
      };
      await db.commit(workspace, old.current?.revision ?? 0);
    } finally { db.close(); }
  });
  await mapPage.goto(`${mapBase}/?tool=boss-checklist`);
  await mapPage.locator("#boss-list-heading").waitFor();
  await mapPage.locator("#boss-open-ltA").click();
  const before = await mapPage.locator(".boss-detail-counts dd").first().textContent();
  await mapPage.locator("#boss-attempt-record-ltA").click();
  await mapPage.waitForFunction(() => [...document.querySelectorAll("#boss-checklist details summary")].some((node) => node.textContent?.includes("Attempts · 1")));
  assert.equal(await mapPage.locator(".boss-detail-counts dd").first().textContent(), before);
  await page.reload();
  await page.waitForFunction(() => document.querySelector("main")?.getAttribute("aria-busy") === "false");
  await page.locator("#show-story-missions").click();
  assert.match(await page.locator("#progress-rows").textContent(), /Fictional story encounter/);
  assert.deepEqual(errors, []);
  console.log("Mission and boss owner browser journey PASS");
} catch (reason) {
  failure = reason;
  throw reason;
} finally {
  await browser.close();
  await map.close();
  await guide.stop(failure);
}
