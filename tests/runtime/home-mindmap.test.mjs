import { validateTopology } from "../../src/domain/site-topology.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  buildHomeHierarchy,
  visibleHomeHierarchy,
  searchHomeHierarchy,
  layoutHomeHierarchy,
} from "../../src/domain/home-mindmap.mjs";
const topology = JSON.parse(
  await readFile("dist/assets/content/site-topology.json", "utf8"),
);
test("061 every existing page/tool occurs once under Home with an acyclic parent chain", () => {
  const tree = buildHomeHierarchy(topology);
  assert.equal(tree.root, "route:/");
  assert.equal(tree.nodes.get(tree.root).label, "Home");
  for (const node of topology.nodes) {
    assert.equal(tree.nodes.get(node.id).href, node.href);
    let id = node.id,
      seen = new Set();
    while (id !== tree.root) {
      assert(!seen.has(id));
      seen.add(id);
      id = tree.nodes.get(id).parent;
      assert(id);
    }
  }
  assert.equal(tree.sourceCount, topology.nodes.length);
  assert.equal(tree.nodes.get("route:/keys/").parent, "route:/dmz-guide/");
  assert.equal(tree.nodes.get("route:/upgrades/").parent, "route:/dmz-fob/");
  assert.equal(tree.nodes.get("route:/armory/").parent, "route:/dmz-weapons/");
  assert.deepEqual(
    tree.nodes.get(tree.root).children.map((id) => tree.nodes.get(id).label),
    [
      "Map",
      "DMZ Guide",
      "DMZ FOB",
      "DMZ Weapons",
      "Tools & settings",
      "Source websites",
    ],
  );
  assert.equal(
    tree.nodes.get("feature:tool-icons").parent,
    "feature:hajin-map",
  );
  for (const n of topology.nodes.filter(
    (n) => n.href.startsWith("/keys/") && n.href !== "/keys/",
  ))
    assert.equal(tree.nodes.get(n.id).parent, "route:/keys/");
});
test("061 contribution instructions nest beneath the originating record, longest workspace ownership retained", () => {
  const tree = buildHomeHierarchy(topology);
  const edge = topology.edges.find(
    (e) =>
      e.kind === "contextual" &&
      topology.nodes.some((n) => n.id === e.from && n.kind === "record") &&
      topology.nodes.some((n) => n.id === e.to && n.kind === "authoring"),
  );
  assert(edge);
  assert.equal(tree.nodes.get(edge.to).parent, edge.from);
  assert.equal(tree.nodes.get("route:/armory/m4/").parent, "route:/armory/");
});
test("061 branch paging and mounted-note cap retain full data and refuse oversized views without mutation", () => {
  const tree = buildHomeHierarchy(topology),
    open = new Set([tree.root, "route:/dmz-guide/", "route:/keys/"]),
    view = visibleHomeHierarchy(tree, open);
  assert(
    view.rows.some((n) => n.kind === "more" && n.owner === "route:/keys/"),
  );
  assert.equal(
    view.rows.filter((n) => n.parent === "route:/keys/" && n.kind !== "more")
      .length,
    25,
  );
  const more = visibleHomeHierarchy(
    tree,
    open,
    new Map([["route:/keys/", 50]]),
  );
  assert.equal(
    more.rows.filter((n) => n.parent === "route:/keys/" && n.kind !== "more")
      .length,
    50,
  );
  const all = new Set(tree.nodes.keys()),
    size = all.size;
  assert.throws(() => visibleHomeHierarchy(tree, all), /Display limit/);
  assert.equal(all.size, size);
});
test("061 search pages every hit with Home ancestors and no hidden result loss", () => {
  const tree = buildHomeHierarchy(topology),
    first = searchHomeHierarchy(tree, "a"),
    all = new Set();
  for (let offset = 0; offset < first.total; offset += 40) {
    const result = searchHomeHierarchy(tree, "a", offset);
    assert(result.allowed.has(tree.root));
    const view = visibleHomeHierarchy(
      tree,
      new Set(),
      new Map(),
      result.allowed,
    );
    assert(view.rows.length <= 250);
    for (const n of view.rows)
      if (
        [n.label, n.href].join(" ").toLowerCase().includes("a") &&
        n.kind !== "branch"
      )
        all.add(n.id);
  }
  assert.equal(all.size, first.total);
  const no = searchHomeHierarchy(tree, "not-a-page-xyz-9999");
  assert.equal(no.total, 0);
  assert.deepEqual([...no.allowed], [tree.root]);
});
test("061 source website links accept only explicit safe HTTP references and deduplicate domains", () => {
  const tree = buildHomeHierarchy({
    ...topology,
    externals: [
      { kind: "external", href: "javascript:alert(1)" },
      { kind: "external", href: "https://user:pass@example.com/" },
      { kind: "external", href: "https://example.org/guide" },
      { kind: "external", href: "https://example.org/other" },
    ],
  });
  assert.equal(tree.websiteCount, 1);
  assert.equal(
    tree.nodes.get("website:example.org").href,
    "https://example.org/guide",
  );
});
test("061 layout preserves non-overlapping leaf order and scales with enlarged root text", () => {
  const tree = buildHomeHierarchy(topology),
    visible = visibleHomeHierarchy(tree, new Set([tree.root])),
    one = layoutHomeHierarchy(visible),
    two = layoutHomeHierarchy(visible, 2);
  for (const [id, p] of one.positions) {
    assert.equal(two.positions.get(id).x, p.x * 2);
    assert.equal(two.positions.get(id).y, p.y * 2);
  }
  const leaves = visible.rows
    .filter((n) => !visible.edges.some((e) => e.from === n.id))
    .map((n) => one.positions.get(n.id))
    .sort((a, b) => a.y - b.y);
  for (let i = 1; i < leaves.length; i++)
    assert(leaves[i].y >= leaves[i - 1].y + leaves[i - 1].height);
  assert.throws(() => layoutHomeHierarchy(visible, Infinity));
});

test("061 explicit content owners put upgrades and missions beneath their workspaces and retain fixture labels", () => {
  const tree = buildHomeHierarchy(topology),
    owned = topology.nodes.filter((n) => n.ownerPath);
  assert(owned.length > 0);
  for (const fields of [{ ownerPath: "/untrusted/" }, { fixture: {} }]) {
    const bad = structuredClone(topology);
    Object.assign(bad.nodes[0], fields);
    assert.throws(() => validateTopology(bad), /ownership metadata/);
  }
  for (const n of owned)
    assert.equal(tree.nodes.get(tree.nodes.get(n.id).parent).href, n.ownerPath);
  assert(topology.nodes.some((n) => n.fixture === true));
  for (const n of topology.nodes.filter((n) => n.fixture === true))
    assert.equal(tree.nodes.get(n.id).fixture, true);
});
