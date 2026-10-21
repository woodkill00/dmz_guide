import {
  allRecords,
  escapeHTML as e,
  renderDetail,
} from "../src/ui/render.mjs";

/** Render only validated saved source, with no browser profile or build mutation. */
export function renderSavedPreview(snapshot, packKey, id) {
  const entry = snapshot.entries.find((candidate) => candidate.key === packKey);
  if (!entry) return null;
  const packs = snapshot.entries.map((candidate) => candidate.pack);
  const pack = entry.pack;
  const record = allRecords([pack]).find((candidate) => candidate.id === id);
  const referenceURL = (target) => {
    const targetEntry = snapshot.entries.find(
      (candidate) => candidate.pack.id === target.pack.id,
    );
    return targetEntry
      ? `/preview?packKey=${encodeURIComponent(targetEntry.key)}&id=${encodeURIComponent(target.id)}`
      : "/";
  };
  const imageURL = (targetPack, assetId) => {
    const targetEntry = snapshot.entries.find(
      (candidate) => candidate.pack.id === targetPack.id,
    );
    if (
      !targetEntry ||
      !targetPack.assets.some((asset) => asset.id === assetId)
    )
      return null;
    return `/api/media?packKey=${encodeURIComponent(targetEntry.key)}&assetId=${encodeURIComponent(assetId)}`;
  };
  const auxiliary =
    !record &&
    ["sources", "claims", "assets"]
      .flatMap((group) => pack[group] || [])
      .find((candidate) => candidate.id === id);
  if (!record && !auxiliary) return null;
  const title = record?.spoiler
    ? "Spoiler-protected record"
    : record?.name || record?.title || auxiliary?.title || id;
  const body = record
    ? renderDetail(record, packs, {
        imageURL,
        referenceURL,
        catalogURL: "/",
        showPlanner: false,
      })
    : `<h1>${e(title)}</h1><p>This supporting record has no public detail route.</p><pre class="panel">${e(JSON.stringify(auxiliary, null, 2))}</pre>`;
  return `<!doctype html><html lang="en" data-theme="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="icon" href="/assets/src/favicon.svg" type="image/svg+xml"><title>${e(title)} · Saved repository preview</title><link rel="stylesheet" href="/assets/src/styles.css"></head><body><main id="main"><aside class="notice"><strong>Saved repository preview</strong><p>Content version: ${e(pack.contentVersion)}. Saved revision: <span data-saved-revision>${e(snapshot.revision)}</span>.</p><p>Unsaved Studio drafts and private player profiles are not shown. Reload after saving to see the latest source. The public build is unchanged until you run its build command.</p><a href="/">Return to Content Studio</a></aside>${body}</main></body></html>`;
}
