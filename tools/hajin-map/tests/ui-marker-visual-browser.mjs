// Real marker pointer clicks, live owning DOM, synthetic fixture and viewport artifacts.
import assert from "node:assert/strict";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium, firefox, webkit } from "playwright";
process.env.DMZ_UI_VARIANT = "modern";
const server = await createServer({
  root: fileURLToPath(new URL("../", import.meta.url)),
  cacheDir: ".local/ui-marker-visual-vite",
  server: { host: "127.0.0.1", port: 0, hmr: false },
  define: { "import.meta.env.VITE_LOCAL_PROVIDER_SNAPSHOTS": '"1"' },
});
await server.listen();
const base = `http://127.0.0.1:${server.httpServer.address().port}`,
  results = [];
await mkdir(".local/marker-visual", { recursive: true });
const cases = process.argv.includes("--safe-route-only")
  ? []
  : [
      ["resized", 1280, 600, "dark", 100],
      ["short", 1280, 600, "dark", 100],
      ["desktop", 1440, 900, "dark", 100],
      ["light", 1440, 900, "light", 100],
      ["mobile", 390, 844, "dark", 100],
      ["narrow", 320, 568, "light", 100],
      ["text", 390, 844, "light", 200],
      ["short-text", 320, 400, "dark", 200],
    ];
const stored = (p) =>
  p.evaluate(async () => {
    const { openWorkspace } = await import("/src/workspace/store.ts");
    const s = await openWorkspace();
    try {
      return JSON.stringify((await s.read()).current);
    } finally {
      s.close();
    }
  });
const camera = (p) =>
  p.evaluate(async () => {
    const { viewer } = await import("/src/main.ts");
    const c = viewer.map.getCenter();
    return { lat: c.lat, lng: c.lng, zoom: viewer.map.getZoom() };
  });
const hit = (locator) =>
  locator.evaluate((n) => {
    const r = n.getBoundingClientRect(),
      h = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return n === h || n.contains(h);
  });
const settle = (p) =>
  p.evaluate(
    () =>
      new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
  );
try {
  for (const [engineName, engine] of Object.entries({
    chromium,
    firefox,
    webkit,
  })) {
    const b = await engine.launch();
    try {
      const c = await b.newContext({
          reducedMotion: "reduce",
          recordVideo: { dir: ".local/marker-visual/video" },
        }),
        p = await c.newPage(),
        errors = [],
        external = [];
      p.on("pageerror", (e) => errors.push(e.message));
      await c.route("**/*", (r) => {
        if (new URL(r.request().url()).origin === base) return r.continue();
        external.push(r.request().url());
        return r.abort();
      });
      await c.addInitScript(() => {
        window.__heldRouteResults = [];
        const NativeWorker = Worker;
        window.Worker = class extends NativeWorker {
          set onmessage(fn) {
            super.onmessage = (e) => {
              if (window.__holdRouteResult && e.data.result)
                window.__heldRouteResults.push(() => fn.call(this, e));
              else fn.call(this, e);
            };
          }
        };
      });
      const png = await p.evaluate(() => {
        const c = document.createElement("canvas");
        c.width = c.height = 128;
        c.getContext("2d").fillRect(0, 0, 128, 128);
        return c.toDataURL().split(",")[1];
      });
      await c.route("**/background.webp", (r) =>
        r.fulfill({
          contentType: "image/png",
          body: Buffer.from(png, "base64"),
        }),
      );
      await c.route("**/icons/*.png", (r) =>
        r.fulfill({
          contentType: "image/png",
          body: Buffer.from(png, "base64"),
        }),
      );
      let heldRoad,
        holdRoad = true;
      await c.route("**/roads.local.json", (r) => {
        if (holdRoad) heldRoad = r;
        else return r.fulfill({ status: 404, body: "Synthetic absent roads" });
      });
      for (const path of [
        "current-captures.local.json",
        "providers.local.json",
      ])
        await c.route("**/" + path, (r) =>
          r.fulfill({ status: 404, body: "Synthetic absent local data" }),
        );
      await c.route("**/__map-updates/**", (r) =>
        r.fulfill({
          json: { enabled: false, reason: "Synthetic read-only service" },
        }),
      );
      await c.route("**/official/markers.json", (r) =>
        r.fulfill({
          json: {
            schemaVersion: 1,
            sourcePage:
              "https://www.callofduty.com/guides/modernwarfare4/dmz-maps/hajin",
            capturedAt: "2026-11-05T00:00:00Z",
            synthetic: true,
            categories: [
              {
                id: "dmz_gasStation",
                name: "Gas stations",
                group: "Facilities",
                icon: "/maps/hajin/official/icons/synthetic.png",
              },
              {
                id: "safe",
                name: "Safes",
                group: "Synthetic loot",
                icon: "/maps/hajin/official/icons/synthetic.png",
              },
            ],
            records: [
              ["a", "SYNTHETIC Alpha", "dmz_gasStation", 0.5, 0.5],
              [
                "b",
                "SYNTHETIC long location title for narrow side menu layout regression",
                "safe",
                0.7,
                0.5,
              ],
              ["safe", "SYNTHETIC Safe", "safe", 0.5, 0.5],
            ].map(([id, name, category, x, y]) => ({
              id,
              name,
              category,
              x,
              y,
              mapId: "hajin",
              coordinateSpaceVersion: "hajin-official-v1-4096",
              notes: "SYNTHETIC source details, not a game fact. ".repeat(90),
            })),
          },
        }),
      );
      for (const [label, width, height, theme, text] of cases.filter(
        (c) =>
          !process.argv.includes("--main-layout-only") || c[0] === "resized",
      )) {
        await p.setViewportSize({ width, height });
        await p.addInitScript((narrow) => {
          if (narrow)
            localStorage.setItem(
              "dmz-ui-map-pane-v1",
              JSON.stringify({ version: 1, width: 288 }),
            );
          else localStorage.removeItem("dmz-ui-map-pane-v1");
        }, label === "resized");
        holdRoad = true;
        heldRoad = undefined;
        await p.goto(base + "/?tool=map");
        await p.locator('html[data-ui-adapter="map-pane"]').waitFor();
        await p.locator("#map-status").waitFor({ state: "hidden" });
        await p.evaluate(
          ({ theme, text }) => {
            document.documentElement.dataset.theme = theme;
            document.documentElement.style.fontSize = text + "%";
          },
          { theme, text },
        );
        await p.locator("#ui-map-view").click();
        await p.waitForFunction(async () => {
          const { viewer } = await import("/src/main.ts");
          const e = viewer.map.getContainer(),
            size = viewer.map.getSize();
          return size.x === e.clientWidth && size.y === e.clientHeight;
        });
        await p.evaluate(async () => {
          const { viewer } = await import("/src/main.ts");
          viewer.map.stop();
          viewer.map.setView([2048, 2867], viewer.map.getZoom() + 1, {
            animate: false,
            reset: true,
          });
        });
        await settle(p);
        const before = await camera(p),
          domain = await stored(p);
        await p.locator('[data-official-id="b"]').click();
        await p.locator("#ui-selection-detail").waitFor();
        await settle(p);
        const title = p.locator("#ui-selection-detail .marker-popup-title"),
          detail = p.locator("#ui-selection-detail .marker-popup-details");

        const selectedNode = await title.elementHandle();
        assert.ok(heldRoad, "Local road check started before marker selection");
        await p.evaluate(() => {
          window.__selectionLost = false;
          window.__layoutModes = [];
          window.__modeWatch = new MutationObserver(() => {
            const mode = document.documentElement.dataset.mapLayout;
            if (window.__layoutModes.at(-1) !== mode)
              window.__layoutModes.push(mode);
          });
          window.__modeWatch.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ["data-map-layout"],
          });
          window.__selectionHidden = false;
          window.__selectionWatching = true;
          const n = document.querySelector("#ui-selection-detail");
          window.__selectionWatch = new MutationObserver(() => {
            if (!n.isConnected) window.__selectionLost = true;
          });
          const sample = () => {
            const title = n.querySelector(".marker-popup-title");
            const r = title?.getBoundingClientRect();
            if (
              !n.isConnected ||
              !r?.width ||
              !r?.height ||
              getComputedStyle(title).visibility !== "visible"
            )
              window.__selectionHidden = true;
            if (window.__selectionWatching) requestAnimationFrame(sample);
          };
          requestAnimationFrame(sample);
          window.__selectionWatch.observe(document.body, {
            subtree: true,
            childList: true,
          });
        });
        holdRoad = false;
        await heldRoad.fulfill(
          label === "desktop" || label === "mobile"
            ? {
                json: {
                  kind: "dmz-road-network",
                  version: 1,
                  mapId: "hajin",
                  coordinateSpaceVersion: "hajin-official-v1-4096",
                  name: "SYNTHETIC empty road network",
                  attribution: "Synthetic fixture, no game facts",
                  verification: "unverified",
                  nodes: [],
                  edges: [],
                },
              }
            : { status: 404, body: "Synthetic absent roads" },
        );
        await p.evaluate(() =>
          document.dispatchEvent(new CustomEvent("map-source-status")),
        );
        await p.waitForTimeout(1000);
        await p.screenshot({
          path: `.local/marker-visual/${engineName}-${label}-held-1s.png`,
        });
        await p.waitForTimeout(4000);
        await p.screenshot({
          path: `.local/marker-visual/${engineName}-${label}-held-5s.png`,
        });
        assert.equal(
          await selectedNode.evaluate((n) => n.isConnected),
          true,
          "Original selection must survive roads and source-status refreshes for five seconds",
        );
        assert.equal(
          await p.evaluate(() => {
            window.__selectionWatching = false;
            window.__selectionWatch.disconnect();
            return window.__selectionLost || window.__selectionHidden;
          }),
          false,
          "Selection must remain connected and visibly rendered on every sampled frame for five seconds",
        );
        const modes = await p.evaluate(() => {
          window.__modeWatch.disconnect();
          return window.__layoutModes;
        });
        assert.ok(
          modes.length <= 3,
          `Selection layout must settle, got ${modes.length} transitions: ${modes.slice(0, 12)}`,
        );
        const geometry = await p.evaluate(() => {
          const title = document
              .querySelector("#ui-selection-detail .marker-popup-title")
              .getBoundingClientRect(),
            body = document
              .querySelector("#ui-selection-detail .marker-popup-details")
              .getBoundingClientRect(),
            task = document
              .querySelector("#ui-map-task")
              .getBoundingClientRect();
          return {
            title: { top: title.top, bottom: title.bottom },
            body: { top: body.top, height: body.height },
            task: { top: task.top, bottom: task.bottom },
            height: innerHeight,
          };
        });
        await p.screenshot({
          path: `.local/marker-visual/${engineName}-${label}-initial.png`,
        });
        assert.ok(
          geometry.title.top >= 0 &&
            geometry.title.bottom <=
              Math.min(geometry.height, geometry.task.bottom) + 1,
          `${engineName}/${label}: selected title must be in the initial viewport ${JSON.stringify(geometry)}`,
        );
        assert.ok(
          geometry.body.top + Math.min(36, geometry.body.height) <=
            Math.min(geometry.height, geometry.task.bottom) + 1,
          `${engineName}/${label}: initial details must be readable`,
        );
        assert.equal(
          await title.textContent(),
          "SYNTHETIC long location title for narrow side menu layout regression",
        );
        const contrast = await title.evaluate((n) => {
          const lum = (color) => {
            const rgb = color
              .match(/[\d.]+/g)
              .slice(0, 3)
              .map(Number)
              .map((v) => {
                v /= 255;
                return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
              });
            return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
          };
          const a = lum(getComputedStyle(n).color),
            b = lum(
              getComputedStyle(document.querySelector("#ui-map-task"))
                .backgroundColor,
            );
          return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
        });
        assert.ok(
          contrast >= 4.5,
          `Selected title contrast ${contrast} must be readable`,
        );
        assert.equal(
          await p.locator("#ui-map-task-title").textContent(),
          "SYNTHETIC long location title for narrow side menu layout regression",
        );
        assert.equal(
          await p.locator("#workspace-dialog > nav").isVisible(),
          false,
        );
        assert.equal(await p.locator("#ui-selection-detail").count(), 1);
        const action = p
          .locator("#ui-selection-detail .marker-popup-actions button")
          .last();
        await action.scrollIntoViewIfNeeded();
        assert.equal(
          await hit(action),
          true,
          "Final original action is reachable",
        );
        const back = p.locator("#ui-selection-back");
        await back.scrollIntoViewIfNeeded();
        assert.equal(
          await hit(back),
          true,
          "Back is not obscured by pane header",
        );
        await p.screenshot({
          path: `.local/marker-visual/${engineName}-${label}-actions.png`,
        });
        await back.click();
        assert.equal(await p.locator("#ui-selection-detail").count(), 0);
        assert.equal(
          await p.locator("#workspace-dialog").getAttribute("data-ui-detail"),
          null,
        );
        await p.locator("#ui-map-view").click();
        await p.locator('[data-official-id="b"]').click();
        await title.waitFor();
        await p.locator("#ui-selection-detail .marker-popup-details").focus();
        await p.keyboard.press("Escape");
        await p.locator("#ui-selection-detail").waitFor({ state: "detached" });
        assert.deepEqual(await camera(p), before);
        assert.equal(await stored(p), domain);
        results.push({
          engine: engineName,
          label,
          geometry,
          originalActions: true,
          visibleForFiveSecondsAfterSourceStatus: true,
          cameraAndDataPreserved: true,
        });
      }
      for (const width of process.argv.includes("--main-layout-only")
        ? []
        : [1440, 390]) {
        await p.setViewportSize({ width, height: 844 });
        await p.goto(base + "/safes.html");
        await p.locator("#safe-settings:not([disabled])").waitFor();
        await p.locator("#terrain-status").waitFor({ state: "hidden" });
        await p.locator("#safe-task-view").click();
        await p.evaluate(() => (window.__holdRouteResult = true));
        await p.locator("#start-x").fill("2000");
        await p.locator("#start-y").fill("2000");
        await p.locator("#manual-start button").click();
        await p.waitForFunction(() => window.__heldRouteResults.length > 0);
        await p.locator("#safe-map-view").click();
        await p
          .locator(
            '.safe-number-marker[title*="SYNTHETIC long location title for narrow side menu layout regression"]',
          )
          .click();
        const popup = p.locator(".readable-marker-popup");
        await popup.waitFor();
        const popupNode = await popup.elementHandle();
        await p.evaluate(() => {
          const n = document.querySelector(".readable-marker-popup");
          window.__safePopupMissing = false;
          window.__watchSafe = true;
          const sample = () => {
            if (
              !n.isConnected ||
              !n.getBoundingClientRect().width ||
              getComputedStyle(n).visibility !== "visible"
            )
              window.__safePopupMissing = true;
            if (window.__watchSafe) requestAnimationFrame(sample);
          };
          requestAnimationFrame(sample);
        });
        await p.evaluate(() => {
          window.__holdRouteResult = false;
          window.__heldRouteResults.splice(0).forEach((fn) => fn());
        });
        await p.waitForTimeout(1000);
        await p.screenshot({
          path: `.local/marker-visual/${engineName}-safe-${width}-held-1s.png`,
        });
        await p.waitForTimeout(4000);
        await p.screenshot({
          path: `.local/marker-visual/${engineName}-safe-${width}-held-5s.png`,
        });
        assert.equal(
          await popupNode.evaluate((n) => n.isConnected),
          true,
          "Safe popup stays open for five seconds after real optimization completes",
        );
        assert.equal(
          await p.evaluate(() => {
            window.__watchSafe = false;
            return window.__safePopupMissing;
          }),
          false,
          "Safe popup remains visibly rendered on every sampled frame",
        );
        assert.match(
          await p.locator("#route-status").textContent(),
          /Direct lines, not roads/,
          "The held real worker result was applied",
        );
        const box = await popup.boundingBox(),
          map = await p.locator("#safe-map").boundingBox();
        assert.ok(
          box.x >= map.x - 1 &&
            box.y >= map.y - 1 &&
            box.x + box.width <= map.x + map.width + 1 &&
            box.y + box.height <= map.y + map.height + 1,
        );
        const close = popup.locator(".leaflet-popup-close-button");
        assert.equal(await hit(close), true);
        await p.screenshot({
          path: `.local/marker-visual/${engineName}-safe-${width}.png`,
        });
        await close.click();
        await popup.waitFor({ state: "detached" });
        results.push({
          engine: engineName,
          safeWidth: width,
          popupVisibleAndBounded: true,
        });
      }
      assert.deepEqual(errors, []);
      assert.deepEqual(external, []);
      await c.close();
      console.log(
        `${engineName} marker visual PASS: ${results.filter((r) => r.engine === engineName && r.label).length} main-map cases and ${results.filter((r) => r.engine === engineName && r.safeWidth).length} Safe Run active-optimization five-second popup cases, original controls/Back/Escape, camera/data`,
      );
    } finally {
      await b.close();
    }
  }
} finally {
  await writeFile(
    ".local/marker-visual/results.json",
    JSON.stringify(results, null, 2),
  );
  await server.close();
}
