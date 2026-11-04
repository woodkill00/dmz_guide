import destinations from "./map-destinations.json" with { type: "json" };
export const featureGroups = ["Map", "Prepare", "Track", "Reference", "Manage"];
const rows = [
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
    "safe-runs",
    "Safe runs",
    "Map",
    "/safes.html",
    "Select safes and a spawn to plan a visit order",
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
  ["editor", "Editor", "Manage", "/editor/", "Private record editor"],
  ["local", "Private reader", "Reference", "/local/", "Your private content"],
  [
    "community",
    "Community",
    "Manage",
    "/community/",
    "Sources and contribution guidance",
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
export function featureURL(feature, surface = "guide") {
  if (feature.kind === "studio") return "http://127.0.0.1:4174" + feature.path;
  if (feature.kind === "map")
    return (
      (surface === "map" || surface === "help" ? "" : "http://127.0.0.1:5175") +
      feature.path
    );
  return (surface === "guide" ? "" : "http://127.0.0.1:4173") + feature.path;
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
