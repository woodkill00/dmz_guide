import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { loadFixturePack } from "../helpers/catalog.mjs";
import { missionChapterPages } from "../../src/ui/mission-chapter-page.mjs";
import { chapterReaderPath } from "../../src/domain/mission-chapter.mjs";
import { pageEditorFixture } from "../helpers/page-editor.mjs";
import { newPageId } from "../../src/domain/page-document.mjs";
import { readCatalog } from "../../scripts/catalog.mjs";
import { readPageDocuments } from "../../scripts/page-documents.mjs";
import { attachSpecialEditors } from "../../scripts/page-editor-build.mjs";
import { chapterOverrides } from "../../scripts/page-adapters.mjs";
import { featurePages } from "../../src/ui/progression-page.mjs";

const pack = loadFixturePack("official-starter");
test("093 T024 directory embeds current chapter reports as inert JSON", () => {
  const chapterIntel = {
    "hajin-1": {
      id: "hajin-1",
      rewards: ["Synthetic reward"],
      reviewedAt: "2026-11-18",
      notes: "</script><script>synthetic</script>",
    },
  };
  const page = featurePages([pack], { chapterIntel }).find(
    (p) => p.path === "/missions/",
  );
  const data =
    /<script type="application\/json" id="mission-chapter-reports">([\s\S]*?)<\/script>/.exec(
      page.body,
    );
  assert(data);
  assert(!data[1].includes("<"));
  assert.deepEqual(JSON.parse(data[1]), chapterIntel);
});
test("093 T024 all29 chapter routes retain exact missions, safe back links and spoiler boundaries", () => {
  const before = JSON.stringify(pack),
    pages = missionChapterPages([pack]);
  assert.equal(pages.length, 29);
  assert.equal(new Set(pages.map((p) => p.path)).size, 29);
  for (const page of pages) {
    assert.equal(page.path, chapterReaderPath(page.chapterRecord.id));
    assert.match(page.body, /<h1>/);
    assert.match(page.body, /page=(?:hajin|x01)-\d+/);
    assert.doesNotMatch(
      page.body,
      /href="\/missions\/[^"\s]*#(?:hajin|x01)-page-/,
    );
    assert.match(page.body, /Reported page rewards/);
    for (const record of pack.objectives.filter((r) => r.spoiler)) {
      assert(!page.body.includes(record.name));
      assert(!page.body.includes(record.id));
    }
  }
  assert.match(pages[0].body, /href="\/objectives\/mw4--order-gear-up\/"/);
  assert.match(pages[24].body, /href="\/objectives\/mw4--x01-order-/);
  assert.equal(JSON.stringify(pack), before);
  assert.deepEqual(missionChapterPages([]), []);
  for (const id of [
    "hajin-0",
    "hajin-25",
    "x01-6",
    "hajin-01",
    "../../x",
    "x01-1?evil",
  ])
    assert.throws(() => chapterReaderPath(id));
});

test("093 T024 chapter save/reopen compiles custom content once on its exact reader route", async () => {
  const f = await pageEditorFixture();
  try {
    const q = new URLSearchParams({
      adapter: "mission-chapter",
      catalogId: "mission-chapters",
      id: "hajin-1",
      intent: "compose",
    });
    const get = async () => {
      const response = await fetch(f.app.url + "/api/page-edits/record?" + q, {
        headers: f.headers,
      });
      assert.equal(response.status, 200);
      return response.json();
    };
    const state = await get();
    assert.equal(state.readerURL, "/missions/hajin/1/");
    assert.equal(typeof state.record.notes, "string");
    state.record.notes = "Synthetic chapter note, not game data";
    state.document.sections.push({
      id: newPageId("s"),
      title: "Synthetic chapter section",
      kind: "custom",
      slot: null,
      layout: "stacked",
      collapsed: false,
      blocks: [
        {
          id: newPageId("b"),
          type: "paragraph",
          text: "Synthetic chapter body marker",
        },
      ],
    });
    const preview = await f.post("/api/page-edits/preview", {
      target: state.target,
      record: state.record,
      contentVersion: state.pack.contentVersion,
      document: state.document,
      uploads: [],
      repositoryRevision: state.repositoryRevision,
      pageRevision: state.pageRevision,
    });
    await f.post("/api/page-edits/commit", {
      operationId: newPageId("o").slice(2),
      target: state.target,
      expectedRevision: preview.expectedRevision,
      expectedDocumentRevision: preview.expectedDocumentRevision,
      previewDigest: preview.previewDigest,
    });
    assert.equal((await get()).record.notes, state.record.notes);
    const schema = JSON.parse(
        await readFile(
          new URL("../../schemas/pack.schema.json", import.meta.url),
        ),
      ),
      catalog = await readCatalog({ root: f.root, schema }),
      documents = await readPageDocuments(f.root, catalog),
      pages = missionChapterPages([pack], await chapterOverrides(f.root));
    await attachSpecialEditors({
      root: f.root,
      pages,
      documents,
      bundled: { manifest: {} },
      catalog,
    });
    const page = pages.find((p) => p.path === "/missions/hajin/1/");
    assert.match(page.body, /data-compose-source="mission-chapter"/);
    assert.match(page.body, /id=hajin-1/);
    assert.match(page.body, /Synthetic chapter note/);
    assert.equal(
      page.body.split("Synthetic chapter body marker").length - 1,
      1,
    );
    assert(!page.body.includes("data-chapter-report"));
    assert.match(page.body, /mw4--order-gear-up/);
  } finally {
    await f.close();
  }
});
