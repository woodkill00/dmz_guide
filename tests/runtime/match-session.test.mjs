import test from "node:test";
import assert from "node:assert/strict";
import { loadFixturePack } from "../helpers/catalog.mjs";
import { newProfile } from "../../src/domain/profile.mjs";
import {
  startMatchSession,
  previewMatchSession,
  previewMatchUndo,
} from "../../src/domain/match-session.mjs";
import { journalInventory } from "../../src/domain/field-ops-state.mjs";

const pack = loadFixturePack("official-starter");

test("named match previews stock and objective completion without changing the saved snapshot", () => {
  const profile = newProfile(pack);
  profile.inventory["mw4:bandage"] = 2;
  const before = structuredClone(profile);
  const objective = pack.objectives.find(
    (row) => !row.spoiler && row.track === "dmz-order",
  );
  const session = startMatchSession(pack, profile, "Hajin test run");
  const result = previewMatchSession(
    pack,
    profile,
    session,
    [{ itemId: "mw4:bandage", pool: "stash", mode: "delta", quantity: 3 }],
    [{ id: objective.id, status: "completed" }],
    ["A1 safe"],
  );
  assert.equal(result.candidate.inventory["mw4:bandage"], 5);
  assert.equal(result.candidate.completion[objective.id], "completed");
  assert.deepEqual(profile, before);
  assert.deepEqual(result.stops, ["A1 safe"]);
  assert.equal(result.candidate.fieldOps.matches[0].stops[0], "A1 safe");
  assert.equal(result.candidate.fieldOps.matches[0].stockEventId, session.id);
  const saved = journalInventory(profile, result.candidate, {
    kind: "run",
    entryId: session.id,
    label: "Match",
  });
  const undo = previewMatchUndo(pack, saved, session.id);
  assert.equal(undo.candidate.inventory["mw4:bandage"], 2);
  assert.equal(undo.candidate.completion[objective.id], "unknown");
  assert(undo.candidate.fieldOps.matches[0].undoneAt);
  assert.throws(
    () => previewMatchUndo(pack, undo.candidate, session.id),
    /already undone/,
  );
  assert.throws(
    () =>
      previewMatchSession(pack, { ...profile, revision: 1 }, session, [], []),
    /stale/,
  );
  assert.throws(
    () =>
      previewMatchSession(
        pack,
        profile,
        session,
        [],
        [{ id: "missing", status: "completed" }],
      ),
    /unavailable/,
  );
  assert.deepEqual(profile, before);
});

test("match binds a saved plan revision and refuses undo after later stock edits", () => {
  const profile = newProfile(pack);
  profile.inventory["mw4:bandage"] = 2;
  const session = startMatchSession(
    pack,
    profile,
    "Planned run",
    { id: "run:one" },
    4,
  );
  const preview = previewMatchSession(
    pack,
    profile,
    session,
    [{ itemId: "mw4:bandage", pool: "stash", mode: "delta", quantity: 1 }],
    [],
    ["Clinic"],
  );
  assert.equal(preview.candidate.fieldOps.matches[0].planId, "run:one");
  assert.equal(preview.candidate.fieldOps.matches[0].planRevision, 4);
  const saved = journalInventory(profile, preview.candidate, {
    kind: "run",
    entryId: session.id,
  });
  saved.inventory["mw4:bandage"] = 10;
  assert.throws(() => previewMatchUndo(pack, saved, session.id), /Later edits/);
});

test("match preview reads an upgrade's true completion state", () => {
  const profile = newProfile(pack);
  const upgrade = pack.objectives.find(
    (row) => row.track === "dmz-upgrade" && !row.spoiler,
  );
  const session = startMatchSession(pack, profile, "Upgrade check");
  const result = previewMatchSession(
    pack,
    profile,
    session,
    [],
    [{ id: upgrade.id, status: "completed" }],
  );
  assert.equal(result.progress[0].before, "unknown");
  assert.equal(result.progress[0].after, "completed");
  assert.equal(profile.upgradeProgress[upgrade.id], undefined);
});
