const keyPattern = /^[A-Za-z0-9:._-]{1,100}$/;
export function validateSaveReceipt(value, now = Date.now()) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).sort().join() !== "key,owner,revision,savedAt,version" ||
    JSON.stringify(value).length > 1024 ||
    value.version !== 1 ||
    !["profile", "armory"].includes(value.owner) ||
    typeof value.key !== "string" ||
    !keyPattern.test(value.key) ||
    (value.owner === "armory" && value.key !== "main") ||
    !Number.isSafeInteger(value.revision) ||
    value.revision < 1 ||
    typeof value.savedAt !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value.savedAt)
  )
    throw Error("Invalid save notice");
  const at = Date.parse(value.savedAt);
  if (
    !Number.isFinite(at) ||
    new Date(at).toISOString() !== value.savedAt ||
    at > now + 300000 ||
    at < now - 30 * 86400000
  )
    throw Error("Stale or future save notice");
  return { ...value };
}
export function receiptAdmission() {
  const recent = new Set(),
    revisions = new Map();
  return (raw) => {
    let value;
    try {
      value = validateSaveReceipt(raw);
    } catch {
      return null;
    }
    const id = `${value.owner}:${value.key}`,
      token = `${id}:${value.revision}:${value.savedAt}`;
    if (recent.has(token) || value.revision <= (revisions.get(id) || 0))
      return null;
    recent.add(token);
    if (recent.size > 32) recent.delete(recent.values().next().value);
    revisions.delete(id);
    revisions.set(id, value.revision);
    if (revisions.size > 16) revisions.delete(revisions.keys().next().value);
    return value;
  };
}
