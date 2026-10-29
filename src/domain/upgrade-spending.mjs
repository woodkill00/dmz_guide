import { assert, clone, LIMITS } from "../content/limits.mjs";
import { validateProfile, validateInventoryForPack } from "./profile.mjs";
import { spoilerGuard } from "./progression.mjs";
import {
  SPEND_LIMIT,
  validateOperation,
  validateSpendHistory,
  spendingIdentity,
  scopeKey,
  completedEntry,
  equalProgress,
  spendingTotals,
} from "./spend-history.mjs";
export { spendingTotals } from "./spend-history.mjs";
const scopeOf = (record, pack) =>
  record.scope || {
    gameId: pack.game.id,
    mode: pack.game.mode,
    build: pack.game.build,
  };
const known = new Set(["observed", "verified", "fictional"]);
const sameScope = (a, b) => scopeKey(a) === scopeKey(b);
function replay(profile, options, kind, target) {
  validateProfile(profile);
  validateOperation(options);
  assert(
    profile.schemaVersion === 3,
    "Preview and confirm spending profile migration in Settings.",
  );
  const event = profile.spendHistory.find((e) => e.id === options.operationId);
  if (!event) return null;
  assert(
    event.kind === kind &&
      event.recordedAt === options.recordedAt &&
      event[kind === "purchase" ? "upgradeId" : "purchaseId"] === target,
    "Spending operation ID conflicts with a different intent",
  );
  return {
    candidate: clone(profile),
    event: clone(event),
    changed: false,
    warnings: ["This operation was already recorded; no stock changed."],
  };
}
function revision(profile, expected) {
  assert(
    Number.isSafeInteger(profile.revision + 1),
    "Profile revision limit exceeded",
  );
  assert(
    profile.revision === (expected ?? profile.revision),
    "Spending confirmation expired; review the saved revision again.",
  );
}
function prospectiveStored(candidate) {
  const stored = clone(candidate);
  stored.revision++;
  return validateProfile(stored);
}
export function recordUpgradePurchase(pack, profile, upgradeId, options) {
  const repeated = replay(profile, options, "purchase", upgradeId);
  assert(profile.packId === pack.id, "Purchase belongs to a different catalog");
  const objective = pack.objectives.find(
    (r) => r.id === upgradeId && r.track === "dmz-upgrade",
  );
  assert(objective, "Unknown upgrade");
  if (repeated) {
    assert(
      sameScope(repeated.event.scope, scopeOf(objective, pack)),
      "Spending operation scope conflicts",
    );
    return repeated;
  }
  revision(profile, options.expectedRevision);
  assert(
    profile.contentVersion === pack.contentVersion,
    "Content version mismatch. Preview and rebind in Settings.",
  );
  assert(
    profile.spendHistory.length <= SPEND_LIMIT - 2,
    "Spending history is full; export a backup. No purchase was recorded.",
  );
  assert(
    pack.schemaVersion === 2,
    "Known typed upgrade costs are required before recording spending.",
  );
  let work = 0;
  const tick = () => assert(++work <= 500000, "Spending work limit exceeded");
  const identity = spendingIdentity(),
    normalized = new Map(),
    items = new Map(),
    sources = new Map(),
    guard = spoilerGuard(pack, profile.spoilers);
  validateInventoryForPack(profile, pack);
  for (const source of pack.sources) {
    tick();
    sources.set(source.id, source);
  }
  const existing = validateSpendHistory(profile.spendHistory);
  for (const event of existing.purchases.values()) {
    tick();
    for (const unused of event.observationKeys) tick();
    identity.bind(event);
  }
  for (const item of pack.items) {
    tick();
    items.set(item.id, item);
  }
  for (const record of pack.objectives) {
    tick();
    if (record.track !== "dmz-upgrade") continue;
    const r = {
      upgradeId: record.id,
      scope: scopeOf(record, pack),
      observationKeys: record.upgrade?.observationKeys || [],
    };
    for (const unused of r.observationKeys) tick();
    identity.bind(r);
    normalized.set(record.id, r);
  }
  const target = normalized.get(upgradeId),
    group = identity.root(target),
    aliases = pack.objectives.filter((r) => {
      tick();
      return (
        normalized.has(r.id) && identity.root(normalized.get(r.id)) === group
      );
    });
  assert(
    !existing.active.some((e) => identity.root(e) === group),
    "An equivalent purchase is already recorded. Status-only correction does not allow another debit.",
  );
  assert(
    !aliases.some(
      (r) => profile.upgradeProgress[r.id]?.completion === "completed",
    ),
    "This upgrade is already marked completed. Use status-only correction; do not deduct stock twice.",
  );
  const disputed = new Set();
  for (const claim of pack.claims) {
    tick();
    if (claim.status === "disputed") disputed.add(claim.entityId);
  }
  function costsFor(record) {
    assert(
      record.oneTime === true &&
        known.has(record.status) &&
        !disputed.has(record.id),
      "Upgrade cost evidence is unknown or disputed; no spending recorded.",
    );
    assert(
      profile.spoilers ||
        (!record.spoiler && !guard.limited && !guard.contains(record.id)),
      "Reveal spoilers before recording this purchase; protected details are withheld.",
    );
    const costs = new Map();
    for (const row of record.requirements) {
      tick();
      const item = items.get(row.itemId);
      assert(
        item && sameScope(scopeOf(item, pack), scopeOf(record, pack)),
        "Incompatible purchase cost scope",
      );
      assert(
        profile.spoilers || (!item.spoiler && !guard.contains(item.id)),
        "Reveal spoilers before recording this purchase; protected details are withheld.",
      );
      assert(
        Number.isSafeInteger(row.quantity) &&
          row.quantity > 0 &&
          row.quantity <= LIMITS.quantity &&
          ["consumed", "retained"].includes(row.consumption) &&
          known.has(row.status) &&
          known.has(item.status) &&
          !disputed.has(item.id),
        "Requirement quantity/consumption/evidence is unknown or disputed",
      );
      if (!costs.has(item.id))
        costs.set(item.id, {
          itemId: item.id,
          name: item.name,
          kind: item.kind,
          unit: item.unit,
          consumed: 0,
          retained: 0,
        });
      const c = costs.get(item.id);
      if (row.consumption === "consumed") c.consumed += row.quantity;
      else c.retained = Math.max(c.retained, row.quantity);
      assert(
        c.consumed <= LIMITS.quantity,
        "Purchase cost quantity limit exceeded",
      );
    }
    assert(
      costs.size > 0 && costs.size <= 100,
      "Purchase cost row limit exceeded",
    );
    return [...costs.values()].sort((a, b) =>
      a.itemId < b.itemId ? -1 : a.itemId > b.itemId ? 1 : 0,
    );
  }
  const costs = costsFor(objective),
    signature = (rows) =>
      JSON.stringify(
        rows.map((c) => [c.itemId, c.kind, c.unit, c.consumed, c.retained]),
      );
  for (const alias of aliases) {
    tick();
    assert(
      signature(costsFor(alias)) === signature(costs),
      "Conflicting costs for equivalent observed upgrades; no spending recorded.",
    );
  }
  for (const cost of costs) {
    assert(
      Object.hasOwn(profile.inventory, cost.itemId),
      "Inventory not entered for every listed cost; no spending recorded.",
    );
    cost.before = profile.inventory[cost.itemId];
    cost.reserve = profile.reserves[cost.itemId] || 0;
    cost.after = cost.before - cost.consumed;
    assert(
      cost.after >= cost.retained + cost.reserve,
      "Insufficient unreserved stock. Save stock/reserve changes separately or use status-only correction.",
    );
  }
  assert(
    costs.some((c) => c.consumed > 0),
    "No consumed cost to record; use status-only correction.",
  );
  const beforeProgress = clone(profile.upgradeProgress[upgradeId] ?? null),
    event = {
      id: options.operationId,
      kind: "purchase",
      recordedAt: options.recordedAt,
      contentVersion: pack.contentVersion,
      upgradeId,
      upgradeName: objective.name,
      scope: clone(target.scope),
      observationKeys: [
        ...new Set(aliases.flatMap((r) => r.upgrade?.observationKeys || [])),
      ].sort(),
      beforeProgress,
      afterProgress: completedEntry(beforeProgress),
      costs,
    };
  const candidate = clone(profile);
  for (const c of costs) candidate.inventory[c.itemId] = c.after;
  candidate.upgradeProgress[upgradeId] = clone(event.afterProgress);
  candidate.spendHistory.push(event);
  validateProfile(candidate);
  // Reserve enough serializable space for the immediate safe reversal as well.
  let reservation = 0,
    reservedId;
  do {
    reservedId =
      "spend:" + "r".repeat(88) + String(reservation++).padStart(6, "0");
  } while (candidate.spendHistory.some((e) => e.id === reservedId));
  const storedPurchase = prospectiveStored(candidate);
  recordSpendingReversal(storedPurchase, event.id, {
    operationId: reservedId,
    recordedAt: options.recordedAt,
    expectedRevision: storedPurchase.revision,
  });
  const warnings = new Set([
    "Recording a purchase you report, not triggering the game or verifying eligibility. Saved stock must be from before this purchase.",
  ]);
  for (const alias of aliases) {
    tick();
    const progress = profile.upgradeProgress[alias.id];
    if (progress?.availability !== "available")
      warnings.add(
        "Availability is unknown or locked; this report does not verify game eligibility.",
      );
    if (progress?.reviewRequired)
      warnings.add(
        "Saved progress requires review; this purchase record does not verify source facts.",
      );
    if (alias.upgrade?.prerequisiteStatus !== "known")
      warnings.add("Prerequisite completeness is unknown.");
    if (alias.requirementsKnown === false)
      warnings.add(
        "Only listed direct costs are recorded; additional costs may exist.",
      );
    if (alias.status !== "fictional") {
      let knownBuild = alias.sourceIds.length > 0;
      for (const sourceId of alias.sourceIds) {
        tick();
        if (sources.get(sourceId)?.provenance?.buildStatus !== "known")
          knownBuild = false;
      }
      if (!knownBuild) warnings.add("Current-build applicability is unknown.");
    }
  }
  return {
    candidate,
    event: clone(event),
    changed: true,
    warnings: [...warnings],
  };
}

export function recordSpendingReversal(profile, purchaseId, options) {
  const repeated = replay(profile, options, "reversal", purchaseId);
  if (repeated) return repeated;
  revision(profile, options.expectedRevision);
  const { active } = validateSpendHistory(profile.spendHistory),
    purchase = active.at(-1);
  assert(
    purchase?.id === purchaseId,
    "Only the latest unreversed purchase can be corrected once.",
  );
  assert(
    profile.spendHistory.length < SPEND_LIMIT,
    "Spending history is full; correction was not recorded.",
  );
  assert(
    equalProgress(
      profile.upgradeProgress[purchase.upgradeId] ?? null,
      purchase.afterProgress,
    ),
    "Progress changed after this purchase; reconcile manually without an automatic refund.",
  );
  for (const c of purchase.costs)
    assert(
      Object.hasOwn(profile.inventory, c.itemId) &&
        profile.inventory[c.itemId] === c.after,
      "Affected stock changed or is not entered; cannot safely restore this snapshot.",
    );
  const candidate = clone(profile);
  for (const c of purchase.costs) {
    assert(
      Number.isSafeInteger(c.after + c.consumed) &&
        c.after + c.consumed <=
          (c.kind === "currency" ? 2000000 : LIMITS.quantity),
      "Refund would exceed inventory limit",
    );
    candidate.inventory[c.itemId] = c.before;
  }
  if (purchase.beforeProgress === null)
    delete candidate.upgradeProgress[purchase.upgradeId];
  else
    candidate.upgradeProgress[purchase.upgradeId] = clone(
      purchase.beforeProgress,
    );
  const event = {
    id: options.operationId,
    kind: "reversal",
    recordedAt: options.recordedAt,
    purchaseId,
  };
  candidate.spendHistory.push(event);
  validateProfile(candidate);
  prospectiveStored(candidate);
  return {
    candidate,
    event: clone(event),
    changed: true,
    warnings: [
      "This corrects guide bookkeeping using the original snapshot. It does not refund anything in the game.",
    ],
  };
}
export function spendingView(pack, profile) {
  validateProfile(profile);
  const { purchases, reversed, active } = validateSpendHistory(
      profile.spendHistory || [],
    ),
    guard = spoilerGuard(pack, profile.spoilers),
    objectives = new Map(pack.objectives.map((r) => [r.id, r])),
    items = new Map(pack.items.map((r) => [r.id, r]));
  const protectedIds = new Set(
    (profile.spendHistory || [])
      .filter((e) => !profile.spoilers && guard.contains(e.id))
      .map((e) => (e.kind === "purchase" ? e.id : e.purchaseId)),
  );
  const visible = new Set();
  for (const p of purchases.values()) {
    const r = objectives.get(p.upgradeId);
    if (
      profile.spoilers ||
      (!guard.limited &&
        !protectedIds.has(p.id) &&
        !guard.contains(p.upgradeId) &&
        r &&
        !r.spoiler &&
        sameScope(scopeOf(r, pack), p.scope) &&
        p.costs.every((c) => {
          const item = items.get(c.itemId);
          return (
            item &&
            !item.spoiler &&
            !guard.contains(c.itemId) &&
            sameScope(scopeOf(item, pack), p.scope)
          );
        }))
    )
      visible.add(p.id);
  }
  const totals = spendingTotals(profile, (p) => visible.has(p.id));
  for (const row of [...totals.items, ...totals.currencies])
    row.name = guard.text(row.name);
  const history = (profile.spendHistory || [])
    .filter((e) => visible.has(e.kind === "purchase" ? e.id : e.purchaseId))
    .map((e) => {
      const p = e.kind === "purchase" ? e : purchases.get(e.purchaseId);
      return {
        ...clone(e),
        upgradeId: p.upgradeId,
        upgradeName: guard.text(p.upgradeName),
        ...(e.kind === "purchase"
          ? {
              contentVersion: guard.text(e.contentVersion),
              scope: Object.fromEntries(
                Object.entries(e.scope).map(([k, v]) => [k, guard.text(v)]),
              ),
              observationKeys: e.observationKeys.map((k) => guard.text(k)),
            }
          : {}),
        costs: p.costs.map((c) => ({ ...c, name: guard.text(c.name) })),
        ...(e.kind === "purchase" ? { reversed: reversed.has(e.id) } : {}),
      };
    });
  const latest = active.at(-1)?.id;
  return {
    ...totals,
    history,
    partial: visible.size !== purchases.size,
    latestPurchaseId: visible.has(latest) ? latest : null,
    recordedOnly: true,
  };
}
