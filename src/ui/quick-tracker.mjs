// Presentation wrapper only: existing page identities, controls and storage owners remain.
export function quickTrackerPage(page) {
  const selected = {
    inventory: "Inventory",
    "field-desk": "Field desk",
    upgrades: "Upgrades",
    needed: "Needed",
    "quick-collect": "Quick collect",
    "armory-workbench": "Weapons",
  }[page.page];
  if (!selected) return page;
  const links = [
    ["Inventory", "/inventory/"],
    ["Weapons", "/armory/workbench/#acquisition"],
    ["Upgrades", "/upgrades/"],
    ["Needed", "/needed/"],
    ["Quick collect", "/quick-collect/"],
    ["Field desk", "/field-desk/"],
  ];
  return {
    ...page,
    styles: [...(page.styles || []), "/assets/src/ui/quick-tracker.css"],
    body: `<nav class="quick-tracker-nav" aria-label="Quick tracker">${links.map(([label, url]) => `<a href="${url}" data-tracker-link${label === selected ? ' aria-current="page"' : ""}>${label}</a>`).join("")}</nav>${page.body}`,
  };
}
