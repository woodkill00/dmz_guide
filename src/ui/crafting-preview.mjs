import {
  buildCraftingUses,
  visibleCraftingMethods,
} from "../domain/crafting-uses.mjs";
import { craftingItemLink } from "./crafting-uses.mjs";
const cache = new WeakMap();
const esc = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export function renderCraftPreview(pack, itemId, { referenceURL } = {}) {
  if (!pack || !pack.items.some((item) => item.id === itemId && !item.spoiler))
    return "";
  if (!cache.has(pack)) cache.set(pack, buildCraftingUses(pack));
  const methods = visibleCraftingMethods(
    pack,
    cache.get(pack).uses.get(itemId) || [],
  );
  const outputs = [
    ...new Map(
      methods.map((method) => [method.output.id, method.output]),
    ).values(),
  ].sort((a, b) => a.name.localeCompare(b.name));
  if (!outputs.length) return "";
  const url =
    referenceURL ||
    ((item) =>
      `/local/?pack=${encodeURIComponent(pack.id)}&id=${encodeURIComponent(item.id)}`);
  return `<details class="craft-preview" data-craft-preview="${esc(itemId)}"><summary>Used to craft <span>${outputs.length}</span></summary><div class="craft-preview-links">${outputs
    .slice(0, 8)
    .map((output) =>
      craftingItemLink({ ...output, recordType: "item" }, pack, url),
    )
    .join(
      "",
    )}${outputs.length > 8 ? `<a class="craft-preview-more" href="${esc(url({ ...pack.items.find((item) => item.id === itemId), recordType: "item", pack }))}">All ${outputs.length} products</a>` : ""}</div></details>`;
}
