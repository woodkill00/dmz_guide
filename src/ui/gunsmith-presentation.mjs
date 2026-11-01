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
const badge =
  '<abbr class="cod-badge" title="CODMunity MW4 Multiplayer; not tested in DMZ">*WZ</abbr>';
export function launchStrip(w, db) {
  const row = db?.codmunity?.modes.mw4?.weapons[w.id];
  const fields = row
    ? [
        ["Fire rate", row.stats.rpm, "RPM"],
        ["Rounds", row.stats.mag_size, "rounds"],
        ["Ammo reported", row.stats.reserve_ammo, "rounds"],
      ]
    : [
        ["Fire rate", null, ""],
        ["Rounds", null, ""],
        ["Reserve", null, ""],
      ];
  if (!row)
    return `<dl class="gs-ammo">${Object.entries({
      "Fire rate": w.official.rpm,
      Rounds: w.official.magazine,
      Reserve: w.official.reserve,
    })
      .map(
        ([label, v]) =>
          `<div><dt>${label}</dt><dd>${e(launchValue(v))}</dd></div>`,
      )
      .join("")}</dl>`;
  return `<dl class="gs-ammo">${fields.map(([label, v, unit]) => `<div><dt>${label}</dt><dd>${v === undefined ? "Unknown" : e(v) + " " + e(unit) + " " + badge}</dd></div>`).join("")}</dl>`;
}
export function qualityStrip(db, w) {
  const row = db?.codmunity?.modes.mw4?.weapons[w?.id];
  const display = (v, unit = "") =>
    v === undefined || v === null ? "Unknown" : `${e(v)} ${e(unit)} ${badge}`;
  const rows = row
    ? [
        ["Damage / chest", display(row.damage[0]?.values.chest)],
        ["First drop-off", display(row.damage[1]?.from, "(raw distance)")],
        ["Hip sway", display(row.stats.hip_idle_sway, "°")],
        ["Movement", display(row.stats.movement, "m/s")],
        ["ADS time", display(row.stats.ads, "ms")],
      ]
    : ["Damage", "Range", "Accuracy", "Mobility", "Handling"].map((label) => [
        label,
        "Unknown",
      ]);
  return `<dl class="gs-quality">${rows.map(([label, v]) => `<div><dt>${label}</dt><dd>${v}</dd></div>`).join("")}</dl>`;
}
export function weaponPreview(db, w, figures = {}) {
  const count = db.attachments.filter((a) => a.weapons.includes(w.id)).length;
  return `<div class="gs-preview-art" role="group" aria-label="${e(w.name)} base weapon artwork, if available locally">${weaponFigure(w, { figures })}</div><div class="gs-preview-intel"><div><p class="eyebrow">${e(className(w.category))} / BASE WEAPON</p><h2>${e(w.name)}</h2><p class="gs-fit">${count} reported compatible attachments</p><p class="gs-caption">${db.codmunity?.modes.mw4?.weapons[w.id] ? "CODMunity MW4 Multiplayer · " + e(db.codmunity.modes.mw4.sourceDate || "source date unavailable") + " · imported " + e(db.codmunity.modes.mw4.fetchedAt) : "Official launch fallback · " + e(db.sources["official-launch"].date) + "; preferred profile not yet reported"}<br>${db.codmunity ? "*WZ — preferred CODMunity MW4 Multiplayer baseline; not tested in DMZ. Build cost is unknown." : "Current DMZ damage and build cost are not established."}</p><div class="gs-actions"><a class="gs-primary" href="/armory/${e(w.id)}/" data-open-gunsmith>Open Gunsmith <span aria-hidden="true">→</span></a><a href="/armory/workbench/?weapon=${e(w.id)}#builder">Build this weapon</a></div></div><div class="gs-preview-stats">${qualityStrip(db, w)}${launchStrip(w, db)}</div></div>`;
}
