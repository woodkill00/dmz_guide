import test from "node:test";
import assert from "node:assert/strict";
import {
  clampMindmapZoom,
  wheelMindmapZoom,
  anchoredMindmapScroll,
} from "../../src/domain/home-mindmap.mjs";
import { featurePages } from "../../src/ui/main-hubs.mjs";
import { renderDashboard } from "../../src/ui/hub-page.mjs";
import { features } from "../../src/ui/feature-registry.mjs";
test("062 wheel direction, delta units and range normalize consistently", () => {
  assert(wheelMindmapZoom(1, -120) > 1);
  assert(wheelMindmapZoom(1, 120) < 1);
  assert.equal(wheelMindmapZoom(1, 3, 1), wheelMindmapZoom(1, 48, 0));
  assert.equal(wheelMindmapZoom(1, 0.1, 2, 800), wheelMindmapZoom(1, 80, 0));
  assert.equal(clampMindmapZoom(-5), 0.25);
  assert.equal(clampMindmapZoom(5), 2);
  assert.equal(clampMindmapZoom(NaN), 1);
  assert.equal(wheelMindmapZoom(1, Infinity), 1);
  let up = 1,
    down = 1;
  for (let i = 0; i < 100; i++) {
    up = wheelMindmapZoom(up, -5000);
    down = wheelMindmapZoom(down, 5000);
  }
  assert.equal(up, 2);
  assert.equal(down, 0.25);
});
test("062 pointer anchoring preserves a world point through zoom-in and out", () => {
  for (const [from, to] of [
    [1, 1.25],
    [1.5, 0.5],
    [0.25, 2],
  ]) {
    const before = { left: 300, top: 500, x: 200, y: 180 };
    const after = anchoredMindmapScroll(
      before.left,
      before.top,
      before.x,
      before.y,
      from,
      to,
    );
    assert(
      Math.abs((after.left + before.x) / to - (before.left + before.x) / from) <
        1e-8,
    );
    assert(
      Math.abs((after.top + before.y) / to - (before.top + before.y) / from) <
        1e-8,
    );
  }
});
test("062 real named hubs appear in registry and Home, FOB has authoritative Upgrades section", () => {
  const pages = featurePages(),
    home = renderDashboard();
  for (const path of ["/dmz-guide/", "/dmz-fob/", "/dmz-weapons/"]) {
    assert(pages.some((p) => p.path === path));
    assert(features.some((f) => f.path === path));
    assert(home.includes('href="' + path + '"'));
  }
  const fob = pages.find((p) => p.path === "/dmz-fob/");
  assert.match(fob.body, /<section id="upgrades"/);
  assert.match(fob.body, /href="\/upgrades\/"/);
  assert.match(fob.body, /href="\/inventory\/"/);
  assert.match(fob.body, /data-workspace-link/);
  assert(!fob.body.includes("data-upgrade-field"));
});
