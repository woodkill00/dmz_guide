export const categoryName = (
  id: string,
  mapping: Record<string, string>,
): string => (Object.hasOwn(mapping, id) ? mapping[id] : "Unmapped");
export function validateMapping(mapping: Record<string, string>): void {
  if (
    Object.keys(mapping).length > 100 ||
    Object.entries(mapping).some(
      ([key, value]) =>
        !key ||
        typeof value !== "string" ||
        !value.trim() ||
        value.length > 200 ||
        ["__proto__", "constructor", "prototype"].includes(key),
    )
  )
    throw new Error("Invalid taxonomy mapping.");
}
