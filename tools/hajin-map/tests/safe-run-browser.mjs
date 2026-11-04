// Synthetic source fixtures only; provider websites and private workspaces are never read.
import { createServer } from "vite";
import { chromium, firefox, webkit } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
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
      page.on("pageerror", (e) => errors.push(e.message));
      await context.addInitScript(() => {
        window.__holdWorker = false;
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
            super.onmessage = (event) => {
              if (window.__holdWorker)
                window.__queuedWorkers.push(() => fn(event));
              else fn(event);
            };
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
        await page.locator(".safe-number-marker:not(.safe-excluded)").count(),
        4,
      );
      await page.locator('[data-safe="official:c"]').uncheck();
      await solved();
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
      assert.deepEqual(errors, []);
      assert.deepEqual(remote, []);
      console.log(
        name +
          " safe-run PASS: spawn/manual/right-click, select/search, optimize/manual drag/keyboard, persistence/corruption/quota, road gaps/failure, atomic reload/races, 4 responsive/text-size axe scans, zero IDB/main-map writes/remote requests",
      );
    } finally {
      await browser.close();
    }
  }
} finally {
  await server.close();
}
