// Actual registered map destinations, not an inventory-only claim about all guide/Studio features.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createServer } from "vite";
import { chromium, firefox, webkit } from "playwright";
const repo = path.resolve(process.cwd(), "../..");
const registryPath = path.join(repo, "src/ui/feature-registry.mjs");
const { features } = await import(pathToFileURL(registryPath).href);
const registrySnapshot = JSON.parse(await readFile(path.join(repo, "specs/071-ui-ux-implementation/registry-snapshot.json"), "utf8"));
const destinations = JSON.parse(
  await readFile(path.join(repo, "src/ui/map-destinations.json"), "utf8"),
);
const mapFeatures = features.filter((feature) => feature.kind === "map");
const toolFeatures = mapFeatures.filter((feature) =>
  new URL(feature.path, "http://fixture").searchParams.has("tool"),
);
assert.equal(
  features.length,
  registrySnapshot.count,
  "Registry changed: rebaseline the full feature coverage contract.",
);
assert.equal(mapFeatures.length, 49);
assert.equal(toolFeatures.length, 45);
const plannerTargets = new Set(destinations.planner.map(([target]) => target));
const expectedTabs = {
  planner: "planner",
  health: "health",
  points: "points",
  icons: "icons",
  sources: "sources",
  review: "review",
  backups: "backup",
  explore: "explore",
  duplicates: "explore",
  "saved-views": "explore",
  completeness: "explore",
  discrepancies: "explore",
  backgrounds: "sources",
};
const expectedScopes = {
  explore: "search",
  duplicates: "duplicates",
  "saved-views": "presets",
  completeness: "coverage",
  discrepancies: "flags",
};
const expectedControls = {
  planner: "#new-planned-route",
  health: "#workspace-health",
  points: "#point-form",
  icons: "#icon-studio",
  sources: "#snapshot-file",
  review: "#review-records",
  backups: "#export-workspace",
  backgrounds: "#background-file",
};
process.env.DMZ_UI_VARIANT = "modern";
const base = "http://127.0.0.1:5290",
  returnPath = "/?tool=map&activation-return=1";
const server = await createServer({
  cacheDir: ".local/ui-feature-coverage-071-vite",
  server: { host: "127.0.0.1", port: 5290, strictPort: true, hmr: false },
  define: { "import.meta.env.VITE_LOCAL_PROVIDER_SNAPSHOTS": '"0"' },
});
const report = {
  registryCount: features.length,
  mapCount: mapFeatures.length,
  toolCount: toolFeatures.length,
  registrySha256: createHash("sha256")
    .update(await readFile(registryPath))
    .digest("hex"),
  scope:
    "Actual49map entries including45tool handlers and the X01 surface; does not certify guide/Studio entries",
  results: [],
};
await server.listen();
try {
  for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
    const browser = await engine.launch();
    try {
      const context = await browser.newContext({
          viewport: { width: 1440, height: 1000 },
        }),
        page = await context.newPage(),
        errors = [],
        external = [],
        mutations = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await context.route("**/*", (route) => {
        const request = route.request(),
          url = new URL(request.url());
        if (url.origin !== base) {
          external.push(url.href);
          return route.abort();
        }
        if (!["GET", "HEAD"].includes(request.method())) {
          mutations.push([request.method(), url.pathname]);
          return route.abort();
        }
        return route.continue();
      });
      const image = await page.evaluate(() => {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 128;
        canvas.getContext("2d").fillRect(0, 0, 128, 128);
        return canvas.toDataURL().split(",")[1];
      });
      await context.route("**/maps/hajin/v1/background.webp", (route) =>
        route.fulfill({
          contentType: "image/png",
          body: Buffer.from(image, "base64"),
        }),
      );
      await context.route("**/maps/x01/codcentral/*.webp", (route) =>
        route.fulfill({contentType:"image/png",body:Buffer.from(image,"base64")}),
      );
      await context.route("**/maps/hajin/official/markers.json", (route) =>
        route.fulfill({
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
      await context.route("**/current-captures.local.json", (route) =>
        route.fulfill({
          status: 404,
          contentType: "application/json",
          body: "{}",
        }),
      );
      await context.route("**/providers.local.json", (route) =>
        route.fulfill({ json: { version: 1, sources: [] } }),
      );
      await context.route("**/roads.local.json", (route) =>
        route.fulfill({
          status: 404,
          contentType: "application/json",
          body: "{}",
        }),
      );
      await context.route("**/__map-updates/**", (route) =>
        route.fulfill({
          json: {
            enabled: false,
            reason:
              "Synthetic read-only activation fixture; no collection or mutation job available.",
          },
        }),
      );
      const waitMain = () =>
        page
          .locator(
            'html[data-ui-surface="map"][data-ui-variant="modern"][data-ui-contract="071-v1"][data-ui-mounted="071-v1"][data-ui-adapter="map-pane"]',
          )
          .waitFor({ state: "attached", timeout: 7000 });
      const domain = () =>
        page.evaluate(async () => {
          const { openWorkspace } = await import("/src/workspace/store.ts");
          const store = await openWorkspace();
          try {
            return (await store.read()).current;
          } finally {
            store.close();
          }
        });
      await page.goto(base + returnPath);
      await waitMain();
      const seeded = await page.evaluate(async () => {
        const { openWorkspace } = await import("/src/workspace/store.ts");
        const { emptyWorkspace, asJson } = await import(
          "/src/workspace/model.ts"
        );
        const store = await openWorkspace();
        try {
          const before = (await store.read()).current;
          return before ?? (await store.commit(asJson(emptyWorkspace()), 0));
        } finally {
          store.close();
        }
      });
      await page.reload();
      await waitMain();
      assert.deepEqual(await domain(), seeded);
      for (const feature of mapFeatures) {
        const target = new URL(feature.path, base).searchParams.get("tool");
        const startErrors = errors.length,
          startExternal = external.length,
          startMutations = mutations.length;
        const result = {
          engine: name,
          id: feature.id,
          path: feature.path,
          target,
          outcome: "pending",
        };
        try {
          await page.goto(base + feature.path);
          await page.waitForLoadState("domcontentloaded");
          if (feature.id === "x01-map") {
            await page.locator("#x01-map").waitFor({state:"visible",timeout:7000});
            assert(await page.locator("#x01-controls").isVisible());
            assert(await page.locator("#x01-details").isVisible());
            result.owner = "x01-floor-map";
          } else if (feature.id === "safe-runs") {
            await page
              .locator(
                'html[data-ui-surface="safe-runs"][data-ui-variant="modern"][data-ui-contract="071-v1"][data-ui-mounted="071-v1"][data-ui-adapter="safe-run-layout"]',
              )
              .waitFor({ state: "attached", timeout: 7000 });
            assert(await page.locator("#safe-controls").isVisible());
            assert(await page.locator("#safe-search").isVisible());
            assert.equal(await page.locator("#workspace-dialog").count(), 0);
            result.owner = "safe-run-layout";
          } else if (feature.id === "map-help") {
            await page
              .locator(
                'html[data-ui-surface="map"][data-ui-variant="modern"][data-ui-contract="071-v1"][data-ui-shell-mounted="071-v1"]',
              )
              .waitFor({ state: "attached", timeout: 7000 });
            assert.equal(
              await page.locator("#guide h1").textContent(),
              "How to use your map",
            );
            assert.equal(await page.locator("#map").count(), 0);
            assert.equal(await page.locator("#workspace-dialog").count(), 0);
            assert(
              (await page.locator('#guide a[href*="?tool="]').count()) > 0,
            );
            result.owner = "static-map-help";
          } else {
            await waitMain();
            if (!target || target === "map") {
              assert(await page.locator("#map").isVisible());
              await page
                .locator('#map[data-ui-tool-target="map"]')
                .waitFor({ state: "visible", timeout: 2500 });
              result.owner = "map-canvas";
            } else if (["key", "layers", "grid", "updates"].includes(target)) {
              const owner = page.locator(
                `#map-key[data-ui-tool-target="${target}"]`,
              );
              await owner.waitFor({ state: "visible", timeout: 2500 });
              const control =
                target === "grid"
                  ? "#show-coordinate-grid"
                  : target === "updates"
                    ? "#map-source-updates"
                    : "#key-show-all";
              assert(await owner.locator(control).isVisible());
              assert.equal(
                await page
                  .locator("#workspace-dialog")
                  .evaluate((node) => node.open),
                false,
              );
              result.owner = "map-key";
            } else {
              const owner = page.locator(
                `#workspace-dialog[data-ui-tool-target="${target}"]`,
              );
              await owner.waitFor({ state: "visible", timeout: 2500 });
              assert.equal(
                await owner.evaluate((node) => node.matches(":modal")),
                false,
              );
              const body = owner.locator("#workspace-content");
              assert(
                (await body.innerText()).trim().length > 30,
                "Mounted tool must contain its actual nonempty body",
              );
              assert(
                (await body
                  .locator("input,button,select,textarea,a[href]")
                  .count()) > 0,
              );
              if (plannerTargets.has(target)) {
                assert.equal(
                  await owner.locator("#planner-section-select").inputValue(),
                  target,
                );
                assert(
                  (await owner
                    .locator(
                      `[data-planner-section="${target}"][aria-current="true"]`,
                    )
                    .count()) > 0,
                );
                assert.equal(
                  await owner
                    .locator("#workspace-tab-planner")
                    .getAttribute("aria-current"),
                  "true",
                );
              } else {
                assert.equal(
                  await owner
                    .locator(`#workspace-tab-${expectedTabs[target]}`)
                    .getAttribute("aria-current"),
                  "true",
                );
                if (expectedScopes[target])
                  assert.equal(
                    await owner
                      .locator(`#explore-${expectedScopes[target]}`)
                      .getAttribute("aria-current"),
                    "true",
                  );
                if (expectedControls[target])
                  assert(
                    await owner.locator(expectedControls[target]).isVisible(),
                  );
              }
              result.owner = "workspace:" + target;
            }
          }
          assert.deepEqual(
            await domain(),
            seeded,
            "Nonmutating feature admission must preserve exact seeded domain revision/data",
          );
          assert.deepEqual(errors.slice(startErrors), []);
          assert.deepEqual(external.slice(startExternal), []);
          assert.deepEqual(mutations.slice(startMutations), []);
          await page.goBack();
          await page.waitForURL(base + returnPath, { timeout: 7000 });
          await waitMain();
          assert.deepEqual(
            await domain(),
            seeded,
            "Native Back must not mutate domain",
          );
          result.outcome = "pass";
        } catch (error) {
          result.outcome = "fail";
          result.error = String(error.message).slice(0, 1800);
          await page.goto(base + returnPath);
          await waitMain();
        }
        report.results.push(result);
        console.log(
          `${name} ${feature.id} ${result.outcome}${result.error ? " " + result.error.split("\n")[0] : ""}`,
        );
      }
      assert.deepEqual(external, []);
      assert.deepEqual(mutations, []);
      await context.close();
    } finally {
      await browser.close();
    }
  }
} finally {
  await server.close();
  await mkdir(".local", { recursive: true });
  await writeFile(
    ".local/ui-feature-coverage-map.json",
    JSON.stringify(report, null, 2),
  );
}
const failed = report.results.filter((result) => result.outcome !== "pass");
console.log(
  `Actual map activation: ${report.results.length - failed.length}/${report.results.length} pass; registry inventory ${report.registryCount} (only ${report.mapCount}map entries tested per engine)`,
);
assert.equal(
  failed.length,
  0,
  "Actual map-handler coverage has failures; see .local/ui-feature-coverage-map.json",
);
