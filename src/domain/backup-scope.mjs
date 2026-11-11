export const PROFILE_BACKUP_SCOPE = Object.freeze([
  "Inventory and reserves",
  "Goals and progress",
  "Carried gear, field history and discovery metadata",
]);
export const PROFILE_BACKUP_EXCLUSIONS = Object.freeze([
  "Discovery photo bytes",
  "Map workspace and source captures",
  "Armory workspace",
  "Named run plans",
]);
export function verifiedBackupStatus(value, packId) {
  if (
    !value ||
    value.packId !== packId ||
    !/^\d{4}-\d{2}-\d{2}T/.test(value.savedAt) ||
    !Number.isSafeInteger(value.revision) ||
    value.revision < 0
  )
    return null;
  return { savedAt: value.savedAt, revision: value.revision };
}
