import assert from "node:assert/strict";
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium, firefox, webkit } from "playwright";
// Production builders/renderers/servers, disposable checkout and browser data.
// Each service retains its own origin across rollback; services are not cohosted.
const project = resolve(process.cwd()),
  run = promisify(execFile),
  hash = (x) => createHash("sha256").update(x).digest("hex");
const container = await mkdtemp(join(tmpdir(), "dmz071-surfaces-rollback-")),
  fixture = join(container, "project"),
  reports = join(project, ".local");
let guide, studio, manager, managedFiles;
const rows = [],
  failures = [],
  builds = {};
function owned(path) {
  const value = resolve(path);
  assert(
    value.startsWith(resolve(container) + sep),
    "Owned fixture containment required",
  );
  return value;
}
async function removeOwned(path) {
  await rm(owned(path), { recursive: true, force: true });
}
async function treeDigest(root) {
  const values = [];
  async function walk(path) {
    for (const item of (await readdir(path, { withFileTypes: true })).sort(
      (a, b) => a.name.localeCompare(b.name),
    )) {
      const p = join(path, item.name);
      if (item.isDirectory()) await walk(p);
      else {
        assert(item.isFile(), "No fixture symlinks");
        values.push([
          p.slice(root.length).replaceAll("\\", "/"),
          hash(await readFile(p)),
        ]);
      }
    }
  }
  await walk(join(root, "content"));
  await walk(join(root, "schemas"));
  return { sha256: hash(JSON.stringify(values)), files: values.length };
}
async function build(variant) {
  const result = await run(
    process.execPath,
    [join(fixture, "scripts/build.mjs")],
    {
      cwd: fixture,
      env: { ...process.env, DMZ_UI_VARIANT: variant },
      maxBuffer: 8 * 1024 * 1024,
      timeout: 120000,
      windowsHide: true,
    },
  );
  await writeFile(
    join(reports, "071-surface-rollback-build-" + variant + ".log"),
    result.stdout + "\n" + result.stderr,
  );
  const identity = JSON.parse(
    await readFile(join(fixture, "dist/assets/build-identity.json"), "utf8"),
  );
  builds[variant] = {
    buildId: identity.buildId,
    sourceFiles: identity.sourceFiles,
  };
  await cp(join(fixture, "dist"), join(container, variant + "-dist"), {
    recursive: true,
  });
}
async function activateBuild(variant) {
  const target = owned(join(fixture, "dist")),
    parked = owned(join(container, "parked-dist"));
  try {
    await rename(target, parked);
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
  }
  await cp(join(container, variant + "-dist"), target, { recursive: true });
  await removeOwned(parked);
}
async function databaseDigest(page) {
  const value = await page.evaluate(async () => {
    const records = [];
    for (const { name } of (await indexedDB.databases())
      .filter((d) =>
        ["dmz-guide-local", "dmz-keys-local", "dmz-armory-local"].includes(
          d.name,
        ),
      )
      .sort((a, b) => a.name.localeCompare(b.name))) {
      const db = await new Promise((yes, no) => {
        const request = indexedDB.open(name);
        request.onsuccess = () => yes(request.result);
        request.onerror = () => no(request.error);
      });
      try {
        for (const store of [...db.objectStoreNames].sort()) {
          const tx = db.transaction(store, "readonly"),
            s = tx.objectStore(store);
          const keys = new Promise((yes, no) => {
            const r = s.getAllKeys();
            r.onsuccess = () => yes(r.result);
            r.onerror = () => no(r.error);
          });
          const rows = new Promise((yes, no) => {
            const r = s.getAll();
            r.onsuccess = () => yes(r.result);
            r.onerror = () => no(r.error);
          });
          records.push({ name, store, keys: await keys, rows: await rows });
        }
      } finally {
        db.close();
      }
    }
    return JSON.stringify(records);
  });
  return hash(value);
}
const localFor = (surface) => ({
  [`dmz-ui-display-v1.${surface}`]:
    ' {"version":999,"density":"compact","synthetic":"invalid071bytes"} ',
  "dmz-theme": "dark",
  "synthetic-pre071-display": " invalid legacy display bytes ",
});
const sessionFor = (surface) => ({
  [`dmz-ui-display-v1.${surface}`]: "invalid synthetic session display bytes",
});
async function seedDisplay(page, surface) {
  await page.evaluate(
    ({ local, session }) => {
      for (const [k, v] of Object.entries(local)) localStorage.setItem(k, v);
      for (const [k, v] of Object.entries(session))
        sessionStorage.setItem(k, v);
    },
    { local: localFor(surface), session: sessionFor(surface) },
  );
}
async function displayPreserved(page, surface) {
  const actual = await page.evaluate(
    ({ local, session }) => ({
      local: Object.fromEntries(
        Object.keys(local).map((k) => [k, localStorage.getItem(k)]),
      ),
      session: Object.fromEntries(
        Object.keys(session).map((k) => [k, sessionStorage.getItem(k)]),
      ),
    }),
    { local: localFor(surface), session: sessionFor(surface) },
  );
  assert.deepEqual(actual, {
    local: localFor(surface),
    session: sessionFor(surface),
  });
}
async function ready(page, surface, variant) {
  await page.waitForFunction(
    ({ surface, variant }) =>
      document.documentElement.dataset.uiSurface === surface &&
      document.documentElement.dataset.uiVariant === variant,
    { surface, variant },
  );
  if (surface === "guide")
    await page.waitForFunction(
      () =>
        document.querySelector("main")?.getAttribute("aria-busy") === "false" &&
        !document.querySelector("#pack-select")?.disabled,
    );
  if (surface === "studio")
    await page.waitForFunction(
      () =>
        /Repository catalog loaded/.test(
          document.querySelector("#save-status")?.textContent || "",
        ) && !document.querySelector("#pack-select")?.disabled,
    );
  if (surface === "manager")
    await page.waitForFunction(
      () => document.querySelector("main")?.dataset.managerReady === "true",
    );
  if (variant === "modern") {
    assert.equal(
      await page.locator("html").getAttribute("data-ui-contract"),
      "071-v1",
    );
    await page.waitForSelector(
      `html[data-ui-mounted="071-v1"][data-ui-adapter="${{ guide: "guide-shell", studio: "studio-author", manager: "manager-updates" }[surface]}"]`,
    );
  } else {
    assert.equal(
      await page.locator("html").getAttribute("data-ui-mounted"),
      null,
    );
    assert.equal(
      await page.locator("html").getAttribute("data-ui-adapter"),
      null,
    );
  }
}
try {
  await mkdir(reports, { recursive: true });
  await mkdir(join(fixture, "content/catalog"), { recursive: true });
  await mkdir(join(fixture, "empty-hooks"));
  for (const path of [
    "src",
    "scripts",
    "schemas",
    "package.json",
    "package-lock.json",
  ])
    await cp(join(project, path), join(fixture, path), { recursive: true });
  for (const name of ["site.json", "weapon-intel.json", "codmunity-stats.json"])
    await cp(join(project, "content", name), join(fixture, "content", name));
  await cp(
    join(project, "content/catalog/demo-training"),
    join(fixture, "content/catalog/demo-training"),
    { recursive: true },
  );
  await writeFile(
    join(fixture, "content/catalog/manifest.json"),
    JSON.stringify({
      format: "dmz-catalog",
      version: 1,
      provenance: [],
      packs: [{ id: "demo:training-pack", key: "demo-training" }],
    }),
  );
  for (const args of [
    ["init", "-q"],
    [
      "add",
      "src",
      "scripts",
      "schemas",
      "content",
      "package.json",
      "package-lock.json",
    ],
    [
      "-c",
      "user.name=Synthetic rollback fixture",
      "-c",
      "user.email=fixture@example.invalid",
      "-c",
      "commit.gpgSign=false",
      "commit",
      "-qm",
      "Synthetic disposable rollback fixture",
    ],
  ])
    await run(
      "git",
      ["-c", "core.hooksPath=" + join(fixture, "empty-hooks"), ...args],
      { cwd: fixture, windowsHide: true, maxBuffer: 1024 * 1024 },
    );
  const originalFiles = await treeDigest(fixture);
  managedFiles = originalFiles;
  await build("modern");
  await build("legacy");
  assert.deepEqual(
    await treeDigest(fixture),
    originalFiles,
    "Build cannot mutate managed fixture data",
  );
  await activateBuild("modern");
  const { startOwnedServer } = await import(
    pathToFileURL(join(fixture, "scripts/server-readiness.mjs"))
  );
  guide = await startOwnedServer({ cwd: fixture });
  const { createAuthorServer } = await import(
      pathToFileURL(join(fixture, "scripts/author.mjs"))
    ),
    { createWeaponManager, runWeaponJob } = await import(
      pathToFileURL(join(fixture, "scripts/weapon-manager.mjs"))
    );
  process.env.DMZ_UI_VARIANT = "modern";
  studio = await createAuthorServer({ root: fixture, port: 0 });
  let attemptedJob = 0,
    statusReads = 0;
  manager = await createWeaponManager({
    root: fixture,
    port: 0,
    monitor: false,
    runner: (root, action, fields) => {
      if (action === "status") {
        statusReads++;
        return runWeaponJob(root, action, fields);
      }
      attemptedJob++;
      throw Error("Rollback test must not launch a job");
    },
  });
  for (const [engineName, engine] of Object.entries({
    chromium,
    firefox,
    webkit,
  })) {
    console.log("Rollback engine " + engineName);
    const browser = await engine.launch();
    try {
      process.env.DMZ_UI_VARIANT = "modern";
      await activateBuild("modern");
      const context = await browser.newContext({
          viewport: { width: 1440, height: 1000 },
        }),
        errors = [],
        forbidden = [];
      context.on("page", (page) =>
        page.on("pageerror", (e) => errors.push(e.message)),
      );
      const allowed = new Set(
        [guide.base, studio.url, manager.url].map((url) => new URL(url).origin),
      );
      await context.route("**/*", (route) => {
        const r = route.request(),
          u = new URL(r.url());
        if (
          ["http:", "https:"].includes(u.protocol) &&
          (!allowed.has(u.origin) || !["GET", "HEAD"].includes(r.method()))
        ) {
          forbidden.push(r.method() + " " + u.origin + u.pathname);
          return route.abort();
        }
        return route.continue();
      });
      const pages = {
          guide: await context.newPage(),
          studio: await context.newPage(),
          manager: await context.newPage(),
        },
        urls = {
          guide: guide.base + "/inventory/?pack=demo%3Atraining-pack",
          studio: studio.url,
          manager: manager.url,
        };
      const row = {
        engine: engineName,
        browserVersion: browser.version(),
        origins: Object.fromEntries(
          Object.entries(urls).map(([surface, url]) => [
            surface,
            new URL(url).origin,
          ]),
        ),
        steps: [],
      };
      try {
        for (const surface of Object.keys(pages)) {
          console.log(engineName + " initial " + surface);
          await pages[surface].goto(urls[surface]);
          await ready(pages[surface], surface, "modern");
        }
        const stock = pages.guide.locator(
          '[data-field="inventory"][data-id="demo:wire"]',
        );
        await stock.fill("7");
        await pages.guide
          .getByRole("button", { name: "Save inventory", exact: true })
          .click();
        await pages.guide.waitForFunction(() =>
          /Saved locally/.test(
            document.querySelector("#save-status")?.textContent || "",
          ),
        );
        const saved = await pages.guide.evaluate(async () => {
          const { state } = await import("/assets/src/client/common.mjs");
          return {
            revision: state.revision,
            owned: state.profile.inventory["demo:wire"],
          };
        });
        assert.equal(saved.owned, 7);
        assert(saved.revision >= 1);
        row.seed = saved;
        const domains = {};
        for (const surface of Object.keys(pages)) {
          domains[surface] = await databaseDigest(pages[surface]);
          await seedDisplay(pages[surface], surface);
          await pages[surface].reload();
          await ready(pages[surface], surface, "modern");
          await displayPreserved(pages[surface], surface);
          assert.equal(await databaseDigest(pages[surface]), domains[surface]);
        }
        row.domainHashes = domains;
        for (const variant of ["legacy", "modern"]) {
          console.log(engineName + " rollback " + variant);
          process.env.DMZ_UI_VARIANT = variant;
          await activateBuild(variant);
          const prior = variant === "legacy" ? "modern" : "legacy";
          for (const page of Object.values(pages))
            assert.equal(
              await page.locator("html").getAttribute("data-ui-variant"),
              prior,
              "Server/build switch must not mutate loaded documents",
            );
          const step = { variant, owners: {} };
          for (const surface of Object.keys(pages)) {
            const page = pages[surface];
            await page.reload();
            await ready(page, surface, variant);
            assert.equal(
              new URL(page.url()).origin,
              new URL(urls[surface]).origin,
              "Each production service keeps same origin",
            );
            await displayPreserved(page, surface);
            assert.equal(
              await databaseDigest(page),
              domains[surface],
              surface + " rollback cannot mutate private database",
            );
            step.owners[surface] = await page
              .locator("html")
              .getAttribute("data-ui-adapter");
          }
          assert.equal(
            await pages.guide
              .locator('[data-field="inventory"][data-id="demo:wire"]')
              .inputValue(),
            "7",
          );
          assert.deepEqual(
            await treeDigest(fixture),
            originalFiles,
            "Rollback cannot alter managed content/schema files",
          );
          step.managedFiles = await treeDigest(fixture);
          row.steps.push(step);
        }
        assert.deepEqual(errors, []);
        assert.deepEqual(forbidden, []);
        assert.equal(attemptedJob, 0);
        row.readOnlyManagerStatusCalls = statusReads;
        row.pass = true;
      } catch (e) {
        row.pass = false;
        console.log(engineName + " failed " + e.message);
        row.failure = e.message;
        row.errors = errors;
        row.forbidden = forbidden;
        row.pageStates = {};
        for (const [surface, page] of Object.entries(pages))
          row.pageStates[surface] = await page.evaluate(() => ({
            ui: { ...document.documentElement.dataset },
            error: document.querySelector("#error")?.textContent,
            status: document.querySelector("#manager-status")?.textContent,
            main: document.querySelector("main")?.innerText.slice(0, 1800),
          }));
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
  assert.deepEqual(await treeDigest(fixture), originalFiles);
  console.log(JSON.stringify({ engines: rows.length, failures }, null, 2));
  assert.deepEqual(
    failures,
    [],
    "All three production surface rollbacks must pass",
  );
} finally {
  await mkdir(reports, { recursive: true });
  await writeFile(
    join(reports, "071-ui-surface-rollback.json"),
    JSON.stringify(
      {
        scope:
          "Guide/Studio/Manager actual production startup rollback; each service retains its own origin; no physical device claim",
        node: process.version,
        builds,
        managedFiles,
        productionBoundary:
          "Real production build/serve and author/manager render+HTTP APIs; complete built Guide directories activated inside disposable checkout, never canonical dist",
        sameOriginWithinEachService: true,
        defaultFlagsPromoted: false,
        physicalDeviceTested: false,
        displayRecordHashes: Object.fromEntries(
          ["guide", "studio", "manager"].map((surface) => [
            surface,
            {
              local: Object.fromEntries(
                Object.entries(localFor(surface)).map(([key, value]) => [
                  key,
                  hash(value),
                ]),
              ),
              session: Object.fromEntries(
                Object.entries(sessionFor(surface)).map(([key, value]) => [
                  key,
                  hash(value),
                ]),
              ),
            },
          ]),
        ),
        rows,
        failures,
      },
      null,
      2,
    ),
  );
  await manager?.close();
  await studio?.close();
  await guide?.stop();
  assert(resolve(container).startsWith(resolve(tmpdir()) + sep));
  await rm(container, { recursive: true, force: true });
}
