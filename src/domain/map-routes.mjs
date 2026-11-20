export const MAP_BASE = "/map/";
export const MAP_ENTRIES = Object.freeze([
  "index.html", "help.html", "safes.html", "loot.html", "x01.html",
  "x01-dmzhub.html", "x01-workspace.html", "migration.html",
]);
export const MAP_ROUTES = Object.freeze({
  "/": "index.html", "/x01/": "x01-workspace.html",
  "/safes/": "safes.html", "/loot/": "loot.html", "/migrate/": "migration.html",
});
const canonical = Object.freeze({
  "/index.html": "/", "/x01-workspace.html": "/x01/",
  "/safes.html": "/safes/", "/loot.html": "/loot/", "/migration.html": "/migrate/",
});
export function mapPath(value, { standalone = false } = {}) {
  if (typeof value !== "string") throw Error("Map URL must be text");
  if (standalone || !value.startsWith("/") || value.startsWith("//")) return value;
  if (value === "/map") return MAP_BASE;
  if (value.startsWith(MAP_BASE)) return value;
  const match = /^([^?#]*)([?#][\s\S]*)?$/.exec(value);
  return MAP_BASE + (canonical[match[1]] || match[1]).slice(1) + (match[2] || "");
}
export function mapEntry(pathname) {
  if (!pathname.startsWith(MAP_BASE)) return null;
  const relative = pathname.slice(MAP_BASE.length);
  return MAP_ROUTES["/" + relative] || (MAP_ENTRIES.includes(relative) ? relative : null);
}
