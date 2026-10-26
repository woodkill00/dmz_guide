import type { Json } from "./types.ts";
/** Heavy validation/admission happens off the interaction thread; IndexedDB still commits atomically. */
export function createWorkspacePreparer() {
  let worker: Worker | undefined,
    sequence = 0;
  const pending = new Map<
    number,
    {
      resolve: (value: { data: Json; backupBytes: number }) => void;
      reject: (error: Error) => void;
      timer: ReturnType<typeof setTimeout>;
    }
  >();
  const stop = (error: Error) => {
    worker?.terminate();
    worker = undefined;
    for (const item of pending.values()) {
      clearTimeout(item.timer);
      item.reject(error);
    }
    pending.clear();
  };
  return {
    prepare: (data: Json): Promise<{ data: Json; backupBytes: number }> => {
      if (!worker) {
        worker = new Worker(new URL("./prepare-worker.ts", import.meta.url), {
          type: "module",
        });
        worker.onmessage = (event) => {
          const item = pending.get(event.data.id);
          if (!item) return;
          pending.delete(event.data.id);
          clearTimeout(item.timer);
          if (event.data.ok) item.resolve(event.data.prepared);
          else item.reject(new Error(event.data.error));
        };
        worker.onerror = (event) => {
          event.preventDefault();
          stop(
            new Error(
              "Workspace validation worker failed. Export your retained draft or reload.",
            ),
          );
        };
      }
      return new Promise((resolve, reject) => {
        const id = ++sequence,
          timer = setTimeout(
            () =>
              stop(
                new Error(
                  "Workspace validation timed out. Narrow the operation; no data was saved.",
                ),
              ),
            15000,
          );
        pending.set(id, { resolve, reject, timer });
        worker!.postMessage({ id, data });
      });
    },
    destroy: () => stop(new Error("Workspace closed.")),
  };
}
