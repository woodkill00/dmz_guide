export interface CollectionHandoff {
  kind: "dmz-collection-plan";
  version: 1;
  packId: string;
  contentVersion: string;
  createdAt: string;
  scope: "unfinished" | "builds";
  items: {
    itemId: string;
    name: string;
    needed: number;
    minimum: boolean;
    areas: { id: string; name: string }[];
  }[];
}
export function validateCollectionHandoff(plan: unknown): CollectionHandoff;
export interface RunPlanHandoff {
  kind: "dmz-run-plan-handoff";
  version: 1;
  packId: string;
  contentVersion: string;
  planId: string;
  name: string;
  createdAt: string;
  objectiveIds: string[];
  stops: { id: string; name: string }[];
}
export function validateRunPlanHandoff(value: unknown): RunPlanHandoff;
