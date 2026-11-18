# Weapon camo reference

Open **Weapons → Weapon camos** at `/armory/camos/`. Search or select a class, then choose a weapon. Every existing gun information page and acquisition row links its camo page. Season1 guns have camo/acquisition pages even where combat statistics are not yet catalogued.

The 18 November2026 snapshot captures CODCentral's35 released guns and25 core entries each (875 source rows). Military, Special, Completionist and Weapon Prestige are grouped separately from MP/DMZ mastery. Shared camo associations are repeated for browsing; they are not separate player goals. The official progression panel explains level gates and the published33-weapon thresholds without changing the source reports. This page records no private camo ownership and never changes inventory, manuals or blueprints. Warzone/BlackCell/event/WarSpoils paths are separately referenced, with coverage gaps labelled.

## Local pictures

Run `node scripts/collect-camo-images.mjs` explicitly in the repository. It checks the fixed `src/ui/weapon-camos.json` image registry and downloads matching swatches only into ignored `.local/camo-images/`. Normal build, test and reader startup never download provider assets. Changed image hashes fail rather than overwrite a valid cached picture. Restart `npm start` after installing this feature, then refresh the browser at the same original address to retain private browser data.

Click a swatch to view its128px source size; the source-picture link opens the provider's original. Missing/corrupt/local-excluded images leave a labelled placeholder. Public static release archives intentionally exclude these rendered game-art files. CODCentral describes the swatches as renders, not verified in-game screenshots. Existing screenshot redistribution permission has not been extrapolated into a public render license.

## Source maintenance

Save a fresh inert hub HTML capture as `.local/camo-source.html` (5MiB maximum). Run `node scripts/capture-camo-catalog.mjs` to produce ignored `.local/camo-proposal.json`. This stages a proposal only; it does not update the shipped registry, download art, execute provider scripts or change player state. Review source dates/roster/order/requirements against the previous snapshot and official progression/patch notes. New/changed images need separate explicit collection permission and manual hash/dimension review. Add reviewed image metadata, validate with the domain validator/tests, rebuild and review the diff before replacing the published source JSON. Never convert “more unlocks” into a numeric weapon level or zero into a missing challenge.

Main sources: [CODCentral camo hub](https://codcentral.net/blog/mw4-dmz-camo-challenges/), [official progression](https://www.callofduty.com/en/blog/2026/10/call-of-duty-modern-warfare-4-ready-for-launch-progression-prestige), [Season1 patch notes](https://www.callofduty.com/patchnotes/2026/11/call-of-duty-modern-warfare-4-season-1-patch-notes). See feature089 research for discrepancies and supplemental primary sources.
