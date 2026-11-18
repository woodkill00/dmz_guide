# Research: weapon camo reference

Research observed **18 November 2026**. This is a source-qualified reference snapshot, not a claim that every published challenge or image has been verified in the live game.

## Decisions for this slice

- Cover CODCentral's known 35-weapon, 25-card-per-weapon DMZ reference: 875 displayed cards. Preserve its order, raw labels, numeric conditions and page anchors.
- Represent MP/DMZ mastery as shared reference definitions with per-weapon display associations. Repeated presentation does not establish separate ownership or counters.
- Explain official progression conditions beside provider labels. Keep conflicting values visible and attributed; do not silently replace a source's text or infer missing thresholds.
- Link supplemental Warzone, seasonal and War Spoils evidence. Missing criteria and artwork remain explicitly unavailable or unverified.
- Add no private tracker state, tick migration, automatic completion or gameplay telemetry in this feature.
- Authorized local artwork collection is limited to the 875 swatches in ignored local cache, following the existing weapon-figure approach. Publish no collected artwork in this slice.

## Source ledger

All URLs below were inspected or researched on 18 November 2026 unless otherwise stated. Publication dates are distinct from observation dates.

| Source | Publication / version | Purpose and qualification |
|---|---|---|
| [Official progression and prestige](https://www.callofduty.com/en/blog/2026/10/call-of-duty-modern-warfare-4-ready-for-launch-progression-prestige) | 19 October 2026 | Primary progression conditions and illustrative challenges; not an exhaustive per-weapon requirement database. |
| [CODCentral DMZ camo hub](https://codcentral.net/blog/mw4-dmz-camo-challenges/) | Publication date not independently recorded | Community reference, 35 weapon sections and 25 cards per section; raw conditions are source claims. |
| [CODCentral Han 86 example](https://codcentral.net/blog/mw4-dmz-camo-challenges/han-86/) | Publication date not independently recorded | Representative card structure, ordered steps, per-weapon artwork and anchors. |
| [Official Season 1 announcement](https://www.callofduty.com/blog/2026/10/call-of-duty-modern-warfare-4-warzone-season-1-announcement) | 28 October 2026 | Launch versus in-season weapon status. |
| [Official Season 1 patch notes](https://www.callofduty.com/patchnotes/2026/11/call-of-duty-modern-warfare-4-season-1-patch-notes) | Rolling page, inspected through the November 16 section | Challenge corrections and tracking fixes; older provider snapshots can be stale. |
| [Official Warzone Season 1 briefing](https://www.callofduty.com/uk/en/blog/2026/11/call-of-duty-modern-warfare-4-warzone-season-1) | 2 November 2026 | Released Warzone mastery criteria, supplemental event rewards and legacy-weapon limits. |
| [Official Season 1 Battle Pass / BlackCell](https://www.callofduty.com/blog/2026/11/call-of-duty-modern-warfare-4-season-1-battle-pass-blackcell-store-bundles) | 5 November 2026 | Separate BlackCell class challenges and final reward; entitlement applies. |
| [MW4.GG camo tracker](https://mw4.gg/camo-tracker/) | Public catalog version `2026-11-07T16:58:07.317Z` | Secondary cross-check of mode variants, missing values and provider modeling. Not a source to bulk import. |
| [MW4.GG terms](https://mw4.gg/pages/terms-and-conditions) | Updated 24 October 2026 | Explicit limitations on reuse and bulk harvesting. |
| [DMZHub weapon manuals](https://dmzhub.gg/weapons/manuals) | Inspected 17 November 2026 during feature 088 research | Direct creator statement about War Spoils and manual tracking; records are user maintained, not game verified. |
| [Final Exfil DMZ camos](https://finalexfil.com/wiki/mechanic/dmz-camos) | Inspected 17 November 2026 | Conflicting secondary War Spoils wording; not authoritative over primary material. |

## Progression: dependencies are not display order

The official progression article's Military, Special, Completionist and Weapon Prestige sections establish these conditions:

- Eight Military camos follow weapon level. Specials open at their own levels and can overlap Military progression; do not require finishing Military first or a preceding Special.
- Gold requires all eight Military and three Specials. Platinum uses class Gold completion. The launch examples specify 33 Platinum for Harmonic Break and 33 Harmonic Break for Divergence.
- MP/DMZ challenge progress can be completed wholly or partly across modes. Displaying an alternate mode is not a separate unlock.
- Weapon Prestige preserves camos. Pyroclast begins at Prestige 1; Terminus uses Prestige 1 maximum level. The automatic Master transition does not reset level; Scatter and Cascade use Master levels 150 and 250.

Do not derive weapon maximum level from Military Camo 8. Do not make a larger catalog automatically change a published gate or revoke already earned progress. The reference can explain thresholds without implementing an eligibility engine.

## CODCentral coverage and conflicts

The hub currently presents 35 weapons: nine ARs, six SMGs, two shotguns, three LMGs, three marksman rifles, three sniper rifles, four pistols, four launchers and one melee weapon. Each section displays eight Military, three Special, four Completionist, four Prestige and six MP/DMZ Mode Mastery cards. Its 25-card count excludes the three additional Warzone mastery definitions and War Spoils.

The Han page supplies ordered requirements and artwork associations. The hub calls the images renders on the gun. It repeats shared mastery and Divergence in each weapon's presentation; those repetitions are not evidence of independent account unlocks.

Known discrepancies to preserve:

- Terminus appears as a weapon-specific Prestige Master numeric label, for example Han 73, while official text uses Prestige 1 maximum level. Keep the numeric display label separately from the stage condition.
- Some Special prerequisites say additional weapon unlocks rather than a level. SANG Autumn is an example; use primary evidence for any normalized interpretation and retain the original wording.
- The AR Platinum example retains eight Gold challenges while the reference roster contains nine ARs. Do not silently convert that value to nine.
- Gold card shorthand mentions three weapon-specific challenges; the official condition additionally names Military completion.

## MW4.GG cross-check: small inspection only

Public client files [api.js](https://mw4.gg/js/api.js), [camo-tracker.js](https://mw4.gg/js/camo-tracker.js) and [camo-tracker-rules.js](https://mw4.gg/js/camo-tracker-rules.js) identify the public read endpoint [camo-grind](https://api.mw4.gg/api/v2/camo-grind). A small schema inspection found 35 weapons, 490 core ticks, four Prestige definitions per weapon and ten account challenges. It did not fetch images, saves or private keys.

Important data qualifications:

- Mode variants carry description, target count and repetitions; a challenge-level verified label can coexist with notes calling a Warzone variant community-reported.
- Osprey Specials have absent unlock levels. Its Chained DMZ row contains a zero-kill target and is marked unverified; treat it as invalid/stale, never as free completion.
- Some maximum levels are null. Scope and completion-mode flags also disagree semantically in places; provider fields are not authoritative gameplay rules.

The terms limit original work to personal noncommercial use and prohibit bulk database harvesting for a competing collection without written permission. Further automated collection stopped after this restriction was identified. A user's general collection authorization is not evidence of the provider's written reuse grant. Do not build a bulk MW4.GG importer for this feature.

## Patch and release uncertainty

The official rolling patch page explicitly reports correcting Chained's zero-kill display, several DMZ challenge descriptions, BlackCell tracking and new-weapon Platinum tracking. The correction does not publish a replacement numeric Chained target, so it cannot fill that missing value.

The official season announcement marks Osprey and CSG-35 as launch additions and JAK 12 / ZLR Talonhawk as in-season event rewards. No inspected release announcement establishes that the latter two are live on November 18. Therefore use the known 35 released-weapon reference scope; a 37-entry provider roster is insufficient release evidence. This is a dated research conclusion, not a permanent exclusion. Do not infer release merely from an image, metadata entry, future challenge set or event-reward description.

## Supplemental definitions

### Warzone

The November 2 primary briefing explicitly permits mastery completion with any weapon or combination of weapons. After Divergence, the sequence is Parallax (five kills in a match, 300 times), Damascus Reforged (two kills without plating, 200 times), then Empyros (top five with at least six kills, 75 times). Legacy weapons do not support MW4 mastery camos.

The same briefing names Renaissance, Violet Striker and Neutral Ground event rewards, plus seasonal Royalty rewards Gold Excellence and Gold Mosaic. It does not publish fixed Royalty numeric requirements. References may list these names without inventing criteria or artwork coverage.

### BlackCell

The primary Battle Pass article lists five class rewards and a final reward: Infiltrator (AR), Cell Ops (SMG), Gold Tiger (sniper), Whirlpool (LMG), Intercept (melee), then Spinal Verge after the class challenges. Six total does not imply a missing sixth class. These unlock usable camos rather than separate copies per weapon. Keep the BlackCell entitlement and season outside the standard camo chain. The DMZ final condition says **over** 150 kills, not at least 150. Detailed alternate requirements remain linked to the primary article until explicitly captured with their source.

### War Spoils

DMZHub says the first matching manual extraction unlocks the weapon and the third earns War Spoils. Final Exfil's camo page uses conflicting wording implying three additional extractions. Preserve the disagreement and the separate acquisition feature's manual progress; do not silently encode four extractions, derive camo progress from paid blueprint ownership, or claim melee applicability is settled. This supplemental reference does not add tracking state.

## Artwork provenance and rights

CODCentral's per-weapon pages expose 25 card-associated image entries, with descriptions identifying a weapon wearing a camo. The hub's render terminology and descriptive alt text do not prove that the assets are unaltered in-game screenshots. Source identity, asset URL, weapon/card association, collection time and digest should accompany each local asset. A broken or absent asset must remain visibly unavailable, not be replaced with an invented camo appearance.

The session records user-provided CODCentral permission to redistribute screenshots. That is not evidence that these renders fall within the screenshot grant. For this slice, local collection of the 875 swatches is already authorized, and files remain ignored/local. Do not commit, bundle, publish or export those pixels as public artwork. No open redistribution license was established by this research. Official promotional images and MW4.GG image URLs likewise do not establish a reusable artwork license.

## Source update procedure

1. Record observation date, exact source URLs and a content/version digest before comparing a new snapshot. Retain the previous valid snapshot.
2. Check primary release and patch evidence first. Treat provider additions, removals and changed requirements as proposed changes, not automatic game facts.
3. Reconcile stable weapon/card identities, card counts, mode qualifications and raw-to-normalized conditions. Flag changed numbers, missing labels, invalid targets and duplicate shared definitions for review.
4. Keep stage conditions, raw numeric labels, unavailable criteria and uncertainty distinct. Do not fabricate prerequisites to make the reference appear complete.
5. Validate all 35 expected weapon associations and 25 displayed cards per weapon. Track missing local images explicitly; never count a URL as a successfully collected asset.
6. Review collection and publication permissions separately. Maintain the MW4.GG bulk-collection restriction and local-only artwork boundary unless new applicable evidence changes them.
7. Replace the validated reference atomically after checks; keep source notes and previous evidence sufficient to explain every correction. No account progress is migrated in this slice.

No images were downloaded during this research and no production files were modified.
