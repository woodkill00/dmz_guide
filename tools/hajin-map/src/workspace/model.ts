import type {
  SourceSnapshot,
  Applicability,
  VisibilityState,
  Json,
} from "./types.ts";
import type { Registration } from "./registration.ts";
import type { CoordinateFrame } from "./types.ts";
import { defaultVisibility } from "./visibility.ts";
export interface SnapshotEntry {
  key: string;
  snapshot: SourceSnapshot;
  digest: string;
  registrationId: string | null;
  mapping: Record<string, string>;
  mappingVersion: number;
  legacy: boolean;
}
export interface Annotation {
  observedAt?:string;
  attachments?:import("./owned-assets.ts").EvidenceAsset[];
  geometry?:import("./owned-assets.ts").OwnedGeometry;
  id: string;
  kind: "POI" | "location" | "mark";
  title: string;
  category: string;
  x: number;
  y: number;
  notes: string;
  evidence: string;
  verificationState: "unverified" | "observed";
  applicability: Applicability;
  iconId: string | null;
  ownership: "owned";
  createdAt: string;
  updatedAt: string;
}
export interface IconAsset {
  design?: import("./icon-design.ts").IconDesign;
  id: string;
  base64: string;
  width: number;
  height: number;
  description: string;
  rightsDeclaration: string;
}
export interface BasemapAsset {
  id: string;
  sourceId: string;
  frame: CoordinateFrame;
  description: string;
  registrationId: string | null;
  rightsDeclaration: string;
  capturedAt: string;
}
export interface PlacedRecord {
  key: string;
  sourceId: string;
  snapshotId: string;
  recordId: string;
  title: string;
  category: string;
  x: number;
  y: number;
  applicability: Applicability;
  lineages: string[];
  registrationId: string;
  mappingVersion: number;
  activity: string;
}
export interface CanonicalEntity {
  id: string;
  title: string;
  category: string;
  x: number;
  y: number;
  applicability: Applicability;
  refs: string[];
  choices: { title: string; position: string; category: string };
  acceptance: "pending" | "accepted" | "withdrawn";
  freshness: "current" | "stale";
  lineages: string[];
  independentLineages: number | null;
  decisionId: string;
  notes: string;
  authoredEvidence: string | null;
  authoredDeclaration: string | null;
  reviewedHeads: { sourceId: string; snapshotId: string }[];
  evidenceVersions: {
    key: string;
    registrationId: string;
    mappingVersion: number;
  }[];
}
export interface OwnedCorrection {
  entityId: string;
  title: string | null;
  category: string | null;
  position: { x: number; y: number; applicability: Applicability } | null;
  evidence: string;
  declaration: string;
}
export interface ReviewDecision {
  id: string;
  parentId: string | null;
  action: "accept" | "split" | "undo" | "withdraw" | "reconfirm";
  before: CanonicalEntity[];
  after: CanonicalEntity[];
  reviewer: string;
  at: string;
  refs: string[];
  registrationIds: string[];
  mappingVersions: number[];
  redacted: boolean;
}
export interface MissingDependency {
  kind: "snapshot" | "basemap" | "curation";
  id: string;
  digest: string | null;
  reason: string;
}
export interface Workspace {
  fieldGuide?: import("./field-guide.ts").FieldGuide;
  usability?: import("./usability.ts").Usability;
  schemaVersion: 1;
  snapshots: SnapshotEntry[];
  registrations: Registration[];
  basemaps: BasemapAsset[];
  annotations: Annotation[];
  icons: IconAsset[];
  categoryIcons: { category: string; iconId: string }[];
  entities: CanonicalEntity[];
  decisions: ReviewDecision[];
  ownedCorrections: OwnedCorrection[];
  visibility: VisibilityState;
  migrations: string[];
  omittedDependencies: MissingDependency[];
}
export const snapshotKey = (source: string, snapshot: string) =>
  JSON.stringify([source, snapshot]);
export const recordKey = (source: string, snapshot: string, record: string) =>
  JSON.stringify([source, snapshot, record]);
export const emptyWorkspace = (): Workspace => ({
  schemaVersion: 1,
  snapshots: [],
  registrations: [],
  basemaps: [],
  annotations: [],
  icons: [],
  categoryIcons: [],
  entities: [],
  decisions: [],
  ownedCorrections: [],
  visibility: defaultVisibility(),
  migrations: [],
  omittedDependencies: [],
});
export const asJson = (value: Workspace): Json => value as unknown as Json;
