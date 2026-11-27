import links from "./key-item-links.json" with { type: "json" };
export function keyItemReference(itemId) {
  return Object.hasOwn(links, itemId) ? links[itemId] : null;
}
