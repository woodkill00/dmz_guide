import type {
  Workspace,
  CanonicalEntity,
  MissingDependency,
  PlacedRecord,
} from "./model.ts";
import { recordKey, snapshotKey } from "./model.ts";
import { annotationValid, pointBounds } from "./annotations.ts";
import {
  LIMITS,
  parseSnapshot,
  validateJsonTree,
  validateSnapshotCollection,
  utf8Bytes,
  validateCoordinateFrame,
} from "./validation.ts";
import { sourcePolicies } from "./policy.ts";
import { validateStoredIcon, verifyIcon } from "./icons.ts";
import {
  registerFrame,
  registrationMatches,
  transformPoint,
} from "./registration.ts";
import { validateMapping, categoryName } from "./taxonomy.ts";
import { validateUsability, parseIdentity } from "./usability.ts";
export interface PrivateBackup {
  schemaVersion: 1;
  kind: "dmz-private-map-workspace";
  workspace: Workspace;
}
export async function estimateRestoreStorage(bytes: number) {
  if (!Number.isSafeInteger(bytes) || bytes < 0)
    throw new Error("Invalid restore size.");
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    if (!globalThis.navigator?.storage?.estimate)
      return { bytes, available: null };
    const estimate = await Promise.race([
      navigator.storage.estimate(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("Storage estimate unavailable.")),
          1500,
        );
      }),
    ]);
    return {
      bytes,
      available:
        typeof estimate.quota === "number" && typeof estimate.usage === "number"
          ? Math.max(0, estimate.quota - estimate.usage)
          : null,
    };
  } catch {
    return { bytes, available: null };
  } finally {
    clearTimeout(timer);
  }
}
function assert(ok: unknown, message: string): asserts ok {
  if (!ok) throw new Error(message);
}
function fields(
  value: unknown,
  keys: string[],
  label: string,
): asserts value is Record<string, unknown> {
  assert(
    !!value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      Object.keys(value).length === keys.length &&
      keys.every((k) => Object.hasOwn(value, k)),
    `Invalid ${label} fields.`,
  );
}
const text = (s: unknown, max = 4000) =>
  typeof s === "string" && s.length <= max;
const id = (s: unknown) =>
  text(s, 128) &&
  !!(s as string).trim() &&
  !["__proto__", "constructor", "prototype"].includes(s as string);
const date = (s: unknown) =>
  typeof s === "string" && s.length <= 40 && Number.isFinite(Date.parse(s));
const unique = (values: string[], label: string) =>
  assert(
    new Set(values).size === values.length,
    `Duplicate ${label} identity.`,
  );
function array(
  value: unknown,
  max: number,
  label: string,
): asserts value is unknown[] {
  assert(
    Array.isArray(value) && value.length <= max,
    `Invalid ${label} count.`,
  );
}
function entityValid(e: CanonicalEntity) {
  fields(
    e,
    [
      "id",
      "title",
      "category",
      "x",
      "y",
      "applicability",
      "refs",
      "choices",
      "acceptance",
      "freshness",
      "lineages",
      "independentLineages",
      "decisionId",
      "notes",
      "authoredEvidence",
      "authoredDeclaration",
      "reviewedHeads",
      "evidenceVersions",
    ],
    "reviewed entity",
  );
  pointBounds(e.x, e.y);
  assert(
    id(e.id) &&
      text(e.title, 200) &&
      e.title.trim() &&
      text(e.category, 200) &&
      e.category.trim() &&
      text(e.notes) &&
      ["pending", "accepted", "withdrawn"].includes(e.acceptance) &&
      ["current", "stale"].includes(e.freshness) &&
      id(e.decisionId),
    "Invalid reviewed entity.",
  );
  fields(
    e.applicability,
    ["mapId", "coordinateVersion", "gameBuild", "floor"],
    "applicability",
  );
  assert(
    e.applicability.mapId === "hajin" &&
      e.applicability.coordinateVersion === "hajin-official-v1-4096" &&
      [e.applicability.floor, e.applicability.gameBuild].every(
        (v) => v === null || id(v),
      ),
    "Invalid reviewed applicability.",
  );
  array(e.refs, 32, "entity references");
  assert(
    e.refs.length > 0 && e.refs.every((r) => text(r, 512)),
    "Invalid evidence reference.",
  );
  unique(e.refs, "entity reference");
  fields(e.choices, ["title", "position", "category"], "field choices");
  assert(
    Object.values(e.choices).every(
      (r) => typeof r === "string" && (r === "authored" || e.refs.includes(r)),
    ),
    "Selected field missing its evidence.",
  );
  array(e.reviewedHeads, 4, "reviewed heads");
  array(e.evidenceVersions, 32, "evidence versions");
  for (const h of e.reviewedHeads) {
    fields(h, ["sourceId", "snapshotId"], "reviewed head");
    assert(
      Object.hasOwn(sourcePolicies, h.sourceId) && id(h.snapshotId),
      "Invalid reviewed head.",
    );
  }
  for (const v of e.evidenceVersions) {
    fields(v, ["key", "registrationId", "mappingVersion"], "evidence version");
    assert(
      e.refs.includes(v.key) &&
        id(v.registrationId) &&
        Number.isSafeInteger(v.mappingVersion) &&
        v.mappingVersion >= 1,
      "Invalid evidence version.",
    );
  }
  unique(
    e.evidenceVersions.map((v) => v.key),
    "evidence version",
  );
  const authored = Object.values(e.choices).includes("authored");
  assert(
    authored
      ? text(e.authoredEvidence) &&
          !!e.authoredEvidence?.trim() &&
          text(e.authoredDeclaration) &&
          !!e.authoredDeclaration?.trim()
      : e.authoredEvidence === null && e.authoredDeclaration === null,
    "Invalid authored field declaration.",
  );
  array(e.lineages, 1024, "upstream lineages");
  assert(
    e.lineages.every((l) => id(l)) &&
      (e.independentLineages === null ||
        (Number.isInteger(e.independentLineages) &&
          e.independentLineages === new Set(e.lineages).size)) &&
      (e.authoredEvidence === null || text(e.authoredEvidence)),
    "Invalid lineage/evidence.",
  );
}
export function validateWorkspace(value: unknown): asserts value is Workspace {
  validateJsonTree(value);
  fields(
    value,
    [
      "schemaVersion",
      "snapshots",
      "registrations",
      "basemaps",
      "annotations",
      "icons",
      "categoryIcons",
      "entities",
      "decisions",
      "ownedCorrections",
      "visibility",
      "migrations",
      "omittedDependencies",
      ...(value &&
      typeof value === "object" &&
      Object.hasOwn(value, "usability")
        ? ["usability"]
        : []),
    ],
    "workspace",
  );
  const s = value as unknown as Workspace;
  if (s.usability !== undefined) validateUsability(s.usability);
  assert(s.schemaVersion === 1, "Unsupported workspace version.");
  array(s.snapshots, 20, "snapshot");
  array(s.registrations, 40, "registration");
  array(s.basemaps, 3, "background");
  array(s.annotations, 5000, "annotation");
  array(s.icons, 32, "icon");
  array(s.categoryIcons, 100, "category icon");
  array(s.entities, 5000, "entity");
  array(s.decisions, 20000, "decision");
  array(s.ownedCorrections, 5000, "owned correction");
  array(s.migrations, 100, "migration");
  array(s.omittedDependencies, 20000, "omitted dependency");
  for (const entry of s.snapshots) {
    fields(
      entry,
      [
        "key",
        "snapshot",
        "digest",
        "registrationId",
        "mapping",
        "mappingVersion",
        "legacy",
      ],
      "snapshot entry",
    );
    assert(
      Object.hasOwn(sourcePolicies, entry.snapshot?.sourceId),
      "Unknown snapshot provider.",
    );
    parseSnapshot(JSON.stringify(entry.snapshot), entry.snapshot.sourceId);
    assert(
      entry.key ===
        snapshotKey(entry.snapshot.sourceId, entry.snapshot.snapshotId) &&
        /^[a-f0-9]{64}$/.test(entry.digest) &&
        typeof entry.legacy === "boolean" &&
        Number.isSafeInteger(entry.mappingVersion) &&
        entry.mappingVersion >= 1,
      "Invalid snapshot metadata.",
    );
    validateMapping(entry.mapping);
  }
  unique(
    s.snapshots.map((e) => e.key),
    "snapshot",
  );
  validateSnapshotCollection(s.snapshots.map((e) => e.snapshot));
  unique(
    s.registrations.map((r) => r.id),
    "registration",
  );
  for (const r of s.registrations) {
    fields(
      r,
      [
        "id",
        "frameId",
        "imageDigest",
        "frameSignature",
        "transform",
        "fit",
        "holdout",
        "rms",
        "maxError",
        "reviewer",
        "reviewedAt",
        "declaredAxes",
        "canonicalVersion",
      ],
      "registration",
    );
    assert(
      id(r.id) && date(r.reviewedAt) && typeof r.declaredAxes === "boolean",
      "Invalid registration metadata.",
    );
    const frame =
      s.snapshots.find(
        (e) =>
          e.snapshot.frame.id === r.frameId &&
          registrationMatches(e.snapshot.frame, r),
      )?.snapshot.frame ??
      s.basemaps.find(
        (b) => b.frame.id === r.frameId && registrationMatches(b.frame, r),
      )?.frame;
    assert(frame, "Registration frame is missing or changed.");
    const recalculated = registerFrame(
      frame,
      r.fit,
      r.holdout,
      r.reviewer,
      r.declaredAxes,
    );
    assert(
      Array.isArray(r.transform) &&
        r.transform.length === 6 &&
        r.transform.every(
          (n, i) =>
            Number.isFinite(n) &&
            Math.abs(n - recalculated.transform[i]) < 1e-7,
        ) &&
        Math.abs(r.rms - recalculated.rms) < 1e-7 &&
        Math.abs(r.maxError - recalculated.maxError) < 1e-7,
      "Registration transform or residual mismatch.",
    );
  }
  for (const entry of s.snapshots)
    if (entry.registrationId !== null) {
      const registration = s.registrations.find(
        (r) =>
          r.id === entry.registrationId &&
          registrationMatches(entry.snapshot.frame, r),
      );
      assert(registration, "Snapshot registration missing.");
      for (const record of entry.snapshot.records)
        transformPoint(record.rawGeometry, registration);
    }
  for (const b of s.basemaps) {
    fields(
      b,
      [
        "id",
        "sourceId",
        "frame",
        "description",
        "registrationId",
        "rightsDeclaration",
        "capturedAt",
      ],
      "background",
    );
    validateCoordinateFrame(b.frame);
    assert(
      text(b.rightsDeclaration) &&
        b.rightsDeclaration.trim() &&
        date(b.capturedAt) &&
        /^[a-f0-9]{64}$/.test(b.id) &&
        (b.sourceId === "owned" || Object.hasOwn(sourcePolicies, b.sourceId)) &&
        b.frame?.imageDigest === b.id &&
        text(b.description, 200) &&
        b.description.trim(),
      "Invalid background metadata.",
    );
    if (b.registrationId !== null)
      assert(
        s.registrations.some(
          (r) => r.id === b.registrationId && registrationMatches(b.frame, r),
        ),
        "Background registration missing.",
      );
  }
  unique(
    s.basemaps.map((b) => b.id),
    "background",
  );
  for (const a of s.annotations) {
    fields(
      a,
      [
        "id",
        "kind",
        "title",
        "category",
        "x",
        "y",
        "notes",
        "evidence",
        "verificationState",
        "applicability",
        "iconId",
        "ownership",
        "createdAt",
        "updatedAt",
      ],
      "annotation",
    );
    fields(
      a.applicability,
      ["mapId", "coordinateVersion", "gameBuild", "floor"],
      "annotation applicability",
    );
    annotationValid(a);
    assert(date(a.createdAt) && date(a.updatedAt), "Invalid annotation dates.");
  }
  unique(
    s.annotations.map((a) => a.id),
    "annotation",
  );
  unique(
    s.icons.map((i) => i.id),
    "icon",
  );
  let totalBytes = 0;
  for (const icon of s.icons) {
    fields(
      icon,
      ["id", "base64", "width", "height", "description", "rightsDeclaration"],
      "icon",
    );
    totalBytes += validateStoredIcon(icon).length;
  }
  assert(totalBytes <= 8 * 1024 * 1024, "Icon byte limit exceeded.");
  const iconIds = new Set(s.icons.map((i) => i.id));
  for (const a of s.annotations)
    assert(
      a.iconId === null || iconIds.has(a.iconId),
      "Annotation references missing icon.",
    );
  for (const c of s.categoryIcons) {
    fields(c, ["category", "iconId"], "category icon");
    assert(
      text(c.category, 200) && c.category.trim() && iconIds.has(c.iconId),
      "Category icon reference missing.",
    );
  }
  unique(
    s.categoryIcons.map((c) => c.category),
    "category icon",
  );
  const refs = new Set(
    s.snapshots.flatMap((e) =>
      e.snapshot.records.map((r) =>
        recordKey(e.snapshot.sourceId, e.snapshot.snapshotId, r.id),
      ),
    ),
  );
  unique(
    s.entities.map((e) => e.id),
    "entity",
  );
  for (const e of s.entities) {
    entityValid(e);
    assert(
      e.refs.every((r) => refs.has(r)) || e.acceptance === "pending",
      "Reviewed evidence dependency is missing.",
    );
  }
  unique(
    s.decisions.map((d) => d.id),
    "decision",
  );
  let parent: string | null = null;
  for (const d of s.decisions) {
    fields(
      d,
      [
        "id",
        "parentId",
        "action",
        "before",
        "after",
        "reviewer",
        "at",
        "refs",
        "registrationIds",
        "mappingVersions",
        "redacted",
      ],
      "decision",
    );
    assert(
      typeof d.redacted === "boolean" &&
        (!d.redacted || (d.before.length === 0 && d.after.length === 0)) &&
        id(d.id) &&
        d.parentId === parent &&
        ["accept", "split", "undo", "withdraw", "reconfirm"].includes(
          d.action,
        ) &&
        text(d.reviewer, 200) &&
        d.reviewer.trim() &&
        date(d.at),
      "Invalid decision ancestry.",
    );
    array(d.before, 33, "decision before");
    array(d.after, 33, "decision after");
    d.before.forEach(entityValid);
    d.after.forEach(entityValid);
    assert(
      Array.isArray(d.refs) &&
        d.refs.length <= 32 &&
        d.refs.every((r) => text(r, 512)) &&
        Array.isArray(d.registrationIds) &&
        d.registrationIds.length <= 32 &&
        d.registrationIds.every((r) => id(r)) &&
        Array.isArray(d.mappingVersions) &&
        d.mappingVersions.length <= 32 &&
        d.mappingVersions.every((n) => Number.isInteger(n) && n >= 1),
      "Invalid decision evidence.",
    );
    parent = d.id;
  }
  for (const c of s.ownedCorrections) {
    fields(
      c,
      ["entityId", "title", "category", "position", "evidence", "declaration"],
      "owned correction",
    );
    assert(
      id(c.entityId) &&
        (c.title === null || (text(c.title, 200) && c.title.trim())) &&
        (c.category === null || (text(c.category, 200) && c.category.trim())) &&
        text(c.evidence) &&
        c.evidence.trim() &&
        text(c.declaration) &&
        c.declaration.trim(),
      "Invalid owned correction.",
    );
    if (c.position !== null) {
      fields(c.position, ["x", "y", "applicability"], "authored position");
      pointBounds(c.position.x, c.position.y);
      fields(
        c.position.applicability,
        ["mapId", "coordinateVersion", "gameBuild", "floor"],
        "authored applicability",
      );
      assert(
        c.position.applicability.mapId === "hajin" &&
          c.position.applicability.coordinateVersion ===
            "hajin-official-v1-4096" &&
          [
            c.position.applicability.floor,
            c.position.applicability.gameBuild,
          ].every((v) => v === null || id(v)),
        "Invalid authored applicability.",
      );
    }
  }
  unique(
    s.ownedCorrections.map((c) => c.entityId),
    "owned correction",
  );
  const decisions = new Set(s.decisions.map((d) => d.id));
  for (const e of s.entities)
    assert(decisions.has(e.decisionId), "Entity decision missing.");
  fields(
    s.visibility,
    [
      "sourceEnabled",
      "categoryMask",
      "curatedEnabled",
      "customEnabled",
      "query",
    ],
    "visibility",
  );
  assert(
    typeof s.visibility.curatedEnabled === "boolean" &&
      typeof s.visibility.customEnabled === "boolean" &&
      text(s.visibility.query, 200),
    "Invalid visibility.",
  );
  assert(
    s.visibility.sourceEnabled &&
      s.visibility.categoryMask &&
      typeof s.visibility.sourceEnabled === "object" &&
      typeof s.visibility.categoryMask === "object",
    "Invalid source masks.",
  );
  for (const [source, enabled] of Object.entries(s.visibility.sourceEnabled))
    assert(
      Object.hasOwn(sourcePolicies, source) && typeof enabled === "boolean",
      "Unknown source mask.",
    );
  for (const [source, mask] of Object.entries(s.visibility.categoryMask)) {
    assert(
      Object.hasOwn(sourcePolicies, source) &&
        mask &&
        !Array.isArray(mask) &&
        typeof mask === "object" &&
        Object.keys(mask).length <= 100,
      "Invalid category mask.",
    );
    for (const [category, enabled] of Object.entries(mask))
      assert(
        id(category) && typeof enabled === "boolean",
        "Invalid category state.",
      );
  }
  assert(
    s.migrations.every((m) => id(m)),
    "Invalid migration marker.",
  );
  for (const dependency of s.omittedDependencies) {
    fields(
      dependency,
      ["kind", "id", "digest", "reason"],
      "omitted dependency",
    );
    assert(
      ["snapshot", "basemap", "curation"].includes(dependency.kind) &&
        text(dependency.id, 512) &&
        (dependency.digest === null ||
          /^[a-f0-9]{64}$/.test(dependency.digest)) &&
        text(dependency.reason, 4000),
      "Invalid omitted dependency.",
    );
  }
}
/** Conservative transitive policy: unknown/restricted derived content is omitted in full. */
export function exportPrivateBackup(input: Workspace): PrivateBackup {
  validateWorkspace(input);
  const workspace = structuredClone(input),
    omitted: MissingDependency[] = [...workspace.omittedDependencies];
  const restricted = workspace.snapshots.filter(
    (e) => !sourcePolicies[e.snapshot.sourceId].privateExport,
  );
  for (const entry of restricted)
    omitted.push({
      kind: "snapshot",
      id: entry.key,
      digest: entry.digest,
      reason: "Source private-export permission is not established.",
    });
  workspace.snapshots = workspace.snapshots.filter(
    (e) => sourcePolicies[e.snapshot.sourceId].privateExport,
  );
  const allowedRefs = new Set(
    workspace.snapshots.flatMap((e) =>
      e.snapshot.records.map((r) =>
        recordKey(e.snapshot.sourceId, e.snapshot.snapshotId, r.id),
      ),
    ),
  );
  const restrictedEntities = new Set(
    workspace.entities
      .filter((e) => !e.refs.every((r) => allowedRefs.has(r)))
      .map((e) => e.id),
  );
  for (const e of workspace.entities)
    if (
      restrictedEntities.has(e.id) &&
      Object.values(e.choices).includes("authored")
    ) {
      const correction = {
        entityId: e.id,
        title: e.choices.title === "authored" ? e.title : null,
        category: e.choices.category === "authored" ? e.category : null,
        position:
          e.choices.position === "authored"
            ? { x: e.x, y: e.y, applicability: e.applicability }
            : null,
        evidence: e.authoredEvidence!,
        declaration: e.authoredDeclaration!,
      };
      const old = workspace.ownedCorrections.findIndex(
        (c) => c.entityId === e.id,
      );
      if (old < 0) workspace.ownedCorrections.push(correction);
      else workspace.ownedCorrections[old] = correction;
    }
  for (const e of workspace.entities)
    if (restrictedEntities.has(e.id))
      omitted.push({
        kind: "curation",
        id: e.id,
        digest: null,
        reason:
          "Derived source fields/history require omitted source evidence and fresh review.",
      });
  // Do not retain copied title/coordinates/notes/history disguised as metadata.
  workspace.entities = workspace.entities.filter(
    (e) => !restrictedEntities.has(e.id),
  );
  for (const d of workspace.decisions)
    if (
      d.redacted ||
      [...d.before, ...d.after].some(
        (e) => !e.refs.every((r) => allowedRefs.has(r)),
      )
    ) {
      d.before = [];
      d.after = [];
      d.redacted = true;
    }
  workspace.entities = workspace.entities.filter(
    (e) => !workspace.decisions.find((d) => d.id === e.decisionId)?.redacted,
  );
  for (const b of workspace.basemaps)
    omitted.push({
      kind: "basemap",
      id: b.id,
      digest: b.id,
      reason:
        "Background bytes are restored separately from an authorized local file.",
    });
  // Keep background frame/calibration metadata; pixels remain explicit external dependencies.
  const frameIds = new Set([
    ...workspace.snapshots.map((e) => e.snapshot.frame.id),
    ...workspace.basemaps.map((b) => b.frame.id),
  ]);
  workspace.registrations = workspace.registrations.filter((r) =>
    frameIds.has(r.frameId),
  );
  if (workspace.usability) {
    const identities = new Set([
      ...workspace.usability.separate.flatMap((p) => [p.a, p.b]),
      ...workspace.usability.flags.map((f) => f.recordIdentity),
    ]);
    for (const identity of identities) {
      const [source, snapshot, digest] = parseIdentity(identity),
        key = snapshotKey(source, snapshot);
      if (
        workspace.snapshots.some((e) => e.key === key && e.digest === digest) ||
        omitted.some(
          (d) => d.kind === "snapshot" && d.id === key && d.digest === digest,
        )
      )
        continue;
      omitted.push({
        kind: "snapshot",
        id: JSON.stringify([source, snapshot, digest]),
        digest,
        reason:
          "Referenced source capture is external or restricted. Private flags and separate decisions remain inactive until the exact capture is available.",
      });
    }
  }
  workspace.omittedDependencies = [
    ...new Map(
      omitted.map((d) => [JSON.stringify([d.kind, d.id, d.digest]), d]),
    ).values(),
  ];
  if (workspace.omittedDependencies.length > 20000)
    throw new Error(
      "Backup dependency manifest limit reached. Export the current workspace and start another.",
    );
  if (workspace.ownedCorrections.length > 5000)
    throw new Error(
      "Owned correction limit reached. Export the current workspace and start another.",
    );
  validateWorkspace(workspace);
  const backup: PrivateBackup = {
    schemaVersion: 1,
    kind: "dmz-private-map-workspace",
    workspace,
  };
  if (utf8Bytes(JSON.stringify(backup)) > LIMITS.backupBytes)
    throw new Error(
      "Private backup exceeds20MiB. Export/prune or use another workspace.",
    );
  return backup;
}
export function parsePrivateBackup(json: string): Workspace {
  if (json.length > LIMITS.backupBytes || utf8Bytes(json) > LIMITS.backupBytes)
    throw new Error("Backup exceeds20MiB.");
  const parsed: unknown = JSON.parse(json);
  validateJsonTree(parsed);
  fields(parsed, ["schemaVersion", "kind", "workspace"], "backup");
  assert(
    parsed.schemaVersion === 1 && parsed.kind === "dmz-private-map-workspace",
    "Unsupported private backup.",
  );
  validateWorkspace(parsed.workspace);
  // Trusted policy, rather than file claims, decides what can enter the restored state.
  const projected = exportPrivateBackup(parsed.workspace).workspace;
  validateWorkspace(projected);
  return projected;
}
export async function verifyBackupAssets(
  state: Workspace,
  signal?: AbortSignal,
) {
  const deadline = performance.now() + 15000;
  for (const icon of state.icons) {
    if (performance.now() > deadline)
      throw new Error("Backup image validation timed out.");
    await verifyIcon(icon, signal);
  }
}
export function placedRecords(
  state: Workspace,
  selected?: Map<string, string>,
): PlacedRecord[] {
  const latest = new Map<string, string>();
  for (const entry of state.snapshots)
    latest.set(entry.snapshot.sourceId, entry.key);
  const output: PlacedRecord[] = [];
  for (const entry of state.snapshots) {
    if (
      selected &&
      (selected.get(entry.snapshot.sourceId) ??
        latest.get(entry.snapshot.sourceId)) !== entry.key
    )
      continue;
    const registration = state.registrations.find(
      (r) => r.id === entry.registrationId,
    );
    if (!registrationMatches(entry.snapshot.frame, registration)) continue;
    for (const r of entry.snapshot.records) {
      try {
        const p = transformPoint(r.rawGeometry, registration);
        output.push({
          key: recordKey(
            entry.snapshot.sourceId,
            entry.snapshot.snapshotId,
            r.id,
          ),
          sourceId: entry.snapshot.sourceId,
          snapshotId: entry.snapshot.snapshotId,
          recordId: r.id,
          title: r.title,
          category: categoryName(r.categoryId, entry.mapping),
          ...p,
          applicability: {
            ...r.applicability,
            coordinateVersion: "hajin-official-v1-4096",
          },
          lineages: r.upstreamRefs,
          registrationId: registration.id,
          mappingVersion: entry.mappingVersion,
          activity:
            r.activityClaim.state === "observed-active"
              ? `observed-active at ${r.activityClaim.observedAt} (not live)`
              : r.activityClaim.state,
        });
      } catch {
        /* Out-of-bounds records remain available for staging review. */
      }
    }
  }
  return output;
}
