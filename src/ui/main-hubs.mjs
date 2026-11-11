import { resolvePresentation } from "./presentation-config.mjs";
import { features, featureURL } from "./feature-registry.mjs";
import { e, pageHeading } from "./render.mjs";
const card = (id) => {
  const f = features.find((f) => f.id === id);
  if (!f) throw Error("Unknown hub destination");
  return `<article class="hub-card"><h3><a data-workspace-link data-feature-id="${e(f.id)}" href="${e(featureURL(f))}">${e(f.label)}</a></h3><p>${e(f.description)}</p></article>`;
};
const section = (id, title, copy, ids) =>
  `<section id="${id}" class="panel" aria-labelledby="${id}-title"><h2 id="${id}-title">${title}</h2><p>${copy}</p><div class="hub-grid">${ids.map(card).join("")}</div></section>`;
const links = () =>
  resolvePresentation("guide").variant === "modern"
    ? ""
    : '<p><a data-workspace-link href="/">Home</a> · <a data-workspace-link href="/dmz-guide/">DMZ Guide</a> · <a data-workspace-link href="/dmz-fob/">DMZ FOB</a> · <a data-workspace-link href="/dmz-weapons/">DMZ Weapons</a> · <a href="http://127.0.0.1:5175/" target="_blank" rel="noopener noreferrer">Map ↗</a></p>';
export function featurePages() {
  return [
    {
      path: "/dmz-guide/",
      page: "dmz-guide",
      title: "DMZ Guide",
      body:
        pageHeading(
          "FIELD REFERENCE",
          "DMZ Guide",
          "Find missions, keys and the reference information for your next deployment.",
        ) +
        links() +
        '<p class="actions"><a href="/data-review/">Review unknown and disputed data</a></p>' +
        section(
          "missions",
          "Missions and progression",
          "Review available definitions and your manually recorded progress. Unknown coverage remains unknown.",
          ["missions", "progression"],
        ) +
        section(
          "field-reference",
          "Keys and field reference",
          "Find access requirements and sourced guides. Check each record’s evidence and coverage.",
          ["keys", "guides", "catalog", "local"],
        ),
    },
    {
      path: "/dmz-fob/",
      page: "dmz-fob",
      title: "DMZ FOB",
      body:
        pageHeading(
          "FORWARD OPERATING BASE",
          "DMZ FOB",
          "Prepare your upgrades, materials and loadout. Existing trackers remain the place to record progress.",
        ) +
        links() +
        '<p class="actions"><a class="button primary" href="/run-plan/">Prepare my next run</a></p>' +
        section(
          "upgrades",
          "Upgrades",
          "Open the existing upgrade tracker to review tiers, requirements and completion. This hub does not change inventory or mark progress.",
          ["upgrades", "needed", "quick-collect"],
        ) +
        section(
          "inventory",
          "Inventory and materials",
          "Record held stock and review outstanding collection needs.",
          ["inventory", "field-desk", "items", "collection"],
        ) +
        section(
          "crafting",
          "Crafting and preparation",
          "Review recipes and plan what to collect before you deploy.",
          ["recipes", "x01-printer", "planner"],
        ),
    },
    {
      path: "/dmz-weapons/",
      page: "dmz-weapons",
      title: "DMZ Weapons",
      body:
        pageHeading(
          "WEAPON WORKSPACE",
          "DMZ Weapons",
          "Browse weapons and attachments, plan builds and review sourced statistics.",
        ) +
        links() +
        section(
          "database",
          "Weapons and attachments",
          "Source reports retain their own mode, date and verification limits.",
          ["armory", "weapons"],
        ) +
        section(
          "loadouts",
          "Loadouts and tracking",
          "Build, compare and track your loadout in the existing workbench.",
          ["armory-workbench"],
        ) +
        section(
          "updates",
          "Weapon updates",
          "Checks and data application remain explicit operations in the existing update workflow.",
          ["weapon-updates"],
        ),
    },
  ];
}
