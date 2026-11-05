import assert from "node:assert/strict";
import { createServer } from "vite";
import { chromium, firefox, webkit } from "playwright";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
// Startup rollback on ONE actual server/origin. HTML variants are emitted by
// the real trusted resolver; no DOM marker or response HTML is rewritten.
process.env.DMZ_UI_VARIANT = "modern";
const server = await createServer({
  cacheDir: ".local/ui-rollback-vite",
  server: { host: "127.0.0.1", port: 5297, strictPort: true, hmr: false },
  define: { "import.meta.env.VITE_LOCAL_PROVIDER_SNAPSHOTS": '"0"' },
});
await server.listen();
const base = "http://127.0.0.1:5297",
  rows = [],
  failures = [],
  digest = (value) => createHash("sha256").update(value).digest("hex");
const fixture = {
  schemaVersion: 1,
  sourcePage: "https://www.callofduty.com/guides/modernwarfare4/dmz-maps/hajin",
  capturedAt: "2026-11-05T00:00:00Z",
  categories: [
    {
      id: "safe",
      name: "Safes",
      group: "Synthetic loot",
      icon: "/maps/hajin/official/icons/safe.png",
    },
  ],
  records: [
    {
      id: "a",
      name: "Synthetic Alpha safe",
      category: "safe",
      mapId: "hajin",
      coordinateSpaceVersion: "hajin-official-v1-4096",
      x: 0.2,
      y: 0.2,
    },
    {
      id: "b",
      name: "Synthetic Bravo safe",
      category: "safe",
      mapId: "hajin",
      coordinateSpaceVersion: "hajin-official-v1-4096",
      x: 0.7,
      y: 0.7,
    },
  ],
};
const localBytes = {
  "hajin-map-menu-layout-v1":
    ' { "navigation": { "x":0.11,"y":0.21 }, "unknown":"synthetic legacy bytes" } ',
  "hajin-selection-layout-v1":
    ' {"unknown":"synthetic legacy selection record"} ',
  "dmz-ui-display-v1.map":
    ' {"version":999,"density":"compact","synthetic":"preserve invalid map record"} ',
  "dmz-ui-display-v1.safe-runs": " invalid synthetic JSON display record ",
};
const sessionBytes = {
  "dmz-ui-display-v1.map": "synthetic session invalid map record",
  "dmz-ui-display-v1.safe-runs": "synthetic session invalid safe record",
};
async function history(page) {
  return page.evaluate(async () => {
    const { openWorkspace } = await import("/src/workspace/store.ts");
    const db = await openWorkspace();
    try {
      return JSON.stringify(await db.read());
    } finally {
      db.close();
    }
  });
}
async function ready(page, surface, variant) {
  await page.waitForFunction(
    ({ surface, variant }) =>
      document.documentElement.dataset.uiSurface === surface &&
      document.documentElement.dataset.uiVariant === variant,
    { surface, variant },
  );
  if (variant === "modern")
    await page.waitForSelector(
      `html[data-ui-contract="071-v1"][data-ui-mounted="071-v1"][data-ui-adapter="${surface === "map" ? "map-pane" : "safe-run-layout"}"]`,
    );
  else {
    assert.equal(
      await page.locator("html").getAttribute("data-ui-mounted"),
      null,
    );
    assert.equal(
      await page.locator("html").getAttribute("data-ui-adapter"),
      null,
    );
  }
  if (surface === "map") {
    await page.locator("#workspace-open:enabled").waitFor();
    await page.waitForFunction(
      () =>
        document.querySelectorAll('[data-source-id="official"]').length === 2,
    );
    assert.equal(
      await page.locator("#ui-map-task").count(),
      variant === "modern" ? 1 : 0,
    );
  } else {
    await page.locator("#safe-choices:enabled").waitFor();
    await page.waitForFunction(
      () => document.querySelectorAll("[data-safe]").length === 2,
    );
    assert.equal(
      await page.locator(".ui-safe-views").count(),
      variant === "modern" ? 1 : 0,
    );
    assert.equal(await page.locator("#workspace-dialog").count(), 0);
  }
}
async function preserved(page) {
  const actual = await page.evaluate(
    ({ local, session }) => ({
      local: Object.fromEntries(
        Object.keys(local).map((k) => [k, localStorage.getItem(k)]),
      ),
      session: Object.fromEntries(
        Object.keys(session).map((k) => [k, sessionStorage.getItem(k)]),
      ),
    }),
    { local: localBytes, session: sessionBytes },
  );
  assert.deepEqual(
    actual.local,
    localBytes,
    "Rollback must preserve exact legacy and invalid071 local bytes",
  );
  assert.deepEqual(
    actual.session,
    sessionBytes,
    "Rollback must not clear/rewrite unrelated invalid session bytes",
  );
}
try {
  for (const [engineName, engine] of Object.entries({
    chromium,
    firefox,
    webkit,
  })) {
    const browser = await engine.launch();
    try {
      process.env.DMZ_UI_VARIANT = "modern";
      const context = await browser.newContext({
          viewport: { width: 1440, height: 1000 },
        }),
        main = await context.newPage(),
        errors = [],
        external = [],
        mutations = [];
      context.on("page", (p) =>
        p.on("pageerror", (e) => errors.push(e.message)),
      );
      main.on("pageerror", (e) => errors.push(e.message));
      const image = await main.evaluate(() => {
        const c = document.createElement("canvas");
        c.width = c.height = 128;
        c.getContext("2d").fillRect(0, 0, 128, 128);
        return c.toDataURL().split(",")[1];
      });
      await context.route("**/*", (r) => {
        const req = r.request(),
          u = new URL(req.url());
        if (["http:", "https:"].includes(u.protocol) && u.origin !== base) {
          external.push(u.origin + u.pathname);
          return r.abort();
        }
        if (!["GET", "HEAD"].includes(req.method())) {
          mutations.push(req.method() + " " + u.pathname);
          return r.abort();
        }
        if (
          u.pathname.endsWith("/background.webp") ||
          u.pathname.includes("/official/icons/")
        )
          return r.fulfill({
            contentType: "image/png",
            body: Buffer.from(image, "base64"),
          });
        if (u.pathname.endsWith("/official/markers.json"))
          return r.fulfill({ json: fixture });
        if (
          u.pathname.endsWith("current-captures.local.json") ||
          u.pathname.endsWith("providers.local.json") ||
          u.pathname.endsWith("roads.local.json")
        )
          return r.fulfill({
            status: 404,
            body: "Synthetic fixture: optional local capture absent",
          });
        if (u.pathname.startsWith("/maps/"))
          return r.fulfill({
            status: 404,
            body: "Synthetic fixture resources only",
          });
        return r.continue();
      });
      const row = {
        engine: engineName,
        browserVersion: browser.version(),
        origin: base,
        scope: ["map", "safe-runs"],
        fixture:
          "two synthetic official safe records; private point created through real UI",
        steps: [],
      };
      try {
        await main.goto(base + "/");
        await ready(main, "map", "modern");
        await main.locator("#workspace-open").click();
        await main
          .locator("#point-title")
          .fill("Synthetic private rollback point");
        await main.locator("#point-owned").check();
        await main.locator("#save-point").click();
        await main.waitForFunction(
          () =>
            document.querySelector("#point-title")?.value === "" &&
            document
              .querySelector("#workspace-content")
              ?.getAttribute("aria-busy") === "false",
        );
        const original = await history(main),
          parsed = JSON.parse(original);

        assert.equal(parsed.current.revision, 1);
        assert.equal(parsed.current.data.annotations.length, 1);
        assert.equal(parsed.previous, null);
        row.workspace = {
          revision: 1,
          currentAndPreviousSha256: digest(original),
        };
        await main.evaluate(
          ({ local, session }) => {
            for (const [k, v] of Object.entries(local))
              localStorage.setItem(k, v);
            for (const [k, v] of Object.entries(session))
              sessionStorage.setItem(k, v);
          },
          { local: localBytes, session: sessionBytes },
        );
        await main.reload();
        await ready(main, "map", "modern");
        await preserved(main);
        assert.equal(await history(main), original);
        const safe = await context.newPage();
        await safe.goto(base + "/safes.html");
        await ready(safe, "safe-runs", "modern");
        assert.equal(
          await safe
            .locator("#safe-list")
            .getByText("Synthetic private rollback point")
            .count(),
          0,
          "Safe dataset must not read private Main POIs",
        );
        await safe.locator("#select-none").click();
        await safe.locator('[data-safe="official:a"]').check();
        const safeRaw = await safe.evaluate(() =>
          localStorage.getItem("hajin-safe-run-v1"),
        );
        assert(safeRaw);
        const safeState = await safe.evaluate(async () => {
          const { parsePreference } = await import("/src/safe-run/domain.ts");
          return parsePreference(localStorage.getItem("hajin-safe-run-v1"));
        });
        assert.deepEqual(safeState.order, ["official:a"]);
        assert.deepEqual(safeState.known, ["official:a", "official:b"]);
        assert.equal(
          await history(main),
          original,
          "Safe selection must never mutate Main workspace",
        );
        row.safePreferenceSha256 = digest(safeRaw);
        row.initialOwners = {
          main: await main.locator("html").getAttribute("data-ui-adapter"),
          safe: await safe.locator("html").getAttribute("data-ui-adapter"),
        };
        row.displayRecords = {
          local: Object.fromEntries(
            Object.entries(localBytes).map(([key, value]) => [
              key,
              { sha256: digest(value), bytes: Buffer.byteLength(value) },
            ]),
          ),
          session: Object.fromEntries(
            Object.entries(sessionBytes).map(([key, value]) => [
              key,
              { sha256: digest(value), bytes: Buffer.byteLength(value) },
            ]),
          ),
        };
        // sessionStorage belongs to a browsing context; seed independent exact records in Safe too.
        await safe.evaluate((session) => {
          for (const [k, v] of Object.entries(session))
            sessionStorage.setItem(k, v);
        }, sessionBytes);
        for (const variant of ["legacy", "modern"]) {
          process.env.DMZ_UI_VARIANT = variant;
          const beforeVariant = variant === "legacy" ? "modern" : "legacy";
          assert.equal(
            await main.locator("html").getAttribute("data-ui-variant"),
            beforeVariant,
            "Changing server flag cannot mutate existing Main document",
          );
          assert.equal(
            await safe.locator("html").getAttribute("data-ui-variant"),
            beforeVariant,
            "Changing server flag cannot mutate existing Safe document",
          );
          await main.reload();
          await ready(main, "map", variant);
          assert.equal(
            await safe.locator("html").getAttribute("data-ui-variant"),
            beforeVariant,
            "Unreloaded Safe document retains prior owner",
          );
          assert.equal(
            await history(main),
            original,
            "Main rollback must preserve exact current+previous workspace",
          );
          await preserved(main);
          assert.equal(
            await main.evaluate(() =>
              localStorage.getItem("hajin-safe-run-v1"),
            ),
            safeRaw,
            "Main must not rewrite Safe preferences",
          );
          await safe.reload();
          await ready(safe, "safe-runs", variant);
          await preserved(safe);
          assert.equal(
            await safe.evaluate(() =>
              localStorage.getItem("hajin-safe-run-v1"),
            ),
            safeRaw,
            "Safe rollback preserves exact preference bytes",
          );
          assert.equal(
            await safe.locator('[data-safe="official:a"]').isChecked(),
            true,
          );
          assert.equal(
            await safe.locator('[data-safe="official:b"]').isChecked(),
            false,
          );
          assert.equal(
            await history(main),
            original,
            "Safe rollback must not migrate or replay Main writes",
          );
          row.steps.push({
            variant,
            mainOwner: await main
              .locator("html")
              .getAttribute("data-ui-adapter"),
            safeOwner: await safe
              .locator("html")
              .getAttribute("data-ui-adapter"),
            workspaceSha256: digest(await history(main)),
            safePreferenceSha256: digest(
              await safe.evaluate(() =>
                localStorage.getItem("hajin-safe-run-v1"),
              ),
            ),
          });
        }
        assert.deepEqual(errors, []);
        assert.deepEqual(external, []);
        assert.deepEqual(mutations, []);
        row.pass = true;
      } catch (e) {
        row.pass = false;
        row.failure = e.message;
        row.stack = e.stack;
        failures.push({ engine: engineName, message: e.message });
      } finally {
        rows.push(row);
        await context.close();
      }
    } finally {
      await browser.close();
    }
  }
} finally {
  await mkdir(".local", { recursive: true });
  await writeFile(
    ".local/071-ui-rollback.json",
    JSON.stringify(
      {
        scope:
          "Two map surfaces only; Guide/Studio/Manager browser rollback not claimed",
        node: process.version,
        fixtureSha256: digest(JSON.stringify(fixture)),
        createdAt: new Date().toISOString(),
        rows,
        failures,
      },
      null,
      2,
    ),
  );
  await server.close();
}
console.log(JSON.stringify({ engines: rows.length, failures }, null, 2));
assert.deepEqual(
  failures,
  [],
  "Actual server startup rollback must preserve owned state",
);
