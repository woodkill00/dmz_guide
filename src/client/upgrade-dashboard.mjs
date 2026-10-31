import { escapeHTML as esc } from "../ui/render.mjs";
import { itemUses } from "../domain/item-uses.mjs";
import { spoilerGuard } from "../domain/progression.mjs";
const defaults = () => ({
  quick: "all",
  density: "compact",
  materials: true,
  readiness: true,
  evidence: true,
  source: "",
  status: "",
  progress: "",
});
export function cleanUpgradeView(raw) {
  const view = defaults();
  if (!raw || typeof raw !== "object") return view;
  if (["all", "incomplete", "tracked", "missing", "review"].includes(raw.quick))
    view.quick = raw.quick;
  if (["compact", "comfortable"].includes(raw.density))
    view.density = raw.density;
  for (const key of ["materials", "readiness", "evidence"])
    if (typeof raw[key] === "boolean") view[key] = raw[key];
  if (typeof raw.source === "string" && raw.source.length <= 100)
    view.source = raw.source;
  if (
    [
      "",
      "verified",
      "observed",
      "unverified",
      "unknown",
      "disputed",
      "stale",
      "fictional",
    ].includes(raw.status)
  )
    view.status = raw.status;
  if (
    [
      "",
      "unknown",
      "incomplete",
      "completed",
      "not-completed",
      "locked",
      "unlocked",
      "not-applicable",
    ].includes(raw.progress)
  )
    view.progress = raw.progress;
  return view;
}
export function readUpgradeView(id, storage) {
  try {
    const raw = (storage || localStorage).getItem(`dmz-upgrade-view-v1:${id}`);
    return cleanUpgradeView(raw && raw.length <= 2000 ? JSON.parse(raw) : null);
  } catch {
    return defaults();
  }
}
export function writeUpgradeView(id, view, storage) {
  try {
    (storage || localStorage).setItem(
      `dmz-upgrade-view-v1:${id}`,
      JSON.stringify(cleanUpgradeView(view)),
    );
    return true;
  } catch {
    return false;
  }
}
const local = (pack, id) =>
  `/local/?pack=${encodeURIComponent(pack.id)}&id=${encodeURIComponent(id)}`;
export function missingMarkup(pack, row) {
  if (!row) return "<small>Preview unavailable</small>";
  if (row.completed)
    return "<small>Recorded completed; listed costs in Details</small>";
  const missing = row.materials.filter((m) => m.missing > 0);
  return `<span class="upgrade-cell-label">Missing</span>${missing
    .slice(0, 2)
    .map(
      (m) =>
        `<a href="${esc(local(pack, m.id))}" tabindex="0">${esc(m.name)}: ${esc(m.missing)} ${esc(m.unit)}</a>`,
    )
    .join(
      "<br>",
    )}${missing.length > 2 ? `<small>+${missing.length - 2} items in Details</small>` : ""}${row.unknown ? "<small>Unknown / partial costs or stock</small>" : !missing.length ? "<small>Listed materials covered; readiness unverified</small>" : ""}`;
}
export function materialPanel(pack, profile, row) {
  if (!row) return "";
  const uses = itemUses(pack, profile),
    guard = spoilerGuard(pack, profile.spoilers);
  const link = (r) =>
    `<a href="${esc(local(pack, r.id))}" tabindex="0" target="_blank" rel="noopener noreferrer">${esc(guard.text(r.name))}</a>`;
  const links = (records) =>
    records
      .slice(0, 50)
      .map(
        (r) =>
          `${link(r)}${r.track ? ` (${esc({ "dmz-upgrade": "DMZ upgrade", "dmz-order": "DMZ order", "dmz-story": "DMZ story", campaign: "Campaign", mission: "Mission" }[r.track] || r.track)})` : ""}`,
      )
      .join(", ") || "None recorded in this catalog";
  return `<section class="upgrade-material-panel" aria-label="Direct material breakdown"><h3>Direct materials for this upgrade</h3><p>Independent listed costs using saved stock and reserves, not shared goal allocation. ${row.unknown ? "Some costs or inventory are unknown; scope evidence can prevent exact advice." : "Additional prerequisites and game eligibility are separate."}</p><div class="upgrade-material-cards">${
    row.materials
      .slice(0, 50)
      .map((m) => {
        const u = uses.get(m.id);
        if (!u) return "";
        const locations = pack.locations.filter(
          (l) =>
            l.itemIds?.includes(m.id) &&
            (profile.spoilers || !l.spoiler) &&
            !guard.contains(l.id) &&
            !guard.contains(l.name) &&
            ["verified", "observed"].includes(l.status) &&
            l.sourceIds?.length &&
            pack.maps.some(
              (map) =>
                map.id === l.mapId &&
                (profile.spoilers || !map.spoiler) &&
                !guard.contains(map.id) &&
                !guard.contains(map.name),
            ),
        );
        return `<article class="upgrade-material-card"><h4>${link(m)}</h4><small>${esc(m.unit)}</small><dl><div><dt>Owned</dt><dd>${m.held === null ? "Not entered" : esc(m.held)}</dd></div><div><dt>Reserve</dt><dd>${esc(m.reserve)}</dd></div><div><dt>Required</dt><dd>${m.required === null ? "Unknown" : esc(m.required)}</dd></div><div><dt>Missing</dt><dd>${m.missing === null ? "Unknown" : esc(m.missing)}</dd></div></dl><details><summary>Recipes, uses &amp; locations</summary><p>Producing recipes: ${links(u.acquisition)}</p><p>Recipes using this: ${links(u.recipes)}</p><p>Crafted outputs: ${links(u.crafts)}</p><p>Upgrade uses: ${links(u.upgrades)}</p><p>Mission uses: ${links(u.missions)}</p><p>Source-backed location references: ${locations.length ? links(locations) : "None verified in this catalog"}. References do not guarantee a spawn.</p><p>Up to 50 references per group. Guide and map workspace remain separate stores.</p></details></article>`;
      })
      .join("") ||
    "<p>No unfinished direct material lines; full listed requirements remain below. This is not a zero-cost claim.</p>"
  }</div>${row.materials.length > 50 ? "<p>First 50 lines shown; inspect full listed costs below.</p>" : ""}</section>`;
}
