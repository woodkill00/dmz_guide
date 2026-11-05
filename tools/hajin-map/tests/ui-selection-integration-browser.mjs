// Real modern app/controllers, synthetic public markers and fresh private storage only.
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { createServer as netServer } from "node:net";
import { createServer } from "vite";
import { chromium, firefox, webkit } from "playwright";
process.env.DMZ_UI_VARIANT = "modern";
const root =
  process.env.DMZ_TEST_APP_ROOT ||
  fileURLToPath(new URL("../", import.meta.url));
const probe = netServer();
await new Promise((resolve) => probe.listen(0, "127.0.0.1", resolve));
const port = probe.address().port;
await new Promise((resolve) => probe.close(resolve));
const server = await createServer({
  root,
  cacheDir: root + `/.local/ui-selection-integration-${process.pid}-${port}`,
  server: { host: "127.0.0.1", port, strictPort: true, hmr: false },
  define: { "import.meta.env.VITE_LOCAL_PROVIDER_SNAPSHOTS": '"0"' },
});
await server.listen();
const base = `http://127.0.0.1:${port}`;
const names = [
  "SYNTHETIC station <img src=x onerror=window.__sourceInjected=1>",
  "SYNTHETIC second station",
];
const snapshot = {
  schemaVersion: 1,
  sourcePage: "https://www.callofduty.com/guides/modernwarfare4/dmz-maps/hajin",
  capturedAt: "2026-11-05T00:00:00Z",
  categories: [
    {
      id: "dmz_gasStation",
      name: "Synthetic stations",
      group: "Facilities",
      icon: "/maps/hajin/official/icons/synthetic.png",
    },
  ],
  records: names.map((name, i) => ({
    id: "selection-" + i,
    name,
    category: "dmz_gasStation",
    mapId: "hajin",
    coordinateSpaceVersion: "hajin-official-v1-4096",
    x: 0.5 + i * 0.08,
    y: 0.5,
    notes: "Synthetic source details remain unverified. ".repeat(80),
  })),
};
async function fresh(browser) {
  const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    }),
    page = await context.newPage(),
    errors = [],
    external = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const image = Buffer.from(
    await page.evaluate(() => {
      const c = document.createElement("canvas");
      c.width = c.height = 128;
      c.getContext("2d").fillRect(0, 0, 128, 128);
      return c.toDataURL().split(",")[1];
    }),
    "base64",
  );
  await context.route("**/*", (r) => {
    const u = new URL(r.request().url());
    if (u.origin !== base) {
      external.push(u.href);
      return r.abort();
    }
    if (u.pathname.endsWith("/official/markers.json"))
      return r.fulfill({ json: snapshot });
    if (u.pathname.startsWith("/maps/"))
      return r.fulfill({ body: image, contentType: "image/png" });
    return r.continue();
  });
  await page.goto(base + "/?tool=map");
  await page
    .locator('html[data-ui-mounted="071-v1"][data-ui-adapter="map-pane"]')
    .waitFor();
  await page.locator('[data-official-id="selection-0"]').waitFor();
  await page.locator("#workspace-open:enabled").waitFor();
  return {
    context,
    page,
    verify: () => {
      assert.deepEqual(errors, []);
      assert.deepEqual(external, []);
    },
  };
}
const read = (page) =>
  page.evaluate(async () => {
    const { openWorkspace } = await import("/src/workspace/store.ts");
    const db = await openWorkspace();
    try {
      return (await db.read()).current;
    } finally {
      db.close();
    }
  });
async function stored(page, predicate) {
  let record;
  for (let i = 0; i < 50; i++) {
    record = await read(page);
    if (predicate(record)) return record;
    await page.waitForTimeout(50);
  }
  assert.fail(
    "Stored state never matched: " +
      JSON.stringify({
        record,
        message: await page.locator("#workspace-message").textContent(),
      }),
  );
}
const camera = (page) =>
  page.evaluate(async () => {
    const { viewer } = await import("/src/main.ts");
    return { center: viewer.map.getCenter(), zoom: viewer.map.getZoom() };
  });
async function remember(page, id) {
  await page.evaluate(async (id) => {
    const { viewer } = await import("/src/main.ts");
    viewer.map.eachLayer((layer) => {
      if (layer.getElement?.()?.dataset.officialId === id) {
        window.__sourceNode = layer.getPopup().getContent();
        window.__sourceCopy = [
          ...window.__sourceNode.querySelectorAll("button"),
        ].find((button) => button.textContent === "Copy coordinates");
        window.__sourceCopy.addEventListener(
          "click",
          () => (window.__sourceClicks = (window.__sourceClicks ?? 0) + 1),
        );
      }
    });
  }, id);
}
async function clickMarker(page, id) {
  const marker = page.locator(`[data-official-id="${id}"]`);
  await marker.focus();
  await marker.click();
}
try {
  for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
    const browser = await engine.launch();
    try {
      const t = await fresh(browser),
        { page } = t;
      try {
        const before = await camera(page);
        await remember(page, "selection-0");
        await clickMarker(page, "selection-0");
        await page.locator("#ui-selection-detail").waitFor();
        assert.equal(
          await page.evaluate(
            () =>
              document.querySelector(
                "#ui-selection-detail .map-marker-popup",
              ) === window.__sourceNode,
          ),
          true,
        );
        assert.equal(await page.locator("#ui-selection-detail img").count(), 0);
        assert.equal(
          await page.evaluate(() => window.__sourceInjected),
          undefined,
        );
        assert.equal(
          await page.locator(".map-selection-inspector:visible").count(),
          0,
        );
        assert.equal(
          await page
            .locator("#ui-selection-detail .marker-popup-actions")
            .count(),
          1,
        );
        assert.equal(
          await page
            .locator(".ui-map-selection-source")
            .evaluate((n) => getComputedStyle(n).visibility),
          "hidden",
        );
        await page
          .locator("#ui-selection-detail")
          .getByRole("button", { name: "Copy coordinates", exact: true })
          .click();
        assert.equal(await page.evaluate(() => window.__sourceClicks), 1);
        assert.equal(
          await page.evaluate(
            () =>
              document.querySelector(
                "#ui-selection-detail .marker-popup-actions button",
              ) === window.__sourceCopy ||
              document
                .querySelector("#ui-selection-detail")
                .contains(window.__sourceCopy),
          ),
          true,
        );
        assert.equal(
          await page
            .locator("#ui-map-task")
            .evaluate((n) => n.scrollHeight > n.clientHeight),
          true,
        );
        await page
          .locator("#ui-map-task")
          .evaluate((n) => (n.scrollTop = n.scrollHeight));
        assert.ok(
          (await page.locator("#ui-map-task").evaluate((n) => n.scrollTop)) > 0,
        );
        assert.deepEqual(await camera(page), before);
        await page.locator("#ui-selection-back").click();
        await page.waitForFunction(
          () =>
            document.activeElement?.getAttribute("data-official-id") ===
            "selection-0",
        );
        assert.equal(await page.locator("#ui-selection-detail").count(), 0);
        assert.deepEqual(await camera(page), before);
        await clickMarker(page, "selection-0");
        await page
          .locator("#ui-selection-detail")
          .getByRole("button", { name: "Add waypoint", exact: true })
          .click();
        const route = await stored(
          page,
          (record) =>
            record?.data.fieldGuide?.routes?.[0]?.waypoints.length === 1,
        );
        assert.equal(route.data.fieldGuide.routes.length, 1);
        assert.equal(route.data.annotations.length, 0);
        assert.equal(
          route.data.fieldGuide.routes[0].waypoints[0].kind,
          "record",
        );
        await page.locator("#ui-selection-back").click();
        // Its new route stop intentionally owns pointer hit testing at this
        // coordinate; native keyboard activation still reaches the source marker.
        await page.locator('[data-official-id="selection-0"]').focus();
        await page.keyboard.press("Enter");
        await page
          .locator("#ui-selection-detail")
          .getByRole("button", { name: "Add waypoint", exact: true })
          .click();
        await page.waitForTimeout(100);
        const duplicate = await read(page);
        assert.equal(duplicate.data.fieldGuide.routes[0].waypoints.length, 1);
        assert.equal(duplicate.revision, route.revision);
        await page.locator("#ui-selection-back").click();
        await page.locator("#workspace-tab-planner").click();
        await page.locator("#planner-route-select").waitFor();
        const stop = page.locator('[data-route-waypoint="0"]');
        if (!(await stop.isVisible()))
          await page.locator("#ui-map-view").click();
        await stop.focus();
        await stop.click();
        await page.locator("#ui-selection-detail").waitFor();
        assert.match(
          await page
            .locator("#ui-selection-detail .marker-popup-title")
            .textContent(),
          /^Waypoint 1:/,
        );
        await page
          .locator("#ui-selection-detail")
          .getByRole("button", { name: "Mark reached", exact: true })
          .click();
        const reached = await stored(
          page,
          (r) => r?.data.fieldGuide?.routes?.[0]?.reached?.length === 1,
        );
        assert.equal(reached.data.fieldGuide.routes[0].waypoints.length, 1);
        assert.equal(reached.data.fieldGuide.routes.length, 1);
        assert.equal(reached.revision, route.revision + 1);
        await page.waitForFunction(
          () =>
            document
              .querySelector("#workspace-content")
              ?.getAttribute("aria-busy") === "false",
        );
        const settledSelection = (await page
          .locator("#ui-selection-detail")
          .count())
          ? await page.locator("#ui-selection-detail").textContent()
          : "";
        assert.equal(
          settledSelection.includes("Pending on this route"),
          false,
          "confirmed reached action cannot leave a stale Pending selection",
        );
        t.verify();
      } finally {
        await t.context.close();
      }
      const dirty = await fresh(browser),
        p = dirty.page;
      try {
        await p.locator("#workspace-open").click();
        await p
          .locator("#point-title")
          .fill("SYNTHETIC saved through marker guard");
        await p.locator("#point-owned").check();
        await p
          .locator("#point-title")
          .evaluate((n) => (window.__pointDraft = n));
        await clickMarker(p, "selection-0");
        const guard = p.locator("#ui-pane-departure-guard");
        await guard.waitFor({ state: "visible" });
        assert.equal(await p.locator("#ui-selection-detail").count(), 0);
        assert.equal(await p.locator(".ui-map-selection-pending").count(), 1);
        assert.equal(
          await p
            .locator(".ui-map-selection-pending .map-marker-popup")
            .isVisible(),
          false,
          "pending source never floats over the map/editor",
        );
        await guard.getByRole("button", { name: "Stay", exact: true }).click();
        assert.equal(
          await p.locator(".ui-map-selection-pending").count(),
          0,
          "Stay releases only its pending source chrome",
        );
        assert.equal(
          await p.evaluate(
            () =>
              document.querySelector("#point-title") === window.__pointDraft,
          ),
          true,
        );
        assert.equal(
          await p.locator("#point-title").inputValue(),
          "SYNTHETIC saved through marker guard",
        );
        await clickMarker(p, "selection-1");
        await guard.waitFor({ state: "visible" });
        await p.locator("#workspace-tab-icons").evaluate((n) => n.click());
        await guard
          .getByRole("button", { name: "Save and continue", exact: true })
          .click();
        await p.locator("#ui-selection-detail").waitFor();
        assert.equal(await p.locator("#icon-studio").count(), 0);
        assert.equal(
          await p
            .locator("#ui-selection-detail .marker-popup-title")
            .textContent(),
          names[1],
        );
        const saved = await stored(p, (r) => r?.data.annotations.length === 1);
        assert.equal(
          saved.data.annotations[0].title,
          "SYNTHETIC saved through marker guard",
        );
        await p.locator("#ui-selection-back").click();
        await p.locator("#workspace-open").click();
        await p
          .locator("#point-title")
          .fill("SYNTHETIC discarded through marker guard");
        await clickMarker(p, "selection-0");
        await guard.waitFor({ state: "visible" });
        await guard
          .getByRole("button", { name: "Discard and continue", exact: true })
          .click();
        await p.locator("#ui-selection-detail").waitFor();
        assert.equal(
          await p
            .locator("#ui-selection-detail .marker-popup-title")
            .textContent(),
          names[0],
        );
        const after = await read(p);
        assert.equal(after.revision, saved.revision);
        assert.equal(after.data.annotations.length, 1);
        dirty.verify();
      } catch (error) {
        console.error(
          "Synthetic selection guard diagnostic",
          await p.evaluate(async () => {
            const { viewer } = await import("/src/main.ts");
            const popups = [];
            viewer.map.eachLayer((layer) => {
              const popup = layer.getPopup?.();
              if (popup)
                popups.push({
                  title: layer.getElement?.()?.dataset.officialId,
                  open: viewer.map.hasLayer(popup),
                  content: typeof popup.getContent(),
                  parent: popup.getContent()?.parentElement?.className,
                });
            });
            return {
              guard: document.querySelector("#ui-pane-departure-status")
                ?.textContent,
              guardOpen: document.querySelector("#ui-pane-departure-guard")
                ?.open,
              issue: document.querySelector("#workspace-message")?.textContent,
              title: document.querySelector("#point-title")?.value,
              selection: document.querySelector("#ui-selection-detail")
                ?.textContent,
              popups,
            };
          }),
        );
        throw error;
      } finally {
        await dirty.context.close();
      }
      console.log(
        `${name} full modern selection source/actions/camera/dirty-guard/route invariants PASS`,
      );
    } finally {
      await browser.close();
    }
  }
} finally {
  await server.close();
}
