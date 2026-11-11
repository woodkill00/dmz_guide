import { test } from "node:test";
import assert from "node:assert/strict";
import { comparePrivateObservations } from "../../src/domain/armory-workspace.mjs";

const observation = (id, weapon, armor = "3 plates") => ({
  id,
  weapon,
  metric: "damage",
  value: 40,
  unit: "HP",
  mode: "dmz",
  build: "synthetic build",
  date: "2026-11-11",
  target: "synthetic target",
  armor,
  rangeMeters: 10,
  method: "synthetic method",
  firingMode: "single",
  loadoutContext: "base weapon",
});
test("DMZ measurements with different armor contexts stay incomparable", () => {
  const workspace = {
    observations: [
      observation("one", "weapon-a"),
      observation("two", "weapon-b", "no armor"),
    ],
  };
  const selection = { "weapon-a": "one", "weapon-b": "two" };
  assert.equal(
    comparePrivateObservations(
      workspace,
      ["weapon-a", "weapon-b"],
      "damage",
      selection,
    ).comparable,
    false,
  );
  workspace.observations[1].armor = "3 plates";
  assert.equal(
    comparePrivateObservations(
      workspace,
      ["weapon-a", "weapon-b"],
      "damage",
      selection,
    ).comparable,
    true,
  );
});
