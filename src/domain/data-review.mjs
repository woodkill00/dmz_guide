export function dataReviewIssues(pack, limit = 500) {
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 1000)
    throw Error("Invalid review limit");
  const issues = [];
  const protectedIds = new Set(
    [
      ...(pack.objectives || []),
      ...(pack.items || []),
      ...(pack.recipes || []),
      ...(pack.locations || []),
    ]
      .filter((row) => row.spoiler)
      .map((row) => row.id),
  );
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
  for (const row of pack.items || []) {
    if (row.spoiler || row.kind !== "weapon") continue;
    if (
      !(row.stats || []).some(
        (stat) => stat.value !== null && stat.value !== undefined,
      )
    )
      add(
        "weapon",
        row,
        "No numeric catalog stat recorded; compare mode-specific sources in Armory",
      );
    else if (
      (row.stats || []).some(
        (stat) =>
          stat.value !== null &&
          stat.value !== undefined &&
          !stat.sourceIds?.length,
      )
    )
      add("weapon", row, "Numeric stat lacks a direct source reference");
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
  // A published pack is normally schema-valid. Keep this read-only check here
  // as well so an older or privately loaded catalog exposes a broken edge
  // instead of silently dropping the link from its detail page.
  const groups = [
    "items",
    "recipes",
    "objectives",
    "guides",
    "maps",
    "locations",
  ];
  const records = groups.flatMap((group) => pack[group] || []);
  const ids = new Set(records.map((row) => row.id));
  const visible = (row) => !row.spoiler && !protectedIds.has(row.id);
  const check = (row, target, relation) => {
    if (visible(row) && target && !ids.has(target) && !protectedIds.has(target))
      add("relation", row, `${relation} points to an unavailable record`);
  };
  for (const row of records) {
    for (const input of row.inputs || [])
      check(row, input.itemId, "Recipe ingredient");
    for (const requirement of row.requirements || [])
      check(row, requirement.itemId, "Objective requirement");
    for (const target of row.prerequisites || [])
      check(row, target, "Prerequisite");
    for (const target of row.relatedIds || [])
      check(row, target, "Related record");
    for (const target of row.itemIds || []) check(row, target, "Location item");
    check(row, row.output?.itemId, "Recipe output");
    check(row, row.mapId, "Map");
  }
  return { issues, truncated: issues.length >= limit };
}
