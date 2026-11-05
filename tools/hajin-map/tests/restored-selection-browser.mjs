// Synthetic restored snapshots only; match the reported viewport/DPR and factory popup path.
import assert from "node:assert/strict";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium, firefox, webkit } from "playwright";
process.env.DMZ_UI_VARIANT = "modern";
const root = fileURLToPath(new URL("../", import.meta.url));
const server = await createServer({
  root,
  cacheDir: root + "/.local/restored-selection",
  server: { host: "127.0.0.1", port: 0, hmr: false },
  define: { "import.meta.env.VITE_LOCAL_PROVIDER_SNAPSHOTS": '"0"' },
});
await server.listen();
const base = "http://127.0.0.1:" + server.httpServer.address().port,
  results = [];
await mkdir(".local/restored-selection", { recursive: true });
const raw = {
  schemaVersion: 1,
  sourcePage: "https://www.callofduty.com/guides/modernwarfare4/dmz-maps/hajin",
  capturedAt: "2026-11-05T00:00:00Z",
  categories: [
    {
      id: "safe",
      name: "Safes",
      group: "Loot",
      icon: "/maps/hajin/official/icons/safe.png",
    },
    {
      id: "dmz_gasStation",
      name: "Gas stations",
      group: "Facilities",
      icon: "/maps/hajin/official/icons/gas.png",
    },
  ],
  records: ["Safe", "Gas station"].map((n, i) => ({
    id: "record-" + i,
    name: "SYNTHETIC " + n,
    category: i ? "dmz_gasStation" : "safe",
    x: 0.5 + i * 0.07,
    y: 0.5,
    mapId: "hajin",
    coordinateSpaceVersion: "hajin-official-v1-4096",
    notes: "Synthetic source note ".repeat(30),
  })),
};
const stored = (p) =>
  p.evaluate(async () => {
    const { openWorkspace } = await import("/src/workspace/store.ts");
    const db = await openWorkspace();
    try {
      return JSON.stringify((await db.read()).current);
    } finally {
      db.close();
    }
  });
const camera = (p) =>
  p.evaluate(async () => {
    const { viewer } = await import(
      document.querySelector('script[src*="/src/main.ts"]').src
    );
    return { center: viewer.map.getCenter(), zoom: viewer.map.getZoom() };
  });
try {
  for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
    const browser = await engine.launch();
    try {
      for (const [width, height, dpr] of [
        [943, 674, 1.25],
        [1280, 600, 1],
      ]) {
        const context = await browser.newContext({
          viewport: { width, height },
          deviceScaleFactor: dpr,
          reducedMotion: "reduce",
          recordVideo: { dir: ".local/restored-selection/video" },
        });
        const p = await context.newPage(),
          errors = [],
          external = [];
        p.on("pageerror", (e) => errors.push(e.message));
        try {
          const png = Buffer.from(
            await p.evaluate(() => {
              const c = document.createElement("canvas");
              c.width = c.height = 64;
              return c.toDataURL().split(",")[1];
            }),
            "base64",
          );
          await p.route("**/*", (r) => {
            const u = new URL(r.request().url());
            if (u.origin !== base) {
              external.push(u.href);
              return r.abort();
            }
            if (u.pathname.endsWith("/official/markers.json"))
              return r.fulfill({ json: raw });
            if (/\.(png|webp)$/.test(u.pathname))
              return r.fulfill({ contentType: "image/png", body: png });
            if (u.pathname.startsWith("/maps/"))
              return r.fulfill({ status: 404, body: "Synthetic absent file" });
            return r.continue();
          });
          await p.goto(base);
          await p.locator('html[data-ui-mounted="071-v1"]').waitFor();
          await p.evaluate(async (raw) => {
            const { openWorkspace } = await import("/src/workspace/store.ts"),
              { emptyWorkspace } = await import("/src/workspace/model.ts"),
              { adaptOfficial } = await import("/src/workspace/import.ts"),
              { applySnapshot } = await import("/src/workspace/refresh.ts"),
              { identityRegistration } = await import(
                "/src/workspace/registration.ts"
              );
            const w = emptyWorkspace(),
              snapshot = adaptOfficial(raw, "official");
            applySnapshot(
              w,
              snapshot,
              "b".repeat(64),
              identityRegistration(snapshot.frame),
            );
            const db = await openWorkspace();
            try {
              await db.commit(w, (await db.read()).current?.revision ?? 0);
            } finally {
              db.close();
            }
            localStorage.setItem(
              "dmz-ui-map-pane-v1",
              JSON.stringify({ version: 1, width: 320 }),
            );
          }, raw);
          await p.reload();
          await p.locator('html[data-ui-mounted="071-v1"]').waitFor();
          await p.locator("#ui-map-view").click();
          await p.locator("#map-status").waitFor({ state: "hidden" });
          for (let i = 0; i < 4; i++) await p.locator("#zoom-in").click();
          await p.evaluate(
            () =>
              new Promise((r) =>
                requestAnimationFrame(() => requestAnimationFrame(r)),
              ),
          );
          if (width === 943)
            await p.evaluate(() =>
              document.dispatchEvent(
                new CustomEvent("workspace-error", {
                  detail: new Error("SYNTHETIC retained notice. ".repeat(50)),
                }),
              ),
            );
          const before = await stored(p),
            view = await camera(p);
          await p.evaluate(async () => {
            const { viewer } = await import(
              document.querySelector('script[src*="/src/main.ts"]').src
            );
            window.__popupCloses = 0;
            viewer.map.on("popupclose", () => window.__popupCloses++);
          });
          for (const [index, label] of [
            "Safe",
            "Gas station",
            "Safe",
          ].entries()) {
            const marker = p.locator(
              `.leaflet-marker-icon[title="SYNTHETIC ${label}"]`,
            );
            assert.equal(
              await marker.getAttribute("data-source-marker-id"),
              null,
              "Use restored workspace markers, not raw-source controls",
            );
            await marker.click();
            const detail = p.locator("#ui-selection-detail"),
              title = detail.locator(".marker-popup-title");
            await detail.waitFor();
            assert.equal(await title.textContent(), "SYNTHETIC " + label);
            const original = await title.elementHandle();
            for (let i = 0; i < 3; i++) {
              await marker.click();
              assert.equal(
                await original.evaluate((n) => n.isConnected),
                true,
                "Repeated source click keeps the original factory content",
              );
            }
            assert.equal(
              await p
                .locator("#workspace-dialog")
                .getAttribute("data-ui-detail"),
              "selection",
            );
            assert.equal(
              await p.locator("#workspace-dialog>nav").isVisible(),
              false,
            );
            assert.equal(
              await p.locator("#ui-map-task-title").textContent(),
              "SYNTHETIC " + label,
            );
            assert.equal(
              await p.evaluate(() => window.__popupCloses),
              index,
              "Each replacement closes its previous popup exactly once",
            );
            await p.evaluate(() => {
              window.__watchRestored = true;
              window.__restoredHidden = false;
              const title = document.querySelector(
                "#ui-selection-detail .marker-popup-title",
              );
              const sample = () => {
                const r = title.getBoundingClientRect();
                if (
                  !title.isConnected ||
                  !r.width ||
                  r.top < 0 ||
                  r.bottom > innerHeight ||
                  getComputedStyle(title).visibility !== "visible"
                )
                  window.__restoredHidden = true;
                if (window.__watchRestored) requestAnimationFrame(sample);
              };
              requestAnimationFrame(sample);
            });
            await p.waitForTimeout(5000);
            assert.equal(
              await p.evaluate(() => {
                window.__watchRestored = false;
                return window.__restoredHidden;
              }),
              false,
              "Restored selection title stays in the viewport for five seconds",
            );
            const placement = await p.evaluate(() => ({
              top: document
                .querySelector("#ui-selection-detail")
                .getBoundingClientRect().top,
              headerBottom: document
                .querySelector(".ui-map-task-header")
                .getBoundingClientRect().bottom,
            }));
            assert.ok(
              placement.top <= placement.headerBottom + 16,
              "Selected information starts immediately below the task header, not below retained notices",
            );
            await p.screenshot({
              path: `.local/restored-selection/${name}-${width}-${index}-held-5s.png`,
            });
            if (index === 0) {
              await p.locator("#ui-map-view").click();
              await marker.click();
              await detail.waitFor({ state: "visible" });
              assert.equal(
                await original.evaluate((n) => n.isConnected),
                true,
                "Clicking selected marker reopens minimized details without rebuilding them",
              );
            }
          }
          await p.locator("#ui-selection-back").click();
          await p
            .locator("#ui-selection-detail")
            .waitFor({ state: "detached" });
          assert.equal(
            await p.evaluate(() => window.__popupCloses),
            3,
            "Back closes exactly once",
          );
          assert.deepEqual(await camera(p), view);
          assert.equal(await stored(p), before);
          assert.deepEqual(errors, []);
          assert.deepEqual(external, []);
          results.push({
            engine: name,
            width,
            height,
            dpr,
            replacements: 2,
            repeatedPointerClicks: 9,
            originalNode: true,
            visibleForFiveSeconds: true,
            exactCloseCount: true,
            cameraAndData: true,
          });
          console.log(
            name +
              " " +
              width +
              " restored selection PASS: safe/gas/safe, repeated clicks, minimized reveal, five-second visible title, exact close count and camera/data",
          );
        } finally {
          await context.close();
        }
      }
    } finally {
      await browser.close();
    }
  }
} finally {
  await writeFile(
    ".local/restored-selection/results.json",
    JSON.stringify(results, null, 2),
  );
  await server.close();
}
