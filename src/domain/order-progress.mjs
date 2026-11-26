import { setCompletion } from "./progression.mjs";

export function visibleOrderMissions(pack, profile, ids) {
  const allowed = new Set(ids);
  return pack.objectives.filter(
    (r) =>
      allowed.has(r.id) &&
      ["dmz-order", "dmz-story"].includes(r.track) &&
      (!r.spoiler || profile.spoilers),
  );
}

export function orderProgress(pack, profile, ids) {
  const rows = visibleOrderMissions(pack, profile, ids);
  const done = rows.filter(
    (r) => profile.completion[r.id] === "completed",
  ).length;
  return {
    rows,
    done,
    total: rows.length,
    complete: rows.length > 0 && done === rows.length,
    partial: done > 0 && done < rows.length,
  };
}

export function setOrderCompletion(pack, profile, ids, completed) {
  if (
    profile.packId !== pack.id ||
    profile.contentVersion !== pack.contentVersion
  )
    throw Error("Reload the current catalog before changing Orders.");
  if (
    typeof completed !== "boolean" ||
    !Array.isArray(ids) ||
    !ids.length ||
    ids.length > 500
  )
    throw Error("Select a recorded mission or order page.");
  const rows = visibleOrderMissions(pack, profile, ids);
  if (rows.length !== new Set(ids).size)
    throw Error(
      "An Order is missing or protected. Reload before changing progress.",
    );
  return rows.reduce(
    (candidate, r) =>
      setCompletion(pack, candidate, r.id, completed ? "completed" : "unknown"),
    profile,
  );
}

// Input pages retain canonical order; display filters never choose the active page.
export function activeOrderPageKeys(pages) {
  const seen = new Set(),
    active = new Set();
  for (const page of pages) {
    if (seen.has(page.set) || !page.total || page.done >= page.total) continue;
    seen.add(page.set);
    active.add(page.set + "-" + page.page);
  }
  return active;
}

export function orderPageLabel(page, title = "", set = "hajin") {
  if (!Number.isSafeInteger(page) || page < 1) return title;
  const base = "Page " + page;
  if (set === "x01" && title === "X01 " + page + "/5") return base + " of 5";
  return !title || title === base ? base : base + " · " + title;
}
