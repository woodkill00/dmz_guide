const e = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export const weaponClasses = [
  ["assault-rifle", "Assault rifles"],
  ["smg", "SMGs"],
  ["shotgun", "Shotguns"],
  ["lmg", "LMGs"],
  ["marksman-rifle", "Marksman rifles"],
  ["sniper-rifle", "Sniper rifles"],
  ["pistol", "Pistols"],
  ["launcher", "Launchers"],
  ["melee", "Melee"],
];
export const className = (id) =>
  weaponClasses.find((c) => c[0] === id)?.[1] || id;
export const launchValue = (v) =>
  v.applicability === "reported"
    ? `${v.value} ${v.unit}`
    : v.applicability === "not-applicable"
      ? "Not applicable"
      : "Unknown";
export function weaponFigure(weapon, { small = false, figures = {} } = {}) {
  const entry = figures[weapon.id];
  if (!entry)
    return `<span class="gs-art-missing ${small ? "gs-art-missing-small" : ""}">${small ? "—" : "Official artwork not available"}</span>`;
  const [x, y, width, height] = entry.crop;
  const clipId = `gs-crop-${small ? "thumb" : "main"}-${weapon.id}`;
  return `<svg class="gs-weapon-art" data-figure-id="${e(weapon.id)}" width="${width}" height="${height}" viewBox="${e(entry.crop.join(" "))}" aria-hidden="true" focusable="false"><defs><clipPath id="${e(clipId)}"><rect x="${x}" y="${y}" width="${width}" height="${height}"/></clipPath></defs><text class="gs-native-art-fallback" x="${x + width / 2}" y="${y + height / 2 + 80}" text-anchor="middle" fill="#c8cebd" font-family="sans-serif" font-size="30">Official artwork unavailable locally</text><image clip-path="url(#${e(clipId)})" width="${entry.width}" height="${entry.height}" href="/local-weapon-art/${e(weapon.id)}.webp" data-local-weapon-art></image></svg><span class="gs-art-error" hidden>Official artwork unavailable locally</span>`;
}
export function launchStrip(w) {
  return `<dl class="gs-ammo"><div><dt>Fire rate</dt><dd>${e(launchValue(w.official.rpm))}</dd></div><div><dt>Rounds</dt><dd>${e(launchValue(w.official.magazine))}</dd></div><div><dt>Reserve</dt><dd>${e(launchValue(w.official.reserve))}</dd></div></dl>`;
}
export function qualityStrip() {
  return `<dl class="gs-quality">${["Damage", "Range", "Accuracy", "Mobility", "Handling"].map((label) => `<div><dt>${label}</dt><dd><span class="gs-unknown-track" aria-hidden="true"></span><span>Unknown</span></dd></div>`).join("")}</dl>`;
}
export function weaponPreview(db, w, figures = {}) {
  const count = db.attachments.filter((a) => a.weapons.includes(w.id)).length;
  return `<div class="gs-preview-art" role="group" aria-label="${e(w.name)} base weapon artwork, if available locally">${weaponFigure(w, { figures })}</div><div class="gs-preview-intel"><div><p class="eyebrow">${e(className(w.category))} / BASE WEAPON</p><h2>${e(w.name)}</h2><p class="gs-fit">${count} reported compatible attachments</p><p class="gs-caption">Official shared launch sheet · ${e(db.sources["official-launch"].date)}<br>Current DMZ damage and build cost are not established.</p><div class="gs-actions"><a class="gs-primary" href="/armory/${e(w.id)}/" data-open-gunsmith>Open Gunsmith <span aria-hidden="true">→</span></a><a href="/armory/workbench/?weapon=${e(w.id)}#builder">Build this weapon</a></div></div><div class="gs-preview-stats">${qualityStrip()}${launchStrip(w)}</div></div>`;
}
