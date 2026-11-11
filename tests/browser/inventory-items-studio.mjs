import assert from "node:assert/strict";
import { chromium } from "playwright";
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname, resolve, basename } from "node:path";
import { createAuthorServer } from "../../scripts/author.mjs";
import { serializeCatalog, readCatalog } from "../../scripts/catalog.mjs";
import { loadFixturePack } from "../helpers/catalog.mjs";
const schema = JSON.parse(await readFile("schemas/pack.schema.json"));
const root = await mkdtemp(join(tmpdir(), "dmz-inventory-items-"));
const pack = loadFixturePack("official-starter");
const before = structuredClone(pack);
let app, browser;
try {
  const files = serializeCatalog({
    entries: [{ key: "official-starter", pack, assetSources: {} }],
    schema,
  });
  files.set("schemas/pack.schema.json", Buffer.from(JSON.stringify(schema)));
  for (const [path, bytes] of files) {
    await mkdir(dirname(join(root, path)), { recursive: true });
    await writeFile(join(root, path), bytes);
  }
  app = await createAuthorServer({ root, port: 0 });
  browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  const path =
    "/?create=items&packKey=official-starter&packId=" +
    encodeURIComponent(pack.id);
  await page.goto(app.url + path);
  await page.waitForFunction(
    () =>
      document.querySelector("#new-record-name") &&
      !document.querySelector("#new-record-name").disabled,
  );
  await page
    .locator("#entry-identity")
    .filter({ hasText: "Add item to" })
    .waitFor();
  assert.equal(await page.locator("#editor-section").inputValue(), "items");
  assert.deepEqual((await readCatalog({ root, schema })).packs[0], before);
  await page.locator("#new-record-name").fill("QA missing ingredient");
  await page.locator("#add-record").click();
  const index = pack.items.length;
  const field = (k) => page.locator(`[data-path="items.${index}.${k}"]`);
  await field("category").fill("Ingredients");
  await field("unit").selectOption("count");
  await field("kind").selectOption("item");
  await field("rarity.included").check();
  await field("rarity").fill("Rare");
  await page.locator("#review-version").fill("2026.11.06.qa");
  await page.locator("#apply-review-version").click();
  await page.locator("#review-again").click();
  await page.locator("#content-stage").waitFor({ state: "visible" });
  assert.deepEqual((await readCatalog({ root, schema })).packs[0], before);
  await Promise.all([
    page
      .waitForResponse(
        (r) =>
          r.url() === app.url + "/api/save" && r.request().method() === "POST",
      )
      .then((r) => assert.equal(r.status(), 200)),
    page.locator("#save-repository").click(),
  ]);
  await page.waitForFunction(
    () => !document.querySelector("#saved-preview")?.hidden,
  );
  const after = (await readCatalog({ root, schema })).packs[0];
  const added = after.items.find((i) => i.name === "QA missing ingredient");
  assert(added);
  assert.equal(added.rarity, "Rare");
  assert.equal(added.category, "Ingredients");
  assert.equal(after.items.length, before.items.length + 1);
  await page.goto(
    app.url +
      "/?packKey=official-starter&packId=" +
      encodeURIComponent(pack.id) +
      "&id=" +
      encodeURIComponent(added.id) +
      "&intent=edit",
  );
  await page.locator("#entry-identity").filter({ hasText: added.id }).waitFor();
  const selected = await page.locator("#editor-record").inputValue();
  const editField = page.locator(`[data-path="items.${selected}.name"]`);
  assert.equal(await editField.inputValue(), "QA missing ingredient");
  await editField.fill("QA renamed ingredient");
  await page.locator("#review-version").fill("2026.11.06.qa2");
  await page.locator("#apply-review-version").click();
  await page.locator("#review-again").click();
  await Promise.all([
    page
      .waitForResponse(
        (r) =>
          r.url() === app.url + "/api/save" && r.request().method() === "POST",
      )
      .then((r) => assert.equal(r.status(), 200)),
    page.locator("#save-repository").click(),
  ]);
  await page.waitForFunction(
    () => !document.querySelector("#saved-preview")?.hidden,
  );
  assert.equal(
    (await readCatalog({ root, schema })).packs[0].items.find(
      (i) => i.id === added.id,
    ).name,
    "QA renamed ingredient",
  );
  const stale = await fetch(
    app.url + "/?create=items&packKey=official-starter&packId=missing%3Apack",
  );
  assert.equal(stale.status, 400);
  assert.match(await stale.text(), /missing/);
  assert.equal(
    (await readCatalog({ root, schema })).packs[0].items.length,
    before.items.length + 1,
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS: isolated Studio exact-catalog Add, no automatic writes, optional rarity, validate/preview/save, exact-record Edit and persistence, stale target fails closed.",
  );
} finally {
  await browser?.close();
  await app?.close();
  const target = resolve(root);
  assert(
    dirname(target) === resolve(tmpdir()) &&
      basename(target).startsWith("dmz-inventory-items-"),
  );
  await rm(target, { recursive: true, force: true });
}
