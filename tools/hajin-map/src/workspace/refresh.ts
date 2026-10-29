import type { Workspace, SnapshotEntry, CanonicalEntity } from "./model.ts";
import { snapshotKey, recordKey } from "./model.ts";
import type { SourceSnapshot } from "./types.ts";
import type { Registration } from "./registration.ts";
import { validateSnapshotCollection } from "./validation.ts";
export function refreshPreview(state: Workspace, next: SourceSnapshot) {
  const old = state.snapshots
    .filter((e) => e.snapshot.sourceId === next.sourceId)
    .at(-1)?.snapshot;
  const previous = new Map(old?.records.map((r) => [r.id, r]) ?? []),
    current = new Map(next.records.map((r) => [r.id, r]));
  const added = next.records
      .filter((r) => !previous.has(r.id))
      .map((r) => r.id),
    changed = next.records
      .filter(
        (r) =>
          previous.has(r.id) &&
          JSON.stringify(previous.get(r.id)) !== JSON.stringify(r),
      )
      .map((r) => r.id),
    missing = [...previous.keys()].filter((id) => !current.has(id));
  const frameChanged =
      !!old && JSON.stringify(old.frame) !== JSON.stringify(next.frame),
    categoryChanged =
      !!old &&
      JSON.stringify(old.categories) !== JSON.stringify(next.categories);
  const affectedRefs = new Set<string>();
  for (const entry of state.snapshots.filter(
    (e) => e.snapshot.sourceId === next.sourceId,
  )) {
    const metadataChanged =
      JSON.stringify(entry.snapshot.frame) !== JSON.stringify(next.frame) ||
      JSON.stringify(entry.snapshot.categories) !==
        JSON.stringify(next.categories);
    for (const record of entry.snapshot.records)
      if (
        metadataChanged ||
        !current.has(record.id) ||
        JSON.stringify(current.get(record.id)) !== JSON.stringify(record)
      )
        affectedRefs.add(
          recordKey(next.sourceId, entry.snapshot.snapshotId, record.id),
        );
  }
  const affectedEntities = state.entities
    .filter((e) =>
      e.reviewedHeads
        ? evidenceChanged(state, e, next)
        : e.refs.some((ref) => affectedRefs.has(ref)),
    )
    .map((e) => e.id);
  return {
    added,
    changed,
    missing,
    affectedEntities,
    frameChanged,
    categoryChanged,
  };
}
export function applySnapshot(
  state: Workspace,
  snapshot: SourceSnapshot,
  digest: string,
  registration: Registration | null,
  legacy = false,
): SnapshotEntry {
  const key = snapshotKey(snapshot.sourceId, snapshot.snapshotId);
  if (state.snapshots.some((e) => e.key === key))
    throw new Error(
      "Snapshot identity already exists. Use a new immutable snapshot ID.",
    );
  validateSnapshotCollection([
    ...state.snapshots.map((e) => e.snapshot),
    snapshot,
  ]);
  if (!/^[a-f0-9]{64}$/.test(digest))
    throw new Error("Invalid snapshot digest.");
  const diff = refreshPreview(state, snapshot);
  const mapping = Object.fromEntries(
    snapshot.categories.map((c) => [c.id, c.path.at(-1)!]),
  );
  const entry: SnapshotEntry = {
    key,
    snapshot: structuredClone(snapshot),
    digest,
    registrationId: registration?.id ?? null,
    mapping,
    mappingVersion: 1,
    legacy,
  };
  state.snapshots.push(entry);
  if (
    registration &&
    !state.registrations.some((r) => r.id === registration.id)
  )
    state.registrations.push(structuredClone(registration));
  state.entities.forEach((e) => {
    if (diff.affectedEntities.includes(e.id)) e.freshness = "stale";
  });
  for (const category of snapshot.categories)
    if (
      !Object.hasOwn(
        state.visibility.categoryMask[snapshot.sourceId] ?? {},
        category.id,
      )
    ) {
      state.visibility.categoryMask[snapshot.sourceId] ??= {};
      state.visibility.categoryMask[snapshot.sourceId][category.id] = true;
    }
  return entry;
}

/** Freshness tracks what the reviewer actually saw, not just the raw snapshot they selected. */
export function evidenceChanged(
  state: Workspace,
  entity: CanonicalEntity,
  incoming?: SourceSnapshot,
): boolean {
  for (const version of entity.evidenceVersions ?? []) {
    let parts: string[];
    try {
      parts = JSON.parse(version.key);
    } catch {
      return true;
    }
    const entry = state.snapshots.find(
      (s) =>
        s.snapshot.sourceId === parts[0] && s.snapshot.snapshotId === parts[1],
    );
    if (
      !entry ||
      entry.registrationId !== version.registrationId ||
      entry.mappingVersion !== version.mappingVersion
    )
      return true;
  }
  for (const head of entity.reviewedHeads ?? []) {
    if (incoming && incoming.sourceId !== head.sourceId) continue;
    const baseline = state.snapshots.find(
      (s) =>
        s.snapshot.sourceId === head.sourceId &&
        s.snapshot.snapshotId === head.snapshotId,
    )?.snapshot;
    const latest =
      incoming ??
      state.snapshots
        .filter((s) => s.snapshot.sourceId === head.sourceId)
        .at(-1)?.snapshot;
    if (!baseline || !latest) return true;
    if (
      JSON.stringify(baseline.frame) !== JSON.stringify(latest.frame) ||
      JSON.stringify(baseline.categories) !== JSON.stringify(latest.categories)
    )
      return true;
    for (const ref of entity.refs) {
      let key: string[];
      try {
        key = JSON.parse(ref);
      } catch {
        return true;
      }
      if (key[0] !== head.sourceId) continue;
      const old = baseline.records.find((r) => r.id === key[2]),
        next = latest.records.find((r) => r.id === key[2]);
      if (JSON.stringify(old) !== JSON.stringify(next)) return true;
    }
  }
  return false;
}
