import type {
  Applicability,
  CoordinateFrame,
  SourceRecord,
  SourceSnapshot,
} from "./types.ts";

export const LIMITS = Object.freeze({
  snapshotBytes: 2 * 1024 * 1024,
  backupBytes: 20 * 1024 * 1024,
  sources: 4,
  categories: 100,
  recordsPerSource: 5000,
  recordsTotal: 20000,
  annotations: 5000,
  canonical: 5000,
  snapshots: 20,
  decisions: 20000,
  depth: 16,
  nodes: 200000,
  objectKeys: 128,
  arrayItems: 20000,
  id: 128,
  title: 200,
  notes: 4000,
});
const dangerous = new Set(["__proto__", "prototype", "constructor"]);
type ObjectValue = Record<string, unknown>;
function fail(message: string): never {
  throw new Error(message);
}
export function utf8Bytes(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

/** Reject non-JSON values, prototype surprises, cycles and excessive resource use. */
export function validateJsonTree(value: unknown): void {
  let nodes = 0;
  const seen = new Set<object>();
  function walk(item: unknown, depth: number): void {
    if (depth > LIMITS.depth) fail("JSON depth limit exceeded.");
    if (++nodes > LIMITS.nodes) fail("JSON node limit exceeded.");
    if (item === null || typeof item === "boolean") return;
    if (typeof item === "string") {
      if (item.length > LIMITS.backupBytes) fail("JSON string too long.");
      return;
    }
    if (typeof item === "number") {
      if (!Number.isFinite(item)) fail("Nonfinite number.");
      return;
    }
    if (typeof item !== "object") fail("Expected inert JSON.");
    if (seen.has(item)) fail("Cyclic JSON.");
    seen.add(item);
    if (Array.isArray(item)) {
      if (Object.getPrototypeOf(item) !== Array.prototype)
        fail("Unexpected array prototype.");
      if (item.length > LIMITS.arrayItems) fail("Array item limit exceeded.");
      if (
        Reflect.ownKeys(item).some(
          (key) =>
            typeof key !== "string" ||
            (key !== "length" &&
              (!/^(0|[1-9]\d*)$/.test(key) || Number(key) >= item.length)),
        )
      )
        fail("Unexpected array property.");
      // Holes and accessor properties are not JSON, even if stringify would silently replace them.
      for (let i = 0; i < item.length; i++) {
        const descriptor = Object.getOwnPropertyDescriptor(item, String(i));
        if (!descriptor || !("value" in descriptor))
          fail("Invalid array entry.");
        walk(descriptor.value, depth + 1);
      }
    } else {
      if (
        Object.getPrototypeOf(item) !== Object.prototype &&
        Object.getPrototypeOf(item) !== null
      )
        fail("Expected plain JSON object.");
      const keys = Reflect.ownKeys(item);
      if (keys.length > LIMITS.objectKeys) fail("Object key limit exceeded.");
      for (const key of keys) {
        if (typeof key !== "string" || dangerous.has(key))
          fail("Unsafe JSON key.");
        const descriptor = Object.getOwnPropertyDescriptor(item, key)!;
        if (!("value" in descriptor)) fail("JSON accessor is not allowed.");
        walk(descriptor.value, depth + 1);
      }
    }
    seen.delete(item);
  }
  walk(value, 0);
}
function object(value: unknown, keys: string[]): ObjectValue {
  if (!value || typeof value !== "object" || Array.isArray(value))
    fail("Expected object.");
  const result = value as ObjectValue;
  if (
    Object.keys(result).length !== keys.length ||
    keys.some((key) => !Object.hasOwn(result, key))
  )
    fail("Unexpected or missing fields.");
  return result;
}
function text(value: unknown, max: number, empty = false): string {
  if (
    typeof value !== "string" ||
    value.length > max ||
    (!empty && !value.trim()) ||
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)
  )
    fail("Invalid text.");
  return value;
}
function id(value: unknown): string {
  const result = text(value, LIMITS.id);
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(result) || dangerous.has(result))
    fail("Invalid identifier.");
  return result;
}
function nullableId(value: unknown): string | null {
  return value === null ? null : id(value);
}
function finite(value: unknown, min: number, max: number): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < min ||
    value > max
  )
    fail("Invalid coordinate or dimension.");
  return value;
}
function array(value: unknown, max: number): unknown[] {
  if (!Array.isArray(value) || value.length > max) fail("Invalid array size.");
  return value;
}
function timestamp(value: unknown): string {
  const result = text(value, 40);
  if (
    !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(result) ||
    !Number.isFinite(Date.parse(result))
  )
    fail("Invalid UTC timestamp.");
  // Date.parse normalizes impossible dates such as February 30.
  if (new Date(result).toISOString().slice(0, 19) !== result.slice(0, 19))
    fail("Invalid UTC date.");
  return result;
}
function oneOf<T extends string>(value: unknown, choices: readonly T[]): T {
  if (typeof value !== "string" || !choices.includes(value as T))
    fail("Unsupported enum value.");
  return value as T;
}
function applicability(value: unknown): Applicability {
  const v = object(value, ["mapId", "coordinateVersion", "gameBuild", "floor"]);
  return {
    mapId: id(v.mapId),
    coordinateVersion: id(v.coordinateVersion),
    gameBuild: nullableId(v.gameBuild),
    floor: nullableId(v.floor),
  };
}
function frame(value: unknown): CoordinateFrame {
  const v = object(value, [
    "id",
    "mapId",
    "coordinateVersion",
    "width",
    "height",
    "units",
    "origin",
    "xAxis",
    "yAxis",
    "crop",
    "imageDigest",
  ]);
  const width = v.width === null ? null : finite(v.width, Number.EPSILON, 1e9);
  const height =
    v.height === null ? null : finite(v.height, Number.EPSILON, 1e9);
  const units = oneOf(v.units, ["pixels", "normalized", "unknown"] as const);
  if (units === "normalized" && (width !== 1 || height !== 1))
    fail("Normalized frame extent must be one.");
  let crop: CoordinateFrame["crop"] = null;
  if (v.crop !== null) {
    const c = object(v.crop, ["x", "y", "width", "height"]);
    crop = {
      x: finite(c.x, 0, 1e9),
      y: finite(c.y, 0, 1e9),
      width: finite(c.width, Number.EPSILON, 1e9),
      height: finite(c.height, Number.EPSILON, 1e9),
    };
    if (
      width === null ||
      height === null ||
      crop.x + crop.width > width ||
      crop.y + crop.height > height
    )
      fail("Crop exceeds frame.");
  }
  const digest = v.imageDigest === null ? null : text(v.imageDigest, 64);
  if (digest !== null && !/^[a-f0-9]{64}$/.test(digest))
    fail("Invalid image SHA256.");
  return {
    id: id(v.id),
    mapId: id(v.mapId),
    coordinateVersion: id(v.coordinateVersion),
    width,
    height,
    units,
    origin: oneOf(v.origin, [
      "top-left",
      "top-right",
      "bottom-left",
      "bottom-right",
      "unknown",
    ] as const),
    xAxis: oneOf(v.xAxis, ["right", "left", "unknown"] as const),
    yAxis: oneOf(v.yAxis, ["down", "up", "unknown"] as const),
    crop,
    imageDigest: digest,
  };
}
function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object") {
    for (const item of Object.values(value)) deepFreeze(item);
    Object.freeze(value);
  }
  return value;
}

/** Schema validation is intentionally separate from trusted source authorization and registration. */
export function parseSnapshot(
  json: string,
  expectedSourceId: string,
): SourceSnapshot {
  if (
    typeof json !== "string" ||
    json.length > LIMITS.snapshotBytes ||
    utf8Bytes(json) > LIMITS.snapshotBytes
  )
    fail("Snapshot byte limit exceeded.");
  const input: unknown = JSON.parse(json);
  validateJsonTree(input);
  const v = object(input, [
    "schemaVersion",
    "sourceId",
    "snapshotId",
    "capturedAt",
    "sourceRevision",
    "frame",
    "applicability",
    "categories",
    "records",
  ]);
  if (v.schemaVersion !== 1 || id(v.sourceId) !== expectedSourceId)
    fail("Unsupported schema or source mismatch.");
  const f = frame(v.frame),
    a = applicability(v.applicability);
  if (f.mapId !== a.mapId || f.coordinateVersion !== a.coordinateVersion)
    fail("Frame applicability mismatch.");
  const categoryIds = new Set<string>();
  const categories = array(v.categories, LIMITS.categories).map((value) => {
    const c = object(value, ["id", "path"]),
      key = id(c.id);
    if (categoryIds.has(key)) fail("Duplicate category.");
    categoryIds.add(key);
    const path = array(c.path, 8).map((part) => text(part, LIMITS.title));
    if (!path.length) fail("Empty category path.");
    return { id: key, path };
  });
  const recordIds = new Set<string>();
  const records: SourceRecord[] = array(v.records, LIMITS.recordsPerSource).map(
    (value) => {
      const r = object(value, [
        "id",
        "categoryId",
        "title",
        "rawGeometry",
        "applicability",
        "activityClaim",
        "upstreamRefs",
        "evidence",
      ]);
      const key = id(r.id),
        categoryId = id(r.categoryId);
      if (recordIds.has(key) || !categoryIds.has(categoryId))
        fail("Duplicate record or missing category.");
      recordIds.add(key);
      const point = object(r.rawGeometry, ["kind", "x", "y"]);
      if (point.kind !== "point") fail("Unsupported geometry.");
      const app = applicability(r.applicability);
      if (
        app.mapId !== a.mapId ||
        app.coordinateVersion !== a.coordinateVersion ||
        (a.gameBuild !== null && app.gameBuild !== a.gameBuild) ||
        (a.floor !== null && app.floor !== a.floor)
      )
        fail("Record applicability mismatch.");
      const claim = object(r.activityClaim, ["state", "observedAt"]);
      const state = oneOf(claim.state, [
        "possible-spawn",
        "observed-active",
        "unknown",
      ] as const);
      const observedAt =
        claim.observedAt === null ? null : timestamp(claim.observedAt);
      if ((state === "observed-active") !== (observedAt !== null))
        fail("Activity timestamp mismatch.");
      const evidence = array(r.evidence, 32).map((value) => {
        const e = object(value, ["note", "url"]);
        const note = text(e.note, LIMITS.notes);
        let url: string | null = null;
        if (e.url !== null) {
          url = text(e.url, 2048);
          const parsed = new URL(url);
          if (
            parsed.protocol !== "https:" ||
            parsed.username ||
            parsed.password
          )
            fail("Unsafe evidence URL.");
        }
        return { note, url };
      });
      return {
        id: key,
        categoryId,
        title: text(r.title, LIMITS.title),
        rawGeometry: {
          kind: "point",
          x: finite(point.x, 0, f.width ?? 1e9),
          y: finite(point.y, 0, f.height ?? 1e9),
        },
        applicability: app,
        activityClaim: { state, observedAt },
        upstreamRefs: array(r.upstreamRefs, 32).map(id),
        evidence,
      };
    },
  );
  return deepFreeze({
    schemaVersion: 1,
    sourceId: expectedSourceId,
    snapshotId: id(v.snapshotId),
    capturedAt: timestamp(v.capturedAt),
    sourceRevision: text(v.sourceRevision, LIMITS.id),
    frame: f,
    applicability: a,
    categories,
    records,
  });
}

/** Aggregate admission after individual snapshots have passed parseSnapshot. */
export function validateSnapshotCollection(
  snapshots: readonly SourceSnapshot[],
): void {
  if (snapshots.length > LIMITS.snapshots)
    fail("Snapshot count limit exceeded.");
  const sources = new Map<string, { count: number; categories: Set<string> }>();
  const keys = new Set<string>();
  let total = 0;
  for (const snapshot of snapshots) {
    const key = JSON.stringify([snapshot.sourceId, snapshot.snapshotId]);
    if (keys.has(key)) fail("Duplicate source snapshot identity.");
    keys.add(key);
    const source = sources.get(snapshot.sourceId) ?? {
      count: 0,
      categories: new Set<string>(),
    };
    source.count += snapshot.records.length;
    snapshot.categories.forEach((category) =>
      source.categories.add(category.id),
    );
    if (
      source.count > LIMITS.recordsPerSource ||
      source.categories.size > LIMITS.categories
    )
      fail("Per-source record/category limit exceeded.");
    sources.set(snapshot.sourceId, source);
    total += snapshot.records.length;
    if (sources.size > LIMITS.sources || total > LIMITS.recordsTotal)
      fail("Workspace source/record limit exceeded.");
  }
}
export function validateCoordinateFrame(value: unknown): CoordinateFrame {
  validateJsonTree(value);
  return frame(value);
}
