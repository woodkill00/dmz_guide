import { collectionBudget } from "./collection-budget.mjs";
import { parseUpgradeStock } from "./inventory-stock.mjs";
export function quickCollect(pack, profile, { crafting = false } = {}) {
  const budget = collectionBudget(pack, profile);
  if (budget.status !== "ok" || profile.contentVersion !== pack.contentVersion)
    return { status: "blocked", items: [] };
  return {
    status: "ok",
    items: budget.items
      .filter((r) => crafting || r.direct)
      .map((r) => {
        const required =
          r.required ?? (r.knownRequired > 0 ? r.knownRequired : null);
        const assumedZero = r.held == null && required != null;
        const minimum = !!r.quantityUnknown || r.required == null;
        const remaining =
          r.missing ?? (assumedZero ? required + r.reserve : null);
        return {
          ...r,
          required,
          remaining: minimum && remaining === 0 ? null : remaining,
          assumedZero,
          minimum,
          alternative: !r.direct,
        };
      })
      .sort(
        (a, b) =>
          a.name.localeCompare(b.name, undefined, { sensitivity: "base" }) ||
          a.id.localeCompare(b.id),
      ),
  };
}
export function addFound(pack, profile, id, raw) {
  if (
    profile.packId !== pack.id ||
    profile.contentVersion !== pack.contentVersion
  )
    throw new Error("Review the tracking update before adding found items.");
  const item = pack.items.find((i) => i.id === id);
  if (!item) throw new Error("Item is not in the selected catalog.");
  const amount = parseUpgradeStock(String(raw), item, profile);
  if (amount == null || amount < 1)
    throw new Error("Enter a positive whole amount to add.");
  const before = profile.inventory[id];
  const after = (before ?? 0) + amount;
  parseUpgradeStock(String(after), item, profile);
  const candidate = structuredClone(profile);
  candidate.inventory[id] = after;
  return { candidate, before, after, amount };
}
