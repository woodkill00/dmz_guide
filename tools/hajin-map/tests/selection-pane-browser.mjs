// Actual Leaflet popup/node behavior; synthetic content, no tiles or private data.
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import { chromium, firefox, webkit } from "playwright";
const root = fileURLToPath(new URL("../", import.meta.url));
const server = await createServer({
  root,
  configFile: false,
  cacheDir: root + ".local/selection-pane-vite",
  server: { host: "127.0.0.1", port: 0, strictPort: true, hmr: false },
  plugins: [
    {
      name: "selection-fixture",
      configureServer(vite) {
        vite.middlewares.use("/__selection", (_req, res) => {
          res.setHeader("content-type", "text/html");
          res.end(
            `<!doctype html><html lang="en" data-ui-variant="modern"><head><title>Synthetic selection</title><link rel="stylesheet" href="/node_modules/leaflet/dist/leaflet.css"><style>body{display:flex;gap:12px}#map{width:600px;height:500px}#pane{width:300px;max-height:400px;overflow:auto}#pane button{min-height:44px}.ui-map-selection-source,.ui-map-selection-pending{visibility:hidden;pointer-events:none}</style></head><body><div><button id="origin">Exact marker origin</button><button id="other">Other connected control</button><div id="map" tabindex="0"></div></div><aside id="pane"><p id="previous">Previous task</p></aside></body></html>`,
          );
        });
      },
    },
  ],
});
await server.listen();
const base = `http://127.0.0.1:${server.httpServer.address().port}`;
try {
  for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
    const browser = await engine.launch();
    try {
      const page = await browser.newPage(),
        errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(base + "/__selection");
      await page.evaluate(async () => {
        const L = await import("/node_modules/leaflet/dist/leaflet-src.esm.js");
        const { mountSelectionPane } = await import(
          "/src/map/selection-pane.ts"
        );
        const map = L.map("map", { zoomControl: false }).setView([0, 0], 2),
          pane = document.querySelector("#pane"),
          state = {
            allowed: true,
            releaseClosed: false,
            sourceIdentity: "Synthetic identity v1",
            attempts: [],
            held: false,
            pending: null,
            hits: 0,
            releases: 0,
            closes: [],
            back: null,
          };
        const node = document.createElement("section");
        node.id = "original-content";
        const title = document.createElement("h2");
        title.textContent = "SYNTHETIC <img src=x onerror=window.__hostile=1>";
        const input = document.createElement("input");
        input.id = "original-input";
        input.value = "SYNTHETIC preserved draft";
        input.setAttribute("aria-label", "Source value");
        const action = document.createElement("button");
        action.id = "source-action";
        action.textContent = "Original action";
        action.addEventListener("click", () => state.hits++);
        const text = document.createElement("p");
        text.textContent = "Synthetic long source details. ".repeat(300);
        node.append(title, input, action, text);
        const popup = L.popup({
          autoPan: false,
          autoClose: false,
          closeOnClick: false,
        })
          .setLatLng([0, 0])
          .setContent(node);
        const nextNode = document.createElement("section");
        nextNode.id = "next-content";
        nextNode.textContent = "Synthetic next source";
        const next = L.popup({
          autoPan: false,
          autoClose: false,
          closeOnClick: false,
        })
          .setLatLng([1, 1])
          .setContent(nextNode);
        const cleanup = mountSelectionPane(map, {
          selectionIdentity: () => state.sourceIdentity,
          request(intent) {
            state.attempts.push(intent.id);
            if (state.held) {
              if (!state.pending) state.pending = intent;
              return false;
            }
            if (intent.revalidate()) intent.run();
            return true;
          },
          canInspect: () => state.allowed,
          canReleaseClosed: () => state.releaseClosed,
          getOrigin: () => document.querySelector("#origin"),
          showDetail(content, onBack) {
            const view = document.createElement("section"),
              back = document.createElement("button");
            back.id = "selection-back";
            back.textContent = "Back";
            const leave = () => {
              onBack();
              pane.replaceChildren(
                Object.assign(document.createElement("p"), {
                  id: "previous",
                  textContent: "Previous task",
                }),
              );
            };
            back.onclick = leave;
            state.back = leave;
            view.append(back, content);
            pane.replaceChildren(view);
            return () => {
              state.releases++;
              if (pane.contains(content)) leave();
            };
          },
          onClose: (reason) => state.closes.push(reason),
        });
        const functional = L.popup({
          autoPan: false,
          autoClose: false,
          closeOnClick: false,
        })
          .setLatLng([2, 2])
          .setContent(() => {
            state.factoryCalls = (state.factoryCalls ?? 0) + 1;
            const content = document.createElement("section");
            content.id = "function-content";
            const action = document.createElement("button");
            action.id = "function-action";
            action.textContent = "Functional source action";
            action.onclick = () =>
              (state.functionHits = (state.functionHits ?? 0) + 1);
            content.append(action);
            return content;
          });
        window.selectionFixture = {
          map,
          functional,
          state,
          popup,
          next,
          node,
          nextNode,
          input,
          action,
          cleanup,
          open: () => popup.openOn(map),
          openNext: () => next.openOn(map),
          flush() {
            const pending = state.pending;
            state.pending = null;
            if (pending?.revalidate()) pending.run();
            else pending?.cancel?.();
          },
          camera: () => ({ center: map.getCenter(), zoom: map.getZoom() }),
        };
      });
      const initial = await page.evaluate(() => selectionFixture.camera());
      await page.locator("#origin").focus();
      await page.evaluate(() => selectionFixture.open());
      assert.equal(await page.locator("#pane #original-content").count(), 1);
      assert.equal(await page.locator("#original-input").count(), 1);
      assert.equal(
        await page.evaluate(
          () =>
            document.querySelector("#pane #original-input") ===
            selectionFixture.input,
        ),
        true,
      );
      await page.locator("#original-input").focus();
      await page.evaluate(() =>
        selectionFixture.popup.setContent(selectionFixture.node),
      );
      assert.equal(
        await page.locator("#pane #original-input").count(),
        1,
        "same-node Leaflet refresh returns the original control to its pane",
      );
      assert.equal(
        await page
          .locator("#original-input")
          .evaluate((node) => document.activeElement === node),
        true,
      );
      await page.locator("#source-action").click();
      assert.equal(await page.evaluate(() => selectionFixture.state.hits), 1);
      assert.equal(await page.locator(".ui-map-selection-source").count(), 1);
      assert.equal(
        await page.evaluate(() =>
          selectionFixture.map.hasLayer(selectionFixture.popup),
        ),
        true,
      );
      assert.equal(await page.locator("#original-content img").count(), 0);
      assert.equal(await page.evaluate(() => window.__hostile), undefined);
      assert.equal(
        await page
          .locator("#pane")
          .evaluate((node) => node.scrollHeight > node.clientHeight),
        true,
      );
      await page
        .locator("#pane")
        .evaluate((node) => (node.scrollTop = node.scrollHeight));
      assert.ok(
        (await page.locator("#pane").evaluate((node) => node.scrollTop)) > 0,
      );
      assert.deepEqual(
        await page.evaluate(() => selectionFixture.camera()),
        initial,
      );
      await page.locator("#selection-back").click();
      await page.waitForFunction(() => document.activeElement?.id === "origin");
      assert.equal(await page.locator("#pane #previous").count(), 1);
      assert.equal(await page.locator(".ui-map-selection-source").count(), 0);
      assert.equal(
        await page.evaluate(() =>
          selectionFixture.node.parentElement?.classList.contains(
            "leaflet-popup-content",
          ),
        ),
        true,
      );
      await page.evaluate(() => selectionFixture.open());
      await page.locator("#other").focus();
      await page.evaluate(() => {
        selectionFixture.state.allowed = false;
        selectionFixture.state.releaseClosed = true;
        selectionFixture.map.closePopup(selectionFixture.popup);
      });
      assert.equal(
        await page.locator("#pane #original-content").count(),
        0,
        "confirmed readonly owner can release while temporary write lock unwinds",
      );
      assert.equal(
        await page
          .locator("#other")
          .evaluate((node) => document.activeElement === node),
        true,
        "readonly busy cleanup does not steal another connected focus",
      );
      await page.evaluate(() => {
        selectionFixture.state.allowed = true;
        selectionFixture.state.releaseClosed = false;
      });
      await page.evaluate(() => {
        selectionFixture.state.held = true;
        selectionFixture.open();
      });
      assert.equal(await page.locator(".ui-map-selection-pending").count(), 1);
      assert.equal(
        await page.locator("#original-content").isVisible(),
        false,
        "unaccepted original content stays in its hidden Leaflet owner",
      );
      assert.equal(
        await page.evaluate(() =>
          selectionFixture.node.parentElement.classList.contains(
            "leaflet-popup-content",
          ),
        ),
        true,
      );
      await page.evaluate(() => {
        selectionFixture.state.pending.cancel();
        selectionFixture.state.pending = null;
      });
      assert.equal(
        await page.evaluate(() =>
          selectionFixture.map.hasLayer(selectionFixture.popup),
        ),
        false,
        "Stay cancellation closes only the owned pending popup",
      );
      assert.equal(await page.locator(".ui-map-selection-pending").count(), 0);
      await page.evaluate(() => {
        selectionFixture.open();
        selectionFixture.state.sourceIdentity = "Changed identity";
        selectionFixture.flush();
      });
      assert.equal(
        await page.locator("#pane #original-content").count(),
        0,
        "changed opaque source identity rejects a late destination",
      );
      assert.equal(await page.locator(".ui-map-selection-pending").count(), 0);
      await page.evaluate(() => {
        selectionFixture.state.sourceIdentity = "Synthetic identity v1";
        selectionFixture.open();
        selectionFixture.map.fire("popupopen", {
          popup: selectionFixture.popup,
        });
        selectionFixture.map.closePopup(selectionFixture.popup);
        selectionFixture.open();
      });
      const attempts = await page.evaluate(() =>
        selectionFixture.state.attempts.slice(-2),
      );
      assert.notEqual(
        attempts[0],
        attempts[1],
        "closed/reopened popup gets an exact new attempt ID",
      );
      assert.ok(
        attempts.every(
          (id) => id.startsWith("map-selection-") && !id.includes("Synthetic"),
        ),
        "opaque source identity never enters the destination ID",
      );
      await page.evaluate(() => {
        selectionFixture.map.closePopup(selectionFixture.popup);
        selectionFixture.state.pending = null;
      });
      // The owner freezes the first request; a rejected second popup must not
      // invalidate that still-live first source or redirect it to the newer node.
      await page.evaluate(() => {
        selectionFixture.state.held = true;
        selectionFixture.open();
        selectionFixture.openNext();
        selectionFixture.flush();
      });
      assert.equal(await page.locator("#pane #original-content").count(), 1);
      assert.equal(await page.locator("#pane #next-content").count(), 0);
      await page.evaluate(() => {
        selectionFixture.state.back();
        selectionFixture.map.closePopup(selectionFixture.next);
      });
      // Request acceptance precedes the move, and protected focus rejects late work.
      await page.evaluate(() => {
        selectionFixture.state.held = true;
        selectionFixture.open();
      });
      assert.equal(await page.locator("#pane #original-content").count(), 0);
      await page.evaluate(() => {
        selectionFixture.state.allowed = false;
        selectionFixture.flush();
      });
      assert.equal(await page.locator("#pane #original-content").count(), 0);
      await page.evaluate(() => {
        selectionFixture.map.closePopup(selectionFixture.popup);
        selectionFixture.state.allowed = true;
        selectionFixture.state.held = false;
        selectionFixture.open();
      });
      await page.locator("#original-input").fill("SYNTHETIC typed draft");
      await page.evaluate(() => {
        selectionFixture.state.allowed = false;
        selectionFixture.openNext();
      });
      assert.equal(await page.locator("#pane #original-content").count(), 1);
      assert.equal(
        await page.locator("#original-input").inputValue(),
        "SYNTHETIC typed draft",
      );
      await page.evaluate(() =>
        selectionFixture.popup.setContent(
          Object.assign(document.createElement("p"), {
            textContent: "Updated source while protected",
          }),
        ),
      );
      assert.equal(await page.locator("#pane #original-content").count(), 1);
      assert.equal(
        await page.locator("#original-input").inputValue(),
        "SYNTHETIC typed draft",
      );
      await page.evaluate(() => {
        selectionFixture.state.allowed = true;
        selectionFixture.state.back();
        selectionFixture.map.closePopup(selectionFixture.next);
        selectionFixture.popup.setContent(selectionFixture.node);
        selectionFixture.open();
      });
      // Readonly source invalidation closes this frame and preserves another focused control.
      await page.locator("#other").focus();
      await page.evaluate(() =>
        selectionFixture.popup.setContent(
          Object.assign(document.createElement("p"), {
            id: "fresh-source",
            textContent: "Fresh source facts",
          }),
        ),
      );
      assert.equal(await page.locator("#pane #original-content").count(), 0);
      assert.equal(
        await page
          .locator("#other")
          .evaluate((node) => document.activeElement === node),
        true,
      );
      assert.equal(
        await page.evaluate(() => selectionFixture.popup.getContent().id),
        "fresh-source",
      );
      await page.evaluate(() => {
        selectionFixture.popup.setContent(selectionFixture.node);
        selectionFixture.open();
        selectionFixture.openNext();
      });
      assert.equal(await page.locator("#pane #original-content").count(), 0);
      assert.equal(await page.locator("#pane #next-content").count(), 1);
      assert.equal(await page.locator("#selection-back").count(), 1);
      await page.evaluate(() =>
        selectionFixture.map.closePopup(selectionFixture.next),
      );
      assert.equal(await page.locator("#pane #next-content").count(), 0);
      await page.evaluate(() =>
        selectionFixture.functional.openOn(selectionFixture.map),
      );
      assert.equal(await page.locator("#pane #function-content").count(), 1);
      assert.equal(
        await page.evaluate(() => selectionFixture.state.factoryCalls),
        1,
        "adapter never invokes the source factory again",
      );
      await page.locator("#function-action").click();
      assert.equal(
        await page.evaluate(() => selectionFixture.state.functionHits),
        1,
      );
      await page
        .locator("#function-content")
        .evaluate((node) => (window.__functionIdentity = node));
      await page.evaluate(() => {
        document.querySelector("#map").style.height = "450px";
        selectionFixture.map.invalidateSize({ pan: false, animate: false });
        document.querySelector("#map").style.height = "500px";
        selectionFixture.map.invalidateSize({ pan: false, animate: false });
      });
      assert.equal(
        await page.evaluate(
          () =>
            document.querySelector("#pane #function-content") ===
            window.__functionIdentity,
        ),
        true,
      );
      assert.equal(
        await page.evaluate(() => selectionFixture.state.factoryCalls),
        1,
      );
      await page.evaluate(() => {
        selectionFixture.state.allowed = false;
        selectionFixture.functional.update();
      });
      assert.equal(
        await page.evaluate(
          () =>
            document.querySelector("#pane #function-content") ===
            window.__functionIdentity,
        ),
        true,
        "protected functional source refresh keeps its existing editor frame",
      );
      assert.equal(
        await page.evaluate(() => selectionFixture.state.factoryCalls),
        2,
      );
      await page.evaluate(() => {
        selectionFixture.state.allowed = true;
        selectionFixture.state.back();
      });
      assert.equal(
        await page.evaluate(
          () =>
            selectionFixture.functional
              .getElement()
              .querySelector(".leaflet-popup-content").childNodes.length,
        ),
        1,
        "stale old node is never restored beside the newer factory result",
      );
      await page.evaluate(() => {
        selectionFixture.functional.openOn(selectionFixture.map);
        selectionFixture.functional.update();
      });
      assert.equal(
        await page.locator("#pane #function-content").count(),
        0,
        "readonly functional source generation change releases the obsolete pane",
      );
      assert.equal(
        await page.evaluate(() => selectionFixture.state.factoryCalls),
        4,
        "only Leaflet invokes the factory, once per owner update/open",
      );
      await page.evaluate(() => {
        selectionFixture.open();
        selectionFixture.cleanup();
        selectionFixture.cleanup();
        selectionFixture.openNext();
      });
      assert.equal(await page.locator("#pane #next-content").count(), 0);
      assert.equal(await page.locator(".ui-map-selection-source").count(), 0);
      assert.deepEqual(
        await page.evaluate(() => selectionFixture.camera()),
        initial,
      );
      await page.evaluate(async () => {
        const { mountSelectionPane } = await import(
          "/src/map/selection-pane.ts"
        );
        const fixture = selectionFixture;
        fixture.state.failures = [];
        fixture.map.closePopup(fixture.next);
        const fail = mountSelectionPane(fixture.map, {
          request: (intent) => intent.run(),
          canInspect: () => true,
          showDetail(node) {
            document.querySelector("#pane").append(node);
            throw new Error("Synthetic detail host refusal");
          },
          onError: (error) => fixture.state.failures.push(error.message),
        });
        fixture.open();
        fail();
      });
      assert.deepEqual(
        await page.evaluate(() => selectionFixture.state.failures),
        ["Synthetic detail host refusal"],
      );
      assert.equal(await page.locator("#pane #original-content").count(), 0);
      assert.equal(
        await page.evaluate(() =>
          selectionFixture.node.parentElement?.classList.contains(
            "leaflet-popup-content",
          ),
        ),
        true,
      );
      assert.equal(await page.locator(".ui-map-selection-source").count(), 0);
      await page.evaluate(async () => {
        document.documentElement.dataset.uiVariant = "legacy";
        const { mountSelectionPane } = await import(
          "/src/map/selection-pane.ts"
        );
        const dispose = mountSelectionPane(selectionFixture.map, {
          request: () => {
            throw Error("Legacy must not mount");
          },
          canInspect: () => true,
          showDetail: () => {
            throw Error("Legacy must not project");
          },
        });
        selectionFixture.openNext();
        dispose();
      });
      assert.equal(await page.locator("#pane #next-content").count(), 0);
      assert.deepEqual(errors, []);
      await page.close();
      console.log(
        `${name} actual Leaflet single selection identity/actions/guard/source/focus/cleanup PASS`,
      );
    } finally {
      await browser.close();
    }
  }
} finally {
  await server.close();
}
