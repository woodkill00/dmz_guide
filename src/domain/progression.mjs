import { clone, assert, safeURL } from "../content/limits.mjs";

const recordGroups = [
  "items",
  "recipes",
  "objectives",
  "guides",
  "maps",
  "locations",
];
const recordsOf = (pack) => recordGroups.flatMap((group) => pack[group] || []);
export const progressStates = ["unknown", "locked", "unlocked", "completed"];
const localURL = (pack, id) =>
  `/local/?pack=${encodeURIComponent(pack.id)}&id=${encodeURIComponent(id)}`;

// Project an explicitly safe display model before indexing or rendering. Raw content
// remains in the selected pack, not hidden DOM nodes or a second search index.
export function spoilerGuard(pack, reveal = false) {
  const terms = reveal
    ? []
    : [
        ...new Set(
          recordsOf(pack)
            .filter((r) => r.spoiler)
            .flatMap((r) => [r.id, r.name, r.title, r.description, r.body])
            .filter(Boolean)
            .map((s) => s.toLowerCase()),
        ),
      ];
  // A bounded Aho-Corasick matcher avoids scanning every secret for every field.
  // Oversized spoiler dictionaries fail closed rather than freezing or leaking.
  const limited = terms.reduce((sum, s) => sum + s.length, 0) > 50000;
  const nodes = [{ edges: new Map(), fail: 0, match: false }];
  if (!limited)
    for (const term of terms) {
      let at = 0;
      for (const char of term) {
        if (!nodes[at].edges.has(char)) {
          nodes[at].edges.set(char, nodes.length);
          nodes.push({ edges: new Map(), fail: 0, match: false });
        }
        at = nodes[at].edges.get(char);
      }
      nodes[at].match = true;
    }
  const queue = [...nodes[0].edges.values()];
  for (let i = 0; i < queue.length; i++)
    for (const [char, child] of nodes[queue[i]].edges) {
      let fail = nodes[queue[i]].fail;
      while (fail && !nodes[fail].edges.has(char)) fail = nodes[fail].fail;
      nodes[child].fail = nodes[fail].edges.get(char) || 0;
      nodes[child].match ||= nodes[nodes[child].fail].match;
      queue.push(child);
    }
  const contains = (value) => {
    if (typeof value !== "string" || !value || !terms.length) return false;
    if (limited) return true;
    let text = value;
    try {
      text = decodeURIComponent(text);
    } catch {
      /* Plain content need not be URL encoded. */
    }
    let at = 0;
    for (const char of text.toLowerCase()) {
      while (at && !nodes[at].edges.has(char)) at = nodes[at].fail;
      at = nodes[at].edges.get(char) || 0;
      if (nodes[at].match) return true;
    }
    return false;
  };
  return {
    text: (value) => (contains(value) ? "Spoiler-protected content" : value),
    contains,
    limited,
  };
}

const referenceKeys = new Set([
  "id",
  "sourceIds",
  "relatedIds",
  "prerequisites",
  "itemId",
  "assetId",
  "mapId",
]);
export function projectSpoilerValue(value, guard, key = "") {
  if (referenceKeys.has(key)) return value;
  if (typeof value === "string") return guard.text(value);
  if (Array.isArray(value))
    return value.map((v) => projectSpoilerValue(v, guard));
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [
        k,
        k === "pack" ? v : projectSpoilerValue(v, guard, k),
      ]),
    );
  return value;
}
export function projectMapPack(pack, reveal = false) {
  const guard = spoilerGuard(pack, reveal),
    maps = pack.maps.filter((m) => reveal || !m.spoiler),
    visibleMaps = new Set(maps.map((m) => m.id));
  return {
    ...pack,
    maps: maps.map((m) => projectSpoilerValue(m, guard)),
    locations: pack.locations
      .filter((l) => visibleMaps.has(l.mapId) && (reveal || !l.spoiler))
      .map((l) => projectSpoilerValue(l, guard)),
    items: pack.items.map((i) => projectSpoilerValue(i, guard)),
    sources: pack.sources.map((source) => projectSpoilerValue(source, guard)),
  };
}

function sourceView(source, guard) {
  let url = null;
  if (safeURL(source.url) && !guard.contains(source.url)) {
    const target = new URL(source.url);
    // Fixture citations are deliberately non-navigable, never presented as evidence.
    if (!target.hostname.endsWith(".invalid")) url = target.href;
  }
  return {
    id: source.id,
    title: guard.text(source.title),
    url,
    type: source.type,
    publishedAt: guard.text(source.publishedAt || "Unknown"),
    reviewedAt: guard.text(source.reviewedAt || "Unknown"),
    supports: guard.text(source.supports),
  };
}

export function progressSources(pack, { reveal = false, track = "" } = {}) {
  const guard = spoilerGuard(pack, reveal);
  const ids = new Set(
    [...pack.objectives, ...pack.guides]
      .filter(
        (r) =>
          (!r.spoiler || reveal) &&
          (!track || (r.track || r.category) === track),
      )
      .flatMap((r) => r.sourceIds || []),
  );
  const matching = pack.sources.filter(
    (s) => ids.has(s.id) && !guard.contains(s.id),
  );
  const sources = matching.slice(0, 500).map((s) => sourceView(s, guard));
  sources.truncated = matching.length > sources.length;
  return sources;
}

export function progressRows(
  pack,
  profile,
  {
    track = "",
    query = "",
    source = "",
    status = "",
    progress = "",
    reveal = profile.spoilers,
    offset = 0,
    limit = 50,
  } = {},
) {
  const q = query.trim().toLowerCase(),
    guard = spoilerGuard(pack, reveal);
  const index = new Map(recordsOf(pack).map((r) => [r.id, r]));
  const sources = new Map(pack.sources.map((s) => [s.id, s]));
  let edgeWork = 0;
  const reference = (id, prerequisite = false) => {
    const record = index.get(id),
      hidden = Boolean(record?.spoiler && !reveal);
    return {
      id,
      hidden,
      name: hidden
        ? `Spoiler-protected ${prerequisite ? "prerequisite" : "record"}`
        : guard.text(
            record?.name ||
              record?.title ||
              (prerequisite ? "Unresolved prerequisite" : "Unresolved record"),
          ),
      state: profile.completion[id] || "unknown",
      status: record?.status || "unknown",
      url: record && !hidden && !guard.contains(id) ? localURL(pack, id) : null,
    };
  };
  function prerequisiteChain(record) {
    const pending = [],
      seen = new Set([record.id]),
      result = [];
    let truncated = false;
    const enqueue = (ids, depth) => {
      for (const id of ids) {
        if (++edgeWork > 2048 || pending.length >= 64) {
          truncated = true;
          break;
        }
        if (!seen.has(id)) {
          seen.add(id);
          pending.push({ id, depth });
        }
      }
    };
    enqueue(record.prerequisites || [], 0);
    for (let next = 0; next < pending.length; next++) {
      if (result.length >= 32 || edgeWork > 2048) {
        truncated = true;
        break;
      }
      const { id, depth } = pending[next],
        ref = reference(id, true);
      result.push({ ...ref, depth });
      if (!ref.hidden) enqueue(index.get(id)?.prerequisites || [], depth + 1);
    }
    return { nodes: result, truncated };
  }
  const rows = [
    ...pack.objectives.map((r) => ({
      record: r,
      type: "objective",
      track: r.track,
    })),
    ...pack.guides.map((r) => ({
      record: r,
      type: "guide",
      track: r.category,
    })),
  ];
  const matching = rows
    .filter(
      ({ record: r, type, track: t }) =>
        (!track || t === track) &&
        (!status || r.status === status) &&
        (!progress ||
          (type === "objective"
            ? profile.completion[r.id] || "unknown"
            : "not-applicable") === progress) &&
        (!source || ((!r.spoiler || reveal) && r.sourceIds.includes(source))),
    )
    .filter(
      ({ record: r, track: t }) =>
        !q ||
        ((!r.spoiler || reveal) &&
          [
            guard.text(r.name || r.title),
            guard.text(r.description || r.body || ""),
            t,
          ]
            .join(" ")
            .toLowerCase()
            .includes(q)),
    );
  const start = Math.max(
    0,
    Math.min(
      Number.isSafeInteger(offset) ? offset : 0,
      Math.max(0, matching.length - 1),
    ),
  );
  const size = Math.max(
    1,
    Math.min(Number.isSafeInteger(limit) ? limit : 50, 100),
  );
  const result = matching
    .slice(start, start + size)
    .map(({ record: r, type, track: t }) => {
      if (r.spoiler && !reveal)
        return {
          id: r.id,
          type,
          track: t,
          hidden: true,
          name: "Spoiler-protected record",
          status: r.status,
          prerequisites: [],
          related: [],
          sources: [],
        };
      const chain = prerequisiteChain(r);
      return {
        id: r.id,
        type,
        track: t,
        hidden: false,
        name: guard.text(r.name || r.title),
        description: guard.text(r.description || r.body || ""),
        status: r.status,
        state: profile.completion[r.id] || "unknown",
        disputed:
          r.status === "disputed" ||
          (pack.claims || []).some(
            (c) => c.entityId === r.id && c.status === "disputed",
          ),
        prerequisites: chain.nodes,
        detailsTruncated:
          chain.truncated ||
          (r.relatedIds?.length || 0) > 32 ||
          (r.effects?.length || 0) > 64 ||
          r.sourceIds.length > 32,
        related: (r.relatedIds || []).slice(0, 32).map((id) => reference(id)),
        effects: (r.effects || []).slice(0, 64).map((e) => ({
          type: e.type,
          target: guard.text(e.target),
          value: guard.text(e.value),
        })),
        sources: r.sourceIds
          .slice(0, 32)
          .map((id) => sources.get(id))
          .filter(Boolean)
          .map((s) => sourceView(s, guard)),
        scope: guard.text(JSON.stringify(r.scope || pack.game)),
        contentVersion: guard.text(pack.contentVersion),
        url: guard.contains(r.id) ? null : localURL(pack, r.id),
      };
    });
  result.total = matching.length;
  result.offset = start;
  result.pageSize = size;
  result.more = start + result.length < matching.length;
  result.privacyLimited = guard.limited;
  return result;
}

export function setCompletion(pack, profile, id, value) {
  assert(
    pack.objectives.some((r) => r.id === id),
    "Unknown objective",
  );
  assert(progressStates.includes(value), "Unknown progress state");
  const next = clone(profile);
  next.completion[id] = value;
  return next;
}
export function resetProgress(profile) {
  const next = clone(profile);
  next.completion = {};
  return next;
}
