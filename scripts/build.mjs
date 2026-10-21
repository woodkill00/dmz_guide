import {
  readFile,
  readdir,
  mkdir,
  writeFile,
  rm,
  cp,
  access,
} from "node:fs/promises";
import { resolve, dirname, join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  renderLayout,
  renderHome,
  renderCatalog,
  renderDetail,
  allRecords,
  recordUrl,
  pageHeading,
  setNavigation,
  publicTitle,
  setBundledAssets,
} from "../src/ui/render.mjs";
import { readCatalog, bundledSources, catalogJSON } from "./catalog.mjs";
import { prepareBundledAssets, writeBundledAssets } from "./bundled-assets.mjs";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const schema = JSON.parse(
  await readFile(join(root, "schemas/pack.schema.json"), "utf8"),
);
const catalog = await readCatalog({ root, schema });
const packs = catalog.packs;
const bundled = await prepareBundledAssets({
  root,
  packs,
  schema,
  assetSources: bundledSources(catalog.entries),
  sourceFiles: catalog.files,
});
setBundledAssets(bundled.manifest);
const pages = [
  {
    path: "/",
    title: "Prepare for the next run",
    body: renderHome(packs),
    page: "home",
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
    body: renderCatalog(packs, { title, type }),
    page: path === "items" || path === "weapons" ? "catalog" : path,
    scripts: ["/assets/src/client/catalog.mjs"],
  });
for (const record of allRecords(packs))
  pages.push({
    path: recordUrl(record),
    title: publicTitle(record),
    body: renderDetail(record, packs),
    page:
      { item: "catalog", recipe: "recipes", guide: "guides" }[
        record.recordType
      ] || record.recordType,
  });
for (const moduleName of [
  "private-pages",
  "features",
  "editor-page",
  "local-page",
  "maps-page",
  "progression-page",
  "community-page",
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
      ...page,
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
setNavigation(pages);
const paths = new Set();
for (const page of pages) {
  if (!/^\/(?:[a-zA-Z0-9%_~-]+\/)*$/.test(page.path))
    throw new Error(`Unsafe output route: ${page.path}`);
  if (paths.has(page.path))
    throw new Error(`Duplicate output route: ${page.path}`);
  paths.add(page.path);
}
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
for (const page of pages) {
  const file = join(dist, page.path, "index.html");
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, renderLayout(page));
}
await writeFile(
  join(dist, "404.html"),
  renderLayout({
    title: "Record not found",
    page: "404",
    body:
      pageHeading(
        "404 / NOT FOUND",
        "This route is off the map.",
        "The record may have moved, or the address may be incomplete.",
      ) +
      '<a class="button primary" href="/catalog/">Return to the catalog</a>',
  }),
);
await mkdir(join(dist, "assets"), { recursive: true });
const authorOnly = new Set([
  "src/client/studio.mjs",
  "src/client/studio-media.mjs",
  "src/client/raster-editor.mjs",
  "src/ui/studio-page.mjs",
  "src/ui/studio.css",
]);
for (const folder of ["src", "schemas"])
  await cp(join(root, folder), join(dist, "assets", folder), {
    recursive: true,
    filter: (path) =>
      !authorOnly.has(relative(root, path).replaceAll("\\", "/")),
  });
await mkdir(join(dist, "assets/content/packs"), { recursive: true });
for (const { key, pack } of catalog.entries) {
  await writeFile(
    join(dist, "assets/content/packs", `${key}.json`),
    catalogJSON(pack),
  );
}
await cp(
  join(root, "content/site.json"),
  join(dist, "assets/content/site.json"),
);
await writeFile(
  join(dist, "assets/content/manifest.json"),
  JSON.stringify(
    {
      packs: catalog.entries.map(
        ({ key }) => `/assets/content/packs/${key}.json`,
      ),
    },
    null,
    2,
  ),
);
await writeBundledAssets({ dist, ...bundled });
console.log(
  `Built ${pages.length} independent HTML routes and 404 page in dist/.`,
);
