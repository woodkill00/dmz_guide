import type { VisibilityState } from "./types.ts";
export const defaultVisibility = (): VisibilityState => ({
  sourceEnabled: {
    official: true,
    codmunity: true,
    wzstats: true,
    codcentral: true,
    mapgenie: true,
  },
  categoryMask: {
    official: {},
    codmunity: {},
    wzstats: {},
    codcentral: {},
    mapgenie: {},
  },
  curatedEnabled: true,
  customEnabled: true,
  query: "",
});
export function setSourceAll(
  v: VisibilityState,
  source: string,
  ids: string[],
  show: boolean,
) {
  if (show) v.sourceEnabled[source] = true;
  v.categoryMask[source] = Object.fromEntries(ids.map((id) => [id, show]));
}
export function sourceSelection(
  v: VisibilityState,
  source: string,
  ids: string[],
) {
  const count = ids.filter(
    (id) => v.categoryMask[source]?.[id] !== false,
  ).length;
  return count === 0 ? "none" : count === ids.length ? "all" : "mixed";
}
export function isVisible(
  v: VisibilityState,
  source: string,
  category: string,
  text: string,
  registered: boolean,
) {
  return (
    registered &&
    v.sourceEnabled[source] !== false &&
    v.categoryMask[source]?.[category] !== false &&
    text.toLocaleLowerCase().includes(v.query.trim().toLocaleLowerCase())
  );
}
export function globalVisibility(
  v: VisibilityState,
  categories: Record<string, string[]>,
  show: boolean,
) {
  for (const [source, ids] of Object.entries(categories))
    setSourceAll(v, source, ids, show);
  v.curatedEnabled = show;
  v.customEnabled = show;
}
