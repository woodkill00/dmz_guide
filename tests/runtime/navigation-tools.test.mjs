import test from "node:test";
import assert from "node:assert/strict";
import destinations from "../../src/ui/map-destinations.json" with { type: "json" };
import { renderMainNavigation } from "../../src/ui/site-navigation.mjs";
import { renderSiteMap } from "../../src/ui/navigation-page.mjs";

test("042 every shared surface exposes boss directly and every authored map destination once", () => {
  const all = [...destinations.tools, ...destinations.planner];
  assert.equal(destinations.planner.length, 27);
  assert.equal(new Set(all.map(([id]) => id)).size, all.length);
  assert.equal(
    destinations.planner.some(([id]) =>
      ["enabled", "largeMarkers", "save", "delete", "apply"].includes(id),
    ),
    false,
  );
  for (const surface of ["guide", "map", "help", "studio"]) {
    const html = renderMainNavigation({
      surface,
      packId: "private:never-forward",
    });
    assert.equal((html.match(/aria-label="Main navigation"/g) || []).length, 1);
    for (const [id] of all) {
      const prefix = ["map", "help"].includes(surface)
        ? ""
        : "http://127.0.0.1:5175";
      const href = prefix + "/?tool=" + id;
      assert.equal(
        html.split('href="' + href + '"').length - 1,
        1,
        surface + ": " + id,
      );
      assert.ok(
        html.includes(
          'href="' + href + '" target="_blank" rel="noopener noreferrer"',
        ),
      );
    }
    assert.ok(html.indexOf(">Boss checklist</a>") < html.indexOf("<details"));
    assert.ok(html.includes(">Content Studio<"));
    for (const href of html.matchAll(/href="([^"]+)"/g))
      if (href[1].includes("?tool="))
        assert.ok(!href[1].includes("pack=") && !href[1].includes("private:"));
  }
});

test("042 sitemap lists the same local navigation-only tools without private identities", () => {
  const html = renderSiteMap([], []);
  for (const [id] of [...destinations.tools, ...destinations.planner])
    assert.ok(html.includes("http://127.0.0.1:5175/?tool=" + id));
  assert.ok(
    !html.includes("boss=") &&
      !html.includes("session=") &&
      !html.includes("pack="),
  );
});
