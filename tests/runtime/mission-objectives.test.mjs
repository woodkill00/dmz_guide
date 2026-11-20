import test from "node:test";
import assert from "node:assert/strict";
import { loadFixturePack } from "../helpers/catalog.mjs";
import { missionChapterPages } from "../../src/ui/mission-chapter-page.mjs";
import { renderMissionObjectives } from "../../src/ui/mission-objectives.mjs";
import { allRecords, renderDetail, escapeHTML } from "../../src/ui/render.mjs";
const pack = loadFixturePack("official-starter");

test("FR13 all chapter rosters expose canonical tasks rather than open-another-page placeholders", () => {
  const pages = missionChapterPages([pack]),
    byId = new Map(pack.objectives.map((r) => [r.id, r]));
  assert.equal(pages.length, 29);
  for (const page of pages) {
    const ids = [
      ...page.body.matchAll(/data-mission-objectives="([^"]+)"/g),
    ].map((m) => m[1]);
    assert(ids.length > 0, page.path);
    for (const id of ids) {
      const r = byId.get(id);
      assert(r && !r.spoiler, id);
      for (const step of r.steps)
        assert(page.body.includes(escapeHTML(step)), `${page.path} ${id}`);
    }
    assert.doesNotMatch(page.body, /Open this mission to view its tasks/);
    assert.match(
      page.body,
      /<details[^>]*data-mission-objectives="[^"]+"[^>]* open>/,
    );
  }
  assert(
    pages[0].body.includes(escapeHTML(byId.get("mw4:order-gear-up").steps[0])),
  );
});

test("FR13 every catalogued Order/story detail retains its actual saved instructions", () => {
  const rows = allRecords([pack]).filter((r) =>
    ["dmz-order", "dmz-story"].includes(r.track),
  );
  assert(rows.length >= 87);
  for (const r of rows) {
    assert(r.steps.length, r.id);
    const html = renderDetail(r, [pack]);
    for (const step of r.steps) assert(html.includes(escapeHTML(step)), r.id);
  }
});

test("FR13 objectives are collapsed by default, inert, independent and honest when unknown", () => {
  const r = {
    id: 'test:unsafe"<',
    steps: ['<img src=x onerror="alert(1)">', "Collect A & B"],
  };
  const html = renderMissionObjectives(r);
  assert.doesNotMatch(html, / open>|<img|onerror="/);
  assert.match(html, /&lt;img/);
  assert.match(html, /Collect A &amp; B/);
  assert.doesNotMatch(html, /\bname=|onclick|script/);
  assert.match(
    renderMissionObjectives({ id: "test:empty", steps: [] }),
    /not been recorded/,
  );
  assert.match(renderMissionObjectives(r, { expanded: true }), / open>/);
});

test("FR13 chapter objectives keep the existing spoiler boundary", () => {
  const changed = structuredClone(pack),
    r = changed.objectives.find((r) => r.id === "mw4:order-gear-up");
  r.spoiler = true;
  r.name = "Synthetic concealed mission";
  r.steps = ["Synthetic concealed instructions"];
  const html = missionChapterPages([changed])[0].body;
  assert.doesNotMatch(html, /Synthetic concealed|mw4:order-gear-up/);
  assert.match(html, /reveal spoilers/);
});
