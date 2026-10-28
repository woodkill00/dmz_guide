import type { VisibilityState } from "./types.ts";
import { validateJsonTree } from "./validation.ts";
import { sourcePolicies } from "./policy.ts";
export interface Usability {
  version: 1;
  presets: { id: string; name: string; visibility: VisibilityState }[];
  separate: { a: string; b: string; at: string }[];
  flags: {
    id: string;
    recordIdentity: string;
    notes: string;
    status: "open" | "resolved";
    authorship: "owned";
    createdAt: string;
    updatedAt: string;
  }[];
  edits: number;
}
export const emptyUsability = (): Usability => ({
  version: 1,
  presets: [],
  separate: [],
  flags: [],
  edits: 0,
});
function check(ok: unknown, message: string): asserts ok {
  if (!ok) throw new Error(message);
}
function shape(
  v: unknown,
  keys: string[],
): asserts v is Record<string, unknown> {
  check(
    !!v &&
      typeof v === "object" &&
      !Array.isArray(v) &&
      Object.keys(v).length === keys.length &&
      keys.every((k) => Object.hasOwn(v, k)),
    "Invalid usability fields.",
  );
}
const text = (v: unknown, max: number) =>
  typeof v === "string" && v.length <= max && !!v.trim();
const date = (v: unknown) =>
  typeof v === "string" &&
  v.length <= 40 &&
  Number.isFinite(Date.parse(v)) &&
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(v) &&
  (new Date(v).toISOString() === v ||
    new Date(v).toISOString().replace(".000Z", "Z") === v);
export function captureIdentity(
  source: string,
  snapshot: string,
  digest: string,
  record: string,
) {
  check(
    Object.hasOwn(sourcePolicies, source) &&
      text(snapshot, 128) &&
      /^[a-f0-9]{64}$/.test(digest) &&
      text(record, 128),
    "Invalid capture identity.",
  );
  return JSON.stringify([source, snapshot, digest, record]);
}
export function parseIdentity(value: unknown): string[] {
  check(text(value, 512), "Invalid capture reference.");
  const parts = JSON.parse(value as string);
  check(
    Array.isArray(parts) &&
      parts.length === 4 &&
      parts.every((p) => typeof p === "string"),
    "Invalid capture reference.",
  );
  check(
    captureIdentity(parts[0], parts[1], parts[2], parts[3]) === value,
    "Invalid capture reference.",
  );
  return parts;
}
export const pairKey = (a: string, b: string) => JSON.stringify([a, b].sort());
export function validateView(v: unknown): asserts v is VisibilityState {
  shape(v, [
    "sourceEnabled",
    "categoryMask",
    "curatedEnabled",
    "customEnabled",
    "query",
  ]);
  check(
    typeof v.curatedEnabled === "boolean" &&
      typeof v.customEnabled === "boolean" &&
      typeof v.query === "string" &&
      v.query.length <= 200,
    "Invalid saved view.",
  );
  for (const key of ["sourceEnabled", "categoryMask"])
    check(
      !!v[key] && typeof v[key] === "object" && !Array.isArray(v[key]),
      "Invalid saved masks.",
    );
  for (const [s, on] of Object.entries(v.sourceEnabled as object))
    check(
      Object.hasOwn(sourcePolicies, s) && typeof on === "boolean",
      "Invalid saved source.",
    );
  for (const [s, mask] of Object.entries(v.categoryMask as object)) {
    check(
      Object.hasOwn(sourcePolicies, s) &&
        !!mask &&
        typeof mask === "object" &&
        !Array.isArray(mask) &&
        Object.keys(mask).length <= 100,
      "Invalid saved category masks.",
    );
    for (const [id, on] of Object.entries(mask))
      check(
        text(id, 128) &&
          !["__proto__", "constructor", "prototype"].includes(id) &&
          typeof on === "boolean",
        "Invalid saved category.",
      );
  }
}
export function validateUsability(value: unknown): asserts value is Usability {
  validateJsonTree(value);
  shape(value, ["version", "presets", "separate", "flags", "edits"]);
  check(
    value.version === 1 &&
      Number.isSafeInteger(value.edits) &&
      (value.edits as number) >= 0,
    "Invalid usability version or counter.",
  );
  for (const [key, cap] of [
    ["presets", 20],
    ["separate", 200],
    ["flags", 200],
  ] as const)
    check(
      Array.isArray(value[key]) && value[key].length <= cap,
      `Too many ${key}.`,
    );
  const presets = value.presets as Usability["presets"],
    separate = value.separate as Usability["separate"],
    flags = value.flags as Usability["flags"];
  check(
    new Set(presets.map((p) => p.id)).size === presets.length,
    "Duplicate saved view.",
  );
  for (const p of presets) {
    shape(p, ["id", "name", "visibility"]);
    check(text(p.id, 128) && text(p.name, 80), "Invalid saved view name.");
    validateView(p.visibility);
  }
  const pairs = new Set<string>();
  for (const p of separate) {
    shape(p, ["a", "b", "at"]);
    const a = parseIdentity(p.a),
      b = parseIdentity(p.b),
      key = pairKey(p.a, p.b);
    check(
      a[0] !== b[0] && date(p.at) && !pairs.has(key),
      "Invalid separate decision.",
    );
    pairs.add(key);
  }
  const ids = new Set<string>(),
    refs = new Set<string>();
  for (const f of flags) {
    shape(f, [
      "id",
      "recordIdentity",
      "notes",
      "status",
      "authorship",
      "createdAt",
      "updatedAt",
    ]);
    parseIdentity(f.recordIdentity);
    check(
      text(f.id, 128) &&
        text(f.notes, 4000) &&
        ["open", "resolved"].includes(f.status) &&
        f.authorship === "owned" &&
        date(f.createdAt) &&
        date(f.updatedAt) &&
        !ids.has(f.id) &&
        !refs.has(f.recordIdentity),
      "Invalid private discrepancy.",
    );
    ids.add(f.id);
    refs.add(f.recordIdentity);
  }
}
export function savePreset(
  s: Usability,
  name: string,
  visibility: VisibilityState,
) {
  check(text(name, 80), "Name your view using at most80 characters.");
  check(s.presets.length < 20, "Saved view limit20 reached.");
  validateView(visibility);
  s.presets.push({
    id: crypto.randomUUID(),
    name: name.trim(),
    visibility: structuredClone(visibility),
  });
}
export function keepSeparate(s: Usability, a: string, others: string[]) {
  const proposed = structuredClone(s);
  for (const b of others) {
    if (!proposed.separate.some((p) => pairKey(p.a, p.b) === pairKey(a, b)))
      proposed.separate.push({ a, b, at: new Date().toISOString() });
  }
  validateUsability(proposed);
  s.separate = proposed.separate;
}
export function saveFlag(
  s: Usability,
  recordIdentity: string,
  notes: string,
  owned: boolean,
) {
  parseIdentity(recordIdentity);
  check(
    owned && text(notes, 4000),
    "Enter your own observation (at most4,000 characters) and confirm authorship.",
  );
  const at = new Date().toISOString(),
    old = s.flags.find((f) => f.recordIdentity === recordIdentity);
  if (old) {
    old.notes = notes.trim();
    old.updatedAt = at;
    return;
  }
  check(s.flags.length < 200, "Private discrepancy limit200 reached.");
  s.flags.push({
    id: crypto.randomUUID(),
    recordIdentity,
    notes: notes.trim(),
    status: "open",
    authorship: "owned",
    createdAt: at,
    updatedAt: at,
  });
}
export function isMeaningfulMutation(label: string) {
  return (
    !/^(Search saved|Layer visibility saved|Source visibility saved|Category visibility saved|Source masks saved|Source categories shown|Source categories hidden|All source categories shown|All source categories hidden|All layers shown|All layers hidden|Legacy source masks migrated|Saved view visibility applied)$/.test(
      label,
    ) &&
    !label.startsWith("Backup restored") &&
    label !== "New empty workspace created"
  );
}
export interface Receipt {
  version: 1;
  at: string | null;
  edits: number;
  firstDirtyAt: string | null;
  snoozedUntil: string | null;
}
export const RECEIPT_KEY = "hajin.map.backup-receipt.v1";
export function readReceipt(
  storage: Pick<Storage, "getItem">,
  now = Date.now(),
): Receipt | null {
  try {
    const raw = storage.getItem(RECEIPT_KEY);
    if (!raw || raw.length > 4096) return null;
    const v = JSON.parse(raw);
    shape(v, ["version", "at", "edits", "firstDirtyAt", "snoozedUntil"]);
    check(
      v.version === 1 &&
        Number.isSafeInteger(v.edits) &&
        (v.edits as number) >= 0 &&
        [v.at, v.firstDirtyAt, v.snoozedUntil].every(
          (t) => t === null || date(t),
        ) &&
        [v.at, v.firstDirtyAt].every(
          (t) => t === null || Date.parse(t as string) <= now + 300000,
        ) &&
        (v.snoozedUntil === null ||
          Date.parse(v.snoozedUntil as string) <= now + 86400000),
      "Invalid backup receipt.",
    );
    return v as unknown as Receipt;
  } catch {
    return null;
  }
}
export function writeReceipt(
  storage: Pick<Storage, "setItem">,
  receipt: Receipt,
) {
  try {
    storage.setItem(RECEIPT_KEY, JSON.stringify(receipt));
    return true;
  } catch {
    return false;
  }
}
export function reminderStatus(
  edits: number,
  receipt: Receipt | null,
  now = Date.now(),
) {
  const changes = Math.max(0, edits - (receipt?.edits ?? 0)),
    anchor = receipt?.at ?? receipt?.firstDirtyAt;
  const aged = !!anchor && now - Date.parse(anchor) >= 7 * 86400000;
  return {
    changes,
    due:
      changes > 0 &&
      (changes >= 20 || aged) &&
      !(receipt?.snoozedUntil && Date.parse(receipt.snoozedUntil) > now),
    last: receipt?.at ?? null,
  };
}
