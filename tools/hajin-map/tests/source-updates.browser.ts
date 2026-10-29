import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { sourcePolicies } from "../src/workspace/policy.ts";
import { hajin } from "../src/map/hajin.ts";
export async function runSourceUpdatesBrowser(parent, fixture) {
  const { createServer } = await import("vite");
  const server = await createServer({
    define: { "import.meta.env.VITE_LOCAL_PROVIDER_SNAPSHOTS": '"1"' },
    server: { host: "127.0.0.1", port: 5279, strictPort: true, hmr: false },
  });
  await server.listen();
  const context = await parent
      .context()
      .browser()
      .newContext({ viewport: { width: 1440, height: 1000 } }),
    base = "http://127.0.0.1:5279",
    errors = [],
    external = [],
    calls = [];
  const hash = (v) => createHash("sha256").update(v).digest("hex");
  const ids = ["official", "codmunity", "wzstats", "codcentral", "mapgenie"];
  const gen = "12345678-1234-4123-8123-123456789abc";
  const captures = {};
  let round = 0,
    activationFails = false,
    slow = false,
    noProviders = false,
    contentChange = false,
    reserveGate,
    reserveSeen;
  for (const id of ids) {
    const root = `/maps/hajin/${id === "official" ? "official" : `providers/${id}`}/`;
    const raw = structuredClone(fixture.snapshot);
    raw.sourcePage = sourcePolicies[id].page;
    raw.categories.forEach((c) => (c.icon = root + "icons/test.png"));
    raw.records = raw.records.slice(0, 2).map((r) => ({
      ...r,
      name: `Synthetic ${id} ${r.name}`,
      floor: "upper",
    }));
    const snapshot = JSON.stringify(raw),
      evidence = JSON.stringify({
        snapshotDigest: hash(snapshot),
        registrationVersion: "reviewed-affine-v1",
        registration: { canonicalDigest: hajin.provenance.sha256 },
      });
    captures[id] = {
      raw,
      snapshot,
      evidence,
      snapshotDigest: hash(snapshot),
      registrationDigest: hash(evidence),
    };
  }
  const latest = {};
  let job;
  const makeJob = () => {
    round++;
    const outcomes = ids.map((id) => {
      const root = `/maps/hajin/captures/${gen}/${id}/`;
      const raw = structuredClone(captures[id].raw);
      if (contentChange)
        raw.records[0].notes = "Synthetic changed source claim";
      raw.capturedAt = new Date(Date.UTC(2026, 9, 28, 1, round)).toISOString();
      raw.categories.forEach((c) => (c.icon = root + "icons/test.png"));
      raw.records.push({
        ...raw.records[0],
        id: "update-new",
        name: "Synthetic new " + id,
        x: 0.85,
      });
      latest[id] = JSON.stringify(raw);
      return {
        id,
        status: round === 1 ? "updated" : "unchanged",
        descriptor: {
          id,
          generation: gen,
          snapshot: root + "markers.json",
          snapshotDigest: hash(latest[id]),
          iconDirectory: root + "icons/",
          semanticDigest: hash(id + (contentChange ? "-new" : "")),
        },
        diff: {
          added: round === 1 ? 1 : 0,
          changed: 0,
          missing: 0,
          categoriesChanged: false,
        },
        warnings: [],
      };
    });
    return { id: gen, state: slow ? "collecting" : "ready", outcomes };
  };
  await context.route("**/*", async (route) => {
    const request = route.request(),
      u = new URL(request.url());
    if (u.origin !== base) {
      external.push(u.href);
      return route.abort();
    }
    if (u.pathname.startsWith("/__map-updates")) {
      calls.push(u.pathname);
      if (u.pathname.endsWith("/reserve") && reserveGate) {
        reserveSeen();
        await reserveGate;
      }
      if (u.pathname.endsWith("/capabilities"))
        return route.fulfill({
          json: { enabled: true, token: "synthetic-token" },
        });
      if (u.pathname.endsWith("/prepare")) {
        job = makeJob();
        return route.fulfill({ json: job });
      }
      if (u.pathname.endsWith("/activate") && activationFails)
        return route.fulfill({
          status: 409,
          json: { error: "Synthetic file activation failed" },
        });
      if (u.pathname.endsWith("/cancel"))
        return route.fulfill({ json: { ...job, state: "cancelled" } });
      if (u.pathname.endsWith("/jobs"))
        return route.fulfill({ json: { jobs: [] } });
      return route.fulfill({
        json: { ...job, state: slow ? "collecting" : "ready" },
      });
    }
    if (u.pathname.endsWith("current-captures.local.json"))
      return route.fulfill({ status: 404, body: "Synthetic no pointer" });
    if (u.pathname.endsWith("providers.local.json") && noProviders)
      return route.fulfill({ status: 404, body: "Synthetic no providers" });
    if (u.pathname.endsWith("providers.local.json"))
      return route.fulfill({
        json: {
          version: 1,
          sources: ids.slice(1).map((id) => ({
            id,
            authorization: "SYNTHETIC permission",
            canonicalDigest: hajin.provenance.sha256,
            rms: 1,
            maxError: 2,
            heldOut: 3,
            snapshotDigest: captures[id].snapshotDigest,
            registrationDigest: captures[id].registrationDigest,
          })),
        },
      });
    if (u.pathname.endsWith("provenance.local.json"))
      return route.fulfill({
        contentType: "application/json",
        body: captures[u.pathname.split("/").at(-2)].evidence,
      });
    if (u.pathname.endsWith("markers.json")) {
      const id = u.pathname.split("/").at(-2);
      return route.fulfill({
        contentType: "application/json",
        body: u.pathname.includes("/captures/")
          ? latest[id]
          : captures[id].snapshot,
      });
    }
    if (
      u.pathname.endsWith("background.webp") ||
      u.pathname.includes("/icons/")
    )
      return route.fulfill({ body: fixture.image, contentType: "image/png" });
    return route.continue();
  });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  page.setDefaultNavigationTimeout(15000);
  page.on("pageerror", (e) => errors.push(e.message));
  const read = () =>
    page.evaluate(async () => {
      const { openWorkspace } = await import("/src/workspace/store.ts");
      const db = await openWorkspace();
      try {
        return (await db.read()).current?.data;
      } finally {
        db.close();
      }
    });
  const open = async () => {
    await page.goto(base);
    await page.locator("#workspace-open:enabled").waitFor();
    await page.locator("#toggle-key").click();
    await page.locator("#key-loaded-source-master-codcentral").waitFor();
    await page.locator("#update-map-sources:enabled").waitFor();
  };
  const check = async () => {
    await page.locator("#update-map-sources").click();
    await page.locator("#map-update-preview").waitFor();
    assert.ok(await page.locator("[data-source-changes]").count()>0);
  };
  const close = async () => {
    if (await page.locator("#workspace-dialog").evaluate((d) => d.open)) {
      await page.locator("#cancel-workspace-draft").click();
      await page.keyboard.press("Escape");
    }
  };
  try {
    await open();
    assert.equal(calls.filter((c) => c.endsWith("/prepare")).length, 0);
    for (const id of ids) {
      const link = page.locator("#key-source-link-" + id);
      assert.equal(await link.getAttribute("href"), sourcePolicies[id].page);
      assert.equal(await link.getAttribute("target"), "_blank");
      assert.match(await link.getAttribute("rel"), /noopener/);
      const master = page.locator("#key-loaded-source-master-" + id),
        before = await master.isChecked();
      await link.evaluate((a) =>
        a.addEventListener("click", (e) => e.preventDefault()),
      );
      await link.click();
      assert.equal(await master.isChecked(), before);
    }
    const mapgenieCount = () =>
      page.locator('[data-source-id="mapgenie"]').count();
    assert.equal(await mapgenieCount(), 2);
    await page.locator("#key-loaded-source-master-mapgenie").uncheck();
    assert.equal(await mapgenieCount(), 0);
    assert.equal(await page.locator('[data-source-id="official"]').count(), 2);
    await page.locator("#key-loaded-source-master-mapgenie").check();
    const ownCategory = page
      .locator('[data-key-source="mapgenie"] [data-key-category]:enabled')
      .first();
    const hiddenCategory = await ownCategory.getAttribute("data-key-category");
    await ownCategory.uncheck();
    assert.equal(
      await mapgenieCount(),
      captures.mapgenie.raw.records.filter((r) => r.category !== hiddenCategory)
        .length,
    );
    await ownCategory.check();
    assert.equal(await mapgenieCount(), 2);
    await page.waitForTimeout(500);
    const originalMapgenie = captures.mapgenie.snapshot;
    const duplicate = structuredClone(captures.mapgenie.raw);
    duplicate.records.forEach(
      (r, i) => (r.name = captures.official.raw.records[i].name),
    );
    captures.mapgenie.snapshot = JSON.stringify(duplicate);
    captures.mapgenie.snapshotDigest = hash(captures.mapgenie.snapshot);
    captures.mapgenie.evidence = JSON.stringify({
      snapshotDigest: captures.mapgenie.snapshotDigest,
      registrationVersion: "reviewed-affine-v1",
      registration: { canonicalDigest: hajin.provenance.sha256 },
    });
    captures.mapgenie.registrationDigest = hash(captures.mapgenie.evidence);
    await open();
    assert.equal(await mapgenieCount(), 0);
    assert.ok(
      (await page
        .locator('[data-key-source="mapgenie"] .duplicate-details-button')
        .count()) > 0,
    );
    await page.locator("#key-loaded-source-master-official").uncheck();
    assert.equal(await mapgenieCount(), 2);
    await page.locator("#key-loaded-source-master-official").check();
    assert.equal(await mapgenieCount(), 0);
    await page.waitForTimeout(500);
    captures.mapgenie.snapshot = originalMapgenie;
    captures.mapgenie.snapshotDigest = hash(originalMapgenie);
    captures.mapgenie.evidence = JSON.stringify({
      snapshotDigest: captures.mapgenie.snapshotDigest,
      registrationVersion: "reviewed-affine-v1",
      registration: { canonicalDigest: hajin.provenance.sha256 },
    });
    captures.mapgenie.registrationDigest = hash(captures.mapgenie.evidence);
    await open();
    assert.equal(await mapgenieCount(), 2);
    // Seed real private metadata in the same isolated synthetic origin.
    await page.evaluate(async () => {
      const { openWorkspace } = await import("/src/workspace/store.ts"),
        { emptyWorkspace } = await import("/src/workspace/model.ts"),
        { makeAnnotation } = await import("/src/workspace/annotations.ts"),
        { emptyUsability } = await import("/src/workspace/usability.ts");
      const db = await openWorkspace();
      try {
        const old = await db.read(),
          s = old.current?.data ?? emptyWorkspace();
        s.annotations.push(
          makeAnnotation({
            kind: "POI",
            title: "Synthetic private point",
            category: "Custom",
            x: 123,
            y: 234,
            notes: "Private test note",
            evidence: "Synthetic",
            verificationState: "unverified",
            applicability: {
              mapId: "hajin",
              coordinateVersion: "hajin-official-v1-4096",
              gameBuild: null,
              floor: null,
            },
            iconId: null,
          }),
        );
        s.usability = emptyUsability();
        await db.commit(s, old.current?.revision ?? 0);
      } finally {
        db.close();
      }
    });
    await open();
    await check();
    assert.equal(await page.locator("#map-update-preview h4").count(), 5);
    activationFails = true;
    await page.locator("#apply-map-update").click();
    await page.locator("#resume-map-update").waitFor();
    await page.waitForFunction(() =>
      document
        .querySelector("#map-source-updates")
        .textContent.includes("activation is pending"),
    );
    let state = await read();
    assert.equal(state.snapshots.length, 5);
    assert.equal(state.annotations[0].notes, "Private test note");
    assert.equal(
      state.snapshots[0].snapshot.records[0].applicability.floor,
      "upper",
    );
    const snapshots = JSON.stringify(state.snapshots);
    await open();
    activationFails = false;
    await page.locator("#resume-map-update").click();
    await page.locator("#retry-map-activation").click();
    await page.waitForFunction(
      () => document.querySelector("#resume-map-update").hidden,
    );
    assert.equal(JSON.stringify((await read()).snapshots), snapshots);
    await check();
    assert.match(
      await page.locator("#map-update-preview").textContent(),
      /capture will be reused/,
    );
    let releaseReserve;
    const reserveEntered = new Promise((r) => (reserveSeen = r));
    reserveGate = new Promise((r) => (releaseReserve = r));
    await page.locator("#apply-map-update").click();
    await reserveEntered;
    assert.equal(
      await page.locator("#cancel-workspace-draft").isDisabled(),
      true,
    );
    await page.locator("#close-workspace").click();
    await page.keyboard.press("Escape");
    assert.equal(
      await page.locator("#workspace-dialog").evaluate((d) => d.open),
      true,
    );
    releaseReserve();
    reserveGate = null;
    await page.waitForFunction(
      () => !document.querySelector("#workspace-dialog").open,
    );
    state = await read();
    assert.equal(state.snapshots.length, 5);
    assert.equal(state.annotations.length, 1);
    // Failed recovery metadata must cancel the reservation before touching workspace.
    await check();
    await page.evaluate(() => {
      window.originalStorageSet = Storage.prototype.setItem;
      Storage.prototype.setItem = function (k, v) {
        if (k === "hajin-source-update-pending-v1")
          throw Error("Synthetic receipt quota");
        return window.originalStorageSet.call(this, k, v);
      };
    });
    const activationCount = calls.filter((c) => c.endsWith("/activate")).length,
      cancelCount = calls.filter((c) => c.endsWith("/cancel")).length;
    await page.locator("#apply-map-update").click();
    await page.waitForTimeout(300);
    assert.equal(
      calls.filter((c) => c.endsWith("/activate")).length,
      activationCount,
    );
    assert.equal(
      calls.filter((c) => c.endsWith("/cancel")).length,
      cancelCount + 1,
    );
    await page.evaluate(
      () => (Storage.prototype.setItem = window.originalStorageSet),
    );
    await close();
    slow = true;
    await page.locator("#update-map-sources").click();
    await page.locator("#cancel-map-update").waitFor();
    await page.locator("#cancel-map-update").click();
    await page.locator("#update-map-sources:enabled").waitFor();
    assert.equal((await read()).snapshots.length, 5);
    slow = false;
    await page.setViewportSize({ width: 360, height: 800 });
    await page.locator("#toggle-key").click();
    await page.locator("#update-map-sources").focus();
    await page.keyboard.press("Enter");
    await page.locator("#map-update-preview").waitFor();
    assert.ok(await page.locator("#apply-map-update").isVisible());
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await page.screenshot({
      path: ".local/browser-checks/synthetic-source-update-mobile.png",
    });
    await close();
    await page.evaluate(() =>
      localStorage.setItem("hajin-source-update-pending-v1", "{broken"),
    );
    await open();
    await page.locator("#discard-map-update-receipt").waitFor();
    await page.locator("#discard-map-update-receipt").click();
    assert.equal(
      await page.locator("#discard-map-update-receipt").isVisible(),
      false,
    );
    assert.equal((await read()).snapshots.length, 5);
    noProviders = true;
    await page.evaluate(async () => {
      const { openWorkspace } = await import("/src/workspace/store.ts"),
        { emptyWorkspace } = await import("/src/workspace/model.ts");
      const db = await openWorkspace();
      try {
        const old = await db.read();
        await db.commit(emptyWorkspace(), old.current.revision);
      } finally {
        db.close();
      }
    });
    await page.goto(base);
    await page.locator("#workspace-open:enabled").waitFor();
    await page.locator("#toggle-key").click();
    await page.locator("#update-map-sources:enabled").waitFor();
    assert.equal(
      await page.locator("#key-loaded-source-master-codmunity").count(),
      0,
    );
    await check();
    await page.locator("#apply-map-update").click();
    await page.waitForFunction(
      () => !document.querySelector("#workspace-dialog").open,
    );
    await page.locator("#key-loaded-source-master-codmunity").waitFor();
    assert.equal(await page.locator("[data-workspace-provider]").count(), 0);
    assert.equal((await read()).snapshots.length, 5);
    // A workspace transaction failure must leave both the old workspace and server activation untouched.
    contentChange = true;
    await check();
    const activationsBeforeQuota = calls.filter((c) =>
      c.endsWith("/activate"),
    ).length;
    await page.evaluate(() => {
      window.originalIDBPut = IDBObjectStore.prototype.put;
      IDBObjectStore.prototype.put = function (value, key) {
        if (this.name === "state" && key === "current")
          throw new DOMException(
            "Synthetic update quota",
            "QuotaExceededError",
          );
        return window.originalIDBPut.call(this, value, key);
      };
    });
    await page.locator("#apply-map-update").click();
    await page.waitForFunction(() =>
      document
        .querySelector("#workspace-message")
        .textContent.includes("Synthetic update quota"),
    );
    assert.equal(
      calls.filter((c) => c.endsWith("/activate")).length,
      activationsBeforeQuota,
    );
    assert.equal((await read()).snapshots.length, 5);
    await page.evaluate(
      () => (IDBObjectStore.prototype.put = window.originalIDBPut),
    );
    await page.goto(base);
    await page.locator("#workspace-open:enabled").waitFor();
    await page.locator("#toggle-key").click();
    await page.locator("#resume-map-update").click();
    assert.match(
      await page.locator("#map-update-recovery").textContent(),
      /save did not finish/,
    );
    await page.locator("#dismiss-map-update").click();
    await close();
    assert.equal((await read()).snapshots.length, 5);
    // Five individually valid5000-record captures must not overflow the shared20k view pipeline.
    noProviders = false;
    for (const id of ids) {
      const large = structuredClone(captures[id].raw);
      large.records = Array.from({ length: 5000 }, (_, i) => ({
        ...large.records[0],
        id: `synthetic-large-${id}-${i}`,
        name: `SYNTHETIC limit ${id} ${i}`,
        x: 0.2 + (i % 100) * 0.006,
        y: 0.2 + Math.floor(i / 100) * 0.006,
      }));
      captures[id].snapshot = JSON.stringify(large);
      captures[id].snapshotDigest = hash(captures[id].snapshot);
      captures[id].evidence = JSON.stringify({
        snapshotDigest: captures[id].snapshotDigest,
        registrationVersion: "reviewed-affine-v1",
        registration: { canonicalDigest: hajin.provenance.sha256 },
      });
      captures[id].registrationDigest = hash(captures[id].evidence);
    }
    await page.evaluate(async (ids) => {
      const { openWorkspace } = await import("/src/workspace/store.ts"),
        { emptyWorkspace } = await import("/src/workspace/model.ts");
      const db = await openWorkspace();
      try {
        const old = await db.read(),
          s = emptyWorkspace();
        s.migrations.push("source-masks-v1");
        for (const id of ids) s.visibility.sourceEnabled[id] = false;
        await db.commit(s, old.current.revision);
      } finally {
        db.close();
      }
    }, ids);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(base);
    await page.locator("#workspace-open:enabled").waitFor({ timeout: 60000 });
    await page
      .locator('[data-key-source="mapgenie"] [data-source-capacity]')
      .waitFor({ timeout: 60000 });
    assert.match(
      await page.locator("#key-summary").textContent(),
      /25000.*view limit/,
    );
    assert.equal(await page.locator('[data-source-id="mapgenie"]').count(), 0);
    assert.equal(
      await page.locator("#key-loaded-source-master-mapgenie").isEnabled(),
      true,
    );
    await page.locator("#key-loaded-source-master-mapgenie").check();
    await page.waitForFunction(
      () =>
        document.querySelectorAll('[data-source-id="mapgenie"]').length ===
        5000,
      {},
      { timeout: 60000 },
    );
    assert.equal(
      await page
        .locator('[data-key-source="mapgenie"] [data-source-capacity]')
        .count(),
      0,
    );
    assert.equal(await page.locator('[data-source-id="official"]').count(), 0);
    // Turning this source off replaces its checkbox with the capacity notice.
    // Verify the before/after state without asking uncheck() to re-read a removed control.
    const mapgenieMaster=page.locator("#key-loaded-source-master-mapgenie");
    assert.equal(await mapgenieMaster.isChecked(),true);
    await mapgenieMaster.click();
    await page
      .locator('[data-key-source="mapgenie"] [data-source-capacity]')
      .waitFor();
    assert.equal(await page.locator('[data-source-id="mapgenie"]').count(), 0);
    assert.equal(
      await page.locator("#key-source-link-mapgenie").textContent(),
      "MapGenie",
    );
    assert.deepEqual(errors, []);
    assert.deepEqual(external, []);
    return [
      "source names link to five registered maps without toggling website masters",
      "Map key updates preview/apply five staged captures and preserve private points/string floors",
      "pending activation survives reload and retries without importing captures again",
      "unchanged updates reuse immutable workspace snapshots without duplicate markers",
      "receipt storage failure cancels reservation; cancellation preserves active workspace",
      "360px keyboard update preview fits without horizontal overflow",
      "delayed Apply locks cancel/close/Escape; damaged receipts have explicit recovery",
      "official-only startup gains live provider icons/masters after Update",
      "failed workspace quota transaction retains prior captures and never activates source files",
      "MapGenie has independent master/category masks, comparison stars and official-copy fallback",
      "five5000-record raw captures preserve20k view admission and recover when website selection changes",
    ];
  } finally {
    await context.close();
    await server.close();
  }
}
