import type { Annotation, Workspace } from "./model.ts";
import type { ExplorerRecord } from "./explorer-index.ts";
import type { VisibilityState } from "./types.ts";
import { makeAnnotation } from "./annotations.ts";
import { isVisible } from "./visibility.ts";
export type MarkerOrigin = {
  kind: "source" | "reviewed";
  sourceId: string;
  recordId: string;
  categoryId: string;
};
export const originKey = (o: MarkerOrigin) =>
  JSON.stringify([o.kind, o.sourceId, o.recordId]);
export const markerOrigins = (state: Workspace) =>
  new Set(
    state.annotations.flatMap((a) => (a.origin ? [originKey(a.origin)] : [])),
  );
export const overridden = (
  state: Workspace,
  kind: string,
  sourceId: string,
  id: string,
  index: ReadonlySet<string> = markerOrigins(state),
) => index.has(JSON.stringify([kind, sourceId, id]));
export function overrideVisible(a: Annotation, v: VisibilityState) {
  if (!a.origin) return true;
  return a.origin.kind === "reviewed"
    ? v.curatedEnabled
    : isVisible(
        v,
        a.origin.sourceId,
        a.origin.categoryId,
        `${a.title} ${a.category} ${a.notes}`,
        true,
      );
}
export function markerDraft(state: Workspace, r: ExplorerRecord): Annotation {
  if (r.kind === "custom") {
    const a = state.annotations.find((a) => a.id === r.id);
    if (!a) throw Error("Point no longer exists.");
    return structuredClone(a);
  }
  if (r.x === null || r.y === null)
    throw Error("Register this source before editing its map position.");
  const origin: MarkerOrigin = {
    kind: r.kind,
    sourceId: r.sourceId,
    recordId: r.id,
    categoryId: r.categoryId,
  };
  const old = state.annotations.find(
    (a) => a.origin && originKey(a.origin) === originKey(origin),
  );
  if (old) return structuredClone(old);
  return {
    ...makeAnnotation({
      title: r.title,
      category: r.category,
      x: r.x,
      y: r.y,
      notes: r.notes.slice(0, 4000),
      floor: r.floor ?? "",
      gameBuild: r.build ?? "",
    }),
    origin,
  };
}
