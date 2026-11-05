import assert from "node:assert/strict";
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { pathToFileURL, fileURLToPath } from "node:url";
import { chromium, firefox, webkit } from "playwright";
import { features } from "../../src/ui/feature-registry.mjs";
import { allRecords, recordUrl } from "../../src/ui/render.mjs";
import { readCatalog } from "../../scripts/catalog.mjs";
import { createAuthorServer } from "../../scripts/author.mjs";
import { guidancePath } from "../../src/ui/author-actions.mjs";
import { keyGuide } from "../../src/content/keys.mjs";
import { readWeaponIntel } from "../../src/content/weapon-intel.mjs";
import { startBrowserServer } from "./server.mjs";
import { monitorBrowser } from "./health.mjs";

const project = fileURLToPath(new URL("../../", import.meta.url));
const run = promisify(execFile);
const guide = features.filter((f) => f.kind === "guide");
assert.equal(
  guide.length,
  28,
  "Deliberately rebaseline registry scope before changing coverage",
);

async function isolatedContext(browser, allowed) {
  const context = await browser.newContext();
  const forbidden = [];
  await context.route("**/*", (route) => {
    const request = route.request(),
      url = new URL(request.url());
    if (!["http:", "https:"].includes(url.protocol)) return route.continue();
    if (
      !allowed.has(url.origin) ||
      !["GET", "HEAD"].includes(request.method())
    ) {
      forbidden.push(request.method() + " " + url.origin + url.pathname);
      return route.abort("blockedbyclient");
    }
    return route.continue();
  });
  return { context, forbidden };
}

async function shellReady(page) {
  await page.waitForFunction(
    () => document.documentElement.dataset.uiShellMounted === "071-v1",
  );
  assert.equal(
    await page.locator("html").getAttribute("data-ui-variant"),
    "modern",
  );
  assert.equal(
    await page.locator("html").getAttribute("data-ui-contract"),
    "071-v1",
  );
  assert.equal(
    await page.locator("html").getAttribute("data-ui-adapter"),
    "guide-shell",
  );
}

async function featureReady(page, id) {
  await shellReady(page);
  assert.equal(
    await page.locator("body").getAttribute("data-ui-feature-id"),
    id,
  );
  assert(
    await page.locator("main h1").first().isVisible(),
    id + " has its own heading",
  );
  if (await page.locator("#pack-select").count()) {
    await page.waitForFunction(() => {
      const select = document.querySelector("#pack-select");
      return (
        select &&
        !select.disabled &&
        select.value &&
        document.querySelector("main")?.getAttribute("aria-busy") === "false"
      );
    });
  }
  if (id === "editor")
    await page.locator('[data-path="contentVersion"]').waitFor();
  if (id === "keys")
    await page.waitForFunction(
      () =>
        document.querySelector("main")?.dataset.keyWorkspaceReady === "true",
    );
  if (id === "armory-workbench")
    await page.waitForFunction(
      () => document.querySelector("main")?.dataset.armoryReady === "true",
    );
  if (id === "armory")
    await page.waitForFunction(
      () =>
        document.querySelector("[data-weapon-filter]")?.dataset.enhanced ===
        "true",
    );
  if (id === "search")
    await page.waitForFunction(() =>
      /matching records\/tools/.test(
        document.querySelector("#unified-status")?.textContent || "",
      ),
    );
  if (id === "home")
    await page.waitForFunction(
      () => document.querySelector("#hub-pack")?.value,
    );
}

/** Native readonly snapshots of fresh fixture DBs; values are never written into receipts. */
async function domainDigest(page) {
  const value = await page.evaluate(async () => {
    const records = [];
    const names = await indexedDB.databases();
    for (const { name } of names
      .filter((x) =>
        ["dmz-guide-local", "dmz-keys-local", "dmz-armory-local"].includes(
          x.name,
        ),
      )
      .sort((a, b) => a.name.localeCompare(b.name))) {
      const db = await new Promise((resolve, reject) => {
        const r = indexedDB.open(name);
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      });
      try {
        for (const store of [...db.objectStoreNames].sort()) {
          const tx = db.transaction(store, "readonly");
          const rows = await new Promise((resolve, reject) => {
            const r = tx.objectStore(store).getAll();
            r.onsuccess = () => resolve(r.result);
            r.onerror = () => reject(r.error);
          });
          records.push({ name, store, rows });
        }
      } finally {
        db.close();
      }
    }
    return JSON.stringify(records);
  });
  return createHash("sha256").update(value).digest("hex");
}

export async function runUIGuideFeatureCoverage({ browser, base }) {
  const rows = [];
  for (const feature of guide) {
    const { context, forbidden } = await isolatedContext(
      browser,
      new Set([new URL(base).origin]),
    );
    try {
      const page = await context.newPage();
      const originPath = feature.id === "features" ? "/" : "/features/";
      const originFeature = feature.id === "features" ? "home" : "features";
      await page.goto(base + originPath);
      await featureReady(page, originFeature);
      if (feature.id === "features")
        await page.locator(".site-nav .nav-more > summary").click();
      const link = page.locator(
        feature.id === "features"
          ? '.site-nav .nav-more a[data-feature-id="features"]'
          : `main [data-feature-card] a[data-feature-id="${feature.id}"]`,
      );
      assert.equal(await link.count(), 1, feature.id + " exact scoped entry");
      await link.click();
      await page.waitForURL((url) => url.pathname === feature.path);
      await featureReady(page, feature.id);
      const before = await domainDigest(page);
      await page.goBack();
      assert.equal(
        new URL(page.url()).pathname,
        originPath,
        `${feature.id} native Back destination: ${page.url()}`,
      );
      await page.waitForURL((url) => url.pathname === originPath);
      await featureReady(page, originFeature);
      assert.equal(
        await domainDigest(page),
        before,
        feature.id + " Back must not mutate domain values/revisions",
      );
      assert.deepEqual(forbidden, []);
      rows.push({
        id: feature.id,
        path: feature.path,
        adapter: "guide-shell",
        activated: true,
        back: true,
        domainUnchanged: true,
      });
      console.log(
        browser.browserType().name() + " activated Guide " + feature.id,
      );
    } finally {
      await context.close();
    }
  }
  return rows;
}

export async function runUIGeneratedCoverage({ browser, base }) {
  const schema = JSON.parse(
    await readFile(join(project, "schemas/pack.schema.json"), "utf8"),
  );
  const catalog = await readCatalog({ root: project, schema });
  const records = allRecords(catalog.entries.map((e) => e.pack));
  const rows = [];
  for (const type of [
    "item",
    "recipe",
    "objective",
    "guide",
    "map",
    "location",
  ]) {
    const record =
      records.find(
        (r) =>
          r.recordType === type &&
          !r.spoiler &&
          r.pack.id === "demo:training-pack",
      ) ?? records.find((r) => r.recordType === type && !r.spoiler);
    assert(record, "Generated family fixture missing: " + type);
    const path = recordUrl(record);
    const { context, forbidden } = await isolatedContext(
      browser,
      new Set([new URL(base).origin]),
    );
    try {
      const page = await context.newPage();
      await page.goto(base + "/sitemap/");
      await shellReady(page);
      await page.goto(new URL(path, base).href);
      await page.waitForURL((url) => url.pathname === path);
      await shellReady(page);
      assert.equal(
        await page.locator("body").getAttribute("data-page"),
        { item: "items", recipe: "recipes", guide: "guides" }[type] ?? type,
      );
      const identity = page
        .locator("dt", { hasText: /^Record ID$/ })
        .locator("+ dd");
      assert.equal((await identity.innerText()).trim(), record.id);
      await page.goBack();
      await page.waitForURL((url) => url.pathname === "/sitemap/");
      assert.deepEqual(forbidden, []);
      rows.push({
        family: type,
        path,
        recordId: record.id,
        activated: true,
        back: true,
      });
    } finally {
      await context.close();
    }
  }
  const key = keyGuide.keys[0],
    weapon = (await readWeaponIntel()).weapons[0];
  const record = records.find(
    (r) =>
      r.recordType === "item" &&
      !r.spoiler &&
      r.pack.id === "demo:training-pack",
  );
  const packKey = catalog.entries.find((e) => e.pack.id === record.pack.id).key;
  for (const example of [
    {
      family: "key-detail",
      path: `/keys/${key.id}/`,
      page: "keys",
      recordId: key.id,
      title: key.name,
    },
    {
      family: "gun-detail",
      path: `/armory/${weapon.id}/`,
      page: "armory",
      recordId: weapon.id,
      title: weapon.name,
    },
    {
      family: "contribution",
      path: guidancePath(packKey, record.id),
      page: "contribute",
      recordId: record.id,
    },
  ]) {
    const { context, forbidden } = await isolatedContext(
      browser,
      new Set([new URL(base).origin]),
    );
    try {
      const page = await context.newPage();
      await page.goto(base + "/sitemap/");
      await shellReady(page);
      await page.goto(new URL(example.path, base).href);
      await shellReady(page);
      assert.equal(
        await page.locator("body").getAttribute("data-page"),
        example.page,
      );
      if (example.title)
        assert(
          (await page.locator("main h1").textContent()).includes(example.title),
          `${example.family} heading must retain source title ${example.title}`,
        );
      if (example.family === "key-detail")
        assert.equal(
          await page
            .locator(`[data-private-key="${example.recordId}"]`)
            .count(),
          1,
        );
      if (example.family === "gun-detail")
        assert.equal(
          await page
            .locator(
              `a[href="/armory/workbench/?weapon=${example.recordId}#builder"]`,
            )
            .count(),
          1,
        );
      if (example.family === "contribution")
        assert(
          (await page.locator("main").innerText()).includes(example.recordId),
        );
      await page.goBack();
      await page.waitForURL((url) => url.pathname === "/sitemap/");
      assert.deepEqual(forbidden, []);
      rows.push({
        family: example.family,
        path: example.path,
        recordId: example.recordId,
        activated: true,
        back: true,
      });
    } finally {
      await context.close();
    }
  }
  return rows;
}

async function managedDigest(root) {
  const rows = [];
  async function walk(folder) {
    for (const e of (await readdir(folder, { withFileTypes: true })).sort(
      (a, b) => a.name.localeCompare(b.name),
    )) {
      const path = join(folder, e.name);
      if (e.isDirectory()) await walk(path);
      else if (e.isFile())
        rows.push([
          path.slice(root.length),
          createHash("sha256")
            .update(await readFile(path))
            .digest("hex"),
        ]);
      else throw new Error("Unexpected fixture link");
    }
  }
  await walk(join(root, "content"));
  await walk(join(root, "schemas"));
  return JSON.stringify(rows);
}

export async function runUIStudioFeatureCoverage({ browser }) {
  const previousVariant = process.env.DMZ_UI_VARIANT;
  process.env.DMZ_UI_VARIANT = "modern";
  const root = await mkdtemp(join(tmpdir(), "dmz071-activation-"));
  let author;
  try {
    await mkdir(join(root, "content/catalog"), { recursive: true });
    await mkdir(join(root, "empty-hooks"));
    await cp(join(project, "schemas"), join(root, "schemas"), {
      recursive: true,
    });
    await cp(
      join(project, "content/catalog/demo-training"),
      join(root, "content/catalog/demo-training"),
      { recursive: true },
    );
    await writeFile(
      join(root, "content/catalog/manifest.json"),
      JSON.stringify({
        format: "dmz-catalog",
        version: 1,
        provenance: [],
        packs: [{ id: "demo:training-pack", key: "demo-training" }],
      }),
    );
    await run(
      "git",
      ["-c", "core.hooksPath=" + join(root, "empty-hooks"), "init", "-q"],
      { cwd: root },
    );
    await run(
      "git",
      [
        "-c",
        "core.hooksPath=" + join(root, "empty-hooks"),
        "add",
        "content",
        "schemas",
      ],
      { cwd: root },
    );
    await run(
      "git",
      [
        "-c",
        "user.name=DMZ synthetic fixture",
        "-c",
        "user.email=fixture@example.invalid",
        "-c",
        "commit.gpgSign=false",
        "-c",
        "core.hooksPath=" + join(root, "empty-hooks"),
        "commit",
        "-qm",
        "Synthetic readonly activation baseline",
      ],
      { cwd: root },
    );
    const before = await managedDigest(root);
    author = await createAuthorServer({ root, port: 0 });
    const { context, forbidden } = await isolatedContext(
      browser,
      new Set([new URL(author.url).origin]),
    );
    try {
      const page = await context.newPage();
      const pageErrors = [];
      page.on("pageerror", (error) => pageErrors.push(error.message));
      await page.goto(author.url);
      try {
        await page.waitForFunction(
          () =>
            document.documentElement.dataset.uiMounted === "071-v1" &&
            document.documentElement.dataset.uiAdapter === "studio-author",
        );
      } catch (cause) {
        throw new Error(
          "Studio did not mount its real handler: " +
            JSON.stringify({
              state: await page.evaluate(() => ({
                ui: { ...document.documentElement.dataset },
                status: document.querySelector("#save-status")?.textContent,
                error: document.querySelector("#error")?.textContent,
              })),
              forbidden,
              pageErrors,
            }),
          { cause },
        );
      }
      assert.equal(
        await page.locator("html").getAttribute("data-ui-surface"),
        "studio",
      );
      assert.equal(
        await page.locator("html").getAttribute("data-ui-variant"),
        "modern",
      );
      await page.waitForFunction(
        () =>
          !document.querySelector("#pack-select")?.disabled &&
          /Repository catalog loaded/.test(
            document.querySelector("#save-status")?.textContent || "",
          ),
      );
      assert(
        await page
          .locator('#guided-form [data-path="contentVersion"]')
          .isVisible(),
      );
      assert(await page.locator("#studio-nav").isVisible());
      assert.deepEqual(forbidden, []);
      assert.equal(
        await managedDigest(root),
        before,
        "Studio activation must not rewrite managed fixture files",
      );
      return {
        id: "studio",
        adapter: "studio-author",
        activated: true,
        managedFilesUnchanged: true,
      };
    } finally {
      await context.close();
    }
  } finally {
    await author?.close();
    if (previousVariant === undefined) delete process.env.DMZ_UI_VARIANT;
    else process.env.DMZ_UI_VARIANT = previousVariant;
    assert(
      resolve(root).startsWith(resolve(tmpdir()) + "/") ||
        resolve(root).startsWith(resolve(tmpdir()) + "\\"),
    );
    await rm(root, { recursive: true, force: true });
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const server = await startBrowserServer(),
    receipts = [];
  try {
    for (const [engineName, engine] of Object.entries({
      chromium,
      firefox,
      webkit,
    })) {
      const browser = await engine.launch(),
        health = monitorBrowser(browser);
      try {
        const guide = await runUIGuideFeatureCoverage({
          browser,
          base: server.base,
        });
        const generated = await runUIGeneratedCoverage({
          browser,
          base: server.base,
        });
        const studio = await runUIStudioFeatureCoverage({ browser });
        health();
        receipts.push({ engine: engineName, guide, generated, studio });
        console.log(
          engineName +
            "071 actual Guide28/Studio1 and generated9 activation PASS",
        );
      } finally {
        await browser.close();
      }
    }
    await mkdir(".local", { recursive: true });
    await writeFile(
      ".local/071-guide-studio-activation.json",
      JSON.stringify(
        { scope: "Guide28 +Studio1; Map48 separate", receipts },
        null,
        2,
      ),
    );
  } finally {
    await server.stop();
  }
}
