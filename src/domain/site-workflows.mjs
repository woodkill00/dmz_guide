import { features, featureURL } from "../ui/feature-registry.mjs";

export const siteTopics = [
  {
    id: "home",
    title: "Start and resume a task",
    text: "Use Home for live progress, then open a task shortcut. Pin frequently used tools in All features; recent work stays in Workspace.",
    links: [
      ["home", "Open dashboard"],
      ["features", "Pin a feature"],
    ],
  },
  {
    id: "navigation",
    title: "Navigate the site",
    text: "Use the same main navigation and Workspace menu on the guide and maps. Breadcrumbs identify the current section. A feature link opens its owning tool; browser Back returns to the previous view.",
    links: [
      ["features", "All features"],
      ["sitemap", "Visual site map"],
    ],
  },
  {
    id: "search",
    title: "Search everything",
    text: "Search public items, weapons, keys, Orders, upgrades and locations. Narrow the record type, use Previous or Next, and share the search URL. Ctrl or Command K opens search on guide pages.",
    links: [["search", "Search records and tools"]],
  },
  {
    id: "recovery",
    title: "Save, back up and recover",
    text: "A save notice follows a completed local transaction. Open Workspace backup to preview existing guide and armory exports, including available previous snapshots. Download the checked bundle, verify the file in Downloads, then use each owning tool's restore preview. Map, photos, audit, Content quality notes and run plans may need separate exports; inspect omissions. Browser storage is separate for each browser and address.",
    links: [
      ["workspace-backup", "Preview a backup"],
      ["settings", "Guide restore"],
      ["armory-workbench", "Armory recovery", "backups"],
      ["field-desk", "Field/photo backup", "field-backups"],
      ["tool-backups", "Map backups"],
    ],
  },
  {
    id: "progress",
    title: "Track consistent progress",
    text: "Inventory, Needed, upgrades and Orders use the same selected guide profile. Weapons and camo pages share the armory record. Manual ownership, extracted manuals and camo completion remain separate. Another-tab save notice never overwrites your draft: finish or export edits before using the owning tool's Reload saved action.",
    links: [
      ["inventory", "Inventory"],
      ["needed", "Needed items"],
      ["weapon-acquisition", "Manuals and blueprints"],
      ["upgrades", "Upgrades"],
      ["missions", "Orders"],
    ],
  },
  {
    id: "design",
    title: "Choose comfortable or compact spacing",
    text: "Workspace offers compact or comfortable spacing. It changes the interface, not item quantities or map data. Disclosures keep secondary controls out of the way; each tool retains its own saved layout.",
    links: [
      ["track-items", "Browse item columns"],
      ["home", "Dashboard layout"],
    ],
  },
  {
    id: "keyboard",
    title: "Keyboard, touch and small screens",
    text: "Tab reaches links and controls; Enter or Space activates them. Escape closes Workspace and returns focus. Use the skip link to reach main content. Mobile layouts stack panels; scroll inside long tables or menus. Browser zoom remains available. Maps also provide lists and keyboard controls in map help.",
    links: [
      ["maps", "Location list"],
      ["map-help", "Map keyboard help"],
    ],
  },
  {
    id: "quality",
    title: "Find missing or disputed information",
    text: "Content quality lists specific public reference gaps. Filter by type, field or review state; open the exact record or editor. Fill later and Checked are local editorial notes, never player completion or proof of accuracy. A changed record or cited source makes an old check stale. An image reference is not proof the picture file exists.",
    links: [
      ["quality", "Content quality"],
      ["mission-audit", "Mission section audit"],
      ["data-review", "Source and catalog review"],
    ],
  },
  {
    id: "editing",
    title: "Edit text, pictures and sections",
    text: "Choose Edit on a record, or use an exact editor link from Content quality. Start the local author service if needed. Use fields and sections to edit text, add authorized pictures through the image library, then Review changes before Save. History and recovery provide checkpoint/previous revisions and restore-into-draft previews. Repository edits do not change your player inventory; refresh the reader after saving.",
    links: [
      ["studio", "Open Content Studio"],
      ["editor", "Private record editor"],
      ["quality", "Choose an exact record"],
    ],
  },
  {
    id: "maps",
    title: "Use maps and routes",
    text: "Choose Hajin, X01, Safe Run or Loot Run. Keep the correct X01 floor selected. Marker details and item loot-location buttons open recorded locations; missing coordinates are not guessed. Select stops, reorder waypoints and inspect road coverage. Routes and distance estimates are planning aids, not guaranteed safe paths or live game GPS. Map layouts, source layers and backups belong to the map workspace.",
    links: [
      ["hajin-map", "Hajin"],
      ["x01-map", "X01"],
      ["safe-runs", "Safe Run"],
      ["loot-runs", "Loot Run"],
      ["map-help", "Route and floor instructions"],
    ],
  },
  {
    id: "sources",
    title: "Review source and patch updates",
    text: "Each update stays with its owner. Catalog review shows old/proposed claims and plan impact; map updates stage source changes before review/apply; the weapon update dashboard separates source modes and patch proposals. Check dates and conflicts and preserve local corrections. Opening these links does not fetch or apply source data automatically.",
    links: [
      ["data-review", "Catalog change review"],
      ["tool-updates", "Staged map updates"],
      ["weapon-updates", "Weapon/patch updates"],
      ["mission-audit", "Mission follow-up"],
    ],
  },
  {
    id: "performance",
    title: "Keep pages responsive",
    text: "Search waits briefly while you type and limits each result page; Content quality also pages its rows. Images retain lazy loading. Close secondary panels when working on a map. Maintainers can run npm run test:sitewide to record route/search/layout measurements on this machine; those values are not universal speed guarantees.",
    links: [
      ["search", "Try search"],
      ["quality", "Paged quality list"],
    ],
  },
  {
    id: "testing",
    title: "Verify a release",
    text: "Maintainers run npm run test:sitewide for connected journeys and local measurements, plus the documented runtime/build/map/format checks. Use disposable browser profiles for tests. Verification must include failed saves, stale tabs, restoration previews and mobile/keyboard paths. A passing local check is not a deployed release or a GitHub CI result.",
    links: [
      ["sitemap", "Review site connections"],
      ["features", "Feature directory"],
      ["workspace-backup", "Recovery checks"],
    ],
  },
  {
    id: "help",
    title: "Get help and report a problem",
    text: "Search this help page or Content quality. For a problem, record the page address, action, expected result and actual result. Include a redacted screenshot if useful; never share passwords, cookies or private backups publicly. Check saved/unsaved status before reloading.",
    links: [
      ["help", "All instructions"],
      ["quality", "Content gaps"],
      ["community", "Sources and contribution guidance"],
    ],
  },
];
export function workflowLink(id, hash = "", surface = "guide") {
  const feature = features.find((f) => f.id === id);
  if (!feature) throw Error(`Unknown workflow feature: ${id}`);
  return (
    featureURL(feature, surface) + (hash ? "#" + encodeURIComponent(hash) : "")
  );
}
export const mapWorkflows = ["hajin-map", "x01-map", "safe-runs", "loot-runs"];
export const taskWorkflows = [
  ["quick-collect", "Collect needed items"],
  ["inventory", "Update inventory"],
  ["upgrades", "Choose an upgrade"],
  ["missions", "Continue Orders"],
  ["weapon-acquisition", "Track manuals and camos"],
  ["hajin-map", "Plan a map route"],
  ["quality", "Review content"],
  ["workspace-backup", "Back up progress"],
];
export function workspacePreferences(raw) {
  const fallback = { version: 1, density: "comfortable", topics: [] };
  if (typeof raw !== "string" || new TextEncoder().encode(raw).length > 2048)
    return fallback;
  try {
    const v = JSON.parse(raw);
    if (
      !v ||
      Object.keys(v).sort().join() !== "density,topics,version" ||
      v.version !== 1 ||
      !["compact", "comfortable"].includes(v.density) ||
      !Array.isArray(v.topics) ||
      v.topics.length > 14 ||
      new Set(v.topics).size !== v.topics.length ||
      v.topics.some((id) => !siteTopics.some((t) => t.id === id))
    )
      return fallback;
    return structuredClone(v);
  } catch {
    return fallback;
  }
}
