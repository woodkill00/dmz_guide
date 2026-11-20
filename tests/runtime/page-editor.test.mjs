import test from "node:test";
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pageEditorFixture } from "../helpers/page-editor.mjs";
import {
  validatePageDocument,
  pageKey,
  newPageId,
  retirePageSection,
  restorePageDocument,
} from "../../src/domain/page-document.mjs";
import { renderPageComposition } from "../../src/ui/page-composition.mjs";
import { createPageEditorStore } from "../../scripts/page-editor-store.mjs";
import { createAuthorStore } from "../../scripts/author-store.mjs";
const input = (r) => ({
  target: r.target,
  record: r.record,
  contentVersion: r.pack.contentVersion,
  document: r.document,
  uploads: [],
  repositoryRevision: r.repositoryRevision,
  pageRevision: r.pageRevision,
});
test("093 Orders and X01 exact edit, atomic layout save, durable acknowledgement/replay, source unchanged", async () => {
  const f = await pageEditorFixture();
  try {
    const r = await f.get("test:order");
    assert.equal(r.record.id, "test:order");
    assert(Object.keys(r.projections).length);
    r.document.sections.push({
      id: newPageId("s"),
      title: "Synthetic notes",
      kind: "custom",
      slot: null,
      layout: "stacked",
      collapsed: false,
      blocks: [
        {
          id: newPageId("b"),
          type: "paragraph",
          text: "<script>inert fixture</script>",
        },
      ],
    });
    const preview = await f.post("/api/page-edits/preview", input(r));
    assert.equal(preview.semanticChange, false);
    const op = {
      operationId: newPageId("o").slice(2),
      target: r.target,
      expectedRevision: preview.expectedRevision,
      expectedDocumentRevision: preview.expectedDocumentRevision,
      previewDigest: preview.previewDigest,
    };
    const saved = await f.post("/api/page-edits/commit", op);
    assert.equal(saved.state, "committed");
    assert.equal(
      (
        await (
          await fetch(
            f.app.url + `/api/page-edits/operations/${op.operationId}`,
            { headers: f.headers },
          )
        ).json()
      ).state,
      "committed",
    );
    await assert.rejects(
      f.post("/api/page-edits/commit", {
        ...op,
        expectedDocumentRevision: op.expectedDocumentRevision + 1,
      }),
      /different|match|operation|revision/i,
    );
    assert(saved.transactionId);
    const restarted = createPageEditorStore({
      root: f.root,
      store: await createAuthorStore({ root: f.root }),
    });
    assert.equal(
      (await restarted.status(op.operationId)).repositoryRevision,
      saved.repositoryRevision,
    );
    assert.equal(
      (await restarted.commit(op)).transactionId,
      saved.transactionId,
    );
    assert.equal(
      (await f.post("/api/page-edits/commit", op)).transactionId,
      saved.transactionId,
    );
    const reload = await f.get("test:order");
    assert.equal(reload.document.revision, 1);
    assert.equal(reload.record.description, r.record.description);
    assert.equal(reload.pack.contentVersion, "1");
    const receipt = JSON.parse(
      await readFile(
        join(
          f.root,
          `.author-state/transactions/${saved.transactionId}/outcome.json`,
        ),
        "utf8",
      ),
    );
    assert.equal(receipt.state, "committed");
    assert(receipt.paths.some((p) => p.path.includes("page-documents/")));
    const x = await f.get("test:x01-order");
    assert.equal(x.record.orderSet, "x01");
    assert.equal(x.document.revision, 0);
    const cancelled = newPageId("o").slice(2);
    assert.equal(
      (await f.post(`/api/page-edits/operations/${cancelled}/cancel`, {}))
        .state,
      "not-committed",
    );
    assert.equal(
      (
        await f.post("/api/page-edits/commit", {
          ...op,
          operationId: cancelled,
        })
      ).state,
      "not-committed",
    );
    const html = renderPageComposition(reload.document, {
      projections: reload.projections,
    });
    assert(html.includes("&lt;script&gt;"));
    assert(!html.includes("<script>"));
    await writeFile(
      join(f.root, `.author-state/page-operations/${op.operationId}.json`),
      JSON.stringify({ ...saved, documentHash: "0".repeat(64) }),
    );
    const corrupt = await (
      await fetch(f.app.url + `/api/page-edits/operations/${op.operationId}`, {
        headers: f.headers,
      })
    ).json();
    assert.equal(corrupt.state, "unresolved");
    assert.equal(corrupt.receiptInvalid, true);
  } finally {
    await f.close();
  }
});
test("093 schema rejects duplicate identities, recursive groups, foreign assets, unsafe targets and future versions; retired anchors survive restore", async () => {
  const f = await pageEditorFixture();
  try {
    const r = await f.get("test:order"),
      doc = r.document;
    assert.equal((await pageKey(r.target)).length, 64);
    for (const mutate of [
      (d) => (d.version = 2),
      (d) => d.sections.push(structuredClone(d.sections[0])),
      (d) =>
        d.sections[0].blocks.push({
          id: newPageId("b"),
          type: "html",
          text: "unsafe",
        }),
      (d) => (d.target.recordId = "../../outside"),
    ]) {
      const bad = structuredClone(doc);
      mutate(bad);
      assert.throws(() => validatePageDocument(bad));
    }
    const retired = retirePageSection(doc, doc.sections[0].id);
    assert(retired.deletedAnchors.includes(doc.sections[0].id));
    const restored = restorePageDocument(retired, doc);
    assert(!restored.deletedAnchors.includes(doc.sections[0].id));
    const item = await f.get("test:material");
    item.document.sections[0].blocks.push({
      id: newPageId("b"),
      type: "managed",
      projection: "detail:overview",
    });
    await assert.rejects(
      f.post("/api/page-edits/preview", input(item)),
      /Repeated canonical section anchors/,
    );
    assert.equal((await f.get("test:material")).document.revision, 0);
    const expanded = structuredClone(doc);
    expanded.sections[0].blocks = [0, 1].map(() => ({
      id: newPageId("b"),
      type: "managed",
      projection: "details",
    }));
    assert.throws(
      () =>
        renderPageComposition(expanded, {
          projections: { details: { html: "a".repeat(4194305) } },
        }),
      /rendered-block budget/,
    );
  } finally {
    await f.close();
  }
});
