import { validateHubSnapshot, type HubSnapshot } from "./dmzhub-model.ts";
import { validateSnapshot, type X01Snapshot } from "./model.ts";
import type { Floor } from "./workbench-model.ts";

export type PrivatePoint = {
  id: string;
  name: string;
  kind: string;
  floor: Floor;
  x: number;
  y: number;
  notes: string;
  createdAt: string;
};
export type PrivatePhoto = {
  id: string;
  pointId: string;
  name: string;
  mime: "image/png" | "image/jpeg" | "image/webp";
  blob: Blob;
};
export type Observation = {
  id: string;
  targetId: string;
  date: string;
  build: string;
  outcome: "confirmed" | "absent" | "uncertain";
  notes: string;
};
export type Decision = { candidateId: string; status: "same" | "separate" };
export type PrivateState = {
  version: 1;
  revision: number;
  points: PrivatePoint[];
  photos: PrivatePhoto[];
  observations: Observation[];
  decisions: Decision[];
  routeIds: string[];
  hubOverride: HubSnapshot | null;
  codOverride: X01Snapshot | null;
};
export const emptyState = (): PrivateState => ({
  version: 1,
  revision: 0,
  points: [],
  photos: [],
  observations: [],
  decisions: [],
  routeIds: [],
  hubOverride: null,
  codOverride: null,
});
const safeText = (value: unknown, max: number) =>
  typeof value === "string" &&
  value.length <= max &&
  !/[<>\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value);
const coordinate = (value: unknown) =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  value >= 0 &&
  value <= 1;
const identifier = (value: unknown) =>
  typeof value === "string" && /^[a-zA-Z0-9_-]{1,100}$/.test(value);
const isDate = (value: unknown) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() + 1 === month &&
    parsed.getUTCDate() === day
  );
};
const isTimestamp = (value: unknown) =>
  typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value) &&
  isDate(value.slice(0, 10)) &&
  !Number.isNaN(Date.parse(value));
export function validatePrivateState(value: unknown): PrivateState {
  const state = value as PrivateState;
  if (
    !state ||
    state.version !== 1 ||
    !Number.isSafeInteger(state.revision) ||
    state.revision < 0 ||
    !Array.isArray(state.points) ||
    state.points.length > 300 ||
    !Array.isArray(state.photos) ||
    state.photos.length > 20 ||
    !Array.isArray(state.observations) ||
    state.observations.length > 500 ||
    !Array.isArray(state.decisions) ||
    state.decisions.length > 500 ||
    !Array.isArray(state.routeIds) ||
    state.routeIds.length > 30
  )
    throw Error("Invalid X01 private workspace");
  const ids = new Set<string>();
  for (const row of state.points) {
    if (
      !identifier(row.id) ||
      !row.id.startsWith("mine_") ||
      ids.has(row.id) ||
      !safeText(row.name, 100) ||
      !row.name.trim() ||
      !safeText(row.kind, 50) ||
      !safeText(row.notes, 2000) ||
      ![1, 2].includes(row.floor) ||
      !coordinate(row.x) ||
      !coordinate(row.y) ||
      !isTimestamp(row.createdAt)
    )
      throw Error("Invalid X01 private point");
    ids.add(row.id);
  }
  let totalPhotos = 0;
  const photoIds = new Set<string>();
  for (const photo of state.photos) {
    if (
      !identifier(photo.id) ||
      photoIds.has(photo.id) ||
      !ids.has(photo.pointId) ||
      !safeText(photo.name, 120) ||
      !["image/png", "image/jpeg", "image/webp"].includes(photo.mime) ||
      !(photo.blob instanceof Blob) ||
      photo.blob.size < 1 ||
      photo.blob.size > 2_097_152
    )
      throw Error("Invalid X01 photo");
    photoIds.add(photo.id);
    totalPhotos += photo.blob.size;
  }
  if (totalPhotos > 20_971_520) throw Error("X01 photos exceed 20 MiB");
  const observationIds = new Set<string>();
  for (const row of state.observations) {
    if (
      !identifier(row.id) ||
      observationIds.has(row.id) ||
      !identifier(row.targetId) ||
      !isDate(row.date) ||
      !safeText(row.build, 80) ||
      !["confirmed", "absent", "uncertain"].includes(row.outcome) ||
      !safeText(row.notes, 2000)
    )
      throw Error("Invalid X01 observation");
    observationIds.add(row.id);
  }
  const decisions = new Set<string>();
  for (const row of state.decisions) {
    if (
      !/^x01-[a-z0-9-]{1,80}__dmzhub-[0-9]{1,12}$/.test(row.candidateId) ||
      decisions.has(row.candidateId) ||
      !["same", "separate"].includes(row.status)
    )
      throw Error("Invalid X01 source decision");
    decisions.add(row.candidateId);
  }
  if (
    new Set(state.routeIds).size !== state.routeIds.length ||
    !state.routeIds.every(identifier)
  )
    throw Error("Invalid X01 route order");
  if (state.hubOverride !== null) validateHubSnapshot(state.hubOverride);
  if (state.codOverride !== null) validateSnapshot(state.codOverride);
  const metadata = {
    ...state,
    photos: state.photos.map(({ blob, ...rest }) => ({
      ...rest,
      size: blob.size,
    })),
  };
  if (JSON.stringify(metadata).length > 1_000_000)
    throw Error("X01 workspace metadata exceeds 1 MB");
  return state;
}
const dbName = "dmz-x01-workbench-v1";
async function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains("workspace"))
        request.result.createObjectStore("workspace");
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error || Error("X01 storage unavailable"));
    request.onblocked = () =>
      reject(Error("Close other X01 tabs before upgrading storage"));
  });
}
export async function readPrivateState(): Promise<PrivateState> {
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction("workspace", "readonly"),
        request = transaction.objectStore("workspace").get("current");
      request.onsuccess = () => {
        try {
          resolve(
            request.result
              ? validatePrivateState(request.result)
              : emptyState(),
          );
        } catch (error) {
          reject(error);
        }
      };
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}
export async function savePrivateState(
  next: PrivateState,
): Promise<PrivateState> {
  validatePrivateState(next);
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction("workspace", "readwrite"),
        store = transaction.objectStore("workspace"),
        request = store.get("current");
      let saved: PrivateState;
      request.onsuccess = () => {
        try {
          const current = request.result
            ? validatePrivateState(request.result)
            : emptyState();
          if (current.revision !== next.revision)
            throw Error(
              "X01 workspace changed in another tab. Reload before saving.",
            );
          saved = { ...next, revision: next.revision + 1 };
          store.put(saved, "current");
        } catch (error) {
          transaction.abort();
          reject(error);
        }
      };
      transaction.oncomplete = () => resolve(saved);
      transaction.onerror = () =>
        reject(transaction.error || Error("X01 save failed"));
      transaction.onabort = () =>
        reject(transaction.error || Error("X01 save was rolled back"));
    });
  } finally {
    db.close();
  }
}
const base64 = (bytes: Uint8Array) => {
  let out = "";
  for (let i = 0; i < bytes.length; i += 32768)
    out += String.fromCharCode(...bytes.subarray(i, i + 32768));
  return btoa(out);
};
const decode = (value: string) => {
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(value) || value.length > 2_800_000)
    throw Error("Invalid X01 photo encoding");
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
};
export async function makeBackup(state: PrivateState) {
  validatePrivateState(state);
  return {
    format: "dmz-x01-private-backup",
    version: 1,
    exportedAt: new Date().toISOString(),
    state: {
      ...state,
      photos: await Promise.all(
        state.photos.map(async (photo) => ({
          id: photo.id,
          pointId: photo.pointId,
          name: photo.name,
          mime: photo.mime,
          base64: base64(new Uint8Array(await photo.blob.arrayBuffer())),
        })),
      ),
    },
  };
}
export async function parseBackup(input: unknown): Promise<PrivateState> {
  const backup = input as {
    format: string;
    version: number;
    state: Omit<PrivateState, "photos"> & {
      photos: {
        id: string;
        pointId: string;
        name: string;
        mime: PrivatePhoto["mime"];
        base64: string;
      }[];
    };
  };
  if (
    !backup ||
    backup.format !== "dmz-x01-private-backup" ||
    backup.version !== 1 ||
    !backup.state ||
    !Array.isArray(backup.state.photos) ||
    backup.state.photos.length > 20
  )
    throw Error("Invalid X01 backup");
  const photos: PrivatePhoto[] = backup.state.photos.map(
    ({ base64: encoded, ...photo }) => ({
      ...photo,
      blob: new Blob([decode(encoded)], { type: photo.mime }),
    }),
  );
  const state = validatePrivateState({ ...backup.state, photos });
  for (const photo of photos)
    await validatePhoto(
      new File([photo.blob], photo.name, { type: photo.mime }),
    );
  return state;
}
export async function validatePhoto(file: File) {
  if (
    !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
    file.size < 1 ||
    file.size > 2_097_152
  )
    throw Error("Choose a PNG, JPEG or WebP image under 2 MiB");
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer()),
    text = String.fromCharCode(...bytes);
  const valid =
    file.type === "image/png"
      ? text.startsWith("\x89PNG\r\n\x1a\n")
      : file.type === "image/jpeg"
        ? bytes[0] === 255 && bytes[1] === 216
        : file.type === "image/webp" &&
          text.startsWith("RIFF") &&
          text.slice(8, 12) === "WEBP";
  if (!valid) throw Error("Image type does not match file contents");
}
