import { camoStates } from "./camo-progress.mjs";

export function pickerCamo(
  catalog,
  weapon,
  workspace,
  choice = "",
  prestige = false,
) {
  const states = camoStates(catalog, workspace, weapon.id);
  const rows = weapon.rows.filter(
    (row) => (row.group === "prestige") === prestige,
  );
  const remaining = rows.filter((row) => states[row.id] !== "completed");
  return {
    states,
    remaining,
    current:
      remaining.find((row) => row.id === choice) ||
      remaining.find((row) => states[row.id] === "next") ||
      remaining[0] ||
      null,
    completed: rows.length - remaining.length,
    total: rows.length,
  };
}

export function parsePickerChoices(raw, weapons) {
  if (typeof raw !== "string" || raw.length > 8192) return new Map();
  try {
    const value = JSON.parse(raw);
    if (!Array.isArray(value) || value.length > weapons.length)
      return new Map();
    const choices = new Map();
    for (const row of value) {
      if (!Array.isArray(row) || row.length !== 2 || choices.has(row[0]))
        return new Map();
      const weapon = weapons.find((w) => w.id === row[0]);
      if (!weapon?.rows.some((camo) => camo.id === row[1])) return new Map();
      choices.set(row[0], row[1]);
    }
    return choices;
  } catch {
    return new Map();
  }
}
