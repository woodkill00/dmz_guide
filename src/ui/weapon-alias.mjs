import { weaponURL } from "../domain/weapon-routes.mjs";
export function weaponAlias(
  path,
  ids,
  { weapon = "", section = "acquisition" } = {},
) {
  const destination = weaponURL(weapon, section);
  return {
    path,
    title: `Legacy weapon bookmark · ${path}`,
    page: "armory",
    compatibilityFor: destination,
    body: `<header class="page-heading"><h1>Weapons</h1><p>The weapon tools now share one workspace.</p><a id="weapon-alias" href="${destination}" data-weapon-section="${section}">Continue to ${weapon || "all weapons"} · ${section}</a><p id="weapon-alias-notice" role="status"></p><noscript><p>The link opens this section. Selecting a weapon from an old query or a specific camo requires JavaScript; use the weapon list after continuing.</p></noscript></header><script type="application/json" id="weapon-alias-ids">${JSON.stringify(ids)}</script>`,
    scripts: ["/assets/src/client/weapon-alias.mjs"],
  };
}
