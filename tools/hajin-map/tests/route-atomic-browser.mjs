import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { mkdir } from "node:fs/promises";
import { createServer } from "vite";
import { chromium, firefox, webkit } from "playwright";
const root = fileURLToPath(new URL("../", import.meta.url));
const repo = fileURLToPath(new URL("../../../", import.meta.url));
const server = await createServer({
  root,
  configFile: false,
  cacheDir: root + ".local/route-atomic-vite",
  optimizeDeps: { include: ["leaflet"] },
  define: { "import.meta.env.VITE_LOCAL_PROVIDER_SNAPSHOTS": '"0"' },
  server: {
    host: "127.0.0.1",
    port: 5287,
    strictPort: true,
    hmr: false,
    fs: { allow: [repo] },
  },
  plugins: [
    {
      name: "synthetic-route-host",
      configureServer(vite) {
        vite.middlewares.use("/__route-atomic", (_req, res) => {
          res.setHeader("content-type", "text/html");
          res.end(
            '<!doctype html><html lang="en"><head><title>Synthetic route boundary fixture</title><link rel="stylesheet" href="/node_modules/leaflet/dist/leaflet.css"></head><body><main class="map-workspace" style="width:1200px;height:900px"><div id="map" style="width:800px;height:600px"></div><dialog id="workspace-dialog"><section id="panel"></section></dialog></main></body></html>',
          );
        });
      },
    },
  ],
});
await server.listen();
const transformed = await server.transformRequest(
  "/src/workspace/field-guide-ui.ts",
);
const leafletUrl = /from ["']([^"']*leaflet[^"']*)["']/.exec(
  transformed.code,
)?.[1];
assert(leafletUrl, "Leaflet module resolution missing");
await mkdir(new URL("../.local/", import.meta.url), { recursive: true });
try {
  for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
    const browser = await engine.launch();
    try {
      const page = await browser.newPage({
          viewport: { width: 1440, height: 1200 },
        }),
        errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto("http://127.0.0.1:5287/__route-atomic");
      await page.evaluate(async (leafletUrl) => {
        const L = (await import(leafletUrl)).default;
        const { createFieldGuideUI } = await import(
          "/src/workspace/field-guide-ui.ts"
        );
        const { emptyWorkspace } = await import("/src/workspace/model.ts");
        const { emptyFieldGuide, recordHandle, waypointToken } = await import(
          "/src/workspace/field-guide.ts"
        );
        const { validateWorkspace } = await import("/src/workspace/backup.ts");
        const source = {
          key: "official",
          identity: JSON.stringify(["official", "snap-a", "a".repeat(64), "1"]),
          id: "1",
          kind: "source",
          sourceId: "official",
          sourceName: "Synthetic official",
          title: "Synthetic source stop",
          category: "Fixture",
          categoryId: "fixture",
          notes: "Synthetic",
          x: 100,
          y: 100,
          floor: null,
          build: null,
          visible: true,
          status: "Source claim",
          capturedAt: "2026-10-28T00:00:00Z",
          url: null,
        };
        const map = L.map(document.querySelector("#map"), {
          crs: L.CRS.Simple,
          zoomControl: false,
        }).setView([200, 200], 1);
        let state,
          revision,
          records,
          ui,
          held,
          pending,
          failures,
          commits,
          dirty,
          allowed;
        document.addEventListener("workspace-error", (event) =>
          failures.push(event.detail?.message ?? String(event.detail)),
        );
        const refresh = () => {
          document.querySelector("#panel").replaceChildren(ui.panel());
          ui.renderOverlay();
        };
        const flush = () => {
          const op = pending;
          if (!op) return;
          pending = null;
          try {
            if (op.expected !== undefined && op.expected !== revision)
              throw Error("Synthetic CAS revision conflict");
            const next = structuredClone(state);
            op.change(next);
            validateWorkspace(next);
            state = next;
            revision++;
            commits++;
            op.resolve();
          } catch (error) {
            op.reject(error);
          }
        };
        const h = {
          state: () => state,
          revision: () => revision,
          commit: (_label, change, _resources, expected) =>
            new Promise((resolve, reject) => {
              if (pending) throw Error("Unexpected overlapping fixture write");
              pending = { change, expected, resolve, reject };
              if (!held) flush();
            }),
          error: (error) => failures.push(error.message ?? String(error)),
          notice: () => {},
          refresh,
          detail: () => {},
          closeDetail: () => {},
          readResource: async () => undefined,
          previousState: async () => undefined,
          legacySnapshot: () => undefined,
          focus: () => {},
          process: async (work) => work(new AbortController().signal),
          map,
          records: () => records,
          allowed: () => allowed && !dirty,
          draftAllowed: () => allowed,
          setDirty: (value) => {
            dirty = value;
          },
          editPoint: () => {},
          addPoint: () => {},
          openPlanner: () => {},
          closePlanner: () => {},
          search: () => {},
          popup: () => document.createElement("div"),
          available: () => ({}),
          view: () => state.visibility,
          applyView: async () => {},
          pick: () => {},
          hideBaseMarkers: () => {},
        };
        const reset = (options = {}) => {
          ui?.destroy();
          state = emptyWorkspace();
          state.fieldGuide = emptyFieldGuide();
          const a = [
              {
                kind: "manual",
                id: "a1",
                x: 100,
                y: 100,
                label: "Synthetic A1",
              },
              {
                kind: "manual",
                id: "a2",
                x: 200,
                y: 200,
                label: "Synthetic A2",
              },
            ],
            b = [
              {
                kind: "manual",
                id: "b1",
                x: 300,
                y: 300,
                label: "Synthetic B1",
              },
            ];
          state.fieldGuide.routes = [
            {
              id: "route-a",
              name: "Synthetic A",
              color: "#aabbcc",
              mode: options.road ? "road" : "direct",
              waypoints: options.source ? [recordHandle(source)] : a,
              reached: options.reached ? a.map(waypointToken) : [],
            },
            {
              id: "route-b",
              name: "Synthetic B",
              color: "#aabbcc",
              mode: "direct",
              waypoints: b,
              reached: [],
            },
          ];
          state.fieldGuide.activeRouteId = "route-a";
          revision = 1;
          records = [structuredClone(source)];
          held = false;
          pending = null;
          failures = [];
          commits = 0;
          dirty = false;
          allowed = true;
          ui = createFieldGuideUI(h);
          refresh();
        };
        window.routeFixture = {
          reset,
          hold: () => {
            held = true;
          },
          flush,
          read: () => ({
            state: structuredClone(state),
            revision,
            failures: [...failures],
            commits,
            pending: !!pending,
            center: [map.getCenter().lat, map.getCenter().lng],
          }),
          mutate: (kind, bump = true) => {
            if (kind === "reorder")
              state.fieldGuide.routes[0].waypoints.reverse();
            if (kind === "switch") state.fieldGuide.activeRouteId = "route-b";
            if (kind === "source") records = [];
            if (kind === "new-progress")
              state.fieldGuide.routes[0].reached = ["manual:a2"];
            if (bump) revision++;
          },
          deny: () => {
            allowed = false;
          },
          destroy: () => {
            ui.destroy();
            map.remove();
          },
        };
        reset();
      }, leafletUrl);
      const reset = (options) =>
        page.evaluate((options) => window.routeFixture.reset(options), options);
      const read = () => page.evaluate(() => window.routeFixture.read());
      const expectFailure = async () => {
        await page.waitForFunction(() => {
          const r = window.routeFixture.read();
          return !r.pending && (r.failures.length > 0 || r.commits > 0);
        });
        assert(
          (await read()).failures.length > 0,
          "stale action must refuse, not mutate",
        );
        assert.equal((await read()).commits, 0);
      };
      // Rendered action may not retarget after the selected route/revision changes.
      await page.evaluate(() => window.routeFixture.mutate("switch"));
      await page.locator("#route-next-reached").click();
      await expectFailure();
      assert.deepEqual(
        (await read()).state.fieldGuide.routes.map((r) => r.reached),
        [[], []],
      );
      // Real h.commit boundary holds the actual queued callback until authoritative state changes.
      await reset();
      await page.evaluate(() => window.routeFixture.hold());
      await page.locator("#route-next-reached").click();
      await page.waitForFunction(() => window.routeFixture.read().pending);
      await page.evaluate(() => {
        window.routeFixture.mutate("reorder");
        window.routeFixture.flush();
      });
      await expectFailure();
      // Active route identity and current source resolution must be checked inside the callback even without revision change.
      await reset();
      await page.evaluate(() => window.routeFixture.hold());
      await page.locator("#route-next-reached").click();
      await page.evaluate(() => {
        window.routeFixture.mutate("switch", false);
        window.routeFixture.flush();
      });
      await expectFailure();
      await reset({ source: true });
      await page.evaluate(() => window.routeFixture.hold());
      await page.locator("#route-next-reached").click();
      await page.evaluate(() => {
        window.routeFixture.mutate("source", false);
        window.routeFixture.flush();
      });
      await expectFailure();
      // Rendered row reorder must not apply stale positional indices to newer route order.
      await reset();
      await page.evaluate(() => {
        document.querySelector("#workspace-dialog").show();
        window.routeFixture.mutate("reorder");
      });
      await page
        .locator("#route-waypoints li")
        .first()
        .getByRole("button", { name: "Down", exact: true })
        .click();
      await expectFailure();
      assert.deepEqual(
        (await read()).state.fieldGuide.routes[0].waypoints.map((w) => w.id),
        ["a2", "a1"],
      );
      await page.evaluate(() =>
        document.querySelector("#workspace-dialog").close(),
      );
      // Remove validates selected route again after activation, not merely at the initial click.
      await reset();
      await page.evaluate(() => window.routeFixture.hold());
      await page.locator("#tracker-remove-0").click();
      await page.waitForFunction(() => window.routeFixture.read().pending);
      await page.evaluate(() => {
        window.routeFixture.mutate("switch", false);
        window.routeFixture.flush();
      });
      await expectFailure();
      assert.equal(
        (await read()).state.fieldGuide.routes[0].waypoints.length,
        2,
      );
      // Unavailable road solving alone does not prohibit a resolved manual stop or move the camera.
      await reset({ road: true });
      const center = (await read()).center;
      await page.locator("#route-next-reached").click();
      await page.waitForFunction(
        () => window.routeFixture.read().commits === 1,
      );
      assert.equal((await read()).state.fieldGuide.routes[0].reached.length, 1);
      assert.deepEqual((await read()).center, center);
      // Reset/Undo bind their exact prior route and revision.
      await reset({ reached: true });
      await page.locator("#route-reset-progress").click();
      await page.waitForFunction(
        () => window.routeFixture.read().commits === 1,
      );
      assert.deepEqual((await read()).state.fieldGuide.routes[0].reached, []);
      await page.locator("#route-undo-reset").click();
      await page.waitForFunction(
        () => window.routeFixture.read().commits === 2,
      );
      assert.equal((await read()).state.fieldGuide.routes[0].reached.length, 2);
      await reset({ reached: true });
      await page.locator("#route-reset-progress").click();
      await page.waitForFunction(
        () => window.routeFixture.read().commits === 1,
      );
      await page.evaluate(() => window.routeFixture.mutate("new-progress"));
      await page.locator("#route-undo-reset").click();
      await page.waitForFunction(
        () => window.routeFixture.read().failures.length > 0,
      );
      assert.equal((await read()).commits, 1);
      assert.deepEqual((await read()).state.fieldGuide.routes[0].reached, [
        "manual:a2",
      ]);
      // Retain explicit guards and completion; no modulo progress reset.
      await reset();
      await page.evaluate(() => window.routeFixture.deny());
      await page.locator("#route-next-reached").click();
      await expectFailure();
      await reset({ reached: true });
      assert(await page.locator("#route-next-reached").isDisabled());
      assert.deepEqual(errors, []);
      console.log(
        name +
          " atomic route PASS: render/CAS/active route/source resolution guards, solver independence, exact reset/undo, completion",
      );
      await page.evaluate(() => window.routeFixture.destroy());
    } finally {
      await browser.close();
    }
  }
} finally {
  await server.close();
}
