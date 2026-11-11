import { validateProfile } from "./profile.mjs";
import { collectionNeeds } from "./collection-needs.mjs";
import { spoilerGuard } from "./progression.mjs";
export function setBuildTarget(pack, profile, id, quantity) {
  validateProfile(profile);
  if (
    profile.packId !== pack.id ||
    profile.contentVersion !== pack.contentVersion
  )
    throw new Error(
      "Review the tracking update before changing build targets.",
    );
  const guard = spoilerGuard(pack, profile.spoilers),
    item = pack.items.find((i) => i.id === id);
  if (
    !item ||
    (!profile.spoilers &&
      (item.spoiler ||
        guard.limited ||
        guard.contains(id) ||
        guard.contains(item.name)))
  )
    throw new Error("Build target is unavailable in this view.");
  const p = structuredClone(profile);
  p.buildTargets ??= {};
  if (quantity == null) delete p.buildTargets[id];
  else p.buildTargets[id] = quantity;
  return validateProfile(p);
}
export function buildTargetNeeds(pack, profile) {
  const guard = spoilerGuard(pack, profile.spoilers),
    items = new Map(
      pack.items
        .filter(
          (i) =>
            profile.spoilers ||
            (!i.spoiler &&
              !guard.limited &&
              !guard.contains(i.id) &&
              !guard.contains(i.name)),
        )
        .map((i) => [i.id, i]),
    );
  const targets = Object.entries(profile.buildTargets || {}).filter(([id]) =>
    items.has(id),
  );
  if (
    profile.packId !== pack.id ||
    profile.contentVersion !== pack.contentVersion ||
    targets.length *
      (pack.items.length + pack.recipes.length + pack.objectives.length) >
      200000
  )
    return { status: "blocked", groups: [], combined: [] };
  // Saved routes can outlive a catalog refresh. Resolve the target's current
  // sole recipe for this read-only projection without rewriting saved choices.
  const recipesFor = (id) =>
    pack.recipes.filter(
      (r) =>
        r.output.itemId === id &&
        (profile.spoilers ||
          (!r.spoiler && !guard.contains(r.id) && !guard.contains(r.name))),
    );
  const selectedFor = (id) => {
    const recipes = recipesFor(id);
    return (
      recipes.find((r) => r.id === profile.routes[id]) ||
      (recipes.length === 1 &&
      pack.recipes.filter((r) => r.output.itemId === id).length === 1
        ? recipes[0]
        : null)
    );
  };
  const planningProfile = { ...profile, routes: { ...profile.routes } };
  for (const [id] of targets) {
    const recipe = selectedFor(id);
    if (recipe && profile.routes[id] && recipe.id !== profile.routes[id])
      planningProfile.routes[id] = recipe.id;
  }
  const project = (entries) => {
    const projection = {
      ...planningProfile,
      reserves: { ...profile.reserves },
    };
    for (const [id] of entries) projection.reserves[id] = 0;
    // Preserve existing finished stock: the target requests this many MORE.
    // Only virtual demand changes; ingredient stock and saved data stay intact.
    const rows = new Map(
      entries.map(([id, extra]) => {
        const q = extra + (profile.inventory[id] ?? 0);
        return [
          id,
          {
            knownConsumed: q,
            knownRetained: 0,
            required: q,
            contributors: [
              {
                id,
                name: items.get(id).name,
                quantity: q,
                consumption: "consumed",
                partial: false,
              },
            ],
          },
        ];
      }),
    );
    const result = collectionNeeds(
      pack,
      projection,
      { all: { status: "ok", used: new Set(rows.keys()), rows } },
      { reported: true, missions: false },
    );
    return [...result.values()]
      .filter((r) => r.used && items.has(r.id))
      .map((r) => ({
        ...r,
        name: items.get(r.id).name,
        held: profile.inventory[r.id] ?? null,
        remaining:
          r.missing ??
          (profile.inventory[r.id] === undefined && r.required != null
            ? r.required + (projection.reserves[r.id] || 0)
            : null),
        minimum: r.required == null,
        partial: r.provisional || r.unknown,
        assumedZero: profile.inventory[r.id] === undefined,
        alternative: r.craft,
      }));
  };
  const groups = targets.map(([id, quantity]) => {
    const recipes = recipesFor(id),
      selected = selectedFor(id);
    const rows = project([[id, quantity]]),
      root = rows.find((r) => r.id === id);
    const direct = new Set(selected?.inputs.map((r) => r.itemId) || []);
    return {
      id,
      name: items.get(id).name,
      quantity,
      root,
      recipe: selected?.id || null,
      ambiguous: recipes.length > 1 && !selected,
      direct: rows.filter((r) => r.id !== id && direct.has(r.id)),
      alternatives: rows.filter((r) => r.id !== id && !direct.has(r.id)),
      noRecipe: !recipes.length,
    };
  });
  return {
    status: "ok",
    groups,
    combined: project(targets).filter(
      (r) =>
        !targets.some(([id]) => id === r.id) ||
        r.craft ||
        groups.some((g) => g.id === r.id && g.noRecipe),
    ),
  };
}
