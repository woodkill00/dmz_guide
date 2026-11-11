import assert from "node:assert/strict";
import { chromium } from "playwright";
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { join, dirname, resolve, sep, basename } from "node:path";
import { tmpdir } from "node:os";
import { serializeCatalog, readCatalog } from "../../scripts/catalog.mjs";
import { createAuthorServer } from "../../scripts/author.mjs";
import { loadFixturePack } from "../helpers/catalog.mjs";
import { authorPath, previewPath } from "../../src/content/author-target.mjs";
const root = await mkdtemp(join(tmpdir(), "dmz-item-workspace-studio-")),
  schema = JSON.parse(
    await readFile(
      new URL("../../schemas/pack.schema.json", import.meta.url),
      "utf8",
    ),
  ),
  pack = loadFixturePack("official-starter"),
  id = "mw4:ingredient-ballistic-fabric";
assert.equal(pack.assets.length, 0);
const files = serializeCatalog({
  entries: [{ key: "official-starter", pack, assetSources: {} }],
  schema,
});
files.set("schemas/pack.schema.json", Buffer.from(JSON.stringify(schema)));
let app, b;
try {
  for (const [path, bytes] of files) {
    await mkdir(dirname(join(root, path)), { recursive: true });
    await writeFile(join(root, path), bytes);
  }
  app = await createAuthorServer({ root, port: 0 });
  b = await chromium.launch();
  const p = await b.newPage(),
    errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  const target = authorPath({
    packKey: "official-starter",
    packId: pack.id,
    id,
    intent: "images",
  });
  await p.goto(app.url + target);
  await p.waitForFunction(
    () => document.querySelector("#editor-section")?.value === "items",
  );
  const prefix = `items.${pack.items.findIndex((g) => g.id === id)}.`;
  assert.equal(await p.locator(`[data-path="${prefix}id"]`).inputValue(), id);
  assert(await p.locator(`[data-path="${prefix}id"]`).isDisabled());
  const data = await p.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 64;
    c.height = 64;
    c.getContext("2d").fillRect(0, 0, 64, 64);
    return c.toDataURL("image/png").split(",")[1];
  });
  await p.setInputFiles("#picture-file", {
    name: "synthetic-bag-example.png",
    mimeType: "image/png",
    buffer: Buffer.from(data, "base64"),
  });
  await p.locator("#picture-workbench:not([hidden])").waitFor();
  await p.locator("#picture-holder").fill("Original software fixture");
  await p.locator("#picture-license").fill("CC0-1.0");
  await p
    .locator("#picture-source")
    .fill("https://example.com/synthetic-loot-fixture");
  await p
    .locator("#picture-attribution")
    .fill("Original synthetic test pixels, not game artwork");
  await p
    .locator("#picture-description")
    .fill("Synthetic item identification example");
  await p.locator("#picture-rights").check();
  await p.locator("#picture-private").check();
  await p.locator("#picture-attachment").selectOption("primary");
  const picture = await p.locator("#picture-id").inputValue();
  await p.locator("#attach-picture").click();
  await p.locator(`[data-asset-id="${picture}"]`).first().waitFor();
  const body = p.locator(`[data-path="${prefix}description"]`);
  await body.fill("Synthetic saved item identification notes.");
  await body.press("Tab");
  await p.locator("#review-version").fill("synthetic-loot-photo-save");
  await p.locator("#apply-review-version").click();
  await p.locator("#preview-content").click();
  await p.locator("#content-stage:not([hidden])").waitFor();
  const response = p.waitForResponse(
    (r) => r.url().endsWith("/api/save") && r.request().method() === "POST",
    { timeout: 90000 },
  );
  await p.locator("#save-repository").click();
  const saved = await response;
  assert.equal(saved.status(), 200, await saved.text());
  await p.waitForLoadState("networkidle");
  const snapshot = await readCatalog({ root, schema }),
    entry = snapshot.entries[0],
    guide = entry.pack.items.find((g) => g.id === id);
  assert.equal(guide.description, "Synthetic saved item identification notes.");
  assert.equal(guide.assetId, picture);
  assert(guide.imageDescriptions.some((d) => d.assetId === picture));
  assert(entry.pack.assets.some((a) => a.id === picture));
  await p.goto("about:blank");
  await app.close();
  app = await createAuthorServer({ root, port: 0 });
  await p.goto(app.url + previewPath({ packKey: "official-starter", id }));
  assert(
    await p
      .getByText("Synthetic saved item identification notes.", {
        exact: true,
      })
      .isVisible(),
  );
  assert.equal(await p.locator("[data-item-workspace]").count(), 1);
  await p.locator(".item-pictures summary").click();
  const image = p.locator("img[data-public-image]");
  await image.waitFor();
  await image.evaluate((i) => i.decode());
  assert.equal(
    await image.getAttribute("alt"),
    "Synthetic item identification example",
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS isolated Studio exact item record, edited text, PNG upload, repository save, restart, image bytes/description and saved preview",
  );
} finally {
  await b?.close();
  await app?.close();
  assert(
    resolve(root).startsWith(resolve(tmpdir()) + sep) &&
      basename(root).startsWith("dmz-item-workspace-studio-"),
  );
  await rm(root, { recursive: true, force: true });
}
