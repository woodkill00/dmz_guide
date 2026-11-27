import { setItemBlueprint } from "../domain/blueprint-tracking.mjs";
import { setOrderCompletion } from "../domain/order-progress.mjs";
import { addFound } from "../domain/quick-collect.mjs";
import { emptyFieldOps } from "../domain/field-ops-state.mjs";
import { saveProfile } from "../storage/store.mjs";
import { readDashboardProfile } from "../storage/dashboard-context.mjs";
import {
  setUpgradeProgress,
  upgradeProgressFor,
} from "../domain/upgrade-progress.mjs";

export function createUpgradeOperation(
  pack,
  profile,
  upgradeId,
  completion,
  { familyId = upgradeId, overlayTag = "", displayName = "Upgrade" } = {},
) {
  return {
    id: crypto.randomUUID(),
    kind: "upgrade",
    packId: pack.id,
    version: pack.contentVersion,
    upgradeId,
    familyId,
    overlayTag,
    displayName,
    before: upgradeProgressFor(pack, profile, upgradeId).completion,
    completion,
    expectedRevision: profile.revision,
    candidate: setUpgradeProgress(
      pack,
      profile,
      upgradeId,
      { completion },
      profile.revision,
    ),
    state: "editing",
  };
}

export function isStatusOperation(op) {
  return ["upgrade", "order", "blueprint"].includes(op?.kind);
}
export function createOrderOperation(
  pack,
  profile,
  ids,
  completed,
  { overlayTag = "", displayName = "Order", key = ids[0] } = {},
) {
  return {
    id: crypto.randomUUID(),
    kind: "order",
    packId: pack.id,
    version: pack.contentVersion,
    orderKey: key,
    orderIds: [...ids],
    overlayTag,
    displayName,
    expectedRevision: profile.revision,
    candidate: setOrderCompletion(pack, profile, ids, completed),
    state: "editing",
  };
}
export function createBlueprintOperation(
  pack,
  profile,
  itemId,
  owned,
  { overlayTag = "", displayName = "Blueprint" } = {},
) {
  return {
    id: crypto.randomUUID(),
    kind: "blueprint",
    packId: pack.id,
    version: pack.contentVersion,
    itemId,
    owned,
    overlayTag,
    displayName,
    expectedRevision: profile.revision,
    candidate: setItemBlueprint(pack, profile, itemId, owned),
    state: "editing",
  };
}
export function createFoundOperation(pack, profile, itemId, amount) {
  const change = addFound(pack, profile, itemId, amount);
  // Optional fieldOps is already supported by every profile version. Initialize
  // only on this explicit stock edit; history and inventory commit atomically.
  change.candidate.fieldOps ??= emptyFieldOps();
  return {
    id: crypto.randomUUID(),
    packId: pack.id,
    version: pack.contentVersion,
    itemId,
    amount: change.amount,
    before: change.before,
    after: change.after,
    expectedRevision: profile.revision,
    candidate: change.candidate,
    state: "editing",
  };
}
export async function commitFoundOperation(op, { save = saveProfile } = {}) {
  if (!["editing", "failed-before-commit"].includes(op.state))
    throw Error("Verify the pending update before adding again");
  op.state = "submitting";
  try {
    const saved = await save(op.candidate, op.expectedRevision, {
      entryId: op.id,
      label: isStatusOperation(op)
        ? `Dashboard · ${op.kind} status`
        : "Dashboard · found items",
      kind: isStatusOperation(op) ? `${op.kind}-status` : "inventory",
    });
    op.committedRevision = saved.revision;
    op.state = "committed-unverified";
    return saved;
  } catch (error) {
    // saveProfile rejects only before opening a transaction or on tx abort/error.
    // Refresh failures are handled separately and cannot reach this branch.
    op.state = "failed-before-commit";
    throw error;
  }
}
export async function verifyFoundOperation(
  op,
  { read = readDashboardProfile } = {},
) {
  const value = await read(op.packId);
  if (isStatusOperation(op)) {
    // The durable save acknowledgement is the proof; this status-only action
    // deliberately has no inventory delta/history entry. Adopt newer state.
    if (
      Number.isSafeInteger(op.committedRevision) &&
      op.committedRevision === op.expectedRevision + 1 &&
      value?.contentVersion === op.version &&
      value.revision >= op.committedRevision
    ) {
      op.state = "confirmed";
      return value;
    }
    throw Error("Progress save needs verification. Do not repeat the change.");
  }
  const entry = value?.fieldOps?.history.find((row) => row.id === op.id);
  if (
    value?.contentVersion === op.version &&
    value.revision > op.expectedRevision &&
    entry?.changes.some(
      (row) =>
        row.itemId === op.itemId &&
        row.pool === "stash" &&
        row.after === op.after &&
        row.before === (op.before ?? null),
    )
  ) {
    op.state = "confirmed";
    return value;
  }
  throw Error(
    "Update not yet verified. Review saved inventory before any further addition.",
  );
}
