import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  classifyAccess,
  mergeAccess,
  keyIdentities,
  accessLabel,
} from "../src/safe-run/access.ts";
import { extractStops } from "../src/safe-run/domain.ts";
import { parseSnapshot } from "../src/map/source-snapshot.ts";
import { gridGeometry } from "../src/map/tactical-grid.ts";
import type { MarkerSource } from "../src/map/marker-sources.ts";
const center = gridGeometry().cells.find((c) => c.reference === "D6")!.center;
const point: [number, number] = [center.x, center.y];
const stop = (notes: string, sourceId = "official") => ({
  name: "Safe: Haejeok Radio Station",
  notes,
  point,
  sourceId,
  sourcePage: "https://example.test/map",
  capturedAt: "2026-11-04T00:00:00Z",
});
const catalog = keyIdentities([
  {
    id: "haejeok-radio-station",
    name: "Haejeok Radio Station",
    aliases: ["Station Room"],
    locations: [{ grid: "D6" }],
  },
]);
test("064 explicit keyed room gets source-reported access and matching named key at same grid", () => {
  const a = classifyAccess(
    stop(
      "Handprint safe at the back of the server room; needs the station key.",
    ),
    catalog,
  );
  assert.equal(a.state, "key-required");
  assert.deepEqual(a.keys, [
    { id: "haejeok-radio-station", name: "Haejeok Radio Station" },
  ]);
  assert.match(a.reports[0].evidence, /needs the station key/);
  assert.match(accessLabel(a), /source-reported/);
});
test("064 key door, required/needed keycard and explicitly locked room are differentiated", () => {
  for (const notes of [
    "Behind the Haejeok Radio Station key door.",
    "A key is required.",
    "Access card needed.",
    "This needs an access card.",
  ])
    assert.equal(classifyAccess(stop(notes), catalog).state, "key-required");
  assert.equal(
    classifyAccess(stop("Inside a locked room."), catalog).state,
    "locked",
  );
  assert.equal(
    classifyAccess(stop("Inside a locked room."), catalog).keys.length,
    0,
  );
});
test("064 puzzle bank vault is gated without inventing a key requirement", () => {
  const a = classifyAccess(
    stop("Bank vault: solve the puzzle to open it. It holds 2 safes."),
    catalog,
  );
  assert.equal(a.state, "puzzle");
  assert.equal(a.keys.length, 0);
  assert.match(accessLabel(a), /Puzzle-gated vault/);
  assert.equal(
    classifyAccess(
      stop("Bank vault: solve the puzzle to open it. No key needed."),
      catalog,
    ).state,
    "puzzle",
  );
});
test("064 negation, uncertainty, key drops and ordinary rooms stay unknown rather than unlocked", () => {
  for (const text of [
    "No key needed.",
    "Key is not required.",
    "This does not require a key.",
    "This doesn’t need the key.",
    "Without any key.",
    "Not behind a locked door.",
    "Possible safe in a locked room.",
    "It might require a key.",
    "The room is unlocked.",
    "A Haejeok Radio Station key may drop here.",
    "Key found in this room.",
    "No puzzle needed.",
    "A safe beside a green door.",
    "An opened safe.",
    "",
  ]) {
    const a = classifyAccess(stop(text), catalog);
    assert.equal(a.state, "unknown", text);
    assert.equal(a.keys.length, 0, text);
  }
});
test("064 same grid/proximity or name alone cannot link a key; wrong grid suppresses link only", () => {
  const unnamed = {
    ...stop("Needs a key."),
    name: "Safe in a nearby building",
  };
  assert.equal(classifyAccess(unnamed, catalog).keys.length, 0);
  assert.equal(
    classifyAccess(stop("Normal office safe."), catalog).keys.length,
    0,
  );
  assert.equal(
    classifyAccess({ ...stop("Needs a key."), point: [10, 10] }, catalog).keys
      .length,
    0,
  );
  assert.equal(
    classifyAccess(stop("Needs a key."), [{ ...catalog[0], grids: [] }]).keys
      .length,
    0,
  );
  assert.equal(
    classifyAccess(
      { ...stop("Needs a key."), name: "NotHaejeok Radio StationPlus" },
      catalog,
    ).keys.length,
    0,
  );
});
test("064 key drops outside requirement clauses cannot be mistaken for required key identity", () => {
  const a = classifyAccess(
    {
      ...stop("A key is required. Haejeok Radio Station key found inside."),
      name: "Safe: Unknown room",
    },
    catalog,
  );
  assert.equal(a.state, "key-required");
  assert.equal(a.keys.length, 0);
});
test("064 grouped positive and negative reports preserve disagreement and source evidence", () => {
  const yes = classifyAccess(stop("Needs a key."), catalog),
    no = classifyAccess(stop("No key needed.", "other"), catalog),
    merged = mergeAccess([yes, no]);
  assert.equal(merged.state, "conflict");
  assert.equal(merged.reports.length, 2);
  assert.equal(merged.keys.length, 1);
  assert.match(accessLabel(merged), /Conflicting/);
  assert.equal(
    mergeAccess([
      classifyAccess(stop("Inside a locked room.")),
      classifyAccess(stop("The room is unlocked.", "other")),
    ]).state,
    "conflict",
  );
  assert.equal(
    mergeAccess([yes, classifyAccess(stop("The safe is unlocked.", "other"))])
      .state,
    "key-required",
  );
  assert.throws(
    () => mergeAccess(Array.from({ length: 6 }, () => yes)),
    /Too many/,
  );
});
test("064 shared display grouping preserves suppressed access requirement and conflict; fresh extraction clears stale requirements", () => {
  const src = (id: string): MarkerSource => ({
    id,
    name: id,
    website: "example.test",
    page: "https://example.test/map",
    snapshot: "/local.json",
    iconDirectory: "/icons/",
    recordLink: () => "",
    labelCategories: {},
  });
  const snapshot = (notes: string) => ({
    schemaVersion: 1,
    sourcePage: "https://example.test/map",
    capturedAt: "2026-11-04T00:00:00Z",
    categories: [
      { id: "safe", name: "Safes", group: "Loot", icon: "/icons/safe.png" },
    ],
    records: [
      {
        id: "a",
        name: "Safe: Haejeok Radio Station",
        category: "safe",
        mapId: "hajin",
        coordinateSpaceVersion: "hajin-official-v1-4096",
        x: point[0] / 4096,
        y: point[1] / 4096,
        notes,
      },
    ],
  });
  const make = (id: string, notes: string) => ({
    source: src(id),
    snapshot: parseSnapshot(snapshot(notes), src(id)),
  });
  const merged = extractStops(
    [
      make("official", "Safe in an office."),
      make("other", "Needs the station key."),
    ],
    catalog,
  );
  assert.equal(merged.safes.length, 1);
  assert.equal(merged.safes[0].access!.state, "key-required");
  assert.equal(merged.safes[0].access!.reports[0].sourceId, "other");
  assert.equal(
    extractStops(
      [
        make("official", "No key needed."),
        make("other", "Needs the station key."),
      ],
      catalog,
    ).safes[0].access!.state,
    "conflict",
  );
  assert.equal(
    extractStops([make("official", "Safe in an office.")], catalog).safes[0]
      .access!.state,
    "unknown",
  );
});
test("064 public catalog metadata bounds reject unsafe IDs, duplicate IDs and oversized arrays", () => {
  const key = {
    id: "a",
    name: "Synthetic",
    aliases: [],
    locations: [{ grid: "Unknown" }],
  };
  assert.deepEqual(keyIdentities([key])[0].grids, []);
  assert.throws(() => keyIdentities([{ ...key, id: "../unsafe" }]));
  assert.throws(() => keyIdentities([key, key]));
  assert.throws(() => keyIdentities(Array.from({ length: 129 }, () => key)));
  assert.throws(() =>
    keyIdentities([{ ...key, aliases: Array.from({ length: 17 }, () => "a") }]),
  );
});
test("064 unrelated key loot, adjacent locked rooms and other-place requirements never mark this safe red", () => {
  for (const text of [
    "Drops a key required for Haejeok Radio Station.",
    "Safe is beside a locked room.",
    "Key needed for a different building.",
    "Needs a key for another room.",
    "Mission requires a key.",
    "Requires luck to find the key.",
    "Key required for Haejeok Radio Station.",
    "Safe outside a locked vault.",
  ]) {
    const a = classifyAccess(
      { ...stop(text), name: "Safe: Unknown room" },
      catalog,
    );
    assert.equal(a.state, "unknown", text);
    assert.equal(a.keys.length, 0, text);
  }
});
test("064 only scoped entry denials create conflicts, including named-key denial", () => {
  const yes = classifyAccess(stop("Needs the station key."), catalog);
  for (const text of [
    "Cannot enter without a key.",
    "No access without a key.",
    "Can't enter without a key.",
    "Not able to enter without a key.",
  ]) {
    const unsupported = classifyAccess(stop(text, "other"), catalog);
    assert.equal(unsupported.state, "unknown", text);
    assert.equal(mergeAccess([yes, unsupported]).state, "key-required", text);
  }
  assert.equal(
    mergeAccess([
      yes,
      classifyAccess(stop("No key drops here.", "other"), catalog),
    ]).state,
    "key-required",
  );
  const denial = classifyAccess(
    stop("Does not require the Haejeok Radio Station key.", "other"),
    catalog,
  );
  assert.equal(denial.reports[0].deniesKey, true);
  assert.equal(mergeAccess([yes, denial]).state, "conflict");
  assert.equal(
    mergeAccess([
      yes,
      classifyAccess(
        stop("You can enter without the station key.", "other"),
        catalog,
      ),
    ]).state,
    "conflict",
  );
});
test("064 existing public key catalog validates without Node-only browser validators", () => {
  const read = (name: string) =>
    JSON.parse(
      readFileSync(new URL("../../../src/ui/" + name, import.meta.url), "utf8"),
    ).keys;
  const keys = keyIdentities([
    ...read("keys.json"),
    ...read("key-supplemental.json"),
  ]);
  assert.ok(
    keys.find((k) => k.id === "haejeok-radio-station")!.grids.includes("D6"),
  );
  assert.ok(
    keys.find((k) => k.id === "hoesik-supply-room")!.grids.includes("D8"),
  );
});
