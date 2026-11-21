import captured from "../content/tcno-item-intel.json" with { type: "json" };
import { x01Printer } from "../content/x01-printer.mjs";
import { spoilerGuard } from "./progression.mjs";

const amount = (value) => (Number.isFinite(value) && value > 0 ? value : null);
const role = (row) =>
  row.consumption ||
  (row.consumed === true
    ? "consumed"
    : row.consumed === false
      ? "retained"
      : "unknown");
export const craftReferenceAnchor = (id) =>
  `craft-reference-${[...new TextEncoder().encode(id)].map((byte) => byte.toString(16).padStart(2, "0")).join("")}`;

// Informational relationships only: source references never become planner recipes.
export function buildCraftingUses(
  pack,
  { intel = captured, x01 = x01Printer } = {},
) {
  const items = new Map(pack.items.map((item) => [item.id, item]));
  const records = new Map(
    [
      ...(pack.items || []),
      ...(pack.objectives || []),
      ...(pack.recipes || []),
    ].map((row) => [row.id, row]),
  );
  const uses = new Map(),
    produces = new Map(),
    issues = [],
    methods = [],
    edges = [];
  const add = (raw) => {
    const output = items.get(raw.outputId);
    const inputs = raw.inputs.map((input) => ({
      ...input,
      quantity: amount(input.quantity),
      record: items.get(input.itemId),
    }));
    for (const [position, input] of inputs.entries()) {
      const issue = !output
        ? "unmapped-output"
        : !input.record
          ? "unmapped-input"
          : null;
      edges.push({
        source: raw.kind,
        methodId: raw.id,
        position,
        itemId: input.itemId,
        outputId: raw.outputId,
        issue,
      });
      if (issue)
        issues.push({ source: raw.kind, methodId: raw.id, code: issue });
    }
    if (!output) {
      if (!inputs.length)
        issues.push({
          source: raw.kind,
          methodId: raw.id,
          code:
            raw.kind === "blueprint" && !raw.outputId
              ? "identity-only"
              : "unmapped-output",
        });
      return;
    }
    const prerequisites = raw.prerequisites.map((id) => ({
      record: records.get(id),
    }));
    if (prerequisites.some((row) => !row.record))
      issues.push({
        source: raw.kind,
        methodId: raw.id,
        code: "unmapped-prerequisite",
      });
    const signature = JSON.stringify([
      raw.kind,
      raw.station,
      raw.outputId,
      raw.outputQuantity ?? null,
      raw.access ?? null,
      inputs.map((r) => [r.itemId ?? null, r.quantity, r.role]).sort(),
      [...raw.prerequisites].sort(),
    ]);
    const equivalent = methods.find((method) => method.signature === signature);
    if (equivalent) {
      equivalent.references.push(raw);
      return;
    }
    const method = {
      ...raw,
      output,
      inputs,
      prerequisites,
      signature,
      references: [raw],
    };
    methods.push(method);
    if (!produces.has(output.id)) produces.set(output.id, []);
    produces.get(output.id).push(method);
    for (const id of new Set(
      inputs.filter((input) => input.record).map((input) => input.itemId),
    )) {
      if (!uses.has(id)) uses.set(id, []);
      uses.get(id).push(method);
    }
  };
  for (const recipe of pack.recipes || [])
    add({
      id: recipe.id,
      kind: "catalog",
      label: recipe.name,
      recipe,
      access: [recipe.eligibility ?? null, recipe.ingredientsKnown ?? null],
      outputId: recipe.output?.itemId,
      outputQuantity: recipe.output?.quantity,
      station: recipe.station || "Station not recorded",
      inputs: (recipe.inputs || []).map((r) => ({
        itemId: r.itemId,
        quantity: r.quantity,
        role: role(r),
      })),
      prerequisites: recipe.prerequisites || [],
      sourceURL: null,
    });
  if (intel?.packId === pack.id)
    for (const unlock of intel.unlocks) {
      if (!["blueprint", "crafting"].includes(unlock.kind)) continue;
      add({
        id: `source:${unlock.id}`,
        kind: unlock.kind,
        label: unlock.name,
        access: unlock.dmzLevel ?? null,
        outputId: intel.mapping[unlock.outputItemId],
        outputQuantity: unlock.outputCount,
        station: "Station not recorded · source reference",
        inputs: (unlock.requirements || []).map((r) => ({
          itemId: intel.mapping[r.itemId],
          quantity: r.amount,
          role: "unknown",
        })),
        prerequisites: (unlock.requiredFobIds || []).map(
          (id) => intel.upgradeMap[id],
        ),
        sourceURL: intel.source,
      });
    }
  if (x01?.packId === pack.id)
    for (const recipe of x01.recipes)
      add({
        id: `x01:${recipe.itemId}`,
        kind: "x01",
        label: recipe.name,
        outputId: recipe.itemId,
        outputQuantity: null,
        station: "X01 3D Printer · carried materials",
        inputs: recipe.materials.map((r) => ({
          itemId: r.itemId,
          quantity: r.quantity,
          role: "unknown",
        })),
        prerequisites: [],
        sourceURL: x01.source.url,
      });
  return { uses, produces, methods, issues, edges };
}

export function visibleCraftingMethods(pack, methods, reveal = false) {
  const guard = spoilerGuard(pack, reveal);
  const safe = (record) =>
    !record ||
    ((!record.spoiler || reveal) &&
      !guard.limited &&
      !guard.contains(record.id) &&
      !guard.contains(record.name || ""));
  return methods.filter(
    (method) =>
      safe(method.recipe) &&
      safe(method.output) &&
      method.inputs.every((input) => safe(input.record)) &&
      method.prerequisites.every((input) => safe(input.record)) &&
      !guard.contains(method.label) &&
      !guard.contains(method.station) &&
      method.references.every(
        (reference) =>
          safe(reference.recipe) &&
          !guard.contains(reference.id) &&
          !guard.contains(reference.label),
      ),
  );
}

export function craftingInputAmounts(method, itemId) {
  const groups = new Map();
  for (const row of method.inputs.filter((input) => input.itemId === itemId)) {
    const prior = groups.get(row.role);
    groups.set(
      row.role,
      prior === null || row.quantity === null
        ? null
        : row.role === "retained"
          ? Math.max(prior || 0, row.quantity)
          : (prior || 0) + row.quantity,
    );
  }
  return [...groups].map(([role, quantity]) => ({ role, quantity }));
}
