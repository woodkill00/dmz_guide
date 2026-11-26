import { hajinPageIntel, x01PageIntel } from "../src/content/mission-intel.mjs";
import {
  validateChapterOverrides,
  chapterReaderPath,
} from "../src/domain/mission-chapter.mjs";
import { parseBounded, assert } from "../src/content/limits.mjs";
import { validateWeaponIntel } from "../src/content/weapon-intel.mjs";
import { validateAcquisitionCatalog } from "../src/domain/weapon-acquisition.mjs";
import { validateCamoCatalog } from "../src/domain/weapon-camos.mjs";
import { validateKeyGuide } from "../src/content/keys.mjs";
import {
  validateSupplemental,
  validateKeyAccess,
} from "../src/content/key-access.mjs";
import { assertSafePath, readCatalogFile } from "./catalog.mjs";
import { stableJSON } from "../src/domain/page-document.mjs";
import { weaponURL } from "../src/domain/weapon-routes.mjs";
const escape = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export const SOURCE_ADAPTERS = {
  "mission-chapter": {
    catalogId: "mission-chapters",
    path: "content/mission-chapter-overrides.json",
    collection: "chapters",
    route: chapterReaderPath,
    validate: validateChapterOverrides,
  },
  "weapon-intel": {
    catalogId: "weapon-intel",
    path: "content/weapon-intel.json",
    collection: "weapons",
    route: (id) => weaponURL(id, "reference"),
    validate: validateWeaponIntel,
  },
  "weapon-acquisition": {
    catalogId: "weapon-acquisition",
    path: "content/weapon-acquisition.json",
    collection: "weapons",
    route: (id) => weaponURL(id),
    validate: validateAcquisitionCatalog,
  },
  "weapon-camos": {
    catalogId: "weapon-camos",
    path: "src/ui/weapon-camos.json",
    collection: "weapons",
    route: (id) => weaponURL(id, "camos"),
  },
  "key-reference": {
    catalogId: "keys",
    path: "src/ui/keys.json",
    collection: "keys",
    route: (id) => `/keys/${id}/`,
  },
};
export function specialEditorURL(target) {
  return (
    "/?" +
    new URLSearchParams({
      adapter: target.adapter,
      catalogId: target.scope.catalogId,
      id: target.recordId,
      intent: "compose",
    })
  );
}
export function parseSpecialTarget(params) {
  assert(
    [...params.keys()].sort().join() === "adapter,catalogId,id,intent" &&
      params.get("intent") === "compose",
    "Invalid specialized editor link",
  );
  return {
    adapter: params.get("adapter"),
    scope: { game: "mw4", mode: "dmz", catalogId: params.get("catalogId") },
    recordId: params.get("id"),
  };
}
async function json(root, path, max = 8388608, overlay = new Map()) {
  if (overlay.has(path)) {
    const bytes = Buffer.from(overlay.get(path));
    return {
      data: parseBounded(bytes.toString("utf8"), max, {
        depth: 20,
        nodes: 150000,
        string: 2000,
      }),
      bytes,
    };
  }
  assert(
    await assertSafePath(root, path, { optional: true }),
    "Specialized source is unavailable in this checkout",
  );
  const bytes = Buffer.from(await readCatalogFile(root, path, max));
  return {
    data: parseBounded(bytes.toString("utf8"), max, {
      depth: 20,
      nodes: 150000,
      string: 2000,
    }),
    bytes,
  };
}
export async function registerSpecialTarget(
  root,
  catalog,
  target,
  { overlay = new Map() } = {},
) {
  const config = SOURCE_ADAPTERS[target.adapter];
  assert(
    config && config.catalogId === target.scope.catalogId,
    "Unregistered specialized source; use its owning tool",
  );
  if (!catalog.entries.pageSpecial)
    Object.defineProperty(catalog.entries, "pageSpecial", { value: new Map() });
  const cached = catalog.entries.pageSpecial.get(stableJSON(target));
  if (
    cached &&
    !overlay.has(config.path) &&
    !overlay.has("src/ui/key-supplemental.json")
  )
    return cached;
  let source =
      target.adapter === "mission-chapter" &&
      !overlay.has(config.path) &&
      !(await assertSafePath(root, config.path, { optional: true }))
        ? { data: { version: 1, chapters: [] }, bytes: null }
        : await json(root, config.path, 8388608, overlay),
    path = config.path,
    index = source.data[config.collection].findIndex(
      (r) => r.id === target.recordId,
    ),
    validate = config.validate;
  if (target.adapter === "weapon-camos") {
    const roster = (await json(root, "content/weapon-acquisition.json", 524288))
      .data.weapons;
    validate = (v) => validateCamoCatalog(v, roster);
  }
  if (target.adapter === "key-reference") {
    const base = source.data,
      images = (await json(root, "src/ui/key-images.json", 1048576)).data;
    if (index < 0) {
      path = "src/ui/key-supplemental.json";
      source = await json(root, path, 524288, overlay);
      index = source.data.keys.findIndex((r) => r.id === target.recordId);
      validate = (v) => validateSupplemental(v, base.keys);
    } else validate = (v) => validateKeyGuide(v, images);
  }
  if (target.adapter === "mission-chapter") {
    validateChapterOverrides(source.data);
    const match = /^(hajin|x01)-(\d+)$/.exec(target.recordId),
      base =
        match &&
        (match[1] === "hajin" ? hajinPageIntel : x01PageIntel)[
          Number(match[2]) - 1
        ];
    assert(base, "Chapter does not exist");
    if (index < 0) {
      source.data.chapters.push({
        id: target.recordId,
        rewards: [...base.rewards],
        reviewedAt: base.reviewedAt,
        ...(base.notes ? { notes: base.notes } : {}),
      });
      index = source.data.chapters.length - 1;
    }
    source.data.chapters[index].notes ??= "";
  }
  assert(index >= 0, "Specialized record does not exist");
  validate(source.data);
  const entry =
    catalog.entries.find((e) => e.pack.id === "official:mw4-dmz-starter") ||
    catalog.entries[0];
  assert(entry, "An author media catalog is required");
  const result = {
    entry,
    group: "special",
    record:
      target.adapter === "weapon-acquisition"
        ? {
            ...source.data.weapons[index],
            blueprints: source.data.blueprints.filter(
              (b) => b.weapon === target.recordId,
            ),
          }
        : source.data[config.collection][index],
    sourcePath: path,
    sourceBytes: source.bytes,
    sourceData: source.data,
    collection: config.collection,
    index,
    validate,
    target,
    readerURL: config.route(target.recordId),
  };
  catalog.entries.pageSpecial.set(stableJSON(target), result);
  return result;
}
export function specialProjections(record) {
  const projections = {};
  for (const [key, value] of Object.entries(record)) {
    if (
      key === "id" ||
      key === "assetId" ||
      key === "assetIds" ||
      key === "imageDescriptions"
    )
      continue;
    const title = key
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (c) => c.toUpperCase());
    const render = (v) => {
      if (v === null) return "Unknown";
      if (Array.isArray(v))
        return `<ul>${v.map((x) => `<li>${render(x)}</li>`).join("")}</ul>`;
      if (typeof v === "object")
        return `<dl>${Object.entries(v)
          .map(([k, v]) => `<dt>${escape(k)}</dt><dd>${render(v)}</dd>`)
          .join("")}</dl>`;
      return escape(v);
    };
    projections[`detail:${key.toLowerCase()}`] = {
      title,
      html: `<section class="panel"><h3>${escape(title)}</h3>${render(value)}</section>`,
    };
  }
  return projections;
}
export function sourceRecord(record) {
  const { assetId, assetIds, imageDescriptions, ...facts } = record;
  return facts;
}

export async function chapterOverrides(root) {
  if (
    !(await assertSafePath(root, "content/mission-chapter-overrides.json", {
      optional: true,
    }))
  )
    return {};
  const data = validateChapterOverrides(
    (await json(root, "content/mission-chapter-overrides.json", 262144)).data,
  );
  return Object.fromEntries(data.chapters.map((row) => [row.id, row]));
}
// Validate dependent source catalogs against the complete proposed snapshot.
// Refuse incompatible changes; never silently rename another provider's facts.
export async function validateJoinedSources(root, overlay = new Map()) {
  const available = async (path) =>
    overlay.has(path) || (await assertSafePath(root, path, { optional: true }));
  if (
    (await available("content/weapon-acquisition.json")) &&
    (await available("src/ui/weapon-camos.json"))
  ) {
    const acquisition = validateAcquisitionCatalog(
      (await json(root, "content/weapon-acquisition.json", 524288, overlay))
        .data,
    );
    validateCamoCatalog(
      (await json(root, "src/ui/weapon-camos.json", 8388608, overlay)).data,
      acquisition.weapons,
    );
  }
  if (
    (await available("src/ui/keys.json")) &&
    (await available("src/ui/key-images.json"))
  ) {
    const keys = validateKeyGuide(
      (await json(root, "src/ui/keys.json", 524288, overlay)).data,
      (await json(root, "src/ui/key-images.json", 1048576, overlay)).data,
    ).keys;
    const supplemental = (await available("src/ui/key-supplemental.json"))
      ? validateSupplemental(
          (await json(root, "src/ui/key-supplemental.json", 524288, overlay))
            .data,
          keys,
        ).keys
      : [];
    if (await available("src/ui/key-access.json"))
      validateKeyAccess(
        (await json(root, "src/ui/key-access.json", 1048576, overlay)).data,
        [...keys, ...supplemental],
      );
  }
}
