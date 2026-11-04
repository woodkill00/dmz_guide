// Synthetic source/terrain only; never reads owner-local map captures or profiles.
import { createServer } from "vite";
import { chromium, firefox, webkit } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
const server = await createServer({
  server: { host: "127.0.0.1", port: 5281, strictPort: true, hmr: false },
});
await server.listen();
await mkdir(".local", { recursive: true });
const origin = "http://127.0.0.1:5281",
  key = "hajin-safe-run-v1";
const marker = (id, name, category, x, y) => ({
  id,
  name,
  category,
  mapId: "hajin",
  coordinateSpaceVersion: "hajin-official-v1-4096",
  x: x / 4096,
  y: y / 4096,
  notes: "Synthetic sidebar test fixture, not a game location.",
});
const fixture = {
  schemaVersion: 1,
  sourcePage: "https://www.callofduty.com/guides/modernwarfare4/dmz-maps/hajin",
  capturedAt: "2026-11-04T00:00:00Z",
  categories: [
    {
      id: "safe",
      name: "Safes",
      group: "Synthetic",
      icon: "/maps/hajin/official/icons/safe.png",
    },
    {
      id: "spawn",
      name: "Spawn Point",
      group: "Synthetic",
      icon: "/maps/hajin/official/icons/spawn.png",
    },
  ],
  records: [
    ...Array.from({ length: 64 }, (_, i) =>
      marker("safe-" + i, "Synthetic safe " + i, "safe", 200 + i * 35, 1000),
    ),
    marker("spawn", "Synthetic start", "spawn", 100, 1000),
  ],
};
const panes = ["safe-start-pane", "safe-candidates-pane", "safe-route-pane"];
const selectedEngine = process.env.DMZ_SIDEBAR_ENGINE;
assert.ok(
  !selectedEngine || ["chromium", "firefox", "webkit"].includes(selectedEngine),
  "valid diagnostic engine",
);
try {
  for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
    if (selectedEngine && name !== selectedEngine) continue;
    const browser = await engine.launch();
    try {
      const context = await browser.newContext({
          viewport: { width: 1440, height: 620 },
          hasTouch: true,
        }),
        page = await context.newPage(),
        errors = [],
        remote = [];
      page.on("pageerror", (e) => errors.push(e.message));
      const painter = await context.newPage();
      const encoded = await painter.evaluate(() => {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 128;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#304034";
        ctx.fillRect(0, 0, 128, 128);
        return canvas.toDataURL("image/png").split(",")[1];
      });
      await painter.close();
      const image = Buffer.from(encoded, "base64");
      context.on("request", (r) => {
        if (
          !r.url().startsWith(origin) &&
          !r.url().startsWith("data:") &&
          !r.url().startsWith("blob:")
        )
          remote.push(r.url());
      });
      await context.route("**/maps/hajin/**", (r) => {
        const p = new URL(r.request().url()).pathname;
        if (p.endsWith("/background.webp"))
          return r.fulfill({ body: image, contentType: "image/png" });
        if (p.endsWith("/official/markers.json"))
          return r.fulfill({ json: fixture });
        return r.fulfill({
          status: 404,
          body: "Missing synthetic optional input",
        });
      });
      await page.goto(origin + "/safes.html");
      await page.waitForFunction(() =>
        document
          .querySelector("#data-status")
          .textContent.includes("64 positioned"),
      );
      await page.locator("#spawn-select").selectOption("official:spawn");
      await page.waitForFunction(() =>
        document
          .querySelector("#route-status")
          .textContent.includes("64 stops"),
      );
      await page.waitForFunction(
        () => document.querySelector("#terrain-status").hidden,
      );
      const saved = await page.evaluate((k) => localStorage.getItem(k), key),
        mapPosition = await page
          .locator(".leaflet-map-pane")
          .getAttribute("style");
      const sizes = () =>
        page.evaluate(
          (ids) =>
            ids.map(
              (id) =>
                document.getElementById(id).getBoundingClientRect().height,
            ),
          panes,
        );
      const before = await sizes();
      assert.ok(
        before.every((v) => v >= 40),
        "all sections have visible area at620px",
      );
      for (const id of panes) {
        const region = page.locator("#" + id);
        await region.focus();
        assert.ok(
          await region.evaluate((n) => n.scrollHeight > n.clientHeight),
          id + " needs real scrolling",
        );
        const box = await region.boundingBox();
        await page.mouse.move(box.x + 4, Math.min(box.y + box.height / 2, 605));
        const documentY = await page.evaluate(() => scrollY),
          others = await page.evaluate(
            ({ panes, id }) =>
              panes
                .filter((p) => p !== id)
                .map((p) => document.getElementById(p).scrollTop),
            { panes, id },
          );
        const wheelTo = async (direction) => {
          let metrics;
          for (let pass = 0; pass < 200; pass++) {
            await page.mouse.wheel(0, direction * 1000);
            await page.waitForTimeout(40);
            metrics = await region.evaluate((n) => ({
              top: n.scrollTop,
              client: n.clientHeight,
              total: n.scrollHeight,
            }));
            if (
              direction > 0
                ? metrics.top + metrics.client >= metrics.total - 2
                : metrics.top === 0
            )
              return;
          }
          assert.fail(
            name + " wheel did not reach " + id + " " + JSON.stringify(metrics),
          );
        };
        await wheelTo(1);
        assert.equal(
          await page.evaluate(() => scrollY),
          documentY,
          "wheel stays within " + id,
        );
        assert.deepEqual(
          await page.evaluate(
            ({ panes, id }) =>
              panes
                .filter((p) => p !== id)
                .map((p) => document.getElementById(p).scrollTop),
            { panes, id },
          ),
          others,
        );
        await wheelTo(-1);
      }
      const divider = page.locator("#safe-start-divider"),
        box = await divider.boundingBox(),
        value = Number(await divider.getAttribute("aria-valuenow"));
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(
        box.x + box.width / 2,
        box.y + box.height / 2 + 20,
        { steps: 4 },
      );
      await page.mouse.up();
      assert.ok(Number(await divider.getAttribute("aria-valuenow")) > value);
      const moved = await sizes();
      assert.ok(
        Math.abs(moved[2] - before[2]) < 1,
        "nonadjacent pane unchanged",
      );
      assert.ok(
        Math.abs(
          moved.reduce((a, b) => a + b, 0) - before.reduce((a, b) => a + b, 0),
        ) < 1,
        "total stays bounded",
      );
      await divider.focus();
      await page.keyboard.press("ArrowUp");
      assert.ok(
        Number(await divider.getAttribute("aria-valuenow")) < Number(moved[0]),
      );
      await page.keyboard.press("End");
      assert.equal(
        await divider.getAttribute("aria-valuenow"),
        await divider.getAttribute("aria-valuemax"),
      );
      await page.keyboard.press("Home");
      assert.equal(
        await divider.getAttribute("aria-valuenow"),
        await divider.getAttribute("aria-valuemin"),
      );
      const cancelValue = await divider.getAttribute("aria-valuenow"),
        cancelBox = await divider.boundingBox();
      await page.mouse.move(
        cancelBox.x + cancelBox.width / 2,
        cancelBox.y + cancelBox.height / 2,
      );
      await page.mouse.down();
      await page.mouse.move(
        cancelBox.x + cancelBox.width / 2,
        cancelBox.y + cancelBox.height / 2 + 16,
      );
      assert.notEqual(await divider.getAttribute("aria-valuenow"), cancelValue);
      await page.keyboard.press("Escape");
      await page.mouse.up();
      assert.equal(
        await divider.getAttribute("aria-valuenow"),
        cancelValue,
        "Escape restores split",
      );
      const second = page.locator("#safe-route-divider"),
        firstSize = (await sizes())[0];
      await second.focus();
      await page.keyboard.press("Home");
      assert.equal(
        await second.getAttribute("aria-valuenow"),
        await second.getAttribute("aria-valuemin"),
      );
      assert.ok(Math.abs((await sizes())[0] - firstSize) < 1);
      await page.keyboard.press("End");
      assert.equal(
        await second.getAttribute("aria-valuenow"),
        await second.getAttribute("aria-valuemax"),
      );
      assert.equal(
        await page.evaluate((k) => localStorage.getItem(k), key),
        saved,
        "layout never writes route preference",
      );
      assert.equal(
        await page.locator(".leaflet-map-pane").getAttribute("style"),
        mapPosition,
        "layout never moves map",
      );
      // Real Chromium touch events, in addition to pointer/keyboard in all engines.
      if (name === "chromium") {
        await divider.focus();
        await page.keyboard.press("Home");
        const t = await divider.boundingBox(),
          session = await context.newCDPSession(page),
          old = Number(await divider.getAttribute("aria-valuenow"));
        await session.send("Input.dispatchTouchEvent", {
          type: "touchStart",
          touchPoints: [{ x: t.x + t.width / 2, y: t.y + t.height / 2 }],
        });
        await session.send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: [{ x: t.x + t.width / 2, y: t.y + t.height / 2 + 20 }],
        });
        await session.send("Input.dispatchTouchEvent", {
          type: "touchEnd",
          touchPoints: [],
        });
        assert.ok(Number(await divider.getAttribute("aria-valuenow")) > old);
        await session.detach();
      }
      for (const viewport of [
        { width: 1440, height: 620 },
        { width: 390, height: 844 },
        { width: 320, height: 760 },
      ]) {
        await page.setViewportSize(viewport);
        for (const font of ["14px", "28px"]) {
          await page.addStyleTag({ content: ":root{font-size:" + font + "}" });
          await page.waitForFunction(
            (ids) =>
              ids.every((id) => document.getElementById(id).clientHeight > 0),
            panes,
          );
          assert.ok(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth + 1,
            ),
            "no horizontal overflow",
          );
          for (const target of [
            "#safe-list .safe-choice:last-child input",
            "#visit-order li:last-child button:last-child",
          ]) {
            await page.locator(target).focus();
            try {
              await page.waitForFunction(
                (target) => {
                  const n = document.querySelector(target),
                    r = n.getBoundingClientRect(),
                    p = n
                      .closest(".sidebar-scroll-section")
                      .getBoundingClientRect();
                  return r.top >= p.top - 1 && r.bottom <= p.bottom + 1;
                },
                target,
                { timeout: 5000 },
              );
            } catch (error) {
              console.error(
                JSON.stringify({
                  name,
                  viewport,
                  font,
                  target,
                  metrics: await page.locator(target).evaluate((n) => {
                    const p = n.closest(".sidebar-scroll-section"),
                      r = n.getBoundingClientRect(),
                      box = p.getBoundingClientRect();
                    return {
                      target: {
                        top: r.top,
                        bottom: r.bottom,
                        height: r.height,
                      },
                      pane: {
                        top: box.top,
                        bottom: box.bottom,
                        height: box.height,
                        scrollTop: p.scrollTop,
                        scrollHeight: p.scrollHeight,
                        overflow: getComputedStyle(p).overflow,
                      },
                      rootTop:
                        document.querySelector("#safe-controls").scrollTop,
                      focus: document.activeElement === n,
                    };
                  }),
                }),
              );
              throw error;
            }
            assert.ok(
              await page.locator(target).evaluate((n) => {
                const r = n.getBoundingClientRect(),
                  p = n
                    .closest(".sidebar-scroll-section")
                    .getBoundingClientRect();
                return r.top >= p.top - 1 && r.bottom <= p.bottom + 1;
              }),
              "last action reachable " + target,
            );
          }
          for (const d of ["safe-start-divider", "safe-route-divider"]) {
            const row = page.locator("#" + d),
              now = Number(await row.getAttribute("aria-valuenow"));
            assert.ok(
              now >= Number(await row.getAttribute("aria-valuemin")) &&
                now <= Number(await row.getAttribute("aria-valuemax")),
            );
          }
          const axe = await new AxeBuilder({ page }).analyze();
          assert.deepEqual(
            axe.violations.map((v) => ({
              id: v.id,
              nodes: v.nodes.map((n) => n.target),
            })),
            [],
            name + " sidebar axe " + viewport.width + "/" + font,
          );
        }
      }
      assert.equal(
        await page.evaluate((k) => localStorage.getItem(k), key),
        saved,
      );
      assert.deepEqual(errors, []);
      assert.deepEqual(remote, []);
      if (name === "chromium") {
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.addStyleTag({ content: ":root{font-size:14px}" });
        await page.screenshot({
          path: ".local/sidebars066-synthetic-desktop.png",
        });
      }
      console.log(
        name +
          " shared sidebar PASS: 3independent scroll regions, pairwise pointer/keyboard/cancel, bounded resizing, state/map unchanged, mobile/200%text last actions reachable, 6axe-zero scans" +
          (name === "chromium" ? ", real touch drag" : ""),
      );
    } finally {
      await browser.close();
    }
  }
} finally {
  await server.close();
}
