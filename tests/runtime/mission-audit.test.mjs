import test from "node:test";
import assert from "node:assert/strict";
import {
  missionAuditTargets,
  missionAuditRestorePreview,
  validateMissionAudit,
} from "../../src/domain/mission-audit.mjs";
import { loadFixturePack } from "../helpers/catalog.mjs";

test("official starter audits 66 reported Orders and six Story Missions without fixing variable pages", () => {
  const pack = loadFixturePack("official-starter");
  assert.equal(pack.id, "official:mw4-dmz-starter");
  assert.equal(pack.objectives.length, 182);
  assert.equal(
    pack.objectives.filter((row) =>
      ["dmz-order", "dmz-story"].includes(row.track),
    ).length,
    72,
  );
  const targets = missionAuditTargets(pack);
  assert.equal(
    targets.filter((row) => row.kind === "page" && !row.recorded).length,
    17,
  );
  assert.equal(targets.filter((row) => row.kind === "mission").length, 648);
  assert.equal(
    targets.filter((row) => row.kind === "page" && row.recorded).length,
    7,
  );
  assert.ok(
    pack.objectives
      .filter((row) => row.track === "dmz-order")
      .every(
        (row) =>
          row.status === "observed" &&
          row.sourceIds.length === 2 &&
          row.effects.length === 0,
      ),
  );
});

test("empty catalog creates 24 unrecorded page targets and no fictional missions", () => {
  const targets = missionAuditTargets({ id: "synthetic:test", objectives: [] });
  assert.equal(targets.length, 24);
  assert.ok(
    targets.every((target) => target.kind === "page" && !target.recorded),
  );
});

test("a later page set has separate target IDs without asserting real X01 coverage", () => {
  const pack = { id: "synthetic:test", objectives: [] };
  const hajin = missionAuditTargets(pack);
  const future = missionAuditTargets(pack, {
    pageSet: "synthetic-x01",
    pageCount: 3,
  });
  assert.equal(future.length, 3);
  assert.ok(
    future.every((target) => !hajin.some((old) => old.id === target.id)),
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
  assert.notEqual(
    targets.find((target) => target.objectiveId === "order-one")
      .sourceFingerprint,
    moved.find((target) => target.objectiveId === "order-one")
      .sourceFingerprint,
  );
  assert.equal(
    targets.find(
      (target) =>
        target.objectiveId === "order-one" && target.section === "rewards",
    ).warning,
    "No dedicated reward field in this catalog schema; inspect cited sources",
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

test("legacy version-one audit is normalized without changing review meaning", () => {
  const legacy = {
    version: 1,
    packId: "synthetic:test",
    contentVersion: "test.1",
    pageSet: "hajin-launch",
    entries: [
      {
        id: "page:synthetic:1",
        state: "fill-later",
        note: "Later",
        reviewer: "",
        reviewedAt: null,
      },
    ],
  };
  const normalized = validateMissionAudit(legacy, "synthetic:test");
  assert.equal(normalized.entries[0].revision, 0);
  assert.deepEqual(normalized.history, []);
  assert.equal(normalized.entries[0].state, "fill-later");
  assert.equal(legacy.history, undefined);
});

test("audit history rejects mismatched or invalid embedded entries", () => {
  const entry = {
    id: "page:synthetic:1",
    state: "checked",
    note: "",
    reviewer: "",
    reviewedAt: null,
  };
  const base = {
    version: 1,
    packId: "synthetic:test",
    contentVersion: "test.1",
    pageSet: "hajin-launch",
    entries: [entry],
  };
  assert.throws(() =>
    validateMissionAudit(
      {
        ...base,
        history: [
          {
            id: entry.id,
            before: null,
            after: { ...entry, id: "page:other" },
            at: new Date().toISOString(),
          },
        ],
      },
      "synthetic:test",
    ),
  );
  assert.throws(() =>
    validateMissionAudit(
      {
        ...base,
        history: [
          {
            id: entry.id,
            before: null,
            after: { ...entry, note: "x".repeat(2001) },
            at: new Date().toISOString(),
          },
        ],
      },
      "synthetic:test",
    ),
  );
});

test("restore preview distinguishes added, changed, removed and stale bindings", () => {
  const targets = missionAuditTargets({ id: "synthetic:test", objectives: [] });
  const [one, two, three] = targets;
  const entry = (target, state = "checked") => ({
    id: target.id,
    state,
    note: "",
    reviewer: "",
    reviewedAt: null,
    sourceFingerprint: target.sourceFingerprint,
    revision: 1,
  });
  const preview = missionAuditRestorePreview(
    { entries: [entry(one), entry(two)] },
    {
      entries: [
        entry(one, "fill-later"),
        { ...entry(three), sourceFingerprint: "00000000" },
      ],
    },
    targets,
  );
  assert.deepEqual(preview, { added: 1, changed: 1, removed: 1, stale: 1 });
});

test("audit validator bounds import bytes and preserves a changed binding for review", () => {
  const packId = "synthetic:test";
  const base = {
    version: 1,
    packId,
    contentVersion: "test.1",
    pageSet: "hajin-launch",
    entries: [
      {
        id: "page:synthetic:1",
        state: "checked",
        note: "reviewed",
        reviewer: "owner",
        reviewedAt: null,
        sourceFingerprint: "00000000",
        revision: 1,
      },
    ],
    history: [],
  };
  assert.equal(
    validateMissionAudit(base, packId).entries[0].sourceFingerprint,
    "00000000",
  );
  assert.throws(() =>
    validateMissionAudit(
      { ...base, contentVersion: "".padEnd(201, "x") },
      packId,
    ),
  );
  assert.throws(() =>
    validateMissionAudit(
      {
        ...base,
        entries: [{ ...base.entries[0], note: "🧭".repeat(500_001) }],
      },
      packId,
    ),
  );
});
