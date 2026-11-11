import { validateRunPlans } from "./run-plans.mjs";

const recordIndex = (pack) =>
  new Map(
    [
      ...(pack.objectives || []),
      ...(pack.items || []),
      ...(pack.locations || []),
      ...(pack.recipes || []),
      ...(pack.sources || []),
      ...(pack.claims || []),
    ].map((row) => [row.id, row]),
  );
const signature = (record) => (record ? JSON.stringify(record) : null);

function referencedIds(pack, plan) {
  const ids = new Set([
    ...plan.objectives.map((ref) => ref.id),
    ...plan.stops,
    ...Object.keys(plan.reservations),
  ]);
  const objectives = new Map(
    (pack.objectives || []).map((row) => [row.id, row]),
  );
  const indexed = recordIndex(pack);
  const claimsByEntity = new Map();
  for (const claim of pack.claims || []) {
    if (!claimsByEntity.has(claim.entityId))
      claimsByEntity.set(claim.entityId, []);
    claimsByEntity.get(claim.entityId).push(claim.id);
  }
  const recipes = new Map();
  for (const recipe of pack.recipes || []) {
    const output = recipe.output?.itemId;
    if (!output) continue;
    if (!recipes.has(output)) recipes.set(output, []);
    recipes.get(output).push(recipe);
  }
  const queue = [...ids];
  for (let index = 0; index < queue.length && index < 512; index++) {
    const id = queue[index];
    const objective = objectives.get(id);
    const record = indexed.get(id);
    const related = objective
      ? [
          ...(objective.prerequisites || []),
          ...(objective.requirements || []).map((row) => row.itemId),
        ]
      : (recipes.get(id) || []).flatMap((recipe) => [
          recipe.id,
          ...(recipe.inputs || []).map((input) => input.itemId),
        ]);
    related.push(
      ...(record?.sourceIds || []),
      ...(claimsByEntity.get(id) || []),
    );
    for (const next of related) {
      if (ids.size >= 512) break;
      if (!next || ids.has(next)) continue;
      ids.add(next);
      queue.push(next);
    }
  }
  return ids;
}

// Read-only preview: it reports affected saved references, never applies a
// provider update or silently rebinds a retired ID by matching its name.
export function previewSourceImpact(before, after, doc) {
  validateRunPlans(doc);
  if (before.id !== doc.packId || after.id !== doc.packId)
    throw Error("Source impact pack mismatch");
  const oldRows = recordIndex(before);
  const newRows = recordIndex(after);
  return doc.plans.map((plan) => {
    const ids = new Set([
      ...referencedIds(before, plan),
      ...referencedIds(after, plan),
    ]);
    const changes = [...ids]
      .filter((id) => signature(oldRows.get(id)) !== signature(newRows.get(id)))
      .map((id) => ({
        id,
        state: !oldRows.has(id)
          ? "added"
          : !newRows.has(id)
            ? "removed"
            : "changed",
      }));
    if (before.contentVersion !== after.contentVersion)
      changes.push({ id: "catalog content version", state: "changed" });
    return { planId: plan.id, changes };
  });
}
