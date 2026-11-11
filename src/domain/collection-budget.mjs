import { upgradeNeeds } from "./upgrade-needs.mjs";
// Same combined upgrade/mission/recipe projection used by Inventory; no writes/prints.
export function collectionBudget(pack, profile) {
  const needs = upgradeNeeds(pack, profile),
    items = new Map(pack.items.map((i) => [i.id, i]));
  return {
    status: needs.all.status,
    partial: needs.all.partial || !!needs.collection.limited,
    items: [...needs.listedCollection.values()]
      .filter((r) => r.used && items.has(r.id))
      .map((r) => {
        const item = items.get(r.id),
          held = profile.inventory[r.id] ?? null;
        return {
          ...r,
          name: item.name,
          unit: item.unit,
          held,
          reserve: profile.reserves[r.id] ?? 0,
          partial: r.unknown || !!r.provisional || !!r.craftEstimate,
          knownRequired:
            !needs.collection.blocked &&
            !needs.collection.limited &&
            Number.isSafeInteger(r.consumed + r.retained) &&
            r.consumed + r.retained <= 1e12
              ? r.consumed + r.retained
              : 0,
          missing: r.missing ?? (r.knownMissing > 0 ? r.knownMissing : null),
          contributors: [...r.names],
          lowerBound: r.missing == null && r.knownMissing > 0,
        };
      }),
  };
}
