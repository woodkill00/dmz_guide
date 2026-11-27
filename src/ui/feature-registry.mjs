import destinations from "./map-destinations.json" with { type: "json" };
import { mapPath } from "../domain/map-routes.mjs";
import { servicePath } from "../domain/local-services.mjs";
// Display names can change without changing feature IDs, routes or saved bookmarks.
export const navigationConfig = {
  primary: [
    { id: "home", label: "Home" },
    { id: "hajin-map", label: "Map" },
    { id: "planner", label: "Track" },
    { id: "missions", label: "Orders" },
    { id: "catalog", label: "Reference" },
    { id: "settings", label: "Manage" },
    { id: "search", label: "Search" },
  ],
  // Keys are existing registry identities, not the text shown in the menu.
  groups: [
    { key: "Map", id: "map", label: "Map" },
    { key: "Prepare", id: "prepare", label: "Track" },
    { key: "Track", id: "track", label: "Progression" },
    { key: "Reference", id: "reference", label: "Reference" },
    { key: "Manage", id: "manage", label: "Manage" },
  ],
  trackerTabs: [
    { id: "inventory", label: "Inventory" },
    { id: "track-items", label: "Items" },
    { id: "armory-workbench", label: "Weapons", hash: "acquisition" },
    { id: "upgrades", label: "Upgrades" },
    { id: "needed", label: "Needed" },
    { id: "quick-collect", label: "Quick collect" },
    { id: "field-desk", label: "Field desk" },
  ],
  modernPrimary: [
    "home",
    "hajin-map",
    "dmz-guide",
    "dmz-fob",
    "dmz-weapons",
    "missions",
  ],
  hubs: [
    { key: "Map", label: "Map" },
    { key: "DMZ Guide", label: "DMZ Guide" },
    { key: "DMZ FOB", label: "DMZ FOB" },
    { key: "DMZ Weapons", label: "DMZ Weapons" },
    { key: "Tools", label: "Tools" },
  ],
  featureLabels: {
    "hajin-map": "Map",
    missions: "Orders",
    "tool-missions": "Map mission tracker",
    settings: "Guide profiles & backups",
    "tool-settings": "Map settings",
    "tool-backups": "Map backups",
    "tool-workspace-search": "Search my map workspace",
    "tool-explore": "Find map locations",
    "tool-updates": "Map source updates",
    "weapon-updates": "Weapon source updates",
    armory: "Weapons",
    "armory-workbench": "Weapons",
    recipes: "Crafting recipes",
  },
};
export function validateNavigationConfig(config) {
  if (
    !Array.isArray(config.modernPrimary) ||
    !config.modernPrimary.length ||
    new Set(config.modernPrimary).size !== config.modernPrimary.length ||
    config.modernPrimary.some((id) => typeof id !== "string" || !id)
  )
    throw Error("Modern navigation feature identities must be unique");
  for (const [rows, identity] of [
    [config.primary, "id"],
    [config.trackerTabs, "id"],
    [config.groups, "key"],
    [config.hubs, "key"],
  ]) {
    if (
      !Array.isArray(rows) ||
      !rows.length ||
      new Set(rows.map((row) => row[identity])).size !== rows.length ||
      new Set(rows.map((row) => row.label?.trim().toLowerCase())).size !==
        rows.length ||
      rows.some(
        (row) =>
          typeof row[identity] !== "string" ||
          typeof row.label !== "string" ||
          !row.label.trim() ||
          row.label.length > 80,
      )
    )
      throw Error(
        "Navigation identities and labels must be unique and nonempty",
      );
  }
  if (
    new Set(config.groups.map((row) => row.id)).size !== config.groups.length ||
    config.groups.some((row) => !/^[a-z][a-z0-9-]*$/.test(row.id))
  )
    throw Error("Invalid navigation group anchor");
  return config;
}
validateNavigationConfig(navigationConfig);
export const navigationGroup = (key, config = navigationConfig) =>
  config.groups.find((group) => group.key === key);

export const featureGroups = navigationConfig.groups.map((group) => group.key);
const rows = [
  [
    "track-items",
    "Items by rarity",
    "Prepare",
    "/track/items/",
    "All recorded items, grouped by rarity and sorted alphabetically",
  ],
  [
    "field-desk",
    "Field desk",
    "Prepare",
    "/field-desk/",
    "Screenshot stash scans, carried gear, run reconciliation, discoveries and quantity history",
  ],
  [
    "quick-collect",
    "Quick collect",
    "Prepare",
    "/quick-collect/",
    "Remaining items and found amounts saved directly to inventory",
  ],
  [
    "x01-printer",
    "X01 3D Printer",
    "Prepare",
    "/recipes/x01/",
    "In-raid printer recipes and carried-material requirements",
  ],
  [
    "needed",
    "Needed / remaining items",
    "Prepare",
    "/needed/",
    "Outstanding upgrade items and ingredient printing from saved stock",
  ],
  [
    "item-maintenance",
    "Add or edit items",
    "Reference",
    "/items/manage/",
    "Maintain item definitions, categories and rarities",
  ],
  [
    "dmz-guide",
    "DMZ Guide",
    "Reference",
    "/dmz-guide/",
    "Missions, keys and field reference",
  ],
  [
    "dmz-fob",
    "DMZ FOB",
    "Prepare",
    "/dmz-fob/",
    "Upgrades, inventory, crafting and preparation",
  ],
  [
    "dmz-weapons",
    "DMZ Weapons",
    "Reference",
    "/dmz-weapons/",
    "Weapons, attachments and loadout tools",
  ],
  ["home", "Home", "Prepare", "/", "Your field desk and recent work"],
  ["hajin-map", "Interactive map", "Map", "/", "Explore Hajin", "map"],
  [
    "x01-map",
    "X01 Black Site",
    "Map",
    "/x01-workspace.html",
    "Compare X01 floors, plan routes, and save your own POIs",
    "map",
  ],
  [
    "safe-runs",
    "Safe runs",
    "Map",
    "/safes.html",
    "Select safes and a spawn to plan a visit order",
    "map",
  ],
  [
    "loot-runs",
    "Loot runs",
    "Map",
    "/loot.html",
    "Plan a combined safe and clinic visit order",
    "map",
  ],
  ["maps", "Maps", "Map", "/maps/", "Native map and location list"],
  [
    "map-workspace",
    "Local map workspace",
    "Map",
    "/map-workspace/",
    "Start and understand the companion",
  ],
  ["planner", "Planner", "Prepare", "/planner/", "Plan collection goals"],
  ["inventory", "Inventory", "Prepare", "/inventory/", "Record held items"],
  [
    "collection",
    "Collect",
    "Prepare",
    "/collection/",
    "Find remaining materials",
  ],
  [
    "upgrades",
    "Upgrades",
    "Prepare",
    "/upgrades/",
    "Review tiers and unfinished requirements",
  ],
  [
    "recipes",
    "Recipes",
    "Prepare",
    "/recipes/",
    "Crafting ingredients and tools",
  ],
  ["keys", "Keys", "Prepare", "/keys/", "Key stash, access and trip packing"],
  [
    "missions",
    "Missions",
    "Track",
    "/missions/",
    "DMZ Orders and story progress",
  ],
  [
    "mission-audit",
    "Mission audit",
    "Manage",
    "/missions/audit/",
    "Review Orders and Story Mission content sections",
  ],
  [
    "progression",
    "Progress",
    "Track",
    "/progression/",
    "All separate progression tracks",
  ],
  ["catalog", "Catalog", "Reference", "/catalog/", "All bundled records"],
  ["items", "Items", "Reference", "/items/", "Resources and item uses"],
  ["weapons", "Weapons", "Reference", "/weapons/", "Weapon reference"],
  [
    "armory",
    "Weapon database",
    "Reference",
    "/armory/",
    "Guns, attachments and statistics",
  ],
  [
    "armory-workbench",
    "Armory workbench",
    "Prepare",
    "/armory/workbench/",
    "Compare and save weapon builds",
  ],
  [
    "weapon-acquisition",
    "Weapon blueprints & acquisition",
    "Track",
    "/armory/acquisition/",
    "Manual ownership, extracted-manual camo progress and sourced blueprint checklists",
  ],
  [
    "weapon-camos",
    "Weapon camos",
    "Reference",
    "/armory/camos/",
    "Per-weapon camo pictures, requirements and unlock order",
  ],
  ["guides", "Guides", "Reference", "/guides/", "Field manual"],
  [
    "weapon-updates",
    "Weapon updates",
    "Manage",
    "/armory/updates/",
    "Review source checks and patch reports",
  ],
  [
    "settings",
    "Settings",
    "Manage",
    "/settings/",
    "Private profiles and backups",
  ],
  [
    "workspace-backup",
    "Workspace backup",
    "Manage",
    "/workspace-backup/",
    "Bundle private exports and inspect recovery modules",
  ],
  [
    "data-review",
    "Source & catalog review",
    "Manage",
    "/data-review/",
    "Review catalog claims and update impacts",
  ],
  ["editor", "Editor", "Manage", "/editor/", "Private record editor"],
  ["local", "Private reader", "Reference", "/local/", "Your private content"],
  [
    "community",
    "Community",
    "Manage",
    "/community/",
    "Sources and contribution guidance",
  ],
  [
    "help",
    "Help & instructions",
    "Manage",
    "/help/",
    "Searchable instructions for every main workflow",
  ],
  [
    "quality",
    "Content quality",
    "Manage",
    "/quality/",
    "Review field-level reference gaps and exact editor links",
  ],
  ["sitemap", "Site map", "Manage", "/sitemap/", "All pages and records"],
  [
    "map-help",
    "Map help",
    "Reference",
    "/help.html",
    "Map workspace documentation",
    "map",
  ],
  ["studio", "Content Studio", "Manage", "/", "Repository authoring", "studio"],
  [
    "search",
    "Search everything",
    "Reference",
    "/search/",
    "Find records and tools",
  ],
  [
    "features",
    "All features",
    "Manage",
    "/features/",
    "Search every workspace and tool",
  ],
];
export const features = Object.freeze([
  ...rows.map(([id, label, group, path, description, kind = "guide"]) => ({
    id,
    label,
    group,
    path,
    description,
    kind,
  })),
  ...destinations.tools.map(([id, label]) => ({
    id: "tool-" + id,
    label,
    group: [
      "sources",
      "review",
      "updates",
      "backups",
      "duplicates",
      "completeness",
      "discrepancies",
    ].includes(id)
      ? "Manage"
      : "Map",
    path: "/?tool=" + id,
    description: "Map workspace · " + label,
    kind: "map",
  })),
  ...destinations.planner.map(([id, label]) => ({
    id: id === "boss-checklist" ? id : "tool-" + id,
    label,
    group: [
      "missions",
      "boss-checklist",
      "journal",
      "match-mode",
      "session-playback",
    ].includes(id)
      ? "Track"
      : [
            "settings",
            "recovery",
            "packs",
            "source-check",
            "update-impacts",
            "backup-guide",
          ].includes(id)
        ? "Manage"
        : "Map",
    path: "/?tool=" + id,
    description: "Map planning and trackers · " + label,
    kind: "map",
  })),
]);
export function featureURL(
  feature,
  surface = "guide",
  { mapBase = ["map", "help"].includes(surface) ? "/" : "/map/" } = {},
) {
  const weaponDestinations = {
    "dmz-weapons": "/armory/",
    weapons: "/armory/#reference",
    "armory-workbench": "/armory/",
    "weapon-acquisition": "/armory/#acquisition",
    "weapon-camos": "/armory/#camos",
  };
  const path = weaponDestinations[feature.id] || feature.path;
  if (feature.kind === "studio")
    return surface === "studio"
      ? feature.path
      : servicePath("author", feature.path);
  if (feature.kind === "map")
    return ["studio", "manager"].includes(surface)
      ? servicePath("guide", mapPath(feature.path))
      : mapPath(feature.path, { standalone: mapBase === "/" });
  return surface === "guide" ||
    (["map", "help"].includes(surface) && mapBase === "/map/")
    ? path
    : servicePath("guide", path);
}
export function featureForPage(page) {
  return (
    features.find((f) => f.id === page) ||
    features.find(
      (f) =>
        f.id ===
        {
          item: "items",
          recipe: "recipes",
          guide: "guides",
          objective: "missions",
          location: "maps",
          weapon: "weapons",
        }[page],
    )
  );
}
