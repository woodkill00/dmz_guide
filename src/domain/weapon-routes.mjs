export const weaponSections = Object.freeze({
  acquisition: "Acquisition",
  camos: "Camos",
  "owned-attachments": "Attachments",
  builder: "Builds",
  compare: "Compare",
  evidence: "My evidence",
  reference: "Stats & info",
  backups: "Backups",
});
export function weaponURL(id = "", section = "acquisition") {
  if (id && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id))
    throw Error("Invalid weapon route");
  return `/armory/${id ? id + "/" : ""}#${Object.hasOwn(weaponSections, section) ? section : "acquisition"}`;
}
export function weaponCamoURL(id, camo) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(camo))
    throw Error("Invalid camo route");
  return weaponURL(id, "camos").replace(/#.*$/, "#camo:" + camo);
}
export function weaponAttachmentURL(id, attachment) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(attachment))
    throw Error("Invalid attachment route");
  return weaponURL(id, "reference").replace(
    /#.*$/,
    "#attachment-" + attachment,
  );
}
// Rewrite only known same-site legacy entry points. Unknown routes remain
// visible to the broken-link audit; external links are never redirected.
export function canonicalWeaponHref(href, ids) {
  if (
    typeof href !== "string" ||
    href.length > 8192 ||
    !href.startsWith("/") ||
    href.startsWith("//")
  )
    return href;
  if (/[\\\u0000-\u0020]/.test(href.split(/[?#]/, 1)[0])) return href;
  let url;
  try {
    url = new URL(href, "https://weapon.invalid");
  } catch {
    return href;
  }
  if (url.origin !== "https://weapon.invalid" || url.username || url.password)
    return href;
  const path = url.pathname.replace(/\/?$/, "/");
  const defaults = {
    "/weapons/": "reference",
    "/dmz-weapons/": "acquisition",
    "/armory/workbench/": "compare",
    "/armory/acquisition/": "acquisition",
    "/armory/camos/": "camos",
  };
  const camo = path.match(/^\/armory\/camos\/([a-z0-9-]+)\/$/);
  if (!Object.hasOwn(defaults, path) && !(camo && ids.includes(camo[1])))
    return href;
  url.pathname = path;
  const entry = resolveWeaponEntry(url.href, ids, defaults[path] || "camos");
  return entry.notice ? href : entry.href;
}
export function resolveWeaponEntry(input, ids, fallback = "acquisition") {
  const referenceAnchors = [
    "gunsmith",
    "codmunity-data",
    "attachments",
    "patch-history",
    "weapon-intel",
  ];
  const url = new URL(input, "https://weapon.invalid"),
    valid = new Set(ids),
    query = url.searchParams.getAll("weapon"),
    camoPath = url.pathname.match(/^\/armory\/camos\/([a-z0-9-]+)\/$/),
    detail = url.pathname.match(/^\/armory\/([a-z0-9-]+)\/$/),
    hash = url.hash.slice(1);
  let weapon = camoPath?.[1] || (valid.has(detail?.[1]) ? detail[1] : "");
  let notice = "";
  if (query.length) {
    if (query.length === 1 && valid.has(query[0])) weapon = query[0];
    else
      notice =
        "Unknown or repeated weapon selection ignored; saved data is unchanged.";
  }
  if (!weapon && hash.startsWith("weapon-") && valid.has(hash.slice(7)))
    weapon = hash.slice(7);
  let section = Object.hasOwn(weaponSections, hash) ? hash : fallback;
  let camo = "";
  if (url.pathname.startsWith("/armory/camos/") || hash.startsWith("camo:")) {
    section = "camos";
    camo = hash.replace(/^camo:/, "");
    if (Object.hasOwn(weaponSections, camo)) camo = "";
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(camo)) camo = "";
  }
  const attachmentAnchor = /^attachment-[a-z0-9-]+$/.test(hash);
  if (referenceAnchors.includes(hash) || attachmentAnchor)
    section = "reference";
  if (hash === "camo-sources") section = "camos";
  const destination = new URL(weaponURL(weapon, section), url.origin);
  url.searchParams.delete("weapon");
  destination.search = url.searchParams.toString();
  if (camo) destination.hash = "camo:" + camo;
  else if (
    referenceAnchors.includes(hash) ||
    attachmentAnchor ||
    hash === "camo-sources"
  )
    destination.hash = hash;
  return {
    weapon,
    section,
    camo,
    notice,
    href: destination.pathname + destination.search + destination.hash,
  };
}
