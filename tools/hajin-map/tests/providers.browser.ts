import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { hajin } from "../src/map/hajin.ts";
import { sourcePolicies } from "../src/workspace/policy.ts";
export async function runProviderBrowser(parent) {
  const { createServer } = await import("vite");
  const server = await createServer({
    define: { "import.meta.env.VITE_LOCAL_PROVIDER_SNAPSHOTS": '"1"' },
    server: { host: "127.0.0.1", port: 5277, strictPort: true, hmr: false },
  });
  const context = await parent.context().browser().newContext();
  const errors = [],
    external = [];
  try {
    await server.listen();
    const base = "http://127.0.0.1:5277",
      ids = ["official", "codmunity", "wzstats", "codcentral"];
    const hash = (text) => createHash("sha256").update(text).digest("hex");
    const captures = Object.fromEntries(
      ids.map((id) => {
        const root =
          id === "official"
            ? "/maps/hajin/official/"
            : "/maps/hajin/providers/" + id + "/";
        const snapshot = JSON.stringify({
          schemaVersion: 1,
          sourcePage: sourcePolicies[id].page,
          capturedAt: "2026-10-26T00:00:00.000Z",
          categories: ["a", "b"].map((c) => ({
            id: c,
            name: "SYNTHETIC " + c,
            group: "Synthetic group",
            icon: root + "icons/" + c + ".svg",
          })),
          records: ["a", "b"].map((c, i) => ({
            id: "same-" + c,
            name: "SYNTHETIC " + id + " " + c,
            category: c,
            mapId: "hajin",
            coordinateSpaceVersion: hajin.coordinateSpaceVersion,
            x: 0.3 + i * 0.2,
            y: 0.4,
          })),
        });
        const snapshotDigest = hash(snapshot),
          evidence = JSON.stringify({
            snapshotDigest,
            registrationVersion: "reviewed-affine-v1",
            registration: { canonicalDigest: hajin.provenance.sha256 },
          });
        return [
          id,
          {
            snapshot,
            evidence,
            snapshotDigest,
            registrationDigest: hash(evidence),
          },
        ];
      }),
    );
    await context.route("**/*", async (route) => {
      const url = new URL(route.request().url());
      if (url.origin !== base) {
        external.push(url.href);
        return route.abort();
      }
      if (url.pathname.endsWith("providers.local.json"))
        return route.fulfill({
          json: {
            version: 1,
            sources: ids.slice(1).map((id) => ({
              id,
              authorization: "SYNTHETIC authorized capture",
              canonicalDigest: hajin.provenance.sha256,
              rms: 1,
              maxError: 2,
              heldOut: 3,
              snapshotDigest: captures[id].snapshotDigest,
              registrationDigest: captures[id].registrationDigest,
            })),
          },
        });
      if (url.pathname.endsWith("provenance.local.json"))
        return route.fulfill({
          contentType: "application/json",
          body: captures[url.pathname.split("/").at(-2)].evidence,
        });
      if (url.pathname.endsWith("markers.json"))
        return route.fulfill({
          contentType: "application/json",
          body: captures[url.pathname.split("/").at(-2)].snapshot,
        });
      if (url.pathname.endsWith("background.webp"))
        return route.fulfill({
          contentType: "image/png",
          body: Buffer.from(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aV1sAAAAASUVORK5CYII=",
            "base64",
          ),
        });
      if (url.pathname.includes("/icons/"))
        return route.fulfill({
          contentType: "image/svg+xml",
          body: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="white"/></svg>',
        });
      return route.continue();
    });
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    const count = (id) => page.locator(`[data-source-id="${id}"]`).count();
    await page.goto(base);
    await page.locator("#workspace-open:enabled").waitFor();
    await page.waitForFunction(
      () => document.querySelectorAll("[data-source-marker-id]").length === 8,
    );
    assert.equal(await page.locator("[data-workspace-provider]").count(), 0);
    await page.locator("#key-loaded-source-master-codcentral").uncheck();
    assert.equal(await count("codcentral"), 0);
    assert.equal(await count("wzstats"), 2);
    await page.locator("#key-loaded-source-master-codcentral").check();
    assert.equal(await count("codcentral"), 2);
    await page.locator("#layers").click();
    await page.locator("#codmunity-visible").uncheck();
    assert.equal(await count("codmunity"), 0);
    assert.equal(await count("wzstats"), 2);
    assert.equal(await count("codcentral"), 2);
    await page.waitForTimeout(800);
    await page.reload();
    await page.locator("#workspace-open:enabled").waitFor();
    await page.waitForFunction(
      () => document.querySelectorAll("[data-source-marker-id]").length === 6,
    );
    assert.equal(await count("codmunity"), 0);
    await page.locator("#toggle-key").click();
    await page
      .locator('[data-key-source="wzstats"] [data-key-category="a"]')
      .uncheck();
    assert.equal(await count("wzstats"), 1);
    assert.equal(await count("codcentral"), 2);
    await page.locator("#key-show-all").click();
    await page.waitForFunction(
      () => document.querySelectorAll("[data-source-marker-id]").length === 8,
    );
    await page.locator("#key-hide-all").click();
    await page.waitForFunction(
      () => document.querySelectorAll("[data-source-marker-id]").length === 0,
    );
    await page.waitForTimeout(700);
    await page.reload();
    await page.locator("#workspace-open:enabled").waitFor();
    await page.waitForTimeout(300);
    assert.equal(await page.locator("[data-source-marker-id]").count(), 0);
    const duplicateSnapshot = JSON.parse(captures.codcentral.snapshot);
    duplicateSnapshot.records.forEach((r, i) => {
      r.name = JSON.parse(captures.official.snapshot).records[i].name;
    });
    captures.codcentral.snapshot = JSON.stringify(duplicateSnapshot);
    captures.codcentral.snapshotDigest = hash(captures.codcentral.snapshot);
    captures.codcentral.evidence = JSON.stringify({
      snapshotDigest: captures.codcentral.snapshotDigest,
      registrationVersion: "reviewed-affine-v1",
      registration: { canonicalDigest: hajin.provenance.sha256 },
    });
    captures.codcentral.registrationDigest = hash(captures.codcentral.evidence);
    await page.reload();
    await page.locator("#workspace-open:enabled").waitFor();
    await page.locator("#key-show-all").click();
    await page.waitForFunction(
      () => document.querySelectorAll("[data-source-marker-id]").length === 6,
    );
    assert.equal(await count("official"), 2);
    assert.equal(await count("codcentral"), 0);
    assert.equal(
      await page
        .locator('[data-key-source="codcentral"] [data-duplicate-count="1"]')
        .count(),
      2,
    );
    await page
      .locator('[data-key-source="codcentral"] .duplicate-details-button')
      .first()
      .click();
    assert.ok(
      (await page.locator("#explore-panel").textContent()).includes("distance"),
    );
    await page.locator("#close-workspace").click();
    await page.locator("#show-duplicate-markers").check();
    await page.waitForFunction(
      () => document.querySelectorAll("[data-source-marker-id]").length === 8,
    );
    await page.locator("#show-duplicate-markers").uncheck();
    await page.locator("#key-loaded-source-master-official").uncheck();
    assert.equal(await count("official"), 0);
    assert.equal(await count("codcentral"), 2);
    await page.locator("#key-loaded-source-master-official").check();
    assert.equal(await count("codcentral"), 0);
    await page.locator("#key-hide-all").click();
    await page.waitForTimeout(500);
    const originalCapture = captures.wzstats.snapshot;
    captures.wzstats.snapshot += " ";
    await page.reload();
    await page.locator("#retry-wzstats").waitFor({ state: "attached" });
    assert.equal(await count("wzstats"), 0);
    captures.wzstats.snapshot = originalCapture;
    await page.locator("#layers").click();
    await page.locator("#retry-wzstats").click();
    await page.locator("#wzstats-visible").waitFor({ state: "attached" });
    await page.locator("#close-layers").click();
    await page.locator("#workspace-open").click();
    await page.locator("#workspace-tab-sources").click();
    for (const id of ids.slice(1)) {
      await page.locator(`#preview-loaded-${id}`).click();
      await page
        .getByLabel(
          "I reviewed the exact official frame identity and want to accept that registration.",
        )
        .check();
      await page.locator("#commit-snapshot").click();
      await page.waitForFunction(
        () =>
          document.querySelector("#workspace-message")?.textContent ===
          "Snapshot imported",
      );
    }
    const promoted = await page.evaluate(async () => {
      const { openWorkspace } = await import("/src/workspace/store.ts");
      const store = await openWorkspace();
      try {
        return (await store.read()).current.data.snapshots.map((e) => ({
          id: e.snapshot.sourceId,
          records: e.snapshot.records.length,
          lineages: e.snapshot.records[0].upstreamRefs,
        }));
      } finally {
        store.close();
      }
    });
    assert.deepEqual(promoted.map((s) => s.id).sort(), ids.slice(1).sort());
    assert.ok(
      promoted.every((s) => s.records === 2 && s.lineages.length === 0),
    );
    await page.locator("#close-workspace").click();
    await page.locator("#key-show-all").click();
    await page.waitForFunction(() =>
      document
        .querySelector("#key-summary")
        ?.textContent.startsWith("6 / 8 raw source locations"),
    );
    assert.deepEqual(errors, []);
    assert.deepEqual(external, []);
    return [
      "four authorized local source captures retain independent masks/icons, counts, global selection and reload persistence offline",
      "duplicate source copies are starred and hidden by default, can be inspected, and fall back when the official source is deselected",
    ];
  } finally {
    await context.close();
    await server.close();
  }
}
