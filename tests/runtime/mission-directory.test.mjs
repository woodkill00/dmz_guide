import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { hajinOrderSequence } from "../../src/content/hajin-order-sequence.mjs";
import { ordersPageCoverage } from "../../src/domain/progression.mjs";
import { missionAuditTargets } from "../../src/domain/mission-audit.mjs";
import {
  missionAuditHref,
  missionPageHref,
} from "../../src/domain/mission-links.mjs";
import { loadFixturePack } from "../helpers/catalog.mjs";
import { validatePack } from "../../src/content/validate.mjs";

test("reported Hajin sequence and X01 pages resolve to separate sourced records", () => {
  const pack = loadFixturePack("official-starter");
  const byId = new Map(pack.objectives.map((row) => [row.id, row]));
  const hajinIds = hajinOrderSequence.pages.flatMap((row) => row.objectiveIds);
  assert.equal(hajinOrderSequence.pages.length, 24);
  assert.deepEqual(
    hajinOrderSequence.pages.map((row) => row.page),
    Array.from({ length: 24 }, (_, i) => i + 1),
  );
  assert.equal(hajinIds.length, 72);
  assert.deepEqual(
    hajinOrderSequence.pages
      .filter((row) => row.placement === "fixed")
      .map((row) => row.page),
    [1, 4, 7, 10, 11, 14, 15],
  );
  assert.equal(new Set(hajinIds).size, 72);
  assert(
    hajinIds.every((id) => byId.has(id) && byId.get(id).orderSet !== "x01"),
  );
  const x01 = ordersPageCoverage(pack, 5, "x01");
  assert.deepEqual(
    x01.map((row) => row.objectiveIds.length),
    [3, 3, 3, 3, 3],
  );
  assert(
    x01
      .flatMap((row) => row.objectiveIds)
      .every((id) => {
        const row = byId.get(id);
        return (
          row?.status === "observed" &&
          row.sourceIds.length === 2 &&
          row.requirementsKnown === false
        );
      }),
  );
  assert.equal(
    ordersPageCoverage(pack).filter((row) => row.state === "recorded").length,
    7,
  );
  const audit = missionAuditTargets(pack);
  assert.equal(
    audit.filter((row) => row.kind === "page" && row.orderSet === "x01").length,
    5,
  );
  assert(
    audit.some(
      (row) =>
        row.id === "page:official%3Amw4-dmz-starter:hajin-launch:1:roster",
    ),
  );
  assert(
    audit.some(
      (row) =>
        row.id === "page:official%3Amw4-dmz-starter:x01-season1:1:roster",
    ),
  );
  assert(
    audit.some(
      (row) =>
        row.kind === "mission" &&
        row.objectiveId === "mw4:x01-order-source-code",
    ),
  );
});

test("X01 placement cannot be stored as a Hajin-sized page or a different track", () => {
  const schema = JSON.parse(
    readFileSync(
      new URL("../../schemas/pack.schema.json", import.meta.url),
      "utf8",
    ),
  );
  const pack = loadFixturePack("official-starter");
  const x01 = pack.objectives.find((row) => row.orderSet === "x01");
  x01.orderPage = 6;
  assert.throws(
    () => validatePack(pack, schema),
    /Invalid X01 Orders placement/,
  );
});

test("audit handoff binds another catalog and private mission links stay pack-bound", () => {
  const packId = "community:other-catalog";
  const id = "other:mission";
  const audit = new URL(missionAuditHref(packId, id), "http://localhost");
  assert.equal(audit.searchParams.get("pack"), packId);
  assert.equal(
    audit.searchParams.get("target"),
    "mission:community%3Aother-catalog:other%3Amission:identity",
  );
  assert.equal(
    missionPageHref(packId, id),
    "/local/?pack=community%3Aother-catalog&id=other%3Amission",
  );
  assert.equal(
    missionPageHref("official:mw4-dmz-starter", "mw4:edited-mission"),
    "/local/?pack=official%3Amw4-dmz-starter&id=mw4%3Aedited-mission",
  );
});
