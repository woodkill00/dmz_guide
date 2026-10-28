import { parseSnapshot } from "./validation.ts";
import type { SourceSnapshot } from "./types.ts";
import { requireCapability, sourcePolicies } from "./policy.ts";
export async function sha256(bytes: Uint8Array): Promise<string> {
  return [
    ...new Uint8Array(
      await crypto.subtle.digest("SHA-256", bytes as Uint8Array<ArrayBuffer>),
    ),
  ]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
export interface SnapshotPreview {
  snapshot: SourceSnapshot;
  digest: string;
  revision: number;
  expires: number;
  policyRevision: string;
}
const previews = new WeakMap<
  SnapshotPreview,
  {
    snapshot: SourceSnapshot;
    digest: string;
    revision: number;
    expires: number;
    policyRevision: string;
  }
>();
export async function readJSONFile(
  file: File,
  limit: number,
  signal?: AbortSignal,
): Promise<string> {
  if (file.size <= 0 || file.size > limit)
    throw new Error("JSON file byte limit exceeded.");
  const bytes = await new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    const cleanup = () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
    };
    const abort = () => {
      reader.abort();
      cleanup();
      reject(new Error("Import cancelled."));
    };
    const timer = setTimeout(() => {
      reader.abort();
      cleanup();
      reject(new Error("Local file read timed out."));
    }, 10000);
    reader.onload = () => {
      cleanup();
      if (signal?.aborted) return reject(new Error("Import cancelled."));
      resolve(reader.result as ArrayBuffer);
    };
    reader.onerror = () => {
      cleanup();
      reject(reader.error ?? new Error("Local file read failed."));
    };
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) abort();
    else reader.readAsArrayBuffer(file);
  });
  return new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(
    bytes,
  );
}
export async function stageSnapshot(
  json: string,
  sourceId: string,
  revision: number,
): Promise<SnapshotPreview> {
  const policy = requireCapability(sourceId, "snapshot");
  if (!Number.isSafeInteger(revision) || revision < 0)
    throw new Error("Invalid workspace revision.");
  const snapshot = parseSnapshot(json, sourceId);
  const preview = Object.freeze({
    snapshot,
    digest: await sha256(new TextEncoder().encode(json)),
    revision,
    expires: Date.now() + 5 * 60 * 1000,
    policyRevision: policy.revision,
  });
  previews.set(preview, { ...preview });
  return preview;
}
export function consumePreview(
  preview: SnapshotPreview,
  revision: number,
): SourceSnapshot {
  const original = previews.get(preview);
  if (!original)
    throw new Error("Unknown or already used preview. Restage the file.");
  requireCapability(original.snapshot.sourceId, "snapshot");
  if (
    revision !== original.revision ||
    sourcePolicies[original.snapshot.sourceId].revision !==
      original.policyRevision ||
    Date.now() > original.expires
  )
    throw new Error(
      "Workspace or policy changed, or preview expired. Restage the file.",
    );
  previews.delete(preview);
  return original.snapshot;
}

/** Compatibility adapter for the existing owner-local schema019. Does not fetch anything. */
export function adaptOfficial(
  raw: unknown,
  sourceId = "official",
): SourceSnapshot {
  const v = raw as any;
  if (
    v?.schemaVersion !== 1 ||
    v.sourcePage !== sourcePolicies[sourceId]?.page ||
    !Array.isArray(v.records) ||
    !Array.isArray(v.categories)
  )
    throw new Error("Invalid official snapshot.");
  const applicability = {
    mapId: "hajin",
    coordinateVersion: "hajin-official-v1-4096",
    gameBuild: null,
    floor: null,
  };
  const date = v.capturedAt;
  return parseSnapshot(
    JSON.stringify({
      schemaVersion: 1,
      sourceId,
      snapshotId: `${sourceId}-${String(date).replace(/[^\w-]/g, "-")}`,
      capturedAt: date,
      sourceRevision: String(date),
      frame: {
        id: "hajin-official-v1-4096",
        mapId: "hajin",
        coordinateVersion: applicability.coordinateVersion,
        width: 4096,
        height: 4096,
        units: "pixels",
        origin: "top-left",
        xAxis: "right",
        yAxis: "down",
        crop: null,
        imageDigest:
          "377393bf8bb36140ee97702e2ce3950acc7f62841f9bf66f9a9adc8a9f740acb",
      },
      applicability,
      categories: v.categories.map((c: any) => ({
        id: c.id,
        path: [c.group, c.name],
      })),
      records: v.records.map((r: any) => {
        const reference=sourceId==='mapgenie'&&r.placement==='reference'&&r.x===null&&r.y===null&&[r.sourceX,r.sourceY].every(n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=1024);
        if (
          r.mapId !== "hajin" ||
          r.coordinateSpaceVersion !== applicability.coordinateVersion ||
          !reference&&(!Number.isFinite(r.x) ||
          !Number.isFinite(r.y) ||
          r.x < 0 ||
          r.y < 0 ||
          r.x > 1 ||
          r.y > 1)
        )
          throw new Error("Invalid official coordinates.");
        return {
          id: r.id,
          categoryId: r.category,
          title: r.name,
          rawGeometry: reference?{kind:'unplaced'}:{ kind: "point", x: r.x * 4096, y: r.y * 4096 },
          applicability: {
            ...applicability,
            floor:
              typeof r.floor === "number" && Number.isFinite(r.floor)
                ? String(r.floor)
                : typeof r.floor === "string" &&
                    r.floor.length > 0 &&
                    r.floor.length <= 100
                  ? r.floor
                  : null,
          },
          activityClaim: { state: "unknown", observedAt: null },
          upstreamRefs:
            sourceId === "official" ? ["activision-official-guide"] : [],
          evidence: [
            {
              note: `Imported owner-local ${sourcePolicies[sourceId].name} claim; not independently verified.${reference?` Reference card outside terrain; source board position ${r.sourceX}, ${r.sourceY}.`:''}${typeof r.notes === "string" ? " " + r.notes.slice(0, 3500) : ""}`,
              url: sourcePolicies[sourceId].page,
            },
          ],
        };
      }),
    }),
    sourceId,
  );
}
