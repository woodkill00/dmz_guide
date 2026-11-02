import test from "node:test";
import assert from "node:assert/strict";
import {
  scanPublicHTML,
  buildSiteTopology,
  validateTopology,
} from "../../src/domain/site-topology.mjs";
import { features } from "../../src/ui/feature-registry.mjs";
import { readFile } from "node:fs/promises";
const fixture = () => {
  const pages = [
    {
      path: "/",
      title: "Home",
      page: "home",
      body: '<a href="/items/?pack=example%3Atest#stock">Item &amp; material</a>',
    },
    {
      path: "/items/",
      title: "Items",
      page: "items",
      body: '<h2 id="stock">Stock</h2><button id="clear">Clear filters</button><a href="/#main">Home</a>',
    },
    { path: "/sitemap/", title: "Site map", page: "sitemap", body: "" },
  ];
  return {
    pages,
    html: new Map(
      pages.map((p) => [p.path, `<main id="main">${p.body}</main>`]),
    ),
  };
};
test("059 scanner reads actual public anchors/IDs/controls, ignores executable and comment content", () => {
  const s = scanPublicHTML(
    `<a href='/items/?q=a&amp;b#stock'><span>Item</span> details</a><h2 id='stock'>Materials</h2><button role='tab' id='details'>Details</button><select aria-label='Sort list'><option>Name</option></select><!-- <a href='/fake/'>fake</a> --><script>"<a href='/private/'>secret</a>"</script>`,
  );
  assert.deepEqual(s.links, [
    { href: "/items/?q=a&b#stock", label: "Item details" },
  ]);
  assert(s.ids.includes("stock"));
  assert.equal(s.controls[0].kind, "tab");
  assert.equal(s.controls[1].label, "Sort list");
  assert.equal(s.sections[0].label, "Materials");
});
test("059 complete route and feature membership, typed connections and query/fragment preserved", () => {
  const { pages, html } = fixture(),
    graph = buildSiteTopology(pages, html);
  for (const p of pages) assert(graph.nodes.some((n) => n.href === p.path));
  for (const f of features)
    assert(graph.nodes.some((n) => n.featureIds.includes(f.id)));
  assert(graph.nodes.some((n) => n.service === "Weapon manager"));
  const link = graph.edges.find(
    (e) => e.from === "route:/" && e.kind === "contextual",
  );
  assert.equal(link.to, "route:/items/");
  assert.equal(link.href, "/items/?pack=example%3Atest#stock");
  assert(!graph.issues.some((i) => i.kind === "missing-fragment"));
  assert(graph.edges.some((e) => e.kind === "menu"));
  assert(graph.edges.some((e) => e.kind === "directory"));
  assert(!graph.edges.some((e) => e.kind === "shell"));
});
test("059 audit reports missing route/fragment and malformed URLs instead of certifying them", () => {
  const { pages, html } = fixture();
  pages[0].body +=
    '<a href="/missing/">Missing</a><a href="/items/#absent">Absent</a><a href="http://[broken">Broken</a>';
  html.set("/", pages[0].body);
  const graph = buildSiteTopology(pages, html);
  for (const kind of ["missing-route", "missing-fragment", "invalid-url"])
    assert(graph.issues.some((i) => i.kind === kind));
});
test("059 snapshot refuses admission overflow and hostile destinations or dangling edges atomically", () => {
  assert.throws(() => scanPublicHTML("x".repeat(4194305)), /limit/);
  assert.throws(
    () => buildSiteTopology(Array(5001).fill({}), new Map()),
    /limit/,
  );
  const { pages, html } = fixture(),
    graph = buildSiteTopology(pages, html);
  for (const href of [
    "javascript:alert(1)",
    "https://evil.example/",
    "http://user:pass@127.0.0.1:4173/",
  ]) {
    const bad = structuredClone(graph);
    bad.nodes[0].href = href;
    assert.throws(() => validateTopology(bad), /Unsafe/);
  }
  const bad = structuredClone(graph);
  bad.edges[0].to = "not-a-node";
  assert.throws(() => validateTopology(bad), /connection/);
});
test("059 current build topology matches every emitted route and feature, no broken internal targets", async () => {
  const graph = validateTopology(
      JSON.parse(
        await readFile("dist/assets/content/site-topology.json", "utf8"),
      ),
    ),
    identity = JSON.parse(
      await readFile("dist/assets/build-identity.json", "utf8"),
    );
  const emitted = Object.keys(identity.outputFiles).filter(
    (f) => f.endsWith("index.html") || f === "404.html",
  );
  assert.equal(graph.counts.routes, emitted.length);
  assert.equal(graph.issues.length, 0);
  for (const f of emitted) {
    const path = "/" + f.replace(/index\.html$/, "").replaceAll("\\", "/");
    assert(graph.nodes.some((n) => n.href === path));
  }
  for (const f of features)
    assert(graph.nodes.some((n) => n.featureIds.includes(f.id)));
  assert(graph.nodes.some((n) => n.href === "/armory/m4/"));
  assert(graph.nodes.some((n) => n.kind === "authoring"));
});

test("059 collapsed spoiler content never enters searchable controls, headings or contextual labels", () => {
  const scan = scanPublicHTML(
    '<h2>Public</h2><details class="spoiler-content"><summary>Reveal spoiler content</summary><h2 id="secret">Secret mission</h2><details><summary>Hidden chapter</summary><a href="/missing/">Secret connection</a></details></details><button>Public action</button>',
  );
  assert(
    !JSON.stringify([scan.sections, scan.controls, scan.links]).includes(
      "Secret",
    ),
  );
  assert(!JSON.stringify(scan.controls).includes("Hidden chapter"));
  assert(scan.ids.includes("secret"));
  assert(scan.auditLinks.some((a) => a.href === "/missing/"));
});

test("059 control labels omit values/defaults while retaining field names", () => {
  const scan = scanPublicHTML(
    '<label for="stock">Held stock</label><input id="stock" value="private quantity"><label>Private note<textarea id="notes">private text</textarea></label><label>Sort<select id="sort"><option value="secret option">Name</option></select></label>',
  );
  assert(
    scan.controls.some((c) => c.id === "stock" && c.label === "Held stock"),
  );
  assert(
    scan.controls.some((c) => c.id === "notes" && c.label === "Private note"),
  );
  assert(scan.controls.some((c) => c.id === "sort" && c.label === "Sort"));
  assert(!JSON.stringify(scan.controls).includes("private text"));
  assert(!JSON.stringify(scan.controls).includes("private quantity"));
  assert(!JSON.stringify(scan.controls).includes("secret option"));
});
test("059 HTML admission measures UTF8 bytes rather than character count", () =>
  assert.throws(() => scanPublicHTML("界".repeat(1500000)), /limit/));
