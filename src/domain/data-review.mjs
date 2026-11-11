export function dataReviewIssues(pack, limit = 500) {
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 1000)
    throw Error("Invalid review limit");
  const issues = [];
  const protectedIds = new Set([
    ...(pack.objectives || []),
    ...(pack.items || []),
    ...(pack.recipes || []),
    ...(pack.locations || []),
  ].filter((row) => row.spoiler).map((row) => row.id));
  const add = (type, record, reason) => {
    if (issues.length < limit)
      issues.push({
        type,
        id: record.id,
        name: record.name || record.title || record.id,
        reason,
        status: record.status || "unknown",
      });
  };
  for (const row of pack.objectives || []) {
    if (row.spoiler) continue;
    if (row.requirementsKnown === false)
      add("objective", row, "Requirements unrecorded");
    if (
      row.track === "dmz-upgrade" &&
      row.upgrade?.prerequisiteStatus === "unknown"
    )
      add("objective", row, "Upgrade prerequisites unrecorded");
    if (row.status === "disputed")
      add("objective", row, "Conflicting evidence");
  }
  for (const row of pack.recipes || []) {
    if (row.spoiler) continue;
    if (row.ingredientsKnown === false)
      add("recipe", row, "Recipe ingredients unrecorded");
    if (row.eligibility === "unknown")
      add("recipe", row, "Print eligibility unverified");
    if (row.status === "disputed") add("recipe", row, "Conflicting evidence");
  }
  for (const row of pack.locations || []) {
    if (row.spoiler) continue;
    if (row.coordinates == null && !row.grid)
      add("location", row, "No registered map position");
  }
  for (const row of pack.claims || []) {
    if (row.status === "disputed" && !protectedIds.has(row.entityId))
      add("claim", row, "Conflicting source claim");
  }
  return { issues, truncated: issues.length >= limit };
}
