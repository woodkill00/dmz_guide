import { upgradeNeeds } from "./upgrade-needs.mjs";
import { collectionVisibility } from "./collection-visibility.mjs";
import { craftContext } from "./craft-transaction.mjs";
import { requirementFacts } from "../content/validate.mjs";
import { safeURL } from "../content/limits.mjs";
export const MISSION_TRACKS = new Set([
  "dmz-order",
  "dmz-story",
  "mission",
  "campaign",
]);
export function collectionWorkbench(pack, profile) {
  const visible = collectionVisibility(pack, profile),
    needs = upgradeNeeds(pack, profile);
  const nextRoots = new Set(
    [...needs.next.rows.values()].flatMap((r) =>
      r.contributors.map((c) => c.id),
    ),
  );
  const tracked = new Set(
    profile.goals
      .filter((g) => MISSION_TRACKS.has(visible.objectives.get(g.id)?.track))
      .map((g) => g.id),
  );
  const shopping = [...needs.collection.values()]
    .filter((d) => d.used && visible.items.has(d.id))
    .map((d) => ({
      ...d,
      item: visible.items.get(d.id),
      unitGroup:
        visible.items.get(d.id).kind === "currency"
          ? 0
          : visible.items.get(d.id).kind === "resource"
            ? 1
            : 2,
      rootIds: [...(d.rootIds || [])].filter((id) =>
        visible.objectives.has(id),
      ),
      next:
        needs.next.used.has(d.id) ||
        [...(d.rootIds || [])].some((id) => nextRoots.has(id)),
      tracked: [...(d.rootIds || [])].some((id) => tracked.has(id)),
      group:
        d.state === "review"
          ? "Unknown requirements"
          : d.direct
            ? "Direct requirements"
            : "Crafting ingredients",
    }));
  let context = null,
    craftReviewLimited = false,
    craftWarning = "";
  try {
    context = craftContext(pack, profile, visible);
  } catch {
    craftWarning =
      "Crafting unavailable until the profile/content binding and stock are valid.";
  }
  const crafts = [...visible.recipes.values()].map((recipe) => {
    try {
      if (!context) throw new Error(craftWarning);
      const r = context.evaluate(recipe.id, 1, { materialize: false });
      return {
        recipe,
        ready: r.ready,
        quantityReady: r.quantityReady,
        reasons: r.reasons,
        warnings: r.warnings,
      };
    } catch (reason) {
      if (context && !/scope/.test(reason.message)) craftReviewLimited = true;
      return {
        recipe,
        ready: false,
        quantityReady: false,
        reasons: [
          craftWarning ||
            (/scope/.test(reason.message)
              ? "Recipe belongs to a different game/content scope."
              : "Crafting review reached a safety limit; preview one recipe for a focused check."),
        ],
        warnings: [],
      };
    }
  });
  const upgradeRecords = [...needs.groups.records.values()].filter((r) =>
    visible.objectives.has(r.id),
  );
  const missions = [...visible.objectives.values()].filter((r) =>
    MISSION_TRACKS.has(r.track),
  );
  const binding =
    profile.packId === pack.id &&
    profile.contentVersion === pack.contentVersion;
  const summary = {
    upgrades: upgradeRecords.length,
    upgradesComplete: binding
      ? upgradeRecords.filter((r) => r.completed).length
      : null,
    missions: missions.length,
    missionsComplete: binding
      ? missions.filter((r) =>
          ["completed", "unlocked"].includes(profile.completion[r.id]),
        ).length
      : null,
    needed: shopping.length,
    short: shopping.filter((d) => d.state === "short").length,
    covered: shopping.filter((d) => d.state === "covered").length,
    review: shopping.filter((d) => d.state === "review").length,
  };
  return {
    pack,
    profile,
    visible,
    needs,
    shopping,
    crafts,
    summary,
    limited:
      visible.limited ||
      Boolean(needs.collection.limited) ||
      !binding ||
      needs.all.status !== "ok",
    craftWarning,
    craftReviewLimited,
  };
}
export function filterShopping(
  model,
  { query = "", state = "all", hideCovered = false, sort = "next" } = {},
) {
  const q = String(query).slice(0, 200).trim().toLocaleLowerCase();
  const rows = model.shopping.filter(
    (d) =>
      (!hideCovered || d.state !== "covered") &&
      (state === "all" || state === "craft"
        ? state !== "craft" || d.craft
        : d.state === state) &&
      (!q || `${d.item.name} ${d.item.unit}`.toLocaleLowerCase().includes(q)),
  );
  const name = (a, b) =>
    a.item.name.localeCompare(b.item.name) || a.id.localeCompare(b.id);
  rows.sort((a, b) => {
    if (sort === "shortage") {
      const unit = a.unitGroup - b.unitGroup;
      return (
        unit ||
        (b.missing ?? b.knownMissing ?? -1) -
          (a.missing ?? a.knownMissing ?? -1) ||
        name(a, b)
      );
    }
    if (sort === "helped")
      return b.rootIds.length - a.rootIds.length || name(a, b);
    if (sort === "tracked")
      return Number(b.tracked) - Number(a.tracked) || name(a, b);
    if (sort === "next")
      return (
        Number(b.next) - Number(a.next) ||
        Number(b.tracked) - Number(a.tracked) ||
        name(a, b)
      );
    return name(a, b);
  });
  return rows;
}
export function whyNeeded(model, itemId) {
  if (!model.visible.items.has(itemId))
    throw new Error("Item unavailable or protected.");
  const rootIds = new Set(),
    steps = [],
    seenItems = new Set(),
    seenSteps = new Map(),
    pending = [itemId];
  let work = 0,
    limited = false;
  while (pending.length) {
    if (++work > 500000) {
      limited = true;
      break;
    }
    const id = pending.pop();
    limited ||= Boolean(model.needs.collection.get(id)?.explanationLimited);
    if (seenItems.has(id)) continue;
    seenItems.add(id);
    for (const c of model.needs.collection.get(id)?.causes || []) {
      if (++work > 500000) {
        limited = true;
        break;
      }
      if (c.kind === "objective") {
        if (model.visible.objectives.has(c.id)) rootIds.add(c.id);
        continue;
      }
      const r = model.visible.recipes.get(c.id);
      if (!r || !model.visible.items.has(c.parentItemId)) continue;
      const key = JSON.stringify([id, c.id, c.parentItemId, c.consumption]);
      if (!seenSteps.has(key)) {
        const step = { ...c, itemId: id };
        seenSteps.set(key, step);
        steps.push(step);
      } else {
        const step = seenSteps.get(key);
        const q =
          step.quantity === null || c.quantity === null
            ? null
            : c.consumption === "retained"
              ? Math.max(step.quantity, c.quantity)
              : step.quantity + c.quantity;
        if (q !== null && (!Number.isSafeInteger(q) || q > 1e12)) {
          step.quantity = null;
          limited = true;
        } else step.quantity = q;
      }
      pending.push(c.parentItemId);
    }
    if (limited) break;
  }
  for (const id of model.needs.collection.get(itemId)?.rootIds || [])
    if (model.visible.objectives.has(id)) rootIds.add(id);
  return {
    roots: [...rootIds].map((id) => model.visible.objectives.get(id)),
    steps,
    limited: limited || model.limited,
  };
}
export function coverageIssues(model, reviewedBefore = "") {
  if (reviewedBefore && !/^\d{4}-\d{2}-\d{2}$/.test(reviewedBefore))
    throw new Error("Choose a valid review date.");
  const issues = [];
  let work = 0;
  const add = (id, name, kind, detail, url = null) =>
    issues.push({ id, name, kind, detail, url });
  for (const r of [
    ...model.visible.objectives.values(),
    ...model.visible.recipes.values(),
  ]) {
    if (++work > 500000) break;
    const lines = r.inputs || r.requirements || [];
    if (r.status !== "fictional" && (r.sourceIds || []).length === 0)
      add(
        r.id,
        r.name,
        "Missing supporting evidence",
        "No supporting source reference is listed.",
      );
    if ((r.output ? r.ingredientsKnown : r.requirementsKnown) !== true)
      add(
        r.id,
        r.name,
        "Unknown requirements",
        "Complete costs are not listed.",
      );
    if (["unknown", "unverified", "disputed", "stale"].includes(r.status))
      add(r.id, r.name, "Evidence review", `Reported evidence: ${r.status}.`);
    if (r.output && r.eligibility === "unknown")
      add(
        r.id,
        r.name,
        "Unknown eligibility",
        "Input-pool eligibility is not known.",
      );
    for (const raw of lines) {
      if (++work > 500000) break;
      const c = requirementFacts(model.pack, raw);
      if (
        c.status !== "fictional" &&
        c.status !== "legacy" &&
        (c.sourceIds || []).length === 0
      )
        add(
          r.id,
          r.name,
          "Missing supporting evidence",
          "An input lacks supporting source references.",
        );
      if (c.quantity === null || c.consumption === "unknown")
        add(
          r.id,
          r.name,
          "Unknown input",
          "An input amount or consumption rule needs review.",
        );
      if (!model.visible.items.has(c.itemId))
        add(
          r.id,
          r.name,
          "Unavailable reference",
          "A dependency is unavailable; admission normally rejects broken references.",
        );
    }
  }
  const rawItems = new Set(model.pack.items.map((r) => r.id)),
    rawObjectives = new Set(model.pack.objectives.map((r) => r.id)),
    rawSources = new Set(model.pack.sources.map((r) => r.id));
  for (const r of [...model.pack.recipes, ...model.pack.objectives]) {
    if (++work > 500000) break;
    if (!model.visible.safe(r)) continue;
    let broken = false,
      protectedEndpoint = false;
    const inspect = (id) => {
      if (++work > 500000) return;
      if (rawItems.has(id) && !model.visible.items.has(id))
        protectedEndpoint = true;
      else if (!rawItems.has(id)) broken = true;
    };
    for (const c of r.inputs || r.requirements || []) {
      if (work > 500000) break;
      inspect(c.itemId);
    }
    if (r.output) inspect(r.output.itemId);
    if (protectedEndpoint) continue;
    for (const id of r.prerequisites || []) {
      if (++work > 500000) break;
      if (!rawObjectives.has(id)) broken = true;
    }
    for (const id of r.sourceIds || []) {
      if (++work > 500000) break;
      if (!rawSources.has(id)) broken = true;
    }
    if (broken)
      add(
        r.id,
        r.name,
        "Broken reference",
        "An unavailable dependency was found. Normal catalog admission rejects this snapshot; inspect it in Content Studio.",
      );
  }
  const produced = new Set(
    [...model.visible.recipes.values()].map((r) => r.output.itemId),
  );
  for (const row of model.shopping)
    if (!produced.has(row.id))
      add(
        row.id,
        row.item.name,
        "Acquisition review",
        "No producing recipe is listed. This does not mean the item is craftable or that a recipe is missing.",
      );
  for (const source of model.visible.sources.values()) {
    if (!source.reviewedAt)
      add(
        source.id,
        source.title,
        "Missing review date",
        "No source review date is recorded.",
        sourceLink(model, source),
      );
    else if (reviewedBefore && source.reviewedAt < reviewedBefore)
      add(
        source.id,
        source.title,
        "Review date",
        `Last recorded review: ${source.reviewedAt}.`,
        sourceLink(model, source),
      );
  }
  return { issues, limited: work > 500000 };
}
export function sourceLink(model, source) {
  return safeURL(source?.url) &&
    !model.visible.guard.contains(source.url) &&
    !new URL(source.url).hostname.endsWith(".invalid")
    ? source.url
    : null;
}
export function shoppingText(model, rows) {
  const lines = [
    "PRIVATE COLLECTION SHOPPING LIST",
    `${model.visible.guard.text(model.pack.title)} / ${model.visible.guard.text(model.pack.contentVersion)}`,
    "Listed unfinished upgrade/mission requirements; unknown costs and spawns remain unknown.",
    "Each item unit stays separate. Do not add collection totals to Next/All upgrade columns.",
  ];
  for (const group of [
    "Direct requirements",
    "Crafting ingredients",
    "Unknown requirements",
  ]) {
    lines.push("", group);
    for (const d of rows.filter((r) => r.group === group))
      lines.push(
        `${d.item.name} | ${d.item.unit} | required ${d.required ?? "Unknown"} | missing ${d.missing ?? (d.knownMissing > 0 ? `at least ${d.knownMissing}` : "Unknown")} | ${d.label}${d.craft ? " | Crafting ingredient" : ""}`,
      );
  }
  if (model.limited)
    lines.push("INCOMPLETE: collection projection reached a safety limit.");
  const text = lines.join("\n");
  if (new TextEncoder().encode(text).length > 2 * 1024 * 1024)
    throw new Error("Shopping export exceeds 2 MiB; narrow the filters.");
  return text;
}
