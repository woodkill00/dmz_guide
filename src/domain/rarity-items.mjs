import { spoilerGuard } from "./progression.mjs";
import { buildCraftingUses, visibleCraftingMethods } from "./crafting-uses.mjs";
export const rarityOrder = [
  "Common",
  "Uncommon",
  "Rare",
  "Epic",
  "Legendary",
  "Ultra",
];
const compare = new Intl.Collator("en", { sensitivity: "base", numeric: true })
  .compare;
export function rarityItems(pack) {
  const guard = spoilerGuard(pack),
    groups = new Map(),
    ids = new Set();
  for (const item of pack.items) {
    if (ids.has(item.id)) throw Error("Duplicate item identity");
    ids.add(item.id);
    if (
      item.spoiler ||
      guard.limited ||
      guard.contains(item.id) ||
      guard.contains(item.name)
    )
      continue;
    const raw = item.rarity?.trim() || "Not recorded";
    const label =
      guard.contains(raw) || /^(unknown|not recorded)$/i.test(raw)
        ? "Not recorded"
        : rarityOrder.find((r) => r.toLowerCase() === raw.toLowerCase()) || raw;
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label).push({
      item: { id: item.id, name: item.name },
      category: guard.text(item.category || item.kind || ""),
    });
  }
  const labels = [
    ...rarityOrder,
    ...[...groups.keys()]
      .filter((r) => !rarityOrder.includes(r) && r !== "Not recorded")
      .sort(compare),
    "Not recorded",
  ];
  return labels
    .filter((label) => groups.has(label))
    .map((label) => ({
      label,
      items: groups
        .get(label)
        .sort(
          (a, b) =>
            compare(a.item.name, b.item.name) || compare(a.item.id, b.item.id),
        ),
    }));
}

export function rarityItemColumns(pack) {
  const groups = rarityItems(pack),
    index = buildCraftingUses(pack);
  const used = new Set(
    groups
      .flatMap((group) => group.items)
      .filter(
        ({ item }) =>
          visibleCraftingMethods(pack, index.uses.get(item.id) || []).length,
      )
      .map(({ item }) => item.id),
  );
  return [
    { id: "crafting", label: "Used in crafting" },
    { id: "other", label: "Other items" },
  ].map((column) => ({
    ...column,
    groups: groups
      .map((group) => ({
        ...group,
        items: group.items.filter(
          ({ item }) => used.has(item.id) === (column.id === "crafting"),
        ),
      }))
      .filter((group) => group.items.length),
  }));
}
