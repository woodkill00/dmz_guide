import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { features, featureURL } from "../../src/ui/feature-registry.mjs";
import { renderMainNavigation } from "../../src/ui/site-navigation.mjs";
import { buildHomeHierarchy } from "../../src/domain/home-mindmap.mjs";
test("063 safe-run entry is reachable through shared menus and Home → Map hierarchy", async () => {
  const feature = features.find((f) => f.id === "safe-runs");
  assert.equal(featureURL(feature), "http://127.0.0.1:5175/safes.html");
  assert.equal(featureURL(feature, "map"), "/safes.html");
  for (const surface of ["guide", "map", "help"])
    assert.match(
      renderMainNavigation({ surface }),
      /data-feature-id="safe-runs"/,
    );
  const topology = JSON.parse(
    await readFile("dist/assets/content/site-topology.json", "utf8"),
  );
  const tree = buildHomeHierarchy(topology),
    node = tree.nodes.get("feature:safe-runs");
  assert.equal(node.href, "http://127.0.0.1:5175/safes.html");
  assert.equal(node.parent, "feature:hajin-map");
  assert.equal(tree.nodes.get(node.parent).parent, "route:/");
});
