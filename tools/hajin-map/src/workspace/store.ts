import type { Json } from "./types.ts";
import { LIMITS, utf8Bytes, validateJsonTree } from "./validation.ts";

export interface WorkspaceRevision<T extends Json = Json> {
  schemaVersion: 1;
  revision: number;
  data: T;
  savedAt: string;
}
export interface WorkspaceHistory {
  current: WorkspaceRevision | null;
  previous: WorkspaceRevision | null;
}
export class RevisionConflict extends Error {
  constructor() {
    super(
      "Workspace changed in another tab. Reload or export your draft before retrying.",
    );
    this.name = "RevisionConflict";
  }
}

/** Projection is an internal rights-aware backup function, never an imported callback. */
export function prepareDocument<T extends Json>(
  data: T,
  project: (data: T) => Json = (value) => value,
) {
  validateJsonTree(data);
  const copy = structuredClone(data);
  const projection = project(structuredClone(copy));
  validateJsonTree(projection);
  // The backup codec supplies its full envelope projection; count UTF-8, not JS characters.
  const json = JSON.stringify(projection);
  const backupBytes = utf8Bytes(json);
  if (backupBytes > LIMITS.backupBytes)
    throw new Error(
      "Private backup byte budget exceeded. Export or prune before adding more data.",
    );
  return { data: copy, backupBytes };
}

/** A separate database: this module never opens native dmz-guide-local profiles/content. */
export async function openWorkspace(
  options: {
    factory?: IDBFactory;
    name?: string;
    project?: (data: Json) => Json;
    prepare?: (data: Json) => Promise<{ data: Json; backupBytes: number }>;
  } = {},
) {
  const factory = options.factory ?? globalThis.indexedDB;
  const name = options.name ?? "dmz-map-workspace";
  if (!factory)
    throw new Error("Local database unavailable. Keep and export your draft.");
  if (
    name !== "dmz-map-workspace" &&
    !name.startsWith("dmz-map-workspace-test-")
  )
    throw new Error("Invalid workspace database namespace.");
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    let settled = false;
    const request = factory.open(name, 2);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains("state"))
        request.result.createObjectStore("state");
      if (!request.result.objectStoreNames.contains("resources"))
        request.result.createObjectStore("resources");
    };
    request.onerror = () => {
      settled = true;
      reject(request.error ?? new Error("Cannot open workspace."));
    };
    request.onblocked = () => {
      settled = true;
      reject(
        new Error(
          "Workspace upgrade blocked by another tab. Close that tab and reload.",
        ),
      );
    };
    request.onsuccess = () => {
      if (settled) request.result.close();
      else {
        settled = true;
        resolve(request.result);
      }
    };
  });
  let closed = false;
  let draft: Json | null = null;
  db.onversionchange = () => {
    closed = true;
    db.close();
  };
  function transaction(mode: IDBTransactionMode) {
    if (closed)
      throw new Error(
        "Workspace connection closed. Reload before saving; export your draft first.",
      );
    return db.transaction(["state", "resources"], mode);
  }
  function verify(value: unknown): WorkspaceRevision | null {
    if (value === undefined || value === null) return null;
    const row = value as WorkspaceRevision;
    if (
      typeof row !== "object" ||
      Array.isArray(row) ||
      Object.keys(row).length !== 4 ||
      row.schemaVersion !== 1 ||
      !Number.isSafeInteger(row.revision) ||
      row.revision < 1 ||
      typeof row.savedAt !== "string" ||
      !Number.isFinite(Date.parse(row.savedAt)) ||
      !Object.hasOwn(row, "data")
    )
      throw new Error("Invalid stored workspace. Preserve it for recovery.");
    validateJsonTree(row.data);
    return row;
  }
  async function read(): Promise<WorkspaceHistory> {
    return new Promise((resolve, reject) => {
      const tx = transaction("readonly"),
        store = tx.objectStore("state");
      const current = store.get("current"),
        previous = store.get("previous");
      tx.oncomplete = () => {
        try {
          resolve({
            current: verify(current.result),
            previous: verify(previous.result),
          });
        } catch (error) {
          reject(error);
        }
      };
      tx.onabort = () =>
        reject(tx.error ?? new Error("Workspace read aborted."));
    });
  }
  async function commit(
    data: Json,
    expectedRevision: number,
    resources: { id: string; blob: Blob }[] = [],
  ): Promise<WorkspaceRevision> {
    if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0)
      throw new Error("Invalid expected revision.");
    validateJsonTree(data);
    const candidate = structuredClone(data);
    draft = candidate; // Retained even if admission, transaction creation or persistence fails.
    const prepared = options.prepare
      ? await options.prepare(candidate)
      : prepareDocument(candidate, options.project);
    if (
      !Number.isSafeInteger(prepared.backupBytes) ||
      prepared.backupBytes < 0 ||
      prepared.backupBytes > LIMITS.backupBytes
    )
      throw new Error("Invalid prepared backup byte budget.");
    if (
      resources.length > 3 ||
      resources.some(
        (r) =>
          !/^[a-f0-9]{64}$/.test(r.id) ||
          !(r.blob instanceof Blob) ||
          r.blob.size > 32 * 1024 * 1024 ||
          r.blob.type !== "image/png",
      )
    )
      throw new Error("Invalid background resource.");
    return new Promise((resolve, reject) => {
      let failure: unknown;
      let next: WorkspaceRevision;
      const tx = transaction("readwrite"),
        store = tx.objectStore("state");
      const request = store.get("current");
      request.onsuccess = () => {
        try {
          const current = verify(request.result);
          if ((current?.revision ?? 0) !== expectedRevision)
            throw new RevisionConflict();
          if (expectedRevision === Number.MAX_SAFE_INTEGER)
            throw new Error(
              "Revision limit reached. Export into a new workspace.",
            );
          next = {
            schemaVersion: 1,
            revision: expectedRevision + 1,
            data: prepared.data,
            savedAt: new Date().toISOString(),
          };
          store.put(current, "previous");
          store.put(next, "current");
          if (
            prepared.data &&
            typeof prepared.data === "object" &&
            !Array.isArray(prepared.data) &&
            Array.isArray(prepared.data.migrations) &&
            prepared.data.migrations.includes("source-masks-v1")
          )
            store.put(true, "legacy-masks-migrated");
          for (const resource of resources)
            tx.objectStore("resources").put(resource.blob, resource.id);
          const referenced = (data: Json | undefined): string[] => {
            if (
              !data ||
              typeof data !== "object" ||
              Array.isArray(data) ||
              !Array.isArray(data.basemaps)
            )
              return [];
            return data.basemaps.flatMap((value) =>
              value &&
              typeof value === "object" &&
              !Array.isArray(value) &&
              typeof value.id === "string"
                ? [value.id]
                : [],
            );
          };
          const keep = new Set([
            ...referenced(current?.data),
            ...referenced(prepared.data),
          ]);
          const keys = tx.objectStore("resources").getAllKeys();
          keys.onsuccess = () => {
            for (const key of keys.result)
              if (!keep.has(String(key)))
                tx.objectStore("resources").delete(key);
          };
        } catch (error) {
          failure = error;
          tx.abort();
        }
      };
      tx.oncomplete = () => {
        if (draft === candidate) draft = null;
        resolve(structuredClone(next!));
      };
      tx.onabort = () =>
        reject(
          failure ??
            tx.error ??
            new Error(
              "Save aborted; last valid workspace is unchanged. Export your draft.",
            ),
        );
    });
  }
  async function restorePrevious(
    expectedRevision: number,
  ): Promise<WorkspaceRevision> {
    const history = await read();
    if (!history.previous) throw new Error("No previous state is available.");
    return commit(history.previous.data, expectedRevision);
  }
  return {
    read,
    commit,
    restorePrevious,
    hasLegacyMigration: (): Promise<boolean> =>
      new Promise((resolve, reject) => {
        const tx = transaction("readonly"),
          request = tx.objectStore("state").get("legacy-masks-migrated");
        tx.oncomplete = () => resolve(request.result === true);
        tx.onabort = () =>
          reject(tx.error ?? new Error("Migration status read failed."));
      }),
    readResource: (id: string): Promise<Blob | undefined> =>
      new Promise((resolve, reject) => {
        const tx = transaction("readonly"),
          request = tx.objectStore("resources").get(id);
        tx.oncomplete = () => resolve(request.result);
        tx.onabort = () =>
          reject(tx.error ?? new Error("Resource read failed."));
      }),
    getDraft: () => (draft === null ? null : structuredClone(draft)),
    exportDraft: () => {
      if (draft === null) throw new Error("No unsaved draft.");
      return JSON.stringify(draft);
    },
    close: () => {
      closed = true;
      db.close();
    },
  };
}
