/**
 * Bounded, memory-only clean view state. Domain values, drafts and operations
 * remain with their existing owners. Control keys are opaque map keys, never
 * selectors; callers supply the current mounted allowlist and record validator.
 */
const encoder = new TextEncoder();
const maximumEntries = 8;
const maximumBytes = 64 * 1024;
const contextFields = ["workspace", "pack", "profile", "revision", "capture"];
const viewFields = [
  "query",
  "scope",
  "sort",
  "group",
  "filters",
  "expanded",
  "scroll",
  "focusKey",
  "detail",
];

function object(value, allowed, required, label) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    ![Object.prototype, null].includes(Object.getPrototypeOf(value))
  ) {
    throw new TypeError(`Invalid ${label}`);
  }
  const keys = Reflect.ownKeys(value);
  if (
    keys.some((key) => typeof key !== "string" || !allowed.includes(key)) ||
    required.some((key) => !Object.hasOwn(value, key))
  ) {
    throw new TypeError(`Invalid ${label} fields`);
  }
  const values = Object.fromEntries(
    keys.map((key) => {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor.enumerable || !Object.hasOwn(descriptor, "value")) {
        throw new TypeError(`Invalid ${label} field`);
      }
      return [key, descriptor.value];
    }),
  );
  return values;
}

const clone = (value) => structuredClone(value);
const boundedText = (value) => typeof value === "string" && value.length <= 256;
const identity = (value) => typeof value === "string" && value.length > 0;
const nullableIdentity = (value) => value === null || identity(value);
const contextKey = (value) =>
  JSON.stringify([value.workspace, value.pack, value.profile]);
const entryKey = (taskId, value) => JSON.stringify([contextKey(value), taskId]);
const sameContext = (a, b) =>
  a !== null && contextFields.every((key) => a[key] === b[key]);
const byteSize = (entries) =>
  encoder.encode(JSON.stringify([...entries])).byteLength;

function cleanLimits(value) {
  const data = object(
    value,
    ["controlKeys", "maxScroll"],
    ["controlKeys", "maxScroll"],
    "view limits",
  );
  if (
    !(data.controlKeys instanceof Set || Array.isArray(data.controlKeys)) ||
    !Number.isFinite(data.maxScroll) ||
    data.maxScroll < 0
  ) {
    throw new TypeError("Invalid view limits");
  }
  const controlKeys = new Set(data.controlKeys);
  if ([...controlKeys].some((key) => !identity(key))) {
    throw new TypeError("Invalid control key");
  }
  return { controlKeys, maxScroll: data.maxScroll };
}

function emptyView() {
  return {
    query: "",
    scope: "public",
    sort: null,
    group: null,
    filters: {},
    expanded: [],
    scroll: { anchor: null, offset: 0 },
    focusKey: null,
    detail: null,
  };
}

export function createPresentationState(options) {
  const config = object(
    options,
    ["taskIds", "validateContext", "validateRecordRef"],
    ["taskIds", "validateContext", "validateRecordRef"],
    "presentation options",
  );
  if (
    !(config.taskIds instanceof Set || Array.isArray(config.taskIds)) ||
    typeof config.validateContext !== "function" ||
    typeof config.validateRecordRef !== "function"
  ) {
    throw new TypeError("Invalid presentation options");
  }
  const taskIds = new Set(config.taskIds);
  if (!taskIds.size || [...taskIds].some((id) => !identity(id))) {
    throw new TypeError("Invalid task allowlist");
  }
  let entries = new Map(),
    activeKey = null,
    currentContext = null;

  function checkTask(taskId) {
    if (!taskIds.has(taskId)) throw new TypeError("Unknown presentation task");
  }

  function checkContext(input) {
    const data = object(input, contextFields, contextFields, "view context");
    const revisionValid =
      data.revision === null ||
      identity(data.revision) ||
      (Number.isSafeInteger(data.revision) && data.revision >= 0);
    if (
      !identity(data.workspace) ||
      !nullableIdentity(data.pack) ||
      !nullableIdentity(data.profile) ||
      !nullableIdentity(data.capture) ||
      !revisionValid
    ) {
      throw new TypeError("Invalid view context identity");
    }
    let valid = false;
    try {
      valid = config.validateContext(Object.freeze({ ...data })) === true;
    } catch {
      /* An unavailable owner cannot validate a stale identity. */
    }
    if (!valid) throw new TypeError("Invalid view context identity");
    return data;
  }

  function recordValid(ref, context) {
    if (!identity(ref)) return false;
    try {
      return (
        config.validateRecordRef(ref, Object.freeze({ ...context })) === true
      );
    } catch {
      return false;
    }
  }

  function checkView(input, context, limits) {
    const data = {
      ...emptyView(),
      ...object(input, viewFields, [], "clean view"),
    };
    if (
      !boundedText(data.query) ||
      !["public", "map", "workspace"].includes(data.scope) ||
      ![data.sort, data.group].every(
        (value) => value === null || boundedText(value),
      )
    ) {
      throw new TypeError("Invalid clean view text or scope");
    }
    const control = (value) =>
      value === null || (identity(value) && limits.controlKeys.has(value));
    if (
      !Array.isArray(data.expanded) ||
      data.expanded.length > 128 ||
      new Set(data.expanded).size !== data.expanded.length ||
      data.expanded.some(
        (key) => !identity(key) || !limits.controlKeys.has(key),
      )
    ) {
      throw new TypeError("Invalid disclosure keys");
    }
    const filterKeys =
      data.filters && typeof data.filters === "object"
        ? Reflect.ownKeys(data.filters)
        : [];
    const filters = object(
      data.filters,
      [...limits.controlKeys],
      [],
      "view filters",
    );
    if (
      filterKeys.some((key) => typeof key !== "string") ||
      Object.values(filters).some(
        (value) =>
          !(
            value === null ||
            typeof value === "boolean" ||
            boundedText(value) ||
            (typeof value === "number" && Number.isFinite(value))
          ),
      )
    ) {
      throw new TypeError("Invalid filter value");
    }
    const scroll = object(
      data.scroll,
      ["anchor", "offset"],
      ["anchor", "offset"],
      "scroll view",
    );
    if (
      !control(scroll.anchor) ||
      !Number.isFinite(scroll.offset) ||
      scroll.offset < 0 ||
      !control(data.focusKey)
    ) {
      throw new TypeError("Invalid scroll or focus state");
    }
    let detail = null;
    if (data.detail !== null) {
      detail = object(
        data.detail,
        ["recordRef", "returnAnchor"],
        ["recordRef", "returnAnchor"],
        "detail return frame",
      );
      if (
        !recordValid(detail.recordRef, context) ||
        !control(detail.returnAnchor)
      ) {
        throw new TypeError("Invalid detail return identity");
      }
    }
    return {
      query: data.query,
      scope: data.scope,
      sort: data.sort,
      group: data.group,
      filters,
      expanded: [...data.expanded],
      scroll: {
        anchor: scroll.anchor,
        offset: Math.min(scroll.offset, limits.maxScroll),
      },
      focusKey: data.focusKey,
      detail,
    };
  }

  function refreshed(view, context, limits) {
    const control = (key) =>
      key !== null && limits.controlKeys.has(key) ? key : null;
    return {
      ...view,
      filters: Object.fromEntries(
        Object.entries(view.filters).filter(([key]) =>
          limits.controlKeys.has(key),
        ),
      ),
      expanded: view.expanded.filter((key) => limits.controlKeys.has(key)),
      scroll: {
        anchor: control(view.scroll.anchor),
        offset: Math.min(view.scroll.offset, limits.maxScroll),
      },
      focusKey: control(view.focusKey),
      detail:
        view.detail && recordValid(view.detail.recordRef, context)
          ? {
              recordRef: view.detail.recordRef,
              returnAnchor: control(view.detail.returnAnchor),
            }
          : null,
    };
  }

  function admission(base, protectedKey, key, entry) {
    const next = new Map(base);
    next.delete(key);
    next.set(key, entry);
    let evicted = 0,
      reduced = false;
    while (next.size > maximumEntries || byteSize(next) > maximumBytes) {
      const candidate = [...next.keys()].find(
        (candidate) => candidate !== protectedKey && candidate !== key,
      );
      if (candidate !== undefined) {
        next.delete(candidate);
        evicted++;
        continue;
      }
      if (key === protectedKey && next.get(key).view.expanded.length) {
        next.set(key, { ...entry, view: { ...entry.view, expanded: [] } });
        reduced = true;
        continue;
      }
      throw new RangeError(
        "Clean presentation state exceeds its admission budget",
      );
    }
    return { next, evicted, reduced };
  }

  function read(taskId, context, limits) {
    const key = entryKey(taskId, context),
      old = entries.get(key);
    if (!old) return null;
    const view = refreshed(old.view, context, limits);
    const planned = admission(entries, activeKey, key, {
      taskId,
      context,
      view,
    });
    entries = planned.next;
    return clone(planned.next.get(key).view);
  }

  return Object.freeze({
    activate(taskId, input, rawLimits) {
      checkTask(taskId);
      const context = checkContext(input),
        limits = cleanLimits(rawLimits);
      const compatible =
        currentContext !== null &&
        contextKey(currentContext) === contextKey(context);
      const base = compatible ? entries : new Map();
      const key = entryKey(taskId, context),
        previous = base.get(key);
      const view = previous
        ? refreshed(previous.view, context, limits)
        : emptyView();
      const planned = admission(base, key, key, { taskId, context, view });
      entries = planned.next;
      currentContext = context;
      activeKey = key;
      return clone(planned.next.get(key).view);
    },
    put(taskId, input, view, rawLimits) {
      checkTask(taskId);
      const context = checkContext(input),
        limits = cleanLimits(rawLimits);
      if (currentContext !== null && !sameContext(currentContext, context)) {
        throw new TypeError(
          "Stale presentation context; reconcile before capture",
        );
      }
      const clean = checkView(view, context, limits),
        key = entryKey(taskId, context);
      const planned = admission(entries, activeKey, key, {
        taskId,
        context,
        view: clean,
      });
      entries = planned.next;
      currentContext = context;
      return Object.freeze({
        reduced: planned.reduced,
        evicted: planned.evicted,
      });
    },
    get(taskId, input, rawLimits) {
      checkTask(taskId);
      const context = checkContext(input),
        limits = cleanLimits(rawLimits);
      return sameContext(currentContext, context)
        ? read(taskId, context, limits)
        : null;
    },
    reconcile(input, rawLimits) {
      const context = checkContext(input),
        limits = cleanLimits(rawLimits);
      if (
        currentContext === null ||
        contextKey(currentContext) !== contextKey(context)
      ) {
        entries = new Map();
        activeKey = null;
      } else if (activeKey !== null && entries.has(activeKey)) {
        const old = entries.get(activeKey);
        const view = refreshed(old.view, context, limits);
        const planned = admission(entries, activeKey, activeKey, {
          ...old,
          context,
          view,
        });
        entries = planned.next;
      }
      currentContext = context;
    },
    remove(taskId, input) {
      checkTask(taskId);
      const context = checkContext(input);
      if (!sameContext(currentContext, context)) return false;
      const key = entryKey(taskId, context),
        removed = entries.delete(key);
      if (activeKey === key) activeKey = null;
      return removed;
    },
    clear() {
      entries = new Map();
      activeKey = null;
      currentContext = null;
    },
    stats() {
      return Object.freeze({ entries: entries.size, bytes: byteSize(entries) });
    },
  });
}
