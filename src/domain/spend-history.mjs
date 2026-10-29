import { assert, ID, LIMITS } from "../content/limits.mjs";
export const SPEND_LIMIT = 500;
const object = (v) => v && typeof v === "object" && !Array.isArray(v);
const keys = (v, required, optional = []) =>
  object(v) &&
  required.every((k) => Object.hasOwn(v, k)) &&
  Object.keys(v).every((k) => [...required, ...optional].includes(k));
const text = (v, n) => typeof v === "string" && v.length <= n;
const id = (v) => text(v, 100) && ID.test(v);
const quantity = (v, max = LIMITS.quantity) =>
  Number.isSafeInteger(v) && v >= 0 && v <= max;
export function validateProgressEntry(entry) {
  assert(
    keys(
      entry,
      ["completion", "availability", "reviewRequired"],
      ["legacyState"],
    ),
    "Invalid upgrade fields",
  );
  assert(
    ["unknown", "incomplete", "completed"].includes(entry.completion) &&
      ["unknown", "locked", "available"].includes(entry.availability) &&
      typeof entry.reviewRequired === "boolean",
    "Invalid upgrade state",
  );
  assert(
    !Object.hasOwn(entry, "legacyState") ||
      ["unknown", "locked", "unlocked", "completed"].includes(
        entry.legacyState,
      ),
    "Invalid archival state",
  );
  return entry;
}
export const completedEntry = (before) => ({
  completion: "unknown",
  availability: "unknown",
  reviewRequired: false,
  ...before,
  completion: "completed",
  reviewRequired: false,
});
export const equalProgress = (a, b) =>
  a === null || b === null
    ? a === b
    : ["completion", "availability", "reviewRequired", "legacyState"].every(
        (k) => a?.[k] === b?.[k],
      );
export const scopeKey = (scope) =>
  JSON.stringify([scope.gameId, scope.mode, scope.build]);
export function spendingIdentity() {
  const parents = new Map();
  const root = (node) => {
    if (!parents.has(node)) parents.set(node, node);
    let value = node;
    while (parents.get(value) !== value) value = parents.get(value);
    while (parents.get(node) !== node) {
      const next = parents.get(node);
      parents.set(node, value);
      node = next;
    }
    return value;
  };
  const node = (r) => JSON.stringify([scopeKey(r.scope), "id", r.upgradeId]);
  return {
    bind(r) {
      const first = node(r);
      for (const key of r.observationKeys) {
        const other = JSON.stringify([scopeKey(r.scope), "observation", key]);
        parents.set(root(other), root(first));
      }
      return root(first);
    },
    root: (r) => root(node(r)),
  };
}
export function validateOperation({ operationId, recordedAt }) {
  assert(id(operationId), "Invalid spending operation ID");
  assert(
    text(recordedAt, 24) &&
      recordedAt.length === 24 &&
      Number.isFinite(Date.parse(recordedAt)) &&
      new Date(recordedAt).toISOString() === recordedAt,
    "Invalid spending timestamp",
  );
}
export function validateSpendHistory(history) {
  assert(
    Array.isArray(history) && history.length <= SPEND_LIMIT,
    "Spending history limit exceeded",
  );
  const seen = new Set(),
    purchases = new Map(),
    reversed = new Set(),
    active = [],
    identity = spendingIdentity();
  for (const event of history) {
    assert(object(event), "Invalid spending event");
    validateOperation({ operationId: event.id, recordedAt: event.recordedAt });
    assert(!seen.has(event.id), "Duplicate spending operation ID");
    seen.add(event.id);
    if (event.kind === "reversal") {
      assert(
        keys(event, ["id", "kind", "recordedAt", "purchaseId"]) &&
          id(event.purchaseId),
        "Invalid reversal fields",
      );
      assert(
        purchases.has(event.purchaseId) &&
          !reversed.has(event.purchaseId) &&
          active.at(-1)?.id === event.purchaseId,
        "Reversal must reference the latest unreversed purchase once",
      );
      reversed.add(event.purchaseId);
      active.pop();
      continue;
    }
    assert(
      event.kind === "purchase" &&
        keys(event, [
          "id",
          "kind",
          "recordedAt",
          "contentVersion",
          "upgradeId",
          "upgradeName",
          "scope",
          "observationKeys",
          "beforeProgress",
          "afterProgress",
          "costs",
        ]),
      "Invalid purchase fields",
    );
    assert(
      text(event.contentVersion, 80) &&
        id(event.upgradeId) &&
        text(event.upgradeName, 200),
      "Invalid purchase identity",
    );
    assert(
      keys(event.scope, ["gameId", "mode", "build"]) &&
        text(event.scope.gameId, 80) &&
        text(event.scope.mode, 80) &&
        text(event.scope.build, 120),
      "Invalid spending scope",
    );
    assert(
      Array.isArray(event.observationKeys) &&
        event.observationKeys.length <= 100 &&
        event.observationKeys.every((k) => text(k, 100) && k.length > 0) &&
        new Set(event.observationKeys).size === event.observationKeys.length &&
        event.observationKeys.every((k, i, a) => i === 0 || a[i - 1] < k),
      "Invalid spending observations",
    );
    if (event.beforeProgress !== null)
      validateProgressEntry(event.beforeProgress);
    validateProgressEntry(event.afterProgress);
    assert(
      event.beforeProgress?.completion !== "completed" &&
        equalProgress(
          event.afterProgress,
          completedEntry(event.beforeProgress),
        ),
      "Invalid purchase progress snapshot",
    );
    assert(
      Array.isArray(event.costs) &&
        event.costs.length >= 1 &&
        event.costs.length <= 100,
      "Purchase cost row limit exceeded",
    );
    let positive = false;
    for (let i = 0; i < event.costs.length; i++) {
      const c = event.costs[i];
      assert(
        keys(c, [
          "itemId",
          "name",
          "kind",
          "unit",
          "consumed",
          "retained",
          "before",
          "after",
          "reserve",
        ]) &&
          id(c.itemId) &&
          text(c.name, 200),
        "Invalid purchase cost fields",
      );
      assert(
        ["item", "weapon", "currency", "resource"].includes(c.kind) &&
          c.unit ===
            (c.kind === "currency"
              ? "dmz-cash"
              : c.kind === "resource"
                ? "resource-unit"
                : "count"),
        "Spending kind/unit mismatch",
      );
      assert(
        [c.consumed, c.retained].every((v) => quantity(v)) &&
          [c.before, c.after, c.reserve].every((v) =>
            quantity(v, c.kind === "currency" ? 2000000 : LIMITS.quantity),
          ) &&
          c.consumed + c.retained > 0 &&
          c.after === c.before - c.consumed &&
          c.after >= c.retained + c.reserve,
        "Invalid purchase stock arithmetic",
      );
      assert(
        i === 0 || event.costs[i - 1].itemId < c.itemId,
        "Duplicate or unsorted purchase costs",
      );
      positive ||= c.consumed > 0;
    }
    assert(positive, "No consumed cost to record");
    const group = identity.bind(event);
    assert(
      !active.some((e) => identity.root(e) === group),
      "Active equivalent purchase already recorded",
    );
    purchases.set(event.id, event);
    active.push(event);
  }
  return { purchases, reversed, active, identity };
}
export function spendingTotals(profile, include = () => true) {
  const history = profile.spendHistory || [],
    { purchases, reversed } = validateSpendHistory(history),
    rows = new Map();
  const add = (a, b) => {
    const n = a + b;
    assert(
      Number.isSafeInteger(n) && n >= 0 && n <= 1e12,
      "Spending aggregate limit exceeded",
    );
    return n;
  };
  for (const event of purchases.values()) {
    if (!include(event)) continue;
    for (const c of event.costs) {
      const key = JSON.stringify([c.itemId, c.kind, c.unit]);
      if (!rows.has(key))
        rows.set(key, {
          itemId: c.itemId,
          name: c.name,
          kind: c.kind,
          unit: c.unit,
          gross: 0,
          reversed: 0,
          net: 0,
        });
      const r = rows.get(key);
      r.gross = add(r.gross, c.consumed);
      if (reversed.has(event.id)) r.reversed = add(r.reversed, c.consumed);
      r.net = r.gross - r.reversed;
    }
  }
  const all = [...rows.values()].sort(
      (a, b) =>
        a.itemId.localeCompare(b.itemId) || a.unit.localeCompare(b.unit),
    ),
    materials = { gross: 0, reversed: 0, net: 0 };
  for (const row of all)
    if (row.kind !== "currency" && row.unit === "count")
      for (const key of Object.keys(materials))
        materials[key] = add(materials[key], row[key]);
  return {
    materials,
    items: all.filter((r) => r.kind !== "currency"),
    currencies: all.filter((r) => r.kind === "currency"),
  };
}
