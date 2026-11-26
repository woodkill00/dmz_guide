import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { pageEditorFixture } from "../helpers/page-editor.mjs";
import { newPageId } from "../../src/domain/page-document.mjs";
import { weaponURL } from "../../src/domain/weapon-routes.mjs";
test("093 specialized source adapters validate and atomically roundtrip without mutating player progress", async () => {
  const f = await pageEditorFixture();
  try {
    for (const path of [
      "content/weapon-intel.json",
      "content/weapon-acquisition.json",
      "src/ui/weapon-camos.json",
      "src/ui/keys.json",
      "src/ui/key-supplemental.json",
      "src/ui/key-images.json",
      "src/ui/key-access.json",
    ]) {
      await mkdir(dirname(join(f.root, path)), { recursive: true });
      await writeFile(
        join(f.root, path),
        await readFile(new URL("../../" + path, import.meta.url)),
      );
    }
    for (const [adapter, catalogId, id, edit] of [
      [
        "weapon-intel",
        "weapon-intel",
        "han-86",
        (r) => (r.apex += " · synthetic test"),
      ],
      [
        "weapon-acquisition",
        "weapon-acquisition",
        "han-86",
        (r) => (r.name += " synthetic"),
      ],
      [
        "weapon-camos",
        "weapon-camos",
        "han-86",
        (r) => (r.rows[0].requirement += " · synthetic fixture"),
      ],
      [
        "key-reference",
        "keys",
        "mirae-electrical-room",
        (r) => (r.acquisition += " · synthetic fixture"),
      ],
      [
        "key-reference",
        "keys",
        "hospital-chemical-lab",
        (r) => (r.acquisition += " · synthetic fixture"),
      ],
      [
        "mission-chapter",
        "mission-chapters",
        "hajin-1",
        (r) => r.rewards.push("Synthetic software test"),
      ],
    ]) {
      const q = new URLSearchParams({
        adapter,
        catalogId,
        id,
        intent: "compose",
      });
      const response = await fetch(f.app.url + "/api/page-edits/record?" + q, {
        headers: f.headers,
      });
      assert.equal(response.status, 200, await response.clone().text());
      const state = await response.json();
      state.document.sections.push({
        id: newPageId("s"),
        title: "Reference test",
        kind: "custom",
        slot: null,
        layout: "stacked",
        collapsed: false,
        blocks: [
          {
            id: newPageId("b"),
            type: "reference",
            target: f.target("test:material"),
            label: "Synthetic source reference",
          },
        ],
      });
      if (adapter === "weapon-acquisition") {
        const incompatible = structuredClone(state);
        incompatible.record.name += " incompatible synthetic rename";
        await assert.rejects(
          f.post("/api/page-edits/preview", {
            target: incompatible.target,
            record: incompatible.record,
            contentVersion: incompatible.pack.contentVersion,
            document: incompatible.document,
            uploads: [],
            repositoryRevision: incompatible.repositoryRevision,
            pageRevision: incompatible.pageRevision,
          }),
          /Camo weapon mismatch/,
        );
        assert.equal(
          (
            await (
              await fetch(f.app.url + "/api/page-edits/record?" + q, {
                headers: f.headers,
              })
            ).json()
          ).record.name,
          state.record.name,
        );
      }
      if (adapter === "weapon-acquisition")
        state.record.blueprints[0].method += " (synthetic fixture)";
      else edit(state.record);
      const preview = await f.post("/api/page-edits/preview", {
        target: state.target,
        record: state.record,
        contentVersion: state.pack.contentVersion,
        document: state.document,
        uploads: [],
        repositoryRevision: state.repositoryRevision,
        pageRevision: state.pageRevision,
      });
      assert.equal(preview.semanticChange, true);
      const saved = await f.post("/api/page-edits/commit", {
        operationId: newPageId("o").slice(2),
        target: state.target,
        expectedRevision: preview.expectedRevision,
        expectedDocumentRevision: preview.expectedDocumentRevision,
        previewDigest: preview.previewDigest,
      });
      assert.equal(saved.state, "committed");
      const reopened = await (
        await fetch(f.app.url + "/api/page-edits/record?" + q, {
          headers: f.headers,
        })
      ).json();
      assert.equal(reopened.document.revision, 1);
      assert.equal(reopened.baseChanged, false);
      const weaponSection = {
        "weapon-intel": "reference",
        "weapon-acquisition": "acquisition",
        "weapon-camos": "camos",
      }[adapter];
      if (weaponSection)
        assert.equal(reopened.readerURL, weaponURL(id, weaponSection));
      assert(reopened.document.sourceEdits.length > 0);
      assert(
        reopened.document.sourceEdits.every((e) => e.origin === "local-author"),
      );
      if (adapter === "weapon-camos") {
        const correction = reopened.document.sourceEdits.find((e) =>
          e.path.endsWith("/requirement"),
        );
        assert(correction.path.startsWith("/rows/@"));
        assert.match(correction.after, /synthetic fixture/);
        assert(!correction.before.includes("synthetic fixture"));
      }
      const view = await fetch(f.app.url + "/page-preview?" + q);
      assert.equal(view.status, 200);
      const html = await view.text();
      assert.match(html, /Saved repository source/);
      assert.match(
        html,
        /href="\/preview\?packKey=test&amp;id=test%3Amaterial">Synthetic source reference/,
      );
    }
  } finally {
    await f.close();
  }
});
