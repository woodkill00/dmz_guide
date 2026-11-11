const MAX_BYTES = 256 * 1024;
const MAX_ROWS = 500;
const id = (value) =>
  typeof value === "string" && /^[a-zA-Z0-9:._-]{1,120}$/.test(value);

// An approved export schema has not been supplied. Previewing a file is
// deliberately read-only and never returns a profile mutation candidate.
export function previewPlayerImport(input, pack) {
  const bytes =
    typeof input === "string"
      ? new TextEncoder().encode(input).byteLength
      : input?.byteLength;
  if (!Number.isSafeInteger(bytes) || bytes > MAX_BYTES || bytes < 1)
    throw Error("Import file size is unsupported");
  let value;
  try {
    value = JSON.parse(
      typeof input === "string"
        ? input
        : new TextDecoder("utf-8", { fatal: true }).decode(input),
    );
  } catch {
    throw Error("Import file is not valid UTF-8 JSON");
  }
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw Error("Import root must be an object");
  const fields = Object.keys(value);
  if (fields.length > MAX_ROWS) throw Error("Import has too many fields");
  const known = new Set((pack?.items || []).map((item) => item.id));
  const referencedIds = Array.isArray(value.itemIds)
    ? value.itemIds.slice(0, MAX_ROWS).filter(id)
    : [];
  return {
    status: "unsupported-schema",
    fileBytes: bytes,
    fieldNames: fields.slice(0, 32),
    knownItemIds: referencedIds.filter((itemId) => known.has(itemId)),
    unknownItemCount: referencedIds.filter((itemId) => !known.has(itemId))
      .length,
    canApply: false,
    reason:
      "No approved Activision player-data export contract is configured. The file has not changed any saved data.",
  };
}
