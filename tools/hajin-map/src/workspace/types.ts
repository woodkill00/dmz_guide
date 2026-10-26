/** Private workspace contracts. Null denotes an explicitly unknown game fact. */
export type Json =
  | null
  | boolean
  | number
  | string
  | Json[]
  | { [key: string]: Json };
export interface Applicability {
  mapId: string;
  coordinateVersion: string;
  gameBuild: string | null;
  floor: string | null;
}
export interface CoordinateFrame {
  id: string;
  mapId: string;
  coordinateVersion: string;
  width: number | null;
  height: number | null;
  units: "pixels" | "normalized" | "unknown";
  origin: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "unknown";
  xAxis: "right" | "left" | "unknown";
  yAxis: "down" | "up" | "unknown";
  crop: { x: number; y: number; width: number; height: number } | null;
  imageDigest: string | null;
}
export interface Evidence {
  note: string;
  url: string | null;
}
export interface SourceRecord {
  id: string;
  categoryId: string;
  title: string;
  rawGeometry: { kind: "point"; x: number; y: number };
  applicability: Applicability;
  activityClaim: {
    state: "possible-spawn" | "observed-active" | "unknown";
    observedAt: string | null;
  };
  upstreamRefs: string[];
  evidence: Evidence[];
}
export interface SourceSnapshot {
  schemaVersion: 1;
  sourceId: string;
  snapshotId: string;
  capturedAt: string;
  sourceRevision: string;
  frame: CoordinateFrame;
  applicability: Applicability;
  categories: { id: string; path: string[] }[];
  records: SourceRecord[];
}
export interface VisibilityState {
  sourceEnabled: Record<string, boolean>;
  categoryMask: Record<string, Record<string, boolean>>;
  curatedEnabled: boolean;
  customEnabled: boolean;
  query: string;
}
export type Acceptance = "pending" | "accepted" | "withdrawn";
export type Freshness = "current" | "stale";
export type AnnotationKind = "POI" | "location" | "mark";
