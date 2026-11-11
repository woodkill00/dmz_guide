import { readRecord, commitRecord } from "../storage/store.mjs";

const MAX_PLANS = 8;
const MAX_REFS = 32;
const MAX_STOPS = 64;
const MAX_RESERVATIONS = 64;
const validId = (value) =>
  typeof value === "string" &&
  value.length > 0 &&
  value.length <= 120 &&
  /^[a-zA-Z0-9:._-]+$/.test(value);
const integer = (value, max) =>
  Number.isSafeInteger(value) && value >= 0 && value <= max;
const plain = (value) =>
  value && typeof value === "object" && !Array.isArray(value);
function check(condition, message) {
  if (!condition) throw new Error(message);
}

export function emptyRunPlans(pack) {
  return {
    kind: "dmz-run-plans",
    version: 1,
    packId: pack.id,
    contentVersion: pack.contentVersion,
    revision: 0,
    plans: [],
  };
}

export function validateRunPlans(doc) {
  check(plain(doc), "Invalid run plans");
  check(
    doc.kind === "dmz-run-plans" && doc.version === 1,
    "Unsupported run-plan format",
  );
  check(validId(doc.packId), "Invalid run-plan pack");
  check(
    typeof doc.contentVersion === "string" && doc.contentVersion.length <= 120,
    "Invalid run-plan content version",
  );
  check(
    integer(doc.revision, Number.MAX_SAFE_INTEGER),
    "Invalid run-plan revision",
  );
  check(
    Array.isArray(doc.plans) && doc.plans.length <= MAX_PLANS,
    "Too many run plans",
  );
  const ids = new Set();
  for (const plan of doc.plans) {
    check(
      plain(plan) && validId(plan.id) && !ids.has(plan.id),
      "Invalid or duplicate plan ID",
    );
    ids.add(plan.id);
    check(
      typeof plan.name === "string" &&
        plan.name.trim().length > 0 &&
        plan.name.length <= 80,
      "Invalid plan name",
    );
    check(
      /^\d{4}-\d{2}-\d{2}$/.test(plan.date) &&
        !Number.isNaN(Date.parse(`${plan.date}T00:00:00Z`)) &&
        new Date(`${plan.date}T00:00:00Z`).toISOString().slice(0, 10) ===
          plan.date,
      "Invalid plan date",
    );
    check(
      Array.isArray(plan.objectives) && plan.objectives.length <= MAX_REFS,
      "Too many plan objectives",
    );
    const objectives = new Set();
    for (const ref of plan.objectives) {
      check(
        plain(ref) &&
          ["mission", "upgrade", "objective", "item", "key"].includes(
            ref.type,
          ) &&
          validId(ref.id),
        "Invalid plan objective",
      );
      const key = `${ref.type}:${ref.id}`;
      check(!objectives.has(key), "Duplicate plan objective");
      objectives.add(key);
    }
    check(
      Array.isArray(plan.stops) && plan.stops.length <= MAX_STOPS,
      "Too many plan stops",
    );
    check(
      plan.stops.every((stop) => validId(stop)),
      "Invalid plan stop",
    );
    check(
      new Set(plan.stops).size === plan.stops.length,
      "Duplicate plan stop",
    );
    check(
      plain(plan.reservations) &&
        Object.keys(plan.reservations).length <= MAX_RESERVATIONS,
      "Too many plan reservations",
    );
    for (const [id, amount] of Object.entries(plan.reservations))
      check(
        validId(id) && integer(amount, 2000000),
        "Invalid plan reservation",
      );
  }
  return doc;
}

export function addRunPlan(doc, plan) {
  validateRunPlans(doc);
  const next = structuredClone(doc);
  next.plans.push(plan);
  return validateRunPlans(next);
}

export function moveRunPlan(doc, id, direction) {
  validateRunPlans(doc);
  check(direction === -1 || direction === 1, "Invalid plan move");
  const next = structuredClone(doc);
  const from = next.plans.findIndex((plan) => plan.id === id);
  check(from >= 0, "Plan not found");
  const to = from + direction;
  if (to < 0 || to >= next.plans.length) return next;
  [next.plans[from], next.plans[to]] = [next.plans[to], next.plans[from]];
  return next;
}

export function evaluateRunReadiness(
  doc,
  profile,
  currentContentVersion = doc.contentVersion,
) {
  validateRunPlans(doc);
  check(
    plain(profile) && profile.packId === doc.packId,
    "Plan/profile pack mismatch",
  );
  const stale =
    profile.contentVersion !== doc.contentVersion ||
    currentContentVersion !== doc.contentVersion;
  const allocated = new Map();
  const rows = doc.plans.map((plan) => {
    const reservations = Object.entries(plan.reservations).map(
      ([id, requested]) => {
        const stock = profile.inventory?.[id];
        const carried = profile.fieldOps?.carried?.[id] ?? 0;
        const protectedStock = profile.reserves?.[id] ?? 0;
        const known =
          integer(stock, 2000000) &&
          integer(carried, 2000000) &&
          integer(protectedStock, 2000000);
        const available = known
          ? Math.max(
              0,
              stock + carried - protectedStock - (allocated.get(id) || 0),
            )
          : null;
        const covered =
          available === null ? null : Math.min(requested, available);
        if (covered !== null)
          allocated.set(id, (allocated.get(id) || 0) + covered);
        return {
          id,
          requested,
          available,
          covered,
          missing: covered === null ? null : requested - covered,
          status:
            stale || covered === null
              ? "unknown"
              : covered < requested
                ? "short"
                : "covered",
        };
      },
    );
    return { id: plan.id, name: plan.name, reservations };
  });
  return { stale, rows };
}

const storageKey = (packId) => `run-plans:${packId}`;
export async function loadRunPlans(pack) {
  const stored = await readRecord("content", storageKey(pack.id));
  if (!stored) return emptyRunPlans(pack);
  const doc = validateRunPlans(stored.value);
  check(doc.packId === pack.id, "Saved plan pack mismatch");
  return doc;
}
export async function saveRunPlans(doc, expectedRevision) {
  validateRunPlans(doc);
  return commitRecord(
    "content",
    storageKey(doc.packId),
    doc,
    expectedRevision,
    { keepPrevious: true },
  );
}
