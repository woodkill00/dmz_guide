/** Presentation observers never write storage or authorize domain mutation themselves. */
export type ContextRevision = number | string;
export interface OperationContext {
  readonly workspace: string;
  readonly pack: string | null;
  readonly profile: string | null;
  readonly revision: ContextRevision;
}
export type OperationPhase =
  | "reading"
  | "preparing"
  | "committing"
  | "confirmed"
  | "failed"
  | "unconfirmed";
export interface OperationTicket {
  readonly ownerId: string;
  readonly id: number;
  readonly kind: string;
  readonly context: Readonly<OperationContext>;
  readonly viewGeneration: number;
  readonly draftGeneration: number;
  readonly focusGeneration: number;
  readonly startedAt: number;
}
export interface DepartureRequest {
  readonly kind: "task" | "record" | "profile" | "pack" | "link" | "back";
  /** Validated public destination identity, never private notes/draft payload. */
  readonly target: string;
  readonly originTask: string;
  readonly focusKey?: string | null;
}
export interface NavigationIntent extends DepartureRequest {
  readonly id: number;
  readonly context: Readonly<OperationContext>;
  readonly viewGeneration: number;
  readonly draftGeneration: number;
  readonly focusGeneration: number;
}
export interface Settlement {
  readonly accepted: boolean;
  readonly publish: boolean;
  readonly navigate: Readonly<NavigationIntent> | null;
  readonly reason: string;
}
export interface OwnerSnapshot {
  readonly ownerId: string;
  readonly context: Readonly<OperationContext>;
  readonly connected: boolean;
  readonly viewGeneration: number;
  readonly draftGeneration: number;
  readonly focusGeneration: number;
  readonly pendingIntent: Readonly<NavigationIntent> | null;
  readonly operation: Readonly<{
    id: number;
    kind: string;
    phase: OperationPhase;
    cancelRequested: boolean;
  }> | null;
}
export interface OperationOwnership {
  begin(options: {
    kind: string;
    phase?: "reading" | "preparing";
    cancel?: () => void;
  }): Readonly<OperationTicket>;
  setContext(context: OperationContext): void;
  invalidate(options?: { draft?: boolean }): void;
  focusChanged(): void;
  canPublish(ticket: OperationTicket, options?: { focus?: boolean }): boolean;
  /** Call before handing off a noncancelable commit, and proceed only on true. */
  commit(ticket: OperationTicket): boolean;
  /** Requests a real supported cancellation; never reports domain rollback. */
  requestCancel(ticket: OperationTicket): boolean;
  observe(
    ticket: OperationTicket,
  ): Readonly<{
    current: boolean;
    slow: boolean;
    phase: OperationPhase | "disposed";
    outcome: "confirmed" | "failed" | "unconfirmed" | null;
  }>;
  requestDeparture(
    intent: DepartureRequest,
    options?: { modified?: boolean },
  ): Readonly<NavigationIntent> | null;
  /** Clear departure only; this does not cancel a commit or discard a draft. */
  stay(): void;
  /**
   * Committing/unconfirmed success requires a synchronous verifier returning true.
   * Reconcile the domain receipt even when publish is false. Only accepted+publish
   * permits UI effects; navigate is a descriptor, not an executed navigation.
   * Settle before advancing this observer to the result's new context revision.
   */
  settle(
    ticket: OperationTicket,
    result: {
      outcome: "confirmed" | "failed" | "unconfirmed";
      receipt?: unknown;
    },
    validators?: {
      verifyReceipt?: (receipt: unknown, ticket: OperationTicket) => boolean;
      validateDestination?: (intent: NavigationIntent) => boolean;
    },
  ): Readonly<Settlement>;
  /** Invalidates UI; only reading/preparation can invoke an existing abort capability. */
  dispose(): void;
  snapshot(): Readonly<OwnerSnapshot>;
}
export function createOperationOwnership(options: {
  ownerId: string;
  context: OperationContext;
  now?: () => number;
}): OperationOwnership;
export interface RouteActionBinding {
  readonly routeId: string;
  readonly expectedRevision: ContextRevision;
  readonly waypointToken: string;
  readonly action:
    | "reached"
    | "unreached"
    | "undo"
    | "locate"
    | "remove"
    | "reset";
  readonly priorActionId?: string;
}
export interface CurrentRouteIdentity {
  readonly routeId: string;
  readonly revision: ContextRevision;
  readonly waypointTokens: readonly string[];
  readonly lastActionId?: string;
}
/** Invoke inside the real atomic mutation; retain existing resolved-point/write guards. */
export function routeBindingMatches(
  binding: RouteActionBinding,
  current: CurrentRouteIdentity,
): boolean;
