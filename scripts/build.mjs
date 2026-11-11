import { quickTrackerPage } from "../src/ui/quick-tracker.mjs";
import { renderItemMaintenance } from "../src/ui/item-maintenance.mjs";
import { buildSiteTopology } from "../src/domain/site-topology.mjs";
import { buildUnifiedIndex } from "../src/content/unified-index.mjs";
import {
  captureBuildSources,
  createBuildIdentity,
  describeGit,
} from "./build-identity.mjs";
import { withRepositorySnapshot } from "./author-store.mjs";
import { createHash } from "node:crypto";
import { publishBuild } from "./build-output.mjs";
import {
  guidancePath,
  renderAuthorActions,
  renderAuthorGuidance,
} from "../src/ui/author-actions.mjs";
import {
  readFile,
  mkdir,
  writeFile,
  cp,
  access,
  lstat,
  readdir,
} from "node:fs/promises";
import { resolve, dirname, join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  e,
  renderLayout,
  renderHome,
  renderCatalog,
  renderDetail,
  allRecords,
  recordUrl,
  pageHeading,
  setNavigation,
  publicTitle,
  isFixture,
  setBundledAssets,
} from "../src/ui/render.mjs";
import {
  renderSiteMap,
  renderMapWorkspace,
} from "../src/ui/navigation-page.mjs";
import { readCatalog, bundledSources, catalogJSON } from "./catalog.mjs";
import { prepareBundledAssets, writeBundledAssets } from "./bundled-assets.mjs";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
async function generate(dist) {
  const sourceFiles = await captureBuildSources(root);
  const gitIdentity = await describeGit(root);
  const inventory = new Map();
  const expected = (file, bytes) =>
    inventory.set(relative(dist, file), digest(bytes));
  const emit = async (file, bytes) => {
    expected(file, bytes);
    await writeFile(file, bytes);
  };
  const copyInventory = async (from, to, filter = () => true) => {
    if (!filter(from)) return;
    const info = await lstat(from);
    if (info.isDirectory()) {
      for (const name of await readdir(from))
        await copyInventory(join(from, name), join(to, name), filter);
    } else if (info.isFile()) expected(to, await readFile(from));
    else throw new Error(`Unsupported copy source: ${from}`);
  };
  const schema = JSON.parse(
    await readFile(join(root, "schemas/pack.schema.json"), "utf8"),
  );
  const { catalog, bundled } = await withRepositorySnapshot(
    { root },
    async () => {
      const catalog = await readCatalog({ root, schema });
      const bundled = await prepareBundledAssets({
        root,
        packs: catalog.packs,
        schema,
        assetSources: bundledSources(catalog.entries),
        sourceFiles: catalog.files,
      });
      return { catalog, bundled };
    },
  );
  const packs = catalog.packs;
  setBundledAssets(bundled.manifest);
  const pages = [
    {
      path: "/",
      title: "Prepare for the next run",
      body: renderHome(packs),
      page: "home",
      scripts: ["/assets/src/client/hub.mjs"],
    },
  ];
  for (const [path, title, type] of [
    ["catalog", "The catalog", ""],
    ["items", "Items & resources", "item"],
    ["weapons", "Weapon reference", "weapon"],
    ["recipes", "Recipes & crafting", "recipe"],
    ["guides", "The field manual", "guide"],
  ])
    pages.push({
      path: `/${path}/`,
      title,
      body: renderCatalog(packs, {
        title,
        type,
        compact: path === "items",
        authorTargets: Object.fromEntries(
          catalog.entries.map(({ key, pack }) => [
            pack.id,
            Object.fromEntries(
              pack.items.map((item) => [item.id, guidancePath(key, item.id)]),
            ),
          ]),
        ),
      }),
      page: path,
      scripts: ["/assets/src/client/catalog.mjs"],
    });
  pages.push({
    path: "/items/manage/",
    title: "Add or edit items",
    body: renderItemMaintenance(catalog.entries),
    page: "item-maintenance",
  });
  for (const record of allRecords(packs)) {
    const entry = catalog.entries.find(
      (entry) => entry.pack.id === record.pack.id,
    );
    const guidance = guidancePath(entry.key, record.id);
    pages.push({
      path: recordUrl(record),
      fixture: isFixture(record.pack),
      ownerPath:
        record.recordType === "objective" && !record.spoiler
          ? record.track === "dmz-upgrade"
            ? "/upgrades/"
            : ["dmz-order", "dmz-story"].includes(record.track)
              ? "/missions/"
              : "/progression/"
          : undefined,
      title: publicTitle(record),
      packId: record.pack.id,
      body: renderDetail(record, packs, {
        authorActions: renderAuthorActions(record, {
          edit: guidance + "#edit",
          images: guidance + "#images",
        }),
      }),
      page:
        { item: "items", recipe: "recipes", guide: "guides" }[
          record.recordType
        ] || record.recordType,
    });
    pages.push({
      path: guidance,
      fixture: isFixture(record.pack),
      title: "Edit " + publicTitle(record),
      packId: record.pack.id,
      body: renderAuthorGuidance(record, entry.key),
      page: "contribute",
    });
  }
  for (const moduleName of [
    "private-pages",
    "collection-page",
    "needed-page",
    "quick-collect-page",
    "x01-printer-page",
    "features",
    "editor-page",
    "local-page",
    "field-desk-page",
    "maps-page",
    "progression-page",
    "community-page",
    "armory-page",
    "armory-workbench-page",
    "keys-page",
    "hub-page",
    "main-hubs",
    "run-plan-page",
    "data-review-page",
  ]) {
    const file = join(root, `src/ui/${moduleName}.mjs`);
    try {
      await access(file);
    } catch {
      continue;
    }
    const module = await import(pathToFileURL(file));
    const extensions = await module.featurePages(packs);
    for (const page of extensions)
      pages.push({
        ...quickTrackerPage(page),
        path: "/" + page.path.replace(/^\/+|\/+$/g, "") + "/",
      });
  }
  for (const page of ["planner", "inventory", "settings"])
    if (!pages.some((p) => p.path === `/${page}/`))
      pages.push({
        path: `/${page}/`,
        title: page[0].toUpperCase() + page.slice(1),
        page,
        body: pageHeading(
          "PRIVATE WORKSPACE",
          page[0].toUpperCase() + page.slice(1),
          "This workspace is not available in this build. Your existing browser data has not been changed.",
        ),
      });
  pages.push({
    path: "/map-workspace/",
    title: "Local map workspace",
    page: "map-workspace",
    body: renderMapWorkspace(),
  });
  pages.push({
    path: "/sitemap/",
    title: "Site map",
    page: "sitemap",
    body: renderSiteMap(pages, packs),
    scripts: ["/assets/src/client/site-topology.mjs"],
  });
  const notFoundPage = {
    path: "/404.html",
    title: "Record not found",
    page: "404",
    body:
      pageHeading(
        "404 / NOT FOUND",
        "This route is off the map.",
        "The record may have moved, or the address may be incomplete.",
      ) +
      '<a class="button primary" href="/catalog/">Return to the catalog</a>',
  };
  const siteMapPage = pages.find((page) => page.path === "/sitemap/");
  const routeFamilies = new Map();
  for (const page of [...pages, notFoundPage]) {
    const family = page.path.startsWith("/contribute/")
      ? "Authoring guidance"
      : page.page || "Other pages";
    if (!routeFamilies.has(family)) routeFamilies.set(family, []);
    routeFamilies.get(family).push(page);
  }
  siteMapPage.body += `<section class="panel"><h2>Complete generated route directory</h2><p>Every generated page, including weapon/key details and contribution guidance. The mindmap uses this same build inventory.</p>${[...routeFamilies].map(([family, entries]) => `<details><summary>${e(family)} (${entries.length})</summary><ul class="sitemap-links">${entries.map((page) => `<li><a href="${e(page.path)}">${e(page.title)}</a></li>`).join("")}</ul></details>`).join("")}</section>`;
  setNavigation(pages);
  const paths = new Set();
  for (const page of pages) {
    if (!/^\/(?:[a-zA-Z0-9%_~-]+\/)*$/.test(page.path))
      throw new Error(`Unsafe output route: ${page.path}`);
    if (paths.has(page.path))
      throw new Error(`Duplicate output route: ${page.path}`);
    paths.add(page.path);
  }
  const renderedPages = new Map(
    pages.map((page) => [page.path, renderLayout(page)]),
  );
  for (const page of pages) {
    const file = join(dist, page.path, "index.html");
    await mkdir(dirname(file), { recursive: true });
    await emit(file, renderedPages.get(page.path));
  }
  renderedPages.set(notFoundPage.path, renderLayout(notFoundPage));
  await emit(join(dist, "404.html"), renderedPages.get(notFoundPage.path));
  await mkdir(join(dist, "assets"), { recursive: true });
  const authorOnly = new Set([
    "src/content/author-target.mjs",
    "src/ui/author-actions.mjs",
    "src/client/studio.mjs",
    "src/content/studio-recovery.mjs",
    "src/client/studio-media.mjs",
    "src/ui/studio-page.mjs",
    "src/ui/studio.css",
  ]);
  const copyFilter = (path) =>
    !authorOnly.has(relative(root, path).replaceAll("\\", "/"));
  for (const folder of ["src", "schemas"]) {
    await copyInventory(
      join(root, folder),
      join(dist, "assets", folder),
      copyFilter,
    );
    await cp(join(root, folder), join(dist, "assets", folder), {
      recursive: true,
      filter: copyFilter,
    });
  }
  await mkdir(join(dist, "assets/content/packs"), { recursive: true });
  await emit(
    join(dist, "assets/content/site-topology.json"),
    JSON.stringify(buildSiteTopology([...pages, notFoundPage], renderedPages)),
  );
  await emit(
    join(dist, "assets/content/unified-search.json"),
    JSON.stringify(await buildUnifiedIndex(packs)),
  );
  for (const { key, pack } of catalog.entries) {
    await emit(
      join(dist, "assets/content/packs", `${key}.json`),
      catalogJSON(pack),
    );
  }
  await copyInventory(
    join(root, "content/site.json"),
    join(dist, "assets/content/site.json"),
  );
  await cp(
    join(root, "content/site.json"),
    join(dist, "assets/content/site.json"),
  );
  await emit(
    join(dist, "assets/content/manifest.json"),
    JSON.stringify(
      {
        packs: catalog.entries.map(
          ({ key }) => `/assets/content/packs/${key}.json`,
        ),
        catalogs: catalog.entries.map(({ key, pack }) => ({
          id: pack.id,
          title: pack.title,
          path: `/assets/content/packs/${key}.json`,
        })),
      },
      null,
      2,
    ),
  );
  for (const file of bundled.files) expected(join(dist, file.url), file.bytes);
  expected(
    join(dist, "assets/content/bundled-assets.json"),
    JSON.stringify(bundled.manifest, null, 2),
  );
  await writeBundledAssets({ dist, ...bundled });
  const afterSources = await captureBuildSources(root);
  if (JSON.stringify(sourceFiles) !== JSON.stringify(afterSources))
    throw new Error(
      "Build source inputs changed during generation; previous build retained",
    );
  const identity = createBuildIdentity({
    sourceFiles,
    git: gitIdentity,
    catalogFiles: catalog.files,
    packs: catalog.entries.map(({ key, pack }) => [key, catalogJSON(pack)]),
    mediaFiles: bundled.files,
    outputFiles: inventory,
  });
  await emit(
    join(dist, "assets/build-identity.json"),
    JSON.stringify(identity, null, 2) + "\n",
  );
  return { count: pages.length, inventory };
}

try {
  const result = await publishBuild({
    root,
    generate,
    validate: async (dist, { inventory }) => {
      for (const [file, hash] of inventory) {
        const path = join(dist, file),
          info = await lstat(path);
        if (
          !info.isFile() ||
          info.isSymbolicLink() ||
          digest(await readFile(path)) !== hash
        )
          throw new Error(`Generated output missing or changed: ${file}`);
      }
    },
  });
  for (const warning of result.warnings) console.warn(warning);
  console.log(
    `Built ${result.value.count} independent HTML routes and 404 page in dist/.`,
  );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
