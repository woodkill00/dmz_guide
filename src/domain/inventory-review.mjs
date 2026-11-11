// Explain existing advisory states. Never promotes evidence or changes player state.
export function inventoryReviewReasons(pack, profile, collection, row) {
  if (!row?.used) return [];
  const reasons = [],
    seen = new Set();
  const add = (code, text) => {
    if (!seen.has(code + text)) {
      seen.add(code + text);
      reasons.push({ code, text });
    }
  };
  if (collection.blocked)
    add(
      "binding",
      "Tracking is blocked: review the catalog binding and inventory warning.",
    );
  if (collection.limited || row.explanationLimited)
    add(
      "limited",
      "Calculation is incomplete: a recipe cycle or safety limit needs attention.",
    );
  if (profile.inventory[row.id] === undefined)
    add("stock", "Owned quantity is not entered. Enter 0 if you have none.");
  if (row.craftEstimate)
    add(
      "craft",
      row.estimated
        ? "Crafting estimate: blank output stock is assumed to be 0 for planning only. Collect outputs or their ingredients, not both."
        : "Crafting estimate based on listed recipes and current output shortages; recipe access is checked separately.",
    );
  const objectives = new Map(pack.objectives.map((o) => [o.id, o]));
  for (const id of row.rootIds || []) {
    const root = objectives.get(id);
    if (!root) continue;
    const lines = (root.requirements || []).filter((r) => r.itemId === row.id);
    for (const line of lines) {
      if (line.quantity == null)
        add(
          "quantity",
          `${root.name}: this item's required quantity is not recorded.`,
        );
      if (line.consumption === "unknown")
        add(
          "consumption",
          `${root.name}: whether this item is consumed or retained is unconfirmed; reported planning budgets it as consumed.`,
        );
      if (["disputed", "stale"].includes(line.status))
        add(
          "conflict",
          `${root.name}: this requirement is ${line.status}; confirm the current requirement before relying on it.`,
        );
      else if (["unknown", "unverified"].includes(line.status))
        add(
          "evidence",
          `${root.name}: this requirement's evidence is ${line.status}.`,
        );
    }
    if (root.requirementsKnown !== true)
      add(
        "incomplete",
        `${root.name}: the complete requirement list has not been confirmed.`,
      );
    if (["unknown", "unverified", "disputed", "stale"].includes(root.status))
      add(
        "evidence",
        `${root.name}: the upgrade or mission record is ${root.status}.`,
      );
    if (root.status === "observed")
      add(
        "evidence",
        `${root.name}: source-observed requirements have not been independently verified for the current build.`,
      );
    if (
      root.track === "dmz-upgrade" &&
      root.upgrade?.prerequisiteStatus !== "known"
    )
      add(
        "prerequisites",
        `${root.name}: prerequisite completeness has not been confirmed.`,
      );
  }
  if (row.required == null && !collection.blocked && !collection.limited)
    add(
      "calculation",
      "An exact total is unresolved. Check the listed requirements and recipe route; any displayed minimum is not a complete total.",
    );
  if (
    (row.unknown || row.provisional) &&
    !reasons.some((r) =>
      [
        "quantity",
        "consumption",
        "conflict",
        "evidence",
        "incomplete",
        "craft",
        "calculation",
      ].includes(r.code),
    )
  )
    add(
      "provisional",
      "The listed amount remains provisional; its source or upstream crafting requirements are not fully confirmed.",
    );
  return reasons;
}
