// Fixed-origin handshake against a synthetic map served through the map origin.
import assert from "node:assert/strict";
import { createServer } from "vite";
import { chromium } from "playwright";
const server = await createServer({
  define: { "import.meta.env.VITE_LOCAL_PROVIDER_SNAPSHOTS": '"0"' },
  server: { host: "127.0.0.1", port: 5281, strictPort: true, hmr: false },
});
await server.listen();
const browser = await chromium.launch(),
  context = await browser.newContext(),
  page = await context.newPage();
try {
  await context.route("http://127.0.0.1:5175/**", async (route) => {
    const url = new URL(route.request().url()),
      response = await route.fetch({
        url: "http://127.0.0.1:5281" + url.pathname + url.search,
      });
    await route.fulfill({ response });
  });
  const png = Buffer.from(
    await page.evaluate(() => {
      const c = document.createElement("canvas");
      c.width = c.height = 64;
      c.getContext("2d").fillRect(0, 0, 64, 64);
      return c.toDataURL().split(",")[1];
    }),
    "base64",
  );
  await context.route("**/maps/hajin/v1/background.webp", (route) =>
    route.fulfill({ body: png, contentType: "image/png" }),
  );
  await context.route("**/maps/hajin/official/icons/*", (route) =>
    route.fulfill({ body: png, contentType: "image/png" }),
  );
  await context.route("**/maps/hajin/official/markers.json", (route) =>
    route.fulfill({
      json: {
        schemaVersion: 1,
        sourcePage:
          "https://www.callofduty.com/guides/modernwarfare4/dmz-maps/hajin",
        capturedAt: "2026-11-10T00:00:00Z",
        synthetic: true,
        categories: [
          {
            id: "poiLabel",
            name: "Synthetic named areas",
            group: "Locations",
            icon: "/maps/hajin/official/icons/synthetic.png",
          },
        ],
        records: [
          {
            id: "synthetic-air-base",
            name: "Chang-san Air Base",
            category: "poiLabel",
            mapId: "hajin",
            coordinateSpaceVersion: "hajin-official-v1-4096",
            x: 0.2,
            y: 0.3,
          },
          {
            id: "synthetic-wharf",
            name: "Songdo Wharf",
            category: "poiLabel",
            mapId: "hajin",
            coordinateSpaceVersion: "hajin-official-v1-4096",
            x: 0.6,
            y: 0.7,
          },
        ],
      },
    }),
  );
  await page.goto(
    "http://127.0.0.1:4173/field-desk/?pack=official%3Amw4-dmz-starter",
  );
  await page.waitForFunction(
    () => document.querySelector("main")?.getAttribute("aria-busy") === "false",
  );
  await page.locator("#plan-select-none").click();
  await page
    .locator('[data-plan-item="mw4:ingredient-ballistic-fabric"]')
    .check();
  const popup = page.waitForEvent("popup");
  await page.locator("#plan-send").click();
  const map = await popup;
  await page.waitForFunction(
    () =>
      document
        .querySelector("#plan-status")
        ?.textContent.includes("Plan received"),
    {},
    { timeout: 25000 },
  );
  await map.locator("#collection-plan-accept").waitFor();
  assert.match(
    await map.locator("#map-collection-plan").innerText(),
    /Ballistic Fabric/,
  );
  assert.equal(await map.locator("#collection-plan-route").count(), 0);
  await map.locator("#collection-plan-accept").click();
  await map.locator("#collection-plan-highlight").click();
  await map.locator("[data-item-area-highlight]").first().waitFor();
  assert.equal(await map.locator("[data-item-area-highlight]").count(), 2);
  const profile = await page.evaluate(async () => {
    const { state } = await import("/assets/src/client/common.mjs");
    return state.profile;
  });
  assert.deepEqual(profile.inventory, {});
  // A real opener at a different origin cannot transfer even with the right nonce.
  const foreign = await context.newPage();
  await foreign.goto("http://127.0.0.1:5281/?tool=explore");
  const foreignNonce = "11111111-1111-4111-8111-111111111111";
  const foreignPopup = foreign.waitForEvent("popup");
  await foreign.evaluate((nonce) => {
    window.__foreignMap = window.open(`http://127.0.0.1:5175/?tool=explore&collection=${nonce}`, "_blank");
  }, foreignNonce);
  const foreignMap = await foreignPopup;
  await foreignMap.locator("#collection-plan-file").waitFor({ state: "attached" });
  await foreign.evaluate((nonce) => {
    window.__foreignMap?.postMessage({ type: "dmz-collection-plan", nonce, plan: {
      kind: "dmz-collection-plan", version: 1, packId: "test:catalog",
      contentVersion: "synthetic.1", createdAt: new Date().toISOString(),
      scope: "unfinished", items: [{ itemId: "test:item", name: "Synthetic item",
        needed: 1, minimum: false, areas: [{ id: "test:area", name: "Chang-san Air Base" }] }],
    } }, "http://127.0.0.1:5175");
  }, foreignNonce);
  await foreignMap.waitForTimeout(300);
  assert.equal(await foreignMap.locator("#collection-plan-accept").count(), 0);
  await foreignMap.close();
  await foreign.close();
  console.log(
    "PASS real Field desk → map nonce/origin/source handshake, reviewed single-item plan, explicit highlights and unchanged guide inventory",
  );
} finally {
  await browser.close();
  await server.close();
}
