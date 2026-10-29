import test from "node:test";
import assert from "node:assert/strict";
import { fixtureCatalog } from "../helpers/catalog.mjs";
import {
  allRecords,
  renderCatalog,
  renderLayout,
  recordUrl,
} from "../../src/ui/render.mjs";
import {
  renderSiteMap,
  renderMapWorkspace,
} from "../../src/ui/navigation-page.mjs";
import {
  guidancePath,
  renderAuthorGuidance,
} from "../../src/ui/author-actions.mjs";
import {
  authorPath,
  parseAuthorTarget,
  resolveAuthorTarget,
} from "../../src/content/author-target.mjs";
const packs = fixtureCatalog.entries.map((entry) => entry.pack);
const targets = Object.fromEntries(
  fixtureCatalog.entries.map(({ key, pack }) => [
    pack.id,
    Object.fromEntries(
      pack.items.map((item) => [item.id, guidancePath(key, item.id)]),
    ),
  ]),
);
test("033 FR-001/003: compact directory includes every item and exact scoped actions", () => {
  const html = renderCatalog(packs, {
    type: "item",
    compact: true,
    authorTargets: targets,
  });
  assert.equal(
    (html.match(/class="item-row"/g) || []).length,
    packs.reduce((n, p) => n + p.items.length, 0),
  );
  assert.match(html, /id="catalog-sort"/);
  assert.match(html, /All packs/);
  for (const { key, pack } of fixtureCatalog.entries)
    for (const item of pack.items) {
      assert(html.includes(guidancePath(key, item.id) + "#edit"));
      assert(html.includes(guidancePath(key, item.id) + "#remove"));
    }
  const nav = renderLayout({
    title: "Items",
    page: "items",
    body: "",
    packId: packs[0].id,
  });
  assert.match(nav, /href="\/items\/\?pack=[^"]+" aria-current="page"/);
  assert.match(nav, />Site map<\/a>/);
});
test("033 FR-002/004: sitemap contains public routes and masked spoilers, no private state", () => {
  const html = renderSiteMap(
    [
      { path: "/items/", title: "Items" },
      { path: "/editor/", title: "Editor" },
      { path: "/contribute/x/y/", title: "Not workspace" },
    ],
    packs,
  );
  assert.match(html, /href="\/items\/"/);
  assert.doesNotMatch(html, /Not workspace/);
  for (const record of allRecords(packs))
    assert(html.includes(recordUrl(record)));
  for (const record of allRecords(packs).filter((r) => r.spoiler))
    assert(!html.includes(`>${record.name || record.title}</a>`));
  assert.match(html, /FICTIONAL FIXTURES/);
  assert.match(renderMapWorkspace(), /not live game GPS/);
  assert.match(renderMapWorkspace(), /127\.0\.0\.1:5175/);
});
test("033 FR-005: remove target keeps pack identity even when item IDs overlap", () => {
  const first = structuredClone(
    fixtureCatalog.entries.find((e) => e.pack.items.length),
  );
  const second = structuredClone(first);
  second.key = "other-catalog";
  second.pack.id = "other:catalog";
  const entries = [first, second],
    id = first.pack.items[0].id;
  for (const entry of entries) {
    const target = {
      packKey: entry.key,
      packId: entry.pack.id,
      id,
      intent: "remove",
    };
    const parsed = parseAuthorTarget(
      new URL(authorPath(target), "http://local").searchParams,
    );
    assert.equal(resolveAuthorTarget(entries, parsed).entry.key, entry.key);
    assert.match(
      renderAuthorGuidance(
        { ...entry.pack.items[0], recordType: "item", pack: entry.pack },
        entry.key,
      ),
      /intent=remove/,
    );
  }
  assert.throws(() =>
    resolveAuthorTarget(entries, {
      packKey: first.key,
      packId: second.pack.id,
      id,
      intent: "remove",
    }),
  );
  assert.throws(() =>
    resolveAuthorTarget(entries, {
      packKey: first.key,
      packId: first.pack.id,
      id: "missing:item",
      intent: "remove",
    }),
  );
  assert.throws(() =>
    parseAuthorTarget(
      new URLSearchParams({
        packKey: first.key,
        packId: first.pack.id,
        id,
        intent: "remove",
        save: "true",
      }),
    ),
  );
});

import vm from "node:vm";
import { readFileSync } from "node:fs";
import { ID } from "../../src/content/limits.mjs";
test("033 FR-004: intermediary navigation carries only a bounded pack to same-origin links", () => {
  const source = readFileSync(
    new URL("../../src/client/navigation.mjs", import.meta.url),
    "utf8",
  ).replace(/^import .*?;\n/gms, "");
  const run = (search, owningPack = "") => {
    const anchors = [
      { href: "https://guide.test/items/" },
      { href: "http://127.0.0.1:5175/" },
    ];
    vm.runInNewContext(source, {
      ID,
      URL,
      location: {
        href: "https://guide.test/sitemap/" + search,
        origin: "https://guide.test",
      },
      document: {
        body: { dataset: { navPack: owningPack } },
        querySelectorAll: () => anchors,
      },
    });
    return anchors;
  };
  const valid = run(
    "?pack=demo%3Atraining-pack&q=private-text&context=private-token",
  );
  assert.equal(
    run("?pack=other%3Apack", "demo:training-pack")[0].href,
    "https://guide.test/items/?pack=demo%3Atraining-pack",
  );
  assert.equal(
    valid[0].href,
    "https://guide.test/items/?pack=demo%3Atraining-pack",
  );
  assert.equal(valid[1].href, "http://127.0.0.1:5175/");
  assert.equal(
    run("?pack=https://bad.test")[0].href,
    "https://guide.test/items/",
  );
});
