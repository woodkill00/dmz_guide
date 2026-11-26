import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { features, featureURL } from "../src/ui/feature-registry.mjs";
import { MAP_ENTRIES } from "../src/domain/map-routes.mjs";
import { unapprovedLayoutDeclarations } from "./ui-layout-policy.mjs";
const require = createRequire(
  new URL("../tools/hajin-map/package.json", import.meta.url),
);
const postcss = require("postcss");
const root = fileURLToPath(new URL("..", import.meta.url));
async function walk(dir) {
  return (
    await Promise.all(
      (await fs.readdir(dir, { withFileTypes: true })).map((e) =>
        e.isDirectory()
          ? walk(path.join(dir, e.name))
          : [path.join(dir, e.name)],
      ),
    )
  ).flat();
}
const cssFiles = (
  await Promise.all(
    ["src", "tools/hajin-map/src"].map((d) => walk(path.join(root, d))),
  )
)
  .flat()
  .filter((p) => p.endsWith(".css"));
const sheets = [];
const arithmeticProps =
  /^(?:(?:min-|max-)?(?:width|height|inline-size|block-size)|padding(?:-.+)?|margin(?:-.+)?|gap|row-gap|column-gap|top|right|bottom|left|inset(?:-.+)?|border-radius|font-size|scroll-(?:margin|padding)(?:-.+)?)$/;
for (const file of cssFiles) {
  const text = await fs.readFile(file, "utf8"),
    ast = postcss.parse(text, { from: file }),
    raw = [],
    imports = [],
    selectors = [];
  ast.walkRules((rule) =>
    selectors.push({
      selector: rule.selector,
      line: rule.source.start.line,
      properties: rule.nodes
        .filter((n) => n.type === "decl")
        .map((n) => n.prop),
    }),
  );
  ast.walkAtRules("import", (r) => imports.push(r.params));
  ast.walkDecls((d) => {
    if (
      arithmeticProps.test(d.prop) &&
      /(?<![-\w])(?:\d*\.)?\d+(?:rem|px|vh|vw|dvh|vi|vb)\b/.test(d.value)
    )
      raw.push({
        property: d.prop,
        value: d.value,
        selector: d.parent.selector || "@rule",
        line: d.source.start.line,
      });
  });
  sheets.push({
    file: path.relative(root, file).replaceAll("\\", "/"),
    bytes: Buffer.byteLength(text),
    imports,
    selectors,
    rawLayoutDeclarations: raw,
  });
}
const topology = JSON.parse(
  await fs.readFile(
    path.join(root, "dist/assets/content/site-topology.json"),
    "utf8",
  ),
);
const routes = topology.nodes
  .filter((n) => n.id.startsWith("route:"))
  .map((n) => ({ href: n.href, family: n.family || n.kind, kind: n.kind }));
const familyOwners = {
  404: "aliases-status",
  home: "dashboard",
  inventory: "inventory-items",
  "track-items": "inventory-items",
  "item-maintenance": "inventory-items",
  upgrades: "fob-upgrades",
  "dmz-fob": "fob-upgrades",
  missions: "orders-story",
  objective: "reference-details",
  "mission-audit": "audits",
  quality: "audits",
  armory: "weapons",
  "armory-workbench": "weapons",
  "weapon-updates": "management",
  keys: "keys",
  items: "reference-details",
  local: "reference-details",
  location: "reference-details",
  guides: "reference-details",
  recipes: "reference-details",
  maps: "reference-details",
  catalog: "shell-navigation",
  search: "shell-navigation",
  features: "shell-navigation",
  "dmz-guide": "shell-navigation",
  help: "help-diagnostics",
  sitemap: "help-diagnostics",
  community: "management",
  contribute: "management",
  "data-review": "management",
  editor: "editors",
  "field-desk": "field-tools",
  "run-plan": "field-tools",
  planner: "field-tools",
  "quick-collect": "needed-quick-collect",
  needed: "needed-quick-collect",
  collection: "needed-quick-collect",
  "x01-printer": "needed-quick-collect",
  map: "hajin-map",
  "map-workspace": "map-management",
  progression: "fob-upgrades",
  settings: "backup-settings",
  "workspace-backup": "backup-settings",
};
for (const route of routes) {
  route.sourceFamily = route.family;
  route.family = familyOwners[route.sourceFamily];
  if (!route.family) throw Error("Unclassified family " + route.sourceFamily);
}
const report = {
  scope: "Public source/layout inventory only; no profile or game-state data",
  base: "a5baed481b92dadf7514234c01fede3bf84834fb",
  features: features.map((f) => ({
    id: f.id,
    href: featureURL(f),
    kind: f.kind,
  })),
  routes,
  mapEntries: MAP_ENTRIES.map((file) => ({
    file,
    owner: "tools/hajin-map",
    family:
      {
        "index.html": "hajin-map",
        "help.html": "help-diagnostics",
        "safes.html": "safe-run",
        "loot.html": "loot-run",
        "x01.html": "x01-source-view",
        "x01-dmzhub.html": "x01-floor-view",
        "x01-workspace.html": "x01-workspace",
        "migration.html": "backup-settings",
      }[file] ||
      (() => {
        throw Error("Unclassified map entry " + file);
      })(),
    scope: "map companion entry; guide aliases remain registry-owned",
  })),
  sheets,
};
if (routes.some((r) => !r.family)) throw Error("Unclassified route");
await fs.mkdir(path.join(root, "test-results"), { recursive: true });
await fs.writeFile(
  path.join(root, "test-results/109-ui-inventory.json"),
  JSON.stringify(report, null, 2),
);
const summary = {
  features: report.features.length,
  routes: routes.length,
  families: [...new Set(routes.map((r) => r.family))].sort(),
  stylesheets: sheets.length,
  rawLayoutDeclarations: sheets.reduce(
    (n, s) => n + s.rawLayoutDeclarations.length,
    0,
  ),
  cssBytes: sheets.reduce((n, s) => n + s.bytes, 0),
};
if (process.argv.includes("--baseline"))
  await fs.writeFile(
    path.join(root, "specs/109-sitewide-usability-design/layout-baseline.json"),
    JSON.stringify(
      {
        scope: report.scope,
        summary,
        rawCounts: Object.fromEntries(
          sheets.map((s) => [s.file, s.rawLayoutDeclarations.length]),
        ),
      },
      null,
      2,
    ),
  );
else {
  const ledger = JSON.parse(
    await fs.readFile(
      path.join(
        root,
        "specs/109-sitewide-usability-design/layout-exceptions.json",
      ),
      "utf8",
    ),
  );
  const unapproved = unapprovedLayoutDeclarations(sheets, ledger);
  if (unapproved.length)
    throw Error(
      "Unreviewed layout declaration: " + JSON.stringify(unapproved[0]),
    );
  const budgets = JSON.parse(
    await fs.readFile(
      path.join(
        root,
        "specs/109-sitewide-usability-design/performance-budgets.json",
      ),
      "utf8",
    ),
  );
  if (summary.cssBytes > budgets.cssSourceBytesMaximum)
    throw Error("CSS source byte budget exceeded");
  const baseline = JSON.parse(
    await fs.readFile(
      path.join(
        root,
        "specs/109-sitewide-usability-design/layout-baseline.json",
      ),
      "utf8",
    ),
  );
  const increased = sheets.filter(
    (s) =>
      s.rawLayoutDeclarations.filter(
        (d) => !(d.value.includes("calc(") && d.value.includes("var(--ui-")),
      ).length > (baseline.rawCounts[s.file] || 0),
  );
  if (increased.length)
    throw Error(
      "Unapproved new raw layout dimensions: " +
        increased.map((s) => s.file).join(","),
    );
}
console.log(JSON.stringify(summary));
