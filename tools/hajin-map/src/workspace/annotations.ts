import type { Annotation, Workspace } from "./model.ts";
import { canonicalFrame } from "./registration.ts";
export function pointBounds(x: number, y: number) {
  if (![x, y].every((v) => Number.isFinite(v) && v >= 0 && v <= 4096))
    throw new Error("Point coordinates must be between0 and4096.");
}
export function annotationValid(a: Annotation) {
  pointBounds(a.x, a.y);
  if (
    !a.id ||
    a.id.length > 128 ||
    !a.title.trim() ||
    a.title.length > 200 ||
    !a.category.trim() ||
    a.category.length > 200 ||
    a.notes.length > 4000 ||
    a.evidence.length > 4000 ||
    !["POI", "location", "mark"].includes(a.kind) ||
    !["unverified", "observed"].includes(a.verificationState) ||
    a.ownership !== "owned" ||
    a.applicability.mapId !== canonicalFrame.mapId ||
    a.applicability.coordinateVersion !== canonicalFrame.coordinateVersion ||
    [a.applicability.gameBuild, a.applicability.floor].some(
      (v) =>
        v !== null && (typeof v !== "string" || v.length > 128 || !v.trim()),
    ) ||
    (a.iconId !== null && !/^[a-f0-9]{64}$/.test(a.iconId))
  )
    throw new Error("Invalid private point.");
}
export function makeAnnotation(input: {
  title: string;
  x: number;
  y: number;
  kind?: Annotation["kind"];
  category?: string;
  notes?: string;
  evidence?: string;
  floor?: string;
  gameBuild?: string;
  iconId?: string | null;
  verificationState?: Annotation["verificationState"];
}): Annotation {
  const now = new Date().toISOString();
  const a: Annotation = {
    id: crypto.randomUUID(),
    kind: input.kind ?? "POI",
    title: input.title.trim(),
    category: input.category?.trim() || "My locations",
    x: input.x,
    y: input.y,
    notes: input.notes ?? "",
    evidence: input.evidence ?? "",
    verificationState: input.verificationState ?? "unverified",
    applicability: {
      mapId: canonicalFrame.mapId,
      coordinateVersion: canonicalFrame.coordinateVersion,
      gameBuild: input.gameBuild?.trim() || null,
      floor: input.floor?.trim() || null,
    },
    iconId: input.iconId ?? null,
    ownership: "owned",
    createdAt: now,
    updatedAt: now,
  };
  annotationValid(a);
  return a;
}
export function saveAnnotation(state: Workspace, annotation: Annotation) {
  annotationValid(annotation);
  if (annotation.iconId && !state.icons.some((i) => i.id === annotation.iconId))
    throw new Error("Selected icon is unavailable.");
  const i = state.annotations.findIndex((a) => a.id === annotation.id);
  if (i < 0) {
    if (state.annotations.length >= 5000)
      throw new Error(
        "Custom point limit reached. Export or use another workspace.",
      );
    state.annotations.push(structuredClone(annotation));
  } else
    state.annotations[i] = {
      ...structuredClone(annotation),
      updatedAt: new Date().toISOString(),
    };
}
export function removeAnnotation(state: Workspace, id: string) {
  const i = state.annotations.findIndex((a) => a.id === id);
  if (i < 0) throw new Error("Point not found.");
  state.annotations.splice(i, 1);
}
