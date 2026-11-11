import { catalogJSON } from "./catalog.mjs";
import assert from "node:assert/strict";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { validatePack } from "../src/content/validate.mjs";
const root = resolve(import.meta.dirname, ".."),
  dir = resolve(root, "content/catalog/official-starter");
const snapshot = JSON.parse(
  await readFile(
    resolve(root, "content/references/tcno-fob-20261110.json"),
    "utf8",
  ),
);
assert.equal(snapshot.source, "https://tools.tcno.co/dmz/fob");
assert.equal(snapshot.rows.length, 34);
const read = async (kind) =>
  Promise.all(
    (await readdir(resolve(dir, kind)))
      .filter((n) => n.endsWith(".json"))
      .map(async (name) => ({
        file: resolve(dir, kind, name),
        value: JSON.parse(await readFile(resolve(dir, kind, name), "utf8")),
      })),
  );
const [items, objectives] = await Promise.all([
  read("items"),
  read("objectives"),
]);
const roman = [
  "",
  "I",
  "II",
  "III",
  "IV",
  "V",
  "VI",
  "VII",
  "VIII",
  "IX",
  "X",
  "XI",
  "XII",
  "XIII",
];
const title = (n) => n.replace(/ (\d+)$/, (_, v) => " " + roman[Number(v)]);
const norm = (n) => n.toLowerCase().replace(/[^a-z0-9]/g, "");
const slug = (n) =>
  n
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
const alias = { Cash: "DMZ Cash", "Fulton Marker": "Fulton Drop Marker" };
const sourceId = "source:tcno-fob-20261110";
const changes = [],
  report = [];
const add = (kind, value) => ({
  file: resolve(dir, kind, value.id.replaceAll(":", "_") + ".json"),
  value,
});
for (const f of snapshot.rows.flatMap((r) => r.requirements)) {
  assert(
    Number.isSafeInteger(f.quantity) && f.quantity > 0 && f.quantity <= 1000000,
  );
  const name = alias[f.name] || f.name;
  if (items.some((i) => norm(i.value.name) === norm(name))) continue;
  const value = {
    id: "mw4:tcno-" + slug(name),
    name,
    aliases: [],
    kind: "item",
    category: /^Key /.test(name) ? "Keys" : "Misc",
    unit: "count",
    rarity: f.rarity || "Not recorded",
    description:
      "Listed as a FOB upgrade material by TroubleChute. Acquisition and live-build applicability are not independently verified.",
    status: "observed",
    sourceIds: [sourceId],
    stats: [],
  };
  const record = add("items", value);
  items.push(record);
  changes.push(record);
}
const records = new Map();
for (const f of snapshot.rows) {
  const matches = objectives.filter(
    (o) =>
      o.value.track === "dmz-upgrade" &&
      norm(o.value.name) === norm(title(f.name)),
  );
  assert(matches.length <= 1, f.name);
  const record =
    matches[0] ||
    add("objectives", {
      id: "mw4:upgrade-" + slug(title(f.name)),
      name: title(f.name),
      track: "dmz-upgrade",
      oneTime: true,
      spoiler: false,
      effects: [],
      sourceIds: [],
      upgrade: { observationKeys: [] },
    });
  records.set(f.id, record);
}
for (const f of snapshot.rows) {
  const record = records.get(f.id),
    o = structuredClone(record.value),
    old = structuredClone(o);
  o.description = `${f.description} TroubleChute-listed requirements and prerequisite links, reviewed 2026-11-10; not independently verified for the current build. Consumption remains unknown where not previously confirmed.`;
  o.requirements = f.requirements.map((line) => {
    const item = items.find(
      (i) => norm(i.value.name) === norm(alias[line.name] || line.name),
    );
    assert(item, line.name);
    const prior = o.requirements?.find((r) => r.itemId === item.value.id);
    assert(
      !prior || prior.quantity == null || prior.quantity === line.quantity,
      "Conflicting numeric cost: " + f.name + " / " + line.name,
    );
    return {
      itemId: item.value.id,
      quantity: line.quantity,
      consumption: prior?.consumption || "unknown",
      status: "observed",
      sourceIds: [...new Set([...(prior?.sourceIds || []), sourceId])],
    };
  });
  o.prerequisites = f.prerequisites.map((p) => {
    const id = p.href.split("#")[1];
    assert(records.has(id), "Unknown prerequisite");
    return records.get(id).value.id;
  });
  o.requirementsKnown = true;
  o.status = "observed";
  o.sourceIds = [...new Set([...o.sourceIds, sourceId])];
  o.upgrade = {
    ...o.upgrade,
    prerequisiteStatus: "known",
    tierLabel:
      o.name.match(/ (XIII|XII|XI|IX|VIII|VII|VI|IV|III|II|X|V|I)$/)?.[1] ||
      o.upgrade?.tierLabel ||
      "Single",
  };
  changes.push({ ...record, value: o });
  report.push({
    id: o.id,
    name: o.name,
    added: !old.requirements,
    removedUnknownPlaceholders: (old.requirements || [])
      .filter(
        (r) =>
          r.quantity == null &&
          !o.requirements.some((n) => n.itemId === r.itemId),
      )
      .map((r) => r.itemId),
    oldPrerequisites: old.prerequisites || [],
    prerequisites: o.prerequisites,
  });
}
const source = {
  id: sourceId,
  title: "TroubleChute: FOB upgrade costs and prerequisite chains",
  url: snapshot.source,
  type: "community",
  publishedAt: "Not stated",
  reviewedAt: "2026-11-10",
  supports:
    "34 listed FOB upgrades, including Bank I–XIII; factual material costs, described effects and explicit prerequisite links. Complete for this site snapshot, not independently verified current-build coverage or spending semantics.",
  provenance: {
    kind: "web",
    captureDate: "2026-11-10",
    buildStatus: "unknown",
    observationKey: "tcno-fob-20261110",
    lineageKey: "tcno-fob",
  },
};
changes.push(add("sources", source));
const manifestFile = resolve(dir, "pack.json"),
  manifest = JSON.parse(await readFile(manifestFile, "utf8"));
if (
  manifest.pack.contentVersion.localeCompare("2026.11.10.1", undefined, {
    numeric: true,
  }) < 0
)
  manifest.pack.contentVersion = "2026.11.10.1";
manifest.pack.coverage.note = manifest.pack.coverage.note
  .replace(
    "28 listed upgrade definitions",
    "34 TroubleChute-listed upgrade definitions",
  )
  .replace(
    "Unknown upgrade costs, disputed access rules and missing tiers remain unknown.",
    "FOB costs and prerequisite chains follow the TroubleChute snapshot dated2026-11-10; consumption and current-build verification remain unresolved where not independently confirmed.",
  );
for (const kind of ["items", "objectives", "sources"])
  for (const r of changes.filter(
    (r) =>
      r.file.includes("/" + kind + "/") || r.file.includes("\\" + kind + "\\"),
  ))
    if (!manifest.order[kind].includes(r.value.id))
      manifest.order[kind].push(r.value.id);
changes.push({ file: manifestFile, value: manifest });
console.log(
  JSON.stringify(
    {
      mode: process.argv.includes("--apply") ? "apply" : "preview",
      upgrades: records.size,
      newItems: changes.filter((r) => r.file.includes("items")).length,
      report,
    },
    null,
    2,
  ),
);
const candidate = { ...manifest.pack };
for (const kind of Object.keys(manifest.order)) {
  const original = manifest.order[kind].length ? await read(kind) : [];
  if (kind === "items") original.push(...(await read("weapons")));
  const byId = new Map(original.map((r) => [r.value.id, r.value]));
  for (const change of changes.filter(
    (r) =>
      r.file.startsWith(resolve(dir, kind) + "/") ||
      r.file.startsWith(resolve(dir, kind) + "\\"),
  ))
    byId.set(change.value.id, change.value);
  candidate[kind] = manifest.order[kind].map((id) => byId.get(id));
}
validatePack(
  candidate,
  JSON.parse(await readFile(resolve(root, "schemas/pack.schema.json"), "utf8")),
  { profile: "published" },
);
if (process.argv.includes("--apply"))
  for (const c of changes) await writeFile(c.file, catalogJSON(c.value));
