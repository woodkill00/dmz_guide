import { validateSourceEdits } from "../src/domain/page-source-edits.mjs";
import {
  registerSpecialTarget,
  specialProjections,
  specialEditorURL,
  chapterOverrides,
} from "./page-adapters.mjs";
import { opendir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { assertSafePath, readCatalogFile, catalogJSON } from "./catalog.mjs";
import {
  exact,
  validatePageTarget,
  validatePageDocument,
  pageAssets,
  pageKey,
  pagePath,
  semanticFingerprint,
  stableJSON,
  newPageId,
} from "../src/domain/page-document.mjs";
import { assert, parseBounded } from "../src/content/limits.mjs";
import { allRecords, renderDetail, recordUrl } from "../src/ui/render.mjs";
import { renderPageComposition } from "../src/ui/page-composition.mjs";
export const PAGE_MANIFEST = "content/page-documents/manifest.json";
export const digest = (bytes) =>
  createHash("sha256").update(bytes).digest("hex");
export async function optionalBytes(root, path, max = 1048576) {
  return (await assertSafePath(root, path, { optional: true }))
    ? Buffer.from(await readCatalogFile(root, path, max))
    : null;
}
export function resolvePageTarget(entries, target) {
  validatePageTarget(target);
  if (target.adapter !== "catalog") {
    const resolved = entries.pageSpecial?.get(stableJSON(target));
    assert(resolved, "Unregistered specialized source; open its owning editor");
    return resolved;
  }
  const entry = entries.find(
    (e) => e.key === target.scope.packKey && e.pack.id === target.scope.packId,
  );
  assert(entry, "Page catalog is missing or changed");
  const groups = [
    "items",
    "recipes",
    "objectives",
    "guides",
    "maps",
    "locations",
  ];
  const matches = groups.flatMap((group) =>
    (entry.pack[group] || [])
      .filter((r) => r.id === target.recordId)
      .map((record) => ({ entry, group, record })),
  );
  assert(matches.length === 1, "Page record is missing or ambiguous");
  return matches[0];
}
export async function readPageDocuments(
  root,
  catalog,
  { overlay = new Map(), checkBase = true } = {},
) {
  const read = async (path, max) =>
    overlay.has(path) ? overlay.get(path) : optionalBytes(root, path, max);
  const bytes = await read(PAGE_MANIFEST, 1048576),
    manifest = bytes
      ? parseBounded(
          new TextDecoder("utf-8", { fatal: true }).decode(bytes),
          1048576,
          { depth: 8, nodes: 20000, string: 2000 },
        )
      : { version: 1, documents: [] };
  exact(manifest, "version documents");
  assert(
    manifest.version === 1 &&
      Array.isArray(manifest.documents) &&
      manifest.documents.length <= 2000,
    "Invalid page manifest",
  );
  const documents = new Map(),
    files = new Map([[PAGE_MANIFEST, bytes]]);
  let total = 0;
  for (const [path, bytes] of catalog.files || [])
    if (path.startsWith("content/catalog/") && bytes) total += bytes.length;
  let previous = "";
  for (const descriptor of manifest.documents) {
    exact(descriptor, "target key sha256");
    const key = await pageKey(descriptor.target);
    assert(
      descriptor.key === key &&
        key > previous &&
        !documents.has(key) &&
        /^[a-f0-9]{64}$/.test(descriptor.sha256),
      "Invalid or duplicate page descriptor",
    );
    previous = key;
    const path = pagePath(key),
      data = await read(path, 262144);
    assert(
      data && digest(data) === descriptor.sha256,
      "Page document missing or changed",
    );
    total += data.length;
    assert(total <= 8388608, "Combined catalog and page metadata exceeds8MiB");
    if (descriptor.target.adapter !== "catalog")
      await registerSpecialTarget(root, catalog, descriptor.target, {
        overlay,
      });
    const resolved = resolvePageTarget(catalog.entries, descriptor.target),
      assetIds =
        resolved.group === "special"
          ? resolved.entry.pack.assets.map((a) => a.id)
          : [
              resolved.record.assetId,
              ...(resolved.record.assetIds || []),
            ].filter(Boolean);
    const document = validatePageDocument(
      parseBounded(
        new TextDecoder("utf-8", { fatal: true }).decode(data),
        262144,
        { depth: 10, nodes: 12000, string: 2000 },
      ),
      {
        target: descriptor.target,
        assetIds,
        resolveReference: (t) => {
          try {
            if (t.adapter !== "catalog") return false;
            resolvePageTarget(catalog.entries, t);
            return true;
          } catch {
            return false;
          }
        },
      },
    );
    validateSourceEdits(document.sourceEdits);
    if (checkBase)
      assert(
        document.baseFingerprint ===
          (await semanticFingerprint(resolved.record)),
        "Customized page source changed; compare and review it in the page editor before rebuilding",
      );
    let captured;
    if (resolved.group === "special")
      captured = { projections: specialProjections(resolved.record) };
    else
      renderDetail(
        {
          ...resolved.record,
          recordType:
            resolved.group === "objectives"
              ? "objective"
              : resolved.group.slice(0, -1),
          pack: resolved.entry.pack,
        },
        catalog.entries.map((e) => e.pack),
        { capturePage: (v) => (captured = v) },
      );
    const available = Object.keys(captured.projections);
    const walk = (b) => {
      if (checkBase && b.type === "managed")
        assert(
          available.includes(b.projection),
          "Managed page section is no longer available",
        );
      if (b.type === "group") b.children.forEach(walk);
    };
    document.sections.forEach((s) => s.blocks.forEach(walk));
    if (checkBase)
      renderPageComposition(document, { projections: captured.projections });
    documents.set(key, {
      ...resolved,
      target: descriptor.target,
      key,
      document,
    });
    files.set(path, data);
  }
  const inventory = new Set();
  let visited = 0;
  async function walk(path, depth = 0) {
    assert(depth <= 2, "Page source nesting limit");
    if (
      !(await assertSafePath(root, path, { optional: true, directory: true }))
    )
      return;
    for await (const entry of await opendir(`${root}/${path}`)) {
      assert(++visited <= 2200, "Page source file limit");
      const p = `${path}/${entry.name}`;
      assert(!entry.isSymbolicLink(), "Page source symlink forbidden");
      if (entry.isDirectory()) {
        assert(
          /^[a-f0-9]{2}$/.test(entry.name) && depth === 0,
          "Unknown page source directory",
        );
        await walk(p, depth + 1);
      } else {
        assert(entry.isFile(), "Page source must be regular");
        inventory.add(p);
      }
    }
  }
  await walk("content/page-documents");
  for (const [p, bytes] of overlay)
    if (p.startsWith("content/page-documents/")) {
      if (bytes) inventory.add(p);
      else inventory.delete(p);
    }
  for (const p of inventory) assert(files.has(p), "Unlisted page source file");
  return {
    manifest,
    documents,
    files,
    revision: digest(catalogJSON(manifest)),
  };
}
export async function pageEditorRecord(
  root,
  catalog,
  target,
  { imageURL } = {},
) {
  if (target.adapter !== "catalog")
    await registerSpecialTarget(root, catalog, target);
  const resolved = resolvePageTarget(catalog.entries, target),
    key = await pageKey(target),
    pages = await readPageDocuments(root, catalog, { checkBase: false });
  let capture;
  const record = allRecords([resolved.entry.pack]).find(
    (r) => r.id === target.recordId,
  );
  if (resolved.group === "special")
    capture = { projections: specialProjections(resolved.record) };
  else
    renderDetail(
      record,
      catalog.entries.map((e) => e.pack),
      {
        capturePage: (v) => (capture = v),
        imageURL,
        chapterIntel: await chapterOverrides(root),
        showPlanner: false,
      },
    );
  const fingerprint = await semanticFingerprint(resolved.record),
    stored = pages.documents.get(key)?.document;
  const defaults = Object.entries(capture.projections).filter(
    ([slot]) => slot.startsWith("detail:") && slot !== "detail:mission-context",
  );
  if (!defaults.length) defaults.push(["summary", capture.projections.summary]);
  // Split the canonical task list into managed steps so pictures can sit between them.
  const steps = Object.keys(capture.projections).filter((k) =>
    k.startsWith("step:"),
  );
  let sections = defaults.map(([slot, part]) => ({
    id: newPageId("s"),
    title: part.title,
    kind: "managed",
    slot,
    layout: "stacked",
    collapsed: false,
    blocks:
      slot === "detail:mission-tasks" && steps.length
        ? [
            ...steps.map((projection) => ({
              id: newPageId("b"),
              type: "managed",
              projection,
            })),
            {
              id: newPageId("b"),
              type: "managed",
              projection: "detail:mission-context",
            },
          ]
        : [{ id: newPageId("b"), type: "managed", projection: slot }],
  }));
  if (resolved.group === "special")
    sections = [
      {
        id: newPageId("s"),
        title: "Guide notes",
        kind: "custom",
        slot: null,
        layout: "stacked",
        collapsed: false,
        blocks: [{ id: newPageId("b"), type: "paragraph", text: "" }],
      },
    ];
  if (
    !sections.some((s) => s.slot?.startsWith("detail:guide-pictures")) &&
    (resolved.record.assetId || resolved.record.assetIds?.length)
  )
    sections.push({
      id: newPageId("s"),
      title: "Pictures",
      kind: "managed",
      slot: "pictures",
      layout: "stacked",
      collapsed: false,
      blocks: [{ id: newPageId("b"), type: "managed", projection: "pictures" }],
    });
  const document = stored || {
    version: 1,
    target: validatePageTarget(target),
    revision: 0,
    baseFingerprint: fingerprint,
    sections,
    deletedAnchors: [],
    sourceEdits: [],
  };
  return {
    target,
    key,
    group: resolved.group,
    record:
      resolved.group === "special"
        ? {
            ...resolved.record,
            ...(pageAssets(document).length
              ? {
                  assetId: pageAssets(document)[0],
                  assetIds: pageAssets(document).slice(1),
                }
              : {}),
          }
        : resolved.record,
    pack: resolved.entry.pack,
    repositoryRevision: catalog.revision,
    pageRevision: pages.revision,
    document,
    baseChanged: !!stored && stored.baseFingerprint !== fingerprint,
    fingerprint,
    projections: capture.projections,
    readerURL: resolved.readerURL || recordUrl(record),
    mediaPackKey: resolved.entry.key,
    assets: resolved.entry.pack.assets.filter((a) =>
      [resolved.record.assetId, ...(resolved.record.assetIds || [])].includes(
        a.id,
      ),
    ),
    capabilities: { layout: true, data: true, pictures: true },
    referenceRoutes: pageReferenceRoutes(catalog.entries, document, {
      author: true,
    }),
    pages,
  };
}
export function pageReferenceRoutes(
  entries,
  document,
  { author = false } = {},
) {
  const routes = {};
  const walk = (b) => {
    if (b.type === "group") b.children.forEach(walk);
    if (b.type !== "reference" || b.target.adapter !== "catalog") return;
    try {
      const resolved = resolvePageTarget(entries, b.target);
      if (resolved.record.spoiler) return;
      const r = allRecords([resolved.entry.pack]).find(
        (r) => r.id === b.target.recordId,
      );
      if (r)
        routes[stableJSON(b.target)] = author
          ? `/preview?packKey=${encodeURIComponent(resolved.entry.key)}&id=${encodeURIComponent(r.id)}`
          : recordUrl(r);
    } catch {}
  };
  document.sections.forEach((s) => s.blocks.forEach(walk));
  return routes;
}
