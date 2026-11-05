import { resolvePresentation } from "../ui/presentation-config.mjs";
import { featureLabel } from "../ui/workspace-shell.mjs";
import { features, featureURL } from "../ui/feature-registry.mjs";
import { allKeys, keyAccess } from "./key-access.mjs";
import { keyRoomDetails } from "./key-room-details.mjs";
import { gridReferences } from "../ui/key-workspace-view.mjs";
import { readWeaponIntel } from "./weapon-intel.mjs";
import { spoilerGuard } from "../domain/progression.mjs";
import { boundSearchEntries } from "../domain/navigation-hub.mjs";
const row = (id, type, title, summary, url, extra = {}) => ({
  id,
  type,
  title,
  summary: summary.slice(0, 600),
  url,
  mapUrl: null,
  planUrl: null,
  packId: "",
  recordId: "",
  ...extra,
});
export async function buildUnifiedIndex(packs) {
  const essential = features.map((f) =>
    row(
      "feature:" + f.id,
      "feature",
      resolvePresentation("guide").variant === "modern"
        ? featureLabel(f)
        : f.label,
      f.description,
      featureURL(f),
    ),
  );
  const other = [];
  for (const k of allKeys) {
    const grid = gridReferences(k.locations[0]?.grid || "")[0];
    other.push(
      row(
        "key:" + k.id,
        "key",
        k.name,
        [
          ...k.aliases,
          k.acquisition,
          ...k.locations.map((l) => l.name + " " + l.grid),
          keyRoomDetails.records[k.id].entrance || "",
          "Source-reported; access unverified",
        ].join(" "),
        "/keys/" + k.id + "/",
        {
          mapUrl: grid
            ? "http://127.0.0.1:5175/?key-grid=" +
              grid +
              "&key-name=" +
              encodeURIComponent(k.name).replace(
                /[!'()*]/g,
                (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase(),
              )
            : null,
          planUrl: "/keys/" + k.id + "/",
        },
      ),
    );
  }
  const db = await readWeaponIntel();
  for (const w of db.weapons)
    other.push(
      row(
        "weapon:" + w.id,
        "weapon",
        w.name,
        [
          w.class,
          w.description || "",
          "Source reports; verify mode and build",
        ].join(" "),
        "/armory/" + w.id + "/",
      ),
    );
  for (const a of db.attachments)
    other.push(
      row(
        "attachment:" + a.id,
        "attachment",
        a.name,
        a.slot +
          " · " +
          a.about +
          " · Compatibility and effects remain source-reported",
        "/armory/#attachments",
      ),
    );
  for (const pack of packs) {
    if (
      pack.sources.some((s) => s.type === "original-fixture") ||
      pack.id.startsWith("fixture:")
    )
      continue;
    const guard = spoilerGuard(pack, false);
    for (const [group, type] of [
      ["items", "item"],
      ["recipes", "recipe"],
      ["objectives", "mission"],
      ["guides", "guide"],
      ["locations", "location"],
      ["maps", "map"],
    ])
      for (const r of pack[group] || []) {
        if (r.spoiler || r.status === "fictional") continue;
        const title = r.name || r.title,
          summary =
            r.description ||
            r.body ||
            r.category ||
            "Source report; check evidence";
        if ([r.id, title, summary].some((x) => guard.contains(x || "")))
          continue;
        const kind =
            group === "objectives"
              ? r.track === "dmz-upgrade"
                ? "upgrade"
                : ["dmz-order", "dmz-story"].includes(r.track)
                  ? "mission"
                  : "progression"
              : type,
          slug = encodeURIComponent(r.id).replace(/%3A/gi, "--");
        other.push(
          row(
            "catalog:" + pack.id + ":" + r.id,
            kind,
            title,
            summary,
            "/" + group + "/" + slug + "/",
            {
              packId: pack.id,
              recordId: r.id,
              planUrl: ["upgrade", "mission", "recipe", "item"].includes(kind)
                ? "/collection/?pack=" + encodeURIComponent(pack.id)
                : null,
            },
          ),
        );
      }
  }
  other.sort((a, b) =>
    (a.type + ":" + a.id).localeCompare(b.type + ":" + b.id),
  );
  return boundSearchEntries(essential, other);
}
