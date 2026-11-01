import test from "node:test";
import assert from "node:assert/strict";
import { renderMainNavigation } from "../../src/ui/site-navigation.mjs";
import { renderLayout } from "../../src/ui/render.mjs";
import { renderStudioPage } from "../../src/ui/studio-page.mjs";

test("033 coverage repair: every layout type has one shared navigation landmark", () => {
  for (const page of [
    "home",
    "items",
    "catalog",
    "planner",
    "inventory",
    "collection",
    "item",
    "weapon",
    "source",
    "404",
    "contribute",
    "settings",
  ]) {
    const html = renderLayout({
      title: "Synthetic page",
      body: "",
      page,
      packId: "community:synthetic",
    });
    assert.equal((html.match(/aria-label="Main navigation"/g) || []).length, 1);
    assert.match(html, /href="\/items\/\?pack=community%3Asynthetic"/);
    assert.match(html, /href="\/collection\/\?pack=community%3Asynthetic"/);
    assert.match(
      html,
      /href="http:\/\/127\.0\.0\.1:5175\/"[^>]*target="_blank"[^>]*rel="noopener noreferrer"/,
    );
    assert.doesNotMatch(html, /5175\/[^" ]*\?pack=/);
  }
});
test("033 coverage repair: companion navigation is static, current and query-free", () => {
  for (const [surface, page] of [
    ["map", "hajin-map"],
    ["help", "map-help"],
    ["studio", "studio"],
  ]) {
    const nav = renderMainNavigation({
      surface,
      page,
      packId: "private:never-forward",
    });
    assert.match(
      nav,
      /href="http:\/\/127\.0\.0\.1:4173\/items\/"[^>]*target="_blank"[^>]*rel="noopener noreferrer"/,
    );
    assert.doesNotMatch(nav, /private:|pack=|<script|onclick/);
    assert.equal((nav.match(/aria-current="page"/g) || []).length, 1);
  }
  const help = renderMainNavigation({ surface: "help", page: "map-help" });
  assert.match(help, /href="\/help\.html" aria-current="page"/);
  const studio = renderStudioPage();
  assert.equal((studio.match(/aria-label="Main navigation"/g) || []).length, 1);
  assert.match(studio, /aria-label="Studio sections"/);
  assert.match(studio, /href="\/assets\/src\/ui\/companion-navigation\.css"/);
});
test("033 coverage repair: authored labels and paths cannot become HTML", () => {
  const nav = renderMainNavigation({
    extra: [
      {
        path: '/safe/" onmouseover="bad',
        page: "synthetic",
        title: "<img src=x onerror=bad>",
      },
    ],
  });
  assert.doesNotMatch(nav, /<img| onmouseover="/);
  assert.match(nav, /&lt;img/);
});
