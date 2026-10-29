import { validateWorkspace, exportPrivateBackup } from "./backup.ts";
import { prepareDocument } from "./store.ts";
import type { Json } from "./types.ts";
import type { Workspace } from "./model.ts";
addEventListener("message", (event: MessageEvent) => {
  const { id, data } = event.data;
  try {
    validateWorkspace(data);
    const prepared = prepareDocument(
      data as unknown as Json,
      (value) =>
        exportPrivateBackup(value as unknown as Workspace) as unknown as Json,
    );
    postMessage({ id, ok: true, prepared });
  } catch (error) {
    postMessage({
      id,
      ok: false,
      error:
        error instanceof Error ? error.message : "Workspace validation failed.",
    });
  }
});
