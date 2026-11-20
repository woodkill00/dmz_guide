import { servicePath } from "../src/domain/local-services.mjs";
import { renderPageComposition } from "../src/ui/page-composition.mjs";
import { renderMainNavigation } from "../src/ui/site-navigation.mjs";
import { stableJSON } from "../src/domain/page-document.mjs";
const e = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export function renderSpecialPagePreview(state) {
  const composition = renderPageComposition(state.document, {
    projections: state.projections,
    imageURL: (id) =>
      `/api/media?packKey=${encodeURIComponent(state.mediaPackKey)}&assetId=${encodeURIComponent(id)}`,
    referenceURL: (t) => state.referenceRoutes?.[stableJSON(t)] || null,
  });
  return `<!doctype html><html lang="en" data-theme="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(state.record.name || state.target.recordId)} · Saved page preview</title><link rel="stylesheet" href="/assets/src/styles.css"><link rel="stylesheet" href="/assets/src/ui/compact-navigation.css"><link rel="stylesheet" href="/assets/src/ui/page-composition.css"></head><body>${renderMainNavigation({ surface: "studio", page: "studio" })}<main><p class="notice">Saved repository source · normal reader requires a rebuild. Local edits are not independently verified by the original source.</p><h1>${e(state.record.name || state.target.recordId)}</h1><p><a href="/${e(new URLSearchParams({ adapter: state.target.adapter, catalogId: state.target.scope.catalogId, id: state.target.recordId, intent: "compose" }).toString() ? "?" + new URLSearchParams({ adapter: state.target.adapter, catalogId: state.target.scope.catalogId, id: state.target.recordId, intent: "compose" }) : "")}">Edit page</a> · <a href="${e(servicePath("guide", state.readerURL))}">Open normal reader</a></p>${composition}<details><summary>Current source reference</summary>${Object.values(
    state.projections,
  )
    .map((p) => p.html)
    .join("")}</details></main></body></html>`;
}
