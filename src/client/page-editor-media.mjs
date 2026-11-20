import { normalizeRaster } from "./raster-editor.mjs";
import { validatePageBundle } from "../domain/page-bundle.mjs";
import { newPageId, validatePageDocument } from "../domain/page-document.mjs";
import { bytesFromBase64, base64FromBytes } from "../content/portable.mjs";
export async function preparePageImport(bundle, assets, { signal } = {}) {
  await validatePageBundle(bundle);
  const document = structuredClone(bundle.document),
    uploads = [],
    mapping = [],
    missing = [];
  for (const entry of bundle.assets) {
    const meta = entry.metadata,
      same = assets.find((a) => a.id === meta.id && a.sha256 === meta.sha256);
    if (same) continue;
    if (entry.data === null) {
      missing.push(meta.id);
      continue;
    }
    const normalized = await normalizeRaster(bytesFromBase64(entry.data), {
      signal,
      maxDimension: 2048,
    });
    const conflict = assets.some((a) => a.id === meta.id),
      id = conflict ? `page:picture-${newPageId("b").slice(2)}` : meta.id;
    const asset = {
      ...meta,
      id,
      path: `assets/${id.replace(":", "_")}.png`,
      mime: "image/png",
      sha256: normalized.sha256,
      bytes: normalized.bytes.length,
      width: normalized.width,
      height: normalized.height,
    };
    uploads.push({ asset, base64: base64FromBytes(normalized.bytes) });
    mapping.push({
      from: meta.id,
      to: id,
      normalized: normalized.sha256 !== meta.sha256,
    });
  }
  const remap = new Map(mapping.map((m) => [m.from, m.to]));
  const walk = (b) => {
    if (b.type === "image") b.assetId = remap.get(b.assetId) || b.assetId;
    if (b.type === "gallery")
      b.entries.forEach((e) => (e.assetId = remap.get(e.assetId) || e.assetId));
    if (b.type === "group") b.children.forEach(walk);
  };
  document.sections.forEach((s) => s.blocks.forEach(walk));
  validatePageDocument(document);
  return { document, uploads, mapping, missing };
}
