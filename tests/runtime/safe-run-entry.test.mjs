import test from "node:test";
import assert from "node:assert/strict";
import { renderDashboard } from "../../src/ui/hub-page.mjs";
import { renderMapWorkspace } from "../../src/ui/navigation-page.mjs";
import { features, featureURL } from "../../src/ui/feature-registry.mjs";
test("modern Home gives the existing Safe Run map a native quick link without replacing its registry identity", () => {
  const previous = process.env.DMZ_UI_VARIANT;
  process.env.DMZ_UI_VARIANT = "modern";
  try {
    const html = renderDashboard(),
      quick = html.split('aria-label="Quick tools">')[1].split("</div>")[0];
    assert.match(
      quick,
      /href="http:\/\/127\.0\.0\.1:5175\/safes\.html" data-feature-id="safe-runs" target="_blank" rel="noopener noreferrer">Safe Run map/,
    );
    const matches = features.filter((f) => f.id === "safe-runs");
    assert.equal(matches.length, 1);
    assert.equal(featureURL(matches[0]), "http://127.0.0.1:5175/safes.html");
  } finally {
    if (previous === undefined) delete process.env.DMZ_UI_VARIANT;
    else process.env.DMZ_UI_VARIANT = previous;
  }
});
test("companion startup page provides separate explicit native Main Map and Safe Run links", () => {
  const html = renderMapWorkspace();
  assert.match(
    html,
    /href="http:\/\/127\.0\.0\.1:5175\/safes\.html" target="_blank" rel="noopener noreferrer">Open Safe Run map/,
  );
  assert.ok(html.includes("Open local map workspace"));
  assert.ok(html.includes("do not automatically synchronize"));
});
