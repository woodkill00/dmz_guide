import test from "node:test";
import assert from "node:assert/strict";
import { loadFixturePack } from "../helpers/catalog.mjs";
import { allRecords, renderDetail } from "../../src/ui/render.mjs";
import { hajinOrderSequence } from "../../src/content/hajin-order-sequence.mjs";
import {
  hajinPageIntel,
  x01PageIntel,
} from "../../src/content/mission-intel.mjs";

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

test("all five X01 rosters have attributed chapter rewards", () => {
  assert.equal(x01PageIntel.length, 5);
  for (const [index, intel] of x01PageIntel.entries()) {
    assert.equal(intel.page, index + 1);
    assert(intel.rewards.length >= 3);
    assert(intel.sourceUrl.endsWith(`#x01-page-${index + 1}`));
  }
});

test("all 87 reported mission entries retain identities and task text", () => {
  const records = allRecords([pack]);
  const byId = new Map(records.map((record) => [record.id, record]));
  const hajinIds = hajinOrderSequence.pages.flatMap(
    (page) => page.objectiveIds,
  );
  const x01 = records.filter((record) => record.orderSet === "x01");
  assert.equal(hajinIds.length, 72);
  assert.equal(x01.length, 15);
  for (const id of hajinIds) {
    const record = byId.get(id);
    assert(record, id);
    assert(record.steps?.length, id);
  }
  for (const record of x01) {
    assert(record.orderPage >= 1 && record.orderPage <= 5, record.id);
    assert(record.steps?.length, record.id);
    const detail = renderDetail(record, [pack]);
    assert(detail.includes("Reported page rewards"), record.id);
    assert(detail.includes(`#x01-page-${record.orderPage}`), record.id);
  }
});

test("COD Central screenshots attach only to their matching Orders", () => {
  const records = allRecords([pack]);
  const byId = new Map(records.map((record) => [record.id, record]));
  const shots = pack.assets.filter((asset) =>
    asset.sourceUrl.startsWith("https://codcentral.net/assets/"),
  );
  assert.equal(shots.length, 26);
  assert(
    shots.every(
      (asset) => asset.redistributionAllowed && asset.mime === "image/webp",
    ),
  );
  const withShots = records.filter((record) => record.assetId);
  assert.equal(withShots.length, 17);
  assert(byId.get("mw4:order-triage-protocol").assetId);
  assert(byId.get("mw4:order-no-one-left").assetId);
  assert(!byId.get("mw4:order-no-one-left").assetIds?.length);
  assert.equal(byId.get("mw4:x01-order-door-opener").assetIds.length, 2);
  assert(byId.get("mw4:x01-order-water-wading").assetId);
  assert(!byId.get("mw4:x01-order-source-code").assetId);
  assert(byId.get("mw4:order-the-vault").assetId);
  assert(!byId.get("mw4:x01-order-the-vault").assetId);
  for (const record of withShots) {
    const ids = [record.assetId, ...(record.assetIds || [])];
    assert(
      ids.every((id) => shots.some((asset) => asset.id === id)),
      record.id,
    );
    assert.equal(record.imageDescriptions.length, ids.length);
  }
});

test("custom Order pictures retain their own attribution", () => {
  const customPack = structuredClone(pack);
  customPack.id = "private:custom-images";
  customPack.assets.push({
    id: "custom:order-photo",
    attribution: "Player screenshot",
    license: "Player permission",
    sourceUrl: "https://example.com/photo.webp",
    width: 800,
    height: 600,
  });
  const order = customPack.objectives.find(
    (row) => row.id === "mw4:order-gear-up",
  );
  order.assetId = "custom:order-photo";
  const record = allRecords([customPack]).find((row) => row.id === order.id);
  const html = renderDetail(record, [customPack], {
    imageURL: () => "/image.webp",
  });
  assert(html.includes("Player screenshot"));
  assert(html.includes("Player permission"));
  assert(!html.includes("COD Central source ↗"));
  assert(!html.includes("COD Central screenshots."));
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
  assert(x01Html.includes("Reported page rewards"));
  assert(x01Html.includes("COD Central tips and screenshots"));
  assert(x01Html.includes("#x01-page-1"));
  const unrelatedPack = {
    ...pack,
    id: "private:other-catalog",
  };
  const unrelatedHtml = renderDetail({ ...x01, pack: unrelatedPack }, [
    unrelatedPack,
  ]);
  assert(!unrelatedHtml.includes("Reported page rewards"));
  assert(!unrelatedHtml.includes("COD Central tips and screenshots"));
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

test("formerly disputed task steps show attributed source wording without completing progress", () => {
  const record = allRecords([pack]).find(
    (row) => row.id === "mw4:order-astronaut",
  );
  const html = renderDetail(record, [pack]);
  assert(html.includes("21 containers"));
  assert(html.includes("providers disagree"));
  assert(!html.includes("Mission completed"));
});

test("conflicting Underground reward is disclosed without granting it", () => {
  assert(hajinPageIntel[8].notes.includes("Coin Mining Den Key"));
  assert(
    !hajinPageIntel[8].rewards.some((reward) =>
      reward.includes("Coin Mining Den Key"),
    ),
  );
});
