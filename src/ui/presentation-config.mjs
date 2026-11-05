import defaults from "./presentation-flags.json" with { type: "json" };
export const UI_CONTRACT = "071-v1";
export const UI_SURFACES = Object.freeze([
  "guide",
  "map",
  "safe-runs",
  "studio",
  "manager",
]);
const plain = (x) =>
  x &&
  typeof x === "object" &&
  !Array.isArray(x) &&
  [Object.prototype, null].includes(Object.getPrototypeOf(x));
export function validatePresentationFlags(value) {
  if (
    !plain(value) ||
    value.version !== 1 ||
    Object.keys(value).sort().join(",") !== "surfaces,version" ||
    !plain(value.surfaces) ||
    Object.keys(value.surfaces).sort().join(",") !==
      [...UI_SURFACES].sort().join(",")
  )
    throw Error("Invalid presentation configuration");
  for (const id of UI_SURFACES)
    if (!["legacy", "modern"].includes(value.surfaces[id]))
      throw Error("Invalid presentation variant: " + id);
  return value;
}
export function resolvePresentation(
  surface,
  {
    flags = defaults,
    override = typeof process !== "undefined"
      ? process.env.DMZ_UI_VARIANT
      : undefined,
  } = {},
) {
  validatePresentationFlags(flags);
  if (!UI_SURFACES.includes(surface))
    throw Error("Unknown presentation surface");
  if (override !== undefined && !["legacy", "modern"].includes(override))
    throw Error("DMZ_UI_VARIANT must be legacy or modern");
  return Object.freeze({
    surface,
    variant: override ?? flags.surfaces[surface],
    contract: UI_CONTRACT,
  });
}
export function presentationAttributes(surface, options) {
  const v = resolvePresentation(surface, options);
  return `data-ui-surface="${v.surface}" data-ui-variant="${v.variant}" data-ui-contract="${v.contract}"`;
}
