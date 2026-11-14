import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import {
  features,
  featureURL,
  featureForPage,
} from "../../src/ui/feature-registry.mjs";
import { featureHub, featureLabel } from "../../src/ui/workspace-shell.mjs";
import { renderMainNavigation } from "../../src/ui/site-navigation.mjs";

test("Current static registry admission matches its captured inventory; browser activation is separate", async () => {
  const fixture = JSON.parse(
    await readFile(
      new URL("../fixtures/ui-feature-coverage.json", import.meta.url),
      "utf8",
    ),
  );
  assert.deepEqual(
    fixture.features,
    features.map(({ id, label, kind, path, group }) => ({
      id,
      label,
      kind,
      path,
      group,
    })),
  );
  for (const [path, hash] of Object.entries(fixture.hashes))
    assert.equal(
      createHash("sha256")
        .update(await readFile(new URL("../../" + path, import.meta.url)))
        .digest("hex"),
      hash,
      `Reconcile reviewed ownership inventory: ${path}`,
    );
  const snapshot = JSON.parse(
    await readFile(
      new URL(
        "../../specs/071-ui-ux-implementation/registry-snapshot.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  assert.equal(new Set(features.map((f) => f.id)).size, features.length);
  assert.equal(
    features.length,
    86,
    "Rebaseline the owning registry contract deliberately",
  );
  assert.equal(snapshot.count, 83, "Keep the 071 historical baseline intact");
  for (const prior of snapshot.features) {
    const current = features.find((feature) => feature.id === prior.id);
    assert(current, `071 baseline feature missing: ${prior.id}`);
    assert.deepEqual(
      {
        id: current.id,
        label: current.label,
        kind: current.kind,
        path: current.path,
        group: current.group,
      },
      prior,
      `071 baseline feature changed: ${prior.id}`,
    );
  }
  assert.equal(
    features.find((feature) => feature.id === "loot-runs")?.path,
    "/loot.html",
  );
  for (const feature of features) {
    const url = new URL(featureURL(feature), "http://127.0.0.1:4173");
    assert(["4173", "5175", "4174"].includes(url.port));
    assert.equal(url.hostname, "127.0.0.1");
    assert.equal(url.protocol, "http:");
    assert.equal(featureForPage(feature.id)?.id, feature.id);
  }
});

test("071 canonical hub and ambiguous feature labels preserve distinct owners", () => {
  for (const id of [
    "maps",
    "keys",
    "missions",
    "progression",
    "boss-checklist",
    "tool-missions",
  ])
    assert.equal(featureHub(id), "DMZ Guide", id);
  for (const id of [
    "recipes",
    "upgrades",
    "inventory",
    "collection",
    "field-desk",
  ])
    assert.equal(featureHub(id), "DMZ FOB", id);
  for (const id of ["armory", "armory-workbench", "weapon-updates"])
    assert.equal(featureHub(id), "DMZ Weapons", id);
  const lookup = (id) => features.find((f) => f.id === id);
  assert.notEqual(
    featureURL(lookup("missions")),
    featureURL(lookup("tool-missions")),
  );
  assert.notEqual(
    featureLabel(lookup("settings")),
    featureLabel(lookup("tool-settings")),
  );
  assert.notEqual(
    featureLabel(lookup("weapon-updates")),
    featureLabel(lookup("tool-updates")),
  );
});

test("071 modern SSR navigation retains every registry destination and safe companion links", () => {
  const previous = process.env.DMZ_UI_VARIANT;
  try {
    process.env.DMZ_UI_VARIANT = "modern";
    const html = renderMainNavigation({ page: "inventory", surface: "guide" });
    assert.match(html, /data-ui-navigation="modern"/);
    for (const feature of features)
      assert(html.includes(`data-feature-id="${feature.id}"`), feature.id);
    assert.match(
      html,
      /href="http:\/\/127\.0\.0\.1:5175\/"[^>]*target="_blank"[^>]*rel="noopener noreferrer"/,
    );
    assert.match(html, /<details class="ui-mobile-sections">/);
    assert.match(html, /DMZ FOB/);
    process.env.DMZ_UI_VARIANT = "legacy";
    assert.doesNotMatch(
      renderMainNavigation({ surface: "guide" }),
      /data-ui-navigation="modern"/,
    );
  } finally {
    if (previous === undefined) delete process.env.DMZ_UI_VARIANT;
    else process.env.DMZ_UI_VARIANT = previous;
  }
});
