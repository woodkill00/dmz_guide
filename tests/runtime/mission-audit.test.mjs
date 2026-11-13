import test from "node:test";
import assert from "node:assert/strict";
import {
  missionAuditTargets,
  validateMissionAudit,
} from "../../src/domain/mission-audit.mjs";

test("empty catalog creates 24 unrecorded page targets and no fictional missions", () => {
  const targets = missionAuditTargets({ id: "synthetic:test", objectives: [] });
  assert.equal(targets.length, 24);
  assert.ok(
    targets.every((target) => target.kind === "page" && !target.recorded),
  );
});

test("recorded story and Order sections keep independent stable IDs", () => {
  const pack = {
    id: "synthetic:test",
    objectives: [
      { id: "order-one", track: "dmz-order", orderPage: 3, name: "Order one" },
      {
        id: "story-one",
        track: "dmz-story",
        spoiler: true,
        name: "Secret story",
      },
    ],
  };
  const targets = missionAuditTargets(pack);
  assert.equal(
    targets.filter((target) => target.kind === "mission").length,
    18,
  );
  assert.equal(
    targets.find((target) => target.page === 3 && target.kind === "page")
      .recorded,
    true,
  );
  assert.ok(
    targets
      .filter((target) => target.objectiveId === "story-one")
      .every((target) => target.label === "Spoiler-protected mission"),
  );
  const moved = missionAuditTargets({
    ...pack,
    objectives: [{ ...pack.objectives[0], orderPage: 9 }, pack.objectives[1]],
  });
  assert.equal(
    targets.find((target) => target.objectiveId === "order-one").id,
    moved.find((target) => target.objectiveId === "order-one").id,
  );
});

test("audit import rejects duplicates and unsupported states", () => {
  const entry = {
    id: "page:synthetic:1",
    state: "fill-later",
    note: "",
    reviewer: "",
    reviewedAt: null,
  };
  assert.doesNotThrow(() =>
    validateMissionAudit(
      {
        version: 1,
        packId: "synthetic:test",
        contentVersion: "test.1",
        pageSet: "hajin-launch",
        history: [],
        entries: [entry],
      },
      "synthetic:test",
    ),
  );
  assert.throws(() =>
    validateMissionAudit(
      {
        version: 1,
        packId: "synthetic:test",
        contentVersion: "test.1",
        pageSet: "hajin-launch",
        history: [],
        entries: [entry, entry],
      },
      "synthetic:test",
    ),
  );
  assert.throws(() =>
    validateMissionAudit(
      {
        version: 1,
        packId: "synthetic:test",
        contentVersion: "test.1",
        pageSet: "hajin-launch",
        history: [],
        entries: [{ ...entry, state: "verified" }],
      },
      "synthetic:test",
    ),
  );
});
