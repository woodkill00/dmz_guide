import { test } from "node:test";
import assert from "node:assert/strict";
import {
  renderMainNavigation,
  renderBreadcrumbs,
  navigationHref,
} from "../../src/ui/site-navigation.mjs";
import {
  navigationConfig,
  validateNavigationConfig,
} from "../../src/ui/navigation-config.mjs";
const hrefs = (html) =>
  [...html.matchAll(/href="([^"]+)"/g)].map((match) => match[1]);
test("navigation query/hash context is merged without dropping existing parameters or forwarding private pack to companions", () => {
  const feature = {
    id: "fixture",
    kind: "guide",
    path: "/inventory/?view=needed&pack=old#materials",
  };
  const url = new URL(
    navigationHref(feature, { packId: "private:next" }),
    "https://navigation.invalid",
  );
  assert.equal(url.pathname, "/inventory/");
  assert.equal(url.hash, "#materials");
  assert.equal(url.searchParams.get("view"), "needed");
  assert.equal(url.searchParams.get("pack"), "private:next");
  assert.equal(url.searchParams.getAll("pack").length, 1);
  assert.ok(
    !navigationHref(feature, {
      surface: "studio",
      packId: "private:never",
    }).includes("private%3Anever"),
  );
});
test("Track/Progression labels retain original destinations, anchors and identities", () => {
  const nav = renderMainNavigation({
    page: "inventory",
    packId: "fixture:pack",
  });
  assert.match(nav, /data-feature-id="planner"[^>]*>Track<\/a>/);
  assert.match(nav, /data-navigation-group="Track" aria-label="Progression"/);
  assert.match(nav, /data-navigation-group="Prepare" aria-label="Track"/);
  assert.ok(!nav.includes(">Prepare</a>"));
  assert.match(
    renderBreadcrumbs("inventory"),
    /href="\/features\/#prepare">Track/,
  );
  assert.match(
    renderBreadcrumbs("progression"),
    /href="\/features\/#track">Progression/,
  );
});
test("display-label edits leave hrefs and feature identities invariant across surfaces", () => {
  const edited = structuredClone(navigationConfig);
  edited.primary.forEach((entry, n) => (entry.label = `Link ${n}`));
  edited.groups.forEach((entry, n) => (entry.label = `Section ${n}`));
  edited.hubs.forEach((entry, n) => (entry.label = `Hub ${n}`));
  edited.featureLabels = Object.fromEntries(
    Object.keys(edited.featureLabels).map((id, n) => [id, `Feature ${n}`]),
  );
  for (const [surface, page, mapBase] of [
    ["guide", "inventory", undefined],
    ["map", "hajin-map", "/map/"],
    ["help", "map-help", "/"],
    ["studio", "studio", undefined],
    ["manager", "armory-workbench", undefined],
  ]) {
    const options = { surface, page, mapBase, packId: "fixture:pack" };
    const before = renderMainNavigation(options),
      after = renderMainNavigation({ ...options, navigation: edited });
    assert.notEqual(before, after, surface);
    assert.deepEqual(hrefs(before), hrefs(after), surface);
    const ids = (html) =>
      [...html.matchAll(/data-feature-id="([^"]+)"/g)].map((m) => m[1]);
    assert.deepEqual(ids(before), ids(after));
  }
  assert.deepEqual(
    hrefs(renderBreadcrumbs("inventory")),
    hrefs(renderBreadcrumbs("inventory", "", edited)),
  );
});
test("duplicate primary/group labels and anchors are rejected before rendering", () => {
  for (const kind of ["primary", "groups", "hubs"]) {
    const c = structuredClone(navigationConfig);
    c[kind][1].label = c[kind][0].label;
    assert.throws(() => validateNavigationConfig(c), /unique/);
  }
  const c = structuredClone(navigationConfig);
  c.groups[1].id = c.groups[0].id;
  assert.throws(() => validateNavigationConfig(c), /anchor/);
});
