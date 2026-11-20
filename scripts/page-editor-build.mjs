import { servicePath } from "../src/domain/local-services.mjs";
import { assertSafePath, readCatalogFile } from "./catalog.mjs";
import {
  SOURCE_ADAPTERS,
  specialEditorURL,
  specialProjections,
} from "./page-adapters.mjs";
import { pageKey } from "../src/domain/page-document.mjs";
import { renderPageComposition } from "../src/ui/page-composition.mjs";
import { bundledAssetURL } from "../src/content/bundled-assets.mjs";
import { pageReferenceRoutes } from "./page-documents.mjs";
import { stableJSON } from "../src/domain/page-document.mjs";
const e = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export async function attachSpecialEditors({
  root,
  pages,
  documents,
  bundled,
  catalog,
}) {
  for (const [adapter, config] of Object.entries(SOURCE_ADAPTERS)) {
    const chapter = adapter === "mission-chapter";
    if (
      !chapter &&
      !(await assertSafePath(root, config.path, { optional: true }))
    )
      continue;
    const source = chapter
      ? {
          chapters: pages
            .filter((p) => p.chapterRecord)
            .map((p) => p.chapterRecord),
        }
      : JSON.parse(
          new TextDecoder().decode(
            await readCatalogFile(root, config.path, 8388608),
          ),
        );
    let records = source[config.collection];
    if (
      adapter === "key-reference" &&
      (await assertSafePath(root, "src/ui/key-supplemental.json", {
        optional: true,
      }))
    ) {
      const other = JSON.parse(
        new TextDecoder().decode(
          await readCatalogFile(root, "src/ui/key-supplemental.json", 524288),
        ),
      );
      records = records.concat(other.keys);
    }
    for (const record of records) {
      const target = {
          adapter,
          scope: { game: "mw4", mode: "dmz", catalogId: config.catalogId },
          recordId: record.id,
        },
        route = config.route(record.id),
        page = pages.find((p) => p.path === route.split(/[?#]/)[0]);
      if (!page) continue;
      const saved = documents.documents.get(await pageKey(target));
      const referenceRoutes = saved
        ? pageReferenceRoutes(catalog.entries, saved.document)
        : {};
      const correctionTable = saved?.document.sourceEdits.length
        ? `<section class="panel local-source-corrections"><h2>Local authored corrections</h2><p>The Current column contains local edits, not the publisher's captured wording. Original source links apply to the Original column. These corrections are not independently verified.</p><div class="page-table" tabindex="0" role="region" aria-label="Source corrections"><table><thead><tr><th scope="col">Field</th><th scope="col">Original</th><th scope="col">Current (local)</th></tr></thead><tbody>${saved.document.sourceEdits.map((change) => `<tr><th scope="row">${e(change.path)}</th><td>${e(change.beforePresent ? change.before : "Not present")}</td><td>${e(change.afterPresent ? change.after : "Removed")} · ${e(change.editedAt)}</td></tr>`).join("")}</tbody></table></div></section>`
        : "";
      const compose = saved
        ? `<aside class="notice">This source includes local edits. Original source references do not independently verify those edits.</aside>${renderPageComposition(saved.document, { projections: specialProjections(saved.record), imageURL: (id) => bundledAssetURL(saved.entry.pack, id, bundled.manifest), referenceURL: (t) => referenceRoutes[stableJSON(t)] || null })}`
        : "";
      const action = `${correctionTable}<p class="record-author-actions"><a class="button" href="${e(servicePath("author", specialEditorURL(target)))}" data-compose-source="${adapter}">Edit ${adapter === "weapon-acquisition" ? e(record.name) + " reference" : "page"}</a><small>Local repository editor · private player progress stays separate. Start with <code>npm run author</code> if the editor is offline.</small></p>${chapter ? "" : compose}`;
      if (chapter && saved)
        page.body = page.body.replace(
          /<div data-chapter-report>[\s\S]*?<\/div>/,
          () => compose,
        );
      if (adapter === "weapon-camos" && saved)
        for (const change of saved.document.sourceEdits) {
          const match = /^\/rows\/(\d+|@[^/]+)\/requirement$/.exec(change.path),
            row =
              match &&
              (match[1].startsWith("@")
                ? record.rows.find((r) => r.id === match[1].slice(1))
                : record.rows[Number(match[1])]);
          if (row)
            page.body = page.body
              .replace(
                `<article data-camo-detail="${row.id}"`,
                `<article data-local-correction="true" data-camo-detail="${row.id}"`,
              )
              .replace(
                new RegExp(`(<article[^>]*data-camo-detail="${row.id}"[^>]*>)`),
                `$1<p class="notice">Local authored requirement · original source: ${e(change.before)}</p>`,
              );
        }
      if (adapter === "weapon-acquisition") {
        const pattern = new RegExp(
          `(<details[^>]*data-acquisition-weapon="${record.id}"[\\s\\S]*?<div class="acq-weapon-body">)`,
        );
        page.body = page.body.replace(pattern, (match) => match + action);
      } else page.body = action + page.body;
      page.styles = [
        ...new Set([
          ...(page.styles || []),
          "/assets/src/ui/page-composition.css",
        ]),
      ];
    }
  }
}
