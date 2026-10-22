import test from "node:test";
import assert from "node:assert/strict";
import { fixtureCatalog } from "../helpers/catalog.mjs";
import {
  authorPath,
  parseAuthorTarget,
  resolveAuthorTarget,
  previewPath,
  PUBLIC_GROUPS,
} from "../../src/content/author-target.mjs";

test("010 FR-003: strict stable identity resolves all public groups without name/index fallback", () => {
  for (const entry of fixtureCatalog.entries)
    for (const group of PUBLIC_GROUPS)
      for (const record of entry.pack[group]) {
        const target = {
          packKey: entry.key,
          packId: entry.pack.id,
          id: record.id,
          intent: "images",
        };
        const parsed = parseAuthorTarget(
          new URL(authorPath(target), "http://local").searchParams,
        );
        const resolved = resolveAuthorTarget(fixtureCatalog.entries, parsed);
        assert.equal(resolved.record.id, record.id);
        assert.equal(resolved.group, group);
        assert.equal(resolved.entry.key, entry.key);
        assert.equal(
          previewPath(target),
          `/preview?packKey=${entry.key}&id=${encodeURIComponent(record.id)}`,
        );
      }
  assert.equal(parseAuthorTarget(new URLSearchParams()), null);
});

test("010 FR-003: invalid duplicate extra mismatched and missing targets never fall back", () => {
  const entry = fixtureCatalog.entries.find((e) => e.pack.items.length);
  const target = {
    packKey: entry.key,
    packId: entry.pack.id,
    id: entry.pack.items[0].id,
    intent: "edit",
  };
  const query = new URL(authorPath(target), "http://local").search;
  for (const suffix of [
    "&id=demo:other",
    "&return=https://evil.test",
    "&intent=images",
    "&extra=1",
  ])
    assert.throws(() => parseAuthorTarget(new URLSearchParams(query + suffix)));
  for (const field of Object.keys(target)) {
    const params = new URLSearchParams(query);
    params.delete(field);
    assert.throws(() => parseAuthorTarget(params));
  }
  for (const patch of [
    { packKey: "missing" },
    { packId: "missing:pack" },
    { id: "missing:item" },
  ])
    assert.throws(() =>
      resolveAuthorTarget(fixtureCatalog.entries, { ...target, ...patch }),
    );
  for (const patch of [
    { packKey: "../escape" },
    { id: "https://evil.test" },
    { intent: "delete" },
    { packId: "wrong" },
  ])
    assert.throws(() =>
      parseAuthorTarget(new URLSearchParams({ ...target, ...patch })),
    );
});

import { renderDetail, allRecords } from "../../src/ui/render.mjs";
import {
  renderAuthorActions,
  renderAuthorGuidance,
  guidancePath,
} from "../../src/ui/author-actions.mjs";
import { renderSavedPreview } from "../../scripts/author-preview.mjs";
import { validatePack } from "../../src/content/validate.mjs";
import { readFile } from "node:fs/promises";
const schema = JSON.parse(
  await readFile(new URL("../../schemas/pack.schema.json", import.meta.url)),
);

test("010 FR-001/002: every public detail has exact contextual actions and inert startup guidance", () => {
  const groups = new Set();
  for (const entry of fixtureCatalog.entries)
    for (const record of allRecords([entry.pack])) {
      groups.add(record.recordType);
      const path = guidancePath(entry.key, record.id);
      const actions = renderAuthorActions(record, {
        edit: path + "#edit",
        images: path + "#images",
      });
      const html = renderDetail(record, [entry.pack], {
        authorActions: actions,
      });
      assert.match(html, /data-edit-record/);
      assert.match(html, /data-edit-images/);
      if (record.spoiler)
        assert(
          html.indexOf("data-edit-record") <
            html.indexOf('class="spoiler-content"'),
        );
      const guidance = renderAuthorGuidance(record, entry.key);
      assert.match(guidance, /npm run author/);
      assert.match(guidance, /read-only/);
      assert.doesNotMatch(guidance, /<script|<iframe|<img|fetch\(/);
      for (const intent of ["edit", "images"]) {
        const target = {
          packKey: entry.key,
          packId: entry.pack.id,
          id: record.id,
          intent,
        };
        assert(
          guidance.includes(
            ("http://127.0.0.1:4174" + authorPath(target)).replaceAll(
              "&",
              "&amp;",
            ),
          ),
        );
        assert(
          renderSavedPreview(fixtureCatalog, entry.key, record.id).includes(
            authorPath(target).replaceAll("&", "&amp;"),
          ),
        );
      }
    }
  assert.equal(groups.size, 6);
});

test("010 FR-005: locations accept bounded primary/additional pictures and reject broken refs", () => {
  const entry = fixtureCatalog.entries.find(
    (e) => e.pack.locations.length && e.pack.assets.length,
  );
  assert(entry, "Fixture has a location and original assets");
  const pack = structuredClone(entry.pack);
  const location = pack.locations[0];
  location.assetId = pack.assets[0].id;
  location.assetIds = [pack.assets[0].id];
  validatePack(pack, schema, { profile: "published" });
  location.assetIds = [pack.assets[0].id, pack.assets[0].id];
  assert.throws(() => validatePack(pack, schema, { profile: "published" }));
  location.assetIds = ["missing:asset"];
  assert.throws(() => validatePack(pack, schema, { profile: "published" }));
});

test("010 public guidance paths survive URL decoding on Windows and static servers", () => {
  const path = guidancePath("demo-training", "demo:field-rifle");
  assert.equal(path, "/contribute/demo-training/demo--field-rifle/");
  assert.equal(decodeURIComponent(path), path);
});
