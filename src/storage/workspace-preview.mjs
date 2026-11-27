import { readExistingRecord } from "./summary-read.mjs";
import { validateProfile } from "../domain/profile.mjs";
import { validateArmory } from "../domain/armory-workspace.mjs";
import {
  createWorkspaceManifest,
  inspectWorkspaceManifest,
} from "../domain/workspace-manifest.mjs";
/** Explicit user action; read existing databases only. Never restores or creates one. */
export async function previewSavedWorkspace(
  { packId, profile = true, armory = true, previous = false },
  read = readExistingRecord,
) {
  if (
    !/^[A-Za-z0-9:._-]{1,100}$/.test(packId) ||
    typeof profile !== "boolean" ||
    typeof armory !== "boolean" ||
    typeof previous !== "boolean" ||
    (!profile && !armory)
  )
    throw Error("Choose saved modules and a valid catalog identity");
  const requests = [];
  if (profile)
    requests.push({
      id: "profile",
      name: "Guide profile",
      read: () => read("dmz-guide-local", "profiles", packId),
    });
  if (armory)
    requests.push({
      id: "armory",
      name: "Armory",
      read: () => read("dmz-armory-local", "workspace", "main"),
    });
  const records = await Promise.all(requests.map((owner) => owner.read()));
  const files = [],
    snapshots = [];
  requests.forEach((owner, index) => {
    const envelope = records[index];
    snapshots.push({
      id: owner.id,
      current: !!envelope?.value,
      previous: !!envelope?.previous,
    });
    if (
      envelope !== undefined &&
      (!envelope || !Object.hasOwn(envelope, "value"))
    )
      throw Error(
        `${owner.name} has an invalid saved envelope. Use its recovery tool; nothing replaced.`,
      );
    const value = previous ? envelope?.previous : envelope?.value;
    if (
      envelope === undefined ||
      (previous && (value === null || value === undefined))
    )
      return;
    if (owner.id === "profile") {
      validateProfile(value);
      if (value.packId !== packId)
        throw Error("Saved profile belongs to another catalog");
    } else validateArmory(value);
    const payload =
      owner.id === "armory"
        ? { format: "dmz-armory-backup", version: 1, workspace: value }
        : value;
    files.push({
      name: `${owner.id}-${previous ? "previous" : "current"}.json`,
      text: JSON.stringify(payload),
    });
  });
  if (!files.length)
    throw Error(
      `No ${previous ? "previous snapshots" : "saved records"} found for the selected modules. No data was created or changed.`,
    );
  const bundle = await createWorkspaceManifest(files);
  const projection = await inspectWorkspaceManifest(bundle);
  return { bundle, projection, snapshots, previous };
}
