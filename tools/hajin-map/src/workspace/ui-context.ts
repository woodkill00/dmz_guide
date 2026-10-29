import type { Workspace } from "./model.ts";
export interface UIServices {
  state: () => Workspace;
  revision: () => number;
  commit: (
    label: string,
    change: (draft: Workspace) => void,
    resources?: { id: string; blob: Blob }[],
    expectedRevision?: number,
  ) => Promise<void>;
  error: (error: unknown) => void;
  notice: (message: string) => void;
  refresh: () => void;
  detail: (node: HTMLElement, cleanup?: () => void) => void;
  closeDetail: () => void;
  readResource: (id: string) => Promise<Blob | undefined>;
  previousState: () => Promise<Workspace | undefined>;
  legacySnapshot: (sourceId?: string) => unknown;
  focus: (x: number, y: number) => void;
  process: <T>(work: (signal: AbortSignal) => Promise<T>) => Promise<T>;
}
