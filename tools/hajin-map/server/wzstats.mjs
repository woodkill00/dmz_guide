// The current public feed permits absent titles for user-reported pins.
// Display labels are derived from explicit fields; activity is never inferred.
export function wzstatsRows(state) {
  if (!state || typeof state !== "object" || Array.isArray(state))
    throw Error("WZStats hydration changed.");
  const matches = Object.values(state).filter(
    (s) => s?.b?.map === "hajin" && Array.isArray(s.b.pins),
  );
  if (
    matches.length !== 1 ||
    matches[0].b.pins.length < 1 ||
    matches[0].b.pins.length > 5000
  )
    throw Error("WZStats hydration changed.");
  const safe = (v, max) =>
    typeof v === "string" &&
    v.trim().length > 0 &&
    v.length <= max &&
    !/[\u0000-\u001f]/.test(v);
  const human = (v) => v.replace(/[-_]+/g, " ");
  return matches[0].b.pins.map((p) => {
    if (
      !p ||
      !safe(p.id, 100) ||
      !safe(p.type, 80) ||
      !/^[\w.:-]+$/.test(p.type) ||
      (p.map !== undefined && p.map !== "hajin") ||
      ![p.x, p.y].every(
        (n) =>
          typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 1000,
      ) ||
      (p.title != null && !safe(p.title, 200)) ||
      (p.note != null &&
        (typeof p.note !== "string" || p.note.length > 3500)) ||
      (p.place != null && !safe(p.place, 120)) ||
      (p.itemId != null && !safe(p.itemId, 120)) ||
      (p.det != null && (typeof p.det !== "object" || Array.isArray(p.det))) ||
      (p.det?.floor != null && !safe(p.det.floor, 100))
    )
      throw Error("Invalid WZStats source pin.");
    const loot = p.type === "spawn" && !!p.itemId;
    const category = loot ? "loot-items" : p.type;
    const base = loot
      ? "Loot: " + human(p.itemId)
      : human(p.type).replace(/^./, (s) => s.toUpperCase());
    return {
      id: p.id,
      title: p.title || base + (p.place ? " · " + human(p.place) : ""),
      category,
      label: loot ? "Loot locations" : undefined,
      x: p.x * 1.08,
      y: p.y * 1.08,
      notes: p.note,
      floor: p.det?.floor,
    };
  });
}
