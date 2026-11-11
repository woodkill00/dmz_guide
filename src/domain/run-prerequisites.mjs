// Catalog links are evidence, not inferred game rules. Bound traversal so a
// malformed or cyclic pack cannot lock up the preparation page.
export function traceRunPrerequisites(pack, refs, { maxNodes = 64 } = {}) {
  const objectives = new Map(
    (pack.objectives || []).map((row) => [row.id, row]),
  );
  const items = new Map((pack.items || []).map((row) => [row.id, row]));
  const recipesByOutput = new Map();
  for (const recipe of pack.recipes || []) {
    const outputId = recipe.output?.itemId;
    if (!outputId) continue;
    if (!recipesByOutput.has(outputId)) recipesByOutput.set(outputId, []);
    recipesByOutput.get(outputId).push(recipe);
  }
  const nodes = [];
  const seen = new Set();
  let truncated = false;
  const visit = (id, parentId, depth, consumption = null, quantity = null) => {
    if (seen.has(id) && !items.has(id)) return;
    if (nodes.length >= maxNodes || depth > 16) {
      truncated = true;
      return;
    }
    const repeated = seen.has(id);
    seen.add(id);
    const row = objectives.get(id) || items.get(id);
    const type = objectives.has(id)
      ? "objective"
      : items.has(id)
        ? "item"
        : "unresolved";
    nodes.push({
      id,
      parentId,
      depth,
      type,
      name: row?.spoiler ? "Spoiler-protected record" : row?.name || id,
      status: row?.status || "unknown",
      consumption,
      quantity,
      repeated,
    });
    if (repeated) return;
    if (!row || row.spoiler) return;
    for (const prerequisite of row.prerequisites || [])
      visit(prerequisite, id, depth + 1);
    for (const requirement of row.requirements || []) {
      if (typeof requirement?.itemId === "string")
        visit(
          requirement.itemId,
          id,
          depth + 1,
          requirement.consumption,
          requirement.quantity,
        );
    }
    if (items.has(id)) {
      const recipes = recipesByOutput.get(id) || [];
      if (recipes.length > 1) {
        if (nodes.length >= maxNodes) {
          truncated = true;
          return;
        }
        nodes.push({
          id: `${id}:recipes`,
          parentId: id,
          depth: depth + 1,
          type: "uncertain",
          name: `${recipes.length} recorded recipe options; choose a crafting route`,
          status: "unknown",
        });
      } else if (recipes.length === 1) {
        const recipe = recipes[0];
        if (nodes.length >= maxNodes) {
          truncated = true;
          return;
        }
        nodes.push({
          id: recipe.id,
          parentId: id,
          depth: depth + 1,
          type: "recipe",
          name: recipe.name,
          status: recipe.status || "unknown",
          ingredientsKnown: recipe.ingredientsKnown === true,
        });
        if (recipe.ingredientsKnown === true)
          for (const input of recipe.inputs || [])
            visit(
              input.itemId,
              recipe.id,
              depth + 2,
              input.consumption,
              input.quantity,
            );
      }
    }
  };
  for (const ref of refs || []) {
    if (typeof ref?.id === "string") visit(ref.id, null, 0);
  }
  return { nodes, truncated };
}

export function keyPackingForUses(selectedUseIds, uses, keys) {
  const byUse = new Map(uses.map((use) => [use.id, use]));
  const byKey = new Map(keys.map((key) => [key.id, key]));
  const ordered = [];
  const seen = new Set();
  const unresolved = [];
  const visit = (useId) => {
    if (seen.has(useId)) return;
    seen.add(useId);
    if (seen.size > 128) throw Error("Too many key access references");
    const use = byUse.get(useId);
    if (!use) return unresolved.push(useId);
    for (const parent of use.requiredUses || []) visit(parent);
    ordered.push({
      useId,
      keyId: use.keyId,
      name: byKey.get(use.keyId)?.name || use.keyId,
      locationName: use.locationName,
      status: use.status,
    });
  };
  for (const useId of selectedUseIds) visit(useId);
  const packed = [];
  for (const row of ordered) {
    let existing = packed.find((candidate) => candidate.keyId === row.keyId);
    if (!existing) {
      existing = { ...row, locationNames: [] };
      packed.push(existing);
    }
    if (!existing.locationNames.includes(row.locationName))
      existing.locationNames.push(row.locationName);
  }
  return { keys: packed, unresolved };
}

export function keyUsesForStops(stopIds, locations, uses) {
  const byLocation = new Map(locations.map((row) => [row.id, row]));
  const matched = [];
  const unlinked = [];
  const ambiguous = [];
  for (const stopId of new Set(stopIds)) {
    const location = byLocation.get(stopId);
    if (!location) {
      unlinked.push(stopId);
      continue;
    }
    const exact = uses.filter(
      (use) =>
        use.locationId === stopId &&
        use.locationName?.trim().toLocaleLowerCase() ===
          location.name.trim().toLocaleLowerCase() &&
        use.sources?.length > 0,
    );
    if (exact.length === 1) matched.push(exact[0].id);
    else if (exact.length > 1) ambiguous.push(location.name);
    else unlinked.push(location.name);
  }
  return { matched, ambiguous, unlinked };
}
