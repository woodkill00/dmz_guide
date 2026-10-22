// Call with the reader's spoiler-safe display record, never with raw hidden text.
// Rights attribution belongs in the visible caption, not in alternative text.
export function imageDescription(record, assetId, fallbackTitle = "Record") {
  const usage = record.imageDescriptions?.find(
    (entry) => entry.assetId === assetId,
  );
  if (usage?.decorative) return "";
  if (usage?.text?.trim()) return usage.text;
  return `${fallbackTitle} — picture (description not provided)`;
}

export function pruneImageDescriptions(record) {
  if (!record.imageDescriptions) return;
  const attached = new Set(
    [record.assetId, ...(record.assetIds || [])].filter(Boolean),
  );
  record.imageDescriptions = record.imageDescriptions.filter((entry) =>
    attached.has(entry.assetId),
  );
}
