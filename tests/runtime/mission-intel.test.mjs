import test from "node:test";
import assert from "node:assert/strict";
import { loadFixturePack } from "../helpers/catalog.mjs";
import { allRecords, renderDetail } from "../../src/ui/render.mjs";
import { hajinOrderSequence } from "../../src/content/hajin-order-sequence.mjs";
import { hajinPageIntel } from "../../src/content/mission-intel.mjs";

const pack = loadFixturePack("official-starter");

test("all 24 reported Hajin rosters have page-level rewards", () => {
  assert.equal(hajinPageIntel.length, 24);
  for (const roster of hajinOrderSequence.pages) {
    const intel = hajinPageIntel[roster.page - 1];
    assert.equal(intel.page, roster.page);
    assert(intel.rewards.length >= 2);
    assert(intel.sourceKeys.includes("radar"));
  }
});

test("mission pages render their recorded steps and page rewards", () => {
  const records = allRecords([pack]);
  const gearUp = records.find((row) => row.id === "mw4:order-gear-up");
  const html = renderDetail(gearUp, [pack]);
  assert(html.includes("Mission tasks"));
  assert(html.includes(gearUp.steps[0]));
  assert(html.includes("Reported page rewards"));
  assert(html.includes("/missions/?page=hajin-1"));
  const x01 = records.find((row) => row.orderSet === "x01");
  assert(x01);
  const x01Html = renderDetail(x01, [pack]);
  assert(x01Html.includes("Mission tasks"));
  assert(!x01Html.includes("Reported page rewards"));
  for (const id of [
    "mw4:order-hunter",
    "mw4:order-astronaut",
    "mw4:story-critical-extraction",
  ]) {
    const row = records.find((candidate) => candidate.id === id);
    const detail = renderDetail(row, [pack]);
    assert(detail.includes("HAJIN / REPORTED CHAPTER SLOT"), id);
    assert(!detail.includes("x01-page-NaN"), id);
    assert(detail.includes("Reported page rewards"), id);
  }
  const localOnly = renderDetail(
    { ...gearUp, id: "custom:order", orderPage: undefined },
    [pack],
  );
  assert(localOnly.includes("DMZ / PAGE UNKNOWN"));
  assert(!localOnly.includes("Reported page rewards"));
  assert(!localOnly.includes("#hajin-page-"));
});

test("unrecorded task steps do not appear as a completed mission", () => {
  const record = allRecords([pack]).find(
    (row) => row.id === "mw4:order-astronaut",
  );
  const html = renderDetail(record, [pack]);
  assert(html.includes("Steps need source review"));
});

test("conflicting Underground reward is disclosed without granting it", () => {
  assert(hajinPageIntel[8].notes.includes("Coin Mining Den Key"));
  assert(
    !hajinPageIntel[8].rewards.some((reward) =>
      reward.includes("Coin Mining Den Key"),
    ),
  );
});
