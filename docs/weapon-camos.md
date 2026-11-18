# Weapon camos and completion

Open **Weapons → Weapon camos** at `/armory/camos/`. Search or select a class, then choose a weapon. Every existing gun information page and acquisition row links its camo page. Season1 guns have camo/acquisition pages even where combat statistics are not yet catalogued.

The compact tracker overview groups guns into expandable classes, inspired by [WZStats' public tracker layout](https://wzstats.gg/mw4/camo-tracker). Challenges shows Military, Special and Completionist circles; Prestige and Mode mastery have separate views. Select a circle to read and tick its challenge inline, or open the weapon name for its dedicated page. Search temporarily opens matching classes and restores your previous open classes when cleared. Progress totals always use the full catalog: 35 known guns, with Divergence counted once as a shared unlock. The published 33-unlock requirements stay separate from this coverage count.

Small local swatches avoid enlarging the 128px source images. Borders and symbols indicate status together: ✓ completed, ● next to track, ○ remaining. Missing catalog data leaves weapon links available and completion editing disabled; reload to retry. Existing saved progress and backup recovery are shared between the overview and dedicated pages.

The 18 November2026 snapshot captures CODCentral's35 released guns and25 core entries each (875 source rows). Military, Special, Completionist and Weapon Prestige are grouped separately from MP/DMZ mastery. Shared camo associations are repeated for browsing; they are not separate player goals. The official progression panel explains level gates and the published33-weapon thresholds without changing the source reports. Completion ticks are stored privately in the existing armory; they do not grant in-game rewards or change inventory, manuals or blueprints. Warzone/BlackCell/event/WarSpoils paths are separately referenced, with coverage gaps labelled.

## Track a camo

The progression view has four tiers: Military (two rows of four), Special (three), Completionist (four), and Prestige (four). Mode mastery is a separate view. Click a picture to expand its details; click it again or Close details to retract it. Other tiers stay open.

Green means marked Completed; red means Remaining; yellow means Next to track. Military advances to the first unfinished camo. Once all eight are marked, every unfinished Special turns yellow together. Gold turns yellow only after all three Specials are marked. Later completionist recommendations include their reported class/33-weapon requirements. Prestige is independent. Yellow is your planning convention; source weapon-level conditions still apply. You can backfill or undo any checkbox without automatically checking or erasing other camos.

Divergence and mode-mastery completion are shared across weapon pages. Other ticks belong to the selected gun. Save confirmation appears after the private transaction completes. Failed saves retain an exportable candidate with Retry/Reload saved controls; conflicts require reviewing and reloading the newer record.

Use **Backups → Export private workspace** to include camo ticks with your existing armory data. Restore preview shows the camo-record count and explains replacement: a legacy backup without camo records clears current ticks when you confirm restoring it. Use the current app version to restore backups with camo progress.

## Local pictures

Run `node scripts/collect-camo-images.mjs` explicitly in the repository. It checks the fixed `src/ui/weapon-camos.json` image registry and downloads matching swatches only into ignored `.local/camo-images/`. Normal build, test and reader startup never download provider assets. Changed image hashes fail rather than overwrite a valid cached picture. Restart `npm start` after installing this feature, then refresh the browser at the same original address to retain private browser data.

Click a camo picture button to open its requirements and Completed checkbox. The View swatch link in that panel opens the128px source size; Source picture opens the provider original. Missing/corrupt/local-excluded images leave a labelled placeholder. Public static release archives intentionally exclude these rendered game-art files. CODCentral describes the swatches as renders, not verified in-game screenshots. Existing screenshot redistribution permission has not been extrapolated into a public render license.

## Source maintenance

Save a fresh inert hub HTML capture as `.local/camo-source.html` (5MiB maximum). Run `node scripts/capture-camo-catalog.mjs` to produce ignored `.local/camo-proposal.json`. This stages a proposal only; it does not update the shipped registry, download art, execute provider scripts or change player state. Review source dates/roster/order/requirements against the previous snapshot and official progression/patch notes. New/changed images need separate explicit collection permission and manual hash/dimension review. Add reviewed image metadata, validate with the domain validator/tests, rebuild and review the diff before replacing the published source JSON. Never convert “more unlocks” into a numeric weapon level or zero into a missing challenge.

Main sources: [CODCentral camo hub](https://codcentral.net/blog/mw4-dmz-camo-challenges/), [official progression](https://www.callofduty.com/en/blog/2026/10/call-of-duty-modern-warfare-4-ready-for-launch-progression-prestige), [Season1 patch notes](https://www.callofduty.com/patchnotes/2026/11/call-of-duty-modern-warfare-4-season-1-patch-notes). See feature089 research for discrepancies and supplemental primary sources.
