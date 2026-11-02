import { parseBounded, boundedWalk } from "../content/limits.mjs";
const assert = (v, message = "Invalid private key workspace") => {
  if (!v) throw Error(message);
};
const exact = (v, fields) =>
  assert(
    v &&
      typeof v === "object" &&
      !Array.isArray(v) &&
      Object.keys(v).sort().join() === fields.split(" ").sort().join(),
  );
const safe = (id) =>
  typeof id === "string" &&
  !["constructor", "prototype", "__proto__"].includes(id);
export const keyId = (id) =>
  safe(id) && id.length <= 100 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id);
export const useId = (id) =>
  safe(id) &&
  id.length <= 384 &&
  /^[a-z0-9]+(?:-[a-z0-9]+)*--[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id);
export const emptyKeyWorkspace = () => ({
  version: 1,
  revision: 0,
  stock: {},
  favorites: [],
  targetUseIds: [],
  packedKeyIds: [],
  openedUseIds: [],
  density: "compact",
});
export const keyStock = (workspace, id) =>
  workspace.stock[id] || { quantity: 0, remainingUses: null, notes: "" };
export function validateKeyWorkspace(value) {
  boundedWalk(value, { depth: 8, nodes: 20000, string: 1000 });
  exact(
    value,
    "version revision stock favorites targetUseIds packedKeyIds openedUseIds density",
  );
  assert(
    value.version === 1 &&
      Number.isSafeInteger(value.revision) &&
      value.revision >= 0 &&
      ["compact", "comfortable"].includes(value.density),
  );
  assert(
    value.stock &&
      typeof value.stock === "object" &&
      !Array.isArray(value.stock) &&
      Object.keys(value.stock).length <= 256,
  );
  for (const [id, row] of Object.entries(value.stock)) {
    assert(keyId(id));
    exact(row, "quantity remainingUses notes");
    assert(
      Number.isInteger(row.quantity) &&
        row.quantity >= 0 &&
        row.quantity <= 999 &&
        (row.remainingUses === null ||
          (Number.isInteger(row.remainingUses) &&
            row.remainingUses >= 0 &&
            row.remainingUses <= 999)) &&
        typeof row.notes === "string" &&
        row.notes.length <= 1000 &&
        (!row.quantity
          ? row.remainingUses === null || row.remainingUses === 0
          : true),
    );
  }
  for (const [field, max, check] of [
    ["favorites", 256, keyId],
    ["targetUseIds", 32, useId],
    ["packedKeyIds", 256, keyId],
    ["openedUseIds", 1024, useId],
  ])
    assert(
      Array.isArray(value[field]) &&
        value[field].length <= max &&
        value[field].every(check) &&
        new Set(value[field]).size === value[field].length,
    );
  assert(
    new TextEncoder().encode(JSON.stringify(value)).length <= 1048448,
    "Private keys exceed 1MiB",
  );
  return value;
}
export function parseKeyBackup(raw) {
  const v = parseBounded(raw, 1048576, {
    depth: 8,
    nodes: 20000,
    string: 1000,
  });
  exact(v, "kind version workspace");
  assert(
    v.kind === "dmz-key-workspace" && v.version === 1,
    "Not a private key workspace backup",
  );
  return validateKeyWorkspace(v.workspace);
}
export function keyBackup(workspace) {
  validateKeyWorkspace(workspace);
  const raw = JSON.stringify({
    kind: "dmz-key-workspace",
    version: 1,
    workspace,
  });
  assert(
    new TextEncoder().encode(raw).length <= 1048576,
    "Backup exceeds 1MiB",
  );
  return raw;
}
export function changeKeyStock(workspace, id, quantity) {
  assert(
    keyId(id) && Number.isInteger(quantity) && quantity >= 0 && quantity <= 999,
  );
  const next = structuredClone(workspace),
    old = keyStock(next, id);
  next.stock[id] = {
    ...old,
    quantity,
    remainingUses: quantity === old.quantity ? old.remainingUses : null,
  };
  return validateKeyWorkspace(next);
}
export function toggleKeyList(workspace, field, id) {
  assert(
    ["favorites", "targetUseIds", "packedKeyIds", "openedUseIds"].includes(
      field,
    ),
  );
  const next = structuredClone(workspace);
  next[field] = next[field].includes(id)
    ? next[field].filter((v) => v !== id)
    : [...next[field], id];
  return validateKeyWorkspace(next);
}
export function keyChain(use, uses) {
  const byId = new Map(uses.map((u) => [u.id, u])),
    seen = new Set(),
    active = new Set(),
    result = [];
  function visit(id) {
    assert(!active.has(id), "Key access cycle");
    if (seen.has(id)) return;
    const row = byId.get(id);
    assert(row, "Missing public key use");
    active.add(id);
    row.requiredUses.forEach(visit);
    active.delete(id);
    seen.add(id);
    result.push(row);
  }
  visit(use.id);
  return result;
}
export function keyReadiness(workspace, use, catalog) {
  if (!use)
    return {
      state: "unavailable",
      missingIds: [],
      chain: [],
      uncertainties: ["Use location is unavailable in this catalog"],
    };
  const chain = keyChain(use, catalog.uses),
    ids = [
      ...new Set(
        chain
          .filter((u) => u.lockState !== "unlocked-reported")
          .map((u) => u.keyId),
      ),
    ],
    missingIds = ids.filter((id) => {
      const s = keyStock(workspace, id);
      return !s.quantity || s.remainingUses === 0;
    }),
    uncertainties = [];
  if (chain.some((u) => u.lockState === "unlocked-reported"))
    uncertainties.push(
      "A source reports an unlocked door; room identity/key necessity is not verified",
    );
  if (chain.some((u) => u.status === "unknown"))
    uncertainties.push("Additional access requirements are not fully recorded");
  if (chain.some((u) => u.possibleUses.length))
    uncertainties.push("A possible access link needs confirmation");
  if (
    ids.some(
      (id) =>
        keyStock(workspace, id).quantity > 0 &&
        keyStock(workspace, id).remainingUses === null,
    )
  )
    uncertainties.push("Remaining key uses are unrecorded");
  return {
    state: missingIds.length
      ? "missing"
      : use.lockState === "unlocked-reported"
        ? "unverified"
        : "recorded-ready",
    missingIds,
    chain,
    uncertainties,
  };
}
export function keyTripPlan(workspace, catalog) {
  validateKeyWorkspace(workspace);
  const uses = new Map(catalog.uses.map((u) => [u.id, u])),
    keys = new Map(catalog.keys.map((k) => [k.id, k])),
    ordered = [],
    seen = new Set(),
    unavailableTargets = [];
  for (const id of workspace.targetUseIds) {
    const row = uses.get(id);
    if (!row) {
      unavailableTargets.push(id);
      continue;
    }
    for (const u of keyChain(row, catalog.uses))
      if (!seen.has(u.id)) {
        seen.add(u.id);
        ordered.push(u);
      }
  }
  const needs = new Map();
  for (const u of ordered) {
    if (!needs.has(u.keyId))
      needs.set(u.keyId, {
        keyId: u.keyId,
        name: keys.get(u.keyId)?.name || u.keyId,
        useIds: [],
        stock: keyStock(workspace, u.keyId),
        packed: workspace.packedKeyIds.includes(u.keyId),
        optional: true,
      });
    needs.get(u.keyId).useIds.push(u.id);
    if (u.lockState !== "unlocked-reported")
      needs.get(u.keyId).optional = false;
  }
  const keyNeeds = [...needs.values()];
  return {
    ordered,
    keyNeeds,
    unavailableTargets,
    missing: keyNeeds.filter(
      (n) => !n.optional && (!n.stock.quantity || n.stock.remainingUses === 0),
    ),
    warnings: [
      ...new Set(
        ordered.flatMap(
          (u) => keyReadiness(workspace, u, catalog).uncertainties,
        ),
      ),
    ],
  };
}
export function archivedKeyState(workspace, catalog) {
  const keys = new Set(catalog.keys.map((k) => k.id)),
    uses = new Set(catalog.uses.map((u) => u.id));
  return {
    keys: [
      ...new Set([
        ...Object.keys(workspace.stock),
        ...workspace.favorites,
        ...workspace.packedKeyIds,
      ]),
    ].filter((id) => !keys.has(id)),
    uses: [
      ...new Set([...workspace.targetUseIds, ...workspace.openedUseIds]),
    ].filter((id) => !uses.has(id)),
  };
}
