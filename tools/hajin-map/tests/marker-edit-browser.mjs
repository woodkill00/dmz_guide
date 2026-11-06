import assert from "node:assert/strict";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";
import { mkdir } from "node:fs/promises";
import { chromium, firefox, webkit } from "playwright";
process.env.DMZ_UI_VARIANT = "modern";
const root = fileURLToPath(new URL("../", import.meta.url));
const server = await createServer({
  root,
  cacheDir: root + "/.local/marker-edit-vite",
  server: { host: "127.0.0.1", port: 0, hmr: false },
  define: { "import.meta.env.VITE_LOCAL_PROVIDER_SNAPSHOTS": '"0"' },
});
await server.listen();
const base = "http://127.0.0.1:" + server.httpServer.address().port;
await mkdir(".local/marker-edit", { recursive: true });
const raw = {
  schemaVersion: 1,
  sourcePage: "https://www.callofduty.com/guides/modernwarfare4/dmz-maps/hajin",
  capturedAt: "2026-11-06T00:00:00Z",
  categories: [
    {
      id: "safe",
      name: "Safes",
      group: "Loot",
      icon: "/maps/hajin/official/icons/safe.png",
    },
  ],
  records: [
    {
      id: "synthetic-safe",
      name: "SYNTHETIC Safe",
      category: "safe",
      x: 0.500123,
      y: 0.500456,
      mapId: "hajin",
      coordinateSpaceVersion: "hajin-official-v1-4096",
      notes: "SYNTHETIC source notes",
    },
  ],
};
const read = (p) =>
  p.evaluate(async () => {
    const { openWorkspace } = await import("/src/workspace/store.ts");
    const db = await openWorkspace();
    try {
      return (await db.read()).current;
    } finally {
      db.close();
    }
  });
try {
  for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
    const b = await engine.launch();
    try {
      for (const restored of [false, true]) {
        const context = await b.newContext({
            viewport: { width: 943, height: 674 },
            deviceScaleFactor: 1.25,
            reducedMotion: "reduce",
          }),
          p = await context.newPage(),
          errors = [],
          external = [];
        p.on("pageerror", (e) => errors.push(e.message));
        try {
          const png = Buffer.from(
            await p.evaluate(() => {
              const c = document.createElement("canvas");
              c.width = c.height = 64;
              return c.toDataURL().split(",")[1];
            }),
            "base64",
          );
          await p.route("**/*", (r) => {
            const u = new URL(r.request().url());
            if (u.origin !== base) {
              external.push(u.href);
              return r.abort();
            }
            if (u.pathname.endsWith("/official/markers.json"))
              return r.fulfill({ json: raw });
            if (/\.(png|webp)$/.test(u.pathname))
              return r.fulfill({ contentType: "image/png", body: png });
            if (u.pathname.startsWith("/maps/"))
              return r.fulfill({ status: 404, body: "Synthetic absent file" });
            return r.continue();
          });
          await p.goto(base);
          await p.locator('html[data-ui-mounted="071-v1"]').waitFor();
          await p.evaluate(
            async ({ raw, restored, png }) => {
              const { openWorkspace } = await import("/src/workspace/store.ts"),
                { emptyWorkspace } = await import("/src/workspace/model.ts"),
                { adaptOfficial } = await import("/src/workspace/import.ts"),
                { applySnapshot } = await import("/src/workspace/refresh.ts"),
                { identityRegistration } = await import(
                  "/src/workspace/registration.ts"
                ),
                { stageIcon, commitIcon } = await import(
                  "/src/workspace/icons.ts"
                );
              const w = emptyWorkspace();
              if (restored) {
                const snap = adaptOfficial(raw, "official");
                applySnapshot(
                  w,
                  snap,
                  "b".repeat(64),
                  identityRegistration(snap.frame),
                );
              }
              const bytes = Uint8Array.from(atob(png), (c) => c.charCodeAt(0));
              commitIcon(
                w,
                await stageIcon(
                  new File([bytes], "synthetic.png", { type: "image/png" }),
                  "Synthetic original fixture",
                  "Synthetic custom icon",
                ),
              );
              const db = await openWorkspace();
              try {
                await db.commit(w, (await db.read()).current?.revision ?? 0);
              } finally {
                db.close();
              }
            },
            { raw, restored, png: png.toString("base64") },
          );
          await p.reload();
          await p.locator('html[data-ui-mounted="071-v1"]').waitFor();
          await p.locator("#ui-map-view").click();
          await p.locator("#map-status").waitFor({ state: "hidden" });
          for (let i = 0; i < 4; i++) await p.locator("#zoom-in").click();
          const before = await read(p);
          await p
            .locator('.leaflet-marker-icon[title="SYNTHETIC Safe"]')
            .click();
          await p
            .locator("#ui-selection-detail")
            .getByRole("button", { name: "Edit", exact: true })
            .click();
          assert.equal(
            await p.locator("#point-x").evaluate((n) => n.validity.valid),
            true,
            "Imported fractional coordinates remain valid without rounding",
          );
          assert.equal(
            await p.locator("#point-y").evaluate((n) => n.validity.valid),
            true,
          );
          await p.locator("#point-title").fill("SYNTHETIC cancelled edit");
          await p.locator("#ui-map-view").click();
          await p
            .locator('.leaflet-marker-icon[title="SYNTHETIC Safe"]')
            .click();
          await p
            .locator("#ui-pane-departure-guard")
            .waitFor({ state: "visible" });
          await p
            .locator("#ui-pane-departure-guard")
            .getByRole("button", { name: "Stay", exact: true })
            .click();
          assert.equal(
            await p.locator("#point-title").inputValue(),
            "SYNTHETIC cancelled edit",
            "Guard retains the actual editor draft",
          );
          await p.locator("#cancel-point").click();
          assert.deepEqual(await read(p), before, "Cancel writes nothing");
          await p.locator("#ui-map-view").click();
          await p
            .locator('.leaflet-marker-icon[title="SYNTHETIC Safe"]')
            .click();
          await p
            .locator("#ui-selection-detail")
            .getByRole("button", { name: "Edit", exact: true })
            .click();
          const form = p.locator("#point-form");
          await form
            .getByLabel("Title", { exact: true })
            .fill("SYNTHETIC Edited Safe");
          await form.getByLabel("Category", { exact: true }).fill("My safes");
          await p.locator("#point-x").fill("2050");
          await p.locator("#point-y").fill("2055");
          await p
            .locator("#point-notes")
            .fill("SYNTHETIC edited notes <img src=x>");
          await form
            .getByLabel("Floor (blank means unknown)", { exact: true })
            .fill("2");
          await form
            .getByLabel("Game build (blank means unknown)", { exact: true })
            .fill("synthetic-build");
          await form
            .getByLabel("Tags (comma separated)", { exact: true })
            .fill("safe,inside");
          await form
            .getByLabel("Building", { exact: true })
            .fill("Synthetic building");
          await form
            .getByLabel("Verification state", { exact: true })
            .selectOption("observed");
          await form
            .getByLabel("Icon override", { exact: true })
            .selectOption({ label: "Synthetic custom icon" });
          await p.locator("#point-x").fill("5000");
          await p.locator("#save-point").click();
          assert.deepEqual(
            await read(p),
            before,
            "Invalid coordinates cannot save",
          );
          await p.locator("#point-x").fill("2050");
          await p.locator("#save-point").click();
          await p
            .locator("#ui-selection-detail .marker-popup-title")
            .filter({ hasText: "SYNTHETIC Edited Safe" })
            .waitFor();
          const saved = await read(p),
            a = saved.data.annotations[0];
          assert.equal(saved.data.annotations.length, 1);
          assert.equal(a.title, "SYNTHETIC Edited Safe");
          assert.equal(a.origin.recordId, "synthetic-safe");
          assert.equal(a.x, 2050);
          assert.equal(a.y, 2055);
          assert.equal(a.notes, "SYNTHETIC edited notes <img src=x>");
          assert.equal(a.applicability.floor, "2");
          assert.equal(a.applicability.gameBuild, "synthetic-build");
          assert.equal(a.verificationState, "observed");
          assert.deepEqual(a.metadata.tags, ["safe", "inside"]);
          assert.equal(a.iconId, saved.data.icons[0].id);
          assert.deepEqual(
            saved.data.snapshots,
            before.data.snapshots,
            "Source captures untouched",
          );
          assert.equal(
            await p
              .locator('.leaflet-marker-icon[title="SYNTHETIC Safe"]')
              .count(),
            0,
          );
          assert.equal(
            await p.locator('#ui-selection-detail img[src="x"]').count(),
            0,
          );
          await p.screenshot({
            path: `.local/marker-edit/${name}-${restored ? "restored" : "raw"}-saved.png`,
          });
          await p
            .locator("#ui-selection-detail")
            .getByRole("button", { name: "Edit", exact: true })
            .click();
          await p.locator("#point-notes").fill("Second synthetic revision");
          await p.locator("#save-point").click();
          await p.locator("#ui-selection-detail .marker-popup-title").waitFor();
          const again = await read(p);
          assert.equal(again.data.annotations.length, 1);
          assert.equal(again.data.annotations[0].id, a.id);
          assert.equal(
            again.data.annotations[0].origin.recordId,
            "synthetic-safe",
          );
          await p.reload();
          await p.locator('html[data-ui-mounted="071-v1"]').waitFor();
          await p.locator("#ui-map-view").click();
          for (let i = 0; i < 4; i++) await p.locator("#zoom-in").click();
          await p
            .locator('.leaflet-marker-icon[title="SYNTHETIC Edited Safe"]')
            .click();
          await p
            .locator("#ui-selection-detail")
            .getByRole("button", { name: "Edit", exact: true })
            .click();
          assert.equal(
            await p.locator("#point-title").inputValue(),
            "SYNTHETIC Edited Safe",
          );
          assert.equal(
            await p.locator("#point-notes").inputValue(),
            "Second synthetic revision",
          );
          await p.locator("#cancel-point").click();
          await p.evaluate(async () => {
            const {
                validateWorkspace,
                exportPrivateBackup,
                parsePrivateBackup,
              } = await import("/src/workspace/backup.ts"),
              { openWorkspace } = await import("/src/workspace/store.ts");
            const db = await openWorkspace();
            try {
              const data = (await db.read()).current.data;
              validateWorkspace(data);
              const restored = parsePrivateBackup(
                JSON.stringify(exportPrivateBackup(data)),
              );
              if (
                JSON.stringify(restored.annotations) !==
                JSON.stringify(data.annotations)
              )
                throw Error("Private backup lost marker edits");
            } finally {
              db.close();
            }
          });
          assert.deepEqual(errors, []);
          assert.deepEqual(external, []);
          console.log(
            name +
              " " +
              (restored ? "restored" : "raw") +
              " marker Edit PASS: Cancel/no write, fields/icon, linked save, no duplicate/source mutation, re-edit, reload/backup validation",
          );
        } finally {
          await context.close();
        }
      }
    } finally {
      await b.close();
    }
  }
} finally {
  await server.close();
}
