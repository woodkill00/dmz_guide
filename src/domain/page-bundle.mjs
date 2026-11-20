import {
  exact,
  validatePageDocument,
  validatePageTarget,
  pageAssets,
  pageHash,
} from "./page-document.mjs";
import { assert, parseBounded, safeURL, ID } from "../content/limits.mjs";
import {
  imageInfo,
  bytesFromBase64,
  base64FromBytes,
} from "../content/portable.mjs";
export async function validatePageBundle(bundle) {
  exact(bundle, "format version mode target base document assets");
  assert(
    bundle.format === "dmz-page-document-bundle" &&
      bundle.version === 1 &&
      ["self-contained", "references-only"].includes(bundle.mode),
    "Unsupported page bundle",
  );
  validatePageTarget(bundle.target);
  validatePageDocument(bundle.document, { target: bundle.target });
  exact(bundle.base, "semanticFingerprint canonicalRevision documentRevision");
  assert(
    /^[a-f0-9]{64}$/.test(bundle.base.semanticFingerprint) &&
      /^[a-f0-9]{64}$/.test(bundle.base.canonicalRevision) &&
      Number.isSafeInteger(bundle.base.documentRevision) &&
      bundle.base.documentRevision >= 0,
    "Invalid page bundle base",
  );
  assert(
    bundle.document.baseFingerprint === bundle.base.semanticFingerprint &&
      bundle.document.revision === bundle.base.documentRevision,
    "Bundle base does not match document",
  );
  const required = pageAssets(bundle.document),
    seen = new Set();
  assert(
    Array.isArray(bundle.assets) &&
      bundle.assets.length === required.length &&
      bundle.assets.length <= 9,
    "Bundle picture coverage mismatch",
  );
  let total = 0,
    pixels = 0;
  for (const entry of bundle.assets) {
    exact(entry, "metadata data");
    const a = entry.metadata;
    exact(
      a,
      "id mime sha256 bytes width height rightsHolder license sourceUrl attribution redistributionAllowed",
    );
    assert(
      typeof a.id === "string" &&
        a.id.length <= 100 &&
        ID.test(a.id) &&
        required.includes(a.id) &&
        !seen.has(a.id),
      "Duplicate or foreign picture",
    );
    seen.add(a.id);
    assert(
      ["image/png", "image/jpeg", "image/webp"].includes(a.mime) &&
        /^[a-f0-9]{64}$/.test(a.sha256) &&
        Number.isSafeInteger(a.bytes) &&
        a.bytes > 0 &&
        a.bytes <= 2097152,
      "Invalid picture metadata",
    );
    assert(
      [a.width, a.height].every(
        (n) => Number.isSafeInteger(n) && n > 0 && n <= 2048,
      ) && a.width * a.height <= 4194304,
      "Picture pixel limit",
    );
    for (const field of ["rightsHolder", "license", "attribution"])
      assert(
        typeof a[field] === "string" &&
          a[field].trim().length > 0 &&
          a[field].length <= (field === "attribution" ? 1000 : 200),
        "Missing picture rights",
      );
    assert(
      a.redistributionAllowed === true &&
        safeURL(a.sourceUrl) &&
        a.sourceUrl.length <= 2000,
      "Picture source/permission required",
    );
    total += a.bytes;
    pixels += a.width * a.height;
    assert(
      total <= 8388608 && pixels <= 16777216,
      "Page bundle image budget exceeded",
    );
    if (bundle.mode === "references-only")
      assert(
        entry.data === null,
        "References-only bundle cannot contain pixels",
      );
    else {
      assert(
        typeof entry.data === "string" && entry.data.length <= 2796204,
        "Encoded picture limit",
      );
      const bytes = bytesFromBase64(entry.data);
      assert(
        base64FromBytes(bytes) === entry.data &&
          bytes.length === a.bytes &&
          (await pageHash(bytes)) === a.sha256,
        "Picture bytes/hash mismatch",
      );
      const info = imageInfo(bytes);
      assert(
        info.mime === a.mime &&
          info.width === a.width &&
          info.height === a.height,
        "Picture decode metadata mismatch",
      );
    }
  }
  assert(
    new TextEncoder().encode(JSON.stringify(bundle)).length <= 20971520,
    "Page bundle envelope exceeds20MiB",
  );
  return bundle;
}
export const parsePageBundle = (text) =>
  validatePageBundle(
    parseBounded(text, 20971520, { depth: 14, nodes: 20000, string: 2796204 }),
  );
export async function makePageBundle({ state, document, mode, bytes }) {
  validatePageDocument(document);
  const assets = [];
  for (const id of pageAssets(document)) {
    const source = state.pack.assets.find((a) => a.id === id);
    assert(source, "Picture is outside the author library");
    const { path, ...metadata } = source;
    assets.push({
      metadata,
      data: mode === "self-contained" ? base64FromBytes(await bytes(id)) : null,
    });
  }
  const bundle = {
    format: "dmz-page-document-bundle",
    version: 1,
    mode,
    target: state.target,
    base: {
      semanticFingerprint: document.baseFingerprint,
      canonicalRevision: state.repositoryRevision,
      documentRevision: document.revision,
    },
    document: structuredClone(document),
    assets,
  };
  return validatePageBundle(bundle);
}
