import { readExistingRecord } from "./summary-read.mjs";
import { validateProfile } from "../domain/profile.mjs";
import { validateArmory } from "../domain/armory-workspace.mjs";
export async function readDashboardOverlay(packId, options = {}) {
  const record = await readExistingRecord(
    "dmz-guide-local",
    "content",
    packId,
    { ...options, timeout: 1500 },
  );
  return {
    pack: record?.value?.pack || null,
    tag: `${!!record?.value?.pack}:${record?.value?.revision ?? 0}`,
  };
}
export async function readDashboardProfile(packId, options = {}) {
  const record = await readExistingRecord(
    "dmz-guide-local",
    "profiles",
    packId,
    { ...options, timeout: 1500 },
  );
  if (!record) return null;
  const value = validateProfile(record.value);
  if (value.packId !== packId) throw Error("Saved profile identity differs");
  return value;
}
export async function readDashboardArmory(options = {}) {
  const record = await readExistingRecord(
    "dmz-armory-local",
    "workspace",
    "main",
    { ...options, timeout: 1500 },
  );
  return record ? validateArmory(record.value) : null;
}
