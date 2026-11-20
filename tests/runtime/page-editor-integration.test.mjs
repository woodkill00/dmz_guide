import test from "node:test";
import assert from "node:assert/strict";
import { pageEditorFixture } from "../helpers/page-editor.mjs";
import { createAuthorStore } from "../../scripts/author-store.mjs";
import { renderDetail, allRecords } from "../../src/ui/render.mjs";
import {
  createPageDocument,
  newPageId,
} from "../../src/domain/page-document.mjs";
import { newProfile } from "../../src/domain/profile.mjs";
import { upgradeNeeds } from "../../src/domain/upgrade-needs.mjs";
import { previewContentRebind } from "../../src/domain/profile-preview.mjs";
import { serializeCatalog } from "../../scripts/catalog.mjs";
import { mkdir, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
test("093 ordinary Studio deletion tolerates tombstones and refuses deletion of a customized page", async () => {
  const f = await pageEditorFixture();
  try {
    const store = await createAuthorStore({ root: f.root });
    let source = await store.read(),
      pack = structuredClone(source.entries[0].pack);
    pack.objectives = pack.objectives.filter((r) => r.id !== "test:x01-order");
    pack.contentVersion = "2";
    await store.save({
      packKey: "test",
      expectedRevision: source.revision,
      pack,
    });
    assert.equal((await store.read()).entries[0].pack.objectives.length, 2);
    const r = await f.get("test:order"),
      p = await f.post("/api/page-edits/preview", {
        target: r.target,
        record: r.record,
        contentVersion: r.pack.contentVersion,
        document: r.document,
        uploads: [],
        repositoryRevision: r.repositoryRevision,
        pageRevision: r.pageRevision,
      });
    await f.post("/api/page-edits/commit", {
      operationId: newPageId("o").slice(2),
      target: r.target,
      expectedRevision: p.expectedRevision,
      expectedDocumentRevision: p.expectedDocumentRevision,
      previewDigest: p.previewDigest,
    });
    source = await store.read();
    pack = structuredClone(source.entries[0].pack);
    pack.objectives = pack.objectives.filter((r) => r.id !== "test:order");
    pack.contentVersion = "3";
    await assert.rejects(
      store.save({ packKey: "test", expectedRevision: source.revision, pack }),
      /record|target|resolve|exist/i,
    );
  } finally {
    await f.close();
  }
});
test("093 composed references retain full pack identity and conceal spoiler targets", async () => {
  const f = await pageEditorFixture();
  try {
    const a = structuredClone(f.pack),
      b = structuredClone(f.pack);
    b.id = "test:other";
    b.items[0].name = "Other material";
    const r = allRecords([a]).find((r) => r.id === "test:order"),
      doc = createPageDocument(f.target(r.id), "a".repeat(64));
    doc.sections[0].blocks = [
      {
        id: newPageId("b"),
        type: "reference",
        label: "Exact other pack",
        target: {
          adapter: "catalog",
          scope: { packKey: "other", packId: b.id },
          recordId: "test:material",
        },
      },
    ];
    let html = renderDetail(r, [a, b], {
      pageDocument: doc,
      referenceURL: (r) => `/resolved/${r.pack.id}/${r.id}`,
    });
    assert.match(html, /\/resolved\/test:other\/test:material/);
    doc.sections[0].blocks[0].target.recordId = "test:order";
    b.objectives[0].spoiler = true;
    html = renderDetail(r, [a, b], {
      pageDocument: doc,
      referenceURL: (r) => `/resolved/${r.pack.id}/${r.id}`,
    });
    assert(!html.includes("/resolved/test:other/test:order"));
    assert.match(html, /Link unavailable/);
  } finally {
    await f.close();
  }
});
test("093 customized items retain native collection/build/photo hooks and valid section navigation", async () => {
  const f = await pageEditorFixture();
  try {
    const item = allRecords([f.pack]).find((r) => r.id === "test:material"),
      doc = createPageDocument(f.target(item.id), "a".repeat(64));
    doc.sections[0].blocks = [
      {
        id: newPageId("b"),
        type: "paragraph",
        text: "Synthetic custom item guide",
      },
    ];
    const html = renderDetail(item, [f.pack], { pageDocument: doc });
    for (const hook of [
      "data-item-workspace",
      "data-item-collection",
      "data-build-control",
      "item-private-picture-slot",
      "Synthetic custom item guide",
    ])
      assert(html.includes(hook), hook);
    assert.match(html, /href="\/inventory\/\?pack=test%3Acatalog/);
    assert(!html.includes('href="#item-find"'));
    assert(html.includes('href="#item-sources"'));
  } finally {
    await f.close();
  }
});
test("093 saved canonical upgrade costs feed collection math without changing private stock/progress; source refresh retains custom sections", async () => {
  const f = await pageEditorFixture();
  try {
    const r = await f.get("test:upgrade"),
      profile = newProfile(r.pack);
    profile.inventory["test:material"] = 1;
    const before = structuredClone(profile);
    r.record.requirements[0].quantity = 7;
    let p = await f.post("/api/page-edits/preview", {
      target: r.target,
      record: r.record,
      contentVersion: "2",
      document: r.document,
      uploads: [],
      repositoryRevision: r.repositoryRevision,
      pageRevision: r.pageRevision,
    });
    assert.equal(p.semanticChange, true);
    await f.post("/api/page-edits/commit", {
      operationId: newPageId("o").slice(2),
      target: r.target,
      expectedRevision: p.expectedRevision,
      expectedDocumentRevision: p.expectedDocumentRevision,
      previewDigest: p.previewDigest,
    });
    let current = await f.get("test:upgrade");
    const rebound = previewContentRebind(
      profile,
      current.pack,
      r.pack,
    ).candidate;
    const row = upgradeNeeds(current.pack, rebound).collection.get(
      "test:material",
    );
    assert(row.required >= 7);
    assert.equal(row.missing, row.required - 1);
    assert.deepEqual(profile, before);
    const store = await createAuthorStore({ root: f.root }),
      source = await store.read(),
      pack = structuredClone(source.entries[0].pack);
    pack.objectives.find((r) => r.id === "test:upgrade").description =
      "Refreshed synthetic source";
    pack.contentVersion = "3";
    await assert.rejects(
      store.save({ packKey: "test", expectedRevision: source.revision, pack }),
      /Customized page source changed/,
    );
    // Simulate an independent provider refresh in this disposable checkout.
    for (const [path, bytes] of serializeCatalog({
      entries: [{ key: "test", pack, assetSources: {} }],
      schema: store.schema,
    })) {
      await mkdir(dirname(join(f.root, path)), { recursive: true });
      await writeFile(join(f.root, path), bytes);
    }
    current = await f.get("test:upgrade");
    assert.equal(current.baseChanged, true);
    assert.equal(current.document.revision, 1);
    const input = {
      target: current.target,
      record: current.record,
      contentVersion: "3",
      document: current.document,
      uploads: [],
      repositoryRevision: current.repositoryRevision,
      pageRevision: current.pageRevision,
    };
    await assert.rejects(
      f.post("/api/page-edits/preview", input),
      /Source changed/,
    );
    input.document.baseFingerprint = current.fingerprint;
    p = await f.post("/api/page-edits/preview", input);
    assert.equal(p.semanticChange, false);
  } finally {
    await f.close();
  }
});
