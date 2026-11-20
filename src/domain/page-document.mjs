import { assert, boundedWalk, ID, parseBounded } from "../content/limits.mjs";
import { validateSourceEdits } from "./page-source-edits.mjs";
export const PAGE_LIMITS = Object.freeze({
  bytes: 262144,
  sections: 32,
  blocks: 128,
  assets: 9,
  anchors: 256,
});
export const PAGE_ADAPTERS = [
  "catalog",
  "weapon-intel",
  "weapon-acquisition",
  "weapon-camos",
  "boss-reference",
  "key-reference",
  "loot-type-reference",
  "mission-chapter",
];
export const isPageProjection = (v) =>
  PAGE_PROJECTIONS.includes(v) ||
  /^detail:[a-z0-9-]{1,100}$/.test(v) ||
  /^step:[0-9]{1,2}$/.test(v);
export const PAGE_PROJECTIONS = [
  "details",
  "summary",
  "requirements",
  "steps",
  "rewards",
  "locations",
  "related",
  "sources",
  "pictures",
  "stats",
  "chapter",
];
const hex = /^[a-f0-9]{64}$/,
  slug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export function exact(v, fields) {
  assert(
    v &&
      typeof v === "object" &&
      !Array.isArray(v) &&
      Object.keys(v).sort().join() === fields.split(" ").sort().join(),
    "Unexpected page fields",
  );
}
const text = (v, max = 2000, empty = true) =>
  assert(
    typeof v === "string" &&
      v.length <= max &&
      (empty || v.trim().length > 0) &&
      !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(v),
    "Invalid page text",
  );
const integer = (v) =>
  assert(Number.isSafeInteger(v) && v >= 0, "Invalid page revision");
const stable = (v, p) =>
  assert(
    typeof v === "string" && new RegExp(`^${p}-[a-f0-9]{32}$`).test(v),
    "Invalid stable page ID",
  );
export const newPageId = (prefix) =>
  `${prefix}-${crypto.randomUUID().replaceAll("-", "")}`;
export function validatePageTarget(t) {
  exact(t, "adapter scope recordId");
  assert(PAGE_ADAPTERS.includes(t.adapter), "Unknown page adapter");
  const str = (s) => typeof s === "string" && s.length <= 100;
  if (t.adapter === "catalog") {
    exact(t.scope, "packKey packId");
    assert(
      str(t.scope.packKey) &&
        slug.test(t.scope.packKey) &&
        str(t.scope.packId) &&
        ID.test(t.scope.packId) &&
        str(t.recordId) &&
        ID.test(t.recordId),
      "Invalid catalog page target",
    );
    return {
      adapter: t.adapter,
      scope: { packKey: t.scope.packKey, packId: t.scope.packId },
      recordId: t.recordId,
    };
  }
  exact(t.scope, "game mode catalogId");
  assert(
    t.scope.game === "mw4" &&
      t.scope.mode === "dmz" &&
      str(t.scope.catalogId) &&
      slug.test(t.scope.catalogId) &&
      str(t.recordId) &&
      (slug.test(t.recordId) || ID.test(t.recordId)),
    "Invalid specialized page target",
  );
  return {
    adapter: t.adapter,
    scope: { game: "mw4", mode: "dmz", catalogId: t.scope.catalogId },
    recordId: t.recordId,
  };
}
export function stableJSON(v) {
  return JSON.stringify(v, (_k, x) =>
    x && typeof x === "object" && !Array.isArray(x)
      ? Object.fromEntries(
          Object.entries(x).sort(([a], [b]) => a.localeCompare(b, "en")),
        )
      : x,
  );
}
export async function pageHash(value) {
  const bytes =
    typeof value === "string" ? new TextEncoder().encode(value) : value;
  return [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))]
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("");
}
export const pageKey = (target) =>
  pageHash(JSON.stringify(validatePageTarget(target)));
export const pagePath = (key) => {
  assert(hex.test(key), "Invalid page key");
  return `content/page-documents/${key.slice(0, 2)}/${key}.json`;
};
export const semanticFingerprint = (record) => pageHash(stableJSON(record));
export function pageAssets(document) {
  const assets = new Set();
  const walk = (b) => {
    if (b.type === "image") assets.add(b.assetId);
    if (b.type === "gallery") b.entries.forEach((e) => assets.add(e.assetId));
    if (b.type === "group") b.children.forEach(walk);
  };
  document.sections.forEach((s) => s.blocks.forEach(walk));
  return [...assets];
}
export function validatePageDocument(
  doc,
  { target, assetIds, resolveReference } = {},
) {
  boundedWalk(doc, { depth: 10, nodes: 12000, string: 2000 });
  assert(
    new TextEncoder().encode(JSON.stringify(doc)).length <= PAGE_LIMITS.bytes,
    "Page document byte limit",
  );
  exact(
    doc,
    "version target revision baseFingerprint sections deletedAnchors sourceEdits",
  );
  validateSourceEdits(doc.sourceEdits);
  assert(doc.version === 1, "Unsupported page document version");
  const t = validatePageTarget(doc.target);
  if (target)
    assert(
      JSON.stringify(t) === JSON.stringify(validatePageTarget(target)),
      "Page target mismatch",
    );
  integer(doc.revision);
  assert(hex.test(doc.baseFingerprint), "Invalid page base fingerprint");
  assert(
    Array.isArray(doc.sections) && doc.sections.length <= 32,
    "Page section limit",
  );
  const ids = new Set(),
    sections = new Set();
  let count = 0;
  const identify = (id, p) => {
    stable(id, p);
    assert(!ids.has(id), "Duplicate page ID");
    ids.add(id);
  };
  function placement(b) {
    text(b.assetId, 100, false);
    assert(ID.test(b.assetId), "Invalid page asset ID");
    if (assetIds)
      assert(
        assetIds.includes(b.assetId),
        "Page picture is not attached to this record",
      );
    text(b.alt);
    text(b.caption);
    assert(
      typeof b.decorative === "boolean" &&
        (b.decorative ? b.alt === "" : b.alt.trim().length > 0),
      "Picture needs a contextual description",
    );
    assert(
      ["contain", "cover"].includes(b.fit) &&
        [b.focalX, b.focalY].every(
          (n) =>
            typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 1,
        ),
      "Invalid picture placement",
    );
  }
  function block(b, nested = false) {
    assert(++count <= 128, "Page block limit");
    identify(b.id, "b");
    switch (b.type) {
      case "paragraph":
        exact(b, "id type text");
        text(b.text);
        break;
      case "heading":
        exact(b, "id type text level");
        text(b.text, 120, false);
        assert([2, 3].includes(b.level), "Invalid heading level");
        break;
      case "list":
        exact(b, "id type ordered entries");
        assert(
          typeof b.ordered === "boolean" &&
            Array.isArray(b.entries) &&
            b.entries.length <= 50,
          "Invalid list",
        );
        b.entries.forEach((e) => text(e));
        break;
      case "steps":
        exact(b, "id type entries");
        assert(
          Array.isArray(b.entries) && b.entries.length <= 50,
          "Invalid steps",
        );
        b.entries.forEach((e) => {
          exact(e, "id text");
          identify(e.id, "t");
          text(e.text);
        });
        break;
      case "callout":
        exact(b, "id type tone text");
        assert(["info", "tip", "warning"].includes(b.tone), "Invalid callout");
        text(b.text);
        break;
      case "image":
        exact(b, "id type assetId alt decorative caption fit focalX focalY");
        placement(b);
        break;
      case "gallery":
        exact(b, "id type entries");
        assert(
          Array.isArray(b.entries) && b.entries.length <= 9,
          "Invalid gallery",
        );
        b.entries.forEach((e) => {
          exact(e, "assetId alt decorative caption fit focalX focalY");
          placement(e);
        });
        break;
      case "table":
        exact(b, "id type columns rows");
        assert(
          Array.isArray(b.columns) &&
            b.columns.length > 0 &&
            b.columns.length <= 8 &&
            Array.isArray(b.rows) &&
            b.rows.length <= 50,
          "Invalid table",
        );
        b.columns.forEach((c) => text(c, 120, false));
        b.rows.forEach((r) => {
          assert(
            Array.isArray(r) && r.length === b.columns.length,
            "Table column mismatch",
          );
          r.forEach((c) => text(c, 500));
        });
        break;
      case "reference":
        exact(b, "id type target label");
        validatePageTarget(b.target);
        text(b.label, 120, false);
        if (resolveReference)
          assert(resolveReference(b.target), "Unresolved page link");
        break;
      case "group":
        exact(b, "id type columns children");
        assert(
          !nested && b.columns === 2 && Array.isArray(b.children),
          "Recursive page group",
        );
        b.children.forEach((c) => block(c, true));
        break;
      case "managed":
        exact(b, "id type projection");
        assert(
          isPageProjection(b.projection),
          "Unknown managed page projection",
        );
        break;
      default:
        throw Error("Unknown page block type");
    }
  }
  for (const s of doc.sections) {
    exact(s, "id title kind slot layout collapsed blocks");
    identify(s.id, "s");
    sections.add(s.id);
    text(s.title, 120, false);
    assert(
      ["custom", "managed"].includes(s.kind) &&
        ["stacked", "two-column"].includes(s.layout) &&
        typeof s.collapsed === "boolean" &&
        Array.isArray(s.blocks),
      "Invalid page section",
    );
    assert(
      s.kind === "custom" ? s.slot === null : isPageProjection(s.slot),
      "Invalid managed section slot",
    );
    s.blocks.forEach((b) => block(b));
  }
  assert(
    Array.isArray(doc.deletedAnchors) &&
      doc.deletedAnchors.length <= 256 &&
      new Set(doc.deletedAnchors).size === doc.deletedAnchors.length,
    "Deleted anchor limit",
  );
  doc.deletedAnchors.forEach((id) => {
    stable(id, "s");
    assert(!sections.has(id), "Active section cannot be retired");
  });
  assert(pageAssets(doc).length <= 9, "Page picture limit");
  return doc;
}
export const parsePageDocument = (text, options) =>
  validatePageDocument(
    parseBounded(text, 262144, { depth: 10, nodes: 12000, string: 2000 }),
    options,
  );
export function createPageDocument(target, fingerprint) {
  return {
    version: 1,
    target: validatePageTarget(target),
    revision: 0,
    baseFingerprint: fingerprint,
    sections: [
      {
        id: newPageId("s"),
        title: "Details",
        kind: "managed",
        slot: "details",
        layout: "stacked",
        collapsed: false,
        blocks: [
          { id: newPageId("b"), type: "managed", projection: "details" },
        ],
      },
    ],
    deletedAnchors: [],
    sourceEdits: [],
  };
}
export function retirePageSection(doc, id) {
  const next = structuredClone(doc);
  assert(
    next.sections.some((s) => s.id === id),
    "Unknown section",
  );
  next.sections = next.sections.filter((s) => s.id !== id);
  next.deletedAnchors = [...new Set([...next.deletedAnchors, id])];
  return validatePageDocument(next);
}
export function restorePageDocument(current, restored) {
  const next = structuredClone(validatePageDocument(restored));
  const active = new Set(next.sections.map((s) => s.id));
  next.deletedAnchors = [
    ...new Set([
      ...current.deletedAnchors,
      ...current.sections.map((s) => s.id),
      ...next.deletedAnchors,
    ]),
  ].filter((id) => !active.has(id));
  return validatePageDocument(next);
}
