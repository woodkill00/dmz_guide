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
    join(reports, "071-navigation-bounds-build-" + variant + ".log"),
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

  const { createServer } = await import(
    pathToFileURL(
      join(project, "tools/hajin-map/node_modules/vite/dist/node/index.js"),
    )
  );
  const mapServer = await createServer({
    root: join(project, "tools/hajin-map"),
    configFile: join(project, "tools/hajin-map/vite.config.mjs"),
    cacheDir: join(container, "map-vite-cache"),
    define: { "import.meta.env.VITE_LOCAL_PROVIDER_SNAPSHOTS": '"0"' },
    server: { host: "127.0.0.1", port: 5301, strictPort: true, hmr: false },
  });
  await mapServer.listen();
  try {
    for (const [engineName, engine] of Object.entries({
      chromium,
      firefox,
      webkit,
    })) {
      const browser = await engine.launch();
      try {
        for (const surface of ["guide", "studio", "manager", "map"])
          for (const theme of ["dark", "light"])
            for (const textScale of [1, 2]) {
              const context = await browser.newContext({
                  viewport: { width: 320, height: 800 },
                }),
                page = await context.newPage(),
                errors = [],
                forbidden = [];
              page.on("pageerror", (e) => errors.push(e.message));
              await context.addInitScript(
                (theme) => localStorage.setItem("dmz-theme", theme),
                theme,
              );
              const image = await page.evaluate(() => {
                const c = document.createElement("canvas");
                c.width = c.height = 2;
                c.getContext("2d").fillRect(0, 0, 2, 2);
                return c.toDataURL().split(",")[1];
              });
              const urls = {
                  guide: guide.base + "/",
                  studio: studio.url,
                  manager: manager.url,
                  map: "http://127.0.0.1:5301/",
                },
                allowed = new Set(
                  Object.values(urls).map((url) => new URL(url).origin),
                );
              await context.route("**/*", (route) => {
                const request = route.request(),
                  u = new URL(request.url());
                if (
                  ["http:", "https:"].includes(u.protocol) &&
                  (!allowed.has(u.origin) ||
                    !["GET", "HEAD"].includes(request.method()))
                ) {
                  forbidden.push(
                    request.method() + " " + u.origin + u.pathname,
                  );
                  return route.abort();
                }
                if (
                  u.origin === "http://127.0.0.1:5301" &&
                  u.pathname.startsWith("/maps/")
                ) {
                  if (u.pathname.endsWith("/background.webp"))
                    return route.fulfill({
                      contentType: "image/png",
                      body: Buffer.from(image, "base64"),
                    });
                  if (u.pathname.endsWith("/official/markers.json"))
                    return route.fulfill({
                      json: {
                        schemaVersion: 1,
                        sourcePage:
                          "https://www.callofduty.com/guides/modernwarfare4/dmz-maps/hajin",
                        capturedAt: "2026-11-05T00:00:00Z",
                        categories: [],
                        records: [],
                      },
                    });
                  return route.fulfill({
                    status: 404,
                    body: "Synthetic navigation-only map fixture",
                  });
                }
                return route.continue();
              });
              const row = { engine: engineName, surface, theme, textScale };
              try {
                await page.goto(urls[surface]);
                await page.waitForSelector(
                  'html[data-ui-variant="modern"][data-ui-mounted="071-v1"]',
                );
                if (surface === "studio" || surface === "manager")
                  await ready(page, surface, "modern");
                if (surface === "map")
                  assert.equal(
                    await page.locator("html").getAttribute("data-ui-adapter"),
                    "map-pane",
                  );
                if (surface === "guide")
                  await page.waitForFunction(
                    () => document.querySelector("#hub-pack")?.value,
                  );
                assert.equal(
                  await page.locator("html").getAttribute("data-theme"),
                  theme,
                );
                if (textScale === 2)
                  await page.evaluate(
                    () => (document.documentElement.style.fontSize = "200%"),
                  );
                await page.waitForTimeout(80);
                const menu = page.locator(".site-nav .nav-more");
                await menu.locator(":scope > summary").click();
                const panel = menu.locator(":scope > div");
                row.rectangle = await panel.boundingBox();
                row.viewport = await page.evaluate(() => ({
                  width: innerWidth,
                  height: innerHeight,
                  documentWidth: document.documentElement.scrollWidth,
                  clientWidth: document.documentElement.clientWidth,
                  rootFont: getComputedStyle(document.documentElement).fontSize,
                  visualScale: visualViewport?.scale,
                }));
                assert(
                  row.rectangle.x >= -0.5 &&
                    row.rectangle.x + row.rectangle.width <= 320.5,
                  "Actual menu border box must fit320px: " +
                    JSON.stringify(row),
                );
                row.panelFitsVertically =
                  row.rectangle.y >= -0.5 &&
                  row.rectangle.y + row.rectangle.height <= 800.5;
                assert(
                  row.viewport.documentWidth <= row.viewport.clientWidth + 1,
                );
                const links = panel.locator("a[href]");
                const rightmost = await links.evaluateAll((nodes) => {
                  let best = 0,
                    max = -Infinity;
                  for (let i = 0; i < nodes.length; i++) {
                    const r = nodes[i].getBoundingClientRect(),
                      host = nodes[i]
                        .closest(".nav-more")
                        .querySelector(":scope > div")
                        .getBoundingClientRect();
                    if (
                      r.height &&
                      r.top >= host.top &&
                      r.bottom <= host.bottom &&
                      r.right > max
                    ) {
                      max = r.right;
                      best = i;
                    }
                  }
                  return best;
                });
                row.hits = [];
                for (const index of new Set([
                  0,
                  rightmost,
                  (await links.count()) - 1,
                ])) {
                  const control = links.nth(index);
                  await control.scrollIntoViewIfNeeded();
                  await control.focus();
                  const hit = await control.evaluate((e) => {
                    const r = e.getBoundingClientRect(),
                      y = r.y + r.height / 2,
                      center = document.elementFromPoint(r.x + r.width / 2, y),
                      edge = document.elementFromPoint(r.right - 2, y);
                    return {
                      focused: document.activeElement === e,
                      left: r.left,
                      right: r.right,
                      center: !!center && (center === e || e.contains(center)),
                      rightEdge: !!edge && (edge === e || e.contains(edge)),
                    };
                  });
                  assert(
                    hit.focused &&
                      hit.center &&
                      hit.rightEdge &&
                      hit.left >= -0.5 &&
                      hit.right <= 320.5,
                    "Actual first/rightmost/final link must be focused and hit-testable: " +
                      JSON.stringify(hit),
                  );
                  row.hits.push({ index, ...hit });
                }
                await page.keyboard.press("Escape");
                assert.equal(await menu.evaluate((e) => e.open), false);
                assert.equal(
                  await menu
                    .locator(":scope > summary")
                    .evaluate((e) => document.activeElement === e),
                  true,
                );
                assert.deepEqual(errors, []);
                assert.deepEqual(forbidden, []);
                row.pass = true;
              } catch (e) {
                row.pass = false;
                row.failure = e.message;
                failures.push({
                  engine: engineName,
                  surface,
                  theme,
                  textScale,
                  message: e.message,
                });
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
    await mapServer.close();
  }
  assert.deepEqual(await treeDigest(fixture), originalFiles);
  console.log(
    JSON.stringify({ cases: rows.length, engines: 3, failures }, null, 2),
  );
  assert.deepEqual(
    failures,
    [],
    "Actual modern navigation rectangles/focus/hit tests must pass",
  );
} finally {
  await mkdir(reports, { recursive: true });
  await writeFile(
    join(reports, "071-ui-navigation-bounds.json"),
    JSON.stringify(
      {
        scope:
          "Actual modern320px navigation border-box bounds, scroll-revealed first/rightmost/final controls, focus and Escape on Guide/Studio/Manager/Map; dark/light+root-text100/200, no native zoom/physical claim",
        node: process.version,
        builds,
        managedFiles,
        productionBoundary:
          "Real production build/serve and author/manager render+HTTP APIs; complete built Guide directories activated inside disposable checkout, never canonical dist",
        sameOriginWithinEachService: true,
        defaultFlagsPromoted: false,
        physicalDeviceTested: false,
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
