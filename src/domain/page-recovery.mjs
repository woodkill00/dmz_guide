import { assert, boundedWalk } from "../content/limits.mjs";
import {
  exact,
  validatePageTarget,
  validatePageDocument,
  createPageDocument,
  newPageId,
  stableJSON,
} from "./page-document.mjs";
import { validatePageBundle } from "./page-bundle.mjs";
import { validatePNGPixelStream } from "../content/bundled-assets.mjs";
import { bytesFromBase64 } from "../content/portable.mjs";
export async function validatePageRecovery(value) {
  boundedWalk(value, { depth: 20, nodes: 40000, string: 2796204 });
  boundedWalk(value.record, { depth: 16, nodes: 20000, string: 20000 });
  assert(
    new TextEncoder().encode(JSON.stringify(value)).length <= 20971520,
    "Recovery draft exceeds20MiB",
  );
  exact(
    value,
    "version dirty target checkoutId baseRevision baseDocumentRevision fingerprint document record contentVersion uploads operation",
  );
  assert(
    value.version === 1 && typeof value.dirty === "boolean",
    "Unsupported recovery draft version",
  );
  validatePageTarget(value.target);
  assert(
    [value.checkoutId, value.baseRevision, value.fingerprint].every(
      (v) => typeof v === "string" && /^[a-f0-9]{64}$/.test(v),
    ),
    "Invalid recovery owner/base",
  );
  assert(
    Number.isSafeInteger(value.baseDocumentRevision) &&
      value.baseDocumentRevision >= 0 &&
      value.record?.id === value.target.recordId &&
      typeof value.contentVersion === "string" &&
      value.contentVersion.length <= 100,
    "Invalid recovery record",
  );
  // Incomplete prose is recoverable, but future schemas, active markup and unsafe structure are not.
  const shape = structuredClone(value.document);
  assert(shape.version === 1, "Unsupported recovery page version");
  for (const section of shape.sections || []) {
    if (section.title === "") section.title = "Unfinished section";
    const walk = (b) => {
      if (b.type === "heading" && b.text === "") b.text = "Unfinished heading";
      if (b.type === "image" && !b.decorative && b.alt === "")
        b.alt = "Unfinished picture description";
      if (b.type === "gallery")
        for (const p of b.entries)
          if (!p.decorative && p.alt === "")
            p.alt = "Unfinished picture description";
      if (b.type === "table") {
        b.columns = b.columns.map((v) => (v === "" ? "Unfinished column" : v));
        for (const r of b.rows)
          assert(Array.isArray(r) && r.length <= 8, "Invalid unfinished table");
        b.rows = b.rows.map((r) =>
          r.length === b.columns.length ? r : Array(b.columns.length).fill(""),
        );
      }
      if (b.type === "group") b.children.forEach(walk);
    };
    section.blocks.forEach(walk);
  }
  validatePageDocument(shape, { target: value.target });
  assert(
    Array.isArray(value.uploads) && value.uploads.length <= 9,
    "Recovery picture count exceeded",
  );
  let total = 0;
  const ids = new Set();
  for (const u of value.uploads) {
    exact(u, "asset base64");
    const { path, ...metadata } = u.asset;
    assert(
      typeof path === "string" && path.length <= 300 && !ids.has(metadata.id),
      "Invalid recovery picture identity",
    );
    ids.add(metadata.id);
    assert(
      metadata.mime === "image/png",
      "Recovery pixels must be normalized PNG",
    );
    total += metadata.bytes;
    assert(total <= 8388608, "Recovery picture budget exceeded");
    const doc = createPageDocument(value.target, value.fingerprint);
    doc.sections[0].blocks = [
      {
        id: newPageId("b"),
        type: "image",
        assetId: metadata.id,
        alt: "Recovery picture validation",
        decorative: false,
        caption: "",
        fit: "contain",
        focalX: 0.5,
        focalY: 0.5,
      },
    ];
    await validatePageBundle({
      format: "dmz-page-document-bundle",
      version: 1,
      mode: "self-contained",
      target: value.target,
      base: {
        semanticFingerprint: doc.baseFingerprint,
        canonicalRevision: value.baseRevision,
        documentRevision: doc.revision,
      },
      document: doc,
      assets: [{ metadata, data: u.base64 }],
    });
    await validatePNGPixelStream(bytesFromBase64(u.base64));
  }
  if (value.operation) {
    exact(
      value.operation,
      "operationId target expectedRevision expectedDocumentRevision previewDigest",
    );
    assert(
      /^[a-f0-9]{32}$/.test(value.operation.operationId) &&
        /^[a-f0-9]{64}$/.test(value.operation.previewDigest) &&
        value.operation.expectedRevision === value.baseRevision &&
        Number.isSafeInteger(value.operation.expectedDocumentRevision) &&
        value.operation.expectedDocumentRevision >= 0 &&
        stableJSON(value.operation.target) === stableJSON(value.target),
      "Invalid recovery operation owner",
    );
  }
  return value;
}
