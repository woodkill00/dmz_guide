import type {
  Workspace,
  PlacedRecord,
  CanonicalEntity,
  ReviewDecision,
} from "./model.ts";
import { pointBounds } from "./annotations.ts";
import { evidenceChanged } from "./refresh.ts";
export interface ReviewChoices {
  titleKey: string;
  positionKey: string;
  categoryKey: string;
  reviewer: string;
  entityId?: string;
  notes?: string;
  authored?: {
    title?: string;
    category?: string;
    position?: { x: number; y: number };
    evidence: string;
    declaration: string;
  };
}
function reviewerName(name: string) {
  if (!name.trim() || name.length > 200)
    throw new Error("Provide a reviewer name (up to200 characters).");
}
function append(
  state: Workspace,
  action: ReviewDecision["action"],
  before: CanonicalEntity[],
  after: CanonicalEntity[],
  reviewer: string,
  records: PlacedRecord[],
): ReviewDecision {
  reviewerName(reviewer);
  if (state.decisions.length >= 20000)
    throw new Error(
      "Decision history limit reached; export and use another workspace.",
    );
  if (
    state.entities.length +
      after.filter((e) => !state.entities.some((x) => x.id === e.id)).length >
    5000
  )
    throw new Error("Reviewed entity limit reached.");
  const decision: ReviewDecision = {
    id: crypto.randomUUID(),
    parentId: state.decisions.at(-1)?.id ?? null,
    action,
    before: structuredClone(before),
    after: structuredClone(after),
    reviewer,
    at: new Date().toISOString(),
    refs: [...new Set(records.map((r) => r.key))],
    registrationIds: [...new Set(records.map((r) => r.registrationId))],
    mappingVersions: [...new Set(records.map((r) => r.mappingVersion))],
    redacted: false,
  };
  for (const entity of after) {
    entity.decisionId = decision.id;
    const i = state.entities.findIndex((e) => e.id === entity.id);
    if (i < 0) {
      if (state.entities.length >= 5000)
        throw new Error("Reviewed entity limit reached.");
      state.entities.push(structuredClone(entity));
    } else state.entities[i] = structuredClone(entity);
  }
  decision.after = structuredClone(after);
  state.decisions.push(decision);
  return decision;
}
export function acceptReview(
  state: Workspace,
  records: PlacedRecord[],
  choices: ReviewChoices,
): CanonicalEntity {
  if (
    records.length < 1 ||
    records.length > 32 ||
    new Set(records.map((r) => r.key)).size !== records.length
  )
    throw new Error("Select1 to32 distinct evidence records.");
  const choose = (key: string) => {
    if (key === "authored") return records[0];
    const p = records.find((r) => r.key === key);
    if (!p) throw new Error("Selected field evidence is missing.");
    return p;
  };
  const title = choose(choices.titleKey),
    position = choose(choices.positionKey),
    category = choose(choices.categoryKey);
  if (
    new Set(records.map((r) => r.applicability.floor).filter(Boolean)).size >
      1 ||
    new Set(records.map((r) => r.applicability.gameBuild).filter(Boolean))
      .size > 1
  )
    throw new Error(
      "Known floors/builds conflict across the selected evidence.",
    );
  pointBounds(position.x, position.y);
  if (
    records.some(
      (r) =>
        r.applicability.mapId !== position.applicability.mapId ||
        r.applicability.coordinateVersion !==
          position.applicability.coordinateVersion ||
        (r.applicability.floor &&
          position.applicability.floor &&
          r.applicability.floor !== position.applicability.floor) ||
        (r.applicability.gameBuild &&
          position.applicability.gameBuild &&
          r.applicability.gameBuild !== position.applicability.gameBuild),
    )
  )
    throw new Error("Conflicting map/build/floor requires separate entities.");
  const previous = choices.entityId
    ? state.entities.find((e) => e.id === choices.entityId)
    : undefined;
  if (choices.entityId && !previous)
    throw new Error("Reviewed entity no longer exists.");
  const lineages = [...new Set(records.flatMap((r) => r.lineages))];
  const authored = [
    choices.titleKey,
    choices.positionKey,
    choices.categoryKey,
  ].includes("authored");
  if (
    authored &&
    (!choices.authored?.evidence.trim() ||
      choices.authored.evidence.length > 4000 ||
      !choices.authored.declaration.trim() ||
      choices.authored.declaration.length > 4000)
  )
    throw new Error(
      "Authored fields require evidence and an ownership/authorization declaration.",
    );
  const own = choices.authored;
  const entity: CanonicalEntity = {
    id: previous?.id ?? crypto.randomUUID(),
    title: choices.titleKey === "authored" ? (own?.title ?? "") : title.title,
    category:
      choices.categoryKey === "authored"
        ? (own?.category ?? "")
        : category.category,
    x:
      choices.positionKey === "authored"
        ? (own?.position?.x ?? NaN)
        : position.x,
    y:
      choices.positionKey === "authored"
        ? (own?.position?.y ?? NaN)
        : position.y,
    applicability: structuredClone(position.applicability),
    refs: records.map((r) => r.key),
    choices: {
      title: choices.titleKey,
      position: choices.positionKey,
      category: choices.categoryKey,
    },
    acceptance: "accepted",
    freshness: "current",
    lineages,
    independentLineages: records.some((r) => r.lineages.length === 0)
      ? null
      : lineages.length,
    decisionId: "",
    notes: choices.notes ?? "",
    authoredEvidence: authored ? own!.evidence : null,
    authoredDeclaration: authored ? own!.declaration : null,
    reviewedHeads: [...new Set(records.map((r) => r.sourceId))].flatMap(
      (sourceId) => {
        const head = state.snapshots
          .filter((s) => s.snapshot.sourceId === sourceId)
          .at(-1);
        return head ? [{ sourceId, snapshotId: head.snapshot.snapshotId }] : [];
      },
    ),
    evidenceVersions: records.map((r) => ({
      key: r.key,
      registrationId: r.registrationId,
      mappingVersion: r.mappingVersion,
    })),
  };
  pointBounds(entity.x, entity.y);
  if (
    !entity.title.trim() ||
    entity.title.length > 200 ||
    !entity.category.trim() ||
    entity.category.length > 200
  )
    throw new Error("Authored title/category must be1 to200 characters.");
  if (entity.notes.length > 4000)
    throw new Error("Review notes exceed4000 characters.");
  append(
    state,
    previous ? "reconfirm" : "accept",
    previous ? [previous] : [],
    [entity],
    choices.reviewer,
    records,
  );
  return entity;
}
export function withdrawEntity(state: Workspace, id: string, reviewer: string) {
  const e = state.entities.find((e) => e.id === id);
  if (!e) throw new Error("Entity not found.");
  append(
    state,
    "withdraw",
    [e],
    [{ ...e, acceptance: "withdrawn" }],
    reviewer,
    [],
  );
}
export function splitEntity(
  state: Workspace,
  id: string,
  records: PlacedRecord[],
  reviewer: string,
) {
  const entity = state.entities.find((e) => e.id === id);
  if (!entity || entity.refs.length < 2)
    throw new Error("Select a merged entity with multiple evidence records.");
  const originals = entity.refs.map((key) => {
    const r = records.find((p) => p.key === key);
    if (!r) throw new Error("Restore missing evidence before splitting.");
    return r;
  });
  if (state.entities.length + originals.length > 5000)
    throw new Error("Reviewed entity limit reached.");
  const parts = originals.map((r) => ({
    ...structuredClone(entity),
    id: crypto.randomUUID(),
    title: r.title,
    category: r.category,
    x: r.x,
    y: r.y,
    applicability: r.applicability,
    refs: [r.key],
    choices: { title: r.key, position: r.key, category: r.key },
    evidenceVersions: [
      {
        key: r.key,
        registrationId: r.registrationId,
        mappingVersion: r.mappingVersion,
      },
    ],
    reviewedHeads: entity.reviewedHeads.filter(
      (h) => h.sourceId === r.sourceId,
    ),
    lineages: [...r.lineages],
    independentLineages: r.lineages.length || null,
    freshness: (entity.freshness === "stale" || evidenceChanged(state, entity)
      ? "stale"
      : "current") as CanonicalEntity["freshness"],
    authoredEvidence: null,
    authoredDeclaration: null,
  }));
  append(
    state,
    "split",
    [entity],
    [{ ...entity, acceptance: "withdrawn" }, ...parts],
    reviewer,
    originals,
  );
}
export function undoReview(state: Workspace, reviewer: string) {
  const last = state.decisions.at(-1);
  if (last?.redacted)
    throw new Error("Restore omitted evidence before undoing this decision.");
  if (!last) throw new Error("No review decision to undo.");
  const before = last.after
    .map((e) => state.entities.find((x) => x.id === e.id))
    .filter((e): e is CanonicalEntity => !!e);
  const after = [
    ...structuredClone(last.before),
    ...last.after
      .filter((e) => !last.before.some((x) => x.id === e.id))
      .map((e) => ({ ...e, acceptance: "withdrawn" as const })),
  ];
  for (const e of after)
    if (e.acceptance === "accepted" && evidenceChanged(state, e))
      e.freshness = "stale";
  append(state, "undo", before, after, reviewer, []);
}
