import { previewFieldChanges, addDiscovery } from "./field-ops.mjs";
import { setCompletion } from "./progression.mjs";
import { upgradeProgressFor } from "./upgrade-progress.mjs";
import { validateReviewPayload } from "./run-review.mjs";

export function previewReviewOwner(pack, profile, entry) {
  const payload = validateReviewPayload(entry.owner, entry.payload);
  if (entry.owner === "inventory") {
    const { candidate, changes } = previewFieldChanges(profile, pack, [
      payload,
    ]);
    if (!changes.length || changes[0].before === changes[0].after)
      throw Error(
        "This stock report makes no change. Reject it or enter a different amount.",
      );
    if (candidate.fieldOps.history.some((row) => row.id === entry.id))
      throw Error(
        "This stock report was already recorded in quantity history.",
      );
    return {
      candidate,
      before: changes[0].before,
      after: changes[0].after,
      summary: `${changes[0].pool}: ${changes[0].before ?? "Unknown"} → ${changes[0].after}`,
    };
  }
  if (entry.owner === "progression") {
    const objective = pack.objectives.find(
      (row) => row.id === payload.objectiveId,
    );
    if (!objective || (objective.spoiler && !profile.spoilers))
      throw Error(
        "Objective is unavailable or spoiler protected in this catalog.",
      );
    const before =
      objective.track === "dmz-upgrade"
        ? upgradeProgressFor(pack, profile, objective.id).completion
        : profile.completion[objective.id] || "unknown";
    if (before === payload.status)
      throw Error(
        "This progress report makes no change. Reject it or choose a different state.",
      );
    const candidate = setCompletion(
      pack,
      profile,
      objective.id,
      payload.status,
    );
    return {
      candidate,
      before,
      after: payload.status,
      summary: `${before} → ${payload.status}`,
    };
  }
  if (entry.owner === "observation") {
    if (profile.fieldOps?.discoveries.some((row) => row.id === entry.id))
      throw Error("This private discovery is already saved.");
    const candidate = addDiscovery(profile, pack, {
      ...payload,
      id: entry.id,
      photoId: null,
    });
    return {
      candidate,
      before: null,
      after: entry.id,
      summary: `${payload.place || "Place not specified"} · ${payload.container || "Container not specified"}`,
    };
  }
  if (entry.owner === "boss")
    return {
      candidate: null,
      before: null,
      after: entry.id,
      summary: `${payload.event} · ${payload.date} · map target ${payload.bossId}`,
    };
  throw Error("Unknown report owner");
}
