import assert from "node:assert/strict";
import { createServer } from "vite";
import { chromium, firefox, webkit } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
// Actual IDB commits; only the acknowledgement is held. Persisted events are
// synthetic adapter stimuli, not evidence that any browser used real BFcache.
process.env.DMZ_UI_VARIANT = "modern";
const server = await createServer({
  cacheDir: ".local/ui-bfcache-write-vite",
  server: { host: "127.0.0.1", port: 5296, strictPort: true, hmr: false },
  define: { "import.meta.env.VITE_LOCAL_PROVIDER_SNAPSHOTS": '"0"' },
});
await server.listen();
const rows = [],
  failures = [];
async function durable(page) {
  return page.evaluate(async () => {
    const { openWorkspace } = await import("/src/workspace/store.ts");
    const db = await openWorkspace();
    try {
      return {
        current: (await db.read()).current,
        attempts: window.__writeAttempts ?? 0,
        writes: window.__durableWrites ?? 0,
        acks: window.__acks ?? 0,
      };
    } finally {
      db.close();
    }
  });
}
try {
  for (const [engineName, engine] of Object.entries({
    chromium,
    firefox,
    webkit,
  })) {
    const browser = await engine.launch();
    try {
      for (const departure of [false, true]) {
        const context = await browser.newContext({
            viewport: { width: 1440, height: 1000 },
          }),
          page = await context.newPage(),
          errors = [],
          external = [];
        const row = {
          engine: engineName,
          departure,
          syntheticPersistedEvents: true,
          actualBFcacheEligibility: "not tested",
        };
        try {
          page.on("pageerror", (e) => errors.push(e.message));
          await context.route("**/*", (r) => {
            const u = new URL(r.request().url());
            if (u.origin === "http://127.0.0.1:5296") return r.continue();
            external.push(u.origin + u.pathname);
            return r.abort();
          });
          const image = await page.evaluate(() => {
            const c = document.createElement("canvas");
            c.width = c.height = 128;
            c.getContext("2d").fillRect(0, 0, 128, 128);
            return c.toDataURL().split(",")[1];
          });
          await context.route("**/maps/hajin/v1/background.webp", (r) =>
            r.fulfill({
              contentType: "image/png",
              body: Buffer.from(image, "base64"),
            }),
          );
          await context.route("**/maps/hajin/official/markers.json", (r) =>
            r.fulfill({
              json: {
                schemaVersion: 1,
                sourcePage:
                  "https://www.callofduty.com/guides/modernwarfare4/dmz-maps/hajin",
                capturedAt: "2026-11-05T00:00:00Z",
                categories: [],
                records: [],
              },
            }),
          );
          await context.route("**/src/workspace/store.ts", async (r) => {
            const response = await r.fetch();
            let source = await response.text();
            assert(source.includes("export async function openWorkspace("));
            source = source.replace(
              "export async function openWorkspace(",
              "async function originalWorkspace(",
            );
            source +=
              "\nexport async function openWorkspace(options){const real=await originalWorkspace(options);return {...real,commit:async(...args)=>{window.__writeAttempts=(window.__writeAttempts??0)+1;const receipt=await real.commit(...args);window.__durableWrites=(window.__durableWrites??0)+1;if(window.__holdAck)await new Promise(resolve=>window.__releaseAck=resolve);window.__acks=(window.__acks??0)+1;return receipt;}};}";
            await r.fulfill({ response, body: source });
          });
          await page.goto("http://127.0.0.1:5296/");
          await page.waitForSelector(
            'html[data-ui-variant="modern"][data-ui-contract="071-v1"][data-ui-mounted="071-v1"][data-ui-adapter="map-pane"]',
          );
          await page.locator("#workspace-open").click();
          const initial = await durable(page),
            title = "Synthetic durable point across persisted events";
          await page.locator("#point-title").fill(title);
          await page.locator("#point-owned").check();
          await page.evaluate(() => (window.__holdAck = true));
          const guard = page.locator("#ui-pane-departure-guard");
          if (departure) {
            await page.locator("#workspace-tab-icons").click();
            await guard
              .getByRole("button", { name: "Save and continue", exact: true })
              .click();
          } else await page.locator("#save-point").click();
          await page.waitForFunction(() => !!window.__releaseAck);
          const held = await durable(page);
          assert.equal(
            held.current.data.annotations.length,
            (initial.current?.data.annotations.length ?? 0) + 1,
          );
          assert.equal(held.writes, initial.writes + 1);
          assert.equal(held.current.data.annotations.at(-1).title, title);
          row.held = {
            revision: held.current.revision,
            count: held.current.data.annotations.length,
            attempts: held.attempts,
            writes: held.writes,
          };
          await page.evaluate(() => {
            window.dispatchEvent(
              new PageTransitionEvent("pagehide", { persisted: true }),
            );
            window.dispatchEvent(
              new PageTransitionEvent("pageshow", { persisted: true }),
            );
          });
          assert.equal(
            await page.locator("#icon-studio").count(),
            0,
            "No destination during outstanding write",
          );
          assert.equal(
            (await durable(page)).attempts,
            held.attempts,
            "Resume must not resubmit",
          );
          await page.evaluate(() => {
            window.__holdAck = false;
            window.__releaseAck();
          });
          await page.waitForFunction(
            () =>
              document
                .querySelector("#workspace-content")
                ?.getAttribute("aria-busy") === "false",
          );
          await page.waitForTimeout(100);
          const confirmed = await durable(page);
          row.confirmed = {
            revision: confirmed.current.revision,
            count: confirmed.current.data.annotations.length,
            attempts: confirmed.attempts,
            writes: confirmed.writes,
            icons: await page.locator("#icon-studio").count(),
            guard: await guard.isVisible(),
            title: (await page.locator("#point-title").count())
              ? await page.locator("#point-title").inputValue()
              : null,
          };
          assert.equal(
            confirmed.attempts,
            held.attempts,
            "Receipt must not replay",
          );
          assert.equal(confirmed.current.revision, held.current.revision);
          assert.equal(
            confirmed.current.data.annotations.length,
            held.current.data.annotations.length,
          );
          assert.equal(
            await page.locator("#icon-studio").count(),
            0,
            "Old departure intent cannot navigate after persisted lifecycle change",
          );
          if (await guard.isVisible())
            await guard
              .getByRole("button", { name: "Stay", exact: true })
              .click();
          // An enabled retained submit must never create a second copy of the same confirmed draft.
          if (
            (await page.locator("#point-title").inputValue()) === title &&
            (await page.locator("#save-point").isEnabled())
          ) {
            await page.locator("#save-point").click();
            await page.waitForFunction(
              () =>
                document
                  .querySelector("#workspace-content")
                  ?.getAttribute("aria-busy") === "false",
            );
          }
          const after = await durable(page);
          row.afterRetry = {
            revision: after.current.revision,
            count: after.current.data.annotations.length,
            attempts: after.attempts,
            writes: after.writes,
          };
          assert.equal(
            after.current.data.annotations.length,
            held.current.data.annotations.length,
            "Confirmed retained draft must not be resubmittable as a duplicate",
          );
          assert.equal(
            after.current.revision,
            held.current.revision,
            "Confirmed draft reconciliation must not issue another write",
          );
          assert.notEqual(
            await page.locator("#point-title").inputValue(),
            title,
            "Confirmed owned form reconciles before admitting another write",
          );
          assert.deepEqual(errors, []);
          assert.deepEqual(external, []);
          row.pass = true;
        } catch (e) {
          row.pass = false;
          row.failure = e.message;
          failures.push({ engine: engineName, departure, message: e.message });
        } finally {
          rows.push(row);
          await context.close();
        }
      }
    } finally {
      await browser.close();
    }
  }
} finally {
  await mkdir(".local", { recursive: true });
  await writeFile(
    ".local/071-bfcache-write.json",
    JSON.stringify({ rows, failures }, null, 2),
  );
  await server.close();
}
console.log(JSON.stringify({ cases: rows.length, failures }, null, 2));
assert.deepEqual(
  failures,
  [],
  "Persisted lifecycle/confirmed write safety must pass",
);
