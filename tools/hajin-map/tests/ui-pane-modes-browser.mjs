// Real modern layout and map owner, synthetic terrain and fresh storage only.
import assert from "node:assert/strict";
import { createServer } from "vite";
import { chromium, firefox, webkit } from "playwright";
import { createServer as netServer } from "node:net";
import { mkdir, writeFile } from "node:fs/promises";
process.env.DMZ_UI_VARIANT = "modern";
const probe = netServer();
await new Promise((r) => probe.listen(0, "127.0.0.1", r));
const port = probe.address().port;
await new Promise((r) => probe.close(r));
const server = await createServer({
  cacheDir: `.local/ui-pane-modes-${process.pid}`,
  server: { host: "127.0.0.1", port, strictPort: true, hmr: false },
  define: { "import.meta.env.VITE_LOCAL_PROVIDER_SNAPSHOTS": '"0"' },
});
await server.listen();
const base = `http://127.0.0.1:${port}`,
  rows = [];
const mode = (p, v) =>
  p.waitForFunction(
    (v) => document.documentElement.dataset.mapPaneMode === v,
    v,
  );
const camera = (p) =>
  p.evaluate(async () => {
    const { viewer } = await import("/src/main.ts");
    const c = viewer.map.getCenter();
    return { lat: c.lat, lng: c.lng, zoom: viewer.map.getZoom() };
  });
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
try {
  for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
    const b = await engine.launch();
    try {
      const c = await b.newContext({ viewport: { width: 1440, height: 1000 } }),
        p = await c.newPage(),
        errors = [];
      p.on("pageerror", (e) => errors.push(e.message));
      await c.route("**/*", (r) =>
        new URL(r.request().url()).origin === base ? r.continue() : r.abort(),
      );
      const png = await p.evaluate(() => {
        const c = document.createElement("canvas");
        c.width = c.height = 128;
        c.getContext("2d").fillRect(0, 0, 128, 128);
        return c.toDataURL().split(",")[1];
      });
      await c.route("**/maps/hajin/v1/background.webp", (r) =>
        r.fulfill({
          contentType: "image/png",
          body: Buffer.from(png, "base64"),
        }),
      );
      await c.route("**/maps/hajin/official/markers.json", (r) =>
        r.fulfill({
          json: {
            schemaVersion: 1,
            sourcePage:
              "https://www.callofduty.com/guides/modernwarfare4/dmz-maps/hajin",
            capturedAt: "2026-11-05T00:00:00Z",
            categories: [],
            markers: [],
          },
        }),
      );
      await p.goto(base);
      await p.waitForSelector(
        'html[data-ui-mounted="071-v1"][data-ui-adapter="map-pane"]',
      );
      await p.locator("#ui-task-view").click();
      await p.locator("#workspace-open").click();
      await p.locator("#point-title").fill("SYNTHETIC original pane draft");
      await p
        .locator("#point-title")
        .evaluate((e) => (window.__originalPaneField = e));
      await p.waitForFunction(() => {
        const image = document.querySelector("#map .leaflet-image-layer");
        return image?.complete && image.naturalWidth > 0;
      });
      await p.evaluate(async () => {
        const { viewer } = await import("/src/main.ts");
        viewer.map.setView([2048, 2048], 1, { animate: false });
      });
      const before = await camera(p),
        record = await stored(p);
      const centered = () =>
        p.waitForFunction(async (center) => {
          const { viewer } = await import("/src/main.ts");
          const map = viewer.map,
            box = map.getContainer();
          const point = map.latLngToContainerPoint([center.lat, center.lng]);
          return (
            box.clientWidth > 0 &&
            box.clientHeight > 0 &&
            Math.abs(point.x - box.clientWidth / 2) <= 1 &&
            Math.abs(point.y - box.clientHeight / 2) <= 1
          );
        }, before);
      await centered();
      const original = async () => {
        assert.equal(
          await p.locator("#point-title").inputValue(),
          "SYNTHETIC original pane draft",
        );
        assert.equal(
          await p
            .locator("#point-title")
            .evaluate((e) => e === window.__originalPaneField),
          true,
        );
        assert.equal(await p.locator("#point-form").count(), 1);
      };
      await p
        .getByRole("button", { name: "Minimize task", exact: true })
        .click();
      await mode(p, "peek");
      await centered();
      assert.equal(
        await p.locator("#ui-map-task-title").textContent(),
        "New private point",
        "Peek names the current task",
      );
      assert.equal(
        await p
          .locator(".ui-map-task-body")
          .evaluate((e) => e.hidden && e.inert),
        true,
      );
      assert.equal(await p.locator("#point-title").isVisible(), false);
      assert.equal(
        await p
          .locator("#ui-task-expand")
          .evaluate((e) => e === document.activeElement),
        true,
      );
      assert.equal(
        await p.locator(".ui-map-task-header button:visible").count(),
        2,
      );
      await original();
      await p.keyboard.press("Enter");
      await mode(p, "full");
      assert.equal(
        await p.locator(".map-workspace").isVisible(),
        false,
        "Explicit full task on desktop",
      );
      assert.equal(
        await p
          .locator(".ui-map-task-body")
          .evaluate((e) => !e.hidden && !e.inert),
        true,
      );
      await original();
      await p.getByRole("button", { name: "Half view", exact: true }).click();
      await mode(p, "half");
      await centered();
      const half = await p.evaluate(() => {
        const task = document
            .querySelector("#ui-map-task")
            .getBoundingClientRect(),
          map = document
            .querySelector(".map-workspace")
            .getBoundingClientRect(),
          head = document
            .querySelector(".ui-map-task-header")
            .getBoundingClientRect();
        return {
          task: task.toJSON(),
          map: map.toJSON(),
          head: head.height,
          font: parseFloat(
            getComputedStyle(document.querySelector(".workspace")).fontSize,
          ),
        };
      });
      assert(half.map.height >= 12 * half.font - 1, JSON.stringify(half));
      assert(
        half.task.height - half.head >= 14 * half.font - 1,
        JSON.stringify(half),
      );
      assert(half.map.bottom <= half.task.top + 1);
      await original();
      // Exercise the exact Half -> Full boundary and the extra visible fallback message.
      await p.setViewportSize({ width: 768, height: 1000 });
      await mode(p, "half");
      const boundary = await p.evaluate(() => ({
        top: document.querySelector(".workspace").getBoundingClientRect().top,
        header: document
          .querySelector(".ui-map-task-header")
          .getBoundingClientRect().height,
        route: document.querySelector("#ui-map-route").getBoundingClientRect()
          .height,
        font: parseFloat(
          getComputedStyle(document.querySelector(".workspace")).fontSize,
        ),
      }));
      await p.setViewportSize({
        width: 768,
        height:
          Math.floor(
            boundary.top +
              boundary.route +
              26 * boundary.font +
              boundary.header,
          ) - 1,
      });
      await mode(p, "full");
      const fallback = await p.evaluate(() => {
        const task = document.querySelector("#ui-map-task"),
          header = document.querySelector(".ui-map-task-header");
        return {
          header: header.getBoundingClientRect().height,
          padding: parseFloat(getComputedStyle(task).scrollPaddingTop),
          flow: getComputedStyle(header).position === "static",
          rootFont: parseFloat(
            getComputedStyle(document.documentElement).fontSize,
          ),
          feedback: !document.querySelector(".ui-map-mode-feedback").hidden,
        };
      });
      assert(
        fallback.feedback && fallback.header > boundary.header,
        JSON.stringify({ boundary, fallback }),
      );
      assert(
        Math.abs(
          fallback.padding -
            (fallback.flow ? 0 : fallback.header) -
            fallback.rootFont * 0.5,
        ) < 0.1,
        "Scroll padding includes the final visible fallback message: " +
          JSON.stringify(fallback),
      );
      // Between the dry and final header budgets, only the message makes sticky unsafe.
      await p.setViewportSize({
        width: 768,
        height: Math.floor(
          boundary.top +
            boundary.route +
            14 * boundary.font +
            (boundary.header + fallback.header) / 2,
        ),
      });
      await mode(p, "full");
      await p.waitForFunction(
        () =>
          document.querySelector("#ui-map-task").dataset.uiHeaderFlow ===
          "true",
      );
      await p.locator("#point-icon").focus();
      await p.keyboard.press("Tab");
      assert.equal(
        await p
          .locator("#point-owned")
          .evaluate((e) => e === document.activeElement),
        true,
        "Native Tab reaches the last visible owner field",
      );
      const hit = await p.locator("#point-owned").evaluate((e) => {
        const r = e.getBoundingClientRect();
        const hit = document.elementFromPoint(
          r.x + r.width / 2,
          r.y + r.height / 2,
        );
        return { ok: hit === e || e.contains(hit), rect: r.toJSON() };
      });
      assert(
        hit.ok,
        "Last field stays reachable past fallback header: " +
          JSON.stringify(hit),
      );
      await original();

      await p.locator("#point-title").focus();
      await p.setViewportSize({ width: 320, height: 400 });
      await mode(p, "full");
      assert.equal(
        await p
          .locator("#point-title")
          .evaluate((e) => e === document.activeElement),
        true,
        "Short fallback keeps focused editor",
      );
      await original();
      await p.getByRole("button", { name: "Close task", exact: true }).click();
      await mode(p, "closed");
      await centered();
      assert.equal(await p.locator("#ui-map-task").isVisible(), false);
      assert.equal(
        await p
          .locator("#ui-task-view")
          .evaluate((e) => e === document.activeElement),
        true,
      );
      await p.locator("#map").focus();
      await p.locator("#ui-task-view").click();
      await mode(p, "full");
      assert.equal(
        await p.evaluate(() => document.activeElement?.closest("[hidden]")),
        null,
        "Restore never leaves focus in hidden terrain",
      );
      await original();
      await p.evaluate(
        () => (document.documentElement.style.fontSize = "200%"),
      );
      await p.setViewportSize({ width: 320, height: 400 });
      await p
        .getByRole("button", { name: "Minimize task", exact: true })
        .click();
      await mode(p, "full");
      assert.equal(
        await p.locator(".ui-map-mode-feedback").isVisible(),
        true,
        "Peek refuses an unreadable short map",
      );
      assert.equal(
        await p.evaluate(() => document.activeElement?.closest("[hidden]")),
        null,
        "No-fit Peek moves focus before hiding Expand",
      );
      await p.setViewportSize({ width: 390, height: 844 });
      await original();
      for (const button of await p
        .locator(".ui-map-task-header button:visible")
        .all()) {
        const box = await button.boundingBox();
        assert(box.width >= 44 && box.height >= 44, JSON.stringify(box));
      }
      assert.equal(
        await p.evaluate(
          () =>
            document.documentElement.scrollWidth <=
            document.documentElement.clientWidth + 1,
        ),
        true,
      );
      await p.evaluate(() => (document.documentElement.style.fontSize = ""));
      await p.setViewportSize({ width: 1440, height: 1000 });
      await p.locator("#ui-map-view").click();
      await mode(p, "closed");
      await p.locator("#ui-task-view").click();
      await original();
      await p.waitForTimeout(150);
      assert.deepEqual(await camera(p), before, "Modes never change camera");
      assert.equal(await stored(p), record, "Modes never save draft/domain");
      // A real global guard remains usable above Peek's intentionally inert body.
      await p
        .getByRole("button", { name: "Minimize task", exact: true })
        .click();
      await mode(p, "peek");
      await p.locator(".field-toolbar details > summary").click();
      await p
        .locator(".field-toolbar")
        .getByRole("button", { name: "Backups", exact: true })
        .click();
      const guard = p.locator("#ui-pane-departure-guard");
      await guard.waitFor({ state: "visible" });
      assert.equal(
        await guard.evaluate((e) => e.matches(":modal")),
        true,
        "Departure uses the real top layer",
      );
      const stay = guard.getByRole("button", { name: "Stay", exact: true });
      await stay.focus();
      const guardHit = await stay.evaluate((e) => {
        const r = e.getBoundingClientRect();
        return (
          document.activeElement === e &&
          document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2) === e
        );
      });
      assert(guardHit, "Guard focus and real pointer target remain above Peek");
      await stay.click();
      await original();
      // Restoring to the task is an explicit owner action; inspect the same draft via Icons.
      await p
        .getByRole("button", { name: "Minimize task", exact: true })
        .click();
      await mode(p, "peek");
      await p.getByRole("button", { name: "Expand task", exact: true }).click();
      await mode(p, "full");
      await p.locator("#workspace-tab-icons").click();
      await guard.waitFor({ state: "visible" });
      assert.equal(await guard.evaluate((e) => e.matches(":modal")), true);
      await guard.getByRole("button", { name: "Stay", exact: true }).click();
      await original();
      assert.equal(
        await stored(p),
        record,
        "Both Stay paths preserve domain state",
      );
      await p.locator("#ui-map-view").click();
      await mode(p, "closed");
      await centered();
      assert.deepEqual(
        await camera(p),
        before,
        "Guard workflows preserve exact camera",
      );
      assert.deepEqual(errors, []);
      rows.push({
        engine: name,
        peek: true,
        boundary,
        fallback,
        guardStay: true,
        half,
        fullDesktop: true,
        shortFallback: true,
        originalNode: true,
        cameraUnchanged: true,
        domainUnchanged: true,
      });
      console.log(
        name +
          " named Peek/Half/Full/Closed original-node/focus/camera/domain PASS",
      );
      await c.close();
    } finally {
      await b.close();
    }
  }
  await mkdir(".local", { recursive: true });
  await writeFile(".local/071-pane-modes.json", JSON.stringify(rows, null, 2));
} finally {
  await server.close();
}
