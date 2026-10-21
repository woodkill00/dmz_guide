import test from "node:test";
import assert from "node:assert/strict";
import { renderSavedPreview } from "../../scripts/author-preview.mjs";
import { fixtureCatalog } from "../helpers/catalog.mjs";

test("saved preview uses validated local IDs, saved revision and lazy media", () => {
  const snapshot = structuredClone(fixtureCatalog);
  const entry = snapshot.entries.find((item) =>
    item.pack.items.some((record) => record.assetId),
  );
  const record = entry.pack.items.find((item) => item.assetId);
  const html = renderSavedPreview(snapshot, entry.key, record.id);
  assert.match(html, /Saved repository preview/);
  assert.ok(html.includes('rel="icon" href="/assets/src/favicon.svg"'));
  assert.ok(html.includes(snapshot.revision));
  assert.match(html, /loading="lazy"/);
  assert.ok(
    html.includes(
      `/api/media?packKey=${entry.key}&amp;assetId=${encodeURIComponent(record.assetId)}`,
    ),
  );
  assert.doesNotMatch(html, /src="\/assets\/bundled|<script|Open planner/);
  assert.equal(renderSavedPreview(snapshot, "missing", record.id), null);
  assert.equal(renderSavedPreview(snapshot, entry.key, "missing:record"), null);
});

test("preview text is escaped and per-call image resolution cannot leak another catalog", () => {
  const snapshot = structuredClone(fixtureCatalog);
  const entry = snapshot.entries.find((item) =>
    item.pack.items.some((record) => record.assetId),
  );
  const record = entry.pack.items.find((item) => item.assetId);
  record.name = '<img src=x onerror="bad()">';
  const first = renderSavedPreview(snapshot, entry.key, record.id);
  assert.doesNotMatch(first, /<img src=x/);
  assert.match(first, /&lt;img src=x/);
  const second = structuredClone(snapshot);
  second.entries.find((item) => item.key === entry.key).key = "alternate";
  const alternate = renderSavedPreview(second, "alternate", record.id);
  assert.match(alternate, /packKey=alternate/);
  assert.equal(renderSavedPreview(snapshot, entry.key, record.id), first);
});
