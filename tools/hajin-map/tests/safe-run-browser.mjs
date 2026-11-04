// Synthetic source fixtures only; provider websites and private workspaces are never read.
import { createServer } from "vite";
import { chromium, firefox, webkit } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { gridGeometry } from "../src/map/tactical-grid.ts";
const server = await createServer({
  server: { host: "127.0.0.1", port: 5279, strictPort: true, hmr: false },
});
await server.listen();
await mkdir(".local", { recursive: true });
const origin = "http://127.0.0.1:5279",
  key = "hajin-safe-run-v1";
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
  "base64",
);
const marker = (id, name, category, x, y) => ({
  id,
  name,
  category,
  mapId: "hajin",
  coordinateSpaceVersion: "hajin-official-v1-4096",
  x: x / 4096,
  y: y / 4096,
  notes: "Synthetic test data, not a game location.",
});
const fixture = {
  schemaVersion: 1,
  sourcePage: "https://www.callofduty.com/guides/modernwarfare4/dmz-maps/hajin",
  capturedAt: "2026-11-04T00:00:00Z",
  categories: [
    {
      id: "safe",
      name: "Safes",
      group: "Synthetic loot",
      icon: "/maps/hajin/official/icons/safe.png",
    },
    {
      id: "spawn",
      name: "Spawn Point",
      group: "Synthetic starts",
      icon: "/maps/hajin/official/icons/spawn.png",
    },
  ],
  records: [
    marker("a", "Synthetic Alpha", "safe", 300, 100),
    marker("b", "Synthetic Bravo", "safe", 800, 100),
    marker("c", "Synthetic Charlie", "safe", 500, 100),
    marker("d", "Synthetic Delta", "safe", 3000, 3000),
    marker("start", "Synthetic Spawn", "spawn", 100, 100),
  ],
};
const graph = {
  kind: "dmz-road-network",
  version: 1,
  mapId: "hajin",
  coordinateSpaceVersion: "hajin-official-v1-4096",
  name: "Synthetic partial roads",
  attribution: "Synthetic test only",
  verification: "unverified",
  nodes: [
    { id: "a", x: 100, y: 100 },
    { id: "b", x: 800, y: 100 },
  ],
  edges: [
    {
      id: "ab",
      from: "a",
      to: "b",
      direction: "both",
      blocked: false,
      points: [
        [100, 100],
        [800, 100],
      ],
    },
  ],
};
fixture.records[0].notes = "Synthetic test data. Needs an access key.";
fixture.records[1].notes = "Synthetic test data. No key needed.";
fixture.records[2].notes =
  "Synthetic test data. Bank vault: solve the puzzle to open it.";
try {
  for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
    const browser = await engine.launch();
    try {
      const context = await browser.newContext({
          viewport: { width: 1440, height: 1000 },
        }),
        page = await context.newPage(),
        errors = [],
        remote = [];
      let fail = false,
        missingRoads = false;
      let currentFixture = structuredClone(fixture),
        pointerMode = "missing",
        holdRoads = false,
        releaseRoads = null;
      const failedRequests = [];
      let phase = "initial";
      page.on("requestfailed", (r) => {
        if (failedRequests.length < 128)
          failedRequests.push({ url: r.url(), error: r.failure()?.errorText });
      });
      page.on("pageerror", (e) =>
        errors.push({
          message: e.message,
          stack: e.stack,
          url: page.url(),
          phase,
        }),
      );
      await context.addInitScript(() => {
        window.__holdWorker = false;
        window.__holdReady = false;
        window.__queuedReady = [];
        window.__postedSolves = [];
        window.__terminatedWorkers = 0;
        window.__queuedWorkers = [];
        window.__workerCount = 0;
        window.__writes = 0;
        const NativeWorker = window.Worker;
        window.Worker = class extends NativeWorker {
          constructor(...args) {
            super(...args);
            window.__workerCount++;
          }
          set onmessage(fn) {
            this.__safeBootstrapHandler = fn;
            super.onmessage = (event) => {
              if (event.data?.ready && window.__holdReady) {
                window.__queuedReady.push(() =>
                  this.__safeBootstrapHandler(event),
                );
                return;
              }
              if (window.__holdWorker && !event.data?.ready)
                window.__queuedWorkers.push(() => fn(event));
              else fn(event);
            };
          }
          postMessage(data, ...args) {
            window.__postedSolves.push(data.stops?.map((stop) => stop.key));
            return super.postMessage(data, ...args);
          }
          terminate() {
            window.__terminatedWorkers++;
            return super.terminate();
          }
        };
        const set = Storage.prototype.setItem;
        Storage.prototype.setItem = function (...args) {
          window.__writes++;
          return set.apply(this, args);
        };
        window.__idb = 0;
        const open = indexedDB.open.bind(indexedDB);
        indexedDB.open = (...args) => {
          window.__idb++;
          return open(...args);
        };
        if (!localStorage.getItem("main-map-sentinel"))
          localStorage.setItem("main-map-sentinel", "unchanged");
        localStorage.setItem("hajin-coordinate-grid-v1", "0");
      });
      await context.route("**/maps/hajin/**", async (r) => {
        const path = new URL(r.request().url()).pathname;
        if (
          path.endsWith("/current-captures.local.json") &&
          pointerMode !== "missing"
        )
          return r.fulfill({
            json: {
              version: 1,
              canonicalDigest:
                "377393bf8bb36140ee97702e2ce3950acc7f62841f9bf66f9a9adc8a9f740acb",
              sources:
                pointerMode === "empty"
                  ? []
                  : [
                      {
                        id: "official",
                        snapshot: "/maps/hajin/official/markers.json",
                        iconDirectory: "/maps/hajin/official/icons/",
                        snapshotDigest: "0".repeat(64),
                      },
                    ],
            },
          });
        if (
          path.endsWith("/current-captures.local.json") ||
          path.endsWith("/providers.local.json")
        )
          return r.fulfill({ status: 404, body: "missing" });
        if (path.endsWith("/background.webp"))
          return r.fulfill({ body: png, contentType: "image/png" });
        if (path.endsWith("/official/markers.json"))
          return r.fulfill(
            fail ? { status: 500, body: "failure" } : { json: currentFixture },
          );
        if (path.endsWith("/roads.local.json")) {
          if (holdRoads)
            await new Promise((resolve) => {
              releaseRoads = resolve;
            });
          return r.fulfill(
            missingRoads ? { status: 404, body: "missing" } : { json: graph },
          );
        }
        return r.fulfill({ status: 404, body: "Unexpected fixture request" });
      });
      context.on("request", (r) => {
        if (
          !r.url().startsWith(origin) &&
          !r.url().startsWith("data:") &&
          !r.url().startsWith("blob:")
        )
          remote.push(r.url());
      });
      await page.goto(origin + "/safes.html");
      await page.waitForFunction(() =>
        document
          .querySelector("#data-status")
          .textContent.includes("4 positioned"),
      );
      await page.locator("#spawn-select").selectOption("official:start");
      assert.equal(
        await page.locator("#safe-grid").isChecked(),
        true,
        "safe page grid is independent of hidden main-map grid",
      );
      const line = await page
        .locator(".hajin-coordinate-grid line")
        .first()
        .evaluate((node) => ({
          stroke: getComputedStyle(node).stroke,
          width: getComputedStyle(node).strokeWidth,
        }));
      assert.notEqual(line.stroke, "none");
      assert.equal(line.width, "1px");
      await page.locator("#safe-grid").uncheck();
      await page.locator("#safe-grid").check();
      assert.equal(
        await page.evaluate(() =>
          localStorage.getItem("hajin-coordinate-grid-v1"),
        ),
        "0",
        "safe grid must not mutate main-map preference",
      );
      const solved = () =>
        page.waitForFunction(() =>
          document
            .querySelector("#route-status")
            .textContent.includes("stops ·"),
        );
      await solved();
      const order = () =>
        page
          .locator("#visit-order li")
          .evaluateAll((rows) => rows.map((r) => r.dataset.stop));
      assert.deepEqual(await order(), [
        "official:a",
        "official:c",
        "official:b",
        "official:d",
      ]);
      assert.equal(
        await page.locator(".safe-number-marker.safe-locked").count(),
        2,
        "explicit key and puzzle gates are red",
      );
      assert.equal(
        await page.locator(".safe-lock-cue").count(),
        2,
        "non-color access cue",
      );
      assert.match(
        await page
          .locator('.safe-choice:has([data-safe="official:a"])')
          .innerText(),
        /Key required/,
      );
      assert.match(
        await page
          .locator('.safe-choice:has([data-safe="official:c"])')
          .innerText(),
        /Puzzle-gated vault/,
      );
      assert.equal(
        await page
          .locator('.safe-choice:has([data-safe="official:b"]) [data-access]')
          .count(),
        0,
        "no-key report not labelled required",
      );
      await page
        .locator('.safe-number-marker[title^="Synthetic Alpha"]')
        .click();
      assert.match(
        await page.locator(".leaflet-popup").innerText(),
        /Required key identity has not been established/,
      );
      await page.locator(".leaflet-popup-close-button").click();
      phase = "bootstrap-coalescing";
      // Simulate a slow module bootstrap: A→B edits must share one pending
      // worker, post no stale A job and solve only B when ready is delivered.
      await page.locator("#select-none").click();
      const bootBefore = await page.evaluate(() => {
        window.__holdReady = true;
        window.__queuedReady = [];
        return {
          workers: window.__workerCount,
          posts: window.__postedSolves.length,
        };
      });
      await page.locator("#select-all").click();
      await page.waitForFunction(() => window.__queuedReady.length === 1);
      await page.locator('[data-safe="official:c"]').uncheck();
      assert.equal(
        await page.evaluate(() => window.__workerCount),
        bootBefore.workers + 1,
        "coalesce pending imports into one worker",
      );
      assert.equal(
        await page.evaluate(() => window.__postedSolves.length),
        bootBefore.posts,
        "do not post before ready",
      );
      await page.evaluate(() => {
        window.__holdReady = false;
        window.__queuedReady.splice(0).forEach((fn) => fn());
      });
      await solved();
      assert.deepEqual(
        await page.evaluate(
          (i) => window.__postedSolves.slice(i),
          bootBefore.posts,
        ),
        [["official:a", "official:b", "official:d"]],
        "post only latest B selection",
      );
      assert.deepEqual(await order(), [
        "official:a",
        "official:b",
        "official:d",
      ]);
      await page.locator("#select-all").click();
      await solved();
      assert.deepEqual(await order(), [
        "official:a",
        "official:c",
        "official:b",
        "official:d",
      ]);
      phase = "bootstrap-timeout-retry";
      // A never-ready startup must release at its own deadline, ignore a
      // late ready notification, and permit a successful Optimize retry.
      const startOrder = await order(),
        startup = await page.evaluate(() => {
          window.__holdReady = true;
          window.__queuedReady = [];
          return {
            workers: window.__workerCount,
            terminated: window.__terminatedWorkers,
            posts: window.__postedSolves.length,
          };
        });
      await page.locator("#optimize").click();
      await page.waitForFunction(() => window.__queuedReady.length === 1);
      await page.waitForFunction(
        () =>
          document
            .querySelector("#route-status")
            .textContent.includes("could not start within 10 seconds"),
        {},
        { timeout: 15000 },
      );
      assert.deepEqual(await order(), startOrder);
      assert.equal(
        await page.evaluate(() => window.__terminatedWorkers),
        startup.terminated + 1,
      );
      await page.evaluate(() => {
        window.__holdReady = false;
        window.__queuedReady.splice(0).forEach((fn) => fn());
      });
      assert.equal(
        await page.evaluate(() => window.__postedSolves.length),
        startup.posts,
      );
      assert.match(
        await page.locator("#route-status").innerText(),
        /could not start/,
      );
      await page.locator("#optimize").click();
      await solved();
      assert.equal(
        await page.evaluate(() => window.__workerCount),
        startup.workers + 2,
      );
      assert.deepEqual(await order(), startOrder);
      assert.equal(
        await page.locator(".safe-number-marker:not(.safe-excluded)").count(),
        4,
      );
      await page.locator('[data-safe="official:c"]').uncheck();
      await solved();
      const excluded = page.locator(".safe-locked.safe-excluded");
      assert.equal(
        await excluded.count(),
        1,
        "excluded restricted safe retains red access cue",
      );
      const colors = await excluded.evaluate((n) => ({
        fill: getComputedStyle(n).backgroundColor,
        border: getComputedStyle(n).borderColor,
      }));
      assert.equal(colors.fill, "rgb(65, 78, 66)");
      assert.equal(colors.border, "rgb(255, 152, 163)");
      assert.equal((await order()).includes("official:c"), false);
      await page.locator("#safe-search").fill("Delta");
      assert.equal(await page.locator("#safe-list input").count(), 1);
      assert.equal((await order()).length, 3);
      await page.locator("#safe-search").fill("");
      await page
        .locator("#visit-order li")
        .nth(1)
        .getByRole("button", { name: /Move .* up/ })
        .click();
      await solved();
      assert.deepEqual((await order()).slice(0, 2), [
        "official:b",
        "official:a",
      ]);
      // HTML drag-and-drop has keyboard equivalents tested above.
      await page
        .locator("#visit-order li")
        .last()
        .dragTo(page.locator("#visit-order li").first());
      await solved();
      assert.equal((await order())[0], "official:d");
      await page.reload();
      await solved();
      assert.equal((await order())[0], "official:d");
      assert.equal(
        await page.locator('[data-safe="official:c"]').isChecked(),
        false,
      );
      const manualOrder = await order();
      await page.locator("#start-x").fill("900");
      await page.locator("#start-y").fill("100");
      await page
        .getByRole("button", { name: "Set manual start", exact: true })
        .click();
      await solved();
      assert.deepEqual(
        await order(),
        manualOrder,
        "manual order survives start change",
      );
      await page.locator("#spawn-select").selectOption("official:start");
      await solved();
      assert.deepEqual(
        await order(),
        manualOrder,
        "manual order survives spawn change",
      );
      await page.locator("#select-all").click();
      await solved();
      assert.deepEqual(
        await order(),
        [...manualOrder, "official:c"],
        "select all preserves existing manual order",
      );
      await page.locator('[data-safe="official:c"]').uncheck();
      await solved();
      await page.locator("#optimize").click();
      await solved();
      assert.equal((await order())[0], "official:a");
      await page.locator("#route-mode").selectOption("roads");
      await solved();
      assert.match(
        await page.locator("#route-status").innerText(),
        /Missing leg/,
      );
      await page.locator("#route-mode").selectOption("direct");
      await solved();
      assert.match(
        await page.locator("#route-status").innerText(),
        /Direct lines, not roads/,
      );
      await page.locator("#start-x").fill("200");
      await page.locator("#start-y").fill("200");
      await page
        .getByRole("button", { name: "Set manual start", exact: true })
        .click();
      await solved();
      assert.match(
        await page.locator("#start-label").innerText(),
        /Manual start.*X 200/,
      );
      await page
        .locator("#safe-map")
        .click({ position: { x: 300, y: 300 }, button: "right" });
      await solved();
      assert.match(
        await page.locator("#start-label").innerText(),
        /Manual start/,
      );
      await page.locator("#pick-start").click();
      await page.locator("#safe-map").click({ position: { x: 350, y: 350 } });
      await solved();
      assert.equal(
        await page.locator("#pick-start").getAttribute("aria-pressed"),
        "false",
      );
      // Rapid changes must not allow an obsolete worker to repaint removed stops.
      await page.locator("#select-none").click();
      await page.locator("#select-all").click();
      await page.locator("#select-none").click();
      await page.waitForTimeout(250);
      assert.equal(await page.locator("#visit-order li").count(), 0);
      assert.match(
        await page.locator("#route-status").innerText(),
        /No safes selected/,
      );
      await page.locator("#select-all").click();
      await solved();
      const before = await order();
      fail = true;
      await page.locator("#reload-data").click();
      await page.waitForFunction(() =>
        document
          .querySelector("#data-status")
          .textContent.includes("Previous valid"),
      );
      assert.deepEqual(await order(), before);
      fail = false;
      phase = "capture-races";
      // Deliver a deliberately queued obsolete worker reply after a NEW dataset
      // commits, while the new road read is held. Termination alone is not enough.
      await page.evaluate(() => {
        window.__holdWorker = true;
      });
      await page.locator("#optimize").click();
      await page.waitForFunction(() => window.__queuedWorkers.length === 1);
      currentFixture = structuredClone(fixture);
      currentFixture.records.find((r) => r.id === "d").id = "e";
      holdRoads = true;
      await page.locator("#reload-data").click();
      await page.waitForFunction(
        () => !!document.querySelector('[data-safe="official:e"]'),
      );
      await page.evaluate(() => {
        window.__holdWorker = false;
        window.__queuedWorkers.splice(0).forEach((fn) => fn());
      });
      assert.equal((await order()).includes("official:d"), false);
      assert.equal((await order()).includes("official:e"), true);
      assert.match(
        await page.locator("#route-status").innerText(),
        /Refreshing run/,
      );
      holdRoads = false;
      releaseRoads();
      await solved();
      const deadlineOrder = await order();
      await page.evaluate(() => {
        window.__holdWorker = true;
      });
      await page.locator("#optimize").click();
      await page.waitForFunction(
        () =>
          document
            .querySelector("#route-status")
            .textContent.includes("exceeded 10 seconds"),
        {},
        { timeout: 12000 },
      );
      assert.deepEqual(
        await order(),
        deadlineOrder,
        "deadline retains existing order",
      );
      await page.evaluate(() => {
        window.__holdWorker = false;
        window.__queuedWorkers.splice(0).forEach((fn) => fn());
      });
      assert.match(
        await page.locator("#route-status").innerText(),
        /exceeded 10 seconds/,
        "late timed-out reply ignored",
      );
      // Pending reads must not mutate preferences or create workers after pagehide.
      holdRoads = true;
      releaseRoads = null;
      await page.locator("#reload-data").click();
      await page.waitForFunction(() =>
        document
          .querySelector("#route-status")
          .textContent.includes("Refreshing run"),
      );
      for (let poll = 0; !releaseRoads && poll < 100; poll++)
        await new Promise((resolve) => setTimeout(resolve, 10));
      assert.ok(releaseRoads, "held road read starts within 1 second");
      const departed = await page.evaluate(() => {
        window.dispatchEvent(
          new PageTransitionEvent("pagehide", { persisted: true }),
        );
        return {
          writes: window.__writes,
          workers: window.__workerCount,
          state: localStorage.getItem("hajin-safe-run-v1"),
        };
      });
      holdRoads = false;
      releaseRoads();
      await page.waitForTimeout(200);
      assert.deepEqual(
        await page.evaluate(() => ({
          writes: window.__writes,
          workers: window.__workerCount,
          state: localStorage.getItem("hajin-safe-run-v1"),
        })),
        departed,
      );
      await page.evaluate(() =>
        window.dispatchEvent(
          new PageTransitionEvent("pageshow", { persisted: true }),
        ),
      );
      await solved();
      pointerMode = "bad-digest";
      const valid = await order();
      await page.locator("#reload-data").click();
      await page.waitForFunction(() =>
        document
          .querySelector("#data-status")
          .textContent.includes("digest changed"),
      );
      assert.deepEqual(await order(), valid);
      pointerMode = "empty";
      await page.locator("#reload-data").click();
      await page.waitForFunction(() =>
        document
          .querySelector("#data-status")
          .textContent.includes("0 positioned"),
      );
      assert.deepEqual(
        await order(),
        [],
        "valid empty pointer must not fall back",
      );
      pointerMode = "missing";
      currentFixture = structuredClone(fixture);
      await page.locator("#reload-data").click();
      await page.waitForFunction(() =>
        document
          .querySelector("#data-status")
          .textContent.includes("4 positioned"),
      );
      await page.locator("#spawn-select").selectOption("official:start");
      await solved();
      missingRoads = true;
      await page.locator("#reload-data").click();
      await page.waitForFunction(() =>
        document
          .querySelector("#road-status")
          .textContent.includes("No usable"),
      );
      await page.locator("#route-mode").selectOption("roads");
      assert.match(
        await page.locator("#route-status").innerText(),
        /Road network unavailable/,
      );
      await page.locator("#route-mode").selectOption("direct");
      await solved();
      missingRoads = false;
      assert.equal(
        await page.evaluate(() => localStorage.getItem("main-map-sentinel")),
        "unchanged",
      );
      assert.equal(await page.evaluate(() => window.__idb), 0);
      phase = "key-access-journey";
      // A named access requirement AND matching calibrated grid links the
      // existing key page. Same-grid unrelated safe never inherits it.
      const cell = gridGeometry().cells.find(
        (c) => c.reference === "D6",
      ).center;
      currentFixture = structuredClone(fixture);
      Object.assign(currentFixture.records[0], {
        name: "Safe: Haejeok Radio Station",
        notes: "Synthetic requirement: needs the station key.",
        x: cell.x / 4096,
        y: cell.y / 4096,
      });
      Object.assign(currentFixture.records[1], {
        x: (cell.x + 8) / 4096,
        y: cell.y / 4096,
      });
      await page.locator("#reload-data").click();
      await page.waitForFunction(
        () => !document.querySelector("#reload-data").disabled,
      );
      const keyLink = page.locator(
        '#safe-list [data-safe-key="haejeok-radio-station"]',
      );
      assert.equal(await keyLink.count(), 1);
      assert.equal(
        await keyLink.getAttribute("href"),
        "http://127.0.0.1:4173/keys/haejeok-radio-station/",
      );
      assert.equal(await keyLink.getAttribute("target"), "_blank");
      assert.match(await keyLink.getAttribute("rel"), /noopener/);
      assert.equal(
        await page
          .locator('.safe-choice:has([data-safe="official:b"]) [data-safe-key]')
          .count(),
        0,
      );
      assert.equal(
        await page
          .locator('#visit-order [data-safe-key="haejeok-radio-station"]')
          .count(),
        1,
      );
      await page.locator("#safe-search").fill("key required");
      assert.equal(await page.locator("#safe-list input").count(), 1);
      await page.locator("#safe-search").fill("");
      await page
        .locator('.safe-choice:has([data-safe="official:a"])')
        .getByRole("button", { name: "Locate", exact: true })
        .click();
      // Locate opens the exact safe even when another same-grid marker is
      // only eight image pixels away and overlaps it on the map.
      assert.equal(
        await page
          .locator('.leaflet-popup [data-safe-key="haejeok-radio-station"]')
          .count(),
        1,
      );
      // Measure the readable steady state, not Leaflet's 200ms fade over
      // the synthetic white terrain (which transiently lowers contrast).
      await page.waitForFunction(
        () =>
          getComputedStyle(document.querySelector(".leaflet-popup")).opacity ===
          "1",
      );
      phase = "keyed-popup-axe";
      const popupAxe = await new AxeBuilder({ page }).analyze();
      assert.deepEqual(
        popupAxe.violations.map((v) => ({
          id: v.id,
          nodes: v.nodes.map((n) => n.target),
        })),
        [],
        name + " keyed safe popup axe",
      );
      await page.setViewportSize({ width: 320, height: 760 });
      await page.waitForFunction(() => {
        const close = document
            .querySelector(".leaflet-popup-close-button")
            .getBoundingClientRect(),
          map = document.querySelector("#safe-map").getBoundingClientRect(),
          tools = document
            .querySelector(".safe-map-tools")
            .getBoundingClientRect();
        return (
          close.width > 0 &&
          close.top >= map.top &&
          close.bottom <= map.bottom &&
          close.left >= map.left &&
          close.right <= map.right &&
          !(
            close.left < tools.right &&
            close.right > tools.left &&
            close.top < tools.bottom &&
            close.bottom > tools.top
          )
        );
      });
      await page.locator(".leaflet-popup-close-button").click();
      await page.setViewportSize({ width: 1440, height: 1000 });
      currentFixture.records[0].notes =
        "Synthetic reports: needs the station key. No key needed.";
      await page.locator("#reload-data").click();
      await page.waitForFunction(
        () => !document.querySelector("#reload-data").disabled,
      );
      assert.match(
        await page
          .locator('.safe-choice:has([data-safe="official:a"])')
          .innerText(),
        /Conflicting access reports/,
      );
      currentFixture.records[0].notes =
        "Synthetic updated report. No key needed.";
      await page.locator("#reload-data").click();
      await page.waitForFunction(
        () => !document.querySelector("#reload-data").disabled,
      );
      assert.equal(await page.locator("#safe-list [data-safe-key]").count(), 0);
      assert.equal(
        await page.locator(".safe-number-marker.safe-locked").count(),
        1,
        "fresh reports remove stale access classification",
      );
      // Also verify the refreshed dataset's route before navigating into a
      // different fixture. Its calculation starts after capture loading.
      await solved();
      phase = "capacity-reloads";
      // Explicit overflow has no silent first-64 selection; a rejected 65th
      // checkbox is restored to unchecked and does not change saved order.
      currentFixture = structuredClone(fixture);
      currentFixture.records = [
        ...Array.from({ length: 65 }, (_, i) =>
          marker("safe-" + i, "Synthetic Safe " + i, "safe", 200 + i * 2, 200),
        ),
        fixture.records.at(-1),
      ];
      await page.evaluate((k) => localStorage.removeItem(k), key);
      await page.reload();
      await page.waitForFunction(() =>
        document
          .querySelector("#data-status")
          .textContent.includes("65 positioned"),
      );
      assert.equal(await page.locator("#visit-order li").count(), 0);
      await page.locator("#select-all").click();
      assert.match(
        await page.locator("#route-status").innerText(),
        /More than 64/,
      );
      const known = Array.from({ length: 65 }, (_, i) => "official:safe-" + i);
      await page.evaluate(
        ({ key, known }) =>
          localStorage.setItem(
            key,
            JSON.stringify({
              version: 1,
              frame: "hajin-official-v1-4096",
              known,
              order: known.slice(0, 64),
              start: null,
              spawnKey: null,
              mode: "direct",
              manual: true,
            }),
          ),
        { key, known },
      );
      await page.reload();
      await page.waitForFunction(
        () => document.querySelectorAll("#visit-order li").length === 64,
      );
      await page.locator('[data-safe="official:safe-64"]').click();
      assert.equal(
        await page.locator('[data-safe="official:safe-64"]').isChecked(),
        false,
      );
      assert.equal(await page.locator("#visit-order li").count(), 64);
      assert.match(
        await page.locator("#route-status").innerText(),
        /At most 64/,
      );
      currentFixture = structuredClone(fixture);
      phase = "corruption-reload";
      // Corrupt preference recovery is visible; storage denial keeps controls usable.
      await page.evaluate(
        (k) => localStorage.setItem(k, '{"version":99}'),
        key,
      );
      await page.reload();
      await page.waitForFunction(() =>
        document
          .querySelector("#data-status")
          .textContent.includes("4 positioned"),
      );
      assert.match(
        await page.locator("#saved-status").innerText(),
        /could not be read/,
      );
      await page.locator("#spawn-select").selectOption("official:start");
      await solved();
      await page.evaluate(() => {
        Storage.prototype.setItem = () => {
          throw new DOMException("Synthetic quota", "QuotaExceededError");
        };
      });
      await page.locator('[data-safe="official:c"]').uncheck();
      await solved();
      assert.match(
        await page.locator("#saved-status").innerText(),
        /could not be saved/,
      );
      // Full keyboard map controls and native checkbox semantics remain available.
      await page.locator("#safe-map").focus();
      await page.keyboard.press("+");
      await page.keyboard.press("ArrowRight");
      phase = "responsive-axe";
      for (const viewport of [
        { width: 1440, height: 1000 },
        { width: 320, height: 760 },
      ]) {
        await page.setViewportSize(viewport);
        for (const size of ["14px", "28px"]) {
          await page.addStyleTag({ content: `:root{font-size:${size}}` });
          assert.ok(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth + 1,
            ),
            `${name} horizontal overflow ${viewport.width}/${size}`,
          );
          const axe = await new AxeBuilder({ page }).analyze();
          assert.deepEqual(
            axe.violations.map((v) => ({
              id: v.id,
              nodes: v.nodes.map((n) => n.target),
            })),
            [],
            `${name} axe ${viewport.width}/${size}`,
          );
        }
      }
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.addStyleTag({ content: ":root{font-size:14px}" });
      if (name === "chromium")
        await page.screenshot({
          path: ".local/safe-run-synthetic.png",
          fullPage: true,
        });
      if (errors.length)
        console.error(JSON.stringify({ engine: name, errors, failedRequests }));
      assert.deepEqual(errors, []);
      assert.deepEqual(remote, []);
      console.log(
        name +
          " safe-run PASS: locked/key/puzzle/unknown colors+labels, exact key links/grid and overlapping Locate popup, conflict/fresh removal, spawn/manual/right-click, select/search, optimize/manual drag/keyboard, persistence/corruption/quota, road gaps/failure, atomic reload/races/cap/deadline, pending-bootstrap A→B coalescing/startup-timeout/late-ready/retry, 5 popup/responsive/text-size axe scans, zero IDB/main-map writes/remote requests/page errors",
      );
    } finally {
      await browser.close();
    }
  }
} finally {
  await server.close();
}
