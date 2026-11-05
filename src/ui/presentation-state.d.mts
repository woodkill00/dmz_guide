export type QueryScope = "public" | "map" | "workspace";
export interface PresentationContext {
  workspace: string;
  pack: string | null;
  profile: string | null;
  revision: number | string | null;
  capture: string | null;
}
export interface ViewLimits {
  /** Current mounted DOM-key map keys. These are never evaluated as selectors. */
  controlKeys: ReadonlySet<string> | readonly string[];
  maxScroll: number;
}
export interface DetailSubview {
  recordRef: string;
  returnAnchor: string | null;
}
export interface CleanTaskView {
  query: string;
  scope: QueryScope;
  sort: string | null;
  group: string | null;
  filters: Record<string, string | number | boolean | null>;
  expanded: string[];
  scroll: { anchor: string | null; offset: number };
  focusKey: string | null;
  detail: DetailSubview | null;
}
export interface PresentationOptions {
  taskIds: ReadonlySet<string> | readonly string[];
  validateContext: (context: Readonly<PresentationContext>) => boolean;
  validateRecordRef: (
    ref: string,
    context: Readonly<PresentationContext>,
  ) => boolean;
}
export interface PresentationState {
  /** Establishes authoritative context and protects this tool's return entry. */
  activate(
    taskId: string,
    context: PresentationContext,
    limits: ViewLimits,
  ): CleanTaskView;
  /** Rejects stale/invalid/oversized captures atomically. No domain values allowed. */
  put(
    taskId: string,
    context: PresentationContext,
    view: Partial<CleanTaskView>,
    limits: ViewLimits,
  ): Readonly<{ reduced: boolean; evicted: number }>;
  /** Returns a detached clone, or null for missing/incompatible context. */
  get(
    taskId: string,
    context: PresentationContext,
    limits: ViewLimits,
  ): CleanTaskView | null;
  /** Invalidates incompatible views; active refs are checked against current controls. */
  reconcile(context: PresentationContext, limits: ViewLimits): void;
  remove(taskId: string, context: PresentationContext): boolean;
  clear(): void;
  /** Metadata only; no query, record, draft or private payload export. */
  stats(): Readonly<{ entries: number; bytes: number }>;
}
export function createPresentationState(
  options: PresentationOptions,
): PresentationState;
