/** Presentation ownership only: callers retain all real writes, receipts and recovery. */
const PHASES = new Set(["reading", "preparing"]);
const TERMINAL = new Set(["confirmed", "failed"]);
const OUTCOMES = new Set(["confirmed", "failed", "unconfirmed"]);
const identifier = (value, name, limit = 256) => {
  if (
    typeof value !== "string" ||
    !value.length ||
    value.length > limit ||
    /[\u0000-\u001f]/u.test(value)
  )
    throw new TypeError(`Invalid ${name}`);
  return value;
};
const revisionValid = (value) =>
  (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) ||
  (typeof value === "string" &&
    value.length > 0 &&
    value.length <= 256 &&
    !/[\u0000-\u001f]/u.test(value));
const captureContext = (value) => {
  if (!value || !revisionValid(value.revision))
    throw new TypeError("Invalid context revision");
  return Object.freeze({
    workspace: identifier(value.workspace, "workspace"),
    pack: value.pack === null ? null : identifier(value.pack, "pack"),
    profile:
      value.profile === null ? null : identifier(value.profile, "profile"),
    revision: value.revision,
  });
};
const sameContext = (a, b) =>
  a.workspace === b.workspace &&
  a.pack === b.pack &&
  a.profile === b.profile &&
  a.revision === b.revision;
const decision = (accepted, publish = false, navigate = null, reason = "") =>
  Object.freeze({ accepted, publish, navigate, reason });

/** No DOM, storage or timers. A clock observation never settles an actual domain job. */
export function createOperationOwnership({
  ownerId,
  context: initialContext,
  now = Date.now,
} = {}) {
  identifier(ownerId, "owner ID", 128);
  if (typeof now !== "function") throw new TypeError("Invalid clock");
  let context = captureContext(initialContext),
    viewGeneration = 0,
    draftGeneration = 0,
    focusGeneration = 0,
    connected = true,
    nextOperation = 0,
    nextIntent = 0,
    pendingIntent = null,
    operation = null;
  const clock = () => {
    const value = now();
    if (!Number.isFinite(value) || value < 0)
      throw new TypeError("Invalid clock value");
    return value;
  };
  const isCurrent = (ticket) => !!operation && ticket === operation.ticket;
  const blocking = () =>
    !!operation &&
    (operation.phase === "committing" || operation.phase === "unconfirmed");
  const canPublish = (ticket, { focus = false } = {}) =>
    isCurrent(ticket) &&
    connected &&
    !operation.cancelRequested &&
    operation.phase !== "failed" &&
    ticket.viewGeneration === viewGeneration &&
    ticket.draftGeneration === draftGeneration &&
    sameContext(ticket.context, context) &&
    (!focus || ticket.focusGeneration === focusGeneration);
  const requestCancel = (ticket) => {
    if (
      !isCurrent(ticket) ||
      operation.cancelRequested ||
      !PHASES.has(operation.phase) ||
      typeof operation.cancel !== "function"
    )
      return false;
    // Mark before invoking the real capability so an abort callback cannot request twice.
    operation.cancelRequested = true;
    operation.cancel();
    return true;
  };
  const api = {
    begin({ kind, phase = "reading", cancel } = {}) {
      if (!connected) throw new Error("Operation owner is disposed");
      if (blocking())
        throw new Error("A committing or unconfirmed operation is pending");
      identifier(kind, "operation kind", 64);
      if (
        !PHASES.has(phase) ||
        (cancel !== undefined && typeof cancel !== "function")
      )
        throw new TypeError("Invalid initial operation phase/capability");
      const ticket = Object.freeze({
        ownerId,
        id: ++nextOperation,
        kind,
        context,
        viewGeneration,
        draftGeneration,
        focusGeneration,
        startedAt: clock(),
      });
      operation = {
        ticket,
        phase,
        cancel,
        cancelRequested: false,
        commitStartedAt: null,
      };
      return ticket;
    },
    setContext(value) {
      const next = captureContext(value);
      if (!sameContext(context, next)) {
        context = next;
        viewGeneration++;
      }
    },
    invalidate({ draft = false } = {}) {
      viewGeneration++;
      if (draft) draftGeneration++;
    },
    focusChanged() {
      focusGeneration++;
    },
    canPublish,
    commit(ticket) {
      if (
        !isCurrent(ticket) ||
        operation.phase !== "preparing" ||
        operation.cancelRequested ||
        !canPublish(ticket)
      )
        return false;
      operation.phase = "committing";
      operation.commitStartedAt = clock();
      return true;
    },
    requestCancel,
    observe(ticket) {
      if (!isCurrent(ticket))
        return Object.freeze({
          current: false,
          slow: false,
          phase: "disposed",
          outcome: null,
        });
      const slow = blocking() && clock() - operation.commitStartedAt >= 10000;
      return Object.freeze({
        current: true,
        slow,
        phase: operation.phase,
        outcome:
          operation.phase === "unconfirmed" || slow
            ? "unconfirmed"
            : TERMINAL.has(operation.phase)
              ? operation.phase
              : null,
      });
    },
    requestDeparture(value, { modified = false } = {}) {
      if (modified) return null;
      if (!connected) throw new Error("Operation owner is disposed");
      if (pendingIntent) return pendingIntent;
      if (
        !value ||
        !["task", "record", "profile", "pack", "link", "back"].includes(
          value.kind,
        )
      )
        throw new TypeError("Invalid departure kind");
      const target = identifier(value.target, "departure target", 2048),
        originTask = identifier(value.originTask, "origin task", 128);
      const focusKey =
        value.focusKey == null ? null : identifier(value.focusKey, "focus key");
      pendingIntent = Object.freeze({
        id: ++nextIntent,
        kind: value.kind,
        target,
        originTask,
        focusKey,
        context,
        viewGeneration,
        draftGeneration,
        focusGeneration,
      });
      return pendingIntent;
    },
    stay() {
      pendingIntent = null;
    },
    settle(ticket, result, { verifyReceipt, validateDestination } = {}) {
      if (
        !isCurrent(ticket) ||
        TERMINAL.has(operation.phase) ||
        operation.cancelRequested ||
        !result ||
        !OUTCOMES.has(result.outcome)
      )
        return decision(false, false, null, "stale-or-invalid-result");
      if (result.outcome === "unconfirmed" && !blocking())
        return decision(false, false, null, "not-a-commit");
      if (result.outcome === "confirmed" && blocking()) {
        let verified = false;
        try {
          verified =
            result.receipt !== undefined &&
            typeof verifyReceipt === "function" &&
            verifyReceipt(result.receipt, ticket) === true;
        } catch {
          /* An invalid receipt never confirms a write. */
        }
        if (!verified)
          return decision(false, false, null, "receipt-unverified");
      }
      const wasCommit = blocking();
      const publish = canPublish(ticket);
      operation.phase = result.outcome;
      if (result.outcome !== "confirmed")
        return decision(true, publish, null, result.outcome);
      if (!wasCommit) return decision(true, publish);
      const intent = pendingIntent;
      // A confirmed domain result consumes a navigation decision exactly once.
      pendingIntent = null;
      if (!publish) return decision(true, false, null, "stale-ui-context");
      if (!intent) return decision(true, true);
      if (
        !sameContext(intent.context, context) ||
        intent.draftGeneration !== draftGeneration
      )
        return decision(true, true, null, "stale-navigation-context");
      let valid = false;
      try {
        valid =
          typeof validateDestination === "function" &&
          validateDestination(intent) === true;
      } catch {
        /* Missing/changed destinations stay in the current owner. */
      }
      return valid
        ? decision(true, true, intent)
        : decision(true, true, null, "destination-unavailable");
    },
    dispose() {
      if (!connected) return;
      connected = false;
      viewGeneration++;
      if (operation && PHASES.has(operation.phase))
        requestCancel(operation.ticket);
    },
    snapshot() {
      return Object.freeze({
        ownerId,
        context,
        connected,
        viewGeneration,
        draftGeneration,
        focusGeneration,
        pendingIntent,
        operation: operation
          ? Object.freeze({
              id: operation.ticket.id,
              kind: operation.ticket.kind,
              phase: operation.phase,
              cancelRequested: operation.cancelRequested,
            })
          : null,
      });
    },
  };
  return Object.freeze(api);
}

/** Identity predicate only. Invoke inside the real CAS/mutation and retain domain guards. */
export function routeBindingMatches(binding, current) {
  if (
    !binding ||
    !current ||
    !revisionValid(binding.expectedRevision) ||
    !revisionValid(current.revision)
  )
    return false;
  if (
    typeof binding.routeId !== "string" ||
    !binding.routeId ||
    binding.routeId !== current.routeId ||
    binding.expectedRevision !== current.revision ||
    typeof binding.waypointToken !== "string" ||
    !binding.waypointToken ||
    !Array.isArray(current.waypointTokens) ||
    !current.waypointTokens.includes(binding.waypointToken)
  )
    return false;
  if (
    !["reached", "unreached", "undo", "locate", "remove", "reset"].includes(
      binding.action,
    )
  )
    return false;
  return (
    binding.action !== "undo" ||
    (typeof binding.priorActionId === "string" &&
      binding.priorActionId.length > 0 &&
      binding.priorActionId === current.lastActionId)
  );
}
