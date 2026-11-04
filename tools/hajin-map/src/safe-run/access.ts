import { gridReferenceAt } from "../map/tactical-grid.ts";
import { requireValue, type XY } from "../workspace/roads.ts";

export interface KeyIdentity {
  id: string;
  name: string;
  aliases: string[];
  grids: string[];
}
export interface AccessReport {
  sourceId: string;
  page: string;
  capturedAt: string;
  kinds: ("key" | "locked" | "puzzle")[];
  deniesKey: boolean;
  openAccess: boolean;
  evidence: string;
  keys: { id: string; name: string }[];
}
export interface SafeAccess {
  state: "unknown" | "key-required" | "locked" | "puzzle" | "conflict";
  keys: { id: string; name: string }[];
  reports: AccessReport[];
}
export const unknownAccess = (): SafeAccess => ({
  state: "unknown",
  keys: [],
  reports: [],
});
const normalize = (s: string) =>
  s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
export function keyIdentities(rows: unknown[]): KeyIdentity[] {
  requireValue(rows.length <= 128, "Too many guide keys.");
  const ids = new Set<string>();
  return rows.map((raw) => {
    const r = raw as {
      id: string;
      name: string;
      aliases: string[];
      locations: { grid: string }[];
    };
    requireValue(
      r &&
        typeof r.id === "string" &&
        r.id.length <= 128 &&
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(r.id) &&
        !ids.has(r.id) &&
        typeof r.name === "string" &&
        r.name.length > 0 &&
        r.name.length <= 200,
      "Invalid guide key identity.",
    );
    ids.add(r.id);
    requireValue(
      Array.isArray(r.aliases) &&
        r.aliases.length <= 16 &&
        r.aliases.every(
          (a) => typeof a === "string" && a.length > 0 && a.length <= 200,
        ) &&
        Array.isArray(r.locations) &&
        r.locations.length <= 32 &&
        r.locations.every(
          (l) => l && typeof l.grid === "string" && l.grid.length <= 80,
        ),
      "Invalid key aliases or grids.",
    );
    return {
      id: r.id,
      name: r.name,
      aliases: [...r.aliases],
      grids: r.locations
        .map((l) => l.grid)
        .filter((g) => /^[A-J][1-9]$/.test(g)),
    };
  });
}
const tentative =
  /\b(?:possible|possibly|may|might|maybe|unconfirmed|not confirmed|unknown|unclear|not sure)\b/i;
// Unsupported double negatives must not become a claim of keyless entry.
const doubleNegative =
  /\b(?:cannot|can't|can’t|unable|not able|no|not)\b[^.!?;\n]{0,100}\bwithout\b/i;
const keyTerm = String.raw`(?:[\p{L}\p{N}'’-]+\s+){0,12}(?:key|keycard|access card)`;
const deniesKey = new RegExp(
  String.raw`\b(?:no\s+${keyTerm}\s+(?:is\s+)?(?:needed|required|necessary)|${keyTerm}\s+(?:is\s+)?not\s+(?:needed|required|necessary)|(?:does not|doesn't|doesn’t)\s+(?:need|require)\s+${keyTerm}|(?:enter|access|open|unlock|reach)\b[^.!?;\n]{0,60}\bwithout\s+${keyTerm})\b`,
  "iu",
);
// Only entry/inside evidence is useful here. Mentions of key loot, adjacent
// rooms, missions or requirements for another place must stay unclassified.
const unrelated =
  /\b(?:drops?|dropped|dropping|spawns?|find|found|finding|loot|rewards?|buy|purchase|obtain|mission|order|task|quest|recipe|craft|crafting|upgrade)\b|\b(?:different|another|other)\s+(?:building|room|safe|door|location)\b|\b(?:beside|near|nearby|outside|opposite|adjacent|next to|across from|in front of)\b[^.!?;\n]{0,80}\b(?:locked|key|vault|room)\b|\b(?:key|keycard|access card)\s+(?:(?:is\s+)?(?:needed|required)\s+)?for\s+(?!entry\b|access\b|this\s+(?:safe|room|door|vault)\b|the\s+(?:safe|room|door|vault)\b)/i;
const openAccess =
  /\b(?:room|door|vault)\s+(?:is\s+)?(?:unlocked|not locked|isn't locked|isn’t locked)\b|\b(?:unlocked|open[- ]access)\s+(?:room|door|vault)\b|\bopen access\b|\bnot behind a locked door\b/i;
const negated =
  /\b(?:no|not|never|without|doesn't|does not|doesn’t|isn't|is not|isn’t)\b/i;
const keyRequired =
  /\b(?:requires?|needs?)\s+(?:(?:the|a|an)\s+)?[^.!?;\n]{0,100}\b(?:key|keycard|access card)\b|\bbehind\b[^.!?;\n]{0,100}\bkey\s+door\b|\b(?:key|keycard|access card)\s+(?:is\s+)?(?:required|needed)\b|\bkey[- ]locked\s+(?:room|door|vault)\b/i;
const roomLocked =
  /\b(?:inside|within|in|behind)\s+(?:(?:a|the|an)\s+)?locked\s+(?:room|door|vault)\b/i;
const puzzleVault =
  /\bbank vault\b[^.!?;\n]{0,160}\b(?:puzzle|code)\b|\b(?:solve|complete)\b[^.!?;\n]{0,100}\bpuzzle\b[^.!?;\n]{0,100}\b(?:open|unlock)\b/i;
export function classifyAccess(
  stop: {
    name: string;
    notes: string;
    point: XY;
    sourceId: string;
    sourcePage: string;
    capturedAt: string;
  },
  catalog: readonly KeyIdentity[] = [],
): SafeAccess {
  const kinds = new Set<AccessReport["kinds"][number]>(),
    positive: string[] = [],
    denials: string[] = [];
  let noKey = false,
    open = false;
  for (const clause of stop.notes
    .split(/[.!?;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean)) {
    if (
      tentative.test(clause) ||
      unrelated.test(clause) ||
      doubleNegative.test(clause)
    )
      continue;
    if (deniesKey.test(clause)) {
      noKey = true;
      denials.push(clause);
    }
    if (openAccess.test(clause)) {
      open = true;
      denials.push(clause);
    }
    if (negated.test(clause)) continue;
    let found = false;
    if (keyRequired.test(clause)) {
      kinds.add("key");
      found = true;
    }
    if (roomLocked.test(clause)) {
      kinds.add("locked");
      found = true;
    }
    if (puzzleVault.test(clause)) {
      kinds.add("puzzle");
      found = true;
    }
    if (found) positive.push(clause);
  }
  if (!kinds.size && !noKey && !open) return unknownAccess();
  const context = " " + normalize(stop.name + " " + positive.join(" ")) + " ",
    grid = gridReferenceAt(...stop.point);
  const keys = kinds.has("key")
    ? catalog
        .filter(
          (k) =>
            grid &&
            k.grids.includes(grid) &&
            [k.name, ...k.aliases].some((n) =>
              context.includes(" " + normalize(n) + " "),
            ),
        )
        .map((k) => ({ id: k.id, name: k.name }))
    : [];
  return mergeAccess([
    {
      state: "unknown",
      keys: [],
      reports: [
        {
          sourceId: stop.sourceId,
          page: stop.sourcePage,
          capturedAt: stop.capturedAt,
          kinds: [...kinds],
          deniesKey: noKey,
          openAccess: open,
          evidence: [...new Set([...positive, ...denials])]
            .join(". ")
            .slice(0, 1000),
          keys,
        },
      ],
    },
  ]);
}
export function mergeAccess(values: readonly SafeAccess[]): SafeAccess {
  const reports = values.flatMap((v) => v.reports);
  requireValue(reports.length <= 5, "Too many grouped access reports.");
  const kinds = new Set(reports.flatMap((r) => r.kinds)),
    conflict =
      (kinds.has("key") && reports.some((r) => r.deniesKey)) ||
      (kinds.size > 0 && reports.some((r) => r.openAccess));
  const keys = [
    ...new Map(reports.flatMap((r) => r.keys).map((k) => [k.id, k])).values(),
  ];
  return {
    state: conflict
      ? "conflict"
      : kinds.has("key")
        ? "key-required"
        : kinds.has("locked")
          ? "locked"
          : kinds.has("puzzle")
            ? "puzzle"
            : "unknown",
    keys,
    reports,
  };
}
export function accessLabel(access: SafeAccess): string {
  return {
    unknown: "Access not recorded",
    "key-required": "Key required · source-reported",
    locked: "Locked room · source-reported",
    puzzle: "Puzzle-gated vault · source-reported",
    conflict: "Conflicting access reports",
  }[access.state];
}
