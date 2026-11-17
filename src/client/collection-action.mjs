import { addFound } from "../domain/quick-collect.mjs";
import { emptyFieldOps } from "../domain/field-ops-state.mjs";
import { saveProfile } from "../storage/store.mjs";
import { readDashboardProfile } from "../storage/dashboard-context.mjs";

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
      label: "Dashboard · found items",
      kind: "inventory",
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
